import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  memoryLocalCache,
  setLogLevel,
  getDocFromServer,
} from "firebase/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

// Suppress internal network retry warnings from Firestore logger
try {
  setLogLevel("silent");
} catch {}
import {
  PortfolioInfo,
  Project,
  Skill,
  ContactInfo,
  DesktopIcon,
  Experience,
  TaskbarSettings,
  TaskbarIcon,
  ContactMessage,
  WallpaperLibraryConfig,
} from "../types";

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const databaseId = (firebaseConfigJson as any).firestoreDatabaseId || "(default)";

// Initialize Firebase App Singleton
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with fast memory cache and iframe compatibility
function initFirestoreInstance(): Firestore {
  try {
    const settings = {
      localCache: memoryLocalCache(),
    };
    if (databaseId && databaseId !== "(default)") {
      return initializeFirestore(app, settings, databaseId);
    } else {
      return initializeFirestore(app, settings);
    }
  } catch {
    return databaseId && databaseId !== "(default)"
      ? getFirestore(app, databaseId)
      : getFirestore(app);
  }
}

export const db: Firestore = initFirestoreInstance();

export const IS_FIREBASE_CONNECTED = true;

// Test Firestore connection on boot as recommended by Firebase Skill
if (IS_FIREBASE_CONNECTED && typeof window !== "undefined") {
  async function testConnection() {
    try {
      await getDocFromServer(doc(db, "portfolio", "main"));
    } catch (error) {
      if (error instanceof Error && (error.message.includes("client is offline") || error.message.includes("Database is closing"))) {
        console.warn("Firestore running in resilient offline/cache mode.");
      }
    }
  }
  testConnection();
}

// ==========================================
// FIRESTORE QUOTA & CIRCUIT BREAKER SHIELD
// ==========================================

const SESSION_QUOTA_KEY = "vignesh_fs_quota_exhausted";
let isFirestoreQuotaExhausted = false;
let quotaCooldownUntil = 0;
let masterSyncTimeout: any = null;
let latestPendingState: any = null;

export function isFirestoreWritePaused(): boolean {
  try {
    const stored = sessionStorage.getItem(SESSION_QUOTA_KEY);
    if (stored && Number(stored) > Date.now()) {
      return true;
    }
  } catch {}
  if (!isFirestoreQuotaExhausted) return false;
  if (Date.now() > quotaCooldownUntil) {
    isFirestoreQuotaExhausted = false;
    try { sessionStorage.removeItem(SESSION_QUOTA_KEY); } catch {}
    return false;
  }
  return true;
}

export function triggerFirestoreQuotaPause(reason?: string) {
  isFirestoreQuotaExhausted = true;
  // Cooldown for 30 minutes to prevent backend overloading and retry loops
  quotaCooldownUntil = Date.now() + 30 * 60 * 1000;
  try {
    sessionStorage.setItem(SESSION_QUOTA_KEY, String(quotaCooldownUntil));
  } catch {}
  console.warn(`[Firestore Circuit Breaker] Cloud writes paused (cooldown active): ${reason || 'Quota exceeded'}`);
}

function handleWriteException(err: any, context: string): boolean {
  const errMsg = err?.message || String(err);
  const errCode = err?.code;
  
  if (
    errCode === "resource-exhausted" ||
    errMsg.includes("Quota limit exceeded") ||
    errMsg.includes("quota") ||
    errMsg.includes("Quota") ||
    errCode === "unavailable"
  ) {
    triggerFirestoreQuotaPause(errMsg);
    return false;
  }
  
  console.warn(`Firestore ${context} notice:`, errMsg);
  return false;
}

// ==========================================
// FIRESTORE ERROR HANDLING (SKILL SPEC)
// ==========================================

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.warn(`[Firestore Notice] ${operationType} on ${path}:`, errInfo.error);
}

// ==========================================
// FIRESTORE SANITIZATION HELPER
// Strips all undefined fields recursively
// ==========================================

