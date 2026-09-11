import React, { useState, useEffect } from "react";
import { Eye, Download } from "lucide-react";
import {
  PixelWindowsLogo,
  PixelWindowsPerspectiveLogo,
  PixelAvatar,
  PixelStar,
  PixelHeart,
  PixelUxUiIllustration,
  PixelAiVideosIllustration,
  PixelVideoEditingIllustration,
  PixelFolderIcon
} from "./PixelIcons";
import { PortfolioInfo, Project, WindowId } from "../types";
import { downloadResumeFile } from "../utils/resumeUtils";

interface MainWindowProps {
  portfolio: PortfolioInfo;
  projects: Project[];
  onOpenWindow: (id: WindowId, project?: Project, category?: string) => void;
  onExploreWork: () => void;
  isMinimized?: boolean;
  onMinimizeToggle?: (min: boolean) => void;
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export const getValidImageUrl = (url: string | undefined): string => {
  if (!url || !url.trim()) return "";
  const clean = url.trim();

  // Return immediately for direct data URIs, local server upload paths, proxy paths, or object blobs
  if (clean.startsWith("data:") || clean.startsWith("/uploads") || clean.startsWith("/api/") || clean.startsWith("blob:")) {
    return clean;
  }

  // Google Drive format 1: drive.google.com/file/d/FILE_ID/...
  const driveFileRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = clean.match(driveFileRegex);
  if (match1 && match1[1]) {
    return `/api/drive-proxy/${match1[1]}`;
  }

  // Google Drive format 2: drive.google.com/open?id=FILE_ID or uc?id=FILE_ID or thumbnail?id=FILE_ID
  const driveIdRegex = /drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/;
  const match2 = clean.match(driveIdRegex);
  if (match2 && match2[1]) {
    return `/api/drive-proxy/${match2[1]}`;
  }

  // Google Drive format 3: Direct lh3 link
  if (clean.includes("lh3.googleusercontent.com/d/")) {
    const lh3Match = clean.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match && lh3Match[1]) {
      return `/api/drive-proxy/${lh3Match[1]}`;
    }
    return `/api/proxy-image?url=${encodeURIComponent(clean)}`;
  }

  return clean;
};

