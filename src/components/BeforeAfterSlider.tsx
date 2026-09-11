import React, { useState, useRef, useCallback, useEffect } from "react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  title?: string;
  description?: string;
  initialPosition?: number; // 0 to 100 percentage, default 50
  aspectRatio?: string; // e.g. "aspect-[16/10]" or "aspect-[4/3]"
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = "BEFORE (ORIGINAL)",
  afterLabel = "AFTER (REDESIGN)",
  title,
  description,
  initialPosition = 50,
  aspectRatio = "aspect-[16/10] sm:aspect-[16/9]",
  className = "",
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(initialPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState({ before: false, after: false });

  // Update slider position based on clientX
  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      if (e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
    },
    [updatePosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      updatePosition(e.touches[0].clientX);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, updatePosition]);

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === "ArrowRight") {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  };

  if (!beforeImage && !afterImage) {
    return null;
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Title & Description if provided */}
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-xs sm:text-sm font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span>
              <span>{title}</span>
            </h3>
          )}
          {description && (
            <p className="text-white/70 text-xs leading-relaxed">{description}</p>
          )}
        </div>
      )}

      {/* Main Interactive Comparison Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Before and After Redesign Comparison Slider"
        className={`relative w-full ${aspectRatio} min-h-[280px] sm:min-h-[420px] max-h-[640px] bg-[#030b1a] rounded-sm border-2 border-[#1e40af] overflow-hidden select-none cursor-ew-resize group focus:outline-none focus:ring-2 focus:ring-[#38bdf8] shadow-lg`}
      >
        {/* AFTER IMAGE (Base Layer / Right Side) */}
        <div className="absolute inset-0 w-full h-full">
          {afterImage ? (
            <img
              src={afterImage}
              alt={afterLabel}
              onLoad={() => setIsImageLoaded((prev) => ({ ...prev, after: true }))}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover sm:object-contain object-center transition-opacity duration-300 pointer-events-none"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/40 p-4">
              <span className="text-3xl mb-2">✨</span>
              <span className="text-xs">No After (Redesign) Image Loaded</span>
            </div>
          )}

          {/* After Label Badge (Top Right) */}
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/50 px-2.5 py-1 rounded text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{afterLabel}</span>
            </span>
          </div>
        </div>

        {/* BEFORE IMAGE (Clipped Layer / Left Side) */}
        <div
          className="absolute inset-0 h-full overflow-hidden pointer-events-none will-change-[width]"
          style={{ width: `${sliderPosition}%` }}
        >
          {/* Inner image has the full width of the container so it doesn't squish */}
          <div
            className="absolute inset-0 h-full"
            style={{
              width: containerRef.current
                ? `${containerRef.current.clientWidth}px`
                : "100%",
            }}
          >
            {beforeImage ? (
              <img
                src={beforeImage}
                alt={beforeLabel}
                onLoad={() => setIsImageLoaded((prev) => ({ ...prev, before: true }))}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover sm:object-contain object-center transition-opacity duration-300 pointer-events-none"
                style={{ imageRendering: "auto" }}
              />
            ) : (
              <div className="w-full h-full bg-[#0a152d] flex flex-col items-center justify-center text-white/40 p-4">
                <span className="text-3xl mb-2">📜</span>
                <span className="text-xs">No Before Image Loaded</span>
              </div>
            )}
          </div>

          {/* Before Label Badge (Top Left) */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 bg-black/80 backdrop-blur-md text-rose-300 border border-rose-500/50 px-2.5 py-1 rounded text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>{beforeLabel}</span>
            </span>
          </div>
        </div>

        {/* DIVIDER LINE (Vertical Bar) */}
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none will-change-[left]"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Glowing Vertical Line */}
          <div className="absolute inset-y-0 -translate-x-1/2 w-0.5 sm:w-1 bg-[#10b981] shadow-[0_0_12px_#10b981]" />

          {/* Circular Slider Handle (With < > Arrows matching the user's video) */}
          <div
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#047857] hover:bg-[#059669] border-2 border-white text-white flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.8),0_0_8px_#10b981] transition-transform duration-150 cursor-ew-resize ${
              isDragging ? "scale-110 ring-4 ring-[#10b981]/40" : "group-hover:scale-105"
            }`}
          >
            {/* Left-Right Double Arrows SVG */}
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 fill-white"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8.5 7L3.5 12L8.5 17V13H15.5V17L20.5 12L15.5 7V11H8.5V7Z" />
            </svg>
          </div>
        </div>

        {/* Instruction overlay pill at bottom */}
        <div className="absolute bottom-2.5 inset-x-0 flex justify-center z-10 pointer-events-none">
          <div className="bg-black/75 backdrop-blur-sm border border-white/20 text-white/90 px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono flex items-center gap-1.5 shadow-md">
            <span>↔</span>
            <span>Drag slider to compare Before &amp; After</span>
          </div>
        </div>
      </div>

      {/* Preset jump buttons: 0% (Before), 50% (Split), 100% (After) */}
      <div className="flex items-center justify-between text-xs text-white/60 pt-0.5 px-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSliderPosition(100);
          }}
          className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
            sliderPosition >= 95
              ? "bg-rose-950/80 border-rose-500 text-rose-300"
              : "bg-[#0b1b3a] border-[#1e3a8a] hover:text-white"
          }`}
        >
          ◀ View Full Before
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSliderPosition(50);
          }}
          className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#0b1b3a] hover:bg-[#152e61] border border-[#1e3a8a] text-[#38bdf8] transition-colors cursor-pointer"
        >
          Reset 50/50 Split
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSliderPosition(0);
          }}
          className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
            sliderPosition <= 5
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
              : "bg-[#0b1b3a] border-[#1e3a8a] hover:text-white"
          }`}
        >
          View Full After ▶
        </button>
      </div>
    </div>
  );
};
