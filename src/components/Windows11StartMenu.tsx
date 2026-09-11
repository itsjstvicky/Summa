import React, { useState, useMemo, useEffect } from "react";
import {
  PortfolioInfo,
  Project,
  Skill,
  WindowId,
  StartMenuSettings,
  StartMenuPinnedApp,
  StartMenuRecommendedItem,
} from "../types";
import {
  PixelWindowsLogo,
  PixelFolderIcon,
  PixelGoogleDriveIcon,
  PixelThisPCIcon,
  PixelProjectsIcon,
  PixelSkillsIcon,
  PixelContactIcon,
  PixelExperienceIcon,
  PixelRecycleBinIcon,
  PixelAvatar,
  PixelResumeIcon,
} from "./PixelIcons";
import { getValidImageUrl } from "./MainWindow";
import {
  Search,
  Power,
  ChevronRight,
  ArrowLeft,
  Lock,
  RotateCcw,
  Moon,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Layers,
  Terminal,
  Palette,
  FileText,
  Clock,
  Compass,
} from "lucide-react";
import { getLocalMasterBackup } from "../services/persistenceService";
import {
  fetchTaskbarSettingsFromFirestore,
  IS_FIREBASE_CONNECTED,
} from "../services/firebaseService";

export const DEFAULT_PINNED_APPS: StartMenuPinnedApp[] = [
  {
    id: "pin-portfolio",
    name: "Portfolio Desk",
    iconImage: "portfolio",
    destinationType: "existingWindow",
    destination: "portfolio",
    order: 1,
    visible: true,
    category: "Core",
  },
  {
    id: "pin-about",
    name: "About Me",
    iconImage: "about",
    destinationType: "existingWindow",
    destination: "about",
    order: 2,
    visible: true,
    category: "Core",
  },
  {
    id: "pin-projects",
    name: "Projects Hub",
    iconImage: "projects",
    destinationType: "existingWindow",
    destination: "projects",
    order: 3,
    visible: true,
    category: "Creative",
  },
  {
    id: "pin-skills",
    name: "Skills & Stack",
    iconImage: "skills",
    destinationType: "existingWindow",
    destination: "skills",
    order: 4,
    visible: true,
    category: "Technical",
  },
  {
    id: "pin-experience",
    name: "Experience",
    iconImage: "experience",
    destinationType: "existingWindow",
    destination: "experience",
    order: 5,
    visible: true,
    category: "Career",
  },
  {
    id: "pin-drive",
    name: "Google Drive",
    iconImage: "googleDrive",
    destinationType: "existingWindow",
    destination: "googleDrive",
    order: 6,
    visible: true,
    badge: "Cloud",
    category: "Tools",
  },
  {
    id: "pin-contact",
    name: "Contact & Hire",
    iconImage: "contact",
    destinationType: "existingWindow",
    destination: "contact",
    order: 7,
    visible: true,
    category: "Social",
  },
  {
    id: "pin-thispc",
    name: "This PC",
    iconImage: "thisPC",
    destinationType: "existingWindow",
    destination: "thisPC",
    order: 8,
    visible: true,
    category: "System",
  },
  {
    id: "pin-recycle",
    name: "Recycle Bin",
    iconImage: "recycleBin",
    destinationType: "existingWindow",
    destination: "recycleBin",
    order: 9,
    visible: true,
    category: "System",
  },
  {
    id: "pin-ux-project",
    name: "UX/UI Case Study",
    iconImage: "paint",
    destinationType: "project",
    destination: "p1",
    order: 10,
    visible: true,
    badge: "Featured",
    category: "Creative",
  },
  {
    id: "pin-ai-video",
    name: "AI Video Cinema",
    iconImage: "video",
    destinationType: "project",
    destination: "p2",
    order: 11,
    visible: true,
    badge: "Hot",
    category: "Creative",
  },
  {
    id: "pin-video-edit",
    name: "Video Editing",
    iconImage: "terminal",
    destinationType: "project",
    destination: "p3",
    order: 12,
    visible: true,
    category: "Creative",
  },
];

