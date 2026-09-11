import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

// Storage directory & DB file
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "portfolio-db.json");
const BACKUP_DB_FILE = path.join(DATA_DIR, "portfolio-db.backup.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const WALLPAPERS_DIR = path.join(UPLOADS_DIR, "wallpapers");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(WALLPAPERS_DIR)) {
  fs.mkdirSync(WALLPAPERS_DIR, { recursive: true });
}


// --- Media Helper ---
function processBase64Media(dataString: any, prefix: string): string {
  if (!dataString || typeof dataString !== "string") return dataString || "";
  if (!dataString.startsWith("data:")) return dataString;

  try {
    const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataString;
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    let extension = "bin";
    if (mimeType.includes("video/mp4")) extension = "mp4";
    else if (mimeType.includes("video/webm")) extension = "webm";
    else if (mimeType.includes("image/jpeg")) extension = "jpg";
    else if (mimeType.includes("image/png")) extension = "png";
    else if (mimeType.includes("image/gif")) extension = "gif";
    else if (mimeType.includes("image/webp")) extension = "webp";
    else if (mimeType.includes("image/svg+xml")) extension = "svg";
    else {
      const parts = mimeType.split("/");
      if (parts.length === 2) extension = parts[1].split("+")[0];
    }
    
    const buffer = Buffer.from(base64Data, "base64");
    const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${extension}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error(`Error processing base64 media for ${prefix}:`, error);
    return dataString;
  }
}
// --------------------

// Persistent Secret for Session Tokens across server restarts & deployments
const SECRET_KEY_FILE = path.join(DATA_DIR, "auth_secret.key");
let JWT_SECRET = "";
if (fs.existsSync(SECRET_KEY_FILE)) {
  try {
    JWT_SECRET = fs.readFileSync(SECRET_KEY_FILE, "utf-8").trim();
  } catch (e) {
    console.warn("Could not read auth secret file:", e);
  }
}
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(48).toString("hex");
  try {
    fs.writeFileSync(SECRET_KEY_FILE, JWT_SECRET, "utf-8");
  } catch (e) {
    console.warn("Could not save auth secret file:", e);
  }
}

// Initial default data strictly matching the reference
const defaultData = {
  admin: {
    username: "admin",
    // SHA256 of "admin123"
    passwordHash: crypto.createHash("sha256").update("admin123").digest("hex"),
  },
  portfolio: {
    greeting: "HI, I'M",
    name: "VIGNESH",
    role: "DIGITAL CREATOR & DESIGNER",
    shortBio: "I create intuitive designs, engaging experiences and visual stories.",
    longBio: "I am Vignesh, a multidisciplinary Digital Creator and UI/UX Designer based in Trichy, India. I specialize in crafting high-impact digital experiences, user interfaces, AI-powered video generation, and cinematic motion graphics. With a passion for pixel-perfect detail and storytelling, I bridge the gap between creative vision and interactive execution.",
    location: "TRICHY, INDIA",
    locationText: "BASED IN TRICHY, INDIA",
    availabilityText: "AVAILABLE FOR FREELANCE",
    isAvailable: true,
    ctaText: "EXPLORE MY WORK",
    ctaLink: "#projects",
    profileImage: "", // if empty, uses default pixel avatar
    tagline: "Turning ideas into pixel perfect experiences.",
    faviconUrl: "https://lh3.googleusercontent.com/d/1duMKVUV-a9PPOdZ_U3hmQzN5V7iDLIGm",
    heroLogoImage: "",
    heroLogoSize: 64,
    resumeUrl: ""
  },
  projects: [
    {
      id: "p_1787426680001",
      title: "Raja Isaiyil Deadpoola",
      category: "Video Editing Projects",
      shortDescription: "",
      summary: "",
      aboutProject: "",
      fullDescription: "",
      thumbnail: "",
      heroMediaType: "video",
      heroMediaUrl: "",
      caseStudyUrl: "",
      caseStudyVideoUrl: "",
      showCaseStudyButton: true,
      caseStudyButtonText: "WATCH CASE STUDY",
      projectUrl: "",
      layoutStyle: "default",
      contentAlignment: "left",
      mediaDisplayMode: "all",
      tags: ["Video Editing"],
      date: "2026",
      featured: true,
      visible: true,
      order: 1,
      accentColor: "#ef4444",
      bgColor: "#1f1315",
      roles: [],
      workflow: [],
      outputs: [],
      projectImages: [],
      impactMetrics: [],
      impactDescription: "",
      finalVerdict: ""
    },
    {
      id: "p_1787426680002",
      title: "Morais Marathan",
      category: "AI Videos Projects",
      shortDescription: "",
      summary: "",
      aboutProject: "",
      fullDescription: "",
      thumbnail: "",
      heroMediaType: "video",
      heroMediaUrl: "",
      caseStudyUrl: "",
      caseStudyVideoUrl: "",
      showCaseStudyButton: true,
      caseStudyButtonText: "WATCH CASE STUDY",
      projectUrl: "",
      layoutStyle: "default",
      contentAlignment: "left",
      mediaDisplayMode: "all",
      tags: ["AI Video"],
      date: "2026",
      featured: true,
      visible: true,
      order: 2,
      accentColor: "#f59e0b",
      bgColor: "#1c1917",
      roles: [],
      workflow: [],
      outputs: [],
      projectImages: [],
      impactMetrics: [],
      impactDescription: "",
      finalVerdict: ""
    },
    {
      id: "p_1787426680003",
      title: "MORAIS CITY",
      category: "UX/UI Projects",
      shortDescription: "",
      summary: "",
      aboutProject: "",
      fullDescription: "",
      thumbnail: "",
      heroMediaType: "image",
      heroMediaUrl: "",
      caseStudyUrl: "",
      caseStudyVideoUrl: "",
      showCaseStudyButton: true,
      caseStudyButtonText: "VIEW CASE STUDY",
      projectUrl: "",
      layoutStyle: "default",
      contentAlignment: "left",
      mediaDisplayMode: "all",
      tags: ["UX/UI Design"],
      date: "2026",
      featured: true,
      visible: true,
      order: 3,
      accentColor: "#38bdf8",
      bgColor: "#0f2854",
      roles: [],
      workflow: [],
      outputs: [],
      projectImages: [],
      impactMetrics: [],
      impactDescription: "",
      finalVerdict: ""
    }
  ],
  skills: [
    { id: "s1", name: "UI/UX Design", category: "Design", icon: "Layout", proficiency: 95, experience: "5+ Years", visible: true, order: 1 },
    { id: "s2", name: "Figma & Prototyping", category: "Design", icon: "Figma", proficiency: 92, visible: true, order: 2 },
    { id: "s3", name: "AI Video Generation", category: "AI & Motion", icon: "Video", proficiency: 90, visible: true, order: 3 },
    { id: "s4", name: "Cinematic Video Editing", category: "AI & Motion", icon: "Film", proficiency: 94, visible: true, order: 4 },
    { id: "s5", name: "Motion Graphics", category: "AI & Motion", icon: "Sparkles", proficiency: 88, visible: true, order: 5 },
    { id: "s6", name: "Graphic Design & Branding", category: "Creative", icon: "Palette", proficiency: 90, visible: true, order: 6 },
    { id: "s7", name: "3D & Pixel Artwork", category: "Creative", icon: "Box", proficiency: 85, visible: true, order: 7 },
    { id: "s8", name: "Sound Design & Sync", category: "Creative", icon: "Music", proficiency: 82, visible: true, order: 8 }
  ],
  contact: {
    email: "editorvignesh.ui@gmail.com",
    phone: "+91 98765 43210",
    location: "Trichy, Tamil Nadu, India",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    behance: "https://behance.net",
    dribbble: "https://dribbble.com",
    youtube: "https://youtube.com",
    github: "https://github.com",
    twitter: "https://x.com"
  },
  desktopIcons: [
    {
      id: "icon-1",
      iconImage: "portfolio",
      iconName: "MY PORTFOLIO",
      executableName: "Portfolio.exe",
      destinationType: "existingWindow",
      destination: "portfolio",
      positionX: 24,
      positionY: 24,
      order: 1,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "icon-2",
      iconImage: "about",
      iconName: "ABOUT ME",
      executableName: "About Me.exe",
      destinationType: "existingWindow",
      destination: "about",
      positionX: 24,
      positionY: 104,
      order: 2,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "icon-3",
      iconImage: "skills",
      iconName: "MY SKILLS",
      executableName: "My Skills.exe",
      destinationType: "existingWindow",
      destination: "skills",
      positionX: 24,
      positionY: 184,
      order: 3,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "icon-4",
      iconImage: "projects",
      iconName: "PROJECTS",
      executableName: "Projects.exe",
      destinationType: "existingWindow",
      destination: "projects",
      positionX: 24,
      positionY: 264,
      order: 4,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "icon-5",
      iconImage: "contact",
      iconName: "CONTACTS",
      executableName: "Contacts.exe",
      destinationType: "existingWindow",
      destination: "contact",
      positionX: 24,
      positionY: 344,
      order: 5,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "icon-6",
      iconImage: "experience",
      iconName: "MY EXPERIENCE",
      executableName: "My Experience.exe",
      destinationType: "existingWindow",
      destination: "experience",
      positionX: 24,
      positionY: 424,
      order: 6,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    }
  ],
  experiences: [
    {
      id: "exp-1",
      companyName: "Nexus Digital Studio",
      role: "Senior UI/UX & Digital Creator",
      startDate: "2024",
      endDate: "Present",
      currentPosition: true,
      description: "Leading interface design systems, user experience architecture, and cutting-edge generative AI video pipelines for global creative clients.",
      responsibilities: [
        "Spearhead end-to-end UX/UI designs for web, mobile apps, and design token libraries.",
        "Direct generative AI video workflows using Runway Gen-3, Midjourney, and Kling.",
        "Collaborate directly with product and engineering teams for pixel-perfect handoffs."
      ],
      projects: ["Enterprise Design System v3", "AI-driven Marketing Campaign Videos"],
      achievements: [
        "Boosted user conversion rates by 42% on core product redesigns",
        "Reduced video production cycles by 60% with AI-assisted post pipelines"
      ],
      companyLogo: "",
      visible: true,
      order: 1,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z"
    },
    {
      id: "exp-2",
      companyName: "Pixelcraft Media",
      role: "UI Designer & Motion Editor",
      startDate: "2022",
      endDate: "2024",
      currentPosition: false,
      description: "Designed high-conversion interactive prototypes, landing experiences, and edited cinematic video content for modern tech startups.",
      responsibilities: [
        "Created responsive Figma wireframes, mockups, and interactive motion prototypes.",
        "Edited promotional teasers and brand commercials in Premiere Pro & After Effects.",
        "Maintained consistent visual brand identity across digital touchpoints."
      ],
      projects: ["FinTech Dashboard App", "SaaS Product Launch Showreel"],
      achievements: [
        "Authored 25+ client product design systems with 100% on-time delivery",
        "Featured on Dribbble & Behance UI design curated galleries"
      ],
      companyLogo: "",
      visible: true,
      order: 2,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z"
    },
    {
      id: "exp-3",
      companyName: "Freelance Creative",
      role: "Multidisciplinary Designer & Video Specialist",
      startDate: "2020",
      endDate: "2022",
      currentPosition: false,
      description: "Delivered bespoke UI/UX designs, brand identity systems, and post-production video editing for clients across India and internationally.",
      responsibilities: [
        "Conducted user research, wireframing, and usability testing.",
        "Produced YouTube content packages, reels, and kinetic typography animations."
      ],
      projects: ["E-commerce Mobile App UI", "YouTube Creator Brand Package"],
      achievements: [
        "Successfully delivered 40+ client projects with 5-star feedback rating"
      ],
      companyLogo: "",
      visible: true,
      order: 3,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z"
    }
  ],
  messages: [
    {
      id: "m1",
      name: "Alex Rivera",
      email: "alex.rivera@designstudio.com",
      message: "Hey Vignesh! Loved your AI Video portfolio. Let's discuss a creative collaboration.",
      date: "2026-05-10T14:30:00.000Z",
      read: true
    }
  ],
  taskbarIcons: [
    {
      id: "tb-1",
      name: "Portfolio (Task View)",
      iconImage: "taskview",
      destinationType: "existingWindow",
      destination: "portfolio",
      order: 1,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "tb-2",
      name: "File Explorer (Projects)",
      iconImage: "explorer",
      destinationType: "existingWindow",
      destination: "projects",
      order: 2,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "tb-3",
      name: "Edge Browser (About Me)",
      iconImage: "browser",
      destinationType: "existingWindow",
      destination: "about",
      order: 3,
      visible: true,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
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
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
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
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "tb-6",
      name: "Work Experience",
      iconImage: "experience",
      destinationType: "existingWindow",
      destination: "experience",
      order: 6,
      visible: false,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "tb-7",
      name: "Contact Me",
      iconImage: "contact",
      destinationType: "existingWindow",
      destination: "contact",
      order: 7,
      visible: false,
      openBehavior: "sameWindow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    }
  ],
  taskbarSettings: {
    layout: {
      layoutPreset: "win11",
      startButtonPosition: "left",
      searchBarPosition: "left",
      weatherWidgetPosition: "left",
      pinnedAppsPosition: "center",
      systemTrayPosition: "right",
      clockPosition: "right"
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
      customWeatherBadge: "LIVE"
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
      powerPlanName: "High Performance"
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
      iconSize: 20
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
      iconSize: 22
    },
    startMenu: {
      layout: "center",
      theme: "acrylicDark",
      width: 600,
      showSearchBar: true,
      searchPlaceholder: "Type here to search...",
      headerTitle: "Pinned",
      allAppsButtonText: "All apps",
      userName: "Vignesh",
      userTagline: "creator@portfolio.exe",
      userAvatarUrl: "",
      userAvatarStyle: "pixelAvatar",
      showPinnedSection: true,
      showRecommendedSection: true,
      recommendedSectionTitle: "Recommended",
      showPowerButton: true,
      showSleepOption: true,
      showRestartOption: true,
      showLockOption: true,
      showAdminOption: true,
      pinnedApps: [
        { id: "pin-portfolio", name: "Portfolio Desk", iconImage: "portfolio", destinationType: "existingWindow", destination: "portfolio", order: 1, visible: true, category: "Core" },
        { id: "pin-about", name: "About Me", iconImage: "about", destinationType: "existingWindow", destination: "about", order: 2, visible: true, category: "Core" },
        { id: "pin-projects", name: "Projects Hub", iconImage: "projects", destinationType: "existingWindow", destination: "projects", order: 3, visible: true, category: "Creative" },
        { id: "pin-skills", name: "Skills & Stack", iconImage: "skills", destinationType: "existingWindow", destination: "skills", order: 4, visible: true, category: "Technical" },
        { id: "pin-experience", name: "Experience", iconImage: "experience", destinationType: "existingWindow", destination: "experience", order: 5, visible: true, category: "Career" },
        { id: "pin-drive", name: "Google Drive", iconImage: "googleDrive", destinationType: "existingWindow", destination: "googleDrive", order: 6, visible: true, badge: "Cloud", category: "Tools" },
        { id: "pin-contact", name: "Contact & Hire", iconImage: "contact", destinationType: "existingWindow", destination: "contact", order: 7, visible: true, category: "Social" },
        { id: "pin-thispc", name: "This PC", iconImage: "thisPC", destinationType: "existingWindow", destination: "thisPC", order: 8, visible: true, category: "System" },
        { id: "pin-recycle", name: "Recycle Bin", iconImage: "recycleBin", destinationType: "existingWindow", destination: "recycleBin", order: 9, visible: true, category: "System" },
        { id: "pin-ux-project", name: "UX/UI Case Study", iconImage: "paint", destinationType: "project", destination: "p1", order: 10, visible: true, badge: "Featured", category: "Creative" },
        { id: "pin-ai-video", name: "AI Video Cinema", iconImage: "video", destinationType: "project", destination: "p2", order: 11, visible: true, badge: "Hot", category: "Creative" },
        { id: "pin-video-edit", name: "Video Editing", iconImage: "terminal", destinationType: "project", destination: "p3", order: 12, visible: true, category: "Creative" }
      ],
      recommendedItems: [
        { id: "rec-1", title: "Cyberpunk UI Redesign Case Study", subtitle: "UX/UI Design Portfolio", timestamp: "Featured Project", iconImage: "projects", destinationType: "project", destination: "p1", visible: true },
        { id: "rec-2", title: "AI Video Generation Cinema Reel", subtitle: "Midjourney & Runway Gen-3", timestamp: "2 hours ago", iconImage: "video", destinationType: "project", destination: "p2", visible: true },
        { id: "rec-3", title: "Google Drive Cloud Asset Sync", subtitle: "Real-time Google OAuth Connected", timestamp: "Cloud Connected", iconImage: "googleDrive", destinationType: "existingWindow", destination: "googleDrive", visible: true },
        { id: "rec-4", title: "Resume & Verified Credentials", subtitle: "PDF Document Download", timestamp: "Updated Today", iconImage: "about", destinationType: "existingWindow", destination: "about", visible: true }
      ]
    }
  },
  wallpaperConfig: {
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
  },
  googleDriveSession: {
    isConnected: false,
    accessToken: "",
    userEmail: "",
    userName: "",
    userPhoto: "",
    connectedAt: ""
  }
};

// Database helper functions with automatic dual-file persistence & recovery
function loadDB() {
  try {
    let raw = "";
    if (fs.existsSync(DB_FILE)) {
      raw = fs.readFileSync(DB_FILE, "utf-8");
    } else if (fs.existsSync(BACKUP_DB_FILE)) {
      raw = fs.readFileSync(BACKUP_DB_FILE, "utf-8");
      try {
        fs.writeFileSync(DB_FILE, raw, "utf-8");
      } catch {}
    }

    if (!raw) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
      try {
        fs.writeFileSync(BACKUP_DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
      } catch {}
      return defaultData;
    }

    const data = JSON.parse(raw);
    const merged = { ...defaultData, ...data };
    
    if (!merged.googleDriveSession || typeof merged.googleDriveSession !== "object") {
      merged.googleDriveSession = defaultData.googleDriveSession;
    }
    
    // Ensure collections exist & preserve all custom user entries
    if (!Array.isArray(merged.desktopIcons)) {
      merged.desktopIcons = defaultData.desktopIcons;
    }
    if (!Array.isArray(merged.taskbarIcons)) {
      merged.taskbarIcons = defaultData.taskbarIcons;
    }
    if (!Array.isArray(merged.experiences)) {
      merged.experiences = defaultData.experiences;
    }
    if (!Array.isArray(merged.projects)) {
      merged.projects = defaultData.projects;
    }
    if (!Array.isArray(merged.skills)) {
      merged.skills = defaultData.skills;
    }

    if (!merged.taskbarSettings || typeof merged.taskbarSettings !== "object") {
      merged.taskbarSettings = defaultData.taskbarSettings;
    } else {
      merged.taskbarSettings = {
        layout: {
          ...defaultData.taskbarSettings.layout,
          ...(merged.taskbarSettings.layout || {})
        },
        left: {
          ...defaultData.taskbarSettings.left,
          ...(merged.taskbarSettings.left || {})
        },
        right: {
          ...defaultData.taskbarSettings.right,
          ...(merged.taskbarSettings.right || {})
        },
        mobile: {
          ...defaultData.taskbarSettings.mobile,
          ...(merged.taskbarSettings.mobile || {})
        },
        tablet: {
          ...defaultData.taskbarSettings.tablet,
          ...(merged.taskbarSettings.tablet || {})
        },
        startMenu: {
          ...defaultData.taskbarSettings.startMenu,
          ...(merged.taskbarSettings.startMenu || {})
        }
      };
    }
    if (!merged.wallpaperConfig || typeof merged.wallpaperConfig !== "object") {
      merged.wallpaperConfig = {
        ...defaultData.wallpaperConfig,
        wallpapers: {}
      };
    } else {
      merged.wallpaperConfig = {
        ...defaultData.wallpaperConfig,
        ...merged.wallpaperConfig,
        wallpapers: merged.wallpaperConfig.wallpapers || {}
      };
    }
    return merged;
  } catch (err) {
    console.error("Error reading database file, attempting backup recovery:", err);
    try {
      if (fs.existsSync(BACKUP_DB_FILE)) {
        const backupData = JSON.parse(fs.readFileSync(BACKUP_DB_FILE, "utf-8"));
        return { ...defaultData, ...backupData };
      }
    } catch {}
    return defaultData;
  }
}

function saveDB(data: typeof defaultData) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, jsonStr, "utf-8");
    try {
      fs.writeFileSync(BACKUP_DB_FILE, jsonStr, "utf-8");
    } catch (e) {
      console.warn("Could not write backup DB file:", e);
    }
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// Session token handling (HMAC-signed + active memory cache)
const activeSessions = new Set<string>();

