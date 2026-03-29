// src/features/zed/ZedCalculator.jsx
import { useState, useCallback, useRef, useEffect } from "react";
import { calculateZedFare } from "./zedEngine";
import { CARRIERS, CABIN_OPTIONS, ALL_AIRPORTS } from "./zedData";
import clsx from "clsx";

const SORTED_CARRIERS = [...CARRIERS].sort((a, b) => a.name.localeCompare(b.name));

const LEVEL_OPTIONS = [
  { value: "1", label: "L1 — Active employee (highest)" },
  { value: "2", label: "L2 — Active employee (standard)" },
  { value: "3", label: "L3 — Retiree / dependent" },
  { value: "4", label: "L4 — Travel agent / partner" },
  { value: "5", label: "L5 — Industry (lowest)" },
];

// ─── Airport Input ────────────────────────────────────────────────────────────
function AirportInput({ id, placeholder, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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

// ─── Carrier Dropdown ─────────────────────────────────────────────────────────
function CarrierSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = SORTED_CARRIERS.find(c => c.code === value);
  const filtered = search.trim() === ""
    ? SORTED_CARRIERS
    : SORTED_CARRIERS.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openDropdown() {
    setOpen(true);
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(code) {
    onChange(code);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={openDropdown}
        className={clsx(
          "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none transition-all duration-150",
          open ? "border-sky-500/50" : "",
          selected ? "text-white" : "text-white/25"
        )}>
        <span className="truncate">{selected ? selected.code + "  ·  " + selected.name : "Search or select carrier…"}</span>
        <span className={clsx("text-white/40 text-xs shrink-0 transition-transform duration-150", open && "rotate-180")}>▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Type airline name or code…"
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-sky-500 focus:outline-none" />
          </div>
          <ul className="overflow-y-auto max-h-48">
            {filtered.length === 0
              ? <li className="px-4 py-3 text-sm text-white/30 text-center">No airlines found</li>
              : filtered.map(c => (
                <li key={c.code} onMouseDown={() => handleSelect(c.code)}
                  className={clsx(
                    "px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between gap-2",
                    c.code === value ? "bg-sky-500/20 text-sky-300" : "text-white hover:bg-white/5"
                  )}>
                  <span className="truncate">
                    <span className="font-mono font-semibold">{c.code}</span>
                    <span className="text-white/40 mx-2">·</span>
                    {c.name}
                  </span>
                  {c.code === value && <span className="text-sky-400 text-xs shrink-0">✓</span>}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Plain Dropdown ───────────────────────────────────────────────────────────
function CustomSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={clsx(
          "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none transition-all duration-150",
          open ? "border-sky-500/50" : "",
          selected ? "text-white" : "text-white/25"
        )}>
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span className={clsx("text-white/40 text-xs shrink-0 transition-transform duration-150", open && "rotate-180")}>▾</span>
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-y-auto max-h-56">
          {options.map(o => (
            <li key={o.value} onMouseDown={() => { onChange(String(o.value)); setOpen(false); }}
              className={clsx(
                "px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between gap-2",
                String(o.value) === String(value) ? "bg-sky-500/20 text-sky-300" : "text-white hover:bg-white/5"
              )}>
              <span className="truncate">{o.label}</span>
              {String(o.value) === String(value) && <span className="text-sky-400 text-xs shrink-0">✓</span>}
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

// ─── Result Card ──────────────────────────────────────────────────────────────
function ZedResult({ result }) {
  const cabinLabel  = CABIN_OPTIONS.find(c => c.code === result.cabin)?.label ?? result.cabin;
  const levelLabel  = LEVEL_OPTIONS.find(l => l.value === String(result.level))?.label ?? "Level " + result.level;
  const carrierName = CARRIERS.find(c => c.code === result.carrier)?.name ?? result.carrier;

  return (
    <div className="mt-8" style={{ animation: "fadeUp 0.3s ease both" }}>
      <div className="flex items-center gap-4 mb-6">
        <div className="text-center">
          <div className="font-display text-4xl font-black text-white tracking-tight">{result.origin}</div>
          <div className="text-xs text-white/40 mt-0.5">{result.originZone.sub}</div>
        </div>
        <div className="flex flex-col items-center gap-1 px-2 flex-1">
          <div className="text-white/30 text-xs">{carrierName}</div>
          <div className="flex items-center gap-2 w-full">
            <div className="h-px flex-1 bg-sky-500/50" />
            <div className="text-sky-400 text-sm">✈</div>
            <div className="h-px flex-1 bg-sky-500/50" />
          </div>
          <div className="text-white/30 text-xs">{cabinLabel} · {levelLabel}</div>
        </div>
        <div className="text-center">
          <div className="font-display text-4xl font-black text-white tracking-tight">{result.destination}</div>
          <div className="text-xs text-white/40 mt-0.5">{result.destinationZone.sub}</div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/40">Fare Breakdown</div>
        </div>
        <div className="divide-y divide-white/5">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-white/70">ZED Base Fare</span>
            <span className="font-mono text-sm font-semibold text-white">${result.baseFare.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-white/40">Taxes & Fees (est. {(result.taxRate * 100).toFixed(0)}%)</span>
            <span className="font-mono text-sm text-white/40">${result.taxes.toFixed(2)}</span>
          </div>
        </div>
        <div className="px-5 py-4 bg-sky-500/10 border-t border-sky-500/20 flex items-center justify-between">
          <span className="text-sm font-bold text-white uppercase tracking-wide">Estimated Total</span>
          <span className="font-display text-3xl font-black text-sky-400">
            ${result.total.toFixed(2)}
            <span className="text-sm font-sans font-normal text-white/40 ml-1">USD</span>
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs text-white/30 leading-relaxed">⚠ {result.disclaimer}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ZedCalculator() {
  const [origin, setOrigin]           = useState("");
  const [destination, setDestination] = useState("");
  const [carrier, setCarrier]         = useState("");
  const [cabin, setCabin]             = useState("Y");
  const [level, setLevel]             = useState("1");
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);

  const canCalculate = origin.length === 3 && destination.length === 3 && carrier !== "";

  const handleCalculate = useCallback(() => {
    setError(null);
    setResult(null);
    setLoading(true);
    setTimeout(() => {
      const res = calculateZedFare({ origin, destination, carrier, cabin, level: Number(level) });
      setLoading(false);
      if (res.ok) setResult(res.result);
      else setError(res.error);
    }, 280);
  }, [origin, destination, carrier, cabin, level]);

  const cabinOptions = CABIN_OPTIONS.map(c => ({ value: c.code, label: c.label }));

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(1rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <header className="relative z-10 border-b border-white/5 px-6 py-4 flex items-center gap-3">
        <span className="text-sky-400 text-xl">✈</span>
        <span className="font-display text-lg font-black tracking-tight">
          Jump<span className="text-sky-400">seat</span>
        </span>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-widest text-white/30">ZED Fare Calculator</span>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-black tracking-tight leading-none">
            ZED Fare<br /><span className="text-sky-400">Calculator</span>
          </h1>
          <p className="mt-3 text-sm text-white/40 max-w-sm">
            Estimate your Zonal Employee Discount fare on partner carriers.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div><Label htmlFor="origin">Origin</Label><AirportInput id="origin" placeholder="JFK" onChange={setOrigin} /></div>
            <div><Label htmlFor="dest">Destination</Label><AirportInput id="dest" placeholder="ICN" onChange={setDestination} /></div>
          </div>

          <div className="mb-5">
            <Label>Operating Carrier</Label>
            <CarrierSelect value={carrier} onChange={setCarrier} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div><Label>Cabin</Label><CustomSelect options={cabinOptions} value={cabin} onChange={setCabin} placeholder="Cabin" /></div>
            <div><Label>ZED Level</Label><CustomSelect options={LEVEL_OPTIONS} value={level} onChange={setLevel} placeholder="Level" /></div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!canCalculate || loading}
            className={clsx(
              "w-full rounded-xl py-3.5 font-display font-black text-sm uppercase tracking-widest transition-all duration-150",
              canCalculate && !loading
                ? "bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98] shadow-[0_0_24px_rgba(14,165,233,0.35)]"
                : "bg-white/5 text-white/25 cursor-not-allowed"
            )}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Calculating…
                </span>
              : "Calculate ZED Fare →"
            }
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {result && <ZedResult result={result} />}
      </main>
    </div>
  );
}
