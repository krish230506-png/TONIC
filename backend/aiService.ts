import { GoogleGenAI, Type } from '@google/genai';
import { VolunteerProfile, NeedEntity } from '../shared/types';
import dotenv from 'dotenv';
dotenv.config();

// Ensure you have GEMINI_API_KEY in your .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy-key' });

export class AIService {
  
  static async extractNeed(text: string, base64Image?: string): Promise<Partial<NeedEntity> | null> {
    const prompt = `
      You are an emergency response AI. Your task is to extract distress signal data from messy text.
      CRITICAL: You must explicitly support and understand mixed languages including Hinglish, Hindi, Bengali, Tamil, Odia, Gujarati, Marathi, Telugu, Kannada, and Malayalam.
      
      RULES:
      - If a field is unknown, omit it or return null. DO NOT hallucinate.
      - Handle native scripts and mixed transliterations fluently.
      - Extract 'location': Try to find the area name. For lat/lng, guess approximate coordinates if it's a known landmark, otherwise null.
      - Extract 'crisisType': Map to EXACTLY ONE of: food, medical, shelter, water, infrastructure.
      - Extract 'urgencyReasoning': A very short 1-sentence chain-of-thought of why this is urgent (Always translate this to English).
      - Extract 'originalLanguage': Detect and output the primary language the input was written in (e.g., 'Tamil', 'Hinglish', 'Bengali').
      - Extract 'estimatedScale': A number representing how many people are affected.

      Input Text: "${text}"
    `;

    const contents: any[] = [];
    if (base64Image) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      });
    }
    contents.push(prompt);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              location: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER }
                }
              },
              crisisType: { type: Type.STRING, enum: ['food', 'medical', 'shelter', 'water', 'infrastructure'] },
              urgencyReasoning: { type: Type.STRING },
              originalLanguage: { type: Type.STRING },
              estimatedScale: { type: Type.NUMBER }
            },
            required: ['location', 'crisisType', 'urgencyReasoning']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return result;
    } catch (e) {
      console.error('Error generating content:', e);
      return null;
    }
  }

  static async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text
      });
      return response.embeddings?.[0]?.values || [];
    } catch (e) {
      console.error('Error fetching embedding:', e);
      // For local demo to work if API key fails, return dummy array
      return new Array(768).fill(0).map(() => Math.random());
    }
  }

  static async generateDispatchMessage(volunteer: VolunteerProfile, need: NeedEntity): Promise<string> {
    const prompt = `
      You are an automated disaster response dispatcher. Compose a highly personalized, human-feeling WhatsApp-ready message to dispatch a volunteer.
      
      VOLUNTEER INFO:
      Name: ${volunteer.name}
      Preferred Language: ${volunteer.preferredLanguage}
      Past Contributions: ${volunteer.pastContributions.join(', ')}
      
      CRISIS INFO:
      Location: ${need.location.name}
      Crisis: ${need.crisisType}
      Scale: ${need.estimatedScale} people
      Reasoning: ${need.urgencyReasoning}

      RULES:
      1. Use the volunteer's preferred language.
      2. Keep it under 3 sentences.
      3. Reference their past contribution to make it feel human.
      4. Example tone (Hinglish): "Rahul bhai, Dharavi Sector 4 mein 3 families stranded hain temple ke paas flooding ki wajah se. Last month tumne water distribution mein help ki thi — kya aaj 2 ghante de sakte ho?"
      5. Do not use generic AI greetings. Start directly.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt
      });
      return response.text || 'Urgent help needed.';
    } catch (e) {
      console.error('Error generating dispatch message', e);
      return `Hey ${volunteer.name}, urgent ${need.crisisType} crisis at ${need.location.name}. Can you help?`;
    }
  }
}
