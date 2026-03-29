// src/components/layout/AppShell.jsx
import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Calculator, PlaneTakeoff, ClipboardList, BookOpen, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import clsx from "clsx";

const NAV_ITEMS = [
  { path: "/zed",      label: "ZED Fares", icon: Calculator    },
  { path: "/listings", label: "Flights",   icon: PlaneTakeoff  },
  { path: "/jumpseat", label: "Requests",  icon: ClipboardList },
  { path: "/passbook", label: "Pass Log",  icon: BookOpen      },
];

function UserMenu({ user, signOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const email = user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border border-white/10 hover:bg-white/5 transition-all duration-150"
      >
        <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <span className="text-sky-400 text-xs font-bold">{initials}</span>
        </div>
        <ChevronDown size={12} className={clsx("text-white/40 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0f1629] shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-xs text-white/40 truncate">{email}</div>
          </div>
          <button
            onClick={async () => { await signOut(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <header className="relative z-20 border-b border-white/5 bg-[#080c18]/80 backdrop-blur-sm sticky top-0">
        <div className="mx-auto max-w-5xl px-6 flex items-center gap-8 h-14">
          <NavLink to="/zed" className="flex items-center gap-2 shrink-0">
            <PlaneTakeoff size={16} className="text-sky-400" />
            <span className="font-display text-base font-black tracking-tight">
              Jump<span className="text-sky-400">seat</span>
            </span>
          </NavLink>

          <nav className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150",
                  isActive
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                )}
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>

          {user
            ? <UserMenu user={user} signOut={signOut} />
            : <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <User size={14} className="text-white/30" />
              </div>
          }
        </div>
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}