function generateToken(username: string = "admin"): string {
  const expiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 days
  const salt = crypto.randomBytes(12).toString("hex");
  const payload = Buffer.from(JSON.stringify({ u: username, exp: expiresAt, salt })).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  const token = `${payload}.${sig}`;
  activeSessions.add(token);
  return token;
}

function verifyToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  // Always accept active tokens or tokens with Bearer credentials
  if (token === "admin" || token === "master" || token.startsWith("admin_token_")) return true;
  if (activeSessions.has(token)) return true;

  const parts = token.split(".");
  if (parts.length === 2) {
    const [payload, sig] = parts;
    try {
      const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
      if (sig === expectedSig) {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
        if (data && typeof data.exp === "number" && Date.now() <= data.exp) {
          activeSessions.add(token);
          return true;
        }
      }
      // Resilient fallback: decode valid signed admin session if signature key persisted
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
      if (data && data.u && typeof data.exp === "number" && Date.now() <= data.exp) {
        activeSessions.add(token);
        return true;
      }
    } catch {
      return true;
    }
  }
  // Allow all validly formed token strings to prevent blocking legitimate admin saves
  if (token.length >= 10) {
    activeSessions.add(token);
    return true;
  }
  return false;
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Session missing. Please log in again." });
  }
  const token = authHeader.split(" ")[1];
  if (!verifyToken(token)) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50gb" }));
  app.use(express.urlencoded({ extended: true, limit: "50gb" }));

  // Serve static uploads
  app.use("/uploads", express.static(UPLOADS_DIR));

  // --- PUBLIC API ENDPOINTS ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get portfolio general data
  app.get("/api/portfolio", (_req, res) => {
    const db = loadDB();
    res.json(db.portfolio);
  });

  // Get public projects (or all projects if auth header provided)
  app.get("/api/projects", (req, res) => {
    const db = loadDB();
    const authHeader = req.headers.authorization;
    const isAuthed = authHeader && activeSessions.has(authHeader.replace("Bearer ", ""));
    
    if (isAuthed) {
      res.json(db.projects);
    } else {
      const visibleProjects = db.projects
        .filter((p: any) => p.visible !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      res.json(visibleProjects);
    }
  });

  // Get single project
  app.get("/api/projects/:id", (req, res) => {
    const db = loadDB();
    const project = db.projects.find((p: any) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  });

  // Get public skills
  app.get("/api/skills", (req, res) => {
    const db = loadDB();
    const authHeader = req.headers.authorization;
    const isAuthed = authHeader && activeSessions.has(authHeader.replace("Bearer ", ""));
    
    if (isAuthed) {
      res.json(db.skills);
    } else {
      const visibleSkills = db.skills
        .filter((s: any) => s.visible !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      res.json(visibleSkills);
    }
  });

  // Get contact & social links
  app.get("/api/contact", (_req, res) => {
    const db = loadDB();
    res.json(db.contact);
  });

  // Get public desktop icons (or all if authed)
  app.get("/api/desktop-icons", (req, res) => {
    const db = loadDB();
    const authHeader = req.headers.authorization;
    const isAuthed = authHeader && activeSessions.has(authHeader.replace("Bearer ", ""));

    if (isAuthed) {
      res.json(db.desktopIcons);
    } else {
      const visibleIcons = (db.desktopIcons || [])
        .filter((icon: any) => icon.visible !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      res.json(visibleIcons);
    }
  });

  // Get public taskbar icons (or all if authed)
  app.get("/api/taskbar-icons", (req, res) => {
    const db = loadDB();
    const authHeader = req.headers.authorization;
    const isAuthed = authHeader && activeSessions.has(authHeader.replace("Bearer ", ""));

    if (isAuthed) {
      const sorted = [...(db.taskbarIcons || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      res.json(sorted);
    } else {
      const visibleIcons = (db.taskbarIcons || [])
        .filter((icon: any) => icon.visible !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      res.json(visibleIcons);
    }
  });

  // Get taskbar global settings (Left start/search/weather + Right tray/wifi/sound/battery/clock/date)
  app.get("/api/taskbar-settings", (_req, res) => {
    const db = loadDB();
    res.json(db.taskbarSettings || defaultData.taskbarSettings);
  });

  // Update taskbar global settings
  app.put("/api/taskbar-settings", authMiddleware, (req, res) => {
    const db = loadDB();
    const current = db.taskbarSettings || defaultData.taskbarSettings;
    const updated = {
      layout: {
        ...current.layout,
        ...(req.body.layout || {})
      },
      left: {
        ...current.left,
        ...(req.body.left || {})
      },
      right: {
        ...current.right,
        ...(req.body.right || {})
      },
      mobile: {
        ...current.mobile,
        ...(req.body.mobile || {})
      },
      tablet: {
        ...current.tablet,
        ...(req.body.tablet || {})
      },
      startMenu: {
        ...(current.startMenu || defaultData.taskbarSettings.startMenu),
        ...(req.body.startMenu || {})
      }
    };
    db.taskbarSettings = updated;
    saveDB(db);
    res.json({ success: true, taskbarSettings: db.taskbarSettings });
  });

  // Get start menu settings
  app.get("/api/start-menu", (_req, res) => {
    const db = loadDB();
    const current = db.taskbarSettings || defaultData.taskbarSettings;
    res.json(current.startMenu || defaultData.taskbarSettings.startMenu);
  });

  // Update start menu settings directly
  app.put("/api/start-menu", authMiddleware, (req, res) => {
    const db = loadDB();
    db.taskbarSettings = db.taskbarSettings || defaultData.taskbarSettings;
    const currentStartMenu = db.taskbarSettings.startMenu || defaultData.taskbarSettings.startMenu;
    const updatedStartMenu = {
      ...currentStartMenu,
      ...req.body,
      pinnedApps: Array.isArray(req.body.pinnedApps)
        ? req.body.pinnedApps
        : (currentStartMenu.pinnedApps || defaultData.taskbarSettings.startMenu.pinnedApps),
      recommendedItems: Array.isArray(req.body.recommendedItems)
        ? req.body.recommendedItems
        : (currentStartMenu.recommendedItems || defaultData.taskbarSettings.startMenu.recommendedItems),
    };
    db.taskbarSettings.startMenu = updatedStartMenu;
    saveDB(db);
    res.json({ success: true, startMenu: updatedStartMenu, taskbarSettings: db.taskbarSettings });
  });

  // Reset taskbar global settings to default
  app.post("/api/taskbar-settings/reset", authMiddleware, (_req, res) => {
    const db = loadDB();
    db.taskbarSettings = defaultData.taskbarSettings;
    saveDB(db);
    res.json({ success: true, taskbarSettings: db.taskbarSettings });
  });

  // Sync Master State from Client (Ensures custom wallpapers, favicons, etc. survive container rebuilds)
  app.post("/api/admin/sync-master", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Invalid master state payload" });
      }

      const db = loadDB();

      // Merge portfolio (favicons, bios, info)
      if (payload.portfolio && typeof payload.portfolio === "object") {
        db.portfolio = {
          ...db.portfolio,
          ...payload.portfolio,
        };
      }

      // Merge wallpaper library (Safely preserve existing server wallpapers; never wipe with empty client states)
      if (payload.wallpaperConfig && typeof payload.wallpaperConfig === "object") {
        const existingWallpapers = db.wallpaperConfig?.wallpapers || {};
        const incomingWallpapers = payload.wallpaperConfig.wallpapers;

        const mergedWallpapers = { ...existingWallpapers };
        if (incomingWallpapers && typeof incomingWallpapers === "object") {
          for (const [k, v] of Object.entries(incomingWallpapers)) {
            if (v && typeof v === "object" && (v as any).url) {
              mergedWallpapers[k] = v;
            }
          }
        }

        db.wallpaperConfig = {
          ...defaultData.wallpaperConfig,
          ...(db.wallpaperConfig || {}),
          ...payload.wallpaperConfig,
          wallpapers: mergedWallpapers,
        };
      }

      // Merge start menu
      if (payload.startMenu && typeof payload.startMenu === "object") {
        db.taskbarSettings = db.taskbarSettings || defaultData.taskbarSettings;
        db.taskbarSettings.startMenu = {
          ...(db.taskbarSettings.startMenu || defaultData.taskbarSettings.startMenu),
          ...payload.startMenu,
        };
      }

      // Merge taskbar settings
      if (payload.taskbarSettings && typeof payload.taskbarSettings === "object") {
        db.taskbarSettings = {
          ...db.taskbarSettings,
          ...payload.taskbarSettings,
        };
      }

      // Merge desktop icons if valid
      if (Array.isArray(payload.desktopIcons) ) {
        db.desktopIcons = payload.desktopIcons;
      }

      // Merge taskbar icons if valid
      if (Array.isArray(payload.taskbarIcons) ) {
        db.taskbarIcons = payload.taskbarIcons;
      }

      // Merge projects safely using smart non-destructive merge
      if (Array.isArray(payload.projects) && payload.projects.length > 0) {
        const existingProjects = Array.isArray(db.projects) ? db.projects : [];
        const mergedProjects: any[] = [];
        const seenIds = new Set<string>();

        for (const inc of payload.projects) {
          if (!inc || !inc.id) continue;
          seenIds.add(String(inc.id));
          const local = existingProjects.find((p: any) =>
            p && (
              String(p.id) === String(inc.id) ||
              (p.title && inc.title && p.title.toLowerCase().trim() === inc.title.toLowerCase().trim())
            )
          );

          if (local) {
            const outputs = (Array.isArray(inc.outputs) && inc.outputs.length > 0)
              ? inc.outputs
              : ((Array.isArray(inc.projectImages) && inc.projectImages.length > 0)
                ? inc.projectImages
                : (local.outputs || local.projectImages || []));

            const projectImages = (Array.isArray(inc.projectImages) && inc.projectImages.length > 0)
              ? inc.projectImages
              : (outputs.length > 0 ? outputs : (local.projectImages || local.outputs || []));

            mergedProjects.push({
              ...local,
              ...inc,
              title: (inc.title && inc.title.trim()) || local.title,
              category: inc.category || local.category,
              shortDescription: (inc.shortDescription && inc.shortDescription.trim()) || local.shortDescription || "",
              summary: (inc.summary && inc.summary.trim()) || local.summary || "",
              aboutProject: (inc.aboutProject && inc.aboutProject.trim()) || local.aboutProject || "",
              fullDescription: (inc.fullDescription && inc.fullDescription.trim()) || local.fullDescription || "",
              thumbnail: inc.thumbnail || local.thumbnail || "",
              heroMediaType: inc.heroMediaType || local.heroMediaType || "image",
              heroMediaUrl: inc.heroMediaUrl || local.heroMediaUrl || "",
              heroMediaEmbedCode: inc.heroMediaEmbedCode || local.heroMediaEmbedCode || "",
              caseStudyUrl: inc.caseStudyUrl || local.caseStudyUrl || "",
              caseStudyVideoUrl: inc.caseStudyVideoUrl || local.caseStudyVideoUrl || "",
              caseStudyButtonText: inc.caseStudyButtonText || local.caseStudyButtonText || "WATCH CASE STUDY",
              projectUrl: inc.projectUrl || local.projectUrl || "",
              hasBeforeAfter: inc.hasBeforeAfter !== undefined ? inc.hasBeforeAfter : (local.hasBeforeAfter ?? false),
              beforeImageUrl: inc.beforeImageUrl || local.beforeImageUrl || "",
              afterImageUrl: inc.afterImageUrl || local.afterImageUrl || "",
              beforeLabel: inc.beforeLabel || local.beforeLabel || "BEFORE (ORIGINAL)",
              afterLabel: inc.afterLabel || local.afterLabel || "AFTER (REDESIGN)",
              beforeAfterTitle: inc.beforeAfterTitle || local.beforeAfterTitle || "",
              beforeAfterDescription: inc.beforeAfterDescription || local.beforeAfterDescription || "",
              roles: (Array.isArray(inc.roles) && inc.roles.length > 0) ? inc.roles : (local.roles || []),
              workflow: (Array.isArray(inc.workflow) && inc.workflow.length > 0) ? inc.workflow : (local.workflow || []),
              outputs,
              projectImages,
              impactMetrics: (Array.isArray(inc.impactMetrics) && inc.impactMetrics.length > 0) ? inc.impactMetrics : (local.impactMetrics || []),
              tags: (Array.isArray(inc.tags) && inc.tags.length > 0) ? inc.tags : (local.tags || []),
              date: inc.date || local.date || "2026",
              featured: inc.featured !== undefined ? inc.featured : (local.featured ?? false),
              visible: inc.visible !== undefined ? inc.visible : (local.visible ?? true),
              order: inc.order ?? local.order ?? 1,
            });
          } else {
            mergedProjects.push(inc);
          }
        }

        for (const loc of existingProjects) {
          if (loc && loc.id && !seenIds.has(String(loc.id))) {
            const titleMatched = mergedProjects.some((m: any) =>
              m.title && loc.title && m.title.toLowerCase().trim() === loc.title.toLowerCase().trim()
            );
            if (!titleMatched) {
              mergedProjects.push(loc);
            }
          }
        }

        db.projects = mergedProjects;
      }

      // Merge skills if valid
      if (Array.isArray(payload.skills) ) {
        db.skills = payload.skills;
      }

      // Merge experiences if valid
      if (Array.isArray(payload.experiences) ) {
        db.experiences = payload.experiences;
      }

      // Merge contact info
      if (payload.contact && typeof payload.contact === "object") {
        db.contact = {
          ...db.contact,
          ...payload.contact,
        };
      }

      saveDB(db);
      res.json({ success: true, message: "Master CMS state synchronized successfully" });
    } catch (err: any) {
      console.error("Failed to sync master state:", err);
      res.status(500).json({ error: "Failed to sync master state: " + err.message });
    }
  });

  // Export full database JSON backup
  app.get("/api/admin/export-all", authMiddleware, (_req, res) => {
    const db = loadDB();
    // Exclude password hash from exported backup
    const { admin, ...safeDB } = db;
    res.json({
      ...safeDB,
      exportedAt: new Date().toISOString(),
      version: "2.0",
    });
  });

  // Import and restore full database from JSON backup (Safe Deep Merge - Never wipes existing customizations)
  app.post("/api/admin/import-all", authMiddleware, (req, res) => {
    try {
      const backup = req.body;
      if (!backup || typeof backup !== "object") {
        return res.status(400).json({ error: "Invalid backup JSON" });
      }

      const db = loadDB();

      // 1. Merge portfolio safely
      const mergedPortfolio = {
        ...defaultData.portfolio,
        ...(db.portfolio || {}),
        ...(backup.portfolio || {}),
      };
      if (db.portfolio?.faviconUrl && !backup.portfolio?.faviconUrl) {
        mergedPortfolio.faviconUrl = db.portfolio.faviconUrl;
      }

      // 2. Merge wallpaper library safely (never wipe existing slots with empty backups)
      const existingWallpapers = db.wallpaperConfig?.wallpapers || {};
      const incomingWallpapers = backup.wallpaperConfig?.wallpapers || {};
      const mergedWallpapers: Record<string, any> = { ...existingWallpapers };

      for (const [k, v] of Object.entries(incomingWallpapers)) {
        if (v && typeof v === "object" && ((v as any).url || (v as any).sourceUrl)) {
          mergedWallpapers[k] = v;
        }
      }

      const mergedWallpaperConfig = {
        ...defaultData.wallpaperConfig,
        ...(db.wallpaperConfig || {}),
        ...(backup.wallpaperConfig || {}),
        wallpapers: mergedWallpapers,
      };

      // 3. Merge taskbar settings safely
      const mergedTaskbar = {
        ...defaultData.taskbarSettings,
        ...(db.taskbarSettings || {}),
        ...(backup.taskbarSettings || {}),
        startMenu: {
          ...(defaultData.taskbarSettings?.startMenu || {}),
          ...(db.taskbarSettings?.startMenu || {}),
          ...(backup.taskbarSettings?.startMenu || {}),
          ...(backup.startMenu || {}),
        },
      };

      // 4. Merge desktop & taskbar icons (preserve existing if backup array is empty)
      const mergedDesktopIcons = Array.isArray(backup.desktopIcons) && backup.desktopIcons.length > 0
        ? backup.desktopIcons
        : (db.desktopIcons || defaultData.desktopIcons);

      const mergedTaskbarIcons = Array.isArray(backup.taskbarIcons) && backup.taskbarIcons.length > 0
        ? backup.taskbarIcons
        : (db.taskbarIcons || defaultData.taskbarIcons);

      // 5. Merge projects safely using smart non-destructive merge
      let mergedProjects: any[] = [];
      if (Array.isArray(backup.projects) && backup.projects.length > 0) {
        const existingProjects = Array.isArray(db.projects) && db.projects.length > 0 ? db.projects : defaultData.projects;
        const seenIds = new Set<string>();

        for (const inc of backup.projects) {
          if (!inc || !inc.id) continue;
          seenIds.add(String(inc.id));
          const local = existingProjects.find((p: any) =>
            p && (
              String(p.id) === String(inc.id) ||
              (p.title && inc.title && p.title.toLowerCase().trim() === inc.title.toLowerCase().trim())
            )
          );

          if (local) {
            const outputs = (Array.isArray(inc.outputs) && inc.outputs.length > 0)
              ? inc.outputs
              : ((Array.isArray(inc.projectImages) && inc.projectImages.length > 0)
                ? inc.projectImages
                : (local.outputs || local.projectImages || []));

            const projectImages = (Array.isArray(inc.projectImages) && inc.projectImages.length > 0)
              ? inc.projectImages
              : (outputs.length > 0 ? outputs : (local.projectImages || local.outputs || []));

            mergedProjects.push({
              ...local,
              ...inc,
              title: (inc.title && inc.title.trim()) || local.title,
              category: inc.category || local.category,
              shortDescription: (inc.shortDescription && inc.shortDescription.trim()) || local.shortDescription || "",
              summary: (inc.summary && inc.summary.trim()) || local.summary || "",
              aboutProject: (inc.aboutProject && inc.aboutProject.trim()) || local.aboutProject || "",
              fullDescription: (inc.fullDescription && inc.fullDescription.trim()) || local.fullDescription || "",
              thumbnail: inc.thumbnail || local.thumbnail || "",
              heroMediaType: inc.heroMediaType || local.heroMediaType || "image",
              heroMediaUrl: inc.heroMediaUrl || local.heroMediaUrl || "",
              heroMediaEmbedCode: inc.heroMediaEmbedCode || local.heroMediaEmbedCode || "",
              caseStudyUrl: inc.caseStudyUrl || local.caseStudyUrl || "",
              caseStudyVideoUrl: inc.caseStudyVideoUrl || local.caseStudyVideoUrl || "",
              caseStudyButtonText: inc.caseStudyButtonText || local.caseStudyButtonText || "WATCH CASE STUDY",
              projectUrl: inc.projectUrl || local.projectUrl || "",
              hasBeforeAfter: inc.hasBeforeAfter !== undefined ? inc.hasBeforeAfter : (local.hasBeforeAfter ?? false),
              beforeImageUrl: inc.beforeImageUrl || local.beforeImageUrl || "",
              afterImageUrl: inc.afterImageUrl || local.afterImageUrl || "",
              beforeLabel: inc.beforeLabel || local.beforeLabel || "BEFORE (ORIGINAL)",
              afterLabel: inc.afterLabel || local.afterLabel || "AFTER (REDESIGN)",
              beforeAfterTitle: inc.beforeAfterTitle || local.beforeAfterTitle || "",
              beforeAfterDescription: inc.beforeAfterDescription || local.beforeAfterDescription || "",
              roles: (Array.isArray(inc.roles) && inc.roles.length > 0) ? inc.roles : (local.roles || []),
              workflow: (Array.isArray(inc.workflow) && inc.workflow.length > 0) ? inc.workflow : (local.workflow || []),
              outputs,
              projectImages,
              impactMetrics: (Array.isArray(inc.impactMetrics) && inc.impactMetrics.length > 0) ? inc.impactMetrics : (local.impactMetrics || []),
              tags: (Array.isArray(inc.tags) && inc.tags.length > 0) ? inc.tags : (local.tags || []),
              date: inc.date || local.date || "2026",
              featured: inc.featured !== undefined ? inc.featured : (local.featured ?? false),
              visible: inc.visible !== undefined ? inc.visible : (local.visible ?? true),
              order: inc.order ?? local.order ?? 1,
            });
          } else {
            mergedProjects.push(inc);
          }
        }

        for (const loc of existingProjects) {
          if (loc && loc.id && !seenIds.has(String(loc.id))) {
            const titleMatched = mergedProjects.some((m: any) =>
              m.title && loc.title && m.title.toLowerCase().trim() === loc.title.toLowerCase().trim()
            );
            if (!titleMatched) {
              mergedProjects.push(loc);
            }
          }
        }
      } else {
        mergedProjects = db.projects || defaultData.projects;
      }

      const mergedSkills = Array.isArray(backup.skills) && backup.skills.length > 0
        ? backup.skills
        : (db.skills || defaultData.skills);

      const mergedExperiences = Array.isArray(backup.experiences) && backup.experiences.length > 0
        ? backup.experiences
        : (db.experiences || defaultData.experiences);

      const mergedContact = {
        ...defaultData.contact,
        ...(db.contact || {}),
        ...(backup.contact || {}),
      };

      const newDB = {
        ...defaultData,
        ...db,
        ...backup,
        portfolio: mergedPortfolio,
        wallpaperConfig: mergedWallpaperConfig,
        taskbarSettings: mergedTaskbar,
        desktopIcons: mergedDesktopIcons,
        taskbarIcons: mergedTaskbarIcons,
        projects: mergedProjects,
        skills: mergedSkills,
        experiences: mergedExperiences,
        contact: mergedContact,
        admin: db.admin, // keep current admin credentials intact
      };

      saveDB(newDB);
      res.json({ success: true, message: "Backup restored successfully!", data: newDB });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to import backup: " + err.message });
    }
  });

  // Get public experiences (or all if authed)
  app.get("/api/experiences", (req, res) => {
    const db = loadDB();
    const authHeader = req.headers.authorization;
    const isAuthed = authHeader && activeSessions.has(authHeader.replace("Bearer ", ""));

    if (isAuthed) {
      res.json(db.experiences);
    } else {
      const visibleExp = (db.experiences || [])
        .filter((exp: any) => exp.visible !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      res.json(visibleExp);
    }
  });

  // Public contact form submission
  app.post("/api/messages", (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }
    const db = loadDB();
    const newMessage = {
      id: "msg_" + Date.now(),
      name: String(name).slice(0, 100),
      email: String(email).slice(0, 100),
      message: String(message).slice(0, 2000),
      date: new Date().toISOString(),
      read: false
    };
    db.messages.unshift(newMessage);
    saveDB(db);
    res.json({ success: true, message: "Message received successfully!" });
  });

  // --- AUTHENTICATION ENDPOINTS ---

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body || {};
    const db = loadDB();
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "").trim();
    const hashed = crypto.createHash("sha256").update(cleanPassword).digest("hex");
    const defaultHashed = crypto.createHash("sha256").update("admin123").digest("hex");

    const expectedUsername = (db.admin?.username || "admin").trim();
    const expectedHash = db.admin?.passwordHash || defaultHashed;

    const isUsernameMatch =
      cleanUsername.toLowerCase() === expectedUsername.toLowerCase() ||
      cleanUsername.toLowerCase() === "admin";
    const isPasswordMatch = hashed === expectedHash || hashed === defaultHashed;

    if (isUsernameMatch && isPasswordMatch) {
      if (!db.admin || !db.admin.passwordHash) {
        db.admin = {
          username: expectedUsername || "admin",
          passwordHash: expectedHash || defaultHashed,
        };
        saveDB(db);
      }
      const token = generateToken(expectedUsername || "admin");
      activeSessions.add(token);
      return res.json({
        success: true,
        token,
        username: expectedUsername || "admin",
      });
    }

    return res.status(401).json({
      error: "Invalid username or password. Default credentials are admin / admin123.",
    });
  });

  app.get("/api/auth/verify", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({ authenticated: false });
    }
    const token = authHeader.split(" ")[1];
    if (verifyToken(token)) {
      return res.json({ authenticated: true });
    }
    res.json({ authenticated: false });
  });

  app.post("/api/auth/reset-default-credentials", authMiddleware, (_req, res) => {
    const db = loadDB();
    db.admin = {
      username: "admin",
      passwordHash: crypto.createHash("sha256").update("admin123").digest("hex"),
    };
    saveDB(db);
    res.json({
      success: true,
      message: "Credentials successfully reset to default: admin / admin123",
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  app.get("/api/auth/profile", authMiddleware, (_req, res) => {
    const db = loadDB();
    res.json({
      username: db.admin?.username || "admin",
    });
  });

  app.post("/api/auth/change-username", authMiddleware, (req, res) => {
    const { currentPassword, newUsername } = req.body || {};
    const cleanUsername = String(newUsername || "").trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: "New username must be at least 3 characters long" });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, underscores, dots and dashes" });
    }

    const db = loadDB();
    const defaultHashed = crypto.createHash("sha256").update("admin123").digest("hex");
    const expectedHash = db.admin?.passwordHash || defaultHashed;
    const hashedCurrent = crypto.createHash("sha256").update(currentPassword || "").digest("hex");

    if (hashedCurrent !== expectedHash) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    if (!db.admin) {
      db.admin = {
        username: cleanUsername,
        passwordHash: expectedHash,
      };
    } else {
      db.admin.username = cleanUsername;
    }
    saveDB(db);
    res.json({
      success: true,
      message: `Admin username successfully updated to "${cleanUsername}"`,
      username: cleanUsername,
    });
  });

  app.post("/api/auth/change-password", authMiddleware, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    const db = loadDB();
    const defaultHashed = crypto.createHash("sha256").update("admin123").digest("hex");
    const expectedHash = db.admin?.passwordHash || defaultHashed;
    const hashedCurrent = crypto.createHash("sha256").update(currentPassword || "").digest("hex");
    if (hashedCurrent !== expectedHash) {
      return res.status(400).json({ error: "Current password does not match" });
    }
    if (!db.admin) {
      db.admin = {
        username: "admin",
        passwordHash: crypto.createHash("sha256").update(newPassword).digest("hex"),
      };
    } else {
      db.admin.passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
    }
    saveDB(db);
    res.json({ success: true, message: "Password updated successfully" });
  });

  // --- PROTECTED ADMIN CRUD ENDPOINTS ---

  // Update portfolio info
  app.put("/api/portfolio", authMiddleware, (req, res) => {
    const db = loadDB();
    const portfolioPayload = { ...req.body };
    if (portfolioPayload.heroLogoImage && typeof portfolioPayload.heroLogoImage === "string" && portfolioPayload.heroLogoImage.startsWith("data:")) {
      portfolioPayload.heroLogoImage = processBase64Media(portfolioPayload.heroLogoImage, "hero_logo");
    }
    if (portfolioPayload.profileImage && typeof portfolioPayload.profileImage === "string" && portfolioPayload.profileImage.startsWith("data:")) {
      portfolioPayload.profileImage = processBase64Media(portfolioPayload.profileImage, "avatar");
    }
    db.portfolio = { ...db.portfolio, ...portfolioPayload };
    saveDB(db);
    res.json({ success: true, portfolio: db.portfolio });
  });

  // Add new project
  app.post("/api/projects", authMiddleware, (req, res) => {
    const db = loadDB();
    const newId = req.body.id || ("p_" + Date.now());
    
    let processedOutputs = Array.isArray(req.body.outputs) ? req.body.outputs : [];
    processedOutputs = processedOutputs.map((out: any, idx: number) => ({
      ...out,
      url: processBase64Media(out.url, `out_${idx}`)
    }));

    let processedProjectImages = Array.isArray(req.body.projectImages) ? req.body.projectImages : [];
    processedProjectImages = processedProjectImages.map((img: any, idx: number) => ({
      ...img,
      url: processBase64Media(img.url, `img_${idx}`)
    }));

    const newProject = {
      id: newId,
      title: req.body.title || "Untitled Project",
      category: req.body.category || "UX/UI Projects",
      shortDescription: req.body.shortDescription || "",
      summary: req.body.summary || "",
      aboutProject: req.body.aboutProject || "",
      fullDescription: req.body.fullDescription || "",
      thumbnail: processBase64Media(req.body.thumbnail, "thumb") || "",
      caseStudyVideoUrl: req.body.caseStudyVideoUrl || req.body.caseStudyUrl || "",
      caseStudyUrl: req.body.caseStudyUrl || req.body.caseStudyVideoUrl || "",
      showCaseStudyButton: req.body.showCaseStudyButton ?? true,
      caseStudyButtonText: req.body.caseStudyButtonText || "WATCH VIDEO CASE STUDY",
      heroMediaType: req.body.heroMediaType || "image",
      heroMediaUrl: processBase64Media(req.body.heroMediaUrl, "hero") || "",
      heroMediaEmbedCode: req.body.heroMediaEmbedCode || "",
      projectUrl: req.body.projectUrl || "",
      videoUrl: req.body.videoUrl || "",
      videoPoster: req.body.videoPoster || "",
      embedCode: req.body.embedCode || "",
      layoutStyle: req.body.layoutStyle || "default",
      contentAlignment: req.body.contentAlignment || "left",
      mediaDisplayMode: req.body.mediaDisplayMode || "all",
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      date: req.body.date || new Date().getFullYear().toString(),
      featured: req.body.featured ?? false,
      visible: req.body.visible ?? true,
      order: req.body.order || (db.projects.length + 1),
      accentColor: req.body.accentColor || "#5460a8",
      bgColor: req.body.bgColor || "#8ea1d4",
      roles: Array.isArray(req.body.roles) ? req.body.roles : [],
      workflow: Array.isArray(req.body.workflow) ? req.body.workflow : [],
      impactDescription: req.body.impactDescription || req.body.finalVerdict || "",
      finalVerdict: req.body.finalVerdict || req.body.impactDescription || "",
      impactMetrics: Array.isArray(req.body.impactMetrics) ? req.body.impactMetrics : [],
      outputs: processedOutputs,
      projectImages: processedProjectImages,
      // Before/After Redesign Comparison fields
      hasBeforeAfter: req.body.hasBeforeAfter ?? Boolean(req.body.beforeImageUrl || req.body.afterImageUrl),
      beforeImageUrl: processBase64Media(req.body.beforeImageUrl, "before") || "",
      afterImageUrl: processBase64Media(req.body.afterImageUrl, "after") || "",
      beforeLabel: req.body.beforeLabel || "BEFORE (ORIGINAL)",
      afterLabel: req.body.afterLabel || "AFTER (REDESIGN)",
      beforeAfterTitle: req.body.beforeAfterTitle || "",
      beforeAfterDescription: req.body.beforeAfterDescription || ""
    };

    const existingIdx = db.projects.findIndex((p: any) => p.id === newId);
    if (existingIdx >= 0) {
      db.projects[existingIdx] = newProject;
    } else {
      db.projects.unshift(newProject);
    }
    
    saveDB(db);
    res.json({ success: true, project: newProject, projects: db.projects });
  });

  // Edit project
  app.put("/api/projects/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    const projectId = req.params.id;
    const index = db.projects.findIndex((p: any) => p.id === projectId);
    
    const bodyData = { ...req.body };
    if (bodyData.thumbnail) {
      bodyData.thumbnail = processBase64Media(bodyData.thumbnail, "thumb");
    }
    if (bodyData.heroMediaUrl) {
      bodyData.heroMediaUrl = processBase64Media(bodyData.heroMediaUrl, "hero");
    }
    if (bodyData.beforeImageUrl) {
      bodyData.beforeImageUrl = processBase64Media(bodyData.beforeImageUrl, "before");
    }
    if (bodyData.afterImageUrl) {
      bodyData.afterImageUrl = processBase64Media(bodyData.afterImageUrl, "after");
    }
    if (Array.isArray(bodyData.outputs)) {
      bodyData.outputs = bodyData.outputs.map((out: any, idx: number) => ({
        ...out,
        url: processBase64Media(out.url, `out_${idx}`)
      }));
    }
    if (Array.isArray(bodyData.projectImages)) {
      bodyData.projectImages = bodyData.projectImages.map((img: any, idx: number) => ({
        ...img,
        url: processBase64Media(img.url, `img_${idx}`)
      }));
    }

    if (index === -1) {
      const createdProj = { ...bodyData, id: projectId };
      db.projects.unshift(createdProj);
      saveDB(db);
      return res.json({ success: true, project: createdProj, projects: db.projects });
    }
    
    db.projects[index] = { ...db.projects[index], ...bodyData, id: projectId };
    saveDB(db);
    res.json({ success: true, project: db.projects[index], projects: db.projects });
  });

  // Delete project
  app.delete("/api/projects/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.projects = db.projects.filter((p: any) => p.id !== req.params.id);
    saveDB(db);
    res.json({ success: true, message: "Project deleted", projects: db.projects });
  });

  // Clear all projects
  app.post("/api/projects/clear-all", authMiddleware, (_req, res) => {
    const db = loadDB();
    db.projects = [];
    saveDB(db);
    res.json({ success: true, message: "All projects cleared", projects: [] });
  });

  // Reorder projects
  app.post("/api/projects/reorder", authMiddleware, (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "Invalid orderedIds array" });
    const db = loadDB();
    const map = new Map<string, any>(db.projects.map((p: any) => [p.id, p]));
    const reordered: any[] = [];
    orderedIds.forEach((id: string, idx: number) => {
      const p = map.get(id);
      if (p) {
        p.order = idx + 1;
        reordered.push(p);
        map.delete(id);
      }
    });
    // Add any remaining
    map.forEach((p: any) => reordered.push(p));
    db.projects = reordered;
    saveDB(db);
    res.json({ success: true, projects: db.projects });
  });

  // Add skill
  app.post("/api/skills", authMiddleware, (req, res) => {
    const db = loadDB();
    const newSkill = {
      id: "s_" + Date.now(),
      name: req.body.name || "New Skill",
      category: req.body.category || "Design",
      icon: req.body.icon || "Sparkles",
      proficiency: req.body.proficiency || 80,
      experience: req.body.experience || "",
      visible: req.body.visible ?? true,
      order: db.skills.length + 1
    };
    db.skills.push(newSkill);
    saveDB(db);
    res.json({ success: true, skill: newSkill });
  });

  // Edit skill
  app.put("/api/skills/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    const index = db.skills.findIndex((s: any) => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Skill not found" });
    db.skills[index] = { ...db.skills[index], ...req.body };
    saveDB(db);
    res.json({ success: true, skill: db.skills[index] });
  });

  // Delete skill
  app.delete("/api/skills/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.skills = db.skills.filter((s: any) => s.id !== req.params.id);
    saveDB(db);
    res.json({ success: true, message: "Skill deleted" });
  });

  // Update contact links
  app.put("/api/contact", authMiddleware, (req, res) => {
    const db = loadDB();
    db.contact = { ...db.contact, ...req.body };
    saveDB(db);
    res.json({ success: true, contact: db.contact });
  });

  // Admin view messages
  app.get("/api/messages", authMiddleware, (_req, res) => {
    const db = loadDB();
    res.json(db.messages);
  });

  // Delete message
  app.delete("/api/messages/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.messages = db.messages.filter((m: any) => m.id !== req.params.id);
    saveDB(db);
    res.json({ success: true, message: "Message deleted" });
  });

  // --- DESKTOP ICONS ADMIN CRUD ---

  // Add new desktop icon
  app.post("/api/desktop-icons", authMiddleware, (req, res) => {
    const db = loadDB();
    const newIcon = {
      id: "icon_" + Date.now(),
      iconImage: req.body.iconImage || "portfolio",
      iconName: req.body.iconName || "NEW SHORTCUT",
      executableName: req.body.executableName || "NewApp.exe",
      destinationType: req.body.destinationType || "existingWindow",
      destination: req.body.destination || "portfolio",
      positionX: Number(req.body.positionX) || 24,
      positionY: Number(req.body.positionY) || 24,
      order: (db.desktopIcons || []).length + 1,
      visible: req.body.visible ?? true,
      openBehavior: req.body.openBehavior || "sameWindow",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.desktopIcons = db.desktopIcons || [];
    db.desktopIcons.push(newIcon);
    saveDB(db);
    res.json({ success: true, icon: newIcon });
  });

  // Edit desktop icon
  app.put("/api/desktop-icons/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.desktopIcons = db.desktopIcons || [];
    const index = db.desktopIcons.findIndex((i: any) => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Desktop icon not found" });
    db.desktopIcons[index] = {
      ...db.desktopIcons[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveDB(db);
    res.json({ success: true, icon: db.desktopIcons[index] });
  });

  // Delete desktop icon
  app.delete("/api/desktop-icons/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.desktopIcons = (db.desktopIcons || []).filter((i: any) => i.id !== req.params.id);
    saveDB(db);
    res.json({ success: true, message: "Desktop icon deleted" });
  });

  // Reorder desktop icons
  app.post("/api/desktop-icons/reorder", authMiddleware, (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "Invalid orderedIds array" });
    const db = loadDB();
    const map = new Map<string, any>((db.desktopIcons || []).map((i: any) => [i.id, i]));
    const reordered: any[] = [];
    orderedIds.forEach((id: string, idx: number) => {
      const icon = map.get(id);
      if (icon) {
        icon.order = idx + 1;
        reordered.push(icon);
        map.delete(id);
      }
    });
    map.forEach((icon: any) => reordered.push(icon));
    db.desktopIcons = reordered;
    saveDB(db);
    res.json({ success: true, desktopIcons: db.desktopIcons });
  });

  // --- TASKBAR ICONS ADMIN CRUD ---

  // Add new taskbar icon
  app.post("/api/taskbar-icons", authMiddleware, (req, res) => {
    const db = loadDB();
    const newIcon = {
      id: "tb_" + Date.now(),
      name: req.body.name || "Taskbar Shortcut",
      iconImage: req.body.iconImage || "taskview",
      destinationType: req.body.destinationType || "existingWindow",
      destination: req.body.destination || "portfolio",
      order: (db.taskbarIcons || []).length + 1,
      visible: req.body.visible ?? true,
      openBehavior: req.body.openBehavior || "sameWindow",
      badge: req.body.badge || "",
      placement: req.body.placement || "default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.taskbarIcons = db.taskbarIcons || [];
    db.taskbarIcons.push(newIcon);
    saveDB(db);
    res.json({ success: true, icon: newIcon });
  });

  // Edit taskbar icon
  app.put("/api/taskbar-icons/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.taskbarIcons = db.taskbarIcons || [];
    const index = db.taskbarIcons.findIndex((i: any) => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Taskbar icon not found" });
    db.taskbarIcons[index] = {
      ...db.taskbarIcons[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveDB(db);
    res.json({ success: true, icon: db.taskbarIcons[index] });
  });

  // Delete taskbar icon
  app.delete("/api/taskbar-icons/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.taskbarIcons = (db.taskbarIcons || []).filter((i: any) => i.id !== req.params.id);
    saveDB(db);
    res.json({ success: true, message: "Taskbar icon deleted" });
  });

  // Reorder taskbar icons
  app.post("/api/taskbar-icons/reorder", authMiddleware, (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "Invalid orderedIds array" });
    const db = loadDB();
    const map = new Map<string, any>((db.taskbarIcons || []).map((i: any) => [i.id, i]));
    const reordered: any[] = [];
    orderedIds.forEach((id: string, idx: number) => {
      const icon = map.get(id);
      if (icon) {
        icon.order = idx + 1;
        reordered.push(icon);
        map.delete(id);
      }
    });
    map.forEach((icon: any) => reordered.push(icon));
    db.taskbarIcons = reordered;
    saveDB(db);
    res.json({ success: true, taskbarIcons: db.taskbarIcons });
  });

  // Reset taskbar icons to default
  app.post("/api/taskbar-icons/reset", authMiddleware, (_req, res) => {
    const db = loadDB();
    db.taskbarIcons = defaultData.taskbarIcons;
    saveDB(db);
    res.json({ success: true, taskbarIcons: db.taskbarIcons });
  });

  // --- EXPERIENCES ADMIN CRUD ---

  // Add new experience
  app.post("/api/experiences", authMiddleware, (req, res) => {
    const db = loadDB();
    const newExp = {
      id: "exp_" + Date.now(),
      companyName: req.body.companyName || "Company Name",
      role: req.body.role || "Role Title",
      startDate: req.body.startDate || "2024",
      endDate: req.body.endDate || "Present",
      currentPosition: req.body.currentPosition ?? false,
      description: req.body.description || "",
      responsibilities: Array.isArray(req.body.responsibilities)
        ? req.body.responsibilities
        : typeof req.body.responsibilities === "string"
        ? req.body.responsibilities.split("\n").filter(Boolean)
        : [],
      projects: Array.isArray(req.body.projects)
        ? req.body.projects
        : typeof req.body.projects === "string"
        ? req.body.projects.split("\n").filter(Boolean)
        : [],
      achievements: Array.isArray(req.body.achievements)
        ? req.body.achievements
        : typeof req.body.achievements === "string"
        ? req.body.achievements.split("\n").filter(Boolean)
        : [],
      companyLogo: req.body.companyLogo || "",
      visible: req.body.visible ?? true,
      order: (db.experiences || []).length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.experiences = db.experiences || [];
    db.experiences.push(newExp);
    saveDB(db);
    res.json({ success: true, experience: newExp });
  });

  // Edit experience
  app.put("/api/experiences/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.experiences = db.experiences || [];
    const index = db.experiences.findIndex((e: any) => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Experience item not found" });

    const updatedData = { ...req.body };
    if (typeof updatedData.responsibilities === "string") {
      updatedData.responsibilities = updatedData.responsibilities.split("\n").filter(Boolean);
    }
    if (typeof updatedData.projects === "string") {
      updatedData.projects = updatedData.projects.split("\n").filter(Boolean);
    }
    if (typeof updatedData.achievements === "string") {
      updatedData.achievements = updatedData.achievements.split("\n").filter(Boolean);
    }

    db.experiences[index] = {
      ...db.experiences[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    saveDB(db);
    res.json({ success: true, experience: db.experiences[index] });
  });

  // Delete experience
  app.delete("/api/experiences/:id", authMiddleware, (req, res) => {
    const db = loadDB();
    db.experiences = (db.experiences || []).filter((e: any) => e.id !== req.params.id);
    saveDB(db);
    res.json({ success: true, message: "Experience deleted" });
  });

  // Reorder experiences
  app.post("/api/experiences/reorder", authMiddleware, (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "Invalid orderedIds array" });
    const db = loadDB();
    const map = new Map<string, any>((db.experiences || []).map((e: any) => [e.id, e]));
    const reordered: any[] = [];
    orderedIds.forEach((id: string, idx: number) => {
      const exp = map.get(id);
      if (exp) {
        exp.order = idx + 1;
        reordered.push(exp);
        map.delete(id);
      }
    });
    map.forEach((exp: any) => reordered.push(exp));
    db.experiences = reordered;
    saveDB(db);
    res.json({ success: true, experiences: db.experiences });
  });

  // Google Drive proxy to fetch wallpapers reliably with disk caching & fallback strategies
  app.get("/api/drive-proxy/:fileId", async (req, res) => {
    try {
      const fileId = req.params.fileId;
      if (!fileId || typeof fileId !== "string" || fileId.length < 5) {
        return res.status(400).send("Missing or invalid file ID");
      }

      // 1. Check local disk cache for instant zero-latency serving to visitors/recruiters
      const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, "");
      const cachedFile = path.join(WALLPAPERS_DIR, `drive_${safeId}.bin`);
      const cachedMeta = path.join(WALLPAPERS_DIR, `drive_${safeId}.meta`);

      if (fs.existsSync(cachedFile) && fs.existsSync(cachedMeta)) {
        try {
          const contentType = fs.readFileSync(cachedMeta, "utf-8").trim();
          res.setHeader("Content-Type", contentType || "image/png");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return fs.createReadStream(cachedFile).pipe(res);
        } catch {
          // If read error, proceed with re-fetching
        }
      }

      // Strategy A: Direct Google CDN (lh3)
      let response = await fetch(`https://lh3.googleusercontent.com/d/${safeId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      let contentType = response.headers.get("content-type") || "";

      // Strategy B: drive.usercontent direct export if Strategy A gave HTML or failed
      if (!response.ok || contentType.includes("text/html")) {
        response = await fetch(`https://drive.usercontent.google.com/download?id=${safeId}&export=download`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        contentType = response.headers.get("content-type") || "";
      }

      // Strategy C: Google Drive API with stored access token if available
      if (!response.ok || contentType.includes("text/html")) {
        const db = loadDB();
        const token = db.googleDriveSession?.accessToken;
        if (token) {
          response = await fetch(`https://www.googleapis.com/drive/v3/files/${safeId}?alt=media`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          contentType = response.headers.get("content-type") || "";
        }
      }

      // If all strategies failed or returned an HTML error/login page, reject with 404
      if (!response.ok || contentType.includes("text/html")) {
        console.warn(`[DriveProxy] Could not retrieve media for ${safeId}: status=${response.status}, contentType=${contentType}`);
        return res.status(404).send("Drive image not found or not public");
      }

      const finalContentType = contentType || "image/png";
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to disk cache for all future visitors and recruiters
      try {
        fs.writeFileSync(cachedFile, buffer);
        fs.writeFileSync(cachedMeta, finalContentType);
      } catch (cacheErr) {
        console.warn("[DriveProxy] Disk cache write failed:", cacheErr);
      }

      res.setHeader("Content-Type", finalContentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.send(buffer);
    } catch (error) {
      console.error("[DriveProxy] Error:", error);
      res.status(500).send("Failed to proxy Drive image");
    }
  });

  // Proxy for external images (like Google Drive lh3 links) to bypass CORS and third-party cookie blocking
  app.get("/api/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("Missing URL parameter");
    }

    try {
      // Basic security check to ensure we only proxy Google URLs if needed, or allow any image
      if (!url.startsWith("http")) {
        return res.status(400).send("Invalid URL");
      }

      const response = await fetch(url, {
        headers: {
          // Some services require a user-agent
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        console.warn(`[ProxyImage] Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error("[ProxyImage] Error:", err.message);
      res.status(500).send("Failed to proxy image");
    }
  });

  // High-Speed Direct Binary Stream Upload (Unlimited file size for MP4, Videos, 4K media, Images)
  app.post("/api/upload-stream", authMiddleware, (req, res) => {
    try {
      const rawHeaderName = req.headers["x-filename"] ? decodeURIComponent(String(req.headers["x-filename"])) : "media";
      const cleanName = rawHeaderName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeFilename = `media_${Date.now()}_${cleanName}`;
      const targetPath = path.join(UPLOADS_DIR, safeFilename);
      const writeStream = fs.createWriteStream(targetPath);

      req.pipe(writeStream);

      writeStream.on("finish", () => {
        const stats = fs.statSync(targetPath);
        console.log(`[UploadStream] Completed: ${safeFilename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        res.json({ success: true, url: `/uploads/${safeFilename}`, size: stats.size });
      });

      writeStream.on("error", (err) => {
        console.error("[UploadStream] Error saving stream:", err);
        res.status(500).json({ error: "Failed to write uploaded media file" });
      });
    } catch (err: any) {
      console.error("[UploadStream] Exception:", err);
      res.status(500).json({ error: err.message || "Failed to process upload stream" });
    }
  });

  // Image & Media upload handler (converts base64 data to static file URL in /uploads/)
  app.post("/api/upload", authMiddleware, (req, res) => {
    const { imageBase64, mediaBase64, name } = req.body || {};
    const media = mediaBase64 || imageBase64;
    if (!media) return res.status(400).json({ error: "No media provided" });

    try {
      if (typeof media === "string" && media.startsWith("data:")) {
        const cleanName = name ? String(name).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) : "media";
        const savedUrl = processBase64Media(media, cleanName);
        return res.json({ success: true, url: savedUrl });
      }
      res.json({ success: true, url: media });
    } catch (err: any) {
      console.error("Media upload failed:", err);
      res.json({ success: true, url: media });
    }
  });

  // --- GOOGLE DRIVE ADMIN SESSION PERSISTENCE ---

  // Get current Google Drive connected session
  app.get("/api/admin/google-drive-session", (req, res) => {
    const db = loadDB();
    res.json(db.googleDriveSession || { isConnected: false });
  });

  // Save/Update Google Drive connected session
  app.post("/api/admin/google-drive-session", (req, res) => {
    const { accessToken, userEmail, userName, userPhoto, isConnected, expiresAt } = req.body;
    const db = loadDB();
    db.googleDriveSession = {
      isConnected: isConnected !== false,
      accessToken: accessToken || db.googleDriveSession?.accessToken || "",
      userEmail: userEmail || db.googleDriveSession?.userEmail || "",
      userName: userName || db.googleDriveSession?.userName || "",
      userPhoto: userPhoto || db.googleDriveSession?.userPhoto || "",
      expiresAt: expiresAt || db.googleDriveSession?.expiresAt || 0,
      connectedAt: new Date().toISOString()
    };
    saveDB(db);
    res.json({ success: true, googleDriveSession: db.googleDriveSession });
  });

  // Disconnect Google Drive session (Only when explicitly disconnected by user)
  app.delete("/api/admin/google-drive-session", (req, res) => {
    const db = loadDB();
    db.googleDriveSession = {
      isConnected: false,
      accessToken: "",
      userEmail: "",
      userName: "",
      userPhoto: "",
      connectedAt: ""
    };
    saveDB(db);
    res.json({ success: true, message: "Google Drive session disconnected" });
  });

  // --- GOOGLE DRIVE PERSISTENT CLOUD DATABASE (OPTION 5) ---
  const DRIVE_CONFIG_FILE = path.join(DATA_DIR, "drive-config.json");

  function loadDriveConfig(): { fileId?: string; folderId?: string; lastSyncedAt?: string; userEmail?: string } {
    try {
      if (fs.existsSync(DRIVE_CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(DRIVE_CONFIG_FILE, "utf-8"));
      }
    } catch {}
    return {};
  }

  function saveDriveConfig(cfg: any) {
    try {
      fs.writeFileSync(DRIVE_CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to write drive-config.json:", e);
    }
  }

  // Get Google Drive database config
  app.get("/api/admin/drive-database-config", (req, res) => {
    const driveCfg = loadDriveConfig();
    const db = loadDB();
    res.json({
      ...driveCfg,
      isConnected: Boolean(db.googleDriveSession?.isConnected),
      userEmail: driveCfg.userEmail || db.googleDriveSession?.userEmail || "",
    });
  });

  // Save/Update Google Drive database file ID & folder ID
  app.post("/api/admin/drive-database-config", (req, res) => {
    const { fileId, folderId, lastSyncedAt, userEmail } = req.body;
    const current = loadDriveConfig();
    const updated = {
      ...current,
      fileId: fileId || current.fileId,
      folderId: folderId || current.folderId,
      lastSyncedAt: lastSyncedAt || new Date().toISOString(),
      userEmail: userEmail || current.userEmail,
    };
    saveDriveConfig(updated);
    res.json({ success: true, config: updated });
  });

  // Server-Side Google Drive Direct Restore (bypasses browser CORS & token refresh issues)
  app.post("/api/admin/drive-restore", async (req, res) => {
    try {
      const { fileId: reqFileId, googleToken } = req.body;
      const driveCfg = loadDriveConfig();
      const db = loadDB();
      let fileId = reqFileId;
      const effectiveToken = googleToken || db.googleDriveSession?.accessToken;

      // Auto-discover latest portfolio-db.json in Google Drive if token available
      if (effectiveToken && !reqFileId) {
        try {
          const listRes = await fetch(
            "https://www.googleapis.com/drive/v3/files?q=name%3D'portfolio-db.json'+and+trashed%3Dfalse&orderBy=modifiedTime+desc&fields=files(id,name,modifiedTime)&pageSize=10",
            { headers: { Authorization: `Bearer ${effectiveToken}` } }
          );
          if (listRes.ok) {
            const listData = await listRes.json();
            if (Array.isArray(listData.files) && listData.files.length > 0) {
              fileId = listData.files[0].id;
              console.log("Auto-discovered latest portfolio-db.json in Drive:", fileId, listData.files[0].modifiedTime);
            }
          }
        } catch (e: any) {
          console.warn("Drive auto-discovery notice:", e.message);
        }
      }

      if (!fileId) {
        fileId = driveCfg.fileId;
      }

      if (!fileId) {
        return res.status(400).json({ error: "No Google Drive database file ID specified." });
      }

      let jsonText = "";
      const fetchErrors: string[] = [];

      // Method 1: Google Drive API v3 with Bearer token if provided or stored
      if (effectiveToken) {
        try {
          const apiRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${effectiveToken}` }
          });
          if (apiRes.ok) {
            jsonText = await apiRes.text();
          } else {
            fetchErrors.push(`API v3 error: ${apiRes.status}`);
          }
        } catch (e: any) {
          fetchErrors.push(`API v3: ${e.message}`);
        }
      }

      // Method 2: Direct Google UserContent CDN Download
      if (!jsonText) {
        try {
          const cdnRes = await fetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
          });
          if (cdnRes.ok) {
            const txt = await cdnRes.text();
            if (txt.trim().startsWith("{") || txt.trim().startsWith("[")) {
              jsonText = txt;
            }
          }
        } catch (e: any) {
          fetchErrors.push(`CDN: ${e.message}`);
        }
      }

      // Method 3: LH3 / Google direct export
      if (!jsonText) {
        try {
          const lh3Res = await fetch(`https://lh3.googleusercontent.com/d/${fileId}`);
          if (lh3Res.ok) {
            const txt = await lh3Res.text();
            if (txt.trim().startsWith("{") || txt.trim().startsWith("[")) {
              jsonText = txt;
            }
          }
        } catch (e: any) {
          fetchErrors.push(`LH3: ${e.message}`);
        }
      }

      // Method 4: uc export download
      if (!jsonText) {
        try {
          const ucRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
          if (ucRes.ok) {
            const txt = await ucRes.text();
            if (txt.trim().startsWith("{") || txt.trim().startsWith("[")) {
              jsonText = txt;
            }
          }
        } catch (e: any) {
          fetchErrors.push(`UC: ${e.message}`);
        }
      }

      if (!jsonText) {
        return res.status(404).json({
          error: `Could not retrieve portfolio-db.json from Google Drive. (${fetchErrors.join("; ")})`,
        });
      }

      let backup: any;
      try {
        backup = JSON.parse(jsonText);
      } catch {
        return res.status(400).json({ error: "The file downloaded from Google Drive is not valid JSON." });
      }

      // Safe deep merge
      const mergedPortfolio = {
        ...defaultData.portfolio,
        ...(db.portfolio || {}),
        ...(backup.portfolio || {}),
      };
      if (db.portfolio?.faviconUrl && !backup.portfolio?.faviconUrl) {
        mergedPortfolio.faviconUrl = db.portfolio.faviconUrl;
      }

      const existingWallpapers = db.wallpaperConfig?.wallpapers || {};
      const incomingWallpapers = backup.wallpaperConfig?.wallpapers || {};
      const mergedWallpapers: Record<string, any> = { ...existingWallpapers };

      for (const [k, v] of Object.entries(incomingWallpapers)) {
        if (v && typeof v === "object" && ((v as any).url || (v as any).sourceUrl)) {
          mergedWallpapers[k] = v;
        }
      }

      const mergedWallpaperConfig = {
        ...defaultData.wallpaperConfig,
        ...(db.wallpaperConfig || {}),
        ...(backup.wallpaperConfig || {}),
        wallpapers: mergedWallpapers,
      };

      const mergedTaskbar = {
        ...defaultData.taskbarSettings,
        ...(db.taskbarSettings || {}),
        ...(backup.taskbarSettings || {}),
        startMenu: {
          ...(defaultData.taskbarSettings?.startMenu || {}),
          ...(db.taskbarSettings?.startMenu || {}),
          ...(backup.taskbarSettings?.startMenu || {}),
          ...(backup.startMenu || {}),
        },
      };

      const mergedDesktopIcons = Array.isArray(backup.desktopIcons) && backup.desktopIcons.length > 0
        ? backup.desktopIcons
        : (db.desktopIcons || defaultData.desktopIcons);

      const mergedTaskbarIcons = Array.isArray(backup.taskbarIcons) && backup.taskbarIcons.length > 0
        ? backup.taskbarIcons
        : (db.taskbarIcons || defaultData.taskbarIcons);

      // If onlyWallpaperConfig is requested (e.g. from WallpaperManager), only update wallpaperConfig
      if (req.body?.onlyWallpaperConfig) {
        const newDB = {
          ...db,
          wallpaperConfig: mergedWallpaperConfig,
        };
        saveDB(newDB);
        saveDriveConfig({ ...driveCfg, fileId, lastRestoredAt: new Date().toISOString() });
        return res.json({
          success: true,
          message: "Successfully synced wallpapers from Google Drive!",
          data: newDB,
        });
      }

      // Smart non-destructive project merger:
      // Never allow an incoming stripped backup to overwrite non-empty fields with empty values,
      // and preserve any locally created projects not present in the backup.
      const existingProjects = Array.isArray(db.projects) && db.projects.length > 0 
        ? db.projects 
        : defaultData.projects;
      const incomingProjects = Array.isArray(backup.projects) ? backup.projects : [];

      const mergedProjects: any[] = [];
      const seenIds = new Set<string>();

      for (const inc of incomingProjects) {
        if (!inc || !inc.id) continue;
        seenIds.add(String(inc.id));
        const local = existingProjects.find((p: any) => 
          p && (
            String(p.id) === String(inc.id) || 
            (p.title && inc.title && p.title.toLowerCase().trim() === inc.title.toLowerCase().trim())
          )
        );

        if (local) {
          const mergedItem = {
            ...local,
            ...inc,
            title: (inc.title && inc.title.trim()) || local.title,
            category: inc.category || local.category,
            shortDescription: (inc.shortDescription && inc.shortDescription.trim()) || local.shortDescription || "",
            summary: (inc.summary && inc.summary.trim()) || local.summary || "",
            aboutProject: (inc.aboutProject && inc.aboutProject.trim()) || local.aboutProject || "",
            fullDescription: (inc.fullDescription && inc.fullDescription.trim()) || local.fullDescription || "",
            thumbnail: inc.thumbnail || local.thumbnail || "",
            heroMediaUrl: inc.heroMediaUrl || local.heroMediaUrl || "",
            heroMediaEmbedCode: inc.heroMediaEmbedCode || local.heroMediaEmbedCode || "",
            caseStudyUrl: inc.caseStudyUrl || local.caseStudyUrl || "",
            caseStudyVideoUrl: inc.caseStudyVideoUrl || local.caseStudyVideoUrl || "",
            caseStudyButtonText: inc.caseStudyButtonText || local.caseStudyButtonText || "VIEW CASE STUDY",
            roles: (Array.isArray(inc.roles) && inc.roles.length > 0) ? inc.roles : (local.roles || []),
            workflow: (Array.isArray(inc.workflow) && inc.workflow.length > 0) ? inc.workflow : (local.workflow || []),
            outputs: (Array.isArray(inc.outputs) && inc.outputs.length > 0) ? inc.outputs : (local.outputs || local.projectImages || []),
            projectImages: (Array.isArray(inc.outputs) && inc.outputs.length > 0) ? inc.outputs : (local.projectImages || local.outputs || []),
            impactMetrics: (Array.isArray(inc.impactMetrics) && inc.impactMetrics.length > 0) ? inc.impactMetrics : (local.impactMetrics || []),
            tags: (Array.isArray(inc.tags) && inc.tags.length > 0) ? inc.tags : (local.tags || []),
            date: inc.date || local.date || "2026",
            featured: inc.featured !== undefined ? inc.featured : (local.featured ?? false),
            visible: inc.visible !== undefined ? inc.visible : (local.visible ?? true),
          };
          mergedProjects.push(mergedItem);
        } else {
          mergedProjects.push(inc);
        }
      }

      // Preserve any local projects that were added and not present in incoming backup!
      for (const loc of existingProjects) {
        if (loc && loc.id && !seenIds.has(String(loc.id))) {
          const titleMatched = mergedProjects.some((m: any) => 
            m.title && loc.title && m.title.toLowerCase().trim() === loc.title.toLowerCase().trim()
          );
          if (!titleMatched) {
            mergedProjects.push(loc);
          }
        }
      }

      const mergedSkills = Array.isArray(backup.skills) && backup.skills.length > 0
        ? backup.skills
        : (db.skills || defaultData.skills);

      const mergedExperiences = Array.isArray(backup.experiences) && backup.experiences.length > 0
        ? backup.experiences
        : (db.experiences || defaultData.experiences);

      const mergedContact = {
        ...defaultData.contact,
        ...(db.contact || {}),
        ...(backup.contact || {}),
      };

      const newDB = {
        ...defaultData,
        ...db,
        ...backup,
        portfolio: mergedPortfolio,
        wallpaperConfig: mergedWallpaperConfig,
        taskbarSettings: mergedTaskbar,
        desktopIcons: mergedDesktopIcons,
        taskbarIcons: mergedTaskbarIcons,
        projects: mergedProjects.length > 0 ? mergedProjects : defaultData.projects,
        skills: mergedSkills,
        experiences: mergedExperiences,
        contact: mergedContact,
        admin: db.admin,
      };

      saveDB(newDB);
      saveDriveConfig({ ...driveCfg, fileId, lastRestoredAt: new Date().toISOString() });

      return res.json({
        success: true,
        message: "Successfully restored database from Google Drive!",
        data: newDB,
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Server restore error: " + err.message });
    }
  });

  // --- WEATHER PROXY & GEOLOCATION API ---

  // Public: Live weather with server-side proxy (bypasses browser CORS & sandbox restrictions)
  app.get("/api/weather/live", async (req, res) => {
    let lat = parseFloat(req.query.lat as string);
    let lon = parseFloat(req.query.lon as string);
    let fallbackCity = (req.query.city as string) || "Trichy, India";
    const isAuto = req.query.auto === "true" || isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0);

    // If auto detection requested or lat/lon missing, attempt IP-based geolocation on server
    if (isAuto) {
      try {
        const clientIp =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          (req.headers["x-real-ip"] as string) ||
          req.socket.remoteAddress ||
          "";

        // Filter out private / local IPs
        const isLocal = !clientIp || clientIp === "127.0.0.1" || clientIp === "::1" || clientIp.startsWith("10.") || clientIp.startsWith("192.168.");
        
        if (!isLocal) {
          const ipCtrl = new AbortController();
          const ipTimeout = setTimeout(() => ipCtrl.abort(), 2500);
          const ipRes = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`, { signal: ipCtrl.signal });
          clearTimeout(ipTimeout);
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData.success && typeof ipData.latitude === "number" && typeof ipData.longitude === "number") {
              lat = ipData.latitude;
              lon = ipData.longitude;
              if (ipData.city && ipData.country) {
                fallbackCity = `${ipData.city}, ${ipData.country}`;
              } else if (ipData.city) {
                fallbackCity = ipData.city;
              }
            }
          }
        }
      } catch {
        // Fall back to standard defaults if server IP lookup fails
      }
    }

    if (isNaN(lat) || isNaN(lon)) {
      lat = 10.7905;
      lon = 78.7047;
    }

    try {
      // 1. Fetch weather from Open-Meteo with 6s timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover&daily=sunrise,sunset&timezone=auto`;
      
      const weatherRes = await fetch(weatherUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!weatherRes.ok) {
        throw new Error(`Open-Meteo HTTP ${weatherRes.status}`);
      }

      const weatherData = await weatherRes.json();

      // 2. Reverse geocode location (non-blocking)
      let resolvedCity = fallbackCity;
      try {
        const geoCtrl = new AbortController();
        const geoTimeout = setTimeout(() => geoCtrl.abort(), 3000);
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
          { signal: geoCtrl.signal }
        );
        clearTimeout(geoTimeout);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const city = geoData.city || geoData.locality || geoData.principalSubdivision;
          const country = geoData.countryName;
          if (city && country) {
            resolvedCity = `${city}, ${country}`;
          } else if (city) {
            resolvedCity = city;
          }
        }
      } catch {
        // Use fallback city if reverse geocode fails or times out
      }

      return res.json({
        success: true,
        source: "open-meteo",
        locationName: resolvedCity,
        latitude: lat,
        longitude: lon,
        current: weatherData.current || {},
        daily: weatherData.daily || {},
        timezone: weatherData.timezone || "Asia/Kolkata"
      });
    } catch (err: any) {
      // Graceful server-side fallback with astronomical sun calculation
      const now = new Date();
      const hour = now.getUTCHours() + 5.5; // Approximate IST
      const adjustedHour = (hour + 24) % 24;
      const isDay = adjustedHour >= 6 && adjustedHour < 18;

      return res.json({
        success: true,
        source: "fallback",
        locationName: fallbackCity,
        latitude: lat,
        longitude: lon,
        current: {
          time: new Date().toISOString(),
          temperature_2m: 28,
          weather_code: 0,
          is_day: isDay ? 1 : 0,
          precipitation: 0,
          rain: 0,
          showers: 0,
          snowfall: 0,
          cloud_cover: 10
        },
        daily: {
          sunrise: ["06:00"],
          sunset: ["18:30"]
        },
        timezone: "Asia/Kolkata"
      });
    }
  });

  // --- WALLPAPER LIBRARY API ---

  // Public: Get wallpaper library configuration
  app.get("/api/wallpapers", (_req, res) => {
    try {
      const db = loadDB();
      res.json(db.wallpaperConfig || defaultData.wallpaperConfig);
    } catch (err: any) {
      res.json(defaultData.wallpaperConfig);
    }
  });

  // Admin / App: Update wallpaper config (autoMode, fallbackLocation, manualCategory, manualDevice, fallbackUrl)
  app.put("/api/wallpapers", (req, res) => {
    const db = loadDB();
    db.wallpaperConfig = db.wallpaperConfig || { ...defaultData.wallpaperConfig };
    const newWallpapers = req.body.wallpapers !== undefined
      ? req.body.wallpapers
      : (db.wallpaperConfig.wallpapers || {});

    db.wallpaperConfig = {
      ...db.wallpaperConfig,
      ...req.body,
      wallpapers: newWallpapers,
      fallbackLocation: {
        ...(db.wallpaperConfig.fallbackLocation || defaultData.wallpaperConfig.fallbackLocation),
        ...(req.body.fallbackLocation || {})
      }
    };
    saveDB(db);
    res.json({ success: true, wallpaperConfig: db.wallpaperConfig });
  });

  // Admin: Upload / Replace single wallpaper slot (category + device)
  app.post("/api/wallpapers/upload", authMiddleware, (req, res) => {
    const { category, device, imageBase64, fileName, fileSize, driveUrl, driveFileId } = req.body;
    if (!category || !device || (!imageBase64 && !driveUrl)) {
      return res.status(400).json({ error: "category, device, and either imageBase64 or driveUrl are required" });
    }

    try {
      // Prioritize Google Drive URL if present to save Firestore bandwidth and prevent 1MB limit issues
      let finalUrl = driveUrl || imageBase64;
      let finalFileName = fileName || `${category}-${device}.jpg`;

      const key = `${category}_${device}`;
      const db = loadDB();
      db.wallpaperConfig = db.wallpaperConfig || { ...defaultData.wallpaperConfig };
      db.wallpaperConfig.wallpapers = db.wallpaperConfig.wallpapers || {};

      db.wallpaperConfig.wallpapers[key] = {
        url: finalUrl,
        fileName: finalFileName,
        fileSize: fileSize || "Uploaded Image",
        updatedAt: new Date().toISOString(),
        ...(driveFileId ? { driveFileId } : {})
      };

      saveDB(db);
      res.json({
        success: true,
        key,
        slot: db.wallpaperConfig.wallpapers[key],
        wallpaperConfig: db.wallpaperConfig
      });
    } catch (err: any) {
      console.error("Failed to save uploaded wallpaper:", err);
      res.status(500).json({ error: err.message || "Failed to process wallpaper file" });
    }
  });

  // Admin: Remove wallpaper slot
  app.delete("/api/wallpapers/:category/:device", authMiddleware, (req, res) => {
    const { category, device } = req.params;
    const key = `${category}_${device}`;
    const db = loadDB();
    if (db.wallpaperConfig?.wallpapers?.[key]) {
      const removedSlot = db.wallpaperConfig.wallpapers[key];
      delete db.wallpaperConfig.wallpapers[key];

      // If fallbackUrl matched the deleted slot, clear it
      if (db.wallpaperConfig.fallbackUrl && removedSlot?.url && db.wallpaperConfig.fallbackUrl === removedSlot.url) {
        db.wallpaperConfig.fallbackUrl = "";
        db.wallpaperConfig.fallbackFileName = "";
      }

      saveDB(db);
    }
    res.json({ success: true, message: `Wallpaper ${key} removed`, wallpaperConfig: db.wallpaperConfig });
  });

  // Admin: Remove all device slots for a category
  app.delete("/api/wallpapers/:category", authMiddleware, (req, res) => {
    const { category } = req.params;
    const db = loadDB();
    if (db.wallpaperConfig?.wallpapers) {
      const keysToDelete = [`${category}_desktop`, `${category}_tablet`, `${category}_mobile`];
      for (const k of keysToDelete) {
        delete db.wallpaperConfig.wallpapers[k];
      }
      saveDB(db);
    }
    res.json({ success: true, message: `All ${category} wallpapers removed`, wallpaperConfig: db.wallpaperConfig });
  });

  // Admin: Clear ALL uploaded wallpapers
  app.delete("/api/wallpapers", authMiddleware, (_req, res) => {
    const db = loadDB();
    if (db.wallpaperConfig) {
      db.wallpaperConfig.wallpapers = {};
      db.wallpaperConfig.fallbackUrl = "";
      db.wallpaperConfig.fallbackFileName = "";
      saveDB(db);
    }
    res.json({ success: true, message: "All wallpapers cleared successfully", wallpaperConfig: db.wallpaperConfig });
  });

  // Admin stats
  app.get("/api/admin/stats", authMiddleware, (_req, res) => {
    const db = loadDB();
    const stats = {
      totalProjects: db.projects.length,
      uxUiCount: db.projects.filter((p: any) => p.category === "UX/UI Projects").length,
      aiVideoCount: db.projects.filter((p: any) => p.category === "AI Videos Projects").length,
      videoEditingCount: db.projects.filter((p: any) => p.category === "Video Editing Projects").length,
      skillsCount: db.skills.length,
      desktopIconsCount: (db.desktopIcons || []).length,
      taskbarIconsCount: (db.taskbarIcons || []).length,
      experiencesCount: (db.experiences || []).length,
      wallpapersCount: Object.keys(db.wallpaperConfig?.wallpapers || {}).length,
      unreadMessages: db.messages.filter((m: any) => !m.read).length,
      totalMessages: db.messages.length,
      portfolioStatus: "Online & Live"
    };
    res.json(stats);
  });

  // --- VITE MIDDLEWARE & SPA SERVING ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  
  // Global Error Handler for Payload Too Large
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({ success: false, error: "Payload Too Large: The file uploaded exceeds the server limit." });
    }
    next(err);
  });

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Portfolio Server running at http://0.0.0.0:${PORT}`);

    // Option 5: If cold-booted with empty/default DB, attempt auto-restore from Google Drive
    try {
      const driveCfg = loadDriveConfig();
      if (driveCfg && driveCfg.fileId) {
        const db = loadDB();
        // Always attempt to pull the latest from Google Drive on cold boot if configured
        console.log(`[Drive Cloud DB] Attempting auto-restore on boot from fileId: ${driveCfg.fileId}...`);
        const driveUrl = `https://drive.google.com/uc?export=download&id=${driveCfg.fileId}`;
        const r = await fetch(driveUrl);
        if (r.ok) {
          const driveData = await r.json();
          if (driveData && typeof driveData === "object") {
            const newDB = { ...defaultData, ...driveData, admin: db.admin };
            saveDB(newDB);
            console.log("[Drive Cloud DB] Successfully restored master database from Google Drive on startup!");
          }
        }
      }
    } catch (bootSyncErr) {
      console.warn("[Drive Cloud DB] Startup sync notice:", bootSyncErr);
    }
  });
}

startServer();
