import { WallpaperCategory, DeviceType, WallpaperLibraryConfig, WeatherStatusInfo } from "../types";

export interface CategoryMeta {
  id: WallpaperCategory;
  name: string;
  shortName: string;
  icon: string;
  order: number;
  description: string;
  exampleCondition: string;
}

export const WALLPAPER_CATEGORIES: CategoryMeta[] = [
  {
    id: "sunny",
    name: "SUNNY WEATHER",
    shortName: "Sunny",
    icon: "☀️",
    order: 1,
    description: "Clear and sunny daytime weather with high visibility.",
    exampleCondition: "Clear Sky / Main Sunny Hours"
  },
  {
    id: "early_morning",
    name: "EARLY MORNING",
    shortName: "Early Morning",
    icon: "🌅",
    order: 2,
    description: "Golden sunrise period (30 min before to 90 min after sunrise).",
    exampleCondition: "Sunrise Dawn Glow"
  },
  {
    id: "evening",
    name: "EVENING WEATHER",
    shortName: "Evening",
    icon: "🌇",
    order: 3,
    description: "Sunset twilight period (60–90 min before to 60 min after sunset).",
    exampleCondition: "Sunset Dusk Glow"
  },
  {
    id: "night",
    name: "NIGHT WEATHER",
    shortName: "Night",
    icon: "🌙",
    order: 4,
    description: "Clear nighttime hours after dusk when no rain is present.",
    exampleCondition: "Clear Night Sky / Moonlit"
  },
  {
    id: "night_rainy",
    name: "NIGHT RAINY WEATHER",
    shortName: "Night Rainy",
    icon: "🌧️🌙",
    order: 5,
    description: "Rain, drizzle, showers, or storms occurring at nighttime.",
    exampleCondition: "Rainy Night / Night Storm"
  },
  {
    id: "rainy",
    name: "RAINY WEATHER",
    shortName: "Rainy",
    icon: "🌧️",
    order: 6,
    description: "Drizzle, rain, or showers occurring during daytime.",
    exampleCondition: "Daytime Rain / Drizzle"
  },
  {
    id: "snowfall",
    name: "SNOWFALL WEATHER",
    shortName: "Snowfall",
    icon: "❄️",
    order: 7,
    description: "Snow, sleet, or freezing precipitation at any time of day.",
    exampleCondition: "Snowfall / Flurries"
  },
  {
    id: "cloudy",
    name: "CLOUDY WEATHER",
    shortName: "Cloudy",
    icon: "☁️",
    order: 8,
    description: "Partly cloudy, cloudy, or overcast daytime sky.",
    exampleCondition: "Overcast / Scattered Clouds"
  }
];

export const DEVICE_TYPES: { id: DeviceType; name: string; icon: string; range: string; minWidth: number }[] = [
  { id: "desktop", name: "Desktop", icon: "🖥️", range: "≥ 1200px", minWidth: 1200 },
  { id: "tablet", name: "Tablet", icon: "📱", range: "768px – 1199px", minWidth: 768 },
  { id: "mobile", name: "Mobile", icon: "📲", range: "< 768px", minWidth: 0 }
];

export function getDeviceType(width: number = window.innerWidth): DeviceType {
  if (width >= 1200) return "desktop";
  if (width >= 768) return "tablet";
  return "mobile";
}

// -------------------------------------------------------------
// BUILT-IN DYNAMIC 8-BIT PIXEL ART WALLPAPERS FOR ALL 8 WEATHER STATES
// (Ensures live weather sync displays accurate weather immediately,
// even before admin uploads custom image files)
// -------------------------------------------------------------

