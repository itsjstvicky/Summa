import React, { useState, useEffect, useCallback, useRef } from "react";
import { PixelWindowsLogo, PixelWindowsPerspectiveLogo, PixelFolderIcon, PixelSkillsIcon, PixelProjectsIcon, PixelContactIcon } from "../PixelIcons";
import { PortfolioInfo, Project, Skill, ContactInfo, ContactMessage, AdminStats, DesktopIcon, TaskbarIcon, Experience } from "../../types";
import { DesktopIconsManager } from "./DesktopIconsManager";
import { TaskbarManager } from "./TaskbarManager";
import { ExperienceManager } from "./ExperienceManager";
import { WallpaperManager } from "./WallpaperManager";
import { GoogleDriveManager } from "./GoogleDriveManager";
import { FaviconManager } from "./FaviconManager";
import { StartMenuManager } from "./StartMenuManager";
import { GoogleDrivePickerModal, SelectedDriveMedia } from "./GoogleDrivePickerModal";
import { BeforeAfterSlider } from "../BeforeAfterSlider";
import { getValidImageUrl } from "../MainWindow";
import { compressImageForDatabase } from "../../utils/imageCompression";
import {
  saveLocalMasterBackup,
  getLocalMasterBackup,
  syncWithServer,
  exportCMSBackupFile,
} from "../../services/persistenceService";
import {
  IS_FIREBASE_CONNECTED,
  syncMasterStateToFirestore,
  fetchMasterStateFromFirestore,
  savePortfolioToFirestore,
  saveContactInfoToFirestore,
  saveProjectsToFirestore,
  deleteProjectFromFirestore,
  deleteAllProjectsFromFirestore,
  saveSkillsToFirestore,
  deleteSkillFromFirestore,
  firebaseConfig,
  fetchMessagesFromFirestore,
  deleteMessageFromFirestore,
} from "../../services/firebaseService";
import { RetroVideoPlayer, ProjectEmbedViewer } from "../ProjectMediaComponents";
import { downloadResumeFile, getResumeOnlineViewUrl } from "../../utils/resumeUtils";
import {
  initAuth,
  uploadFileToDrive,
  getOrCreateAppFolder,
  getDirectDriveMediaUrl,
  syncDatabaseToDrive,
  isUserConnected,
} from "../../services/googleDriveService";
import { smartMergeProjects } from "../../utils/projectUtils";
import { User } from "firebase/auth";

interface AdminDashboardProps {
  token: string;
  username: string;
  onLogout: () => void;
  onNavigateToDesktop?: () => void;
}

