// Google Drive & Cloud File Management Service
// Direct Firebase Auth & Google Workspace OAuth Integration
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from "firebase/auth";
import { saveLocalMasterBackup, getLocalMasterBackup } from "./persistenceService";
import { syncMasterStateToFirestore } from "./firebaseService";
import { WallpaperCategory, DeviceType, WallpaperLibraryConfig } from "../types";
import firebaseConfigJson from "../../firebase-applet-config.json";

export interface GoogleDriveUser {
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export type User = GoogleDriveUser;

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App & Auth Singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Drive & Profile scopes
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive.readonly");
provider.addScope("https://www.googleapis.com/auth/userinfo.email");
provider.addScope("https://www.googleapis.com/auth/userinfo.profile");
provider.setCustomParameters({
  prompt: "select_account",
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: GoogleDriveUser | null = null;

export const OAUTH_CLIENT_ID =
  (firebaseConfigJson as any).oAuthClientId ||
  "633570076401-v68l2u2g3a3os1u4e1o2tt7irjrln2qj.apps.googleusercontent.com";

const STORAGE_KEY_TOKEN = "google_drive_access_token";
const STORAGE_KEY_USER = "google_drive_connected_user";
const STORAGE_KEY_CONNECTED = "google_drive_is_connected";
const STORAGE_KEY_EXPIRES_AT = "google_drive_token_expires_at";

// Attempt to restore token from localStorage
try {
  const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
  const isConnected = localStorage.getItem(STORAGE_KEY_CONNECTED);
  if (savedToken && isConnected !== "false") {
    cachedAccessToken = savedToken;
  }
} catch (e) {
  console.warn("Could not read localStorage for Google Drive token:", e);
}

// Fetch session from server if localStorage is empty
export const syncSessionFromServer = async (): Promise<string | null> => {
  try {
    const res = await fetch("/api/admin/google-drive-session");
    if (res.ok) {
      const data = await res.json();
      if (data && data.isConnected && data.accessToken) {
        cachedAccessToken = data.accessToken;
        try {
          localStorage.setItem(STORAGE_KEY_TOKEN, data.accessToken);
          localStorage.setItem(STORAGE_KEY_CONNECTED, "true");
          if (data.userEmail || data.userName) {
            localStorage.setItem(
              STORAGE_KEY_USER,
              JSON.stringify({
                displayName: data.userName,
                email: data.userEmail,
                photoURL: data.userPhoto,
              })
            );
          }
        } catch {}
        return data.accessToken;
      }
    }
  } catch (err) {
    console.warn("Could not sync Google Drive session from server:", err);
  }
  return null;
};

// Fetch User Profile from Google UserInfo endpoint using Access Token
export const fetchGoogleUserProfile = async (token: string): Promise<GoogleDriveUser> => {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        uid: data.sub || "",
        displayName: data.name || data.given_name || "Google User",
        email: data.email || "",
        photoURL: data.picture || "",
      };
    }
  } catch (err) {
    console.warn("Could not fetch userinfo, checking about Drive info:", err);
  }

  return {
    displayName: "Connected Google User",
    email: "",
  };
};

// Save session persistently to localStorage and backend
export const persistGoogleSession = async (token: string, user: GoogleDriveUser | any, expiresInSeconds: number = 3600) => {
  cachedAccessToken = token;
  cachedUser = user;
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_CONNECTED, "true");
    localStorage.setItem(STORAGE_KEY_EXPIRES_AT, String(expiresAt));
    const userData = {
      uid: user?.uid || "",
      displayName: user?.displayName || "",
      email: user?.email || "",
      photoURL: user?.photoURL || "",
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));

    // Save to server database
    await fetch("/api/admin/google-drive-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: token,
        userEmail: user?.email || "",
        userName: user?.displayName || "",
        userPhoto: user?.photoURL || "",
        isConnected: true,
        expiresAt: expiresAt,
      }),
    }).catch(() => {});
  } catch (e) {
    console.warn("Error saving Google Drive session:", e);
  }
};

// Helper to check if Google session has been connected
export const isUserConnected = (): boolean => {
  try {
    const isConn = localStorage.getItem(STORAGE_KEY_CONNECTED);
    if (isConn === "false") return false;
    if (isConn === "true") return true;
    if (cachedUser || localStorage.getItem(STORAGE_KEY_USER)) return true;
  } catch {}
  return false;
};

// Check if current access token is expired or expiring in next 2 minutes
export const isTokenExpired = (): boolean => {
  try {
    const isConnected = isUserConnected();
    if (!isConnected) return false;
    const exp = localStorage.getItem(STORAGE_KEY_EXPIRES_AT);
    if (!exp || exp === "0") return true;
    const expNum = Number(exp);
    if (isNaN(expNum) || expNum <= 0) return true;
    // 2-minute margin
    return Date.now() > expNum - 2 * 60 * 1000;
  } catch {
    return true;
  }
};

// Auth State Listener with perpetual session persistence (Never automatically logs off)
export const initAuth = (
  onAuthSuccess?: (user: GoogleDriveUser | any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // 1. If user was previously connected, immediately restore so UI never flickers to logged-out
  const connected = isUserConnected();
  const savedUser = getCurrentUser();
  const savedToken = cachedAccessToken || (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : "") || "";
  if (connected && savedUser && onAuthSuccess) {
    onAuthSuccess(savedUser, savedToken);
  }

  // 2. Listen to Firebase Auth state
  const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      const token = (await getAccessToken()) || cachedAccessToken || "";
      const userObj: GoogleDriveUser = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || savedUser?.displayName || "Google User",
        email: fbUser.email || savedUser?.email || "",
        photoURL: fbUser.photoURL || savedUser?.photoURL || "",
      };
      cachedUser = userObj;
      try {
        localStorage.setItem(STORAGE_KEY_CONNECTED, "true");
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userObj));
      } catch {}
      if (onAuthSuccess) onAuthSuccess(userObj, token);
      return;
    }

    // Fallback: check if connected in localStorage or memory
    if (isUserConnected()) {
      let restoredUser = cachedUser || getCurrentUser();
      const token = (await getAccessToken()) || cachedAccessToken || "";
      if (restoredUser && onAuthSuccess) {
        onAuthSuccess(restoredUser, token);
        return;
      }
    }

    // Fallback: check server session
    const serverToken = await syncSessionFromServer();
    if (serverToken || isUserConnected()) {
      let restoredUser = cachedUser || getCurrentUser();
      if (restoredUser && onAuthSuccess) {
        onAuthSuccess(restoredUser, serverToken || cachedAccessToken || "");
        return;
      }
    }

    // CRITICAL: ONLY report failure if user EXPLICITLY disconnected or was NEVER connected
    if (!isSigningIn && onAuthFailure && localStorage.getItem(STORAGE_KEY_CONNECTED) === "false") {
      onAuthFailure();
    }
  });

  return () => {
    unsubscribe();
  };
};

