/**
 * Persist wallpaper images locally (IndexedDB) so refresh can paint from disk
 * before the network round-trip completes.
 */

const DB_NAME = "coeurvers-wallpaper-v1"
const STORE = "wallpapers"
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "url" })
    }
  })
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getWallpaperBlob(sourceUrl: string): Promise<Blob | null> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, "readonly")
    const row = await idbRequest(tx.objectStore(STORE).get(sourceUrl) as IDBRequest<{ url: string; blob: Blob } | undefined>)
    db.close()
    return row?.blob ?? null
  } catch {
    return null
  }
}

export async function putWallpaperBlob(sourceUrl: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
      tx.objectStore(STORE).put({ url: sourceUrl, blob, savedAt: Date.now() })
    })
  } catch {
    /* ignore quota / private mode */
  }
}

/** Create an object URL from cache; caller must revoke when done. */
export async function getCachedWallpaperObjectUrl(sourceUrl: string): Promise<string | null> {
  const blob = await getWallpaperBlob(sourceUrl)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export async function fetchAndCacheWallpaper(sourceUrl: string): Promise<Blob> {
  const res = await fetch(sourceUrl, { mode: "cors", credentials: "omit", cache: "force-cache" })
  if (!res.ok) throw new Error(`wallpaper fetch ${res.status}`)
  return res.blob()
}