export function getBuiltinPixelWallpaper(category: WallpaperCategory, device: DeviceType = "desktop"): string {
  const isMobile = device === "mobile";
  const viewBox = isMobile ? "0 0 800 1400" : "0 0 1600 1000";
  const width = "100%";
  const height = "100%";

  switch (category) {
    case "night":
      return (
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#030712" />
      <stop offset="50%" stop-color="#0b1329" />
      <stop offset="100%" stop-color="#142145" />
    </linearGradient>
    <linearGradient id="mountainNight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#09142e" />
      <stop offset="100%" stop-color="#0f234f" />
    </linearGradient>
  </defs>
  <!-- Night Sky -->
  <rect width="1600" height="1400" fill="url(#nightSky)" />

  <!-- Pixel Stars -->
  <g fill="#ffffff">
    <rect x="120" y="80" width="4" height="4" opacity="0.9" />
    <rect x="240" y="140" width="3" height="3" opacity="0.7" />
    <rect x="360" y="60" width="5" height="5" opacity="1" />
    <rect x="480" y="180" width="3" height="3" opacity="0.8" />
    <rect x="620" y="90" width="4" height="4" opacity="0.9" />
    <rect x="750" y="130" width="3" height="3" opacity="0.6" />
    <rect x="880" y="70" width="5" height="5" opacity="1" />
    <rect x="990" y="150" width="4" height="4" opacity="0.8" />
    <rect x="1120" y="85" width="3" height="3" opacity="0.9" />
    <rect x="1260" y="160" width="5" height="5" opacity="1" />
    <rect x="1380" y="100" width="4" height="4" opacity="0.7" />
    <rect x="1500" y="60" width="4" height="4" opacity="0.9" />
    <rect x="180" y="260" width="3" height="3" opacity="0.6" />
    <rect x="420" y="290" width="4" height="4" opacity="0.8" />
    <rect x="700" y="270" width="3" height="3" opacity="0.7" />
    <rect x="1050" y="240" width="4" height="4" opacity="0.9" />
    <rect x="1320" y="280" width="3" height="3" opacity="0.8" />
    <rect x="1450" y="220" width="4" height="4" opacity="0.7" />
  </g>

  <!-- Glowing Crescent Moon -->
  <g transform="translate(1250, 90)">
    <circle cx="50" cy="50" r="42" fill="#fef08a" opacity="0.95" />
    <circle cx="65" cy="42" r="38" fill="#060c1d" />
    <circle cx="50" cy="50" r="54" fill="#38bdf8" opacity="0.12" />
  </g>

  <!-- Distant Pixel Mountains -->
  <path d="M0,580 L250,380 L520,520 L820,320 L1150,490 L1420,360 L1600,480 L1600,1400 L0,1400 Z" fill="url(#mountainNight)" opacity="0.85" />

  <!-- Foreground Night Hills -->
  <ellipse cx="280" cy="780" rx="460" ry="190" fill="#061a38" />
  <ellipse cx="1380" cy="770" rx="480" ry="190" fill="#061a38" />
  <ellipse cx="800" cy="840" rx="720" ry="180" fill="#09244d" />
  <rect x="0" y="800" width="1600" height="600" fill="#061a38" />

  <!-- City Skyline with Lit Windows -->
  <g opacity="0.9">
    <rect x="1380" y="360" width="42" height="340" fill="#0b1736" stroke="#1d4ed8" stroke-width="1" />
    <rect x="1395" y="240" width="10" height="120" fill="#1e3a8a" />
    <rect x="1450" y="440" width="54" height="260" fill="#08122c" stroke="#1e40af" stroke-width="1" />
    <!-- Lit Windows -->
    <rect x="1386" y="400" width="6" height="8" fill="#fde047" />
    <rect x="1404" y="400" width="6" height="8" fill="#38bdf8" />
    <rect x="1386" y="430" width="6" height="8" fill="#38bdf8" />
    <rect x="1404" y="460" width="6" height="8" fill="#fde047" />
    <rect x="1386" y="490" width="6" height="8" fill="#fde047" />
    <rect x="1404" y="520" width="6" height="8" fill="#38bdf8" />
    <rect x="1460" y="470" width="8" height="8" fill="#fde047" />
    <rect x="1480" y="470" width="8" height="8" fill="#38bdf8" />
    <rect x="1460" y="510" width="8" height="8" fill="#38bdf8" />
    <rect x="1480" y="540" width="8" height="8" fill="#fde047" />
  </g>
</svg>
      `)
      );

    case "night_rainy":
      return (
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="nightRainSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="60%" stop-color="#09142b" />
      <stop offset="100%" stop-color="#0f2142" />
    </linearGradient>
  </defs>
  <rect width="1600" height="1400" fill="url(#nightRainSky)" />

  <!-- Heavy Storm Clouds -->
  <g fill="#111c38" opacity="0.95">
    <rect x="100" y="60" width="280" height="70" rx="10" />
    <rect x="140" y="30" width="180" height="60" rx="10" />
    <rect x="600" y="40" width="340" height="80" rx="10" />
    <rect x="660" y="20" width="220" height="70" rx="10" />
    <rect x="1100" y="70" width="380" height="80" rx="10" />
    <rect x="1180" y="35" width="240" height="70" rx="10" />
  </g>

  <!-- Distant Lightning Flash -->
  <path d="M720,80 L700,160 L730,170 L690,260" stroke="#38bdf8" stroke-width="3" fill="none" opacity="0.8" />

  <!-- Dark Rainy Hills -->
  <ellipse cx="280" cy="800" rx="480" ry="190" fill="#041226" />
  <ellipse cx="1380" cy="790" rx="500" ry="190" fill="#041226" />
  <ellipse cx="800" cy="850" rx="740" ry="180" fill="#071b38" />
  <rect x="0" y="820" width="1600" height="600" fill="#041226" />

  <!-- Diagonal Raindrop Streaks -->
  <g stroke="#60a5fa" stroke-width="2" opacity="0.65" stroke-linecap="round">
    <line x1="80" y1="120" x2="60" y2="180" />
    <line x1="200" y1="90" x2="180" y2="150" />
    <line x1="340" y1="150" x2="320" y2="210" />
    <line x1="480" y1="100" x2="460" y2="160" />
    <line x1="620" y1="180" x2="600" y2="240" />
    <line x1="760" y1="120" x2="740" y2="180" />
    <line x1="900" y1="160" x2="880" y2="220" />
    <line x1="1040" y1="90" x2="1020" y2="150" />
    <line x1="1180" y1="140" x2="1160" y2="200" />
    <line x1="1320" y1="110" x2="1300" y2="170" />
    <line x1="1460" y1="170" x2="1440" y2="230" />
    <line x1="140" y1="280" x2="120" y2="340" />
    <line x1="380" y1="320" x2="360" y2="380" />
    <line x1="680" y1="300" x2="660" y2="360" />
    <line x1="980" y1="290" x2="960" y2="350" />
    <line x1="1240" y1="330" x2="1220" y2="390" />
    <line x1="1500" y1="310" x2="1480" y2="370" />
  </g>
</svg>
      `)
      );

    case "rainy":
      return (
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="rainSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="60%" stop-color="#475569" />
      <stop offset="100%" stop-color="#64748b" />
    </linearGradient>
  </defs>
  <rect width="1600" height="1400" fill="url(#rainSky)" />

  <!-- Rain Clouds -->
  <g fill="#1e293b" opacity="0.85">
    <rect x="80" y="80" width="320" height="70" rx="10" />
    <rect x="140" y="50" width="200" height="60" rx="10" />
    <rect x="520" y="70" width="360" height="80" rx="10" />
    <rect x="590" y="40" width="220" height="60" rx="10" />
    <rect x="1020" y="80" width="380" height="80" rx="10" />
    <rect x="1100" y="50" width="240" height="60" rx="10" />
  </g>

  <!-- Misty Rainy Green Hills -->
  <ellipse cx="280" cy="780" rx="460" ry="190" fill="#14532d" />
  <ellipse cx="1380" cy="770" rx="480" ry="190" fill="#14532d" />
  <ellipse cx="800" cy="840" rx="720" ry="180" fill="#166534" />
  <rect x="0" y="800" width="1600" height="600" fill="#14532d" />

  <!-- City Skyline -->
  <g opacity="0.7">
    <rect x="1380" y="380" width="40" height="320" fill="#334155" />
    <rect x="1395" y="260" width="10" height="120" fill="#475569" />
    <rect x="1450" y="460" width="50" height="240" fill="#1e293b" />
  </g>

  <!-- Falling Rain Streaks -->
  <g stroke="#93c5fd" stroke-width="2" opacity="0.7" stroke-linecap="round">
    <line x1="120" y1="140" x2="100" y2="200" />
    <line x1="260" y1="120" x2="240" y2="180" />
    <line x1="420" y1="160" x2="400" y2="220" />
    <line x1="580" y1="130" x2="560" y2="190" />
    <line x1="740" y1="170" x2="720" y2="230" />
    <line x1="900" y1="140" x2="880" y2="200" />
    <line x1="1060" y1="180" x2="1040" y2="240" />
    <line x1="1220" y1="130" x2="1200" y2="190" />
    <line x1="1380" y1="160" x2="1360" y2="220" />
    <line x1="1520" y1="140" x2="1500" y2="200" />
    <line x1="200" y1="300" x2="180" y2="360" />
    <line x1="500" y1="320" x2="480" y2="380" />
    <line x1="820" y1="310" x2="800" y2="370" />
    <line x1="1140" y1="330" x2="1120" y2="390" />
    <line x1="1440" y1="300" x2="1420" y2="360" />
  </g>
</svg>
      `)
      );

    case "early_morning":
      return (
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="morningSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#311432" />
      <stop offset="40%" stop-color="#831843" />
      <stop offset="75%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
  </defs>
  <rect width="1600" height="1400" fill="url(#morningSky)" />

  <!-- Rising Dawn Sun -->
  <circle cx="800" cy="460" r="70" fill="#fef08a" opacity="0.9" />
  <circle cx="800" cy="460" r="100" fill="#fbbf24" opacity="0.3" />

  <!-- Soft Dawn Clouds -->
  <g fill="#f472b6" opacity="0.5">
    <rect x="200" y="160" width="220" height="35" rx="6" />
    <rect x="1100" y="200" width="260" height="40" rx="6" />
  </g>

  <!-- Golden Morning Hills -->
  <ellipse cx="280" cy="780" rx="460" ry="190" fill="#14532d" />
  <ellipse cx="1380" cy="770" rx="480" ry="190" fill="#14532d" />
  <ellipse cx="800" cy="840" rx="720" ry="180" fill="#15803d" />
  <rect x="0" y="800" width="1600" height="600" fill="#14532d" />

  <!-- City Skyline Silhouette -->
  <g opacity="0.75">
    <rect x="1380" y="340" width="40" height="360" fill="#4c1d95" />
    <rect x="1395" y="220" width="10" height="120" fill="#6d28d9" />
    <rect x="1450" y="440" width="50" height="260" fill="#3b0764" />
  </g>
</svg>
      `)
      );

    case "evening":
      return (
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="sunsetSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="35%" stop-color="#581c87" />
      <stop offset="70%" stop-color="#c2410c" />
      <stop offset="100%" stop-color="#fb923c" />
    </linearGradient>
  </defs>
  <rect width="1600" height="1400" fill="url(#sunsetSky)" />

  <!-- Setting Sunset Sun -->
  <circle cx="480" cy="480" r="75" fill="#fed7aa" opacity="0.95" />
  <circle cx="480" cy="480" r="110" fill="#fb923c" opacity="0.35" />

  <!-- Twilight Sunset Clouds -->
  <g fill="#c026d3" opacity="0.5">
    <rect x="160" y="200" width="260" height="40" rx="8" />
    <rect x="980" y="240" width="320" height="45" rx="8" />
  </g>

  <!-- Sunset Twilight Hills -->
  <ellipse cx="280" cy="780" rx="460" ry="190" fill="#0f3822" />
  <ellipse cx="1380" cy="770" rx="480" ry="190" fill="#0f3822" />
  <ellipse cx="800" cy="840" rx="720" ry="180" fill="#14532d" />
  <rect x="0" y="800" width="1600" height="600" fill="#0f3822" />

  <!-- Skyscraper Silhouette with Twilight Glow -->
  <g opacity="0.85">
    <rect x="1380" y="340" width="42" height="360" fill="#1e1b4b" />
    <rect x="1395" y="220" width="10" height="120" fill="#312e81" />
    <rect x="1450" y="440" width="52" height="260" fill="#0f172a" />
    <!-- Warm Lit Windows -->
    <rect x="1386" y="380" width="6" height="8" fill="#fde047" />
    <rect x="1404" y="420" width="6" height="8" fill="#fb923c" />
    <rect x="1462" y="480" width="8" height="8" fill="#fde047" />
  </g>
</svg>
      `)
      );

    case "snowfall":
      return (
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="snowSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="60%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>
  <rect width="1600" height="1400" fill="url(#snowSky)" />

  <!-- Snow-capped Hills -->
  <ellipse cx="280" cy="780" rx="460" ry="190" fill="#e2e8f0" />
  <ellipse cx="1380" cy="770" rx="480" ry="190" fill="#e2e8f0" />
  <ellipse cx="800" cy="840" rx="720" ry="180" fill="#f8fafc" />
  <rect x="0" y="800" width="1600" height="600" fill="#e2e8f0" />

  <!-- City in Snow -->
  <g opacity="0.8">
    <rect x="1380" y="360" width="40" height="340" fill="#334155" />
    <rect x="1395" y="240" width="10" height="120" fill="#64748b" />
    <rect x="1450" y="440" width="50" height="260" fill="#1e293b" />
    <!-- Snow on Roofs -->
    <rect x="1376" y="356" width="48" height="8" fill="#ffffff" />
    <rect x="1446" y="436" width="58" height="8" fill="#ffffff" />
  </g>

  <!-- Falling Pixel Snowflakes -->
  <g fill="#ffffff">
    <rect x="100" y="100" width="6" height="6" rx="1" />
    <rect x="220" y="180" width="5" height="5" rx="1" />
    <rect x="360" y="80" width="7" height="7" rx="1" />
    <rect x="500" y="220" width="6" height="6" rx="1" />
    <rect x="640" y="130" width="5" height="5" rx="1" />
    <rect x="780" y="260" width="7" height="7" rx="1" />
    <rect x="920" y="90" width="6" height="6" rx="1" />
    <rect x="1060" y="210" width="5" height="5" rx="1" />
    <rect x="1200" y="140" width="7" height="7" rx="1" />
    <rect x="1340" y="240" width="6" height="6" rx="1" />
    <rect x="1480" y="110" width="5" height="5" rx="1" />
    <rect x="160" y="380" width="6" height="6" rx="1" />
    <rect x="440" y="420" width="5" height="5" rx="1" />
    <rect x="720" y="460" width="7" height="7" rx="1" />
    <rect x="1000" y="410" width="6" height="6" rx="1" />
    <rect x="1280" y="450" width="5" height="5" rx="1" />
  </g>
</svg>
      `)
      );

    case "cloudy":
      return (
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="cloudySky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="50%" stop-color="#64748b" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
  </defs>
  <rect width="1600" height="1400" fill="url(#cloudySky)" />

  <!-- Multiple Heavy Pixel Clouds -->
  <g fill="#e2e8f0" opacity="0.85">
    <rect x="100" y="100" width="260" height="60" rx="10" />
    <rect x="150" y="65" width="160" height="55" rx="10" />
    <rect x="520" y="80" width="340" height="70" rx="10" />
    <rect x="590" y="45" width="200" height="60" rx="10" />
    <rect x="1040" y="110" width="380" height="75" rx="10" />
    <rect x="1120" y="70" width="220" height="65" rx="10" />
    <rect x="320" y="220" width="280" height="55" rx="8" opacity="0.6" />
    <rect x="860" y="240" width="300" height="55" rx="8" opacity="0.6" />
  </g>

  <!-- Green Hills -->
  <ellipse cx="280" cy="780" rx="460" ry="190" fill="#15803d" />
  <ellipse cx="1380" cy="770" rx="480" ry="190" fill="#15803d" />
  <ellipse cx="800" cy="840" rx="720" ry="180" fill="#16a34a" />
  <rect x="0" y="800" width="1600" height="600" fill="#15803d" />

  <!-- Skyscraper -->
  <g opacity="0.8">
    <rect x="1380" y="340" width="40" height="360" fill="#475569" />
    <rect x="1395" y="220" width="10" height="120" fill="#64748b" />
    <rect x="1450" y="440" width="50" height="260" fill="#334155" />
  </g>
</svg>
      `)
      );

    case "sunny":
    default:
      return (
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="sunnySky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a63c7" />
      <stop offset="60%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#60a5fa" />
    </linearGradient>
  </defs>
  <rect width="1600" height="1400" fill="url(#sunnySky)" />

  <!-- Bright Sunny Sun -->
  <circle cx="280" cy="200" r="50" fill="#fde047" />
  <circle cx="280" cy="200" r="75" fill="#fef08a" opacity="0.3" />

  <!-- Fluffy White Pixel Clouds -->
  <g fill="#ffffff" opacity="0.9">
    <rect x="1360" y="120" width="180" height="40" rx="6" />
    <rect x="1390" y="90" width="120" height="40" rx="6" />
    <rect x="620" y="160" width="200" height="45" rx="6" />
    <rect x="660" y="125" width="120" height="45" rx="6" />
  </g>

  <!-- Green Hills -->
  <ellipse cx="250" cy="740" rx="400" ry="160" fill="#15803d" />
  <ellipse cx="1350" cy="740" rx="420" ry="160" fill="#15803d" />
  <ellipse cx="800" cy="800" rx="650" ry="150" fill="#16a34a" />
  <rect x="0" y="760" width="1600" height="640" fill="#15803d" />

  <!-- Skyscraper -->
  <g fill="#93c5fd" opacity="0.85">
    <rect x="1410" y="320" width="36" height="340" fill="#e0f2fe" />
    <rect x="1424" y="200" width="8" height="120" fill="#ffffff" />
    <rect x="1470" y="420" width="48" height="240" fill="#cbd5e1" />
  </g>
</svg>
      `)
      );
  }
}

