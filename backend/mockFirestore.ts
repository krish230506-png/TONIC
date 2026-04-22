// In-memory Mock Firestore for Demo MVP
import { NeedEntity, VolunteerProfile } from '../shared/types';
import * as crypto from 'crypto';

class MockFirestore {
  private needs: Map<string, NeedEntity> = new Map();
  private volunteers: Map<string, VolunteerProfile> = new Map();

  // Seed some dummy volunteers for the 5km raidus search
  constructor() {
    this.seedVolunteers();
  }

  private seedVolunteers() {
    const v1: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Rahul Bhai',
      preferredLanguage: 'Hindi',
      skills: ['medical', 'water distribution'],
      // Approximate coords roughly in a city
      locationCoords: { lat: 19.0760, lng: 72.8777 }, // Mumbai
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
      hoursLast30Days: 25, // Burnout: >20 hours
      pastContributions: ['food packet sorting']
    };
    const v3: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Amit',
      preferredLanguage: 'Hinglish',
      skills: ['infrastructure', 'rescue'],
      locationCoords: { lat: 19.0650, lng: 72.8700 }, // Nearby
      reliabilityRate: 0.85,
      hoursLast30Days: 5,
      pastContributions: ['clearing debris in Andheri']
    };

    const v4: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Vikram',
      preferredLanguage: 'Hindi',
      skills: ['medical', 'rescue'],
      locationCoords: { lat: 28.6129, lng: 77.2295 }, // India Gate, Delhi
      reliabilityRate: 0.95,
      hoursLast30Days: 12,
      pastContributions: ['South Delhi medical camps']
    };
    const v5: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Anjali',
      preferredLanguage: 'English',
      skills: ['food', 'water distribution'],
      locationCoords: { lat: 28.5823, lng: 77.0500 }, // Dwarka, Delhi
      reliabilityRate: 0.88,
      hoursLast30Days: 18,
      pastContributions: ['Community kitchens in Dwarka']
    };
    const v6: VolunteerProfile = {
      id: crypto.randomUUID(),
      name: 'Rohan',
      preferredLanguage: 'Hinglish',
      skills: ['infrastructure', 'shelter'],
      locationCoords: { lat: 28.5204, lng: 77.2131 }, // Saket, Delhi
      reliabilityRate: 0.82,
      hoursLast30Days: 8,
      pastContributions: ['Setting up tents in Saket']
    };

    this.volunteers.set(v1.id, v1);
    this.volunteers.set(v2.id, v2);
    this.volunteers.set(v3.id, v3);
    this.volunteers.set(v4.id, v4);
    this.volunteers.set(v5.id, v5);
    this.volunteers.set(v6.id, v6);
  }

  // --- Requirements for Needs ---
  async addNeed(need: NeedEntity): Promise<void> {
    this.needs.set(need.id, need);
  }

  async updateNeed(id: string, updates: Partial<NeedEntity>): Promise<void> {
    const existing = this.needs.get(id);
    if (existing) {
      this.needs.set(id, { ...existing, ...updates });
    }
  }

  async getRecentUnresolvedNeeds(): Promise<NeedEntity[]> {
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    
    return Array.from(this.needs.values()).filter(
      n => n.status !== 'RESOLVED' && (now - n.reportedAt) <= TWELVE_HOURS
    );
  }

  async getAllNeeds(): Promise<NeedEntity[]> {
    return Array.from(this.needs.values());
  }

  async clearAllNeeds(): Promise<void> {
    this.needs.clear();
  }

  // --- Requirements for Volunteers ---
  async getVolunteers(): Promise<VolunteerProfile[]> {
    return Array.from(this.volunteers.values());
  }
}

export const db = new MockFirestore();
