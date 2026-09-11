import React, { useState, useEffect, useRef } from "react";
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  listDriveFiles,
  uploadFileToDrive,
  deleteDriveFile,
  getDriveStorageQuota,
  createDriveFolder,
  getOrCreateAppFolder,
  DriveFileItem,
  DriveStorageQuota,
  getCurrentUser,
  isTokenExpired,
  User,
  syncDatabaseToDrive,
  pullDatabaseFromDrive,
  STORAGE_KEY_DRIVE_DB_FILE_ID,
  STORAGE_KEY_DRIVE_DB_LAST_SYNCED,
} from "../../services/googleDriveService";
import {
  Upload,
  Cloud,
  FolderPlus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Film,
  Image as ImageIcon,
  HardDrive,
  Copy,
  Check,
  Folder,
  ArrowUpRight,
  LogOut,
  FolderCheck,
} from "lucide-react";

interface GoogleDriveManagerProps {
  onNotification: (msg: string, type?: "success" | "error") => void;
}

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({ onNotification }) => {
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<DriveStorageQuota | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "image" | "video" | "folder" | "doc">("all");

  // Folder management
  const [currentFolder, setCurrentFolder] = useState<DriveFileItem | null>(null);
  const [folderHistory, setFolderHistory] = useState<DriveFileItem[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string>("default");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUploadedFile, setLastUploadedFile] = useState<DriveFileItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete confirmation modal (Mandatory for Workspace operations)
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Popup blocked & Manual Auth state
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Option 5: Google Drive Master Database state & handlers
  const [isSyncingDriveDb, setIsSyncingDriveDb] = useState(false);
  const [isRestoringDriveDb, setIsRestoringDriveDb] = useState(false);
  const [driveDbLastSynced, setDriveDbLastSynced] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY_DRIVE_DB_LAST_SYNCED); } catch { return null; }
  });
  const [driveDbFileId, setDriveDbFileId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY_DRIVE_DB_FILE_ID); } catch { return null; }
  });

  const handleSyncDatabaseToDrive = async () => {
    setIsSyncingDriveDb(true);
    try {
      // If token expired or session needs refresh, refresh seamlessly using this user click gesture
      if (isTokenExpired() || isSessionExpired) {
        try {
          const authRes = await googleSignIn(undefined, { isRefresh: true });
          if (authRes?.user) {
            setUser(authRes.user);
            setIsSessionExpired(false);
          }
        } catch (authErr: any) {
          if (authErr?.message === "POPUP_BLOCKED") {
            setPopupBlocked(true);
            onNotification("Browser blocked the Google popup. Please allow popups or enter token manually.", "error");
            return;
          }
          throw authErr;
        }
      }

      const res = await syncDatabaseToDrive(undefined, { interactive: true });
      if (res.success) {
        setIsSessionExpired(false);
        setDriveDbLastSynced(res.lastSyncedAt || new Date().toISOString());
        if (res.fileId) setDriveDbFileId(res.fileId);
        onNotification("☁️ Master Portfolio Database saved to Google Drive (Portfolio Files/portfolio-db.json)!", "success");
        loadDriveInfo(currentFolder?.id);
      } else {
        if (res.isAuthExpired || res.error?.includes("refresh") || res.error?.includes("session")) {
          setIsSessionExpired(true);
        }
        onNotification(res.error || "Failed to sync database to Google Drive", "error");
      }
    } catch (e: any) {
      if (e?.isAuthExpired || e?.message?.includes("refresh") || e?.message?.includes("session")) {
        setIsSessionExpired(true);
      }
      onNotification(e.message || "Failed to sync database to Google Drive", "error");
    } finally {
      setIsSyncingDriveDb(false);
    }
  };

  const handleRestoreDatabaseFromDrive = async () => {
    if (!window.confirm("Restore entire portfolio database (Projects, Skills, Bio, Wallpapers, Settings) from your Google Drive? This will safely synchronize the current active server state with your cloud backup.")) {
      return;
    }
    setIsRestoringDriveDb(true);
    try {
      if (isTokenExpired() || isSessionExpired) {
        try {
          const authRes = await googleSignIn(undefined, { isRefresh: true });
          if (authRes?.user) {
            setUser(authRes.user);
            setIsSessionExpired(false);
          }
        } catch (authErr: any) {
          if (authErr?.message === "POPUP_BLOCKED") {
            setPopupBlocked(true);
            onNotification("Browser blocked the Google popup. Please allow popups or enter token manually.", "error");
            return;
          }
        }
      }

      const res = await pullDatabaseFromDrive();
      if (res.success && res.data) {
        setIsSessionExpired(false);
        const wpCount = Object.keys(res.data.wallpaperConfig?.wallpapers || {}).length;
        const iconCount = Array.isArray(res.data.desktopIcons) ? res.data.desktopIcons.length : 0;
        const projectCount = Array.isArray(res.data.projects) ? res.data.projects.length : 0;
        onNotification(
          `✅ Restored from Google Drive! (${wpCount} wallpapers, ${iconCount} desktop icons, ${projectCount} projects synced)`,
          "success"
        );
        setTimeout(() => window.location.reload(), 1200);
      } else if (res.success) {
        setIsSessionExpired(false);
        onNotification("✅ Successfully restored entire Portfolio Database from Google Drive!", "success");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        if (res.error?.includes("refresh") || res.error?.includes("session")) {
          setIsSessionExpired(true);
        }
        onNotification(res.error || "Failed to restore database from Google Drive", "error");
      }
    } catch (e: any) {
      if (e?.isAuthExpired || e?.message?.includes("refresh") || e?.message?.includes("session")) {
        setIsSessionExpired(true);
      }
      onNotification(e.message || "Failed to restore database from Google Drive", "error");
    } finally {
      setIsRestoringDriveDb(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        loadDriveInfo();
      },
      () => {
        setUser(null);
        setQuota(null);
        setFiles([]);
      }
    );

    const handleExpired = () => {
      setIsSessionExpired(true);
    };
    window.addEventListener("google_drive_token_expired", handleExpired);
    window.addEventListener("google_drive_token_needs_refresh", handleExpired);

    return () => {
      unsubscribe();
      window.removeEventListener("google_drive_token_expired", handleExpired);
      window.removeEventListener("google_drive_token_needs_refresh", handleExpired);
    };
  }, []);

  const loadDriveInfo = async (folderId?: string) => {
    try {
      setLoadingFiles(true);
      const [filesList, quotaInfo] = await Promise.all([
        listDriveFiles(folderId),
        getDriveStorageQuota().catch(() => null),
      ]);
      setFiles(filesList);
      setIsSessionExpired(false);
      if (quotaInfo) setQuota(quotaInfo);
    } catch (err: any) {
      if (
        err?.isAuthExpired ||
        err?.message?.includes("expired") ||
        err?.message?.includes("credentials") ||
        err?.message?.includes("UNAUTHENTICATED") ||
        err?.message?.includes("not connected")
      ) {
        setIsSessionExpired(true);
        setFiles([]);
      } else {
        console.error("Failed to load Google Drive data:", err);
        onNotification(err.message || "Failed to load Google Drive items", "error");
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSignIn = async (tokenOverride?: string) => {
    try {
      setIsAuthenticating(true);
      setPopupBlocked(false);
      const result = await googleSignIn(tokenOverride);
      if (result) {
        setUser(result.user);
        setIsSessionExpired(false);
        setShowManualInput(false);
        setManualTokenInput("");
        onNotification(`Connected as ${result.user.displayName || result.user.email}!`, "success");
        await loadDriveInfo();
      }
    } catch (err: any) {
      if (
        err?.message === "POPUP_BLOCKED" ||
        err?.message?.toLowerCase().includes("popup") ||
        err?.message?.toLowerCase().includes("blocked")
      ) {
        setPopupBlocked(true);
        onNotification("Browser blocked the popup window. Open the site in a new tab or enter token manually.", "error");
      } else {
        console.error("Google sign in failed:", err);
        onNotification(err.message || "Google Authentication failed", "error");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setQuota(null);
      setFiles([]);
      setIsSessionExpired(false);
      setPopupBlocked(false);
      onNotification("Signed out of Google Drive");
    } catch (err: any) {
      onNotification(err.message, "error");
    }
  };

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Clean up extension and set default custom name
      const nameParts = file.name.split(".");
      const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : "";
      const baseName = nameParts.join(".");
      setCustomFileName(file.name);
    }
  };

  // Execute Upload with Custom Name
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }
    if (!selectedFile) {
      onNotification("Please select a file to upload", "error");
      return;
    }
    const finalName = customFileName.trim() || selectedFile.name;
    try {

      setIsUploading(true);
      setUploadProgress(20);

      // Determine target folder
      let targetFolderId = currentFolder?.id;
      if (uploadTargetFolder === "default" && !targetFolderId) {
        const appFolder = await getOrCreateAppFolder("Portfolio Files");
        targetFolderId = appFolder.id;
      }

      setUploadProgress(50);
      const uploadedItem = await uploadFileToDrive(
        selectedFile,
        finalName,
        selectedFile.type,
        targetFolderId
      );

      setUploadProgress(100);
      setLastUploadedFile(uploadedItem);
      onNotification(`"${finalName}" saved to Google Drive successfully!`, "success");

      // Reset upload form
      setSelectedFile(null);
      setCustomFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh list
      loadDriveInfo(currentFolder?.id);
    } catch (err: any) {
      console.error("Drive upload failed:", err);
      onNotification(err.message || "Failed to upload to Google Drive", "error");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }
    if (!newFolderName.trim()) return;

    try {
      setIsCreatingFolder(true);
      const created = await createDriveFolder(newFolderName.trim(), currentFolder?.id);
      onNotification(`Folder "${created.name}" created on Google Drive!`, "success");
      setNewFolderName("");
      loadDriveInfo(currentFolder?.id);
    } catch (err: any) {
      onNotification(err.message, "error");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Delete confirmation & action
  const confirmDelete = async () => {
    if (!fileToDelete) return;
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }
    try {
      setIsDeleting(true);
      await deleteDriveFile(fileToDelete.id);
      onNotification(`"${fileToDelete.name}" deleted from Google Drive`, "success");
      setFileToDelete(null);
      loadDriveInfo(currentFolder?.id);
    } catch (err: any) {
      onNotification(err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy link helper
  const copyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onNotification("Google Drive link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter files
  const filteredFiles = files.filter((f) => {
    if (activeFilter === "image") return f.mimeType.startsWith("image/");
    if (activeFilter === "video") return f.mimeType.startsWith("video/");
    if (activeFilter === "folder") return f.mimeType === "application/vnd.google-apps.folder";
    if (activeFilter === "doc") return !f.mimeType.startsWith("image/") && !f.mimeType.startsWith("video/") && f.mimeType !== "application/vnd.google-apps.folder";
    return true;
  });

  const formatBytes = (bytes?: string | number) => {
    if (!bytes) return "0 B";
    const num = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
    if (isNaN(num)) return "0 B";
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div id="google-drive-manager-root" className="space-y-6 text-white font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900/80 border border-blue-500/30 rounded-xl p-6 relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Cloud className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono tracking-wider text-white">GOOGLE DRIVE CLOUD HUB</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded">
                  OFFICIAL API
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-1 max-w-xl font-mono">
                Upload files, images, wallpapers & videos directly to your Google Drive with custom names and access them anytime.
              </p>
            </div>
          </div>

          {/* User Auth Status / Sign in button */}
          <div>
            {!user ? (
              <button
                type="button"
                id="gsi-sign-in-btn"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-medium text-sm rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isAuthenticating ? "Connecting..." : "Sign in with Google"}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-slate-900/90 border border-blue-500/40 rounded-xl p-2 px-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full border border-blue-400/50" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left font-mono">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {user.displayName || "Connected"}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{user.email}</div>
                </div>
                <button
                  type="button"
                  id="disconnect-drive-btn"
                  onClick={handleSignOut}
                  title="Sign out of Google"
                  className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quota bar if logged in */}
        {quota && quota.limit && (
          <div className="mt-4 pt-3 border-t border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-blue-200/70">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>
                Drive Storage: <strong className="text-white">{formatBytes(quota.usage)}</strong> used of{" "}
                <strong className="text-white">{formatBytes(quota.limit)}</strong>
              </span>
            </div>
            <div className="w-full sm:w-48 bg-slate-800 rounded-full h-2 overflow-hidden border border-blue-500/30">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((quota.usage || 0) / (quota.limit || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {!user ? (
        /* Sign-in prompt callout */
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 sm:p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
            <Cloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-mono text-white">Sign in to Connect Your Google Drive</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto font-mono">
            Connect your Google account with permission to upload, organize, and archive your wallpapers, videos, and portfolio files securely into Google Drive.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              id="gsi-sign-in-btn-banner"
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm rounded-lg shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isAuthenticating ? "Opening Google Sign-In..." : "Sign in with Google"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Authenticated Google Drive Workspace */
        <div className="space-y-6">
          {/* Session Expiration Banner with 1-Click Refresh */}
          {(isSessionExpired || isTokenExpired()) && (
            <div className="bg-amber-950/70 border-2 border-amber-500 rounded-xl p-4 sm:p-5 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in fade-in">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold font-mono text-amber-200">
                      GOOGLE DRIVE SESSION NEEDS REFRESH
                    </h4>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded font-bold uppercase">
                      1-Click Refresh
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/80 font-mono mt-1">
                    Google OAuth access tokens expire after 60 minutes. All portfolio edits are safely preserved on the server. Click below to reconnect Google Drive instantly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSignIn()}
                disabled={isAuthenticating}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuthenticating ? "animate-spin" : ""}`} />
                <span>{isAuthenticating ? "CONNECTING..." : "↻ REFRESH GOOGLE SESSION"}</span>
              </button>
            </div>
          )}

          {/* OPTION 5: GOOGLE DRIVE RESILIENT CLOUD DATABASE */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-blue-950/40 to-slate-900/90 border-2 border-emerald-500/50 rounded-xl p-5 sm:p-6 backdrop-blur-sm space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold font-mono text-white tracking-wide">
                      GOOGLE DRIVE CLOUD DATABASE
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded font-bold">
                      100% FREE • NO WRITE LIMITS
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded font-bold">
                      AUTO-SYNC ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-1 font-mono">
                    Stores entire portfolio database (Wallpapers, Bio, Projects, Skills, Contact) in your Google Drive (<code>Portfolio Files/portfolio-db.json</code>).
                  </p>
                </div>
              </div>

              {/* Status and Last Synced */}
              <div className="text-left sm:text-right font-mono text-xs text-slate-300">
                <div className="text-[11px] text-slate-400">Cloud File:</div>
                <div className="text-emerald-300 font-bold">Portfolio Files/portfolio-db.json</div>
                {driveDbLastSynced && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Last Synced: {new Date(driveDbLastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons & Explanation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-300/80 font-mono leading-relaxed">
                💡 Every time you make changes or upload wallpapers, they are automatically backed up to your Google Drive. If server restarts or publishes, data is restored seamlessly.
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncDatabaseToDrive}
                  disabled={isSyncingDriveDb}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Save current portfolio database to Google Drive now"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDriveDb ? "animate-spin" : ""}`} />
                  <span>{isSyncingDriveDb ? "SYNCING TO DRIVE..." : "SYNC TO DRIVE NOW"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreDatabaseFromDrive}
                  disabled={isRestoringDriveDb}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 border border-blue-400 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Restore portfolio database from Google Drive"
                >
                  <FolderCheck className="w-3.5 h-3.5" />
                  <span>{isRestoringDriveDb ? "RESTORING..." : "RESTORE FROM DRIVE"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* UPLOAD BOX WITH CUSTOM FILE NAME ("intha Name pottu save pannanum") */}
          <div className="bg-slate-900/80 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold font-mono text-white">UPLOAD & SAVE WITH CUSTOM NAME</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Target: <strong className="text-blue-400">{currentFolder?.name || "Portfolio Files"}</strong>
              </span>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File picker drop area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-950/20 hover:bg-blue-900/30 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="drive-file-input"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx,.zip,.psd"
                  />
                  <Upload className="w-8 h-8 text-blue-400 mb-2" />
                  {selectedFile ? (
                    <div>
                      <div className="text-sm font-bold text-white truncate max-w-[240px]">{selectedFile.name}</div>
                      <div className="text-xs text-blue-300 font-mono mt-0.5">{formatBytes(selectedFile.size)}</div>
                      <div className="text-[11px] text-emerald-400 font-mono mt-1">✓ File ready to name & upload</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-bold text-blue-200">Click or Drag & Drop File</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">Images, Wallpapers, Videos, Docs (MP4, PNG, JPG, PDF)</div>
                    </div>
                  )}
                </div>

                {/* Custom Name input and Options */}
                <div className="flex flex-col justify-between space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-blue-300 mb-1.5">
                      CUSTOM NAME IN GOOGLE DRIVE:
                    </label>
                    <input
                      type="text"
                      id="drive-custom-filename-input"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="e.g. EarlyMorning-Desktop-4K.png"
                      className="w-full bg-slate-900 border border-blue-500/40 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-400"
                    />
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      💡 Ungal virumbiya name-ai ingu type seithaal, Google Drive-il athe name-il save aagum.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      id="drive-submit-upload-btn"
                      disabled={!selectedFile || isUploading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs font-mono rounded-lg transition-all shadow-md active:scale-95"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>SAVING TO DRIVE ({uploadProgress}%)...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4" />
                          <span>SAVE TO GOOGLE DRIVE</span>
                        </>
                      )}
                    </button>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setCustomFileName("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Last Upload Notification Card */}
            {lastUploadedFile && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-300 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    Saved: <strong>{lastUploadedFile.name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lastUploadedFile.webViewLink && (
                    <a
                      href={lastUploadedFile.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700/50 hover:bg-emerald-600 text-white rounded text-[11px]"
                    >
                      <span>Open on Drive</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                  {lastUploadedFile.webViewLink && (
                    <button
                      type="button"
                      onClick={() => copyLink(lastUploadedFile.webViewLink!, lastUploadedFile.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px]"
                    >
                      {copiedId === lastUploadedFile.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Link</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* GOOGLE DRIVE EXPLORER / BROWSER */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 backdrop-blur-sm space-y-4">
            {/* Folder breadcrumbs & controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto text-sm font-mono text-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentFolder(null);
                    setFolderHistory([]);
                    loadDriveInfo();
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 ${
                    !currentFolder ? "text-blue-400 font-bold bg-blue-950/40" : "text-slate-400"
                  }`}
                >
                  <Cloud className="w-4 h-4" />
                  <span>My Drive</span>
                </button>
                {folderHistory.map((folder, idx) => (
                  <React.Fragment key={`${folder.id}-${idx}`}>
                    <span className="text-slate-600">/</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newHistory = folderHistory.slice(0, idx + 1);
                        setFolderHistory(newHistory);
                        setCurrentFolder(folder);
                        loadDriveInfo(folder.id);
                      }}
                      className={`px-2 py-1 rounded hover:bg-slate-800 ${
                        currentFolder?.id === folder.id ? "text-blue-400 font-bold bg-blue-950/40" : "text-slate-400"
                      }`}
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Create Folder Form */}
                <form onSubmit={handleCreateFolder} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    className="w-36 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="submit"
                    disabled={!newFolderName.trim() || isCreatingFolder}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-50"
                    title="Create Folder"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </form>

                <button
                  type="button"
                  id="drive-refresh-btn"
                  onClick={() => loadDriveInfo(currentFolder?.id)}
                  disabled={loadingFiles}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  title="Refresh Drive Files"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFiles ? "animate-spin text-blue-400" : ""}`} />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
                {(
                  [
                    { key: "all", label: "All Files" },
                    { key: "image", label: "Images" },
                    { key: "video", label: "Videos" },
                    { key: "folder", label: "Folders" },
                    { key: "doc", label: "Documents" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeFilter === tab.key
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-slate-800/80 text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      listDriveFiles(currentFolder?.id, searchQuery).then(setFiles).catch(console.error);
                    }
                  }}
                  placeholder="Search files on Drive..."
                  className="w-full sm:w-60 bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {/* Files Grid / List */}
            {loadingFiles ? (
              <div className="p-12 text-center text-slate-400 font-mono">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-400 mb-2" />
                <p>Loading files from Google Drive...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
                <Cloud className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm">No files found in this folder on Google Drive.</p>
                <p className="text-xs text-slate-600 mt-1">Upload files using the upload panel above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredFiles.map((file, idx) => {
                  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                  const isImage = file.mimeType.startsWith("image/");
                  const isVideo = file.mimeType.startsWith("video/");

                  return (
                    <div
                      key={`${file.id}-${idx}`}
                      className="bg-slate-950/70 hover:bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-xl p-3 flex flex-col justify-between transition-all group relative"
                    >
                      <div>
                        {/* Preview / Icon */}
                        <div
                          onClick={() => {
                            if (isFolder) {
                              setFolderHistory([...folderHistory, file]);
                              setCurrentFolder(file);
                              loadDriveInfo(file.id);
                            }
                          }}
                          className={`w-full h-28 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden mb-2 border border-slate-800/80 ${
                            isFolder ? "cursor-pointer hover:bg-blue-950/40" : ""
                          }`}
                        >
                          {isImage && file.thumbnailLink ? (
                            <img
                              src={file.thumbnailLink}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : isFolder ? (
                            <Folder className="w-12 h-12 text-amber-400 group-hover:scale-110 transition-transform" />
                          ) : isVideo ? (
                            <Film className="w-10 h-10 text-rose-400" />
                          ) : isImage ? (
                            <ImageIcon className="w-10 h-10 text-blue-400" />
                          ) : (
                            <FileText className="w-10 h-10 text-slate-400" />
                          )}
                        </div>

                        {/* Title and metadata */}
                        <div className="font-mono">
                          <h4
                            className={`text-xs font-bold truncate text-white ${
                              isFolder ? "cursor-pointer hover:text-blue-400" : ""
                            }`}
                            onClick={() => {
                              if (isFolder) {
                                setFolderHistory([...folderHistory, file]);
                                setCurrentFolder(file);
                                loadDriveInfo(file.id);
                              }
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>{isFolder ? "Folder" : formatBytes(file.size)}</span>
                            <span>{file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ""}</span>
                          </div>
                        </div>
                      </div>

                      {/* File Card Actions */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-300 rounded"
                              title="Open on Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {file.webViewLink && (
                            <button
                              type="button"
                              onClick={() => copyLink(file.webViewLink!, file.id)}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                              title="Copy Drive Link"
                            >
                              {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Delete button (Opens confirmation dialog) */}
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"
                          title="Delete from Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR DELETING DRIVE FILES */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete from Google Drive?</h3>
                <p className="text-xs text-red-300">This action will remove the file from your Drive.</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-300">
              <div className="font-bold text-white truncate">{fileToDelete.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Type: {fileToDelete.mimeType} • Size: {formatBytes(fileToDelete.size)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-drive-file-btn"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