// Sign in with Google using Google Identity Services (GIS) Token Client (or manual token)
export const googleSignIn = async (
  manualToken?: string,
  options?: { isRefresh?: boolean; prompt?: string }
): Promise<{ user: GoogleDriveUser; accessToken: string } | null> => {
  if (manualToken) {
    const user = await fetchGoogleUserProfile(manualToken);
    await persistGoogleSession(manualToken, user, 3600);
    window.dispatchEvent(new CustomEvent("google_drive_connected", { detail: { user } }));
    return { user, accessToken: manualToken };
  }

  isSigningIn = true;
  try {
    const oAuthClientId = OAUTH_CLIENT_ID;
    const gsi = (window as any)?.google?.accounts?.oauth2;
    const currentUser = getCurrentUser();
    const userEmail = currentUser?.email;

    // 1. Primary: Google Identity Services (GIS) Token Client
    // Must be invoked directly & synchronously to preserve the browser user activation gesture!
    if (gsi && oAuthClientId) {
      return await new Promise((resolve, reject) => {
        let settled = false;
        try {
          const client = gsi.initTokenClient({
            client_id: oAuthClientId,
            scope: DRIVE_FULL_SCOPES,
            prompt: options?.prompt || (options?.isRefresh && userEmail ? "" : "select_account"),
            hint: userEmail || undefined,
            callback: async (tokenResponse: any) => {
              if (settled) return;
              settled = true;
              if (tokenResponse && tokenResponse.access_token) {
                const token = tokenResponse.access_token;
                const expiresIn = tokenResponse.expires_in || 3600;
                try {
                  const user = await fetchGoogleUserProfile(token);
                  await persistGoogleSession(token, user, expiresIn);
                  window.dispatchEvent(new CustomEvent("google_drive_connected", { detail: { user } }));
                  resolve({ user, accessToken: token });
                } catch {
                  const fallbackUser: GoogleDriveUser = currentUser || { displayName: "Google User", email: "" };
                  await persistGoogleSession(token, fallbackUser, expiresIn);
                  window.dispatchEvent(new CustomEvent("google_drive_connected", { detail: { user: fallbackUser } }));
                  resolve({ user: fallbackUser, accessToken: token });
                }
              } else if (tokenResponse && tokenResponse.error) {
                if (
                  tokenResponse.error === "popup_closed" ||
                  tokenResponse.error === "access_denied"
                ) {
                  resolve(null);
                } else {
                  reject(new Error(tokenResponse.error_description || tokenResponse.error || "Google Sign-In was cancelled."));
                }
              } else {
                reject(new Error("No access token returned from Google"));
              }
            },
            error_callback: (err: any) => {
              if (settled) return;
              settled = true;
              if (err?.type === "popup_closed" || err?.message?.toLowerCase().includes("closed")) {
                resolve(null);
              } else if (
                err?.type === "popup_failed_to_open" ||
                err?.message?.toLowerCase().includes("failed to open") ||
                err?.message?.toLowerCase().includes("blocked")
              ) {
                reject(new Error("POPUP_BLOCKED"));
              } else {
                reject(new Error(err?.message || "Google OAuth popup encountered an issue"));
              }
            },
          });

          // Trigger synchronously in direct user click flow
          client.requestAccessToken({
            prompt: options?.prompt || (options?.isRefresh && userEmail ? "" : "select_account"),
            hint: userEmail || undefined,
          });
        } catch (initErr: any) {
          settled = true;
          reject(initErr);
        }
      });
    }

    // 2. Secondary fallback if GIS library is not loaded: Firebase Auth Popup
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (accessToken) {
        const userObj: GoogleDriveUser = {
          uid: result.user.uid,
          displayName: result.user.displayName || "Google User",
          email: result.user.email || "",
          photoURL: result.user.photoURL || "",
        };
        await persistGoogleSession(accessToken, userObj, 3600);
        window.dispatchEvent(new CustomEvent("google_drive_connected", { detail: { user: userObj } }));
        return { user: userObj, accessToken };
      }
    } catch (popupErr: any) {
      if (
        popupErr?.code === "auth/popup-closed-by-user" ||
        popupErr?.code === "auth/cancelled-popup-request" ||
        popupErr?.message?.toLowerCase().includes("closed")
      ) {
        return null;
      }
      if (popupErr?.code === "auth/popup-blocked") {
        throw new Error("POPUP_BLOCKED");
      }
      throw popupErr;
    }

    throw new Error("Google Identity Services is not available. Please allow third-party scripts or enter a manual token.");
  } catch (error: any) {
    if (error?.message === "POPUP_BLOCKED") {
      console.warn("Google Sign-In popup was blocked by the browser.");
    } else {
      console.error("Google Sign-In Error:", error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const DRIVE_FULL_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export const refreshGoogleTokenSilently = async (_emailHint?: string): Promise<string | null> => {
  // CRITICAL: Google Identity Services (GIS) Token Client does NOT support silent background popups.
  // Calling requestAccessToken() in the background without user gesture causes browsers to block the popup
  // and logs [GSI_LOGGER] errors.
  // Instead, silently recover any valid token from memory, localStorage, or server session.
  try {
    if (cachedAccessToken && !isTokenExpired()) {
      return cachedAccessToken;
    }
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;
    if (saved && !isTokenExpired()) {
      cachedAccessToken = saved;
      return saved;
    }
    const serverToken = await syncSessionFromServer();
    if (serverToken && !isTokenExpired()) {
      cachedAccessToken = serverToken;
      return serverToken;
    }
  } catch {
    // ignore
  }
  return null;
};

export const getAccessToken = async (forceInteractive: boolean = false): Promise<string | null> => {
  const isConnected = isUserConnected();
  if (!isConnected) return null;

  // 1. Return in-memory token if valid
  if (cachedAccessToken && !isTokenExpired()) return cachedAccessToken;

  // 2. Check localStorage token if valid
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (saved && !isTokenExpired()) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch {}

  // 3. Check server-side session if valid
  const serverToken = await syncSessionFromServer();
  if (serverToken && !isTokenExpired()) {
    cachedAccessToken = serverToken;
    return serverToken;
  }

  // 4. If interactive requested and user is connected, trigger interactive sign-in
  if (forceInteractive) {
    try {
      const res = await googleSignIn(undefined, { isRefresh: true });
      if (res?.accessToken) return res.accessToken;
    } catch {}
  }

  // When token is expired and not interactive, return null so callers don't make invalid 401 calls
  return null;
};

export const getCurrentUser = (): GoogleDriveUser | any => {
  if (cachedUser) return cachedUser;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

export const logoutGoogle = async () => {
  const tokenToRevoke = cachedAccessToken;
  cachedAccessToken = null;
  cachedUser = null;
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.setItem(STORAGE_KEY_CONNECTED, "false");

    await signOut(auth).catch(() => {});

    if (tokenToRevoke && (window as any)?.google?.accounts?.oauth2?.revoke) {
      (window as any).google.accounts.oauth2.revoke(tokenToRevoke, () => {});
    }

    await fetch("/api/admin/google-drive-session", {
      method: "DELETE",
    }).catch(() => {});
  } catch (e) {
    console.warn("Error clearing Google Drive session:", e);
  }
  window.dispatchEvent(new CustomEvent("google_drive_disconnected"));
};

// --- GOOGLE DRIVE API UTILITIES ---

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  iconLink?: string;
  parents?: string[];
}

export interface DriveStorageQuota {
  limit?: number;
  usage?: number;
  usageInDrive?: number;
  usageInDriveTrash?: number;
  userDisplayName?: string;
  userEmail?: string;
  userPhoto?: string;
}

export class GoogleAuthExpiredError extends Error {
  isAuthExpired: boolean = true;
  constructor(message: string = "Google session expired. Please reconnect.") {
    super(message);
    this.name = "GoogleAuthExpiredError";
  }
}

export const handleExpiredToken = async (): Promise<string | null> => {
  // CRITICAL: NEVER log out user! User remains permanently connected until explicit logout.
  cachedAccessToken = null;
  try {
    localStorage.setItem(STORAGE_KEY_EXPIRES_AT, "0");
  } catch {}
  window.dispatchEvent(new CustomEvent("google_drive_token_needs_refresh", { detail: { user: getCurrentUser() } }));
  window.dispatchEvent(new CustomEvent("google_drive_token_expired", { detail: { user: getCurrentUser() } }));
  return null;
};

/**
 * Direct public media link helper
 */
export function getDirectDriveMediaUrl(fileId: string): string {
  if (!fileId) return "";
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Make file public readable
 */
export async function makeFilePublicReadable(fileId: string): Promise<boolean> {
  let token = await getAccessToken();
  if (!token) return false;
  try {
    let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    });

    if (res.status === 401) {
      handleExpiredToken();
      const refreshedToken = await refreshGoogleTokenSilently();
      if (refreshedToken) {
        res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${refreshedToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "reader",
            type: "anyone",
          }),
        });
      }
    }

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Ensure all Drive-backed wallpapers in the config have public readable permissions
 */
