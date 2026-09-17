import React, { useEffect, useState } from "react";
import { Goal } from "../../types";
import { CaurisIcon, BogolanFrise } from "../icons/CustomIcons";
import { formatFCFA, getRandomProverb } from "../../utils/engine";
import { TTSVoicePlayer } from "../audio/TTSVoicePlayer";
import { X } from "lucide-react";

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
    // Reveal 5 golden cowries one by one
    const interval = setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= 5) {
          clearInterval(interval);
          return 5;
        }
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const ttsText = `Félicitations pour ton objectif ${goal.name}. Tu as atteint ${goal.targetAmount} francs. ${proverb}`;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-sm bg-[#FAF6EF] rounded-[20px] p-6 text-center border border-[#E8DDC9] shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[#8A8884] hover:text-[#1F1A15]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Rangée de cauris dorés animés */}
        <div className="flex justify-center items-center gap-2 mb-6 pt-2">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`transition-all duration-500 transform ${
                idx < revealedCount ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            >
              <CaurisIcon size={26} color="#C9922E" filled />
            </div>
          ))}
        </div>

        <h2 className="font-fraunces text-2xl font-bold text-[#1F1A15] mb-1">
          Objectif atteint. Bravo.
        </h2>

        <p className="font-fraunces text-lg text-[#B5541F] font-semibold mb-1">
          {goal.name}
        </p>

        <p className="text-sm font-medium text-[#4A6B3F] tab-num mb-4">
          {formatFCFA(goal.targetAmount)}
        </p>

        <BogolanFrise color="#C9922E" height={6} className="my-3 opacity-60" />

        <p className="text-xs text-[#55534F] italic px-4 mb-4 leading-relaxed">
          "{proverb}"
        </p>

        <div className="flex justify-center mb-6">
          <TTSVoicePlayer textToSpeak={ttsText} label="Écouter la célébration" />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onNewGoal}
            className="w-full py-3 bg-[#B5541F] text-[#FAF6EF] rounded-full text-xs font-medium shadow-sm active:scale-98"
          >
            Créer un nouvel objectif
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs text-[#8A8884] hover:text-[#1F1A15]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
