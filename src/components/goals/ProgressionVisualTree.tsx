import React from "react";
import { motion } from "motion/react";
import { Goal, GoalVisual } from "../../types";
import { CaurisIcon } from "../icons/CustomIcons";
import { soundEffects, triggerHapticFeedback } from "../../utils/hapticsAndAudio";
import confetti from "canvas-confetti";
import { Sparkles, Trophy } from "lucide-react";

interface ProgressionVisualTreeProps {
  goal: Goal;
  percentage: number;
  size?: "compact" | "normal" | "large";
  onCelebrate?: () => void;
}

export const ProgressionVisualTree: React.FC<ProgressionVisualTreeProps> = ({
  goal,
  percentage,
  size = "normal",
  onCelebrate,
}) => {
  const isCompleted = percentage >= 100;
  const visual: GoalVisual = goal.visual || "baobab";

  const triggerCelebration = () => {
    soundEffects.playCelebrationChime();
    triggerHapticFeedback([40, 60, 80]);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#C9922E", "#B5541F", "#4A6B3F", "#FAF6EF"],
    });
    if (onCelebrate) onCelebrate();
  };

  const getDimensions = () => {
    if (size === "compact") return { w: 48, h: 48 };
    if (size === "large") return { w: 120, h: 120 };
    return { w: 72, h: 72 };
  };

  const dim = getDimensions();

  // 1. VISUEL BAOBAB VIVANT (4 stades évolutifs)
  const renderBaobab = () => {
    const stage = percentage < 25 ? 1 : percentage < 60 ? 2 : percentage < 100 ? 3 : 4;

    return (
      <div className="relative flex flex-col items-center justify-center">
        <svg
          width={dim.w}
          height={dim.h}
          viewBox="0 0 100 100"
          className="overflow-visible"
        >
          {/* Sol en terre rouge sahélienne */}
          <ellipse
            cx="50"
            cy="88"
            rx="38"
            ry="7"
            fill="#B5541F"
            fillOpacity={0.18}
          />
          <path
            d="M15 88 Q50 84 85 88"
            stroke="#B5541F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {stage === 1 && (
            <motion.g
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Graine germée */}
              <ellipse cx="50" cy="84" rx="7" ry="5" fill="#8F3B0E" />
              {/* Tige tendre verte */}
              <path
                d="M50 82 Q50 68 53 58"
                stroke="#4A6B3F"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              {/* Première feuille gauche */}
              <motion.path
                initial={{ rotate: -20 }}
                animate={{ rotate: 0 }}
                d="M52 64 Q40 55 42 46 Q50 50 52 64"
                fill="#4A6B3F"
              />
              {/* Deuxième feuille droite */}
              <motion.path
                initial={{ rotate: 20 }}
                animate={{ rotate: 0 }}
                d="M52 60 Q64 52 62 44 Q54 48 52 60"
                fill="#608A52"
              />
            </motion.g>
          )}

          {stage === 2 && (
            <motion.g
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Tronc jeune élancé */}
              <path
                d="M44 87 C45 74 46 64 47 50 C44 45 40 40 34 36"
                stroke="#8F3B0E"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M56 87 C55 74 54 64 53 50 C56 45 60 40 66 36"
                stroke="#8F3B0E"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M50 52 V32"
                stroke="#8F3B0E"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Ramures & feuilles naissantes */}
              <circle cx="34" cy="34" r="9" fill="#4A6B3F" fillOpacity="0.85" />
              <circle cx="66" cy="34" r="9" fill="#4A6B3F" fillOpacity="0.85" />
              <circle cx="50" cy="28" r="11" fill="#608A52" />
            </motion.g>
          )}

          {stage === 3 && (
            <motion.g
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Tronc massif caractéristique du baobab */}
              <path
                d="M38 88 C40 70 42 56 44 44 C38 38 32 32 24 28"
                stroke="#6E2F0A"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M62 88 C60 70 58 56 56 44 C62 38 68 32 76 28"
                stroke="#6E2F0A"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M50 48 V26"
                stroke="#6E2F0A"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Canopée dense et protectrice */}
              <ellipse cx="50" cy="26" rx="26" ry="14" fill="#3D5933" />
              <circle cx="30" cy="28" r="13" fill="#4A6B3F" />
              <circle cx="70" cy="28" r="13" fill="#4A6B3F" />
              <circle cx="50" cy="20" r="15" fill="#608A52" />
            </motion.g>
          )}

          {stage === 4 && (
            <motion.g
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: [1, 1.03, 1], opacity: 1 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Aura dorée de complétion */}
              <circle cx="50" cy="40" r="38" fill="#C9922E" fillOpacity="0.12" />

              {/* Tronc majestueux séculaire */}
              <path
                d="M34 88 C38 66 41 52 43 40 C35 34 26 28 18 24"
                stroke="#542306"
                strokeWidth="9"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M66 88 C62 66 59 52 57 40 C65 34 74 28 82 24"
                stroke="#542306"
                strokeWidth="9"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M50 46 V20"
                stroke="#542306"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* Canopée royale abondante */}
              <ellipse cx="50" cy="22" rx="34" ry="18" fill="#2E4426" />
              <circle cx="26" cy="24" r="16" fill="#3D5933" />
              <circle cx="74" cy="24" r="16" fill="#3D5933" />
              <circle cx="50" cy="16" r="18" fill="#4A6B3F" />
              <circle cx="38" cy="12" r="13" fill="#608A52" />
              <circle cx="62" cy="12" r="13" fill="#608A52" />

              {/* Fruits d'or du baobab (pain de singe mûr) */}
              <ellipse cx="32" cy="36" rx="3" ry="5" fill="#C9922E" />
              <ellipse cx="48" cy="38" rx="3" ry="5" fill="#C9922E" />
              <ellipse cx="68" cy="36" rx="3" ry="5" fill="#C9922E" />
              <ellipse cx="58" cy="30" rx="2.5" ry="4.5" fill="#DDB14D" />
            </motion.g>
          )}
        </svg>

        <span className="text-[10px] font-semibold tracking-wide text-[#55534F] mt-1">
          {stage === 1
            ? "Jeune graine"
            : stage === 2
            ? "Pousse vigoureuse"
            : stage === 3
            ? "Baobab solide"
            : "Baobab fleuri"}
        </span>
      </div>
    );
  };

  // 2. VISUEL CALEBASSE PROGRESSIVE (se remplit d'or)
  const renderCalebasse = () => {
    // Calcul de la hauteur de remplissage (de y=84 à y=28)
    const fillHeight = Math.max(0, Math.min(56, Math.round((percentage / 100) * 56)));
    const fillY = 84 - fillHeight;

    return (
      <div className="relative flex flex-col items-center justify-center">
        <svg
          width={dim.w}
          height={dim.h}
          viewBox="0 0 100 100"
          className="overflow-visible"
        >
          {/* Socle */}
          <ellipse cx="50" cy="88" rx="28" ry="5" fill="#B5541F" fillOpacity="0.15" />

          {/* Définition du masque de la calebasse */}
          <defs>
            <clipPath id={`calebasseClip-${goal.id}`}>
              <path d="M40 20 H60 V26 C60 34 72 38 72 48 C72 54 66 60 62 62 C74 66 82 76 82 84 C82 88 68 90 50 90 C32 90 18 88 18 84 C18 76 26 66 38 62 C34 60 28 54 28 48 C28 38 40 34 40 26 Z" />
            </clipPath>
          </defs>

          {/* Corps extérieur de la calebasse (terre cuite ambrée) */}
          <path
            d="M40 20 H60 V26 C60 34 72 38 72 48 C72 54 66 60 62 62 C74 66 82 76 82 84 C82 88 68 90 50 90 C32 90 18 88 18 84 C18 76 26 66 38 62 C34 60 28 54 28 48 C28 38 40 34 40 26 Z"
            fill="#FAF6EF"
            stroke="#B5541F"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Contenu liquide or remplissant progressivement */}
          <g clipPath={`url(#calebasseClip-${goal.id})`}>
            <motion.rect
              initial={{ height: 0 }}
              animate={{ height: fillHeight + 10, y: fillY }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              x="10"
              width="80"
              fill={isCompleted ? "#C9922E" : "#DDB14D"}
              fillOpacity={isCompleted ? 0.95 : 0.75}
            />

            {/* Cauris flottants à la surface si du contenu */}
            {percentage > 15 && (
              <circle cx="42" cy={fillY + 6} r="4" fill="#FFFFFF" stroke="#C9922E" strokeWidth="1" />
            )}
            {percentage > 45 && (
              <circle cx="58" cy={fillY + 8} r="3.5" fill="#FFFFFF" stroke="#C9922E" strokeWidth="1" />
            )}
            {percentage > 75 && (
              <circle cx="50" cy={fillY + 4} r="4.5" fill="#FFFFFF" stroke="#C9922E" strokeWidth="1" />
            )}
          </g>

          {/* Rebord de la calebasse */}
          <ellipse cx="50" cy="20" rx="10" ry="3" fill="#8F3B0E" />

          {/* Liserés pyrogravés mossi */}
          <path
            d="M25 76 Q50 82 75 76"
            stroke="#B5541F"
            strokeWidth="1"
            strokeDasharray="2 2"
            fill="none"
          />
        </svg>

        <span className="text-[10px] font-semibold tracking-wide text-[#55534F] mt-1">
          {percentage === 0
            ? "Calebasse prête"
            : isCompleted
            ? "Calebasse pleine !"
            : `Remplie à ${percentage}%`}
        </span>
      </div>
    );
  };

  // 3. VISUEL CAURIS PROGRESSIFS (s'empilent un par un)
  const renderCauris = () => {
    // 6 cauris au total (chaque cauris = ~16.6% d'avancement)
    const totalCauris = 6;
    const filledCount = Math.min(totalCauris, Math.ceil((percentage / 100) * totalCauris));

    return (
      <div className="relative flex flex-col items-center justify-center">
        <div className="flex flex-col-reverse items-center justify-center gap-0.5 py-1">
          {Array.from({ length: totalCauris }).map((_, idx) => {
            const isFilled = idx < filledCount;
            return (
              <motion.div
                key={idx}
                initial={{ scale: 0.8 }}
                animate={{ scale: isFilled ? 1 : 0.9 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className={`transition-all ${
                  isFilled ? "drop-shadow-xs" : "opacity-35"
                }`}
              >
                <CaurisIcon
                  size={size === "compact" ? 16 : size === "large" ? 26 : 20}
                  color={isFilled ? (isCompleted ? "#C9922E" : "#B5541F") : "#E8DDC9"}
                  filled={isFilled}
                />
              </motion.div>
            );
          })}
        </div>

        <span className="text-[10px] font-semibold tracking-wide text-[#55534F] mt-0.5">
          {isCompleted
            ? "Trésor complet"
            : `${filledCount}/${totalCauris} cauris`}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {visual === "cauris"
        ? renderCauris()
        : visual === "calebasse"
        ? renderCalebasse()
        : renderBaobab()}

      {/* Célébration si objectif atteint */}
      {isCompleted && (
        <motion.button
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={triggerCelebration}
          className="mt-1.5 px-2.5 py-0.5 rounded-full bg-[#C9922E]/15 border border-[#C9922E] text-[10px] font-bold text-[#8F6618] flex items-center gap-1 shadow-2xs hover:bg-[#C9922E]/25 transition-all"
          title="Fêter l'accomplissement"
        >
          <Trophy className="w-3 h-3 text-[#C9922E]" />
          <span>Objectif atteint !</span>
          <Sparkles className="w-2.5 h-2.5 text-[#C9922E]" />
        </motion.button>
      )}
    </div>
  );
};
