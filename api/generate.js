import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    // Recibimos el arreglo contents con todo el historial
    const contents = body?.contents;

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'El historial (contents) es requerido' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: contents,
      config: {
        systemInstruction: "Eres un asistente virtual súper amigable, divertido y experto en tecnología. Respondes de forma clara, breve y utilizas emojis.",
      }
    });

    return res.status(200).json({ result: response.text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al procesar la solicitud' });
  }
}
