// src/features/listings/ListingsPage.jsx
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchFlights } from "../../lib/aviationstack";
import { ALL_AIRPORTS } from "../zed/zedData";
import FlightCard from "./FlightCard";
import clsx from "clsx";

// ─── Airport Input (reused pattern) ──────────────────────────────────────────
function AirportInput({ id, placeholder, onChange, value: externalValue }) {
  const [query, setQuery] = useState(externalValue ?? "");
  const [open, setOpen]   = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e) {
    const q = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
    setQuery(q);
    if (q.length === 3) {
      onChange(q);
      setOpen(false);
    } else {
      onChange("");
      if (q.length >= 2) {
        setFiltered(ALL_AIRPORTS.filter(ap => ap.startsWith(q)).slice(0, 8));
        setOpen(true);
      } else {
        setOpen(false);
      }
    }
  }

  function handleSelect(ap) {
    setQuery(ap);
    onChange(ap);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        id={id}
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 uppercase focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all duration-150"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-hidden">
          {filtered.map(ap => (
            <li key={ap} onMouseDown={() => handleSelect(ap)}
              className="px-4 py-2.5 text-sm font-mono text-white hover:bg-sky-500/20 cursor-pointer transition-colors">
              {ap}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
      {children}
    </label>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ListingsPage() {
  const [origin, setOrigin]           = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate]               = useState(today());
  const [flights, setFlights]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [searched, setSearched]       = useState(false);

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  const canSearch = origin.length === 3 && destination.length === 3;

  const handleSearch = useCallback(async () => {
    setError(null);
    setFlights([]);
    setLoading(true);
    setSearched(true);
    try {
      const results = await fetchFlights({ depIata: origin, arrIata: destination, date });
      setFlights(results);
    } catch (err) {
      setError(err.message ?? "Failed to fetch flights. Check your API key.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, date]);

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 px-6 py-4 flex items-center gap-3">
        <span className="text-sky-400 text-xl">✈</span>
        <span className="font-display text-lg font-black tracking-tight">
          Jump<span className="text-sky-400">seat</span>
        </span>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-widest text-white/30">Flight Listings</span>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-black tracking-tight leading-none">
            Flight<br /><span className="text-sky-400">Schedules</span>
          </h1>
          <p className="mt-3 text-sm text-white/40 max-w-sm">
            Search real-time flight schedules for any route.
          </p>
        </div>

        {/* Search form */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur mb-8">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <Label htmlFor="origin">From</Label>
              <AirportInput id="origin" placeholder="JFK" onChange={setOrigin} />
            </div>
            <div>
              <Label htmlFor="dest">To</Label>
              <AirportInput id="dest" placeholder="ICN" onChange={setDestination} />
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="date">Date</Label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all duration-150"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={!canSearch || loading}
            className={clsx(
              "w-full rounded-xl py-3.5 font-display font-black text-sm uppercase tracking-widest transition-all duration-150",
              canSearch && !loading
                ? "bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98] shadow-[0_0_24px_rgba(14,165,233,0.35)]"
                : "bg-white/5 text-white/25 cursor-not-allowed"
            )}
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Searching…
                </span>
              : "Search Flights →"
            }
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {searched && !loading && !error && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-white/40">
                {flights.length > 0
                  ? `${flights.length} flight${flights.length !== 1 ? "s" : ""} found`
                  : "No flights found for this route and date."
                }
              </div>
              {flights.length > 0 && (
                <div className="text-xs text-white/20 font-mono">
                  {origin} → {destination}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {flights.map((flight, i) => (
                <FlightCard key={flight.flightNumber + i} flight={flight} />
              ))}
            </div>

            {flights.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
                <div className="text-white/40 text-sm">No scheduled flights found.</div>
                <div className="text-white/25 text-xs mt-1">Try a different date or route.</div>
              </div>
            )}
          </div>
        )}

        {/* Initial empty state */}
        {!searched && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <div className="text-white/40 text-sm">Enter a route above to search flights.</div>
          </div>
        )}
      </main>
    </div>
  );
}
