import { NeedEntity } from '../shared/types';
import { db } from './firebaseDb';

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const URGENCY_WEIGHTS: Record<string, number> = {
  food: 1.8,
  medical: 2.0,
  water: 1.6,
  shelter: 1.2,
  infrastructure: 1.0
};

export async function processDeduplication(newNeed: NeedEntity): Promise<NeedEntity> {
  const recentNeeds = await db.getRecentUnresolvedNeeds();
  
  let bestMatch: NeedEntity | null = null;
  let highestSim = 0;

  for (const existing of recentNeeds) {
    if (!existing.embedding || !newNeed.embedding) continue;
    
    // Distance filter
    const dist = haversineDistance(
      newNeed.location.lat, newNeed.location.lng,
      existing.location.lat, existing.location.lng
    );

    if (dist <= 2.0) { // 2km geo-radius
      const sim = cosineSimilarity(newNeed.embedding, existing.embedding);
      if (sim > 0.85 && sim > highestSim) {
        highestSim = sim;
        bestMatch = existing;
      }
    }
  }

  if (bestMatch) {
    // Cluster merge
    const mergedReportCount = bestMatch.reportCount + 1;
    
    // Growth rate per hour since the first report in this cluster
    const hoursSinceFirstReport = Math.max((Date.now() - bestMatch.reportedAt) / (1000 * 60 * 60), 0.1); // min 0.1h to prevent Infinity
    const growthRatePerHour = mergedReportCount / hoursSinceFirstReport;
    
    // criticalityScore = reportCount * growthRatePerHour * urgencyWeight[crisisType]
    const weight = URGENCY_WEIGHTS[bestMatch.crisisType] || 1.0;
    const newCriticalityScore = mergedReportCount * growthRatePerHour * weight;

    // Check CRITICAL_VELOCITY
    const isCriticalVelocity = mergedReportCount >= 3 && hoursSinceFirstReport <= 12;

    const updatedNeed: NeedEntity = {
      ...bestMatch,
      reportCount: mergedReportCount,
      criticalityScore: newCriticalityScore,
      status: isCriticalVelocity ? 'CRITICAL_VELOCITY' : 'OPEN',
      rawInputs: [...bestMatch.rawInputs, ...newNeed.rawInputs],
      // We generally keep the original reportedAt to track elapsed time accurately
    };

    await db.updateNeed(updatedNeed.id, updatedNeed);
    return updatedNeed;
  } else {
    // Brand new cluster
    newNeed.criticalityScore = 1 * (1 / 0.1) * (URGENCY_WEIGHTS[newNeed.crisisType] || 1.0); // Initial dummy growth
    await db.addNeed(newNeed);
    return newNeed;
  }
}
