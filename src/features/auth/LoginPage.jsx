// src/features/auth/LoginPage.jsx
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { PlaneTakeoff } from "lucide-react";
import clsx from "clsx";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode,     setMode]     = useState("signin"); // "signin" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccess("Check your email to confirm your account, then sign in.");
        setMode("signin");
      }
    } catch (err) {
      const msg = err.message ?? "";
      if (msg.includes("Invalid login")) {
        setError("Incorrect email or password. Please try again.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Please confirm your email before signing in.");
      } else if (msg.includes("Too many requests")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }    } finally {
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
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          <PlaneTakeoff size={20} className="text-sky-400" />
          <span className="font-display text-2xl font-black tracking-tight">
            Jump<span className="text-sky-400">seat</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <h1 className="font-display text-2xl font-black text-white mb-1">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-white/40 mb-8">
            {mode === "signin"
              ? "Sign in to access your Jumpseat account."
              : "Join Jumpseat — non-rev travel made easy."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@airline.com"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
                Password
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
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </span>
                : mode === "signin" ? "Sign In →" : "Create Account →"
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSuccess(""); }}
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          For airline employees only. Non-rev travel tool.
        </p>
      </div>
    </div>
  );
}
