/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PixelWallpaper } from "./components/PixelWallpaper";
import { DesktopIcons } from "./components/DesktopIcons";
import { MainWindow } from "./components/MainWindow";
import { Taskbar } from "./components/Taskbar";
import { Modals, StartMenuPopup, SearchPopup } from "./components/Modals";
import { AdminLogin } from "./components/admin/AdminLogin";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { PortfolioInfo, Project, Skill, ContactInfo, DesktopIcon, Experience, TaskbarSettings, TaskbarIcon, WindowId, OpenWindowItem } from "./types";
import { DEFAULT_TASKBAR_SETTINGS } from "./components/admin/TaskbarManager";
import { getLocalMasterBackup, saveLocalMasterBackup, safeFetchJSON } from "./services/persistenceService";
import {
  fetchPortfolioFromFirestore,
  fetchProjectsFromFirestore,
  fetchSkillsFromFirestore,
  fetchExperiencesFromFirestore,
  fetchContactInfoFromFirestore,
  fetchDesktopIconsFromFirestore,
  fetchTaskbarSettingsFromFirestore,
  fetchTaskbarIconsFromFirestore,
  fetchMasterStateFromFirestore,
  subscribeToMasterStateFromFirestore,
  IS_FIREBASE_CONNECTED,
} from "./services/firebaseService";
import {
  DEFAULT_PORTFOLIO_INFO,
  DEFAULT_PROJECTS,
  DEFAULT_SKILLS,
  DEFAULT_CONTACT,
  DEFAULT_DESKTOP_ICONS,
  DEFAULT_EXPERIENCES,
} from "./data/defaultPortfolioData";
import { smartMergeProjects } from "./utils/projectUtils";

const DEFAULT_TASKBAR_ICONS: TaskbarIcon[] = [
  { id: "tb-1", name: "Portfolio (Task View)", iconImage: "taskview", destinationType: "existingWindow", destination: "portfolio", order: 1, visible: true, openBehavior: "sameWindow" },
  { id: "tb-2", name: "File Explorer (Projects)", iconImage: "explorer", destinationType: "existingWindow", destination: "projects", order: 2, visible: true, openBehavior: "sameWindow" },
  { id: "tb-3", name: "Edge Browser (About Me)", iconImage: "browser", destinationType: "existingWindow", destination: "about", order: 3, visible: true, openBehavior: "sameWindow" },
  { id: "tb-4", name: "Google Drive Cloud Hub", iconImage: "googleDrive", destinationType: "existingWindow", destination: "googleDrive", order: 4, visible: true, openBehavior: "sameWindow" },
  { id: "tb-5", name: "Skills & Apps Grid", iconImage: "appGrid", destinationType: "existingWindow", destination: "skills", order: 5, visible: true, openBehavior: "sameWindow" },
];


