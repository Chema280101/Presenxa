// Offline Queue Manager for GPS Pings using IndexedDB

export interface OfflinePing {
  id?: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  source?: string;
}

const DB_NAME = "AsistControlOfflineDB";
const DB_VERSION = 1;
const STORE_NAME = "offline_pings";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB no está disponible en este entorno."));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addOfflinePing(ping: Omit<OfflinePing, "id">): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(ping);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("[IndexedDB] Error al guardar ping offline:", err);
    return -1;
  }
}

export async function getOfflinePings(): Promise<OfflinePing[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("[IndexedDB] Error al recuperar pings offline:", err);
    return [];
  }
}

export async function clearOfflinePings(ids?: number[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      if (!ids || ids.length === 0) {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } else {
        let completed = 0;
        let hasError = false;
        ids.forEach((id) => {
          const req = store.delete(id);
          req.onsuccess = () => {
            completed++;
            if (completed === ids.length && !hasError) resolve();
          };
          req.onerror = (e) => {
            hasError = true;
            reject(e);
          };
        });
      }
    });
  } catch (err) {
    console.error("[IndexedDB] Error al limpiar pings offline:", err);
  }
}

export async function getOfflinePingsCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("[IndexedDB] Error al contar pings offline:", err);
    return 0;
  }
}
