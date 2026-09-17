var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var PORT = 3e3;
var aiClient = null;
function getAIClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "5mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "NAFA", version: "4.0.0" });
  });
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Texte requis pour la synth\xE8se vocale" });
      }
      const ai = getAIClient();
      if (!ai) {
        return res.status(503).json({
          error: "Cl\xE9 d'API Gemini non disponible",
          fallback: true
        });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: text,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || "Puck" }
            }
          }
        }
      });
      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const inlineData = part?.inlineData;
      if (inlineData && inlineData.data) {
        return res.json({
          audioData: inlineData.data,
          mimeType: inlineData.mimeType || "audio/wav"
        });
      }
      return res.status(502).json({
        error: "Aucune donn\xE9e audio g\xE9n\xE9r\xE9e",
        fallback: true
      });
    } catch (error) {
      console.error("Erreur TTS:", error);
      return res.status(500).json({
        error: error.message || "Erreur de synth\xE8se vocale",
        fallback: true
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur NAFA op\xE9rationnel sur http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Erreur d\xE9marrage serveur:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
