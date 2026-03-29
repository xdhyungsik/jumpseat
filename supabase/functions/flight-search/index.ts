// supabase/functions/flight-search/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAPIDAPI_KEY  = Deno.env.get("RAPIDAPI_KEY") ?? "";
const RAPIDAPI_HOST = "aerodatabox.p.rapidapi.com";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { depIata, arrIata, date } = await req.json();

    if (!depIata || !arrIata || !date) {
      return new Response(
        JSON.stringify({ error: "Missing depIata, arrIata, or date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const from = `${date}T00:00`;
    const to   = `${date}T23:59`;
    const url  = `https://${RAPIDAPI_HOST}/flights/airports/iata/${depIata.toUpperCase()}/${from}/${to}?direction=Departure&withLeg=true&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false`;

    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

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
      .map((f: any) => ({
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
      }));

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