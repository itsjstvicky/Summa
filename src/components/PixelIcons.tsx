import React from "react";

// Crisp 8-bit pixel art SVG icons that match the reference image exactly

export const PixelWindowsLogo: React.FC<{ className?: string; size?: number }> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ imageRendering: "pixelated" }}>
    <rect x="2" y="2" width="9" height="9" fill="#00adef" />
    <rect x="13" y="2" width="9" height="9" fill="#00a4ef" />
    <rect x="2" y="13" width="9" height="9" fill="#0078d7" />
    <rect x="13" y="13" width="9" height="9" fill="#0063b1" />
  </svg>
);

export const PixelWindowsPerspectiveLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ imageRendering: "pixelated" }}>
    {/* Windows 11 angled 4-quadrant pixel logo from reference */}
    <polygon points="5,15 45,9 45,38 5,38" fill="#38bdf8" />
    <polygon points="50,8 95,1 95,38 50,38" fill="#0ea5e9" />
    <polygon points="5,42 45,42 45,71 5,65" fill="#0284c7" />
    <polygon points="50,42 95,42 95,79 50,72" fill="#0369a1" />
    {/* Pixel grid highlights */}
    <rect x="7" y="17" width="4" height="4" fill="#7dd3fc" opacity="0.6" />
    <rect x="52" y="10" width="4" height="4" fill="#7dd3fc" opacity="0.7" />
  </svg>
);

export const PixelThisPCIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    {/* CRT Monitor Case */}
    <rect x="4" y="3" width="24" height="18" fill="#1e293b" />
    <rect x="5" y="4" width="22" height="16" fill="#38bdf8" />
    <rect x="7" y="6" width="18" height="12" fill="#0284c7" />
    {/* Screen Glare & Window */}
    <rect x="8" y="7" width="10" height="2" fill="#bae6fd" />
    <rect x="8" y="10" width="4" height="2" fill="#bae6fd" />
    <rect x="18" y="12" width="5" height="4" fill="#0369a1" />
    {/* Stand & Base */}
    <rect x="13" y="21" width="6" height="4" fill="#94a3b8" />
    <rect x="8" y="25" width="16" height="3" fill="#64748b" />
    <rect x="9" y="26" width="14" height="1" fill="#cbd5e1" />
  </svg>
);

export const PixelFolderIcon: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ imageRendering: "pixelated" }}>
    {/* Folder Tab */}
    <rect x="4" y="6" width="10" height="4" fill="#d97706" />
    <rect x="5" y="7" width="8" height="3" fill="#fbbf24" />
    {/* Back Body */}
    <rect x="4" y="9" width="24" height="16" fill="#b45309" />
    {/* Folder Paper */}
    <rect x="7" y="8" width="18" height="4" fill="#fef3c7" />
    {/* Front Body */}
    <rect x="3" y="11" width="26" height="15" fill="#f59e0b" />
    <rect x="5" y="13" width="22" height="11" fill="#fbbf24" />
    <rect x="5" y="13" width="22" height="2" fill="#fef08a" />
  </svg>
);

export const PixelSkillsIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    {/* Avatar Head */}
    <rect x="10" y="4" width="12" height="11" fill="#fbcfe8" />
    <rect x="9" y="5" width="14" height="9" fill="#f472b6" />
    <rect x="11" y="6" width="10" height="7" fill="#fce7f3" />
    {/* Shoulders / Bust */}
    <rect x="4" y="17" width="24" height="11" fill="#ec4899" />
    <rect x="6" y="16" width="20" height="11" fill="#db2777" />
    <rect x="8" y="17" width="16" height="8" fill="#f472b6" />
    {/* Blue accent shadow on bottom */}
    <rect x="4" y="26" width="24" height="3" fill="#3b82f6" />
  </svg>
);

export const PixelProjectsIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    {/* 4 Colored Tiles Container */}
    <rect x="3" y="3" width="26" height="26" fill="#1e293b" />
    {/* Red/Orange Tile */}
    <rect x="5" y="5" width="10" height="10" fill="#ef4444" />
    <rect x="6" y="6" width="8" height="8" fill="#f87171" />
    {/* Green Tile */}
    <rect x="17" y="5" width="10" height="10" fill="#10b981" />
    <rect x="18" y="6" width="8" height="8" fill="#34d399" />
    {/* Blue Tile */}
    <rect x="5" y="17" width="10" height="10" fill="#3b82f6" />
    <rect x="6" y="18" width="8" height="8" fill="#60a5fa" />
    {/* Yellow Tile */}
    <rect x="17" y="17" width="10" height="10" fill="#f59e0b" />
    <rect x="18" y="18" width="8" height="8" fill="#fbbf24" />
  </svg>
);