function isPlainObject(obj: any): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (isPlainObject(data)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// ==========================================
// FIRESTORE SYNC & PERSISTENCE HELPERS
// ==========================================

export async function fetchPortfolioFromFirestore(): Promise<PortfolioInfo | null> {
  try {
    const docRef = doc(db, "portfolio", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PortfolioInfo;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchPortfolio notice:", err);
    return null;
  }
}

export async function savePortfolioToFirestore(data: Partial<PortfolioInfo>): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "portfolio", "main");
    const cleaned = sanitizeForFirestore(data);
    await setDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });

    // Keep cms_state/master in sync
    const masterDocRef = doc(db, "cms_state", "master");
    await setDoc(masterDocRef, { portfolio: cleaned, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (err) {
    return handleWriteException(err, "savePortfolio");
  }
}

export async function fetchProjectsFromFirestore(): Promise<Project[] | null> {
  try {
    const colRef = collection(db, "projects");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items: Project[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        items.push({
          id: doc.id,
          ...d,
        } as unknown as Project);
      });
      return items;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchProjects notice:", err);
    return null;
  }
}

export async function saveProjectsToFirestore(projects: Project[]): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const colRef = collection(db, "projects");
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    
    // Clean up any Firestore docs not in current list
    const currentIds = new Set(projects.map((p) => String(p.id)).filter(Boolean));
    snap.forEach((docSnap) => {
      if (!currentIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    for (const p of projects) {
      const pId = p.id ? String(p.id) : `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const docRef = doc(db, "projects", pId);
      const cleaned = sanitizeForFirestore({ ...p, id: pId });
      batch.set(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
    }

    const masterDocRef = doc(db, "cms_state", "master");
    batch.set(masterDocRef, { projects: sanitizeForFirestore(projects), updatedAt: serverTimestamp() }, { merge: true });

    await batch.commit();
    return true;
  } catch (err) {
    return handleWriteException(err, "saveProjects");
  }
}

export async function deleteAllProjectsFromFirestore(): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const colRef = collection(db, "projects");
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    const masterDocRef = doc(db, "cms_state", "master");
    batch.set(masterDocRef, { projects: [], updatedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
    return true;
  } catch (err) {
    return handleWriteException(err, "deleteAllProjects");
  }
}

export async function deleteProjectFromFirestore(projectId: string): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused() || !projectId) return false;
  try {
    const docRef = doc(db, "projects", projectId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    return handleWriteException(err, "deleteProject");
  }
}

export async function fetchSkillsFromFirestore(): Promise<Skill[] | null> {
  try {
    const colRef = collection(db, "skills");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items: Skill[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Skill);
      });
      return items;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchSkills notice:", err);
    return null;
  }
}

export async function saveSkillsToFirestore(skills: Skill[]): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const colRef = collection(db, "skills");
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    for (const s of skills) {
      const sId = s.id ? String(s.id) : `skill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const docRef = doc(db, "skills", sId);
      const cleaned = sanitizeForFirestore({ ...s, id: sId });
      batch.set(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
    }

    const masterDocRef = doc(db, "cms_state", "master");
    batch.set(masterDocRef, { skills: sanitizeForFirestore(skills), updatedAt: serverTimestamp() }, { merge: true });

    await batch.commit();
    return true;
  } catch (err) {
    return handleWriteException(err, "saveSkills");
  }
}

export async function deleteSkillFromFirestore(skillId: string): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused() || !skillId) return false;
  try {
    const docRef = doc(db, "skills", skillId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    return handleWriteException(err, "deleteSkill");
  }
}

export async function fetchExperiencesFromFirestore(): Promise<Experience[] | null> {
  try {
    const colRef = collection(db, "experiences");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items: Experience[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Experience);
      });
      return items;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchExperiences notice:", err);
    return null;
  }
}

export async function saveExperiencesToFirestore(experiences: Experience[]): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const colRef = collection(db, "experiences");
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    for (const exp of experiences) {
      const expId = exp.id ? String(exp.id) : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const docRef = doc(db, "experiences", expId);
      const cleaned = sanitizeForFirestore({ ...exp, id: expId });
      batch.set(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
    }

    const masterDocRef = doc(db, "cms_state", "master");
    batch.set(masterDocRef, { experiences: sanitizeForFirestore(experiences), updatedAt: serverTimestamp() }, { merge: true });

    await batch.commit();
    return true;
  } catch (err) {
    return handleWriteException(err, "saveExperiences");
  }
}

