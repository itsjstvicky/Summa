import React, { useState, useRef, useEffect } from "react";
import { PortfolioInfo, Experience, Skill } from "../types";
import { getResumeOnlineViewUrl, getResumeDirectDownloadUrl, downloadResumeFile } from "../utils/resumeUtils";
import { ExternalLink, Download, Printer, ZoomIn, ZoomOut, RefreshCw, FileText, CheckCircle, AlertCircle, Maximize2, Minimize2 } from "lucide-react";

interface ResumeViewerModalProps {
  portfolio: PortfolioInfo;
  experiences?: Experience[];
  skills?: Skill[];
  onClose: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onMinimize?: () => void;
}

export const ResumeViewerModal: React.FC<ResumeViewerModalProps> = ({
  portfolio,
  experiences = [],
  skills = [],
  onClose,
  isMaximized = false,
  onToggleMaximize,
  onMinimize,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const hasCustomResume = Boolean(portfolio.resumeUrl && portfolio.resumeUrl.trim());
  const onlineViewUrl = getResumeOnlineViewUrl(portfolio.resumeUrl);
  const directDownloadUrl = getResumeDirectDownloadUrl(portfolio.resumeUrl);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadResumeFile(portfolio, experiences, skills);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error("Resume download error:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenOnlineTab = () => {
    if (portfolio.resumeUrl) {
      window.open(portfolio.resumeUrl, "_blank", "noopener,noreferrer");
    } else {
      // Open generated resume in new tab
      downloadResumeFile(portfolio, experiences, skills);
    }
  };

  const handlePrint = () => {
    if (hasCustomResume) {
      // Open in new tab which supports native browser PDF printing
      window.open(portfolio.resumeUrl, "_blank", "noopener,noreferrer");
    } else {
      window.print();
    }
  };

  // Base width needed to display standard A4 Google Docs / PDF preview without internal clipping
  const BASE_DOC_WIDTH = 870;
  const isNarrow = containerWidth > 0 && containerWidth < BASE_DOC_WIDTH;
  const fitScale = isNarrow ? (containerWidth - 4) / BASE_DOC_WIDTH : 1;
  const effectiveScale = fitScale * (zoomLevel / 100);

  return (
    <div className="flex flex-col h-full bg-[#0a152d] text-white font-pixel select-none">
      {/* 1. TOP TOOLBAR */}
      <div className="bg-[#0f2854] border-b border-[#1e40af] px-3 py-2 flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Open Online in New Tab Button */}
          <button
            onClick={handleOpenOnlineTab}
            id="resume-modal-view-online-btn"
            className="bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border border-[#60a5fa] px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="Open Resume in Full Browser Tab"
          >
            <ExternalLink size={13} className="text-[#38bdf8]" />
            <span>Open in New Tab ↗</span>
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            id="resume-modal-download-btn"
            className="bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white border border-[#38bdf8] px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
            title="Download PDF Resume"
          >
            <Download size={13} className={isDownloading ? "animate-bounce" : ""} />
            <span>{isDownloading ? "Downloading..." : downloadSuccess ? "Downloaded ✓" : "Download PDF"}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="bg-[#1e293b] hover:bg-[#334155] text-white border border-[#475569] px-2.5 py-1.5 rounded text-xs hidden sm:flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Print Resume"
          >
            <Printer size={13} className="text-white/80" />
            <span>Print</span>
          </button>

          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="bg-[#1e293b] hover:bg-[#334155] text-white border border-[#475569] px-2.5 py-1.5 rounded text-xs hidden md:flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isMaximized ? "Restore Window" : "Maximize Window"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isMaximized ? "Restore" : "Maximize"}</span>
            </button>
          )}
        </div>

        {/* Right side: Zoom & Reload Controls */}
        <div className="flex items-center gap-1.5">
          {hasCustomResume && (
            <button
              onClick={() => setIframeKey((prev) => prev + 1)}
              className="p-1.5 bg-[#1e293b] hover:bg-[#334155] rounded text-white/80 hover:text-white cursor-pointer border border-[#334155]"
              title="Reload Resume Preview"
            >
              <RefreshCw size={13} />
            </button>
          )}

          <div className="flex items-center bg-[#071329] border border-[#1e40af] rounded px-1.5 py-0.5 text-xs text-white/80 gap-1">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
              className="px-1 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <span className="text-[10px] min-w-[32px] text-center font-mono">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
              className="px-1 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            {zoomLevel !== 100 && (
              <button
                onClick={() => setZoomLevel(100)}
                className="text-[9px] text-[#38bdf8] hover:underline ml-1 cursor-pointer"
                title="Reset Zoom"
              >
                Fit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN RESUME VIEW CANVAS - STRICT NO HORIZONTAL OVERFLOW */}
      <div
        ref={containerRef}
        className="flex-1 bg-[#071329] relative p-0 overflow-x-hidden overflow-y-auto flex flex-col items-center w-full h-full"
      >
        {hasCustomResume ? (
          <div className="w-full flex-1 flex flex-col min-h-[520px] overflow-x-hidden">
            {/* Embedded Resume Viewer - Auto-Scaled to Window Width */}
            <div
              className="flex-1 bg-white relative overflow-hidden shadow-2xl"
              style={{
                width: isNarrow ? `${BASE_DOC_WIDTH}px` : "100%",
                height: isNarrow ? `${100 / effectiveScale}%` : "100%",
                minHeight: isNarrow ? `${540 / effectiveScale}px` : "540px",
                transform: isNarrow || zoomLevel !== 100 ? `scale(${effectiveScale})` : undefined,
                transformOrigin: "top left",
              }}
            >
              <iframe
                key={iframeKey}
                src={onlineViewUrl}
                title={`${portfolio.name || "Vignesh"} Resume Document`}
                className="w-full h-full border-0 block"
                style={{ width: "100%", height: "100%", minHeight: "540px" }}
                allow="autoplay"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Embedded helper bar */}
            <div className="px-3 py-1.5 bg-[#0f2854] border-t border-[#1e40af] text-[11px] text-white/80 flex items-center justify-between flex-wrap gap-2 shrink-0 z-10">
              <span className="flex items-center gap-1.5 text-[#38bdf8]">
                <CheckCircle size={13} className="text-emerald-400" />
                <span>Auto-fitted to window width</span>
              </span>
              <a
                href={portfolio.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#60a5fa] hover:text-white underline flex items-center gap-1"
              >
                <span>Open original in new tab</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : (
          /* Structured Interactive Resume Document View (when no custom PDF uploaded yet) */
          <div className="w-full p-2 sm:p-4 flex justify-center">
            <div
              className="w-full max-w-3xl bg-white text-slate-900 p-6 sm:p-8 rounded-md shadow-2xl space-y-6 transition-transform duration-150"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
            >
            {/* Header banner */}
            <div className="border-b-2 border-[#1d4ed8] pb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2854] tracking-tight">
                  {portfolio.name || "VIGNESH"}
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-[#0284c7] mt-0.5 uppercase tracking-wide">
                  {portfolio.role || "DIGITAL CREATOR & UI/UX DESIGNER"}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2 font-sans">
                  <span>📍 {portfolio.locationText || "Trichy, Tamil Nadu, India"}</span>
                  <span>🟢 {portfolio.availabilityText || "Available for Freelance & Full-time"}</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-lg bg-[#0284c7] text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-md">
                {portfolio.name ? portfolio.name.charAt(0) : "V"}
              </div>
            </div>

            {/* Profile Bio */}
            <div className="space-y-1.5 font-sans">
              <h3 className="text-xs font-bold text-[#1d4ed8] uppercase tracking-wider">Professional Profile</h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {portfolio.longBio ||
                  portfolio.shortBio ||
                  "Multidisciplinary Digital Creator and UI/UX Designer specializing in crafting intuitive user interfaces, AI-powered video storytelling, and cinematic motion graphics."}
              </p>
            </div>

            {/* Work Experience */}
            {experiences.length > 0 && (
              <div className="space-y-3 font-sans">
                <h3 className="text-xs font-bold text-[#1d4ed8] uppercase tracking-wider border-b border-slate-200 pb-1">
                  Work Experience ({experiences.length})
                </h3>
                <div className="space-y-3">
                  {experiences
                    .filter((e) => e.visible !== false)
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((exp, idx) => (
                      <div key={exp.id || idx} className="space-y-1">
                        <div className="flex items-baseline justify-between flex-wrap gap-1">
                          <span className="font-bold text-slate-900 text-sm">{exp.role}</span>
                          <span className="text-xs font-semibold text-slate-500">
                            {exp.startDate} – {exp.currentPosition ? "Present" : exp.endDate || "Present"}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#2563eb]">{exp.companyName}</div>
                        {exp.description && <p className="text-xs text-slate-600 leading-relaxed">{exp.description}</p>}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div className="space-y-2 font-sans">
                <h3 className="text-xs font-bold text-[#1d4ed8] uppercase tracking-wider border-b border-slate-200 pb-1">
                  Core Skills &amp; Proficiencies
                </h3>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {skills
                    .filter((s) => s.visible !== false)
                    .map((s, idx) => (
                      <span
                        key={s.id || idx}
                        className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded text-[11px] font-semibold"
                      >
                        {s.name} {s.experience ? `(${s.experience})` : ""}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Bottom Note */}
            <div className="pt-4 border-t border-slate-200 text-center font-sans text-xs text-slate-400">
              Generated from Live Portfolio Workstation Database
            </div>
          </div>
        </div>
      )}
    </div>

      {/* 3. BOTTOM FOOTER BAR */}
      <div className="bg-[#0f2854] border-t border-[#1e40af] px-4 py-2 flex items-center justify-between text-xs text-white/70 shrink-0">
        <span>Document Status: {hasCustomResume ? "Online File Linked" : "Generated CV Document"}</span>
        <button
          onClick={onClose}
          className="bg-[#1d4ed8] hover:bg-[#2563eb] text-white px-3 py-1 rounded text-xs font-bold cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