export const DEFAULT_RECOMMENDED_ITEMS: StartMenuRecommendedItem[] = [
  {
    id: "rec-1",
    title: "Cyberpunk UI Redesign Case Study",
    subtitle: "UX/UI Design Portfolio",
    timestamp: "Featured Project",
    iconImage: "projects",
    destinationType: "project",
    destination: "p1",
    visible: true,
  },
  {
    id: "rec-2",
    title: "AI Video Generation Cinema Reel",
    subtitle: "Midjourney & Runway Gen-3",
    timestamp: "2 hours ago",
    iconImage: "video",
    destinationType: "project",
    destination: "p2",
    visible: true,
  },
  {
    id: "rec-3",
    title: "Google Drive Cloud Asset Sync",
    subtitle: "Real-time Google OAuth Connected",
    timestamp: "Cloud Connected",
    iconImage: "googleDrive",
    destinationType: "existingWindow",
    destination: "googleDrive",
    visible: true,
  },
  {
    id: "rec-4",
    title: "Resume & Verified Credentials",
    subtitle: "PDF Document Download",
    timestamp: "Updated Today",
    iconImage: "about",
    destinationType: "existingWindow",
    destination: "about",
    visible: true,
  },
];

export const DEFAULT_START_MENU_SETTINGS: StartMenuSettings = {
  layout: "center",
  theme: "acrylicDark",
  width: 600,
  showSearchBar: true,
  searchPlaceholder: "Type here to search...",
  headerTitle: "Pinned",
  allAppsButtonText: "All apps",
  userName: "Vignesh",
  userTagline: "creator@portfolio.exe",
  userAvatarUrl: "",
  userAvatarStyle: "pixelAvatar",
  showPinnedSection: true,
  showRecommendedSection: true,
  recommendedSectionTitle: "Recommended",
  pinnedApps: DEFAULT_PINNED_APPS,
  recommendedItems: DEFAULT_RECOMMENDED_ITEMS,
  showPowerButton: true,
  showSleepOption: true,
  showRestartOption: true,
  showLockOption: true,
  showAdminOption: true,
};

interface Windows11StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWindow: (id: WindowId, project?: Project) => void;
  portfolio: PortfolioInfo;
  projects?: Project[];
  skills?: Skill[];
  settingsOverride?: Partial<StartMenuSettings>;
  onLockDesktop?: () => void;
  onOpenAdmin?: () => void;
  isInlinePreview?: boolean;
}

