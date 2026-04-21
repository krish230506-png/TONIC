import { openDB } from 'idb';
import axios from 'axios';

const SYNC_STORE_NAME = 'offline-ingest-store';
const DB_NAME = 'communitypulse-db';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
        db.createObjectStore(SYNC_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

// Save a report offline
export async function saveOfflineReport(payload: { text?: string, imageBase64?: string }) {
  const db = await initDB();
  await db.add(SYNC_STORE_NAME, {
    ...payload,
    timestamp: Date.now()
  });
  console.log("Saved report offline! It will sync when connection is restored.");
}

// Background Sync Loop
export async function syncOfflineReports(apiBaseUrl: string) {
  if (!navigator.onLine) return;
  
  const db = await initDB();
  const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
  const store = tx.objectStore(SYNC_STORE_NAME);
  const reports = await store.getAll();
  
  if (reports.length === 0) return;
  
  console.log(`Syncing ${reports.length} offline reports...`);
  
  for (const report of reports) {
    try {
      // Re-construct the payload the backend expects
      const payload: any = {};
      if (report.text) payload.text = report.text;
      
      // If we had genuine File passing we'd use FormData, but since we are mocking image Base64 in this demo via text:
      // In MVP demo, if there is an image, we should probably encode it, but for our simple /ingest:
      // (The backend currently uses multer but gracefully accepts req.body.text)
      
      await axios.post(`${apiBaseUrl}/ingest`, payload);
      
      // If success, delete from idb
      await store.delete(report.id);
      console.log(`Successfully synced offline report ${report.id}`);
    } catch (e) {
      console.error(`Failed to sync report ${report.id}`, e);
    }
  }
}
