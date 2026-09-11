import React, { useState, useRef, useEffect } from "react";

// Utility to parse YouTube, Vimeo, Google Drive, and Figma URLs
export function getEmbedSource(input: string): { type: "youtube" | "vimeo" | "figma" | "gdrive" | "iframe" | "direct" | "raw"; src: string } {
  if (!input) return { type: "direct", src: "" };
  const trimmed = input.trim();

  // If user pasted a full <iframe> tag, extract src or return raw iframe
  if (trimmed.startsWith("<iframe") || trimmed.includes("<iframe")) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return { type: "iframe", src: srcMatch[1] };
    }
    return { type: "raw", src: trimmed };
  }

  // YouTube match
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return { type: "youtube", src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0` };
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return { type: "vimeo", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // Google Drive Video / File match
  const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    return { type: "gdrive", src: `https://drive.google.com/file/d/${gdriveMatch[1]}/preview` };
  }

  // Figma Prototype or Design URL match
  if (trimmed.includes("figma.com/")) {
    const encoded = encodeURIComponent(trimmed);
    return { type: "figma", src: `https://www.figma.com/embed?embed_host=share&url=${encoded}` };
  }

  // Direct video or iframe url
  return { type: "direct", src: trimmed };
}

// -------------------------------------------------------------
// RETRO-MODERN VIDEO PLAYER
// -------------------------------------------------------------
interface RetroVideoPlayerProps {
  url: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  showScanlines?: boolean;
}

