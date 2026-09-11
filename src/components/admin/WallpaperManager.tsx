import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  WallpaperLibraryConfig,
  WallpaperCategory,
  DeviceType,
  WeatherStatusInfo
} from "../../types";
import {
  WALLPAPER_CATEGORIES,
  DEVICE_TYPES,
  getDeviceType,
  fetchLiveWeather,
  detectUserCurrentLocation,
  resolveWallpaperUrl
} from "../../services/weatherService";
import {
  initAuth,
  getAccessToken,
  uploadFileToDrive,
  getOrCreateAppFolder,
  isTokenExpired,
  isUserConnected,
  getCurrentUser,
  refreshGoogleTokenSilently,
  getDirectDriveMediaUrl,
  makeFilePublicReadable,
  makeAllDriveWallpapersPublic,
  googleSignIn,
  syncDatabaseToDrive,
  pullDatabaseFromDrive,
  syncWallpapersFromDriveFolder
} from "../../services/googleDriveService";
import { User } from "firebase/auth";
import { GoogleDrivePickerModal, SelectedDriveMedia } from "./GoogleDrivePickerModal";
import {
  saveLocalMasterBackup,
  getLocalMasterBackup,
  syncWithServer,
} from "../../services/persistenceService";
import {
  saveWallpapersToFirestore,
  fetchWallpapersFromFirestore,
  deleteWallpaperSlotFromFirestore,
  deleteWallpaperCategoryFromFirestore,
  isFirestoreWritePaused,
  IS_FIREBASE_CONNECTED
} from "../../services/firebaseService";

interface WallpaperManagerProps {
  token: string;
  onNotification: (msg: string, type?: "success" | "error") => void;
}

