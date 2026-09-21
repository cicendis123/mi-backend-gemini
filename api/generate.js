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

    // Función auxiliar para reintentar si Google devuelve 503
    let responseStream;
    let retries = 3;

    while (retries > 0) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash', // Modelo con alta disponibilidad
          contents: contents,
          config: {
            systemInstruction: "Eres un asistente virtual amigable y experto en tecnología. Respondes de forma clara, directa, breve y utilizas emojis.",
          }
        });
        break; // Si tiene éxito, sale del bucle
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1500)); // Espera 1.5s antes de reintentar
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
    
    // Mensaje amigable para el usuario si Google sigue saturado
    const isOverloaded = error.message?.includes('503') || error.message?.includes('high demand');
    const userMessage = isOverloaded 
      ? "Los servidores de Google están experimentando alta demanda en este momento. Por favor, reintenta en un par de segundos." 
      : (error.message || 'Error interno del servidor');

    return res.status(500).json({ error: userMessage });
  }
}
