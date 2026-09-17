import React, { useState, useRef } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

interface TTSVoicePlayerProps {
  textToSpeak: string;
  label?: string;
  className?: string;
}

export const TTSVoicePlayer: React.FC<TTSVoicePlayerProps> = ({
  textToSpeak,
  label = "Écouter",
  className = "",
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handleSpeak = async () => {
    if (isPlaying || isLoading) {
      stopAudio();
      return;
    }

    setIsLoading(true);

    try {
      // 1. Appeler l'endpoint Express /api/tts propulsé par gemini-3.1-flash-tts-preview
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: "Puck", // Voix chaleureuse adaptée au "grand frère"
        }),
      });

      if (!response.ok) {
        throw new Error("TTS API unavailable");
      }

      const data = await response.json();
      if (data.audioData) {
        const audioSrc = `data:${data.mimeType || "audio/wav"};base64,${data.audioData}`;
        const audio = new Audio(audioSrc);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsLoading(false);
          setIsPlaying(true);
        };

        audio.onended = () => {
          setIsPlaying(false);
          audioRef.current = null;
        };

        audio.onerror = () => {
          fallbackSpeechSynthesis();
        };

        await audio.play();
        return;
      }

      fallbackSpeechSynthesis();
    } catch (err) {
      console.warn("Utilisation de la synthèse vocale locale de secours:", err);
      fallbackSpeechSynthesis();
    }
  };

  const fallbackSpeechSynthesis = () => {
    setIsLoading(false);
    if (!("speechSynthesis" in window)) {
      setIsPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "fr-FR";
    utterance.rate = 0.95; // Rythme posé et digne

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title={isPlaying ? "Arrêter la voix" : "Écouter avec NAFA"}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        isPlaying
          ? "bg-[#B5541F] text-[#FAF6EF]"
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
      <span>{isLoading ? "Préparation..." : isPlaying ? "Arrêter" : label}</span>
    </button>
  );
};
