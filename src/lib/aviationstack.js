// src/lib/aviationstack.js
import { AIRPORT_ZONE_MAP } from "../features/zed/zedData";

// Use the same airport list from zedData — if it's not in there, it's not valid
function isValidAirport(code) {
  return code in AIRPORT_ZONE_MAP;
}

export async function fetchFlights({ depIata, arrIata, date }) {
  const dep = depIata.toUpperCase().trim();
  const arr = arrIata.toUpperCase().trim();

  // Validate airports
  if (!isValidAirport(dep)) {
    throw new Error(`"${dep}" is not a recognized airport code. Please check and try again.`);
  }
  if (!isValidAirport(arr)) {
    throw new Error(`"${arr}" is not a recognized airport code. Please check and try again.`);
  }

// ── REAL API MODE ──────────────────────────────────────────────────────────
const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flight-search`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({ depIata: dep, arrIata: arr, date }),
});
if (!res.ok) {
  const text = await res.text();
  throw new Error(`API error ${res.status}: ${text}`);
}
const json = await res.json();
if (json.error) throw new Error(json.error);
return json.flights ?? [];
}

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
      depAirport:   dep, depIata: dep,
      depScheduled: depTime, depEstimated: depTime,
      depActual:    depHour < 12 ? addMinutes(depTime, 5) : null,
      depTerminal:  String(1 + (i % 4)),
      depGate:      String.fromCharCode(65 + i) + String(10 + i),
      arrAirport:   arr, arrIata: arr,
      arrScheduled: arrTime, arrEstimated: arrTime,
      arrActual:    depHour < 12 ? addMinutes(arrTime, 8) : null,
      arrTerminal:  String(1 + ((i + 1) % 3)),
      arrGate:      String.fromCharCode(66 + i) + String(20 + i),
      aircraft:     airline.aircraft ?? "B77W",
      aircraftReg:  null, date,
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
    "ICN|BOS": [{ code:"KE", name:"Korean Air", aircraft:"B748" }],
    "JFK|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B777" }, { code:"DL", name:"Delta Air Lines", aircraft:"A330" }, { code:"UA", name:"United Airlines", aircraft:"B767" }, { code:"VS", name:"Virgin Atlantic", aircraft:"A350" }],
    "JFK|CDG": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"AF", name:"Air France", aircraft:"B77W" }, { code:"DL", name:"Delta Air Lines", aircraft:"A330" }],
    "JFK|NRT": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"JL", name:"Japan Airlines", aircraft:"B788" }, { code:"NH", name:"ANA", aircraft:"B789" }],
    "JFK|DXB": [{ code:"EK", name:"Emirates", aircraft:"A380" }],
    "JFK|DOH": [{ code:"QR", name:"Qatar Airways", aircraft:"B77W" }],
    "JFK|FRA": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"DL", name:"Delta Air Lines", aircraft:"A330" }, { code:"LH", name:"Lufthansa", aircraft:"A346" }],
    "LAX|NRT": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"JL", name:"Japan Airlines", aircraft:"B788" }, { code:"NH", name:"ANA", aircraft:"B789" }],
    "LAX|HND": [{ code:"JL", name:"Japan Airlines", aircraft:"B788" }, { code:"NH", name:"ANA", aircraft:"B789" }],
    "LAX|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B77W" }, { code:"UA", name:"United Airlines", aircraft:"B789" }, { code:"VS", name:"Virgin Atlantic", aircraft:"A350" }],
    "LAX|SYD": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"QF", name:"Qantas", aircraft:"A380" }, { code:"UA", name:"United Airlines", aircraft:"B789" }],
    "LAX|CDG": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"AF", name:"Air France", aircraft:"B77W" }, { code:"UA", name:"United Airlines", aircraft:"B789" }],
    "ICN|LAX": [{ code:"KE", name:"Korean Air", aircraft:"A380" }, { code:"OZ", name:"Asiana Airlines", aircraft:"B77W" }, { code:"UA", name:"United Airlines", aircraft:"B789" }],
    "DFW|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B777" }],
    "ORD|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B777" }, { code:"UA", name:"United Airlines", aircraft:"B787" }],
    "LHR|SIN": [{ code:"BA", name:"British Airways", aircraft:"B789" }, { code:"SQ", name:"Singapore Airlines", aircraft:"A350" }],
    "LHR|HKG": [{ code:"BA", name:"British Airways", aircraft:"B789" }, { code:"CX", name:"Cathay Pacific", aircraft:"B77W" }],
    "DXB|ICN": [{ code:"EK", name:"Emirates", aircraft:"A380" }, { code:"KE", name:"Korean Air", aircraft:"B77W" }],
    "DXB|SIN": [{ code:"EK", name:"Emirates", aircraft:"A380" }, { code:"SQ", name:"Singapore Airlines", aircraft:"A350" }],
    "BKK|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"TG", name:"Thai Airways", aircraft:"A350" }],
    "HKG|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"CX", name:"Cathay Pacific", aircraft:"B77W" }],
    "ICN|NRT": [{ code:"KE", name:"Korean Air", aircraft:"B737" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A321" }, { code:"NH", name:"ANA", aircraft:"B787" }, { code:"JL", name:"Japan Airlines", aircraft:"B737" }],
    "ICN|SIN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"SQ", name:"Singapore Airlines", aircraft:"A350" }],
    "ICN|SYD": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"QF", name:"Qantas", aircraft:"A380" }],
    "GRU|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"LA", name:"LATAM Airlines", aircraft:"B789" }],
    "BOS|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B777" }, { code:"VS", name:"Virgin Atlantic", aircraft:"A350" }],
    "SFO|NRT": [{ code:"UA", name:"United Airlines", aircraft:"B789" }, { code:"NH", name:"ANA", aircraft:"B789" }],
    "SFO|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B748" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"UA", name:"United Airlines", aircraft:"B789" }],
    "ATL|CDG": [{ code:"AF", name:"Air France", aircraft:"B77W" }, { code:"DL", name:"Delta Air Lines", aircraft:"A330" }],
    "ATL|LHR": [{ code:"DL", name:"Delta Air Lines", aircraft:"B77W" }, { code:"VS", name:"Virgin Atlantic", aircraft:"A350" }],
    "GMP|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B737" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A321" }],
    "CJU|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B737" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A321" }],
    "PUS|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B737" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A321" }],
    "HKG|NRT": [{ code:"CX", name:"Cathay Pacific", aircraft:"B77W" }, { code:"JL", name:"Japan Airlines", aircraft:"B788" }],
    "HKG|SIN": [{ code:"CX", name:"Cathay Pacific", aircraft:"B77W" }, { code:"SQ", name:"Singapore Airlines", aircraft:"A350" }],
    "CDG|NRT": [{ code:"AF", name:"Air France", aircraft:"B77W" }, { code:"JL", name:"Japan Airlines", aircraft:"B788" }],
    "FRA|NRT": [{ code:"LH", name:"Lufthansa", aircraft:"B748" }, { code:"NH", name:"ANA", aircraft:"B789" }],
    "DOH|ICN": [{ code:"QR", name:"Qatar Airways", aircraft:"B77W" }, { code:"KE", name:"Korean Air", aircraft:"B77W" }],
    "NBO|LHR": [{ code:"BA", name:"British Airways", aircraft:"B789" }, { code:"KQ", name:"Kenya Airways", aircraft:"B787" }],
    "JNB|LHR": [{ code:"BA", name:"British Airways", aircraft:"B789" }],
    "ADD|DXB": [{ code:"EK", name:"Emirates", aircraft:"B77W" }, { code:"ET", name:"Ethiopian Airlines", aircraft:"B787" }],
    "BOM|LHR": [{ code:"AI", name:"Air India", aircraft:"B787" }, { code:"BA", name:"British Airways", aircraft:"B789" }],
    "DEL|LHR": [{ code:"AI", name:"Air India", aircraft:"B787" }, { code:"BA", name:"British Airways", aircraft:"B789" }, { code:"VS", name:"Virgin Atlantic", aircraft:"A350" }],
    "BOM|DXB": [{ code:"AI", name:"Air India", aircraft:"B787" }, { code:"EK", name:"Emirates", aircraft:"A380" }],
    "DEL|DXB": [{ code:"AI", name:"Air India", aircraft:"B787" }, { code:"EK", name:"Emirates", aircraft:"A380" }],
    "CMB|DXB": [{ code:"EK", name:"Emirates", aircraft:"B77W" }, { code:"UL", name:"SriLankan Airlines", aircraft:"A330" }],
    "AKL|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"NZ", name:"Air New Zealand", aircraft:"B787" }],
    "AKL|SYD": [{ code:"NZ", name:"Air New Zealand", aircraft:"B787" }, { code:"QF", name:"Qantas", aircraft:"B737" }],
    "SYD|SIN": [{ code:"QF", name:"Qantas", aircraft:"A380" }, { code:"SQ", name:"Singapore Airlines", aircraft:"A350" }],
    "MEL|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"QF", name:"Qantas", aircraft:"A380" }],
    "MNL|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B737" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A321" }, { code:"PR", name:"Philippine Airlines", aircraft:"A321" }],
    "SGN|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B737" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A321" }, { code:"VN", name:"Vietnam Airlines", aircraft:"A321" }],
    "HAN|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B737" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A321" }, { code:"VN", name:"Vietnam Airlines", aircraft:"A321" }],
    "KUL|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"MH", name:"Malaysia Airlines", aircraft:"A330" }],
    "CGK|ICN": [{ code:"KE", name:"Korean Air", aircraft:"B77W" }, { code:"OZ", name:"Asiana Airlines", aircraft:"A350" }, { code:"GA", name:"Garuda Indonesia", aircraft:"B777" }],
    "IAH|LHR": [{ code:"UA", name:"United Airlines", aircraft:"B787" }],
    "IAH|CDG": [{ code:"UA", name:"United Airlines", aircraft:"B787" }],
    "EWR|LHR": [{ code:"UA", name:"United Airlines", aircraft:"B767" }, { code:"VS", name:"Virgin Atlantic", aircraft:"A350" }],
    "MIA|LHR": [{ code:"AA", name:"American Airlines", aircraft:"B789" }, { code:"BA", name:"British Airways", aircraft:"B777" }],
  };

  // Return empty array for unknown routes — NO fake fallback
  return map[key] ?? [];
}

function getRouteDuration(dep, arr) {
  const key = [dep, arr].sort().join("|");
  const durations = {
    "ICN|JFK":940,"ICN|LAX":660,"ICN|ORD":780,"ICN|SFO":620,"ICN|SEA":600,
    "ICN|ATL":840,"ICN|IAD":900,"ICN|EWR":920,"ICN|DFW":780,"ICN|MSP":780,
    "ICN|DTW":820,"ICN|BOS":860,
    "JFK|LHR":420,"JFK|CDG":435,"JFK|NRT":840,"JFK|DXB":780,"JFK|DOH":780,"JFK|FRA":450,
    "LAX|NRT":620,"LAX|HND":610,"LAX|LHR":640,"LAX|SYD":810,"LAX|CDG":660,
    "DFW|LHR":570,"ORD|LHR":480,"BOS|LHR":390,"MIA|LHR":510,
    "LHR|SIN":780,"LHR|HKG":720,"DXB|ICN":540,"DXB|SIN":420,
    "BKK|ICN":360,"HKG|ICN":240,"ICN|NRT":150,"ICN|SIN":660,"ICN|SYD":720,
    "GMP|ICN":60,"CJU|ICN":90,"PUS|ICN":60,
    "HKG|NRT":240,"HKG|SIN":240,"CDG|NRT":720,"FRA|NRT":660,
    "AKL|ICN":1320,"AKL|SYD":180,"SYD|SIN":480,"MEL|ICN":1380,
    "MNL|ICN":240,"SGN|ICN":300,"HAN|ICN":270,"KUL|ICN":420,"CGK|ICN":480,
    "BOM|LHR":540,"DEL|LHR":510,"BOM|DXB":180,"DEL|DXB":210,
    "EWR|LHR":420,"IAH|LHR":600,"IAH|CDG":600,
  };
  return durations[key] ?? 480;
}

function addMinutes(isoStr, minutes) {
  return new Date(new Date(isoStr).getTime() + minutes * 60000).toISOString();
}

export function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", hour12:false });
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric" });
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