export const PixelContactIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    {/* Envelope Body */}
    <rect x="3" y="6" width="26" height="19" fill="#0284c7" />
    <rect x="4" y="7" width="24" height="17" fill="#ffffff" />
    {/* Envelope Flap */}
    <polygon points="4,7 16,17 28,7" fill="#38bdf8" />
    <polygon points="5,7 16,15 27,7" fill="#e0f2fe" />
    {/* Side Folds */}
    <polygon points="4,24 12,16 4,10" fill="#bae6fd" />
    <polygon points="28,24 20,16 28,10" fill="#bae6fd" />
    {/* Bottom Fold */}
    <polygon points="4,24 16,14 28,24" fill="#7dd3fc" />
  </svg>
);

export const PixelRecycleBinIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    {/* Bin Rim & Lid */}
    <rect x="7" y="4" width="18" height="3" fill="#cbd5e1" />
    <rect x="6" y="7" width="20" height="2" fill="#94a3b8" />
    {/* Wire Body */}
    <rect x="7" y="9" width="18" height="18" fill="#64748b" />
    <rect x="8" y="9" width="16" height="17" fill="#1e293b" />
    {/* Blue internal glow / mesh wires */}
    <rect x="10" y="10" width="2" height="15" fill="#38bdf8" opacity="0.8" />
    <rect x="15" y="10" width="2" height="15" fill="#38bdf8" opacity="0.8" />
    <rect x="20" y="10" width="2" height="15" fill="#38bdf8" opacity="0.8" />
    <rect x="8" y="14" width="16" height="2" fill="#64748b" />
    <rect x="8" y="20" width="16" height="2" fill="#64748b" />
    {/* Base */}
    <rect x="8" y="27" width="16" height="2" fill="#94a3b8" />
  </svg>
);

export const PixelExperienceIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    {/* Briefcase Handle */}
    <rect x="12" y="4" width="8" height="2" fill="#0369a1" />
    <rect x="11" y="5" width="2" height="3" fill="#0284c7" />
    <rect x="19" y="5" width="2" height="3" fill="#0284c7" />
    {/* Briefcase Main Case */}
    <rect x="4" y="8" width="24" height="19" fill="#0f172a" />
    <rect x="5" y="9" width="22" height="17" fill="#0284c7" />
    {/* Gold Trim / Straps */}
    <rect x="8" y="9" width="2" height="17" fill="#fbbf24" />
    <rect x="22" y="9" width="2" height="17" fill="#fbbf24" />
    {/* Top Lid Division */}
    <rect x="5" y="15" width="22" height="2" fill="#0369a1" />
    {/* Center Gold Lock / Clasp */}
    <rect x="14" y="14" width="4" height="4" fill="#f59e0b" />
    <rect x="15" y="15" width="2" height="2" fill="#fef08a" />
    {/* Corner Protectors */}
    <rect x="4" y="24" width="3" height="3" fill="#38bdf8" />
    <rect x="25" y="24" width="3" height="3" fill="#38bdf8" />
  </svg>
);


