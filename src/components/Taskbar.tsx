import React, { useState, useEffect } from "react";
import { PixelWindowsLogo, PixelWindowsPerspectiveLogo } from "./PixelIcons";
import {
  WindowId,
  WeatherStatusInfo,
  TaskbarIcon,
  TaskbarSettings,
  TaskbarElementPosition,
  Project,
} from "../types";
import { renderTaskbarIconGraphic, DEFAULT_TASKBAR_SETTINGS } from "./admin/TaskbarManager";
import {
  fetchTaskbarSettingsFromFirestore,
  fetchTaskbarIconsFromFirestore,
  IS_FIREBASE_CONNECTED,
} from "../services/firebaseService";
import { getLocalMasterBackup } from "../services/persistenceService";

export const DEFAULT_TASKBAR_ICONS: TaskbarIcon[] = [
  {
    id: "tb-1",
    name: "Portfolio Window",
    iconImage: "taskview",
    destinationType: "existingWindow",
    destination: "portfolio",
    order: 1,
    visible: true,
    openBehavior: "sameWindow",
  },
  {
    id: "tb-2",
    name: "Projects File Explorer",
    iconImage: "explorer",
    destinationType: "existingWindow",
    destination: "projects",
    order: 2,
    visible: true,
    openBehavior: "sameWindow",
  },
  {
    id: "tb-3",
    name: "About & Bio (Browser)",
    iconImage: "browser",
    destinationType: "existingWindow",
    destination: "about",
    order: 3,
    visible: true,
    openBehavior: "sameWindow",
  },
  {
    id: "tb-4",
    name: "Google Drive Cloud Hub",
    iconImage: "googleDrive",
    destinationType: "existingWindow",
    destination: "googleDrive",
    order: 4,
    visible: true,
    openBehavior: "sameWindow",
  },
  {
    id: "tb-5",
    name: "Skills & Apps Grid",
    iconImage: "appGrid",
    destinationType: "existingWindow",
    destination: "skills",
    order: 5,
    visible: true,
    openBehavior: "sameWindow",
  },
];

interface TaskbarProps {
  onOpenWindow: (id: WindowId, project?: Project, category?: string) => void;
  onToggleStartMenu: () => void;
  onToggleSearch: () => void;
  onToggleTray: () => void;
  activeWindows?: WindowId[];
  projects?: Project[];
  taskbarSettingsOverride?: TaskbarSettings;
  taskbarIconsOverride?: TaskbarIcon[];
}

