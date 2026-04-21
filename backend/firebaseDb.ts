import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { NeedEntity, VolunteerProfile } from '../shared/types';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');
if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.warn('⚠️ No serviceAccount.json found. Firestore operations will fail.');
  // Initialize with dummy application default to not crash immediately
  admin.initializeApp();
}

const firestore = admin.firestore();

class FirebaseDb {
  // --- Needs ---
  async addNeed(need: NeedEntity): Promise<void> {
    await firestore.collection('needs').doc(need.id).set(need);
  }

  async updateNeed(id: string, updates: Partial<NeedEntity>): Promise<void> {
    await firestore.collection('needs').doc(id).update(updates);
  }

  async getRecentUnresolvedNeeds(): Promise<NeedEntity[]> {
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    const cutoffNode = Date.now() - TWELVE_HOURS;
    
    // We cannot use multiple inequalities in older Firestore without composite index easily,
    // so we get all OPEN and CRITICAL_VELOCITY needs and filter locally for simplicity in MVP.
    const snapshot = await firestore.collection('needs').get();
    const needs: NeedEntity[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data() as NeedEntity;
      if (data.status !== 'RESOLVED' && data.reportedAt >= cutoffNode) {
        needs.push(data);
      }
    });
    
    return needs;
  }

  async getAllNeeds(): Promise<NeedEntity[]> {
    const snapshot = await firestore.collection('needs').get();
    const needs: NeedEntity[] = [];
    snapshot.forEach(doc => needs.push(doc.data() as NeedEntity));
    return needs;
  }

  // --- Volunteers ---
  async getVolunteers(): Promise<VolunteerProfile[]> {
    const snapshot = await firestore.collection('volunteers').get();
    const volunteers: VolunteerProfile[] = [];
    snapshot.forEach(doc => volunteers.push(doc.data() as VolunteerProfile));
    
    if (volunteers.length === 0) {
      // Seed dummy volunteers if empty
      await this.seedVolunteers();
      return this.getVolunteers();
    }
    
    return volunteers;
  }

  private async seedVolunteers() {
    console.log("Seeding dummy volunteers to real Firestore...");
    const volunteersRef = firestore.collection('volunteers');
    const v1: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Rahul Bhai',
      preferredLanguage: 'Hindi',
      skills: ['medical', 'water distribution'],
      locationCoords: { lat: 19.0760, lng: 72.8777 }, 
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
