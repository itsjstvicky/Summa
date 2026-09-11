import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  initAuth,
  googleSignIn,
  listDriveFiles,
  uploadFileToDrive,
  getOrCreateAppFolder,
  getDirectDriveMediaUrl,
  makeFilePublicReadable,
  DriveFileItem,
  DriveStorageQuota,
  getDriveStorageQuota,
  User
} from "../../services/googleDriveService";
import {
  Cloud,
  Search,
  Folder,
  ArrowLeft,
  Image as ImageIcon,
  Film,
  FileText,
  Check,
  Upload,
  RefreshCw,
  X,
  ExternalLink,
  Filter,
  CheckCircle2,
  HardDrive
} from "lucide-react";

export interface SelectedDriveMedia {
  url: string;
  fileName: string;
  fileSize?: string;
  fileId: string;
  mimeType: string;
}

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: SelectedDriveMedia) => void;
  title?: string;
  targetSlotLabel?: string;
  allowedTypes?: "all" | "images" | "videos" | "images_and_videos" | "documents";
  onNotification?: (msg: string, type?: "success" | "error") => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = "Select Media from Google Drive",
  targetSlotLabel,
  allowedTypes = "images_and_videos",
  onNotification
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<DriveStorageQuota | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "images" | "videos">("all");

  // Navigation / Folder Hierarchy
  const [currentFolder, setCurrentFolder] = useState<DriveFileItem | null>(null);
  const [folderHistory, setFolderHistory] = useState<DriveFileItem[]>([]);

  // Selection & Preview state
  const [selectedFile, setSelectedFile] = useState<DriveFileItem | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // In-modal quick upload state
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to Auth State
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        loadFolderFiles(currentFolder?.id);
        loadQuota();
      },
      () => {
        setUser(null);
        setFiles([]);
      }
    );

    return () => unsubscribe();
  }, [isOpen, currentFolder?.id]);

  const loadQuota = async () => {
    try {
      const q = await getDriveStorageQuota();
      setQuota(q);
    } catch {
      // Ignore quota fetch error
    }
  };

  // Load files in current folder
  const loadFolderFiles = async (folderId?: string, query?: string) => {
    setLoadingFiles(true);
    try {
      const items = await listDriveFiles(folderId, query);
      setFiles(items);
    } catch (err: any) {
      if (
        err?.isAuthExpired ||
        err?.message?.includes("expired") ||
        err?.message?.includes("credentials") ||
        err?.message?.includes("UNAUTHENTICATED") ||
        err?.message?.includes("not connected")
      ) {
        // Reset auth state in modal so user sees the sign-in button
        setUser(null);
        setFiles([]);
      } else {
        console.warn("Could not list Google Drive files:", err);
        if (onNotification) {
          onNotification(err.message || "Failed to load Google Drive files", "error");
        }
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  // Handle Google Sign-in
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        if (onNotification) onNotification("Google Drive Connected!", "success");
        loadFolderFiles();
        loadQuota();
      }
    } catch (err: any) {
      if (onNotification) onNotification(err.message || "Sign-in failed", "error");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Navigate into a folder
  const handleOpenFolder = (folder: DriveFileItem) => {
    setFolderHistory((prev) => [...prev, folder]);
    setCurrentFolder(folder);
    setSelectedFile(null);
    loadFolderFiles(folder.id, searchQuery);
  };

  // Navigate back up
  const handleNavigateUp = () => {
    const newHistory = [...folderHistory];
    newHistory.pop(); // Remove current folder
    const parentFolder = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
    setFolderHistory(newHistory);
    setCurrentFolder(parentFolder);
    setSelectedFile(null);
    loadFolderFiles(parentFolder?.id, searchQuery);
  };

  // Navigate to Root
  const handleNavigateRoot = () => {
    setFolderHistory([]);
    setCurrentFolder(null);
    setSelectedFile(null);
    loadFolderFiles(undefined, searchQuery);
  };

  // Search files
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFolderFiles(currentFolder?.id, searchQuery);
  };

  // Format file size
  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return "";
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Determine media type
  const isImage = (item: DriveFileItem) => item.mimeType?.startsWith("image/");
  const isVideo = (item: DriveFileItem) => item.mimeType?.startsWith("video/");
  const isDocument = (item: DriveFileItem) => {
    const name = (item.name || "").toLowerCase();
    const mime = item.mimeType || "";
    return (
      mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("text") ||
      mime.includes("msword") ||
      mime.includes("sheet") ||
      name.endsWith(".pdf") ||
      name.endsWith(".doc") ||
      name.endsWith(".docx")
    );
  };
  const isFolder = (item: DriveFileItem) => item.mimeType === "application/vnd.google-apps.folder";

  // Filtered files list
  const displayedFiles = files.filter((item) => {
    if (isFolder(item)) return true; // Always show folders for navigation
    if (filterType === "images") return isImage(item);
    if (filterType === "videos") return isVideo(item);
    if (allowedTypes === "images") return isImage(item);
    if (allowedTypes === "videos") return isVideo(item);
    if (allowedTypes === "documents") return isDocument(item);
    return isImage(item) || isVideo(item) || isDocument(item) || allowedTypes === "all";
  });

  // Handle final selection of a media item
  const handleConfirmSelection = async (item: DriveFileItem) => {
    if (isFolder(item)) {
      handleOpenFolder(item);
      return;
    }

    setIsApplying(true);
    try {
      if (onNotification) onNotification(`Setting permissions for "${item.name}"...`);

      // Ensure file has public readable permission for seamless web embedding
      try {
        await makeFilePublicReadable(item.id);
      } catch (e) {
        console.warn("Could not set anyone-reader permission:", e);
      }

      // Generate direct embed CDN URL
      const directUrl = getDirectDriveMediaUrl(item.id);

      const mediaPayload: SelectedDriveMedia = {
        url: directUrl,
        fileName: item.name,
        fileSize: formatSize(item.size),
        fileId: item.id,
        mimeType: item.mimeType
      };

      onSelect(mediaPayload);
      if (onNotification) {
        onNotification(`"${item.name}" attached from Google Drive!`, "success");
      }
      onClose();
    } catch (err: any) {
      if (onNotification) {
        onNotification(`Failed to select Drive item: ${err.message}`, "error");
      }
    } finally {
      setIsApplying(false);
    }
  };

  // Upload file to Google Drive and auto-select
  const handleDirectUploadToDrive = async (file: File) => {
    setIsUploadingToDrive(true);
    try {
      if (onNotification) onNotification(`Uploading "${file.name}" to Google Drive...`);
      const targetFolderId = currentFolder?.id || (await getOrCreateAppFolder("Portfolio Files/Wallpapers")).id;
      const uploaded = await uploadFileToDrive(file, `${Date.now()}_${file.name}`, file.type, targetFolderId);
      
      // Auto-select the newly uploaded file
      await handleConfirmSelection(uploaded);
    } catch (err: any) {
      if (onNotification) {
        onNotification(`Upload failed: ${err.message}`, "error");
      }
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0a1838] border-2 border-[#38bdf8] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-pixel">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#17468a] via-[#1d529f] to-[#17468a] px-4 py-3 border-b-2 border-[#1e3a8a] flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#0b1b3d] border border-[#38bdf8] flex items-center justify-center text-sm shadow">
              ☁️
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-wide flex items-center gap-2">
                <span>{title}</span>
                {targetSlotLabel && (
                  <span className="text-[11px] bg-[#071329] border border-[#38bdf8] text-[#38bdf8] px-2 py-0.5 rounded font-normal">
                    {targetSlotLabel}
                  </span>
                )}
              </h3>
              <span className="text-[10px] text-[#93c5fd]">
                {user ? `Connected as: ${user.email}` : "Connect your Google Drive to pick files"}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-[#e11d48] hover:bg-[#f43f5e] border border-[#fda4af] text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Auth Required State */}
        {!user ? (
          <div className="p-8 sm:p-12 text-center space-y-5 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#102d61] border-2 border-[#38bdf8] flex items-center justify-center text-3xl shadow-lg">
              ☁️
            </div>
            <div className="max-w-md space-y-1.5">
              <h4 className="text-base font-bold text-white">CONNECT YOUR GOOGLE DRIVE</h4>
              <p className="text-xs text-white/70">
                Sign in with your Google account to browse, search, and attach wallpaper images or live videos directly from your Google Drive storage.
              </p>
            </div>

            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="bg-[#1d4ed8] hover:bg-[#2563eb] border-2 border-[#60a5fa] text-white px-6 py-3 rounded-lg text-xs font-bold flex items-center gap-2.5 shadow-xl cursor-pointer transition-all"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Connecting to Google Drive...</span>
                </>
              ) : (
                <>
                  <span>🔑</span>
                  <span>Sign In with Google Account</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar: Breadcrumb + Search + Filters + Quick Upload */}
            <div className="p-3 bg-[#071329] border-b border-[#1e3a8a] flex flex-col gap-2.5">
              {/* Top Row: Breadcrumbs & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs text-white/90 overflow-x-auto py-1 max-w-full">
                  <button
                    onClick={handleNavigateRoot}
                    className="hover:text-[#38bdf8] font-bold flex items-center gap-1 bg-[#0f2854] px-2 py-1 rounded border border-[#1e3a8a]"
                  >
                    <span>☁️</span> My Drive
                  </button>

                  {folderHistory.map((folder, index) => (
                    <React.Fragment key={`${folder.id}-${index}`}>
                      <span className="text-white/40">/</span>
                      <button
                        onClick={() => {
                          const newHist = folderHistory.slice(0, index + 1);
                          setFolderHistory(newHist);
                          setCurrentFolder(folder);
                          setSelectedFile(null);
                          loadFolderFiles(folder.id, searchQuery);
                        }}
                        className={`hover:text-[#38bdf8] px-2 py-1 rounded border ${
                          index === folderHistory.length - 1
                            ? "bg-[#1d4ed8] border-[#60a5fa] text-white font-bold"
                            : "bg-[#0f2854] border-[#1e3a8a] text-white/80"
                        }`}
                      >
                        {folder.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Top Right: Refresh & Upload */}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => loadFolderFiles(currentFolder?.id, searchQuery)}
                    disabled={loadingFiles}
                    className="bg-[#0f2854] hover:bg-[#133066] border border-[#1e3a8a] text-white text-xs px-2.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
                    title="Refresh folder files"
                  >
                    <RefreshCw size={13} className={loadingFiles ? "animate-spin text-[#38bdf8]" : ""} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDirectUploadToDrive(file);
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingToDrive}
                    className="bg-[#0284c7] hover:bg-[#0369a1] border border-[#38bdf8] text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>{isUploadingToDrive ? "Uploading..." : "Upload to Drive"}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Row: Search and Type Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search files by name in Google Drive..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0a152d] border border-[#1e40af] pl-8 pr-3 py-1.5 text-xs text-white rounded focus:border-[#38bdf8] outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#1d4ed8] hover:bg-[#2563eb] text-white text-xs px-3 py-1.5 rounded border border-[#60a5fa] cursor-pointer"
                  >
                    Search
                  </button>
                </form>

                {/* Media Type Filters */}
                <div className="flex gap-1 w-full sm:w-auto">
                  {[
                    { id: "all", label: "All Media", icon: "📁" },
                    { id: "images", label: "Images", icon: "🖼️" },
                    { id: "videos", label: "Videos", icon: "🎬" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id as any)}
                      className={`flex-1 sm:flex-none px-2.5 py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition-colors ${
                        filterType === f.id
                          ? "bg-[#1d4ed8] border border-[#60a5fa] text-white font-bold"
                          : "bg-[#0a152d] text-white/70 hover:bg-[#0f2854] border border-[#1e3a8a]"
                      }`}
                    >
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main File Explorer Grid Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0a1838]">
              {loadingFiles ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-2 text-white/60">
                  <RefreshCw size={28} className="animate-spin text-[#38bdf8]" />
                  <span className="text-xs">Loading Google Drive files...</span>
                </div>
              ) : displayedFiles.length === 0 ? (
                <div className="h-64 border-2 border-dashed border-[#1e3a8a] rounded-lg flex flex-col items-center justify-center space-y-2 text-center p-6">
                  <span className="text-3xl">📂</span>
                  <p className="text-xs font-bold text-white">No matching media files found in this folder</p>
                  <span className="text-[10px] text-white/50">
                    Try uploading an image/video using the &quot;Upload to Drive&quot; button above.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {/* Up Folder Button if inside a folder */}
                  {folderHistory.length > 0 && (
                    <div
                      onClick={handleNavigateUp}
                      className="bg-[#071329] border-2 border-[#1e3a8a] hover:border-[#38bdf8] rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#0f2854] aspect-square"
                    >
                      <ArrowLeft size={24} className="text-[#38bdf8] mb-1" />
                      <span className="text-xs font-bold text-white">.. Up One Folder</span>
                      <span className="text-[9px] text-white/40">Back to parent</span>
                    </div>
                  )}

                  {/* File Items */}
                  {displayedFiles.map((item, idx) => {
                    const isSelected = selectedFile?.id === item.id;
                    const itemIsFolder = isFolder(item);
                    const itemIsImage = isImage(item);
                    const itemIsVideo = isVideo(item);

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => setSelectedFile(item)}
                        onDoubleClick={() => handleConfirmSelection(item)}
                        className={`group relative bg-[#071329] border-2 rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
                          isSelected
                            ? "border-[#38bdf8] bg-[#0c234b] shadow-lg shadow-[#38bdf8]/20 ring-2 ring-[#38bdf8]/50"
                            : "border-[#1e3a8a] hover:border-[#60a5fa] hover:bg-[#0c224a]"
                        }`}
                      >
                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-10 bg-[#10b981] text-white rounded-full p-0.5 shadow-md">
                            <Check size={12} />
                          </div>
                        )}

                        {/* Format Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          {itemIsFolder && (
                            <span className="bg-[#1e3a8a] text-[#93c5fd] text-[9px] font-bold px-1.5 py-0.5 rounded">
                              FOLDER
                            </span>
                          )}
                          {itemIsImage && (
                            <span className="bg-[#064e3b] text-[#34d399] text-[9px] font-bold px-1.5 py-0.5 rounded">
                              IMAGE
                            </span>
                          )}
                          {itemIsVideo && (
                            <span className="bg-[#831843] text-[#f472b6] text-[9px] font-bold px-1.5 py-0.5 rounded">
                              VIDEO
                            </span>
                          )}
                          {!itemIsFolder && !itemIsImage && !itemIsVideo && (
                            <span className="bg-[#1e40af] text-[#bfdbfe] text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {(item.name || "").toLowerCase().endsWith(".pdf") ? "PDF" : (item.name || "").toLowerCase().endsWith(".doc") || (item.name || "").toLowerCase().endsWith(".docx") ? "DOC" : "FILE"}
                            </span>
                          )}
                        </div>

                        {/* Thumbnail / Icon Display */}
                        <div className="w-full aspect-[4/3] rounded bg-[#030a16] border border-[#1e3a8a] overflow-hidden flex items-center justify-center mb-2">
                          {itemIsFolder ? (
                            <Folder size={36} className="text-[#38bdf8] group-hover:scale-110 transition-transform" />
                          ) : itemIsImage ? (
                            <img
                              src={item.thumbnailLink || getDirectDriveMediaUrl(item.id)}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/favicon.svg";
                              }}
                            />
                          ) : itemIsVideo ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-[#061126]">
                              {item.thumbnailLink ? (
                                <img
                                  src={item.thumbnailLink}
                                  alt={item.name}
                                  className="w-full h-full object-cover opacity-80"
                                />
                              ) : null}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-[#e11d48] flex items-center justify-center text-white shadow">
                                  <Film size={16} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <FileText size={32} className="text-white/40" />
                          )}
                        </div>

                        {/* File Details */}
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-white block truncate" title={item.name}>
                            {item.name}
                          </span>
                          <div className="flex items-center justify-between text-[9px] text-white/50">
                            <span>{itemIsFolder ? "Folder" : formatSize(item.size)}</span>
                            {item.modifiedTime && (
                              <span>{new Date(item.modifiedTime).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Bottom Bar with Selection Details & Apply Button */}
            <div className="p-3 bg-[#071329] border-t-2 border-[#1e3a8a] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 w-full sm:w-auto min-w-0">
                {selectedFile ? (
                  <>
                    <div className="w-8 h-8 rounded bg-[#0f2854] border border-[#38bdf8] flex items-center justify-center flex-shrink-0 text-sm">
                      {isFolder(selectedFile) ? "📁" : isImage(selectedFile) ? "🖼️" : isVideo(selectedFile) ? "🎬" : "📄"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-[#38bdf8] block truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-[10px] text-white/60 block">
                        {isFolder(selectedFile) ? "Double-click to open folder" : `Ready to attach • ${formatSize(selectedFile.size)}`}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-white/50 italic">
                    Click any image or video file to select, or double-click to attach immediately.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#1e293b] hover:bg-[#334155] border border-[#64748b] text-white text-xs px-4 py-2 rounded cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => selectedFile && handleConfirmSelection(selectedFile)}
                  disabled={!selectedFile || isApplying}
                  className={`px-5 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                    selectedFile
                      ? "bg-[#10b981] hover:bg-[#059669] text-white border-2 border-[#34d399] cursor-pointer"
                      : "bg-[#0f2854] text-white/40 border border-[#1e3a8a] cursor-not-allowed"
                  }`}
                >
                  {isApplying ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Attaching Media...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{selectedFile && isFolder(selectedFile) ? "Open Folder" : "Select & Apply Wallpaper"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
