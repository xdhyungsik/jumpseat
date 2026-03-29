// src/lib/aviationstack.js
// Currently using mock data.
// To switch to real API: comment out the mock return and uncomment the fetch block.

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchFlights({ depIata, arrIata, date }) {
  // ── MOCK MODE (swap this out when RapidAPI quota resets) ──────────────────
  await new Promise(r => setTimeout(r, 600));
  return getMockFlights(depIata.toUpperCase(), arrIata.toUpperCase(), date);

  // ── REAL API MODE (uncomment when ready) ─────────────────────────────────
  // const res = await fetch(`${SUPABASE_URL}/functions/v1/flight-search`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ depIata, arrIata, date }),
  // });
  // if (!res.ok) {
  //   const text = await res.text();
  //   throw new Error(`API error ${res.status}: ${text}`);
  // }
  // const json = await res.json();
  // if (json.error) throw new Error(json.error);
  // return json.flights ?? [];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

function getMockFlights(dep, arr, date) {
  const airlines = getAirlinesForRoute(dep, arr);
  if (airlines.length === 0) return [];

  return airlines.map((airline, i) => {
    const depHour  = 8 + i * 3;
    const duration = getRouteDuration(dep, arr);
    const depTime  = `${date}T${String(depHour).padStart(2,"0")}:${i % 2 === 0 ? "00" : "30"}:00.000Z`;
    const arrTime  = addMinutes(depTime, duration);

    return {
      flightNumber: airline.code + String(100 + i * 11),
      airline:      airline.name,
      airlineIata:  airline.code,
      status:       depHour < 12 ? "landed" : "scheduled",
      depAirport:   dep,
      depIata:      dep,
      depScheduled: depTime,
      depEstimated: depTime,
      depActual:    depHour < 12 ? addMinutes(depTime, 5) : null,
      depTerminal:  String(1 + (i % 4)),
      depGate:      String.fromCharCode(65 + i) + String(10 + i),
      arrAirport:   arr,
      arrIata:      arr,
      arrScheduled: arrTime,
      arrEstimated: arrTime,
      arrActual:    depHour < 12 ? addMinutes(arrTime, 8) : null,
      arrTerminal:  String(1 + ((i + 1) % 3)),
      arrGate:      String.fromCharCode(66 + i) + String(20 + i),
      aircraft:     airline.aircraft ?? "B77W",
      aircraftReg:  null,
      date,
    };
  });
}

function getAirlinesForRoute(dep, arr) {
  const key = [dep, arr].sort().join("|");
  const map = {
    "ICN|JFK": [{ code:"KE", name:"Korean Air", aircraft:"B748" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }],
    "ICN|LAX": [{ code:"KE", name:"Korean Air", aircraft:"A380" }, { code:"OZ", name:"Asiana Airlines", aircraft:"B77W" }, { code:"UA", name:"United Airlines", aircraft:"B789" }],
    "ICN|ORD": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"B77W" }, { code:"AA", name:"American Airlines", aircraft:"B789" }],
    "ICN|SFO": [{ code:"KE", name:"Korean Air", aircraft:"B748" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"UA", name:"United Airlines", aircraft:"B789" }],
    "ICN|SEA": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }],
    "ICN|ATL": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"DL", name:"Delta Air Lines", aircraft:"B77W" }],
    "ICN|IAD": [{ code:"KE", name:"Korean Air", aircraft:"B748" }, { code:"OZ", name:"Asiana Airlines", aircraft:"B77W" }],
    "ICN|EWR": [{ code:"KE", name:"Korean Air", aircraft:"A380" }, { code:"OZ", name:"Asiana Airlines", aircraft:"B77W" }],
    "ICN|DFW": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"AA", name:"American Airlines", aircraft:"B789" }],
    "ICN|MSP": [{ code:"KE", name:"Korean Air", aircraft:"B748" }, { code:"DL", name:"Delta Air Lines", aircraft:"B77W" }],
    "ICN|DTW": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"DL", name:"Delta Air Lines", aircraft:"B77W" }],
    "JFK|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B777" }, { code:"DL", name:"Delta Air Lines", aircraft:"A330" }, { code:"UA", name:"United Airlines", aircraft:"B767" }, { code:"VS", name:"Virgin Atlantic", aircraft:"A350" }],
    "JFK|CDG": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"AF", name:"Air France", aircraft:"B77W" }, { code:"DL", name:"Delta Air Lines", aircraft:"A330" }],
    "JFK|NRT": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"JL", name:"Japan Airlines", aircraft:"B788" }, { code:"NH", name:"ANA", aircraft:"B789" }],
    "JFK|DXB": [{ code:"EK", name:"Emirates", aircraft:"A380" }],
    "JFK|DOH": [{ code:"QR", name:"Qatar Airways", aircraft:"B77W" }],
    "JFK|FRA": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"DL", name:"Delta Air Lines", aircraft:"A330" }, { code:"LH", name:"Lufthansa", aircraft:"A346" }],
    "LAX|NRT": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"JL", name:"Japan Airlines", aircraft:"B788" }, { code:"NH", name:"ANA", aircraft:"B789" }],
    "LAX|HND": [{ code:"JL", name:"Japan Airlines", aircraft:"B788" }, { code:"NH", name:"ANA", aircraft:"B789" }],
    "LAX|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B380" }, { code:"UA", name:"United Airlines", aircraft:"B789" }, { code:"VS", name:"Virgin Atlantic", aircraft:"A350" }],
    "LAX|SYD": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"QF", name:"Qantas", aircraft:"A380" }, { code:"UA", name:"United Airlines", aircraft:"B789" }],
    "LAX|CDG": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"AF", name:"Air France", aircraft:"B77W" }, { code:"UA", name:"United Airlines", aircraft:"B789" }],
    "DFW|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B777" }],
    "ORD|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B777" }, { code:"UA", name:"United Airlines", aircraft:"B787" }],
    "LHR|SIN": [{ code:"BA", name:"British Airways", aircraft:"B789" }, { code:"SQ", name:"Singapore Airlines", aircraft:"A350" }],
    "LHR|HKG": [{ code:"BA", name:"British Airways", aircraft:"B789" }, { code:"CX", name:"Cathay Pacific", aircraft:"B77W" }],
    "DXB|ICN": [{ code:"EK", name:"Emirates", aircraft:"A380" }, { code:"KE", name:"Korean Air", aircraft:"B77W" }],
    "DXB|SIN": [{ code:"EK", name:"Emirates", aircraft:"A380" }, { code:"SQ", name:"Singapore Airlines", aircraft:"A350" }],
    "BKK|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"TG", name:"Thai Airways", aircraft:"A350" }],
    "HKG|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"CX", name:"Cathay Pacific", aircraft:"B77W" }],
    "NRT|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B737" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A321" }, { code:"NH", name:"ANA", aircraft:"B787" }, { code:"JL", name:"Japan Airlines", aircraft:"B737" }],
    "SIN|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"SQ", name:"Singapore Airlines", aircraft:"A350" }],
    "SYD|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"QF", name:"Qantas", aircraft:"A380" }],
    "GRU|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"LA", name:"LATAM Airlines", aircraft:"B789" }],
  };

  if (map[key]) return map[key];

  // Generic fallback for unknown routes
  return [
    { code:"AA", name:"American Airlines", aircraft:"B789" },
    { code:"UA", name:"United Airlines",   aircraft:"B787" },
  ];
}

