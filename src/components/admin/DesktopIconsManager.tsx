import { compressImageForDatabase } from "../../utils/imageCompression";
import React, { useState } from "react";
import { DesktopIcon, Project } from "../../types";
import {
  PixelWindowsPerspectiveLogo,
  PixelThisPCIcon,
  PixelFolderIcon,
  PixelSkillsIcon,
  PixelProjectsIcon,
  PixelExperienceIcon,
  PixelContactIcon,
  PixelRecycleBinIcon,
  PixelResumeIcon,
} from "../PixelIcons";
import { GoogleDrivePickerModal } from "./GoogleDrivePickerModal";
import { saveDesktopIconsToFirestore, IS_FIREBASE_CONNECTED } from "../../services/firebaseService";
import { saveLocalMasterBackup, syncWithServer } from "../../services/persistenceService";

interface DesktopIconsManagerProps {
  icons: DesktopIcon[];
  projects: Project[];
  token: string;
  onRefresh: () => void;
  onShowNotification: (msg: string, type?: "success" | "error") => void;
}

export const DesktopIconsManager: React.FC<DesktopIconsManagerProps> = ({
  icons,
  projects,
  token,
  onRefresh,
  onShowNotification,
}) => {
  const [editingIcon, setEditingIcon] = useState<Partial<DesktopIcon> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [iconToDelete, setIconToDelete] = useState<{ id: string; name: string } | null>(null);

  const syncDesktopIconsToCloud = async (activeToken: string) => {
    try {
      const res = await fetch("/api/desktop-icons", {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const freshIcons = await res.json();
        saveLocalMasterBackup({ desktopIcons: freshIcons });
        syncWithServer(activeToken);
        window.dispatchEvent(new CustomEvent("desktop_icons_updated", { detail: freshIcons }));
        if (IS_FIREBASE_CONNECTED) {
          await saveDesktopIconsToFirestore(freshIcons).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error syncing desktop icons to cloud:", e);
    }
  };

  const getPresetIcon = (iconPreset?: string, size = 32) => {
    const key = (iconPreset || "").toLowerCase();
    switch (key) {
      case "portfolio":
        return <PixelWindowsPerspectiveLogo className={`w-${size === 32 ? "8" : "10"} h-${size === 32 ? "8" : "10"}`} />;
      case "about":
      case "aboutme":
        return <PixelFolderIcon size={size} />;
      case "skills":
      case "myskills":
        return <PixelSkillsIcon size={size} />;
      case "projects":
        return <PixelProjectsIcon size={size} />;
      case "experience":
      case "myexperience":
      case "work":
        return <PixelExperienceIcon size={size} />;
      case "contact":
      case "contacts":
        return <PixelContactIcon size={size} />;
      case "resume":
      case "cv":
      case "document":
        return <PixelResumeIcon size={size} />;
      case "recyclebin":
        return <PixelRecycleBinIcon size={size} />;
      default:
        return <PixelThisPCIcon size={size} />;
    }
  };

  const handleOpenEditModal = (icon?: any) => {
    if (!icon) {
      setEditingIcon({
        id: "",
        name: "",
        iconName: "",
        executableName: ".exe",
        iconType: "preset",
        iconPreset: "portfolio",
        customIconUrl: "",
        actionType: "existingWindow",
        destinationType: "existingWindow",
        targetWindowId: "portfolio",
        destination: "portfolio",
        targetProjectId: "",
        targetUrl: "",
        openMode: "sameWindow",
        openBehavior: "sameWindow",
        order: icons.length + 1,
        visible: true,
      } as any);
    } else {
      const isCustom =
        icon.iconType === "custom" ||
        (icon.iconImage && (icon.iconImage.startsWith("data:") || icon.iconImage.startsWith("http") || icon.iconImage.startsWith("/uploads/")));
      const customUrl = isCustom ? icon.iconImage || icon.customIconUrl || "" : "";
      const presetKey = !isCustom ? icon.iconImage || icon.iconPreset || "portfolio" : "portfolio";

      const action = icon.destinationType || icon.actionType || "existingWindow";
      const dest = icon.destination || icon.targetWindowId || icon.targetUrl || icon.targetProjectId || "portfolio";

      setEditingIcon({
        id: icon.id,
        name: icon.iconName || icon.name || "",
        iconName: icon.iconName || icon.name || "",
        executableName: icon.executableName || "App.exe",
        iconType: isCustom ? "custom" : "preset",
        iconPreset: presetKey,
        customIconUrl: customUrl,
        actionType: action,
        destinationType: action,
        targetWindowId: action === "existingWindow" ? dest : "portfolio",
        targetProjectId: action === "project" ? dest : "",
        targetUrl: action === "externalLink" ? dest : "",
        destination: dest,
        openMode: icon.openBehavior || icon.openMode || "sameWindow",
        openBehavior: icon.openBehavior || icon.openMode || "sameWindow",
        order: icon.order ?? 1,
        visible: icon.visible !== false,
      } as any);
    }
    setIsModalOpen(true);
  };

  const handleSaveIcon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIcon) return;

    try {
      const isNew = !editingIcon.id;
      const url = isNew ? "/api/desktop-icons" : `/api/desktop-icons/${editingIcon.id}`;
      const method = isNew ? "POST" : "PUT";

      const rawName = (editingIcon as any).name || editingIcon.iconName || "SHORTCUT";
      const rawExec = editingIcon.executableName || `${rawName}.exe`;
      const isCustom = (editingIcon as any).iconType === "custom" && (editingIcon as any).customIconUrl;
      const rawImage = isCustom ? (editingIcon as any).customIconUrl : ((editingIcon as any).iconPreset || editingIcon.iconImage || "portfolio");

      const rawAction = (editingIcon as any).actionType || editingIcon.destinationType || "existingWindow";
      let rawDestination = (editingIcon as any).targetWindowId || editingIcon.destination || "portfolio";
      if (rawAction === "project") {
        rawDestination = (editingIcon as any).targetProjectId || editingIcon.destination || "";
      } else if (rawAction === "externalLink") {
        rawDestination = (editingIcon as any).targetUrl || editingIcon.destination || "";
      }

      const rawOpenMode = (editingIcon as any).openMode || editingIcon.openBehavior || "sameWindow";

      const payload = {
        ...editingIcon,
        iconName: rawName,
        name: rawName,
        executableName: rawExec,
        iconImage: rawImage,
        iconPreset: isCustom ? "custom" : rawImage,
        customIconUrl: isCustom ? rawImage : "",
        iconType: isCustom ? "custom" : "preset",
        destinationType: rawAction,
        actionType: rawAction,
        destination: rawDestination,
        targetWindowId: rawAction === "existingWindow" ? rawDestination : "portfolio",
        targetProjectId: rawAction === "project" ? rawDestination : "",
        targetUrl: rawAction === "externalLink" ? rawDestination : "",
        openBehavior: rawOpenMode,
        openMode: rawOpenMode,
        order: typeof editingIcon.order === "number" ? editingIcon.order : icons.length + 1,
        visible: editingIcon.visible !== false,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save desktop icon");
      }

      onShowNotification(isNew ? "Desktop shortcut added!" : "Desktop shortcut updated!");
      setIsModalOpen(false);
      setEditingIcon(null);
      onRefresh();
      await syncDesktopIconsToCloud(token);
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  const handleDeleteIcon = (id: string, name: string) => {
    setIconToDelete({ id, name });
  };

  const executeDeleteIcon = async (id: string) => {
    const activeToken = token || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(`/api/desktop-icons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete shortcut");
      onShowNotification("Desktop shortcut deleted successfully!");
      setIconToDelete(null);
      onRefresh();
      await syncDesktopIconsToCloud(activeToken);
    } catch (err: any) {
      onShowNotification(err.message || "Failed to delete icon", "error");
    }
  };

  const handleToggleVisible = async (icon: DesktopIcon) => {
    const activeToken = token || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(`/api/desktop-icons/${icon.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          ...icon,
          visible: !icon.visible,
        }),
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      onShowNotification(`Shortcut ${!icon.visible ? "enabled" : "hidden"} on desktop`);
      onRefresh();
      await syncDesktopIconsToCloud(activeToken);
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= icons.length) return;

    const sortedList = [...icons].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Swap elements in the sorted list
    const temp = sortedList[index];
    sortedList[index] = sortedList[targetIndex];
    sortedList[targetIndex] = temp;

    const orderedIds = sortedList.map((icon) => icon.id);
    const activeToken = token || localStorage.getItem("admin_token") || "admin";

    try {
      const res = await fetch(`/api/desktop-icons/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ orderedIds }),
      });

      if (!res.ok) throw new Error("Failed to reorder icons");

      onShowNotification("Icon ordering updated");
      onRefresh();
      await syncDesktopIconsToCloud(activeToken);
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  const sortedIcons = [...icons].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a1e42] p-4 rounded-md border-2 border-[#1e3a8a]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#38bdf8] tracking-wide flex items-center gap-2">
            <span>🖥️</span> DESKTOP ICONS &amp; SHORTCUTS MANAGER
          </h2>
          <p className="text-white/70 text-xs mt-0.5">
            Manage public desktop shortcuts, executable labels, click behaviors, and window targets.
          </p>
        </div>

        <button
          onClick={() => handleOpenEditModal()}
          className="bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-4 py-2.5 text-xs font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
        >
          <span>➕</span> ADD DESKTOP SHORTCUT
        </button>
      </div>

      {/* Desktop Preview Strip */}
      <div className="bg-[#071329] border-2 border-[#1e3a8a] p-4 rounded-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider">
            DESKTOP LIVE PREVIEW ({sortedIcons.filter((i) => i.visible !== false).length} ACTIVE ICONS)
          </span>
          <span className="text-[11px] text-white/50">Simulates Left-Hand Desktop Grid</span>
        </div>

        <div className="bg-[#050d1c] p-4 rounded border border-[#1e40af] flex flex-wrap gap-4 items-start">
          {sortedIcons
            .filter((i) => i.visible !== false)
            .map((icon: any) => {
              const displayName = icon.iconName || icon.name || "Shortcut";
              const isCustom = icon.iconType === "custom" || (icon.iconImage && (icon.iconImage.startsWith("data:") || icon.iconImage.startsWith("http") || icon.iconImage.startsWith("/uploads/")));
              const customUrl = isCustom ? (icon.customIconUrl || icon.iconImage) : "";
              const presetKey = isCustom ? "" : (icon.iconPreset || icon.iconImage || "portfolio");

              return (
                <div
                  key={icon.id}
                  onClick={() => handleOpenEditModal(icon)}
                  className="w-20 p-2 flex flex-col items-center text-center rounded border border-dashed border-[#38bdf8]/40 bg-[#0a1e42]/50 hover:bg-[#1e3a8a]/40 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 flex items-center justify-center mb-1">
                    {isCustom && customUrl ? (
                      <img
                        src={customUrl}
                        alt={displayName}
                        className="w-8 h-8 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      getPresetIcon(presetKey, 32)
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-white group-hover:text-[#38bdf8] leading-tight line-clamp-1">
                    {displayName}
                  </span>
                  <span className="text-[8px] text-[#93c5fd]/70 leading-none mt-0.5">
                    {icon.executableName || ".exe"}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Icons List Table / Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white/90">CONFIGURED SHORTCUTS ({icons.length})</h3>

        {icons.length === 0 ? (
          <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-8 text-center text-white/60 rounded">
            No desktop icons configured. Click "+ Add Desktop Shortcut" above to add one.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedIcons.map((icon: any, idx) => {
              const displayName = icon.iconName || icon.name || "Shortcut";
              const isCustom = icon.iconType === "custom" || (icon.iconImage && (icon.iconImage.startsWith("data:") || icon.iconImage.startsWith("http") || icon.iconImage.startsWith("/uploads/")));
              const customUrl = isCustom ? (icon.customIconUrl || icon.iconImage) : "";
              const presetKey = isCustom ? "" : (icon.iconPreset || icon.iconImage || "portfolio");
              const actionType = icon.destinationType || icon.actionType || "existingWindow";
              const destVal = icon.destination || icon.targetWindowId || icon.targetUrl || icon.targetProjectId || "portfolio";
              const openMode = icon.openBehavior || icon.openMode || "sameWindow";

              return (
                <div
                  key={icon.id}
                  className={`bg-[#0f2854] border-2 ${
                    icon.visible === false ? "border-[#475569] opacity-60" : "border-[#1e3a8a] hover:border-[#38bdf8]"
                  } p-3 sm:p-4 rounded-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  {/* Left: Icon & Info */}
                  <div className="flex items-center gap-3.5">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(idx, "up")}
                        className={`px-1.5 py-0.5 text-[10px] rounded border ${
                          idx === 0
                            ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                            : "bg-[#1e3a8a] text-white border-[#38bdf8] hover:bg-[#2563eb] cursor-pointer"
                        }`}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === sortedIcons.length - 1}
                        onClick={() => handleMoveOrder(idx, "down")}
                        className={`px-1.5 py-0.5 text-[10px] rounded border ${
                          idx === sortedIcons.length - 1
                            ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                            : "bg-[#1e3a8a] text-white border-[#38bdf8] hover:bg-[#2563eb] cursor-pointer"
                        }`}
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Icon Thumbnail */}
                    <div className="w-12 h-12 bg-[#071329] border border-[#1e40af] rounded flex items-center justify-center flex-shrink-0">
                      {isCustom && customUrl ? (
                        <img
                          src={customUrl}
                          alt={displayName}
                          className="w-8 h-8 object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        getPresetIcon(presetKey, 32)
                      )}
                    </div>

                    {/* Title & Executable info */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{displayName}</span>
                        <span className="bg-[#1e293b] text-[#93c5fd] border border-[#3b82f6] text-[10px] px-1.5 py-0.2 rounded font-mono">
                          {icon.executableName || ".exe"}
                        </span>
                        {icon.visible === false ? (
                          <span className="bg-red-950/80 border border-red-500 text-red-300 text-[10px] px-1.5 rounded">
                            HIDDEN
                          </span>
                        ) : (
                          <span className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-[10px] px-1.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-white/70 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[#38bdf8]">
                          Action:{" "}
                          <strong className="text-white">
                            {actionType === "existingWindow"
                              ? `Open ${destVal} Window`
                              : actionType === "project"
                              ? `Open Project (${destVal})`
                              : actionType === "externalLink"
                              ? `External URL (${destVal})`
                              : `Custom Action`}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Mode: <strong>{openMode === "newTab" ? "New Tab" : "Modal Window"}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                    <button
                      onClick={() => handleToggleVisible(icon)}
                      className={`px-2.5 py-1.5 rounded text-xs border font-pixel cursor-pointer transition-colors ${
                        icon.visible !== false
                          ? "bg-[#1e293b] text-white/80 border-[#475569] hover:bg-[#334155]"
                          : "bg-[#064e3b] text-emerald-300 border-emerald-500 hover:bg-[#065f46]"
                      }`}
                    >
                      {icon.visible !== false ? "👁️ Hide" : "👁️ Show"}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(icon)}
                      className="bg-[#1d4ed8] hover:bg-[#2563eb] text-white border border-[#60a5fa] px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteIcon(icon.id, displayName)}
                      className="bg-[#881337] hover:bg-[#9f1239] text-white border border-[#f43f5e] px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT / CREATE MODAL */}
      {isModalOpen && editingIcon && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0f2854] border-3 border-[#38bdf8] p-4 sm:p-6 rounded-md space-y-4 max-h-[92vh] flex flex-col my-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e40af] pb-2 flex-shrink-0">
              <h3 className="text-base font-bold text-[#38bdf8]">
                {editingIcon.id ? "EDIT DESKTOP SHORTCUT" : "CREATE DESKTOP SHORTCUT"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveIcon} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-pixel">
              {/* Name & Executable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0a152d] border border-[#1e40af] p-3 rounded">
                <div>
                  <label className="block text-white/80 mb-1 font-bold">
                    Icon Title / Label <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingIcon.name || ""}
                    onChange={(e) => setEditingIcon({ ...editingIcon, name: e.target.value })}
                    placeholder="e.g. MY PORTFOLIO, ABOUT ME"
                    className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded focus:border-[#38bdf8] outline-none font-pixel uppercase"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-1 font-bold">
                    Executable Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingIcon.executableName || ""}
                    onChange={(e) => setEditingIcon({ ...editingIcon, executableName: e.target.value })}
                    placeholder="e.g. Portfolio.exe, About Me.exe"
                    className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded focus:border-[#38bdf8] outline-none font-mono"
                  />
                </div>
              </div>

              {/* Icon Visual Preset */}
              <div className="bg-[#0a152d] border border-[#1e40af] p-3 rounded space-y-3">
                <span className="text-[#38bdf8] font-bold block uppercase">Visual Icon Graphic</span>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="iconType"
                      checked={editingIcon.iconType !== "custom"}
                      onChange={() => setEditingIcon({ ...editingIcon, iconType: "preset" })}
                    />
                    <span>Preset 8-Bit Icon</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="iconType"
                      checked={editingIcon.iconType === "custom"}
                      onChange={() => setEditingIcon({ ...editingIcon, iconType: "custom" })}
                    />
                    <span>Custom Pixel Art Graphic</span>
                  </label>
                </div>

                {editingIcon.iconType !== "custom" ? (
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1">
                    {[
                      { id: "portfolio", label: "Windows" },
                      { id: "about", label: "About" },
                      { id: "skills", label: "Skills" },
                      { id: "projects", label: "Projects" },
                      { id: "experience", label: "Work Exp" },
                      { id: "resume", label: "Resume" },
                      { id: "contact", label: "Contact" },
                      { id: "recycleBin", label: "Recycle" },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setEditingIcon({ ...editingIcon, iconPreset: preset.id as any })}
                        className={`p-2 rounded border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          editingIcon.iconPreset === preset.id
                            ? "bg-[#1d4ed8] border-[#38bdf8] shadow-sm ring-1 ring-[#38bdf8]"
                            : "bg-[#071022] border-[#1e40af] hover:bg-[#132f60]"
                        }`}
                      >
                        <div className="w-8 h-8 flex items-center justify-center">
                          {getPresetIcon(preset.id, 28)}
                        </div>
                        <span className="text-[9px] text-white/90 truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* File Upload Section */}
                    <div>
                      <label className="block text-white/80 font-bold mb-1.5 flex items-center justify-between">
                        <span>📤 Upload Custom Icon File</span>
                        <span className="text-[10px] text-[#38bdf8] font-normal">PNG, JPG, ICO, SVG, WEBP</span>
                      </label>

                      {/* Dropzone & File Input */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#071022] border-2 border-dashed border-[#1e40af] hover:border-[#38bdf8] transition-colors p-3 rounded-md">
                        {/* Preview Box */}
                        <div className="w-14 h-14 bg-[#0a152d] border border-[#1e40af] rounded flex items-center justify-center flex-shrink-0 relative group">
                          {editingIcon.customIconUrl ? (
                            <>
                              <img
                                src={editingIcon.customIconUrl}
                                alt="Icon Preview"
                                className="w-10 h-10 object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                              <button
                                type="button"
                                onClick={() => setEditingIcon({ ...editingIcon, customIconUrl: "" })}
                                title="Remove uploaded icon"
                                className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow cursor-pointer font-bold"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <span className="text-2xl text-white/40">🖼️</span>
                          )}
                        </div>

                        {/* Upload Controls */}
                        <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                          <div className="flex flex-wrap gap-2 items-center">
                            <label className="inline-flex items-center justify-center gap-2 bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer border border-[#60a5fa] shadow-sm transition-all">
                              <span>📁 Browse / Upload Local</span>
                              <input
                                type="file"
                                accept="image/*,.ico"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    onShowNotification("Uploading custom icon...");
                                    try {
                                      const base64 = await compressImageForDatabase(file, 256);
                                      setEditingIcon({
                                        ...editingIcon,
                                        customIconUrl: base64,
                                        iconType: "custom",
                                      });
                                      onShowNotification("Custom icon compressed & saved to database!", "success");
                                    } catch (err: any) {
                                      onShowNotification(err.message, "error");
                                    }
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsDrivePickerOpen(true)}
                              className="inline-flex items-center justify-center gap-1.5 bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors shadow-sm"
                            >
                              <span>☁️ Pick from Google Drive</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-white/60">
                            {editingIcon.customIconUrl ? "Custom icon image loaded!" : "Click to select a local icon image file or pick directly from your Google Drive"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Or Manual URL input */}
                    <div className="space-y-1 pt-1">
                      <label className="block text-white/70 text-[11px]">Or Paste Image URL / Base64</label>
                      <input
                        type="text"
                        value={editingIcon.customIconUrl || ""}
                        onChange={(e) => setEditingIcon({ ...editingIcon, customIconUrl: e.target.value })}
                        placeholder="https://... or data:image/png;base64,..."
                        className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded focus:border-[#38bdf8] outline-none font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action and Destination */}
              <div className="bg-[#0a152d] border border-[#1e40af] p-3 rounded space-y-3">
                <span className="text-[#38bdf8] font-bold block uppercase">Click Action &amp; Target</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/80 mb-1">Action Type</label>
                    <select
                      value={editingIcon.actionType || "existingWindow"}
                      onChange={(e) =>
                        setEditingIcon({
                          ...editingIcon,
                          actionType: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                    >
                      <option value="existingWindow">Open Modal Window (System)</option>
                      <option value="project">Open Specific Project Detail Page</option>
                      <option value="externalLink">Open External Link / File</option>
                    </select>
                  </div>

                  {editingIcon.actionType === "existingWindow" && (
                    <div>
                      <label className="block text-white/80 mb-1">Destination Window</label>
                      <select
                        value={editingIcon.targetWindowId || "portfolio"}
                        onChange={(e) =>
                          setEditingIcon({
                            ...editingIcon,
                            targetWindowId: e.target.value as any,
                          })
                        }
                        className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                      >
                        <option value="portfolio">Main Portfolio Window (Portfolio.exe)</option>
                        <option value="about">About Me (About Me.exe)</option>
                        <option value="skills">Skills &amp; Tools (Skills.exe)</option>
                        <option value="projects">Featured Projects (Projects.exe)</option>
                        <option value="experience">My Experience (My Experience.exe)</option>
                        <option value="resume">Resume / CV Document (Resume.exe)</option>
                        <option value="contact">Contact &amp; Hire (Contacts.exe)</option>
                        <option value="recycleBin">Recycle Bin (RecycleBin.exe)</option>
                      </select>
                    </div>
                  )}

                  {editingIcon.actionType === "project" && (
                    <div>
                      <label className="block text-white/80 mb-1">Select Project</label>
                      <select
                        value={editingIcon.targetProjectId || ""}
                        onChange={(e) =>
                          setEditingIcon({
                            ...editingIcon,
                            targetProjectId: e.target.value,
                          })
                        }
                        className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                      >
                        <option value="">-- Choose a Project --</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editingIcon.actionType === "externalLink" && (
                    <div>
                      <label className="block text-white/80 mb-1">Target URL</label>
                      <input
                        type="text"
                        value={editingIcon.targetUrl || ""}
                        onChange={(e) =>
                          setEditingIcon({
                            ...editingIcon,
                            targetUrl: e.target.value,
                          })
                        }
                        placeholder="https://behance.net/..."
                        className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-white/80 mb-1">Open Mode</label>
                    <select
                      value={editingIcon.openMode || "sameWindow"}
                      onChange={(e) =>
                        setEditingIcon({
                          ...editingIcon,
                          openMode: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                    >
                      <option value="sameWindow">Modal Window (In Desktop)</option>
                      <option value="newTab">Open in New Browser Tab ↗</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/80 mb-1">Display Order Priority</label>
                    <input
                      type="number"
                      value={editingIcon.order ?? 1}
                      onChange={(e) =>
                        setEditingIcon({
                          ...editingIcon,
                          order: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingIcon.visible !== false}
                      onChange={(e) =>
                        setEditingIcon({
                          ...editingIcon,
                          visible: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-white font-bold">Show this icon on public desktop</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer Save/Cancel */}
              <div className="sticky bottom-0 bg-[#0f2854] pt-3 pb-1 border-t border-[#1e40af] flex justify-end gap-3 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#334155] hover:bg-[#475569] px-4 py-2 text-xs rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white px-5 py-2 text-xs font-bold rounded cursor-pointer shadow-md"
                >
                  💾 Save Shortcut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Drive Picker for Desktop Icon */}
      {isDrivePickerOpen && (
        <GoogleDrivePickerModal
          isOpen={isDrivePickerOpen}
          title="Select Shortcut Icon from Google Drive"
          allowedTypes="images"
          targetSlotLabel="Custom Desktop Shortcut Icon"
          onNotification={onShowNotification}
          onClose={() => setIsDrivePickerOpen(false)}
          onSelect={(media) => {
            setEditingIcon((prev) => (prev ? { ...prev, customIconUrl: media.url, iconType: "custom" } : null));
            onShowNotification(`Shortcut icon attached from Google Drive!`);
            setIsDrivePickerOpen(false);
          }}
        />
      )}

      {/* Delete Shortcut Confirmation Modal */}
      {iconToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0b1739] border-2 border-[#e11d48] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 border-b border-[#1e3a8a] pb-3 text-white">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-bold text-base text-[#f43f5e]">Delete Desktop Shortcut?</h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to delete the desktop shortcut{" "}
              <span className="font-bold text-[#38bdf8]">"{iconToDelete.name}"</span>?
            </p>
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
                onClick={() => executeDeleteIcon(iconToDelete.id)}
                className="bg-[#e11d48] hover:bg-[#f43f5e] text-white px-4 py-2 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md"
              >
                <span>🗑️</span> Delete Shortcut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
