// supabase/functions/flight-search/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAPIDAPI_KEY  = Deno.env.get("RAPIDAPI_KEY") ?? "";
const RAPIDAPI_HOST = "aerodatabox.p.rapidapi.com";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mapFlight(f: any, date: string) {
  return {
    flightNumber: f.number ?? "—",
    airline:      f.airline?.name ?? "Unknown",
    airlineIata:  f.airline?.iata ?? "",
    status:       f.status ?? "unknown",
    depAirport:   f.departure?.airport?.name ?? "",
    depIata:      f.departure?.airport?.iata ?? "",
    depScheduled: f.departure?.scheduledTime?.utc ?? null,
    depEstimated: f.departure?.revisedTime?.utc ?? null,
    depActual:    f.departure?.actualTime?.utc ?? null,
    depTerminal:  f.departure?.terminal ?? null,
    depGate:      f.departure?.gate ?? null,
    arrAirport:   f.arrival?.airport?.name ?? "",
    arrIata:      f.arrival?.airport?.iata ?? "",
    arrScheduled: f.arrival?.scheduledTime?.utc ?? null,
    arrEstimated: f.arrival?.revisedTime?.utc ?? null,
    arrActual:    f.arrival?.actualTime?.utc ?? null,
    arrTerminal:  f.arrival?.terminal ?? null,
    arrGate:      f.arrival?.gate ?? null,
    aircraft:     f.aircraft?.model ?? null,
    aircraftReg:  f.aircraft?.reg ?? null,
    date,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode, flightNumber, depIata, arrIata, date, minLayoverMin } = body;

    const rapidHeaders = {
      "X-RapidAPI-Key":  RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    };

    // ── byNumber mode ──────────────────────────────────────────────────────────
    if (mode === "byNumber") {
      if (!flightNumber || !date) {
        return new Response(
          JSON.stringify({ error: "Missing flightNumber or date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const from = `${date}T00:00`;
      const to   = `${date}T23:59`;
      const url  = `https://${RAPIDAPI_HOST}/flights/${encodeURIComponent(flightNumber.toUpperCase())}/${from}/${to}?withAircraftImage=false&withLocation=false`;

      const res = await fetch(url, { headers: rapidHeaders });

      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `AeroDataBox error: ${res.status}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const json = await res.json();
      const items: any[] = Array.isArray(json) ? json : (json.departures ?? []);
      const flights = items.map((f: any) => mapFlight(f, date));

      return new Response(
        JSON.stringify({ flights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── alternates mode ────────────────────────────────────────────────────────
    if (mode === "alternates") {
      if (!depIata || !arrIata || !date) {
        return new Response(
          JSON.stringify({ error: "Missing depIata, arrIata, or date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const from = `${date}T00:00`;
      const to   = `${date}T23:59`;
      const dep  = depIata.toUpperCase();
      const arr  = arrIata.toUpperCase();
      const minLayover = typeof minLayoverMin === "number" ? minLayoverMin : 90;

      function airportDeps(iata: string) {
        return fetch(
          `https://${RAPIDAPI_HOST}/flights/airports/iata/${iata}/${from}/${to}?direction=Departure&withLeg=true&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false`,
          { headers: rapidHeaders }
        ).then(r => r.ok ? r.json() : { departures: [] })
         .catch(() => ({ departures: [] }));
      }

      // Step 1: all flights departing from origin
      const depRes = await fetch(
        `https://${RAPIDAPI_HOST}/flights/airports/iata/${dep}/${from}/${to}?direction=Departure&withLeg=true&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false`,
        { headers: rapidHeaders }
      );
      if (!depRes.ok) {
        const txt = await depRes.text();
        return new Response(
          JSON.stringify({ error: `AeroDataBox error ${depRes.status}: ${txt}` }),
          { status: depRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const depJson = await depRes.json();
      const departures: any[] = depJson.departures ?? [];

      // Direct flights
      const directs = departures
        .filter(f => f.arrival?.airport?.iata?.toUpperCase() === arr)
        .map(f => {
          const leg1 = mapFlight(f, date);
          const d = leg1.depScheduled ? new Date(leg1.depScheduled).getTime() : 0;
          const a = leg1.arrScheduled ? new Date(leg1.arrScheduled).getTime() : 0;
          return { type: "direct", leg1, leg2: null, viaIata: null, viaAirport: null, layoverMin: 0, totalMin: d && a ? Math.round((a - d) / 60000) : 0 };
        });

      // Step 2: collect unique via airports from origin departures (not the final dest)
      const leg1ByVia: Record<string, any[]> = {};
      for (const f of departures) {
        const via = f.arrival?.airport?.iata?.toUpperCase();
        if (!via || via === arr) continue;
        if (!leg1ByVia[via]) leg1ByVia[via] = [];
        leg1ByVia[via].push(f);
      }
      const viaAirports = Object.keys(leg1ByVia).slice(0, 10);

      // Step 3: fetch departures from each via airport in parallel
      const viaResults = await Promise.allSettled(
        viaAirports.map(via => airportDeps(via))
      );

      // Step 4: match leg1 + leg2 with valid connection windows
      const oneStops: any[] = [];
      for (let i = 0; i < viaAirports.length; i++) {
        const via = viaAirports[i];
        const result = viaResults[i];
        if (result.status !== "fulfilled") continue;
        const viaFlights: any[] = result.value.departures ?? [];
        const toArr = viaFlights.filter(f => f.arrival?.airport?.iata?.toUpperCase() === arr);
        if (toArr.length === 0) continue;

        for (const f1 of leg1ByVia[via]) {
          const leg1ArrMs = f1.arrival?.scheduledTime?.utc ? new Date(f1.arrival.scheduledTime.utc).getTime() : 0;
          if (!leg1ArrMs) continue;
          for (const f2 of toArr) {
            const leg2DepMs = f2.departure?.scheduledTime?.utc ? new Date(f2.departure.scheduledTime.utc).getTime() : 0;
            const leg2ArrMs = f2.arrival?.scheduledTime?.utc  ? new Date(f2.arrival.scheduledTime.utc).getTime()   : 0;
            if (!leg2DepMs || !leg2ArrMs) continue;
            const layoverMin = Math.round((leg2DepMs - leg1ArrMs) / 60000);
            if (layoverMin < minLayover || layoverMin > 480) continue;
            const leg1DepMs = f1.departure?.scheduledTime?.utc ? new Date(f1.departure.scheduledTime.utc).getTime() : 0;
            const totalMin  = leg1DepMs && leg2ArrMs ? Math.round((leg2ArrMs - leg1DepMs) / 60000) : 0;
            oneStops.push({
              type:       "oneStop",
              leg1:       mapFlight(f1, date),
              leg2:       mapFlight(f2, date),
              viaIata:    via,
              viaAirport: f1.arrival?.airport?.name ?? via,
              layoverMin,
              totalMin,
            });
          }
        }
      }

      const routings = [...directs, ...oneStops].sort((a, b) => a.totalMin - b.totalMin);

      return new Response(
        JSON.stringify({ routings }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── byRoute mode (default) ─────────────────────────────────────────────────
    if (!depIata || !arrIata || !date) {
      return new Response(
        JSON.stringify({ error: "Missing depIata, arrIata, or date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const from = `${date}T00:00`;
    const to   = `${date}T23:59`;
    const url  = `https://${RAPIDAPI_HOST}/flights/airports/iata/${depIata.toUpperCase()}/${from}/${to}?direction=Departure&withLeg=true&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false`;

    const res = await fetch(url, { headers: rapidHeaders });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `AeroDataBox error: ${res.status}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await res.json();
    const departures = json.departures ?? [];
    const dest = arrIata.toUpperCase();

    const filtered = departures
      .filter((f: any) => f.arrival?.airport?.iata?.toUpperCase() === dest)
      .map((f: any) => mapFlight(f, date));

    return new Response(
      JSON.stringify({ flights: filtered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