export async function makeAllDriveWallpapersPublic(
  wallpapers: Record<string, { driveFileId?: string; url?: string }>
): Promise<{ fixed: number; failed: number }> {
  let fixed = 0;
  let failed = 0;
  for (const [, slot] of Object.entries(wallpapers || {})) {
    let fileId = slot.driveFileId;
    if (!fileId && slot.url) {
      const match =
        slot.url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/) ||
        slot.url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }
    if (fileId) {
      const success = await makeFilePublicReadable(fileId);
      if (success) fixed++;
      else failed++;
    }
  }
  return { fixed, failed };
}

/**
 * List files in Google Drive (with optional folder & search query)
 */
export async function listDriveFiles(
  folderId?: string,
  searchQuery?: string,
  exactMatch?: boolean
): Promise<DriveFileItem[]> {
  let token = await getAccessToken();
  if (!token) throw new GoogleAuthExpiredError("Google account not connected. Please click 'Sign in with Google' first.");

  const conditions: string[] = ["trashed = false"];
  if (folderId) {
    conditions.push(`'${folderId}' in parents`);
  }
  if (searchQuery && searchQuery.trim()) {
    if (exactMatch) {
      conditions.push(`name = '${searchQuery.replace(/'/g, "\\'")}'`);
    } else {
      conditions.push(`name contains '${searchQuery.replace(/'/g, "\\'")}'`);
    }
  }

  const q = encodeURIComponent(conditions.join(" and "));
  const fields = encodeURIComponent("files(id, name, mimeType, size, thumbnailLink, webContentLink, webViewLink, createdTime, modifiedTime, iconLink, parents)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=folder,modifiedTime desc&pageSize=100`;

  let res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Auto-retry on 401 with silent token refresh
  if (res.status === 401) {
    const refreshedToken = await refreshGoogleTokenSilently();
    if (refreshedToken) {
      token = refreshedToken;
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || "";
    if (
      res.status === 401 ||
      errorMsg.includes("invalid authentication credentials") ||
      errorMsg.includes("UNAUTHENTICATED") ||
      errorMsg.includes("OAuth 2 access token")
    ) {
      handleExpiredToken();
      throw new GoogleAuthExpiredError("Google account session needs refresh.");
    }
    throw new Error(errorMsg || `Google Drive error (HTTP ${res.status})`);
  }

  const data = await res.json();
  const rawFiles: DriveFileItem[] = data.files || [];
  const seenIds = new Set<string>();
  const uniqueFiles: DriveFileItem[] = [];
  for (const file of rawFiles) {
    if (file && file.id && !seenIds.has(file.id)) {
      seenIds.add(file.id);
      uniqueFiles.push(file);
    }
  }
  return uniqueFiles;
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(name: string, parentId?: string): Promise<DriveFileItem> {
  let token = await getAccessToken();
  if (!token) throw new GoogleAuthExpiredError("Google account not connected. Please Sign in with Google first.");

  const metadata: Record<string, any> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  let res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (res.status === 401) {
    const refreshedToken = await refreshGoogleTokenSilently();
    if (refreshedToken) {
      token = refreshedToken;
      res = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || "";
    if (res.status === 401 || errorMsg.includes("invalid authentication credentials") || errorMsg.includes("UNAUTHENTICATED")) {
      handleExpiredToken();
      throw new GoogleAuthExpiredError("Google account session needs refresh.");
    }
    throw new Error(errorMsg || "Failed to create folder on Google Drive");
  }

  return await res.json();
}

/**
 * Get or automatically create an App Directory in Drive
 */
export async function getOrCreateAppFolder(folderPath: string = "Portfolio Files"): Promise<DriveFileItem> {
  const parts = folderPath.split("/").map(p => p.trim()).filter(Boolean);
  let parentId: string | undefined = undefined;
  let currentFolder: DriveFileItem | undefined;

  for (const part of parts) {
    currentFolder = await getFolderByName(part, parentId);
    parentId = currentFolder.id;
  }
  
  if (!currentFolder) {
    throw new Error("Failed to create folder path");
  }
  return currentFolder;
}

async function getFolderByName(folderName: string, parentId?: string): Promise<DriveFileItem> {
  let token = await getAccessToken();
  if (!token) throw new GoogleAuthExpiredError("Google account not connected. Please Sign in with Google first.");

  let qStr = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentId) {
    qStr += ` and '${parentId}' in parents`;
  }
  
  const q = encodeURIComponent(qStr);
  let res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id, name, mimeType)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    const refreshedToken = await refreshGoogleTokenSilently();
    if (refreshedToken) {
      token = refreshedToken;
      res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id, name, mimeType)`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
  } else if (res.status === 401) {
    handleExpiredToken();
    throw new GoogleAuthExpiredError("Google account session needs refresh.");
  }

  return await createDriveFolder(folderName, parentId);
}

/**
 * Upload a File / Blob to Google Drive with a custom Name and optional parent Folder
 */
export async function uploadFileToDrive(
  file: Blob | File,
  customName: string,
  mimeType?: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  let token = await getAccessToken();
  if (!token) throw new GoogleAuthExpiredError("Google account not connected. Please Sign in with Google first.");

  const effectiveMime = mimeType || file.type || "application/octet-stream";
  const metadata: Record<string, any> = {
    name: customName,
    mimeType: effectiveMime,
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelim = "\r\n--" + boundary + "--";

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const multipartHeader =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${effectiveMime}\r\n\r\n`;

  const headerBytes = new TextEncoder().encode(multipartHeader);
  const footerBytes = new TextEncoder().encode(closeDelim);

  const combinedBody = new Uint8Array(headerBytes.length + bytes.length + footerBytes.length);
  combinedBody.set(headerBytes, 0);
  combinedBody.set(bytes, headerBytes.length);
  combinedBody.set(footerBytes, headerBytes.length + bytes.length);

  let res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: combinedBody,
  });

  if (res.status === 401) {
    const refreshedToken = await refreshGoogleTokenSilently();
    if (refreshedToken) {
      token = refreshedToken;
      res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: combinedBody,
      });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || "";
    if (res.status === 401 || errorMsg.includes("invalid authentication credentials") || errorMsg.includes("UNAUTHENTICATED")) {
      handleExpiredToken();
      throw new GoogleAuthExpiredError("Google account session needs refresh.");
    }
    throw new Error(errorMsg || "Failed to upload file to Google Drive");
  }

  const uploadedFile: DriveFileItem = await res.json();

  // Make public viewable
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    });
  } catch (e) {
    console.warn("Could not set public permission on drive file:", e);
  }

  return uploadedFile;
}

