// src/features/auth/ResetPasswordPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { PlaneTakeoff } from "lucide-react";
import clsx from "clsx";

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPw) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess("Password updated. Redirecting…");
      setTimeout(() => navigate("/zed"), 1500);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080c18] text-white flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <PlaneTakeoff size={20} className="text-sky-400" />
          <span className="font-display text-2xl font-black tracking-tight">
            Jump<span className="text-sky-400">seat</span>
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <h1 className="font-display text-2xl font-black text-white mb-1">
            Set new password
          </h1>
          <p className="text-sm text-white/40 mb-8">
            Enter a new password for your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "w-full rounded-xl py-3.5 font-display font-black text-sm uppercase tracking-widest transition-all",
                loading
                  ? "bg-sky-500/50 text-white/50 cursor-not-allowed"
                  : "bg-sky-500 text-white hover:bg-sky-400 shadow-[0_0_24px_rgba(14,165,233,0.35)]"
              )}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Updating…
                  </span>
                : "Update Password →"
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}