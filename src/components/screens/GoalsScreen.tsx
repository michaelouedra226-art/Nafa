import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { AppState, Goal, GoalMode, GoalVisual } from "../../types";
import { CaurisIcon, CalebasseIcon, BaobabIcon, BogolanFrise } from "../icons/CustomIcons";
import { ProgressionVisualTree } from "../goals/ProgressionVisualTree";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { soundEffects, triggerHapticFeedback } from "../../utils/hapticsAndAudio";
import { formatFCFA, simulateDeposit } from "../../utils/engine";
import { Plus, MoreVertical, X, Check, Share2, Award, Calendar, Sparkles, Calculator, ArrowRight, Banknote } from "lucide-react";

interface GoalsScreenProps {
  state: AppState;
  onAddAmountToGoal: (goalId: string, amount: number) => void;
  onCreateGoal: (goal: Omit<Goal, "id" | "currentAmount">) => void;
  onDeleteGoal: (goalId: string) => void;
  onArchiveGoal: (goalId: string) => void;
}

export const GoalsScreen: React.FC<GoalsScreenProps> = ({
  state,
  onAddAmountToGoal,
  onCreateGoal,
  onDeleteGoal,
  onArchiveGoal,
}) => {
  const [showCaurisBoard, setShowCaurisBoard] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [selectedGoalForAdd, setSelectedGoalForAdd] = useState<Goal | null>(null);
  const [amountToAddStr, setAmountToAddStr] = useState("");
  const [quickSimAmount, setQuickSimAmount] = useState<number>(2000);

  // Gestion de la touche retour pour fermer les dialogues internes
  useEffect(() => {
    const handleScreenBack = (e: Event) => {
      const customEv = e as CustomEvent;
      if (showNewGoalModal) {
        setShowNewGoalModal(false);
        customEv.detail?.markHandled?.();
      } else if (showCaurisBoard) {
        setShowCaurisBoard(false);
        customEv.detail?.markHandled?.();
      } else if (selectedGoalForAdd) {
        setSelectedGoalForAdd(null);
        customEv.detail?.markHandled?.();
      }
    };
    window.addEventListener("nafa:screen-back", handleScreenBack);
    return () => window.removeEventListener("nafa:screen-back", handleScreenBack);
  }, [showNewGoalModal, showCaurisBoard, selectedGoalForAdd]);

  // Nouveaux champs pour création d'objectif
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalVisual, setNewGoalVisual] = useState<GoalVisual>("cauris");
  const [newGoalMode, setNewGoalMode] = useState<GoalMode>("libre");
  const [newGoalDate, setNewGoalDate] = useState("");
  const [newGoalRegularAmount, setNewGoalRegularAmount] = useState("");
  const [newGoalRegularFreq, setNewGoalRegularFreq] = useState<"hebdomadaire" | "mensuelle">("mensuelle");
  const [newGoalWitnessName, setNewGoalWitnessName] = useState("");
  const [newGoalWitnessPhone, setNewGoalWitnessPhone] = useState("");

  const activeGoals = state.goals.filter((g) => !g.completed && !g.archived);
  const completedGoals = state.goals.filter((g) => g.completed);

  const [flyingBill, setFlyingBill] = useState<{ amount: number; goalName: string } | null>(null);

  const handleDeposit = () => {
    if (!selectedGoalForAdd || Number(amountToAddStr) <= 0) return;
    const addedAmount = Number(amountToAddStr);
    const targetGoal = selectedGoalForAdd;

    // Déclenchement de l'animation du billet volant vers l'objectif
    setFlyingBill({ amount: addedAmount, goalName: targetGoal.name });
    soundEffects.playCaurisClink();
    triggerHapticFeedback([30, 40, 30]);

    setTimeout(() => {
      onAddAmountToGoal(targetGoal.id, addedAmount);

      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
        colors: ["#C9922E", "#B5541F", "#4A6B3F"],
      });

      setSelectedGoalForAdd(null);
      setAmountToAddStr("");
      setFlyingBill(null);
    }, 650);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim() || Number(newGoalTarget) <= 0) return;

    onCreateGoal({
      name: newGoalName.trim(),
      targetAmount: Number(newGoalTarget),
      visual: newGoalVisual,
      mode: newGoalMode,
      targetDate: newGoalDate || undefined,
      regularAmount: newGoalRegularAmount ? Number(newGoalRegularAmount) : undefined,
      regularFrequency: newGoalMode === "regulier" ? newGoalRegularFreq : undefined,
      witnessName: newGoalMode === "temoin" ? newGoalWitnessName.trim() : undefined,
      witnessPhone: newGoalMode === "temoin" ? newGoalWitnessPhone.trim() : undefined,
    });

    setShowNewGoalModal(false);
    setNewGoalName("");
    setNewGoalTarget("");
    setNewGoalDate("");
    setNewGoalRegularAmount("");
    setNewGoalWitnessName("");
    setNewGoalWitnessPhone("");
  };

  return (
    <div className="flex flex-col min-h-full pb-24 text-[#1F1A15]">
      {/* 5.1 En-tête */}
      <div className="flex items-center justify-between pt-4 pb-3 px-5 border-b border-[#E8DDC9]/40 bg-[#FAF6EF]">
        <div>
          <h1 className="font-fraunces text-xl font-semibold text-[#1F1A15]">
            Tes objectifs
          </h1>
          <p className="text-xs text-[#8A8884]">
            Ce pour quoi tu gardes de l'argent.
          </p>
        </div>

        {/* Accès au tableau de cauris (Partie 2.7 & 5.1) */}
        <button
          type="button"
          onClick={() => setShowCaurisBoard((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
            showCaurisBoard
              ? "bg-[#C9922E] text-white border-[#C9922E]"
              : "bg-white text-[#1F1A15] border-[#E8DDC9] hover:bg-[#FAF6EF]"
          }`}
          title="Tableau personnel de cauris"
        >
          <CaurisIcon size={16} color={showCaurisBoard ? "#FFFFFF" : "#C9922E"} filled />
          <span>Tableau ({completedGoals.length})</span>
        </button>
      </div>

      {/* 2.7 & 5.7 Le Tableau de Cauris Personnel */}
      {showCaurisBoard && (
        <div className="mx-5 my-4 p-4 rounded-[14px] bg-[#FAF6EF] border border-[#C9922E]/40 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-fraunces text-sm font-semibold text-[#C9922E] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#C9922E]" />
              <span>Tableau des Cauris d'Or</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowCaurisBoard(false)}
              className="text-xs text-[#8A8884]"
            >
              Fermer
            </button>
          </div>

          {completedGoals.length === 0 ? (
            <div className="py-4 text-center">
              <CaurisIcon size={32} color="#E8DDC9" className="mx-auto mb-2" />
              <p className="text-xs text-[#8A8884] italic">
                Ton premier cauris t'attend.
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {completedGoals.map((cg) => (
                <div
                  key={cg.id}
                  className="flex flex-col items-center shrink-0 p-2.5 bg-white rounded-[12px] border border-[#E8DDC9] min-w-[90px] text-center"
                >
                  <CaurisIcon size={24} color="#C9922E" filled className="mb-1" />
                  <span className="text-xs font-semibold text-[#1F1A15] truncate max-w-[80px]">
                    {cg.name}
                  </span>
                  <span className="text-[10px] text-[#4A6B3F] font-medium tab-num">
                    {formatFCFA(cg.targetAmount)}
                  </span>
                  <span className="text-[9px] text-[#8A8884] mt-0.5">
                    {cg.completedDate || "Atteint"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[#8A8884] mt-2 italic text-center">
            Ce tableau raconte ton histoire d'épargne. Il n'est jamais partagé automatiquement.
          </p>
        </div>
      )}

      {/* Bouton créer objectif */}
      <div className="px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={() => setShowNewGoalModal(true)}
          className="w-full py-3 border border-dashed border-[#B5541F] bg-[#B5541F]/5 text-[#B5541F] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#B5541F]/10 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel objectif d'épargne</span>
        </button>
      </div>

      {/* Simulation rapide "Et si..." (P0 WAOUH) */}
      {activeGoals.length > 0 && (() => {
        const simTargetGoal = activeGoals[0];
        const simResult = simulateDeposit(state, quickSimAmount, simTargetGoal.id);
        return (
          <div className="mx-5 mt-2 mb-1 p-3.5 bg-white border border-[#E8DDC9] rounded-[16px] shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1F1A15]">
                <Calculator className="w-3.5 h-3.5 text-[#B5541F]" />
                <span>Simulation « Et si... »</span>
              </div>
              <span className="text-[10px] text-[#8A8884]">Projection directe</span>
            </div>

            <p className="text-xs text-[#55534F] leading-relaxed">
              Si tu mets <strong className="text-[#B5541F] font-semibold">{formatFCFA(quickSimAmount)}</strong> de côté sur{" "}
              <span className="font-semibold text-[#1F1A15]">{simResult.targetGoal?.name || "ton projet"}</span>, ton solde disponible sera de{" "}
              <strong className="text-[#1F1A15] font-semibold">{formatFCFA(simResult.newBalance)}</strong> et ta progression passera à{" "}
              <strong className="text-[#4A6B3F] font-semibold">{simResult.newPercentage}%</strong>.
            </p>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#E8DDC9]/50">
              <div className="flex items-center gap-1.5">
                {[1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuickSimAmount(amt)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      quickSimAmount === amt
                        ? "bg-[#B5541F] text-white"
                        : "bg-[#FAF6EF] text-[#55534F] hover:bg-[#E8DDC9]/60"
                    }`}
                  >
                    +{amt} F
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (simResult.targetGoal) {
                    setSelectedGoalForAdd(simResult.targetGoal);
                    setAmountToAddStr(quickSimAmount.toString());
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#FAF6EF] hover:bg-[#B5541F] text-[#B5541F] hover:text-white rounded-full text-xs font-semibold border border-[#B5541F]/40 transition-colors"
              >
                <span>Verser</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* 5.2 Cartes d'objectif */}
      <div className="p-5 space-y-4">
        {activeGoals.length === 0 ? (
          <div className="p-8 bg-white rounded-[14px] border border-[#E8DDC9] text-center">
            <CalebasseIcon size={36} color="#B5541F" className="mx-auto mb-3" />
            <p className="text-xs text-[#55534F] mb-3">
              Aucun objectif en cours. Crées-en un — même petit.
            </p>
            <button
              type="button"
              onClick={() => setShowNewGoalModal(true)}
              className="px-4 py-2 bg-[#B5541F] text-white text-xs font-medium rounded-full"
            >
              Créer mon premier projet
            </button>
          </div>
        ) : (
          activeGoals.map((goal) => {
            const ratio = Math.min(1, goal.currentAmount / goal.targetAmount);
            const percentage = Math.round(ratio * 100);

            return (
              <div
                key={goal.id}
                className="bg-white rounded-[16px] border border-[#E8DDC9] p-5 shadow-xs transition-all hover:border-[#B5541F]/40"
              >
                {/* Visual vivant (Baobab / Calebasse / Cauris) & Titre */}
                <div className="mb-4">
                  <ProgressionVisualTree goal={goal} percentage={percentage} />
                </div>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-fraunces text-lg font-bold text-[#1F1A15] leading-tight">
                      {goal.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {goal.targetDate && (
                        <span className="text-[10px] text-[#8A8884] flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          pour {goal.targetDate}
                        </span>
                      )}
                      {goal.mode === "temoin" && goal.witnessName && (
                        <span className="text-[10px] text-[#1E2A44] font-medium px-1.5 py-0.5 rounded bg-[#1E2A44]/10">
                          Témoin : {goal.witnessName}
                        </span>
                      )}
                      {goal.isEmergencyFund && (
                        <span className="text-[10px] text-[#4A6B3F] font-medium px-1.5 py-0.5 rounded bg-[#4A6B3F]/10">
                          Fonds d'urgence
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions discrètes */}
                  <div className="flex items-center gap-1">
                    {!goal.isEmergencyFund && (
                      <button
                        type="button"
                        onClick={() => onDeleteGoal(goal.id)}
                        className="p-1 text-[#8A8884] hover:text-[#A8453F]"
                        title="Supprimer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Zone montant avec animation de comptage fluide */}
                <div className="flex items-baseline justify-between mb-2">
                  <div className="font-fraunces text-2xl font-bold text-[#1F1A15] tab-num">
                    <AnimatedCounter value={goal.currentAmount} />
                  </div>
                  <span className="text-xs text-[#8A8884] tab-num">
                    sur {formatFCFA(goal.targetAmount)}
                  </span>
                </div>

                {/* Barre de progression remplie en or sahélien */}
                <div className="w-full h-2 bg-[#FAF6EF] rounded-full overflow-hidden border border-[#E8DDC9]/50 mb-2">
                  <div
                    className="h-full bg-[#C9922E] rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Sous la barre : % + message */}
                <div className="flex items-center justify-between text-[11px] text-[#8A8884] mb-4">
                  <span className="font-semibold text-[#C9922E]">{percentage}%</span>
                  <span>
                    {percentage >= 80 && percentage < 100
                      ? "Tu approches du but !"
                      : percentage >= 50
                      ? "Plus que la moitié à parcourir"
                      : "Chaque pas te rapproche"}
                  </span>
                </div>

                {/* Bouton principal Ajouter à cet objectif */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGoalForAdd(goal);
                      setAmountToAddStr("");
                    }}
                    className="flex-1 py-2.5 bg-[#FAF6EF] hover:bg-[#B5541F] text-[#B5541F] hover:text-white border border-[#B5541F]/40 rounded-full text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter à cet objectif</span>
                  </button>

                  {goal.mode === "temoin" && goal.witnessPhone && (
                    <a
                      href={`https://wa.me/${goal.witnessPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Salut ${goal.witnessName}, je progresse sur mon objectif ${goal.name} : j'ai atteint ${percentage}% (${formatFCFA(
                          goal.currentAmount
                        )}) sur NAFA !`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-[#4A6B3F]/10 text-[#4A6B3F] hover:bg-[#4A6B3F]/20 rounded-full text-xs"
                      title="Partager l'avancée avec mon témoin WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Versement ponctuel */}
      {selectedGoalForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-xs bg-[#FAF6EF] rounded-[18px] p-5 shadow-xl border border-[#E8DDC9]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-fraunces text-base font-semibold text-[#1F1A15] mb-1">
              Verser pour {selectedGoalForAdd.name}
            </h3>
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-[#8A8884]">Solde disponible :</span>
              <strong className="text-[#1F1A15] font-semibold">
                {state.profile.pocketBalance !== undefined
                  ? `${state.profile.pocketBalance.toLocaleString("fr-FR")} F`
                  : "Non défini"}
              </strong>
            </div>

            <input
              type="number"
              autoFocus
              value={amountToAddStr}
              onChange={(e) => setAmountToAddStr(e.target.value)}
              placeholder="Montant en FCFA"
              className={`w-full p-2.5 bg-white rounded-lg border text-base font-bold font-fraunces focus:outline-none mb-2 ${
                state.profile.pocketBalance !== undefined && Number(amountToAddStr) > state.profile.pocketBalance
                  ? "border-red-500 text-red-600 focus:border-red-500"
                  : "border-[#E8DDC9] focus:border-[#B5541F]"
              }`}
            />

            {state.profile.pocketBalance !== undefined && Number(amountToAddStr) > state.profile.pocketBalance && (
              <p className="text-[11px] text-red-600 font-semibold mb-3">
                Solde insuffisant. Il te reste {state.profile.pocketBalance.toLocaleString("fr-FR")} F.
              </p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleDeposit}
                disabled={
                  Number(amountToAddStr) <= 0 ||
                  (state.profile.pocketBalance !== undefined && Number(amountToAddStr) > state.profile.pocketBalance)
                }
                className="flex-1 py-2 bg-[#B5541F] disabled:opacity-40 text-white rounded-full text-xs font-semibold active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Verser</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGoalForAdd(null)}
                className="px-3 py-2 bg-white text-[#55534F] rounded-full text-xs hover:bg-[#FAF6EF]"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation 2.4 : Billet volant vers l'objectif */}
      <AnimatePresence>
        {flyingBill && (
          <div className="fixed inset-0 pointer-events-none z-70 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, y: 120, opacity: 0, rotate: -8 }}
              animate={{
                scale: [0.8, 1.25, 1],
                y: [120, -60, -180],
                opacity: [0, 1, 0],
                rotate: [-8, 6, -4],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: "easeInOut" }}
              className="px-4 py-2.5 bg-[#4A6B3F] text-white rounded-2xl shadow-xl flex items-center gap-2 border-2 border-[#C9922E]"
            >
              <Banknote className="w-6 h-6 text-[#FAF6EF]" />
              <div className="flex flex-col">
                <span className="font-fraunces text-sm font-bold text-white">
                  +{flyingBill.amount.toLocaleString("fr-FR")} F
                </span>
                <span className="text-[10px] text-[#FAF6EF]/80 font-medium">
                  vers {flyingBill.goalName}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Création d'un objectif (Partie 5.5) */}
      {showNewGoalModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs">
          <div
            className="w-full max-w-md mx-auto bg-[#FAF6EF] rounded-t-[20px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border-t border-[#E8DDC9]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-3 pb-2 px-6 flex flex-col items-center border-b border-[#E8DDC9]/50">
              <div className="w-10 h-1 bg-[#E8DDC9] rounded-full mb-3" />
              <div className="w-full flex items-center justify-between">
                <h2 className="font-fraunces text-xl font-semibold text-[#1F1A15]">
                  Nouvel objectif
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewGoalModal(false)}
                  className="p-1 text-[#8A8884] hover:text-[#1F1A15]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs text-[#8A8884] mb-1">Nom du projet *</label>
                <input
                  type="text"
                  required
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="Ex: Mon ordinateur, Scooter..."
                  className="w-full p-2.5 text-sm bg-white rounded-lg border border-[#E8DDC9] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A8884] mb-1">Montant cible (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="Ex: 180000"
                  className="w-full p-2.5 text-sm bg-white rounded-lg border border-[#E8DDC9] focus:outline-none font-bold"
                />
              </div>

              {/* Choix du visuel (Partie 5.3) */}
              <div>
                <label className="block text-xs text-[#8A8884] mb-1.5">Symbole de progression</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewGoalVisual("cauris")}
                    className={`p-2.5 rounded-lg border text-center text-xs flex flex-col items-center gap-1 ${
                      newGoalVisual === "cauris"
                        ? "border-[#B5541F] bg-[#B5541F]/10 text-[#B5541F] font-bold"
                        : "border-[#E8DDC9] bg-white text-[#55534F]"
                    }`}
                  >
                    <CaurisIcon size={20} color="#B5541F" filled />
                    <span>Cauris</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewGoalVisual("calebasse")}
                    className={`p-2.5 rounded-lg border text-center text-xs flex flex-col items-center gap-1 ${
                      newGoalVisual === "calebasse"
                        ? "border-[#B5541F] bg-[#B5541F]/10 text-[#B5541F] font-bold"
                        : "border-[#E8DDC9] bg-white text-[#55534F]"
                    }`}
                  >
                    <CalebasseIcon size={20} color="#B5541F" active />
                    <span>Calebasse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewGoalVisual("baobab")}
                    className={`p-2.5 rounded-lg border text-center text-xs flex flex-col items-center gap-1 ${
                      newGoalVisual === "baobab"
                        ? "border-[#B5541F] bg-[#B5541F]/10 text-[#B5541F] font-bold"
                        : "border-[#E8DDC9] bg-white text-[#55534F]"
                    }`}
                  >
                    <BaobabIcon size={20} color="#4A6B3F" stage={3} />
                    <span>Baobab</span>
                  </button>
                </div>
              </div>

              {/* Mode d'objectif (Partie 5.4) */}
              <div>
                <label className="block text-xs text-[#8A8884] mb-1.5">Mode de versement</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewGoalMode("libre")}
                    className={`py-2 px-1 text-xs rounded-lg border text-center ${
                      newGoalMode === "libre"
                        ? "bg-[#B5541F] text-white border-[#B5541F]"
                        : "bg-white text-[#55534F] border-[#E8DDC9]"
                    }`}
                  >
                    Libre
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGoalMode("regulier")}
                    className={`py-2 px-1 text-xs rounded-lg border text-center ${
                      newGoalMode === "regulier"
                        ? "bg-[#B5541F] text-white border-[#B5541F]"
                        : "bg-white text-[#55534F] border-[#E8DDC9]"
                    }`}
                  >
                    Régulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGoalMode("temoin")}
                    className={`py-2 px-1 text-xs rounded-lg border text-center ${
                      newGoalMode === "temoin"
                        ? "bg-[#B5541F] text-white border-[#B5541F]"
                        : "bg-white text-[#55534F] border-[#E8DDC9]"
                    }`}
                  >
                    Avec témoin
                  </button>
                </div>
              </div>

              {newGoalMode === "regulier" && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-lg border border-[#E8DDC9]">
                  <input
                    type="number"
                    placeholder="Montant régulier"
                    value={newGoalRegularAmount}
                    onChange={(e) => setNewGoalRegularAmount(e.target.value)}
                    className="p-2 text-xs bg-[#FAF6EF] rounded border border-[#E8DDC9]"
                  />
                  <select
                    value={newGoalRegularFreq}
                    onChange={(e) => setNewGoalRegularFreq(e.target.value as any)}
                    className="p-2 text-xs bg-[#FAF6EF] rounded border border-[#E8DDC9]"
                  >
                    <option value="mensuelle">Par mois</option>
                    <option value="hebdomadaire">Par semaine</option>
                  </select>
                </div>
              )}

              {newGoalMode === "temoin" && (
                <div className="space-y-2 p-3 bg-white rounded-lg border border-[#E8DDC9]">
                  <p className="text-[11px] text-[#8A8884]">
                    Tontine numérique : un proche (frère, ami, oncle) pour t'encourager.
                  </p>
                  <input
                    type="text"
                    placeholder="Nom du témoin (ex: Frère Moussa)"
                    value={newGoalWitnessName}
                    onChange={(e) => setNewGoalWitnessName(e.target.value)}
                    className="w-full p-2 text-xs bg-[#FAF6EF] rounded border border-[#E8DDC9]"
                  />
                  <input
                    type="tel"
                    placeholder="Numéro WhatsApp du témoin (optionnel)"
                    value={newGoalWitnessPhone}
                    onChange={(e) => setNewGoalWitnessPhone(e.target.value)}
                    className="w-full p-2 text-xs bg-[#FAF6EF] rounded border border-[#E8DDC9]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-[#8A8884] mb-1">Date souhaitée (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: fin décembre, pour la rentrée..."
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!newGoalName.trim() || Number(newGoalTarget) <= 0}
                  className="w-full py-3.5 bg-[#B5541F] disabled:opacity-40 text-white rounded-full text-xs font-semibold shadow-sm active:scale-98"
                >
                  Enregistrer l'objectif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