export async function deleteExperienceFromFirestore(experienceId: string): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused() || !experienceId) return false;
  try {
    const docRef = doc(db, "experiences", experienceId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    return handleWriteException(err, "deleteExperience");
  }
}

export async function fetchDesktopIconsFromFirestore(): Promise<DesktopIcon[] | null> {
  try {
    const docRef = doc(db, "settings", "desktopIcons");
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data().icons)) {
      return snap.data().icons as DesktopIcon[];
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchDesktopIcons notice:", err);
    return null;
  }
}

export async function saveDesktopIconsToFirestore(icons: DesktopIcon[]): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "settings", "desktopIcons");
    const cleaned = sanitizeForFirestore(icons);
    await setDoc(docRef, { icons: cleaned, updatedAt: serverTimestamp() }, { merge: true });

    // Keep master document in sync
    const masterRef = doc(db, "cms_state", "master");
    await setDoc(masterRef, { desktopIcons: cleaned, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (err) {
    return handleWriteException(err, "saveDesktopIcons");
  }
}

export async function fetchTaskbarSettingsFromFirestore(): Promise<TaskbarSettings | null> {
  try {
    const docRef = doc(db, "settings", "taskbar");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as TaskbarSettings;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchTaskbarSettings notice:", err);
    return null;
  }
}

export async function saveTaskbarSettingsToFirestore(settings: TaskbarSettings): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "settings", "taskbar");
    const cleaned = sanitizeForFirestore(settings);
    await setDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });

    // Keep master document in sync
    const masterRef = doc(db, "cms_state", "master");
    await setDoc(masterRef, { taskbarSettings: cleaned, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (err) {
    return handleWriteException(err, "saveTaskbarSettings");
  }
}

export async function fetchTaskbarIconsFromFirestore(): Promise<TaskbarIcon[] | null> {
  try {
    const docRef = doc(db, "settings", "taskbarIcons");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.icons) ? data.icons : null;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchTaskbarIcons notice:", err);
    return null;
  }
}

export async function saveTaskbarIconsToFirestore(icons: TaskbarIcon[]): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "settings", "taskbarIcons");
    const cleaned = sanitizeForFirestore(icons);
    await setDoc(docRef, { icons: cleaned, updatedAt: serverTimestamp() }, { merge: true });

    // Keep master document in sync
    const masterRef = doc(db, "cms_state", "master");
    await setDoc(masterRef, { taskbarIcons: cleaned, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (err) {
    return handleWriteException(err, "saveTaskbarIcons");
  }
}

// Cutoff for purging all legacy wallpapers from Firestore (2026-09-07T18:15:00.000Z).
// Only newly uploaded wallpapers created after this timestamp will ever be synced or recognized.
export const WALLPAPER_PURGE_CUTOFF = "2026-09-07T18:15:00.000Z";

export async function fetchWallpapersFromFirestore(): Promise<WallpaperLibraryConfig | null> {
  try {
    const docRef = doc(db, "settings", "wallpapers");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as WallpaperLibraryConfig;
      // Only retain newly uploaded wallpapers created after the purge cutoff
      const freshWallpapers: Record<string, any> = {};
      if (data?.wallpapers) {
        const cutoffTime = new Date(WALLPAPER_PURGE_CUTOFF).getTime();
        for (const [key, val] of Object.entries(data.wallpapers)) {
          if (val && typeof val === "object" && (val as any).updatedAt) {
            const up = new Date((val as any).updatedAt).getTime();
            if (up >= cutoffTime) {
              freshWallpapers[key] = val;
            }
          }
        }
      }
      return {
        ...data,
        wallpapers: freshWallpapers,
        fallbackUrl: Object.keys(freshWallpapers).length > 0 ? (data.fallbackUrl || "") : "",
        fallbackFileName: Object.keys(freshWallpapers).length > 0 ? (data.fallbackFileName || "") : "",
      };
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchWallpapers notice:", err);
    return null;
  }
}

export function cleanWallpaperConfigForFirestore(config: WallpaperLibraryConfig): WallpaperLibraryConfig {
  if (!config || typeof config !== "object") return config;
  const cleanWallpapers: Record<string, any> = {};
  for (const [key, val] of Object.entries(config.wallpapers || {})) {
    if (!val || typeof val !== "object") continue;
    const v = val as any;
    let url = v.url || "";
    // If it has driveFileId, ensure url is the public direct CDN link, never bloated base64!
    if (v.driveFileId && (url.startsWith("data:") || !url)) {
      url = `https://lh3.googleusercontent.com/d/${v.driveFileId}`;
    }
    cleanWallpapers[key] = {
      ...v,
      url
    };
  }
  return {
    ...config,
    wallpapers: cleanWallpapers
  };
}

export async function saveWallpapersToFirestore(config: WallpaperLibraryConfig): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "settings", "wallpapers");
    const cleanedConfig = cleanWallpaperConfigForFirestore(config);
    const cleaned = sanitizeForFirestore(cleanedConfig);
    // Complete overwrite ensures deleted wallpaper slots are actually removed from Firestore
    await setDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() });

    // Keep cms_state/master in sync
    const masterDocRef = doc(db, "cms_state", "master");
    await updateDoc(masterDocRef, { wallpaperConfig: cleaned, updatedAt: serverTimestamp() }).catch(async () => {
      await setDoc(masterDocRef, { wallpaperConfig: cleaned, updatedAt: serverTimestamp() }, { merge: true });
    });
    return true;
  } catch (err) {
    console.error("Failed to save wallpapers to Firestore:", err);
    return handleWriteException(err, "saveWallpapers");
  }
}

