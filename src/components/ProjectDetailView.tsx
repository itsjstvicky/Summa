import React, { useState, useEffect } from "react";
import { Project, ProjectOutputItem, WorkflowStep, ImpactMetric } from "../types";
import { PixelWindowsLogo, PixelStar } from "./PixelIcons";
import { RetroVideoPlayer, ProjectEmbedViewer } from "./ProjectMediaComponents";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

interface ProjectDetailViewProps {
  project: Project;
  onClose: () => void;
  onBackToAllProjects: () => void;
}

// -------------------------------------------------------------
// Pixel-Art Dedicated Icons for Project Detail Page
// -------------------------------------------------------------

const PixelCalendarIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    <rect x="3" y="4" width="18" height="17" fill="#0f172a" />
    <rect x="4" y="5" width="16" height="15" fill="#1e293b" />
    <rect x="4" y="5" width="16" height="4" fill="#38bdf8" />
    <rect x="6" y="2" width="2" height="4" fill="#bae6fd" />
    <rect x="16" y="2" width="2" height="4" fill="#bae6fd" />
    <rect x="6" y="11" width="2" height="2" fill="#38bdf8" />
    <rect x="11" y="11" width="2" height="2" fill="#38bdf8" />
    <rect x="16" y="11" width="2" height="2" fill="#38bdf8" />
    <rect x="6" y="15" width="2" height="2" fill="#38bdf8" />
    <rect x="11" y="15" width="2" height="2" fill="#38bdf8" />
    <rect x="16" y="15" width="2" height="2" fill="#38bdf8" />
  </svg>
);

const PixelRoleUserIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    <rect x="8" y="3" width="8" height="7" fill="#c084fc" />
    <rect x="9" y="4" width="6" height="5" fill="#e9d5ff" />
    <rect x="4" y="12" width="16" height="9" fill="#9333ea" />
    <rect x="6" y="13" width="12" height="7" fill="#a855f7" />
    <rect x="9" y="12" width="6" height="3" fill="#c084fc" />
  </svg>
);

const PixelGalleryIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    <rect x="2" y="4" width="20" height="16" fill="#0284c7" />
    <rect x="4" y="6" width="16" height="12" fill="#07152e" />
    <rect x="6" y="8" width="3" height="3" fill="#facc15" />
    <polygon points="4,18 10,11 15,18" fill="#38bdf8" />
    <polygon points="12,18 16,13 20,18" fill="#0284c7" />
  </svg>
);

const PixelWorkflowHeaderIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    <rect x="3" y="10" width="5" height="5" fill="#38bdf8" />
    <rect x="8" y="12" width="8" height="2" fill="#60a5fa" />
    <rect x="16" y="10" width="5" height="5" fill="#34d399" />
    <rect x="10" y="5" width="4" height="4" fill="#fbbf24" />
    <rect x="11" y="9" width="2" height="3" fill="#60a5fa" />
  </svg>
);

const PixelVerdictTrophyIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    <rect x="6" y="3" width="12" height="9" fill="#f59e0b" />
    <rect x="7" y="4" width="10" height="7" fill="#fbbf24" />
    <rect x="3" y="4" width="3" height="5" fill="#d97706" />
    <rect x="18" y="4" width="3" height="5" fill="#d97706" />
    <rect x="10" y="12" width="4" height="4" fill="#d97706" />
    <rect x="6" y="16" width="12" height="4" fill="#b45309" />
    <rect x="7" y="17" width="10" height="2" fill="#f59e0b" />
  </svg>
);

const PixelVideoPlayIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
    <rect x="2" y="4" width="20" height="16" fill="#1e1b4b" />
    <rect x="4" y="6" width="16" height="12" fill="#6366f1" />
    <polygon points="10,8 16,12 10,16" fill="#ffffff" />
  </svg>
);