type AdminTab =
  | "dashboard"
  | "drive"
  | "favicon"
  | "wallpapers"
  | "projects"
  | "desktop-icons"
  | "taskbar-icons"
  | "start-menu"
  | "experience"
  | "about"
  | "skills"
  | "texts"
  | "contact"
  | "messages"
  | "password";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  username,
  onLogout,
  onNavigateToDesktop,
}) => {
  const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("admin_token") : "") || "admin";
  const initialBackup = getLocalMasterBackup();

  const [currentTab, setCurrentTab] = useState<AdminTab>("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioInfo | null>(initialBackup?.portfolio || null);
  const [projects, setProjects] = useState<Project[]>(initialBackup?.projects || []);
  const [skills, setSkills] = useState<Skill[]>(initialBackup?.skills || []);
  const [desktopIcons, setDesktopIcons] = useState<DesktopIcon[]>(initialBackup?.desktopIcons || []);
  const [taskbarIcons, setTaskbarIcons] = useState<TaskbarIcon[]>(initialBackup?.taskbarIcons || []);
  const [experiences, setExperiences] = useState<Experience[]>(initialBackup?.experiences || []);
  const [contact, setContact] = useState<ContactInfo | null>(initialBackup?.contact || null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Form states for Projects
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Form states for Skills
  const [editingSkill, setEditingSkill] = useState<Partial<Skill> | null>(null);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

  // Admin Username & Security State
  const [currentAdminUser, setCurrentAdminUser] = useState<string>(username || "admin");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [usernameVerifyPassword, setUsernameVerifyPassword] = useState("");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  // Password change state
  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Google Drive cloud storage user
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [driveSessionNeedsRefresh, setDriveSessionNeedsRefresh] = useState(false);

  // Master Data Backup & Cloud Sync Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // In-app Delete Confirmation Modal State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);

  // Global Google Drive Picker Modal state for all upload slots
  const [drivePickerState, setDrivePickerState] = useState<{
    isOpen: boolean;
    title: string;
    allowedTypes: "all" | "images" | "videos" | "images_and_videos" | "documents";
    targetSlotLabel?: string;
    onSelect: (media: SelectedDriveMedia) => void;
  }>({
    isOpen: false,
    title: "Select File from Google Drive",
    allowedTypes: "images_and_videos",
    onSelect: () => {},
  });

  const openDrivePicker = (
    title: string,
    allowedTypes: "all" | "images" | "videos" | "images_and_videos" | "documents",
    onSelect: (media: SelectedDriveMedia) => void,
    targetSlotLabel?: string
  ) => {
    setDrivePickerState({
      isOpen: true,
      title,
      allowedTypes,
      targetSlotLabel,
      onSelect,
    });
  };

  useEffect(() => {
    const unsub = initAuth(
      (u) => {
        setGoogleUser(u);
        setDriveSessionNeedsRefresh(false);
      },
      () => setGoogleUser(null)
    );
    const onNeedsRefresh = () => setDriveSessionNeedsRefresh(true);
    const onConnected = () => setDriveSessionNeedsRefresh(false);
    window.addEventListener("google_drive_token_needs_refresh", onNeedsRefresh);
    window.addEventListener("google_drive_token_expired", onNeedsRefresh);
    window.addEventListener("google_drive_connected", onConnected);
    return () => {
      unsub();
      window.removeEventListener("google_drive_token_needs_refresh", onNeedsRefresh);
      window.removeEventListener("google_drive_token_expired", onNeedsRefresh);
      window.removeEventListener("google_drive_connected", onConnected);
    };
  }, []);

  const handleQuickRefreshDrive = async () => {
    try {
      const { googleSignIn, syncDatabaseToDrive } = await import("../../services/googleDriveService");
      const res = await googleSignIn(undefined, { isRefresh: true });
      if (res?.user) {
        setGoogleUser(res.user as any);
        setDriveSessionNeedsRefresh(false);
        showNotification("Google Drive connection refreshed & synced!", "success");
        syncDatabaseToDrive().catch(() => {});
      }
    } catch (err: any) {
      if (err?.message === "POPUP_BLOCKED") {
        showNotification("Browser blocked the Google popup. Please allow popups.", "error");
      } else {
        showNotification(err.message || "Failed to refresh Google Drive session", "error");
      }
    }
  };

  const notificationTimeoutRef = useRef<any>(null);
  const showNotification = useCallback((msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3500);
  }, []);

  // Fetch all CMS data with individual resilient loaders and offline/local master fallback
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      // Helper for safe fetching without breaking on single failed endpoints
      const safeFetch = async (url: string, options?: RequestInit) => {
        try {
          const res = await fetch(url, options);
          if (res && res.ok) {
            return await res.json();
          }
          return null;
        } catch {
          return null;
        }
      };

      // Load local master backup as baseline fallback
      const localBackup = getLocalMasterBackup();

      const [
        resStats,
        resPort,
        resProj,
        resSkills,
        resCont,
        resMsg,
        resIcons,
        resTaskbar,
        resExp,
        resProfile
      ] = await Promise.all([
        safeFetch("/api/admin/stats", { headers }),
        safeFetch("/api/portfolio"),
        safeFetch("/api/projects", { headers }),
        safeFetch("/api/skills", { headers }),
        safeFetch("/api/contact"),
        safeFetch("/api/messages", { headers }),
        safeFetch("/api/desktop-icons", { headers }),
        safeFetch("/api/taskbar-icons", { headers }),
        safeFetch("/api/experiences"),
        safeFetch("/api/auth/profile", { headers }),
      ]);

      if (resProfile?.username) {
        setCurrentAdminUser(resProfile.username);
      }

      let latestP = resPort || localBackup?.portfolio || portfolio;
      let latestPr = smartMergeProjects(resProj, localBackup?.projects || projects);
      let latestSk = Array.isArray(resSkills) ? resSkills : (localBackup?.skills || skills);
      let latestC = resCont || localBackup?.contact || contact;
      let latestD = Array.isArray(resIcons) ? resIcons : (localBackup?.desktopIcons || desktopIcons);
      let latestT = Array.isArray(resTaskbar) ? resTaskbar : (localBackup?.taskbarIcons || taskbarIcons);
      let latestExp = Array.isArray(resExp) ? resExp : (localBackup?.experiences || experiences);

      let fetchedMessages = Array.isArray(resMsg) ? resMsg : [];
      if (IS_FIREBASE_CONNECTED) {
        try {
          const fsMsgs = await fetchMessagesFromFirestore();
          if (fsMsgs.length > 0 || fetchedMessages.length === 0) {
            fetchedMessages = fsMsgs;
          }
        } catch (e) {}
      }
      setMessages(fetchedMessages);

      if (resStats) {
        setStats({
          ...resStats,
          unreadMessages: fetchedMessages.filter((m: any) => !m.read).length,
          totalMessages: fetchedMessages.length,
        });
      } else {
        setStats({
          totalProjects: latestPr?.length || 0,
          uxUiCount: (latestPr || []).filter((p: any) => p.category === "UX/UI Projects").length,
          aiVideoCount: (latestPr || []).filter((p: any) => p.category === "AI Videos Projects").length,
          videoEditingCount: (latestPr || []).filter((p: any) => p.category === "Video Editing Projects").length,
          skillsCount: latestSk?.length || 0,
          desktopIconsCount: (latestD || []).length,
          taskbarIconsCount: (latestT || []).length,
          experiencesCount: (latestExp || []).length,
          wallpapersCount: 3,
          unreadMessages: fetchedMessages.filter((m: any) => !m.read).length,
          totalMessages: fetchedMessages.length,
          portfolioStatus: "Online & Live"
        });
      }

      if (latestP) setPortfolio(latestP);
      if (Array.isArray(latestPr)) setProjects(latestPr);
      if (Array.isArray(latestSk)) setSkills(latestSk);
      if (latestC) setContact(latestC);

      if (Array.isArray(latestD)) setDesktopIcons(latestD);
      if (Array.isArray(latestT)) setTaskbarIcons(latestT);
      if (Array.isArray(latestExp)) setExperiences(latestExp);

      const masterSnapshot = {
        portfolio: latestP,
        projects: latestPr,
        skills: latestSk,
        contact: latestC,
        desktopIcons: latestD,
        taskbarIcons: latestT,
        experiences: latestExp,
      };
      saveLocalMasterBackup(masterSnapshot);
      try {
        window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: masterSnapshot }));
      } catch {}

      // FIREBASE IS THE SOURCE OF TRUTH if connected, because Cloud Run containers 
      // are stateless and local /api/ endpoints will return stale default data on cold boots.
      if (IS_FIREBASE_CONNECTED) {
        fetchMasterStateFromFirestore().then((fsMaster) => {
          if (fsMaster) {
            if (fsMaster.portfolio && fsMaster.portfolio.name) setPortfolio(fsMaster.portfolio);
            if (Array.isArray(fsMaster.projects) && fsMaster.projects.length > 0) setProjects(fsMaster.projects);
            if (Array.isArray(fsMaster.skills) && fsMaster.skills.length > 0) setSkills(fsMaster.skills);
            if (fsMaster.contact) setContact(fsMaster.contact);
            if (Array.isArray(fsMaster.desktopIcons) && fsMaster.desktopIcons.length > 0) setDesktopIcons(fsMaster.desktopIcons);
            if (Array.isArray(fsMaster.taskbarIcons)) setTaskbarIcons(fsMaster.taskbarIcons);
            if (Array.isArray(fsMaster.experiences) && fsMaster.experiences.length > 0) setExperiences(fsMaster.experiences);
            
            // Re-sync local master backup to reflect true source
            saveLocalMasterBackup(fsMaster);
            // Push true state to local server to fix the stale API data for next reloads
            import("../../services/persistenceService").then(({ syncWithServer }) => {
               syncWithServer(authToken).catch(() => {});
            });
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("Recovered admin data load with cached backup state:", err);
    }
  };

  const handleSubManagerChange = async () => {
    await fetchData();
    if (IS_FIREBASE_CONNECTED) {
      try {
        const local = getLocalMasterBackup();
        if (local) {
          await syncMasterStateToFirestore(local);
        }
      } catch (err) {
        console.warn("Auto-sync to Firestore failed:", err);
      }
    }
  };

  useEffect(() => {
    const initAdmin = async () => {
      await fetchData();
    };
    initAdmin();
  }, [token]);

  // Master Backup Export
  const handleExportFullBackup = async () => {
    try {
      const res = await fetch("/api/admin/export-all", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to generate backup");
      const fullBackup = await res.json();
      exportCMSBackupFile(fullBackup, `vignesh-portfolio-cms-backup-${new Date().toISOString().slice(0, 10)}`);
      showNotification("✨ Complete CMS Backup downloaded successfully!");
    } catch (err: any) {
      showNotification(err.message || "Failed to export backup", "error");
    }
  };

  // Master Backup Import & Restore
  const handleImportFullBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      const res = await fetch("/api/admin/import-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(backupData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to restore backup");
      }

      saveLocalMasterBackup(backupData);
      showNotification("🎉 Complete CMS database restored successfully!", "success");
      fetchData();
      setIsBackupModalOpen(false);
    } catch (err: any) {
      showNotification("Restore error: " + err.message, "error");
    } finally {
      setIsRestoring(false);
      e.target.value = "";
    }
  };

  // Force Master Sync
  const handleForceMasterSync = async () => {
    setIsSyncing(true);
    try {
      const success = await syncWithServer(authToken);
      
      if (success) {
        showNotification("⚡ Master CMS state synced to Server!", "success");
        await fetchData();
      } else {
        showNotification("Sync completed. Server is up to date.", "success");
      }
    } catch (err: any) {
      showNotification("Sync error: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Dedicated Firebase Firestore Sync


  // Directly update, persist, and broadcast custom window logo
  const handleDirectLogoUpdate = async (newLogoUrl: string) => {
    if (!portfolio) return;
    const cleanUrl = (newLogoUrl || "").trim();
    const updated = { ...portfolio, heroLogoImage: cleanUrl };
    setPortfolio(updated);

    try {
      saveLocalMasterBackup({ portfolio: updated });
      try {
        window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: { portfolio: updated } }));
      } catch {}

      if (IS_FIREBASE_CONNECTED) {
        savePortfolioToFirestore(updated).catch((e) => console.warn("Firestore logo sync warning:", e));
        syncMasterStateToFirestore({ portfolio: updated }).catch((e) => console.warn("Firestore master state sync warning:", e));
      }

      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        showNotification(cleanUrl ? "Custom Window Logo updated & saved to live site!" : "Reset to default Windows logo!", "success");
      }
    } catch (err: any) {
      console.warn("Logo update network warning:", err);
      showNotification("Logo updated in session. Click 'Save' to confirm persistence.", "success");
    }
  };

  // Directly update, persist, and broadcast custom window logo size
  const handleDirectLogoSizeUpdate = async (newSize: number) => {
    if (!portfolio) return;
    const clampedSize = Math.max(24, Math.min(300, newSize));
    const updated = { ...portfolio, heroLogoSize: clampedSize };
    setPortfolio(updated);

    try {
      saveLocalMasterBackup({ portfolio: updated });
      try {
        window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: { portfolio: updated } }));
      } catch {}

      if (IS_FIREBASE_CONNECTED) {
        savePortfolioToFirestore(updated).catch((e) => console.warn("Firestore logo size sync warning:", e));
        syncMasterStateToFirestore({ portfolio: updated }).catch((e) => console.warn("Firestore master state sync warning:", e));
      }

      await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(updated),
      });
    } catch (err: any) {
      console.warn("Logo size update network warning:", err);
    }
  };

  // Save Portfolio Bio / General Texts
  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolio) return;
    try {
      saveLocalMasterBackup({ portfolio });
      try {
        window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: { portfolio } }));
      } catch {}

      if (IS_FIREBASE_CONNECTED) {
        savePortfolioToFirestore(portfolio).catch((e) => console.warn("Firestore bio save warning:", e));
        syncMasterStateToFirestore({ portfolio }, true).catch((e) => console.warn("Firestore master sync warning:", e));
      }

      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(portfolio),
      });
      if (!res.ok) throw new Error("Failed to update portfolio info");

      const responseData = await res.json().catch(() => null);
      if (responseData?.portfolio) {
        setPortfolio(responseData.portfolio);
        saveLocalMasterBackup({ portfolio: responseData.portfolio });
        try {
          window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: { portfolio: responseData.portfolio } }));
        } catch {}
      }

      await syncWithServer(authToken);
      if (isUserConnected()) {
        syncDatabaseToDrive().catch(() => {});
      }
      showNotification("Portfolio & Bio updated and synchronized live!", "success");
      await fetchData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Save Contact & Socials
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;
    try {
      saveLocalMasterBackup({ contact });
      try {
        window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: { contact } }));
      } catch {}

      if (IS_FIREBASE_CONNECTED) {
        saveContactInfoToFirestore(contact).catch((e) => console.warn("Firestore contact save warning:", e));
        syncMasterStateToFirestore({ contact }, true).catch((e) => console.warn("Firestore master sync warning:", e));
      }

      const res = await fetch("/api/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(contact),
      });
      if (!res.ok) throw new Error("Failed to update contact info");

      const responseData = await res.json().catch(() => null);
      if (responseData?.contact) {
        setContact(responseData.contact);
        saveLocalMasterBackup({ contact: responseData.contact });
        try {
          window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: { contact: responseData.contact } }));
        } catch {}
      }

      await syncWithServer(authToken);
      if (isUserConnected()) {
        syncDatabaseToDrive().catch(() => {});
      }
      showNotification("Contact links updated and synchronized live!", "success");
      await fetchData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Save or Update Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const finalTitle = (editingProject.title && editingProject.title.trim() !== "") 
      ? editingProject.title.trim() 
      : "Untitled Project";

    const isNew = !editingProject.id;
    const fallbackId = isNew ? `p_${Date.now()}` : editingProject.id;
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    
    const projectPayload: Project = {
      id: fallbackId,
      title: finalTitle,
      category: editingProject.category || "UX/UI Projects",
      shortDescription: editingProject.shortDescription || "",
      summary: editingProject.summary || "",
      aboutProject: editingProject.aboutProject || "",
      fullDescription: editingProject.fullDescription || "",
      thumbnail: editingProject.thumbnail || "",
      caseStudyVideoUrl: editingProject.caseStudyVideoUrl || editingProject.caseStudyUrl || "",
      caseStudyUrl: editingProject.caseStudyUrl || editingProject.caseStudyVideoUrl || "",
      showCaseStudyButton: editingProject.showCaseStudyButton ?? true,
      caseStudyButtonText: editingProject.caseStudyButtonText || "WATCH VIDEO CASE STUDY",
      heroMediaType: editingProject.heroMediaType || "image",
      heroMediaUrl: editingProject.heroMediaUrl || editingProject.videoUrl || "",
      heroMediaEmbedCode: editingProject.heroMediaEmbedCode || editingProject.embedCode || "",
      projectUrl: editingProject.projectUrl || "",
      videoUrl: editingProject.videoUrl || (editingProject.heroMediaType === "video" ? editingProject.heroMediaUrl : ""),
      videoPoster: editingProject.videoPoster || "",
      embedCode: editingProject.embedCode || (editingProject.heroMediaType === "embed" ? editingProject.heroMediaEmbedCode : ""),
      layoutStyle: editingProject.layoutStyle || "default",
      contentAlignment: editingProject.contentAlignment || "left",
      mediaDisplayMode: editingProject.mediaDisplayMode || "all",
      tags: Array.isArray(editingProject.tags) ? editingProject.tags : [],
      date: editingProject.date || new Date().getFullYear().toString(),
      featured: editingProject.featured ?? false,
      visible: editingProject.visible ?? true,
      order: editingProject.order ?? (projects.length + 1),
      accentColor: editingProject.accentColor || "#5460a8",
      bgColor: editingProject.bgColor || "#8ea1d4",
      roles: Array.isArray(editingProject.roles) ? editingProject.roles : [],
      workflow: Array.isArray(editingProject.workflow) ? editingProject.workflow : [],
      impactDescription: editingProject.impactDescription || editingProject.finalVerdict || "",
      finalVerdict: editingProject.finalVerdict || editingProject.impactDescription || "",
      impactMetrics: Array.isArray(editingProject.impactMetrics) ? editingProject.impactMetrics : [],
      outputs: Array.isArray(editingProject.outputs) ? editingProject.outputs : [],
      projectImages: Array.isArray(editingProject.outputs) ? editingProject.outputs : [],
      // Before & After Redesign Comparison fields
      hasBeforeAfter: editingProject.hasBeforeAfter ?? Boolean(editingProject.beforeImageUrl || editingProject.afterImageUrl),
      beforeImageUrl: editingProject.beforeImageUrl || "",
      afterImageUrl: editingProject.afterImageUrl || "",
      beforeLabel: editingProject.beforeLabel || "BEFORE (ORIGINAL)",
      afterLabel: editingProject.afterLabel || "AFTER (REDESIGN)",
      beforeAfterTitle: editingProject.beforeAfterTitle || "",
      beforeAfterDescription: editingProject.beforeAfterDescription || ""
    };

    try {
      const url = isNew ? "/api/projects" : `/api/projects/${editingProject.id}`;
      const method = isNew ? "POST" : "PUT";

      let savedProject: Project = projectPayload;
      let updatedProjectsList: Project[] = [];

      try {
        const res = await fetch(url, {
          method,
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${activeToken}` 
          },
          body: JSON.stringify(projectPayload),
        });

        const resData = await res.json().catch(() => ({}));
        if (res.ok) {
          if (Array.isArray(resData.projects)) {
            updatedProjectsList = resData.projects;
          } else if (resData.project) {
            savedProject = resData.project;
          }
        }
      } catch (fetchErr) {
        console.warn("Server save notice (falling back to local & cloud sync):", fetchErr);
      }

      if (updatedProjectsList.length === 0) {
        const existingIdx = projects.findIndex(p => p.id === savedProject.id);
        if (existingIdx >= 0) {
          updatedProjectsList = projects.map((p, idx) => (p.id === savedProject.id ? savedProject : p));
        } else {
          updatedProjectsList = [savedProject, ...projects.filter(p => p.id !== savedProject.id)];
        }
      }

      // Update Local State & Master Backup
      setProjects(updatedProjectsList);
      saveLocalMasterBackup({ projects: updatedProjectsList });
      
      // Save directly to Firebase Firestore
      if (IS_FIREBASE_CONNECTED) {
        try {
          saveProjectsToFirestore(updatedProjectsList).catch(e => console.warn(e));
          syncMasterStateToFirestore({ projects: updatedProjectsList }).catch(e => console.warn(e));
        } catch (fsErr) {
          console.warn("Firestore sync background notice:", fsErr);
        }
      }
      syncWithServer(activeToken);

      // Auto-sync database to Google Drive if user connected Google Drive
      if (isUserConnected()) {
        syncDatabaseToDrive().then((dRes) => {
          if (dRes.success) {
            console.log("Auto-synced project update to Google Drive");
          }
        }).catch(() => {});
      }

      showNotification(isNew ? "Project created & synced to Live Site!" : "Project updated & synced to Live Site!", "success");
      setIsProjectModalOpen(false);
      setEditingProject(null);
      fetchData();
    } catch (err: any) {
      console.error("handleSaveProject error:", err);
      showNotification("Project saved to local cache & synced", "success");
      setIsProjectModalOpen(false);
      setEditingProject(null);
    }
  };

  // Delete Project Trigger
  const handleDeleteProject = (p: Project) => {
    setProjectToDelete(p);
  };

  // Execute Confirmed Delete Project
  const executeDeleteProject = async (id: string) => {
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json().catch(() => ({}));
      
      const updatedProjectsList = Array.isArray(data.projects)
        ? data.projects
        : projects.filter((p) => p.id !== id);

      setProjects(updatedProjectsList);
      saveLocalMasterBackup({ projects: updatedProjectsList });
      
      if (IS_FIREBASE_CONNECTED) {
        try {
          deleteProjectFromFirestore(id);
          saveProjectsToFirestore(updatedProjectsList).catch(e => console.warn(e));
          syncMasterStateToFirestore({ projects: updatedProjectsList }).catch(e => console.warn(e));
        } catch (fsErr) {
          console.warn("Firestore sync background notice:", fsErr);
        }
      }
      syncWithServer(activeToken);

      if (isUserConnected()) {
        syncDatabaseToDrive().catch(() => {});
      }

      showNotification("Project deleted & synced across Live Site", "success");
      fetchData();
    } catch (err: any) {
      console.warn("Delete project error fallback:", err);
      const updatedProjectsList = projects.filter((p) => p.id !== id);
      setProjects(updatedProjectsList);
      saveLocalMasterBackup({ projects: updatedProjectsList });
      showNotification("Project deleted from local cache", "success");
    } finally {
      setProjectToDelete(null);
    }
  };

  // Clear All Projects (Full Wipe)
  const handleClearAllProjects = async () => {
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch("/api/projects/clear-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to clear all projects");

      setProjects([]);
      saveLocalMasterBackup({ projects: [] });

      if (IS_FIREBASE_CONNECTED) {
        try {
          await deleteAllProjectsFromFirestore();
          await syncMasterStateToFirestore({ projects: [] });
        } catch (fsErr) {
          console.warn("Firestore delete all notice:", fsErr);
        }
      }
      syncWithServer(activeToken);

      showNotification("All projects deleted! Database is completely empty and ready for new design.", "success");
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Failed to clear projects", "error");
    }
  };

  // Duplicate Project
  
  // Move Project (Reorder)
  const handleMoveProject = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === projects.length - 1) return;

    const newProjects = [...projects];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    // Swap
    [newProjects[index], newProjects[targetIndex]] = [newProjects[targetIndex], newProjects[index]];
    
    setProjects(newProjects);
    
    // Sync to DB
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    try {
      const orderedIds = newProjects.map(p => p.id);
      const res = await fetch("/api/projects/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ orderedIds })
      });
      if (!res.ok) throw new Error("Server rejected reorder");
      showNotification("Project order updated on live site!", "success");
    } catch (err: any) {
      showNotification("Failed to reorder: " + err.message, "error");
    }
  };

  const handleDuplicateProject = async (p: Project) => {
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    try {
      const cloneId = `p_${Date.now()}`;
      const clone: Project = {
        ...p,
        id: cloneId,
        title: `${p.title || "Project"} (Copy)`,
      };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify(clone),
      });
      const data = await res.json().catch(() => ({}));
      
      const updatedProjectsList = Array.isArray(data.projects)
        ? data.projects
        : [clone, ...projects];

      setProjects(updatedProjectsList);
      saveLocalMasterBackup({ projects: updatedProjectsList });
      
      if (IS_FIREBASE_CONNECTED) {
        try {
          saveProjectsToFirestore(updatedProjectsList).catch(e => console.warn(e));
          syncMasterStateToFirestore({ projects: updatedProjectsList }).catch(e => console.warn(e));
        } catch (fsErr) {
          console.warn("Firestore sync background notice:", fsErr);
        }
      }
      syncWithServer(activeToken);

      if (isUserConnected()) {
        syncDatabaseToDrive().catch(() => {});
      }

      showNotification("Project duplicated successfully!", "success");
      fetchData();
    } catch (err: any) {
      console.warn("Duplicate fallback:", err);
      const cloneId = `p_${Date.now()}`;
      const clone: Project = {
        ...p,
        id: cloneId,
        title: `${p.title || "Project"} (Copy)`,
      };
      const updated = [clone, ...projects];
      setProjects(updated);
      saveLocalMasterBackup({ projects: updated });
      showNotification("Project duplicated to local cache", "success");
    }
  };

  // Save or Update Skill
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";

    try {
      const isNew = !editingSkill.id;
      const url = isNew ? "/api/skills" : `/api/skills/${editingSkill.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify(editingSkill),
      });

      const resData = await res.json().catch(() => ({}));
      let updatedSkills: Skill[] = [];
      if (isNew) {
        const savedSkill = resData.skill || { ...editingSkill, id: "s_" + Date.now() };
        updatedSkills = [...skills, savedSkill];
      } else {
        const savedSkill = resData.skill || editingSkill;
        updatedSkills = skills.map((s) => (s.id === editingSkill.id ? savedSkill : s));
      }

      setSkills(updatedSkills);
      saveLocalMasterBackup({ skills: updatedSkills });

      if (IS_FIREBASE_CONNECTED) {
        try {
          saveSkillsToFirestore(updatedSkills).catch((e) => console.warn(e));
          syncMasterStateToFirestore({ skills: updatedSkills }).catch((e) => console.warn(e));
        } catch (fsErr) {
          console.warn("Firestore sync error:", fsErr);
        }
      }
      syncWithServer(activeToken);
      if (isUserConnected()) {
        syncDatabaseToDrive().catch(() => {});
      }

      showNotification(isNew ? "Skill created!" : "Skill updated!", "success");
      setIsSkillModalOpen(false);
      setEditingSkill(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Delete Skill Trigger
  const handleDeleteSkill = (skill: Skill) => {
    setSkillToDelete(skill);
  };

  // Execute Confirmed Delete Skill
  const executeDeleteSkill = async (id: string) => {
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      const updatedSkillsList = skills.filter((s) => s.id !== id);
      setSkills(updatedSkillsList);
      saveLocalMasterBackup({ skills: updatedSkillsList });

      if (IS_FIREBASE_CONNECTED) {
        try {
          deleteSkillFromFirestore(id);
          saveSkillsToFirestore(updatedSkillsList).catch((e) => console.warn(e));
          syncMasterStateToFirestore({ skills: updatedSkillsList }).catch((e) => console.warn(e));
        } catch (fsErr) {
          console.warn("Firestore sync background notice:", fsErr);
        }
      }
      syncWithServer(activeToken);
      if (isUserConnected()) {
        syncDatabaseToDrive().catch(() => {});
      }

      showNotification("Skill deleted & synced across Live Site", "success");
      fetchData();
    } catch (err: any) {
      console.warn("Delete skill error fallback:", err);
      const updatedSkillsList = skills.filter((s) => s.id !== id);
      setSkills(updatedSkillsList);
      saveLocalMasterBackup({ skills: updatedSkillsList });
      showNotification("Skill deleted from local cache", "success");
    } finally {
      setSkillToDelete(null);
    }
  };

  // Delete Message
  const handleDeleteMessage = async (id: string) => {
    try {
      if (IS_FIREBASE_CONNECTED) {
        await deleteMessageFromFirestore(id).catch(() => {});
      }
      const res = await fetch(`/api/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      showNotification("Message removed");
      fetchData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleDownloadMessages = (period: "all" | "weekly" | "monthly") => {
    let filteredMessages = messages;
    const now = new Date();
    
    if (period === "weekly") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredMessages = messages.filter(m => new Date(m.date) >= oneWeekAgo);
    } else if (period === "monthly") {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredMessages = messages.filter(m => new Date(m.date) >= oneMonthAgo);
    }

    if (filteredMessages.length === 0) {
      showNotification("No messages found for this period.", "error");
      return;
    }

    const headers = ["Date", "Name", "Email", "Message"];
    const csvContent = [
      headers.join(","),
      ...filteredMessages.map(m => {
        const date = new Date(m.date).toLocaleString().replace(/,/g, "");
        const name = `"${String(m.name).replace(/"/g, '""')}"`;
        const email = `"${String(m.email).replace(/"/g, '""')}"`;
        const message = `"${String(m.message).replace(/"/g, '""')}"`;
        return [date, name, email, message].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `portfolio_messages_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Messages downloaded as CSV!", "success");
  };

  // Change Admin Username
  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminUsername.trim();
    if (!clean || clean.length < 3) {
      showNotification("New username must be at least 3 characters", "error");
      return;
    }
    if (!usernameVerifyPassword) {
      showNotification("Please enter current password to verify identity", "error");
      return;
    }
    setIsUpdatingUsername(true);
    try {
      const res = await fetch("/api/auth/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          currentPassword: usernameVerifyPassword,
          newUsername: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update username");
      showNotification(data.message || `Admin username updated to "${clean}"!`, "success");
      setCurrentAdminUser(clean);
      setNewAdminUsername("");
      setUsernameVerifyPassword("");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      showNotification("New password must be at least 6 characters", "error");
      return;
    }
    if (newPass !== confirmPass) {
      showNotification("New passwords do not match", "error");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ currentPassword: currPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      showNotification("Password changed successfully!", "success");
      setCurrPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // High-Speed File & Media Upload helper (Streams binary directly for unlimited file size MP4/images)
  const handleImageUpload = async (file: File, callback: (url: string) => void, subfolder: string = "Projects") => {
    if (googleUser) {
      try {
        showNotification(`Uploading "${file.name}" to Google Drive...`);
        const folder = await getOrCreateAppFolder(`Vignesh UI Portfolio Assets/${subfolder}`);
        const driveFile = await uploadFileToDrive(file, `${Date.now()}_${file.name}`, file.type, folder.id);
        const directUrl = getDirectDriveMediaUrl(driveFile.id);
        callback(directUrl);
        showNotification(`"${file.name}" uploaded to Google Drive & attached!`, "success");
        return;
      } catch (err: any) {
        console.warn("Google Drive upload fallback to server:", err);
        showNotification(`Drive upload fallback (${err.message}). Streaming to server...`, "error");
      }
    }

    // Direct High-Speed Binary Streaming Upload to Server (Supports 100MB, 500MB, 1GB+ files smoothly)
    try {
      const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
      showNotification(`Uploading "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);
      
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload-stream", true);
      xhr.setRequestHeader("Authorization", `Bearer ${activeToken}`);
      xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          if (percent % 25 === 0 || percent === 100) {
            showNotification(`Uploading "${file.name}": ${percent}%`);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.url) {
              callback(data.url);
              showNotification(`"${file.name}" uploaded & attached!`, "success");
              return;
            }
          } catch (parseErr) {
            console.error("Parse error:", parseErr);
          }
        }
        // Fallback to base64 if needed
        fallbackBase64Upload(file, callback);
      };

      xhr.onerror = () => {
        console.warn("Stream upload network error, falling back to base64");
        fallbackBase64Upload(file, callback);
      };

      xhr.send(file);
    } catch (streamErr) {
      console.warn("Stream upload initialization error:", streamErr);
      fallbackBase64Upload(file, callback);
    }
  };

  const fallbackBase64Upload = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const rawData = e.target.result as string;
        try {
          const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${activeToken}`,
            },
            body: JSON.stringify({ mediaBase64: rawData, name: file.name }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.url) {
            callback(data.url);
            showNotification(`"${file.name}" uploaded & attached!`, "success");
            return;
          }
        } catch (serverErr) {
          console.warn("Server file upload notice:", serverErr);
        }
        callback(rawData);
        showNotification(`"${file.name}" attached!`, "success");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#071329] text-white font-pixel flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-gradient-to-r from-[#17468a] via-[#1d529f] to-[#17468a] px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 border-[#1e3a8a] flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <PixelWindowsLogo size={20} />
          <div>
            <h1 className="font-bold text-xs sm:text-base text-white tracking-wider">
              PORTFOLIO CMS CONTROL PANEL
            </h1>
            <span className="text-[9px] sm:text-[10px] text-[#38bdf8]">Admin: {currentAdminUser}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {driveSessionNeedsRefresh && (
            <button
              onClick={handleQuickRefreshDrive}
              className="bg-amber-600 hover:bg-amber-500 border border-amber-300 text-white px-2 sm:px-3 py-1 text-[11px] sm:text-xs rounded font-bold shadow animate-pulse flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Google Drive session needs refresh. Click to renew connection."
            >
              <span>🔄</span>
              <span className="hidden xs:inline">REFRESH DRIVE</span>
            </button>
          )}
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="bg-[#047857] hover:bg-[#059669] border border-[#34d399] text-white px-2 sm:px-3 py-1 text-[11px] sm:text-xs rounded font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Export full backup, restore database, or sync state"
          >
            <span>💾</span>
            <span className="hidden xs:inline">BACKUP & SYNC</span>
          </button>
          {onNavigateToDesktop ? (
            <button
              onClick={onNavigateToDesktop}
              className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-2 sm:px-3 py-1 text-[11px] sm:text-xs rounded font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
            >
              <span>💻</span>
              <span>LIVE DESKTOP</span>
            </button>
          ) : (
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-2 sm:px-3 py-1 text-[11px] sm:text-xs rounded transition-colors whitespace-nowrap"
            >
              VIEW LIVE ↗
            </a>
          )}
          <button
            onClick={onLogout}
            className="bg-[#e11d48] hover:bg-[#f43f5e] border border-[#fda4af] text-white px-2 sm:px-3 py-1 text-[11px] sm:text-xs rounded cursor-pointer whitespace-nowrap"
          >
            LOG OUT
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-14 sm:top-16 right-3 sm:right-4 z-50 p-3 rounded border text-xs shadow-xl animate-in slide-in-from-top-2 max-w-[90vw] ${
            notification.type === "success"
              ? "bg-[#064e3b] border-[#10b981] text-white"
              : "bg-[#881337] border-[#f43f5e] text-white"
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Mobile Horizontal Tabs Bar (Compact on mobile with smooth scrolling) */}
      <div className="block md:hidden bg-[#0a1e42] border-b-2 border-[#1e3a8a] px-2 py-2 overflow-x-auto whitespace-nowrap z-20 sticky top-[49px] shadow-md">
        <div className="flex gap-1.5 items-center">
          {[
            { id: "dashboard", label: "Overview", icon: "📊" },
            { id: "drive", label: "Google Drive Hub", icon: "☁️" },
            { id: "favicon", label: "Favicon & Tab Icon", icon: "🌐" },
            { id: "wallpapers", label: "Wallpaper Library", icon: "🖼️" },
            { id: "projects", label: "Projects", icon: "📁" },
            { id: "desktop-icons", label: "Desktop Shortcuts", icon: "🖥️" },
            { id: "taskbar-icons", label: "Taskbar Icons", icon: "📌" },
            { id: "start-menu", label: "Win 11 Start Menu", icon: "🪟" },
            { id: "experience", label: "Work Exp", icon: "💼" },
            { id: "about", label: "Bio & About", icon: "👤" },
            { id: "skills", label: "Skills", icon: "⚡" },
            { id: "texts", label: "Texts", icon: "📝" },
            { id: "contact", label: "Contact & Links", icon: "✉️" },
            { id: "messages", label: `Inbox (${messages.length})`, icon: "📬" },
            { id: "password", label: "Security", icon: "🔒" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as AdminTab)}
              className={`px-3 py-2 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 min-h-[38px] ${
                currentTab === tab.id
                  ? "bg-[#1d4ed8] border border-[#60a5fa] text-white font-bold shadow-sm"
                  : "bg-[#0f2854] text-white/80 hover:bg-[#133066] border border-[#1e3a8a]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Admin Body: Sidebar Tabs (Desktop) + Workspace */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Navigation Tabs (Desktop only) */}
        <aside className="hidden md:block md:w-64 bg-[#0a1e42] border-r-2 border-[#1e3a8a] p-3 space-y-1 md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:overflow-y-auto flex-shrink-0">
          <span className="text-[10px] text-white/50 uppercase tracking-wider block px-2 py-1">
            MANAGEMENT MODULES
          </span>

          {[
            { id: "dashboard", label: "Dashboard Overview", icon: "📊" },
            { id: "drive", label: "Google Drive Cloud Hub", icon: "☁️" },
            { id: "favicon", label: "Favicon & Tab Branding", icon: "🌐" },
            { id: "wallpapers", label: "Wallpaper Library (24 Slots)", icon: "🖼️" },
            { id: "projects", label: "Projects Manager", icon: "📁" },
            { id: "desktop-icons", label: "Desktop Shortcuts", icon: "🖥️" },
            { id: "taskbar-icons", label: "Taskbar Icons & Pinned Apps", icon: "📌" },
            { id: "start-menu", label: "Windows 11 Start Menu", icon: "🪟" },
            { id: "experience", label: "Work Experience", icon: "💼" },
            { id: "about", label: "Bio & About Profile", icon: "👤" },
            { id: "skills", label: "Skills & Proficiency", icon: "⚡" },
            { id: "texts", label: "General Website Texts", icon: "📝" },
            { id: "contact", label: "Contact & Social Links", icon: "✉️" },
            { id: "messages", label: `Inbox Messages (${messages.length})`, icon: "📬" },
            { id: "password", label: "Admin Security", icon: "🔒" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as AdminTab)}
              className={`w-full text-left px-3 py-2.5 rounded text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                currentTab === tab.id
                  ? "bg-[#1d4ed8] border border-[#60a5fa] text-white font-bold shadow-xs"
                  : "text-white/80 hover:bg-[#133066] hover:text-white border border-transparent"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Right Main Content Area (Fully scrollable with generous mobile bottom padding) */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 bg-[#071329] pb-40 sm:pb-28 md:pb-20 overflow-y-auto">
          {/* TAB 1: DASHBOARD */}
          {currentTab === "dashboard" && stats && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#38bdf8]">SYSTEM OVERVIEW</h2>
                <span className="text-xs bg-[#064e3b] text-[#34d399] border border-[#10b981] px-2.5 py-1 rounded">
                  Status: {stats.portfolioStatus}
                </span>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 rounded-md">
                  <span className="text-xs text-white/60 block">Total Projects</span>
                  <span className="text-2xl font-bold text-[#38bdf8]">{stats.totalProjects}</span>
                </div>
                <div className="bg-[#0f2854] border-2 border-[#0284c7] p-4 rounded-md cursor-pointer hover:border-[#38bdf8]" onClick={() => setCurrentTab("wallpapers")}>
                  <span className="text-xs text-white/60 block">Wallpapers Uploaded</span>
                  <span className="text-2xl font-bold text-[#38bdf8]">
                    {stats.wallpapersCount ?? 0} <span className="text-xs font-normal text-white/50">/ 24</span>
                  </span>
                </div>
                <div className="bg-[#0f2854] border-2 border-[#5460a8] p-4 rounded-md">
                  <span className="text-xs text-white/60 block">UX/UI Projects</span>
                  <span className="text-2xl font-bold text-[#818cf8]">{stats.uxUiCount}</span>
                </div>
                <div className="bg-[#0f2854] border-2 border-[#2e7d5b] p-4 rounded-md cursor-pointer hover:border-[#34d399]" onClick={() => setCurrentTab("desktop-icons")}>
                  <span className="text-xs text-white/60 block">Desktop Shortcuts</span>
                  <span className="text-2xl font-bold text-[#34d399]">{desktopIcons.length}</span>
                </div>
                <div className="bg-[#0f2854] border-2 border-[#0284c7] p-4 rounded-md cursor-pointer hover:border-[#38bdf8]" onClick={() => setCurrentTab("taskbar-icons")}>
                  <span className="text-xs text-white/60 block">Taskbar Pinned Apps</span>
                  <span className="text-2xl font-bold text-[#38bdf8]">{taskbarIcons.length}</span>
                </div>
                <div className="bg-[#0f2854] border-2 border-[#9e3e68] p-4 rounded-md cursor-pointer hover:border-[#f472b6]" onClick={() => setCurrentTab("experience")}>
                  <span className="text-xs text-white/60 block">Work History</span>
                  <span className="text-2xl font-bold text-[#f472b6]">{experiences.length}</span>
                </div>
                <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 rounded-md cursor-pointer hover:border-[#fbbf24]" onClick={() => setCurrentTab("skills")}>
                  <span className="text-xs text-white/60 block">Skills Listed</span>
                  <span className="text-2xl font-bold text-[#fbbf24]">{stats.skillsCount}</span>
                </div>
                <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 rounded-md cursor-pointer hover:border-[#38bdf8]" onClick={() => setCurrentTab("messages")}>
                  <span className="text-xs text-white/60 block">Contact Inquiries</span>
                  <span className="text-2xl font-bold text-[#38bdf8]">{stats.totalMessages}</span>
                </div>
              </div>



              {/* Quick Actions */}
              <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-5 rounded-md space-y-3">
                <span className="font-bold text-sm text-[#38bdf8] block">QUICK ACTIONS</span>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setCurrentTab("wallpapers")}
                    className="bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#38bdf8] px-4 py-2 text-xs font-bold rounded cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <span>🖼️</span>
                    <span>MANAGE WALLPAPER LIBRARY (24 SLOTS)</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject({
                        title: "",
                        category: "UX/UI Projects",
                        shortDescription: "",
                        fullDescription: "",
                        tags: [],
                        featured: true,
                        visible: true,
                        showCaseStudyButton: true,
                        projectUrl: "",
                      });
                      setIsProjectModalOpen(true);
                      setCurrentTab("projects");
                    }}
                    className="bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] px-4 py-2 text-xs font-bold rounded cursor-pointer"
                  >
                    + ADD NEW PROJECT
                  </button>
                  <button
                    onClick={() => setCurrentTab("favicon")}
                    className="bg-[#0a1e42] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] px-4 py-2 text-xs font-bold rounded cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🌐</span>
                    <span>CUSTOMIZE FAVICON &amp; TAB ICON</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab("desktop-icons")}
                    className="bg-[#0a1e42] hover:bg-[#133066] border border-[#34d399] text-[#34d399] px-4 py-2 text-xs font-bold rounded cursor-pointer"
                  >
                    MANAGE DESKTOP SHORTCUTS
                  </button>
                  <button
                    onClick={() => setCurrentTab("taskbar-icons")}
                    className="bg-[#0a1e42] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] px-4 py-2 text-xs font-bold rounded cursor-pointer"
                  >
                    📌 MANAGE TASKBAR ICONS
                  </button>
                  <button
                    onClick={() => setCurrentTab("experience")}
                    className="bg-[#0a1e42] hover:bg-[#133066] border border-[#f472b6] text-[#f472b6] px-4 py-2 text-xs font-bold rounded cursor-pointer"
                  >
                    MANAGE WORK HISTORY
                  </button>
                  <button
                    onClick={() => setCurrentTab("about")}
                    className="bg-[#0a1e42] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] px-4 py-2 text-xs font-bold rounded cursor-pointer"
                  >
                    EDIT BIO &amp; PROFILE
                  </button>
                  <button
                    onClick={() => setCurrentTab("messages")}
                    className="bg-[#0a1e42] hover:bg-[#133066] border border-[#fbbf24] text-[#fbbf24] px-4 py-2 text-xs font-bold rounded cursor-pointer"
                  >
                    VIEW INBOX ({messages.length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOOGLE DRIVE CLOUD HUB */}
          {currentTab === "drive" && (
            <GoogleDriveManager onNotification={showNotification} />
          )}

          {/* TAB: FAVICON & SITE BRANDING CUSTOMIZER */}
          {currentTab === "favicon" && portfolio && (
            <FaviconManager
              token={authToken}
              portfolio={portfolio}
              onUpdatePortfolio={(updated) => setPortfolio(updated)}
              onNotification={showNotification}
              googleUser={googleUser}
            />
          )}

          {/* TAB: WALLPAPERS MANAGER (24 SLOTS) */}
          {currentTab === "wallpapers" && (
            <WallpaperManager token={authToken} onNotification={showNotification} />
          )}

          {/* TAB 2: PROJECTS MANAGEMENT */}
          {currentTab === "projects" && (
            <div className="space-y-4 font-pixel">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-lg font-bold text-[#38bdf8]">PROJECTS MANAGER</h2>
                <button
                  onClick={() => {
                    setEditingProject({
                      title: "",
                      category: "UX/UI Projects",
                      shortDescription: "",
                      fullDescription: "",
                      tags: [],
                      featured: true,
                      visible: true,
                      showCaseStudyButton: true,
                      projectUrl: "",
                    });
                    setIsProjectModalOpen(true);
                  }}
                  className="bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] text-white px-4 py-2 text-xs font-bold rounded cursor-pointer transition-colors shadow-sm"
                >
                  + CREATE NEW PROJECT
                </button>
              </div>

              {/* Projects Table */}
              <div className="bg-[#081836] border-2 border-[#1e40af] rounded-lg overflow-x-auto shadow-md">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#051126] border-b border-[#1e3a8a] text-[#38bdf8]">
                      <th className="p-3.5 font-bold w-12 text-center">Order</th>
                      <th className="p-3.5 font-bold">Title</th>
                      <th className="p-3.5 font-bold">Category</th>
                      <th className="p-3.5 font-bold">Featured</th>
                      <th className="p-3.5 font-bold">Visible</th>
                      <th className="p-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-white/70">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="text-3xl">📁</span>
                            <span className="font-bold text-sm text-[#38bdf8]">No Projects in Database</span>
                            <span className="text-xs text-white/60">
                              Click "+ CREATE NEW PROJECT" to add your first project.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      projects.map((p, idx) => (
                        <tr key={p.id} className="border-b border-[#1e3a8a]/40 hover:bg-[#0f2854]/50 transition-colors">
                          <td className="p-3.5 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <button 
                                onClick={() => handleMoveProject(idx, "up")} 
                                disabled={idx === 0}
                                className={`text-xs p-1 rounded ${idx === 0 ? "text-white/20 cursor-not-allowed" : "text-[#38bdf8] hover:bg-[#1e40af] cursor-pointer"}`}
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button 
                                onClick={() => handleMoveProject(idx, "down")} 
                                disabled={idx === projects.length - 1}
                                className={`text-xs p-1 rounded ${idx === projects.length - 1 ? "text-white/20 cursor-not-allowed" : "text-[#38bdf8] hover:bg-[#1e40af] cursor-pointer"}`}
                                title="Move Down"
                              >
                                ▼
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-white tracking-wide">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{p.title || "Untitled"}</span>
                              {(p.hasBeforeAfter || (p.beforeImageUrl && p.afterImageUrl)) && (
                                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                                  <span>⚡</span>
                                  <span>Before/After</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-white/90">{p.category || "UX/UI Projects"}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded text-[11px] font-bold inline-block ${
                                p.featured ? "bg-[#166534] text-[#4ade80]" : "bg-[#334155] text-white/60"
                              }`}
                            >
                              {p.featured ? "Featured" : "Standard"}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded text-[11px] font-bold inline-block ${
                                p.visible !== false ? "bg-[#0284c7] text-white" : "bg-[#881337] text-[#fda4af]"
                              }`}
                            >
                              {p.visible !== false ? "Public" : "Hidden"}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingProject({ ...p, outputs: (p.outputs && p.outputs.length > 0) ? p.outputs : (p.projectImages || []) });
                                setIsProjectModalOpen(true);
                              }}
                              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDuplicateProject(p)}
                              className="bg-[#0c4a6e] hover:bg-[#0369a1] text-white px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDeleteProject(p)}
                              className="bg-[#e11d48] hover:bg-[#be123c] text-white px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: DESKTOP SHORTCUTS MANAGER */}
          {currentTab === "desktop-icons" && (
            <DesktopIconsManager
              icons={desktopIcons}
              projects={projects}
              token={authToken}
              onRefresh={handleSubManagerChange}
              onShowNotification={showNotification}
            />
          )}

          {/* TAB: TASKBAR ICONS & PINNED APPS MANAGER */}
          {currentTab === "taskbar-icons" && (
            <TaskbarManager
              icons={taskbarIcons}
              projects={projects}
              token={authToken}
              onRefresh={handleSubManagerChange}
              onShowNotification={showNotification}
            />
          )}

          {/* TAB: WINDOWS 11 START MENU MANAGER */}
          {currentTab === "start-menu" && (
            <StartMenuManager
              projects={projects}
              skills={skills}
              portfolio={portfolio || undefined}
              token={authToken}
              onNotification={showNotification}
              onSaveSuccess={handleSubManagerChange}
            />
          )}

          {/* TAB: WORK EXPERIENCE MANAGER */}
          {currentTab === "experience" && (
            <ExperienceManager
              experiences={experiences}
              token={authToken}
              onRefresh={handleSubManagerChange}
              onShowNotification={showNotification}
            />
          )}

          {/* TAB 3: ABOUT / BIO MANAGEMENT */}
          {currentTab === "about" && portfolio && (
            <form onSubmit={handleSavePortfolio} className="max-w-3xl space-y-4 bg-[#0f2854] border-2 border-[#1e3a8a] p-6 rounded-md">
              <h2 className="text-lg font-bold text-[#38bdf8]">ABOUT &amp; BIO MANAGEMENT</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/80 mb-1">Creator Name</label>
                  <input
                    type="text"
                    value={portfolio.name}
                    onChange={(e) => setPortfolio({ ...portfolio, name: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    value={portfolio.role}
                    onChange={(e) => setPortfolio({ ...portfolio, role: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Short Bio (Homepage)</label>
                <textarea
                  rows={2}
                  value={portfolio.shortBio}
                  onChange={(e) => setPortfolio({ ...portfolio, shortBio: e.target.value })}
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Full Long Bio (About Window)</label>
                <textarea
                  rows={4}
                  value={portfolio.longBio}
                  onChange={(e) => setPortfolio({ ...portfolio, longBio: e.target.value })}
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/80 mb-1">Location Text</label>
                  <input
                    type="text"
                    value={portfolio.locationText}
                    onChange={(e) => setPortfolio({ ...portfolio, locationText: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">Availability Text</label>
                  <input
                    type="text"
                    value={portfolio.availabilityText}
                    onChange={(e) => setPortfolio({ ...portfolio, availabilityText: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/80 mb-1">
                    Portfolio.exe Window Logo (Custom Logo replaces Windows icon)
                  </label>
                  <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleImageUpload(e.target.files[0], (url) => {
                            handleDirectLogoUpdate(url);
                          }, "Branding");
                        }
                      }}
                      className="flex-1 min-w-[180px] bg-[#0a152d] border border-[#1e40af] p-1.5 text-xs text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#1d4ed8] file:text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        openDrivePicker(
                          "Select Brand Logo from Google Drive",
                          "images",
                          (media) => {
                            handleDirectLogoUpdate(media.url);
                          },
                          "Brand Logo"
                        )
                      }
                      className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-2.5 py-1.5 text-xs rounded whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>☁️ Drive</span>
                    </button>
                    {portfolio.heroLogoImage && (
                      <button
                        type="button"
                        onClick={() => handleDirectLogoUpdate("")}
                        className="bg-rose-950/60 hover:bg-rose-900 border border-rose-500 text-rose-300 px-2 py-1.5 text-xs rounded whitespace-nowrap cursor-pointer"
                        title="Reset to Default Windows Logo"
                      >
                        Reset ✕
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Or paste Direct Logo Image URL (PNG / SVG / JPG / Drive link)"
                      value={portfolio.heroLogoImage || ""}
                      onChange={(e) => setPortfolio((prev) => (prev ? { ...prev, heroLogoImage: e.target.value } : null))}
                      className="flex-1 bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleDirectLogoUpdate(portfolio.heroLogoImage || "")}
                      className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 py-1.5 text-xs font-bold rounded cursor-pointer whitespace-nowrap"
                    >
                      💾 Apply Logo
                    </button>
                  </div>
                  {portfolio.heroLogoImage && (
                    <div className="mt-2 flex items-center gap-3 bg-[#0a152d] p-2 rounded border border-[#1e40af]">
                      <img
                        src={getValidImageUrl(portfolio.heroLogoImage)}
                        alt="Logo Preview"
                        className="w-10 h-10 object-contain bg-[#152347] p-1 rounded border border-[#38bdf8]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col">
                        <span className="text-[11px] text-[#38bdf8] font-bold">Active Custom Window Logo</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">✓ Synchronized & Active on Desktop</span>
                      </div>
                    </div>
                  )}

                  {/* LOGO / ICON SIZE CUSTOMIZATION & LIVE PREVIEW */}
                  <div className="mt-3 p-3 bg-[#071126] border border-[#1e40af] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5">
                        <span>📐 Window Logo / Icon Size:</span>
                        <span className="text-white bg-[#1e293b] px-2 py-0.5 rounded border border-[#38bdf8]/40 font-mono text-[11px]">
                          {portfolio.heroLogoSize || 64}px
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDirectLogoSizeUpdate(64)}
                        className="text-[10px] text-white/70 hover:text-white underline cursor-pointer"
                        title="Reset size to default (64px)"
                      >
                        Reset (64px)
                      </button>
                    </div>

                    {/* Range Slider (24px - 300px) */}
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="text-[10px] text-white/60 font-mono">24px</span>
                      <input
                        type="range"
                        min="24"
                        max="300"
                        step="2"
                        value={portfolio.heroLogoSize || 64}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setPortfolio((prev) => (prev ? { ...prev, heroLogoSize: val } : null));
                        }}
                        onMouseUp={(e) => {
                          const val = parseInt((e.target as HTMLInputElement).value, 10);
                          handleDirectLogoSizeUpdate(val);
                        }}
                        onTouchEnd={(e) => {
                          const val = parseInt((e.target as HTMLInputElement).value, 10);
                          handleDirectLogoSizeUpdate(val);
                        }}
                        className="w-full accent-[#38bdf8] cursor-pointer"
                      />
                      <span className="text-[10px] text-white/60 font-mono">300px</span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className="text-[10px] text-white/60 mr-1">Presets:</span>
                      {[
                        { label: "Compact", size: 36 },
                        { label: "Standard", size: 64 },
                        { label: "Large", size: 110 },
                        { label: "XL", size: 160 },
                        { label: "2XL", size: 220 },
                        { label: "Max Hero", size: 300 },
                      ].map((preset) => (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => handleDirectLogoSizeUpdate(preset.size)}
                          className={`px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                            (portfolio.heroLogoSize || 64) === preset.size
                              ? "bg-[#0284c7] text-white border-[#38bdf8] font-bold"
                              : "bg-[#0f172a] text-white/80 border-[#334155] hover:border-[#38bdf8]"
                          }`}
                        >
                          {preset.label} ({preset.size}px)
                        </button>
                      ))}
                    </div>

                    {/* Live Desktop Window Header Simulation / Preview Box */}
                    <div className="border border-[#1e3a8a] bg-[#030712] rounded-md p-2.5 overflow-hidden">
                      <div className="flex items-center justify-between text-[10px] text-white/50 mb-1.5 pb-1 border-b border-[#1e293b]">
                        <span className="font-semibold text-[#93c5fd] flex items-center gap-1">
                          <span>🖥️ Live Scale Preview</span>
                        </span>
                        <span className="font-mono text-[#38bdf8]">
                          Scale: {Math.round(((portfolio.heroLogoSize || 64) / 64) * 100)}% ({portfolio.heroLogoSize || 64}px)
                        </span>
                      </div>
                      <div
                        className="w-full bg-gradient-to-br from-[#0c1a3b] to-[#050b1a] rounded flex items-center justify-center relative p-4 border border-[#1d4ed8]/30 transition-all overflow-auto"
                        style={{
                          minHeight: `${Math.max(120, Math.min(340, (portfolio.heroLogoSize || 64) + 40))}px`,
                        }}
                      >
                        <div className="absolute top-1.5 left-2 text-[9px] text-white/40 font-mono">
                          MainWindow Header (Right Banner)
                        </div>
                        <div
                          className="flex items-center justify-center transition-all duration-150 filter drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)]"
                          style={{
                            height: `${portfolio.heroLogoSize || 64}px`,
                            maxHeight: "310px",
                          }}
                        >
                          {portfolio.heroLogoImage && getValidImageUrl(portfolio.heroLogoImage) ? (
                            <img
                              src={getValidImageUrl(portfolio.heroLogoImage)}
                              alt="Live Logo Scale Preview"
                              className="max-h-full max-w-full object-contain transition-all"
                              style={{
                                height: `${portfolio.heroLogoSize || 64}px`,
                                maxWidth: "100%",
                              }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              style={{
                                height: `${portfolio.heroLogoSize || 64}px`,
                                width: `${Math.round((portfolio.heroLogoSize || 64) * 1.25)}px`,
                              }}
                              className="flex items-center justify-center transition-all"
                            >
                              <PixelWindowsPerspectiveLogo className="w-full h-full filter drop-shadow-md" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">
                    Profile Image / Avatar {googleUser && <span className="text-[10px] text-emerald-400">☁️ Google Drive Sync</span>}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          showNotification("Compressing & saving avatar...");
                          compressImageForDatabase(file, 400).then((base64) => {
                            setPortfolio({ ...portfolio, profileImage: base64 });
                            showNotification("Profile avatar optimized & saved to database!", "success");
                          }).catch(() => {
                            handleImageUpload(file, (url) => {
                              setPortfolio({ ...portfolio, profileImage: url });
                              showNotification("Profile avatar uploaded!");
                            }, "Profile");
                          });
                        }
                      }}
                      className="flex-1 bg-[#0a152d] border border-[#1e40af] p-1.5 text-xs text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#1d4ed8] file:text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        openDrivePicker(
                          "Select Profile Avatar from Google Drive",
                          "images",
                          (media) => {
                            setPortfolio((prev) => (prev ? { ...prev, profileImage: media.url } : null));
                            showNotification("Profile avatar updated from Google Drive!");
                          },
                          "Profile Avatar"
                        )
                      }
                      className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-2.5 py-1.5 text-xs rounded whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>☁️ Google Drive</span>
                    </button>
                  </div>
                  {portfolio.profileImage && (
                    <div className="mt-2 flex items-center gap-3 bg-[#0a152d] p-2 rounded border border-[#1e40af]">
                      <img
                        src={portfolio.profileImage}
                        alt="Avatar Preview"
                        className="w-10 h-10 object-cover rounded border border-[#38bdf8]"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] text-white/80">Active Profile Photo</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1 font-semibold flex items-center justify-between">
                  <span>Resume / CV File or Link (PDF / DOCX)</span>
                  {googleUser && <span className="text-[10px] text-emerald-400 font-normal">☁️ Google Drive Storage</span>}
                </label>
                <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImageUpload(e.target.files[0], (url) => {
                          setPortfolio({ ...portfolio, resumeUrl: url });
                          showNotification("Resume PDF uploaded & attached!");
                        }, "Documents");
                      }
                    }}
                    className="flex-1 min-w-[200px] bg-[#0a152d] border border-[#1e40af] p-1.5 text-xs text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#1d4ed8] file:text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      openDrivePicker(
                        "Select Resume / CV from Google Drive",
                        "documents",
                        (media) => {
                          setPortfolio((prev) => (prev ? { ...prev, resumeUrl: media.url } : null));
                          showNotification("Resume attached from Google Drive!");
                        },
                        "Resume / CV Document"
                      )
                    }
                    className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-2.5 py-1.5 text-xs rounded whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>☁️ Google Drive</span>
                  </button>
                  {portfolio.resumeUrl && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getResumeOnlineViewUrl(portfolio.resumeUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] px-2.5 py-1.5 text-xs rounded whitespace-nowrap flex items-center gap-1 cursor-pointer"
                        title="View Resume Online in New Tab"
                      >
                        <span>View Online ↗</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadResumeFile(portfolio, experiences, skills)}
                        className="bg-[#0284c7] hover:bg-[#0369a1] border border-[#38bdf8] text-white px-2.5 py-1.5 text-xs rounded whitespace-nowrap flex items-center gap-1 cursor-pointer"
                        title="Test Direct Download"
                      >
                        <span>Download 📥</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Or paste Direct Resume PDF URL (Google Drive / Canva / Notion / Dropbox link)"
                    value={portfolio.resumeUrl || ""}
                    onChange={(e) => setPortfolio({ ...portfolio, resumeUrl: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded font-mono text-[11px]"
                  />
                  <p className="text-[11px] text-[#38bdf8]/80 mt-1">
                    💡 Both uploaded PDFs and Google Drive share links (e.g. <code>drive.google.com/file/d/...</code>) are supported for instant online viewing and direct download.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-6 py-3 text-xs font-bold rounded cursor-pointer shadow-lg transition-all"
                >
                  💾 SAVE ABOUT &amp; BIO CHANGES
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SKILLS MANAGEMENT */}
          {currentTab === "skills" && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#38bdf8]">SKILLS &amp; PROFICIENCY</h2>
                <button
                  onClick={() => {
                    setEditingSkill({
                      name: "",
                      category: "Design",
                      experience: "",
                      visible: true,
                    });
                    setIsSkillModalOpen(true);
                  }}
                  className="bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] px-3 sm:px-4 py-2 text-xs font-bold rounded cursor-pointer"
                >
                  + ADD SKILL
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 rounded-md space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-sm">{skill.name}</span>
                        <span className="text-[#38bdf8] font-bold">{skill.experience || ""}</span>
                      </div>
                      <span className="text-[10px] text-white/60 uppercase">{skill.category}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#1e3a8a]">
                      <button
                        onClick={() => {
                          setEditingSkill(skill);
                          setIsSkillModalOpen(true);
                        }}
                        className="bg-[#1d4ed8] px-2.5 py-1 text-xs rounded hover:bg-[#2563eb]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSkill(skill)}
                        className="bg-[#e11d48] px-2.5 py-1 text-xs rounded hover:bg-[#f43f5e]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: GENERAL WEBSITE TEXTS */}
          {currentTab === "texts" && portfolio && (
            <form onSubmit={handleSavePortfolio} className="max-w-3xl space-y-4 bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-md">
              <h2 className="text-lg font-bold text-[#38bdf8]">GENERAL WEBSITE TEXTS</h2>

              <div>
                <label className="block text-xs text-white/80 mb-1 font-bold">Greeting Text ("HI, I'M")</label>
                <input
                  type="text"
                  value={portfolio.greeting}
                  onChange={(e) => setPortfolio({ ...portfolio, greeting: e.target.value })}
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1 font-bold">Bottom Tagline</label>
                <input
                  type="text"
                  value={portfolio.tagline}
                  onChange={(e) => setPortfolio({ ...portfolio, tagline: e.target.value })}
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                />
              </div>

              {/* WEBSITE FAVICON SECTION */}
              <div className="bg-[#0a152d] border-2 border-[#1e40af] p-4 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-[#38bdf8]">
                      WEBSITE FAVICON (BROWSER TAB ICON)
                    </label>
                    <span className="text-[11px] text-white/70">
                      Browser tab-ல் தோன்றும் சிறிய லோகோ (SVG, PNG, ICO)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPortfolio({ ...portfolio, faviconUrl: "/favicon.svg" })}
                    className="bg-[#1e293b] hover:bg-[#334155] border border-[#64748b] text-[10px] text-white/80 px-2.5 py-1 rounded"
                  >
                    Reset to Default SVG
                  </button>
                </div>

                {/* Preview Box */}
                <div className="flex items-center gap-3 bg-[#071022] p-2.5 rounded border border-[#1e3a8a]">
                  <div className="w-8 h-8 rounded bg-[#0b1739] border border-[#38bdf8] flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={portfolio.faviconUrl || "/favicon.svg"}
                      alt="Favicon Preview"
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/favicon.svg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                      <span className="truncate">PORTFOLIO.EXE - Vignesh</span>
                    </div>
                    <span className="text-[10px] text-white/50 block truncate">
                      Active Favicon URL: {portfolio.faviconUrl || "/favicon.svg"}
                    </span>
                  </div>
                </div>

                {/* URL or Upload */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Favicon Image URL or choose file below..."
                      value={portfolio.faviconUrl || ""}
                      onChange={(e) => setPortfolio({ ...portfolio, faviconUrl: e.target.value })}
                      className="flex-1 bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/60 mb-1">
                      Upload Custom Favicon Image (.svg, .png, .ico):
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        accept="image/svg+xml,image/png,image/x-icon,image/jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => {
                              setPortfolio({ ...portfolio, faviconUrl: url });
                            }, "Favicons");
                          }
                        }}
                        className="flex-1 bg-[#071022] border border-[#1e40af] p-1.5 text-xs text-white file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-[#1d4ed8] file:text-white cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          openDrivePicker(
                            "Select Favicon Image from Google Drive",
                            "images",
                            (media) => {
                              setPortfolio((prev) => (prev ? { ...prev, faviconUrl: media.url } : null));
                              showNotification("Favicon set from Google Drive!");
                            },
                            "Favicon Icon"
                          )
                        }
                        className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-2.5 py-1.5 text-xs rounded whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>☁️ Google Drive</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-6 py-3 text-xs font-bold rounded cursor-pointer shadow-lg transition-all"
                >
                  💾 SAVE TEXT SETTINGS
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: CONTACT & SOCIAL LINKS */}
          {currentTab === "contact" && contact && (
            <form onSubmit={handleSaveContact} className="max-w-3xl space-y-4 bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-md">
              <h2 className="text-lg font-bold text-[#38bdf8]">CONTACT &amp; SOCIAL LINKS</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/80 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">Location Details</label>
                  <input
                    type="text"
                    value={contact.location}
                    onChange={(e) => setContact({ ...contact, location: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/80 mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={contact.linkedin}
                    onChange={(e) => setContact({ ...contact, linkedin: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">Instagram URL</label>
                  <input
                    type="text"
                    value={contact.instagram}
                    onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">Behance URL</label>
                  <input
                    type="text"
                    value={contact.behance}
                    onChange={(e) => setContact({ ...contact, behance: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">Dribbble URL</label>
                  <input
                    type="text"
                    value={contact.dribbble}
                    onChange={(e) => setContact({ ...contact, dribbble: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">YouTube URL</label>
                  <input
                    type="text"
                    value={contact.youtube}
                    onChange={(e) => setContact({ ...contact, youtube: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={contact.github}
                    onChange={(e) => setContact({ ...contact, github: e.target.value })}
                    className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-6 py-3 text-xs font-bold rounded cursor-pointer shadow-lg transition-all"
                >
                  💾 SAVE CONTACT LINKS
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: INBOX MESSAGES */}
          {currentTab === "messages" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1e40af]">
                <h2 className="text-lg font-bold text-[#38bdf8]">VISITOR CONTACT MESSAGES ({messages.length})</h2>
                {messages.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDownloadMessages("weekly")}
                      className="bg-[#0f2854] hover:bg-[#1e3a8a] border border-[#38bdf8] text-white text-xs px-3 py-1.5 rounded transition-colors"
                    >
                      Export Weekly
                    </button>
                    <button 
                      onClick={() => handleDownloadMessages("monthly")}
                      className="bg-[#0f2854] hover:bg-[#1e3a8a] border border-[#38bdf8] text-white text-xs px-3 py-1.5 rounded transition-colors"
                    >
                      Export Monthly
                    </button>
                    <button 
                      onClick={() => handleDownloadMessages("all")}
                      className="bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] text-white text-xs px-3 py-1.5 rounded transition-colors"
                    >
                      Export All (CSV)
                    </button>
                  </div>
                )}
              </div>

              {messages.length === 0 ? (
                <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-8 text-center text-white/60 rounded">
                  No messages in your inbox yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 rounded-md space-y-2 relative"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-white text-sm">{m.name}</span>
                          <span className="text-xs text-[#38bdf8] block">{m.email}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-white/50 block">
                            {new Date(m.date).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleDeleteMessage(m.id)}
                            className="bg-[#e11d48] text-white text-[10px] px-2 py-0.5 rounded hover:bg-[#f43f5e] mt-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs bg-[#0a152d] p-3 rounded border border-[#1e40af]">
                        {m.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: PASSWORD & SECURITY */}
          {currentTab === "password" && (
            <div className="max-w-4xl space-y-6">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e40af] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#38bdf8] flex items-center gap-2">
                    <span>🛡️</span>
                    <span>ADMIN SECURITY & CREDENTIALS</span>
                  </h2>
                  <p className="text-xs text-white/70 mt-0.5">
                    Update administrator login username and password for the CMS control panel.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-[#0a152d] border border-[#1e40af] px-3.5 py-2 rounded-lg shadow-inner self-start sm:self-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <div className="text-xs text-white/80 font-mono">
                    <span className="text-white/50 text-[10px] block">ACTIVE LOGIN ID</span>
                    <strong className="text-[#38bdf8] text-sm">@{currentAdminUser}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {/* CARD 1: CHANGE ADMIN USERNAME */}
                <form
                  onSubmit={handleChangeUsername}
                  className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-lg space-y-4 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="border-b border-[#1e40af]/60 pb-2.5">
                      <h3 className="text-sm font-bold text-[#38bdf8] flex items-center gap-2">
                        <span>👤</span>
                        <span>CHANGE ADMIN USERNAME</span>
                      </h3>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Customize your administrator login ID name
                      </p>
                    </div>

                    <div className="bg-[#071329] border border-[#1e40af] p-3 rounded text-xs space-y-1">
                      <span className="text-white/60 block text-[10px]">CURRENT USERNAME</span>
                      <span className="font-bold text-white font-mono text-sm">@{currentAdminUser}</span>
                    </div>

                    <div>
                      <label className="block text-xs text-white/80 mb-1 font-bold">
                        New Admin Username
                      </label>
                      <input
                        type="text"
                        required
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        placeholder="e.g. vignesh_admin"
                        className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none font-mono"
                      />
                      <p className="text-[10px] text-white/50 mt-1">
                        Minimum 3 characters. Letters, numbers, and underscores allowed.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs text-white/80 mb-1 font-bold">
                        Current Password <span className="text-amber-400 text-[10px] font-normal">(Security Verification)</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={usernameVerifyPassword}
                        onChange={(e) => setUsernameVerifyPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1e40af]/40 mt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingUsername}
                      className="w-full bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-4 py-2.5 text-xs font-bold rounded cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>👤</span>
                      <span>{isUpdatingUsername ? "Updating Username..." : "UPDATE USERNAME"}</span>
                    </button>
                  </div>
                </form>

                {/* CARD 2: CHANGE ADMIN PASSWORD */}
                <form
                  onSubmit={handleChangePassword}
                  className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-lg space-y-4 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="border-b border-[#1e40af]/60 pb-2.5">
                      <h3 className="text-sm font-bold text-[#38bdf8] flex items-center gap-2">
                        <span>🔒</span>
                        <span>CHANGE ADMIN PASSWORD</span>
                      </h3>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Set a new password for administrator access
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs text-white/80 mb-1 font-bold">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currPass}
                        onChange={(e) => setCurrPass(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/80 mb-1 font-bold">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/80 mb-1 font-bold">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1e40af]/40 mt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="w-full bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-4 py-2.5 text-xs font-bold rounded cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>🔒</span>
                      <span>{isUpdatingPassword ? "Updating Password..." : "UPDATE PASSWORD"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* CARD 3: SECURITY INFO BANNER */}
              <div className="bg-[#071329] border border-[#1e40af] rounded-lg p-4 text-xs text-white/70 space-y-2">
                <div className="font-bold text-[#38bdf8] flex items-center gap-2">
                  <span>💡</span>
                  <span>Security & Login Details</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-white/80 leading-relaxed">
                  <li>When you update your username or password, the changes take effect immediately on the server database.</li>
                  <li>Use your new username and password on the next sign-in screen at <code className="bg-[#0f2854] text-[#38bdf8] px-1.5 py-0.5 rounded font-mono">/admin</code>.</li>
                  <li>All credentials are verified with cryptographic SHA-256 server-side encryption.</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* PROJECT EDIT / CREATE MODAL */}
      {isProjectModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#08152e] border-2 border-[#1e40af] p-4 sm:p-5 rounded-lg space-y-4 max-h-[92vh] flex flex-col my-auto shadow-2xl font-pixel">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e40af] pb-2 flex-shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-[#38bdf8] tracking-wide">
                EDIT PROJECT &amp; DETAILS
              </h3>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="text-white/60 hover:text-white font-bold text-sm px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              {/* ======================================================= */}
              {/* 1. PROJECT TITLE & CASE STUDY BUTTON (UX/UI) */}
              {/* ======================================================= */}
              <div className="bg-[#051126] border border-[#1e40af] p-3.5 rounded space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-1 border-b border-[#1e40af]">
                  <span className="text-[#38bdf8] font-bold text-xs tracking-wide">
                    1. PROJECT TITLE &amp; CASE STUDY BUTTON (UX/UI)
                  </span>
                  <span className="text-[10px] text-white/50">Top Header Information</span>
                </div>

                {/* Row 1: Title & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/90 font-bold mb-1">
                      Project Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProject.title || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                      placeholder="Project Title"
                      className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded outline-none focus:border-[#38bdf8]"
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 font-bold mb-1">
                      Project Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={editingProject.category || "UX/UI Projects"}
                      onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                      className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded font-bold outline-none focus:border-[#38bdf8]"
                    >
                      <option value="UX/UI Projects">UX/UI Projects (Shows Case Study Button &amp; Gallery)</option>
                      <option value="AI Videos Projects">AI Videos Projects</option>
                      <option value="Video Editing Projects">Video Editing Projects</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Case Study URL & Button Text */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/80 font-bold mb-1">
                      Case Study URL (Figma, Behance, Notion, or Website Link)
                    </label>
                    <input
                      type="text"
                      value={editingProject.caseStudyVideoUrl || editingProject.caseStudyUrl || ""}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          caseStudyVideoUrl: e.target.value,
                          caseStudyUrl: e.target.value,
                        })
                      }
                      placeholder="https://set77.cc/home"
                      className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded font-mono outline-none focus:border-[#38bdf8]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-white/80 font-bold text-xs">
                        Case Study Button Text
                      </label>
                      <label
                        id="btn-case-study-toggle-label"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38bdf8] hover:text-[#7dd3fc] cursor-pointer select-none bg-[#091838] border border-[#1e40af] px-2 py-0.5 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          id="checkbox-show-case-study-button"
                          checked={editingProject.showCaseStudyButton !== false}
                          onChange={(e) =>
                            setEditingProject({
                              ...editingProject,
                              showCaseStudyButton: e.target.checked,
                            })
                          }
                          className="w-3.5 h-3.5 accent-[#38bdf8] rounded cursor-pointer"
                        />
                        <span>Show on Live Site</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={editingProject.caseStudyButtonText || "VIEW CASE STUDY"}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, caseStudyButtonText: e.target.value })
                      }
                      placeholder="VIEW CASE STUDY"
                      disabled={editingProject.showCaseStudyButton === false}
                      className={`w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded outline-none focus:border-[#38bdf8] transition-all ${
                        editingProject.showCaseStudyButton === false ? "opacity-50 cursor-not-allowed bg-[#071124]" : ""
                      }`}
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      {editingProject.showCaseStudyButton === false ? (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <span>⚠️</span> Button is hidden on live site
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <span>✓</span> Button will appear on live site
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Tagline & Year */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/80 font-bold mb-1">Short Tagline / Card Subtitle</label>
                    <input
                      type="text"
                      value={editingProject.shortDescription || ""}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, shortDescription: e.target.value })
                      }
                      placeholder="e.g. End-to-end design system & responsive mobile interface"
                      className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded outline-none focus:border-[#38bdf8]"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 font-bold mb-1">Year / Timeline</label>
                    <input
                      type="text"
                      value={editingProject.date || "2026"}
                      onChange={(e) => setEditingProject({ ...editingProject, date: e.target.value })}
                      placeholder="2026"
                      className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>
              </div>

              {/* ======================================================= */}
              {/* 2. HERO MEDIA & GRID THUMBNAIL */}
              {/* ======================================================= */}
              <div className="bg-[#051126] border border-[#1e40af] p-3.5 rounded space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-1 border-b border-[#1e40af] flex-wrap gap-2">
                  <span className="text-[#38bdf8] font-bold text-xs tracking-wide">
                    2. HERO MEDIA &amp; GRID THUMBNAIL
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-white/90">
                    <span className="font-bold">Media Type:</span>
                    <select
                      value={editingProject.heroMediaType || "video"}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          heroMediaType: e.target.value as any,
                        })
                      }
                      className="bg-[#0a1835] border border-[#1e40af] px-2 py-1 text-white text-xs rounded font-bold outline-none"
                    >
                      <option value="video">🎥 Video (MP4 / YouTube / Drive)</option>
                      <option value="image">🖼️ Image (Static / High-Res)</option>
                      <option value="embed">🌐 Interactive Embed (Figma / Iframe)</option>
                    </select>
                  </div>
                </div>

                {/* Media URL Input */}
                <div className="space-y-1.5">
                  <label className="block text-white/90 font-bold text-xs">
                    Media URL (Direct Image URL, MP4 Video URL, YouTube link, or Google Drive)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={
                        editingProject.heroMediaType === "embed"
                          ? (editingProject.heroMediaEmbedCode || editingProject.embedCode || "")
                          : (editingProject.heroMediaUrl || editingProject.videoUrl || "")
                      }
                      onChange={(e) => {
                        if (editingProject.heroMediaType === "embed") {
                          setEditingProject({
                            ...editingProject,
                            heroMediaEmbedCode: e.target.value,
                            embedCode: e.target.value,
                          });
                        } else {
                          setEditingProject({
                            ...editingProject,
                            heroMediaUrl: e.target.value,
                            videoUrl: editingProject.heroMediaType === "video" ? e.target.value : editingProject.videoUrl,
                          });
                        }
                      }}
                      placeholder="https://... or /uploads/..."
                      className="flex-1 bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded font-mono outline-none focus:border-[#38bdf8]"
                    />
                    <label className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-2 rounded text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5">
                      <span>📁</span>
                      <span>Local File</span>
                      <input
                        type="file"
                        accept={editingProject.heroMediaType === "video" ? "video/*" : "image/*"}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(
                              file,
                              (url) => {
                                setEditingProject((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        heroMediaUrl: url,
                                        videoUrl: prev.heroMediaType === "video" ? url : prev.videoUrl,
                                      }
                                    : null
                                );
                              },
                              "HeroMedia"
                            );
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openDrivePicker(
                          `Select ${editingProject.heroMediaType === "video" ? "Video" : "Media"} from Google Drive`,
                          editingProject.heroMediaType === "video" ? "videos" : "images",
                          (media) => {
                            setEditingProject((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    heroMediaUrl: media.url,
                                    videoUrl: prev.heroMediaType === "video" ? media.url : prev.videoUrl,
                                  }
                                : null
                            );
                            showNotification("Media selected from Drive!");
                          },
                          "Hero Media"
                        )
                      }
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-2 text-xs font-bold rounded cursor-pointer flex items-center gap-1.5"
                    >
                      <span>☁️</span>
                      <span>Drive</span>
                    </button>
                  </div>
                </div>

                {/* Hero Media Preview */}
                <div className="space-y-1.5">
                  <span className="block text-white/80 font-bold text-xs">Hero Media Preview:</span>
                  <div className="bg-[#030b1a] border border-[#1e40af] rounded p-2 flex items-center justify-center min-h-[140px] max-h-[220px] overflow-hidden">
                    {editingProject.heroMediaType === "video" ? (
                      editingProject.heroMediaUrl || editingProject.videoUrl ? (
                        <video
                          src={editingProject.heroMediaUrl || editingProject.videoUrl}
                          controls
                          className="max-h-[200px] w-auto max-w-full rounded"
                        />
                      ) : (
                        <div className="text-white/40 text-xs py-6">No Video Loaded</div>
                      )
                    ) : editingProject.heroMediaType === "embed" ? (
                      editingProject.heroMediaEmbedCode || editingProject.embedCode ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: editingProject.heroMediaEmbedCode || editingProject.embedCode || "",
                          }}
                          className="w-full flex justify-center"
                        />
                      ) : (
                        <div className="text-white/40 text-xs py-6">No Embed Code Entered</div>
                      )
                    ) : (
                      editingProject.heroMediaUrl || editingProject.thumbnail ? (
                        <img
                          src={getValidImageUrl(editingProject.heroMediaUrl || editingProject.thumbnail)}
                          alt="Hero Preview"
                          referrerPolicy="no-referrer"
                          className="max-h-[200px] w-auto max-w-full object-contain rounded"
                        />
                      ) : (
                        <div className="text-white/40 text-xs py-6">No Image Loaded</div>
                      )
                    )}
                  </div>
                </div>

                {/* Grid Thumbnail Image */}
                <div className="space-y-1.5 pt-2 border-t border-[#1e40af]/40">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-white/90 font-bold text-xs">
                      Grid Thumbnail Image (Shown on portfolio home screen)
                    </label>
                    <span className="bg-[#9a3412] text-[#fef08a] px-2 py-0.5 rounded text-[10px] font-bold">
                      Required for Video/Embed projects
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={editingProject.thumbnail || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, thumbnail: e.target.value })}
                      placeholder="https://... or /uploads/..."
                      className="flex-1 bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded font-mono outline-none focus:border-[#38bdf8]"
                    />
                    <label className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-2 rounded text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5">
                      <span>📁</span>
                      <span>Local File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleImageUpload(e.target.files[0], (url) => {
                              setEditingProject({ ...editingProject, thumbnail: url });
                              showNotification("Thumbnail uploaded!");
                            });
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openDrivePicker(
                          "Select Thumbnail from Google Drive",
                          "images",
                          (media) => {
                            setEditingProject((prev) => (prev ? { ...prev, thumbnail: media.url } : null));
                            showNotification("Thumbnail selected from Drive!");
                          },
                          "Thumbnail"
                        )
                      }
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-2 text-xs font-bold rounded cursor-pointer flex items-center gap-1.5"
                    >
                      <span>☁️</span>
                      <span>Drive</span>
                    </button>
                  </div>
                </div>

                {/* Thumbnail Preview */}
                <div className="space-y-1.5">
                  <span className="block text-white/80 font-bold text-xs">Thumbnail Preview:</span>
                  <div className="bg-[#030b1a] border border-[#1e40af] rounded p-2 flex items-center justify-center min-h-[100px] max-h-[160px] overflow-hidden">
                    {editingProject.thumbnail ? (
                      <img
                        src={getValidImageUrl(editingProject.thumbnail)}
                        alt="Thumbnail Preview"
                        referrerPolicy="no-referrer"
                        className="max-h-[140px] w-auto max-w-full object-contain rounded"
                      />
                    ) : (
                      <div className="text-white/40 text-xs py-4">No Thumbnail Loaded</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ======================================================= */}
              {/* 3.5. BEFORE & AFTER REDESIGN COMPARISON (UX/UI SLIDER) */}
              {/* ======================================================= */}
              <div className="bg-[#051126] border-2 border-[#10b981]/60 p-3.5 rounded space-y-3.5 shadow-md">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1e40af] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <div>
                      <span className="text-emerald-400 font-bold text-xs tracking-wide block">
                        BEFORE &amp; AFTER REDESIGN COMPARISON (UX/UI)
                      </span>
                      <p className="text-[11px] text-white/60">
                        Add original website (Before) and redesign (After) images to show an interactive draggable comparison slider on the live site.
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 bg-[#064e3b]/50 border border-emerald-500/50 px-2.5 py-1 rounded cursor-pointer select-none hover:bg-[#064e3b]/80 transition-colors">
                    <input
                      type="checkbox"
                      checked={editingProject.hasBeforeAfter || Boolean(editingProject.beforeImageUrl || editingProject.afterImageUrl)}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          hasBeforeAfter: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span>Enable Comparison Slider</span>
                  </label>
                </div>

                {/* Section Title & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/80 font-bold text-xs mb-1">
                      Section Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingProject.beforeAfterTitle || ""}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, beforeAfterTitle: e.target.value })
                      }
                      placeholder="e.g. WEBSITE REDESIGN: BEFORE VS AFTER"
                      className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 font-bold text-xs mb-1">
                      Brief Note / Redesign Context (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingProject.beforeAfterDescription || ""}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          beforeAfterDescription: e.target.value,
                        })
                      }
                      placeholder="e.g. Modernized visual architecture, improved navigation clarity, and refreshed UI components."
                      className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Before & After Upload Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* BEFORE IMAGE SLOT */}
                  <div className="bg-[#09152b] border border-[#f43f5e]/40 p-3 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
                        <span>📜</span>
                        <span>1. BEFORE IMAGE (Original Design)</span>
                      </span>
                      <span className="text-[10px] text-white/50 uppercase">Left Side</span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-white/70 mb-1">Before Label Badge</label>
                      <input
                        type="text"
                        value={editingProject.beforeLabel || ""}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, beforeLabel: e.target.value })
                        }
                        placeholder="BEFORE (ORIGINAL DESIGN)"
                        className="w-full bg-[#050f22] border border-[#1e40af] p-1.5 text-white text-xs rounded outline-none focus:border-rose-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-white/70 mb-1">Image URL or Local/Drive Upload</label>
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={editingProject.beforeImageUrl || ""}
                          onChange={(e) =>
                            setEditingProject({
                              ...editingProject,
                              beforeImageUrl: e.target.value,
                              hasBeforeAfter: true,
                            })
                          }
                          placeholder="https://... or choose file below"
                          className="flex-1 bg-[#050f22] border border-[#1e40af] p-1.5 text-white text-xs rounded font-mono outline-none focus:border-rose-400"
                        />
                        <label className="bg-[#1d4ed8] hover:bg-[#2563eb] text-white px-2.5 py-1.5 rounded text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1">
                          <span>📁</span>
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(
                                  file,
                                  (url) => {
                                    setEditingProject((prev) =>
                                      prev
                                        ? { ...prev, beforeImageUrl: url, hasBeforeAfter: true }
                                        : null
                                    );
                                    showNotification("Before image uploaded!");
                                  },
                                  "Redesign-Before"
                                );
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            openDrivePicker(
                              "Select Before (Original) Image from Google Drive",
                              "images",
                              (media) => {
                                setEditingProject((prev) =>
                                  prev
                                    ? { ...prev, beforeImageUrl: media.url, hasBeforeAfter: true }
                                    : null
                                );
                                showNotification("Before image selected from Drive!");
                              },
                              "Before Image"
                            )
                          }
                          className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-2.5 py-1.5 text-xs font-bold rounded cursor-pointer flex items-center gap-1"
                        >
                          <span>☁️ Drive</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview slot */}
                    <div className="mt-1 bg-[#030b18] border border-[#1e40af]/60 rounded p-1.5 flex items-center justify-center min-h-[90px] max-h-[140px] overflow-hidden">
                      {editingProject.beforeImageUrl ? (
                        <img
                          src={editingProject.beforeImageUrl}
                          alt="Before Preview"
                          referrerPolicy="no-referrer"
                          className="max-h-[120px] w-auto max-w-full object-contain rounded"
                        />
                      ) : (
                        <span className="text-[11px] text-white/40 italic">No Before image attached</span>
                      )}
                    </div>
                  </div>

                  {/* AFTER IMAGE SLOT */}
                  <div className="bg-[#09152b] border border-emerald-500/40 p-3 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                        <span>✨</span>
                        <span>2. AFTER IMAGE (Redesign)</span>
                      </span>
                      <span className="text-[10px] text-white/50 uppercase">Right Side</span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-white/70 mb-1">After Label Badge</label>
                      <input
                        type="text"
                        value={editingProject.afterLabel || ""}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, afterLabel: e.target.value })
                        }
                        placeholder="AFTER (NEW REDESIGN)"
                        className="w-full bg-[#050f22] border border-[#1e40af] p-1.5 text-white text-xs rounded outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-white/70 mb-1">Image URL or Local/Drive Upload</label>
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={editingProject.afterImageUrl || ""}
                          onChange={(e) =>
                            setEditingProject({
                              ...editingProject,
                              afterImageUrl: e.target.value,
                              hasBeforeAfter: true,
                            })
                          }
                          placeholder="https://... or choose file below"
                          className="flex-1 bg-[#050f22] border border-[#1e40af] p-1.5 text-white text-xs rounded font-mono outline-none focus:border-emerald-400"
                        />
                        <label className="bg-[#059669] hover:bg-[#10b981] text-white px-2.5 py-1.5 rounded text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1">
                          <span>📁</span>
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(
                                  file,
                                  (url) => {
                                    setEditingProject((prev) =>
                                      prev
                                        ? { ...prev, afterImageUrl: url, hasBeforeAfter: true }
                                        : null
                                    );
                                    showNotification("After image uploaded!");
                                  },
                                  "Redesign-After"
                                );
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            openDrivePicker(
                              "Select After (Redesign) Image from Google Drive",
                              "images",
                              (media) => {
                                setEditingProject((prev) =>
                                  prev
                                    ? { ...prev, afterImageUrl: media.url, hasBeforeAfter: true }
                                    : null
                                );
                                showNotification("After image selected from Drive!");
                              },
                              "After Image"
                            )
                          }
                          className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-2.5 py-1.5 text-xs font-bold rounded cursor-pointer flex items-center gap-1"
                        >
                          <span>☁️ Drive</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview slot */}
                    <div className="mt-1 bg-[#030b18] border border-[#1e40af]/60 rounded p-1.5 flex items-center justify-center min-h-[90px] max-h-[140px] overflow-hidden">
                      {editingProject.afterImageUrl ? (
                        <img
                          src={editingProject.afterImageUrl}
                          alt="After Preview"
                          referrerPolicy="no-referrer"
                          className="max-h-[120px] w-auto max-w-full object-contain rounded"
                        />
                      ) : (
                        <span className="text-[11px] text-white/40 italic">No After image attached</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Slider Live Test Preview inside modal */}
                {(editingProject.beforeImageUrl || editingProject.afterImageUrl) && (
                  <div className="pt-2 border-t border-[#1e40af]/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-1">
                        <span>👁️</span>
                        <span>Interactive Live Preview Test (Drag to test how visitors see it):</span>
                      </span>
                      <span className="text-[10px] text-white/60">Live Preview</span>
                    </div>

                    <BeforeAfterSlider
                      beforeImage={editingProject.beforeImageUrl || ""}
                      afterImage={editingProject.afterImageUrl || ""}
                      beforeLabel={editingProject.beforeLabel || "BEFORE (ORIGINAL)"}
                      afterLabel={editingProject.afterLabel || "AFTER (REDESIGN)"}
                      aspectRatio="aspect-[16/9]"
                    />
                  </div>
                )}
              </div>

              {/* ======================================================= */}
              {/* 3. PROJECT SUMMARY */}
              {/* ======================================================= */}
              <div className="bg-[#051126] border border-[#1e40af] p-3.5 rounded space-y-2 shadow-md">
                <span className="text-[#38bdf8] font-bold text-xs tracking-wide block pb-1 border-b border-[#1e40af]">
                  3. PROJECT SUMMARY
                </span>
                <textarea
                  rows={3}
                  value={editingProject.summary || ""}
                  onChange={(e) => setEditingProject({ ...editingProject, summary: e.target.value })}
                  placeholder="Provide a comprehensive summary of the project goals, audience, and key highlights..."
                  className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded resize-none outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* ======================================================= */}
              {/* 4. PROJECT IMAGES (UX/UI SHOWCASE GALLERY) */}
              {/* ======================================================= */}
              <div className="bg-[#051126] border border-[#1e40af] p-3.5 rounded space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-1 border-b border-[#1e40af] flex-wrap gap-2">
                  <div>
                    <span className="text-[#38bdf8] font-bold text-xs tracking-wide block">
                      4. PROJECT IMAGES (UX/UI SHOWCASE GALLERY)
                    </span>
                    <p className="text-[11px] text-white/60">
                      Showcase high-resolution UI screens, mobile wireframes, and design components.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentOutputs = editingProject.outputs || [];
                      setEditingProject({
                        ...editingProject,
                        outputs: [
                          ...currentOutputs,
                          { type: "image", url: "", title: "", caption: "" },
                        ],
                      });
                    }}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    + Add Image
                  </button>
                </div>

                {(editingProject.outputs || []).length === 0 ? (
                  <div className="text-center py-4 text-xs text-white/50 italic">
                    No showcase images added yet. Click "+ Add Image" to attach UI screens and mockups.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(editingProject.outputs || []).map((out, oIdx) => (
                      <div key={oIdx} className="bg-[#0a1835] border border-[#1e40af] p-3 rounded space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-400">
                            Screen #{oIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newOuts = (editingProject.outputs || []).filter((_, i) => i !== oIdx);
                              setEditingProject({ ...editingProject, outputs: newOuts });
                            }}
                            className="text-[#f43f5e] hover:text-[#fb7185] text-xs font-bold px-1"
                          >
                            ✕ Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={out.title || ""}
                            placeholder="Title (e.g. Dashboard Dark Mode View)"
                            onChange={(e) => {
                              const newOuts = [...(editingProject.outputs || [])];
                              newOuts[oIdx] = { ...newOuts[oIdx], title: e.target.value };
                              setEditingProject({ ...editingProject, outputs: newOuts });
                            }}
                            className="bg-[#051126] border border-[#1e40af] p-1.5 text-white text-xs rounded"
                          />
                          <input
                            type="text"
                            value={out.caption || ""}
                            placeholder="Caption / Screen Description"
                            onChange={(e) => {
                              const newOuts = [...(editingProject.outputs || [])];
                              newOuts[oIdx] = { ...newOuts[oIdx], caption: e.target.value };
                              setEditingProject({ ...editingProject, outputs: newOuts });
                            }}
                            className="bg-[#051126] border border-[#1e40af] p-1.5 text-white text-xs rounded"
                          />
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={out.url || ""}
                            placeholder="https://... Image URL"
                            onChange={(e) => {
                              const newOuts = [...(editingProject.outputs || [])];
                              newOuts[oIdx] = { ...newOuts[oIdx], url: e.target.value };
                              setEditingProject({ ...editingProject, outputs: newOuts });
                            }}
                            className="flex-1 bg-[#051126] border border-[#1e40af] p-1.5 text-white text-xs rounded font-mono"
                          />
                          <label className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer whitespace-nowrap">
                            📁 Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleImageUpload(e.target.files[0], (url) => {
                                    const newOuts = [...(editingProject.outputs || [])];
                                    newOuts[oIdx] = { ...newOuts[oIdx], url };
                                    setEditingProject({ ...editingProject, outputs: newOuts });
                                  }, "Projects");
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              openDrivePicker(
                                `Select Image for Mockup #${oIdx + 1}`,
                                "images",
                                (media) => {
                                  const newOuts = [...(editingProject.outputs || [])];
                                  newOuts[oIdx] = {
                                    ...newOuts[oIdx],
                                    url: media.url,
                                    title: newOuts[oIdx]?.title || media.fileName,
                                  };
                                  setEditingProject({ ...editingProject, outputs: newOuts });
                                  showNotification(`Attached "${media.fileName}" from Google Drive!`);
                                },
                                `Image #${oIdx + 1}`
                              )
                            }
                            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-2.5 py-1.5 rounded text-xs font-bold cursor-pointer"
                          >
                            ☁️ Drive
                          </button>
                        </div>

                        {out.url && (
                          <div className="pt-1">
                            <img
                              src={out.url}
                              alt={out.title || "Preview"}
                              referrerPolicy="no-referrer"
                              className="max-h-32 rounded border border-[#1e40af] object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ======================================================= */}
              {/* 5. MY ROLE IN THIS PROJECT */}
              {/* ======================================================= */}
              <div className="bg-[#051126] border border-[#1e40af] p-3.5 rounded space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-1 border-b border-[#1e40af]">
                  <span className="text-[#38bdf8] font-bold text-xs tracking-wide">
                    5. MY ROLE IN THIS PROJECT
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentRoles = editingProject.roles || [];
                      setEditingProject({ ...editingProject, roles: [...currentRoles, ""] });
                    }}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    + Add Role
                  </button>
                </div>

                <div className="space-y-2">
                  {(editingProject.roles || []).map((role, rIdx) => (
                    <div
                      key={rIdx}
                      className="bg-[#0a1835] border border-[#1e40af] px-3 py-2 rounded flex items-center gap-2.5"
                    >
                      <span className="text-[#38bdf8] font-bold text-xs">✓</span>
                      <input
                        type="text"
                        value={role}
                        placeholder="e.g. User Research & Wireframing"
                        onChange={(e) => {
                          const newRoles = [...(editingProject.roles || [])];
                          newRoles[rIdx] = e.target.value;
                          setEditingProject({ ...editingProject, roles: newRoles });
                        }}
                        className="flex-1 bg-transparent text-white text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newRoles = (editingProject.roles || []).filter((_, i) => i !== rIdx);
                          setEditingProject({ ...editingProject, roles: newRoles });
                        }}
                        className="text-[#f43f5e] hover:text-[#fb7185] text-xs font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ======================================================= */}
              {/* 6. PROJECT WORKFLOW STEPS */}
              {/* ======================================================= */}
              <div className="bg-[#051126] border border-[#1e40af] p-3.5 rounded space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-1 border-b border-[#1e40af]">
                  <span className="text-[#38bdf8] font-bold text-xs tracking-wide">
                    6. PROJECT WORKFLOW STEPS
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentWorkflow = editingProject.workflow || [];
                      setEditingProject({
                        ...editingProject,
                        workflow: [
                          ...currentWorkflow,
                          {
                            title: `${currentWorkflow.length + 1}. NEW STEP`,
                            icon: "idea",
                            description: "",
                          },
                        ],
                      });
                    }}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {(editingProject.workflow || []).map((step, sIdx) => (
                    <div key={sIdx} className="bg-[#0a1835] border border-[#1e40af] p-2.5 rounded space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={step.title}
                          placeholder="1. IDEA & CONCEPT"
                          onChange={(e) => {
                            const newWorkflow = [...(editingProject.workflow || [])];
                            newWorkflow[sIdx] = { ...newWorkflow[sIdx], title: e.target.value };
                            setEditingProject({ ...editingProject, workflow: newWorkflow });
                          }}
                          className="flex-1 bg-[#051126] border border-[#1e40af] p-1.5 text-white text-xs rounded font-bold outline-none focus:border-[#38bdf8]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newWorkflow = (editingProject.workflow || []).filter((_, i) => i !== sIdx);
                            setEditingProject({ ...editingProject, workflow: newWorkflow });
                          }}
                          className="text-[#f43f5e] hover:text-[#fb7185] text-xs font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        value={step.description || ""}
                        placeholder="Short description (e.g. User journeys and high fidelity wireframes)"
                        onChange={(e) => {
                          const newWorkflow = [...(editingProject.workflow || [])];
                          newWorkflow[sIdx] = { ...newWorkflow[sIdx], description: e.target.value };
                          setEditingProject({ ...editingProject, workflow: newWorkflow });
                        }}
                        className="w-full bg-[#051126] border border-[#1e40af] p-1.5 text-white text-xs rounded outline-none focus:border-[#38bdf8]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ======================================================= */}
              {/* 7. FINAL VERDICT & IMPACT */}
              {/* ======================================================= */}
              <div className="bg-[#051126] border border-[#1e40af] p-3.5 rounded space-y-3 shadow-md">
                <div className="pb-1 border-b border-[#1e40af]">
                  <span className="text-[#38bdf8] font-bold text-xs tracking-wide">
                    7. FINAL VERDICT &amp; IMPACT
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-white/90 font-bold text-xs">
                    Final Verdict / Key Takeaway Statement
                  </label>
                  <textarea
                    rows={2}
                    value={editingProject.finalVerdict || editingProject.impactDescription || ""}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        finalVerdict: e.target.value,
                        impactDescription: e.target.value,
                      })
                    }
                    placeholder="Summarize the final project outcome, user validation score, and overall verdict..."
                    className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded resize-none outline-none focus:border-[#38bdf8]"
                  />
                </div>

                {/* Impact Metric Badges */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-white/90 font-bold text-xs">Impact Metric Badges</label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentMetrics = editingProject.impactMetrics || [];
                        setEditingProject({
                          ...editingProject,
                          impactMetrics: [
                            ...currentMetrics,
                            { value: "100%", label: "Metric Label", icon: "chart" },
                          ],
                        });
                      }}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      + Add Metric
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(editingProject.impactMetrics || []).map((m, mIdx) => (
                      <div key={mIdx} className="bg-[#0a1835] border border-[#1e40af] p-2 rounded space-y-1.5 relative">
                        <div className="flex justify-between items-center gap-2">
                          <input
                            type="text"
                            value={m.value}
                            placeholder="85%"
                            onChange={(e) => {
                              const newM = [...(editingProject.impactMetrics || [])];
                              newM[mIdx] = { ...newM[mIdx], value: e.target.value };
                              setEditingProject({ ...editingProject, impactMetrics: newM });
                            }}
                            className="w-full bg-[#051126] border border-[#1e40af] p-1 text-white text-xs rounded font-bold outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newM = (editingProject.impactMetrics || []).filter((_, i) => i !== mIdx);
                              setEditingProject({ ...editingProject, impactMetrics: newM });
                            }}
                            className="text-[#f43f5e] hover:text-[#fb7185] text-xs font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>
                        <input
                          type="text"
                          value={m.label}
                          placeholder="Task Speed Boost"
                          onChange={(e) => {
                            const newM = [...(editingProject.impactMetrics || [])];
                            newM[mIdx] = { ...newM[mIdx], label: e.target.value };
                            setEditingProject({ ...editingProject, impactMetrics: newM });
                          }}
                          className="w-full bg-[#051126] border border-[#1e40af] p-1 text-white text-[11px] rounded outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tech Stack & Tools */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-white/90 font-bold text-xs">
                    Tech Stack &amp; Tools (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={editingProject.tags ? editingProject.tags.join(", ") : ""}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Figma, Design System, Mobile UI"
                    className="w-full bg-[#0a1835] border border-[#1e40af] p-2 text-white text-xs rounded outline-none focus:border-[#38bdf8]"
                  />
                </div>

                {/* Checkboxes Row */}
                <div className="flex gap-4 items-center flex-wrap pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProject.featured ?? false}
                      onChange={(e) => setEditingProject({ ...editingProject, featured: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span>Mark as Featured (Homepage Hero)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProject.visible ?? true}
                      onChange={(e) => setEditingProject({ ...editingProject, visible: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span>Public Visibility</span>
                  </label>
                </div>
              </div>

              {/* SAVE / CANCEL BUTTONS */}
              <div className="sticky bottom-0 bg-[#08152e] pt-3 pb-1 border-t border-[#1e40af] flex justify-end gap-3 z-10">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="bg-[#334155] hover:bg-[#475569] text-white px-5 py-2 text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white px-6 py-2 text-xs font-bold rounded cursor-pointer shadow-lg flex items-center gap-1.5 transition-colors"
                >
                  <span>💾</span>
                  <span>Save Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SKILL EDIT / CREATE MODAL */}
      {isSkillModalOpen && editingSkill && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#0f2854] border-3 border-[#38bdf8] p-4 sm:p-6 rounded-md space-y-4 max-h-[90vh] flex flex-col my-auto shadow-2xl">
            <h3 className="text-base font-bold text-[#38bdf8] flex-shrink-0">
              {editingSkill.id ? "EDIT SKILL" : "ADD NEW SKILL"}
            </h3>

            <form onSubmit={handleSaveSkill} className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div>
                <label className="block text-xs text-white/80 mb-1">Skill Name</label>
                <input
                  type="text"
                  required
                  value={editingSkill.name || ""}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Category</label>
                <input
                  type="text"
                  value={editingSkill.category || "Design"}
                  onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                  placeholder="e.g. Design, AI & Motion, Creative"
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">
                  Years of Experience
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5+ Years"
                  value={editingSkill.experience || ""}
                  onChange={(e) =>
                    setEditingSkill({ ...editingSkill, experience: e.target.value })
                  }
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                />
              </div>

              <div className="sticky bottom-0 bg-[#0f2854] pt-3 pb-1 border-t border-[#1e40af] flex justify-end gap-3 z-10">
                <button
                  type="button"
                  onClick={() => setIsSkillModalOpen(false)}
                  className="bg-[#334155] hover:bg-[#475569] px-4 py-2 text-xs rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white px-5 py-2 text-xs font-bold rounded cursor-pointer shadow-md"
                >
                  💾 Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Backup & Cloud Sync Modal */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#0f2854] border-2 border-[#38bdf8] rounded-lg max-w-lg w-full p-4 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e40af] mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💾</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Database Backup & Cloud Sync Hub</h3>
                  <p className="text-[10px] text-[#38bdf8]">Automatic Dual Persistence & Restore</p>
                </div>
              </div>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="text-white/60 hover:text-white text-lg font-bold px-2 py-0.5 rounded hover:bg-[#1e3a8a] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Banner */}
              <div className="bg-[#071d42] border border-[#10b981]/40 rounded p-3 flex items-start gap-3">
                <span className="text-lg">🛡️</span>
                <div>
                  <div className="font-bold text-xs text-[#10b981]">Real-time Auto-Persistence Active</div>
                  <div className="text-[11px] text-white/80 leading-relaxed mt-0.5">
                    Your wallpaper uploads, custom favicons, bio info, projects, and desktop shortcuts are mirrored both in the server database and persistent browser master storage.
                  </div>
                </div>
              </div>



              {/* Force Master Sync Button */}
              <div className="bg-[#071329] border border-[#1e3a8a] rounded p-3.5 flex flex-col gap-2">
                <div className="font-bold text-xs text-[#38bdf8] flex items-center gap-1.5">
                  <span>⚡</span> Force Cloud & Database Re-Sync
                </div>
                <div className="text-[11px] text-white/70">
                  Instantly writes and locks the current master state into the server database.
                </div>
                <button
                  type="button"
                  onClick={handleForceMasterSync}
                  disabled={isSyncing}
                  className="mt-1 bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-2 cursor-pointer shadow transition-all disabled:opacity-50"
                >
                  {isSyncing ? "Syncing..." : "🔄 Push & Lock Master State to Database"}
                </button>
              </div>

              {/* Download JSON Backup */}
              <div className="bg-[#071329] border border-[#1e3a8a] rounded p-3.5 flex flex-col gap-2">
                <div className="font-bold text-xs text-[#38bdf8] flex items-center gap-1.5">
                  <span>📥</span> Download Full Backup File (.json)
                </div>
                <div className="text-[11px] text-white/70">
                  Export an offline JSON backup containing all 24 wallpapers, favicons, project files, experiences, and icons.
                </div>
                <button
                  type="button"
                  onClick={handleExportFullBackup}
                  className="mt-1 bg-[#047857] hover:bg-[#059669] text-white py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-2 cursor-pointer shadow transition-all"
                >
                  <span>💾</span> Download Complete CMS Backup
                </button>
              </div>

              {/* Restore JSON Backup */}
              <div className="bg-[#071329] border border-[#1e3a8a] rounded p-3.5 flex flex-col gap-2">
                <div className="font-bold text-xs text-[#f59e0b] flex items-center gap-1.5">
                  <span>📤</span> Restore from Backup File (.json)
                </div>
                <div className="text-[11px] text-white/70">
                  Upload a previously downloaded JSON backup file to instantly restore the entire portfolio CMS database.
                </div>
                <label className="mt-1 bg-[#b45309] hover:bg-[#d97706] text-white py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-2 cursor-pointer shadow transition-all">
                  <span>📂</span> {isRestoring ? "Restoring Database..." : "Select & Restore Backup File"}
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFullBackup}
                    disabled={isRestoring}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#1e40af] flex justify-end">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="bg-[#334155] hover:bg-[#475569] px-4 py-1.5 text-xs rounded text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SKILL CONFIRMATION MODAL */}
      {skillToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 font-pixel">
          <div className="w-full max-w-md bg-[#0a152d] border-2 border-[#e11d48] p-5 rounded-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#f43f5e] border-b border-[#e11d48]/40 pb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-sm text-white">DELETE SKILL CONFIRMATION</h3>
            </div>
            
            <p className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to permanently delete skill:
              <br />
              <strong className="text-[#38bdf8] text-sm block mt-1">"{skillToDelete.name || 'Untitled Skill'}"</strong>
            </p>
            
            <div className="bg-[#1e1b4b]/60 border border-[#4338ca]/40 p-2.5 rounded text-[11px] text-white/60">
              This action will remove the skill from the database, live desktop showcase, and cloud synchronization immediately.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSkillToDelete(null)}
                className="bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-white px-4 py-2 text-xs font-bold rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteSkill(skillToDelete.id)}
                className="bg-[#e11d48] hover:bg-[#be123c] active:bg-[#9f1239] text-white px-5 py-2 text-xs font-bold rounded cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 font-pixel">
          <div className="w-full max-w-md bg-[#0a152d] border-2 border-[#e11d48] p-5 rounded-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#f43f5e] border-b border-[#e11d48]/40 pb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-sm text-white">DELETE PROJECT CONFIRMATION</h3>
            </div>
            
            <p className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to permanently delete project:
              <br />
              <strong className="text-[#38bdf8] text-sm block mt-1">"{projectToDelete.title || 'Untitled Project'}"</strong>
            </p>
            
            <div className="bg-[#1e1b4b]/60 border border-[#4338ca]/40 p-2.5 rounded text-[11px] text-white/60">
              This action will remove the project from the database, live desktop showcase, and cloud synchronization immediately.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="bg-[#334155] hover:bg-[#475569] text-white px-4 py-2 text-xs font-bold rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteProject(projectToDelete.id)}
                className="bg-[#e11d48] hover:bg-[#be123c] active:bg-[#9f1239] text-white px-5 py-2 text-xs font-bold rounded cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Google Drive Picker for all Upload Slots */}
      {drivePickerState.isOpen && (
        <GoogleDrivePickerModal
          isOpen={drivePickerState.isOpen}
          title={drivePickerState.title}
          allowedTypes={drivePickerState.allowedTypes}
          targetSlotLabel={drivePickerState.targetSlotLabel}
          onNotification={showNotification}
          onClose={() => setDrivePickerState((prev) => ({ ...prev, isOpen: false }))}
          onSelect={(media) => {
            drivePickerState.onSelect(media);
            setDrivePickerState((prev) => ({ ...prev, isOpen: false }));
          }}
        />
      )}
    </div>
  );
};