/**
 * Explicitly delete a single wallpaper slot from Firestore so it never resurrects
 */
export async function deleteWallpaperSlotFromFirestore(key: string): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "settings", "wallpapers");
    await updateDoc(docRef, {
      [`wallpapers.${key}`]: deleteField(),
      updatedAt: serverTimestamp()
    }).catch(() => {});

    const masterDocRef = doc(db, "cms_state", "master");
    await updateDoc(masterDocRef, {
      [`wallpaperConfig.wallpapers.${key}`]: deleteField(),
      updatedAt: serverTimestamp()
    }).catch(() => {});

    return true;
  } catch (err) {
    console.warn("deleteWallpaperSlotFromFirestore error:", err);
    return false;
  }
}

/**
 * Explicitly delete all device slots for a weather category from Firestore
 */
export async function deleteWallpaperCategoryFromFirestore(category: string): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const keys = [`${category}_desktop`, `${category}_tablet`, `${category}_mobile`];
    const docRef = doc(db, "settings", "wallpapers");
    const updates: Record<string, any> = { updatedAt: serverTimestamp() };
    const masterUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
    for (const k of keys) {
      updates[`wallpapers.${k}`] = deleteField();
      masterUpdates[`wallpaperConfig.wallpapers.${k}`] = deleteField();
    }
    await updateDoc(docRef, updates).catch(() => {});

    const masterDocRef = doc(db, "cms_state", "master");
    await updateDoc(masterDocRef, masterUpdates).catch(() => {});

    return true;
  } catch (err) {
    console.warn("deleteWallpaperCategoryFromFirestore error:", err);
    return false;
  }
}

export async function fetchContactInfoFromFirestore(): Promise<ContactInfo | null> {
  try {
    const docRef = doc(db, "contact", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ContactInfo;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchContactInfo notice:", err);
    return null;
  }
}

export async function saveContactInfoToFirestore(contact: ContactInfo): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "contact", "main");
    const cleaned = sanitizeForFirestore(contact);
    await setDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });

    // Keep cms_state/master in sync
    const masterDocRef = doc(db, "cms_state", "master");
    await setDoc(masterDocRef, { contact: cleaned, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (err) {
    return handleWriteException(err, "saveContactInfo");
  }
}

// ==========================================
// CONTACT MESSAGES SUBMISSION & LISTENING
// ==========================================

export async function sendMessageToFirestore(message: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<string | null> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return null;
  try {
    const colRef = collection(db, "messages");
    const cleaned = sanitizeForFirestore({
      name: message.name || "Anonymous",
      email: message.email || "",
      subject: message.subject || "No Subject",
      message: message.message || "",
      createdAt: new Date().toISOString(),
      read: false,
    });
    const docAdded = await addDoc(colRef, {
      ...cleaned,
      timestamp: serverTimestamp(),
    });
    return docAdded.id;
  } catch (err) {
    handleWriteException(err, "sendMessage");
    return null;
  }
}

export async function fetchMessagesFromFirestore(): Promise<ContactMessage[]> {
  try {
    const colRef = collection(db, "messages");
    const snap = await getDocs(colRef);
    const msgs: ContactMessage[] = [];
    snap.forEach((d) => {
      const data = d.data();
      msgs.push({
        id: d.id,
        name: data.name || "Anonymous",
        email: data.email || "",
        message: data.message || "",
        date: data.createdAt || data.date || new Date().toISOString(),
        read: Boolean(data.read),
      });
    });
    msgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return msgs;
  } catch (err) {
    console.warn("Firestore fetchMessages notice:", err);
    return [];
  }
}

export async function markMessageReadInFirestore(id: string, read: boolean = true): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "messages", id);
    await setDoc(docRef, { read, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (err) {
    return handleWriteException(err, "markMessageRead");
  }
}

export async function deleteMessageFromFirestore(id: string): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused()) return false;
  try {
    const docRef = doc(db, "messages", id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    return handleWriteException(err, "deleteMessage");
  }
}

