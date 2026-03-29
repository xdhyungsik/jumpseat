// src/features/listings/FlightCard.jsx
import { formatTime, calcDuration, statusMeta } from "../../lib/aviationstack";

export default function FlightCard({ flight }) {
  const status   = statusMeta(flight.status);
  const duration = calcDuration(flight.depScheduled, flight.arrScheduled);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-150 overflow-hidden">
      {/* Top row — airline + flight number + status */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-mono font-bold text-white">
            {flight.airlineIata || "?"}
          </div>
          <div>
            <div className="text-sm font-bold text-white font-mono">{flight.flightNumber}</div>
            <div className="text-xs text-white/40">{flight.airline}</div>
          </div>
        </div>

        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Main row — route + times */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Departure */}
        <div className="text-center min-w-[60px]">
          <div className="font-display text-2xl font-black text-white">{formatTime(flight.depScheduled)}</div>
          <div className="text-xs font-mono text-sky-400 mt-0.5">{flight.depIata}</div>
          {flight.depTerminal && (
            <div className="text-xs text-white/30 mt-0.5">T{flight.depTerminal}</div>
          )}
        </div>

        {/* Duration / arrow */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {duration && <div className="text-xs text-white/30">{duration}</div>}
          <div className="flex items-center gap-1.5 w-full">
            <div className="h-px flex-1 bg-white/10" />
            <div className="text-white/20 text-xs">✈</div>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          {flight.aircraft && (
            <div className="text-xs text-white/25 font-mono">{flight.aircraft}</div>
          )}
        </div>

        {/* Arrival */}
        <div className="text-center min-w-[60px]">
          <div className="font-display text-2xl font-black text-white">{formatTime(flight.arrScheduled)}</div>
          <div className="text-xs font-mono text-sky-400 mt-0.5">{flight.arrIata}</div>
          {flight.arrTerminal && (
            <div className="text-xs text-white/30 mt-0.5">T{flight.arrTerminal}</div>
          )}
        </div>
      </div>

      {/* Bottom row — gate info if available */}
      {(flight.depGate || flight.arrGate) && (
        <div className="px-5 py-2 border-t border-white/5 flex gap-4">
          {flight.depGate && (
            <div className="text-xs text-white/30">
              Dep Gate <span className="text-white/60 font-mono">{flight.depGate}</span>
            </div>
          )}
          {flight.arrGate && (
            <div className="text-xs text-white/30">
              Arr Gate <span className="text-white/60 font-mono">{flight.arrGate}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
