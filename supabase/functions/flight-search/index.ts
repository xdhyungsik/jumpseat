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

      const [depRes, arrRes] = await Promise.all([
        fetch(`https://${RAPIDAPI_HOST}/flights/airports/iata/${dep}/${from}/${to}?direction=Departure&withLeg=true&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false`, { headers: rapidHeaders }),
        fetch(`https://${RAPIDAPI_HOST}/flights/airports/iata/${arr}/${from}/${to}?direction=Arrival&withLeg=true&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false`, { headers: rapidHeaders }),
      ]);

      if (!depRes.ok || !arrRes.ok) {
        const status = !depRes.ok ? depRes.status : arrRes.status;
        return new Response(
          JSON.stringify({ error: `AeroDataBox error: ${status}` }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const [depJson, arrJson] = await Promise.all([depRes.json(), arrRes.json()]);
      const departures: any[] = depJson.departures ?? [];
      const arrivals:   any[] = arrJson.arrivals   ?? [];

      // Index arrivals-at-dest by the via airport they departed from
      const leg2ByVia: Record<string, any[]> = {};
      for (const f of arrivals) {
        const via = f.departure?.airport?.iata?.toUpperCase();
        if (!via || via === dep) continue;
        if (!leg2ByVia[via]) leg2ByVia[via] = [];
        leg2ByVia[via].push(f);
      }

      const routings: any[] = [];

      // Direct flights
      for (const f of departures) {
        if (f.arrival?.airport?.iata?.toUpperCase() !== arr) continue;
        const leg1 = mapFlight(f, date);
        const depMs = leg1.depScheduled ? new Date(leg1.depScheduled).getTime() : 0;
        const arrMs = leg1.arrScheduled ? new Date(leg1.arrScheduled).getTime() : 0;
        routings.push({
          type:       "direct",
          leg1,
          leg2:       null,
          viaIata:    null,
          viaAirport: null,
          layoverMin: 0,
          totalMin:   depMs && arrMs ? Math.round((arrMs - depMs) / 60000) : 0,
        });
      }

      // 1-stop routings
      for (const f1 of departures) {
        const via = f1.arrival?.airport?.iata?.toUpperCase();
        if (!via || via === arr) continue;
        const leg2List = leg2ByVia[via];
        if (!leg2List) continue;

        const leg1ArrMs = f1.arrival?.scheduledTime?.utc
          ? new Date(f1.arrival.scheduledTime.utc).getTime() : 0;
        if (!leg1ArrMs) continue;

        for (const f2 of leg2List) {
          const leg2DepMs = f2.departure?.scheduledTime?.utc
            ? new Date(f2.departure.scheduledTime.utc).getTime() : 0;
          const leg2ArrMs = f2.arrival?.scheduledTime?.utc
            ? new Date(f2.arrival.scheduledTime.utc).getTime() : 0;
          if (!leg2DepMs || !leg2ArrMs) continue;

          const layoverMin = Math.round((leg2DepMs - leg1ArrMs) / 60000);
          if (layoverMin < minLayover || layoverMin > 480) continue;

          const leg1DepMs = f1.departure?.scheduledTime?.utc
            ? new Date(f1.departure.scheduledTime.utc).getTime() : 0;
          const totalMin = leg1DepMs && leg2ArrMs
            ? Math.round((leg2ArrMs - leg1DepMs) / 60000) : 0;

          routings.push({
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

      routings.sort((a, b) => a.totalMin - b.totalMin);

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