export const DEFAULT_PIXEL_WALLPAPER_DATA_URL = getBuiltinPixelWallpaper("sunny", "desktop");

/**
 * Resolves the exact active wallpaper:
 * 1. Admin uploaded exact weather + device (e.g. night_mobile)
 * 2. Admin uploaded exact weather + desktop (e.g. night_desktop)
 * 3. Built-in authentic pixel art wallpaper for that EXACT weather condition (e.g. night pixel art at night!)
 * 4. Fallback image configured in Admin
 */
export function resolveWallpaperUrl(
  category: WallpaperCategory,
  device: DeviceType,
  config?: WallpaperLibraryConfig
): {
  url: string;
  fileName?: string;
  source: "exact" | "device_fallback" | "sunny_fallback" | "default_fallback";
} {
  // If manual mode is active, override category and device
  let effCategory = category;
  let effDevice = device;
  if (config && !config.autoMode) {
    if (config.manualCategory) effCategory = config.manualCategory;
    if (config.manualDevice) effDevice = config.manualDevice;
  }

  const formatUrl = (url: string) => {
    if (!url) return url;
    if (url.includes("lh3.googleusercontent.com/d/")) {
      const match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `/api/drive-proxy/${match[1]}`;
      }
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    const driveFileRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match1 = url.match(driveFileRegex);
    if (match1 && match1[1]) {
      return `/api/drive-proxy/${match1[1]}`;
    }
    const driveIdRegex = /drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/;
    const match2 = url.match(driveIdRegex);
    if (match2 && match2[1]) {
      return `/api/drive-proxy/${match2[1]}`;
    }
    return url;
  };

  // 1. Check if Admin uploaded the exact weather + device
  const exactKey = `${effCategory}_${effDevice}`;
  if (config?.wallpapers?.[exactKey]?.url) {
    return {
      url: formatUrl(config.wallpapers[exactKey].url),
      fileName: config.wallpapers[exactKey].fileName,
      source: "exact"
    };
  }

  // 2. Check if Admin uploaded the same weather for Desktop
  const sameWeatherDesktopKey = `${effCategory}_desktop`;
  if (config?.wallpapers?.[sameWeatherDesktopKey]?.url) {
    return {
      url: formatUrl(config.wallpapers[sameWeatherDesktopKey].url),
      fileName: config.wallpapers[sameWeatherDesktopKey].fileName,
      source: "device_fallback"
    };
  }

  // 3. Check if Admin uploaded for any other device for this same weather
  for (const dev of ["tablet", "mobile", "desktop"] as DeviceType[]) {
    const catDevKey = `${effCategory}_${dev}`;
    if (config?.wallpapers?.[catDevKey]?.url) {
      return {
        url: formatUrl(config.wallpapers[catDevKey].url),
        fileName: config.wallpapers[catDevKey].fileName,
        source: "device_fallback"
      };
    }
  }

  // 4. Check custom fallback URL if configured
  if (config?.fallbackUrl) {
    return {
      url: formatUrl(config.fallbackUrl),
      fileName: config.fallbackFileName || "fallback-wallpaper.png",
      source: "default_fallback"
    };
  }

  // 5. Check if sunny_desktop is uploaded (primary default slot)
  if (config?.wallpapers?.["sunny_desktop"]?.url) {
    return {
      url: formatUrl(config.wallpapers["sunny_desktop"].url),
      fileName: config.wallpapers["sunny_desktop"].fileName,
      source: "sunny_fallback"
    };
  }

  // 6. Check if sunny for current device is uploaded
  if (config?.wallpapers?.[`sunny_${effDevice}`]?.url) {
    return {
      url: formatUrl(config.wallpapers[`sunny_${effDevice}`].url),
      fileName: config.wallpapers[`sunny_${effDevice}`].fileName,
      source: "sunny_fallback"
    };
  }

  // 7. Check if ANY custom wallpaper was uploaded in the entire library
  const allUploadedKeys = Object.keys(config?.wallpapers || {});
  if (allUploadedKeys.length > 0) {
    for (const key of allUploadedKeys) {
      if (config?.wallpapers?.[key]?.url) {
        return {
          url: formatUrl(config.wallpapers[key].url),
          fileName: config.wallpapers[key].fileName,
          source: "sunny_fallback"
        };
      }
    }
  }

  // 8. Authentic Dynamic Built-in Pixel Artwork for the ACTUAL category & device
  const builtinArtwork = getBuiltinPixelWallpaper(effCategory, effDevice);
  return {
    url: builtinArtwork,
    fileName: `builtin-${effCategory}-${effDevice}.svg`,
    source: "default_fallback"
  };
}

