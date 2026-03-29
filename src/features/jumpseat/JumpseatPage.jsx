// src/features/jumpseat/JumpseatPage.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { ALL_AIRPORTS, CARRIERS } from "../zed/zedData";
import {
  getRequests,
  createRequest,
  updateRequestStatus,
  updateRequestPriority,
  createPassEntry,
} from "../../lib/supabase";
import clsx from "clsx";

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUEST_TYPES = [
  {
    id:    "jumpseat",
    label: "Jumpseat",
    desc:  "Cockpit jumpseat — pilots & FAs only. Requires captain approval.",
    roles: ["Captain","First Officer","Flight Attendant"],
  },
  {
    id:    "standby",
    label: "Standby / Non-Rev",
    desc:  "Passenger cabin standby — any airline employee.",
    roles: ["Any Employee"],
  },
];

const CABIN_PREFS = ["Economy","Premium Economy","Business","First","Any Available"];

const STATUS_META = {
  pending:  { label:"Pending",  color:"text-amber-400", bg:"bg-amber-400/10 border-amber-400/20" },
  approved: { label:"Approved", color:"text-green-400", bg:"bg-green-400/10 border-green-400/20" },
  denied:   { label:"Denied",   color:"text-red-400",   bg:"bg-red-400/10   border-red-400/20"   },
  listed:   { label:"Listed",   color:"text-sky-400",   bg:"bg-sky-400/10   border-sky-400/20"   },
  boarded:  { label:"Boarded",  color:"text-green-500", bg:"bg-green-500/10 border-green-500/20" },
  cancelled:{ label:"Cancelled",color:"text-white/30",  bg:"bg-white/5      border-white/10"     },
};

const SORTED_CARRIERS = [...CARRIERS].sort((a, b) => a.name.localeCompare(b.name));
const CARRIER_MAP     = Object.fromEntries(CARRIERS.map(c => [c.code, c.name]));

function getAirlineFromFlight(flightNum) {
  if (!flightNum || flightNum.length < 2) return null;
  const code2 = flightNum.slice(0, 2).toUpperCase();
  if (CARRIER_MAP[code2]) return { code: code2, name: CARRIER_MAP[code2] };
  const code1 = flightNum.slice(0, 1).toUpperCase();
  if (CARRIER_MAP[code1]) return { code: code1, name: CARRIER_MAP[code1] };
  return null;
}

function normalizeRow(row) {
  return {
    id:            row.id,
    type:          row.type,
    flightNumber:  row.flight_number,
    airline:       row.airline ?? "",
    origin:        row.origin,
    destination:   row.destination,
    date:          row.date,
    role:          row.role ?? "",
    cabin:         row.cabin ?? "",
    notes:         row.notes ?? "",
    status:        row.status,
    priorityPos:   row.priority_pos   ?? null,
    priorityTotal: row.priority_total ?? null,
    createdAt:     row.created_at,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
      {children}
    </label>
  );
}

