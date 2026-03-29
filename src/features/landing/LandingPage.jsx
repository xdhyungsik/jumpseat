// src/features/landing/LandingPage.jsx
import { Link } from "react-router-dom";
import { PlaneTakeoff, Calculator, ClipboardList, BookOpen, ArrowRight, CheckCircle } from "lucide-react";

const FEATURES = [
  {
    icon: Calculator,
    title: "ZED Fare Calculator",
    desc: "Instantly estimate your Zonal Employee Discount fare on any partner carrier across 500+ airports worldwide.",
  },
  {
    icon: PlaneTakeoff,
    title: "Flight Schedules",
    desc: "Look up real-time flight schedules for any route. Know what's flying before you list.",
  },
  {
    icon: ClipboardList,
    title: "Jump & Standby Requests",
    desc: "Track your jumpseat and non-rev standby requests in one place. Know your position on the list.",
  },
  {
    icon: BookOpen,
    title: "Pass Logbook",
    desc: "Log every trip — boarded, denied, upgraded. Track your success rate and miles flown over time.",
  },
];

const PERKS = [
  "Free to use",
  "Built for airline employees",
  "Works on any device",
  "Your data stays private",
  "No ads, ever",
  "Constantly improving",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <PlaneTakeoff size={18} className="text-sky-400" />
          <span className="font-display text-lg font-black tracking-tight">
            Jump<span className="text-sky-400">seat</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"
            className="text-sm font-semibold text-white/50 hover:text-white transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link to="/login"
            className="text-sm font-bold bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-400 transition-colors shadow-[0_0_20px_rgba(14,165,233,0.3)]">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Built for airline employees
        </div>

        <h1 className="font-display text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6">
          Non-rev travel,<br />
          <span className="text-sky-400">finally organized.</span>
        </h1>

        <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
          Jumpseat is the all-in-one tool for airline employees — ZED fares, flight schedules, standby tracking, and your complete pass logbook in one place.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/login"
            className="flex items-center gap-2 bg-sky-500 text-white font-display font-black text-sm uppercase tracking-widest px-6 py-3.5 rounded-xl hover:bg-sky-400 transition-all shadow-[0_0_32px_rgba(14,165,233,0.4)]">
            Start for free
            <ArrowRight size={16} />
          </Link>
          <a href="#features"
            className="text-sm font-semibold text-white/40 hover:text-white/70 transition-colors px-4 py-3.5">
            See what's inside →
          </a>
        </div>

        {/* Hero visual */}
        <div className="mt-20 rounded-2xl border border-white/10 bg-white/[0.02] p-1 max-w-3xl mx-auto shadow-[0_0_80px_rgba(14,165,233,0.08)]">
          <div className="rounded-xl bg-[#0f1629] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <div className="ml-2 text-xs text-white/20 font-mono">jumpseat.pro/zed</div>
            </div>
            {/* Mock ZED calculator UI */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-sky-400 font-semibold uppercase tracking-widest mb-1">Origin</div>
                <div className="font-mono text-white font-bold">JFK</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-sky-400 font-semibold uppercase tracking-widest mb-1">Destination</div>
                <div className="font-mono text-white font-bold">ICN</div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 mb-3">
              <div className="text-xs text-sky-400 font-semibold uppercase tracking-widest mb-1">Carrier</div>
              <div className="text-white text-sm">KE · Korean Air</div>
            </div>
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-bold text-white uppercase tracking-wide">Estimated Total</span>
              <span className="font-display text-2xl font-black text-sky-400">$319.00 <span className="text-sm font-sans text-white/40">USD</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-3">
            Everything you need.<br />
            <span className="text-sky-400">Nothing you don't.</span>
          </h2>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            Four modules, built specifically for how airline employees actually travel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                <Icon size={18} className="text-sky-400" />
              </div>
              <h3 className="font-display text-lg font-black text-white mb-2">{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-3xl font-black text-white mb-3">
                Made by someone<br />
                <span className="text-sky-400">who gets it.</span>
              </h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-sm">
                Jumpseat was built for the non-rev community. No bloat, no BS — just the tools you actually use when you're trying to get on a flight.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PERKS.map(perk => (
                <div key={perk} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-sky-400 shrink-0" />
                  <span className="text-sm text-white/60">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-4xl font-black text-white mb-4">
          Ready to fly smarter?
        </h2>
        <p className="text-white/40 text-sm mb-8">
          Free forever. No credit card required.
        </p>
        <Link to="/login"
          className="inline-flex items-center gap-2 bg-sky-500 text-white font-display font-black text-sm uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-sky-400 transition-all shadow-[0_0_32px_rgba(14,165,233,0.4)]">
          Create your account
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlaneTakeoff size={14} className="text-sky-400" />
          <span className="font-display text-sm font-black">Jump<span className="text-sky-400">seat</span></span>
        </div>
        <p className="text-xs text-white/20">For airline employees only. © 2026 Jumpseat.</p>
      </footer>
    </div>
  );
}
