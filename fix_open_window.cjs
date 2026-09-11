const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldCode = `  // Multi-window opening: Does NOT close any existing open windows!
  const handleOpenWindow = (id: WindowId, project?: Project, category?: string) => {
    setIsStartMenuOpen(false);
    setIsSearchOpen(false);
    setIsTrayOpen(false);

    if (category) {
      setSelectedCategory(category);
    }

    setOpenWindows((prev) => {
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex || 10), 10);
      const nextZ = maxZ + 1;
      const existingIndex = prev.findIndex((w) => w.id === id);

      if (existingIndex >= 0) {
        // Window is already open: bring to top, unminimize, and update project/category if provided
        return prev.map((w, idx) =>
          idx === existingIndex
            ? {
                ...w,
                zIndex: nextZ,
                isMinimized: false,
                ...(project ? { project } : {}),
                ...(category ? { category } : {}),
              }
            : w
        );
      } else {
        // Open new window without closing any other windows!
        return [
          ...prev,
          {
            id,
            project,
            category,
            zIndex: nextZ,
            isMinimized: false,
          },
        ];
      }
    });
  };`;

const newCode = `  // Multi-window opening: Does NOT close any existing open windows!
  const handleOpenWindow = (id: WindowId, project?: Project, category?: string) => {
    setIsStartMenuOpen(false);
    setIsSearchOpen(false);
    setIsTrayOpen(false);

    if (category) {
      setSelectedCategory(category);
    }

    setOpenWindows((prev) => {
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex || 10), 10);
      const nextZ = maxZ + 5;
      const existingIndex = prev.findIndex((w) => w.id === id);

      if (existingIndex >= 0) {
        // Window is already open: bring to top, unminimize, and update project/category if provided
        return prev.map((w, idx) =>
          idx === existingIndex
            ? {
                ...w,
                zIndex: nextZ,
                isMinimized: false,
                ...(project ? { project } : {}),
                ...(category ? { category } : {}),
              }
            : w
        );
      } else {
        // Open new window on top of everything!
        return [
          ...prev,
          {
            id,
            project,
            category,
            zIndex: nextZ,
            isMinimized: false,
          },
        ];
      }
    });
  };`;

code = code.replace(oldCode, newCode);

// Also fix handleFocusWindow to increment cleanly
const oldFocus = `  // Focus specific window (bring to top)
  const handleFocusWindow = (id: WindowId) => {
    setOpenWindows((prev) => {
      const target = prev.find((w) => w.id === id);
      if (!target) return prev;
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex || 10), 10);
      if (target.zIndex === maxZ) return prev; // Already on top
      return prev.map((w) =>
        w.id === id ? { ...w, zIndex: maxZ + 1 } : w
      );
    });
  };`;

const newFocus = `  // Focus specific window (bring to top)
  const handleFocusWindow = (id: WindowId) => {
    setOpenWindows((prev) => {
      const target = prev.find((w) => w.id === id);
      if (!target) return prev;
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex || 10), 10);
      if (target.zIndex >= maxZ && prev.filter(w => w.zIndex === maxZ).length === 1) return prev; // Already strictly on top
      return prev.map((w) =>
        w.id === id ? { ...w, zIndex: maxZ + 2 } : w
      );
    });
  };`;

code = code.replace(oldFocus, newFocus);
fs.writeFileSync('src/App.tsx', code, 'utf8');
