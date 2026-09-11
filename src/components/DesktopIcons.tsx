import React, { useState } from "react";
import {
  PixelThisPCIcon,
  PixelFolderIcon,
  PixelSkillsIcon,
  PixelProjectsIcon,
  PixelContactIcon,
  PixelExperienceIcon,
  PixelRecycleBinIcon,
  PixelWindowsPerspectiveLogo,
  PixelGoogleDriveIcon,
  PixelResumeIcon,
} from "./PixelIcons";
import { DesktopIcon, WindowId, Project } from "../types";
import { getValidImageUrl } from "./MainWindow";

interface DesktopIconsProps {
  icons: DesktopIcon[];
  onOpenWindow: (id: WindowId, project?: Project, category?: string) => void;
  projects?: Project[];
}

const DEFAULT_FALLBACK_ICONS: DesktopIcon[] = [
  {
    id: "icon-1",
    iconImage: "portfolio",
    iconName: "MY PORTFOLIO",
    executableName: "Portfolio.exe",
    destinationType: "existingWindow",
    destination: "portfolio",
    order: 1,
    visible: true,
  },
  {
    id: "icon-2",
    iconImage: "about",
    iconName: "ABOUT ME",
    executableName: "About Me.exe",
    destinationType: "existingWindow",
    destination: "about",
    order: 2,
    visible: true,
  },
  {
    id: "icon-3",
    iconImage: "skills",
    iconName: "MY SKILLS",
    executableName: "My Skills.exe",
    destinationType: "existingWindow",
    destination: "skills",
    order: 3,
    visible: true,
  },
  {
    id: "icon-4",
    iconImage: "projects",
    iconName: "PROJECTS",
    executableName: "Projects.exe",
    destinationType: "existingWindow",
    destination: "projects",
    order: 4,
    visible: true,
  },
  {
    id: "icon-5",
    iconImage: "contact",
    iconName: "CONTACTS",
    executableName: "Contacts.exe",
    destinationType: "existingWindow",
    destination: "contact",
    order: 5,
    visible: true,
  },
  {
    id: "icon-6",
    iconImage: "experience",
    iconName: "MY EXPERIENCE",
    executableName: "My Experience.exe",
    destinationType: "existingWindow",
    destination: "experience",
    order: 6,
    visible: true,
  },
];

