import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const maxDuration = 60;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const contents = body?.contents;

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'El historial (contents) es requerido' });
    }

    let responseStream;
    let retries = 4; // Aumentado a 4 intentos
    let delay = 2000; // 2 segundos de espera inicial

    while (retries > 0) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.6-flash',
          contents: contents,
          config: {
            systemInstruction: "Eres un asistente virtual amigable y experto en tecnología. Respondes de forma clara, directa, breve y utilizas emojis.",
          }
        });
        break; // Éxito
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay += 1000; // Incremento progresivo
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    return res.end();
  } catch (error) {
    console.error("Error en backend:", error);
    
    const isOverloaded = error.message?.includes('503') || error.message?.includes('high demand') || error.status === 503;
    const userMessage = isOverloaded 
      ? "Los servidores de Google están experimentando alta demanda en este momento. Por favor, reintenta en un par de segundos." 
      : (error.message || 'Error interno del servidor');

    return res.status(500).json({ error: userMessage });
  }
}
