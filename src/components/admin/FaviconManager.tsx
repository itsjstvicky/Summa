import React, { useState, useEffect, useRef } from "react";
import { PortfolioInfo } from "../../types";
import {
  uploadFileToDrive,
  getOrCreateAppFolder,
  getDirectDriveMediaUrl,
  getAccessToken
} from "../../services/googleDriveService";
import { User } from "firebase/auth";
import { GoogleDrivePickerModal } from "./GoogleDrivePickerModal";
import {
  saveLocalMasterBackup,
  syncWithServer,
} from "../../services/persistenceService";

interface FaviconManagerProps {
  token: string;
  portfolio: PortfolioInfo;
  onUpdatePortfolio: (updated: PortfolioInfo) => void;
  onNotification: (msg: string, type?: "success" | "error") => void;
  googleUser?: User | null;
}

// Preset color palette for the 16x16 Pixel Favicon Editor
const PALETTE = [
  "#38bdf8", // Sky Blue
  "#0284c7", // Deep Blue
  "#1e3a8a", // Navy
  "#22c55e", // Lime Green
  "#10b981", // Emerald
  "#eab308", // Golden Yellow
  "#f97316", // Neon Orange
  "#ef4444", // Crimson Red
  "#ec4899", // Hot Pink
  "#a855f7", // Violet
  "#6366f1", // Indigo
  "#ffffff", // Crisp White
  "#94a3b8", // Slate Gray
  "#475569", // Dark Slate
  "#0f172a", // Obsidian Black
  "transparent" // Eraser / Blank
];

// Curated 16x16 Preset Icons
const PRESET_FAVICONS = [
  {
    id: "windows_pixel",
    name: "Windows 11 Pixel",
    icon: "🪟",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="6" fill="#0b1739"/><rect x="1" y="1" width="30" height="30" rx="5" fill="none" stroke="#1e3a8a" stroke-width="1"/><rect x="6" y="6" width="9" height="9" rx="1" fill="#38bdf8"/><rect x="17" y="6" width="9" height="9" rx="1" fill="#0284c7"/><rect x="6" y="17" width="9" height="9" rx="1" fill="#0284c7"/><rect x="17" y="17" width="9" height="9" rx="1" fill="#38bdf8"/><rect x="7" y="7" width="2" height="2" fill="#e0f2fe"/><rect x="18" y="7" width="2" height="2" fill="#bae6fd"/><rect x="7" y="18" width="2" height="2" fill="#bae6fd"/><rect x="18" y="18" width="2" height="2" fill="#e0f2fe"/></svg>`
  },
  {
    id: "cyber_v",
    name: "Initial 'V' Neon",
    icon: "🔤",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="7" fill="#0a1931"/><rect x="1" y="1" width="30" height="30" rx="6" fill="none" stroke="#38bdf8" stroke-width="1.5"/><text x="16" y="23" font-family="'Press Start 2P', monospace, sans-serif" font-size="16" font-weight="bold" fill="#38bdf8" text-anchor="middle">V</text><rect x="6" y="6" width="3" height="3" fill="#60a5fa" opacity="0.6"/><rect x="23" y="6" width="3" height="3" fill="#60a5fa" opacity="0.6"/></svg>`
  },
  {
    id: "floppy_disk",
    name: "8-Bit Floppy Disk",
    icon: "💾",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="6" fill="#1e293b"/><rect x="5" y="5" width="22" height="22" rx="2" fill="#2563eb"/><polygon points="23,5 27,9 27,27 5,27 5,5" fill="#1d4ed8"/><rect x="8" y="5" width="13" height="10" fill="#f8fafc"/><rect x="10" y="6" width="3" height="6" fill="#0284c7"/><rect x="8" y="18" width="16" height="8" rx="1" fill="#f1f5f9"/><rect x="10" y="20" width="12" height="2" fill="#94a3b8"/></svg>`
  },
  {
    id: "cyber_diamond",
    name: "Cyber Diamond",
    icon: "💎",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="6" fill="#030712"/><polygon points="16,3 28,12 16,29 4,12" fill="#0ea5e9"/><polygon points="16,3 22,12 16,29 10,12" fill="#38bdf8"/><polygon points="16,3 28,12 22,12" fill="#7dd3fc"/><polygon points="16,3 4,12 10,12" fill="#bae6fd"/><polygon points="16,29 10,12 16,12" fill="#0284c7"/></svg>`
  },
  {
    id: "pixel_heart",
    name: "Retro Pixel Heart",
    icon: "💖",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="6" fill="#1e1b4b"/><path d="M7 6h6v4H7zM19 6h6v4h-6zM4 10h12v4H4zM16 10h12v4H16zM4 14h24v4H4zM7 18h18v4H7zM10 22h12v4h-12zM13 26h6v4h-6z" fill="#f43f5e"/><rect x="7" y="10" width="3" height="4" fill="#fecdd3"/></svg>`
  },
  {
    id: "neon_star",
    name: "Neon Arcade Star",
    icon: "⭐",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="6" fill="#0f172a"/><polygon points="16,3 20,12 30,13 22,20 25,30 16,24 7,30 10,20 2,13 12,12" fill="#fbbf24"/><polygon points="16,7 19,13 26,14 20,19 22,26 16,21 10,26 12,19 6,14 13,13" fill="#fef08a"/></svg>`
  },
  {
    id: "terminal_prompt",
    name: "Pixel Terminal >_",
    icon: "💻",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="6" fill="#020617"/><rect x="2" y="2" width="28" height="28" rx="5" fill="none" stroke="#22c55e" stroke-width="1.5"/><text x="6" y="21" font-family="monospace" font-size="14" font-weight="bold" fill="#22c55e">&gt;_</text><rect x="20" y="12" width="4" height="9" fill="#4ade80"/></svg>`
  },
  {
    id: "space_invader",
    name: "Pixel Alien Invader",
    icon: "👾",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="6" fill="#090514"/><path d="M10 6h12v3H10zM7 9h18v3H7zM7 12h3v6H7zM22 12h3v6h-3zM10 15h12v6H10zM10 21h3v6h-3zM19 21h3v6h-3zM4 15h3v9H4zM25 15h3v9h-3z" fill="#a855f7"/><rect x="11" y="12" width="3" height="3" fill="#ffffff"/><rect x="18" y="12" width="3" height="3" fill="#ffffff"/></svg>`
  }
];