export const PixelAvatar: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ imageRendering: "pixelated" }}>
    {/* Dark Hoodie Background */}
    <rect width="100" height="100" fill="#38bdf8" />
    {/* Inner sky glow */}
    <rect x="4" y="4" width="92" height="92" fill="#0284c7" />
    
    {/* Boy Pixel Art from Reference */}
    {/* Spiky Black Hair */}
    {/* Hair spikes top & sides */}
    <rect x="25" y="16" width="50" height="30" fill="#09090b" />
    <rect x="30" y="10" width="20" height="10" fill="#09090b" />
    <rect x="52" y="12" width="18" height="12" fill="#09090b" />
    <rect x="68" y="18" width="12" height="22" fill="#09090b" />
    <rect x="18" y="22" width="14" height="24" fill="#09090b" />
    <rect x="22" y="14" width="12" height="10" fill="#18181b" />
    <rect x="42" y="8" width="12" height="8" fill="#18181b" />

    {/* Face Skin Tone */}
    <rect x="26" y="32" width="46" height="36" fill="#e0a370" />
    <rect x="28" y="36" width="42" height="30" fill="#eab384" />
    
    {/* Hair bangs over forehead */}
    <rect x="26" y="28" width="10" height="12" fill="#09090b" />
    <rect x="38" y="28" width="12" height="14" fill="#09090b" />
    <rect x="52" y="28" width="14" height="10" fill="#09090b" />
    <rect x="66" y="30" width="8" height="14" fill="#09090b" />

    {/* Eyebrows */}
    <rect x="30" y="42" width="12" height="3" fill="#18181b" />
    <rect x="56" y="42" width="12" height="3" fill="#18181b" />

    {/* Eyes */}
    <rect x="32" y="46" width="8" height="8" fill="#09090b" />
    <rect x="34" y="47" width="3" height="3" fill="#ffffff" />
    <rect x="58" y="46" width="8" height="8" fill="#09090b" />
    <rect x="60" y="47" width="3" height="3" fill="#ffffff" />

    {/* Nose & Smile */}
    <rect x="47" y="55" width="4" height="4" fill="#c7824c" />
    <rect x="43" y="62" width="12" height="3" fill="#18181b" />
    <rect x="53" y="60" width="3" height="3" fill="#18181b" />

    {/* Neck */}
    <rect x="42" y="68" width="14" height="8" fill="#c7824c" />

    {/* Black Hoodie & Collar */}
    <rect x="12" y="74" width="76" height="26" fill="#18181b" />
    <rect x="16" y="78" width="68" height="22" fill="#09090b" />
    <rect x="34" y="74" width="30" height="8" fill="#27272a" />
    {/* Hoodie strings */}
    <rect x="38" y="80" width="3" height="14" fill="#71717a" />
    <rect x="57" y="80" width="3" height="14" fill="#71717a" />
  </svg>
);

export const PixelStar: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ imageRendering: "pixelated" }}>
    <rect x="10" y="2" width="4" height="4" fill="#fbbf24" />
    <rect x="8" y="6" width="8" height="4" fill="#fbbf24" />
    <rect x="2" y="8" width="20" height="4" fill="#f59e0b" />
    <rect x="4" y="12" width="16" height="4" fill="#fbbf24" />
    <rect x="6" y="16" width="12" height="4" fill="#f59e0b" />
    <rect x="4" y="20" width="4" height="3" fill="#f59e0b" />
    <rect x="16" y="20" width="4" height="3" fill="#f59e0b" />
    <rect x="10" y="8" width="4" height="6" fill="#fef08a" />
  </svg>
);

export const PixelHeart: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ imageRendering: "pixelated" }}>
    <rect x="4" y="4" width="6" height="4" fill="#f43f5e" />
    <rect x="14" y="4" width="6" height="4" fill="#f43f5e" />
    <rect x="2" y="8" width="20" height="6" fill="#fb7185" />
    <rect x="4" y="14" width="16" height="4" fill="#f43f5e" />
    <rect x="8" y="18" width="8" height="4" fill="#e11d48" />
    <rect x="10" y="22" width="4" height="2" fill="#be123c" />
    {/* Specular highlight */}
    <rect x="5" y="6" width="2" height="2" fill="#ffe4e6" />
    <rect x="4" y="9" width="3" height="3" fill="#ffe4e6" />
  </svg>
);

// Card 1: UX/UI Pixel illustration (Desktop browser + Mobile UI)
export const PixelUxUiIllustration: React.FC = () => (
  <svg viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{ imageRendering: "pixelated" }}>
    {/* Background tone */}
    <rect width="200" height="130" fill="#8ea1d4" />
    
    {/* Desktop Window */}
    <rect x="16" y="16" width="116" height="96" fill="#1e293b" />
    <rect x="18" y="18" width="112" height="92" fill="#ffffff" />
    {/* Window Header */}
    <rect x="18" y="18" width="112" height="16" fill="#6366f1" />
    <rect x="24" y="24" width="4" height="4" fill="#f43f5e" />
    <rect x="31" y="24" width="4" height="4" fill="#fbbf24" />
    <rect x="38" y="24" width="4" height="4" fill="#10b981" />
    {/* Window Sidebar */}
    <rect x="18" y="34" width="24" height="76" fill="#4338ca" />
    <rect x="22" y="42" width="16" height="4" fill="#a5b4fc" />
    <rect x="22" y="50" width="16" height="4" fill="#818cf8" />
    <rect x="22" y="58" width="16" height="4" fill="#818cf8" />
    {/* Window Main Area */}
    <rect x="46" y="40" width="78" height="24" fill="#e0e7ff" />
    <rect x="52" y="46" width="36" height="4" fill="#4f46e5" />
    <rect x="52" y="53" width="60" height="3" fill="#a5b4fc" />
    {/* Content Cards */}
    <rect x="46" y="70" width="36" height="34" fill="#c7d2fe" />
    <rect x="50" y="74" width="28" height="14" fill="#818cf8" />
    <rect x="86" y="70" width="38" height="34" fill="#e0e7ff" />
    <rect x="90" y="74" width="30" height="6" fill="#6366f1" />
    <rect x="90" y="84" width="24" height="4" fill="#a5b4fc" />

    {/* Smartphone Device */}
    <rect x="136" y="28" width="48" height="86" rx="4" fill="#1e1b4b" />
    <rect x="140" y="32" width="40" height="76" fill="#ffffff" />
    {/* Mobile Screen Elements */}
    <rect x="140" y="32" width="40" height="12" fill="#4f46e5" />
    <rect x="144" y="36" width="14" height="4" fill="#ffffff" />
    <rect x="144" y="48" width="32" height="14" fill="#c7d2fe" />
    <rect x="144" y="66" width="32" height="10" fill="#e0e7ff" />
    <rect x="144" y="80" width="32" height="18" fill="#a5b4fc" />
    {/* Home Indicator */}
    <rect x="154" y="104" width="12" height="2" fill="#6366f1" />
  </svg>
);