// ==========================================
// MASTER DATABASE SYNC
// ==========================================

export async function syncMasterStateToFirestore(state: any, immediate: boolean = false): Promise<boolean> {
  if (!IS_FIREBASE_CONNECTED || isFirestoreWritePaused() || !state) return false;
  latestPendingState = state;

  const executeSync = async () => {
    if (!latestPendingState || isFirestoreWritePaused()) return;
    const toSave = latestPendingState;
    latestPendingState = null;
    try {
      const docRef = doc(db, "cms_state", "master");
      let prepared = toSave;
      if (prepared && prepared.wallpaperConfig) {
        prepared = {
          ...prepared,
          wallpaperConfig: cleanWallpaperConfigForFirestore(prepared.wallpaperConfig)
        };
      }
      const cleaned = sanitizeForFirestore(prepared);
      await setDoc(
        docRef,
        {
          ...cleaned,
          lastSyncedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      handleWriteException(err, "syncMasterState");
    }
  };

  if (immediate) {
    if (masterSyncTimeout) clearTimeout(masterSyncTimeout);
    return executeSync().then(() => true);
  }

  if (masterSyncTimeout) clearTimeout(masterSyncTimeout);
  masterSyncTimeout = setTimeout(() => {
    executeSync();
  }, 400);

  return true;
}

export async function fetchMasterStateFromFirestore(): Promise<any | null> {
  if (!IS_FIREBASE_CONNECTED) return null;
  try {
    const docRef = doc(db, "cms_state", "master");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      // Only keep newly uploaded wallpapers after the purge cutoff
      if (data && data.wallpaperConfig) {
        const freshWallpapers: Record<string, any> = {};
        if (data.wallpaperConfig.wallpapers) {
          const cutoffTime = new Date(WALLPAPER_PURGE_CUTOFF).getTime();
          for (const [key, val] of Object.entries(data.wallpaperConfig.wallpapers)) {
            if (val && typeof val === "object" && (val as any).updatedAt) {
              const up = new Date((val as any).updatedAt).getTime();
              if (up >= cutoffTime) {
                freshWallpapers[key] = val;
              }
            }
          }
        }
        data.wallpaperConfig = {
          ...data.wallpaperConfig,
          wallpapers: freshWallpapers,
          fallbackUrl: Object.keys(freshWallpapers).length > 0 ? (data.wallpaperConfig.fallbackUrl || "") : "",
          fallbackFileName: Object.keys(freshWallpapers).length > 0 ? (data.wallpaperConfig.fallbackFileName || "") : "",
        };
      }
      return data;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchMasterState error:", err);
    return null;
  }
}

export function subscribeToMasterStateFromFirestore(
  onUpdate: (state: any) => void,
  onError?: (err: any) => void
): () => void {
  if (!IS_FIREBASE_CONNECTED) return () => {};
  try {
    const docRef = doc(db, "cms_state", "master");
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data());
        }
      },
      (err) => {
        console.warn("Firestore master state listener notice:", err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Firestore subscribe error:", err);
    if (onError) onError(err);
    return () => {};
  }
}