export const FaviconManager: React.FC<FaviconManagerProps> = ({
  token,
  portfolio,
  onUpdatePortfolio,
  onNotification,
  googleUser
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "pixel_editor" | "emoji_generator" | "text_generator" | "presets">("upload");
  const [currentFavicon, setCurrentFavicon] = useState<string>(portfolio.faviconUrl || "/favicon.svg");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 16x16 Pixel Grid State
  const GRID_SIZE = 16;
  const [grid, setGrid] = useState<string[]>(() => {
    const arr = new Array(GRID_SIZE * GRID_SIZE).fill("transparent");
    // Pre-populate with a cool default pattern (Windows/Vignesh icon)
    // Box 1
    for (let r = 3; r <= 6; r++) {
      for (let c = 3; c <= 6; c++) arr[r * 16 + c] = "#38bdf8";
    }
    // Box 2
    for (let r = 3; r <= 6; r++) {
      for (let c = 9; c <= 12; c++) arr[r * 16 + c] = "#0284c7";
    }
    // Box 3
    for (let r = 9; r <= 12; r++) {
      for (let c = 3; c <= 6; c++) arr[r * 16 + c] = "#0284c7";
    }
    // Box 4
    for (let r = 9; r <= 12; r++) {
      for (let c = 9; c <= 12; c++) arr[r * 16 + c] = "#38bdf8";
    }
    return arr;
  });

  const [selectedColor, setSelectedColor] = useState<string>("#38bdf8");
  const [customColorHex, setCustomColorHex] = useState<string>("#38bdf8");
  const [activeTool, setActiveTool] = useState<"pencil" | "eraser" | "bucket" | "picker">("pencil");
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);

  // Emoji Generator State
  const [emojiInput, setEmojiInput] = useState<string>("🚀");
  const [emojiBgColor, setEmojiBgColor] = useState<string>("#0b1739");
  const [emojiBorderColor, setEmojiBorderColor] = useState<string>("#38bdf8");
  const [emojiShape, setEmojiShape] = useState<"rounded" | "square" | "circle">("rounded");

  // Monogram / Text Generator State
  const [monogramText, setMonogramText] = useState<string>("V");
  const [monogramFont, setMonogramFont] = useState<string>("'Press Start 2P', monospace");
  const [monogramTextColor, setMonogramTextColor] = useState<string>("#38bdf8");
  const [monogramBgColor, setMonogramBgColor] = useState<string>("#071329");
  const [monogramBorderColor, setMonogramBorderColor] = useState<string>("#1e40af");

  // Tab Title Preview state
  const [pageTitle, setPageTitle] = useState<string>("PORTFOLIO.EXE - Vignesh");

  useEffect(() => {
    if (portfolio.faviconUrl) {
      setCurrentFavicon(portfolio.faviconUrl);
    }
  }, [portfolio.faviconUrl]);

  // Convert SVG string to Data URL
  const svgToDataUrl = (svgString: string) => {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  };

  // Convert current 16x16 Pixel Grid to an SVG Data URL
  const generateGridSvg = (canvasGrid = grid): string => {
    let rects = "";
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const color = canvasGrid[row * GRID_SIZE + col];
        if (color && color !== "transparent") {
          rects += `<rect x="${col}" y="${row}" width="1" height="1" fill="${color}" />`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" style="image-rendering:pixelated"><rect width="16" height="16" rx="3" fill="#081026"/>${rects}</svg>`;
  };

  // Handle drawing on pixel canvas
  const handlePixelClick = (index: number) => {
    const newGrid = [...grid];
    if (activeTool === "pencil") {
      newGrid[index] = selectedColor;
      setGrid(newGrid);
    } else if (activeTool === "eraser") {
      newGrid[index] = "transparent";
      setGrid(newGrid);
    } else if (activeTool === "picker") {
      const picked = grid[index];
      if (picked && picked !== "transparent") {
        setSelectedColor(picked);
      }
      setActiveTool("pencil");
    } else if (activeTool === "bucket") {
      // Flood fill algorithm
      const targetColor = grid[index];
      if (targetColor === selectedColor) return;
      const queue = [index];
      const visited = new Set<number>();

      while (queue.length > 0) {
        const curr = queue.pop()!;
        if (visited.has(curr)) continue;
        visited.add(curr);

        if (newGrid[curr] === targetColor) {
          newGrid[curr] = selectedColor;
          const r = Math.floor(curr / GRID_SIZE);
          const c = curr % GRID_SIZE;

          if (r > 0) queue.push((r - 1) * GRID_SIZE + c);
          if (r < GRID_SIZE - 1) queue.push((r + 1) * GRID_SIZE + c);
          if (c > 0) queue.push(r * GRID_SIZE + (c - 1));
          if (c < GRID_SIZE - 1) queue.push(r * GRID_SIZE + (c + 1));
        }
      }
      setGrid(newGrid);
    }
  };

  // Save active Favicon to Portfolio backend
  const handleApplyFavicon = async (newFaviconUrl: string) => {
    setIsSaving(true);
    try {
      const updatedPortfolio: PortfolioInfo = {
        ...portfolio,
        faviconUrl: newFaviconUrl
      };

      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedPortfolio)
      });

      if (!res.ok) throw new Error("Failed to save Favicon to database");

      saveLocalMasterBackup({ portfolio: updatedPortfolio });
      localStorage.setItem("vignesh_portfolio_favicon_backup", newFaviconUrl);
      syncWithServer(token);

      setCurrentFavicon(newFaviconUrl);
      onUpdatePortfolio(updatedPortfolio);

      // Real-time update live in current browser head
      const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement("link");
      link.type = newFaviconUrl.endsWith(".svg") || newFaviconUrl.startsWith("data:image/svg") ? "image/svg+xml" : "image/x-icon";
      link.rel = "icon";
      link.href = newFaviconUrl;
      document.head.appendChild(link);

      onNotification("✨ Favicon updated & published successfully!", "success");
    } catch (err: any) {
      onNotification(`Error saving favicon: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // File Upload Handler (Robust local FileReader + optional Google Drive background sync)
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // 1. Process and convert image to fast Data URL for instantaneous local favicon updates
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) resolve(e.target.result as string);
          else reject(new Error("Failed to read image buffer"));
        };
        reader.onerror = () => reject(new Error("File reader error"));
        reader.readAsDataURL(file);
      });

      // Apply locally first so it immediately reflects in the UI & Tab
      await handleApplyFavicon(fileDataUrl);

      // 2. If Google Drive is actively connected with valid token, upload in background
      try {
        const driveToken = await getAccessToken();
        if (googleUser && driveToken) {
          const folder = await getOrCreateAppFolder("Portfolio Files/Favicons");
          const driveFile = await uploadFileToDrive(file, `favicon_${Date.now()}_${file.name}`, file.type, folder.id);
          const directUrl = getDirectDriveMediaUrl(driveFile.id);
          // Update to persistent Drive link if successful
          await handleApplyFavicon(directUrl);
        }
      } catch (driveErr) {
        // Safe to ignore Drive errors since local Data URL is already saved and applied
        console.warn("Drive sync skipped/failed, keeping local image data URL:", driveErr);
      }
    } catch (err: any) {
      onNotification(`Upload failed: ${err.message}`, "error");
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  // Generate and apply Emoji Favicon
  const handleGenerateEmojiFavicon = () => {
    const rx = emojiShape === "circle" ? "16" : emojiShape === "rounded" ? "6" : "0";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="${rx}" fill="${emojiBgColor}"/><rect x="1" y="1" width="30" height="30" rx="${Math.max(0, parseInt(rx) - 1)}" fill="none" stroke="${emojiBorderColor}" stroke-width="1.5"/><text x="16" y="23" font-size="18" text-anchor="middle">${emojiInput}</text></svg>`;
    const dataUrl = svgToDataUrl(svg);
    handleApplyFavicon(dataUrl);
  };

  // Generate and apply Monogram Favicon
  const handleGenerateMonogramFavicon = () => {
    const text = (monogramText || "V").slice(0, 2);
    const fontSize = text.length > 1 ? "12" : "16";
    const yPos = text.length > 1 ? "21" : "23";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="6" fill="${monogramBgColor}"/><rect x="1" y="1" width="30" height="30" rx="5" fill="none" stroke="${monogramBorderColor}" stroke-width="1.5"/><text x="16" y="${yPos}" font-family="${monogramFont}" font-size="${fontSize}" font-weight="bold" fill="${monogramTextColor}" text-anchor="middle">${text}</text></svg>`;
    const dataUrl = svgToDataUrl(svg);
    handleApplyFavicon(dataUrl);
  };

  // Apply Pixel Grid
  const handleApplyPixelGrid = () => {
    const svg = generateGridSvg();
    const dataUrl = svgToDataUrl(svg);
    handleApplyFavicon(dataUrl);
  };

  // Download SVG
  const handleDownloadSvg = () => {
    let svgContent = "";
    if (currentFavicon.startsWith("data:image/svg+xml;utf8,")) {
      svgContent = decodeURIComponent(currentFavicon.replace("data:image/svg+xml;utf8,", ""));
    } else {
      svgContent = generateGridSvg();
    }
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-favicon.svg";
    a.click();
    URL.revokeObjectURL(url);
    onNotification("Favicon SVG downloaded!");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0c234b] via-[#103166] to-[#0c234b] border-2 border-[#1e3a8a] p-4 sm:p-5 rounded-lg shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🌐</span>
            <h2 className="text-base sm:text-lg font-bold text-[#38bdf8] tracking-wider">
              FAVICON &amp; BROWSER TAB CUSTOMIZER
            </h2>
          </div>
          <p className="text-xs text-white/70 mt-1 max-w-2xl">
            உங்கள் Website Browser Tab Icon (Favicon)-ஐ இங்கே நேரடியாக அப்லோட் செய்யலாம், Pixel Art டூலில் வரையலாம், அல்லது Emoji / Monogram லோகோவாக உருவாக்கலாம்.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleApplyFavicon("/favicon.svg")}
            className="flex-1 sm:flex-none bg-[#1e293b] hover:bg-[#334155] border border-[#64748b] text-white text-xs px-3 py-2 rounded cursor-pointer transition-colors"
          >
            ↺ Reset Default
          </button>
          <button
            onClick={handleDownloadSvg}
            className="flex-1 sm:flex-none bg-[#0284c7] hover:bg-[#0369a1] border border-[#38bdf8] text-white text-xs font-bold px-3 py-2 rounded cursor-pointer transition-colors"
          >
            ⬇ Download SVG
          </button>
        </div>
      </div>

      {/* Live Browser Tab Mockup & Realistic Simulator */}
      <div className="bg-[#0b1739] border-2 border-[#1e40af] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5">
            <span>💻</span> LIVE BROWSER TAB PREVIEW (REAL-TIME SIMULATION)
          </span>
          <span className="text-[10px] text-white/50">Simulating Chrome / Edge Tab</span>
        </div>

        {/* Chrome Tab Bar Mockup */}
        <div className="bg-[#050b18] border border-[#1e3a8a] rounded-md p-2 space-y-2">
          {/* Browser Window Bar */}
          <div className="flex items-center gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block"></span>
            </div>
            
            {/* Active Simulated Tab */}
            <div className="flex items-center gap-2 bg-[#12224d] border-t-2 border-x border-[#38bdf8] px-3 py-1.5 rounded-t-md max-w-xs shadow-md">
              <div className="w-4 h-4 rounded flex items-center justify-center overflow-hidden flex-shrink-0 bg-transparent">
                <img
                  src={currentFavicon}
                  alt="Tab Favicon"
                  className="w-4 h-4 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/favicon.svg";
                  }}
                />
              </div>
              <span className="text-xs font-medium text-white truncate min-w-0">
                {pageTitle}
              </span>
              <span className="text-[10px] text-white/40 ml-auto cursor-pointer hover:text-white">✕</span>
            </div>

            <div className="text-white/40 text-xs px-2">+</div>
          </div>

          {/* Simulated Browser URL Bar */}
          <div className="flex items-center gap-2 bg-[#09142b] border border-[#1e3a8a] px-3 py-1.5 rounded text-xs text-white/80">
            <span className="text-[#22c55e]">🔒</span>
            <span className="text-white/40">https://</span>
            <span className="text-white">portfolio-vignesh.dev</span>
            <span className="text-[#38bdf8] ml-auto text-[10px] bg-[#1e3a8a]/50 px-2 py-0.5 rounded">
              Active Favicon Loaded
            </span>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#1e3a8a] pb-2">
        {[
          { id: "upload", label: "📁 Upload Custom Image", icon: "⬆️" },
          { id: "pixel_editor", label: "🎨 16x16 Pixel Art Canvas Editor", icon: "🖌️" },
          { id: "presets", label: "✨ 1-Click Retro Presets", icon: "⭐" },
          { id: "emoji_generator", label: "😀 Emoji Favicon Maker", icon: "🚀" },
          { id: "text_generator", label: "🔤 Monogram Initials Maker", icon: "🔤" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 rounded-t text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#1d4ed8] border-t-2 border-x border-[#60a5fa] text-white shadow"
                : "bg-[#0a1838] text-white/70 hover:bg-[#133066] hover:text-white"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: UPLOAD & URL MANAGER */}
      {activeTab === "upload" && (
        <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-md space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[#38bdf8] mb-1">UPLOAD FAVICON IMAGE</h3>
            <p className="text-xs text-white/70">
              Upload any image file (.svg, .png, .ico, .jpg, .webp). Square images (32x32 to 512x512) work best.
            </p>
          </div>

          {/* Drag & Drop File Upload Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className={`border-2 border-dashed ${
              isDragging
                ? "border-[#38bdf8] bg-[#0c285e] ring-4 ring-[#38bdf8]/30 scale-[1.01]"
                : "border-[#38bdf8]/60 hover:border-[#38bdf8] bg-[#091530]"
            } p-6 sm:p-8 rounded-lg text-center space-y-3 transition-all`}
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-[#1e3a8a]/50 flex items-center justify-center text-2xl">
              📥
            </div>
            <div>
              <p className="text-xs font-bold text-white">Drag &amp; drop your Favicon file here, or click Browse</p>
              <span className="text-[10px] text-white/50 block mt-0.5">
                Supported formats: SVG, PNG, ICO, JPG, WEBP (Max 5MB)
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <input
                type="file"
                id="favicon-file-input"
                accept="image/svg+xml,image/png,image/x-icon,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
              <label
                htmlFor="favicon-file-input"
                className="inline-block bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] text-white text-xs font-bold px-4 py-2.5 rounded cursor-pointer shadow"
              >
                {isUploading ? "Uploading..." : "📂 Choose Local Image"}
              </label>
              <button
                type="button"
                onClick={() => setIsDrivePickerOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white text-xs font-bold px-4 py-2.5 rounded cursor-pointer shadow transition-colors"
              >
                <span>☁️ Pick from Google Drive</span>
              </button>
            </div>
          </div>

          {/* Direct URL Input */}
          <div className="space-y-2 pt-2 border-t border-[#1e3a8a]">
            <label className="block text-xs font-bold text-white/90">
              Or Enter Direct Image URL / Cloud CDN Link:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="https://example.com/my-favicon.png"
                value={currentFavicon}
                onChange={(e) => setCurrentFavicon(e.target.value)}
                className="flex-1 bg-[#0a152d] border border-[#1e40af] p-2.5 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
              />
              <button
                onClick={() => handleApplyFavicon(currentFavicon)}
                disabled={isSaving}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded border border-[#34d399] cursor-pointer whitespace-nowrap"
              >
                {isSaving ? "Saving..." : "💾 Apply URL"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE 16x16 PIXEL ART CANVAS EDITOR */}
      {activeTab === "pixel_editor" && (
        <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-md space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#38bdf8]">16x16 RETRO PIXEL ART FAVICON CANVAS</h3>
              <p className="text-xs text-white/70">
                Draw your own authentic pixel art icon. Click or drag to paint pixels.
              </p>
            </div>
            <button
              onClick={handleApplyPixelGrid}
              disabled={isSaving}
              className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-4 py-2 rounded border border-[#34d399] shadow-lg cursor-pointer"
            >
              {isSaving ? "Applying..." : "🚀 Apply Canvas as Favicon"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Tools & Palette */}
            <div className="lg:col-span-4 space-y-4 bg-[#091530] p-4 rounded-md border border-[#1e3a8a]">
              {/* Tool Selection */}
              <div>
                <label className="block text-[11px] font-bold text-[#38bdf8] mb-2 uppercase tracking-wider">
                  Drawing Tools
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setActiveTool("pencil")}
                    className={`px-3 py-2 rounded text-xs flex items-center justify-center gap-1.5 font-bold ${
                      activeTool === "pencil"
                        ? "bg-[#1d4ed8] border border-[#60a5fa] text-white"
                        : "bg-[#0f2854] text-white/80 hover:bg-[#133066]"
                    }`}
                  >
                    <span>✏️</span> Pencil
                  </button>
                  <button
                    onClick={() => setActiveTool("eraser")}
                    className={`px-3 py-2 rounded text-xs flex items-center justify-center gap-1.5 font-bold ${
                      activeTool === "eraser"
                        ? "bg-[#e11d48] border border-[#fda4af] text-white"
                        : "bg-[#0f2854] text-white/80 hover:bg-[#133066]"
                    }`}
                  >
                    <span>🧹</span> Eraser
                  </button>
                  <button
                    onClick={() => setActiveTool("bucket")}
                    className={`px-3 py-2 rounded text-xs flex items-center justify-center gap-1.5 font-bold ${
                      activeTool === "bucket"
                        ? "bg-[#0284c7] border border-[#38bdf8] text-white"
                        : "bg-[#0f2854] text-white/80 hover:bg-[#133066]"
                    }`}
                  >
                    <span>🪣</span> Fill Bucket
                  </button>
                  <button
                    onClick={() => setActiveTool("picker")}
                    className={`px-3 py-2 rounded text-xs flex items-center justify-center gap-1.5 font-bold ${
                      activeTool === "picker"
                        ? "bg-[#d97706] border border-[#fcd34d] text-white"
                        : "bg-[#0f2854] text-white/80 hover:bg-[#133066]"
                    }`}
                  >
                    <span>🎯</span> Eyedropper
                  </button>
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-[11px] font-bold text-[#38bdf8] mb-2 uppercase tracking-wider">
                  Color Palette
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {PALETTE.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedColor(color);
                        if (activeTool === "eraser") setActiveTool("pencil");
                      }}
                      style={{ backgroundColor: color === "transparent" ? "#000" : color }}
                      className={`w-7 h-7 rounded border-2 transition-transform cursor-pointer relative ${
                        selectedColor === color
                          ? "scale-110 border-white shadow-md z-10"
                          : "border-[#1e3a8a] hover:border-white/50"
                      }`}
                      title={color}
                    >
                      {color === "transparent" && (
                        <span className="text-[10px] text-red-500 font-bold">✕</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Picker */}
              <div className="pt-2 border-t border-[#1e3a8a] flex items-center gap-2">
                <input
                  type="color"
                  value={customColorHex}
                  onChange={(e) => {
                    setCustomColorHex(e.target.value);
                    setSelectedColor(e.target.value);
                    if (activeTool === "eraser") setActiveTool("pencil");
                  }}
                  className="w-8 h-8 rounded border border-[#1e40af] bg-transparent cursor-pointer"
                />
                <span className="text-xs text-white/80 font-mono">{selectedColor}</span>
              </div>

              {/* Canvas Clear & Invert */}
              <div className="pt-2 border-t border-[#1e3a8a] flex gap-2">
                <button
                  onClick={() => setGrid(new Array(GRID_SIZE * GRID_SIZE).fill("transparent"))}
                  className="flex-1 bg-[#1e293b] hover:bg-[#334155] border border-[#64748b] text-[11px] py-1.5 rounded"
                >
                  Clear Canvas
                </button>
                <button
                  onClick={() => {
                    const inverted = grid.map((c) => (c === "transparent" ? "#38bdf8" : "transparent"));
                    setGrid(inverted);
                  }}
                  className="flex-1 bg-[#1e293b] hover:bg-[#334155] border border-[#64748b] text-[11px] py-1.5 rounded"
                >
                  Invert
                </button>
              </div>
            </div>

            {/* Center Column: 16x16 Pixel Drawing Grid */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div
                className="bg-[#081026] p-2 rounded-lg border-2 border-[#38bdf8] shadow-2xl select-none"
                onMouseDown={() => setIsMouseDown(true)}
                onMouseUp={() => setIsMouseDown(false)}
                onMouseLeave={() => setIsMouseDown(false)}
              >
                <div
                  className="grid grid-cols-16 gap-[1px] bg-[#1e293b]"
                  style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
                >
                  {grid.map((cellColor, index) => (
                    <div
                      key={index}
                      onClick={() => handlePixelClick(index)}
                      onMouseEnter={() => {
                        if (isMouseDown && (activeTool === "pencil" || activeTool === "eraser")) {
                          handlePixelClick(index);
                        }
                      }}
                      style={{
                        backgroundColor: cellColor === "transparent" ? "#071022" : cellColor
                      }}
                      className="w-4 h-4 sm:w-5 sm:h-5 cursor-crosshair hover:opacity-80 transition-opacity relative"
                    >
                      {cellColor === "transparent" && (
                        <span className="block w-full h-full opacity-10 bg-white"></span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-white/50 mt-2">16 x 16 Pixel Canvas Matrix</span>
            </div>

            {/* Right Column: Live Scale Preview */}
            <div className="lg:col-span-3 space-y-4 bg-[#091530] p-4 rounded-md border border-[#1e3a8a] text-center">
              <span className="text-xs font-bold text-[#38bdf8] block">CANVAS OUTPUT PREVIEW</span>
              
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-[#081026] rounded-md border border-[#1e3a8a]">
                  <img
                    src={svgToDataUrl(generateGridSvg())}
                    alt="Grid 64px Preview"
                    className="w-16 h-16 object-contain"
                  />
                  <span className="text-[10px] text-white/50 block mt-1">64 x 64</span>
                </div>

                <div className="p-2 bg-[#081026] rounded-md border border-[#1e3a8a]">
                  <img
                    src={svgToDataUrl(generateGridSvg())}
                    alt="Grid 32px Preview"
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-[10px] text-white/50 block mt-1">32 x 32</span>
                </div>

                <div className="p-2 bg-[#081026] rounded-md border border-[#1e3a8a]">
                  <img
                    src={svgToDataUrl(generateGridSvg())}
                    alt="Grid 16px Preview"
                    className="w-4 h-4 object-contain"
                  />
                  <span className="text-[10px] text-white/50 block mt-1">16 x 16 (Tab Size)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 1-CLICK RETRO PRESETS */}
      {activeTab === "presets" && (
        <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-md space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#38bdf8] mb-1">1-CLICK RETRO PIXEL ART PRESETS</h3>
            <p className="text-xs text-white/70">
              Click any preset to instantly apply it as your active Favicon.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRESET_FAVICONS.map((preset) => {
              const dataUrl = svgToDataUrl(preset.svg);
              return (
                <div
                  key={preset.id}
                  className="bg-[#091530] border-2 border-[#1e40af] hover:border-[#38bdf8] p-4 rounded-lg flex flex-col items-center text-center space-y-3 transition-all group"
                >
                  <div className="w-16 h-16 rounded-md bg-[#0b1739] border border-[#38bdf8]/40 p-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img
                      src={dataUrl}
                      alt={preset.name}
                      className="w-12 h-12 object-contain"
                    />
                  </div>

                  <div>
                    <span className="text-xs font-bold text-white block">{preset.name}</span>
                    <span className="text-[10px] text-white/50">{preset.icon} Pixel SVG</span>
                  </div>

                  <button
                    onClick={() => handleApplyFavicon(dataUrl)}
                    className="w-full bg-[#1d4ed8] hover:bg-[#2563eb] text-white text-xs font-bold py-1.5 rounded border border-[#60a5fa] cursor-pointer"
                  >
                    ✓ Apply Preset
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: EMOJI FAVICON MAKER */}
      {activeTab === "emoji_generator" && (
        <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-md space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[#38bdf8] mb-1">EMOJI FAVICON GENERATOR</h3>
            <p className="text-xs text-white/70">
              Turn any Emoji into a crisp vector SVG Favicon with custom background &amp; border colors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4 bg-[#091530] p-4 rounded-md border border-[#1e3a8a]">
              {/* Emoji Input & Quick Select */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Choose or Type Emoji</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={emojiInput}
                    onChange={(e) => setEmojiInput(e.target.value.slice(0, 4))}
                    className="w-20 bg-[#0a152d] border border-[#1e40af] p-2 text-center text-xl text-white rounded focus:border-[#38bdf8] outline-none"
                  />
                  <div className="flex-1 flex flex-wrap gap-1 items-center bg-[#0a152d] p-1.5 rounded border border-[#1e40af]">
                    {["🚀", "💻", "🎨", "⚡", "🕹️", "🌟", "🔥", "👑", "🎯", "🔮", "👾", "✨"].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEmojiInput(em)}
                        className="text-lg hover:scale-125 transition-transform p-1"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-xs font-bold text-white mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={emojiBgColor}
                    onChange={(e) => setEmojiBgColor(e.target.value)}
                    className="w-9 h-9 rounded border border-[#1e40af] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={emojiBgColor}
                    onChange={(e) => setEmojiBgColor(e.target.value)}
                    className="flex-1 bg-[#0a152d] border border-[#1e40af] p-2 text-xs text-white rounded font-mono"
                  />
                </div>
              </div>

              {/* Border Color */}
              <div>
                <label className="block text-xs font-bold text-white mb-1">Border Stroke Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={emojiBorderColor}
                    onChange={(e) => setEmojiBorderColor(e.target.value)}
                    className="w-9 h-9 rounded border border-[#1e40af] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={emojiBorderColor}
                    onChange={(e) => setEmojiBorderColor(e.target.value)}
                    className="flex-1 bg-[#0a152d] border border-[#1e40af] p-2 text-xs text-white rounded font-mono"
                  />
                </div>
              </div>

              {/* Shape */}
              <div>
                <label className="block text-xs font-bold text-white mb-1">Corner Shape</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "rounded", label: "Rounded" },
                    { id: "square", label: "Square" },
                    { id: "circle", label: "Circle" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEmojiShape(s.id as any)}
                      className={`py-1.5 text-xs rounded font-bold ${
                        emojiShape === s.id
                          ? "bg-[#1d4ed8] border border-[#60a5fa] text-white"
                          : "bg-[#0f2854] text-white/70 hover:bg-[#133066]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="bg-[#091530] p-6 rounded-md border border-[#1e3a8a] flex flex-col items-center justify-center space-y-4 text-center">
              <span className="text-xs font-bold text-[#38bdf8]">GENERATED EMOJI PREVIEW</span>

              <div
                style={{
                  backgroundColor: emojiBgColor,
                  borderColor: emojiBorderColor,
                  borderRadius: emojiShape === "circle" ? "9999px" : emojiShape === "rounded" ? "16px" : "4px"
                }}
                className="w-24 h-24 border-2 flex items-center justify-center shadow-xl text-5xl"
              >
                {emojiInput}
              </div>

              <button
                type="button"
                onClick={handleGenerateEmojiFavicon}
                disabled={isSaving}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-6 py-2.5 rounded border border-[#34d399] shadow-lg cursor-pointer"
              >
                {isSaving ? "Applying..." : "✨ Generate & Apply Emoji Favicon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MONOGRAM / INITIALS GENERATOR */}
      {activeTab === "text_generator" && (
        <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-4 sm:p-6 rounded-md space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[#38bdf8] mb-1">MONOGRAM / INITIALS FAVICON MAKER</h3>
            <p className="text-xs text-white/70">
              Create a personalized initials monogram icon (e.g. "V", "VG", "UI").
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4 bg-[#091530] p-4 rounded-md border border-[#1e3a8a]">
              <div>
                <label className="block text-xs font-bold text-white mb-1">Your Letter / Initial (1-2 characters)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={monogramText}
                  onChange={(e) => setMonogramText(e.target.value.toUpperCase())}
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2.5 text-white font-bold text-sm rounded focus:border-[#38bdf8] outline-none tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">Typography Font</label>
                <select
                  value={monogramFont}
                  onChange={(e) => setMonogramFont(e.target.value)}
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-xs text-white rounded focus:border-[#38bdf8] outline-none"
                >
                  <option value="'Press Start 2P', monospace">Press Start 2P (Retro 8-Bit)</option>
                  <option value="'Pixelify Sans', sans-serif">Pixelify Sans</option>
                  <option value="'Silkscreen', monospace">Silkscreen Pixel</option>
                  <option value="'VT323', monospace">VT323 Arcade Terminal</option>
                  <option value="monospace">Clean Monospace</option>
                  <option value="sans-serif">Modern Sans-Serif</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">Letter Color</label>
                  <input
                    type="color"
                    value={monogramTextColor}
                    onChange={(e) => setMonogramTextColor(e.target.value)}
                    className="w-full h-8 rounded border border-[#1e40af] bg-transparent cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">Bg Color</label>
                  <input
                    type="color"
                    value={monogramBgColor}
                    onChange={(e) => setMonogramBgColor(e.target.value)}
                    className="w-full h-8 rounded border border-[#1e40af] bg-transparent cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/70 mb-1">Border Color</label>
                  <input
                    type="color"
                    value={monogramBorderColor}
                    onChange={(e) => setMonogramBorderColor(e.target.value)}
                    className="w-full h-8 rounded border border-[#1e40af] bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="bg-[#091530] p-6 rounded-md border border-[#1e3a8a] flex flex-col items-center justify-center space-y-4 text-center">
              <span className="text-xs font-bold text-[#38bdf8]">MONOGRAM ICON PREVIEW</span>

              <div
                style={{
                  backgroundColor: monogramBgColor,
                  borderColor: monogramBorderColor,
                  color: monogramTextColor,
                  fontFamily: monogramFont
                }}
                className="w-24 h-24 rounded-lg border-2 flex items-center justify-center shadow-xl text-3xl font-bold"
              >
                {monogramText || "V"}
              </div>

              <button
                type="button"
                onClick={handleGenerateMonogramFavicon}
                disabled={isSaving}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-6 py-2.5 rounded border border-[#34d399] shadow-lg cursor-pointer"
              >
                {isSaving ? "Applying..." : "✨ Generate & Apply Monogram"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Picker for Favicon */}
      {isDrivePickerOpen && (
        <GoogleDrivePickerModal
          isOpen={isDrivePickerOpen}
          title="Select Favicon from Google Drive"
          allowedTypes="images"
          targetSlotLabel="Browser Tab Favicon"
          onNotification={onNotification}
          onClose={() => setIsDrivePickerOpen(false)}
          onSelect={async (media) => {
            await handleApplyFavicon(media.url);
            onNotification(`Favicon updated from Google Drive!`);
            setIsDrivePickerOpen(false);
          }}
        />
      )}
    </div>
  );
};
