import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { NeedEntity, VolunteerProfile } from '../shared/types';
import * as path from 'path';
import * as fs from 'fs';

import { db as mockDb } from './mockFirestore';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');
let firestore: admin.firestore.Firestore | null = null;
let useMock = process.env.DISABLE_FIRESTORE === 'true';

if (!useMock && fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    firestore = admin.firestore();
    console.log('✅ Firebase Admin initialized (Real Cloud Mode).');
  } catch (error) {
    console.error('⚠️ Firebase init failed, falling back to local Mock:', (error as any).message);
    useMock = true;
  }
} else if (useMock) {
  console.log('🚀 Local Demo Mode: Firestore is explicitly DISABLED.');
} else {
  console.warn('⚠️ No serviceAccount.json found, using local Mock.');
  useMock = true;
}

class FirebaseDb {
  // --- Needs ---
  async addNeed(need: NeedEntity): Promise<void> {
    if (useMock || !firestore) return mockDb.addNeed(need);
    try {
      await firestore.collection('needs').doc(need.id).set(need);
    } catch (e) {
      console.error("Firestore write failed, falling back to mock:", (e as any).message);
      useMock = true;
      return mockDb.addNeed(need);
    }
  }

  async updateNeed(id: string, updates: Partial<NeedEntity>): Promise<void> {
    if (useMock || !firestore) return mockDb.updateNeed(id, updates);
    try {
      await firestore.collection('needs').doc(id).update(updates);
    } catch (e) {
      useMock = true;
      return mockDb.updateNeed(id, updates);
    }
  }

  async getRecentUnresolvedNeeds(): Promise<NeedEntity[]> {
    if (useMock || !firestore) return mockDb.getRecentUnresolvedNeeds();
    try {
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      const cutoffNode = Date.now() - TWELVE_HOURS;
      const snapshot = await firestore.collection('needs').get();
      const needs: NeedEntity[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as NeedEntity;
        if (data.status !== 'RESOLVED' && data.reportedAt >= cutoffNode) {
          needs.push(data);
        }
      });
      return needs;
    } catch (e) {
      console.warn("Firestore access denied. Falling back to local demo mode.");
      useMock = true;
      return mockDb.getRecentUnresolvedNeeds();
    }
  }

  async getAllNeeds(): Promise<NeedEntity[]> {
    if (useMock || !firestore) return mockDb.getAllNeeds();
    try {
      const snapshot = await firestore.collection('needs').get();
      const needs: NeedEntity[] = [];
      snapshot.forEach(doc => needs.push(doc.data() as NeedEntity));
      return needs;
    } catch (e) {
      useMock = true;
      return mockDb.getAllNeeds();
    }
  }

  async clearAllNeeds(): Promise<void> {
    if (useMock || !firestore) return mockDb.clearAllNeeds();
    try {
      const snapshot = await firestore.collection('needs').get();
      const batch = firestore.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) {
      useMock = true;
      return mockDb.clearAllNeeds();
    }
  }

  async resolveNeed(id: string): Promise<void> {
    if (useMock || !firestore) return mockDb.resolveNeed(id);
    try {
      await firestore.collection('needs').doc(id).update({ status: 'RESOLVED' });
    } catch (e) {
      useMock = true;
      return mockDb.resolveNeed(id);
    }
  }

  // --- Volunteers ---
  async getVolunteers(): Promise<VolunteerProfile[]> {
    if (useMock || !firestore) return mockDb.getVolunteers();
    try {
      const snapshot = await firestore.collection('volunteers').get();
      const volunteers: VolunteerProfile[] = [];
      snapshot.forEach(doc => volunteers.push(doc.data() as VolunteerProfile));
      
      if (volunteers.length === 0) {
        await this.seedVolunteers();
        return this.getVolunteers();
      }
      return volunteers;
    } catch (e) {
      useMock = true;
      return mockDb.getVolunteers();
    }
  }

  private async seedVolunteers() {
    if (useMock || !firestore) return;
    console.log("Seeding dummy volunteers to real Firestore...");
    const volunteersRef = firestore.collection('volunteers');
    const v1: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Rahul Bhai',
      preferredLanguage: 'Hindi',
      skills: ['medical', 'water distribution'],
      locationCoords: { lat: 19.0760, lng: 72.8777 }, 
      status: 'AVAILABLE',
      reliabilityRate: 0.9,
      hoursLast30Days: 10,
      pastContributions: ['water distribution in Dharavi last month']
    };
    const v2: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Priya',
      preferredLanguage: 'English',
      skills: ['food', 'shelter'],
      locationCoords: { lat: 19.0800, lng: 72.8800 },
      status: 'BUSY',
      reliabilityRate: 0.7,
      hoursLast30Days: 25, 
      pastContributions: ['food packet sorting']
    };
    const v3: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Amit',
      preferredLanguage: 'Hinglish',
      skills: ['infrastructure', 'rescue'],
      locationCoords: { lat: 19.0650, lng: 72.8700 }, 
      status: 'AVAILABLE',
      reliabilityRate: 0.85,
      hoursLast30Days: 5,
      pastContributions: ['clearing debris in Andheri']
    };
    
    await volunteersRef.doc(v1.id).set(v1);
    await volunteersRef.doc(v2.id).set(v2);
    await volunteersRef.doc(v3.id).set(v3);
  }
}

export const db = new FirebaseDb();