/**
 * Delete a file or folder from Google Drive
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  let token = await getAccessToken();
  if (!token) throw new GoogleAuthExpiredError("Google account not connected. Please Sign in with Google first.");

  let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    const refreshedToken = await refreshGoogleTokenSilently();
    if (refreshedToken) {
      token = refreshedToken;
      res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  if (res.ok || res.status === 204) return true;
  if (res.status === 401) {
    handleExpiredToken();
    throw new GoogleAuthExpiredError("Google account session needs refresh.");
  }
  return false;
}

/**
 * Fetch Google Drive storage quota and user info
 */
export async function getDriveStorageQuota(): Promise<DriveStorageQuota | null> {
  let token = await getAccessToken();
  if (!token) return null;

  try {
    let res = await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota,user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      const refreshedToken = await refreshGoogleTokenSilently();
      if (refreshedToken) {
        token = refreshedToken;
        res = await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota,user", {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }

    if (res.ok) {
      const data = await res.json();
      return {
        limit: data.storageQuota?.limit ? Number(data.storageQuota.limit) : undefined,
        usage: data.storageQuota?.usage ? Number(data.storageQuota.usage) : undefined,
        usageInDrive: data.storageQuota?.usageInDrive ? Number(data.storageQuota.usageInDrive) : undefined,
        usageInDriveTrash: data.storageQuota?.usageInDriveTrash ? Number(data.storageQuota.usageInDriveTrash) : undefined,
        userDisplayName: data.user?.displayName,
        userEmail: data.user?.emailAddress,
        userPhoto: data.user?.photoLink,
      };
    } else if (res.status === 401) {
      handleExpiredToken();
    }
  } catch (err) {
    console.warn("Could not fetch storage quota:", err);
  }
  return null;
}

// ====================================================
// GOOGLE DRIVE AS PERSISTENT CLOUD DATABASE (OPTION 5)
// ====================================================
// Persists the entire CMS & Wallpaper database to "Portfolio Files/portfolio-db.json"
// in the user's Google Drive. 100% Free, zero write quota limits, 15GB capacity.

export const STORAGE_KEY_DRIVE_DB_FILE_ID = "google_drive_db_file_id";
export const STORAGE_KEY_DRIVE_DB_LAST_SYNCED = "google_drive_db_last_synced";

export interface DriveSyncResult {
  success: boolean;
  fileId?: string;
  folderId?: string;
  lastSyncedAt?: string;
  error?: string;
  isAuthExpired?: boolean;
}

/**
 * Sync the complete CMS & Wallpaper state to Google Drive as "portfolio-db.json"
 */
export async function syncDatabaseToDrive(
  overrideData?: any,
  options?: { interactive?: boolean }
): Promise<DriveSyncResult> {
  let token = await getAccessToken(options?.interactive);
  if (!token) {
    token = await refreshGoogleTokenSilently();
  }
  if (!token) {
    if (isUserConnected()) {
      handleExpiredToken();
      console.warn("Google Drive auto-sync paused: Google account session needs refresh. Changes remain safely preserved locally and on the server.");
      return {
        success: false,
        error: "Google account session needs refresh. Click 'Refresh Session' to sync with Google Drive.",
        isAuthExpired: true,
      };
    }
    return { success: false, error: "Google Drive not connected. Please connect your Google account in the Admin Panel." };
  }

  try {
    // 1. Get or automatically create "Portfolio Files" folder in Google Drive
    const appFolder = await getOrCreateAppFolder("Portfolio Files");
    const folderId = appFolder.id;

    // 2. Prepare comprehensive full master data by aggregating all active endpoints & local backups
    let dbPayload: any = getLocalMasterBackup() || {};
    const adminToken = localStorage.getItem("admin_token") || localStorage.getItem("portfolio_admin_token") || "admin";

    // Only fallback to fetching from API if the local master backup is entirely missing
    if (Object.keys(dbPayload).length === 0) {
      try {
        const res = await fetch(`/api/admin/export-all?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          cache: "no-store"
        });
        if (res.ok) {
          dbPayload = await res.json();
        }
      } catch (e) {
        console.warn("Could not export from /api/admin/export-all, fetching individual endpoints:", e);
      }
    }

    if (!dbPayload || typeof dbPayload !== "object") {
      dbPayload = {};
    }

    // Safely verify and fetch individual endpoints if missing in dbPayload
    const missingFetches: Promise<void>[] = [];

    if (!dbPayload.portfolio || !dbPayload.portfolio.name) {
      missingFetches.push(
        fetch(`/api/portfolio?t=${Date.now()}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) dbPayload.portfolio = { ...(dbPayload.portfolio || {}), ...data }; })
          .catch(() => {})
      );
    }

    if (!dbPayload.wallpaperConfig || !dbPayload.wallpaperConfig.wallpapers || Object.keys(dbPayload.wallpaperConfig.wallpapers).length === 0) {
      missingFetches.push(
        fetch(`/api/wallpapers?t=${Date.now()}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) dbPayload.wallpaperConfig = data; })
          .catch(() => {})
      );
    }

    if (!Array.isArray(dbPayload.desktopIcons) || dbPayload.desktopIcons.length === 0) {
      missingFetches.push(
        fetch(`/api/desktop-icons?t=${Date.now()}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (Array.isArray(data)) dbPayload.desktopIcons = data; })
          .catch(() => {})
      );
    }

    if (!dbPayload.taskbarSettings) {
      missingFetches.push(
        fetch(`/api/taskbar-settings?t=${Date.now()}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) dbPayload.taskbarSettings = data; })
          .catch(() => {})
      );
    }

    if (!Array.isArray(dbPayload.taskbarIcons) || dbPayload.taskbarIcons.length === 0) {
      missingFetches.push(
        fetch(`/api/taskbar-icons?t=${Date.now()}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (Array.isArray(data)) dbPayload.taskbarIcons = data; })
          .catch(() => {})
      );
    }

    if (!Array.isArray(dbPayload.projects) || dbPayload.projects.length === 0) {
      missingFetches.push(
        fetch(`/api/projects?t=${Date.now()}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (Array.isArray(data)) dbPayload.projects = data; })
          .catch(() => {})
      );
    }

    if (!Array.isArray(dbPayload.skills) || dbPayload.skills.length === 0) {
      missingFetches.push(
        fetch(`/api/skills?t=${Date.now()}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (Array.isArray(data)) dbPayload.skills = data; })
          .catch(() => {})
      );
    }

    if (missingFetches.length > 0) {
      await Promise.all(missingFetches);
    }

    // 3. Merge local master backup so any client-side modifications are fully included
    const localBackup = getLocalMasterBackup();
    if (localBackup) {
      dbPayload = {
        ...dbPayload,
        portfolio: {
          ...(dbPayload.portfolio || {}),
          ...(localBackup.portfolio || {}),
        },
        taskbarSettings: {
          ...(dbPayload.taskbarSettings || {}),
          ...(localBackup.taskbarSettings || {}),
        },
        wallpaperConfig: {
          ...(dbPayload.wallpaperConfig || {}),
          ...(localBackup.wallpaperConfig || {}),
          wallpapers: {
            ...(dbPayload.wallpaperConfig?.wallpapers || {}),
            ...(localBackup.wallpaperConfig?.wallpapers || {}),
          },
        },
        desktopIcons: Array.isArray(localBackup.desktopIcons) && localBackup.desktopIcons.length > 0
          ? localBackup.desktopIcons
          : dbPayload.desktopIcons,
        taskbarIcons: Array.isArray(localBackup.taskbarIcons) && localBackup.taskbarIcons.length > 0
          ? localBackup.taskbarIcons
          : dbPayload.taskbarIcons,
        projects: Array.isArray(localBackup.projects) && localBackup.projects.length > 0
          ? localBackup.projects
          : dbPayload.projects,
        skills: Array.isArray(localBackup.skills) && localBackup.skills.length > 0
          ? localBackup.skills
          : dbPayload.skills,
        experiences: Array.isArray(localBackup.experiences) && localBackup.experiences.length > 0
          ? localBackup.experiences
          : dbPayload.experiences,
      };
    }

    // 4. Merge individual local storage backups
    try {
      const favBackup = localStorage.getItem("vignesh_portfolio_favicon_backup");
      if (favBackup) {
        dbPayload.portfolio = { ...(dbPayload.portfolio || {}), faviconUrl: favBackup };
      }
      const wallBackup = localStorage.getItem("vignesh_portfolio_wallpapers_backup");
      if (wallBackup) {
        const parsed = JSON.parse(wallBackup);
        if (parsed?.wallpapers && Object.keys(parsed.wallpapers).length > 0) {
          dbPayload.wallpaperConfig = {
            ...(dbPayload.wallpaperConfig || {}),
            ...parsed,
            wallpapers: {
              ...(dbPayload.wallpaperConfig?.wallpapers || {}),
              ...parsed.wallpapers,
            },
          };
        }
      }
      const iconBackup = localStorage.getItem("vignesh_portfolio_desktop_icons");
      if (iconBackup) {
        const parsedIcons = JSON.parse(iconBackup);
        if (Array.isArray(parsedIcons) && parsedIcons.length > 0 && (!dbPayload.desktopIcons || dbPayload.desktopIcons.length === 0)) {
          dbPayload.desktopIcons = parsedIcons;
        }
      }
    } catch {}

    // 5. Merge explicit overrideData (e.g., from WallpaperManager)
    if (overrideData && typeof overrideData === "object") {
      dbPayload = {
        ...dbPayload,
        ...overrideData,
        portfolio: overrideData.portfolio
          ? { ...(dbPayload.portfolio || {}), ...overrideData.portfolio }
          : dbPayload.portfolio,
        wallpaperConfig: overrideData.wallpaperConfig
          ? {
              ...(dbPayload.wallpaperConfig || {}),
              ...overrideData.wallpaperConfig,
              wallpapers: {
                ...(dbPayload.wallpaperConfig?.wallpapers || {}),
                ...(overrideData.wallpaperConfig.wallpapers || {}),
              },
            }
          : dbPayload.wallpaperConfig,
        taskbarSettings: overrideData.taskbarSettings
          ? { ...(dbPayload.taskbarSettings || {}), ...overrideData.taskbarSettings }
          : dbPayload.taskbarSettings,
        desktopIcons: overrideData.desktopIcons || dbPayload.desktopIcons,
        taskbarIcons: overrideData.taskbarIcons || dbPayload.taskbarIcons,
      };
    }

    if (!dbPayload || Object.keys(dbPayload).length === 0) {
      return { success: false, error: "No portfolio data found to sync" };
    }

    // Persist merged state locally
    saveLocalMasterBackup(dbPayload);

    // Attach sync metadata
    const payloadWithMeta = {
      ...dbPayload,
      _driveMeta: {
        syncedAt: new Date().toISOString(),
        syncedBy: cachedUser?.email || "Vignesh Portfolio Admin",
        appVersion: "1.0.0",
      },
    };

    const jsonBlob = new Blob([JSON.stringify(payloadWithMeta, null, 2)], {
      type: "application/json",
    });

    // 3. Check if portfolio-db.json already exists in Portfolio Files folder
    let existingFileId: string | null = null;
    
    try {
      const files = await listDriveFiles(folderId, "portfolio-db.json", true);
      const match = files.find((f) => f.name === "portfolio-db.json");
      if (match) {
        existingFileId = match.id;
      }
    } catch (e) {
      console.warn("Failed to list files in folder, falling back to localStorage", e);
    }

    // NOTE: We deliberately DO NOT fall back to localStorage here if not found in the folder.
    // If it's not in the folder, we want to create a new one inside the folder so the user can see it!

    let finalFileId = existingFileId;

    if (existingFileId) {
      // 4a. Update existing file content via Google Drive API PATCH
      let patchRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: jsonBlob,
        }
      );

      if (patchRes.status === 401) {
        handleExpiredToken();
        const refreshed = await refreshGoogleTokenSilently();
        if (refreshed) {
          patchRes = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${refreshed}`,
                "Content-Type": "application/json",
              },
              body: jsonBlob,
            }
          );
        }
      }

      if (!patchRes.ok) {
        // If patching failed (e.g. file was deleted in Drive), upload fresh
        const newFile = await uploadFileToDrive(
          jsonBlob,
          "portfolio-db.json",
          "application/json",
          folderId
        );
        finalFileId = newFile.id;
      }
    } else {
      // 4b. Upload new portfolio-db.json into Portfolio Files
      const newFile = await uploadFileToDrive(
        jsonBlob,
        "portfolio-db.json",
        "application/json",
        folderId
      );
      finalFileId = newFile.id;
    }

    if (!finalFileId) {
      throw new Error("Failed to obtain file ID for portfolio-db.json on Google Drive");
    }

    // 5. Ensure public reader permission so visitors & server cold-starts can read it
    await makeFilePublicReadable(finalFileId).catch(() => {});

    // 6. Save Drive DB metadata locally and to server
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY_DRIVE_DB_FILE_ID, finalFileId);
      localStorage.setItem(STORAGE_KEY_DRIVE_DB_LAST_SYNCED, nowIso);
    } catch {}

    await fetch("/api/admin/drive-database-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId: finalFileId,
        folderId,
        lastSyncedAt: nowIso,
        userEmail: cachedUser?.email || "",
      }),
    }).catch(() => {});

    window.dispatchEvent(
      new CustomEvent("google_drive_db_synced", {
        detail: { fileId: finalFileId, lastSyncedAt: nowIso },
      })
    );

    return {
      success: true,
      fileId: finalFileId,
      folderId,
      lastSyncedAt: nowIso,
    };
  } catch (err: any) {
    if (
      err?.isAuthExpired ||
      err?.message?.includes("needs refresh") ||
      err?.message?.includes("expired") ||
      err?.message?.includes("UNAUTHENTICATED")
    ) {
      handleExpiredToken();
      console.warn("Google Drive auto-sync noticed session expiration:", err?.message || err);
      return {
        success: false,
        error: "Google account session needs refresh. Click 'Refresh Session' to sync with Google Drive.",
        isAuthExpired: true,
      };
    }
    console.warn("Google Drive DB sync notice:", err?.message || err);
    return {
      success: false,
      error: err?.message || "Failed to sync database to Google Drive",
    };
  }
}

/**
 * Pull the latest master database from Google Drive "Portfolio Files/portfolio-db.json"
 */
export async function pullDatabaseFromDrive(
  fileIdOverride?: string,
  options?: { onlyWallpaperConfig?: boolean }
): Promise<{ success: boolean; data?: any; error?: string }> {
  let token = await getAccessToken();
  if (!token) {
    token = await refreshGoogleTokenSilently();
  }
  let fileId = fileIdOverride;

  // 1. If user is connected to Drive and no explicit override is provided,
  // query Google Drive to find the freshest portfolio-db.json backup!
  if (!fileId && token) {
    try {
      const appFolder = await getOrCreateAppFolder("Portfolio Files");
      const files = await listDriveFiles(appFolder.id, "portfolio-db.json", true);
      if (files && files.length > 0) {
        // listDriveFiles is already ordered by modifiedTime desc
        const match = files.find((f) => f.name === "portfolio-db.json") || files[0];
        if (match) fileId = match.id;
      }
    } catch {}

    if (!fileId) {
      try {
        const allFiles = await listDriveFiles(undefined, "portfolio-db.json", true);
        if (allFiles && allFiles.length > 0) {
          const match = allFiles.find((f) => f.name === "portfolio-db.json") || allFiles[0];
          if (match) fileId = match.id;
        }
      } catch {}
    }
  }

  // 2. Check localStorage if not resolved via live query
  if (!fileId) {
    fileId = localStorage.getItem(STORAGE_KEY_DRIVE_DB_FILE_ID) || undefined;
  }

  // 3. Check server configuration if not in localStorage
  if (!fileId) {
    try {
      const res = await fetch("/api/admin/drive-database-config");
      if (res.ok) {
        const config = await res.json();
        if (config.fileId) fileId = config.fileId;
      }
    } catch {}
  }

  if (!fileId) {
    return {
      success: false,
      error: "No portfolio-db.json found in your Google Drive. Please click 'SYNC TO DRIVE NOW' first to create your master backup.",
    };
  }

  localStorage.setItem(STORAGE_KEY_DRIVE_DB_FILE_ID, fileId);

  let driveData: any = null;

  // METHOD 1: Server-Side Direct Restore (Bypasses browser CORS & token expiry)
  try {
    const srvRes = await fetch("/api/admin/drive-restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId,
        googleToken: token || undefined,
        onlyWallpaperConfig: options?.onlyWallpaperConfig,
      }),
    });
    if (srvRes.ok) {
      const srvJson = await srvRes.json();
      if (srvJson.success && srvJson.data) {
        driveData = srvJson.data;
      }
    }
  } catch (err) {
    console.warn("Server-side restore attempt notice:", err);
  }

  // METHOD 2: Direct Google Drive API v3 download via client
  if (!driveData) {
    try {
      let res: Response | null = null;
      if (token) {
        res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          const refreshedToken = await refreshGoogleTokenSilently();
          if (refreshedToken) {
            token = refreshedToken;
            res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
      }

      // Proxy fallback
      if (!res || !res.ok) {
        res = await fetch(`/api/drive-proxy/${fileId}`);
      }

      // Public web export fallback
      if (!res || !res.ok) {
        res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
      }

      if (res && res.ok) {
        const text = await res.text();
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          driveData = JSON.parse(text);
        }
      }
    } catch (e) {
      console.warn("Client-side download fallback notice:", e);
    }
  }

  if (!driveData || typeof driveData !== "object") {
    return {
      success: false,
      error: "Could not download portfolio-db.json from Google Drive. Please check your Google Drive connection.",
    };
  }

  // 3. Save to local master backup
  saveLocalMasterBackup(driveData);

  // 4. Save to server database using both import-all and sync-master with proper auth
  const tokenStr = localStorage.getItem("admin_token") || localStorage.getItem("portfolio_admin_token") || "admin";
  try {
    await fetch("/api/admin/import-all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenStr}`,
      },
      body: JSON.stringify(driveData),
    });
  } catch (e) {
    console.warn("import-all notice:", e);
  }

  try {
    await fetch("/api/admin/sync-master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driveData),
    });
  } catch (e) {
    console.warn("sync-master notice:", e);
  }

  // 4b. Synchronize with Firebase Firestore master state immediately
  try {
    await syncMasterStateToFirestore(driveData, true);
    console.log("✅ Google Drive restore synced to Firebase Firestore successfully!");
  } catch (e) {
    console.warn("Firebase Firestore restore sync notice:", e);
  }

  // 5. Update localStorage backups and dispatch events for immediate zero-delay UI refresh
  if (driveData.wallpaperConfig) {
    try {
      localStorage.setItem("vignesh_portfolio_wallpapers_backup", JSON.stringify(driveData.wallpaperConfig));
      localStorage.setItem("wallpaper_refresh_trigger", Date.now().toString());
    } catch {}
    window.dispatchEvent(new CustomEvent("wallpaper_updated", { detail: driveData.wallpaperConfig }));
  }

  if (driveData.portfolio) {
    if (driveData.portfolio.faviconUrl) {
      try {
        localStorage.setItem("vignesh_portfolio_favicon_backup", driveData.portfolio.faviconUrl);
      } catch {}
    }
    window.dispatchEvent(new CustomEvent("portfolio_updated", { detail: driveData.portfolio }));
    window.dispatchEvent(new CustomEvent("favicon_updated", { detail: driveData.portfolio }));
  }

  if (driveData.desktopIcons && Array.isArray(driveData.desktopIcons)) {
    try {
      localStorage.setItem("vignesh_portfolio_desktop_icons", JSON.stringify(driveData.desktopIcons));
    } catch {}
    window.dispatchEvent(new CustomEvent("desktop_icons_updated", { detail: driveData.desktopIcons }));
  }

  if (driveData.taskbarSettings) {
    try {
      localStorage.setItem("vignesh_portfolio_taskbar_settings", JSON.stringify(driveData.taskbarSettings));
    } catch {}
    window.dispatchEvent(new CustomEvent("taskbar_settings_updated", { detail: driveData.taskbarSettings }));
    if (driveData.taskbarSettings.startMenu) {
      window.dispatchEvent(new CustomEvent("start_menu_updated", { detail: driveData.taskbarSettings.startMenu }));
    }
  }

  if (driveData.taskbarIcons && Array.isArray(driveData.taskbarIcons)) {
    try {
      localStorage.setItem("vignesh_portfolio_taskbar_icons", JSON.stringify(driveData.taskbarIcons));
    } catch {}
    window.dispatchEvent(new CustomEvent("taskbar_icons_updated", { detail: driveData.taskbarIcons }));
  }

  if (Array.isArray(driveData.projects)) {
    window.dispatchEvent(new CustomEvent("projects_updated", { detail: driveData.projects }));
  }

  // Notify all master listeners
  window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: driveData }));

  return { success: true, data: driveData };
}