// Helper to optimize and convert images for mobile/desktop uploading
async function optimizeWallpaperFile(file: File): Promise<{ base64Data: string; sizeStr: string }> {
  // If SVG, return as-is
  if (file.type === "image/svg+xml") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        base64Data: reader.result as string,
        sizeStr: `${(file.size / 1024).toFixed(1)} KB`
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Optimize & resize large mobile camera photos/screenshots to max 1280px
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1280;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve({
          base64Data: reader.result as string,
          sizeStr: `${(file.size / 1024).toFixed(1)} KB`
        });
        reader.onerror = () => resolve({ base64Data: "", sizeStr: "0 KB" });
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = "image/jpeg";
      const quality = 0.65;
      const base64Data = canvas.toDataURL(mimeType, quality);
      const approxBytes = (base64Data.length * 3) / 4;
      const sizeStr = `${(approxBytes / 1024).toFixed(1)} KB`;

      resolve({ base64Data, sizeStr });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve({
        base64Data: reader.result as string,
        sizeStr: `${(file.size / 1024).toFixed(1)} KB`
      });
      reader.onerror = () => resolve({ base64Data: "", sizeStr: "0 KB" });
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

export const WallpaperManager: React.FC<WallpaperManagerProps> = ({ token, onNotification }) => {
  const [config, setConfig] = useState<WallpaperLibraryConfig>({
    wallpapers: {},
    fallbackUrl: "",
    fallbackFileName: "",
    fallbackLocation: {
      city: "Trichy, India",
      lat: 10.7905,
      lon: 78.7047
    },
    autoMode: true,
    manualCategory: "sunny",
    manualDevice: "desktop"
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatusInfo | null>(null);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false);

  // Testing / Preview selection
  const [previewCategory, setPreviewCategory] = useState<WallpaperCategory>("sunny");
  const [previewDevice, setPreviewDevice] = useState<DeviceType>("desktop");

  // Fallback location form state
  const [fallbackCity, setFallbackCity] = useState("Trichy, India");
  const [fallbackLat, setFallbackLat] = useState("10.7905");
  const [fallbackLon, setFallbackLon] = useState("78.7047");

  // Google Drive cloud storage connection state (Perpetual session)
  const [googleUser, setGoogleUser] = useState<any>(() => getCurrentUser());
  const [isDriveExpired, setIsDriveExpired] = useState(isTokenExpired());
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);

  // Google Drive Picker Modal state
  const [drivePickerSlot, setDrivePickerSlot] = useState<{
    category: WallpaperCategory;
    device: DeviceType;
    slotLabel: string;
  } | null>(null);

  // Stable notification callback ref to prevent infinite re-render loops
  const onNotificationRef = useRef(onNotification);
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  // Google Drive Folder Auto-Sync states
  const [isDriveFolderSyncing, setIsDriveFolderSyncing] = useState(false);
  const [driveAutoSyncEnabled, setDriveAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("vignesh_portfolio_drive_auto_sync");
      return saved !== "false";
    } catch {
      return true;
    }
  });
  const [lastDriveSyncTime, setLastDriveSyncTime] = useState<string>(() => {
    try {
      return localStorage.getItem("vignesh_portfolio_last_drive_sync") || "";
    } catch {
      return "";
    }
  });

  const handleSyncFromDriveFolder = async (isManualClick: boolean = true) => {
    if (isDriveFolderSyncing) return;
    setIsDriveFolderSyncing(true);

    try {
      if (isManualClick) {
        onNotificationRef.current("Searching Google Drive 'Portfolio Files/Wallpaper' for wallpapers...", "info");
      }
      const result = await syncWallpapersFromDriveFolder("Portfolio Files/Wallpaper");
      if (result.success) {
        setConfig(result.wallpaperConfig);
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastDriveSyncTime(timeStr);
        try {
          localStorage.setItem("vignesh_portfolio_last_drive_sync", timeStr);
        } catch {}

        if (isManualClick) {
          onNotificationRef.current(result.message, "success");
        }
      } else {
        if (isManualClick) {
          onNotificationRef.current(result.message, "info");
        }
      }
    } catch (err: any) {
      if (isManualClick) {
        onNotificationRef.current(err.message || "Drive folder sync failed", "error");
      }
    } finally {
      setIsDriveFolderSyncing(false);
    }
  };

  useEffect(() => {
    const unsub = initAuth(
      (u) => {
        setGoogleUser(u);
        setIsDriveExpired(isTokenExpired());
      },
      () => {
        if (!isUserConnected()) {
          setGoogleUser(null);
          setIsDriveExpired(false);
        }
      }
    );

    const checkExpiry = () => {
      setIsDriveExpired(isTokenExpired());
    };
    const interval = setInterval(checkExpiry, 15000);
    window.addEventListener("focus", checkExpiry);

    return () => {
      unsub();
      clearInterval(interval);
      window.removeEventListener("focus", checkExpiry);
    };
  }, []);

  // Background Auto-Sync: Immediately sync on mount, poll Drive folder every 30s & on window focus when enabled
  useEffect(() => {
    if (!googleUser || !driveAutoSyncEnabled) return;

    // Immediate initial sync after brief 1s settle
    const initialTimer = setTimeout(() => {
      handleSyncFromDriveFolder(false);
    }, 1000);

    const interval = setInterval(() => {
      handleSyncFromDriveFolder(false);
    }, 30000);

    const onFocus = () => {
      handleSyncFromDriveFolder(false);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [googleUser, driveAutoSyncEnabled]);

  // Fetch wallpaper library config
  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      let data: any = null;

      try {
        const res = await fetch("/api/wallpapers");
        if (res.ok) {
          data = await res.json();
        }
      } catch (fetchErr) {
        // Network or cold-boot delay, fallback to cached state
      }

      // If server fetch failed or returned empty wallpapers, check local storage backups
      const hasWallpapers = data?.wallpapers && Object.keys(data.wallpapers).length > 0;
      if (!hasWallpapers) {
        const localMaster = getLocalMasterBackup();
        if (localMaster?.wallpaperConfig?.wallpapers && Object.keys(localMaster.wallpaperConfig.wallpapers).length > 0) {
          data = { ...(data || {}), ...localMaster.wallpaperConfig };
        } else {
          try {
            const saved = localStorage.getItem("vignesh_portfolio_wallpapers_backup");
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?.wallpapers && Object.keys(parsed.wallpapers).length > 0) {
                data = { ...(data || {}), ...parsed };
              }
            }
          } catch {}
        }
      }

      // If wallpapers are still empty, auto-check Google Drive Master Database if connected
      const stillNoWallpapers = !data?.wallpapers || Object.keys(data.wallpapers).length === 0;
      if (stillNoWallpapers && isUserConnected()) {
        try {
          const pullRes = await pullDatabaseFromDrive(undefined, { onlyWallpaperConfig: true });
          if (pullRes.success && pullRes.data?.wallpaperConfig?.wallpapers && Object.keys(pullRes.data.wallpaperConfig.wallpapers).length > 0) {
            data = pullRes.data.wallpaperConfig;
            onNotificationRef.current("☁️ Auto-synced wallpapers from your Google Drive Master Database!", "success");
          }
        } catch (e) {}
      }

      if (data) {
        saveLocalMasterBackup({ wallpaperConfig: data });
        try { localStorage.setItem("vignesh_portfolio_wallpapers_backup", JSON.stringify(data)); } catch (e) {}

        setConfig(data);
        if (data.fallbackLocation) {
          setFallbackCity(data.fallbackLocation.city || "Trichy, India");
          setFallbackLat(String(data.fallbackLocation.lat ?? 10.7905));
          setFallbackLon(String(data.fallbackLocation.lon ?? 78.7047));
        }
        if (data.manualCategory) setPreviewCategory(data.manualCategory);
        if (data.manualDevice) setPreviewDevice(data.manualDevice);
      }
    } catch (err: any) {
      if (err && err.name === 'QuotaExceededError') {
        // Silently ignore quota
      } else {
        console.warn("Notice loading wallpaper configuration:", err?.message || err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();

    const handleDriveConnected = async () => {
      // When Google Drive connects on this device, check if we need to auto-restore from Drive
      try {
        const pullRes = await pullDatabaseFromDrive();
        if (pullRes.success && pullRes.data?.wallpaperConfig) {
          setConfig(pullRes.data.wallpaperConfig);
          onNotificationRef.current("☁️ Connected to Google Drive & loaded Master Wallpaper Backup!", "success");
        }
      } catch (e) {}
    };

    window.addEventListener("google_drive_connected", handleDriveConnected);
    return () => {
      window.removeEventListener("google_drive_connected", handleDriveConnected);
    };
  }, [fetchConfig]);

  // Refresh live real-world weather status
  const handleRefreshWeather = useCallback(async (isManualClick: boolean = false) => {
    setIsRefreshingWeather(true);
    try {
      // 1. Detect visitor's live GPS/IP location
      const detected = await detectUserCurrentLocation(
        Number(fallbackLat) || 10.7905,
        Number(fallbackLon) || 78.7047,
        fallbackCity || "Trichy, India"
      );

      const status = await fetchLiveWeather(detected.lat, detected.lon, detected.city, config, window.innerWidth);
      setWeatherStatus(status);
      if (isManualClick) {
        onNotificationRef.current(`Live weather updated for ${status.locationName}!`);
      }
    } catch (err: any) {
      if (isManualClick) {
        onNotificationRef.current(err.message || "Failed to fetch weather", "error");
      }
    } finally {
      setIsRefreshingWeather(false);
    }
  }, [fallbackLat, fallbackLon, fallbackCity, config]);

  // Use current live location (GPS/IP) to set fallback location
  const handleUseCurrentLiveLocation = async () => {
    setIsRefreshingWeather(true);
    try {
      const detected = await detectUserCurrentLocation(10.7905, 78.7047, "Trichy, India");
      setFallbackCity(detected.city);
      setFallbackLat(String(detected.lat));
      setFallbackLon(String(detected.lon));
      
      const updatedConfig = {
        ...config,
        fallbackLocation: {
          city: detected.city,
          lat: detected.lat,
          lon: detected.lon
        }
      };

      const res = await fetch("/api/wallpapers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) throw new Error("Failed to save location");
      const data = await res.json();
      setConfig(data.wallpaperConfig);
      broadcastWallpaperUpdate(data.wallpaperConfig);
      
      const status = await fetchLiveWeather(detected.lat, detected.lon, detected.city, data.wallpaperConfig, window.innerWidth);
      setWeatherStatus(status);
      onNotificationRef.current(`Location auto-detected and saved: ${detected.city} (${detected.source.toUpperCase()})`);
    } catch (err: any) {
      onNotificationRef.current(err.message || "Could not detect location", "error");
    } finally {
      setIsRefreshingWeather(false);
    }
  };

  const hasInitializedWeatherRef = useRef(false);
  useEffect(() => {
    if (!isLoading && !hasInitializedWeatherRef.current) {
      hasInitializedWeatherRef.current = true;
      handleRefreshWeather(false);
    }
  }, [isLoading, handleRefreshWeather]);

  // Upload or replace image for a slot
  const handleFileUpload = async (category: WallpaperCategory, device: DeviceType, file: File) => {
    const slotKey = `${category}_${device}`;
    setIsUploading(slotKey);

    try {
      // Validate file
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload a valid image file (PNG, JPG, WEBP, GIF)");
      }

      let finalUrl = "";
      let finalFileName = file.name;
      let finalFileSize = "Uploaded Image";
      let driveFileId = "";

      // 1. If Google Drive is connected, upload the file there directly!
      let driveToken = await getAccessToken();
      if (!driveToken && isUserConnected()) {
        driveToken = await refreshGoogleTokenSilently();
      }

      if (driveToken) {
        try {
          onNotification(`Uploading "${file.name}" to Google Drive...`, "info");
          const folder = await getOrCreateAppFolder("Portfolio Files/Wallpaper");
          const driveFile = await uploadFileToDrive(file, `${category}_${device}_${file.name}`, file.type, folder.id);
          
          // Make public so it can be streamed via proxy without issues
          try { await makeFilePublicReadable(driveFile.id); } catch (e) {}

          finalUrl = getDirectDriveMediaUrl(driveFile.id);
          finalFileSize = `${(file.size / 1024).toFixed(1)} KB (Drive)`;
          driveFileId = driveFile.id;
          
          onNotification(`☁️ Uploaded to Google Drive successfully!`, "success");
        } catch (driveErr: any) {
          console.warn("Drive upload failed, falling back to local base64:", driveErr);
        }
      }
      
      // 2. Fallback to Local Base64 if Drive is not connected or failed
      if (!finalUrl) {
        // Optimize and convert to base64
        const { base64Data, sizeStr } = await optimizeWallpaperFile(file);
        if (!base64Data) {
          throw new Error("Could not process the selected image.");
        }
        
        const res = await fetch("/api/wallpapers/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            category,
            device,
            imageBase64: base64Data,
            fileName: file.name,
            fileSize: sizeStr
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          if (res.status === 401) {
            throw new Error("Admin session expired. Please refresh the page and log in again.");
          }
          throw new Error(errorData?.error || `Upload failed with status ${res.status}`);
        }

        const data = await res.json();
        setConfig(data.wallpaperConfig);
        broadcastWallpaperUpdate(data.wallpaperConfig);
        onNotification(`Wallpaper updated for ${device}! (Connect Google Drive above to save directly to Drive storage)`, "success");
        setIsUploading(null);
        return; // Done
      }

      // 3. If we uploaded to Drive, we just update the config via PUT
      const updatedWallpapers = {
        ...config.wallpapers,
        [slotKey]: {
          url: finalUrl,
          fileName: finalFileName,
          fileSize: finalFileSize,
          updatedAt: new Date().toISOString(),
          driveFileId: driveFileId
        }
      };

      const updatedConfig = {
        ...config,
        wallpapers: updatedWallpapers,
      };

      const res = await fetch("/api/wallpapers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) throw new Error("Failed to save wallpaper configuration");

      const data = await res.json();
      const finalConfig = data.wallpaperConfig || updatedConfig;
      
      setConfig(finalConfig);
      broadcastWallpaperUpdate(finalConfig);
      onNotification(`✨ Uploaded & saved to Google Drive for ${category} (${device})!`, "success");

    } catch (err: any) {
      onNotification(err.message || "Upload error", "error");
    } finally {
      setIsUploading(null);
    }
  };

  // Assign a selected Google Drive image/video/file directly to a wallpaper slot
  const handleSelectDriveMedia = async (media: SelectedDriveMedia) => {
    if (!drivePickerSlot) return;
    const { category, device } = drivePickerSlot;
    const slotKey = `${category}_${device}`;
    setIsUploading(slotKey);

    try {
      const updatedWallpapers = {
        ...config.wallpapers,
        [slotKey]: {
          url: media.url,
          fileName: media.fileName,
          fileSize: media.fileSize || "Google Drive Asset",
          updatedAt: new Date().toISOString(),
          driveFileId: media.fileId
        }
      };

      const updatedConfig: WallpaperLibraryConfig = {
        ...config,
        wallpapers: updatedWallpapers,
        fallbackUrl: config.fallbackUrl || media.url,
        fallbackFileName: config.fallbackFileName || media.fileName
      };

      const res = await fetch("/api/wallpapers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) {
        throw new Error("Failed to save wallpaper configuration");
      }

      const data = await res.json();
      const finalConfig = data.wallpaperConfig || updatedConfig;
      setConfig(finalConfig);
      broadcastWallpaperUpdate(finalConfig);
      onNotification(`✨ Google Drive asset "${media.fileName}" attached to ${category} (${device})!`, "success");
    } catch (err: any) {
      onNotification(err.message || "Failed to attach Drive wallpaper", "error");
    } finally {
      setIsUploading(null);
      setDrivePickerSlot(null);
    }
  };

  // Export full JSON backup directly from Wallpaper Manager
  const handleExportBackup = async () => {
    try {
      const res = await fetch("/api/admin/export-all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to export backup");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-db.backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onNotification("📥 Backup downloaded! Keep this JSON file safe to restore all wallpapers & CMS settings anytime.", "success");
    } catch (e: any) {
      onNotification(e.message || "Failed to download backup", "error");
    }
  };

  // Sync to Google Drive Master Cloud Database (Option 5 - 100% Free & Quota-Free)
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const handleSyncDriveDatabase = async () => {
    setIsSyncingDrive(true);
    try {
      const res = await syncDatabaseToDrive({ wallpaperConfig: config });
      if (res.success) {
        onNotification("☁️ Master Wallpaper Database synced to Google Drive (Portfolio Files/portfolio-db.json)!", "success");
      } else {
        onNotification(res.error || "Please connect Google Drive to sync quota-free.", "error");
      }
    } catch (err: any) {
      onNotification(err.message || "Failed to sync to Google Drive", "error");
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Broadcast wallpaper changes to all tabs and live desktop
  const broadcastWallpaperUpdate = (cfg: WallpaperLibraryConfig) => {
    try {
      saveLocalMasterBackup({ wallpaperConfig: cfg });
      try { localStorage.setItem("vignesh_portfolio_wallpapers_backup", JSON.stringify(cfg)); } catch (e) {}

      // 1. Auto-sync to Google Drive Master Cloud Database if connected (100% Free, Quota-free)
      if (isUserConnected()) {
        syncDatabaseToDrive({ wallpaperConfig: cfg }).catch(() => {});
      }

      // 2. Sync to Firebase Firestore silently if connected & active (Never show quota errors)
      if (IS_FIREBASE_CONNECTED && !isFirestoreWritePaused()) {
        saveWallpapersToFirestore(cfg).catch(() => {});
      }

      syncWithServer(token);
      window.dispatchEvent(new CustomEvent("wallpaper_updated", { detail: cfg }));
      localStorage.setItem("wallpaper_refresh_trigger", Date.now().toString());
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("portfolio_wallpaper_channel");
        bc.postMessage({ type: "WALLPAPER_UPDATED", config: cfg });
        setTimeout(() => bc.close(), 100);
      }
    } catch (err) {
      console.warn("Broadcast error:", err);
    }
  };

  // Set specific slot as active live wallpaper immediately
  const handleSetAsLive = async (category: WallpaperCategory, device: DeviceType) => {
    try {
      const slotKey = `${category}_${device}`;
      const slot = config.wallpapers?.[slotKey];
      if (!slot?.url) {
        throw new Error("Please upload a wallpaper to this slot first.");
      }

      const updatedConfig = {
        ...config,
        autoMode: false,
        manualCategory: category,
        manualDevice: device,
        fallbackUrl: slot.url,
        fallbackFileName: slot.fileName
      };

      const res = await fetch("/api/wallpapers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) throw new Error("Failed to set as active wallpaper");
      const data = await res.json();
      setConfig(data.wallpaperConfig);
      broadcastWallpaperUpdate(data.wallpaperConfig);
      onNotification(`⚡ Set ${category} (${device}) as Active Live Wallpaper! Live site updated.`);
    } catch (err: any) {
      onNotification(err.message, "error");
    }
  };

  // Remove slot image
  const handleRemoveSlot = async (category: WallpaperCategory, device: DeviceType) => {
    const key = `${category}_${device}`;
    try {
      const res = await fetch(`/api/wallpapers/${category}/${device}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to delete wallpaper");
      const data = await res.json();
      const updatedConfig: WallpaperLibraryConfig = data.wallpaperConfig;
      
      // Update local state immediately
      setConfig(updatedConfig);

      // Clean local storage immediately so deleted slot cannot be resurrected
      try {
        localStorage.setItem("vignesh_portfolio_wallpapers_backup", JSON.stringify(updatedConfig));
      } catch {}
      try {
        saveLocalMasterBackup({ wallpaperConfig: updatedConfig });
      } catch {}

      // Delete from Firestore explicitly
      if (IS_FIREBASE_CONNECTED) {
        deleteWallpaperSlotFromFirestore(key).catch(() => {});
        saveWallpapersToFirestore(updatedConfig).catch(() => {});
      }

      broadcastWallpaperUpdate(updatedConfig);
      onNotification(`Removed ${category} (${device}) wallpaper`, "success");
    } catch (err: any) {
      onNotification(err.message || "Delete failed", "error");
    }
  };

  // Remove all device slots for an entire weather category
  const handleRemoveCategory = async (category: WallpaperCategory, categoryName: string) => {
    if (!window.confirm(`Are you sure you want to clear all uploaded wallpapers for ${categoryName}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/wallpapers/${category}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to delete category wallpapers");
      const data = await res.json();
      const updatedConfig: WallpaperLibraryConfig = data.wallpaperConfig;

      // Update local state immediately
      setConfig(updatedConfig);

      // Clean local storage immediately
      try {
        localStorage.setItem("vignesh_portfolio_wallpapers_backup", JSON.stringify(updatedConfig));
      } catch {}
      try {
        saveLocalMasterBackup({ wallpaperConfig: updatedConfig });
      } catch {}

      // Delete from Firestore explicitly
      if (IS_FIREBASE_CONNECTED) {
        deleteWallpaperCategoryFromFirestore(category).catch(() => {});
        saveWallpapersToFirestore(updatedConfig).catch(() => {});
      }

      broadcastWallpaperUpdate(updatedConfig);
      onNotification(`Removed all wallpapers for ${categoryName}`, "success");
    } catch (err: any) {
      onNotification(err.message || "Delete failed", "error");
    }
  };

  // Remove ALL uploaded wallpapers across all categories & devices
  const handleClearAllWallpapers = async () => {
    if (!window.confirm("Are you sure you want to delete ALL uploaded wallpapers from the portfolio? This will remove all 24 slots.")) {
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch("/api/wallpapers", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to delete all wallpapers");
      const data = await res.json();
      const updatedConfig: WallpaperLibraryConfig = data.wallpaperConfig || {
        ...config,
        wallpapers: {},
        fallbackUrl: "",
        fallbackFileName: ""
      };

      // Update local state immediately
      setConfig(updatedConfig);

      // Clean local storage immediately
      try {
        localStorage.removeItem("vignesh_portfolio_wallpapers_backup");
      } catch {}
      try {
        saveLocalMasterBackup({ wallpaperConfig: updatedConfig });
      } catch {}

      // Delete from Firestore
      if (IS_FIREBASE_CONNECTED) {
        saveWallpapersToFirestore(updatedConfig).catch(() => {});
      }

      broadcastWallpaperUpdate(updatedConfig);
      onNotification("All wallpapers have been deleted successfully!", "success");
    } catch (err: any) {
      onNotification(err.message || "Delete failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Mode (AUTO vs MANUAL)
  const handleToggleAutoMode = async (auto: boolean) => {
    try {
      const updatedConfig = {
        ...config,
        autoMode: auto,
        manualCategory: previewCategory,
        manualDevice: previewDevice
      };

      const res = await fetch("/api/wallpapers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) throw new Error("Failed to update mode");
      const data = await res.json();
      setConfig(data.wallpaperConfig);
      broadcastWallpaperUpdate(data.wallpaperConfig);
      onNotification(auto ? "Switched to AUTO (Live Real-World Weather) Mode" : "Switched to MANUAL (Fixed Live Wallpaper) Mode");
    } catch (err: any) {
      onNotification(err.message, "error");
    }
  };

  // Save Fallback Settings
  const handleSaveFallbackSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig = {
        ...config,
        fallbackLocation: {
          city: fallbackCity,
          lat: Number(fallbackLat) || 10.7905,
          lon: Number(fallbackLon) || 78.7047
        }
      };

      const res = await fetch("/api/wallpapers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) throw new Error("Failed to update fallback location");
      const data = await res.json();
      setConfig(data.wallpaperConfig);
      broadcastWallpaperUpdate(data.wallpaperConfig);
      onNotificationRef.current("Fallback location settings saved! Live site updated.");
      handleRefreshWeather(true);
    } catch (err: any) {
      onNotification(err.message, "error");
    }
  };

  // Calculate upload statistics
  const totalUploaded = Object.keys(config.wallpapers || {}).length;
  const resolvedPreview = resolveWallpaperUrl(previewCategory, previewDevice, config);

  return (
    <div className="space-y-8 font-pixel text-white">
      {/* 1. TOP HEADER & OPERATIONAL MODE */}
      <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-md shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🖼️</span>
              <h2 className="text-lg sm:text-xl font-bold text-[#38bdf8]">WALLPAPER LIBRARY</h2>
            </div>
            <p className="text-xs text-white/70 mt-1 max-w-2xl font-sans">
              Upload and manage all 24 high-resolution wallpapers (8 weather states × 3 device types). The website
              automatically chooses and displays the exact uploaded image according to real location, live weather,
              local sunrise/sunset times, and visitor device.
            </p>
          </div>

          {/* Mode switch & Refresh Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Auto / Manual Toggle */}
            <div className="bg-[#071329] border border-[#1e3a8a] p-1 rounded flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleAutoMode(true)}
                className={`px-3 py-1.5 rounded text-xs transition-all cursor-pointer ${
                  config.autoMode
                    ? "bg-[#10b981] text-black font-bold shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                ● AUTO (LIVE REAL-WORLD)
              </button>
              <button
                type="button"
                onClick={() => handleToggleAutoMode(false)}
                className={`px-3 py-1.5 rounded text-xs transition-all cursor-pointer ${
                  !config.autoMode
                    ? "bg-[#fbbf24] text-black font-bold shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                ⚙️ MANUAL (TEST PREVIEW)
              </button>
            </div>

            {/* Refresh Live Weather Button */}
            <button
              type="button"
              onClick={() => handleRefreshWeather(true)}
              disabled={isRefreshingWeather}
              className="bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] text-white px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className={isRefreshingWeather ? "animate-spin" : ""}>🔄</span>
              <span>{isRefreshingWeather ? "FETCHING LIVE..." : "REFRESH LIVE WEATHER"}</span>
            </button>

            {/* Sync to Google Drive Cloud DB (Option 5 - 100% Free & Quota-Free) */}
            <button
              type="button"
              onClick={handleSyncDriveDatabase}
              disabled={isSyncingDrive}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] border border-[#60a5fa] text-white px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow disabled:opacity-50"
              title="Save all wallpapers & CMS state to your Google Drive (No write quota limits)"
            >
              <span>{isSyncingDrive ? "⏳" : "☁️"}</span>
              <span>{isSyncingDrive ? "SAVING TO DRIVE..." : "SYNC TO DRIVE (FREE)"}</span>
            </button>

            {/* Export JSON Backup Button */}
            <button
              type="button"
              onClick={handleExportBackup}
              className="bg-[#059669] hover:bg-[#10b981] border border-[#34d399] text-white px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow"
              title="Download offline JSON backup of all wallpapers & settings"
            >
              <span>📥</span>
              <span>EXPORT BACKUP</span>
            </button>

            {/* Delete All Wallpapers Button */}
            <button
              type="button"
              onClick={handleClearAllWallpapers}
              disabled={isLoading}
              className="bg-[#991b1b] hover:bg-[#b91c1c] border border-[#f87171] text-white px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow disabled:opacity-50"
              title="Delete all uploaded wallpapers"
            >
              <span>🗑️</span>
              <span>DELETE ALL WALLPAPERS {totalUploaded > 0 ? `(${totalUploaded})` : ""}</span>
            </button>
          </div>
        </div>

        {/* Firestore Quota Exhaustion Warning Banner (Only shown if Google Drive is not connected) */}
        {isFirestoreWritePaused() && !isUserConnected() && (
          <div className="mt-4 bg-amber-950/90 border border-amber-500/70 p-3 rounded-lg flex items-start gap-2.5 text-amber-200 text-xs">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-bold text-amber-300">
                  Firestore Cloud Sync Status: PAUSED (Daily Free Write Quota Exceeded)
                </span>
                <span className="bg-amber-900/80 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded text-[10px] font-bold">
                  Resets Daily at 00:00 UTC
                </span>
              </div>
              <p className="mt-1 text-[11px] text-amber-100/80 leading-relaxed font-sans">
                Google Cloud Firestore-ன் தினசரி இலவச Quota முடிந்துவிட்டதால், உங்கள் Google Drive-ஐயே 100% இலவச கிளவுட் டேட்டாபேஸாகப் பயன்படுத்தலாம். மேலே உள்ள <strong>"SYNC TO DRIVE (FREE)"</strong> பட்டனை கிளிக் செய்து உங்கள் Drive-ல் உடனே சேமித்துக்கொள்ளுங்கள் (No 20k write limits / வாழ்நாள் முழுவதும் அழியாது). அல்லது <strong>"EXPORT BACKUP"</strong> மூலம் JSON ஃபைலாகவும் சேமிக்கலாம்.
              </p>
            </div>
          </div>
        )}

        {/* 24-Slot Upload Matrix Status Grid (Section 18) */}
        <div className="mt-6 pt-5 border-t border-[#1e3a8a]/70">
          {/* Google Drive Cloud Storage Status Bar */}
          <div className="mb-4 bg-[#071329] border border-[#1e40af] p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">☁️</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    GOOGLE DRIVE CLOUD STORAGE:
                  </span>
                  {googleUser ? (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      CONNECTED & ACTIVE ({googleUser.email || googleUser.displayName || "Google Drive"})
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-medium">
                      NOT CONNECTED (Connect to store wallpapers on Google Drive)
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-blue-200/60 mt-0.5">
                  Select wallpapers, background videos, or images directly from your Google Drive files or upload local files.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDrivePickerSlot({
                    category: previewCategory,
                    device: previewDevice,
                    slotLabel: `${previewCategory.toUpperCase()} (${previewDevice.toUpperCase()})`
                  })
                }
                className="bg-[#0284c7] hover:bg-[#0369a1] border border-[#38bdf8] text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shadow"
              >
                <span>☁️</span>
                <span>Select from Google Drive</span>
              </button>

              {googleUser && isDriveExpired && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await googleSignIn();
                      if (res) {
                        setGoogleUser(res.user);
                        setIsDriveExpired(false);
                        onNotification("Google Drive Reconnected! 60-min session refreshed.", "success");
                        // Automatically verify and make all wallpaper links public
                        makeAllDriveWallpapersPublic(config.wallpapers).catch(() => {});
                      }
                    } catch (e: any) {
                      onNotification(e.message || "Google Reconnect failed", "error");
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-500 border border-amber-300 text-black px-3 py-1.5 rounded text-xs font-black whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shadow"
                >
                  <span>🔄</span>
                  <span>Reconnect Drive</span>
                </button>
              )}

              {googleUser && !isDriveExpired && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      onNotification("Setting 'Anyone with link can view' for all Drive wallpapers...", "info");
                      const res = await makeAllDriveWallpapersPublic(config.wallpapers);
                      onNotification(`Drive permissions verified: ${res.fixed} public!`, "success");
                    } catch (e: any) {
                      onNotification(e.message || "Failed to update permissions", "error");
                    }
                  }}
                  className="bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-500/80 text-emerald-100 px-2.5 py-1.5 rounded text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 shadow"
                  title="Ensures all Google Drive wallpapers have public readable link permissions so all visitors see them"
                >
                  <span>🔓</span>
                  <span>Ensure Public Sharing</span>
                </button>
              )}

              {!googleUser && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await googleSignIn();
                      if (res) {
                        setGoogleUser(res.user);
                        setIsDriveExpired(false);
                        onNotification("Google Drive Connected!", "success");
                      }
                    } catch (e: any) {
                      onNotification(e.message || "Google Sign-in failed", "error");
                    }
                  }}
                  className="bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <span>🔑</span>
                  <span>Connect</span>
                </button>
              )}
            </div>
          </div>

          {/* Google Drive Folder Auto-Sync & Live Wallpaper Stream Card */}
          <div className="mb-6 p-4 rounded-xl border-2 border-[#38bdf8]/60 bg-gradient-to-r from-[#031333] via-[#071d49] to-[#041a44] shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1e40af]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0284c7]/20 border border-[#38bdf8] flex items-center justify-center text-xl shrink-0 shadow-inner">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                      GOOGLE DRIVE FOLDER AUTOMATIC SYNC
                      <span className="text-[10px] bg-[#0284c7]/30 text-[#38bdf8] border border-[#38bdf8]/50 px-2 py-0.5 rounded font-mono">
                        LIVE STREAM
                      </span>
                    </h3>
                    {googleUser && driveAutoSyncEnabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 px-2 py-0.5 rounded font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        LIVE AUTO-SYNC ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-200/80 mt-0.5 font-sans">
                    Folder: <code className="bg-[#0b1b3d] text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-cyan-500/30">Google Drive &gt; Portfolio Files &gt; Wallpaper</code>
                    {lastDriveSyncTime && (
                      <span className="ml-2 text-emerald-400 font-mono text-[11px]">
                        (Last synced: {lastDriveSyncTime})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isDriveFolderSyncing || !googleUser}
                  onClick={() => handleSyncFromDriveFolder(true)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                    isDriveFolderSyncing
                      ? "bg-amber-600 text-white cursor-wait opacity-90"
                      : !googleUser
                      ? "bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-700"
                      : "bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white border border-[#38bdf8] hover:scale-105 active:scale-95"
                  }`}
                  title="Scan Google Drive Wallpaper folder and immediately apply changes live to website"
                >
                  <span className={isDriveFolderSyncing ? "animate-spin text-sm" : "text-sm"}>
                    {isDriveFolderSyncing ? "⏳" : "🔄"}
                  </span>
                  <span>
                    {isDriveFolderSyncing ? "Syncing from Drive..." : "SYNC FROM DRIVE FOLDER NOW"}
                  </span>
                </button>

                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0f172a] hover:bg-[#1e293b] border border-blue-400/40 text-blue-200 px-2.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 hover:text-white"
                  title="Open Google Drive in a new tab"
                >
                  <span>📂</span>
                  <span>Open Drive</span>
                </a>
              </div>
            </div>

            {/* Auto-Sync Toggle & How it Works */}
            <div className="mt-3 pt-2 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-7 text-[11px] text-blue-100/90 leading-relaxed font-sans">
                <p>
                  <strong className="text-amber-300">💡 தானியங்கி Sync வழிமுறை:</strong> உங்கள் Google Drive-ல் உள்ள{" "}
                  <code className="bg-[#08152e] text-cyan-300 px-1 py-0.5 rounded font-mono border border-cyan-500/20">Portfolio Files/Wallpaper</code>{" "}
                  ஃபோல்டருக்குள் புதிய Wallpaper படங்களை அப்லோட் செய்தால் போதும்; இந்த சிஸ்டம் தானாகவே அதை Detect செய்து permissions-ஐ Public ஆக்கி, உடனே Website-ல் Live ஆகக் காட்டும்!
                </p>
                <p className="mt-1 text-[10px] text-blue-300/70">
                  பெயரிடும் உதா: <code className="text-white">sunny_desktop.png</code>, <code className="text-white">night_mobile.jpg</code>, <code className="text-white">rainy.jpg</code>, <code className="text-white">snow.png</code>, <code className="text-white">cloudy.webp</code> (அல்லது எந்தப் பெயரிலும் போடலாம்).
                </p>
              </div>

              <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-3 bg-[#08152e]/80 p-2.5 rounded-lg border border-[#1e3a8a]/60">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={driveAutoSyncEnabled}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setDriveAutoSyncEnabled(val);
                      try {
                        localStorage.setItem("vignesh_portfolio_drive_auto_sync", val ? "true" : "false");
                      } catch {}
                      onNotification(
                        val
                          ? "⚡ Drive Folder Auto-Sync Enabled (syncs every 60s & on focus)"
                          : "Drive Folder Auto-Sync Disabled",
                        "info"
                      );
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">
                      Auto-Sync Live (Background)
                    </span>
                    <span className="text-[10px] text-blue-300/70 block">
                      Checks Drive every 60s & when switching tabs
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
              UPLOAD STATUS SUMMARY ({totalUploaded}/24 UPLOADED)
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded border ${
                totalUploaded === 24
                  ? "bg-[#064e3b] text-[#34d399] border-[#10b981]"
                  : "bg-[#451a03] text-[#fbbf24] border-[#f59e0b]"
              }`}
            >
              {totalUploaded === 24 ? "All 24 Complete ✓" : `${24 - totalUploaded} Slots Missing ✕`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {WALLPAPER_CATEGORIES.map((cat) => {
              const desktopUploaded = Boolean(config.wallpapers?.[`${cat.id}_desktop`]?.url);
              const tabletUploaded = Boolean(config.wallpapers?.[`${cat.id}_tablet`]?.url);
              const mobileUploaded = Boolean(config.wallpapers?.[`${cat.id}_mobile`]?.url);
              const allDone = desktopUploaded && tabletUploaded && mobileUploaded;

              return (
                <div
                  key={cat.id}
                  className={`p-2 rounded border text-center transition-all ${
                    allDone
                      ? "bg-[#064e3b]/30 border-[#10b981]/50"
                      : "bg-[#071329] border-[#1e3a8a]"
                  }`}
                >
                  <div className="text-sm mb-1">{cat.icon}</div>
                  <div className="text-[10px] font-bold text-white/90 truncate">{cat.shortName}</div>
                  <div className="flex justify-center gap-1.5 mt-1 text-[9px]">
                    <span title="Desktop" className={desktopUploaded ? "text-[#34d399]" : "text-[#f43f5e]"}>
                      D{desktopUploaded ? "✓" : "✕"}
                    </span>
                    <span title="Tablet" className={tabletUploaded ? "text-[#34d399]" : "text-[#f43f5e]"}>
                      T{tabletUploaded ? "✓" : "✕"}
                    </span>
                    <span title="Mobile" className={mobileUploaded ? "text-[#34d399]" : "text-[#f43f5e]"}>
                      M{mobileUploaded ? "✓" : "✕"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. REAL-WORLD WEATHER STATUS & ADMIN DEBUG INFORMATION (Section 20 & 21) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Current Weather Status & Debug Info */}
        <div className="lg:col-span-5 bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-5 rounded-md space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e3a8a]">
            <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5">
              <span>📡</span> CURRENT REAL-WORLD WEATHER STATUS
            </span>
            <span className="text-[10px] text-white/60">Admin Diagnostics</span>
          </div>

          {weatherStatus ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Detected Location:</span>
                <span className="font-bold text-[#38bdf8]">{weatherStatus.locationName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Temperature & Condition:</span>
                <span className="font-bold text-[#fbbf24]">
                  {weatherStatus.temperature}°C, {weatherStatus.conditionText} (Code: {weatherStatus.weatherCode})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Local Time & Sun Cycle:</span>
                <span className="text-white font-sans text-[11px]">
                  {weatherStatus.localTimeStr} ({weatherStatus.isDay ? "☀️ Daytime" : "🌙 Nighttime"})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Current Device Viewport:</span>
                <span className="font-bold text-[#34d399] uppercase">
                  {weatherStatus.deviceType} ({typeof window !== "undefined" ? `${window.innerWidth}px` : "1440px"})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Selected Wallpaper State:</span>
                <span className="font-bold text-[#f472b6] uppercase">
                  {weatherStatus.matchedCategory.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Selection Reason:</span>
                <span className="text-white/90 text-[11px] font-sans">{weatherStatus.matchedReason}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/60">Active Asset Source:</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#1e293b] text-[#60a5fa] border border-[#3b82f6]/30">
                  {weatherStatus.activeAssetSource === "exact"
                    ? "Exact Uploaded Asset ✓"
                    : weatherStatus.activeAssetSource === "device_fallback"
                    ? "Desktop Fallback ⚠️"
                    : weatherStatus.activeAssetSource === "sunny_fallback"
                    ? "Sunny Fallback ⚠️"
                    : "Default Fallback ⚠️"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/50 py-4 text-center">Loading live weather diagnostics...</div>
          )}

          {/* Fallback Location Configuration Form (Section 7) */}
          <form onSubmit={handleSaveFallbackSettings} className="pt-3 border-t border-[#1e3a8a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/80 block">FALLBACK REAL-WORLD LOCATION</span>
              <button
                type="button"
                onClick={handleUseCurrentLiveLocation}
                className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border border-[#38bdf8]/40"
                title="Detect your exact current live GPS/IP location and set it"
              >
                <span>📍</span>
                <span>Auto-Detect My Location</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <input
                  type="text"
                  value={fallbackCity}
                  onChange={(e) => setFallbackCity(e.target.value)}
                  placeholder="City, Country (e.g. Chennai, India)"
                  className="w-full bg-[#071329] border border-[#1e3a8a] px-2.5 py-1.5 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/50 block">Latitude</label>
                <input
                  type="text"
                  value={fallbackLat}
                  onChange={(e) => setFallbackLat(e.target.value)}
                  placeholder="13.0827"
                  className="w-full bg-[#071329] border border-[#1e3a8a] px-2 py-1 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/50 block">Longitude</label>
                <input
                  type="text"
                  value={fallbackLon}
                  onChange={(e) => setFallbackLon(e.target.value)}
                  placeholder="80.2707"
                  className="w-full bg-[#071329] border border-[#1e3a8a] px-2 py-1 rounded text-xs text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-[#1e3a8a] hover:bg-[#2563eb] text-white py-1.5 px-2 rounded text-[11px] font-bold cursor-pointer transition-all"
                >
                  SAVE LOC
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right: Live Interactive Testing & Preview Canvas (Section 15) */}
        <div className="lg:col-span-7 bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-5 rounded-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1e3a8a]">
            <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5">
              <span>👁️</span> INTERACTIVE WALLPAPER PREVIEW TESTER
            </span>
            <span className="text-[10px] text-white/60">Test Any Weather & Device Combination</span>
          </div>

          {/* Device Selector Controls */}
          <div>
            <span className="text-[10px] text-white/50 uppercase tracking-wider block mb-1.5">1. SELECT DEVICE:</span>
            <div className="grid grid-cols-3 gap-2">
              {DEVICE_TYPES.map((dev) => (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => setPreviewDevice(dev.id)}
                  className={`py-2 px-2.5 rounded text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    previewDevice === dev.id
                      ? "bg-[#1d4ed8] border border-[#60a5fa] text-white font-bold shadow"
                      : "bg-[#071329] text-white/70 hover:bg-[#133066] border border-[#1e3a8a]"
                  }`}
                >
                  <span>{dev.icon}</span>
                  <span>{dev.name.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Weather / Time State Selector Controls */}
          <div>
            <span className="text-[10px] text-white/50 uppercase tracking-wider block mb-1.5">
              2. SELECT WEATHER / TIME STATE:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {WALLPAPER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPreviewCategory(cat.id)}
                  className={`py-1.5 px-2 rounded text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewCategory === cat.id
                      ? "bg-[#2563eb] border border-[#93c5fd] text-white font-bold"
                      : "bg-[#071329] text-white/70 hover:bg-[#133066] border border-[#1e3a8a]"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.shortName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Display Box */}
          <div className="flex flex-col items-center">
            <div
              className={`relative w-full rounded border-2 border-[#1e3a8a] overflow-hidden bg-[#071329] flex items-center justify-center transition-all ${
                previewDevice === "mobile"
                  ? "aspect-[9/16] max-w-[240px]"
                  : previewDevice === "tablet"
                  ? "aspect-[4/3] max-w-[420px]"
                  : "aspect-[16/9]"
              }`}
            >
              {resolvedPreview.url ? (
                resolvedPreview.url.endsWith(".mp4") || resolvedPreview.url.endsWith(".webm") || resolvedPreview.url.startsWith("data:video/") ? (
                  <video
                    src={resolvedPreview.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full select-none"
                    style={{
                      objectFit: (previewDevice === "mobile" ? config.mobileFitMode || "cover" : config.desktopFitMode || "cover") as any,
                      objectPosition: previewDevice === "mobile" ? config.mobilePosition || "center top" : config.desktopPosition || "center center"
                    }}
                  />
                ) : (
                  <img
                    src={resolvedPreview.url}
                    alt="Preview"
                    className="w-full h-full select-none"
                    style={{
                      objectFit: (previewDevice === "mobile" ? config.mobileFitMode || "cover" : config.desktopFitMode || "cover") as any,
                      objectPosition: previewDevice === "mobile" ? config.mobilePosition || "center top" : config.desktopPosition || "center center"
                    }}
                  />
                )
              ) : (
                <div className="text-center p-4">
                  <span className="text-3xl block mb-2">🖼️</span>
                  <span className="text-xs text-white/60">No wallpaper uploaded for this slot</span>
                </div>
              )}

              {/* Overlay Info Tag */}
              <div className="absolute bottom-2 left-2 right-2 bg-[#071329]/90 backdrop-blur-md border border-[#1e3a8a] p-2 rounded flex items-center justify-between text-[10px]">
                <div>
                  <span className="font-bold text-[#38bdf8] uppercase">
                    {previewCategory.replace("_", " ")} ({previewDevice})
                  </span>
                  <span className="text-white/60 ml-2 hidden sm:inline">File: {resolvedPreview.fileName || "N/A"}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    resolvedPreview.source === "exact"
                      ? "bg-[#064e3b] text-[#34d399]"
                      : "bg-[#451a03] text-[#fbbf24]"
                  }`}
                >
                  {resolvedPreview.source === "exact" ? "EXACT UPLOAD" : "USING FALLBACK"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 MOBILE & SCREEN WALLPAPER DISPLAY FITTING CONTROLS */}
      <div className="bg-[#0f2854] border-2 border-[#38bdf8] p-4 sm:p-5 rounded-md space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e3a8a]">
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <div>
              <h3 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wide">
                MOBILE & DISPLAY SCREEN WALLPAPER FIT CONTROLS
              </h3>
              <p className="text-[11px] text-white/70 font-sans mt-0.5">
                Customize how wallpapers fit mobile phones and tablets. Adjust focus anchors so tall phone screens capture the best parts of your wallpaper.
              </p>
            </div>
          </div>

          <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-2.5 py-1 rounded font-bold self-start sm:self-center">
            ✓ Live Auto-Syncing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mobile Fit Mode */}
          <div className="bg-[#071329] border border-[#1e3a8a] p-3.5 rounded space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📱</span> Mobile Fitting Mode
              </span>
              <span className="text-[10px] text-[#38bdf8] uppercase font-bold">
                {config.mobileFitMode || "cover"}
              </span>
            </div>
            <p className="text-[10px] text-white/60 font-sans">
              Determines how wallpaper images scale when viewed on smartphones and vertical viewports.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "cover", label: "Cover (Fill Full)", desc: "Fills whole screen seamlessly" },
                { id: "contain", label: "Contain (Fit All)", desc: "Shows full image without crop" },
                { id: "fill", label: "Fill (Stretch)", desc: "Stretches to phone dimensions" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={async () => {
                    const updated = { ...config, mobileFitMode: mode.id as any };
                    setConfig(updated);
                    await fetch("/api/wallpapers", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify(updated)
                    });
                    broadcastWallpaperUpdate(updated);
                    onNotification(`Mobile fit mode set to "${mode.id}"`);
                  }}
                  className={`p-2 rounded text-[11px] font-bold text-center transition-all cursor-pointer ${
                    (config.mobileFitMode || "cover") === mode.id
                      ? "bg-[#2563eb] text-white border border-[#93c5fd] shadow"
                      : "bg-[#0b1739] text-white/70 hover:bg-[#133066] border border-[#1e3a8a]"
                  }`}
                >
                  <div>{mode.label}</div>
                  <div className="text-[9px] font-normal text-white/50 mt-0.5">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Position / Focus Anchor */}
          <div className="bg-[#071329] border border-[#1e3a8a] p-3.5 rounded space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🎯</span> Mobile Focus / Crop Position
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">
                {config.mobilePosition || "center top"}
              </span>
            </div>
            <p className="text-[10px] text-white/60 font-sans">
              Anchor position when wallpaper is cropped for phone screens (Default: Center Top preserves skyline &amp; subject).
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "center top", label: "Top Center (Sky/Subject)" },
                { id: "center center", label: "Dead Center" },
                { id: "center bottom", label: "Bottom (Ground)" },
                { id: "top left", label: "Top Left Corner" },
                { id: "top right", label: "Top Right Corner" },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={async () => {
                    const updated = { ...config, mobilePosition: pos.id as any };
                    setConfig(updated);
                    await fetch("/api/wallpapers", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify(updated)
                    });
                    broadcastWallpaperUpdate(updated);
                    onNotification(`Mobile wallpaper focus anchor set to "${pos.id}"`);
                  }}
                  className={`p-2 rounded text-[10px] font-bold text-center transition-all cursor-pointer ${
                    (config.mobilePosition || "center top") === pos.id
                      ? "bg-[#059669] text-white border border-[#6ee7b7] shadow"
                      : "bg-[#0b1739] text-white/70 hover:bg-[#133066] border border-[#1e3a8a]"
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. THE 8 CATEGORY SECTIONS WITH 3 DEVICE SLOTS EACH (24 UPLOAD CARDS) (Section 4 & 5) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#1e3a8a] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#38bdf8] flex items-center gap-2">
              <span>🗂️</span> ALL 24 WALLPAPER SLOTS (8 CATEGORIES × 3 DEVICES)
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              Click &quot;UPLOAD WALLPAPER&quot; or drop an image onto any slot. Uploaded images will be displayed exactly as
              uploaded.
            </p>
          </div>
        </div>

        {WALLPAPER_CATEGORIES.map((category, catIndex) => {
          return (
            <div
              key={category.id}
              className="bg-[#0f2854] border-2 border-[#1e3a8a] rounded-md p-4 sm:p-5 space-y-4"
            >
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e3a8a]">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {catIndex + 1}. {category.name}
                    </h4>
                    <span className="text-[11px] text-white/60 font-sans">{category.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[10px] px-2.5 py-1 rounded bg-[#071329] text-[#93c5fd] border border-[#1e3a8a] font-sans">
                    Condition: {category.exampleCondition}
                  </span>
                  {DEVICE_TYPES.some((dev) => Boolean(config.wallpapers?.[`${category.id}_${dev.id}`]?.url)) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(category.id, category.name)}
                      title={`Clear all uploaded wallpapers for ${category.name}`}
                      className="text-[10px] px-2.5 py-1 rounded bg-[#881337]/70 hover:bg-[#881337] text-white border border-[#fda4af]/60 font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>✕</span>
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Device Slots (Desktop, Tablet, Mobile) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DEVICE_TYPES.map((dev) => {
                  const slotKey = `${category.id}_${dev.id}`;
                  const slotData = config.wallpapers?.[slotKey];
                  const isCurUploading = isUploading === slotKey;
                  const isLiveActive =
                    !config.autoMode &&
                    config.manualCategory === category.id &&
                    config.manualDevice === dev.id;

                  return (
                    <WallpaperUploadCard
                      key={dev.id}
                      category={category}
                      device={dev}
                      slotData={slotData}
                      isUploading={isCurUploading}
                      isLiveActive={isLiveActive}
                      onUpload={(file) => handleFileUpload(category.id, dev.id, file)}
                      onPickFromDrive={() =>
                        setDrivePickerSlot({
                          category: category.id,
                          device: dev.id,
                          slotLabel: `${category.name} (${dev.name})`
                        })
                      }
                      onSetAsLive={() => handleSetAsLive(category.id, dev.id)}
                      onRemove={() => handleRemoveSlot(category.id, dev.id)}
                      onPreview={() => {
                        setPreviewCategory(category.id);
                        setPreviewDevice(dev.id);
                        window.scrollTo({ top: 120, behavior: "smooth" });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Google Drive Media Picker Modal */}
      {drivePickerSlot && (
        <GoogleDrivePickerModal
          isOpen={Boolean(drivePickerSlot)}
          onClose={() => setDrivePickerSlot(null)}
          onSelect={handleSelectDriveMedia}
          title="Select Wallpaper from Google Drive"
          targetSlotLabel={drivePickerSlot.slotLabel}
          allowedTypes="images_and_videos"
          onNotification={onNotification}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// INDIVIDUAL UPLOAD CARD COMPONENT (Section 5)
// -------------------------------------------------------------
interface WallpaperUploadCardProps {
  category: { id: WallpaperCategory; name: string; icon: string };
  device: { id: DeviceType; name: string; icon: string; range: string };
  slotData?: { url: string; fileName?: string; fileSize?: string; updatedAt?: string };
  isUploading: boolean;
  isLiveActive?: boolean;
  onUpload: (file: File) => void;
  onPickFromDrive?: () => void;
  onSetAsLive?: () => void;
  onRemove: () => void;
  onPreview: () => void;
}

const WallpaperUploadCard: React.FC<WallpaperUploadCardProps> = ({
  category,
  device,
  slotData,
  isUploading,
  isLiveActive,
  onUpload,
  onPickFromDrive,
  onSetAsLive,
  onRemove,
  onPreview
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasImage = Boolean(slotData?.url);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  // Aspect ratio styling per device
  const aspectClass =
    device.id === "desktop" ? "aspect-[16/9]" : device.id === "tablet" ? "aspect-[4/3]" : "aspect-[9/16] max-h-56";

  return (
    <div
      className={`bg-[#071329] border-2 rounded p-3.5 flex flex-col justify-between transition-all ${
        isLiveActive
          ? "border-[#10b981] bg-[#062c21]/40 shadow-md shadow-[#10b981]/20"
          : isDragOver
          ? "border-[#38bdf8] bg-[#0c224a]"
          : hasImage
          ? "border-[#1e3a8a] hover:border-[#38bdf8]/60"
          : "border-dashed border-[#1e3a8a] hover:border-[#3b82f6]"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div>
        {/* Card Header: Device Name & Status */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e3a8a]">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{device.icon}</span>
            <span className="text-xs font-bold text-white uppercase">{device.name}</span>
            <span className="text-[9px] text-white/50 font-sans">({device.range})</span>
          </div>

          <div className="flex items-center gap-1">
            {isLiveActive && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[#10b981] text-black animate-pulse">
                ⚡ ACTIVE LIVE
              </span>
            )}
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                hasImage ? "bg-[#064e3b] text-[#34d399]" : "bg-[#451a03] text-[#fbbf24]"
              }`}
            >
              {hasImage ? "UPLOADED ✓" : "MISSING ✕"}
            </span>
          </div>
        </div>

        {/* Real Image Preview (Section 5) */}
        <div
          className={`relative w-full ${aspectClass} rounded overflow-hidden bg-[#030a16] border border-[#1e3a8a] flex items-center justify-center group cursor-pointer`}
          onClick={() => fileInputRef.current?.click()}
        >
          {hasImage ? (
            <>
              {slotData?.url && typeof slotData.url === "string" && (slotData.url.toLowerCase().endsWith(".mp4") || slotData.url.toLowerCase().endsWith(".webm")) ? (
                <video
                  src={slotData?.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover select-none"
                />
              ) : (
                <img
                  src={slotData?.url}
                  alt={`${category.name} ${device.name}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="bg-[#1d4ed8] text-white text-[10px] font-bold px-2 py-1 rounded shadow">
                  CLICK TO REPLACE
                </span>
              </div>
            </>
          ) : (
            <div className="text-center p-3">
              <span className="text-2xl block mb-1 text-white/30">⬆️</span>
              <span className="text-[10px] text-white/60 block font-sans">
                {isUploading ? "Uploading..." : "Click or Drop Image"}
              </span>
              <span className="text-[8px] text-white/40 block font-sans mt-0.5">PNG, JPG, WEBP, MP4</span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-[#071329]/80 backdrop-blur-xs flex items-center justify-center">
              <span className="animate-spin text-xl text-[#38bdf8]">⏳</span>
            </div>
          )}
        </div>

        {/* File Metadata */}
        <div className="mt-2 text-[10px] text-white/70 space-y-0.5 font-sans">
          <div className="truncate">
            <span className="text-white/40">File: </span>
            <span className="text-white/90">{slotData?.fileName || "None"}</span>
          </div>
          {slotData?.fileSize && (
            <div className="text-[9px] text-white/50">
              <span>Size: {slotData.fileSize}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-[#1e3a8a]">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1 min-w-[60px] bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] text-white py-1.5 px-2 rounded text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50 text-center truncate"
        >
          {hasImage ? "REPLACE" : "UPLOAD"}
        </button>

        {onPickFromDrive && (
          <button
            type="button"
            onClick={onPickFromDrive}
            disabled={isUploading}
            title="Pick image or video directly from your connected Google Drive"
            className="bg-[#0284c7] hover:bg-[#0369a1] border border-[#38bdf8] text-white py-1.5 px-2 rounded text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <span>☁️</span>
            <span>DRIVE</span>
          </button>
        )}

        {hasImage && (
          <>
            {onSetAsLive && (
              <button
                type="button"
                onClick={onSetAsLive}
                title="Immediately set this wallpaper as Active on the live website"
                className="bg-[#059669] hover:bg-[#10b981] border border-[#34d399] text-white py-1.5 px-2 rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
              >
                <span>⚡</span>
                <span className="hidden sm:inline">SET LIVE</span>
              </button>
            )}
            <button
              type="button"
              onClick={onPreview}
              title="Preview this exact image in tester"
              className="bg-[#0f2854] hover:bg-[#1e3a8a] border border-[#1e3a8a] text-[#38bdf8] py-1.5 px-2 rounded text-[10px] font-bold cursor-pointer transition-all"
            >
              👁️
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Remove this wallpaper slot"
              className="bg-[#881337] hover:bg-[#9f1239] border border-[#fda4af] text-white py-1.5 px-2 rounded text-[10px] font-bold cursor-pointer transition-all"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
};