export const Taskbar: React.FC<TaskbarProps> = ({
  onOpenWindow,
  onToggleStartMenu,
  onToggleSearch,
  onToggleTray,
  activeWindows = [],
  projects = [],
  taskbarSettingsOverride,
  taskbarIconsOverride,
}) => {
  const [timeStr, setTimeStr] = useState("10:30 AM");
  const [dateStr, setDateStr] = useState("11/05/2026");
  const [weatherInfo, setWeatherInfo] = useState<WeatherStatusInfo | null>(() => {
    try {
      const cached = sessionStorage.getItem("vignesh_portfolio_weather_cache");
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [showWeatherPopover, setShowWeatherPopover] = useState<boolean>(false);
  const [taskbarIcons, setTaskbarIcons] = useState<TaskbarIcon[]>(() => {
    if (Array.isArray(taskbarIconsOverride) && taskbarIconsOverride.length > 0) {
      return taskbarIconsOverride
        .filter((i: TaskbarIcon) => i && i.visible !== false)
        .sort((a: TaskbarIcon, b: TaskbarIcon) => (a.order ?? 0) - (b.order ?? 0));
    }
    try {
      const direct = localStorage.getItem("vignesh_portfolio_taskbar_icons");
      if (direct) {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((i: TaskbarIcon) => i && i.visible !== false)
            .sort((a: TaskbarIcon, b: TaskbarIcon) => (a.order ?? 0) - (b.order ?? 0));
        }
      }
    } catch {}
    const local = getLocalMasterBackup();
    if (Array.isArray(local?.taskbarIcons) && local.taskbarIcons.length > 0) {
      return local.taskbarIcons
        .filter((i: TaskbarIcon) => i && i.visible !== false)
        .sort((a: TaskbarIcon, b: TaskbarIcon) => (a.order ?? 0) - (b.order ?? 0));
    }
    return DEFAULT_TASKBAR_ICONS;
  });
  const [settings, setSettings] = useState<TaskbarSettings>(() => {
    if (taskbarSettingsOverride) return taskbarSettingsOverride;
    try {
      const direct = localStorage.getItem("vignesh_portfolio_taskbar_backup");
      if (direct) {
        const parsed = JSON.parse(direct);
        if (parsed && parsed.left && parsed.right) return parsed;
      }
    } catch {}
    const local = getLocalMasterBackup();
    if (local?.taskbarSettings && local.taskbarSettings.left && local.taskbarSettings.right) {
      return local.taskbarSettings;
    }
    return DEFAULT_TASKBAR_SETTINGS;
  });
  const [hoveredIconId, setHoveredIconId] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile">("desktop");

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1200) setDeviceType("desktop");
      else if (w >= 768) setDeviceType("tablet");
      else setDeviceType("mobile");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update settings whenever taskbarSettingsOverride changes from parent (e.g. Firebase or Admin update)
  useEffect(() => {
    if (taskbarSettingsOverride) {
      setSettings(taskbarSettingsOverride);
    }
  }, [taskbarSettingsOverride]);

  // Update taskbar icons whenever taskbarIconsOverride changes from parent
  useEffect(() => {
    if (Array.isArray(taskbarIconsOverride)) {
      const visible = taskbarIconsOverride
        .filter((i) => i && i.visible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTaskbarIcons(visible);
    }
  }, [taskbarIconsOverride]);

  // Fetch Taskbar Global Settings (Layout, Left, Right, Mobile, Tablet)
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
      // Graceful fallback
    }
  };

  // Fetch Taskbar Center Icons
  const fetchTaskbarIcons = async () => {
    // 1. Check local backup first
    const local = getLocalMasterBackup();
    if (Array.isArray(local?.taskbarIcons) && local.taskbarIcons.length > 0) {
      const visible = local.taskbarIcons
        .filter((i: TaskbarIcon) => i && i.visible !== false)
        .sort((a: TaskbarIcon, b: TaskbarIcon) => (a.order ?? 0) - (b.order ?? 0));
      setTaskbarIcons(visible);
    }

    try {
      let data: TaskbarIcon[] | null = null;
      if (IS_FIREBASE_CONNECTED) {
        const fsIcons = await fetchTaskbarIconsFromFirestore();
        if (Array.isArray(fsIcons) && fsIcons.length > 0) {
          data = fsIcons;
        }
      }

      if (!data) {
        const res = await fetch("/api/taskbar-icons");
        if (res.ok) {
          data = await res.json();
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        const visible = data
          .filter((i: TaskbarIcon) => i && i.visible !== false)
          .sort((a: TaskbarIcon, b: TaskbarIcon) => (a.order ?? 0) - (b.order ?? 0));
        setTaskbarIcons(visible);
      }
    } catch {
      // Gracefully maintain fallback
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchTaskbarIcons();

    // Listen to real-time custom events dispatched by Admin site
    const handleIconsUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        const visible = e.detail
          .filter((i: TaskbarIcon) => i && i.visible !== false)
          .sort((a: TaskbarIcon, b: TaskbarIcon) => (a.order ?? 0) - (b.order ?? 0));
        setTaskbarIcons(visible);
      } else {
        fetchTaskbarIcons();
      }
    };

    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setSettings((prev) => ({
          ...prev,
          ...e.detail,
          layout: {
            ...prev.layout,
            ...(e.detail.layout || {}),
          },
          startMenu: e.detail.startMenu || prev.startMenu,
        }));
      } else {
        fetchSettings();
      }
    };

    window.addEventListener("taskbar_icons_updated", handleIconsUpdate);
    window.addEventListener("taskbar_settings_updated", handleSettingsUpdate);
    window.addEventListener("storage", () => {
      fetchSettings();
      fetchTaskbarIcons();
    });

    return () => {
      window.removeEventListener("taskbar_icons_updated", handleIconsUpdate);
      window.removeEventListener("taskbar_settings_updated", handleSettingsUpdate);
    };
  }, []);

  // Update clock & date display based on settings (12h vs 24h, custom mode, etc.)
  useEffect(() => {
    const updateTime = () => {
      if (settings.right.clockMode === "custom" && settings.right.customTimeStr) {
        setTimeStr(settings.right.customTimeStr);
      } else {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");

        if (settings.right.timeFormat === "24h") {
          const hStr = hours.toString().padStart(2, "0");
          setTimeStr(settings.right.showSeconds ? `${hStr}:${minutes}:${seconds}` : `${hStr}:${minutes}`);
        } else {
          const ampm = hours >= 12 ? "PM" : "AM";
          const h12 = hours % 12 || 12;
          setTimeStr(settings.right.showSeconds ? `${h12}:${minutes}:${seconds} ${ampm}` : `${h12}:${minutes} ${ampm}`);
        }
      }

      if (settings.right.customDateStr && settings.right.clockMode === "custom") {
        setDateStr(settings.right.customDateStr);
      } else {
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        const year = now.getFullYear();

        if (settings.right.dateFormat === "DD/MM/YYYY") {
          setDateStr(`${day}/${month}/${year}`);
        } else if (settings.right.dateFormat === "YYYY-MM-DD") {
          setDateStr(`${year}-${month}-${day}`);
        } else {
          setDateStr(`${month}/${day}/${year}`);
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.right]);

  // Listen to live weather updates
  useEffect(() => {
    const handleWeatherUpdate = (e: any) => {
      if (e.detail) {
        setWeatherInfo(e.detail);
        try {
          sessionStorage.setItem("vignesh_portfolio_weather_cache", JSON.stringify(e.detail));
        } catch {}
      }
    };

    window.addEventListener("live_weather_updated" as any, handleWeatherUpdate);

    // Initial weather fetch fallback with auto geolocation
    fetch("/api/weather/live?auto=true")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success) {
          const temp = Math.round(data.current?.temperature_2m ?? 28);
          const isDay = Boolean(data.current?.is_day ?? 1);
          const code = Number(data.current?.weather_code ?? 0);
          const info: WeatherStatusInfo = {
            locationName: data.locationName || "Local Weather",
            latitude: data.latitude || 10.7905,
            longitude: data.longitude || 78.7047,
            temperature: temp,
            conditionText: isDay ? "Sunny / Clear" : "Clear Sky",
            weatherCode: code,
            isDay,
            cloudCover: data.current?.cloud_cover ?? 10,
            rain: 0,
            snowfall: 0,
            sunrise: "06:00",
            sunset: "18:30",
            localTimeStr: data.localTimeStr || "",
            timezone: data.timezone || "Asia/Kolkata",
            matchedCategory: isDay ? "sunny" : "night",
            matchedReason: "Real-time Live Weather",
            deviceType: "desktop",
            activeAssetUrl: "",
            activeAssetFileName: "",
            activeAssetSource: "default_fallback",
            lastRefreshed: new Date().toISOString(),
            loading: false,
            error: null,
          };
          setWeatherInfo(info);
          try {
            sessionStorage.setItem("vignesh_portfolio_weather_cache", JSON.stringify(info));
          } catch {}
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("live_weather_updated" as any, handleWeatherUpdate);
    };
  }, []);

  // Weather icon helper
  const getWeatherIcon = (category?: string, isDay: boolean = true) => {
    switch (category) {
      case "rainy":
      case "night_rainy":
        return "🌧️";
      case "snowfall":
        return "❄️";
      case "early_morning":
        return "🌅";
      case "evening":
        return "🌇";
      case "cloudy":
        return "☁️";
      case "night":
        return "🌙";
      case "sunny":
      default:
        return isDay ? "☀️" : "🌙";
    }
  };

  // Convert temperature if Fahrenheit requested
  const getDisplayTemperature = (celsiusTemp?: number) => {
    const c = celsiusTemp ?? 28;
    if (settings.left.tempUnit === "fahrenheit") {
      return `${Math.round((c * 9) / 5 + 32)}°F`;
    }
    return `${c}°C`;
  };

  // Handle Taskbar Icon Click
  const handleIconClick = (icon: TaskbarIcon) => {
    if (icon.destinationType === "externalLink") {
      const url = icon.destination;
      if (url) {
        if (icon.openBehavior === "newTab") {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = url;
        }
      }
      return;
    }

    if (icon.destinationType === "project") {
      const proj = projects.find((p) => p.id === icon.destination);
      onOpenWindow("projects", proj);
      return;
    }

    // Default: Window ID
    onOpenWindow(icon.destination as WindowId);
  };

  // Check if an icon represents currently active window
  const isIconActive = (icon: TaskbarIcon) => {
    if (icon.destinationType === "existingWindow") {
      return activeWindows.includes(icon.destination as WindowId);
    }
    return false;
  };

  // Render Start Button Graphic based on custom settings
  const renderStartButtonIcon = () => {
    const { startIconStyle, startIconCustomUrl } = settings.left;

    if (startIconStyle === "custom" && startIconCustomUrl) {
      return (
        <img
          src={startIconCustomUrl}
          alt="Start"
          className="w-5 h-5 object-contain"
          style={{ imageRendering: "pixelated" }}
          referrerPolicy="no-referrer"
        />
      );
    }

    if (startIconStyle === "win95") {
      return (
        <div className="w-5 h-5 grid grid-cols-2 gap-0.5 p-0.5">
          <div className="bg-[#ef4444] rounded-2xs" />
          <div className="bg-[#22c55e] rounded-2xs" />
          <div className="bg-[#3b82f6] rounded-2xs" />
          <div className="bg-[#eab308] rounded-2xs" />
        </div>
      );
    }

    if (startIconStyle === "pixel8bit") {
      return (
        <div className="w-5 h-5 flex items-center justify-center">
          <PixelWindowsPerspectiveLogo className="w-full h-full" />
        </div>
      );
    }

    // Default Windows 11
    return <PixelWindowsLogo size={22} />;
  };

  const layout = settings.layout || DEFAULT_TASKBAR_SETTINGS.layout;

  // Render elements in the specified section (Left, Center, or Right)
  const renderSectionElements = (section: TaskbarElementPosition) => {
    const isStartHere = layout.startButtonPosition === section && settings.left.showStartButton;
    const isSearchHere = layout.searchBarPosition === section && settings.left.showSearchBar;
    const isWeatherHere = layout.weatherWidgetPosition === section && settings.left.showWeatherWidget;
    const isTrayHere = layout.systemTrayPosition === section && (settings.right.showWifi || settings.right.showVolume || settings.right.showBattery);
    const isClockHere = layout.clockPosition === section && settings.right.showClock;

    // Filter icons explicitly or implicitly assigned to this section
    const sectionIcons = taskbarIcons.filter((icon) => {
      if (icon.placement && icon.placement !== "default") {
        return icon.placement === section;
      }
      return layout.pinnedAppsPosition === section;
    });

    return (
      <div className={`flex items-center gap-2 ${section === "center" ? "mx-auto justify-center" : section === "right" ? "justify-end shrink-0" : "shrink-0"}`}>
        {/* Start Button */}
        {isStartHere && (
          <button
            id="taskbar-start-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStartMenu();
            }}
            aria-label="Start Menu"
            title={settings.left.startTooltip || "Start Menu"}
            className="p-1.5 rounded hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer flex items-center justify-center"
          >
            {renderStartButtonIcon()}
          </button>
        )}

        {/* Search Bar Capsule */}
        {isSearchHere && (
          <button
            id="taskbar-search-bar"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSearch();
            }}
            aria-label="Search"
            className={`h-8 ${
              settings.left.searchStyle === "capsule"
                ? "rounded-full px-3 min-w-[100px] md:min-w-[150px]"
                : settings.left.searchStyle === "pill"
                ? "rounded-md px-3 min-w-[100px] md:min-w-[150px]"
                : "w-8 rounded-full justify-center px-0 min-w-0"
            } bg-[#0e214d]/80 border border-[#1e40af] hover:border-[#60a5fa] hover:bg-[#122b66] transition-all flex items-center gap-2 text-white/80 cursor-pointer`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
              <rect x="2" y="2" width="8" height="8" stroke={settings.left.searchIconColor || "#38bdf8"} strokeWidth="2" fill="none" />
              <rect x="9" y="9" width="5" height="2" fill={settings.left.searchIconColor || "#38bdf8"} transform="rotate(45 9 9)" />
            </svg>
            {settings.left.searchStyle !== "compactIcon" && (
              <span className="font-pixel text-xs text-white/70 truncate">
                {settings.left.searchPlaceholder || "Search"}
              </span>
            )}
          </button>
        )}

        {/* Live Weather Widget */}
        {isWeatherHere && (
          <div className="relative">
            {weatherInfo ? (
              <button
                onClick={() => setShowWeatherPopover((prev) => !prev)}
                aria-label="Live Weather Information"
                title={`${settings.left.weatherLocationOverride || weatherInfo.locationName}: ${getDisplayTemperature(weatherInfo.temperature)}, ${weatherInfo.conditionText}`}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0e214d]/70 border border-[#1e3a8a] hover:bg-[#132c66] hover:border-[#38bdf8] transition-colors cursor-pointer text-white font-pixel text-xs h-8"
              >
                <span className="text-sm">
                  {getWeatherIcon(weatherInfo.matchedCategory, weatherInfo.isDay)}
                </span>

                {settings.left.weatherDisplayMode !== "iconOnly" && (
                  <span className="font-bold text-[#38bdf8]">
                    {getDisplayTemperature(weatherInfo.temperature)}
                  </span>
                )}

                {settings.left.weatherDisplayMode === "full" && (
                  <span className="text-[11px] text-white/70 max-w-[80px] truncate">
                    {settings.left.weatherLocationOverride || weatherInfo.locationName.split(",")[0]}
                  </span>
                )}

                {settings.left.customWeatherBadge && (
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-700 font-bold">
                    {settings.left.customWeatherBadge}
                  </span>
                )}
              </button>
            ) : (
              /* Stable Skeleton placeholder to eliminate layout shift before weather response */
              <div 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e214d]/50 border border-[#1e3a8a]/60 text-white/40 font-pixel text-xs h-8 select-none"
                style={{
                  minWidth: settings.left.weatherDisplayMode === "iconOnly" ? "38px" : settings.left.weatherDisplayMode === "full" ? "130px" : "85px"
                }}
              >
                <span className="text-sm opacity-60">🌤️</span>
                {settings.left.weatherDisplayMode !== "iconOnly" && (
                  <span className="text-[11px] text-[#38bdf8]/50 font-bold">...</span>
                )}
              </div>
            )}

            {/* Weather Popover */}
            {showWeatherPopover && weatherInfo && (
              <div
                className="absolute bottom-12 left-0 w-64 bg-[#0a183d]/95 backdrop-blur-md border-2 border-[#38bdf8] rounded-lg p-3 text-white font-pixel shadow-2xl z-50 animate-in slide-in-from-bottom-2 duration-150 space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center pb-1.5 border-b border-[#1e3a8a]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{getWeatherIcon(weatherInfo.matchedCategory, weatherInfo.isDay)}</span>
                    <span className="text-xs font-bold text-[#38bdf8] truncate">
                      {settings.left.weatherLocationOverride || weatherInfo.locationName}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-700">
                    {settings.left.customWeatherBadge || "LIVE"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {getDisplayTemperature(weatherInfo.temperature)}
                    </div>
                    <div className="text-[11px] text-white/80">{weatherInfo.conditionText}</div>
                  </div>
                  <div className="text-right text-[10px] text-white/60 space-y-0.5">
                    <div>Sky: <span className="text-white capitalize">{weatherInfo.matchedCategory.replace("_", " ")}</span></div>
                    <div>Cloud: <span className="text-white">{weatherInfo.cloudCover}%</span></div>
                    {weatherInfo.localTimeStr && <div>Local: <span className="text-amber-300">{weatherInfo.localTimeStr}</span></div>}
                  </div>
                </div>

                <div className="text-[9px] text-[#93c5fd] bg-[#0c2254] p-1.5 rounded border border-[#1e40af] leading-tight">
                  Atmospheric cycle is active.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pinned Icons in this Section */}
        {sectionIcons.length > 0 && (
          <div className="flex items-center gap-1.5 px-1">
            {sectionIcons.map((icon, idx) => {
              const active = isIconActive(icon);
              const isHovered = hoveredIconId === icon.id;

              return (
                <div
                  key={`${icon.id}-${idx}`}
                  className="relative flex items-center justify-center"
                  onMouseEnter={() => setHoveredIconId(icon.id)}
                  onMouseLeave={() => setHoveredIconId(null)}
                >
                  <button
                    id={`taskbar-icon-${icon.id}`}
                    onClick={() => handleIconClick(icon)}
                    aria-label={icon.name}
                    className={`relative p-1.5 rounded transition-all cursor-pointer flex items-center justify-center ${
                      active
                        ? "bg-white/20 shadow-inner"
                        : "hover:bg-white/15 active:bg-white/25"
                    }`}
                  >
                    {renderTaskbarIconGraphic(icon.iconImage, 22)}

                    {/* Windows 11 Running/Active Indicator Bar */}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3.5 h-0.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]" />
                    )}

                    {/* Notification Badge */}
                    {icon.badge && (
                      <span className="absolute -top-1 -right-1 px-1 text-[8px] font-bold bg-[#e11d48] text-white rounded-full leading-tight border border-white/40 shadow">
                        {icon.badge}
                      </span>
                    )}
                  </button>

                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#09152e]/95 backdrop-blur-xs border border-[#38bdf8] text-white font-pixel text-[10px] px-2.5 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none animate-in fade-in zoom-in-95">
                      {icon.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* System Tray Controls */}
        {isTrayHere && (
          <div className="flex items-center gap-1">
            {settings.right.showTrayChevron && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTray();
                }}
                aria-label="Show hidden icons"
                className="p-1 text-white/80 hover:bg-white/10 rounded cursor-pointer font-pixel text-xs"
              >
                ^
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleTray();
              }}
              aria-label="System Tray Controls"
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/15 transition-colors cursor-pointer"
            >
              {/* Wi-Fi Icon */}
              {settings.right.showWifi && (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                  <path d="M1 4C5 0 11 0 15 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                  <path d="M4 7C6.5 4.5 9.5 4.5 12 7" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                  <path d="M6.5 10C7.2 9.3 8.8 9.3 9.5 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                  <circle cx="8" cy="13" r="1.5" fill="#ffffff" />
                </svg>
              )}

              {/* Sound Icon */}
              {settings.right.showVolume && (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                  <polygon points="1,5 5,5 9,2 9,14 5,11 1,11" fill="#ffffff" />
                  <path d="M11 4C12.5 5.5 12.5 10.5 11 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                  <path d="M13 2C15.5 4.5 15.5 11.5 13 14" stroke="#ffffff" strokeWidth="2" strokeLinecap="square" />
                </svg>
              )}

              {/* Battery Icon */}
              {settings.right.showBattery && (
                <div className="flex items-center gap-1">
                  <svg width="18" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                    <rect x="1" y="1" width="16" height="10" stroke="#ffffff" strokeWidth="2" fill="none" />
                    <rect x="18" y="4" width="2" height="4" fill="#ffffff" />
                    <rect
                      x="3"
                      y="3"
                      width={Math.max(2, Math.round((Number(settings.right.batteryPercentage || 100) / 100) * 12))}
                      height="6"
                      fill={Number(settings.right.batteryPercentage || 100) < 20 ? "#ef4444" : "#22c55e"}
                    />
                  </svg>
                  <span className="text-[10px] text-emerald-400 font-pixel font-bold hidden md:inline">
                    {settings.right.batteryPercentage ?? 100}%
                  </span>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Clock & Date */}
        {isClockHere && (
          <button
            onClick={onToggleTray}
            aria-label="Clock and Calendar"
            className="flex flex-col items-end justify-center px-2 py-0.5 rounded hover:bg-white/15 transition-colors cursor-pointer text-right"
          >
            <span className="text-[11px] font-pixel text-white font-medium leading-none">
              {timeStr}
            </span>
            {settings.right.showLocationSubtitle && (
              <span className="text-[9px] font-pixel text-[#38bdf8] leading-none mt-1 truncate max-w-[120px]">
                {settings.right.locationSubtitleText && settings.right.locationSubtitleText !== "Trichy, IN"
                  ? settings.right.locationSubtitleText
                  : weatherInfo?.locationName || "Local"}
              </span>
            )}
            {!settings.right.showLocationSubtitle && settings.right.showDate && (
              <span className="text-[10px] font-pixel text-white/80 leading-none mt-1">
                {dateStr}
              </span>
            )}
          </button>
        )}
      </div>
    );
  };

  // Render Mobile Specific Taskbar
  if (deviceType === "mobile") {
    const mob = settings.mobile || DEFAULT_TASKBAR_SETTINGS.mobile;
    const mobIcons = taskbarIcons.slice(0, mob.maxPinnedAppsCount || 4);

    return (
      <footer
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-0 left-0 right-0 bg-[#0b1739]/95 backdrop-blur-md border-t border-[#1e3a8a] z-50 flex items-center px-2.5 select-none gap-2 ${
          mob.taskbarLayout === "center"
            ? "justify-center"
            : mob.taskbarLayout === "left"
            ? "justify-start"
            : "justify-between"
        }`}
        style={{
          height: `${mob.taskbarHeight || 48}px`,
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Mobile Left / Start + Search + Weather */}
        <div className="flex items-center gap-1.5 shrink-0">
          {mob.showStartButton !== false && (
            <button
              id="taskbar-start-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStartMenu();
              }}
              aria-label="Start Menu"
              title={settings.left.startTooltip || "Start Menu"}
              className="p-1 rounded hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer flex items-center justify-center"
            >
              {renderStartButtonIcon()}
            </button>
          )}

          {mob.showSearchBar && mob.searchStyle !== "hidden" && (
            <button
              id="taskbar-search-bar"
              onClick={onToggleSearch}
              aria-label="Search"
              className="h-7 w-7 rounded-full bg-[#0e214d]/80 border border-[#1e40af] hover:border-[#60a5fa] hover:bg-[#122b66] transition-all flex items-center justify-center text-white/80 cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                <rect x="2" y="2" width="8" height="8" stroke={settings.left.searchIconColor || "#38bdf8"} strokeWidth="2" fill="none" />
                <rect x="9" y="9" width="5" height="2" fill={settings.left.searchIconColor || "#38bdf8"} transform="rotate(45 9 9)" />
              </svg>
            </button>
          )}

          {mob.showWeatherWidget && weatherInfo && (
            <button
              onClick={() => setShowWeatherPopover((prev) => !prev)}
              aria-label="Live Weather Information"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0e214d]/70 border border-[#1e3a8a] text-[10px] text-white font-pixel"
            >
              <span>{getWeatherIcon(weatherInfo.matchedCategory, weatherInfo.isDay)}</span>
              {mob.weatherDisplayMode !== "iconOnly" && (
                <span className="font-bold text-[#38bdf8]">
                  {getDisplayTemperature(weatherInfo.temperature)}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Mobile Pinned Apps */}
        {mob.showPinnedApps !== false && (
          <div className="flex items-center gap-1 overflow-x-hidden">
            {mobIcons.map((icon, idx) => {
              const active = isIconActive(icon);
              const size = mob.iconSize || 20;

              return (
                <div key={`${icon.id}-${idx}`} className="relative group">
                  <button
                    onClick={() => handleIconClick(icon)}
                    className={`relative p-1 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                      active
                        ? "bg-white/20 border-b-2 border-[#38bdf8]"
                        : "hover:bg-white/10 active:bg-white/20"
                    }`}
                  >
                    {renderTaskbarIconGraphic(icon.iconImage, size)}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile System Tray & Clock */}
        <div className="flex items-center gap-1.5 shrink-0">
          {mob.showSystemTray && (
            <button
              onClick={onToggleTray}
              aria-label="System Tray"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/15 transition-colors cursor-pointer bg-white/5 border border-white/10"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                <circle cx="8" cy="13" r="1.5" fill="#ffffff" />
                <path d="M5 10C6 9 10 9 11 10" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[9px] font-pixel text-emerald-400 font-bold">100%</span>
            </button>
          )}

          {mob.showClock !== false && (
            <button
              onClick={onToggleTray}
              aria-label="Clock and Calendar"
              className="flex flex-col items-end justify-center px-1.5 py-0.5 rounded hover:bg-white/15 transition-colors cursor-pointer text-right"
            >
              <span className="text-[10px] font-pixel text-white font-bold leading-none">
                {timeStr}
              </span>
              {mob.showLocationSubtitle !== false && (
                <span className="text-[8px] font-pixel text-[#38bdf8] leading-none mt-0.5 truncate max-w-[60px]">
                  {settings.right.locationSubtitleText && settings.right.locationSubtitleText !== "Trichy, IN"
                    ? settings.right.locationSubtitleText.split(",")[0]
                    : weatherInfo?.locationName?.split(",")[0] || "Local"}
                </span>
              )}
            </button>
          )}
        </div>
      </footer>
    );
  }

  // Render Tablet Specific Taskbar
  if (deviceType === "tablet") {
    const tab = settings.tablet || DEFAULT_TASKBAR_SETTINGS.tablet;
    const tabIcons = taskbarIcons.slice(0, tab.maxPinnedAppsCount || 6);

    return (
      <footer
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 bg-[#0b1739]/95 backdrop-blur-md border-t border-[#1e3a8a] z-50 flex items-center justify-between px-3 select-none gap-2"
        style={{
          height: `${tab.taskbarHeight || 48}px`,
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Tablet Left */}
        <div className="flex items-center gap-2 shrink-0">
          {tab.showStartButton !== false && (
            <button
              id="taskbar-start-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStartMenu();
              }}
              aria-label="Start Menu"
              title={settings.left.startTooltip || "Start Menu"}
              className="p-1.5 rounded hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer flex items-center justify-center"
            >
              {renderStartButtonIcon()}
            </button>
          )}

          {tab.showSearchBar && tab.searchStyle !== "hidden" && (
            <button
              id="taskbar-search-bar"
              onClick={onToggleSearch}
              aria-label="Search"
              className={`h-7.5 px-3 rounded-full bg-[#0e214d]/80 border border-[#1e40af] hover:border-[#60a5fa] hover:bg-[#122b66] transition-all flex items-center gap-2 text-white/80 cursor-pointer`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                <rect x="2" y="2" width="8" height="8" stroke={settings.left.searchIconColor || "#38bdf8"} strokeWidth="2" fill="none" />
                <rect x="9" y="9" width="5" height="2" fill={settings.left.searchIconColor || "#38bdf8"} transform="rotate(45 9 9)" />
              </svg>
              {tab.searchStyle !== "compactIcon" && (
                <span className="font-pixel text-xs text-white/70 truncate max-w-[80px]">
                  {settings.left.searchPlaceholder || "Search"}
                </span>
              )}
            </button>
          )}

          {tab.showWeatherWidget && (
            weatherInfo ? (
              <button
                onClick={() => setShowWeatherPopover((prev) => !prev)}
                aria-label="Live Weather Information"
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0e214d]/70 border border-[#1e3a8a] text-xs text-white font-pixel h-7"
              >
                <span>{getWeatherIcon(weatherInfo.matchedCategory, weatherInfo.isDay)}</span>
                {tab.weatherDisplayMode !== "iconOnly" && (
                  <span className="font-bold text-[#38bdf8]">
                    {getDisplayTemperature(weatherInfo.temperature)}
                  </span>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0e214d]/50 border border-[#1e3a8a]/60 text-xs text-white/40 font-pixel h-7 min-w-[50px]">
                <span className="opacity-60">🌤️</span>
              </div>
            )
          )}
        </div>

        {/* Tablet Center Pinned Apps */}
        {tab.showPinnedApps !== false && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 justify-center pointer-events-auto z-10">
            {tabIcons.map((icon, idx) => {
              const active = isIconActive(icon);
              const size = tab.iconSize || 22;

              return (
                <div key={`${icon.id}-${idx}`} className="relative group">
                  <button
                    onClick={() => handleIconClick(icon)}
                    className={`relative p-1.5 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                      active
                        ? "bg-white/20 border-b-2 border-[#38bdf8]"
                        : "hover:bg-white/10 active:bg-white/20"
                    }`}
                  >
                    {renderTaskbarIconGraphic(icon.iconImage, size)}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tablet Right System Tray & Clock */}
        <div className="flex items-center gap-2 shrink-0 z-10 ml-auto">
          {tab.showSystemTray !== false && (
            <button
              onClick={onToggleTray}
              aria-label="System Tray"
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/15 transition-colors cursor-pointer bg-white/5 border border-white/10 text-xs font-pixel"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
                <circle cx="8" cy="13" r="1.5" fill="#ffffff" />
                <path d="M5 10C6 9 10 9 11 10" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] text-emerald-400 font-bold">100%</span>
            </button>
          )}

          {tab.showClock !== false && (
            <button
              onClick={onToggleTray}
              aria-label="Clock and Calendar"
              className="flex flex-col items-end justify-center px-2 py-0.5 rounded hover:bg-white/15 transition-colors cursor-pointer text-right"
            >
              <span className="text-[11px] font-pixel text-white font-medium leading-none">
                {timeStr}
              </span>
              {tab.showLocationSubtitle !== false && (
                <span className="text-[9px] font-pixel text-[#38bdf8] leading-none mt-1 truncate max-w-[120px]">
                  {settings.right.locationSubtitleText && settings.right.locationSubtitleText !== "Trichy, IN"
                    ? settings.right.locationSubtitleText
                    : weatherInfo?.locationName || "Local"}
                </span>
              )}
            </button>
          )}
        </div>
      </footer>
    );
  }

  const isDesktopCentered = layout.pinnedAppsPosition === "center" || layout.taskbarLayout === "center";

  return (
    <footer
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-0 left-0 right-0 h-12 bg-[#0b1739]/90 backdrop-blur-md border-t border-[#1e3a8a] z-50 flex items-center justify-between px-3 select-none"
      style={{
        boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* 1. LEFT ZONE */}
      <div className={`flex items-center min-w-0 z-10 shrink-0 ${!isDesktopCentered ? "flex-1" : ""}`}>
        {renderSectionElements("left")}
      </div>

      {/* 2. CENTER ZONE - Locked to absolute center when centered to prevent any layout shift */}
      {isDesktopCentered ? (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto z-10">
          {renderSectionElements("center")}
        </div>
      ) : null}

      {/* 3. RIGHT ZONE */}
      <div className="flex items-center min-w-0 justify-end z-10 shrink-0 ml-auto">
        {renderSectionElements("right")}
      </div>
    </footer>
  );
};
