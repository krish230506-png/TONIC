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
    const majorCities = [
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
      { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
      { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
      { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
      { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    ];

    const minorCities = [
      { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
      { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
      { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
      { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
      { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
      { name: 'Indore', lat: 22.7196, lng: 75.8577 },
      { name: 'Patna', lat: 25.5941, lng: 85.1376 },
      { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
      { name: 'Surat', lat: 21.1702, lng: 72.8311 },
      { name: 'Vizag', lat: 17.6868, lng: 83.2185 },
      { name: 'Noida', lat: 28.5355, lng: 77.3910 },
      { name: 'Gurgaon', lat: 28.4595, lng: 77.0266 },
      { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
      { name: 'Kochi', lat: 9.9312, lng: 76.2673 },
      { name: 'Rohtak', lat: 28.8955, lng: 76.6066 },
      { name: 'Panipat', lat: 29.3909, lng: 76.9635 },
      { name: 'Sonipat', lat: 28.9931, lng: 77.0151 },
      { name: 'Amritsar', lat: 31.6340, lng: 74.8723 },
      { name: 'Ludhiana', lat: 30.9010, lng: 75.8573 },
      { name: 'Varanasi', lat: 25.3176, lng: 82.9739 },
      { name: 'Agra', lat: 27.1767, lng: 78.0081 },
      { name: 'Ranchi', lat: 23.3441, lng: 85.3096 },
      { name: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 },
      { name: 'Guwahati', lat: 26.1158, lng: 91.7086 },
      { name: 'Dehradun', lat: 30.3165, lng: 78.0322 },
      { name: 'Shimla', lat: 31.1048, lng: 77.1734 },
    ];

    const skillsPool = ['medical', 'food', 'water distribution', 'shelter', 'infrastructure', 'rescue'];
    const names = ['Aryan', 'Sanya', 'Ishaan', 'Ananya', 'Kabir', 'Zoya', 'Aditya', 'Mira', 'Rohan', 'Dia', 'Vihaan', 'Sara', 'Arjun', 'Kyra', 'Dev', 'Avni', 'Rishi', 'Tara', 'Karan', 'Isha'];

    const getRegionalLanguages = (cityName: string): string[] => {
      const c = cityName.toLowerCase();
      if (['mumbai', 'pune', 'nagpur', 'aurangabad', 'nashik'].includes(c)) return ['Marathi', 'Hindi', 'English'];
      if (['bangalore', 'mysore'].includes(c)) return ['Kannada', 'English'];
      if (['hyderabad', 'vizag', 'visakhapatnam'].includes(c)) return ['Telugu', 'English'];
      if (['chennai', 'coimbatore', 'madurai'].includes(c)) return ['Tamil', 'English'];
      if (['kolkata', 'guwahati'].includes(c)) return ['Bengali', 'Assamese', 'English'];
      if (['ahmedabad', 'surat'].includes(c)) return ['Gujarati', 'Hindi', 'English'];
      if (['kochi'].includes(c)) return ['Malayalam', 'English'];
      if (['bhubaneswar'].includes(c)) return ['Odia', 'Hindi', 'English'];
      // Default North/Central (Hindi Belt)
      return ['Hindi', 'Hinglish', 'English'];
    };

    const createVolunteers = (city: { name: string, lat: number, lng: number }, count: number) => {
      const cityLanguages = getRegionalLanguages(city.name);
      for (let i = 0; i < count; i++) {
        const id = crypto.randomUUID();
        // Add jitter (~5-10km)
        const jitterLat = (Math.random() - 0.5) * 0.1;
        const jitterLng = (Math.random() - 0.5) * 0.1;
        
        const volunteer: VolunteerProfile = {
          id,
          name: `${names[i % names.length]} (${city.name})`,
          preferredLanguage: cityLanguages[Math.floor(Math.random() * cityLanguages.length)],
          skills: [skillsPool[Math.floor(Math.random() * skillsPool.length)], skillsPool[Math.floor(Math.random() * skillsPool.length)]],
          locationCoords: { lat: city.lat + jitterLat, lng: city.lng + jitterLng },
          reliabilityRate: 0.6 + Math.random() * 0.4,
          hoursLast30Days: Math.floor(Math.random() * 25),
          pastContributions: [`Helped during crisis in ${city.name} area.`]
        };
        this.volunteers.set(id, volunteer);
      }
    };

    majorCities.forEach(city => createVolunteers(city, 20));
    minorCities.forEach(city => createVolunteers(city, 10));
    
    console.log(`✅ Seeded ${this.volunteers.size} volunteers across ${majorCities.length + minorCities.length} cities.`);
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
