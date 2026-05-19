// src/features/routings/RoutingsPage.jsx
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchRoutings, formatTime } from "../../lib/aviationstack";
import { ALL_AIRPORTS } from "../zed/zedData";
import clsx from "clsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMins(mins) {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }

function utcToLocalHHMM(utcStr) {
  if (!utcStr) return null;
  return new Date(utcStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ─── Airport Input ────────────────────────────────────────────────────────────

function AirportInput({ id, placeholder, onChange }) {
  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleChange(e) {
    const q = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
    setQuery(q);
    if (q.length === 3) { onChange(q); setOpen(false); }
    else {
      onChange("");
      if (q.length >= 2) { setFiltered(ALL_AIRPORTS.filter(a => a.startsWith(q)).slice(0, 8)); setOpen(true); }
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
              className="px-4 py-2.5 text-sm font-mono text-white hover:bg-sky-500/20 cursor-pointer">{ap}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Carrier Chip ─────────────────────────────────────────────────────────────

function Carrier({ code, highlight }) {
  if (!code) return null;
  return (
    <span className={clsx(
      "inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-mono font-bold transition-colors",
      highlight ? "bg-sky-500/30 text-sky-300 border border-sky-500/40" : "bg-white/10 text-white/70"
    )}>
      {code}
    </span>
  );
}

// ─── Path Row ─────────────────────────────────────────────────────────────────

function PathRow({ stops, carriers, airlineFilter }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {stops.map((iata, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-black text-white">{iata}</span>
          {i < stops.length - 1 && (
            <div className="flex items-center gap-1">
              {(carriers[i] ?? []).map(c => (
                <Carrier key={c} code={c} highlight={airlineFilter && c === airlineFilter.toUpperCase()} />
              ))}
              <span className="text-white/20 text-xs">→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({ label, count, color = "text-white/40", defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 mb-3">
        <span className={clsx("text-xs font-semibold uppercase tracking-widest", color)}>{label}</span>
        <span className="text-xs font-mono text-white/20 border border-white/10 rounded px-1.5 py-0.5">{count}</span>
        <div className="h-px flex-1 bg-white/5" />
        <span className={clsx("text-white/20 text-xs transition-transform", !open && "-rotate-90")}>▾</span>
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}

// ─── Simple flight list row ───────────────────────────────────────────────────

function LegFlight({ f }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs font-mono">
      <span className="text-white/30 w-5">{f.airlineIata}</span>
      <span className="text-white font-bold">{formatTime(f.depScheduled)}</span>
      <span className="text-white/20">→</span>
      <span className="text-white font-bold">{formatTime(f.arrScheduled)}</span>
      <span className="text-white/25 ml-1">{f.flightNumber}</span>
    </div>
  );
}

function LegList({ label, flights }) {
  // Deduplicate by flight number
  const seen = new Set();
  const unique = flights.filter(f => {
    const key = f.flightNumber + f.depScheduled;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (a.depScheduled ?? "").localeCompare(b.depScheduled ?? ""));

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">{label}</div>
      <div className="flex flex-col gap-1">
        {unique.map((f, i) => <LegFlight key={i} f={f} />)}
      </div>
    </div>
  );
}

// ─── Direct Card ─────────────────────────────────────────────────────────────

function DirectCard({ routings, dep, arr, airlineFilter }) {
  const [expanded, setExpanded] = useState(false);
  const carriers = uniq(routings.map(r => r.leg1?.airlineIata));
  const sorted   = [...routings].sort((a, b) => (a.leg1?.depScheduled ?? "").localeCompare(b.leg1?.depScheduled ?? ""));
  const minMins  = Math.min(...routings.map(r => r.totalMin).filter(Boolean));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors text-left">
        <div className="flex flex-col gap-2">
          <PathRow stops={[dep, arr]} carriers={[carriers]} airlineFilter={airlineFilter} />
          <div className="flex items-center gap-1.5">
            {carriers.map(c => <Carrier key={c} code={c} highlight={airlineFilter && c === airlineFilter.toUpperCase()} />)}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-sm font-bold text-white">{routings.length} flight{routings.length !== 1 ? "s" : ""}</div>
            {minMins > 0 && <div className="text-xs text-white/30">fastest {fmtMins(minMins)}</div>}
          </div>
          <span className={clsx("text-white/20 text-xs transition-transform", !expanded && "-rotate-90")}>▾</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3">
          <LegList label={`${dep} → ${arr}`} flights={routings.map(r => r.leg1).filter(Boolean)} />
        </div>
      )}
    </div>
  );
}

// ─── 1-Stop Card ─────────────────────────────────────────────────────────────

function OneStopCard({ via, routings, dep, arr, airlineFilter }) {
  const [expanded, setExpanded] = useState(false);
  const leg1Carriers = uniq(routings.map(r => r.leg1?.airlineIata));
  const leg2Carriers = uniq(routings.map(r => r.leg2?.airlineIata));
  const viaName    = routings[0]?.viaAirport ?? via;
  const minMins    = Math.min(...routings.map(r => r.totalMin).filter(Boolean));
  const minLayover = Math.min(...routings.map(r => r.layoverMin).filter(Boolean));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors text-left">
        <div className="flex flex-col gap-1.5">
          <PathRow stops={[dep, via, arr]} carriers={[leg1Carriers, leg2Carriers]} airlineFilter={airlineFilter} />
          <div className="text-xs text-white/30">{viaName}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-sm font-bold text-white">{routings.length} option{routings.length !== 1 ? "s" : ""}</div>
            <div className="text-xs text-white/30">
              {minMins > 0 && `best ${fmtMins(minMins)}`}
              {minLayover > 0 && ` · ${fmtMins(minLayover)} min cnx`}
            </div>
          </div>
          <span className={clsx("text-white/20 text-xs transition-transform", !expanded && "-rotate-90")}>▾</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 flex flex-col gap-4">
          <LegList label={`${dep} → ${via}`} flights={routings.map(r => r.leg1).filter(Boolean)} />
          <LegList label={`${via} → ${arr}`} flights={routings.map(r => r.leg2).filter(Boolean)} />
        </div>
      )}
    </div>
  );
}

// ─── 2-Stop Card ─────────────────────────────────────────────────────────────

function TwoStopCard({ routing, dep, arr, airlineFilter }) {
  const { via1Iata, via1Airport, via2Iata, via2Airport, leg1Carriers, leg2Carriers, leg3Carriers } = routing;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <PathRow
          stops={[dep, via1Iata, via2Iata, arr]}
          carriers={[leg1Carriers ?? [], leg2Carriers ?? [], leg3Carriers ?? []]}
          airlineFilter={airlineFilter}
        />
        <div className="text-xs text-white/30">{via1Airport} → {via2Airport}</div>
      </div>
      <div className="text-right shrink-0 text-xs text-white/25">path exists</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoutingsPage() {
  const [origin,        setOrigin]        = useState("");
  const [destination,   setDestination]   = useState("");
  const [date,          setDate]          = useState(today());
  const [afterTime,     setAfterTime]     = useState("");
  const [airlineFilter, setAirlineFilter] = useState("");
  const [minLayover,    setMinLayover]    = useState(90);
  const [allRoutings,   setAllRoutings]   = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [searched,      setSearched]      = useState(false);

  function today() { return new Date().toISOString().split("T")[0]; }

  const canSearch = origin.length === 3 && destination.length === 3;

  const handleSearch = useCallback(async () => {
    setError(null);
    setAllRoutings([]);
    setLoading(true);
    setSearched(true);
    try {
      const results = await fetchRoutings({ depIata: origin, arrIata: destination, date, minLayoverMin: minLayover });
      setAllRoutings(results);
    } catch (err) {
      setError(err.message ?? "Failed to fetch routings.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, date, minLayover]);

  // ── Client-side filters ───────────────────────────────────────────────────
  const airline = airlineFilter.toUpperCase().trim();

  const routings = allRoutings.filter(r => {
    // Airline filter
    if (airline) {
      if (r.type === "direct")  return r.leg1?.airlineIata === airline;
      if (r.type === "oneStop") return r.leg1?.airlineIata === airline && r.leg2?.airlineIata === airline;
      if (r.type === "twoStop") return (r.leg1Carriers ?? []).includes(airline) && (r.leg2Carriers ?? []).includes(airline) && (r.leg3Carriers ?? []).includes(airline);
    }
    // Leave-after filter
    if (afterTime) {
      const depMs   = r.leg1?.depScheduled ? new Date(r.leg1.depScheduled).getTime() : 0;
      const cutoff  = new Date(`${date}T${afterTime}`).getTime();
      if (!depMs || depMs < cutoff) return false;
    }
    return true;
  });

  const directs  = routings.filter(r => r.type === "direct");
  const oneStops = routings.filter(r => r.type === "oneStop");
  const twoStops = routings.filter(r => r.type === "twoStop");

  const oneStopGroups = {};
  for (const r of oneStops) {
    if (!oneStopGroups[r.viaIata]) oneStopGroups[r.viaIata] = [];
    oneStopGroups[r.viaIata].push(r);
  }
  const oneStopVias = Object.keys(oneStopGroups).sort((a, b) => {
    const minA = Math.min(...oneStopGroups[a].map(r => r.totalMin).filter(Boolean));
    const minB = Math.min(...oneStopGroups[b].map(r => r.totalMin).filter(Boolean));
    return minA - minB;
  });

  const hasResults = directs.length > 0 || oneStopVias.length > 0 || twoStops.length > 0;

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-black tracking-tight leading-none">
            Possible<br /><span className="text-sky-400">Routings</span>
          </h1>
          <p className="mt-3 text-sm text-white/40 max-w-sm">
            Alternative ways to get there when direct flights are full.
          </p>
        </div>

        {/* Search form */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur mb-8">
          {/* Route */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">From</label>
              <AirportInput id="origin" placeholder="DFW" onChange={setOrigin} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">To</label>
              <AirportInput id="dest" placeholder="ORD" onChange={setDestination} />
            </div>
          </div>

          {/* Date + leave after */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
                Leave after <span className="text-white/20 normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <input type="time" value={afterTime} onChange={e => setAfterTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            </div>
          </div>

          {/* Airline filter + min connection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
                My airline <span className="text-white/20 normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <input
                value={airlineFilter}
                onChange={e => setAirlineFilter(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2))}
                placeholder="AA"
                autoComplete="off"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 uppercase focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all"
              />
              {airlineFilter && (
                <p className="text-[10px] text-white/30 mt-1">Showing only {airlineFilter}-operated segments</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">Min connection</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[60, 90, 120, 180].map(m => (
                  <button key={m} onClick={() => setMinLayover(m)}
                    className={clsx("rounded-lg py-2.5 text-xs font-bold border transition-all",
                      minLayover === m
                        ? "bg-sky-500/20 border-sky-500/40 text-sky-400"
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/8")}>
                    {m / 60}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleSearch} disabled={!canSearch || loading}
            className={clsx(
              "w-full rounded-xl py-3.5 font-display font-black text-sm uppercase tracking-widest transition-all",
              canSearch && !loading
                ? "bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98] shadow-[0_0_24px_rgba(14,165,233,0.35)]"
                : "bg-white/5 text-white/25 cursor-not-allowed"
            )}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Searching… (~15s)
                </span>
              : "Find Routings →"
            }
          </button>
        </div>

        {/* Active filters badge */}
        {searched && !loading && (airline || afterTime) && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/30">Filters:</span>
            {airline && (
              <span className="text-xs bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full px-2.5 py-0.5">
                {airline} only
                <button onClick={() => setAirlineFilter("")} className="ml-1.5 text-sky-400/60 hover:text-sky-300">×</button>
              </span>
            )}
            {afterTime && (
              <span className="text-xs bg-white/5 border border-white/10 text-white/40 rounded-full px-2.5 py-0.5">
                after {afterTime}
                <button onClick={() => setAfterTime("")} className="ml-1.5 text-white/30 hover:text-white/60">×</button>
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {/* Results */}
        {searched && !loading && !error && (
          hasResults ? (
            <div className="space-y-8">
              {directs.length > 0 && (
                <Section label="Direct" count={directs.length} color="text-sky-400">
                  <DirectCard routings={directs} dep={origin} arr={destination} airlineFilter={airline} />
                </Section>
              )}

              {oneStopVias.length > 0 && (
                <Section label="1-Stop" count={`${oneStopVias.length} via`} color="text-white/60">
                  {oneStopVias.map(via => (
                    <OneStopCard key={via} via={via} routings={oneStopGroups[via]} dep={origin} arr={destination} airlineFilter={airline} />
                  ))}
                </Section>
              )}

              {twoStops.length > 0 && (
                <Section label="2-Stop" count={`${twoStops.length} paths`} color="text-white/40" defaultOpen={false}>
                  {twoStops.map((r, i) => (
                    <TwoStopCard key={i} routing={r} dep={origin} arr={destination} airlineFilter={airline} />
                  ))}
                </Section>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
              <div className="text-white/40 text-sm">
                {allRoutings.length > 0 ? "No routings match your filters." : "No routings found for this date."}
              </div>
              <div className="text-white/25 text-xs mt-1">
                {allRoutings.length > 0 ? "Try clearing the airline or time filter." : "Try a different date or loosen the connection time."}
              </div>
            </div>
          )
        )}

        {!searched && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <div className="text-white/40 text-sm">Enter a route to find all possible connections.</div>
            <div className="text-white/25 text-xs mt-1">Direct · 1-Stop · 2-Stop — tap any result to see flights.</div>
          </div>
        )}
      </main>
    </div>
  );
}
