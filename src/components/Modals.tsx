import React, { useState, useEffect } from "react";
import {
  PixelWindowsLogo,
  PixelThisPCIcon,
  PixelFolderIcon,
  PixelSkillsIcon,
  PixelProjectsIcon,
  PixelContactIcon,
  PixelExperienceIcon,
  PixelRecycleBinIcon,
  PixelUxUiIllustration,
  PixelAiVideosIllustration,
  PixelVideoEditingIllustration,
  PixelGoogleDriveIcon,
  PixelResumeIcon,
} from "./PixelIcons";
import { PortfolioInfo, Project, Skill, ContactInfo, Experience, WindowId, OpenWindowItem, StartMenuSettings } from "../types";
import { ProjectDetailView } from "./ProjectDetailView";
import { getValidImageUrl } from "./MainWindow";
import { GoogleDriveManager } from "./admin/GoogleDriveManager";
import { Windows11StartMenu } from "./Windows11StartMenu";
import { ResumeViewerModal } from "./ResumeViewerModal";
import { sendMessageToFirestore } from "../services/firebaseService";

interface ModalsProps {
  openWindows: OpenWindowItem[];
  onCloseWindow: (id: WindowId) => void;
  onMinimizeWindow?: (id: WindowId, minimized?: boolean) => void;
  onFocusWindow?: (id: WindowId) => void;
  onOpenWindow: (id: WindowId, project?: Project, category?: string) => void;
  portfolio: PortfolioInfo;
  projects: Project[];
  skills: Skill[];
  contact: ContactInfo;
  experiences?: Experience[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const Modals: React.FC<ModalsProps> = ({
  openWindows,
  onCloseWindow,
  onMinimizeWindow,
  onFocusWindow,
  onOpenWindow,
  portfolio,
  projects,
  skills,
  contact,
  experiences = [],
  selectedCategory = "All",
  onSelectCategory,
}) => {
  // Contact Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");

  // Projects filter tab fallback state
  const [internalCategory, setInternalCategory] = useState<string>("All");
  const activeCategory = selectedCategory || internalCategory;

  // Normalize and robustly match category names
  const normalizeCategory = (cat: string = "") => cat.toLowerCase().replace(/[^a-z0-9]/g, "");

  const isCategoryMatch = (projectCategory: string = "", targetCategory: string = "") => {
    if (!targetCategory || targetCategory === "All") return true;
    const p = normalizeCategory(projectCategory);
    const t = normalizeCategory(targetCategory);
    if (p === t) return true;
    if (t.includes("ux") && p.includes("ux")) return true;
    if (t.includes("ai") && p.includes("ai")) return true;
    if (t.includes("video") && !t.includes("ai") && p.includes("video") && !p.includes("ai")) return true;
    return p.includes(t) || t.includes(p);
  };

  const visibleProjects = projects.filter((p) => p.visible !== false && isCategoryMatch(p.category, activeCategory));

  // Maximized states per window id
  const [maximizedWindows, setMaximizedWindows] = useState<Record<string, boolean>>({});

  // Media Fullscreen active state across video / embed viewers
  const [isMediaFullscreen, setIsMediaFullscreen] = useState(false);

  useEffect(() => {
    const handleMediaFullscreen = (e: Event) => {
      const custom = e as CustomEvent;
      setIsMediaFullscreen(!!custom.detail?.isFullscreen);
    };
    window.addEventListener("media-fullscreen-change", handleMediaFullscreen);
    return () => window.removeEventListener("media-fullscreen-change", handleMediaFullscreen);
  }, []);

  const toggleMaximize = (winId: string) => {
    setMaximizedWindows((prev) => ({
      ...prev,
      [winId]: !prev[winId],
    }));
  };

  const handleCategoryChange = (cat: string) => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    } else {
      setInternalCategory(cat);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formMsg.trim()) {
      setFormError("Please fill out all fields.");
      return;
    }

    setFormStatus("submitting");
    setFormError("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          message: formMsg,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message. Please try again.");

      setFormStatus("success");
      setFormName("");
      setFormEmail("");
      setFormMsg("");
      setTimeout(() => setFormStatus("idle"), 4000);
    } catch (err: any) {
      setFormStatus("error");
      setFormError(err.message || "Something went wrong.");
    }
  };

  // Reusable Window Header with Minimize, Maximize, and Close buttons
  const WindowHeader: React.FC<{
    title: string;
    icon: React.ReactNode;
    windowId: WindowId;
    isMaximized?: boolean;
  }> = ({ title, icon, windowId, isMaximized }) => (
    <div className="sticky top-0 z-30 bg-gradient-to-r from-[#17468a] via-[#1d529f] to-[#17468a] px-2.5 sm:px-3 py-1.5 sm:py-2 border-b-2 border-[#1e3a8a] flex items-center justify-between select-none shadow-md shrink-0">
      <div className="flex items-center gap-2 min-w-0 pr-2">
        {icon}
        <span className="text-white font-pixel font-bold text-xs sm:text-sm tracking-wider truncate">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Minimize Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onMinimizeWindow) {
              onMinimizeWindow(windowId, true);
            } else {
              onCloseWindow(windowId);
            }
          }}
          aria-label="Minimize Window"
          title="Minimize"
          className="w-6.5 sm:w-7 h-5 sm:h-5.5 bg-[#1d4ed8] border border-[#60a5fa] hover:bg-[#2563eb] active:bg-[#1e40af] flex items-center justify-center text-white cursor-pointer shadow-xs transition-colors"
        >
          <span className="font-pixel text-xs font-bold leading-none -translate-y-1">_</span>
        </button>

        {/* Maximize Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMaximize(windowId);
          }}
          aria-label="Maximize Window"
          title="Maximize"
          className="w-6.5 sm:w-7 h-5 sm:h-5.5 bg-[#1d4ed8] border border-[#60a5fa] hover:bg-[#2563eb] active:bg-[#1e40af] flex items-center justify-center text-white cursor-pointer shadow-xs transition-colors"
        >
          <span className="font-pixel text-[10px] leading-none">□</span>
        </button>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCloseWindow(windowId);
          }}
          aria-label="Close Window"
          title="Close"
          className="w-6.5 sm:w-7 h-5 sm:h-5.5 bg-[#e11d48] border border-[#fda4af] hover:bg-[#f43f5e] active:bg-[#be123c] flex items-center justify-center text-white cursor-pointer shadow-xs transition-colors"
        >
          <span className="font-pixel text-xs font-bold leading-none">✕</span>
        </button>
      </div>
    </div>
  );

  // Filter windows to render (exclude 'portfolio' which is MainWindow, and exclude minimized)
  const visibleWindows = openWindows.filter(
    (w) => w.id !== "portfolio" && !w.isMinimized
  );

  if (visibleWindows.length === 0) return null;

  return (
    <>
      {visibleWindows.map((win) => {
        const isMaximized = Boolean(maximizedWindows[win.id]);

        // 1. RENDER PROJECT DETAIL WINDOW
        if (win.id === "projectDetail" && win.project) {
          return (
            <div
              key={`win-projectDetail-${win.project.id}`}
              style={{ zIndex: isMediaFullscreen ? 999999 : win.zIndex }}
              onClick={() => onFocusWindow?.("projectDetail")}
              className={
                isMediaFullscreen
                  ? "fixed inset-0 pointer-events-auto p-0 m-0 overflow-hidden z-[999999] bg-black flex flex-col"
                  : "fixed inset-0 pointer-events-none flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 pt-2.5 sm:pt-6 pb-20 sm:pb-6 overflow-y-auto"
              }
            >
              <div
                className={
                  isMediaFullscreen
                    ? "w-full h-full p-0 m-0 flex flex-col pointer-events-auto flex-1"
                    : "w-full flex justify-center my-0 sm:my-auto pointer-events-none"
                }
              >
                <div
                  className={
                    isMediaFullscreen
                      ? "w-full h-full p-0 m-0 flex flex-col pointer-events-auto flex-1"
                      : "w-full flex justify-center pointer-events-auto"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocusWindow?.("projectDetail");
                  }}
                >
                  <ProjectDetailView
                    project={win.project}
                    onClose={() => onCloseWindow("projectDetail")}
                    onBackToAllProjects={() =>
                      onOpenWindow("projects", undefined, win.project?.category)
                    }
                  />
                </div>
              </div>
            </div>
          );
        }

        // 2. RENDER OTHER STANDARD MODAL WINDOWS
        return (
          <div
            key={`win-${win.id}`}
            style={{ zIndex: win.zIndex }}
            onClick={() => onFocusWindow?.(win.id)}
            className="fixed inset-0 pointer-events-none flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 pt-2.5 sm:pt-6 pb-20 sm:pb-6 overflow-y-auto"
          >
            <div
              className={`w-full ${
                isMaximized
                  ? "max-w-7xl h-[92vh]"
                  : win.id === "resume"
                  ? "w-[96vw] max-w-5xl lg:max-w-6xl h-[85vh]"
                  : win.id === "googleDrive" || win.id === "projects" || win.id === "experience"
                  ? "max-w-4xl"
                  : "max-w-2xl"
              } bg-[#0f2854] border-2 sm:border-3 border-[#3b82f6] shadow-[0_0_0_2px_#93c5fd,0_20px_50px_rgba(0,0,0,0.9)] rounded-t-lg rounded-b-md overflow-hidden my-0 sm:my-auto text-white animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[calc(100vh-90px)] sm:max-h-[88vh] pointer-events-auto transition-all`}
              onClick={(e) => {
                e.stopPropagation();
                onFocusWindow?.(win.id);
              }}
            >
              {/* THIS PC WINDOW */}
              {win.id === "thisPC" && (
                <div>
                  <WindowHeader
                    title="THIS PC - SYSTEM PROPERTIES"
                    icon={<PixelThisPCIcon size={18} />}
                    windowId="thisPC"
                    isMaximized={isMaximized}
                  />
                  <div className="p-4 md:p-6 space-y-4 font-pixel text-xs md:text-sm">
                    <div className="flex items-center gap-4 bg-[#0a1e42] p-4 border border-[#1e40af] rounded">
                      <PixelThisPCIcon size={56} />
                      <div>
                        <h2 className="text-[#38bdf8] font-bold text-base">Vignesh OS (Retro Edition 8-Bit)</h2>
                        <p className="text-white/80">Version 2026.11 (Build 110526)</p>
                        <p className="text-white/60">Digital Creator &amp; UI/UX Workstation</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-[#0c1f44] p-3 border border-[#1e3a8a] rounded space-y-1.5">
                        <span className="text-[#38bdf8] font-bold block">SPECIFICATIONS</span>
                        <p className="text-white/90">Processor: Creative Engine 9.0 GHz</p>
                        <p className="text-white/90">Memory: Infinite Creative Memory</p>
                        <p className="text-white/90">Graphics: Pixel Perfect GPU 8-Bit</p>
                        <p className="text-white/90">Location: {portfolio.location || "Trichy, India"}</p>
                      </div>

                      <div className="bg-[#0c1f44] p-3 border border-[#1e3a8a] rounded space-y-2">
                        <span className="text-[#38bdf8] font-bold block">STORAGE DRIVES</span>
                        <div
                          onClick={() => onOpenWindow("projects", undefined, "UX/UI Projects")}
                          className="p-1.5 rounded hover:bg-[#132a59] cursor-pointer transition-colors space-y-1 group"
                        >
                          <div className="flex justify-between text-xs">
                            <span className="group-hover:text-[#60a5fa] transition-colors">📁 (C:) UI/UX Design Projects</span>
                            <span className="text-[#38bdf8]">Browse &gt;</span>
                          </div>
                          <div className="w-full bg-[#1e293b] h-2 rounded overflow-hidden">
                            <div className="bg-[#38bdf8] h-full w-[95%]" />
                          </div>
                        </div>
                        <div
                          onClick={() => onOpenWindow("projects", undefined, "AI Videos Projects")}
                          className="p-1.5 rounded hover:bg-[#132a59] cursor-pointer transition-colors space-y-1 group"
                        >
                          <div className="flex justify-between text-xs">
                            <span className="group-hover:text-[#34d399] transition-colors">🎬 (D:) AI Video &amp; Editing</span>
                            <span className="text-[#34d399]">Browse &gt;</span>
                          </div>
                          <div className="w-full bg-[#1e293b] h-2 rounded overflow-hidden">
                            <div className="bg-[#34d399] h-full w-[92%]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => onCloseWindow("thisPC")}
                        className="bg-[#1d4ed8] border border-[#60a5fa] px-4 py-1.5 font-pixel text-xs font-bold hover:bg-[#2563eb] cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ABOUT ME WINDOW */}
              {win.id === "about" && (
                <div>
                  <WindowHeader
                    title="ABOUT ME - VIGNESH"
                    icon={<PixelFolderIcon size={18} />}
                    windowId="about"
                    isMaximized={isMaximized}
                  />
                  <div className="p-4 md:p-6 space-y-4 font-pixel text-xs md:text-sm max-h-[75vh] overflow-y-auto">
                    <div className="bg-[#0a1e42] p-4 border border-[#1e40af] rounded">
                      <h2 className="text-[#38bdf8] font-bold text-lg">{portfolio.name || "VIGNESH"}</h2>
                      <h3 className="text-white/80 font-bold">{portfolio.role || "DIGITAL CREATOR & DESIGNER"}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#38bdf8]">
                        <span>📍 {portfolio.locationText || "BASED IN TRICHY, INDIA"}</span>
                        <span>🟢 {portfolio.availabilityText || "AVAILABLE FOR FREELANCE"}</span>
                      </div>
                    </div>

                    <div className="space-y-3 bg-[#0c1f44] p-4 border border-[#1e3a8a] rounded leading-relaxed text-white/90">
                      <p>
                        {portfolio.longBio ||
                          "I am Vignesh, a multidisciplinary Digital Creator and UI/UX Designer based in Trichy, India. I specialize in crafting high-impact digital experiences, user interfaces, AI-powered video generation, and cinematic motion graphics."}
                      </p>
                      <p>
                        With a deep passion for pixel-perfect detail, engaging typography, and interactive storytelling, I bridge the gap between imagination and functional software experiences.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                      <div
                        onClick={() => onOpenWindow("projects", undefined, "UX/UI Projects")}
                        className="bg-[#152347] border border-[#5460a8] hover:border-[#818cf8] p-2.5 rounded cursor-pointer transition-colors"
                      >
                        <span className="text-[#818cf8] font-bold text-sm block">UX/UI Design</span>
                        <span className="text-[11px] text-white/80">Web &amp; Mobile Interfaces</span>
                      </div>
                      <div
                        onClick={() => onOpenWindow("projects", undefined, "AI Videos Projects")}
                        className="bg-[#122b24] border border-[#2e7d5b] hover:border-[#34d399] p-2.5 rounded cursor-pointer transition-colors"
                      >
                        <span className="text-[#34d399] font-bold text-sm block">AI Videos</span>
                        <span className="text-[11px] text-white/80">Generative Storytelling</span>
                      </div>
                      <div
                        onClick={() => onOpenWindow("projects", undefined, "Video Editing Projects")}
                        className="bg-[#2a1324] border border-[#9e3e68] hover:border-[#f472b6] p-2.5 rounded cursor-pointer transition-colors"
                      >
                        <span className="text-[#f472b6] font-bold text-sm block">Video Editing</span>
                        <span className="text-[11px] text-white/80">Cinematic Motion &amp; Pace</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        onClick={() => onOpenWindow("contact")}
                        className="bg-[#1d4ed8] border border-[#60a5fa] px-4 py-2 font-pixel text-xs font-bold hover:bg-[#2563eb] cursor-pointer"
                      >
                        GET IN TOUCH &gt;
                      </button>
                      <button
                        onClick={() => onCloseWindow("about")}
                        className="bg-[#334155] border border-[#64748b] px-4 py-2 font-pixel text-xs hover:bg-[#475569] cursor-pointer"
                      >
                        CLOSE
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SKILLS WINDOW */}
              {win.id === "skills" && (
                <div>
                  <WindowHeader
                    title="SKILLS & PROFICIENCY"
                    icon={<PixelSkillsIcon size={18} />}
                    windowId="skills"
                    isMaximized={isMaximized}
                  />
                  <div className="p-4 md:p-6 space-y-4 font-pixel text-xs md:text-sm max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {skills.map((skill, sIdx) => (
                        <div
                          key={`${skill.id}-${sIdx}`}
                          className="bg-[#0c1f44] border border-[#1e3a8a] p-3 rounded space-y-1.5 hover:border-[#38bdf8] transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{skill.name}</span>
                            <span className="text-[#38bdf8] font-bold text-[11px]">{skill.experience || ""}</span>
                          </div>
                          <span className="text-[10px] text-white/60 uppercase">{skill.category}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => onCloseWindow("skills")}
                        className="bg-[#1d4ed8] border border-[#60a5fa] px-4 py-1.5 font-pixel text-xs font-bold hover:bg-[#2563eb] cursor-pointer"
                      >
                        CLOSE
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PROJECTS EXPLORER WINDOW */}
              {win.id === "projects" && (
                <div>
                  <WindowHeader
                    title="PROJECTS EXPLORER"
                    icon={<PixelProjectsIcon size={18} />}
                    windowId="projects"
                    isMaximized={isMaximized}
                  />
                  <div className="p-4 md:p-6 space-y-4 font-pixel text-xs md:text-sm max-h-[75vh] overflow-y-auto">
                    {/* Category Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#1e3a8a]">
                      {[
                        { label: "All Projects", key: "All", count: projects.filter(p => p.visible !== false).length },
                        {
                          label: "UX/UI Projects",
                          key: "UX/UI Projects",
                          count: projects.filter((p) => p.visible !== false && isCategoryMatch(p.category, "UX/UI Projects")).length,
                        },
                        {
                          label: "AI Videos Projects",
                          key: "AI Videos Projects",
                          count: projects.filter((p) => p.visible !== false && isCategoryMatch(p.category, "AI Videos Projects")).length,
                        },
                        {
                          label: "Video Editing Projects",
                          key: "Video Editing Projects",
                          count: projects.filter((p) => p.visible !== false && isCategoryMatch(p.category, "Video Editing Projects")).length,
                        },
                      ].map((tab) => {
                        const isTabActive =
                          tab.key === "All"
                            ? activeCategory === "All" || !activeCategory
                            : isCategoryMatch(activeCategory, tab.key);

                        return (
                          <button
                            key={tab.key}
                            onClick={() => handleCategoryChange(tab.key)}
                            className={`px-3 py-1.5 rounded border text-xs font-pixel font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                              isTabActive
                                ? "bg-[#1d4ed8] border-[#60a5fa] text-white shadow-sm ring-1 ring-[#60a5fa]"
                                : "bg-[#0c1f44] border-[#1e3a8a] text-white/80 hover:bg-[#133066] hover:text-white"
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-xs ${
                                isTabActive
                                  ? "bg-[#38bdf8] text-[#071329] font-bold"
                                  : "bg-[#1e293b] text-white/70"
                              }`}
                            >
                              {tab.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Category Information Sub-Banner */}
                    <div className="bg-[#0a1e42] border border-[#1e40af] px-3 py-2 rounded flex items-center justify-between">
                      <span className="text-white/90 text-xs">
                        Showing:{" "}
                        <strong className="text-[#38bdf8]">
                          {activeCategory === "All" ? "All Portfolio Projects" : activeCategory}
                        </strong>{" "}
                        ({visibleProjects.length} items found)
                      </span>
                      <span className="text-[11px] text-[#93c5fd]/70 hidden sm:inline">
                        Click any project card to view full detail page
                      </span>
                    </div>

                    {/* Projects Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {visibleProjects.map((proj, pIdx) => {
                          const isUx = proj.category === "UX/UI Projects";
                          const isAi = proj.category === "AI Videos Projects";

                          return (
                            <div
                              key={`${proj.id}-${pIdx}`}
                              id={`explorer-proj-${proj.id}`}
                              onClick={() => onOpenWindow("projectDetail", proj)}
                              className={`border-2 rounded-md overflow-hidden cursor-pointer group transition-all flex flex-col justify-between shadow-md hover:shadow-xl hover:scale-[1.01] ${
                                isUx
                                  ? "bg-[#152347] border-[#5460a8] hover:border-[#818cf8]"
                                  : isAi
                                  ? "bg-[#122b24] border-[#2e7d5b] hover:border-[#34d399]"
                                  : "bg-[#2a1324] border-[#9e3e68] hover:border-[#f472b6]"
                              }`}
                            >
                              {/* Project Header Bar */}
                              <div
                                className={`px-3 py-1.5 flex items-center justify-between border-b ${
                                  isUx
                                    ? "bg-[#485399] border-[#31396b]"
                                    : isAi
                                    ? "bg-[#246349] border-[#174230]"
                                    : "bg-[#782c4e] border-[#4f1831]"
                                }`}
                              >
                                <span className="font-bold text-white text-xs truncate max-w-[200px]">
                                  {proj.title}
                                </span>
                                <div className="flex items-center gap-1 opacity-80 text-[10px] font-pixel text-white">
                                  <span>-</span>
                                  <span>□</span>
                                  <span>✕</span>
                                </div>
                              </div>

                              {/* Project Visual Thumbnail Preview */}
                              <div className="h-32 bg-[#091733] overflow-hidden relative border-b border-black/20">
                                {proj.thumbnail ? (
                                  <img
                                    src={getValidImageUrl(proj.thumbnail)}
                                    alt={proj.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : isUx ? (
                                  <PixelUxUiIllustration />
                                ) : isAi ? (
                                  <PixelAiVideosIllustration />
                                ) : (
                                  <PixelVideoEditingIllustration />
                                )}
                                <span
                                  className={`absolute top-2 right-2 text-[9px] font-pixel font-bold px-1.5 py-0.5 rounded shadow-sm ${
                                    isUx
                                      ? "bg-[#5460a8] text-white"
                                      : isAi
                                      ? "bg-[#2e7d5b] text-white"
                                      : "bg-[#9e3e68] text-white"
                                  }`}
                                >
                                  {proj.category}
                                </span>
                              </div>

                              {/* Project Content Description */}
                              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                                <div>
                                  <h3 className="text-white font-bold text-xs group-hover:text-[#60a5fa] transition-colors mb-1">
                                    {proj.title}
                                  </h3>
                                  <p className="text-white/80 text-xs leading-relaxed line-clamp-2">
                                    {proj.shortDescription}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-1 pt-2">
                                  {proj.tags?.slice(0, 4).map((t, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] bg-[#1e293b] text-[#93c5fd] px-1.5 py-0.5 rounded border border-[#334155]"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Project Card Footer CTA */}
                              <div className="p-2 bg-black/40 border-t border-white/10 flex justify-between items-center">
                                <span className="text-[10px] text-white/60">{proj.date || "2026"}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenWindow("projectDetail", proj);
                                  }}
                                  className={`text-xs font-bold px-2 py-1 rounded-xs border flex items-center gap-1 transition-all cursor-pointer ${
                                    isUx
                                      ? "bg-[#5460a8] group-hover:bg-[#6366f1] border-[#818cf8] text-white"
                                      : isAi
                                      ? "bg-[#2e7d5b] group-hover:bg-[#10b981] border-[#6ee7b7] text-white"
                                      : "bg-[#9e3e68] group-hover:bg-[#ec4899] border-[#fbcfe8] text-white"
                                  }`}
                                >
                                  <span>VIEW DETAILS</span>
                                  <span>&gt;</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {visibleProjects.length === 0 && (
                      <div className="text-center py-10 bg-[#0c1f44] border border-[#1e3a8a] rounded p-6">
                        <p className="text-white/80 text-sm mb-2">No projects found in this category.</p>
                        <button
                          onClick={() => handleCategoryChange("All")}
                          className="bg-[#1d4ed8] border border-[#60a5fa] px-3 py-1 text-xs text-white rounded cursor-pointer"
                        >
                          View All Projects
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CONTACT WINDOW */}
              {win.id === "contact" && (
                <div>
                  <WindowHeader
                    title="CONTACTS.EXE - SEND MESSAGE"
                    icon={<PixelContactIcon size={18} />}
                    windowId="contact"
                    isMaximized={isMaximized}
                  />
                  <div className="p-4 md:p-6 space-y-4 font-pixel text-xs md:text-sm max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Contact Info & Socials */}
                      <div className="bg-[#0a1e42] p-4 border border-[#1e40af] rounded space-y-3">
                        <span className="text-[#38bdf8] font-bold text-sm block">DIRECT CONTACT</span>
                        <div className="space-y-2 text-white/90">
                          <p>📧 Email: {contact.email || "editorvignesh.ui@gmail.com"}</p>
                          <p>📍 Location: {contact.location || "Trichy, Tamil Nadu, India"}</p>
                          <p>🟢 Status: Available for freelance projects &amp; collaborations</p>
                        </div>

                        <div className="pt-2 border-t border-[#1e40af] space-y-2">
                          <span className="text-[#38bdf8] font-bold text-xs block">SOCIAL PROFILES</span>
                          <div className="flex flex-wrap gap-2">
                            {contact.linkedin && (
                              <a
                                href={contact.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#1d4ed8] hover:bg-[#2563eb] text-white px-2.5 py-1 rounded text-xs border border-[#60a5fa]"
                              >
                                LinkedIn
                              </a>
                            )}
                            {contact.instagram && (
                              <a
                                href={contact.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#ec4899] hover:bg-[#f43f5e] text-white px-2.5 py-1 rounded text-xs border border-[#fda4af]"
                              >
                                Instagram
                              </a>
                            )}
                            {contact.dribbble && (
                              <a
                                href={contact.dribbble}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#f43f5e] hover:bg-[#e11d48] text-white px-2.5 py-1 rounded text-xs border border-[#fda4af]"
                              >
                                Dribbble
                              </a>
                            )}
                            {contact.behance && (
                              <a
                                href={contact.behance}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-2.5 py-1 rounded text-xs border border-[#38bdf8]"
                              >
                                Behance
                              </a>
                            )}
                            {contact.youtube && (
                              <a
                                href={contact.youtube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#dc2626] hover:bg-[#ef4444] text-white px-2.5 py-1 rounded text-xs border border-[#fca5a5]"
                              >
                                YouTube
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Interactive Message Form */}
                      <form onSubmit={handleSendMessage} className="bg-[#0c1f44] p-4 border border-[#1e3a8a] rounded space-y-3">
                        <span className="text-[#38bdf8] font-bold text-sm block">SEND A MESSAGE</span>

                        {formStatus === "success" && (
                          <div className="bg-[#064e3b] border border-[#10b981] p-2 text-white text-xs rounded">
                            ⭐ Thank you! Your message has been sent successfully.
                          </div>
                        )}

                        {formError && (
                          <div className="bg-[#881337] border border-[#f43f5e] p-2 text-white text-xs rounded">
                            {formError}
                          </div>
                        )}

                        <div>
                          <label className="block text-white/80 text-xs mb-1">Your Name</label>
                          <input
                            type="text"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g. Alex"
                            className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white font-pixel text-xs rounded focus:border-[#38bdf8] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-white/80 text-xs mb-1">Your Email</label>
                          <input
                            type="email"
                            required
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            placeholder="e.g. alex@studio.com"
                            className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white font-pixel text-xs rounded focus:border-[#38bdf8] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-white/80 text-xs mb-1">Message</label>
                          <textarea
                            required
                            rows={3}
                            value={formMsg}
                            onChange={(e) => setFormMsg(e.target.value)}
                            placeholder="Tell me about your project..."
                            className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white font-pixel text-xs rounded focus:border-[#38bdf8] outline-none resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={formStatus === "submitting"}
                          className="w-full bg-[#1d4ed8] hover:bg-[#2563eb] text-white border border-[#60a5fa] py-2 font-pixel text-xs font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          {formStatus === "submitting" ? "SENDING..." : "SEND MESSAGE >"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* MY EXPERIENCE WINDOW */}
              {win.id === "experience" && (
                <div>
                  <WindowHeader
                    title="MY EXPERIENCE.EXE - WORK HISTORY"
                    icon={<PixelExperienceIcon size={18} />}
                    windowId="experience"
                    isMaximized={isMaximized}
                  />
                  <div className="p-4 md:p-6 space-y-4 font-pixel text-xs md:text-sm max-h-[75vh] overflow-y-auto">
                    <div className="bg-[#0a1e42] p-4 border border-[#1e40af] rounded flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <PixelExperienceIcon size={36} />
                        <div>
                          <h2 className="text-[#38bdf8] font-bold text-base tracking-wide">CAREER &amp; WORK EXPERIENCE</h2>
                          <p className="text-white/70 text-xs">Professional background in UI/UX Design, Motion &amp; Generative AI</p>
                        </div>
                      </div>
                      <span className="bg-[#1e3a8a] text-[#93c5fd] px-2.5 py-1 text-[11px] rounded border border-[#3b82f6]">
                        {experiences.length} Position{experiences.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {experiences.length === 0 ? (
                      <div className="bg-[#0c1f44] p-8 text-center border border-[#1e3a8a] rounded space-y-2">
                        <p className="text-white/60">No work experiences currently listed.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {experiences
                          .filter((e) => e.visible !== false)
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((exp, idx) => {
                            const respList = Array.isArray(exp.responsibilities)
                              ? exp.responsibilities
                              : typeof exp.responsibilities === "string"
                              ? (exp.responsibilities as string).split("\n").filter(Boolean)
                              : [];
                            const projList = Array.isArray(exp.projects)
                              ? exp.projects
                              : typeof exp.projects === "string"
                              ? (exp.projects as string).split("\n").filter(Boolean)
                              : [];
                            const achList = Array.isArray(exp.achievements)
                              ? exp.achievements
                              : typeof exp.achievements === "string"
                              ? (exp.achievements as string).split("\n").filter(Boolean)
                              : [];

                            return (
                              <div
                                key={exp.id || idx}
                                className="bg-[#0c1f44] border-2 border-[#1e3a8a] hover:border-[#38bdf8] p-4 rounded transition-colors space-y-3"
                              >
                                {/* Header row */}
                                <div className="flex items-start justify-between flex-wrap gap-2 pb-2 border-b border-[#1e3a8a]/70">
                                  <div>
                                    <h3 className="text-[#38bdf8] font-bold text-base">{exp.role}</h3>
                                    <div className="flex items-center gap-2 text-xs text-white/90 mt-0.5">
                                      <span className="font-bold text-[#fbbf24]">🏢 {exp.companyName}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {exp.currentPosition && (
                                      <span className="bg-emerald-900/70 border border-emerald-500 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                        Current Role
                                      </span>
                                    )}
                                    <span className="bg-[#1e293b] border border-[#475569] text-white/90 text-xs px-2.5 py-0.5 rounded">
                                      📅 {exp.startDate} – {exp.currentPosition ? "Present" : exp.endDate || "Present"}
                                    </span>
                                  </div>
                                </div>

                                {/* Description */}
                                {exp.description && (
                                  <p className="text-white/80 leading-relaxed text-xs">
                                    {exp.description}
                                  </p>
                                )}

                                {/* Responsibilities */}
                                {respList.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[#38bdf8] text-[11px] font-bold uppercase tracking-wider block">
                                      Key Responsibilities:
                                    </span>
                                    <ul className="space-y-1 pl-2 text-xs text-white/85">
                                      {respList.map((resp, rIdx) => (
                                        <li key={rIdx} className="flex items-start gap-2">
                                          <span className="text-[#38bdf8] font-bold">▶</span>
                                          <span>{resp}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Key Projects & Achievements */}
                                {(projList.length > 0 || achList.length > 0) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-[11px]">
                                    {projList.length > 0 && (
                                      <div className="bg-[#091836] p-2.5 rounded border border-[#1e3a8a]">
                                        <span className="text-[#a78bfa] font-bold block mb-1.5 uppercase">Key Projects:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {projList.map((p, pIdx) => (
                                            <span key={pIdx} className="bg-[#1e1b4b] border border-[#6366f1] text-[#c7d2fe] px-1.5 py-0.5 rounded text-[10px]">
                                              {p}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {achList.length > 0 && (
                                      <div className="bg-[#091836] p-2.5 rounded border border-[#1e3a8a]">
                                        <span className="text-[#34d399] font-bold block mb-1.5 uppercase">Impact &amp; Achievements:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {achList.map((a, aIdx) => (
                                            <span key={aIdx} className="bg-[#064e3b] border border-[#10b981] text-[#a7f3d0] px-1.5 py-0.5 rounded text-[10px]">
                                              ★ {a}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => onCloseWindow("experience")}
                        className="bg-[#1d4ed8] border border-[#60a5fa] px-4 py-1.5 font-pixel text-xs font-bold hover:bg-[#2563eb] cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* GOOGLE DRIVE WINDOW */}
              {win.id === "googleDrive" && (
                <div>
                  <WindowHeader
                    title="GOOGLE DRIVE - CLOUD STORAGE & BACKUP"
                    icon={<PixelGoogleDriveIcon size={18} />}
                    windowId="googleDrive"
                    isMaximized={isMaximized}
                  />
                  <div className="p-2 sm:p-4 font-pixel text-xs md:text-sm max-h-[80vh] overflow-y-auto">
                    <GoogleDriveManager />
                  </div>
                </div>
              )}

              {/* RESUME VIEWER WINDOW */}
              {win.id === "resume" && (
                <div className="flex flex-col h-full flex-1 min-h-[500px]">
                  <WindowHeader
                    title={`RESUME.EXE - ${(portfolio.name || "VIGNESH").toUpperCase()} CURRICULUM VITAE`}
                    icon={<PixelResumeIcon size={18} />}
                    windowId="resume"
                    isMaximized={isMaximized}
                  />
                  <div className="flex-1 overflow-hidden">
                    <ResumeViewerModal
                      portfolio={portfolio}
                      experiences={experiences}
                      skills={skills}
                      onClose={() => onCloseWindow("resume")}
                      isMaximized={isMaximized}
                      onToggleMaximize={() => toggleMaximize("resume")}
                      onMinimize={() => (onMinimizeWindow ? onMinimizeWindow("resume", true) : onCloseWindow("resume"))}
                    />
                  </div>
                </div>
              )}

              {/* RECYCLE BIN WINDOW */}
              {win.id === "recycleBin" && (
                <div>
                  <WindowHeader
                    title="RECYCLE BIN"
                    icon={<PixelRecycleBinIcon size={18} />}
                    windowId="recycleBin"
                    isMaximized={isMaximized}
                  />
                  <div className="p-6 md:p-8 text-center space-y-4 font-pixel text-xs md:text-sm">
                    <div className="w-16 h-16 mx-auto">
                      <PixelRecycleBinIcon size={64} />
                    </div>
                    <h2 className="text-[#38bdf8] font-bold text-base">Recycle Bin is Empty</h2>
                    <p className="text-white/80 max-w-sm mx-auto">
                      "This portfolio has no deleted projects. All ideas are crafted with care and passion!"
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => onCloseWindow("recycleBin")}
                        className="bg-[#1d4ed8] border border-[#60a5fa] px-6 py-2 font-pixel text-xs font-bold hover:bg-[#2563eb] cursor-pointer"
                      >
                        CLOSE
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

// Start Menu & Search & Tray Popups
export const StartMenuPopup: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenWindow: (id: WindowId, project?: Project) => void;
  portfolio: PortfolioInfo;
  projects?: Project[];
  skills?: Skill[];
  settingsOverride?: Partial<StartMenuSettings>;
  onLockDesktop?: () => void;
  onOpenAdmin?: () => void;
}> = ({
  isOpen,
  onClose,
  onOpenWindow,
  portfolio,
  projects = [],
  skills = [],
  settingsOverride,
  onLockDesktop,
  onOpenAdmin,
}) => {
  return (
    <Windows11StartMenu
      isOpen={isOpen}
      onClose={onClose}
      onOpenWindow={onOpenWindow}
      portfolio={portfolio}
      projects={projects}
      skills={skills}
      settingsOverride={settingsOverride}
      onLockDesktop={onLockDesktop}
      onOpenAdmin={onOpenAdmin}
    />
  );
};

export const SearchPopup: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenWindow: (id: WindowId, project?: Project) => void;
  projects: Project[];
  skills: Skill[];
}> = ({ isOpen, onClose, onOpenWindow, projects, skills }) => {
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const filteredProjects = (projects || []).filter(
    (p) =>
      p && (
        (p.title || "").toLowerCase().includes((query || "").toLowerCase()) ||
        (p.shortDescription || "").toLowerCase().includes((query || "").toLowerCase()) ||
        (Array.isArray(p.tags) && p.tags.some((t) => (t || "").toLowerCase().includes((query || "").toLowerCase())))
      )
  );

  const filteredSkills = (skills || []).filter(
    (s) => s && (s.name || "").toLowerCase().includes((query || "").toLowerCase())
  );

  return (
    <div
      className="fixed bottom-14 left-2 sm:left-10 md:left-24 z-50 w-80 md:w-96 max-w-[calc(100vw-16px)] bg-[#0e214d]/95 backdrop-blur-md border-2 border-[#38bdf8] rounded-lg shadow-2xl p-3.5 sm:p-4 text-white font-pixel select-none animate-in slide-in-from-bottom-2 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to search projects, skills..."
        className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white font-pixel text-xs rounded focus:border-[#38bdf8] outline-none mb-3"
      />

      <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
        {filteredProjects.length > 0 && (
          <div>
            <span className="text-[10px] text-[#38bdf8] uppercase block mb-1">Projects</span>
            {filteredProjects.map((p, idx) => (
              <div
                key={`${p.id}-${idx}`}
                onClick={() => {
                  onOpenWindow("projectDetail", p);
                  onClose();
                }}
                className="p-1.5 hover:bg-[#1d4ed8]/50 rounded cursor-pointer flex justify-between"
              >
                <span>{p.title}</span>
                <span className="text-white/50 text-[10px]">{p.category}</span>
              </div>
            ))}
          </div>
        )}

        {filteredSkills.length > 0 && (
          <div>
            <span className="text-[10px] text-[#34d399] uppercase block mb-1">Skills</span>
            {filteredSkills.map((s, idx) => (
              <div
                key={`${s.id}-${idx}`}
                onClick={() => {
                  onOpenWindow("skills");
                  onClose();
                }}
                className="p-1.5 hover:bg-[#1d4ed8]/50 rounded cursor-pointer flex justify-between"
              >
                <span>{s.name}</span>
                <span className="text-[#34d399] text-[10px]">{s.experience || ""}</span>
              </div>
            ))}
          </div>
        )}

        {filteredProjects.length === 0 && filteredSkills.length === 0 && (
          <p className="text-white/60 text-center py-4 text-xs">No matching results found.</p>
        )}
      </div>
    </div>
  );
};
