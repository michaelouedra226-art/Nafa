import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Goal } from "../../types";
import { CaurisIcon, BogolanFrise } from "../icons/CustomIcons";
import { formatFCFA, getRandomProverb } from "../../utils/engine";
import { TTSVoicePlayer } from "../audio/TTSVoicePlayer";
import { X, Sparkles } from "lucide-react";

interface CelebrationModalProps {
  goal: Goal;
  onClose: () => void;
  onNewGoal: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  goal,
  onClose,
  onNewGoal,
}) => {
  const [proverb] = useState<string>(() => getRandomProverb());
  const [revealedCount, setRevealedCount] = useState<number>(0);

  useEffect(() => {
    // Grand tir de confettis en 2 vagues
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#C9922E", "#B5541F", "#4A6B3F", "#1E2A44"],
    });

    const timeout = setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#C9922E", "#B5541F"],
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#4A6B3F", "#1E2A44"],
      });
    }, 350);

    // Reveal 5 golden cowries one by one
    const interval = setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= 5) {
          clearInterval(interval);
          return 5;
        }
        return prev + 1;
      });
    }, 350);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const ttsText = `Félicitations pour ton objectif ${goal.name}. Tu as atteint ${goal.targetAmount} francs. ${proverb}`;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm bg-[#FAF6EF] rounded-[22px] p-6 text-center border border-[#E8DDC9] shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#8A8884] hover:text-[#1F1A15] hover:bg-[#E8DDC9]/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Rangée de cauris dorés animés */}
        <div className="flex justify-center items-center gap-2 mb-4 pt-2">
          {[0, 1, 2, 3, 4].map((idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0, opacity: 0 }}
              animate={idx < revealedCount ? { scale: [0, 1.25, 1], opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <CaurisIcon size={28} color="#C9922E" filled />
            </motion.div>
          ))}
        </div>

        <h2 className="font-fraunces text-2xl font-bold text-[#1F1A15] mb-1">
          Objectif atteint ! Bravo
        </h2>

        <p className="font-fraunces text-lg text-[#B5541F] font-semibold mb-1">
          {goal.name}
        </p>

        <p className="text-sm font-medium text-[#4A6B3F] tab-num mb-3 font-semibold">
          {formatFCFA(goal.targetAmount)}
        </p>

        <BogolanFrise color="#C9922E" height={6} className="my-3 opacity-60" />

        <p className="text-xs text-[#55534F] italic px-4 mb-4 leading-relaxed">
          "{proverb}"
        </p>

        <div className="flex justify-center mb-5">
          <TTSVoicePlayer textToSpeak={ttsText} label="Écouter la célébration" />
        </div>

        <div className="space-y-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onNewGoal}
            className="w-full py-3 bg-[#B5541F] hover:bg-[#A04514] text-[#FAF6EF] rounded-full text-xs font-semibold shadow-sm transition-all"
          >
            Créer un nouvel objectif
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs text-[#8A8884] hover:text-[#1F1A15]"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
};