export interface DriveWallpaperSyncResult {
  success: boolean;
  count: number;
  folderName: string;
  folderId?: string;
  syncedSlots: string[];
  wallpaperConfig: any;
  message: string;
}

/**
 * Parses wallpaper file name to detect matching WallpaperCategory and DeviceType
 */
export function parseWallpaperFilename(fileName: string): { category: WallpaperCategory; device: DeviceType } {
  const clean = fileName.toLowerCase().replace(/[-_.]+/g, " ");

  // Detect device type
  let device: DeviceType = "desktop";
  if (
    clean.includes("mobile") ||
    clean.includes("phone") ||
    clean.includes("portrait") ||
    clean.includes("vert") ||
    clean.includes("iphone") ||
    clean.includes("android")
  ) {
    device = "mobile";
  } else if (clean.includes("tablet") || clean.includes("ipad") || clean.includes("tab")) {
    device = "tablet";
  }

  // Detect category
  let category: WallpaperCategory = "sunny";
  if (
    clean.includes("night rainy") ||
    clean.includes("night rain") ||
    (clean.includes("night") && clean.includes("rain"))
  ) {
    category = "night_rainy";
  } else if (
    clean.includes("night") ||
    clean.includes("dark") ||
    clean.includes("midnight") ||
    clean.includes("moon") ||
    clean.includes("stars")
  ) {
    category = "night";
  } else if (
    clean.includes("early morning") ||
    clean.includes("dawn") ||
    clean.includes("sunrise") ||
    clean.includes("morning")
  ) {
    category = "early_morning";
  } else if (
    clean.includes("evening") ||
    clean.includes("sunset") ||
    clean.includes("dusk") ||
    clean.includes("twilight") ||
    clean.includes("golden hour")
  ) {
    category = "evening";
  } else if (
    clean.includes("rain") ||
    clean.includes("monsoon") ||
    clean.includes("storm") ||
    clean.includes("thunder") ||
    clean.includes("drizzle")
  ) {
    category = "rainy";
  } else if (
    clean.includes("snow") ||
    clean.includes("winter") ||
    clean.includes("ice") ||
    clean.includes("blizzard")
  ) {
    category = "snowfall";
  } else if (
    clean.includes("cloud") ||
    clean.includes("overcast") ||
    clean.includes("fog") ||
    clean.includes("mist") ||
    clean.includes("haze")
  ) {
    category = "cloudy";
  } else if (
    clean.includes("sun") ||
    clean.includes("day") ||
    clean.includes("light") ||
    clean.includes("clear")
  ) {
    category = "sunny";
  }

  return { category, device };
}