/**
 * Helper to parse time string (e.g. "2026-08-18T06:03" or "06:03") to total minutes of day (0..1439)
 */
export function parseTimeToMinutesOfDay(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return ((hours % 24) * 60) + (minutes % 60);
    }
  }
  return null;
}

/**
 * Determines weather state from Open-Meteo current API values according to priority logic
 */
export function determineWeatherState(
  weatherCode: number,
  isDay: boolean,
  rain: number,
  snowfall: number,
  cloudCover: number,
  sunriseIso: string,
  sunsetIso: string,
  _currentTimeStr?: string,
  timezone: string = "Asia/Kolkata"
): { category: WallpaperCategory; reason: string } {
  // 1. Calculate real local minute-of-day for the target timezone (e.g. Asia/Kolkata)
  let currentMinutes: number;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Asia/Kolkata",
      hour12: false,
      hour: "numeric",
      minute: "numeric"
    });
    const parts = formatter.format(new Date()).split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    currentMinutes = ((hours % 24) * 60) + (minutes % 60);
  } catch {
    const now = new Date();
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  // Sunrise (default 06:00 -> 360) and Sunset (default 18:30 -> 1110)
  const sunriseMinutes = parseTimeToMinutesOfDay(sunriseIso) ?? (6 * 60);
  const sunsetMinutes = parseTimeToMinutesOfDay(sunsetIso) ?? (18 * 60 + 30);

  const sunriseFormatted = `${String(Math.floor(sunriseMinutes / 60)).padStart(2, "0")}:${String(sunriseMinutes % 60).padStart(2, "0")}`;
  const sunsetFormatted = `${String(Math.floor(sunsetMinutes / 60)).padStart(2, "0")}:${String(sunsetMinutes % 60).padStart(2, "0")}`;

  // PRIORITY 1: Snow Precipitation (WMO codes 71, 73, 75, 77, 85, 86 or snowfall > 0.5)
  const isSnow = [71, 73, 75, 77, 85, 86].includes(weatherCode) || snowfall >= 0.5;
  if (isSnow) {
    return { category: "snowfall", reason: "Snowfall / Freezing precipitation detected" };
  }

  // PRIORITY 2: Genuine Rain & Showers Precipitation
  // WMO Rain Codes: 51-55 (Drizzle), 56-57 (Freezing Drizzle), 61-65 (Rain), 66-67 (Freezing Rain), 80-82 (Rain showers), 95-99 (Thunderstorm)
  const isHeavyRainCode =
    (weatherCode >= 61 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82) ||
    (weatherCode >= 95 && weatherCode <= 99);

  const isDrizzleCode = (weatherCode >= 51 && weatherCode <= 55) || (weatherCode >= 56 && weatherCode <= 57);

  // Micro trace drizzle (< 0.4mm) during bright daytime with low cloud cover (< 60%) should not trigger a full Rainy storm wallpaper
  const isTraceDrizzleInSunnySky = isDrizzleCode && rain < 0.4 && cloudCover < 60;

  const isClearCode = weatherCode === 0 || weatherCode === 1;
  const isRain = isHeavyRainCode || (isDrizzleCode && !isTraceDrizzleInSunnySky) || (!isClearCode && rain >= 0.5);

  // PRIORITY 3: Nighttime (Clear or Rainy)
  // Night window is when it is officially night (isDay === false) OR local time is after sunset window or before sunrise window
  const sunriseDawnStart = sunriseMinutes - 30; // e.g. 05:30 AM
  const sunriseDawnEnd = sunriseMinutes + 60;   // e.g. 07:00 AM
  const sunsetDuskStart = sunsetMinutes - 45;   // e.g. 05:45 PM
  const sunsetDuskEnd = sunsetMinutes + 45;     // e.g. 07:15 PM

  const isNightHours = !isDay || currentMinutes < sunriseDawnStart || currentMinutes > sunsetDuskEnd;

  if (isNightHours) {
    if (isRain) {
      return { category: "night_rainy", reason: `Nighttime Rain / Precipitation detected (${rain > 0 ? rain + "mm" : "Active rain"})` };
    }
    return { category: "night", reason: "Nighttime hours (Clear Moonlit Sky - No Rain)" };
  }

  // If daytime and genuine rain is occurring:
  if (isRain) {
    return { category: "rainy", reason: `Daytime Rain / Showers detected (${rain > 0 ? rain + "mm" : "Active rain"})` };
  }

  // PRIORITY 4: Early Morning Dawn Window (e.g. 5:30 AM to 7:00 AM)
  if (currentMinutes >= sunriseDawnStart && currentMinutes <= sunriseDawnEnd) {
    return { category: "early_morning", reason: `Active Sunrise Dawn Window (${sunriseFormatted} Sunrise)` };
  }

  // PRIORITY 5: Evening Dusk / Twilight Window (e.g. 5:45 PM to 7:15 PM)
  if (currentMinutes >= sunsetDuskStart && currentMinutes <= sunsetDuskEnd) {
    return { category: "evening", reason: `Active Sunset Twilight / Dusk Window (${sunsetFormatted} Sunset)` };
  }

  // PRIORITY 6: Cloudy (Overcast sky, dense cloud cover >= 75%, fog, or heavy cloud WMO)
  const isDenseCloud = [3, 45, 48].includes(weatherCode) || cloudCover >= 75;
  const isPartlyCloudDense = weatherCode === 2 && cloudCover >= 65;
  if (isDenseCloud || isPartlyCloudDense) {
    return { category: "cloudy", reason: `Cloudy / Overcast Sky (${cloudCover}% cloud cover)` };
  }

  // PRIORITY 7: Sunny (Default Clear Daytime Sky)
  return { category: "sunny", reason: `Clear Sunny Daytime Sky (${cloudCover}% cloud cover, high visibility)` };
}

