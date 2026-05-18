// src/features/routings/RoutingsPage.jsx
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchRoutings, formatTime, calcDuration } from "../../lib/aviationstack";
import { ALL_AIRPORTS } from "../zed/zedData";
import clsx from "clsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(mins) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function layoverColor(mins) {
  if (mins >= 120) return "text-green-400  bg-green-400/10  border-green-400/20";
  if (mins >= 75)  return "text-amber-400  bg-amber-400/10  border-amber-400/20";
  return                  "text-red-400    bg-red-400/10    border-red-400/20";
}

// ─── Airport Input ────────────────────────────────────────────────────────────

function AirportInput({ id, placeholder, onChange, value: ext }) {
  const [query, setQuery]       = useState(ext ?? "");
  const [open, setOpen]         = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleChange(e) {
    const q = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
    setQuery(q);
    if (q.length === 3) { onChange(q); setOpen(false); }
    else {
      onChange("");
      if (q.length >= 2) { setFiltered(ALL_AIRPORTS.filter(ap => ap.startsWith(q)).slice(0, 8)); setOpen(true); }
      else setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <input id={id} value={query} onChange={handleChange} placeholder={placeholder}
        autoComplete="off" spellCheck={false}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 uppercase focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-hidden">
          {filtered.map(ap => (
            <li key={ap} onMouseDown={() => { setQuery(ap); onChange(ap); setOpen(false); }}
              className="px-4 py-2.5 text-sm font-mono text-white hover:bg-sky-500/20 cursor-pointer transition-colors">{ap}</li>
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

// ─── Routing Card ─────────────────────────────────────────────────────────────

function RoutingCard({ routing }) {
  const { type, leg1, leg2, viaAirport, viaIata, layoverMin, totalMin } = routing;
  const isDirect = type === "direct";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-150 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {isDirect ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-sky-400/10 border-sky-400/20 text-sky-400">
              Direct
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-white/5 border-white/10 text-white/50">
              1 Stop · via {viaIata}
            </span>
          )}
          <span className="text-xs text-white/30 font-mono">
            {leg1.depIata} → {isDirect ? leg1.arrIata : leg2.arrIata}
          </span>
        </div>
        <span className="text-xs text-white/30 font-mono">{fmtDuration(totalMin)} total</span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Leg 1 */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-white/8 flex items-center justify-center text-[10px] font-mono font-bold text-white/60 shrink-0">
            {leg1.airlineIata || "?"}
          </div>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="text-center min-w-[52px]">
              <div className="font-display text-lg font-black text-white leading-none">{formatTime(leg1.depScheduled)}</div>
              <div className="text-[10px] font-mono text-sky-400 mt-0.5">{leg1.depIata}</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <div className="text-[10px] text-white/25">{calcDuration(leg1.depScheduled, leg1.arrScheduled)}</div>
              <div className="flex items-center gap-1 w-full">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-white/20 text-[10px]">✈</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="text-[10px] text-white/20 font-mono">{leg1.flightNumber}</div>
            </div>
            <div className="text-center min-w-[52px]">
              <div className="font-display text-lg font-black text-white leading-none">{formatTime(leg1.arrScheduled)}</div>
              <div className="text-[10px] font-mono text-sky-400 mt-0.5">{leg1.arrIata}</div>
            </div>
          </div>
        </div>

        {/* Layover */}
        {!isDirect && (
          <div className="flex items-center gap-2 pl-9">
            <div className="w-px h-4 bg-white/10 ml-px" />
            <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border", layoverColor(layoverMin))}>
              {fmtDuration(layoverMin)} layover at {viaAirport ?? viaIata}
            </span>
          </div>
        )}

        {/* Leg 2 */}
        {!isDirect && leg2 && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-white/8 flex items-center justify-center text-[10px] font-mono font-bold text-white/60 shrink-0">
              {leg2.airlineIata || "?"}
            </div>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="text-center min-w-[52px]">
                <div className="font-display text-lg font-black text-white leading-none">{formatTime(leg2.depScheduled)}</div>
                <div className="text-[10px] font-mono text-sky-400 mt-0.5">{leg2.depIata}</div>
              </div>
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <div className="text-[10px] text-white/25">{calcDuration(leg2.depScheduled, leg2.arrScheduled)}</div>
                <div className="flex items-center gap-1 w-full">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-white/20 text-[10px]">✈</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="text-[10px] text-white/20 font-mono">{leg2.flightNumber}</div>
              </div>
              <div className="text-center min-w-[52px]">
                <div className="font-display text-lg font-black text-white leading-none">{formatTime(leg2.arrScheduled)}</div>
                <div className="text-[10px] font-mono text-sky-400 mt-0.5">{leg2.arrIata}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoutingsPage() {
  const [origin,      setOrigin]      = useState("");
  const [destination, setDestination] = useState("");
  const [date,        setDate]        = useState(today());
  const [afterTime,   setAfterTime]   = useState("");
  const [minLayover,  setMinLayover]  = useState(90);
  const [routings,    setRoutings]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [searched,    setSearched]    = useState(false);

  function today() { return new Date().toISOString().split("T")[0]; }

  const canSearch = origin.length === 3 && destination.length === 3;

  const handleSearch = useCallback(async () => {
    setError(null);
    setRoutings([]);
    setLoading(true);
    setSearched(true);
    try {
      let results = await fetchRoutings({ depIata: origin, arrIata: destination, date, minLayoverMin: minLayover });

      // Apply "leave after" filter on the client using local time
      if (afterTime) {
        const cutoff = new Date(`${date}T${afterTime}`).getTime();
        results = results.filter(r => {
          const depMs = r.leg1.depScheduled ? new Date(r.leg1.depScheduled).getTime() : 0;
          return depMs >= cutoff;
        });
      }

      setRoutings(results);
    } catch (err) {
      setError(err.message ?? "Failed to fetch routings.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, date, afterTime, minLayover]);

  const directs  = routings.filter(r => r.type === "direct");
  const oneStops = routings.filter(r => r.type === "oneStop");

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-black tracking-tight leading-none">
            Possible<br /><span className="text-sky-400">Routings</span>
          </h1>
          <p className="mt-3 text-sm text-white/40 max-w-sm">
            Find direct and hidden 1-stop connections for any route and date.
          </p>
        </div>

        {/* Search form */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur mb-8">
          {/* Route row */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <Label htmlFor="origin">From</Label>
              <AirportInput id="origin" placeholder="DFW" onChange={setOrigin} />
            </div>
            <div>
              <Label htmlFor="dest">To</Label>
              <AirportInput id="dest" placeholder="ORD" onChange={setDestination} />
            </div>
          </div>

          {/* Date + time row */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <Label htmlFor="date">Date</Label>
              <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            </div>
            <div>
              <Label htmlFor="after">Leave after (optional)</Label>
              <input id="after" type="time" value={afterTime} onChange={e => setAfterTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            </div>
          </div>

          {/* Min layover */}
          <div className="mb-6">
            <Label>Min connection time</Label>
            <div className="flex gap-2">
              {[60, 90, 120, 180].map(m => (
                <button key={m} onClick={() => setMinLayover(m)}
                  className={clsx("flex-1 rounded-lg py-2.5 text-xs font-bold border transition-all",
                    minLayover === m
                      ? "bg-sky-500/20 border-sky-500/40 text-sky-400"
                      : "bg-white/5 border-white/10 text-white/40 hover:bg-white/8")}>
                  {m >= 60 ? `${m / 60}h` : `${m}m`}{m === 90 ? "" : ""}
                  {m === 90 && <span className="ml-1 text-white/25 text-[10px]">rec.</span>}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSearch} disabled={!canSearch || loading}
            className={clsx(
              "w-full rounded-xl py-3.5 font-display font-black text-sm uppercase tracking-widest transition-all duration-150",
              canSearch && !loading
                ? "bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98] shadow-[0_0_24px_rgba(14,165,233,0.35)]"
                : "bg-white/5 text-white/25 cursor-not-allowed"
            )}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Finding routings…
                </span>
              : "Find Routings →"
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
          <div className="space-y-8">
            {routings.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
                <div className="text-white/40 text-sm">No routings found.</div>
                <div className="text-white/25 text-xs mt-1">Try a different date or loosen the connection time.</div>
              </div>
            ) : (
              <>
                {/* Direct */}
                {directs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-sky-400">Direct</span>
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-xs text-white/20">{directs.length}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {directs.map((r, i) => <RoutingCard key={i} routing={r} />)}
                    </div>
                  </div>
                )}

                {/* 1-stop */}
                {oneStops.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-white/40">1-Stop Alternatives</span>
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-xs text-white/20">{oneStops.length}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {oneStops.map((r, i) => <RoutingCard key={i} routing={r} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Initial empty state */}
        {!searched && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <div className="text-white/40 text-sm">Enter a route to find all possible connections.</div>
            <div className="text-white/25 text-xs mt-1">Direct flights + hidden 1-stop hacks, sorted by total travel time.</div>
          </div>
        )}
      </main>
    </div>
  );
}