function AirportInput({ id, placeholder, onChange }) {
  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
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

function SimpleSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
        className={clsx("w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none transition-all",
          open ? "border-sky-500/50" : "", value ? "text-white" : "text-white/25")}>
        <span className="truncate">{value || placeholder}</span>
        <span className={clsx("text-white/40 text-xs shrink-0 transition-transform", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-y-auto max-h-48">
          {options.map(o => (
            <li key={o} onMouseDown={() => { onChange(o); setOpen(false); }}
              className={clsx("px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between",
                o === value ? "bg-sky-500/20 text-sky-300" : "text-white hover:bg-white/5")}>
              {o}{o === value && <span className="text-sky-400 text-xs">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AirlineSelect({ value, onChange }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref      = useRef(null);
  const inputRef = useRef(null);

  const selected = SORTED_CARRIERS.find(c => c.name === value);
  const filtered = search.trim() === ""
    ? SORTED_CARRIERS
    : SORTED_CARRIERS.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={clsx("w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none transition-all",
          open ? "border-sky-500/50" : "", value ? "text-white" : "text-white/25")}>
        <span className="truncate">{value || "Select airline…"}</span>
        <span className={clsx("text-white/40 text-xs shrink-0 transition-transform", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Type airline or code…"
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-sky-500 focus:outline-none" />
          </div>
          <ul className="overflow-y-auto max-h-44">
            {filtered.length === 0
              ? <li className="px-4 py-3 text-sm text-white/30 text-center">No airlines found</li>
              : filtered.map(c => (
                <li key={c.code} onMouseDown={() => { onChange(c.name); setOpen(false); setSearch(""); }}
                  className={clsx("px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between gap-2",
                    c.name === value ? "bg-sky-500/20 text-sky-300" : "text-white hover:bg-white/5")}>
                  <span className="truncate">
                    <span className="font-mono font-semibold text-xs mr-2 text-white/40">{c.code}</span>
                    {c.name}
                  </span>
                  {c.name === value && <span className="text-sky-400 text-xs shrink-0">✓</span>}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Priority Editor ──────────────────────────────────────────────────────────
function PriorityEditor({ req, onSave }) {
  const [pos,   setPos]   = useState(req.priorityPos   ?? "");
  const [total, setTotal] = useState(req.priorityTotal ?? "");

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-white/40">Standby position:</span>
      <input value={pos} onChange={e => setPos(e.target.value)} placeholder="#"
        className="w-12 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono text-white text-center focus:border-sky-500 focus:outline-none" />
      <span className="text-xs text-white/30">of</span>
      <input value={total} onChange={e => setTotal(e.target.value)} placeholder="?"
        className="w-12 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono text-white text-center focus:border-sky-500 focus:outline-none" />
      <button onClick={() => onSave(req.id, Number(pos) || null, Number(total) || null)}
        className="text-xs px-2 py-1 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/20 hover:bg-sky-500/30 transition-colors">
        Save
      </button>
    </div>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ req, onUpdateStatus, onUpdatePriority }) {
  const status = STATUS_META[req.status] ?? STATUS_META.pending;
  const type   = REQUEST_TYPES.find(t => t.id === req.type);
  const [showPriority, setShowPriority] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div>
          <span className="text-sm font-bold text-white font-mono">{req.flightNumber}</span>
          <span className="text-xs text-white/40 ml-2">{req.airline || "—"} · {type?.label}</span>
        </div>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}>
          {status.label}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="text-center">
            <div className="font-display text-2xl font-black text-white">{req.origin}</div>
            <div className="text-xs text-white/40">{req.date}</div>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-white/20 text-xs">—</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-black text-white">{req.destination}</div>
            {req.cabin && <div className="text-xs text-white/40">{req.cabin}</div>}
          </div>
        </div>

        {req.role  && <div className="text-xs text-white/30">Role: <span className="text-white/50">{req.role}</span></div>}
        {req.notes && <div className="text-xs text-white/30 mt-0.5">Note: <span className="text-white/50 italic">{req.notes}</span></div>}

        {(req.status === "listed" || req.status === "pending" || req.status === "approved") && (
          <div className="mt-3">
            {req.priorityPos ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-1.5">
                  <span className="text-sky-400 text-xs font-mono font-bold">#{req.priorityPos}</span>
                  {req.priorityTotal && <span className="text-white/30 text-xs">of {req.priorityTotal}</span>}
                  <span className="text-xs text-white/30 ml-1">on standby list</span>
                </div>
                <button onClick={() => setShowPriority(p => !p)} className="text-xs text-white/30 hover:text-white/60 transition-colors">edit</button>
              </div>
            ) : (
              <button onClick={() => setShowPriority(p => !p)}
                className="text-xs text-white/30 hover:text-sky-400 transition-colors border border-white/10 rounded-lg px-3 py-1.5 hover:border-sky-500/30">
                + Add standby position
              </button>
            )}
            {showPriority && (
              <PriorityEditor req={req} onSave={async (id, pos, total) => {
                await onUpdatePriority(id, pos, total);
                setShowPriority(false);
              }} />
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {req.status === "pending" && (
        <div className="px-5 py-3 border-t border-white/5 flex gap-2">
          <button onClick={() => onUpdateStatus(req.id, "approved", req)}
            className="flex-1 rounded-lg py-2 text-xs font-bold bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors">Approved</button>
          <button onClick={() => onUpdateStatus(req.id, "listed", req)}
            className="flex-1 rounded-lg py-2 text-xs font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors">Listed</button>
          <button onClick={() => onUpdateStatus(req.id, "denied", req)}
            className="flex-1 rounded-lg py-2 text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">Denied</button>
          <button onClick={() => onUpdateStatus(req.id, "cancelled", req)}
            className="flex-1 rounded-lg py-2 text-xs font-bold bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-colors">Cancel</button>
        </div>
      )}
      {(req.status === "approved" || req.status === "listed") && (
        <div className="px-5 py-3 border-t border-white/5 flex gap-2">
          <button onClick={() => onUpdateStatus(req.id, "boarded", req)}
            className="flex-1 rounded-lg py-2 text-xs font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors">
            Boarded — sync to Pass Log ✓
          </button>
          <button onClick={() => onUpdateStatus(req.id, "denied", req)}
            className="flex-1 rounded-lg py-2 text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">Denied</button>
          <button onClick={() => onUpdateStatus(req.id, "cancelled", req)}
            className="flex-1 rounded-lg py-2 text-xs font-bold bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-colors">Cancel</button>
        </div>
      )}
    </div>
  );
}

// ─── New Request Form ─────────────────────────────────────────────────────────
function NewRequestForm({ onSubmit, onClose }) {
  const [type,    setType]    = useState("standby");
  const [flight,  setFlight]  = useState("");
  const [airline, setAirline] = useState("");
  const [origin,  setOrigin]  = useState("");
  const [dest,    setDest]    = useState("");
  const [date,    setDate]    = useState(new Date().toISOString().split("T")[0]);
  const [role,    setRole]    = useState("");
  const [cabin,   setCabin]   = useState("");
  const [notes,   setNotes]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const selectedType = REQUEST_TYPES.find(t => t.id === type);
  const canSubmit    = flight && origin.length === 3 && dest.length === 3 && date && !saving;

  function handleFlightChange(e) {
    const val = e.target.value.toUpperCase();
    setFlight(val);
    const detected = getAirlineFromFlight(val);
    if (detected && !airline) setAirline(detected.name);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit({
        type,
        flightNumber: flight,
        airline,
        origin:       origin.toUpperCase(),
        destination:  dest.toUpperCase(),
        date,
        role: role || selectedType?.roles[0],
        cabin: type === "standby" ? cabin : null,
        notes,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0e1a] overflow-hidden"
        style={{ animation:"fadeUp 0.2s ease both" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display text-lg font-black text-white">New Request</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Type */}
          <div className="grid grid-cols-2 gap-3">
            {REQUEST_TYPES.map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={clsx("rounded-xl p-3 text-left border transition-all",
                  type === t.id ? "border-sky-500/50 bg-sky-500/10" : "border-white/10 bg-white/5 hover:bg-white/8")}>
                <div className="text-sm font-bold text-white">{t.label}</div>
                <div className="text-xs text-white/40 mt-0.5 leading-snug">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Flight number */}
          <div>
            <Label htmlFor="flight">Flight Number</Label>
            <input id="flight" value={flight} onChange={handleFlightChange} placeholder="KE082"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 uppercase focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            {flight.length >= 2 && getAirlineFromFlight(flight) && (
              <p className="text-xs text-sky-400 mt-1">Detected: {getAirlineFromFlight(flight)?.name}</p>
            )}
          </div>

          {/* Airline dropdown */}
          <div>
            <Label>Airline</Label>
            <AirlineSelect value={airline} onChange={setAirline} />
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>From</Label><AirportInput placeholder="JFK" onChange={setOrigin} /></div>
            <div><Label>To</Label><AirportInput placeholder="ICN" onChange={setDest} /></div>
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="req-date">Date</Label>
            <input id="req-date" type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
          </div>

          {type === "jumpseat" && (
            <div>
              <Label>Your Role</Label>
              <SimpleSelect options={selectedType.roles} value={role} onChange={setRole} placeholder="Select role…" />
            </div>
          )}

          {type === "standby" && (
            <div>
              <Label>Cabin Preference</Label>
              <SimpleSelect options={CABIN_PREFS} value={cabin} onChange={setCabin} placeholder="Select cabin…" />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Commuting, deadhead, etc." rows={2}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl py-3 text-sm font-bold border border-white/10 text-white/40 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className={clsx("flex-1 rounded-xl py-3 font-display font-black text-sm uppercase tracking-widest transition-all",
              canSubmit ? "bg-sky-500 text-white hover:bg-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.3)]" : "bg-white/5 text-white/25 cursor-not-allowed")}>
            {saving ? "Saving…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JumpseatPage() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState("all");
  const [syncMsg,  setSyncMsg]  = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await getRequests();
      setRequests(rows.map(normalizeRow));
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(req) {
    const saved = await createRequest(req);
    setRequests(prev => [normalizeRow(saved), ...prev]);
    setShowForm(false);
  }

  async function handleUpdateStatus(id, status, req) {
    await updateRequestStatus(id, status);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));

    // Auto-sync to Pass Log when boarded or denied
    if (status === "boarded" || status === "denied") {
      try {
        await createPassEntry({
          flightNumber: req.flightNumber,
          airline:      req.airline,
          origin:       req.origin,
          destination:  req.destination,
          date:         req.date,
          cabin:        req.cabin || null,
          outcome:      status === "boarded" ? "boarded" : "denied",
          seat:         null,
          loadPct:      null,
          notes:        req.notes || `Synced from ${req.type} request`,
        });
        setSyncMsg(status === "boarded" ? "Synced to Pass Log!" : "Denial logged in Pass Log");
        setTimeout(() => setSyncMsg(""), 3000);
      } catch (err) {
        console.error("Failed to sync to pass log:", err);
      }
    }
  }

  async function handleUpdatePriority(id, pos, total) {
    await updateRequestPriority(id, pos, total);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, priorityPos: pos, priorityTotal: total } : r));
  }

  const filters = [
    { id:"all",      label:"All"      },
    { id:"pending",  label:"Pending"  },
    { id:"approved", label:"Approved" },
    { id:"listed",   label:"Listed"   },
    { id:"boarded",  label:"Boarded"  },
    { id:"denied",   label:"Denied"   },
  ];

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const counts = {
    pending:  requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved" || r.status === "listed").length,
    boarded:  requests.filter(r => r.status === "boarded").length,
  };

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(1rem); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-black tracking-tight leading-none">
              Jump &<br /><span className="text-sky-400">Standby</span>
            </h1>
            <p className="mt-3 text-sm text-white/40 max-w-sm">
              Track your jumpseat and non-rev standby requests.
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="mt-1 rounded-xl px-4 py-2.5 bg-sky-500 text-white text-sm font-display font-black uppercase tracking-widest hover:bg-sky-400 transition-colors shadow-[0_0_20px_rgba(14,165,233,0.3)]">
            + New
          </button>
        </div>

        {/* Sync toast */}
        {syncMsg && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
            {syncMsg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label:"Pending",  value:counts.pending,  color:"text-amber-400" },
            { label:"Approved", value:counts.approved, color:"text-green-400" },
            { label:"Boarded",  value:counts.boarded,  color:"text-sky-400"   },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
              <div className={`font-display text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={clsx("rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-all",
                filter === f.id ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/8")}>
              {f.label}
              {f.id !== "all" && <span className="ml-1.5 opacity-60">{requests.filter(r => r.status === f.id).length}</span>}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="h-6 w-6 rounded-full border-2 border-white/20 border-t-sky-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <div className="text-white/40 text-sm">No requests yet.</div>
            <div className="text-white/25 text-xs mt-1">Hit "+ New" to add one.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(req => (
              <RequestCard key={req.id} req={req}
                onUpdateStatus={handleUpdateStatus}
                onUpdatePriority={handleUpdatePriority} />
            ))}
          </div>
        )}
      </main>

      {showForm && <NewRequestForm onSubmit={handleSubmit} onClose={() => setShowForm(false)} />}
    </div>
  );
}
