import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const PORT = 3000;

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "NAFA", version: "4.0.0" });
  });

  // TTS endpoint using gemini-3.1-flash-tts-preview
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Texte requis pour la synthèse vocale" });
      }

      const ai = getAIClient();
      if (!ai) {
        return res.status(503).json({
          error: "Clé d'API Gemini non disponible",
          fallback: true,
        });
      }

      // Call Gemini 3.1 Flash TTS model
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: text,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || "Puck" },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const inlineData = part?.inlineData;

      if (inlineData && inlineData.data) {
        return res.json({
          audioData: inlineData.data,
          mimeType: inlineData.mimeType || "audio/wav",
        });
      }

      return res.status(502).json({
        error: "Aucune donnée audio générée",
        fallback: true,
      });
    } catch (error: any) {
      console.error("Erreur TTS:", error);
      return res.status(500).json({
        error: error.message || "Erreur de synthèse vocale",
        fallback: true,
      });
    }
  });

  // Vite middleware in development or static serve in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur NAFA opérationnel sur http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erreur démarrage serveur:", err);
  process.exit(1);
});