export const MainWindow: React.FC<MainWindowProps> = ({
  portfolio,
  projects,
  onOpenWindow,
  onExploreWork,
  isMinimized: externalMinimized,
  onMinimizeToggle,
  onClose,
  onFocus,
  zIndex = 10,
}) => {
  const [cursorVisible, setCursorVisible] = useState(true);
  const [internalMinimized, setInternalMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [portfolio.heroLogoImage]);

  const isMinimized = typeof externalMinimized === "boolean" ? externalMinimized : internalMinimized;

  const setMinimizeState = (val: boolean) => {
    setInternalMinimized(val);
    if (onMinimizeToggle) {
      onMinimizeToggle(val);
    }
  };

  // Blinking terminal cursor for "VIGNESH|"
  useEffect(() => {
    const timer = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(timer);
  }, []);

  const handleViewResume = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Open interactive Resume.exe window inside Windows OS
    onOpenWindow("resume");
  };

  const handleDownloadResume = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await downloadResumeFile(portfolio);
  };

  // Featured category cards strictly use static Pixel Art illustrations

  if (isMinimized) {
    return (
      <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-20">
        <button
          onClick={() => setMinimizeState(false)}
          className="bg-[#133066] border-2 border-[#38bdf8] text-white px-4 py-2 font-pixel text-sm flex items-center gap-2 shadow-lg hover:bg-[#1a4085] cursor-pointer"
        >
          {portfolio.heroLogoImage && !logoError && getValidImageUrl(portfolio.heroLogoImage) ? (
            <img 
              src={getValidImageUrl(portfolio.heroLogoImage)} 
              alt="Logo" 
              className="w-4 h-4 object-contain" 
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
            />
          ) : (
            <PixelWindowsLogo size={16} />
          )}
          <span>PORTFOLIO.EXE (Click to Restore)</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onFocus}
      style={{ zIndex }}
      className={`relative transition-all duration-200 pointer-events-auto ${
        isMaximized
          ? "w-[calc(100vw-16px)] sm:w-[calc(100vw-32px)] max-w-7xl mx-auto my-1 sm:my-2"
          : "w-full max-w-[980px] mx-auto my-0 sm:my-auto"
      }`}
    >
      {/* WINDOW OUTER CASING & BORDER */}
      <div
        className="bg-[#0e2752] border-2 sm:border-3 border-[#3b82f6] shadow-[0_12px_40px_rgba(0,0,0,0.85)] rounded-t-lg rounded-b-md overflow-hidden flex flex-col"
        style={{
          boxShadow: "0 0 0 2px #93c5fd, 0 16px 48px rgba(0, 0, 0, 0.9)",
        }}
      >
        {/* 1. WINDOW TITLE BAR (Always sticky & visible at top) */}
        <div className="sticky top-0 z-30 bg-gradient-to-r from-[#17468a] via-[#1d529f] to-[#17468a] px-2.5 sm:px-3 py-1.5 sm:py-2 border-b-2 border-[#1e3a8a] flex items-center justify-between select-none shadow-md shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
            {portfolio.heroLogoImage && !logoError && getValidImageUrl(portfolio.heroLogoImage) ? (
              <img 
                src={getValidImageUrl(portfolio.heroLogoImage)} 
                alt="Logo" 
                className="w-4 h-4 object-contain" 
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
              />
            ) : (
              <PixelWindowsLogo size={16} />
            )}
            <span className="text-white font-pixel font-bold tracking-wider text-xs sm:text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] truncate">
              PORTFOLIO.EXE
            </span>
          </div>

          {/* Window Control Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Minimize */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMinimizeState(true);
              }}
              aria-label="Minimize Window"
              title="Minimize"
              className="w-6.5 sm:w-7 h-5 sm:h-5.5 bg-[#1d4ed8] border border-[#60a5fa] hover:bg-[#2563eb] active:bg-[#1e40af] flex items-center justify-center text-white cursor-pointer shadow-xs transition-colors"
            >
              <span className="font-pixel text-xs font-bold leading-none -translate-y-1">_</span>
            </button>

            {/* Maximize */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(!isMaximized);
              }}
              aria-label="Maximize Window"
              title="Maximize"
              className="w-6.5 sm:w-7 h-5 sm:h-5.5 bg-[#1d4ed8] border border-[#60a5fa] hover:bg-[#2563eb] active:bg-[#1e40af] flex items-center justify-center text-white cursor-pointer shadow-xs transition-colors"
            >
              <span className="font-pixel text-[10px] leading-none">□</span>
            </button>

            {/* Close */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) {
                  onClose();
                } else {
                  setMinimizeState(true);
                }
              }}
              aria-label="Close Window"
              title="Close"
              className="w-6.5 sm:w-7 h-5 sm:h-5.5 bg-[#e11d48] border border-[#fda4af] hover:bg-[#f43f5e] active:bg-[#be123c] flex items-center justify-center text-white cursor-pointer shadow-xs transition-colors"
            >
              <span className="font-pixel text-xs font-bold leading-none">✕</span>
            </button>
          </div>
        </div>

        {/* 2. WINDOW MAIN BODY */}
        <div className="p-3.5 sm:p-4 md:p-6 bg-[#0f2854] text-white">
          {/* PROFILE SECTION */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-5 md:gap-6">
            {/* Left: Pixel Avatar Frame */}
            <div className="shrink-0">
              <div
                className="w-32 h-32 md:w-36 md:h-36 rounded-xl border-3 border-white overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.6)] bg-[#0284c7] relative"
                style={{
                  boxShadow: "0 0 0 2px #38bdf8, 0 8px 16px rgba(0,0,0,0.5)",
                }}
              >
                {portfolio.profileImage ? (
                  <img
                    src={portfolio.profileImage}
                    alt={portfolio.name}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: "pixelated" }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <PixelAvatar className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Center: Profile Text & CTA */}
            <div className="flex-1 text-center md:text-left flex flex-col justify-between">
              <div>
                <span className="text-white/90 font-pixel text-xs md:text-sm font-semibold tracking-wider block">
                  {portfolio.greeting || "HI, I'M"}
                </span>

                <h1 className="text-white font-pixel font-bold text-3xl md:text-4xl lg:text-[42px] tracking-wide my-0.5 flex items-center justify-center md:justify-start">
                  <span>{portfolio.name || "VIGNESH"}</span>
                  <span
                    className={`inline-block font-pixel text-white font-light ml-0.5 ${
                      cursorVisible ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    |
                  </span>
                </h1>

                <h2 className="text-[#38bdf8] font-pixel font-bold text-xs md:text-sm tracking-wider uppercase mt-1">
                  {portfolio.role || "DIGITAL CREATOR & DESIGNER"}
                </h2>

                <p className="text-white/90 font-pixel text-xs md:text-sm leading-relaxed mt-2 max-w-md">
                  {portfolio.shortBio ||
                    "I create intuitive designs, engaging experiences and visual stories."}
                </p>
              </div>

              {/* VIEW & DOWNLOAD RESUME BUTTONS */}
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <button
                  id="view-resume-btn"
                  onClick={handleViewResume}
                  className="group inline-flex items-center gap-2 bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-3.5 py-2 font-pixel text-xs md:text-sm font-bold tracking-wider cursor-pointer shadow-[2px_2px_0_0_#0f172a] hover:shadow-[3px_3px_0_0_#0f172a] transition-all transform active:translate-y-0.5"
                  title="View Resume"
                >
                  <Eye size={15} className="text-[#38bdf8] group-hover:scale-110 transition-transform" />
                  <span>VIEW RESUME</span>
                </button>

                <button
                  id="download-resume-btn"
                  onClick={handleDownloadResume}
                  className="group inline-flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white border-2 border-[#38bdf8] px-3.5 py-2 font-pixel text-xs md:text-sm font-bold tracking-wider cursor-pointer shadow-[2px_2px_0_0_#0f172a] hover:shadow-[3px_3px_0_0_#0f172a] transition-all transform active:translate-y-0.5"
                  title="Download Resume"
                >
                  <Download size={15} className="text-white group-hover:translate-y-0.5 transition-transform" />
                  <span>DOWNLOAD RESUME</span>
                </button>
              </div>
            </div>

            {/* Right: Windows Logo / Custom Logo + Location & Availability Info */}
            <div className="flex flex-col items-center md:items-end justify-between self-stretch shrink-0 pt-1">
              {/* Windows 11 Perspective Logo or Custom Brand Logo */}
              <div
                className="flex items-center justify-center md:justify-end transition-all"
                style={{
                  minHeight: `${Math.max(48, Math.min(320, (portfolio.heroLogoSize || 64)))}px`,
                  minWidth: `${Math.max(64, Math.min(360, (portfolio.heroLogoSize || 64) * 1.2))}px`,
                }}
              >
                {portfolio.heroLogoImage && !logoError && getValidImageUrl(portfolio.heroLogoImage) ? (
                  <img
                    src={getValidImageUrl(portfolio.heroLogoImage)}
                    alt="Logo"
                    className="object-contain filter drop-shadow-md transition-all max-w-[90vw] md:max-w-[380px]"
                    style={{
                      height: `${portfolio.heroLogoSize || 64}px`,
                      maxHeight: "300px",
                    }}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div
                    style={{
                      height: `${portfolio.heroLogoSize || 64}px`,
                      width: `${Math.round((portfolio.heroLogoSize || 64) * 1.25)}px`,
                      maxHeight: "300px",
                      maxWidth: "380px",
                    }}
                    className="flex items-center justify-center transition-all"
                  >
                    <PixelWindowsPerspectiveLogo className="w-full h-full filter drop-shadow-md" />
                  </div>
                )}
              </div>

              {/* Location & Freelance Status Indicators */}
              <div className="flex flex-col items-center md:items-end gap-2 mt-2">
                {/* Location */}
                <div className="flex items-center gap-2 text-[#38bdf8] font-pixel text-[11px] md:text-xs font-semibold tracking-wide">
                  <span className="text-[#38bdf8] text-sm">📍</span>
                  <span>{portfolio.locationText || "BASED IN TRICHY, INDIA"}</span>
                </div>

                {/* Availability */}
                <div className="flex items-center gap-2 text-[#38bdf8] font-pixel text-[11px] md:text-xs font-semibold tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-[#86efac] animate-pulse inline-block shadow-[0_0_8px_#22c55e]" />
                  <span>{portfolio.availabilityText || "AVAILABLE FOR FREELANCE"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION DIVIDER & HEADER: FEATURED PROJECTS */}
          <div className="flex items-center gap-2 mt-7 mb-3">
            <PixelFolderIcon size={20} />
            <span className="text-[#38bdf8] font-pixel font-bold text-xs md:text-sm tracking-wider uppercase">
              FEATURED PROJECTS
            </span>
          </div>

          {/* THREE PROJECT CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ---------------- CARD 1: UX/UI PROJECTS ---------------- */}
            <div
              id="project-card-uxui"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWindow("projects", undefined, "UX/UI Projects");
              }}
              className="group bg-[#152347] border-2 border-[#5460a8] rounded-md overflow-hidden flex flex-col justify-between hover:border-[#818cf8] transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
              {/* Card Header Bar */}
              <div className="bg-[#485399] px-2.5 py-1.5 flex items-center justify-between border-b border-[#31396b]">
                <span className="font-pixel text-white text-xs font-bold tracking-wide">
                  UX/UI PROJECTS
                </span>
                <div className="flex items-center gap-1 opacity-80 text-[10px] font-pixel text-white">
                  <span>-</span>
                  <span>□</span>
                  <span>□</span>
                </div>
              </div>

              {/* Card Illustration Visual */}
              <div className="h-32 bg-[#8ea1d4] overflow-hidden relative">
                <PixelUxUiIllustration />
              </div>

              {/* Card Footer Bar */}
              <div className="bg-[#121c38] p-2.5 flex items-center justify-between gap-2 border-t border-[#232f57]">
                <p className="font-pixel text-white/90 text-[11px] leading-tight flex-1">
                  User centered designs for web & mobile apps.
                </p>
                <button
                  aria-label="View UX UI Projects List"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenWindow("projects", undefined, "UX/UI Projects");
                  }}
                  className="shrink-0 px-2 py-1 bg-[#5460a8] group-hover:bg-[#6366f1] border border-[#818cf8] flex items-center gap-1 text-white font-pixel font-bold text-xs rounded-xs shadow-xs transition-colors cursor-pointer"
                >
                  <span>VIEW</span>
                  <span>&gt;</span>
                </button>
              </div>
            </div>

            {/* ---------------- CARD 2: AI VIDEOS PROJECTS ---------------- */}
            <div
              id="project-card-aivideos"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWindow("projects", undefined, "AI Videos Projects");
              }}
              className="group bg-[#122b24] border-2 border-[#2e7d5b] rounded-md overflow-hidden flex flex-col justify-between hover:border-[#34d399] transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
              {/* Card Header Bar */}
              <div className="bg-[#246349] px-2.5 py-1.5 flex items-center justify-between border-b border-[#174230]">
                <span className="font-pixel text-white text-xs font-bold tracking-wide">
                  AI VIDEOS PROJECTS
                </span>
                <div className="flex items-center gap-1 opacity-80 text-[10px] font-pixel text-white">
                  <span>-</span>
                  <span>□</span>
                  <span>□</span>
                </div>
              </div>

              {/* Card Illustration Visual */}
              <div className="h-32 bg-[#91cfab] overflow-hidden relative">
                <PixelAiVideosIllustration />
              </div>

              {/* Card Footer Bar */}
              <div className="bg-[#0d211a] p-2.5 flex items-center justify-between gap-2 border-t border-[#183d30]">
                <p className="font-pixel text-white/90 text-[11px] leading-tight flex-1">
                  AI generated videos that tell powerful stories.
                </p>
                <button
                  aria-label="View AI Videos Projects List"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenWindow("projects", undefined, "AI Videos Projects");
                  }}
                  className="shrink-0 px-2 py-1 bg-[#2e7d5b] group-hover:bg-[#10b981] border border-[#6ee7b7] flex items-center gap-1 text-white font-pixel font-bold text-xs rounded-xs shadow-xs transition-colors cursor-pointer"
                >
                  <span>VIEW</span>
                  <span>&gt;</span>
                </button>
              </div>
            </div>

            {/* ---------------- CARD 3: VIDEO EDITING PROJECTS ---------------- */}
            <div
              id="project-card-videoediting"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWindow("projects", undefined, "Video Editing Projects");
              }}
              className="group bg-[#2a1324] border-2 border-[#9e3e68] rounded-md overflow-hidden flex flex-col justify-between hover:border-[#f472b6] transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
              {/* Card Header Bar */}
              <div className="bg-[#782c4e] px-2.5 py-1.5 flex items-center justify-between border-b border-[#4f1831]">
                <span className="font-pixel text-white text-xs font-bold tracking-wide">
                  VIDEO EDITING PROJECTS
                </span>
                <div className="flex items-center gap-1 opacity-80 text-[10px] font-pixel text-white">
                  <span>-</span>
                  <span>□</span>
                  <span>□</span>
                </div>
              </div>

              {/* Card Illustration Visual */}
              <div className="h-32 bg-[#d88ba8] overflow-hidden relative">
                <PixelVideoEditingIllustration />
              </div>

              {/* Card Footer Bar */}
              <div className="bg-[#1f0d1a] p-2.5 flex items-center justify-between gap-2 border-t border-[#3b1529]">
                <p className="font-pixel text-white/90 text-[11px] leading-tight flex-1">
                  Cinematic edits that bring ideas to life.
                </p>
                <button
                  aria-label="View Video Editing Projects List"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenWindow("projects", undefined, "Video Editing Projects");
                  }}
                  className="shrink-0 px-2 py-1 bg-[#9e3e68] group-hover:bg-[#ec4899] border border-[#fbcfe8] flex items-center gap-1 text-white font-pixel font-bold text-xs rounded-xs shadow-xs transition-colors cursor-pointer"
                >
                  <span>VIEW</span>
                  <span>&gt;</span>
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM TAGLINE BANNER */}
          <div className="mt-5 bg-[#0a1e42] border-2 border-[#1e40af] rounded-sm py-2.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PixelStar size={18} />
              <span className="font-pixel text-white/90 text-xs md:text-sm tracking-wide">
                {portfolio.tagline || "Turning ideas into pixel perfect experiences."}
              </span>
            </div>
            <div className="shrink-0">
              <PixelHeart size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
