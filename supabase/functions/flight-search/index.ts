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

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      // Single API call — stays within 12h window and 1 req/sec rate limit
      async function fetchWindow(iata: string, from: string, to: string): Promise<any[]> {
        const url = `${altBase}/${iata}/${from}/${to}?${altP}`;
        try {
          const r = await fetch(url, { headers: rapidHeaders });
          if (!r.ok) return [];
          const j = await r.json();
          return j.departures ?? [];
        } catch { return []; }
      }

      // Step 1: origin departures — AM then PM, sequential to respect rate limit
      const originAm = await fetchWindow(altDep, altAmFrom, altAmTo);
      await sleep(1100);
      const originPm = await fetchWindow(altDep, altPmFrom, altPmTo);
      const originDeps = [...originAm, ...originPm];

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
      // Prioritize major hubs — they're far more likely to have onward connections
      const HUBS = new Set(["ATL","DEN","LAX","SFO","JFK","EWR","ORD","CLT","MSP","DTW","PHX","SEA","IAH","BOS","LAS","MIA","PHL","SLC","BWI","DCA","MDW","DAL","LGA","PDX","SAN","TPA","MCO","AUS","STL","MCI","RDU","BNA","MEM","MSY"]);
      const allVias = Object.keys(leg1ByVia).filter(v => v !== altArr && v !== altDep);
      const vias = [
        ...allVias.filter(v => HUBS.has(v)),
        ...allVias.filter(v => !HUBS.has(v)),
      ].slice(0, 12);

      // Step 2: fetch via airport departures sequentially with rate-limit spacing.
      // Only fetch the PM window (noon–midnight) since connections happen after arrival.
      const viaDepsMap: Record<string, any[]> = {};
      for (const via of vias) {
        await sleep(1100);
        viaDepsMap[via] = await fetchWindow(via, altPmFrom, altPmTo);
      }

      // Which fetched airports have service to the final destination?
      const airsToFinal = new Set<string>(
        vias.filter(v => (viaDepsMap[v] ?? []).some((f: any) => f.arrival?.airport?.iata?.toUpperCase() === altArr))
      );

      // 1-stop: match valid connections
      const oneStops: any[] = [];
      for (const via of vias) {
        const toFinal = (viaDepsMap[via] ?? []).filter((f: any) => f.arrival?.airport?.iata?.toUpperCase() === altArr);
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

      // 2-stop: DFW → via1 → via2 → ORD
      // via2 must be a fetched airport that has service to the final destination
      const twoStopPaths = new Set<string>();
      const twoStops: any[] = [];
      for (const via1 of vias) {
        const via1Deps = viaDepsMap[via1] ?? [];
        for (const f of via1Deps) {
          const via2: string = f.arrival?.airport?.iata?.toUpperCase() ?? "";
          if (!via2 || via2 === altArr || via2 === altDep || via2 === via1) continue;
          if (!airsToFinal.has(via2)) continue;
          const pathKey = `${via1}|${via2}`;
          if (twoStopPaths.has(pathKey)) continue;
          twoStopPaths.add(pathKey);

          const leg1Carriers = [...new Set((leg1ByVia[via1] ?? []).map((f1: any) => f1.airline?.iata ?? "").filter(Boolean))];
          const leg2Carriers = [...new Set(via1Deps.filter((f2: any) => f2.arrival?.airport?.iata?.toUpperCase() === via2).map((f2: any) => f2.airline?.iata ?? "").filter(Boolean))];
          const leg3Carriers = [...new Set((viaDepsMap[via2] ?? []).filter((f3: any) => f3.arrival?.airport?.iata?.toUpperCase() === altArr).map((f3: any) => f3.airline?.iata ?? "").filter(Boolean))];

          twoStops.push({
            type:         "twoStop",
            via1Iata:     via1,
            via1Airport:  f.departure?.airport?.name ?? via1,
            via2Iata:     via2,
            via2Airport:  f.arrival?.airport?.name ?? via2,
            leg1Carriers,
            leg2Carriers,
            leg3Carriers,
          });
        }
      }

      const routings = [...directs, ...oneStops, ...twoStops].sort((a: any, b: any) => (a.totalMin ?? 9999) - (b.totalMin ?? 9999));
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
