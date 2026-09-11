export interface PortfolioInfo {
  greeting: string;
  name: string;
  role: string;
  shortBio: string;
  longBio: string;
  location: string;
  locationText: string;
  availabilityText: string;
  isAvailable: boolean;
  ctaText: string;
  ctaLink: string;
  profileImage: string;
  tagline: string;
  faviconUrl?: string;
  resumeUrl?: string;
  heroLogoImage?: string;
  heroLogoSize?: number;
}

export interface ProjectOutputItem {
  id?: string;
  type: 'image' | 'video' | 'before_after';
  url: string;
  thumbnail?: string;
  title?: string;
  caption?: string;
  beforeUrl?: string;
  afterUrl?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export interface WorkflowStep {
  id?: string;
  stepNumber?: number | string;
  title: string;
  icon?: string; // 'idea' | 'script' | 'aigen' | 'voice' | 'editing' | 'delivery' or emoji
  description?: string;
}

export interface ImpactMetric {
  id?: string;
  value: string; // e.g. "70%", "60%", "3M+"
  label: string; // e.g. "Time Saved", "Cost Reduced", "Views Generated"
  icon?: string; // 'clock' | 'coin' | 'chart' or custom
}

export interface Project {
  id: string;
  title: string;
  category: 'UX/UI Projects' | 'AI Videos Projects' | 'Video Editing Projects' | string;
  shortDescription: string;
  fullDescription: string;
  summary?: string;
  aboutProject?: string;
  thumbnail: string;
  // Video Case Study (specifically requested for UX/UI Projects)
  caseStudyVideoUrl?: string;
  caseStudyUrl?: string;
  showCaseStudyButton?: boolean;
  caseStudyButtonText?: string;
  // Hero Media (Project Image Or Video)
  heroMediaType?: "image" | "video" | "embed";
  heroMediaUrl?: string;
  heroMediaEmbedCode?: string;
  projectUrl: string;
  videoUrl?: string;
  videoPoster?: string;
  embedCode?: string;
  layoutStyle?: 'default' | 'media-first' | 'split-view' | 'minimal' | 'fullwidth';
  contentAlignment?: 'left' | 'center' | 'justify';
  mediaDisplayMode?: 'all' | 'video-first' | 'embed-first' | 'gallery-only';
  tags: string[];
  date: string;
  featured: boolean;
  visible: boolean;
  order: number;
  accentColor?: string;
  bgColor?: string;
  // Section Fields matching user's requested layout
  roles?: string[];
  outputs?: ProjectOutputItem[];
  projectImages?: ProjectOutputItem[];
  // Before / After Redesign Comparison (Interactive Slider)
  hasBeforeAfter?: boolean;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeAfterTitle?: string;
  beforeAfterDescription?: string;
  workflow?: WorkflowStep[];
  impactDescription?: string;
  finalVerdict?: string;
  impactMetrics?: ImpactMetric[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  icon: string;
  proficiency?: number;
  experience?: string;
  visible: boolean;
  order: number;
}

export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  instagram: string;
  linkedin: string;
  behance: string;
  dribbble: string;
  youtube: string;
  github: string;
  twitter: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  date: string;
  read: boolean;
}

export type DestinationType = 'existingWindow' | 'project' | 'externalLink' | 'customPage' | 'customWindow';

export interface DesktopIcon {
  id: string;
  iconImage: string; // 'portfolio' | 'about' | 'skills' | 'projects' | 'contact' | 'experience' | 'recycleBin' or custom image URL/base64
  iconName: string; // Display name under the icon, e.g. "MY PORTFOLIO"
  executableName: string; // e.g. "Portfolio.exe"
  destinationType: DestinationType;
  destination: string; // windowId, projectId, or URL
  positionX?: number;
  positionY?: number;
  order: number;
  visible: boolean;
  openBehavior?: 'sameWindow' | 'newTab';
  createdAt?: string;
  updatedAt?: string;
}

export type TaskbarElementPosition = 'left' | 'center' | 'right';

export interface TaskbarLayoutSettings {
  layoutPreset: 'win11' | 'win10_left' | 'dock_center' | 'right_aligned' | 'custom';
  startButtonPosition: TaskbarElementPosition;
  searchBarPosition: TaskbarElementPosition;
  weatherWidgetPosition: TaskbarElementPosition;
  pinnedAppsPosition: TaskbarElementPosition;
  systemTrayPosition: TaskbarElementPosition;
  clockPosition: TaskbarElementPosition;
}

export interface TaskbarIcon {
  id: string;
  name: string; // Display/tooltip name e.g. "Task View", "File Explorer", "Browser", "Google Drive"
  iconImage: string; // 'taskview' | 'explorer' | 'browser' | 'googleDrive' | 'appGrid' | 'portfolio' | 'projects' | 'about' | 'skills' | 'contact' | 'experience' | 'terminal' | 'music' | 'video' | 'paint' | 'recycleBin' or custom URL/data URL
  destinationType: DestinationType; // 'existingWindow' | 'project' | 'externalLink'
  destination: string; // 'portfolio' | 'projects' | 'about' | 'skills' | 'contact' | 'experience' | 'googleDrive', projectId, or external URL
  order: number;
  visible: boolean;
  openBehavior?: 'sameWindow' | 'newTab';
  badge?: string;
  placement?: 'default' | 'left' | 'center' | 'right';
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskbarLeftSettings {
  showStartButton: boolean;
  startIconStyle: 'windows11' | 'pixel8bit' | 'win95' | 'custom';
  startIconCustomUrl?: string;
  startTooltip?: string;

  showSearchBar: boolean;
  searchPlaceholder: string;
  searchStyle: 'capsule' | 'pill' | 'compactIcon';
  searchIconColor?: string;

  showWeatherWidget: boolean;
  weatherLocationOverride?: string;
  weatherDisplayMode: 'full' | 'tempOnly' | 'iconOnly';
  tempUnit: 'celsius' | 'fahrenheit';
  customWeatherBadge?: string;
}

export interface TaskbarRightSettings {
  showWifi: boolean;
  wifiLabel?: string;
  wifiStatus?: 'connected' | 'strong' | 'medium' | 'offline';