function getRouteDuration(dep, arr) {
  const key = [dep, arr].sort().join("|");
  const durations = {
    "ICN|JFK":940, "ICN|LAX":660, "ICN|ORD":780, "ICN|SFO":620,
    "ICN|SEA":600, "ICN|ATL":840, "ICN|IAD":900, "ICN|EWR":920,
    "ICN|DFW":780, "ICN|MSP":780, "ICN|DTW":820,
    "JFK|LHR":420, "JFK|CDG":435, "JFK|NRT":840, "JFK|DXB":780, "JFK|DOH":780, "JFK|FRA":450,
    "LAX|NRT":620, "LAX|HND":610, "LAX|LHR":640, "LAX|SYD":810, "LAX|CDG":660,
    "DFW|LHR":570, "ORD|LHR":480,
    "LHR|SIN":780, "LHR|HKG":720,
    "DXB|ICN":540, "DXB|SIN":420,
    "BKK|ICN":360, "HKG|ICN":240, "NRT|ICN":150, "SIN|ICN":660, "SYD|ICN":720,
  };
  return durations[key] ?? 480;
}

function addMinutes(isoStr, minutes) {
  return new Date(new Date(isoStr).getTime() + minutes * 60000).toISOString();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

export function calcDuration(dep, arr) {
  if (!dep || !arr) return null;
  const diff = new Date(arr) - new Date(dep);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function statusMeta(status) {
  switch (status?.toLowerCase()) {
    case "active":
    case "en route":  return { label:"In Air",    color:"text-sky-400",   bg:"bg-sky-400/10   border-sky-400/20"   };
    case "landed":    return { label:"Landed",    color:"text-green-400", bg:"bg-green-400/10 border-green-400/20" };
    case "cancelled": return { label:"Cancelled", color:"text-red-400",   bg:"bg-red-400/10   border-red-400/20"   };
    case "diverted":  return { label:"Diverted",  color:"text-amber-400", bg:"bg-amber-400/10 border-amber-400/20" };
    default:          return { label:"Scheduled", color:"text-white/50",  bg:"bg-white/5      border-white/10"     };
  }
}