// Card 2: AI Videos Pixel illustration (Movie Clapperboard + Sparkles)
export const PixelAiVideosIllustration: React.FC = () => (
  <svg viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{ imageRendering: "pixelated" }}>
    {/* Background tone */}
    <rect width="200" height="130" fill="#91cfab" />
    
    {/* Sparkles around clapperboard */}
    <rect x="36" y="28" width="6" height="6" fill="#047857" />
    <rect x="38" y="24" width="2" height="14" fill="#047857" />
    <rect x="32" y="30" width="14" height="2" fill="#047857" />

    <rect x="164" y="36" width="6" height="6" fill="#047857" />
    <rect x="166" y="32" width="2" height="14" fill="#047857" />
    <rect x="160" y="38" width="14" height="2" fill="#047857" />

    <rect x="156" y="88" width="4" height="4" fill="#047857" />
    <rect x="32" y="84" width="4" height="4" fill="#047857" />

    {/* Clapperboard Body */}
    <rect x="52" y="44" width="96" height="62" fill="#0f172a" />
    <rect x="56" y="48" width="88" height="54" fill="#1e293b" />
    
    {/* Clapper Top Bars with Diagonal Stripes */}
    <rect x="50" y="26" width="100" height="16" fill="#0f172a" />
    {/* Stripes */}
    <polygon points="54,28 62,28 56,40 48,40" fill="#f8fafc" />
    <polygon points="72,28 80,28 74,40 66,40" fill="#f8fafc" />
    <polygon points="90,28 98,28 92,40 84,40" fill="#f8fafc" />
    <polygon points="108,28 116,28 110,40 102,40" fill="#f8fafc" />
    <polygon points="126,28 134,28 128,40 120,40" fill="#f8fafc" />
    <polygon points="144,28 148,28 142,40 138,40" fill="#f8fafc" />

    {/* Clapper Lower Strip */}
    <rect x="56" y="44" width="88" height="10" fill="#334155" />
    <polygon points="56,44 64,44 58,54 50,54" fill="#e2e8f0" />
    <polygon points="74,44 82,44 76,54 68,54" fill="#e2e8f0" />
    <polygon points="92,44 100,44 94,54 86,54" fill="#e2e8f0" />
    <polygon points="110,44 118,44 112,54 104,54" fill="#e2e8f0" />
    <polygon points="128,44 136,44 130,54 122,54" fill="#e2e8f0" />

    {/* Play Triangle Icon */}
    <polygon points="94,64 112,76 94,88" fill="#34d399" />
    <polygon points="96,68 108,76 96,84" fill="#a7f3d0" />
  </svg>
);

