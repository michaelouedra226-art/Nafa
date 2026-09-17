import React from "react";
import { motion } from "motion/react";
import { AppState, Expense, QuickTile } from "../../types";
import { CaurisIcon, BalaiIcon } from "../icons/CustomIcons";
import { computeDailyAllowance, detectContextualAlerts, formatFCFA, isSameDay } from "../../utils/engine";
import { TTSVoicePlayer } from "../audio/TTSVoicePlayer";
import { MoreVertical, Plus, ArrowRight, Zap, Sparkles, AlertCircle } from "lucide-react";

interface TodayScreenProps {
  state: AppState;
  onOpenNewExpense: (defaultCat?: string, defaultAmount?: number) => void;
  onOpenCatchUp: () => void;
  onOpenSettings: () => void;
  onOpenFullHistory: () => void;
  onDeleteExpense: (id: string) => void;
  onDuplicateExpense: (expense: Expense) => void;
  onQuickTileTap: (tile: QuickTile) => void;
  onSetPocketBalance: () => void;
  onAcceptChallenge: (challengeId: string) => void;
  onDeclineChallenge: (challengeId: string) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  state,
  onOpenNewExpense,
  onOpenCatchUp,
  onOpenSettings,
  onOpenFullHistory,
  onDeleteExpense,
  onDuplicateExpense,
  onQuickTileTap,
  onSetPocketBalance,
  onAcceptChallenge,
  onDeclineChallenge,
}) => {
  const now = new Date();
  const hour = now.getHours();

  // Salutation contextuelle (Partie 4.2)
  let greeting = "Bonjour";
  if (hour < 6) greeting = "Bonne nuit";
  else if (hour >= 12 && hour < 18) greeting = "Bon après-midi";
  else if (hour >= 18) greeting = "Bonsoir";

  const dateFormatted = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const allowance = computeDailyAllowance(state);
  const alerts = detectContextualAlerts(state);

  // Dépenses du jour par catégorie pour les 3 pastilles
  const todayExpenses = state.expenses.filter((e) => isSameDay(e.timestamp, now.getTime()));
  const catNourriture = todayExpenses
    .filter((e) => e.categoryId === "cat_nourriture")
    .reduce((s, e) => s + e.amount, 0);
  const catTransport = todayExpenses
    .filter((e) => e.categoryId === "cat_transport")
    .reduce((s, e) => s + e.amount, 0);
  const catSorties = todayExpenses
    .filter((e) => e.categoryId === "cat_sorties")
    .reduce((s, e) => s + e.amount, 0);

  // Dernières 5 dépenses
  const sortedExpenses = [...state.expenses].sort((a, b) => b.timestamp - a.timestamp);
  const lastFiveExpenses = sortedExpenses.slice(0, 5);

  // Défi du jour (Partie 16.4)
  const todayKey = now.toISOString().slice(0, 10);
  const currentChallenge = state.dailyChallenges.find((c) => c.dateKey === todayKey) || {
    id: `challenge_${todayKey}`,
    dateKey: todayKey,
    title: "Aujourd'hui : cuisine au lieu d'acheter dehors.",
    estimatedSavings: 1000,
    status: "pending" as const,
  };

  // Discours vocal grand frère (TTS)
  const ttsMessage = `${greeting} ${state.profile.name || ""}. Aujourd'hui, il te reste ${allowance.dailyAllowance} francs par jour jusqu'à la fin du mois. ${allowance.humanMessage}`;

  return (
    <div className="flex flex-col min-h-full pb-24 text-[#1F1A15]">
      {/* 4.2 Zone haute */}
      <div className="flex items-center justify-between pt-4 pb-3 px-5 border-b border-[#E8DDC9]/40 bg-[#FAF6EF]">
        <div>
          <h1 className="font-fraunces text-lg font-semibold text-[#1F1A15]">
            {greeting}, {state.profile.name || "Michael"}
          </h1>
          <p className="text-xs text-[#8A8884] capitalize">{dateFormatted}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Lecteur TTS voix du grand frère */}
          <TTSVoicePlayer textToSpeak={ttsMessage} label="Audio" />

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-full text-[#55534F] hover:bg-[#E8DDC9]/50 transition-colors"
            title="Réglages"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bandeaux contextuels (Partie 4.8) */}
      {alerts.length > 0 && (
        <div className="px-5 pt-3 space-y-2">
          {alerts.map((alertText, idx) => (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx}
              className="p-3 bg-[#E8DDC9]/40 border border-[#E8DDC9] rounded-[14px] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 text-[#55534F]">
                <AlertCircle className="w-4 h-4 text-[#B5541F] shrink-0" />
                <span>{alertText}</span>
              </div>
              {alertText.includes("rattraper") && (
                <button
                  type="button"
                  onClick={onOpenCatchUp}
                  className="px-2.5 py-1 bg-[#B5541F] text-white rounded-full text-[11px] font-medium shrink-0 ml-2"
                >
                  Rattrapage
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* 4.3 Le Héros — Le Chiffre du Jour Animé */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="px-5 py-6 text-center"
      >
        <span className="text-xs uppercase font-medium tracking-wider text-[#8A8884]">
          Reste à dépenser
        </span>

        {/* Chiffre très grand (54px) en Fraunces tabulaire */}
        <motion.div 
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="my-1.5 flex items-baseline justify-center"
        >
          <span
            className={`font-fraunces text-5xl sm:text-6xl font-bold tracking-tight tab-num transition-colors ${
              state.profile.privateMode ? "filter blur-sm select-none" : ""
            }`}
            style={{ color: allowance.statusColor }}
          >
            {allowance.dailyAllowance.toLocaleString("fr-FR")}
          </span>
          <span
            className="font-fraunces text-2xl font-bold ml-1.5"
            style={{ color: allowance.statusColor }}
          >
            F
          </span>
        </motion.div>

        <p className="text-xs text-[#8A8884] font-medium">
          par jour jusqu'à la fin du mois
        </p>

        {/* Ligne courte et humaine */}
        <p
          className="text-xs font-semibold mt-2"
          style={{ color: allowance.statusColor }}
        >
          {allowance.humanMessage}
        </p>

        {/* Solde en poche */}
        <div className="mt-2 text-xs">
          {state.profile.pocketBalance !== undefined ? (
            <span
              onClick={onSetPocketBalance}
              className="text-[#55534F] cursor-pointer hover:underline"
            >
              Tu as{" "}
              <strong className="text-[#1F1A15] font-semibold">
                {formatFCFA(state.profile.pocketBalance)}
              </strong>{" "}
              en poche
            </span>
          ) : (
            <button
              type="button"
              onClick={onSetPocketBalance}
              className="text-[#8A8884] hover:text-[#B5541F] underline text-[11px]"
            >
              Renseigner mon solde en poche
            </button>
          )}
        </div>
      </motion.div>

      {/* 4.4 Barre de progression fine (3px) animée */}
      <div className="px-5 mb-5">
        <div className="w-full h-[3px] bg-[#E8DDC9] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.round(allowance.progressRatio * 100))}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              backgroundColor: allowance.statusColor,
            }}
          />
        </div>
      </div>

      {/* 4.5 Les trois pastilles du jour (Nourriture, Transport, Sorties) animées */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-2">
          {/* Nourriture */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ y: -1 }}
            type="button"
            onClick={() => onOpenNewExpense("cat_nourriture")}
            className="p-3 bg-white rounded-[14px] border border-[#E8DDC9]/70 text-left hover:border-[#B5541F] transition-all shadow-xs"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#B5541F]" />
              <span className="text-[11px] font-medium text-[#8A8884] truncate">
                Nourriture
              </span>
            </div>
            <div className="font-fraunces text-sm font-bold text-[#1F1A15] tab-num">
              {catNourriture > 0 ? formatFCFA(catNourriture) : "0 F"}
            </div>
          </motion.button>

          {/* Transport */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ y: -1 }}
            type="button"
            onClick={() => onOpenNewExpense("cat_transport")}
            className="p-3 bg-white rounded-[14px] border border-[#E8DDC9]/70 text-left hover:border-[#1E2A44] transition-all shadow-xs"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#1E2A44]" />
              <span className="text-[11px] font-medium text-[#8A8884] truncate">
                Transport
              </span>
            </div>
            <div className="font-fraunces text-sm font-bold text-[#1F1A15] tab-num">
              {catTransport > 0 ? formatFCFA(catTransport) : "0 F"}
            </div>
          </motion.button>

          {/* Sorties */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ y: -1 }}
            type="button"
            onClick={() => onOpenNewExpense("cat_sorties")}
            className="p-3 bg-white rounded-[14px] border border-[#E8DDC9]/70 text-left hover:border-[#C9922E] transition-all shadow-xs"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#C9922E]" />
              <span className="text-[11px] font-medium text-[#8A8884] truncate">
                Sorties
              </span>
            </div>
            <div className="font-fraunces text-sm font-bold text-[#1F1A15] tab-num">
              {catSorties > 0 ? formatFCFA(catSorties) : "0 F"}
            </div>
          </motion.button>
        </div>

        {todayExpenses.length === 0 && (
          <p className="text-[11px] text-[#8A8884] text-center mt-2 italic">
            Rien encore aujourd'hui.
          </p>
        )}
      </div>

      {/* 4.6 Bouton principal "Ajouter une dépense" avec animation vivante */}
      <div className="px-5 mb-4">
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.01 }}
          type="button"
          onClick={() => onOpenNewExpense()}
          className="w-full py-4 bg-[#B5541F] hover:bg-[#A04514] active:bg-[#8F3B0E] text-[#FAF6EF] rounded-full text-base font-semibold shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter une dépense</span>
        </motion.button>
      </div>

      {/* 4.9 Tuiles rapides (Max 3) */}
      {state.quickTiles.length > 0 && (
        <div className="px-5 mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {state.quickTiles.slice(0, 3).map((tile) => (
            <motion.button
              whileTap={{ scale: 0.93 }}
              key={tile.id}
              type="button"
              onClick={() => onQuickTileTap(tile)}
              className="px-3.5 py-2 rounded-full bg-white border border-[#E8DDC9] text-xs font-medium text-[#1F1A15] shadow-xs flex items-center gap-1.5 hover:bg-[#E8DDC9]/30 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-[#C9922E]" />
              <span>{tile.label}</span>
              <span className="text-[#8A8884]">{formatFCFA(tile.amount)}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* 16.4 Défi du jour (Micro-défi contextuel) */}
      {currentChallenge && currentChallenge.status === "pending" && (
        <div className="mx-5 mb-6 p-4 rounded-[14px] bg-[#E8DDC9]/30 border border-[#E8DDC9] flex items-center justify-between">
          <div className="flex items-start gap-2.5 pr-2">
            <Sparkles className="w-4 h-4 text-[#C9922E] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-[#8A8884] uppercase font-bold tracking-wider block">
                Défi du jour
              </span>
              <p className="text-xs text-[#1F1A15] font-medium leading-tight">
                {currentChallenge.title}
              </p>
              <span className="text-[10px] text-[#4A6B3F] font-semibold mt-0.5 block">
                Économie estimée : +{formatFCFA(currentChallenge.estimatedSavings)} vers ton objectif
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onAcceptChallenge(currentChallenge.id)}
              className="px-3 py-1 bg-[#4A6B3F] text-white rounded-full text-[11px] font-medium"
            >
              J'accepte
            </button>
            <button
              type="button"
              onClick={() => onDeclineChallenge(currentChallenge.id)}
              className="px-2 py-0.5 text-[10px] text-[#8A8884] hover:text-[#1F1A15]"
            >
              Passer
            </button>
          </div>
        </div>
      )}

      {/* 4.7 Les dernières dépenses */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-fraunces text-base font-semibold text-[#1F1A15]">
            Dernières entrées
          </h2>
          {state.expenses.length > 0 && (
            <button
              type="button"
              onClick={onOpenFullHistory}
              className="text-xs text-[#B5541F] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Tout voir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {lastFiveExpenses.length === 0 ? (
          /* Encart vide chaleureux si aucune dépense (Partie 4.7 & 22.3) */
          <div className="p-6 bg-white rounded-[14px] border border-[#E8DDC9] text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#FAF6EF] flex items-center justify-center">
              <CaurisIcon size={22} color="#C9922E" filled />
            </div>
            <p className="text-xs text-[#55534F] leading-relaxed mb-3">
              Ton carnet est vierge. Ajoute ta première dépense quand tu veux — je saurai alors mieux t'aider.
            </p>
            <button
              type="button"
              onClick={() => onOpenNewExpense()}
              className="text-xs text-[#B5541F] font-semibold underline"
            >
              Ajouter ma première dépense
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {lastFiveExpenses.map((exp) => {
              const cat = state.categories.find((c) => c.id === exp.categoryId);
              const expDate = new Date(exp.timestamp);
              const isToday = isSameDay(exp.timestamp, now.getTime());
              const timeDisplay = isToday
                ? `${expDate.getHours()}h${expDate.getMinutes().toString().padStart(2, "0")}`
                : expDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

              return (
                <div
                  key={exp.id}
                  className="p-3 bg-white rounded-[14px] border border-[#E8DDC9]/70 flex items-center justify-between shadow-xs transition-all hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color || "#8A8884" }}
                    />
                    <div>
                      <span className="text-xs font-medium text-[#1F1A15] block">
                        {exp.label || cat?.name || "Dépense"}
                      </span>
                      <span className="text-[10px] text-[#8A8884]">
                        {cat?.name} · {timeDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-fraunces font-bold text-[#1F1A15] tab-num block">
                        {formatFCFA(exp.amount)}
                      </span>
                      {exp.roundUpSaved && (
                        <span className="text-[10px] text-[#C9922E] flex items-center justify-end gap-0.5">
                          <CaurisIcon size={10} color="#C9922E" filled />
                          +{formatFCFA(exp.roundUpSaved)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp.id)}
                      className="text-[#8A8884] hover:text-[#A8453F] p-1"
                      title="Supprimer"
                    >
                      <BalaiIcon size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