/**
 * WMO Weather Code interpreter to human friendly text
 */
export function getWeatherConditionDescription(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 56 && code <= 57) return "Freezing Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing Rain";
  if (code >= 71 && code <= 77) return "Snow Fall";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Standard Sky";
}

/**
 * Dynamic Multi-Strategy Geolocation Detector
 * 1. HTML5 Browser Geolocation (GPS / High Accuracy Wifi)
 * 2. IP Geolocation via fast public APIs (Instant, zero permission prompt required)
 * 3. Server-side IP Geolocation fallback
 * 4. Fallback Default
 */
export interface DetectedLocationResult {
  lat: number;
  lon: number;
  city: string;
  source: "gps" | "ip" | "server" | "fallback";
}

let cachedUserLocation: DetectedLocationResult | null = null;
let lastLocationTimestamp = 0;

export async function detectUserCurrentLocation(
  fallbackLat: number = 10.7905,
  fallbackLon: number = 78.7047,
  fallbackCity: string = "Trichy, India"
): Promise<DetectedLocationResult> {
  const now = Date.now();
  // 10-minute in-memory cache for speed
  if (cachedUserLocation && now - lastLocationTimestamp < 10 * 60 * 1000) {
    return cachedUserLocation;
  }

  // Strategy 1: Browser HTML5 Geolocation (if granted or promptable)
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const gpsResult = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 3500,
          maximumAge: 300000,
          enableHighAccuracy: true
        });
      });

      if (gpsResult && gpsResult.coords) {
        const lat = Number(gpsResult.coords.latitude.toFixed(4));
        const lon = Number(gpsResult.coords.longitude.toFixed(4));

        let city = fallbackCity;
        try {
          const rev = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
            { signal: AbortSignal.timeout(2500) }
          );
          if (rev.ok) {
            const d = await rev.json();
            const cityName = d.city || d.locality || d.principalSubdivision;
            const country = d.countryName;
            if (cityName && country) {
              city = `${cityName}, ${country}`;
            } else if (cityName) {
              city = cityName;
            }
          }
        } catch {}

        const res: DetectedLocationResult = { lat, lon, city, source: "gps" };
        cachedUserLocation = res;
        lastLocationTimestamp = now;
        return res;
      }
    } catch {
      // Permission denied or timed out; proceed immediately to IP lookup
    }
  }

  // Strategy 2: Alternative IP Geolocation (ipwho.is)
  try {
    const whoRes = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(3000) });
    if (whoRes.ok) {
      const whoData = await whoRes.json();
      if (whoData.success && typeof whoData.latitude === "number" && typeof whoData.longitude === "number") {
        const cityName = whoData.city || whoData.region;
        const country = whoData.country;
        const city = cityName && country ? `${cityName}, ${country}` : (cityName || fallbackCity);
        const res: DetectedLocationResult = {
          lat: Number(whoData.latitude.toFixed(4)),
          lon: Number(whoData.longitude.toFixed(4)),
          city,
          source: "ip"
        };
        cachedUserLocation = res;
        lastLocationTimestamp = now;
        return res;
      }
    }
  } catch {}

  // Strategy 3: Fast IP Geolocation (ip-api.com) as backup
  try {
    const ipRes = await fetch("http://ip-api.com/json/", { signal: AbortSignal.timeout(3000) });
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.status === "success" && typeof ipData.lat === "number" && typeof ipData.lon === "number") {
        const cityName = ipData.city || ipData.regionName;
        const country = ipData.country;
        const city = cityName && country ? `${cityName}, ${country}` : (cityName || fallbackCity);
        const res: DetectedLocationResult = {
          lat: Number(ipData.lat.toFixed(4)),
          lon: Number(ipData.lon.toFixed(4)),
          city,
          source: "ip"
        };
        cachedUserLocation = res;
        lastLocationTimestamp = now;
        return res;
      }
    }
  } catch {}

  // Strategy 4: Server-Side Auto Geolocation Proxy
  try {
    const serverRes = await fetch("/api/weather/live?auto=true", { signal: AbortSignal.timeout(3000) });
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (serverData.success && typeof serverData.latitude === "number" && typeof serverData.longitude === "number") {
        const res: DetectedLocationResult = {
          lat: serverData.latitude,
          lon: serverData.longitude,
          city: serverData.locationName || fallbackCity,
          source: "server"
        };
        cachedUserLocation = res;
        lastLocationTimestamp = now;
        return res;
      }
    }
  } catch {}

  // Strategy 5: Default Fallback
  return {
    lat: fallbackLat,
    lon: fallbackLon,
    city: fallbackCity,
    source: "fallback"
  };
}

