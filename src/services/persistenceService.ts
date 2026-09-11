// Central Master Persistence Engine for Vignesh UI Portfolio with Firebase Cloud Firestore
// Ensures all custom wallpapers, favicons, start menu, projects, and settings
// are permanently preserved in Firebase Cloud Firestore & local persistence.

import {
  savePortfolioToFirestore,
  saveProjectsToFirestore,
  saveSkillsToFirestore,
  saveExperiencesToFirestore,
  saveTaskbarSettingsToFirestore,
  saveTaskbarIconsToFirestore,
  saveWallpapersToFirestore,
  saveContactInfoToFirestore,
  saveDesktopIconsToFirestore,
  syncMasterStateToFirestore,
  fetchMasterStateFromFirestore,
  IS_FIREBASE_CONNECTED,
} from "./firebaseService";

const MASTER_STORAGE_KEY = "vignesh_portfolio_master_cms_state";
const REVISION_KEY = "vignesh_portfolio_cms_revision";

export interface MasterCMSState {
  version: number;
  timestamp: number;
  portfolio?: any;
  wallpaperConfig?: any;
  startMenu?: any;
  taskbarSettings?: any;
  taskbarIcons?: any[];
  desktopIcons?: any[];
  projects?: any[];
  skills?: any[];
  experiences?: any[];
  contact?: any;
}

// Get locally saved master backup
export function getLocalMasterBackup(): MasterCMSState | null {
  try {
    const raw = localStorage.getItem(MASTER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to read master backup from localStorage:", e);
    return null;
  }
}

// Save to local master backup with updated timestamp (strictly local storage to prevent cloud write exhaustion)
export function saveLocalMasterBackup(partialState: Partial<MasterCMSState>): MasterCMSState {
  try {
    const current = getLocalMasterBackup() || {
      version: 1,
      timestamp: Date.now(),
    };

    let updatedTaskbarSettings = partialState.taskbarSettings || current.taskbarSettings;
    if (partialState.startMenu) {
      updatedTaskbarSettings = {
        ...(updatedTaskbarSettings || {}),
        startMenu: {
          ...((updatedTaskbarSettings && updatedTaskbarSettings.startMenu) || {}),
          ...partialState.startMenu,
        },
      };
    }

    const updated: MasterCMSState = {
      ...current,
      ...partialState,
      taskbarSettings: updatedTaskbarSettings,
      version: (current.version || 1) + 1,
      timestamp: Date.now(),
    };

    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(REVISION_KEY, String(updated.timestamp));

    // Also backup individual items for quick isolated recovery
    if (partialState.wallpaperConfig) {
      localStorage.setItem("vignesh_portfolio_wallpapers_backup", JSON.stringify(partialState.wallpaperConfig));
    }
    if (partialState.portfolio?.faviconUrl) {
      localStorage.setItem("vignesh_portfolio_favicon_backup", partialState.portfolio.faviconUrl);
    }
    if (partialState.startMenu) {
      localStorage.setItem("vignesh_portfolio_startmenu_backup", JSON.stringify(partialState.startMenu));
    }
    if (updatedTaskbarSettings) {
      localStorage.setItem("vignesh_portfolio_taskbar_backup", JSON.stringify(updatedTaskbarSettings));
    }
    if (partialState.taskbarIcons) {
      localStorage.setItem("vignesh_portfolio_taskbar_icons", JSON.stringify(partialState.taskbarIcons));
    }
    if (partialState.desktopIcons) {
      localStorage.setItem("vignesh_portfolio_desktop_icons", JSON.stringify(partialState.desktopIcons));
    }

    return updated;
  } catch (e: any) {
    if (e && e.name === 'QuotaExceededError') {
      // Silently ignore quota limits to prevent spamming the console 
      // when users upload large base64 strings instead of URLs
    } else {
      console.warn("Failed to write master backup to localStorage:", e);
    }
    return {
      version: 1,
      timestamp: Date.now(),
      ...partialState,
    };
  }
}

// Synchronize with server and Firebase Firestore
export async function syncWithServer(token?: string): Promise<boolean> {
  try {
    const local = getLocalMasterBackup();
    if (!local) return false;

    // 1. Sync to Firebase Firestore
    if (IS_FIREBASE_CONNECTED) {
      syncMasterStateToFirestore(local).catch((e) =>
        console.warn("Firestore sync error:", e)
      );
    }

    // 2. Sync to Express Node Server
    const res = await fetch("/api/admin/sync-master", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(local),
    });

    // 3. Option 5: Sync to Google Drive Cloud Database (Quota-Free & Permanent)
    try {
      if (typeof window !== "undefined" && localStorage.getItem("google_drive_is_connected") === "true") {
        import("./googleDriveService").then(({ syncDatabaseToDrive }) => {
          syncDatabaseToDrive(local).catch((e) => console.warn("Google Drive DB auto-sync notice:", e));
        });
      }
    } catch {}

    return res.ok;
  } catch (err) {
    console.warn("Master sync error:", err);
    return false;
  }
}

// Export complete state to downloadable JSON file
export function exportCMSBackupFile(data: any, fileNamePrefix: string = "vignesh-portfolio-cms-backup") {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${fileNamePrefix}-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Safe API Fetch with automatic timeout, JSON parsing, and graceful fallback
export async function safeFetchJSON<T>(url: string, fallback: T, timeoutMs: number = 6000): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return fallback;
    }

    const data = await res.json();
    return (data !== null && data !== undefined) ? data : fallback;
  } catch (err) {
    return fallback;
  }
}
