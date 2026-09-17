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
    const prompt = body?.prompt;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt es requerido' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        // Define aquí el rol o tono de tu IA
        systemInstruction: "Eres un asistente virtual amigable, analitico y experto en tecnología y procesos operativos de logistica y cadena de suministro. Respondes de forma clara, breve y logica.",
      }
    });

    return res.status(200).json({ result: response.text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al procesar la solicitud' });
  }
}
