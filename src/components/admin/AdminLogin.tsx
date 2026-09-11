import React, { useState } from "react";
import { PixelWindowsLogo } from "../PixelIcons";
import { Eye, EyeOff, KeyRound, ShieldAlert, ArrowLeft, CheckCircle2 } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (token: string, username: string) => void;
  onNavigateToDesktop?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onNavigateToDesktop,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      if (data.token) {
        localStorage.setItem("admin_token", data.token);
        onLoginSuccess(data.token, data.username || "admin");
      } else {
        throw new Error("No authorization token received from server");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071329] flex flex-col items-center justify-center p-4 select-none font-pixel relative overflow-hidden">
      {/* Background Pixel Grid Pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top Header Return Button */}
      {onNavigateToDesktop && (
        <div className="fixed top-4 left-4 z-20">
          <button
            onClick={onNavigateToDesktop}
            className="flex items-center gap-2 bg-[#0e214d]/90 hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO DESKTOP</span>
          </button>
        </div>
      )}

      <div className="w-full max-w-md bg-[#0f2854] border-3 border-[#3b82f6] shadow-[0_0_0_2px_#93c5fd,0_20px_50px_rgba(0,0,0,0.9)] rounded-t-lg rounded-b-md overflow-hidden text-white relative z-10">
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#17468a] via-[#1d529f] to-[#17468a] px-3 py-2.5 border-b-2 border-[#1e3a8a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PixelWindowsLogo size={18} />
            <span className="font-bold text-xs md:text-sm tracking-wider">
              ADMIN CMS AUTHENTICATION
            </span>
          </div>
          <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono">
            SECURE
          </span>
        </div>

        {/* Login Body */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#1e40af] border-2 border-[#38bdf8] mx-auto flex items-center justify-center shadow-lg">
              <KeyRound size={24} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-[#38bdf8] tracking-wide">
              PORTFOLIO CONTROL CENTER
            </h1>
            <p className="text-xs text-white/70">
              Enter administrator credentials to manage portfolio
            </p>
          </div>

          {error && (
            <div className="bg-[#881337] border-2 border-[#f43f5e] p-3 rounded text-xs text-white flex items-start gap-2 shadow animate-in fade-in duration-200">
              <ShieldAlert size={16} className="text-rose-300 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Authentication Failed</p>
                <p className="text-white/90 text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-[#064e3b] border-2 border-[#10b981] p-3 rounded text-xs text-white flex items-start gap-2 shadow animate-in fade-in duration-200">
              <CheckCircle2 size={16} className="text-emerald-300 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Success</p>
                <p className="text-white/90 text-[11px] mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/80 mb-1 font-bold">
                ADMIN USERNAME
              </label>
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#0a152d] border border-[#1e40af] focus:border-[#38bdf8] p-2.5 text-white font-mono text-xs rounded outline-none transition-colors shadow-inner"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-white/80 font-bold">
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#38bdf8] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0a152d] border border-[#1e40af] focus:border-[#38bdf8] p-2.5 pr-9 text-white font-mono text-xs rounded outline-none transition-colors shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] disabled:opacity-50 text-white border-2 border-[#60a5fa] py-2.5 font-bold text-xs cursor-pointer shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? "AUTHENTICATING..." : "LOG IN TO DASHBOARD >"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
