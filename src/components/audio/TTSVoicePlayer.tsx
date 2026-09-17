import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

interface TTSVoicePlayerProps {
  textToSpeak: string;
  label?: string;
  className?: string;
}

/**
 * Convertit un Uint8Array de PCM linéaire 16-bit en Blob WAV standard (RIFF/WAVE)
 */
function pcm16ToWavBlob(pcmBytes: Uint8Array, sampleRate = 24000, numChannels = 1): Blob {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBytes.byteLength;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF"
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  view.setUint32(8, 0x57415645, false);
  // "fmt "
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true); // PCM subchunk1size = 16
  view.setUint16(20, 1, true); // Audio format 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits par échantillon
  // "data"
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataSize, true);

  const combined = new Uint8Array(44 + dataSize);
  combined.set(new Uint8Array(header), 0);
  combined.set(pcmBytes, 44);

  return new Blob([combined], { type: "audio/wav" });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const TTSVoicePlayer: React.FC<TTSVoicePlayerProps> = ({
  textToSpeak,
  label = "Écouter",
  className = "",
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resumeIntervalRef = useRef<number | null>(null);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const clearBlobUrl = () => {
    if (blobUrlRef.current) {
      try {
        URL.revokeObjectURL(blobUrlRef.current);
      } catch {
        // Ignorer
      }
      blobUrlRef.current = null;
    }
  };

  const stopAudio = () => {
    // 1. Annuler toute requête HTTP en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. Stopper l'audio HTML5
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // Ignorer
      }
      audioRef.current = null;
    }

    clearBlobUrl();

    // 3. Stopper la synthèse vocale SpeechSynthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorer
      }
    }
    utteranceRef.current = null;

    if (resumeIntervalRef.current) {
      window.clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
  };

  const fallbackSpeechSynthesis = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    try {
      // Déblocage du moteur de synthèse vocale si figé
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "fr-FR";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Sélection d'une voix française disponible
      const voices = window.speechSynthesis.getVoices() || [];
      const frenchVoice = voices.find(
        (v) => v.lang.startsWith("fr") || v.lang.toLowerCase().includes("french")
      );
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }

      utterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsLoading(false);
        utteranceRef.current = null;
        if (resumeIntervalRef.current) {
          window.clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
      };

      utterance.onerror = (e) => {
        console.warn("Événement d'erreur SpeechSynthesis:", e);
        setIsPlaying(false);
        setIsLoading(false);
        utteranceRef.current = null;
        if (resumeIntervalRef.current) {
          window.clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
      };

      // Conservation de la référence pour éviter le Garbage Collection de V8/Chromium
      utteranceRef.current = utterance;

      // Correction du bug Chromium de pause automatique après 14 secondes
      resumeIntervalRef.current = window.setInterval(() => {
        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 5000);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Erreur fallback SpeechSynthesis:", err);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (isPlaying || isLoading) {
      stopAudio();
      return;
    }

    setIsLoading(true);

    // 1. Tenter la génération vocale haute fidélité via l'API backend
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Timeout de 4.5 secondes pour basculer rapidement si le backend est injoignable (ex: Android hors-ligne ou standalone APK)
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 4500);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: "Puck",
        }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioData) {
        throw new Error("Données audio absentes");
      }

      // Construction du blob WAV
      let audioBlob: Blob;
      const mime = data.mimeType || "";

      if (mime.includes("l16") || mime.includes("pcm")) {
        // Conversion de secours si données PCM brutes
        const rawBytes = base64ToUint8Array(data.audioData);
        audioBlob = pcm16ToWavBlob(rawBytes, 24000, 1);
      } else {
        // Audio déjà encapsulé (WAV ou autre)
        const rawBytes = base64ToUint8Array(data.audioData);
        audioBlob = new Blob([rawBytes], { type: mime || "audio/wav" });
      }

      clearBlobUrl();
      const blobUrl = URL.createObjectURL(audioBlob);
      blobUrlRef.current = blobUrl;

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
        clearBlobUrl();
      };

      audio.onerror = (e) => {
        console.warn("Erreur lecture élément Audio, bascule vers synthèse vocale native:", e);
        fallbackSpeechSynthesis();
      };

      await audio.play();
    } catch (err: any) {
      window.clearTimeout(timeoutId);
      if (err.name !== "AbortError") {
        console.info("Bascule vers la synthèse vocale intégrée:", err.message);
      }
      fallbackSpeechSynthesis();
    }
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title={isPlaying ? "Arrêter la voix" : "Écouter avec NAFA"}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
        isPlaying
          ? "bg-[#B5541F] text-[#FAF6EF] ring-2 ring-[#B5541F]/30"
          : "bg-[#E8DDC9]/50 hover:bg-[#E8DDC9] text-[#1F1A15]"
      } ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B5541F]" />
      ) : isPlaying ? (
        <VolumeX className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 text-[#B5541F]" />
      )}
      <span>{isLoading ? "Chargement..." : isPlaying ? "Arrêter" : label}</span>
    </button>
  );
};