// Card 3: Video Editing Pixel illustration (NLE Timeline + Preview Monitor)
export const PixelVideoEditingIllustration: React.FC = () => (
  <svg viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{ imageRendering: "pixelated" }}>
    {/* Background tone */}
    <rect width="200" height="130" fill="#d88ba8" />
    
    {/* NLE Dark Workspace */}
    <rect x="14" y="14" width="172" height="102" fill="#18181b" />
    
    {/* Preview Monitor */}
    <rect x="42" y="20" width="80" height="48" fill="#09090b" />
    <rect x="44" y="22" width="76" height="44" fill="#38bdf8" />
    {/* Mountain & Sun Artwork in preview */}
    <rect x="94" y="26" width="10" height="10" fill="#facc15" />
    <polygon points="44,52 64,34 84,52" fill="#047857" />
    <polygon points="72,54 94,38 116,54" fill="#065f46" />
    <rect x="44" y="52" width="76" height="14" fill="#059669" />

    {/* Tools panel left */}
    <rect x="18" y="20" width="20" height="48" fill="#27272a" />
    <rect x="22" y="24" width="12" height="4" fill="#71717a" />
    <rect x="22" y="32" width="12" height="4" fill="#f43f5e" />
    <rect x="22" y="40" width="12" height="4" fill="#71717a" />
    <rect x="22" y="48" width="12" height="4" fill="#71717a" />

    {/* Inspector / Audio Meters Right */}
    <rect x="126" y="20" width="56" height="48" fill="#27272a" />
    <rect x="130" y="24" width="22" height="20" fill="#18181b" />
    <rect x="156" y="24" width="22" height="20" fill="#18181b" />
    {/* Color Wheels / scopes */}
    <rect x="134" y="28" width="14" height="12" fill="#ec4899" />
    <rect x="160" y="28" width="14" height="12" fill="#3b82f6" />

    {/* Timeline multitrack area bottom */}
    <rect x="18" y="72" width="164" height="40" fill="#09090b" />
    {/* Ruler / Timecode */}
    <rect x="18" y="72" width="164" height="6" fill="#3f3f46" />
    {/* Playhead */}
    <rect x="88" y="72" width="2" height="40" fill="#ef4444" />
    <polygon points="86,72 92,72 89,76" fill="#ef4444" />

    {/* Track 1: Video */}
    <rect x="22" y="80" width="50" height="8" fill="#3b82f6" />
    <rect x="74" y="80" width="40" height="8" fill="#6366f1" />
    <rect x="116" y="80" width="60" height="8" fill="#8b5cf6" />

    {/* Track 2: Audio */}
    <rect x="22" y="90" width="65" height="6" fill="#10b981" />
    <rect x="90" y="90" width="50" height="6" fill="#059669" />
    <rect x="142" y="90" width="34" height="6" fill="#10b981" />

    {/* Track 3: SFX */}
    <rect x="40" y="98" width="30" height="6" fill="#f59e0b" />
    <rect x="85" y="98" width="20" height="6" fill="#f59e0b" />
    <rect x="120" y="98" width="45" height="6" fill="#d97706" />
  </svg>
);

export const PixelGoogleDriveIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    {/* Yellow Top Polygon */}
    <polygon points="12,5 20,5 28,19 20,19" fill="#fbbc04" />
    <polygon points="12,6 19,6 26,18 19,18" fill="#ffd043" />
    {/* Blue Right Polygon */}
    <polygon points="20,19 28,19 20,31 12,31" fill="#4285f4" />
    <polygon points="20,20 26,20 19,30 13,30" fill="#669df6" />
    {/* Green Left Polygon */}
    <polygon points="4,19 12,5 16,12 8,26" fill="#0f9d58" />
    <polygon points="5,19 12,7 15,12 8,24" fill="#34a853" />
  </svg>
);

export const PixelResumeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ imageRendering: "pixelated" }}>
    {/* Paper outline */}
    <rect x="6" y="3" width="16" height="26" fill="#f8fafc" />
    <polygon points="22,3 22,9 28,9" fill="#cbd5e1" />
    <polygon points="22,3 28,9 28,29 6,29 6,3" fill="none" stroke="#1e293b" strokeWidth="1.5" />
    {/* Header banner on document */}
    <rect x="9" y="6" width="10" height="3" fill="#2563eb" />
    {/* Avatar badge */}
    <rect x="9" y="11" width="4" height="4" fill="#38bdf8" />
    {/* Text lines */}
    <rect x="15" y="11" width="9" height="1.5" fill="#475569" />
    <rect x="15" y="13.5" width="7" height="1.5" fill="#94a3b8" />
    {/* Section divider */}
    <rect x="9" y="17" width="15" height="1" fill="#cbd5e1" />
    {/* Bullet items */}
    <rect x="9" y="20" width="15" height="1.5" fill="#64748b" />
    <rect x="9" y="23" width="12" height="1.5" fill="#64748b" />
    <rect x="9" y="26" width="14" height="1.5" fill="#94a3b8" />
  </svg>
);


