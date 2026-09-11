import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  WallpaperLibraryConfig,
  WallpaperCategory,
  DeviceType,
  WeatherStatusInfo
} from "../types";
import {
  getDeviceType,
  fetchLiveWeather,
  detectUserCurrentLocation,
  resolveWallpaperUrl,
  getBuiltinPixelWallpaper,
  DEFAULT_PIXEL_WALLPAPER_DATA_URL
} from "../services/weatherService";
import {
  fetchWallpapersFromFirestore,
  IS_FIREBASE_CONNECTED
} from "../services/firebaseService";
import {
  isUserConnected,
  syncWallpapersFromDriveFolder
} from "../services/googleDriveService";

interface PixelWallpaperProps {
  libraryConfig?: WallpaperLibraryConfig | null;
}

// Helper to estimate initial time category before API responds in target timezone (Asia/Kolkata by default)
function getEstimatedTimeCategory(timeZone: string = "Asia/Kolkata"): WallpaperCategory {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      hour: "numeric"
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    if (hour >= 19 || hour < 5) return "night";
    if (hour >= 5 && hour < 7) return "early_morning";
    if (hour >= 17 && hour < 19) return "evening";
    return "sunny";
  } catch {
    return "night";
  }
}

export const PixelWallpaper: React.FC<PixelWallpaperProps> = ({ libraryConfig: initialConfig }) => {
  const [config, setConfig] = useState<WallpaperLibraryConfig | null>(() => {
    if (initialConfig) return initialConfig;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vignesh_portfolio_wallpapers_backup");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    return typeof window !== "undefined" ? getDeviceType(window.innerWidth) : "desktop";
  });
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatusInfo | null>(() => {
    try {
      const cached = sessionStorage.getItem("vignesh_portfolio_weather_cache");
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [activeImageUrl, setActiveImageUrl] = useState<string>(() => {
    let localConfig = initialConfig;
    if (!localConfig && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vignesh_portfolio_wallpapers_backup");
        if (saved) localConfig = JSON.parse(saved);
      } catch {}
    }
    const estCategory = getEstimatedTimeCategory();
    const dev = typeof window !== "undefined" ? getDeviceType(window.innerWidth) : "desktop";
    return resolveWallpaperUrl(estCategory, dev, localConfig || undefined).url;
  });
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  // Apply resolved wallpaper instantly whenever config or status changes
  const applyResolvedWallpaper = useCallback((cfg: WallpaperLibraryConfig | null, status: WeatherStatusInfo | null, dev: DeviceType) => {
    const category = (!cfg?.autoMode && cfg?.manualCategory)
      ? cfg.manualCategory
      : (status?.matchedCategory || getEstimatedTimeCategory());
    const effectiveDevice = (!cfg?.autoMode && cfg?.manualDevice) ? cfg.manualDevice : dev;
    const resolved = resolveWallpaperUrl(category, effectiveDevice, cfg || undefined);
    if (resolved?.url) {
      setActiveImageUrl(resolved.url);
    }
  }, []);

  // 1. Fetch Wallpaper Library Config if not provided via props
  const loadWallpaperConfig = useCallback(async () => {
    // Check local backup first for instant zero-flicker load across republishes/restarts
    let localBackup: WallpaperLibraryConfig | null = null;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vignesh_portfolio_wallpapers_backup");
        if (saved) localBackup = JSON.parse(saved);
      } catch {
        // ignore
      }
    }

    try {
      let data: WallpaperLibraryConfig | null = null;

      try {
        const res = await fetch("/api/wallpapers?t=" + Date.now());
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // Server fetch failed, proceed to Firestore/local backup
      }

      // If server returned no wallpapers or an empty library, check Firestore and local backup
      const serverHasWallpapers = data?.wallpapers && Object.keys(data.wallpapers).length > 0;
      if (!serverHasWallpapers) {
        if (IS_FIREBASE_CONNECTED) {
          try {
            const fsWallpapers = await fetchWallpapersFromFirestore();
            if (fsWallpapers?.wallpapers && Object.keys(fsWallpapers.wallpapers).length > 0) {
              data = {
                autoMode: true,
                fallbackLocation: { city: "Trichy, India", lat: 10.7905, lon: 78.7047 },
                ...fsWallpapers,
                wallpapers: fsWallpapers.wallpapers || {},
              };
            }
          } catch {
            // ignore Firestore fetch error
          }
        }

        if ((!data || !data.wallpapers || Object.keys(data.wallpapers).length === 0) && localBackup?.wallpapers && Object.keys(localBackup.wallpapers).length > 0) {
          data = localBackup;
        }

        // If still empty and Google Drive is connected, auto-sync from Drive Wallpaper folder
        if ((!data || !data.wallpapers || Object.keys(data.wallpapers).length === 0) && isUserConnected()) {
          try {
            const driveRes = await syncWallpapersFromDriveFolder("Portfolio Files/Wallpaper");
            if (driveRes?.success && driveRes.wallpaperConfig) {
              data = driveRes.wallpaperConfig;
            }
          } catch {}
        }
      }

      if (data) {
        // Cache authoritative state to local persistent storage
        try {
          localStorage.setItem("vignesh_portfolio_wallpapers_backup", JSON.stringify(data));
        } catch {}

        setConfig(data);
        applyResolvedWallpaper(data, weatherStatus, deviceType);
      }
    } catch {
      if (localBackup) {
        setConfig(localBackup);
        applyResolvedWallpaper(localBackup, weatherStatus, deviceType);
      }
    }
  }, [applyResolvedWallpaper, weatherStatus, deviceType]);

  useEffect(() => {
    if (!initialConfig) {
      loadWallpaperConfig();
    } else {
      setConfig(initialConfig);
      applyResolvedWallpaper(initialConfig, weatherStatus, deviceType);
    }
  }, [initialConfig, loadWallpaperConfig]);

  // Real-time Event Listener for instant sync when admin uploads/changes wallpaper
  useEffect(() => {
    const handleWallpaperUpdate = (e: any) => {
      const updatedConfig = e.detail || null;
      if (updatedConfig) {
        setConfig(updatedConfig);
        applyResolvedWallpaper(updatedConfig, weatherStatus, deviceType);
      } else {
        loadWallpaperConfig();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "wallpaper_refresh_trigger") {
        loadWallpaperConfig();
      }
    };

    window.addEventListener("wallpaper_updated" as any, handleWallpaperUpdate);
    window.addEventListener("storage", handleStorage);

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        broadcastChannel = new BroadcastChannel("portfolio_wallpaper_channel");
        broadcastChannel.onmessage = (ev) => {
          if (ev.data?.type === "WALLPAPER_UPDATED") {
            if (ev.data.config) {
              setConfig(ev.data.config);
              applyResolvedWallpaper(ev.data.config, weatherStatus, deviceType);
            } else {
              loadWallpaperConfig();
            }
          }
        };
      }
    } catch {
      // Ignore broadcastChannel errors if unsupported
    }

    // Live automatic sync from Google Drive "Portfolio Files/Wallpaper" folder
    const syncDriveIfConnected = () => {
      if (isUserConnected()) {
        syncWallpapersFromDriveFolder("Portfolio Files/Wallpaper").catch(() => {});
      }
    };

    const driveInterval = setInterval(syncDriveIfConnected, 45000);
    window.addEventListener("focus", syncDriveIfConnected);

    return () => {
      window.removeEventListener("wallpaper_updated" as any, handleWallpaperUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncDriveIfConnected);
      clearInterval(driveInterval);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [applyResolvedWallpaper, weatherStatus, deviceType, loadWallpaperConfig]);

  // 2. Responsive Device Detection & Resize Listener
  useEffect(() => {
    const handleResize = () => {
      const newDevice = getDeviceType(window.innerWidth);
      setDeviceType((prev) => {
        if (prev !== newDevice) {
          applyResolvedWallpaper(config, weatherStatus, newDevice);
          return newDevice;
        }
        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [config, weatherStatus, applyResolvedWallpaper]);

  // 3. Live Weather Fetching for visitor's real-world dynamic location (GPS / IP / Auto)
  const refreshWeatherAndWallpaper = useCallback(async () => {
    try {
      // Step 1: Detect visitor's real live location (GPS / IP / Server)
      const detected = await detectUserCurrentLocation(
        config?.fallbackLocation?.lat ?? 10.7905,
        config?.fallbackLocation?.lon ?? 78.7047,
        config?.fallbackLocation?.city || "Trichy, India"
      );

      // Step 2: Fetch real-time weather for this exact location
      const status = await fetchLiveWeather(
        detected.lat,
        detected.lon,
        detected.city,
        config || undefined,
        window.innerWidth
      );
      setWeatherStatus(status);
      
      // Dispatch global event so Taskbar or other components can show live weather status
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("live_weather_updated", { detail: status }));
      }

      if (status.activeAssetUrl) {
        setActiveImageUrl(status.activeAssetUrl);
      }
    } catch (e) {
      console.warn("Weather fetch update in progress:", e);
    }
  }, [config]);

  // Initial trigger & periodic refresh
  useEffect(() => {
    refreshWeatherAndWallpaper();

    // Refresh every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      refreshWeatherAndWallpaper();
    }, 300000);

    return () => clearInterval(interval);
  }, [refreshWeatherAndWallpaper]);

  // 4. Update wallpaper when deviceType, weatherStatus, or config changes
  useEffect(() => {
    applyResolvedWallpaper(config, weatherStatus, deviceType);
  }, [deviceType, weatherStatus, config, applyResolvedWallpaper]);

  // Helper to check if wallpaper url is a video
  const isVideoWallpaper = (url?: string) => {
    if (!url || typeof url !== "string") return false;
    const cleanUrl = url.toLowerCase().split("?")[0];
    return (
      cleanUrl.endsWith(".mp4") ||
      cleanUrl.endsWith(".webm") ||
      cleanUrl.endsWith(".mov") ||
      cleanUrl.endsWith(".m4v") ||
      url.startsWith("data:video/")
    );
  };

  const isMobile = deviceType === "mobile";
  const effectiveObjectFit: React.CSSProperties["objectFit"] = isMobile
    ? (config?.mobileFitMode || "cover")
    : (config?.desktopFitMode || "cover");

  const effectiveObjectPosition: string = isMobile
    ? (config?.mobilePosition || "center top")
    : (config?.desktopPosition || "center center");

  return (
    <div
      id="desktop-wallpaper-container"
      className="fixed inset-0 w-full h-full min-h-screen h-[100dvh] overflow-hidden select-none pointer-events-none z-0 bg-[#071329]"
    >
      {/* Video or Image Live Wallpaper */}
      {isVideoWallpaper(activeImageUrl) ? (
        <video
          key={activeImageUrl}
          id="desktop-wallpaper-video"
          src={activeImageUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full select-none pointer-events-none"
          style={{
            objectFit: effectiveObjectFit,
            objectPosition: effectiveObjectPosition,
          }}
        />
      ) : (
        <img
          key={activeImageUrl}
          id="desktop-wallpaper-image"
          src={activeImageUrl}
          alt="Desktop Wallpaper"
          onLoad={() => setIsImageLoaded(true)}
          onError={() => {
            // If custom uploaded image fails to load (e.g. private Google Drive link or network issue),
            // gracefully fallback to the authentic built-in dynamic pixel artwork for this exact weather condition
            const currentCategory = (!config?.autoMode && config?.manualCategory)
              ? config.manualCategory
              : (weatherStatus?.matchedCategory || getEstimatedTimeCategory());
            const fallbackSvg = getBuiltinPixelWallpaper(currentCategory, deviceType);
            if (activeImageUrl !== fallbackSvg) {
              setActiveImageUrl(fallbackSvg);
              setIsImageLoaded(true);
            }
          }}
          className={`w-full h-full select-none pointer-events-none transition-opacity duration-700 ease-in-out ${
            isImageLoaded ? "opacity-100" : "opacity-90"
          }`}
          style={{
            objectFit: effectiveObjectFit,
            objectPosition: effectiveObjectPosition,
            imageRendering: "auto"
          }}
        />
      )}
    </div>
  );
};
