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

// Wipe all pending offline reports (use when resetting for demo)
export async function clearOfflineQueue(): Promise<void> {
  const db = await initDB();
  await db.clear(SYNC_STORE_NAME);
  console.log('🗑️ Offline queue cleared.');
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
export async function syncOfflineReports(apiBaseUrl: string, onSyncStart?: (count: number) => void): Promise<number> {
  if (!navigator.onLine) return 0;
  
  const db = await initDB();

  // Read all pending reports first (separate transaction)
  const reports = await db.getAll(SYNC_STORE_NAME);
  
  if (reports.length === 0) return 0;
  
  if (onSyncStart) onSyncStart(reports.length);
  console.log(`Syncing ${reports.length} offline reports...`);
  
  let synced = 0;
  for (const report of reports) {
    try {
      const payload: any = {};
      if (report.text) payload.text = report.text;
      
      await axios.post(`${apiBaseUrl}/ingest`, payload);
      
      // Open a fresh transaction just for this delete — don't hold one open across delays
      await db.delete(SYNC_STORE_NAME, report.id);
      synced++;
      
      // Pace requests to stay under API rate limits
      if (synced < reports.length) {
        console.log("Waiting 5s before next sync to honor API rate limits...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (e) {
      console.error(`Failed to sync report ${report.id}`, e);
    }
  }
  return synced;
}