export const DesktopIcons: React.FC<DesktopIconsProps> = ({
  icons,
  onOpenWindow,
  projects = [],
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Render pixel icon or uploaded custom image
  const renderIconGraphic = (icon: any) => {
    const rawImage = icon.iconImage || icon.customIconUrl || icon.iconPreset || "";
    const key = (rawImage || "").toLowerCase();

    if (key.startsWith("data:image") || key.startsWith("http://") || key.startsWith("https://") || key.startsWith("/uploads/")) {
      return (
        <img
          src={getValidImageUrl(rawImage)}
          alt={icon.iconName || icon.name || "Icon"}
          className="w-11 h-11 object-contain filter drop-shadow-md select-none pointer-events-none"
          referrerPolicy="no-referrer"
          style={{ imageRendering: "pixelated" }}
        />
      );
    }

    switch (key) {
      case "portfolio":
        return <PixelWindowsPerspectiveLogo className="w-11 h-11 filter drop-shadow-md" />;
      case "thispc":
        return <PixelThisPCIcon size={44} />;
      case "about":
      case "aboutme":
        return <PixelFolderIcon size={44} />;
      case "skills":
      case "myskills":
        return <PixelSkillsIcon size={44} />;
      case "projects":
        return <PixelProjectsIcon size={44} />;
      case "contact":
      case "contacts":
        return <PixelContactIcon size={44} />;
      case "experience":
      case "myexperience":
      case "work":
        return <PixelExperienceIcon size={44} />;
      case "resume":
      case "cv":
      case "document":
        return <PixelResumeIcon size={44} />;
      case "recyclebin":
        return <PixelRecycleBinIcon size={44} />;
      case "drive":
      case "googledrive":
      case "google_drive":
      case "gdrive":
        return <PixelGoogleDriveIcon size={44} />;
      case "windows":
      case "os":
        return <PixelWindowsPerspectiveLogo className="w-11 h-11 filter drop-shadow-md" />;
      default:
        return <PixelFolderIcon size={44} />;
    }
  };

  // Handle icon execution / shortcut click
  const handleTriggerIcon = (icon: any) => {
    setSelectedId(icon.id);

    const destType = icon.destinationType || icon.actionType || "existingWindow";
    const destValue = icon.destination || icon.targetWindowId || icon.targetUrl || icon.targetProjectId || "portfolio";
    const openMode = icon.openBehavior || icon.openMode || "sameWindow";

    if (destType === "externalLink") {
      if (openMode === "newTab") {
        window.open(destValue, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = destValue;
      }
      return;
    }

    if (destType === "project") {
      const matched = projects.find(
        (p) => p && (p.id === destValue || (p.title && destValue && p.title.toLowerCase() === destValue.toLowerCase()))
      );
      if (matched) {
        onOpenWindow("projectDetail", matched);
      } else {
        onOpenWindow("projects");
      }
      return;
    }

    // Default: existingWindow
    let windowId: WindowId = "portfolio";
    const lowerDest = (destValue || "").toLowerCase();

    if (lowerDest === "portfolio" || lowerDest === "portfolio.exe") {
      windowId = "portfolio";
    } else if (lowerDest === "about" || lowerDest === "aboutme" || lowerDest === "about me") {
      windowId = "about";
    } else if (lowerDest === "skills" || lowerDest === "myskills" || lowerDest === "my skills") {
      windowId = "skills";
    } else if (lowerDest === "projects" || lowerDest === "portfolio projects") {
      windowId = "projects";
    } else if (lowerDest === "experience" || lowerDest === "myexperience" || lowerDest === "my experience" || lowerDest === "work") {
      windowId = "experience";
    } else if (lowerDest === "contact" || lowerDest === "contacts") {
      windowId = "contact";
    } else if (lowerDest === "recyclebin" || lowerDest === "recycle bin") {
      windowId = "recycleBin";
    } else if (lowerDest === "thispc" || lowerDest === "this pc") {
      windowId = "thisPC";
    } else if (lowerDest === "googledrive" || lowerDest === "google drive" || lowerDest === "drive") {
      windowId = "googleDrive";
    } else {
      windowId = destValue as WindowId;
    }

    onOpenWindow(windowId);
  };

  const rawIcons = icons && icons.length > 0 ? icons : DEFAULT_FALLBACK_ICONS;
  const visibleIcons = rawIcons
    .filter((i) => i.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div
      className="absolute top-6 left-6 z-[1] flex flex-col gap-4 select-none pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedId(null);
        }
      }}
    >
      {visibleIcons.map((item: any, idx: number) => {
        const isSelected = selectedId === item.id;
        const displayName = item.iconName || item.name || "Shortcut";
        const execName = item.executableName || displayName;

        return (
          <button
            key={`${item.id}-${idx}`}
            id={`desktop-icon-${item.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTriggerIcon(item);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleTriggerIcon(item);
            }}
            className={`group flex flex-col items-center justify-center w-22 py-2 px-1 rounded transition-all cursor-pointer text-center outline-none ${
              isSelected
                ? "bg-blue-600/50 border border-blue-300 shadow-md backdrop-blur-xs"
                : "hover:bg-white/20 border border-transparent"
            }`}
            title={`Open ${execName}`}
          >
            <div className="transform group-hover:scale-105 transition-transform duration-100 filter drop-shadow-md">
              {renderIconGraphic(item)}
            </div>
            <span
              className="mt-1 text-[12px] font-pixel text-white font-medium tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] px-1 rounded leading-tight uppercase line-clamp-2"
              style={{
                textShadow:
                  "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9)",
              }}
            >
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
};