const FontSelectorPopup = ({ onSelect }: { onSelect: (font: "retro" | "normal") => void }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c1f44] border-2 border-[#38bdf8] p-6 rounded-md shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
        <h2 className="text-xl sm:text-2xl font-bold text-[#38bdf8] uppercase tracking-wider font-pixel">
          Choose Font
        </h2>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => onSelect("retro")}
            className="w-full bg-[#071329] hover:bg-[#1e40af] border-2 border-[#1e40af] hover:border-[#38bdf8] text-white py-3 px-4 rounded transition-all font-pixel text-sm uppercase"
          >
            Retro Font
          </button>
          <button
            onClick={() => onSelect("normal")}
            className="w-full bg-[#071329] hover:bg-[#1e40af] border-2 border-[#1e40af] hover:border-[#38bdf8] text-white py-3 px-4 rounded transition-all font-montserrat text-sm font-semibold uppercase"
          >
            Normal Font
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // Font Selector State
  const [showFontSelector, setShowFontSelector] = useState<boolean>(true);
  const [fontPref, setFontPref] = useState<"retro" | "normal">(
    () => (localStorage.getItem("fontPref") as "retro" | "normal") || "retro"
  );

  useEffect(() => {
    if (fontPref === "normal") {
      document.body.classList.add("font-montserrat");
      document.body.classList.remove("font-pixel");
    } else {
      document.body.classList.add("font-pixel");
      document.body.classList.remove("font-montserrat");
    }
  }, [fontPref]);

  // Check if current route is /admin via pathname, hash (#admin, #/admin), or query (?admin=true)
  const checkIsAdminRoute = () => {
    if (typeof window === "undefined") return false;
    return (
      window.location.pathname.startsWith("/admin") ||
      window.location.hash === "#admin" ||
      window.location.hash === "#/admin" ||
      new URLSearchParams(window.location.search).get("admin") === "true"
    );
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    return checkIsAdminRoute();
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem("admin_token");
  });
  const [adminUsername, setAdminUsername] = useState<string>("admin");
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const navigateToAdmin = () => {
    try {
      window.history.pushState(null, "", "/admin");
    } catch {}
    setIsAdminRoute(true);
  };

  const navigateToDesktop = () => {
    try {
      window.history.pushState(null, "", "/");
    } catch {}
    setIsAdminRoute(false);
    loadPublicData();
  };

  // Initial Master Backup Cache Check
  const initialMaster = getLocalMasterBackup();

  // Portfolio public state with rich initial fallback
  const [portfolio, setPortfolio] = useState<PortfolioInfo>(() => {
    return initialMaster?.portfolio || DEFAULT_PORTFOLIO_INFO;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    return Array.isArray(initialMaster?.projects) 
      ? initialMaster.projects
      : DEFAULT_PROJECTS;
  });

  const [skills, setSkills] = useState<Skill[]>(() => {
    return Array.isArray(initialMaster?.skills) 
      ? initialMaster.skills
      : DEFAULT_SKILLS;
  });

  const [desktopIcons, setDesktopIcons] = useState<DesktopIcon[]>(() => {
    return Array.isArray(initialMaster?.desktopIcons) 
      ? initialMaster.desktopIcons
      : DEFAULT_DESKTOP_ICONS;
  });

  const [experiences, setExperiences] = useState<Experience[]>(() => {
    return Array.isArray(initialMaster?.experiences) 
      ? initialMaster.experiences
      : DEFAULT_EXPERIENCES;
  });

  const [taskbarSettings, setTaskbarSettings] = useState<TaskbarSettings>(() => {
    return initialMaster?.taskbarSettings || DEFAULT_TASKBAR_SETTINGS;
  });

  const [taskbarIcons, setTaskbarIcons] = useState<TaskbarIcon[]>(() => {
    if (Array.isArray(initialMaster?.taskbarIcons) && initialMaster.taskbarIcons.length > 0) {
      return initialMaster.taskbarIcons;
    }
    try {
      const direct = localStorage.getItem("vignesh_portfolio_taskbar_icons");
      if (direct) {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_TASKBAR_ICONS;
  });

  const [contact, setContact] = useState<ContactInfo>(() => {
    return initialMaster?.contact || DEFAULT_CONTACT;
  });

  // Windows Desktop Multi-Window Management State
  const [openWindows, setOpenWindows] = useState<OpenWindowItem[]>([
    { id: "portfolio", zIndex: 10, isMinimized: false },
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [isDesktopLocked, setIsDesktopLocked] = useState(false);

  // Check URL pathname, hash, and history changes
  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  // Verify Admin Auth if in /admin with proper Bearer token header
  useEffect(() => {
    if (isAdminRoute && adminToken) {
      setIsAuthChecking(true);
      fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
        .then((res) => (res.ok ? res.json() : { authenticated: false }))
        .then((data) => {
          if (data && data.authenticated === false) {
            setAdminToken(null);
            localStorage.removeItem("admin_token");
          }
        })
        .catch((err) => {
          console.warn("Auth verification network error, keeping token:", err);
        })
        .finally(() => {
          setIsAuthChecking(false);
        });
    } else {
      setIsAuthChecking(false);
    }
  }, [isAdminRoute, adminToken]);

  // Immediate favicon hydration from local master persistence
  useEffect(() => {
    try {
      const cachedFavicon = portfolio.faviconUrl || localStorage.getItem("vignesh_portfolio_favicon_backup") || DEFAULT_PORTFOLIO_INFO.faviconUrl;
      if (cachedFavicon) {
        const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement("link");
        link.type = cachedFavicon.endsWith(".svg") || cachedFavicon.startsWith("data:image/svg") ? "image/svg+xml" : "image/x-icon";
        link.rel = "icon";
        link.href = cachedFavicon;
        document.head.appendChild(link);
      }
    } catch {}
  }, [portfolio.faviconUrl]);

  // Fetch Public Data with Resilient Fallback Handling & Firestore Database Sync
  const loadPublicData = async () => {
    try {
      const localMaster = getLocalMasterBackup();

      // 1. First fetch API / Server & Firestore concurrently
      const [portData, projData, skillsData, contData, iconData, expData, tbData, tbIconsData] = await Promise.all([
        safeFetchJSON<PortfolioInfo>("/api/portfolio", portfolio),
        safeFetchJSON<Project[]>("/api/projects", projects),
        safeFetchJSON<Skill[]>("/api/skills", skills),
        safeFetchJSON<ContactInfo>("/api/contact", contact),
        safeFetchJSON<DesktopIcon[]>("/api/desktop-icons", desktopIcons),
        safeFetchJSON<Experience[]>("/api/experiences", experiences),
        safeFetchJSON<TaskbarSettings>("/api/taskbar-settings", taskbarSettings),
        safeFetchJSON<TaskbarIcon[]>("/api/taskbar-icons", taskbarIcons),
      ]);

      let finalPortfolio = portData || localMaster?.portfolio || portfolio;
      let finalProjects = smartMergeProjects(projData, localMaster?.projects || projects);
      let finalSkills = Array.isArray(skillsData) && skillsData.length > 0 ? skillsData : (localMaster?.skills || skills);
      let finalContact = contData || localMaster?.contact || contact;
      let finalIcons = Array.isArray(iconData) && iconData.length > 0 ? iconData : (localMaster?.desktopIcons || desktopIcons);
      let finalExp = Array.isArray(expData) && expData.length > 0 ? expData : (localMaster?.experiences || experiences);
      let finalTb = tbData || localMaster?.taskbarSettings || taskbarSettings;
      let finalTbIcons = Array.isArray(tbIconsData) && tbIconsData.length > 0 ? tbIconsData : (localMaster?.taskbarIcons || taskbarIcons);

      // 2. Check Firestore for Cloud Sync if online and valid (fallback when endpoint returned empty)
      if (IS_FIREBASE_CONNECTED) {
        try {
          const fsMaster = await fetchMasterStateFromFirestore();
          if (fsMaster) {
            if (fsMaster.portfolio && fsMaster.portfolio.name) finalPortfolio = fsMaster.portfolio;
            if (Array.isArray(fsMaster.projects) && fsMaster.projects.length > 0) finalProjects = smartMergeProjects(fsMaster.projects, finalProjects);
            if (Array.isArray(fsMaster.skills) && fsMaster.skills.length > 0) finalSkills = fsMaster.skills;
            if (fsMaster.contact) finalContact = fsMaster.contact;
            if (Array.isArray(fsMaster.desktopIcons) && fsMaster.desktopIcons.length > 0) finalIcons = fsMaster.desktopIcons;
            if (Array.isArray(fsMaster.experiences) && fsMaster.experiences.length > 0) finalExp = fsMaster.experiences;
            if (fsMaster.taskbarSettings) finalTb = fsMaster.taskbarSettings;
            if (Array.isArray(fsMaster.taskbarIcons)) finalTbIcons = fsMaster.taskbarIcons;
          }
        } catch (fsErr) {
          console.warn("Firestore public sync running in offline/cached fallback mode:", fsErr);
        }
      }

      let resolvedTb = finalTb;
      if (finalPortfolio && typeof finalPortfolio === "object") {
        setPortfolio(finalPortfolio);
        if (finalPortfolio.faviconUrl) {
          try { localStorage.setItem("vignesh_portfolio_favicon_backup", finalPortfolio.faviconUrl); } catch (e) {}
        }
      }

      if (Array.isArray(finalProjects) ) {
        setProjects(finalProjects);
      }

      if (Array.isArray(finalSkills) ) {
        setSkills(finalSkills);
      }

      if (finalContact && typeof finalContact === "object") {
        setContact(finalContact);
      }

      if (Array.isArray(finalIcons) ) {
        setDesktopIcons(finalIcons);
      }

      if (Array.isArray(finalExp) ) {
        setExperiences(finalExp);
      }

      if (Array.isArray(finalTbIcons)) {
        setTaskbarIcons(finalTbIcons);
      }

      if (finalTb && typeof finalTb === "object") {
        const sm = finalTb.startMenu || (localMaster?.startMenu);
        resolvedTb = {
          ...finalTb,
          startMenu: sm || finalTb.startMenu,
        };
        setTaskbarSettings((prev) => ({
          ...prev,
          ...resolvedTb,
          startMenu: resolvedTb.startMenu || prev.startMenu,
        }));
      }

      // Save complete consolidated snapshot to local backup
      saveLocalMasterBackup({
        portfolio: finalPortfolio,
        projects: finalProjects,
        skills: finalSkills,
        contact: finalContact,
        desktopIcons: finalIcons,
        experiences: finalExp,
        taskbarSettings: resolvedTb,
        taskbarIcons: finalTbIcons,
      });
    } catch {
      // Fallback is already handled cleanly inside safeFetchJSON
    }
  };

  useEffect(() => {
    loadPublicData();

    // Real-time Firestore subscription to master state
    const unsubscribeFirestore = subscribeToMasterStateFromFirestore((masterState) => {
      if (!masterState) return;
      if (masterState.portfolio && masterState.portfolio.name) {
        setPortfolio(masterState.portfolio);
      }
      if (Array.isArray(masterState.projects) ) {
        setProjects(masterState.projects);
      }
      if (Array.isArray(masterState.skills) ) {
        setSkills(masterState.skills);
      }
      if (masterState.contact) {
        setContact(masterState.contact);
      }
      if (Array.isArray(masterState.desktopIcons) ) {
        setDesktopIcons(masterState.desktopIcons);
      }
      if (Array.isArray(masterState.experiences) ) {
        setExperiences(masterState.experiences);
      }
      if (Array.isArray(masterState.taskbarIcons)) {
        setTaskbarIcons(masterState.taskbarIcons);
      }
      if (masterState.taskbarSettings || masterState.startMenu) {
        const tb = masterState.taskbarSettings || {};
        const sm = tb.startMenu || masterState.startMenu;
        setTaskbarSettings((prev) => ({
          ...prev,
          ...tb,
          startMenu: sm || prev.startMenu,
        }));
      }
    });

    // Dynamically update favicon in document head
    const effectiveFavicon = portfolio.faviconUrl || localStorage.getItem("vignesh_portfolio_favicon_backup");
    if (effectiveFavicon) {
      const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement("link");
      link.type = effectiveFavicon.endsWith(".svg") || effectiveFavicon.startsWith("data:image/svg") ? "image/svg+xml" : "image/x-icon";
      link.rel = "icon";
      link.href = effectiveFavicon;
      document.head.appendChild(link);
    }

    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setTaskbarSettings((prev) => ({
          ...prev,
          ...e.detail,
          startMenu: e.detail.startMenu || prev.startMenu,
        }));
      }
    };

    const handleStartMenuUpdate = (e: any) => {
      if (e.detail) {
        setTaskbarSettings((prev) => ({
          ...prev,
          startMenu: {
            ...(prev.startMenu || {}),
            ...e.detail,
          },
        }));
      }
    };

    const handleTaskbarIconsUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setTaskbarIcons(e.detail);
        saveLocalMasterBackup({ taskbarIcons: e.detail });
        try {
          localStorage.setItem("vignesh_portfolio_taskbar_icons", JSON.stringify(e.detail));
        } catch {}
      } else {
        loadPublicData();
      }
    };

    const handleMasterUpdate = (e: any) => {
      if (e.detail) {
        const d = e.detail;
        if (d.portfolio) setPortfolio(d.portfolio);
        if (Array.isArray(d.projects) ) setProjects(d.projects);
        if (Array.isArray(d.skills) ) setSkills(d.skills);
        if (d.contact) setContact(d.contact);
        if (Array.isArray(d.desktopIcons) ) setDesktopIcons(d.desktopIcons);
        if (Array.isArray(d.experiences) ) setExperiences(d.experiences);
        if (Array.isArray(d.taskbarIcons) ) setTaskbarIcons(d.taskbarIcons);
        if (d.startMenu) {
          setTaskbarSettings((prev) => ({
            ...prev,
            startMenu: {
              ...(prev.startMenu || {}),
              ...d.startMenu,
            },
          }));
        }
        if (d.taskbarSettings) {
          setTaskbarSettings((prev) => ({
            ...prev,
            ...d.taskbarSettings,
            startMenu: d.startMenu || d.taskbarSettings.startMenu || prev.startMenu,
          }));
        }
      } else {
        loadPublicData();
      }
    };

    const handleProjectsUpdate = (e: any) => {
      if (Array.isArray(e.detail)) {
        setProjects(e.detail);
      }
    };

    window.addEventListener("cms_master_updated", handleMasterUpdate);
    window.addEventListener("projects_updated", handleProjectsUpdate);
    window.addEventListener("storage", loadPublicData);
    window.addEventListener("taskbar_settings_updated", handleSettingsUpdate);
    window.addEventListener("taskbar_icons_updated", handleTaskbarIconsUpdate);
    window.addEventListener("start_menu_settings_updated", handleStartMenuUpdate);

    return () => {
      unsubscribeFirestore();
      window.removeEventListener("cms_master_updated", handleMasterUpdate);
      window.removeEventListener("projects_updated", handleProjectsUpdate);
      window.removeEventListener("storage", loadPublicData);
      window.removeEventListener("taskbar_settings_updated", handleSettingsUpdate);
      window.removeEventListener("taskbar_icons_updated", handleTaskbarIconsUpdate);
      window.removeEventListener("start_menu_settings_updated", handleStartMenuUpdate);
    };
  }, [portfolio.faviconUrl]);

  // Multi-window opening: Does NOT close any existing open windows!
  const handleOpenWindow = (id: WindowId, project?: Project, category?: string) => {
    setIsStartMenuOpen(false);
    setIsSearchOpen(false);
    setIsTrayOpen(false);

    if (category) {
      setSelectedCategory(category);
    }

    setOpenWindows((prev) => {
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex || 10), 10);
      const nextZ = maxZ + 5;
      const existingIndex = prev.findIndex((w) => w.id === id);

      if (existingIndex >= 0) {
        // Window is already open: bring to top, unminimize, and update project/category if provided
        return prev.map((w, idx) =>
          idx === existingIndex
            ? {
                ...w,
                zIndex: nextZ,
                isMinimized: false,
                ...(project ? { project } : {}),
                ...(category ? { category } : {}),
              }
            : w
        );
      } else {
        // Open new window on top of everything!
        return [
          ...prev,
          {
            id,
            project,
            category,
            zIndex: nextZ,
            isMinimized: false,
          },
        ];
      }
    });
  };

  // Close specific window
  const handleCloseWindow = (id: WindowId) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== id));
  };

  // Minimize specific window
  const handleMinimizeWindow = (id: WindowId, isMinimized: boolean = true) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized } : w))
    );
  };

  // Focus specific window (bring to top)
  const handleFocusWindow = (id: WindowId) => {
    setOpenWindows((prev) => {
      const target = prev.find((w) => w.id === id);
      if (!target) return prev;
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex || 10), 10);
      if (target.zIndex >= maxZ && prev.filter(w => w.zIndex === maxZ).length === 1) return prev; // Already strictly on top
      return prev.map((w) =>
        w.id === id ? { ...w, zIndex: maxZ + 2 } : w
      );
    });
  };

  // -------------------------------------------------------------
  // RENDER ADMIN BACKEND (Completely isolated at /admin)
  // -------------------------------------------------------------
  if (isAdminRoute) {
    if (isAuthChecking) {
      return (
        <div className="min-h-screen bg-[#071329] flex items-center justify-center text-white font-pixel text-sm">
          Loading Security Authentication...
        </div>
      );
    }

    if (!adminToken) {
      return (
        <AdminLogin
          onLoginSuccess={(token, user) => {
            setAdminToken(token);
            setAdminUsername(user);
          }}
          onNavigateToDesktop={navigateToDesktop}
        />
      );
    }

    return (
      <AdminDashboard
        token={adminToken}
        username={adminUsername}
        onLogout={() => {
          setAdminToken(null);
          localStorage.removeItem("admin_token");
        }}
        onNavigateToDesktop={navigateToDesktop}
      />
    );
  }

  // -------------------------------------------------------------
  // RENDER PUBLIC PORTFOLIO DESKTOP (Pixel-perfect to reference)
  // -------------------------------------------------------------
  return (
    <>
      {showFontSelector && (
        <FontSelectorPopup
          onSelect={(font) => {
            setFontPref(font);
            localStorage.setItem("fontPref", font);
            setShowFontSelector(false);
          }}
        />
      )}
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#071329] flex flex-col justify-between"
      onClick={() => {
        setIsStartMenuOpen(false);
        setIsSearchOpen(false);
        setIsTrayOpen(false);
      }}
    >
      {/* 1. SCENERY & WALLPAPER */}
      <PixelWallpaper />

      {/* 2. DESKTOP ICONS (Left Side) */}
      <DesktopIcons
        icons={desktopIcons}
        onOpenWindow={handleOpenWindow}
        projects={projects}
      />

      {/* 3. MAIN PORTFOLIO WINDOW (Centered) */}
      {openWindows.some((w) => w.id === "portfolio" && !w.isMinimized) && (
        <main
          className="fixed inset-0 pointer-events-none flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 pt-2.5 sm:pt-6 pb-20 sm:pb-16 overflow-y-auto"
          style={{
            zIndex: openWindows.find((w) => w.id === "portfolio")?.zIndex || 10,
          }}
        >
          <div className="w-full flex items-center justify-center pointer-events-none my-0 sm:my-auto shrink-0">
            <MainWindow
              portfolio={portfolio}
              projects={projects}
              onOpenWindow={handleOpenWindow}
              onExploreWork={() => handleOpenWindow("projects")}
              isMinimized={openWindows.find((w) => w.id === "portfolio")?.isMinimized}
              onMinimizeToggle={(min) => handleMinimizeWindow("portfolio", min)}
              onClose={() => handleCloseWindow("portfolio")}
              onFocus={() => handleFocusWindow("portfolio")}
              zIndex={openWindows.find((w) => w.id === "portfolio")?.zIndex || 10}
            />
          </div>
        </main>
      )}

      {/* 4. MODAL WINDOWS (This PC, About, Skills, Projects, Experience, Contact, Recycle Bin, Google Drive, Project Details) */}
      <Modals
        openWindows={openWindows}
        onCloseWindow={handleCloseWindow}
        onMinimizeWindow={handleMinimizeWindow}
        onFocusWindow={handleFocusWindow}
        onOpenWindow={handleOpenWindow}
        portfolio={portfolio}
        projects={projects}
        skills={skills}
        contact={contact}
        experiences={experiences}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 5. START MENU POPUP */}
      <StartMenuPopup
        isOpen={isStartMenuOpen}
        onClose={() => setIsStartMenuOpen(false)}
        onOpenWindow={handleOpenWindow}
        portfolio={portfolio}
        projects={projects}
        skills={skills}
        settingsOverride={taskbarSettings.startMenu}
        onLockDesktop={() => setIsDesktopLocked(true)}
        onOpenAdmin={navigateToAdmin}
      />

      {/* 5.1 WINDOWS 11 LOCK SCREEN OVERLAY */}
      {isDesktopLocked && (
        <div
          className="fixed inset-0 z-[100] backdrop-blur-2xl bg-[#060e22]/90 flex flex-col items-center justify-between p-8 text-white select-none animate-in fade-in duration-300"
          onClick={() => setIsDesktopLocked(false)}
        >
          <div className="text-center pt-16 space-y-2">
            <div className="text-6xl font-bold font-mono tracking-tight text-white/95">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-sm font-medium text-[#38bdf8] font-pixel">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 text-center pb-12">
            <div className="w-20 h-20 rounded-full border-2 border-[#38bdf8] bg-[#0284c7] overflow-hidden flex items-center justify-center shadow-2xl">
              {taskbarSettings.startMenu?.userAvatarUrl ? (
                <img
                  src={taskbarSettings.startMenu.userAvatarUrl}
                  alt={portfolio.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-2xl font-bold font-pixel">
                  {portfolio.name ? portfolio.name.charAt(0) : "V"}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white font-pixel">{portfolio.name || "Vignesh"}</h3>
              <p className="text-xs text-white/60">{portfolio.role || "Digital Creator & Designer"}</p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDesktopLocked(false);
              }}
              className="mt-2 bg-[#2563eb] hover:bg-[#3b82f6] text-white px-6 py-2.5 rounded-full text-xs font-bold font-pixel transition-all shadow-lg hover:scale-105 cursor-pointer flex items-center gap-2"
            >
              <span>🔓 Click to Unlock Desktop</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. SEARCH POPUP */}
      <SearchPopup
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenWindow={handleOpenWindow}
        projects={projects}
        skills={skills}
      />

      {/* 7. SYSTEM TRAY POPUP */}
      {isTrayOpen && (
        <div
          className="fixed bottom-14 right-4 z-50 w-72 bg-[#0e214d]/95 backdrop-blur-md border-2 border-[#38bdf8] rounded-lg shadow-2xl p-4 text-white font-pixel select-none animate-in slide-in-from-bottom-2 duration-150 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center pb-2 border-b border-[#1e40af]">
            <span className="text-xs font-bold text-[#38bdf8]">
              {taskbarSettings.right.trayTitle || "SYSTEM CONTROLS"}
            </span>
            <span className="text-[10px] text-white/70">
              {taskbarSettings.right.traySubtitle || "8-Bit Mode"}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {taskbarSettings.right.showVolume && (
              <>
                <div className="flex justify-between items-center">
                  <span>🔊 Master Volume</span>
                  <span className="text-[#38bdf8]">{taskbarSettings.right.defaultVolume ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue={taskbarSettings.right.defaultVolume ?? 100}
                  className="w-full cursor-pointer"
                />
              </>
            )}

            {taskbarSettings.right.showWifi && (
              <div className="flex justify-between items-center pt-2">
                <span>📶 Wi-Fi Network</span>
                <span className="text-[#34d399] truncate max-w-[150px]">
                  {taskbarSettings.right.wifiLabel || "Connected (Fiber 1Gbps)"}
                </span>
              </div>
            )}

            {taskbarSettings.right.showBattery && (
              <div className="flex justify-between items-center pt-1">
                <span>🔋 Battery Status</span>
                <span className="text-emerald-400">
                  {taskbarSettings.right.batteryPercentage ?? 100}% ({taskbarSettings.right.batteryStatus || "charging"})
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1">
              <span>⚡ Power Plan</span>
              <span className="text-[#fbbf24]">
                {taskbarSettings.right.powerPlanName || "High Performance"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 8. WINDOWS 11 8-BIT TASKBAR */}
      <Taskbar
        onOpenWindow={handleOpenWindow}
        onToggleStartMenu={() => {
          setIsStartMenuOpen((prev) => !prev);
          setIsSearchOpen(false);
          setIsTrayOpen(false);
        }}
        onToggleSearch={() => {
          setIsSearchOpen((prev) => !prev);
          setIsStartMenuOpen(false);
          setIsTrayOpen(false);
        }}
        onToggleTray={() => {
          setIsTrayOpen((prev) => !prev);
          setIsStartMenuOpen(false);
          setIsSearchOpen(false);
        }}
        activeWindows={openWindows.filter((w) => !w.isMinimized).map((w) => w.id)}
        projects={projects}
        taskbarSettingsOverride={taskbarSettings}
        taskbarIconsOverride={taskbarIcons}
      />
    </div>
    </>
  );
}
