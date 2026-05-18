// src/features/routings/RoutingsPage.jsx
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchRoutings } from "../../lib/aviationstack";
import { ALL_AIRPORTS } from "../zed/zedData";
import clsx from "clsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(mins) {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }

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

// ─── Airline Badge ─────────────────────────────────────────────────────────────

function Carrier({ code }) {
  if (!code) return null;
  return (
    <span className="inline-flex items-center justify-center w-7 h-5 rounded bg-white/10 text-[10px] font-mono font-bold text-white/70">
      {code}
    </span>
  );
}

// ─── Routing Path Display ─────────────────────────────────────────────────────

function PathRow({ stops, carriers }) {
  // stops = ["DFW", "ATL", "ORD"]
  // carriers = [["AA"], ["DL"]] — one entry per segment
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {stops.map((iata, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-black text-white">{iata}</span>
          {i < stops.length - 1 && (
            <div className="flex items-center gap-1">
              {(carriers[i] ?? []).map(c => <Carrier key={c} code={c} />)}
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
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 mb-3 group">
        <span className={clsx("text-xs font-semibold uppercase tracking-widest", color)}>{label}</span>
        <span className="text-xs font-mono text-white/20 border border-white/10 rounded px-1.5 py-0.5">{count}</span>
        <div className="h-px flex-1 bg-white/5" />
        <span className={clsx("text-white/20 text-xs transition-transform", !open && "-rotate-90")}>▾</span>
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}

// ─── Direct Card ─────────────────────────────────────────────────────────────

function DirectCard({ routings, dep, arr }) {
  const carriers = uniq(routings.map(r => r.leg1?.airlineIata));
  const count    = routings.length;
  const minMins  = Math.min(...routings.map(r => r.totalMin).filter(Boolean));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <PathRow stops={[dep, arr]} carriers={[carriers]} />
        <div className="flex items-center gap-2">
          {carriers.map(c => <Carrier key={c} code={c} />)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-white">{count} flight{count !== 1 ? "s" : ""}</div>
        {minMins > 0 && <div className="text-xs text-white/30">fastest {fmtDuration(minMins)}</div>}
      </div>
    </div>
  );
}

// ─── 1-Stop Group Card ────────────────────────────────────────────────────────

function OneStopCard({ via, routings, dep, arr }) {
  const leg1Carriers = uniq(routings.map(r => r.leg1?.airlineIata));
  const leg2Carriers = uniq(routings.map(r => r.leg2?.airlineIata));
  const count        = routings.length;
  const minMins      = Math.min(...routings.map(r => r.totalMin).filter(Boolean));
  const minLayover   = Math.min(...routings.map(r => r.layoverMin).filter(Boolean));
  const viaName      = routings[0]?.viaAirport ?? via;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <PathRow stops={[dep, via, arr]} carriers={[leg1Carriers, leg2Carriers]} />
        <div className="text-xs text-white/30">{viaName}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-white">{count} option{count !== 1 ? "s" : ""}</div>
        <div className="text-xs text-white/30">
          {minMins > 0 && `best ${fmtDuration(minMins)}`}
          {minLayover > 0 && ` · ${fmtDuration(minLayover)} min cnx`}
        </div>
      </div>
    </div>
  );
}

// ─── 2-Stop Card ──────────────────────────────────────────────────────────────

function TwoStopCard({ routing, dep, arr }) {
  const { via1Iata, via1Airport, via2Iata, via2Airport, leg1Carriers, leg2Carriers, leg3Carriers } = routing;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <PathRow
          stops={[dep, via1Iata, via2Iata, arr]}
          carriers={[leg1Carriers ?? [], leg2Carriers ?? [], leg3Carriers ?? []]}
        />
        <div className="text-xs text-white/30">{via1Airport} → {via2Airport}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-white/30">path exists</div>
        <div className="text-xs text-white/20">check timings</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoutingsPage() {
  const [origin,      setOrigin]      = useState("");
  const [destination, setDestination] = useState("");
  const [date,        setDate]        = useState(today());
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
      const results = await fetchRoutings({ depIata: origin, arrIata: destination, date, minLayoverMin: minLayover });
      setRoutings(results);
    } catch (err) {
      setError(err.message ?? "Failed to fetch routings.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, date, minLayover]);

  // Group routings
  const directs  = routings.filter(r => r.type === "direct");
  const oneStops = routings.filter(r => r.type === "oneStop");
  const twoStops = routings.filter(r => r.type === "twoStop");

  // Group 1-stops by via airport
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

  const hasResults = routings.length > 0;

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
            Alternative ways to get there when direct flights are full.
          </p>
        </div>

        {/* Search form */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur mb-8">
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

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
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
                  Searching…
                </span>
              : "Find Routings →"
            }
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {/* Results */}
        {searched && !loading && !error && (
          hasResults ? (
            <div className="space-y-8">
              {/* Direct */}
              {directs.length > 0 && (
                <Section label="Direct" count={directs.length} color="text-sky-400" defaultOpen={true}>
                  <DirectCard routings={directs} dep={origin} arr={destination} />
                </Section>
              )}

              {/* 1-Stop */}
              {oneStopVias.length > 0 && (
                <Section label="1-Stop" count={oneStopVias.length + " via"} color="text-white/60" defaultOpen={true}>
                  {oneStopVias.map(via => (
                    <OneStopCard key={via} via={via} routings={oneStopGroups[via]} dep={origin} arr={destination} />
                  ))}
                </Section>
              )}

              {/* 2-Stop */}
              {twoStops.length > 0 && (
                <Section label="2-Stop" count={twoStops.length + " paths"} color="text-white/40" defaultOpen={false}>
                  {twoStops.map((r, i) => (
                    <TwoStopCard key={i} routing={r} dep={origin} arr={destination} />
                  ))}
                </Section>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
              <div className="text-white/40 text-sm">No routings found for this date.</div>
              <div className="text-white/25 text-xs mt-1">Try a different date or loosen the connection time.</div>
            </div>
          )
        )}

        {/* Initial state */}
        {!searched && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <div className="text-white/40 text-sm">Enter a route to find all possible connections.</div>
            <div className="text-white/25 text-xs mt-1">Direct · 1-Stop · 2-Stop — sorted by travel time.</div>
          </div>
        )}
      </main>
    </div>
  );
}
