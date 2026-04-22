import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { VolunteerProfile, NeedEntity } from '../shared/types';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the correct Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key');

export class AIService {
  
  static async extractNeed(text: string, base64Image?: string): Promise<Partial<NeedEntity> | null> {
    const prompt = `
      You are an emergency response AI. Extract distress signal data from the input.
      Understand mixed languages (Hinglish/Hindi/Bengali/Tamil/etc.).
      
      Output JSON strictly matching this schema:
      {
        "location": { "name": string, "lat": number, "lng": number },
        "crisisType": "food" | "medical" | "shelter" | "water" | "infrastructure",
        "urgencyReasoning": string,
        "originalLanguage": string,
        "estimatedScale": number
      }

      Input: "${text}"
    `;

    try {
      const model = genAI.getGenerativeModel({ 
        model: 'models/gemini-2.0-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              location: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  lat: { type: SchemaType.NUMBER },
                  lng: { type: SchemaType.NUMBER }
                },
                required: ['name']
              },
              crisisType: { 
                type: SchemaType.STRING, 
                enum: ['food', 'medical', 'shelter', 'water', 'infrastructure'],
                format: "enum" 
              },
              urgencyReasoning: { type: SchemaType.STRING },
              originalLanguage: { type: SchemaType.STRING },
              estimatedScale: { type: SchemaType.NUMBER }
            },
            required: ['location', 'crisisType', 'urgencyReasoning']
          }
        }
      });

      const parts: any[] = [{ text: prompt }];
      if (base64Image) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        });
      }

      const response = await model.generateContent(parts);
      const result = JSON.parse(response.response.text());
      return result;
    } catch (e: any) {
      if (e.status === 429) {
        console.warn('⚠️ Gemini Quota Exceeded (429). Returning null for fallback handling.');
        return null;
      }
      console.error('Gemini extraction failed:', e);
      throw e; 
    }
  }

  static async transcribeAudio(base64Audio: string): Promise<string | null> {
    const prompt = `Transcribe the spoken words in this audio clip exactly. Return only the transcription as plain text, nothing else.`;

    try {
      const model = genAI.getGenerativeModel({ 
        model: 'models/gemini-2.0-flash',
      });

      const parts = [
        { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
        { text: prompt }
      ];

      const response = await model.generateContent(parts);
      return response.response.text();
    } catch (e: any) {
      if (e.status === 429) {
        console.warn('⚠️ Gemini Quota hit during audio transcription (429). Returning null.');
        return null;
      }
      console.error('Audio transcription failed:', e);
      return null;
    }
  }

  static async getEmbedding(text: string): Promise<number[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (e) {
      console.error('Embedding failed:', e);
      throw e;
    }
  }

  static async generateDispatchMessage(volunteer: VolunteerProfile, need: NeedEntity): Promise<string> {
    const prompt = `
      Compose a short, personalized WhatsApp message to dispatch volunteer ${volunteer.name}. 
      Crisis: ${need.crisisType} at ${need.location.name}. 
      Language: ${volunteer.preferredLanguage}. 
      Reference past contributions: ${volunteer.pastContributions.join(', ')}.
    `;

    try {
      const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });
      const response = await model.generateContent(prompt);
      return response.response.text();
    } catch (e) {
      console.error('Dispatch generation failed:', e);
      return `Emergency: ${need.crisisType} at ${need.location.name}. Urgent help needed!`;
    }
  }
}