  showVolume: boolean;
  defaultVolume: number;
  volumeLabel?: string;

  showBattery: boolean;
  batteryPercentage: number;
  batteryStatus: 'charging' | 'full' | 'normal' | 'low';
  batteryLabel?: string;

  showClock: boolean;
  clockMode: 'realtime' | 'custom';
  customTimeStr?: string;
  timeFormat: '12h' | '24h';
  showSeconds: boolean;

  showDate: boolean;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  customDateStr?: string;

  showLocationSubtitle: boolean;
  locationSubtitleText: string;

  showTrayChevron: boolean;
  trayTitle: string;
  traySubtitle: string;
  powerPlanName: string;
}

export interface TaskbarMobileSettings {
  showStartButton: boolean;
  showSearchBar: boolean;
  searchStyle: 'compactIcon' | 'pill' | 'capsule' | 'hidden';
  searchPlaceholder?: string;
  showWeatherWidget: boolean;
  weatherDisplayMode: 'iconOnly' | 'tempOnly' | 'full';
  showPinnedApps: boolean;
  maxPinnedAppsCount: number;
  showSystemTray: boolean;
  showClock: boolean;
  showLocationSubtitle: boolean;
  taskbarHeight: number; // 40, 44, 48, 52
  taskbarLayout: 'space-between' | 'center' | 'left';
  iconSize: number; // 18, 20, 22, 24
}

export interface TaskbarTabletSettings {
  showStartButton: boolean;
  showSearchBar: boolean;
  searchStyle: 'capsule' | 'pill' | 'compactIcon';
  searchPlaceholder?: string;
  showWeatherWidget: boolean;
  weatherDisplayMode: 'full' | 'tempOnly' | 'iconOnly';
  showPinnedApps: boolean;
  maxPinnedAppsCount: number;
  showSystemTray: boolean;
  showClock: boolean;
  showLocationSubtitle: boolean;
  taskbarHeight: number;
  taskbarLayout: 'win11' | 'win10_left' | 'dock_center';
  iconSize: number;
}

export interface StartMenuPinnedApp {
  id: string;
  name: string;
  iconImage: string; // pixel icon key or custom image URL
  destinationType: DestinationType;
  destination: string;
  order: number;
  visible: boolean;
  badge?: string;
  category?: string;
}

export interface StartMenuRecommendedItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  iconImage?: string;
  destinationType: DestinationType;
  destination: string;
  visible: boolean;
}

export interface StartMenuSettings {
  layout: 'center' | 'left';
  theme: 'acrylicDark' | 'acrylicLight' | 'cyberpunk' | 'pixelRetro' | 'windowsDefault';
  width: number; // e.g. 580
  showSearchBar: boolean;
  searchPlaceholder: string;
  headerTitle: string;
  allAppsButtonText: string;
  userName: string;
  userTagline: string;
  userAvatarUrl?: string;
  userAvatarStyle: 'photo' | 'initials' | 'pixelAvatar';
  showPinnedSection: boolean;
  showRecommendedSection: boolean;
  recommendedSectionTitle: string;
  pinnedApps: StartMenuPinnedApp[];
  recommendedItems: StartMenuRecommendedItem[];
  showPowerButton: boolean;
  showSleepOption: boolean;
  showRestartOption: boolean;
  showLockOption: boolean;
  showAdminOption: boolean;
}

export interface TaskbarSettings {
  layout: TaskbarLayoutSettings;
  left: TaskbarLeftSettings;
  right: TaskbarRightSettings;
  mobile?: TaskbarMobileSettings;
  tablet?: TaskbarTabletSettings;
  startMenu?: StartMenuSettings;
}

export interface Experience {
  id: string;
  companyName: string;
  role: string;
  startDate: string;
  endDate: string;
  currentPosition?: boolean;
  description: string;
  responsibilities?: string[] | string;
  projects?: string[] | string;
  achievements?: string[] | string;
  companyLogo?: string;
  visible: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  totalProjects: number;
  uxUiCount: number;
  aiVideoCount: number;
  videoEditingCount: number;
  skillsCount: number;
  desktopIconsCount?: number;
  taskbarIconsCount?: number;
  experiencesCount?: number;
  wallpapersCount?: number;
  unreadMessages: number;
  totalMessages: number;
  portfolioStatus: string;
}

export type WallpaperCategory =
  | 'sunny'
  | 'early_morning'
  | 'evening'
  | 'night'
  | 'night_rainy'
  | 'rainy'
  | 'snowfall'
  | 'cloudy';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface WallpaperSlotData {
  url: string;
  fileName?: string;
  updatedAt?: string;
  fileSize?: string;
}

export interface WallpaperLibraryConfig {
  wallpapers: Record<string, WallpaperSlotData>; // key: `${category}_${device}` e.g. "sunny_desktop"
  fallbackUrl?: string;
  fallbackFileName?: string;
  fallbackLocation: {
    city: string;
    lat: number;
    lon: number;
  };
  autoMode: boolean;
  manualCategory?: WallpaperCategory;
  manualDevice?: DeviceType;
  mobileFitMode?: 'cover' | 'contain' | 'fill' | 'scale-down';
  mobilePosition?: 'center top' | 'center center' | 'center bottom' | 'top left' | 'top right';
  desktopFitMode?: 'cover' | 'contain' | 'fill';
  desktopPosition?: 'center center' | 'center top' | 'center bottom';
}

export interface WeatherStatusInfo {
  locationName: string;
  latitude: number;
  longitude: number;
  temperature: number;
  conditionText: string;
  weatherCode: number;
  isDay: boolean;
  cloudCover: number;
  rain: number;
  snowfall: number;
  sunrise: string;
  sunset: string;
  localTimeStr: string;
  timezone: string;
  matchedCategory: WallpaperCategory;
  matchedReason: string;
  deviceType: DeviceType;
  activeAssetUrl: string;
  activeAssetFileName?: string;
  activeAssetSource: 'exact' | 'device_fallback' | 'sunny_fallback' | 'default_fallback';
  lastRefreshed: string;
  loading: boolean;
  error?: string | null;
}

export type WindowId = 
  | 'portfolio'
  | 'thisPC'
  | 'about'
  | 'skills'
  | 'projects'
  | 'contact'
  | 'experience'
  | 'recycleBin'
  | 'googleDrive'
  | 'projectDetail'
  | 'resume';

export interface OpenWindowItem {
  id: WindowId;
  project?: Project;
  category?: string;
  zIndex: number;
  isMinimized: boolean;
  isMaximized?: boolean;
}

