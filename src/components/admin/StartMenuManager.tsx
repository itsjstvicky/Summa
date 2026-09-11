import React, { useState, useEffect, useRef } from "react";
import { getValidImageUrl } from "../MainWindow";
import {
  StartMenuSettings,
  StartMenuPinnedApp,
  StartMenuRecommendedItem,
  Project,
  Skill,
  PortfolioInfo,
} from "../../types";
import {
  DEFAULT_START_MENU_SETTINGS,
  DEFAULT_PINNED_APPS,
  DEFAULT_RECOMMENDED_ITEMS,
  Windows11StartMenu,
} from "../Windows11StartMenu";
import { GoogleDrivePickerModal } from "./GoogleDrivePickerModal";
import {
  saveLocalMasterBackup,
  syncWithServer,
  getLocalMasterBackup,
} from "../../services/persistenceService";
import {
  saveTaskbarSettingsToFirestore,
  fetchTaskbarSettingsFromFirestore,
  IS_FIREBASE_CONNECTED,
} from "../../services/firebaseService";
import {
  Sparkles,
  Search,
  Power,
  User,
  Image as ImageIcon,
  Cloud,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  RotateCcw,
  RefreshCw,
  Save,
  Palette,
  Layout,
  Layers,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { PixelAvatar } from "../PixelIcons";

interface StartMenuManagerProps {
  initialSettings?: StartMenuSettings;
  projects?: Project[];
  skills?: Skill[];
  portfolio?: PortfolioInfo;
  token: string;
  onNotification: (msg: string, type?: "success" | "error") => void;
  onSaveSuccess?: (updated: StartMenuSettings) => void;
}

export const StartMenuManager: React.FC<StartMenuManagerProps> = ({
  initialSettings,
  projects = [],
  skills = [],
  portfolio = {
    greeting: "HI, I'M",
    name: "VIGNESH",
    role: "DIGITAL CREATOR & DESIGNER",
    shortBio: "",
    longBio: "",
    location: "TRICHY, INDIA",
    locationText: "BASED IN TRICHY, INDIA",
    availabilityText: "AVAILABLE FOR FREELANCE",
    isAvailable: true,
    ctaText: "EXPLORE MY WORK",
    ctaLink: "#projects",
    profileImage: "",
    tagline: "Turning ideas into pixel perfect experiences.",
  },
  token,
  onNotification,
  onSaveSuccess,
}) => {
  const [settings, setSettings] = useState<StartMenuSettings>(() => ({
    ...DEFAULT_START_MENU_SETTINGS,
    ...(initialSettings || {}),
    pinnedApps: Array.isArray(initialSettings?.pinnedApps) ? initialSettings.pinnedApps : DEFAULT_PINNED_APPS,
    recommendedItems: Array.isArray(initialSettings?.recommendedItems) ? initialSettings.recommendedItems : DEFAULT_RECOMMENDED_ITEMS,
  }));

  // Fetch current saved Start Menu settings on component mount
  useEffect(() => {
    const local = getLocalMasterBackup();
    if (local?.startMenu || local?.taskbarSettings?.startMenu) {
      const cached = local.startMenu || local.taskbarSettings.startMenu;
      setSettings((prev) => ({
        ...DEFAULT_START_MENU_SETTINGS,
        ...prev,
        ...cached,
        pinnedApps: Array.isArray(cached.pinnedApps) ? cached.pinnedApps : prev.pinnedApps,
        recommendedItems: Array.isArray(cached.recommendedItems) ? cached.recommendedItems : prev.recommendedItems,
      }));
    }

    const loadSettings = async () => {
      try {
        let loaded: any = null;
        if (IS_FIREBASE_CONNECTED) {
          const fsSettings = await fetchTaskbarSettingsFromFirestore();
          if (fsSettings?.startMenu) {
            loaded = fsSettings.startMenu;
          }
        }

        if (!loaded) {
          const res = await fetch("/api/start-menu");
          if (res.ok) {
            loaded = await res.json();
          }
        }

        if (loaded && typeof loaded === "object") {
          setSettings((prev) => ({
            ...DEFAULT_START_MENU_SETTINGS,
            ...prev,
            ...loaded,
            pinnedApps: Array.isArray(loaded.pinnedApps) ? loaded.pinnedApps : prev.pinnedApps,
            recommendedItems: Array.isArray(loaded.recommendedItems) ? loaded.recommendedItems : prev.recommendedItems,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch start menu settings:", err);
      }
    };

    loadSettings();
  }, []);

  const [activeTab, setActiveTab] = useState<"general" | "user" | "pinned" | "recommended" | "power">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Drive Picker Modal State
  const [drivePickerState, setDrivePickerState] = useState<{
    isOpen: boolean;
    title: string;
    target: "avatar" | "pinnedAppIcon" | "recItemIcon";
    targetId?: string;
  }>({
    isOpen: false,
    title: "Select Graphic from Google Drive",
    target: "avatar",
  });

  // Pinned App Editing Modal / State
  const [editingPinnedApp, setEditingPinnedApp] = useState<StartMenuPinnedApp | null>(null);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);

  // Deletion and Reset Confirmation Modals
  const [appToDelete, setAppToDelete] = useState<StartMenuPinnedApp | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Comprehensive Save / Persist Helper
  const persistStartMenuSettings = async (
    targetSettings: StartMenuSettings,
    successMessage: string = "Windows 11 Start Menu settings saved successfully!"
  ) => {
    setIsSaving(true);
    try {
      // 1. Direct save to /api/start-menu
      const resDirect = await fetch("/api/start-menu", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(targetSettings),
      });

      if (!resDirect.ok) throw new Error("Failed to save Start Menu settings");
      const directData = await resDirect.json();

      // 2. Also ensure taskbar settings bundle is synchronized
      let currentTb: any = {};
      try {
        const currentRes = await fetch("/api/taskbar-settings");
        if (currentRes.ok) currentTb = await currentRes.json();
      } catch {
        // ignore
      }

      const payload = {
        ...currentTb,
        startMenu: targetSettings,
      };

      await fetch("/api/taskbar-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});

      // 3. Save local instant backup
      saveLocalMasterBackup({
        startMenu: targetSettings,
        taskbarSettings: payload,
      });

      // 4. Save to Firestore if connected
      if (IS_FIREBASE_CONNECTED) {
        saveTaskbarSettingsToFirestore(payload).catch((e) => console.warn(e));
      }
      syncWithServer(token);

      onNotification(successMessage, "success");
      if (onSaveSuccess) onSaveSuccess(targetSettings);

      // Dispatch global update events so website live preview updates immediately
      window.dispatchEvent(
        new CustomEvent("start_menu_settings_updated", {
          detail: targetSettings,
        })
      );
      window.dispatchEvent(
        new CustomEvent("taskbar_settings_updated", {
          detail: directData.taskbarSettings || payload,
        })
      );
      window.dispatchEvent(
        new CustomEvent("cms_master_updated", {
          detail: {
            startMenu: targetSettings,
            taskbarSettings: payload,
          },
        })
      );
      window.dispatchEvent(new Event("storage"));
      localStorage.setItem("start_menu_refresh_trigger", Date.now().toString());
    } catch (err: any) {
      onNotification(err.message || "Failed to save settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Settings to Backend manually
  const handleSave = async () => {
    await persistStartMenuSettings(settings, "Windows 11 Start Menu settings saved & synced to live site!");
  };

  // Execute Reset to Defaults
  const executeResetToDefaults = async () => {
    setSettings(DEFAULT_START_MENU_SETTINGS);
    setIsResetConfirmOpen(false);
    await persistStartMenuSettings(DEFAULT_START_MENU_SETTINGS, "Start Menu reset to default settings & synced!");
  };

  // Upload Avatar File
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onNotification("Please select an image file (PNG, JPG, SVG, WebP)", "error");
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

          if (!res.ok) throw new Error("Avatar upload failed");
          const data = await res.json();

          const updatedSettings = {
            ...settings,
            userAvatarUrl: data.url,
            userAvatarStyle: "customImage" as const,
          };
          setSettings(updatedSettings);
          await persistStartMenuSettings(updatedSettings, "Profile avatar uploaded and updated!");
        } catch (err: any) {
          onNotification(err.message || "Upload failed", "error");
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        onNotification("File read failed", "error");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onNotification(err.message || "Upload failed", "error");
      setIsUploading(false);
    }
  };

  // Move Pinned App Order
  const handleMovePinnedApp = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.pinnedApps.length) return;

    const list = [...settings.pinnedApps];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // re-assign orders
    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    const updatedSettings = { ...settings, pinnedApps: reordered };
    setSettings(updatedSettings);
  };

  // Toggle Pinned App Visibility
  const handleTogglePinnedAppVisibility = (id: string) => {
    const updatedSettings = {
      ...settings,
      pinnedApps: settings.pinnedApps.map((a) => (a.id === id ? { ...a, visible: !a.visible } : a)),
    };
    setSettings(updatedSettings);
  };

  // Prompt Pinned App Deletion Modal
  const handleDeletePinnedAppPrompt = (app: StartMenuPinnedApp) => {
    setAppToDelete(app);
  };

  // Execute Pinned App Deletion
  const executeDeletePinnedApp = async (app: StartMenuPinnedApp) => {
    const filteredApps = settings.pinnedApps.filter((a) => a.id !== app.id);
    const updatedSettings: StartMenuSettings = {
      ...settings,
      pinnedApps: filteredApps,
    };
    setSettings(updatedSettings);
    setAppToDelete(null);
    if (isAppModalOpen && editingPinnedApp?.id === app.id) {
      setIsAppModalOpen(false);
      setEditingPinnedApp(null);
    }
    await persistStartMenuSettings(updatedSettings, `Pinned app "${app.name}" deleted and synced to live site!`);
  };

  // Add / Edit Pinned App
  const handleSavePinnedAppModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPinnedApp) return;

    let updatedPinnedApps: StartMenuPinnedApp[];
    if (settings.pinnedApps.some((a) => a.id === editingPinnedApp.id)) {
      updatedPinnedApps = settings.pinnedApps.map((a) => (a.id === editingPinnedApp.id ? editingPinnedApp : a));
    } else {
      updatedPinnedApps = [...settings.pinnedApps, editingPinnedApp];
    }

    const updatedSettings: StartMenuSettings = {
      ...settings,
      pinnedApps: updatedPinnedApps,
    };

    setSettings(updatedSettings);
    setIsAppModalOpen(false);
    const savedName = editingPinnedApp.name;
    setEditingPinnedApp(null);
    await persistStartMenuSettings(updatedSettings, `Pinned app "${savedName}" saved and synchronized!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a1738] p-4 rounded-xl border border-[#38bdf8]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#2563eb] text-white">
              <Sparkles size={16} />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white font-pixel">
              Windows 11 Start Menu Customizer
            </h2>
          </div>
          <p className="text-xs text-white/60 mt-1">
            Customize the look, search bar, user profile, Google Drive avatar, pinned apps grid, and recommended items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg font-pixel flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#2563eb] hover:bg-[#3b82f6] disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg font-bold font-pixel flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
          >
            <Save size={14} />
            <span>{isSaving ? "Saving..." : "Save Start Menu"}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout (Editor Controls on Left, Live Interactive Preview on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Controls & Sub-Tabs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Sub Navigation Bar */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#061026] rounded-xl border border-[#1e3a8a]">
            {[
              { id: "general", label: "🎨 Layout & Theme", icon: <Layout size={14} /> },
              { id: "user", label: "👤 User & Avatar", icon: <User size={14} /> },
              { id: "pinned", label: "📌 Pinned Apps", icon: <Layers size={14} /> },
              { id: "recommended", label: "⭐ Recommended", icon: <Sparkles size={14} /> },
              { id: "power", label: "⏻ Power Options", icon: <Power size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-pixel transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#2563eb] text-white font-bold shadow"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: General & Layout Settings */}
          {activeTab === "general" && (
            <div className="bg-[#0b1b3d] p-5 rounded-xl border border-[#1e3a8a] space-y-5">
              <h3 className="text-sm font-bold text-[#38bdf8] font-pixel flex items-center gap-2">
                <Layout size={16} />
                <span>Layout, Visual Theme &amp; Search Bar</span>
              </h3>

              {/* Start Menu Alignment */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white block">Menu Screen Placement</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "center", label: "Center Floating (Windows 11)", desc: "Floats centered above taskbar" },
                    { id: "left", label: "Left Aligned (Windows 10)", desc: "Floats on bottom-left corner" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, layout: opt.id as any }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        settings.layout === opt.id
                          ? "bg-[#1d4ed8]/30 border-[#38bdf8] text-white"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className="text-[10px] text-white/50">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Theme */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white block">Aesthetic Glass &amp; Background Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "acrylicDark", label: "Acrylic Dark", color: "bg-[#0e1f40]" },
                    { id: "acrylicLight", label: "Acrylic Light", color: "bg-slate-100 text-slate-900" },
                    { id: "cyberpunk", label: "Cyberpunk Neon", color: "bg-[#050b1a] text-cyan-300" },
                    { id: "pixelRetro", label: "Retro Pixel", color: "bg-[#0b1739]" },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, theme: theme.id as any }))}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        settings.theme === theme.id
                          ? "border-[#38bdf8] ring-2 ring-[#38bdf8]/40 bg-white/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className={`w-full h-8 rounded-lg ${theme.color} mb-1.5 border border-white/20`} />
                      <span className="text-[11px] font-bold text-white block truncate">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar Settings */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Top Search Bar</span>
                    <span className="text-[10px] text-white/50">
                      Live search filter for Pinned Apps, Projects, and Skills
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showSearchBar}
                    onChange={(e) => setSettings((p) => ({ ...p, showSearchBar: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#2563eb]"
                  />
                </div>

                {settings.showSearchBar && (
                  <div>
                    <label className="text-[11px] text-white/70 block mb-1">Search Placeholder Text</label>
                    <input
                      type="text"
                      value={settings.searchPlaceholder || ""}
                      onChange={(e) => setSettings((p) => ({ ...p, searchPlaceholder: e.target.value }))}
                      placeholder="Type here to search..."
                      className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: User Profile & Avatar Settings */}
          {activeTab === "user" && (
            <div className="bg-[#0b1b3d] p-5 rounded-xl border border-[#1e3a8a] space-y-5">
              <h3 className="text-sm font-bold text-[#38bdf8] font-pixel flex items-center gap-2">
                <User size={16} />
                <span>User Profile &amp; Avatar Customization</span>
              </h3>

              {/* Name and Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={settings.userName || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, userName: e.target.value }))}
                    placeholder={portfolio.name || "Vignesh"}
                    className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={settings.userTagline || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, userTagline: e.target.value }))}
                    placeholder="creator@portfolio.exe"
                    className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <label className="text-xs font-bold text-white block">Profile Avatar Graphic</label>
                <div className="flex items-center gap-4 p-3 bg-[#061026] rounded-xl border border-[#1e3a8a]">
                  {/* Current Avatar Preview */}
                  <div className="w-14 h-14 rounded-full border-2 border-[#38bdf8] bg-[#0284c7] overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                    {settings.userAvatarUrl ? (
                      <img
                        src={getValidImageUrl(settings.userAvatarUrl)}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : settings.userAvatarStyle === "pixelAvatar" ? (
                      <PixelAvatar className="w-full h-full" />
                    ) : (
                      <span className="text-xl font-bold font-pixel text-white">
                        {(settings.userName || portfolio.name || "V").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Actions to choose / upload avatar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Google Drive Picker */}
                    <button
                      type="button"
                      onClick={() =>
                        setDrivePickerState({
                          isOpen: true,
                          title: "Select Avatar from Google Drive",
                          target: "avatar",
                        })
                      }
                      className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                    >
                      <Cloud size={13} />
                      <span>☁️ Choose from Google Drive</span>
                    </button>

                    {/* Local File Upload */}
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      disabled={isUploading}
                      className="bg-[#1e3a8a] hover:bg-[#2563eb] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>{isUploading ? "Uploading..." : "📁 Local Upload"}</span>
                    </button>

                    {/* Pixel Art Preset */}
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((p) => ({
                          ...p,
                          userAvatarStyle: "pixelAvatar",
                          userAvatarUrl: "",
                        }))
                      }
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-pixel flex items-center gap-1 cursor-pointer"
                    >
                      <span>👾 Pixel Character</span>
                    </button>

                    {/* Initials badge preset */}
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((p) => ({
                          ...p,
                          userAvatarStyle: "initialsBadge",
                          userAvatarUrl: "",
                        }))
                      }
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-pixel flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔤 Initials</span>
                    </button>
                  </div>
                </div>

                {/* Direct Avatar Image URL input */}
                <div>
                  <label className="text-[11px] text-white/70 block mb-1">Or Paste Direct Image URL</label>
                  <input
                    type="text"
                    value={settings.userAvatarUrl || ""}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        userAvatarUrl: e.target.value,
                        userAvatarStyle: "customImage",
                      }))
                    }
                    placeholder="https://... / Google Drive photo URL"
                    className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Pinned Apps Manager */}
          {activeTab === "pinned" && (
            <div className="bg-[#0b1b3d] p-5 rounded-xl border border-[#1e3a8a] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#38bdf8] font-pixel flex items-center gap-2">
                    <Layers size={16} />
                    <span>Pinned Applications Grid ({settings.pinnedApps.length})</span>
                  </h3>
                  <p className="text-[11px] text-white/60">
                    Reorder, toggle visibility, customize destination, or add new apps.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingPinnedApp({
                      id: `pin-${Date.now()}`,
                      name: "New App",
                      iconImage: "projects",
                      destinationType: "existingWindow",
                      destination: "projects",
                      order: settings.pinnedApps.length + 1,
                      visible: true,
                      category: "Creative",
                    });
                    setIsAppModalOpen(true);
                  }}
                  className="bg-[#2563eb] hover:bg-[#3b82f6] text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow"
                >
                  <Plus size={14} />
                  <span>Add Pinned App</span>
                </button>
              </div>

              {/* Pinned Apps List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {settings.pinnedApps.map((app, idx) => (
                  <div
                    key={`${app.id}-${idx}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      app.visible !== false
                        ? "bg-[#061026] border-[#1e3a8a]"
                        : "bg-black/40 border-white/10 opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-[#38bdf8] w-5 text-center font-mono">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate block">{app.name}</span>
                          {app.badge && (
                            <span className="bg-[#2563eb] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              {app.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/50 block truncate">
                          Target: {app.destinationType} → {app.destination} ({app.category || "General"})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Move Up / Down */}
                      <button
                        onClick={() => handleMovePinnedApp(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-white/60 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <MoveUp size={13} />
                      </button>
                      <button
                        onClick={() => handleMovePinnedApp(idx, "down")}
                        disabled={idx === settings.pinnedApps.length - 1}
                        className="p-1 text-white/60 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <MoveDown size={13} />
                      </button>

                      {/* Toggle Visibility */}
                      <button
                        onClick={() => handleTogglePinnedAppVisibility(app.id)}
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          app.visible !== false ? "text-emerald-400 hover:bg-white/10" : "text-white/30"
                        }`}
                        title={app.visible !== false ? "Hide on Start Menu" : "Show on Start Menu"}
                      >
                        {app.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditingPinnedApp({ ...app });
                          setIsAppModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-[#38bdf8] hover:bg-white/10 cursor-pointer text-xs"
                      >
                        Edit
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeletePinnedAppPrompt(app)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Recommended Section Settings */}
          {activeTab === "recommended" && (
            <div className="bg-[#0b1b3d] p-5 rounded-xl border border-[#1e3a8a] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#38bdf8] font-pixel flex items-center gap-2">
                    <Sparkles size={16} />
                    <span>Recommended &amp; Recent Items</span>
                  </h3>
                  <p className="text-[11px] text-white/60">
                    Quick-access cards for featured projects and documents
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={settings.showRecommendedSection}
                  onChange={(e) => setSettings((p) => ({ ...p, showRecommendedSection: e.target.checked }))}
                  className="w-4 h-4 rounded text-[#2563eb]"
                />
              </div>

              {settings.showRecommendedSection && (
                <>
                  <div>
                    <label className="text-xs font-bold text-white block mb-1">Section Title</label>
                    <input
                      type="text"
                      value={settings.recommendedSectionTitle || ""}
                      onChange={(e) => setSettings((p) => ({ ...p, recommendedSectionTitle: e.target.value }))}
                      placeholder="Recommended"
                      className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-white block">Recommended Items (4 Max Displayed)</span>
                    {settings.recommendedItems.map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#061026] border border-[#1e3a8a]"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-xs font-bold text-white truncate block">{item.title}</span>
                          <span className="text-[10px] text-white/50 truncate block">
                            {item.subtitle} • {item.timestamp}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              recommendedItems: prev.recommendedItems.map((r) =>
                                r.id === item.id ? { ...r, visible: !r.visible } : r
                              ),
                            }));
                          }}
                          className="p-1 text-white/60 hover:text-white cursor-pointer"
                        >
                          {item.visible !== false ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 5: Power Options */}
          {activeTab === "power" && (
            <div className="bg-[#0b1b3d] p-5 rounded-xl border border-[#1e3a8a] space-y-4">
              <h3 className="text-sm font-bold text-[#38bdf8] font-pixel flex items-center gap-2">
                <Power size={16} />
                <span>Power Menu &amp; System Actions</span>
              </h3>

              <div className="space-y-3">
                {[
                  {
                    key: "showPowerButton",
                    label: "Show Power Button ⏻ on Start Menu",
                    desc: "Master toggle for bottom power flyout",
                  },
                  {
                    key: "showLockOption",
                    label: "Show 'Lock Desktop' Option",
                    desc: "Enables Windows 11 lock screen with clock and unlock trigger",
                  },
                  {
                    key: "showRestartOption",
                    label: "Show 'Restart OS' Option",
                    desc: "Reloads desktop portfolio and active sessions",
                  },
                  {
                    key: "showSleepOption",
                    label: "Show 'Sleep Mode' Option",
                    desc: "Closes start menu and enters low power idle visual",
                  },
                  {
                    key: "showAdminOption",
                    label: "Show 'Admin Dashboard' Shortcut",
                    desc: "Direct navigation to the /admin security portal",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#061026] border border-[#1e3a8a]"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{item.label}</span>
                      <span className="text-[10px] text-white/50">{item.desc}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={(settings as any)[item.key] !== false}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-[#2563eb] cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Live Start Menu Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-pixel flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#38bdf8]" />
              <span>Interactive Live Preview</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Live OS Simulation
            </span>
          </div>

          <div className="relative bg-[#060e22] border-2 border-[#1e3a8a] rounded-2xl p-3 flex items-center justify-center overflow-hidden min-h-[580px] shadow-2xl">
            {/* Embedded Live Start Menu Preview */}
            <div className="w-full max-w-[520px]">
              <Windows11StartMenu
                isOpen={true}
                isInlinePreview={true}
                onClose={() => {}}
                onOpenWindow={(id) => onNotification(`Preview Click: Opened "${id}" window`)}
                portfolio={portfolio}
                projects={projects}
                skills={skills}
                settingsOverride={settings}
                onLockDesktop={() => onNotification("Preview Click: Lock Desktop activated!")}
                onOpenAdmin={() => onNotification("Preview Click: Navigating to Admin Panel")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Pinned App Modal */}
      {isAppModalOpen && editingPinnedApp && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsAppModalOpen(false)}
        >
          <div
            className="bg-[#0b1b3d] border-2 border-[#38bdf8] rounded-2xl w-full max-w-md p-5 text-white space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1e3a8a] pb-3">
              <h3 className="text-sm font-bold text-white font-pixel">
                {settings.pinnedApps.some((a) => a.id === editingPinnedApp.id)
                  ? "Edit Pinned Application"
                  : "Add New Pinned App"}
              </h3>
              <button
                onClick={() => setIsAppModalOpen(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePinnedAppModal} className="space-y-3.5 text-xs">
              <div>
                <label className="text-white/80 block mb-1 font-bold">App Title</label>
                <input
                  type="text"
                  required
                  value={editingPinnedApp.name}
                  onChange={(e) => setEditingPinnedApp((p) => (p ? { ...p, name: e.target.value } : null))}
                  className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/80 block mb-1 font-bold">Destination Type</label>
                  <select
                    value={editingPinnedApp.destinationType}
                    onChange={(e) =>
                      setEditingPinnedApp((p) => (p ? { ...p, destinationType: e.target.value as any } : null))
                    }
                    className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-2.5 py-2 text-white"
                  >
                    <option value="existingWindow">System Window</option>
                    <option value="project">Featured Project</option>
                    <option value="externalLink">External URL</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/80 block mb-1 font-bold">Target Destination</label>
                  {editingPinnedApp.destinationType === "existingWindow" ? (
                    <select
                      value={editingPinnedApp.destination}
                      onChange={(e) =>
                        setEditingPinnedApp((p) => (p ? { ...p, destination: e.target.value } : null))
                      }
                      className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-2.5 py-2 text-white"
                    >
                      <option value="portfolio">Portfolio Desk</option>
                      <option value="about">About Me</option>
                      <option value="projects">Projects Hub</option>
                      <option value="skills">Skills &amp; Tech Stack</option>
                      <option value="experience">Experience</option>
                      <option value="googleDrive">Google Drive Hub</option>
                      <option value="contact">Contact &amp; Hire</option>
                      <option value="thisPC">This PC</option>
                      <option value="recycleBin">Recycle Bin</option>
                    </select>
                  ) : editingPinnedApp.destinationType === "project" ? (
                    <select
                      value={editingPinnedApp.destination}
                      onChange={(e) =>
                        setEditingPinnedApp((p) => (p ? { ...p, destination: e.target.value } : null))
                      }
                      className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-2.5 py-2 text-white"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editingPinnedApp.destination}
                      onChange={(e) =>
                        setEditingPinnedApp((p) => (p ? { ...p, destination: e.target.value } : null))
                      }
                      placeholder="https://example.com"
                      className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-white"
                    />
                  )}
                </div>
              </div>

              {/* Icon Image & Google Drive Selection */}
              <div>
                <label className="text-white/80 block mb-1 font-bold">App Icon Style / Source</label>
                <div className="flex items-center gap-2">
                  <select
                    value={
                      ["portfolio", "about", "projects", "skills", "experience", "googleDrive", "contact", "thisPC", "recycleBin", "paint", "video", "terminal"].includes(
                        editingPinnedApp.iconImage
                      )
                        ? editingPinnedApp.iconImage
                        : "custom"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "custom") {
                        setEditingPinnedApp((p) => (p ? { ...p, iconImage: val } : null));
                      }
                    }}
                    className="flex-1 bg-[#061026] border border-[#1e3a8a] rounded-lg px-2.5 py-2 text-white"
                  >
                    <option value="portfolio">Portfolio Windows Logo</option>
                    <option value="about">About User Shield</option>
                    <option value="projects">Folder Explorer</option>
                    <option value="skills">Skills Lightning</option>
                    <option value="experience">Briefcase</option>
                    <option value="googleDrive">Google Drive Cloud</option>
                    <option value="contact">Contact Mailbox</option>
                    <option value="thisPC">This PC Monitor</option>
                    <option value="recycleBin">Recycle Bin</option>
                    <option value="paint">Paint Palette (UX/UI)</option>
                    <option value="video">AI Video Cinema</option>
                    <option value="terminal">Command Terminal</option>
                    <option value="custom">Custom Image / Google Drive</option>
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      setDrivePickerState({
                        isOpen: true,
                        title: "Select Pinned App Icon from Google Drive",
                        target: "pinnedAppIcon",
                      })
                    }
                    className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 shadow"
                  >
                    <Cloud size={13} />
                    <span>☁️ Drive</span>
                  </button>
                </div>

                {editingPinnedApp.iconImage.startsWith("http") && (
                  <p className="text-[10px] text-emerald-400 mt-1 truncate">
                    Using Custom Image: {editingPinnedApp.iconImage}
                  </p>
                )}
              </div>

              {/* Optional Badge */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/80 block mb-1 font-bold">Badge Text (Optional)</label>
                  <input
                    type="text"
                    value={editingPinnedApp.badge || ""}
                    onChange={(e) => setEditingPinnedApp((p) => (p ? { ...p, badge: e.target.value } : null))}
                    placeholder="e.g. Featured / Hot"
                    className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/80 block mb-1 font-bold">Category</label>
                  <input
                    type="text"
                    value={editingPinnedApp.category || ""}
                    onChange={(e) => setEditingPinnedApp((p) => (p ? { ...p, category: e.target.value } : null))}
                    placeholder="Core / Creative / System"
                    className="w-full bg-[#061026] border border-[#1e3a8a] rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1e3a8a]">
                {settings.pinnedApps.some((a) => a.id === editingPinnedApp.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppToDelete(editingPinnedApp);
                    }}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 size={13} />
                    <span>Delete App</span>
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAppModalOpen(false);
                      setEditingPinnedApp(null);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-5 py-2 rounded-lg font-bold text-xs cursor-pointer shadow"
                  >
                    💾 Save App
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pinned App Deletion Confirmation Modal */}
      {appToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f2854] border-2 border-red-500 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-full bg-red-950/60 border border-red-500/40">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Pinned App?</h3>
                <p className="text-xs text-white/60">This app will be removed from the Windows 11 Start Menu</p>
              </div>
            </div>

            <div className="bg-[#071329] border border-[#1e40af] p-3 rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white/60">App Title:</span>
                <span className="font-bold text-white">{appToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Target:</span>
                <span className="text-[#38bdf8] font-mono text-[11px]">{appToDelete.destinationType} → {appToDelete.destination}</span>
              </div>
              {appToDelete.category && (
                <div className="flex justify-between">
                  <span className="text-white/60">Category:</span>
                  <span className="text-white/80">{appToDelete.category}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#1e40af]/60">
              <button
                type="button"
                onClick={() => setAppToDelete(null)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-xs rounded-lg font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeletePinnedApp(appToDelete)}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Trash2 size={13} />
                <span>Delete App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f2854] border-2 border-amber-500 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-full bg-amber-950/60 border border-amber-500/40">
                <RotateCcw size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Reset Start Menu Settings?</h3>
                <p className="text-xs text-white/60">Reset all Start Menu customizations and pinned apps to default</p>
              </div>
            </div>

            <div className="bg-[#071329] border border-[#1e40af] p-3 rounded-lg text-xs text-white/80">
              This will restore default Windows 11 pinned apps, acrylic dark theme, search bar settings, and standard profile styling.
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#1e40af]/60">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-xs rounded-lg font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeResetToDefaults}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <RotateCcw size={13} />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Picker Modal */}
      {drivePickerState.isOpen && (
        <GoogleDrivePickerModal
          isOpen={drivePickerState.isOpen}
          title={drivePickerState.title}
          allowedTypes="images"
          targetSlotLabel="Start Menu Graphic"
          onNotification={onNotification}
          onClose={() => setDrivePickerState((p) => ({ ...p, isOpen: false }))}
          onSelect={(media) => {
            if (drivePickerState.target === "avatar") {
              setSettings((prev) => ({
                ...prev,
                userAvatarUrl: media.url,
                userAvatarStyle: "customImage",
              }));
              onNotification("Profile avatar updated from Google Drive!", "success");
            } else if (drivePickerState.target === "pinnedAppIcon") {
              setEditingPinnedApp((prev) => (prev ? { ...prev, iconImage: media.url } : null));
              onNotification("App icon updated from Google Drive!", "success");
            }
            setDrivePickerState((p) => ({ ...p, isOpen: false }));
          }}
        />
      )}
    </div>
  );
};