export const Windows11StartMenu: React.FC<Windows11StartMenuProps> = ({
  isOpen,
  onClose,
  onOpenWindow,
  portfolio,
  projects = [],
  skills = [],
  settingsOverride,
  onLockDesktop,
  onOpenAdmin,
  isInlinePreview = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAllAppsView, setIsAllAppsView] = useState(false);
  const [isPowerMenuOpen, setIsPowerMenuOpen] = useState(false);
  const [liveSettings, setLiveSettings] = useState<StartMenuSettings | null>(null);

  useEffect(() => {
    if (!isOpen || isInlinePreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isInlinePreview, onClose]);

  // Sync latest start menu settings from backend, Firestore, or custom events
  useEffect(() => {
    if (isInlinePreview) return;

    const fetchLatest = async () => {
      try {
        // First check local instant backup
        const local = getLocalMasterBackup();
        if (local?.startMenu || local?.taskbarSettings?.startMenu) {
          setLiveSettings(local.startMenu || local.taskbarSettings.startMenu);
        }

        if (IS_FIREBASE_CONNECTED) {
          const fsSettings = await fetchTaskbarSettingsFromFirestore();
          if (fsSettings?.startMenu) {
            setLiveSettings(fsSettings.startMenu);
            return;
          }
        }

        const res = await fetch("/api/start-menu");
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object") {
            setLiveSettings(data);
          }
        }
      } catch {
        // Fallback gracefully
      }
    };

    // Fetch immediately on mount and whenever menu opens
    fetchLatest();

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setLiveSettings(e.detail);
      }
    };

    const handleTbUpdate = (e: any) => {
      if (e.detail?.startMenu) {
        setLiveSettings(e.detail.startMenu);
      }
    };

    const handleMasterUpdate = (e: any) => {
      if (e.detail?.startMenu) {
        setLiveSettings(e.detail.startMenu);
      } else if (e.detail?.taskbarSettings?.startMenu) {
        setLiveSettings(e.detail.taskbarSettings.startMenu);
      }
    };

    window.addEventListener("start_menu_settings_updated", handleUpdate);
    window.addEventListener("taskbar_settings_updated", handleTbUpdate);
    window.addEventListener("cms_master_updated", handleMasterUpdate);
    window.addEventListener("storage", fetchLatest);

    return () => {
      window.removeEventListener("start_menu_settings_updated", handleUpdate);
      window.removeEventListener("taskbar_settings_updated", handleTbUpdate);
      window.removeEventListener("cms_master_updated", handleMasterUpdate);
      window.removeEventListener("storage", fetchLatest);
    };
  }, [isOpen, isInlinePreview]);

  // Combine liveSettings, settingsOverride and defaults (live reactive settings take precedence)
  const activeOverride = isInlinePreview
    ? (settingsOverride || {})
    : {
        ...(settingsOverride || {}),
        ...(liveSettings || {}),
      };

  const settings: StartMenuSettings = {
    ...DEFAULT_START_MENU_SETTINGS,
    ...activeOverride,
    pinnedApps: Array.isArray(activeOverride?.pinnedApps)
      ? activeOverride.pinnedApps
      : DEFAULT_PINNED_APPS,
    recommendedItems: Array.isArray(activeOverride?.recommendedItems)
      ? activeOverride.recommendedItems
      : DEFAULT_RECOMMENDED_ITEMS,
  };

  const displayName = settings.userName || portfolio.name || "Vignesh";
  const displayTagline = settings.userTagline || portfolio.role || "creator@portfolio.exe";

  // Render App Icon Graphic (Pixel Art or Custom Image)
  const renderAppIcon = (iconKey: string, size = 32, customUrl?: string) => {
    if (customUrl || (iconKey && (iconKey.startsWith("http") || iconKey.startsWith("data:") || iconKey.startsWith("/uploads/")))) {
      return (
        <img
          src={getValidImageUrl(customUrl || iconKey)}
          alt="App Icon"
          className="object-contain rounded-lg shadow-sm"
          style={{ width: size, height: size }}
          referrerPolicy="no-referrer"
        />
      );
    }

    const key = (iconKey || "").toLowerCase();

    switch (key) {
      case "portfolio":
      case "taskview":
        return (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0284c7] to-[#1e40af] p-1 flex items-center justify-center shadow-md">
            <PixelWindowsLogo size={20} />
          </div>
        );
      case "about":
      case "user":
        return (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#065f46] to-[#047857] p-1 flex items-center justify-center shadow-md">
            <PixelSkillsIcon size={22} />
          </div>
        );
      case "projects":
      case "folder":
      case "explorer":
        return <PixelFolderIcon size={size} />;
      case "skills":
        return <PixelSkillsIcon size={size} />;
      case "experience":
        return <PixelExperienceIcon size={size} />;
      case "googledrive":
      case "drive":
      case "cloud":
        return <PixelGoogleDriveIcon size={size} />;
      case "contact":
      case "mail":
        return <PixelContactIcon size={size} />;
      case "thispc":
        return <PixelThisPCIcon size={size} />;
      case "recyclebin":
      case "trash":
        return <PixelRecycleBinIcon size={size} />;
      case "resume":
      case "cv":
      case "document":
        return <PixelResumeIcon size={size} />;
      case "paint":
      case "ux":
        return (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] p-1 flex items-center justify-center text-white shadow-md">
            <Palette size={20} className="text-[#c4b5fd]" />
          </div>
        );
      case "video":
      case "film":
        return (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#db2777] to-[#831843] p-1 flex items-center justify-center text-white shadow-md">
            <Sparkles size={20} className="text-[#fbcfe8]" />
          </div>
        );
      case "terminal":
      case "cmd":
        return (
          <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-[#334155] p-1 flex items-center justify-center text-emerald-400 shadow-md">
            <Terminal size={18} />
          </div>
        );
      default:
        return <PixelFolderIcon size={size} />;
    }
  };

  // Handle click on any app tile or recommended item
  const handleItemClick = (destinationType: string, destination: string) => {
    onClose();
    if (destination === "admin" || destinationType === "admin") {
      if (onOpenAdmin) onOpenAdmin();
      return;
    }

    if (destinationType === "externalLink") {
      window.open(destination, "_blank", "noopener,noreferrer");
      return;
    }

    if (destinationType === "project") {
      const proj = projects.find((p) => p.id === destination);
      if (proj) {
        onOpenWindow("projectDetail", proj);
      } else {
        onOpenWindow("projects");
      }
      return;
    }

    // Default Window ID
    onOpenWindow(destination as WindowId);
  };

  // Filtered search results
  const matchingPinned = useMemo(() => {
    if (!searchQuery.trim()) return (settings?.pinnedApps || []).filter((a) => a && a.visible !== false);
    const q = (searchQuery || "").toLowerCase();
    return (settings?.pinnedApps || []).filter(
      (a) => a && ((a.name || "").toLowerCase().includes(q) || (a.category && (a.category || "").toLowerCase().includes(q)))
    );
  }, [searchQuery, settings?.pinnedApps]);

  const matchingProjects = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = (searchQuery || "").toLowerCase();
    return (projects || []).filter(
      (p) =>
        p && (
          (p.title || "").toLowerCase().includes(q) ||
          (p.shortDescription || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          (Array.isArray(p.tags) && p.tags.some((t) => (t || "").toLowerCase().includes(q)))
        )
    );
  }, [searchQuery, projects]);

  const matchingSkills = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = (searchQuery || "").toLowerCase();
    return (skills || []).filter(
      (s) => s && ((s.name || "").toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q))
    );
  }, [searchQuery, skills]);

  // Combined list for "All Apps" view sorted alphabetically
  const allAppsList = useMemo(() => {
    const apps: { name: string; icon: string; type: string; dest: string; category: string }[] = [
      { name: "About Vignesh", icon: "about", type: "existingWindow", dest: "about", category: "Core" },
      { name: "Admin CMS Control Center", icon: "terminal", type: "admin", dest: "admin", category: "System" },
      { name: "Contact & Direct Messaging", icon: "contact", type: "existingWindow", dest: "contact", category: "Core" },
      { name: "Curriculum Vitae / Resume", icon: "resume", type: "existingWindow", dest: "resume", category: "Career" },
      { name: "Google Drive Cloud Hub", icon: "googleDrive", type: "existingWindow", dest: "googleDrive", category: "Cloud" },
      { name: "My Experience & Career", icon: "experience", type: "existingWindow", dest: "experience", category: "Career" },
      { name: "Portfolio Desktop Workspace", icon: "portfolio", type: "existingWindow", dest: "portfolio", category: "Core" },
      { name: "Projects Explorer", icon: "projects", type: "existingWindow", dest: "projects", category: "Work" },
      { name: "Recycle Bin", icon: "recycleBin", type: "existingWindow", dest: "recycleBin", category: "System" },
      { name: "Skills & Tech Stack Grid", icon: "skills", type: "existingWindow", dest: "skills", category: "Skills" },
      { name: "This PC Hardware Specs", icon: "thisPC", type: "existingWindow", dest: "thisPC", category: "System" },
    ];

    (projects || []).forEach((p) => {
      if (!p) return;
      apps.push({
        name: p.title || "Project",
        icon: (p.category || "").includes("UX") ? "paint" : (p.category || "").includes("AI") ? "video" : "projects",
        type: "project",
        dest: p.id || "",
        category: p.category || "Work",
      });
    });

    return apps.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [projects]);

  // Theme styling map
  const getThemeClasses = () => {
    switch (settings.theme) {
      case "acrylicLight":
        return "bg-[#f8fafc]/95 text-slate-900 border-slate-300/80 shadow-slate-900/30";
      case "cyberpunk":
        return "bg-[#050b1a]/95 text-cyan-200 border-[#00f0ff]/50 shadow-[#00f0ff]/20";
      case "pixelRetro":
        return "bg-[#0b1739]/95 text-white border-[#38bdf8] shadow-2xl";
      case "acrylicDark":
      default:
        return "bg-[#0e1f40]/90 text-white border-[#38bdf8]/40 shadow-2xl shadow-black/80";
    }
  };

  const isCenter = settings.layout === "center";

  if (!isOpen) return null;

  return (
    <div
      id="windows11-start-menu"
      className={
        isInlinePreview
          ? `relative w-full max-w-full rounded-2xl border backdrop-blur-2xl ${getThemeClasses()} flex flex-col justify-between overflow-hidden shadow-2xl pointer-events-auto`
          : `fixed bottom-14 z-[70] pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150 ${
              isCenter ? "left-1/2 -translate-x-1/2" : "left-2 sm:left-4"
            } w-[calc(100vw-16px)] sm:w-[580px] md:w-[620px] max-w-[620px] rounded-2xl border backdrop-blur-2xl ${getThemeClasses()} flex flex-col justify-between overflow-hidden shadow-2xl`
      }
      style={{
        height: isInlinePreview ? "540px" : "560px",
        maxHeight: isInlinePreview ? "540px" : "calc(100vh - 80px)",
      }}
      onClick={(e) => {
        e.stopPropagation();
        setIsPowerMenuOpen(false);
      }}
    >
      {/* 1. TOP ACRYLIC HEADER WITH SEARCH BAR */}
      <div className="p-4 sm:p-5 pb-3 border-b border-white/10 space-y-3">
        {settings.showSearchBar && (
          <div className="relative">
            <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={settings.searchPlaceholder || "Type here to search..."}
              className="w-full bg-black/40 hover:bg-black/50 focus:bg-black/60 border border-white/15 focus:border-[#38bdf8] rounded-full pl-10 pr-9 py-2 text-xs sm:text-sm text-white font-mono placeholder:text-white/40 focus:outline-none transition-all shadow-inner"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs cursor-pointer p-0.5"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Header Title (Pinned) */}
        {!searchQuery && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5 font-pixel">
              {isAllAppsView ? (
                <>
                  <button
                    onClick={() => setIsAllAppsView(false)}
                    className="p-1 rounded-md hover:bg-white/10 text-white/80 hover:text-white cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <span className="text-white/40">|</span>
                  <span>All Applications ({allAppsList.length})</span>
                </>
              ) : (
                <span>{settings.headerTitle || "Pinned"}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* 2. BODY CONTENT (PINNED GRID / SEARCH RESULTS / ALL APPS) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 custom-scrollbar">
        {searchQuery ? (
          /* Live Search Results View */
          <div className="space-y-4">
            <div className="text-[11px] text-[#38bdf8] font-bold uppercase tracking-wider font-pixel flex items-center gap-1">
              <Sparkles size={13} />
              <span>Search Results for &quot;{searchQuery}&quot;</span>
            </div>

            {/* Pinned matches */}
            {matchingPinned.length > 0 && (
              <div>
                <span className="text-[10px] text-white/50 uppercase block mb-1.5 font-pixel">Apps &amp; System</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchingPinned.map((app, idx) => (
                    <div
                      key={`${app.id}-${idx}`}
                      onClick={() => handleItemClick(app.destinationType, app.destination)}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-[#1d4ed8]/40 border border-white/10 hover:border-[#60a5fa] cursor-pointer transition-all group"
                    >
                      {renderAppIcon(app.iconImage, 28)}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white group-hover:text-[#38bdf8] block truncate">
                          {app.name}
                        </span>
                        <span className="text-[10px] text-white/50">{app.category || "App"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project matches */}
            {matchingProjects.length > 0 && (
              <div>
                <span className="text-[10px] text-[#34d399] uppercase block mb-1.5 font-pixel">Projects</span>
                <div className="grid grid-cols-1 gap-2">
                  {matchingProjects.map((p, idx) => (
                    <div
                      key={`${p.id}-${idx}`}
                      onClick={() => handleItemClick("project", p.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-[#10b981]/30 border border-white/10 hover:border-[#34d399] cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PixelFolderIcon size={24} />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-emerald-300 block truncate">
                            {p.title}
                          </span>
                          <span className="text-[10px] text-white/60 line-clamp-1">{p.shortDescription}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-black/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                        {p.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill matches */}
            {matchingSkills.length > 0 && (
              <div>
                <span className="text-[10px] text-[#c084fc] uppercase block mb-1.5 font-pixel">Skills &amp; Technologies</span>
                <div className="flex flex-wrap gap-1.5">
                  {matchingSkills.map((s, idx) => (
                    <button
                      key={`${s.id}-${idx}`}
                      onClick={() => {
                        onClose();
                        onOpenWindow("skills");
                      }}
                      className="bg-purple-950/60 border border-purple-500/40 hover:border-purple-400 px-2.5 py-1 rounded-lg text-xs text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>⚡ {s.name}</span>
                      <span className="text-[10px] text-purple-300 font-bold">{s.experience || ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchingPinned.length === 0 && matchingProjects.length === 0 && matchingSkills.length === 0 && (
              <div className="text-center py-10 text-white/60 space-y-2 font-pixel">
                <span className="text-2xl">🔍</span>
                <p className="text-xs">No matching apps, projects, or skills found.</p>
                <p className="text-[10px] text-white/40">Try searching for &quot;UX&quot;, &quot;Video&quot;, &quot;Drive&quot;, or &quot;About&quot;.</p>
              </div>
            )}
          </div>
        ) : isAllAppsView ? (
          /* All Apps Alphabetical View */
          <div className="space-y-2">
            {allAppsList.map((app, idx) => (
              <div
                key={`${app.name}-${idx}`}
                onClick={() => handleItemClick(app.type, app.dest)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/15 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  {renderAppIcon(app.icon, 28)}
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-[#38bdf8] block">
                      {app.name}
                    </span>
                    <span className="text-[10px] text-white/50">{app.category}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-white/30 group-hover:text-white" />
              </div>
            ))}
          </div>
        ) : (
          /* Default Windows 11 Pinned + Recommended View */
          <>
            {/* 1. Pinned Apps 6-Column Grid */}
            {settings.showPinnedSection && (
              <div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                  {settings.pinnedApps
                    .filter((app) => app.visible !== false)
                    .map((app, idx) => (
                      <button
                        key={`${app.id}-${idx}`}
                        onClick={() => handleItemClick(app.destinationType, app.destination)}
                        className="group relative p-2.5 sm:p-3 rounded-xl hover:bg-white/10 active:bg-white/20 border border-transparent hover:border-white/15 flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer hover:scale-105"
                      >
                        {/* Optional badge */}
                        {app.badge && (
                          <span className="absolute -top-1 -right-1 bg-[#2563eb] text-white text-[8px] font-bold px-1 rounded-full border border-white/20 shadow">
                            {app.badge}
                          </span>
                        )}

                        <div className="transform group-hover:scale-110 transition-transform duration-150">
                          {renderAppIcon(app.iconImage, 32)}
                        </div>

                        <span className="text-[11px] font-medium text-white/90 group-hover:text-white line-clamp-1 leading-tight max-w-[80px]">
                          {app.name}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* 2. Recommended / Recent Section */}
            {settings.showRecommendedSection && (
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white tracking-wide font-pixel flex items-center gap-1.5">
                    <Clock size={13} className="text-[#38bdf8]" />
                    <span>{settings.recommendedSectionTitle || "Recommended"}</span>
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenWindow("projects");
                    }}
                    className="text-[10px] font-bold text-[#38bdf8] hover:text-white flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>More</span>
                    <ChevronRight size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {settings.recommendedItems
                    .filter((item) => item.visible !== false)
                    .map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => handleItemClick(item.destinationType, item.destination)}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 cursor-pointer transition-all group"
                      >
                        <div className="shrink-0">{renderAppIcon(item.iconImage || "projects", 24)}</div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-white group-hover:text-[#38bdf8] block truncate">
                            {item.title}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-white/50">
                            <span className="truncate">{item.subtitle}</span>
                            <span>•</span>
                            <span className="text-[#38bdf8]/80 shrink-0">{item.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. BOTTOM ACRYLIC FOOTER (USER PROFILE + POWER MENU) */}
      <div className="relative p-3 sm:p-4 bg-black/40 border-t border-white/15 flex items-center justify-between">
        {/* User Profile Chip */}
        <button
          onClick={() => {
            onClose();
            onOpenWindow("about");
          }}
          className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group text-left"
          title="Open User Profile"
        >
          {/* Avatar Graphic */}
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#38bdf8] bg-[#0284c7] flex items-center justify-center shrink-0 shadow-md">
            {settings.userAvatarUrl ? (
              <img
                src={settings.userAvatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : settings.userAvatarStyle === "pixelAvatar" ? (
              <PixelAvatar className="w-full h-full" />
            ) : (
              <span className="font-bold text-white text-sm font-pixel">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <span className="font-bold text-xs text-white group-hover:text-[#38bdf8] block truncate leading-tight font-pixel">
              {displayName}
            </span>
            <span className="text-[10px] text-white/60 block truncate leading-tight mt-0.5">
              {displayTagline}
            </span>
          </div>
        </button>

        {/* Windows 11 Power Button */}
        {settings.showPowerButton && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPowerMenuOpen(!isPowerMenuOpen);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/90 border border-white/10 hover:border-red-400/50 transition-all cursor-pointer shadow-md flex items-center justify-center"
              title="Power Options"
            >
              <Power size={16} />
            </button>

            {/* Power Menu Flyout */}
            {isPowerMenuOpen && (
              <div
                className="absolute bottom-12 right-0 w-48 bg-[#0a1738]/95 backdrop-blur-xl border border-[#38bdf8]/60 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 text-xs font-pixel animate-in slide-in-from-bottom-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {settings.showLockOption && (
                  <button
                    onClick={() => {
                      setIsPowerMenuOpen(false);
                      onClose();
                      if (onLockDesktop) onLockDesktop();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-white cursor-pointer transition-colors"
                  >
                    <Lock size={14} className="text-[#38bdf8]" />
                    <span>Lock Desktop</span>
                  </button>
                )}

                {settings.showRestartOption && (
                  <button
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-white cursor-pointer transition-colors"
                  >
                    <RotateCcw size={14} className="text-emerald-400" />
                    <span>Restart OS</span>
                  </button>
                )}

                {settings.showSleepOption && (
                  <button
                    onClick={() => {
                      setIsPowerMenuOpen(false);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-white cursor-pointer transition-colors"
                  >
                    <Moon size={14} className="text-indigo-300" />
                    <span>Sleep Mode</span>
                  </button>
                )}

                {settings.showAdminOption && (
                  <button
                    onClick={() => {
                      setIsPowerMenuOpen(false);
                      onClose();
                      if (onOpenAdmin) onOpenAdmin();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[#1d4ed8]/30 hover:bg-[#1d4ed8]/70 border border-[#38bdf8]/40 flex items-center gap-2.5 text-[#38bdf8] font-bold cursor-pointer transition-colors"
                  >
                    <ShieldAlert size={14} className="text-[#38bdf8]" />
                    <span>Admin Panel</span>
                  </button>
                )}

                <div className="pt-1 border-t border-white/10">
                  <button
                    onClick={() => {
                      setIsPowerMenuOpen(false);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-300 flex items-center gap-2.5 cursor-pointer text-[11px]"
                  >
                    <Power size={12} />
                    <span>Close Start Menu</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
