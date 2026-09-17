import React, { useState } from "react";
import { motion } from "motion/react";
import { Category, Expense, Goal, RoundingUnit } from "../../types";
import { CaurisIcon } from "../icons/CustomIcons";
import { calculateRoundUp, formatFCFA } from "../../utils/engine";
import { X, Calendar, Delete } from "lucide-react";

interface NewExpenseModalProps {
  categories: Category[];
  goals: Goal[];
  smallestDenomination: RoundingUnit;
  roundUpSavingsEnabled: boolean;
  onClose: () => void;
  onAddExpense: (expense: Omit<Expense, "id">, roundUpToGoalId?: string) => void;
  defaultCategory?: string;
  defaultAmount?: number;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  categories,
  goals,
  smallestDenomination,
  roundUpSavingsEnabled,
  onClose,
  onAddExpense,
  defaultCategory,
  defaultAmount,
}) => {
  const [amountStr, setAmountStr] = useState<string>(defaultAmount ? defaultAmount.toString() : "");
  const [categoryId, setCategoryId] = useState<string>(
    defaultCategory || categories[0]?.id || "cat_nourriture"
  );
  const [note, setNote] = useState<string>("");
  const [dateOption, setDateOption] = useState<"today" | "yesterday" | "custom">("today");
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [acceptRoundUp, setAcceptRoundUp] = useState<boolean>(true);
  const [showFlyAnim, setShowFlyAnim] = useState<boolean>(false);

  const activeGoal = goals.find((g) => !g.completed && !g.archived);
  const currentAmount = Number(amountStr) || 0;
  const roundUpCalc = calculateRoundUp(currentAmount, smallestDenomination);

  // Keypad click handler
  const handleKeyClick = (val: string) => {
    if (val === "C") {
      setAmountStr("");
      return;
    }
    if (val === "BACK") {
      setAmountStr((prev) => prev.slice(0, -1));
      return;
    }
    if (val.startsWith("+")) {
      const add = Number(val.slice(1));
      const current = Number(amountStr) || 0;
      setAmountStr((current + add).toString());
      return;
    }
    // Chiffres 0-9
    if (amountStr.length >= 8) return; // Limite raisonnable
    setAmountStr((prev) => (prev === "0" ? val : prev + val));
  };

  const handleValidate = () => {
    if (currentAmount <= 0) return;

    setShowFlyAnim(true);

    let timestamp = Date.now();
    if (dateOption === "yesterday") {
      timestamp = Date.now() - 86400000;
    } else if (dateOption === "custom" && customDate) {
      timestamp = new Date(customDate).getTime() + (new Date().getHours() * 3600000);
    }

    const roundUpDiff =
      roundUpSavingsEnabled && acceptRoundUp && roundUpCalc.diff > 0 && activeGoal
        ? roundUpCalc.diff
        : undefined;

    setTimeout(() => {
      onAddExpense(
        {
          amount: currentAmount,
          categoryId,
          label: note.trim() || undefined,
          timestamp,
          roundUpSaved: roundUpDiff,
          targetGoalId: roundUpDiff && activeGoal ? activeGoal.id : undefined,
        },
        roundUpDiff && activeGoal ? activeGoal.id : undefined
      );
      onClose();
    }, 400);
  };

  const selectedCat = categories.find((c) => c.id === categoryId) || categories[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      {/* Cauris volant en animation si validé */}
      {showFlyAnim && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-60 animate-bounce">
          <CaurisIcon size={48} color="#C9922E" filled className="scale-125" />
        </div>
      )}

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-md mx-auto bg-[#FAF6EF] rounded-t-[20px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border-t border-[#E8DDC9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée & En-tête */}
        <div className="pt-3 pb-2 px-6 flex flex-col items-center relative border-b border-[#E8DDC9]/50">
          <div className="w-10 h-1 bg-[#E8DDC9] rounded-full mb-3" />
          <div className="w-full flex items-center justify-between">
            <h2 className="font-fraunces text-xl font-semibold text-[#1F1A15]">
              Nouvelle dépense
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#8A8884] hover:text-[#1F1A15] rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="overflow-y-auto px-5 py-3 space-y-4">
          {/* Montant Héros */}
          <div className="text-center py-2">
            <div className="inline-flex items-baseline justify-center gap-1.5 min-h-[52px]">
              <span className="font-fraunces text-4xl sm:text-5xl font-bold tracking-tight text-[#1F1A15] tab-num">
                {amountStr ? Number(amountStr).toLocaleString("fr-FR") : "0"}
              </span>
              <span className="text-sm font-medium text-[#8A8884]">FCFA</span>
            </div>
          </div>

          {/* Choix de la catégorie en pastilles défilantes */}
          <div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all border ${
                      isSelected
                        ? "border-[#B5541F] bg-[#FAF6EF] text-[#B5541F] shadow-xs"
                        : "border-[#E8DDC9] bg-[#FAF6EF] text-[#55534F] hover:bg-[#E8DDC9]/30"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#8A8884] mt-0.5">
              Catégorie : <span className="font-medium text-[#1F1A15]">{selectedCat?.name}</span>
            </p>
          </div>

          {/* Note libre & Date */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Déjeuner, taxi, cahier..."
                className="w-full text-xs p-2.5 bg-white rounded-[10px] border border-[#E8DDC9] focus:outline-none focus:border-[#B5541F]"
              />
            </div>
            <div>
              <select
                value={dateOption}
                onChange={(e) => setDateOption(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-white rounded-[10px] border border-[#E8DDC9] focus:outline-none"
              >
                <option value="today">Aujourd'hui</option>
                <option value="yesterday">Hier</option>
                <option value="custom">Autre date</option>
              </select>
            </div>
          </div>

          {dateOption === "custom" && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8A8884]" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="text-xs p-2 bg-white rounded-[10px] border border-[#E8DDC9]"
              />
            </div>
          )}

          {/* Encart Arrondi d'épargne (si activé et calcul positif) */}
          {roundUpSavingsEnabled && currentAmount > 0 && roundUpCalc.diff > 0 && activeGoal && (
            <div className="p-3 bg-[#E8DDC9]/40 rounded-[12px] border border-[#E8DDC9] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CaurisIcon size={18} color="#C9922E" filled />
                <div>
                  <span className="font-medium text-[#1F1A15]">
                    Arrondir à {formatFCFA(roundUpCalc.targetRounded)} ?
                  </span>
                  <span className="block text-[10px] text-[#8A8884]">
                    +{formatFCFA(roundUpCalc.diff)} vers {activeGoal.name}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAcceptRoundUp(true)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    acceptRoundUp ? "bg-[#B5541F] text-white" : "bg-white text-[#55534F]"
                  }`}
                >
                  Oui
                </button>
                <button
                  type="button"
                  onClick={() => setAcceptRoundUp(false)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    !acceptRoundUp ? "bg-[#B5541F] text-white" : "bg-white text-[#55534F]"
                  }`}
                >
                  Non
                </button>
              </div>
            </div>
          )}

          {/* Clavier numérique personnalisé NAFA */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 select-none">
            {/* Raccourcis d'arrondi selon plus petit billet habituel */}
            <button
              type="button"
              onClick={() => handleKeyClick("+25")}
              className="py-2.5 bg-[#E8DDC9]/50 hover:bg-[#E8DDC9] text-[#1F1A15] rounded-[10px] text-xs font-semibold active:scale-95"
            >
              +25
            </button>
            <button
              type="button"
              onClick={() => handleKeyClick("+50")}
              className="py-2.5 bg-[#E8DDC9]/50 hover:bg-[#E8DDC9] text-[#1F1A15] rounded-[10px] text-xs font-semibold active:scale-95"
            >
              +50
            </button>
            <button
              type="button"
              onClick={() => handleKeyClick("+100")}
              className="py-2.5 bg-[#E8DDC9]/50 hover:bg-[#E8DDC9] text-[#1F1A15] rounded-[10px] text-xs font-semibold active:scale-95"
            >
              +100
            </button>
            <button
              type="button"
              onClick={() => handleKeyClick("+500")}
              className="py-2.5 bg-[#E8DDC9]/50 hover:bg-[#E8DDC9] text-[#1F1A15] rounded-[10px] text-xs font-semibold active:scale-95"
            >
              +500
            </button>

            {/* Chiffres 1 à 9 */}
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleKeyClick(n)}
                className="py-3 bg-white hover:bg-neutral-50 text-[#1F1A15] border border-[#E8DDC9]/60 rounded-[10px] text-base font-fraunces font-bold shadow-xs active:scale-95"
              >
                {n}
              </button>
            ))}

            {/* Touche C (Clear) */}
            <button
              type="button"
              onClick={() => handleKeyClick("C")}
              className="py-3 bg-[#A8453F]/10 text-[#A8453F] rounded-[10px] text-xs font-bold active:scale-95"
            >
              C
            </button>

            {/* Chiffre 0 */}
            <button
              type="button"
              onClick={() => handleKeyClick("0")}
              className="py-3 bg-white hover:bg-neutral-50 text-[#1F1A15] border border-[#E8DDC9]/60 rounded-[10px] text-base font-fraunces font-bold shadow-xs active:scale-95"
            >
              0
            </button>

            {/* Touche ⌫ (Backspace) */}
            <button
              type="button"
              onClick={() => handleKeyClick("BACK")}
              className="py-3 bg-white hover:bg-neutral-50 text-[#1F1A15] border border-[#E8DDC9]/60 rounded-[10px] flex items-center justify-center active:scale-95"
            >
              <Delete className="w-4 h-4 text-[#8A8884]" />
            </button>
          </div>
        </div>

        {/* Bouton d'action principal */}
        <div className="p-4 bg-[#FAF6EF] border-t border-[#E8DDC9]/60">
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            disabled={currentAmount <= 0}
            onClick={handleValidate}
            className="w-full py-3.5 bg-[#B5541F] hover:bg-[#A04514] active:bg-[#8F3B0E] disabled:opacity-30 text-[#FAF6EF] rounded-full text-base font-medium shadow-sm transition-all"
          >
            Ajouter la dépense
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
