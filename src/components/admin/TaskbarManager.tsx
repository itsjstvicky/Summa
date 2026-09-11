import React, { useState, useEffect, useRef } from "react";
import { getValidImageUrl } from "../MainWindow";
import {
  TaskbarIcon,
  TaskbarSettings,
  TaskbarLayoutSettings,
  TaskbarElementPosition,
  Project,
  WindowId,
} from "../../types";
import {
  PixelWindowsLogo,
  PixelFolderIcon,
  PixelGoogleDriveIcon,
  PixelWindowsPerspectiveLogo,
  PixelThisPCIcon,
  PixelProjectsIcon,
  PixelSkillsIcon,
  PixelContactIcon,
  PixelExperienceIcon,
  PixelRecycleBinIcon,
} from "../PixelIcons";
import { GoogleDrivePickerModal } from "./GoogleDrivePickerModal";
import {
  saveLocalMasterBackup,
  syncWithServer,
  getLocalMasterBackup,
} from "../../services/persistenceService";
import {
  saveTaskbarSettingsToFirestore,
  fetchTaskbarSettingsFromFirestore,
  saveTaskbarIconsToFirestore,
  IS_FIREBASE_CONNECTED,
} from "../../services/firebaseService";

interface TaskbarManagerProps {
  icons: TaskbarIcon[];
  projects: Project[];
  token: string;
  onRefresh: () => void;
  onShowNotification: (msg: string, type?: "success" | "error") => void;
}

export const DEFAULT_TASKBAR_SETTINGS: TaskbarSettings = {
  layout: {
    layoutPreset: "win11",
    startButtonPosition: "left",
    searchBarPosition: "left",
    weatherWidgetPosition: "left",
    pinnedAppsPosition: "center",
    systemTrayPosition: "right",
    clockPosition: "right",
  },
  left: {
    showStartButton: true,
    startIconStyle: "windows11",
    startIconCustomUrl: "",
    startTooltip: "Start Menu",
    showSearchBar: true,
    searchPlaceholder: "Search",
    searchStyle: "capsule",
    searchIconColor: "#38bdf8",
    showWeatherWidget: true,
    weatherLocationOverride: "",
    weatherDisplayMode: "full",
    tempUnit: "celsius",
    customWeatherBadge: "LIVE",
  },
  right: {
    showWifi: true,
    wifiLabel: "Connected (Fiber 1Gbps)",
    wifiStatus: "connected",
    showVolume: true,
    defaultVolume: 100,
    volumeLabel: "100%",
    showBattery: true,
    batteryPercentage: 100,
    batteryStatus: "charging",
    batteryLabel: "100%",
    showClock: true,
    clockMode: "realtime",
    customTimeStr: "10:30 AM",
    timeFormat: "12h",
    showSeconds: false,
    showDate: true,
    dateFormat: "MM/DD/YYYY",
    customDateStr: "11/05/2026",
    showLocationSubtitle: true,
    locationSubtitleText: "Trichy, IN",
    showTrayChevron: true,
    trayTitle: "SYSTEM CONTROLS",
    traySubtitle: "8-Bit Mode",
    powerPlanName: "High Performance",
  },
  mobile: {
    showStartButton: true,
    showSearchBar: true,
    searchStyle: "compactIcon",
    searchPlaceholder: "Search",
    showWeatherWidget: false,
    weatherDisplayMode: "iconOnly",
    showPinnedApps: true,
    maxPinnedAppsCount: 4,
    showSystemTray: false,
    showClock: true,
    showLocationSubtitle: true,
    taskbarHeight: 48,
    taskbarLayout: "space-between",
    iconSize: 20,
  },
  tablet: {
    showStartButton: true,
    showSearchBar: true,
    searchStyle: "pill",
    searchPlaceholder: "Search",
    showWeatherWidget: true,
    weatherDisplayMode: "tempOnly",
    showPinnedApps: true,
    maxPinnedAppsCount: 6,
    showSystemTray: true,
    showClock: true,
    showLocationSubtitle: true,
    taskbarHeight: 48,
    taskbarLayout: "win11",
    iconSize: 22,
  },
};

// Crisp Pixel Art Renderers for Taskbar Presets
export const renderTaskbarIconGraphic = (iconKey: string, size = 22, customUrl?: string) => {
  if (customUrl || (iconKey && (iconKey.startsWith("http") || iconKey.startsWith("data:") || iconKey.startsWith("/uploads/")))) {
    return (
      <img
        src={getValidImageUrl(customUrl || iconKey)}
        alt="Custom Icon"
        className="object-contain rounded"
        style={{ width: size, height: size, imageRendering: "pixelated" }}
        referrerPolicy="no-referrer"
      />
    );
  }

  const key = (iconKey || "").toLowerCase();

  switch (key) {
    case "taskview":
    case "portfolio":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
          <rect x="2" y="5" width="10" height="10" fill="#94a3b8" />
          <rect x="3" y="6" width="8" height="8" fill="#1e293b" />
          <rect x="7" y="2" width="10" height="10" fill="#cbd5e1" />
          <rect x="8" y="3" width="8" height="8" fill="#38bdf8" />
        </svg>
      );

    case "explorer":
    case "projects":
    case "folder":
      return <PixelFolderIcon size={size} />;

    case "browser":
    case "edge":
    case "about":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
          <circle cx="12" cy="12" r="10" fill="#0284c7" />
          <path d="M12 2C6.48 2 2 6.48 2 12C2 16.5 5 20.3 9 21.6C7.5 19.5 7 17 8 14.5C9 12 11 10.5 13.5 10C16 9.5 18 10.5 19.5 12C20.5 10.5 21 8.5 20 6.5C18 3.8 15.2 2 12 2Z" fill="#38bdf8" />
          <circle cx="12" cy="12" r="4" fill="#0369a1" />
          <circle cx="14" cy="10" r="2" fill="#bae6fd" />
        </svg>
      );

    case "googledrive":
    case "drive":
      return <PixelGoogleDriveIcon size={size} />;

    case "appgrid":
    case "apps":
      return (
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
          <rect x="2" y="2" width="3" height="3" fill="#ffffff" />
          <rect x="7.5" y="2" width="3" height="3" fill="#ffffff" />
          <rect x="13" y="2" width="3" height="3" fill="#ffffff" />
          <rect x="2" y="7.5" width="3" height="3" fill="#ffffff" />
          <rect x="7.5" y="7.5" width="3" height="3" fill="#ffffff" />
          <rect x="13" y="7.5" width="3" height="3" fill="#ffffff" />
          <rect x="2" y="13" width="3" height="3" fill="#ffffff" />
          <rect x="7.5" y="13" width="3" height="3" fill="#ffffff" />
          <rect x="13" y="13" width="3" height="3" fill="#ffffff" />
        </svg>
      );

    case "windows":
    case "start":
      return <PixelWindowsLogo size={size} />;

    case "perspective":
      return (
        <div style={{ width: size, height: size }} className="flex items-center justify-center">
          <PixelWindowsPerspectiveLogo className="w-full h-full" />
        </div>
      );

    case "win95":
      return (
        <div style={{ width: size, height: size }} className="grid grid-cols-2 gap-0.5 p-0.5">
          <div className="bg-[#ef4444] rounded-2xs" />
          <div className="bg-[#22c55e] rounded-2xs" />
          <div className="bg-[#3b82f6] rounded-2xs" />
          <div className="bg-[#eab308] rounded-2xs" />
        </div>
      );

    case "skills":
      return <PixelSkillsIcon size={size} />;

    case "contact":
    case "mail":
      return <PixelContactIcon size={size} />;

    case "experience":
    case "briefcase":
      return <PixelExperienceIcon size={size} />;

    case "recyclebin":
    case "trash":
      return <PixelRecycleBinIcon size={size} />;

    case "terminal":
    case "command":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
          <rect x="1" y="2" width="18" height="16" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M4 7L8 10L4 13" stroke="#4ade80" strokeWidth="2" strokeLinecap="square" />
          <line x1="10" y1="13" x2="15" y2="13" stroke="#38bdf8" strokeWidth="2" />
        </svg>
      );

    case "music":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
          <rect x="2" y="2" width="16" height="16" rx="2" fill="#831843" />
          <circle cx="7" cy="14" r="3" fill="#f43f5e" />
          <circle cx="14" cy="12" r="3" fill="#f43f5e" />
          <path d="M10 14V6L17 4V12" stroke="#fecdd3" strokeWidth="2" />
        </svg>
      );

    case "video":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
          <rect x="2" y="3" width="16" height="14" rx="2" fill="#431407" stroke="#fb923c" strokeWidth="1.5" />
          <polygon points="8,7 14,10 8,13" fill="#fb923c" />
        </svg>
      );

    case "calculator":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
          <rect x="3" y="2" width="14" height="16" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="5" y="4" width="10" height="3" fill="#38bdf8" />
          <circle cx="6" cy="10" r="1" fill="#cbd5e1" />
          <circle cx="10" cy="10" r="1" fill="#cbd5e1" />
          <circle cx="14" cy="10" r="1" fill="#f59e0b" />
          <circle cx="6" cy="14" r="1" fill="#cbd5e1" />
          <circle cx="10" cy="14" r="1" fill="#cbd5e1" />
          <circle cx="14" cy="14" r="1" fill="#10b981" />
        </svg>
      );

    default:
      return (
        <div style={{ width: size, height: size }} className="bg-[#1e3a8a] rounded flex items-center justify-center text-[10px] text-white font-bold">
          ★
        </div>
      );
  }
};

const TASKBAR_PRESETS = [
  { id: "taskview", name: "Task View (Portfolio)", defaultDest: "portfolio", type: "existingWindow" },
  { id: "explorer", name: "File Explorer (Projects)", defaultDest: "projects", type: "existingWindow" },
  { id: "browser", name: "Edge Browser (About)", defaultDest: "about", type: "existingWindow" },
  { id: "googledrive", name: "Google Drive Cloud Hub", defaultDest: "googleDrive", type: "existingWindow" },
  { id: "appgrid", name: "Apps Grid (Skills)", defaultDest: "skills", type: "existingWindow" },
  { id: "experience", name: "Briefcase (Experience)", defaultDest: "experience", type: "existingWindow" },
  { id: "contact", name: "Mailbox (Contact)", defaultDest: "contact", type: "existingWindow" },
  { id: "terminal", name: "Terminal Console", defaultDest: "skills", type: "existingWindow" },
  { id: "music", name: "Music Audio Studio", defaultDest: "projects", type: "existingWindow" },
  { id: "video", name: "AI Video Player", defaultDest: "projects", type: "existingWindow" },
  { id: "calculator", name: "Calculator", defaultDest: "skills", type: "existingWindow" },
  { id: "recyclebin", name: "Recycle Bin", defaultDest: "recycleBin", type: "existingWindow" },
];