/**
 * Fetch real weather from Server Proxy / Open-Meteo & reverse geocode location name
 */
export async function fetchLiveWeather(
  lat?: number,
  lon?: number,
  fallbackCity?: string,
  libraryConfig?: WallpaperLibraryConfig,
  currentWidth: number = typeof window !== "undefined" ? window.innerWidth : 1440
): Promise<WeatherStatusInfo> {
  const device = getDeviceType(currentWidth);

  // If coordinates are not provided or default to 0/NaN, detect dynamically
  let effectiveLat = lat;
  let effectiveLon = lon;
  let effectiveCity = fallbackCity;

  if (
    effectiveLat === undefined ||
    effectiveLon === undefined ||
    isNaN(effectiveLat) ||
    isNaN(effectiveLon) ||
    (effectiveLat === 0 && effectiveLon === 0)
  ) {
    const detected = await detectUserCurrentLocation(
      libraryConfig?.fallbackLocation?.lat ?? 10.7905,
      libraryConfig?.fallbackLocation?.lon ?? 78.7047,
      libraryConfig?.fallbackLocation?.city || "Trichy, India"
    );
    effectiveLat = detected.lat;
    effectiveLon = detected.lon;
    effectiveCity = detected.city;
  }

  const finalLat = effectiveLat;
  const finalLon = effectiveLon;
  const initialCityName = effectiveCity || "Trichy, India";

  try {
    let current: any = {};
    let daily: any = {};
    let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    let locationName = initialCityName;

    // Strategy 1: Attempt Server-Side Weather Proxy (bypasses browser CORS & sandbox issues)
    let fetchedViaServer = false;
    try {
      const serverRes = await fetch(
        `/api/weather/live?lat=${finalLat}&lon=${finalLon}&city=${encodeURIComponent(initialCityName)}`
      );
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (serverData.success && serverData.current) {
          current = serverData.current;
          daily = serverData.daily || {};
          timezone = serverData.timezone || timezone;
          locationName = serverData.locationName || initialCityName;
          fetchedViaServer = true;
        }
      }
    } catch {
      // Server proxy not reachable, proceed to direct fallback
    }

    // Strategy 2: Direct Open-Meteo call if server proxy was not used
    if (!fetchedViaServer) {
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${finalLat}&longitude=${finalLon}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover&daily=sunrise,sunset&timezone=auto`;
        const res = await fetch(weatherUrl);
        if (res.ok) {
          const data = await res.json();
          current = data.current || {};
          daily = data.daily || {};
          timezone = data.timezone || timezone;
        }
      } catch {
        // Direct call offline / blocked
      }
    }

    // Determine current hour & solar cycle if API returned data or default
    const now = new Date();
    const temp = typeof current.temperature_2m === "number" ? Math.round(current.temperature_2m) : 28;
    const weatherCode = Number(current.weather_code ?? 0);
    
    // Check if isDay was provided by API or calculate based on local time
    let isDay = true;
    if (typeof current.is_day === "number" || typeof current.is_day === "boolean") {
      isDay = Boolean(current.is_day);
    } else {
      const localHour = now.getHours();
      isDay = localHour >= 6 && localHour < 18;
    }

    const rain = Number(current.rain ?? 0) + Number(current.showers ?? 0) + Number(current.precipitation ?? 0);
    const snowfall = Number(current.snowfall ?? 0);
    const cloudCover = Number(current.cloud_cover ?? 10);
    const sunrise = daily.sunrise?.[0] || "";
    const sunset = daily.sunset?.[0] || "";

    // Format local time string
    let localTimeStr = "";
    try {
      localTimeStr = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }).format(now);
    } catch {
      localTimeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Determine category based on weather + sun times with timezone precision
    const { category, reason } = determineWeatherState(
      weatherCode,
      isDay,
      rain,
      snowfall,
      cloudCover,
      sunrise,
      sunset,
      current.time,
      timezone
    );

    // Check if manual mode override is active in Admin config
    let finalCategory = category;
    let finalDevice = device;
    if (libraryConfig && !libraryConfig.autoMode) {
      if (libraryConfig.manualCategory) finalCategory = libraryConfig.manualCategory;
      if (libraryConfig.manualDevice) finalDevice = libraryConfig.manualDevice;
    }

    const { url: activeAssetUrl, fileName: activeAssetFileName, source } = resolveWallpaperUrl(
      finalCategory,
      finalDevice,
      libraryConfig
    );

    return {
      locationName,
      latitude: finalLat,
      longitude: finalLon,
      temperature: temp,
      conditionText: getWeatherConditionDescription(weatherCode),
      weatherCode,
      isDay,
      cloudCover,
      rain,
      snowfall,
      sunrise,
      sunset,
      localTimeStr,
      timezone,
      matchedCategory: finalCategory,
      matchedReason: reason,
      deviceType: finalDevice,
      activeAssetUrl,
      activeAssetFileName,
      activeAssetSource: source,
      lastRefreshed: new Date().toISOString(),
      loading: false,
      error: null
    };
  } catch (err: any) {
    console.warn("Live weather service running in safe fallback mode:", err?.message || err);
    // Fallback safe status
    const { url: activeAssetUrl, fileName: activeAssetFileName, source } = resolveWallpaperUrl(
      "sunny",
      device,
      libraryConfig
    );

    return {
      locationName: initialCityName,
      latitude: finalLat,
      longitude: finalLon,
      temperature: 28,
      conditionText: "Sunny / Clear",
      weatherCode: 0,
      isDay: true,
      cloudCover: 0,
      rain: 0,
      snowfall: 0,
      sunrise: "",
      sunset: "",
      localTimeStr: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      matchedCategory: "sunny",
      matchedReason: "Default / Fallback Mode (Weather Fetch Offline)",
      deviceType: device,
      activeAssetUrl,
      activeAssetFileName,
      activeAssetSource: source,
      lastRefreshed: new Date().toISOString(),
      loading: false,
      error: null
    };
  }
}
