import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppState, Expense, QuickTile, DailyChallenge } from "../../types";
import { CaurisIcon, BalaiIcon } from "../icons/CustomIcons";
import {
  computeDailyAllowance,
  detectContextualAlerts,
  formatFCFA,
  isSameDay,
  getOrGenerateTodayChallenge,
  computeEndOfMonthRadar,
  computeMasteredDaysStreak,
  generateGrandBrotherDailyMessage,
} from "../../utils/engine";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { TTSVoicePlayer } from "../audio/TTSVoicePlayer";
import {
  MoreVertical,
  Plus,
  ArrowRight,
  Zap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  SkipForward,
  RotateCcw,
  Flame,
  Compass,
  Focus,
  Eye,
  MessageCircle,
  Banknote,
  Award,
} from "lucide-react";

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
  onReceivePayday?: (amount: number, label: string) => void;
  onAcceptChallenge: (challenge: DailyChallenge | string) => void;
  onValidateChallenge: (challenge: DailyChallenge | string) => void;
  onFailChallenge: (challenge: DailyChallenge | string) => void;
  onSkipChallenge: (challenge: DailyChallenge | string) => void;
  onResetChallenge: (challengeId: string) => void;
  onDeclineChallenge?: (challengeId: string) => void;
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
  onReceivePayday,
  onAcceptChallenge,
  onValidateChallenge,
  onFailChallenge,
  onSkipChallenge,
  onResetChallenge,
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

  const [isFocusMode, setIsFocusMode] = useState(false);

  const allowance = computeDailyAllowance(state);
  const alerts = detectContextualAlerts(state);
  const radar = computeEndOfMonthRadar(state);
  const streak = computeMasteredDaysStreak(state);
  const grandBrotherMsg = generateGrandBrotherDailyMessage(state);

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

  // Détection Mode Paie reçue (Partie 1.2 PRO)
  const currentDay = now.getDate();
  const grantDay = state.profile.incomeSources?.grantDay;
  const isNearGrantDay = grantDay ? Math.abs(currentDay - grantDay) <= 2 : false;
  const isPaydayPeriod = isNearGrantDay || currentDay >= 24 || currentDay <= 6;
  const [showPaydayModal, setShowPaydayModal] = useState(false);
  const [paydayAmountInput, setPaydayAmountInput] = useState<string>(
    (state.profile.incomeSources?.grantAmount ||
      state.profile.incomeSources?.jobAmount ||
      "") as string
  );

  const handlePaydaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paydayAmountInput);
    if (amt <= 0) return;
    if (onReceivePayday) {
      onReceivePayday(amt, "Salaire / Bourse");
    } else {
      onSetPocketBalance();
    }
    setShowPaydayModal(false);
  };

  // Dernières 5 dépenses
  const sortedExpenses = [...state.expenses].sort((a, b) => b.timestamp - a.timestamp);
  const lastFiveExpenses = sortedExpenses.slice(0, 5);

  // Défi / Objectif du jour (Partie 16.4 & Gestion des états)
  const currentChallenge = getOrGenerateTodayChallenge(state, now);

  // Discours vocal grand frère (TTS)
  const ttsMessage = `${greeting} ${state.profile.name || ""}. ${grandBrotherMsg} Il te reste ${allowance.dailyAllowance.toLocaleString("fr-FR")} francs par jour jusqu'à la fin du mois. ${allowance.humanMessage}`;

  return (
    <div className="flex flex-col min-h-full pb-24 text-[#1F1A15]">
      {/* 4.2 Zone haute */}
      <div className="pt-4 pb-3 px-5 border-b border-[#E8DDC9]/40 bg-[#FAF6EF]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-fraunces text-lg font-semibold text-[#1F1A15]">
              {greeting}, {state.profile.name || "Michael"}
            </h1>
            <p className="text-xs text-[#8A8884] capitalize">{dateFormatted}</p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bouton Mode Focus Dépenses */}
            <button
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`p-2 rounded-full transition-colors ${
                isFocusMode
                  ? "bg-[#B5541F] text-white"
                  : "text-[#55534F] hover:bg-[#E8DDC9]/50"
              }`}
              title={isFocusMode ? "Quitter le mode focus" : "Mode focus dépenses"}
            >
              <Focus className="w-4 h-4" />
            </button>

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

        {/* Ligne double : Solde disponible & Streak « Jours Maîtrisés » (P0 WAOUH) */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <button
            type="button"
            onClick={onSetPocketBalance}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8DDC9] hover:border-[#B5541F]/60 shadow-2xs text-xs transition-all active:scale-98"
            title="Modifier le solde disponible"
          >
            <span className="w-2 h-2 rounded-full bg-[#4A6B3F] shrink-0" />
            <span className="text-[#55534F]">Solde :</span>
            <span className="font-bold text-[#1F1A15] font-fraunces">
              {state.profile.pocketBalance !== undefined ? (
                <AnimatedCounter value={state.profile.pocketBalance} />
              ) : (
                "Définir"
              )}
            </span>
          </button>

          {/* Streak Jours Maîtrisés avec badge de palier */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium shadow-2xs transition-all ${
              streak.flameLevel >= 3
                ? "bg-[#C9922E]/15 border-[#C9922E] text-[#8F6618]"
                : streak.flameLevel === 2
                ? "bg-[#B5541F]/10 border-[#B5541F]/40 text-[#B5541F]"
                : "bg-white border-[#E8DDC9] text-[#55534F]"
            }`}
            title={streak.message || `${streak.streakDays} jours consécutifs sans dépassement`}
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                streak.flameLevel >= 2 ? "text-[#B5541F] fill-[#B5541F]" : "text-[#8A8884]"
              }`}
            />
            <span className="font-bold">{streak.streakDays} j</span>
            <span className="text-[10px] text-[#8A8884]">
              {streak.streakDays <= 1 ? "maîtrisé" : "maîtrisés"}
            </span>
            {streak.badgeName && streak.streakDays >= 7 && (
              <span className="text-[10px] font-semibold text-[#8F6618]">
                • {streak.badgeName}
              </span>
            )}
            {streak.streakDays >= 7 && (
              <Sparkles className="w-3 h-3 text-[#C9922E] fill-[#C9922E]" />
            )}
          </div>
        </div>
      </div>

      {/* Mode « Paie reçue » (1.2 PRO) */}
      {isPaydayPeriod && !isFocusMode && (
        <div className="mx-5 mt-3 p-3 bg-white border border-[#C9922E]/50 rounded-[16px] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-[#4A6B3F]/10 text-[#4A6B3F] shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9922E] block">
                Période de paie
              </span>
              <p className="text-xs text-[#1F1A15] font-semibold">
                Tu as reçu ton salaire ou ta bourse ?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPaydayModal(true)}
            className="px-3 py-1.5 bg-[#4A6B3F] hover:bg-[#3D5A33] text-white rounded-full text-xs font-semibold shrink-0 transition-all active:scale-95 shadow-2xs"
          >
            Mettre à jour
          </button>
        </div>
      )}

      {/* Message du Grand Frère (P1 WAOUH) */}
      {!isFocusMode && (
        <div className="mx-5 mt-3 px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8DDC9] rounded-[14px] flex items-start gap-2.5 shadow-2xs">
          <div className="p-1.5 rounded-full bg-white text-[#B5541F] shrink-0 mt-0.5 border border-[#E8DDC9]">
            <MessageCircle className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B5541F]">
              Le mot du Grand Frère
            </span>
            <p className="text-xs text-[#55534F] font-medium leading-relaxed mt-0.5">
              {grandBrotherMsg}
            </p>
          </div>
        </div>
      )}

      {/* Radar de fin de mois (P0 WAOUH) */}
      {!isFocusMode && (
        <div className="mx-5 mt-2.5 p-3 bg-white border border-[#E8DDC9] rounded-[16px] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-full ${
                radar.status === "green"
                  ? "bg-[#4A6B3F]/10 text-[#4A6B3F]"
                  : radar.status === "orange"
                  ? "bg-[#C9922E]/10 text-[#C9922E]"
                  : "bg-[#A8453F]/10 text-[#A8453F]"
              }`}
            >
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8884]">
                  Radar fin de mois
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    radar.status === "green"
                      ? "bg-[#4A6B3F]/15 text-[#4A6B3F]"
                      : radar.status === "orange"
                      ? "bg-[#C9922E]/15 text-[#C9922E]"
                      : "bg-[#A8453F]/15 text-[#A8453F]"
                  }`}
                >
                  {radar.status === "green"
                    ? "Cap serein"
                    : radar.status === "orange"
                    ? "Vigilance"
                    : "Risque déficit"}
                </span>
              </div>
              <p className="text-xs text-[#1F1A15] font-medium mt-0.5">{radar.shortPhrase}</p>
            </div>
          </div>
          <div className="text-right pl-2 shrink-0">
            <span className="text-[9px] text-[#8A8884] block">Prévu le {radar.lastDayOfMonth}</span>
            <div
              className={`font-fraunces text-sm font-bold ${
                radar.status === "green"
                  ? "text-[#4A6B3F]"
                  : radar.status === "orange"
                  ? "text-[#C9922E]"
                  : "text-[#A8453F]"
              }`}
            >
              <AnimatedCounter value={radar.projectedBalance} />
            </div>
          </div>
        </div>
      )}

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
          <div
            className={`font-fraunces text-5xl sm:text-6xl font-bold tracking-tight tab-num transition-colors ${
              state.profile.privateMode ? "filter blur-sm select-none" : ""
            }`}
            style={{ color: allowance.statusColor }}
          >
            <AnimatedCounter
              value={allowance.dailyAllowance}
              className="font-fraunces text-5xl sm:text-6xl font-bold"
              color={allowance.statusColor}
            />
          </div>
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
              className="text-[#55534F] cursor-pointer hover:underline inline-flex items-center gap-1 justify-center"
            >
              <span>Tu as</span>
              <strong className="text-[#1F1A15] font-semibold">
                <AnimatedCounter value={state.profile.pocketBalance} />
              </strong>
              <span>en poche</span>
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

      {/* Bandeau Mode Focus Dépenses (P3 WAOUH) */}
      {isFocusMode && (
        <div className="mx-5 mb-4 p-3 bg-white border border-[#B5541F]/40 rounded-[14px] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#1F1A15]">
            <Focus className="w-4 h-4 text-[#B5541F]" />
            <span className="font-semibold">Mode Focus Dépenses actif</span>
            <span className="text-[#8A8884] text-[11px] hidden sm:inline">— Saisie directe sans distraction</span>
          </div>
          <button
            type="button"
            onClick={() => setIsFocusMode(false)}
            className="text-[11px] font-semibold text-[#B5541F] hover:underline"
          >
            Quitter le focus
          </button>
        </div>
      )}

      {/* 16.4 Objectif / Défi du jour avec passage, validation, échec et réinitialisation */}
      {!isFocusMode && currentChallenge && (
        <div className="mx-5 mb-6 p-4 rounded-[14px] bg-[#FAF6EF] border border-[#E8DDC9] shadow-2xs">
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white border border-[#E8DDC9] flex items-center justify-center shrink-0 mt-0.5">
                {currentChallenge.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-[#4A6B3F]" />
                ) : currentChallenge.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-[#A8453F]" />
                ) : currentChallenge.status === "skipped" ? (
                  <SkipForward className="w-4 h-4 text-[#8A8884]" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#C9922E]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8A8884] uppercase font-bold tracking-wider">
                    Objectif du jour
                  </span>
                  {/* Badge d'état */}
                  {currentChallenge.status === "completed" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4A6B3F]/10 text-[#4A6B3F]">
                      Validé
                    </span>
                  )}
                  {currentChallenge.status === "failed" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#A8453F]/10 text-[#A8453F]">
                      Échoué
                    </span>
                  )}
                  {currentChallenge.status === "skipped" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#8A8884]/15 text-[#55534F]">
                      Passé
                    </span>
                  )}
                  {currentChallenge.status === "accepted" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C9922E]/15 text-[#8F6618]">
                      En cours
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#1F1A15] font-medium leading-tight mt-0.5">
                  {currentChallenge.title}
                </p>
                <span className="text-[11px] text-[#4A6B3F] font-semibold mt-0.5 block">
                  Économie estimée : +{formatFCFA(currentChallenge.estimatedSavings)} vers ton objectif
                </span>
              </div>
            </div>

            {/* Bouton réinitialiser si l'état est résolu */}
            {currentChallenge.status !== "pending" && (
              <button
                type="button"
                onClick={() => onResetChallenge(currentChallenge.id)}
                className="p-1.5 text-[#8A8884] hover:text-[#1F1A15] rounded-full hover:bg-[#E8DDC9]/40 transition-colors"
                title="Réinitialiser l'objectif du jour"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actions interactives selon le statut */}
          {currentChallenge.status === "pending" && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#E8DDC9]/60">
              <button
                type="button"
                onClick={() => onValidateChallenge(currentChallenge)}
                className="flex-1 py-1.5 px-3 bg-[#4A6B3F] hover:bg-[#3D5933] text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Valider</span>
              </button>

              <button
                type="button"
                onClick={() => onFailChallenge(currentChallenge)}
                className="py-1.5 px-3 bg-white border border-[#E8DDC9] hover:border-[#A8453F] text-[#A8453F] rounded-full text-xs font-semibold flex items-center justify-center gap-1 active:scale-98 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Échoué</span>
              </button>

              <button
                type="button"
                onClick={() => onSkipChallenge(currentChallenge)}
                className="py-1.5 px-3 text-xs text-[#8A8884] hover:text-[#1F1A15] font-medium flex items-center gap-1 transition-colors"
              >
                <SkipForward className="w-3 h-3" />
                <span>Passer</span>
              </button>
            </div>
          )}

          {currentChallenge.status === "accepted" && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#E8DDC9]/60">
              <button
                type="button"
                onClick={() => onValidateChallenge(currentChallenge)}
                className="flex-1 py-1.5 px-3 bg-[#4A6B3F] hover:bg-[#3D5933] text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Valider l'objectif</span>
              </button>

              <button
                type="button"
                onClick={() => onFailChallenge(currentChallenge)}
                className="py-1.5 px-3 bg-white border border-[#E8DDC9] hover:border-[#A8453F] text-[#A8453F] rounded-full text-xs font-semibold flex items-center justify-center gap-1 active:scale-98 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Échoué</span>
              </button>

              <button
                type="button"
                onClick={() => onSkipChallenge(currentChallenge)}
                className="py-1.5 px-3 text-xs text-[#8A8884] hover:text-[#1F1A15] font-medium flex items-center gap-1 transition-colors"
              >
                <SkipForward className="w-3 h-3" />
                <span>Passer</span>
              </button>
            </div>
          )}

          {currentChallenge.status === "completed" && (
            <div className="pt-2 border-t border-[#E8DDC9]/60 flex items-center justify-between text-xs text-[#4A6B3F]">
              <span className="font-medium">Objectif accompli aujourd'hui avec brio.</span>
              <button
                type="button"
                onClick={() => onResetChallenge(currentChallenge.id)}
                className="text-[11px] underline text-[#55534F] hover:text-[#1F1A15]"
              >
                Modifier
              </button>
            </div>
          )}

          {currentChallenge.status === "failed" && (
            <div className="pt-2 border-t border-[#E8DDC9]/60 flex items-center justify-between text-xs text-[#A8453F]">
              <span className="font-medium">Objectif non tenu aujourd'hui. Nouveau départ demain !</span>
              <button
                type="button"
                onClick={() => onResetChallenge(currentChallenge.id)}
                className="text-[11px] underline text-[#55534F] hover:text-[#1F1A15]"
              >
                Modifier
              </button>
            </div>
          )}

          {currentChallenge.status === "skipped" && (
            <div className="pt-2 border-t border-[#E8DDC9]/60 flex items-center justify-between text-xs text-[#8A8884]">
              <span>Objectif ignoré pour aujourd'hui.</span>
              <button
                type="button"
                onClick={() => onResetChallenge(currentChallenge.id)}
                className="text-[11px] underline text-[#55534F] hover:text-[#1F1A15]"
              >
                Reprendre
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4.7 Les dernières dépenses */}
      {!isFocusMode && (
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
      )}

      {/* Modal 1.2 PRO : Mode Paie reçue */}
      <AnimatePresence>
        {showPaydayModal && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={() => setShowPaydayModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#FAF6EF] rounded-[20px] p-5 shadow-2xl border border-[#E8DDC9]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-[#4A6B3F]/15 text-[#4A6B3F]">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-fraunces text-base font-bold text-[#1F1A15]">
                      Mode Paie reçue
                    </h3>
                    <p className="text-[11px] text-[#8A8884]">
                      Salaire, bourse ou aide familiale
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaydayModal(false)}
                  className="p-1 rounded-full text-[#8A8884] hover:bg-[#E8DDC9]/40"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#55534F] mb-3 leading-relaxed">
                Tu as reçu ton argent ? Renseigne le montant reçu pour mettre à jour instantanément ton solde disponible et recalculer ton allocation quotidienne jusqu’à la fin du mois.
              </p>

              <form onSubmit={handlePaydaySubmit} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#8A8884] uppercase tracking-wider block mb-1">
                    Montant perçu en FCFA
                  </label>
                  <input
                    type="number"
                    autoFocus
                    placeholder="Ex: 50000"
                    value={paydayAmountInput}
                    onChange={(e) => setPaydayAmountInput(e.target.value)}
                    className="w-full p-3 bg-white rounded-xl border border-[#E8DDC9] focus:border-[#4A6B3F] text-xl font-bold font-fraunces text-[#1F1A15] outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={Number(paydayAmountInput) <= 0}
                    className="flex-1 py-3 bg-[#4A6B3F] disabled:opacity-40 hover:bg-[#3D5A33] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
                  >
                    Mettre à jour mon solde
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaydayModal(false)}
                    className="px-4 py-3 bg-white text-[#55534F] rounded-xl text-xs font-medium border border-[#E8DDC9] hover:bg-[#FAF6EF]"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
