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

      const altDep = depIata.toUpperCase();
      const altArr = arrIata.toUpperCase();
      const minLayover = typeof minLayoverMin === "number" ? minLayoverMin : 90;

      // AeroDataBox max window is 12h — fetch AM and PM separately and merge
      const altAmFrom = `${date}T00:00`;
      const altAmTo   = `${date}T11:59`;
      const altPmFrom = `${date}T12:00`;
      const altPmTo   = `${date}T23:59`;
      const altP = "direction=Departure&withLeg=true&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false";
      const altBase = `https://${RAPIDAPI_HOST}/flights/airports/iata`;

      async function getDeps(iata: string): Promise<any[]> {
        const urlAm = `${altBase}/${iata}/${altAmFrom}/${altAmTo}?${altP}`;
        const urlPm = `${altBase}/${iata}/${altPmFrom}/${altPmTo}?${altP}`;
        const [rAm, rPm] = await Promise.all([
          fetch(urlAm, { headers: rapidHeaders }).catch(() => null),
          fetch(urlPm, { headers: rapidHeaders }).catch(() => null),
        ]);
        const dAm: any[] = (rAm?.ok ? (await rAm.json()).departures : null) ?? [];
        const dPm: any[] = (rPm?.ok ? (await rPm.json()).departures : null) ?? [];
        return [...dAm, ...dPm];
      }

      // Step 1: get all departures from origin
      const originDeps = await getDeps(altDep);

      // Separate directs from connections
      const directs = originDeps
        .filter((f: any) => f.arrival?.airport?.iata?.toUpperCase() === altArr)
        .map((f: any) => {
          const leg1 = mapFlight(f, date);
          const d = leg1.depScheduled ? new Date(leg1.depScheduled).getTime() : 0;
          const a = leg1.arrScheduled ? new Date(leg1.arrScheduled).getTime() : 0;
          return { type: "direct", leg1, leg2: null, viaIata: null, viaAirport: null, layoverMin: 0, totalMin: d && a ? Math.round((a - d) / 60000) : 0 };
        });

      // Build leg1 index: via airport → flights
      const leg1ByVia: Record<string, any[]> = {};
      for (const f of originDeps) {
        const via: string = f.arrival?.airport?.iata?.toUpperCase() ?? "";
        if (!via || via === altArr) continue;
        if (!leg1ByVia[via]) leg1ByVia[via] = [];
        leg1ByVia[via].push(f);
      }
      const vias = Object.keys(leg1ByVia).slice(0, 8);

      // Step 2: for each via airport, get its departures (sequential to avoid rate limits)
      const oneStops: any[] = [];
      for (const via of vias) {
        let viaDeps: any[] = [];
        try { viaDeps = await getDeps(via); } catch { /* skip */ }

        const toFinal = viaDeps.filter((f: any) => f.arrival?.airport?.iata?.toUpperCase() === altArr);
        for (const f1 of leg1ByVia[via]) {
          const arrMs1 = f1.arrival?.scheduledTime?.utc ? new Date(f1.arrival.scheduledTime.utc).getTime() : 0;
          if (!arrMs1) continue;
          for (const f2 of toFinal) {
            const depMs2 = f2.departure?.scheduledTime?.utc ? new Date(f2.departure.scheduledTime.utc).getTime() : 0;
            const arrMs2 = f2.arrival?.scheduledTime?.utc  ? new Date(f2.arrival.scheduledTime.utc).getTime()   : 0;
            if (!depMs2 || !arrMs2) continue;
            const layoverMin = Math.round((depMs2 - arrMs1) / 60000);
            if (layoverMin < minLayover || layoverMin > 480) continue;
            const depMs1 = f1.departure?.scheduledTime?.utc ? new Date(f1.departure.scheduledTime.utc).getTime() : 0;
            const totalMin = depMs1 && arrMs2 ? Math.round((arrMs2 - depMs1) / 60000) : 0;
            oneStops.push({
              type: "oneStop",
              leg1: mapFlight(f1, date),
              leg2: mapFlight(f2, date),
              viaIata:    via,
              viaAirport: f1.arrival?.airport?.name ?? via,
              layoverMin,
              totalMin,
            });
          }
        }
      }

      const routings = [...directs, ...oneStops].sort((a: any, b: any) => a.totalMin - b.totalMin);
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

    const params = "direction=Departure&withLeg=true&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false";
    const iata   = depIata.toUpperCase();
    const [amRes, pmRes] = await Promise.all([
      fetch(`https://${RAPIDAPI_HOST}/flights/airports/iata/${iata}/${date}T00:00/${date}T11:59?${params}`, { headers: rapidHeaders }),
      fetch(`https://${RAPIDAPI_HOST}/flights/airports/iata/${iata}/${date}T12:00/${date}T23:59?${params}`, { headers: rapidHeaders }),
    ]);

    if (!amRes.ok && !pmRes.ok) {
      return new Response(
        JSON.stringify({ error: `AeroDataBox error: ${amRes.status}` }),
        { status: amRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amFlights = amRes.ok ? ((await amRes.json()).departures ?? []) : [];
    const pmFlights = pmRes.ok ? ((await pmRes.json()).departures ?? []) : [];
    const departures = [...amFlights, ...pmFlights];
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