export const TaskbarManager: React.FC<TaskbarManagerProps> = ({
  icons = [],
  projects = [],
  token,
  onRefresh,
  onShowNotification,
}) => {
  // Navigation tabs for the taskbar manager
  const [activeSubTab, setActiveSubTab] = useState<"layout" | "mobile" | "tablet" | "left" | "center" | "right">("layout");
  const [previewDeviceMode, setPreviewDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Global Taskbar Settings State
  const [settings, setSettings] = useState<TaskbarSettings>(DEFAULT_TASKBAR_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Center Pinned App Icon Editor State
  const [editingIcon, setEditingIcon] = useState<Partial<TaskbarIcon> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [iconToDelete, setIconToDelete] = useState<TaskbarIcon | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startIconFileInputRef = useRef<HTMLInputElement>(null);
  const [drivePickerState, setDrivePickerState] = useState<{
    isOpen: boolean;
    title: string;
    targetSlot: "startLogo" | "pinnedIcon";
  }>({
    isOpen: false,
    title: "Select Icon from Google Drive",
    targetSlot: "pinnedIcon",
  });

  // Load Taskbar Settings from Server & Firestore
  const fetchSettings = async () => {
    // 1. Check local backup first for instant zero-flicker load
    const local = getLocalMasterBackup();
    if (local?.taskbarSettings && local.taskbarSettings.left && local.taskbarSettings.right) {
      setSettings(local.taskbarSettings);
    }

    try {
      let data: any = null;
      if (IS_FIREBASE_CONNECTED) {
        const fsSettings = await fetchTaskbarSettingsFromFirestore();
        if (fsSettings && fsSettings.left && fsSettings.right) {
          data = fsSettings;
        }
      }

      if (!data) {
        const res = await fetch("/api/taskbar-settings");
        if (res.ok) {
          data = await res.json();
        }
      }

      if (data && data.left && data.right) {
        setSettings({
          layout: {
            ...DEFAULT_TASKBAR_SETTINGS.layout,
            ...(data.layout || {}),
          },
          left: {
            ...DEFAULT_TASKBAR_SETTINGS.left,
            ...data.left,
          },
          right: {
            ...DEFAULT_TASKBAR_SETTINGS.right,
            ...data.right,
          },
          mobile: {
            ...DEFAULT_TASKBAR_SETTINGS.mobile,
            ...(data.mobile || {}),
          },
          tablet: {
            ...DEFAULT_TASKBAR_SETTINGS.tablet,
            ...(data.tablet || {}),
          },
          startMenu: data.startMenu || DEFAULT_TASKBAR_SETTINGS.startMenu,
        });
      }
    } catch {
      // Fall back to default
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Taskbar Settings
  const handleSaveSettings = async (customSettings?: TaskbarSettings) => {
    setIsSavingSettings(true);
    const toSave = customSettings || settings;
    try {
      const res = await fetch("/api/taskbar-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(toSave),
      });

      if (!res.ok) throw new Error("Failed to save taskbar settings");
      const updated = await res.json();
      if (updated && updated.taskbarSettings) {
        setSettings(updated.taskbarSettings);
      }

      // Save to local master backup & sync to Firebase Firestore
      saveLocalMasterBackup({ taskbarSettings: toSave, taskbarIcons: icons });
      if (IS_FIREBASE_CONNECTED) {
        await saveTaskbarSettingsToFirestore(toSave);
        await saveTaskbarIconsToFirestore(icons);
      }
      syncWithServer(token);

      onShowNotification("Taskbar settings saved & applied to live site!");
      window.dispatchEvent(new CustomEvent("taskbar_settings_updated", { detail: toSave }));
      localStorage.setItem("taskbar_refresh_trigger", Date.now().toString());
    } catch (err: any) {
      onShowNotification(err.message || "Failed to update settings", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Preset Layout Quick Selector
  const handleApplyLayoutPreset = (preset: "win11" | "win10_left" | "dock_center" | "right_aligned") => {
    let newLayout: TaskbarLayoutSettings;

    if (preset === "win11") {
      newLayout = {
        layoutPreset: "win11",
        startButtonPosition: "left",
        searchBarPosition: "left",
        weatherWidgetPosition: "left",
        pinnedAppsPosition: "center",
        systemTrayPosition: "right",
        clockPosition: "right",
      };
    } else if (preset === "win10_left") {
      newLayout = {
        layoutPreset: "win10_left",
        startButtonPosition: "left",
        searchBarPosition: "left",
        weatherWidgetPosition: "right",
        pinnedAppsPosition: "left",
        systemTrayPosition: "right",
        clockPosition: "right",
      };
    } else if (preset === "dock_center") {
      newLayout = {
        layoutPreset: "dock_center",
        startButtonPosition: "center",
        searchBarPosition: "center",
        weatherWidgetPosition: "left",
        pinnedAppsPosition: "center",
        systemTrayPosition: "right",
        clockPosition: "right",
      };
    } else {
      newLayout = {
        layoutPreset: "right_aligned",
        startButtonPosition: "right",
        searchBarPosition: "right",
        weatherWidgetPosition: "left",
        pinnedAppsPosition: "right",
        systemTrayPosition: "right",
        clockPosition: "right",
      };
    }

    setSettings((prev) => ({
      ...prev,
      layout: newLayout,
    }));

    onShowNotification(`Applied "${preset}" layout preset! Click "Save" to persist.`);
  };

  // Reset Taskbar Settings
  const handleResetSettings = async () => {
    try {
      const res = await fetch("/api/taskbar-settings/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to reset taskbar settings");
      const data = await res.json();
      if (data && data.taskbarSettings) {
        setSettings(data.taskbarSettings);
      }
      onShowNotification("Taskbar settings reset to default!", "success");
      window.dispatchEvent(new CustomEvent("taskbar_settings_updated", { detail: DEFAULT_TASKBAR_SETTINGS }));
    } catch (err: any) {
      onShowNotification(err.message || "Failed to reset settings", "error");
    }
  };

  // Upload Custom Image for Start Button
  const handleStartIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onShowNotification("Please upload an image file (PNG, JPG, SVG, etc.)", "error");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ imageBase64: base64, name: file.name }),
          });

          if (!res.ok) throw new Error("Image upload failed");
          const data = await res.json();

          setSettings((prev) => ({
            ...prev,
            left: {
              ...prev.left,
              startIconStyle: "custom",
              startIconCustomUrl: data.url,
            },
          }));
          onShowNotification("Custom Start Logo uploaded successfully!");
        } catch (err: any) {
          onShowNotification(err.message || "Upload failed", "error");
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        onShowNotification("File read failed", "error");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onShowNotification(err.message || "Upload failed", "error");
      setIsUploading(false);
    }
  };

  // Upload Custom Image for Pinned App Icon
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onShowNotification("Please upload an image file (PNG, JPG, SVG, etc.)", "error");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ imageBase64: base64, name: file.name }),
          });

          if (!res.ok) throw new Error("Image upload failed");
          const data = await res.json();

          setEditingIcon((prev) => ({
            ...prev,
            iconImage: data.url,
          }));
          onShowNotification("Custom taskbar icon image uploaded!");
        } catch (err: any) {
          onShowNotification(err.message || "Upload failed", "error");
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        onShowNotification("File read failed", "error");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onShowNotification(err.message || "Upload failed", "error");
      setIsUploading(false);
    }
  };

  // Open Create Pinned Icon Modal
  const handleAddNew = () => {
    setEditingIcon({
      name: "New Taskbar App",
      iconImage: "taskview",
      destinationType: "existingWindow",
      destination: "portfolio",
      order: icons.length + 1,
      visible: true,
      openBehavior: "sameWindow",
      badge: "",
      placement: "default",
    });
    setIsModalOpen(true);
  };

  // Open Edit Pinned Icon Modal
  const handleEdit = (icon: TaskbarIcon) => {
    setEditingIcon({ ...icon });
    setIsModalOpen(true);
  };

  // Save Pinned Icon (Create or Update)
  const handleSaveIcon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIcon) return;

    const activeToken = token || localStorage.getItem("admin_token") || "admin";

    try {
      const isNew = !editingIcon.id;
      const url = isNew ? "/api/taskbar-icons" : `/api/taskbar-icons/${editingIcon.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(editingIcon),
      });

      if (!res.ok) throw new Error("Failed to save taskbar icon");
      const data = await res.json();

      let updatedIcons: TaskbarIcon[];
      if (isNew && data.icon) {
        updatedIcons = [...icons, data.icon];
      } else {
        updatedIcons = icons.map((i) => (i.id === editingIcon.id ? { ...i, ...editingIcon } as TaskbarIcon : i));
      }

      saveLocalMasterBackup({ taskbarIcons: updatedIcons });
      try {
        localStorage.setItem("vignesh_portfolio_taskbar_icons", JSON.stringify(updatedIcons));
      } catch {}
      if (IS_FIREBASE_CONNECTED) {
        saveTaskbarIconsToFirestore(updatedIcons).catch(() => {});
      }
      syncWithServer(activeToken);

      onShowNotification(isNew ? "Pinned app icon added to taskbar!" : "Taskbar icon updated!");
      setIsModalOpen(false);
      setEditingIcon(null);
      onRefresh();
      window.dispatchEvent(new CustomEvent("taskbar_icons_updated", { detail: updatedIcons }));
      localStorage.setItem("taskbar_refresh_trigger", Date.now().toString());
    } catch (err: any) {
      onShowNotification(err.message || "Failed to save icon", "error");
    }
  };

  // Delete Pinned Icon Execution
  const handleDelete = async (id: string) => {
    const activeToken = token || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(`/api/taskbar-icons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (!res.ok) throw new Error("Failed to delete taskbar icon");
      const updatedIcons = icons.filter((i) => i.id !== id);
      saveLocalMasterBackup({ taskbarIcons: updatedIcons });
      try {
        localStorage.setItem("vignesh_portfolio_taskbar_icons", JSON.stringify(updatedIcons));
      } catch {}
      if (IS_FIREBASE_CONNECTED) {
        saveTaskbarIconsToFirestore(updatedIcons).catch(() => {});
      }
      syncWithServer(activeToken);

      onShowNotification("Taskbar icon removed successfully!");
      setIconToDelete(null);
      if (editingIcon?.id === id) {
        setIsModalOpen(false);
        setEditingIcon(null);
      }
      onRefresh();
      window.dispatchEvent(new CustomEvent("taskbar_icons_updated", { detail: updatedIcons }));
      localStorage.setItem("taskbar_refresh_trigger", Date.now().toString());
    } catch (err: any) {
      onShowNotification(err.message || "Failed to delete icon", "error");
    }
  };

  // Toggle Pinned Icon Visibility
  const handleToggleVisible = async (icon: TaskbarIcon) => {
    const activeToken = token || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(`/api/taskbar-icons/${icon.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ visible: !icon.visible }),
      });

      if (!res.ok) throw new Error("Failed to update visibility");
      const updatedIcons = icons.map((i) => (i.id === icon.id ? { ...i, visible: !icon.visible } : i));
      saveLocalMasterBackup({ taskbarIcons: updatedIcons });
      try {
        localStorage.setItem("vignesh_portfolio_taskbar_icons", JSON.stringify(updatedIcons));
      } catch {}
      if (IS_FIREBASE_CONNECTED) {
        saveTaskbarIconsToFirestore(updatedIcons).catch(() => {});
      }
      syncWithServer(activeToken);

      onShowNotification(`Icon is now ${!icon.visible ? "visible" : "hidden"} on taskbar`);
      onRefresh();
      window.dispatchEvent(new CustomEvent("taskbar_icons_updated", { detail: updatedIcons }));
      localStorage.setItem("taskbar_refresh_trigger", Date.now().toString());
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  // Reorder Pinned Icons (Move Left / Right)
  const handleMove = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= icons.length) return;

    const newIcons = [...icons];
    const temp = newIcons[index];
    newIcons[index] = newIcons[targetIndex];
    newIcons[targetIndex] = temp;

    const orderedIds = newIcons.map((i) => i.id);
    const activeToken = token || localStorage.getItem("admin_token") || "admin";

    try {
      const res = await fetch("/api/taskbar-icons/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ orderedIds }),
      });

      if (!res.ok) throw new Error("Failed to reorder taskbar icons");
      saveLocalMasterBackup({ taskbarIcons: newIcons });
      try {
        localStorage.setItem("vignesh_portfolio_taskbar_icons", JSON.stringify(newIcons));
      } catch {}
      if (IS_FIREBASE_CONNECTED) {
        saveTaskbarIconsToFirestore(newIcons).catch(() => {});
      }
      syncWithServer(activeToken);

      onRefresh();
      window.dispatchEvent(new CustomEvent("taskbar_icons_updated", { detail: newIcons }));
      localStorage.setItem("taskbar_refresh_trigger", Date.now().toString());
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  // Reset Center Pinned Icons to Default
  const handleResetIcons = async () => {
    const activeToken = token || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch("/api/taskbar-icons/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (!res.ok) throw new Error("Failed to reset taskbar icons");
      const defaultIcons = [
        { id: "tb-1", name: "Portfolio Window", iconImage: "taskview", destinationType: "existingWindow", destination: "portfolio", order: 1, visible: true, openBehavior: "sameWindow" },
        { id: "tb-2", name: "Projects File Explorer", iconImage: "explorer", destinationType: "existingWindow", destination: "projects", order: 2, visible: true, openBehavior: "sameWindow" },
        { id: "tb-3", name: "About & Bio (Browser)", iconImage: "browser", destinationType: "existingWindow", destination: "about", order: 3, visible: true, openBehavior: "sameWindow" },
        { id: "tb-4", name: "Google Drive Cloud Hub", iconImage: "googleDrive", destinationType: "existingWindow", destination: "googleDrive", order: 4, visible: true, openBehavior: "sameWindow" },
        { id: "tb-5", name: "Skills & Apps Grid", iconImage: "appGrid", destinationType: "existingWindow", destination: "skills", order: 5, visible: true, openBehavior: "sameWindow" },
      ] as TaskbarIcon[];

      saveLocalMasterBackup({ taskbarIcons: defaultIcons });
      try {
        localStorage.setItem("vignesh_portfolio_taskbar_icons", JSON.stringify(defaultIcons));
      } catch {}
      if (IS_FIREBASE_CONNECTED) {
        saveTaskbarIconsToFirestore(defaultIcons).catch(() => {});
      }
      syncWithServer(activeToken);

      onShowNotification("Taskbar pinned icons reset to default!");
      onRefresh();
      window.dispatchEvent(new CustomEvent("taskbar_icons_updated", { detail: defaultIcons }));
      localStorage.setItem("taskbar_refresh_trigger", Date.now().toString());
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  // Render Start Button Graphic for Preview
  const renderStartButtonPreview = () => {
    if (!settings.left.showStartButton) return null;

    if (settings.left.startIconStyle === "custom" && settings.left.startIconCustomUrl) {
      return (
        <img
          src={settings.left.startIconCustomUrl}
          alt="Start Logo"
          className="w-5 h-5 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      );
    }

    if (settings.left.startIconStyle === "win95") {
      return (
        <div className="w-5 h-5 grid grid-cols-2 gap-0.5 p-0.5">
          <div className="bg-[#ef4444] rounded-2xs" />
          <div className="bg-[#22c55e] rounded-2xs" />
          <div className="bg-[#3b82f6] rounded-2xs" />
          <div className="bg-[#eab308] rounded-2xs" />
        </div>
      );
    }

    if (settings.left.startIconStyle === "pixel8bit") {
      return (
        <div className="w-5 h-5 flex items-center justify-center">
          <PixelWindowsPerspectiveLogo className="w-full h-full" />
        </div>
      );
    }

    return <PixelWindowsLogo size={22} />;
  };

  const visibleIcons = icons.filter((i) => i.visible !== false);

  // Group items by their active layout section (left, center, right)
  const layout = settings.layout || DEFAULT_TASKBAR_SETTINGS.layout;

  const renderComponentForSection = (section: TaskbarElementPosition) => {
    const isStartHere = layout.startButtonPosition === section && settings.left.showStartButton;
    const isSearchHere = layout.searchBarPosition === section && settings.left.showSearchBar;
    const isWeatherHere = layout.weatherWidgetPosition === section && settings.left.showWeatherWidget;
    const isTrayHere = layout.systemTrayPosition === section && (settings.right.showWifi || settings.right.showVolume || settings.right.showBattery);
    const isClockHere = layout.clockPosition === section && settings.right.showClock;

    // Filter icons placed in this specific section
    const sectionIcons = visibleIcons.filter((icon) => {
      if (icon.placement && icon.placement !== "default") {
        return icon.placement === section;
      }
      return layout.pinnedAppsPosition === section;
    });

    return (
      <div className={`flex items-center gap-2 ${section === "center" ? "mx-auto justify-center" : section === "right" ? "justify-end shrink-0" : "shrink-0"}`}>
        {/* Start Button */}
        {isStartHere && (
          <div
            title={settings.left.startTooltip || "Start Menu"}
            className="p-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer"
          >
            {renderStartButtonPreview()}
          </div>
        )}

        {/* Search Bar */}
        {isSearchHere && (
          <div
            className={`h-8 px-3 ${
              settings.left.searchStyle === "capsule"
                ? "rounded-full"
                : settings.left.searchStyle === "pill"
                ? "rounded-md"
                : "w-8 rounded-full justify-center px-0"
            } bg-[#0e214d]/80 border border-[#1e40af] flex items-center gap-2 text-white/80 cursor-pointer min-w-[90px] md:min-w-[130px]`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
              <rect x="2" y="2" width="8" height="8" stroke={settings.left.searchIconColor || "#38bdf8"} strokeWidth="2" fill="none" />
              <rect x="9" y="9" width="5" height="2" fill={settings.left.searchIconColor || "#38bdf8"} transform="rotate(45 9 9)" />
            </svg>
            {settings.left.searchStyle !== "compactIcon" && (
              <span className="text-xs text-white/70 truncate">{settings.left.searchPlaceholder || "Search"}</span>
            )}
          </div>
        )}

        {/* Weather Widget */}
        {isWeatherHere && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e214d]/70 border border-[#1e3a8a] text-white text-xs cursor-pointer">
            <span>☀️</span>
            {settings.left.weatherDisplayMode !== "iconOnly" && (
              <span className="font-bold text-[#38bdf8]">
                {settings.left.tempUnit === "fahrenheit" ? "82°F" : "28°C"}
              </span>
            )}
            {settings.left.weatherDisplayMode === "full" && (
              <span className="text-[11px] text-white/70 max-w-[70px] truncate">
                {settings.left.weatherLocationOverride || "Trichy, IN"}
              </span>
            )}
            {settings.left.customWeatherBadge && (
              <span className="text-[9px] text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-700 font-bold">
                {settings.left.customWeatherBadge}
              </span>
            )}
          </div>
        )}

        {/* Pinned Icons for this section */}
        {sectionIcons.length > 0 && (
          <div className="flex items-center gap-1.5 px-1">
            {sectionIcons.map((icon) => (
              <div
                key={icon.id}
                title={`${icon.name} [Placement: ${icon.placement || layout.pinnedAppsPosition}]`}
                className="relative p-1.5 rounded hover:bg-white/20 transition-all cursor-pointer flex items-center justify-center group"
              >
                {renderTaskbarIconGraphic(icon.iconImage, 20)}
                {icon.badge && (
                  <span className="absolute -top-1 -right-1 px-1 text-[8px] font-bold bg-[#e11d48] text-white rounded-full leading-tight border border-white/40 shadow">
                    {icon.badge}
                  </span>
                )}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3.5 h-0.5 rounded-full bg-[#38bdf8]/60 group-hover:bg-[#38bdf8]" />
              </div>
            ))}
          </div>
        )}

        {/* System Tray (Wi-Fi, Volume, Battery) */}
        {isTrayHere && (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10 text-white cursor-pointer">
            {settings.right.showWifi && (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                <path d="M1 4C5 0 11 0 15 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                <path d="M4 7C6.5 4.5 9.5 4.5 12 7" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                <path d="M6.5 10C7.2 9.3 8.8 9.3 9.5 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                <circle cx="8" cy="13" r="1.5" fill="#ffffff" />
              </svg>
            )}

            {settings.right.showVolume && (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                <polygon points="1,5 5,5 9,2 9,14 5,11 1,11" fill="#ffffff" />
                <path d="M11 4C12.5 5.5 12.5 10.5 11 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                <path d="M13 2C15.5 4.5 15.5 11.5 13 14" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
              </svg>
            )}

            {settings.right.showBattery && (
              <div className="flex items-center gap-1">
                <svg width="16" height="10" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                  <rect x="1" y="1" width="16" height="10" stroke="#ffffff" strokeWidth="2" fill="none" />
                  <rect x="18" y="4" width="2" height="4" fill="#ffffff" />
                  <rect x="3" y="3" width="10" height="6" fill="#22c55e" />
                </svg>
                <span className="text-[10px] text-emerald-400 font-bold">{settings.right.batteryPercentage || 100}%</span>
              </div>
            )}
          </div>
        )}

        {/* Clock & Date */}
        {isClockHere && (
          <div className="flex flex-col items-end justify-center px-1 text-right text-white">
            <span className="text-[11px] font-bold leading-none text-[#38bdf8]">
              {settings.right.clockMode === "custom" && settings.right.customTimeStr
                ? settings.right.customTimeStr
                : "10:30 AM"}
            </span>
            {settings.right.showLocationSubtitle && (
              <span className="text-[9px] text-white/70 leading-none mt-0.5">
                {settings.right.locationSubtitleText || "Trichy, IN"}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a183d] p-5 rounded-lg border border-[#1e3a8a]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📌</span>
            <h2 className="text-lg font-bold text-white tracking-wide">WINDOWS 11 TASKBAR CUSTOMIZER</h2>
          </div>
          <p className="text-xs text-white/70 mt-1">
            Reorder and position any item anywhere: Left, Center, or Right. Switch between Windows 11, Windows 10, or fully customized alignments!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSaveSettings()}
            disabled={isSavingSettings}
            className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            💾 {isSavingSettings ? "Saving Settings..." : "Save All Taskbar Settings"}
          </button>
          <button
            onClick={handleResetSettings}
            className="bg-[#1e293b] hover:bg-[#334155] border border-white/20 text-white/90 px-3 py-2 rounded text-xs transition-colors cursor-pointer"
          >
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      {/* 1. INTERACTIVE LIVE WINDOWS 11 TASKBAR PREVIEW */}
      <div className="bg-[#060e22] p-4 rounded-lg border-2 border-[#38bdf8] shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5">
              <span>🖥️</span> LIVE TASKBAR PREVIEW
            </span>
            <span className="text-[11px] text-white/70">
              Active Apps: <strong className="text-emerald-400">{visibleIcons.length}</strong>
            </span>
          </div>

          {/* Form Factor Preview Switcher */}
          <div className="flex items-center gap-1 bg-[#071329] p-1 rounded border border-[#1e3a8a]">
            {[
              { id: "desktop", label: "🖥️ Desktop", width: "w-full" },
              { id: "tablet", label: "📲 Tablet", width: "max-w-2xl" },
              { id: "mobile", label: "📱 Mobile", width: "max-w-sm" },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setPreviewDeviceMode(mode.id as any)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  previewDeviceMode === mode.id
                    ? "bg-[#2563eb] text-white shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* The Exact Taskbar Replica */}
        <div className="flex justify-center w-full overflow-x-auto p-1">
          {previewDeviceMode === "mobile" ? (
            /* Mobile Taskbar Replica */
            <div
              className={`w-full max-w-sm bg-[#0b1739]/95 backdrop-blur-md border border-[#1e3a8a] rounded-md px-2.5 flex items-center shadow-inner select-none gap-2 ${
                (settings.mobile?.taskbarLayout || "space-between") === "center"
                  ? "justify-center"
                  : (settings.mobile?.taskbarLayout || "space-between") === "left"
                  ? "justify-start"
                  : "justify-between"
              }`}
              style={{ height: `${settings.mobile?.taskbarHeight || 48}px` }}
            >
              {/* Mobile Start Button */}
              {settings.mobile?.showStartButton !== false && (
                <div className="p-1 rounded bg-white/10 flex items-center justify-center shrink-0">
                  {renderStartButtonPreview()}
                </div>
              )}

              {/* Mobile Search */}
              {settings.mobile?.showSearchBar && settings.mobile.searchStyle !== "hidden" && (
                <div className="h-7 w-7 rounded-full bg-[#0e214d]/80 border border-[#1e40af] flex items-center justify-center text-white/80 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                    <rect x="2" y="2" width="8" height="8" stroke="#38bdf8" strokeWidth="2" fill="none" />
                    <rect x="9" y="9" width="5" height="2" fill="#38bdf8" transform="rotate(45 9 9)" />
                  </svg>
                </div>
              )}

              {/* Mobile Weather */}
              {settings.mobile?.showWeatherWidget && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0e214d]/70 border border-[#1e3a8a] text-[10px] text-white shrink-0">
                  <span>☀️</span>
                  {settings.mobile?.weatherDisplayMode !== "iconOnly" && (
                    <span className="font-bold text-[#38bdf8]">28°</span>
                  )}
                </div>
              )}

              {/* Mobile Pinned App Icons */}
              {settings.mobile?.showPinnedApps !== false && (
                <div className="flex items-center gap-1 overflow-x-hidden">
                  {visibleIcons.slice(0, settings.mobile?.maxPinnedAppsCount || 4).map((icon) => (
                    <div
                      key={icon.id}
                      className="p-1 rounded bg-white/5 flex items-center justify-center shrink-0"
                    >
                      {renderTaskbarIconGraphic(icon.iconImage, settings.mobile?.iconSize || 18)}
                    </div>
                  ))}
                </div>
              )}

              {/* Mobile System Tray */}
              {settings.mobile?.showSystemTray && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="13" r="1.5" fill="#ffffff" />
                  </svg>
                  <span className="text-[9px] text-emerald-400 font-bold">100%</span>
                </div>
              )}

              {/* Mobile Clock */}
              {settings.mobile?.showClock !== false && (
                <div className="flex flex-col items-end text-right shrink-0">
                  <span className="text-[10px] font-bold text-[#38bdf8] leading-none">10:30</span>
                  {settings.mobile?.showLocationSubtitle && (
                    <span className="text-[8px] text-white/60 leading-none mt-0.5 truncate max-w-[50px]">
                      Trichy
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : previewDeviceMode === "tablet" ? (
            /* Tablet Taskbar Replica */
            <div
              className="w-full max-w-2xl bg-[#0b1739]/95 backdrop-blur-md border border-[#1e3a8a] rounded-md px-3 flex items-center justify-between shadow-inner select-none gap-2"
              style={{ height: `${settings.tablet?.taskbarHeight || 48}px` }}
            >
              <div className="flex items-center gap-2">
                {settings.tablet?.showStartButton !== false && (
                  <div className="p-1.5 rounded bg-white/10 flex items-center justify-center">
                    {renderStartButtonPreview()}
                  </div>
                )}
                {settings.tablet?.showSearchBar && (
                  <div className="h-7 px-2.5 rounded-full bg-[#0e214d]/80 border border-[#1e40af] flex items-center gap-1.5 text-xs text-white/70">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="8" height="8" stroke="#38bdf8" strokeWidth="2" fill="none" />
                      <rect x="9" y="9" width="5" height="2" fill="#38bdf8" transform="rotate(45 9 9)" />
                    </svg>
                    <span>Search</span>
                  </div>
                )}
                {settings.tablet?.showWeatherWidget && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0e214d]/70 border border-[#1e3a8a] text-xs text-white">
                    <span>☀️</span>
                    <span className="font-bold text-[#38bdf8]">28°C</span>
                  </div>
                )}
              </div>

              {/* Tablet Center Pinned Apps */}
              {settings.tablet?.showPinnedApps !== false && (
                <div className="flex items-center gap-1.5 mx-auto">
                  {visibleIcons.slice(0, settings.tablet?.maxPinnedAppsCount || 6).map((icon) => (
                    <div
                      key={icon.id}
                      className="p-1.5 rounded bg-white/5 flex items-center justify-center"
                    >
                      {renderTaskbarIconGraphic(icon.iconImage, settings.tablet?.iconSize || 20)}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {settings.tablet?.showSystemTray !== false && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs">
                    <span className="text-[10px] text-emerald-400 font-bold">100%</span>
                  </div>
                )}
                {settings.tablet?.showClock !== false && (
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[11px] font-bold text-[#38bdf8] leading-none">10:30 AM</span>
                    {settings.tablet?.showLocationSubtitle && (
                      <span className="text-[9px] text-white/70 leading-none mt-0.5">Trichy, IN</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Desktop Taskbar Replica */
            <div className="relative w-full h-12 bg-[#0b1739]/95 backdrop-blur-md border border-[#1e3a8a] rounded-md px-3 flex items-center justify-between shadow-inner select-none overflow-x-auto gap-2">
              {/* LEFT ZONE */}
              <div className="flex items-center min-w-[50px]">
                {renderComponentForSection("left")}
              </div>

              {/* CENTER ZONE */}
              <div className="flex items-center mx-auto">
                {renderComponentForSection("center")}
              </div>

              {/* RIGHT ZONE */}
              <div className="flex items-center min-w-[50px] justify-end">
                {renderComponentForSection("right")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. SUB-TABS NAVIGATION */}
      <div className="flex border-b border-[#1e3a8a] gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveSubTab("layout")}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "layout"
              ? "bg-[#1e3a8a] text-[#38bdf8] border-t-2 border-[#38bdf8]"
              : "bg-[#0c1e4a] text-white/70 hover:text-white"
          }`}
        >
          <span>🖥️</span> 1. Desktop Positions & Alignment
        </button>

        <button
          onClick={() => {
            setActiveSubTab("mobile");
            setPreviewDeviceMode("mobile");
          }}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "mobile"
              ? "bg-[#1e3a8a] text-[#38bdf8] border-t-2 border-[#38bdf8]"
              : "bg-[#0c1e4a] text-white/70 hover:text-white"
          }`}
        >
          <span>📱</span> 2. Mobile Taskbar Customization
        </button>

        <button
          onClick={() => {
            setActiveSubTab("tablet");
            setPreviewDeviceMode("tablet");
          }}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "tablet"
              ? "bg-[#1e3a8a] text-[#38bdf8] border-t-2 border-[#38bdf8]"
              : "bg-[#0c1e4a] text-white/70 hover:text-white"
          }`}
        >
          <span>📲</span> 3. Tablet Taskbar Customization
        </button>

        <button
          onClick={() => setActiveSubTab("left")}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "left"
              ? "bg-[#1e3a8a] text-[#38bdf8] border-t-2 border-[#38bdf8]"
              : "bg-[#0c1e4a] text-white/70 hover:text-white"
          }`}
        >
          <span>🪟</span> 4. Start, Search & Weather Details
        </button>

        <button
          onClick={() => setActiveSubTab("center")}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "center"
              ? "bg-[#1e3a8a] text-[#38bdf8] border-t-2 border-[#38bdf8]"
              : "bg-[#0c1e4a] text-white/70 hover:text-white"
          }`}
        >
          <span>📌</span> 5. Pinned App Icons ({icons.length})
        </button>

        <button
          onClick={() => setActiveSubTab("right")}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "right"
              ? "bg-[#1e3a8a] text-[#38bdf8] border-t-2 border-[#38bdf8]"
              : "bg-[#0c1e4a] text-white/70 hover:text-white"
          }`}
        >
          <span>⚙️</span> 6. System Tray & Clock Details
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 0: POSITIONS & ALIGNMENT (LEFT / CENTER / RIGHT FOR ALL ICONS)    */}
      {/* ========================================================================= */}
      {activeSubTab === "layout" && (
        <div className="space-y-6">
          {/* QUICK PRESETS */}
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="border-b border-[#1e3a8a] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>⚡</span> 1-Click Taskbar Alignment Presets
              </h3>
              <p className="text-xs text-white/60">Choose a popular layout preset or customize the exact section placement for every single item below.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleApplyLayoutPreset("win11")}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  layout.layoutPreset === "win11"
                    ? "bg-[#1e3a8a] border-[#38bdf8] text-white shadow-lg"
                    : "bg-[#071329] border-white/10 hover:border-white/30 text-white/80"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-2 mb-1">
                  <span>🟦</span> Windows 11 Modern
                </div>
                <div className="text-[11px] text-white/60">
                  • Left: Start, Search, Weather<br />
                  • Center: Pinned Apps<br />
                  • Right: System Tray & Clock
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyLayoutPreset("win10_left")}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  layout.layoutPreset === "win10_left"
                    ? "bg-[#1e3a8a] border-[#38bdf8] text-white shadow-lg"
                    : "bg-[#071329] border-white/10 hover:border-white/30 text-white/80"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-2 mb-1">
                  <span>🪟</span> Windows 10 Classic (All-Left)
                </div>
                <div className="text-[11px] text-white/60">
                  • Left: Start, Search & Pinned Apps<br />
                  • Center: Empty<br />
                  • Right: Weather, Tray & Clock
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyLayoutPreset("dock_center")}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  layout.layoutPreset === "dock_center"
                    ? "bg-[#1e3a8a] border-[#38bdf8] text-white shadow-lg"
                    : "bg-[#071329] border-white/10 hover:border-white/30 text-white/80"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-2 mb-1">
                  <span>🍏</span> Centered Dock
                </div>
                <div className="text-[11px] text-white/60">
                  • Left: Weather<br />
                  • Center: Start, Search, Pinned Apps<br />
                  • Right: Tray & Clock
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyLayoutPreset("right_aligned")}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  layout.layoutPreset === "right_aligned"
                    ? "bg-[#1e3a8a] border-[#38bdf8] text-white shadow-lg"
                    : "bg-[#071329] border-white/10 hover:border-white/30 text-white/80"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-2 mb-1">
                  <span>⚡</span> Right-Aligned Minimal
                </div>
                <div className="text-[11px] text-white/60">
                  • Left: Weather<br />
                  • Center: Empty<br />
                  • Right: Start, Search, Apps, Tray & Clock
                </div>
              </button>
            </div>
          </div>

          {/* GRANULAR SECTION POSITION CONTROLLER */}
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="border-b border-[#1e3a8a] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>🎯</span> Granular Element Placement (Left / Center / Right)
              </h3>
              <p className="text-xs text-white/60">Set any component's exact position on the taskbar independently.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* 1. Start Button */}
              <div className="bg-[#071329] p-3 rounded border border-[#1e3a8a]">
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5 flex items-center gap-1.5">
                  <span>🪟</span> Windows Start Button Position
                </label>
                <select
                  value={layout.startButtonPosition}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        layoutPreset: "custom",
                        startButtonPosition: e.target.value as TaskbarElementPosition,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="left">👈 Left Zone</option>
                  <option value="center">⏺️ Center Zone</option>
                  <option value="right">👉 Right Zone</option>
                </select>
              </div>

              {/* 2. Search Bar */}
              <div className="bg-[#071329] p-3 rounded border border-[#1e3a8a]">
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5 flex items-center gap-1.5">
                  <span>🔍</span> Search Bar Position
                </label>
                <select
                  value={layout.searchBarPosition}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        layoutPreset: "custom",
                        searchBarPosition: e.target.value as TaskbarElementPosition,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="left">👈 Left Zone</option>
                  <option value="center">⏺️ Center Zone</option>
                  <option value="right">👉 Right Zone</option>
                </select>
              </div>

              {/* 3. Weather Widget */}
              <div className="bg-[#071329] p-3 rounded border border-[#1e3a8a]">
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5 flex items-center gap-1.5">
                  <span>⛅</span> Live Weather Report Position
                </label>
                <select
                  value={layout.weatherWidgetPosition}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        layoutPreset: "custom",
                        weatherWidgetPosition: e.target.value as TaskbarElementPosition,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="left">👈 Left Zone</option>
                  <option value="center">⏺️ Center Zone</option>
                  <option value="right">👉 Right Zone</option>
                </select>
              </div>

              {/* 4. Pinned App Icons Group */}
              <div className="bg-[#071329] p-3 rounded border border-[#1e3a8a]">
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5 flex items-center gap-1.5">
                  <span>📌</span> Pinned Apps Default Position
                </label>
                <select
                  value={layout.pinnedAppsPosition}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        layoutPreset: "custom",
                        pinnedAppsPosition: e.target.value as TaskbarElementPosition,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="left">👈 Left Zone (Next to Start)</option>
                  <option value="center">⏺️ Center Zone (Windows 11 Default)</option>
                  <option value="right">👉 Right Zone (Next to Tray)</option>
                </select>
              </div>

              {/* 5. System Tray */}
              <div className="bg-[#071329] p-3 rounded border border-[#1e3a8a]">
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5 flex items-center gap-1.5">
                  <span>📶</span> System Tray (Wi-Fi, Volume, Battery)
                </label>
                <select
                  value={layout.systemTrayPosition}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        layoutPreset: "custom",
                        systemTrayPosition: e.target.value as TaskbarElementPosition,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="left">👈 Left Zone</option>
                  <option value="center">⏺️ Center Zone</option>
                  <option value="right">👉 Right Zone (Default)</option>
                </select>
              </div>

              {/* 6. Clock & Date */}
              <div className="bg-[#071329] p-3 rounded border border-[#1e3a8a]">
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5 flex items-center gap-1.5">
                  <span>🕒</span> Clock, Date & Subtitle Position
                </label>
                <select
                  value={layout.clockPosition}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        layoutPreset: "custom",
                        clockPosition: e.target.value as TaskbarElementPosition,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="left">👈 Left Zone</option>
                  <option value="center">⏺️ Center Zone</option>
                  <option value="right">👉 Right Zone (Default)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON FOR LAYOUT */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveSettings()}
              disabled={isSavingSettings}
              className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-6 py-2.5 rounded text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
            >
              💾 {isSavingSettings ? "Saving..." : "Save Positions & Alignment"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB: MOBILE TASKBAR CUSTOMIZATION (Smartphones & Small Viewports)    */}
      {/* ========================================================================= */}
      {activeSubTab === "mobile" && (
        <div className="space-y-6">
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#1e3a8a] pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>📱</span> Mobile Taskbar Customization (Width &lt; 768px)
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Configure how the taskbar adapts and fits on mobile phones and portrait screens.
                </p>
              </div>
              <span className="text-[11px] bg-sky-950 text-sky-300 border border-sky-500/40 px-2.5 py-1 rounded font-bold">
                📱 Mobile Viewport Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-pixel">
              {/* 1. Mobile Start Button */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>🪟</span> Mobile Start Button
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.mobile?.showStartButton !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        mobile: {
                          ...DEFAULT_TASKBAR_SETTINGS.mobile,
                          ...(prev.mobile || {}),
                          showStartButton: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <p className="text-[11px] text-white/60">
                  Shows Windows Start Menu button on mobile screens.
                </p>
              </div>

              {/* 2. Mobile Search Button Style */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>🔍</span> Mobile Search Button Style
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.mobile?.showSearchBar !== false && settings.mobile?.searchStyle !== "hidden"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        mobile: {
                          ...DEFAULT_TASKBAR_SETTINGS.mobile,
                          ...(prev.mobile || {}),
                          showSearchBar: e.target.checked,
                          searchStyle: e.target.checked ? "compactIcon" : "hidden",
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <select
                  value={settings.mobile?.searchStyle || "compactIcon"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      mobile: {
                        ...DEFAULT_TASKBAR_SETTINGS.mobile,
                        ...(prev.mobile || {}),
                        showSearchBar: e.target.value !== "hidden",
                        searchStyle: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="compactIcon">Compact 28px Pixel Icon (Recommended)</option>
                  <option value="capsule">Pill Search Bar</option>
                  <option value="hidden">Hidden on Mobile</option>
                </select>
              </div>

              {/* 3. Mobile Weather Widget */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>🌤️</span> Mobile Weather Widget
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.mobile?.showWeatherWidget)}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        mobile: {
                          ...DEFAULT_TASKBAR_SETTINGS.mobile,
                          ...(prev.mobile || {}),
                          showWeatherWidget: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <select
                  value={settings.mobile?.weatherDisplayMode || "iconOnly"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      mobile: {
                        ...DEFAULT_TASKBAR_SETTINGS.mobile,
                        ...(prev.mobile || {}),
                        weatherDisplayMode: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="iconOnly">Icon Only (☀️)</option>
                  <option value="tempOnly">Icon + Temperature (☀️ 28°)</option>
                  <option value="full">Full Widget</option>
                </select>
              </div>

              {/* 4. Mobile Pinned Apps Limit */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>📌</span> Max Pinned Apps on Mobile
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {settings.mobile?.maxPinnedAppsCount || 4} Apps Max
                  </span>
                </div>
                <select
                  value={settings.mobile?.maxPinnedAppsCount || 4}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      mobile: {
                        ...DEFAULT_TASKBAR_SETTINGS.mobile,
                        ...(prev.mobile || {}),
                        maxPinnedAppsCount: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="2">2 Pinned Apps</option>
                  <option value="3">3 Pinned Apps</option>
                  <option value="4">4 Pinned Apps (Recommended)</option>
                  <option value="5">5 Pinned Apps</option>
                  <option value="6">6 Pinned Apps</option>
                </select>
              </div>

              {/* 5. Mobile System Tray (Wi-Fi/Battery) */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>📶</span> Mobile System Tray (Battery / Wi-Fi)
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.mobile?.showSystemTray)}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        mobile: {
                          ...DEFAULT_TASKBAR_SETTINGS.mobile,
                          ...(prev.mobile || {}),
                          showSystemTray: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <p className="text-[11px] text-white/60">
                  Toggle Wi-Fi and Battery indicators on mobile taskbar.
                </p>
              </div>

              {/* 6. Mobile Clock & Location */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>🕒</span> Mobile Clock &amp; Location
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.mobile?.showClock !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        mobile: {
                          ...DEFAULT_TASKBAR_SETTINGS.mobile,
                          ...(prev.mobile || {}),
                          showClock: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="mobileLocationSubToggle"
                    checked={settings.mobile?.showLocationSubtitle !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        mobile: {
                          ...DEFAULT_TASKBAR_SETTINGS.mobile,
                          ...(prev.mobile || {}),
                          showLocationSubtitle: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                  <label htmlFor="mobileLocationSubToggle" className="text-white/80 cursor-pointer">
                    Show Location Subtitle on Mobile (e.g. &quot;Trichy&quot;)
                  </label>
                </div>
              </div>

              {/* 7. Mobile Taskbar Height */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>📐</span> Mobile Taskbar Height
                  </span>
                  <span className="text-amber-400 font-bold">{settings.mobile?.taskbarHeight || 48}px</span>
                </div>
                <select
                  value={settings.mobile?.taskbarHeight || 48}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      mobile: {
                        ...DEFAULT_TASKBAR_SETTINGS.mobile,
                        ...(prev.mobile || {}),
                        taskbarHeight: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="40">40px (Slim)</option>
                  <option value="44">44px (Compact)</option>
                  <option value="48">48px (Standard Windows Mobile)</option>
                  <option value="52">52px (Spacious Touch)</option>
                </select>
              </div>

              {/* 8. Mobile Layout Alignment */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>↔️</span> Mobile Taskbar Alignment
                  </span>
                  <span className="text-sky-300 font-bold uppercase">{settings.mobile?.taskbarLayout || "space-between"}</span>
                </div>
                <select
                  value={settings.mobile?.taskbarLayout || "space-between"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      mobile: {
                        ...DEFAULT_TASKBAR_SETTINGS.mobile,
                        ...(prev.mobile || {}),
                        taskbarLayout: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="space-between">Space Between (Edges &amp; Center Balanced)</option>
                  <option value="center">Centered Floating Dock</option>
                  <option value="left">Left Aligned</option>
                </select>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON FOR MOBILE */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveSettings()}
              disabled={isSavingSettings}
              className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-6 py-2.5 rounded text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
            >
              💾 {isSavingSettings ? "Saving..." : "Save Mobile Taskbar Settings"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB: TABLET TASKBAR CUSTOMIZATION (iPads & Medium Displays)           */}
      {/* ========================================================================= */}
      {activeSubTab === "tablet" && (
        <div className="space-y-6">
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#1e3a8a] pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>📲</span> Tablet Taskbar Customization (768px – 1199px)
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Configure tablet-specific dock behavior, search styles, and pinned apps for touch tablets.
                </p>
              </div>
              <span className="text-[11px] bg-purple-950 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded font-bold">
                📲 Tablet Viewport Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-pixel">
              {/* 1. Tablet Start Button */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>🪟</span> Tablet Start Button
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.tablet?.showStartButton !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        tablet: {
                          ...DEFAULT_TASKBAR_SETTINGS.tablet,
                          ...(prev.tablet || {}),
                          showStartButton: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <p className="text-[11px] text-white/60">
                  Shows Windows Start Menu button on tablet screens.
                </p>
              </div>

              {/* 2. Tablet Search Bar Style */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>🔍</span> Tablet Search Style
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.tablet?.showSearchBar !== false && settings.tablet?.searchStyle !== "hidden"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        tablet: {
                          ...DEFAULT_TASKBAR_SETTINGS.tablet,
                          ...(prev.tablet || {}),
                          showSearchBar: e.target.checked,
                          searchStyle: e.target.checked ? "pill" : "hidden",
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <select
                  value={settings.tablet?.searchStyle || "pill"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      tablet: {
                        ...DEFAULT_TASKBAR_SETTINGS.tablet,
                        ...(prev.tablet || {}),
                        showSearchBar: e.target.value !== "hidden",
                        searchStyle: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="pill">Pill Search Bar with Text</option>
                  <option value="capsule">Capsule Rounded Search</option>
                  <option value="compactIcon">Compact Icon Only</option>
                  <option value="hidden">Hidden on Tablet</option>
                </select>
              </div>

              {/* 3. Tablet Weather Widget */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>🌤️</span> Tablet Weather Widget
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.tablet?.showWeatherWidget !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        tablet: {
                          ...DEFAULT_TASKBAR_SETTINGS.tablet,
                          ...(prev.tablet || {}),
                          showWeatherWidget: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <select
                  value={settings.tablet?.weatherDisplayMode || "tempOnly"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      tablet: {
                        ...DEFAULT_TASKBAR_SETTINGS.tablet,
                        ...(prev.tablet || {}),
                        weatherDisplayMode: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="tempOnly">Icon + Temperature (☀️ 28°C)</option>
                  <option value="full">Full Weather Badge</option>
                  <option value="iconOnly">Icon Only (☀️)</option>
                </select>
              </div>

              {/* 4. Tablet Max Pinned Apps */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>📌</span> Max Pinned Apps on Tablet
                  </span>
                  <span className="text-emerald-400 font-bold">{settings.tablet?.maxPinnedAppsCount || 6} Apps Max</span>
                </div>
                <select
                  value={settings.tablet?.maxPinnedAppsCount || 6}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      tablet: {
                        ...DEFAULT_TASKBAR_SETTINGS.tablet,
                        ...(prev.tablet || {}),
                        maxPinnedAppsCount: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="4">4 Pinned Apps</option>
                  <option value="5">5 Pinned Apps</option>
                  <option value="6">6 Pinned Apps (Recommended)</option>
                  <option value="7">7 Pinned Apps</option>
                  <option value="8">8 Pinned Apps</option>
                </select>
              </div>

              {/* 5. Tablet System Tray */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>📶</span> Tablet System Tray (Wi-Fi / Volume / Battery)
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.tablet?.showSystemTray !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        tablet: {
                          ...DEFAULT_TASKBAR_SETTINGS.tablet,
                          ...(prev.tablet || {}),
                          showSystemTray: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <p className="text-[11px] text-white/60">
                  Toggle Wi-Fi, Volume, and Battery system indicators on tablets.
                </p>
              </div>

              {/* 6. Tablet Clock & Location */}
              <div className="bg-[#071329] p-3.5 rounded border border-[#1e3a8a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span>🕒</span> Tablet Clock &amp; Location
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.tablet?.showClock !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        tablet: {
                          ...DEFAULT_TASKBAR_SETTINGS.tablet,
                          ...(prev.tablet || {}),
                          showClock: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="tabletLocationSubToggle"
                    checked={settings.tablet?.showLocationSubtitle !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        tablet: {
                          ...DEFAULT_TASKBAR_SETTINGS.tablet,
                          ...(prev.tablet || {}),
                          showLocationSubtitle: e.target.checked,
                        },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                  <label htmlFor="tabletLocationSubToggle" className="text-white/80 cursor-pointer">
                    Show Location Subtitle on Tablet (e.g. &quot;Trichy, IN&quot;)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON FOR TABLET */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveSettings()}
              disabled={isSavingSettings}
              className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-6 py-2.5 rounded text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
            >
              💾 {isSavingSettings ? "Saving..." : "Save Tablet Taskbar Settings"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: START, SEARCH & WEATHER (Styling & Configuration)              */}
      {/* ========================================================================= */}
      {activeSubTab === "left" && (
        <div className="space-y-6">
          {/* 1.1 WINDOWS START BUTTON CONFIGURATION */}
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e3a8a] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🪟</span>
                <div>
                  <h3 className="font-bold text-white text-sm">Windows Start Button</h3>
                  <p className="text-xs text-white/60">Customize start icon appearance, logo graphic, or upload custom logo.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer bg-[#0e214d] px-3 py-1.5 rounded border border-[#1e40af]">
                <input
                  type="checkbox"
                  checked={settings.left.showStartButton}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      left: { ...prev.left, showStartButton: e.target.checked },
                    }))
                  }
                  className="rounded text-[#38bdf8]"
                />
                <span>Enable Start Button</span>
              </label>
            </div>

            {settings.left.showStartButton && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Start Icon Style</label>
                  <select
                    value={settings.left.startIconStyle}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        left: {
                          ...prev.left,
                          startIconStyle: e.target.value as any,
                        },
                      }))
                    }
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  >
                    <option value="windows11">🟦 Windows 11 Modern (4 Cyan Squares)</option>
                    <option value="pixel8bit">🎮 Retro Pixel Perspective Logo</option>
                    <option value="win95">🟥 Classic Windows 95 4-Colors Flag</option>
                    <option value="custom">🖼️ Custom Image Upload / URL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Start Button Hover Tooltip</label>
                  <input
                    type="text"
                    value={settings.left.startTooltip || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        left: { ...prev.left, startTooltip: e.target.value },
                      }))
                    }
                    placeholder="Start Menu"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  />
                </div>

                {/* Custom Logo Upload if style is custom */}
                {settings.left.startIconStyle === "custom" && (
                  <div className="md:col-span-2 bg-[#081530] p-3 rounded border border-dashed border-[#38bdf8]/50 space-y-3">
                    <label className="block text-xs font-bold text-emerald-400">Custom Start Logo Image</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {settings.left.startIconCustomUrl && (
                        <div className="p-2 bg-[#0b1b3d] rounded border border-white/20">
                          <img
                            src={settings.left.startIconCustomUrl}
                            alt="Logo preview"
                            className="w-8 h-8 object-contain"
                            style={{ imageRendering: "pixelated" }}
                          />
                        </div>
                      )}
                      <input
                        type="text"
                        value={settings.left.startIconCustomUrl || ""}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            left: { ...prev.left, startIconCustomUrl: e.target.value },
                          }))
                        }
                        placeholder="Image URL or upload below..."
                        className="flex-1 bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                      />
                      <input
                        type="file"
                        ref={startIconFileInputRef}
                        onChange={handleStartIconUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => startIconFileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 py-2 rounded text-xs font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {isUploading ? "Uploading..." : "📁 Local"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDrivePickerState({
                            isOpen: true,
                            title: "Select Start Menu Logo from Google Drive",
                            targetSlot: "startLogo",
                          })
                        }
                        className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-3 py-2 rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                      >
                        <span>☁️ Drive</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 1.2 SEARCH BAR CONFIGURATION */}
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e3a8a] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <div>
                  <h3 className="font-bold text-white text-sm">Windows Search Bar</h3>
                  <p className="text-xs text-white/60">Configure search bar pill/capsule style, placeholder label, and icon tint.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer bg-[#0e214d] px-3 py-1.5 rounded border border-[#1e40af]">
                <input
                  type="checkbox"
                  checked={settings.left.showSearchBar}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      left: { ...prev.left, showSearchBar: e.target.checked },
                    }))
                  }
                  className="rounded text-[#38bdf8]"
                />
                <span>Enable Search Bar</span>
              </label>
            </div>

            {settings.left.showSearchBar && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Placeholder Text</label>
                  <input
                    type="text"
                    value={settings.left.searchPlaceholder || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        left: { ...prev.left, searchPlaceholder: e.target.value },
                      }))
                    }
                    placeholder="Search"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Search Bar Style</label>
                  <select
                    value={settings.left.searchStyle}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        left: { ...prev.left, searchStyle: e.target.value as any },
                      }))
                    }
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  >
                    <option value="capsule">Capsule Rounded-Full (Windows 11)</option>
                    <option value="pill">Pill Rounded-MD (Compact)</option>
                    <option value="compactIcon">Icon Only (Circle Button)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Search Icon Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.left.searchIconColor || "#38bdf8"}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          left: { ...prev.left, searchIconColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded border border-white/30 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.left.searchIconColor || "#38bdf8"}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          left: { ...prev.left, searchIconColor: e.target.value },
                        }))
                      }
                      className="flex-1 bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 1.3 LIVE WEATHER REPORT WIDGET CONFIGURATION */}
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e3a8a] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⛅</span>
                <div>
                  <h3 className="font-bold text-white text-sm">Live Weather Report Widget</h3>
                  <p className="text-xs text-white/60">Configure taskbar weather chip, custom location name override, temperature format, and live badge.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer bg-[#0e214d] px-3 py-1.5 rounded border border-[#1e40af]">
                <input
                  type="checkbox"
                  checked={settings.left.showWeatherWidget}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      left: { ...prev.left, showWeatherWidget: e.target.checked },
                    }))
                  }
                  className="rounded text-[#38bdf8]"
                />
                <span>Enable Weather Widget</span>
              </label>
            </div>

            {settings.left.showWeatherWidget && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Location Name Display</label>
                  <input
                    type="text"
                    value={settings.left.weatherLocationOverride || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        left: { ...prev.left, weatherLocationOverride: e.target.value },
                      }))
                    }
                    placeholder="Trichy, IN (or leave empty for dynamic)"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Display Layout Mode</label>
                  <select
                    value={settings.left.weatherDisplayMode}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        left: { ...prev.left, weatherDisplayMode: e.target.value as any },
                      }))
                    }
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  >
                    <option value="full">Full (Icon + Temp + City)</option>
                    <option value="tempOnly">Compact (Icon + Temp)</option>
                    <option value="iconOnly">Minimal (Icon Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Temperature Unit</label>
                  <select
                    value={settings.left.tempUnit}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        left: { ...prev.left, tempUnit: e.target.value as any },
                      }))
                    }
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  >
                    <option value="celsius">Celsius (°C)</option>
                    <option value="fahrenheit">Fahrenheit (°F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Live Status Badge</label>
                  <input
                    type="text"
                    value={settings.left.customWeatherBadge || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        left: { ...prev.left, customWeatherBadge: e.target.value },
                      }))
                    }
                    placeholder="LIVE"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SAVE BUTTON FOR LEFT SETTINGS */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveSettings()}
              disabled={isSavingSettings}
              className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-6 py-2.5 rounded text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
            >
              💾 {isSavingSettings ? "Saving..." : "Save Start, Search & Weather Details"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: CENTER PINNED APP ICONS (Full CRUD, Placement & Reorder)       */}
      {/* ========================================================================= */}
      {activeSubTab === "center" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center bg-[#0b1739] p-4 rounded-lg border border-[#1e3a8a] gap-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>📌</span> Pinned App Icons ({icons.length})
              </h3>
              <p className="text-xs text-white/60">Manage shortcuts, add custom apps, change placement (Left, Center, Right), or set notification badges.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white px-3 py-2 rounded text-xs font-bold transition-all border border-[#334155] flex items-center gap-1.5 cursor-pointer"
                title="Reset to 5 default Windows 11 apps"
              >
                <span>🔄</span> Reset to Default
              </button>
              <button
                type="button"
                onClick={handleAddNew}
                className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-4 py-2 rounded text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer"
              >
                <span>➕</span> Pin New App Icon
              </button>
            </div>
          </div>

          {/* ICONS LIST TABLE */}
          <div className="bg-[#0b1739] rounded-lg border border-[#1e3a8a] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white">
                <thead className="bg-[#0e214d] text-[#38bdf8] uppercase text-[10px] tracking-wider border-b border-[#1e3a8a]">
                  <tr>
                    <th className="p-3 w-16 text-center">Order</th>
                    <th className="p-3 w-16 text-center">Icon</th>
                    <th className="p-3">Display Name / Tooltip</th>
                    <th className="p-3">Click Action Destination</th>
                    <th className="p-3 w-28 text-center">Placement</th>
                    <th className="p-3 w-20 text-center">Badge</th>
                    <th className="p-3 w-20 text-center">Status</th>
                    <th className="p-3 w-40 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e3a8a]/50 font-pixel">
                  {icons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-white/60">
                        No taskbar icons found. Click "Pin New App Icon" or "Reset to Default" above!
                      </td>
                    </tr>
                  ) : (
                    icons.map((icon, idx) => (
                      <tr key={icon.id} className="hover:bg-white/5 transition-colors">
                        {/* Order & Move Arrows */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleMove(idx, "left")}
                              disabled={idx === 0}
                              title="Move Left in Taskbar"
                              className="p-1 text-white/70 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
                            >
                              ⬅️
                            </button>
                            <span className="font-bold text-[#38bdf8]">{icon.order || idx + 1}</span>
                            <button
                              onClick={() => handleMove(idx, "right")}
                              disabled={idx === icons.length - 1}
                              title="Move Right in Taskbar"
                              className="p-1 text-white/70 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
                            >
                              ➡️
                            </button>
                          </div>
                        </td>

                        {/* Icon Graphic */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center p-1.5 bg-[#071329] rounded border border-white/10 w-9 h-9 mx-auto">
                            {renderTaskbarIconGraphic(icon.iconImage, 22)}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="p-3">
                          <div className="font-bold text-white">{icon.name}</div>
                          <div className="text-[10px] text-white/50">{icon.iconImage}</div>
                        </td>

                        {/* Destination */}
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0e214d] border border-[#1e40af] text-[#93c5fd] mr-2">
                            {icon.destinationType}
                          </span>
                          <span className="text-white/80 font-mono text-[11px] truncate max-w-[160px] inline-block align-middle">
                            {icon.destination}
                          </span>
                        </td>

                        {/* Placement Zone */}
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${
                            icon.placement === "left"
                              ? "bg-amber-950/80 text-amber-300 border-amber-700"
                              : icon.placement === "right"
                              ? "bg-purple-950/80 text-purple-300 border-purple-700"
                              : "bg-blue-950/80 text-blue-300 border-blue-700"
                          }`}>
                            {icon.placement || "Center (Default)"}
                          </span>
                        </td>

                        {/* Notification Badge */}
                        <td className="p-3 text-center">
                          {icon.badge ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#e11d48] text-white border border-white/30">
                              {icon.badge}
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>

                        {/* Status (Visible / Hidden) */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleVisible(icon)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              icon.visible !== false
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                            }`}
                          >
                            {icon.visible !== false ? "Visible" : "Hidden"}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(icon)}
                            className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors shadow-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setIconToDelete(icon)}
                            className="bg-[#e11d48] hover:bg-[#f43f5e] text-white px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors shadow-sm inline-flex items-center gap-1"
                          >
                            <span>🗑️</span> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: SYSTEM TRAY & CLOCK (Styling & Configuration)                  */}
      {/* ========================================================================= */}
      {activeSubTab === "right" && (
        <div className="space-y-6">
          {/* 3.1 WI-FI, VOLUME & BATTERY ICONS */}
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="border-b border-[#1e3a8a] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>📶</span> System Tray Indicators (Wi-Fi, Sound & Battery)
              </h3>
              <p className="text-xs text-white/60">Toggle system tray controls, customize battery level, and configure tray popup strings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* WI-FI CARD */}
              <div className="bg-[#071329] p-4 rounded border border-[#1e3a8a] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>📶</span> Wi-Fi Indicator
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.right.showWifi}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, showWifi: e.target.checked },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">Network Connection Label</label>
                  <input
                    type="text"
                    value={settings.right.wifiLabel || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, wifiLabel: e.target.value },
                      }))
                    }
                    placeholder="Connected (Fiber 1Gbps)"
                    className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-1.5 text-white text-xs"
                  />
                </div>
              </div>

              {/* VOLUME CARD */}
              <div className="bg-[#071329] p-4 rounded border border-[#1e3a8a] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>🔊</span> Volume / Speaker
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.right.showVolume}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, showVolume: e.target.checked },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">
                    Default Volume Level ({settings.right.defaultVolume ?? 100}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.right.defaultVolume ?? 100}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, defaultVolume: Number(e.target.value) },
                      }))
                    }
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* BATTERY CARD */}
              <div className="bg-[#071329] p-4 rounded border border-[#1e3a8a] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>🔋</span> Battery Status
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.right.showBattery}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, showBattery: e.target.checked },
                      }))
                    }
                    className="rounded text-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">
                    Battery Percentage ({settings.right.batteryPercentage ?? 100}%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.right.batteryPercentage ?? 100}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, batteryPercentage: Number(e.target.value) },
                      }))
                    }
                    className="w-full bg-[#0b1739] border border-[#1e3a8a] rounded p-1.5 text-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3.2 CLOCK, TIME, DATE & LOCATION SUBTITLE */}
          <div className="bg-[#0b1739] p-5 rounded-lg border border-[#1e3a8a] space-y-4">
            <div className="border-b border-[#1e3a8a] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>🕒</span> Taskbar Clock, Date & Location Subtitle
              </h3>
              <p className="text-xs text-white/60">Customize clock display mode (real-time live vs fixed time), date format, and the location badge text below the time.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Clock Mode</label>
                <select
                  value={settings.right.clockMode}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      right: { ...prev.right, clockMode: e.target.value as any },
                    }))
                  }
                  className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="realtime">⏱️ Real-Time Dynamic (Current Local Clock)</option>
                  <option value="custom">📌 Custom Fixed Time Text</option>
                </select>
              </div>

              {settings.right.clockMode === "custom" ? (
                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Custom Time Text</label>
                  <input
                    type="text"
                    value={settings.right.customTimeStr || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, customTimeStr: e.target.value },
                      }))
                    }
                    placeholder="10:30 AM"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Time Format</label>
                  <select
                    value={settings.right.timeFormat}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, timeFormat: e.target.value as any },
                      }))
                    }
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  >
                    <option value="12h">12-Hour (e.g. 10:30 AM)</option>
                    <option value="24h">24-Hour (e.g. 22:30)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Date Display Format</label>
                <select
                  value={settings.right.dateFormat}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      right: { ...prev.right, dateFormat: e.target.value as any },
                    }))
                  }
                  className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38bdf8] mb-1.5">Location Subtitle Text</label>
                <input
                  type="text"
                  value={settings.right.locationSubtitleText || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      right: { ...prev.right, locationSubtitleText: e.target.value },
                    }))
                  }
                  placeholder="Trichy, IN"
                  className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                />
              </div>
            </div>

            {/* 3.3 SYSTEM TRAY POPUP TEXTS */}
            <div className="pt-3 border-t border-[#1e3a8a]/60">
              <h4 className="text-xs font-bold text-white mb-2">System Tray Popup Customization (When clicked)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">Tray Popup Header</label>
                  <input
                    type="text"
                    value={settings.right.trayTitle || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, trayTitle: e.target.value },
                      }))
                    }
                    placeholder="SYSTEM CONTROLS"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">Tray Subtitle Tag</label>
                  <input
                    type="text"
                    value={settings.right.traySubtitle || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, traySubtitle: e.target.value },
                      }))
                    }
                    placeholder="8-Bit Mode"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">Power Plan Name</label>
                  <input
                    type="text"
                    value={settings.right.powerPlanName || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        right: { ...prev.right, powerPlanName: e.target.value },
                      }))
                    }
                    placeholder="High Performance"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-1.5 text-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON FOR RIGHT SETTINGS */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveSettings()}
              disabled={isSavingSettings}
              className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-6 py-2.5 rounded text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
            >
              💾 {isSavingSettings ? "Saving..." : "Save System Tray & Clock Details"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PIN / EDIT TASKBAR APP ICON (WITH PLACEMENT SELECTOR)              */}
      {/* ========================================================================= */}
      {isModalOpen && editingIcon && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#0b1739] border-2 border-[#38bdf8] rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 text-white space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#1e3a8a] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📌</span>
                <h3 className="font-bold text-white text-base">
                  {editingIcon.id ? "Edit Taskbar App Icon" : "Pin New App Icon to Taskbar"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIcon} className="space-y-4 text-xs font-pixel">
              {/* Preset Icon Selector */}
              <div>
                <label className="block text-xs font-bold text-[#38bdf8] mb-2">
                  Choose Pixel Art Preset or Upload Custom Image:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 bg-[#071329] rounded border border-[#1e3a8a]">
                  {TASKBAR_PRESETS.map((preset) => {
                    const isSelected = editingIcon.iconImage === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setEditingIcon((prev) => ({
                            ...prev,
                            iconImage: preset.id,
                            name: prev?.name === "New Taskbar App" ? preset.name : prev?.name,
                            destinationType: preset.type as any,
                            destination: preset.defaultDest,
                          }));
                        }}
                        className={`flex flex-col items-center gap-1 p-2 rounded transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#2563eb]/40 border-2 border-[#38bdf8] text-white"
                            : "bg-[#0c1e4a] hover:bg-[#1e3a8a] border border-white/10 text-white/80"
                        }`}
                      >
                        <div className="w-7 h-7 flex items-center justify-center">
                          {renderTaskbarIconGraphic(preset.id, 24)}
                        </div>
                        <span className="text-[9px] truncate w-full text-center">{preset.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image Upload Option */}
              <div className="bg-[#071329] p-3 rounded border border-dashed border-[#38bdf8]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-[11px]">Upload Custom Icon Graphic (PNG / SVG / JPG)</span>
                  {editingIcon.iconImage && (editingIcon.iconImage.startsWith("http") || editingIcon.iconImage.startsWith("/uploads/")) && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">Custom Active</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="text"
                    value={editingIcon.iconImage || ""}
                    onChange={(e) => setEditingIcon((prev) => ({ ...prev, iconImage: e.target.value }))}
                    placeholder="Image URL or click upload button..."
                    className="flex-1 bg-[#0b1739] border border-[#1e3a8a] rounded p-2 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 py-2 rounded font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {isUploading ? "Uploading..." : "📁 Local"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDrivePickerState({
                        isOpen: true,
                        title: "Select Pinned Icon Graphic from Google Drive",
                        targetSlot: "pinnedIcon",
                      })
                    }
                    className="bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-3 py-2 rounded font-bold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                  >
                    <span>☁️ Drive</span>
                  </button>
                </div>
              </div>

              {/* Display Name & Notification Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white mb-1">Display Name (Tooltip Label)</label>
                  <input
                    type="text"
                    value={editingIcon.name || ""}
                    onChange={(e) => setEditingIcon((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g. AI Video Studio"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-white mb-1">Notification Badge (Optional)</label>
                  <input
                    type="text"
                    value={editingIcon.badge || ""}
                    onChange={(e) => setEditingIcon((prev) => ({ ...prev, badge: e.target.value }))}
                    placeholder="e.g. NEW, 3, ★"
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white"
                  />
                </div>
              </div>

              {/* Taskbar Section Placement & Destination Action Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#38bdf8] mb-1">Taskbar Section Placement</label>
                  <select
                    value={editingIcon.placement || "default"}
                    onChange={(e) => setEditingIcon((prev) => ({ ...prev, placement: e.target.value as any }))}
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white"
                  >
                    <option value="default">Use Global Pinned Apps Position</option>
                    <option value="left">Left Section (Left of center)</option>
                    <option value="center">Center Section (Middle dock)</option>
                    <option value="right">Right Section (Next to system tray)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-white mb-1">Click Action Type</label>
                  <select
                    value={editingIcon.destinationType}
                    onChange={(e) =>
                      setEditingIcon((prev) => ({
                        ...prev,
                        destinationType: e.target.value as any,
                        destination:
                          e.target.value === "existingWindow"
                            ? "portfolio"
                            : e.target.value === "project"
                            ? projects[0]?.id || ""
                            : "https://",
                      }))
                    }
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white"
                  >
                    <option value="existingWindow">Desktop Window (Portfolio, Projects, About, Skills, etc.)</option>
                    <option value="project">Specific Project Showcase Modal</option>
                    <option value="externalLink">External Web Link</option>
                  </select>
                </div>
              </div>

              {/* Destination Target & Open Behavior */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white mb-1">Destination Target</label>
                  {editingIcon.destinationType === "existingWindow" ? (
                    <select
                      value={editingIcon.destination}
                      onChange={(e) => setEditingIcon((prev) => ({ ...prev, destination: e.target.value }))}
                      className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white"
                    >
                      <option value="portfolio">Portfolio (Main Window)</option>
                      <option value="projects">Projects (File Explorer)</option>
                      <option value="about">About & Bio (Browser)</option>
                      <option value="skills">Skills & Tools Grid</option>
                      <option value="experience">Work Experience</option>
                      <option value="contact">Contact & Socials</option>
                      <option value="googleDrive">Google Drive Cloud Storage</option>
                      <option value="recycleBin">Recycle Bin</option>
                    </select>
                  ) : editingIcon.destinationType === "project" ? (
                    <select
                      value={editingIcon.destination}
                      onChange={(e) => setEditingIcon((prev) => ({ ...prev, destination: e.target.value }))}
                      className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.category})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="url"
                      value={editingIcon.destination || ""}
                      onChange={(e) => setEditingIcon((prev) => ({ ...prev, destination: e.target.value }))}
                      placeholder="https://example.com"
                      required
                      className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-white mb-1">Open Link In</label>
                  <select
                    value={editingIcon.openBehavior || "sameWindow"}
                    onChange={(e) =>
                      setEditingIcon((prev) => ({
                        ...prev,
                        openBehavior: e.target.value as any,
                      }))
                    }
                    className="w-full bg-[#071329] border border-[#1e3a8a] rounded p-2 text-white"
                  >
                    <option value="sameWindow">Same Window / Tab</option>
                    <option value="newTab">New Browser Tab (_blank)</option>
                  </select>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="iconVisibleToggle"
                  checked={editingIcon.visible !== false}
                  onChange={(e) => setEditingIcon((prev) => ({ ...prev, visible: e.target.checked }))}
                  className="rounded text-[#38bdf8]"
                />
                <label htmlFor="iconVisibleToggle" className="font-bold text-white cursor-pointer">
                  Visible on Live Taskbar
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#1e3a8a]">
                {editingIcon.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      const iconObj = icons.find((i) => i.id === editingIcon.id) || (editingIcon as TaskbarIcon);
                      setIconToDelete(iconObj);
                    }}
                    className="bg-[#e11d48] hover:bg-[#f43f5e] text-white px-3.5 py-2 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>🗑️</span> Delete Icon
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-[#1e293b] hover:bg-[#334155] text-white px-4 py-2 rounded text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-5 py-2 rounded text-xs font-bold cursor-pointer transition-colors shadow"
                  >
                    {editingIcon.id ? "Update Pinned App" : "Pin to Taskbar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Taskbar Icon Confirmation Modal */}
      {iconToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0b1739] border-2 border-[#e11d48] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 border-b border-[#1e3a8a] pb-3 text-white">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-bold text-base text-[#f43f5e]">Remove Taskbar Icon?</h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to remove the pinned icon{" "}
              <span className="font-bold text-[#38bdf8]">"{iconToDelete.name}"</span> from your taskbar? This change will be saved instantly and synced to your live website.
            </p>
            <div className="bg-[#071329] p-3 rounded-lg border border-[#1e3a8a] flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center bg-[#0c1e4a] rounded border border-white/10 shrink-0">
                {renderTaskbarIconGraphic(iconToDelete.iconImage || "taskview", 22)}
              </div>
              <div className="text-xs min-w-0 flex-1">
                <div className="font-bold text-white truncate">{iconToDelete.name}</div>
                <div className="text-[10px] text-white/50 truncate">Destination: {iconToDelete.destination || "portfolio"} ({iconToDelete.destinationType})</div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIconToDelete(null)}
                className="bg-[#1e293b] hover:bg-[#334155] text-white px-4 py-2 rounded text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(iconToDelete.id)}
                className="bg-[#e11d48] hover:bg-[#f43f5e] text-white px-4 py-2 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md"
              >
                <span>🗑️</span> Yes, Remove Icon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Taskbar Icons Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0b1739] border-2 border-[#eab308] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 border-b border-[#1e3a8a] pb-3 text-white">
              <span className="text-2xl">🔄</span>
              <h3 className="font-bold text-base text-[#facc15]">Reset Taskbar Icons?</h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to reset all pinned app icons to the default 5 Windows 11 applications (Portfolio, Projects, About, Google Drive, Skills)?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="bg-[#1e293b] hover:bg-[#334155] text-white px-4 py-2 rounded text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  handleResetIcons();
                }}
                className="bg-[#eab308] hover:bg-[#ca8a04] text-black px-4 py-2 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md"
              >
                <span>🔄</span> Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Picker for Start Logo & Pinned Icons */}
      {drivePickerState.isOpen && (
        <GoogleDrivePickerModal
          isOpen={drivePickerState.isOpen}
          title={drivePickerState.title}
          allowedTypes="images"
          targetSlotLabel={drivePickerState.targetSlot === "startLogo" ? "Start Menu Logo" : "Pinned Taskbar Icon"}
          onNotification={onShowNotification}
          onClose={() => setDrivePickerState((prev) => ({ ...prev, isOpen: false }))}
          onSelect={(media) => {
            if (drivePickerState.targetSlot === "startLogo") {
              setSettings((prev) => ({
                ...prev,
                left: { ...prev.left, startIconCustomUrl: media.url },
              }));
              onShowNotification("Start Menu logo updated from Google Drive!");
            } else {
              setEditingIcon((prev) => (prev ? { ...prev, iconImage: media.url } : null));
              onShowNotification("Pinned taskbar icon graphic attached from Google Drive!");
            }
            setDrivePickerState((prev) => ({ ...prev, isOpen: false }));
          }}
        />
      )}
    </div>
  );
};