/**
 * Automatically scan Google Drive wallpaper folder ("Portfolio Files/Wallpaper")
 * and sync all wallpaper images live into the portfolio app without manual slot configuration.
 */
export async function syncWallpapersFromDriveFolder(
  preferredFolderName: string = "Portfolio Files/Wallpaper"
): Promise<DriveWallpaperSyncResult> {
  // 1. Check Google Drive connection and token
  let token = await getAccessToken();
  if (!token && isUserConnected()) {
    token = await refreshGoogleTokenSilently();
  }
  if (!token) {
    throw new GoogleAuthExpiredError("Google account not connected. Please click 'Sign in with Google' first.");
  }

  // 2. Locate or create the Wallpaper folder in Google Drive
  let targetFolder: DriveFileItem | null = null;
  try {
    targetFolder = await getOrCreateAppFolder(preferredFolderName);
  } catch {
    // If folder creation fails, fallback to root or search
  }

  let files: DriveFileItem[] = [];
  if (targetFolder?.id) {
    files = await listDriveFiles(targetFolder.id);
  }

  // If the target folder is empty or not found, also check parent "Portfolio Files"
  if (files.length === 0) {
    try {
      const parentFolder = await getOrCreateAppFolder("Portfolio Files");
      if (parentFolder?.id && parentFolder.id !== targetFolder?.id) {
        const parentFiles = await listDriveFiles(parentFolder.id);
        const subFolder = parentFiles.find(
          (f) => f.mimeType === "application/vnd.google-apps.folder" && /wallpaper/i.test(f.name)
        );
        if (subFolder) {
          targetFolder = subFolder;
          files = await listDriveFiles(subFolder.id);
        } else {
          // If images exist directly in Portfolio Files, use them
          const imgInParent = parentFiles.filter(
            (f) => f.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(f.name)
          );
          if (imgInParent.length > 0) {
            targetFolder = parentFolder;
            files = imgInParent;
          }
        }
      }
    } catch {}
  }

  // Filter for valid image files
  const imageFiles = files.filter(
    (f) => f.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(f.name)
  );

  if (imageFiles.length === 0) {
    return {
      success: false,
      count: 0,
      folderName: targetFolder?.name || preferredFolderName,
      folderId: targetFolder?.id,
      syncedSlots: [],
      wallpaperConfig: null,
      message: `No images found in Google Drive folder "${targetFolder?.name || preferredFolderName}". Please upload image files to this folder.`,
    };
  }

  // 3. Ensure all image files are publicly readable so anyone visiting the site can see them
  await Promise.all(
    imageFiles.map(async (file) => {
      try {
        await makeFilePublicReadable(file.id);
      } catch {}
    })
  );

  // 4. Load current wallpaper configuration
  let currentConfig: any = null;
  try {
    const srvRes = await fetch("/api/wallpapers");
    if (srvRes.ok) currentConfig = await srvRes.json();
  } catch {}

  if (!currentConfig || !currentConfig.wallpapers) {
    const local = getLocalMasterBackup();
    if (local?.wallpaperConfig) currentConfig = local.wallpaperConfig;
  }

  if (!currentConfig) {
    currentConfig = {
      wallpapers: {},
      fallbackUrl: "",
      fallbackLocation: { city: "Trichy, India", lat: 10.7905, lon: 78.7047 },
      autoMode: true,
      manualCategory: "sunny",
      manualDevice: "desktop",
    };
  }

  const updatedWallpapers = { ...(currentConfig.wallpapers || {}) };
  const syncedSlots: string[] = [];

  // 5. Intelligently map each image to its slot
  imageFiles.forEach((file, index) => {
    const { category, device } = parseWallpaperFilename(file.name);
    let slotKey = `${category}_${device}`;

    // If slot already assigned by a previous image with the exact same name, assign to alternate device
    if (syncedSlots.includes(slotKey) && index > 0) {
      if (device === "desktop" && !updatedWallpapers[`${category}_mobile`]) {
        slotKey = `${category}_mobile`;
      } else if (device === "desktop" && !updatedWallpapers[`${category}_tablet`]) {
        slotKey = `${category}_tablet`;
      }
    }

    const driveDirectUrl = getDirectDriveMediaUrl(file.id);
    const sizeInKb = file.size
      ? (parseInt(file.size, 10) / 1024).toFixed(1) + " KB (Drive)"
      : "Drive Image";

    updatedWallpapers[slotKey] = {
      url: driveDirectUrl,
      fileName: file.name,
      fileSize: sizeInKb,
      updatedAt: file.modifiedTime || new Date().toISOString(),
      driveFileId: file.id,
    };

    syncedSlots.push(slotKey);
  });

  // Pick primary fallback URL (sunny_desktop or first synced)
  const primaryUrl =
    updatedWallpapers["sunny_desktop"]?.url ||
    updatedWallpapers[syncedSlots[0]]?.url ||
    currentConfig.fallbackUrl ||
    "";
  const primaryName =
    updatedWallpapers["sunny_desktop"]?.fileName ||
    updatedWallpapers[syncedSlots[0]]?.fileName ||
    currentConfig.fallbackFileName ||
    "";

  const newWallpaperConfig: WallpaperLibraryConfig = {
    ...currentConfig,
    wallpapers: updatedWallpapers,
    fallbackUrl: primaryUrl,
    fallbackFileName: primaryName,
  };

  // 6. Save to Server
  try {
    const adminToken = typeof localStorage !== "undefined" ? localStorage.getItem("admin_token") : null;
    await fetch("/api/wallpapers", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
      body: JSON.stringify(newWallpaperConfig),
    });
  } catch (err) {
    console.warn("Could not save wallpaper config to server API, saved to local backups:", err);
  }

  // 7. Save to local backups
  saveLocalMasterBackup({ wallpaperConfig: newWallpaperConfig });
  try {
    localStorage.setItem("vignesh_portfolio_wallpapers_backup", JSON.stringify(newWallpaperConfig));
    localStorage.setItem("wallpaper_refresh_trigger", Date.now().toString());
  } catch {}

  // 8. Fire Real-time Events & Broadcasts for Instant Live Update across all tabs and open windows
  window.dispatchEvent(new CustomEvent("wallpaper_updated", { detail: newWallpaperConfig }));
  window.dispatchEvent(new CustomEvent("cms_master_updated", { detail: { wallpaperConfig: newWallpaperConfig } }));

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel("portfolio_wallpaper_channel");
      ch.postMessage({ type: "WALLPAPER_UPDATED", config: newWallpaperConfig });
      ch.close();
    }
  } catch {}

  return {
    success: true,
    count: syncedSlots.length,
    folderName: targetFolder?.name || preferredFolderName,
    folderId: targetFolder?.id,
    syncedSlots,
    wallpaperConfig: newWallpaperConfig,
    message: `Successfully synced ${syncedSlots.length} wallpaper(s) from Google Drive folder "${targetFolder?.name || preferredFolderName}"!`,
  };
}