export const RetroVideoPlayer: React.FC<RetroVideoPlayerProps> = ({
  url,
  poster,
  title,
  autoPlay = false,
  loop = false,
  className = "",
  showScanlines = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const embedInfo = getEmbedSource(url);
  const isEmbedVideo = ["youtube", "vimeo", "gdrive", "iframe"].includes(embedInfo.type);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
    setIsPlaying(false);
  }, [url]);

  // Fullscreen change listener & ESC listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const hasFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      if (!hasFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        const doc = document as any;
        const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
          try { efs?.call(doc); } catch {}
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Lock body scroll & notify window when in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add("media-fullscreen-active");
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("media-fullscreen-change", { detail: { isFullscreen: true } }));
      return () => {
        document.body.classList.remove("media-fullscreen-active");
        document.body.style.overflow = originalOverflow;
        window.dispatchEvent(new CustomEvent("media-fullscreen-change", { detail: { isFullscreen: false } }));
      };
    } else {
      document.body.classList.remove("media-fullscreen-active");
      window.dispatchEvent(new CustomEvent("media-fullscreen-change", { detail: { isFullscreen: false } }));
    }
  }, [isFullscreen]);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const cycleSpeed = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current as any;
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (el) {
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (typeof rfs === "function") {
          try { rfs.call(el); } catch {}
        }
      }
    } else {
      setIsFullscreen(false);
      const doc = document as any;
      const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
        try { efs?.call(doc); } catch {}
      }
    }
  };

  if (!url) {
    return (
      <div className={`aspect-video bg-[#050e1f] border-2 border-dashed border-[#1e40af] rounded flex flex-col items-center justify-center p-6 text-center text-white/50 ${className}`}>
        <span className="text-3xl mb-2">🎬</span>
        <p className="text-xs font-pixel">No video source provided.</p>
      </div>
    );
  }

  // IFRAME / YOUTUBE / VIMEO / DRIVE EMBED
  if (isEmbedVideo || embedInfo.type === "raw") {
    return (
      <div
        ref={containerRef}
        className={
          isFullscreen
            ? "fixed inset-0 z-[999999] w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 shadow-none bg-black flex flex-col overflow-hidden"
            : `relative aspect-video bg-[#030914] border-2 border-[#1e40af] rounded-md overflow-hidden shadow-2xl group flex flex-col ${className}`
        }
      >
        {/* Top Mini Title Bar */}
        <div className="bg-[#0b1739] px-3 sm:px-4 py-2 border-b border-[#1e3a8a] flex items-center justify-between z-10 select-none flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-bold font-pixel text-[#38bdf8] uppercase truncate">
              {title || `${embedInfo.type.toUpperCase()} EMBED PLAYER`}
            </span>
            {isFullscreen && (
              <span className="hidden sm:inline-flex text-[10px] bg-[#1e40af]/60 text-[#38bdf8] px-2 py-0.5 rounded border border-[#38bdf8]/40">
                FULLSCREEN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70 font-mono shrink-0">
            <span className="hidden sm:inline text-[11px] text-white/50">HD VIDEO</span>
            <button
              onClick={toggleFullscreen}
              className={
                isFullscreen
                  ? "bg-[#e11d48] hover:bg-[#f43f5e] active:bg-[#be123c] border border-[#fda4af] text-white px-3 py-1 sm:py-1.5 rounded text-xs font-bold font-pixel cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                  : "bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] text-white px-2.5 py-1 rounded text-xs font-bold font-pixel cursor-pointer transition-colors flex items-center gap-1"
              }
              title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen"}
            >
              <span>{isFullscreen ? "🗗" : "⛶"}</span>
              <span>{isFullscreen ? "EXIT FULLSCREEN" : "EXPAND"}</span>
              {isFullscreen && <span className="hidden md:inline text-[10px] opacity-75">(ESC)</span>}
            </button>
          </div>
        </div>

        {/* Iframe Viewport */}
        <div className="relative flex-1 w-full h-full min-h-0 bg-black flex items-center justify-center overflow-hidden">
          {embedInfo.type === "raw" ? (
            <div
              className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0 [&>iframe]:!aspect-auto flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: embedInfo.src }}
            />
          ) : (
            <iframe
              src={embedInfo.src}
              title={title || "Video Player"}
              className="w-full h-full border-0 block"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </div>
    );
  }

  // DIRECT HTML5 VIDEO (MP4, WebM, Blob, Data URL)
  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
      className={
        isFullscreen
          ? "fixed inset-0 z-[999999] w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 shadow-none bg-black flex flex-col select-none group overflow-hidden"
          : `relative aspect-video bg-[#030914] border-2 border-[#1e40af] hover:border-[#38bdf8] rounded-md overflow-hidden shadow-2xl select-none group flex flex-col transition-colors ${className}`
      }
    >
      {/* Top Retro Info Header */}
      <div className="bg-gradient-to-r from-[#0c1e45] via-[#12285a] to-[#0c1e45] px-3 sm:px-4 py-2 border-b border-[#1e3a8a] flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-bold font-pixel text-[#38bdf8] uppercase truncate">
            {title || "CINEMATIC VIDEO PLAYER"}
          </span>
          {isFullscreen && (
            <span className="hidden sm:inline-flex text-[10px] bg-[#1e40af]/60 text-[#38bdf8] px-2 py-0.5 rounded border border-[#38bdf8]/40">
              FULLSCREEN
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs font-pixel text-white/70 shrink-0">
          <span className="bg-[#071329] px-2 py-0.5 rounded border border-[#1e3a8a] text-amber-400 text-[11px]">
            {playbackRate}x
          </span>
          {isFullscreen ? (
            <button
              onClick={toggleFullscreen}
              className="bg-[#e11d48] hover:bg-[#f43f5e] active:bg-[#be123c] border border-[#fda4af] text-white px-3 py-1 rounded text-xs font-bold font-pixel cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              title="Exit Fullscreen (ESC)"
            >
              <span>🗗</span>
              <span>EXIT</span>
              <span className="hidden md:inline text-[10px] opacity-75">(ESC)</span>
            </button>
          ) : (
            <span className="hidden sm:inline text-white/50 text-[11px]">8-BIT AV ENGINE</span>
          )}
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={url}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          playsInline
          onClick={togglePlay}
          onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              setIsLoaded(true);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setHasError(true)}
          className="w-full h-full max-w-full max-h-full object-contain cursor-pointer"
        />

        {/* Big Central Play Button Overlay when paused */}
        {!isPlaying && !hasError && (
          <button
            onClick={togglePlay}
            aria-label="Play video"
            className="absolute z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1d4ed8]/90 hover:bg-[#2563eb] text-white border-2 border-[#60a5fa] shadow-[0_0_20px_rgba(56,189,248,0.6)] flex items-center justify-center pl-1 transform transition-transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs"
          >
            <div className="w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[16px] border-l-white" />
          </button>
        )}

        {/* Error Fallback */}
        {hasError && (
          <div className="absolute inset-0 bg-[#071329]/95 flex flex-col items-center justify-center p-4 text-center space-y-2 z-20">
            <span className="text-3xl">⚠️</span>
            <p className="text-xs font-pixel text-rose-400">Video source could not be played directly.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1d4ed8] border border-[#60a5fa] text-white px-3 py-1.5 rounded text-[11px] font-pixel hover:bg-[#2563eb]"
            >
              Open Video in New Tab ↗
            </a>
          </div>
        )}

        {/* Optional Retro Scanline overlay */}
        {showScanlines && (
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.5) 50%)",
              backgroundSize: "100% 4px",
            }}
          />
        )}
      </div>

      {/* Video Control Bar */}
      <div
        className={`bg-[#081530]/95 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 border-t border-[#1e3a8a] flex flex-col gap-1.5 transition-opacity duration-200 z-20 flex-shrink-0 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Scrubber */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#0f2854] rounded-lg appearance-none cursor-pointer accent-[#38bdf8] focus:outline-none"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-xs text-white font-pixel">
          {/* Left Buttons: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:text-[#38bdf8] transition-colors cursor-pointer text-sm sm:text-base active:scale-95"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 hover:text-[#38bdf8] transition-colors cursor-pointer text-sm sm:text-base active:scale-95"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? "🔇" : "🔊"}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-14 sm:w-20 h-1 bg-[#0f2854] rounded-lg appearance-none cursor-pointer accent-[#38bdf8] hidden sm:inline-block"
            />

            <span className="text-[11px] text-white/80 font-mono tracking-tight ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Buttons: Speed, Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              onClick={cycleSpeed}
              className="bg-[#0f2854] hover:bg-[#1e40af] border border-[#1e3a8a] text-[10px] px-2 py-1 rounded text-[#38bdf8] font-bold cursor-pointer transition-colors"
              title="Change Speed"
            >
              {playbackRate}x
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:text-[#38bdf8] text-sm sm:text-base cursor-pointer transition-colors"
              title={isFullscreen ? "Exit Fullscreen (ESC)" : "Fullscreen"}
            >
              {isFullscreen ? "🗗" : "⛶"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// INTERACTIVE EMBED VIEWER (FIGMA, CODEPEN, SPLINE, IFRAME)
// -------------------------------------------------------------
interface ProjectEmbedViewerProps {
  embedCode: string;
  title?: string;
  projectUrl?: string;
  className?: string;
}

export const ProjectEmbedViewer: React.FC<ProjectEmbedViewerProps> = ({
  embedCode,
  title,
  projectUrl,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const embedInfo = getEmbedSource(embedCode);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const hasFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      if (!hasFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        const doc = document as any;
        const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
          try { efs?.call(doc); } catch {}
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Lock body scroll & notify window when in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add("media-fullscreen-active");
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("media-fullscreen-change", { detail: { isFullscreen: true } }));
      return () => {
        document.body.classList.remove("media-fullscreen-active");
        document.body.style.overflow = originalOverflow;
        window.dispatchEvent(new CustomEvent("media-fullscreen-change", { detail: { isFullscreen: false } }));
      };
    } else {
      document.body.classList.remove("media-fullscreen-active");
      window.dispatchEvent(new CustomEvent("media-fullscreen-change", { detail: { isFullscreen: false } }));
    }
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    const el = containerRef.current as any;
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (el) {
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (typeof rfs === "function") {
          try { rfs.call(el); } catch {}
        }
      }
    } else {
      setIsFullscreen(false);
      const doc = document as any;
      const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
        try { efs?.call(doc); } catch {}
      }
    }
  };

  const reloadEmbed = () => {
    setReloadKey((prev) => prev + 1);
  };

  if (!embedCode) return null;

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-[999999] w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 shadow-none bg-black flex flex-col overflow-hidden"
          : `relative w-full bg-[#071329] border-2 border-[#1e40af] rounded-md overflow-hidden shadow-2xl flex flex-col ${className}`
      }
    >
      {/* Top Interactive Browser/Prototype Bar */}
      <div className="bg-[#0b1b3d] px-3 sm:px-4 py-2 border-b border-[#1e3a8a] flex items-center justify-between gap-2 flex-shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
          </div>
          <span className="text-xs sm:text-sm font-bold font-pixel text-[#38bdf8] uppercase truncate ml-1">
            {title ? title : "Interactive Prototype"}
          </span>
          {isFullscreen && (
            <span className="hidden sm:inline-flex text-[10px] bg-[#1e40af]/60 text-[#38bdf8] px-2 py-0.5 rounded border border-[#38bdf8]/40 shrink-0">
              FULLSCREEN
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 font-pixel text-xs shrink-0">
          <button
            onClick={reloadEmbed}
            className="bg-[#0e214d] hover:bg-[#1d4ed8] active:bg-[#1e40af] border border-[#1e40af] text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[11px] cursor-pointer transition-colors flex items-center gap-1"
            title="Reload Embed Frame"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Reload</span>
          </button>

          {projectUrl && (
            <a
              href={projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0e214d] hover:bg-[#1d4ed8] border border-[#1e40af] text-[#38bdf8] hover:text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[11px] transition-colors flex items-center gap-1"
            >
              <span>↗</span>
              <span className="hidden sm:inline">Full Site</span>
            </a>
          )}

          <button
            onClick={toggleFullscreen}
            className={
              isFullscreen
                ? "bg-[#e11d48] hover:bg-[#f43f5e] active:bg-[#be123c] border border-[#fda4af] text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded text-xs font-bold cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                : "bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#60a5fa] text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded text-[11px] sm:text-xs font-bold cursor-pointer shadow-xs transition-colors flex items-center gap-1"
            }
            title={isFullscreen ? "Exit Fullscreen (ESC)" : "Fullscreen Prototype"}
          >
            <span>{isFullscreen ? "🗗" : "⛶"}</span>
            <span>{isFullscreen ? "EXIT FULLSCREEN" : "EXPAND"}</span>
            {isFullscreen && <span className="hidden md:inline text-[10px] opacity-75 font-mono">(ESC)</span>}
          </button>
        </div>
      </div>

      {/* Frame Body - Fully expands in fullscreen to take remaining height on Desktop, Tablet & Mobile */}
      <div
        className={
          isFullscreen
            ? "relative flex-1 w-full h-full min-h-0 bg-black flex items-center justify-center overflow-hidden"
            : "relative w-full h-[280px] sm:h-[420px] md:h-[520px] lg:h-[580px] bg-[#020617] overflow-hidden"
        }
      >
        {embedInfo.type === "raw" ? (
          <div
            key={reloadKey}
            className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0 [&>iframe]:!aspect-auto flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: embedInfo.src }}
          />
        ) : (
          <iframe
            key={reloadKey}
            src={embedInfo.src}
            title={title || "Embedded Frame"}
            className="w-full h-full border-0 block"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
};