const renderStepIcon = (iconName?: string, index?: number) => {
  const iconKey = iconName?.toLowerCase() || "";
  if (iconKey.includes("idea") || iconKey.includes("lightbulb") || index === 0) {
    return <span role="img" aria-label="Idea" className="text-sm sm:text-base">💡</span>;
  }
  if (iconKey.includes("script") || iconKey.includes("clipboard") || iconKey.includes("wireframe") || index === 1) {
    return <span role="img" aria-label="Script / Wireframe" className="text-sm sm:text-base">📋</span>;
  }
  if (iconKey.includes("ai") || iconKey.includes("gen") || iconKey.includes("design") || index === 2) {
    return <span role="img" aria-label="Design / AI" className="text-sm sm:text-base">🎨</span>;
  }
  if (iconKey.includes("voice") || iconKey.includes("prototype") || iconKey.includes("test") || index === 3) {
    return <span role="img" aria-label="Prototype / Testing" className="text-sm sm:text-base">🧪</span>;
  }
  if (iconKey.includes("edit") || iconKey.includes("system") || index === 4) {
    return <span role="img" aria-label="Refinement" className="text-sm sm:text-base">⚙️</span>;
  }
  return <span role="img" aria-label="Delivery" className="text-sm sm:text-base">🚀</span>;
};

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onClose,
  onBackToAllProjects,
}) => {
  // Lightbox Media Viewer State
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Fullscreen tracking for video/embed
  const [isMediaFullscreen, setIsMediaFullscreen] = useState(false);

  useEffect(() => {
    const handleMediaFullscreen = (e: Event) => {
      const custom = e as CustomEvent;
      setIsMediaFullscreen(!!custom.detail?.isFullscreen);
    };
    window.addEventListener("media-fullscreen-change", handleMediaFullscreen);
    return () => window.removeEventListener("media-fullscreen-change", handleMediaFullscreen);
  }, []);

  // Check if project is a UX/UI Project
  const isUxUi =
    project.category === "UX/UI Projects" ||
    (typeof project.category === "string" && project.category.toLowerCase().includes("ux"));

  // Video Case Study Link
  const videoCaseStudyLink =
    project.caseStudyVideoUrl ||
    project.caseStudyUrl ||
    (isUxUi ? project.videoUrl || project.projectUrl : "");

  // Roles list
  const roles: string[] = project.roles || [];

  // Summary Text
  const summary =
    project.summary ||
    project.shortDescription ||
    project.fullDescription ||
    "";

  // Images / Outputs Gallery
  const projectImages: ProjectOutputItem[] =
    (project.outputs && project.outputs.length > 0 ? project.outputs : null) ||
    (project.projectImages && project.projectImages.length > 0 ? project.projectImages : []) ||
    [];

  // Workflow Steps
  const workflowSteps: WorkflowStep[] = project.workflow || [];

  // Final Verdict / Impact Text
  const finalVerdictText = project.finalVerdict || project.impactDescription || project.aboutProject || "";

  // Impact Metrics
  const impactMetrics: ImpactMetric[] = project.impactMetrics || [];

  const activeMedia = selectedMediaIndex !== null ? projectImages[selectedMediaIndex] : null;

  // Determine Hero Media Source
  const heroMediaType = project.heroMediaType || (project.videoUrl ? "video" : project.embedCode ? "embed" : "image");
  const heroMediaUrl = project.heroMediaUrl || project.videoUrl || project.thumbnail;
  const heroMediaEmbed = project.heroMediaEmbedCode || project.embedCode;

  return (
    <div
      className={`w-full text-white font-pixel select-none flex flex-col ${
        isMediaFullscreen
          ? "h-full max-w-none !max-h-none !rounded-none !border-0 !my-0 !shadow-none bg-black overflow-hidden flex-1"
          : "max-w-[1080px] bg-[#071329] border-2 sm:border-3 border-[#3b82f6] shadow-[0_0_0_2px_#93c5fd,0_25px_60px_rgba(0,0,0,0.95)] rounded-t-lg rounded-b-md overflow-hidden animate-in fade-in duration-150 my-0 sm:my-auto max-h-[calc(100vh-90px)] sm:max-h-[92vh]"
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* WINDOW TITLE BAR (Retro Windows 11 / 95 Accent) */}
      {/* ------------------------------------------------------------- */}
      {!isMediaFullscreen && (
        <div className="sticky top-0 z-30 bg-gradient-to-r from-[#17468a] via-[#1d529f] to-[#17468a] px-2.5 sm:px-3 py-1.5 sm:py-2 border-b-2 border-[#1e3a8a] flex items-center justify-between flex-shrink-0 shadow-md">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <PixelWindowsLogo size={16} />
            <span className="text-white font-bold text-xs sm:text-sm tracking-wider uppercase truncate">
              PROJECT: {project.title || project.category}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={onClose}
              aria-label="Close Project Detail"
              title="Close"
              className="w-6.5 sm:w-7 h-5 sm:h-5.5 bg-[#e11d48] border border-[#fda4af] hover:bg-[#f43f5e] active:bg-[#be123c] flex items-center justify-center text-white cursor-pointer shadow-xs transition-colors"
            >
              <span className="font-pixel text-xs font-bold leading-none">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN PROJECT PAGE WORKSPACE (Sequential 7-Section Layout) */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`flex-1 ${
          isMediaFullscreen
            ? "p-0 overflow-hidden bg-black flex flex-col"
            : "overflow-y-auto p-3.5 sm:p-5 md:p-6 space-y-5 bg-[#071329]"
        }`}
      >
        
        {/* =========================================================== */}
        {/* 1. PROJECT TITLE + VIDEO CASE STUDY BUTTON (Conditional) */}
        {/* =========================================================== */}
        <div className="bg-[#0c1f44] border-2 border-[#1e40af] p-4 sm:p-5 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Category & Tags Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-xs border font-bold uppercase ${
                  isUxUi
                    ? "bg-[#312e81] border-[#818cf8] text-[#c7d2fe]"
                    : project.category === "AI Videos Projects"
                    ? "bg-[#064e3b] border-[#34d399] text-[#a7f3d0]"
                    : "bg-[#831843] border-[#f472b6] text-[#fbcfe8]"
                }`}
              >
                {project.category}
              </span>
              {project.featured && (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-xs border border-amber-500/40 font-bold flex items-center gap-1">
                  <span>★</span>
                  <span>Featured Project</span>
                </span>
              )}
              {project.date && (
                <span className="text-white/60 text-[10px] bg-[#071329] px-2 py-0.5 rounded-xs border border-[#1e3a8a]">
                  📅 {project.date}
                </span>
              )}
            </div>

            {/* Project Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#38bdf8] uppercase tracking-wide leading-tight">
              {project.title}
            </h1>

            {/* Short Tagline */}
            {project.shortDescription && (
              <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
                {project.shortDescription}
              </p>
            )}
          </div>

          {/* Action CTAs: Video Case Study Button + Live Link */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-start sm:justify-end">
            {/* 1.1 VIDEO CASE STUDY BUTTON (Rendered only when showCaseStudyButton is enabled / selected) */}
            {project.showCaseStudyButton !== false && (
              <>
                {videoCaseStudyLink && (videoCaseStudyLink.startsWith("http") || videoCaseStudyLink.startsWith("data:")) ? (
                  <button
                    onClick={() => {
                      // If it's a direct video link or drive/embed, open modal or new tab
                      if (videoCaseStudyLink.match(/\.(mp4|webm|ogg)$/i) || videoCaseStudyLink.includes("drive.google.com") || videoCaseStudyLink.includes("youtube.com") || videoCaseStudyLink.includes("vimeo.com")) {
                        setIsVideoModalOpen(true);
                      } else {
                        window.open(videoCaseStudyLink, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#4f46e5] hover:to-[#4338ca] text-white border-2 border-[#a5b4fc] px-4 py-2.5 text-xs font-bold rounded-xs cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_20px_rgba(99,102,241,0.8)] transition-all transform active:scale-95"
                  >
                    <PixelVideoPlayIcon size={16} />
                    <span className="tracking-wider">
                      {project.caseStudyButtonText || "WATCH VIDEO CASE STUDY"}
                    </span>
                    <span className="text-[#a5b4fc] group-hover:translate-x-0.5 transition-transform">▶</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (project.videoUrl) {
                        setIsVideoModalOpen(true);
                      } else {
                        const targetElem = document.getElementById("project-workflow-section");
                        targetElem?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="group inline-flex items-center gap-2 bg-[#4338ca] hover:bg-[#4f46e5] text-white border-2 border-[#818cf8] px-4 py-2.5 text-xs font-bold rounded-xs cursor-pointer shadow-md transition-all"
                  >
                    <PixelVideoPlayIcon size={16} />
                    <span>{project.caseStudyButtonText || "VIEW CASE STUDY"}</span>
                    <span>&gt;</span>
                  </button>
                )}
              </>
            )}

            {/* 1.2 EXTERNAL LIVE PROJECT LINK (Optional) */}
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-3.5 py-2.5 text-xs font-bold rounded-xs cursor-pointer shadow-md transition-all whitespace-nowrap"
              >
                <span>LIVE LINK</span>
                <span>↗</span>
              </a>
            )}
          </div>
        </div>

        {/* =========================================================== */}
        {/* 2. PROJECT IMAGE OR VIDEO (Hero Showcase Viewport) */}
        {/* =========================================================== */}
        <div className="bg-[#0c1f44] border-2 border-[#1e40af] p-3.5 sm:p-4 rounded-sm space-y-2.5 shadow-md">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1e3a8a]">
            <div className="flex items-center gap-2">
              <span className="text-base">
                {heroMediaType === "video" ? "🎬" : heroMediaType === "embed" ? "✨" : "🖼️"}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-[#38bdf8] uppercase tracking-wider">
                {heroMediaType === "video"
                  ? "PROJECT VIDEO SHOWCASE"
                  : heroMediaType === "embed"
                  ? project.category.includes("AI Video") || project.category.includes("Video Editing") 
                    ? "PROJECT VIDEO SHOWCASE" 
                    : "INTERACTIVE PROTOTYPE"
                  : "PROJECT IMAGE SHOWCASE"}
              </h2>
            </div>
            <span className="text-[10px] text-white/60 uppercase">
              {heroMediaType === "video" ? "Full HD Video" : heroMediaType === "embed" ? "" : "High-Res Visual"}
            </span>
          </div>

          {/* Hero Media Viewport */}
          <div className="rounded border-2 border-[#1e3a8a] bg-black overflow-hidden relative shadow-inner">
            {heroMediaType === "video" && heroMediaUrl ? (
              <div className="w-full">
                <RetroVideoPlayer
                  url={heroMediaUrl}
                  poster={project.videoPoster || project.thumbnail}
                  title={project.title}
                />
              </div>
            ) : heroMediaType === "embed" && heroMediaEmbed ? (
              <div className="w-full">
                <ProjectEmbedViewer
                  embedCode={heroMediaEmbed}
                  title={project.title}
                  projectUrl={project.projectUrl}
                />
              </div>
            ) : heroMediaUrl ? (
              <div className="w-full max-h-[520px] bg-[#071022] flex items-center justify-center p-1">
                <img
                  src={heroMediaUrl}
                  alt={project.title}
                  style={{ imageRendering: "auto" }}
                  className="w-full h-auto max-h-[500px] object-contain rounded-xs"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="p-12 text-center text-white/60 space-y-2">
                <span className="text-3xl block">🖼️</span>
                <p className="text-xs">No hero media specified. Add an image or video in Admin Dashboard.</p>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================== */}
        {/* 2.5. BEFORE & AFTER REDESIGN COMPARISON (Interactive Slider) */}
        {/* =========================================================== */}
        {(project.hasBeforeAfter || (project.beforeImageUrl && project.afterImageUrl)) && (
          <div className="bg-[#0c1f44] border-2 border-[#1e40af] p-3.5 sm:p-5 rounded-sm space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#1e3a8a]">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h2 className="text-xs sm:text-sm font-bold text-[#38bdf8] uppercase tracking-wider">
                  {project.beforeAfterTitle || (isUxUi ? "REDESIGN COMPARISON (BEFORE & AFTER)" : "BEFORE & AFTER COMPARISON")}
                </h2>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                Interactive Slider
              </span>
            </div>

            <BeforeAfterSlider
              beforeImage={project.beforeImageUrl || ""}
              afterImage={project.afterImageUrl || ""}
              beforeLabel={project.beforeLabel || "BEFORE (ORIGINAL)"}
              afterLabel={project.afterLabel || "AFTER (REDESIGN)"}
              description={project.beforeAfterDescription}
            />
          </div>
        )}

        {/* =========================================================== */}
        {/* 3. PROJECT SUMMARY */}
        {/* =========================================================== */}
        {(summary.trim() !== "" || (project.aboutProject && project.aboutProject.trim() !== "")) && (
          <div className="bg-[#0c1f44] border-2 border-[#1e40af] p-4 sm:p-5 rounded-sm space-y-2.5 shadow-md">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#1e3a8a]">
              <PixelCalendarIcon size={18} />
              <h2 className="text-xs sm:text-sm font-bold text-[#38bdf8] uppercase tracking-wider">
                PROJECT SUMMARY
              </h2>
            </div>
            <div className="text-white/90 text-xs sm:text-[13px] leading-relaxed space-y-2 pt-1 font-mono sm:font-pixel">
              {summary.trim() !== "" && <p>{summary}</p>}
              {project.aboutProject && project.aboutProject !== summary && (
                <p className="pt-2 border-t border-[#1e3a8a]/40 text-white/80">
                  {project.aboutProject}
                </p>
              )}
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* 4. PROJECT IMAGES (If this was a UX/UI Project / Gallery) */}
        {/* =========================================================== */}
        {projectImages.length > 0 && (
          <div className="bg-[#0c1f44] border-2 border-[#1e40af] p-4 sm:p-5 rounded-sm space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#1e3a8a]">
              <div className="flex items-center gap-2">
                <PixelGalleryIcon size={18} />
                <h2 className="text-xs sm:text-sm font-bold text-[#38bdf8] uppercase tracking-wider">
                  {isUxUi ? "PROJECT IMAGES & UI MOCKUPS" : "PROJECT IMAGES SHOWCASE"}
                </h2>
              </div>
              <span className="text-[10px] text-white/60 uppercase">
                {projectImages.length} Image{projectImages.length > 1 ? "s" : ""} • Click to Expand
              </span>
            </div>

            {/* Images Showcase Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
              {projectImages.map((imgItem, idx) => (
                <div
                  key={imgItem.id || idx}
                  onClick={() => setSelectedMediaIndex(idx)}
                  className="group relative aspect-[4/3] bg-[#071329] border-2 border-[#1e40af] hover:border-[#38bdf8] rounded-xs overflow-hidden cursor-pointer transition-all shadow-sm hover:shadow-lg hover:scale-[1.02]"
                >
                  <img
                    src={imgItem.thumbnail || imgItem.url}
                    alt={imgItem.title || `Mockup ${idx + 1}`}
                    style={{ imageRendering: "auto" }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />

                  {/* Title banner overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1.5 text-center">
                    <span className="text-[10px] text-white font-bold truncate block">
                      {imgItem.title || `Screen #${idx + 1}`}
                    </span>
                  </div>

                  {/* Hover icon */}
                  <div className="absolute top-1.5 right-1.5 bg-[#1d4ed8]/90 border border-white/40 w-5 h-5 rounded-xs flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    🔍
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* 5. MY ROLE IN THIS PROJECT */}
        {/* =========================================================== */}
        {roles.length > 0 && (
          <div className="bg-[#0c1f44] border-2 border-[#1e40af] p-4 sm:p-5 rounded-sm space-y-3 shadow-md">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#1e3a8a]">
              <PixelRoleUserIcon size={18} />
              <h2 className="text-xs sm:text-sm font-bold text-[#38bdf8] uppercase tracking-wider">
                MY ROLE IN THIS PROJECT
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {roles.map((roleItem, idx) => (
                <div
                  key={idx}
                  className="bg-[#071329] border border-[#1e40af] hover:border-[#38bdf8] p-2.5 rounded-xs flex items-start gap-2.5 transition-colors"
                >
                  <div className="w-5 h-5 rounded-xs bg-[#1d4ed8] border border-[#60a5fa] flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
                    ✓
                  </div>
                  <span className="text-xs sm:text-[12.5px] text-white/90 leading-snug">
                    {roleItem}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* 6. PROJECT WORKFLOW */}
        {/* =========================================================== */}
        {workflowSteps.length > 0 && (
          <div
            id="project-workflow-section"
            className="bg-[#0c1f44] border-2 border-[#1e40af] p-4 sm:p-5 rounded-sm space-y-3 shadow-md"
          >
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#1e3a8a]">
              <PixelWorkflowHeaderIcon size={18} />
              <h2 className="text-xs sm:text-sm font-bold text-[#38bdf8] uppercase tracking-wider">
                PROJECT WORKFLOW
              </h2>
            </div>

            {/* Step-by-step pipeline */}
            <div className="flex flex-wrap md:flex-nowrap items-stretch justify-between gap-2 overflow-x-auto py-2">
              {workflowSteps.map((step, idx) => (
                <React.Fragment key={idx}>
                  {/* Step Box */}
                  <div className="flex-1 min-w-[140px] bg-[#071329] border border-[#1e40af] hover:border-[#38bdf8] p-3 rounded-xs flex flex-col justify-between gap-2 transition-all group">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#0f2854] border border-[#38bdf8]/50 rounded-xs flex items-center justify-center flex-shrink-0 group-hover:border-[#38bdf8]">
                        {renderStepIcon(step.icon || step.title, idx)}
                      </div>
                      <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider">
                        Step {idx + 1}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-white uppercase block leading-tight">
                        {step.title}
                      </span>
                      {step.description && (
                        <span className="text-[9.5px] text-white/70 block mt-1 leading-relaxed">
                          {step.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connector Arrow */}
                  {idx < workflowSteps.length - 1 && (
                    <div className="hidden md:flex items-center justify-center text-[#38bdf8] font-bold text-base px-0.5 select-none">
                      →
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* 7. FINAL VERDICT */}
        {/* =========================================================== */}
        {(finalVerdictText || impactMetrics.length > 0 || (project.tags && project.tags.length > 0)) && (
          <div className="bg-[#0c1f44] border-2 border-[#1e40af] p-4 sm:p-5 rounded-sm space-y-3 shadow-md">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#1e3a8a]">
              <PixelVerdictTrophyIcon size={18} />
              <h2 className="text-xs sm:text-sm font-bold text-[#38bdf8] uppercase tracking-wider">
                {(finalVerdictText || impactMetrics.length > 0) ? "FINAL VERDICT & IMPACT" : "TECH STACK & TOOLS"}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
              {/* Verdict text */}
              <div className={`${impactMetrics.length > 0 ? "lg:col-span-7" : "lg:col-span-12"} space-y-3 text-white/90 text-xs sm:text-[13px] leading-relaxed`}>
                {finalVerdictText && <p>{finalVerdictText}</p>}

                {/* Tech Stack & Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1e3a8a]/50">
                    <span className="text-[10px] text-[#38bdf8] font-bold uppercase mr-1">
                      TECH &amp; TOOLS:
                    </span>
                    {project.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-[#071329] text-[#bae6fd] px-2 py-0.5 rounded-xs border border-[#1e40af]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Key Metrics / Highlights */}
              {impactMetrics.length > 0 && (
                <div className="lg:col-span-5 bg-[#071329] border border-[#1e40af] p-3 rounded-xs grid grid-cols-3 gap-2 text-center">
                  {impactMetrics.map((metric, idx) => (
                    <div key={idx} className="space-y-1 p-1">
                      <div className="flex items-center justify-center gap-1 text-[#f59e0b]">
                        <span className="text-xs">
                          {metric.icon === "clock" || idx === 0 ? "🕒" : metric.icon === "coin" || idx === 1 ? "🪙" : "📈"}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-[#f59e0b]">
                          {metric.value}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/75 block leading-tight">
                        {metric.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM FOOTER BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#0a1e42] border-t-2 border-[#1e3a8a] px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onBackToAllProjects}
          className="bg-[#1e293b] hover:bg-[#334155] text-white border border-[#475569] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-pixel rounded-xs cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <span>&lt;</span>
          <span>BACK TO ALL PROJECTS</span>
        </button>

        <button
          onClick={onClose}
          className="bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-5 sm:px-6 py-1.5 sm:py-2 text-xs font-bold font-pixel rounded-xs cursor-pointer shadow-md transition-all"
        >
          CLOSE
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIDEO CASE STUDY MODAL PLAYER */}
      {/* ------------------------------------------------------------- */}
      {isVideoModalOpen && videoCaseStudyLink && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-3 sm:p-6"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-[#0c1f44] border-3 border-[#6366f1] rounded-md overflow-hidden text-white font-pixel flex flex-col max-h-[90vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#4338ca] px-3 py-2 border-b-2 border-[#312e81] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <PixelVideoPlayIcon size={18} />
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  VIDEO CASE STUDY: {project.title}
                </span>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="text-white hover:text-red-400 font-bold text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Video Player Frame */}
            <div className="p-3 sm:p-4 bg-black flex items-center justify-center">
              <RetroVideoPlayer
                url={videoCaseStudyLink}
                poster={project.videoPoster || project.thumbnail}
                title={`Case Study - ${project.title}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* IMAGE LIGHTBOX MODAL */}
      {/* ------------------------------------------------------------- */}
      {activeMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-3 sm:p-6"
          onClick={() => { setSelectedMediaIndex(null); setIsZoomed(false); }}
        >
          <div
            className="w-full max-w-4xl bg-[#0c1f44] border-3 border-[#38bdf8] rounded-md overflow-hidden text-white font-pixel flex flex-col max-h-[90vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#17468a] px-3 py-2 border-b-2 border-[#1e3a8a] flex justify-between items-center">
              <span className="text-xs sm:text-sm font-bold text-white truncate">
                {activeMedia.title || `Image ${selectedMediaIndex! + 1} of ${projectImages.length}`}
              </span>
              <button
                onClick={() => { setSelectedMediaIndex(null); setIsZoomed(false); }}
                className="text-white hover:text-red-400 font-bold text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Image viewer */}
            <div className={`flex-1 overflow-auto p-4 flex justify-center bg-black/80 ${isZoomed ? "items-start" : "items-center"}`}>
              <img
                src={activeMedia.url}
                alt={activeMedia.title || "Full Preview"}
                style={{ imageRendering: "auto", minWidth: isZoomed ? "100%" : "auto" }}
                onClick={() => setIsZoomed(!isZoomed)}
                className={`transition-all duration-300 rounded border border-[#1e40af] cursor-pointer ${isZoomed ? "w-full h-auto max-w-none max-h-none" : "max-w-full max-h-[65vh] object-contain hover:scale-[1.02]"}`}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Bottom Caption & Navigation */}
            <div className="bg-[#0a152d] border-t border-[#1e40af] p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-white/80 text-[11px] truncate w-full sm:w-auto text-center sm:text-left">
                {activeMedia.caption || activeMedia.title || "UI Design Screen Mockup"}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="bg-[#0f2854] hover:bg-[#1d4ed8] text-white px-3 py-1 rounded text-xs cursor-pointer border border-[#1e40af] flex-shrink-0"
                  title="Toggle Full Zoom"
                >
                  {isZoomed ? "🔍 Zoom Out" : "🔍 Zoom In"}
                </button>
                <button
                  disabled={selectedMediaIndex === 0}
                  onClick={() => { setSelectedMediaIndex((prev) => (prev! > 0 ? prev! - 1 : 0)); setIsZoomed(false); }}
                  className="bg-[#1d4ed8] hover:bg-[#2563eb] disabled:opacity-40 text-white px-3 py-1 rounded text-xs cursor-pointer flex-shrink-0"
                >
                  ◀ Prev
                </button>
                <button
                  disabled={selectedMediaIndex === projectImages.length - 1}
                  onClick={() => {
                    setSelectedMediaIndex((prev) =>
                      prev! < projectImages.length - 1 ? prev! + 1 : prev
                    );
                    setIsZoomed(false);
                  }}
                  className="bg-[#1d4ed8] hover:bg-[#2563eb] disabled:opacity-40 text-white px-3 py-1 rounded text-xs cursor-pointer flex-shrink-0"
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
