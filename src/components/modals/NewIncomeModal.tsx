import React, { useState } from "react";
import { Goal, Income } from "../../types";
import { CaurisIcon } from "../icons/CustomIcons";
import { formatFCFA } from "../../utils/engine";
import { X } from "lucide-react";

interface NewIncomeModalProps {
  goals: Goal[];
  onClose: () => void;
  onAddIncome: (income: Omit<Income, "id">, saveToGoal?: { goalId: string; amount: number }) => void;
}

const INCOME_CATEGORIES: Array<Income["category"]> = [
  "Bourse",
  "Aide familiale",
  "Job",
  "Tontine reçue",
  "Cadeau",
  "Autre",
];

export const NewIncomeModal: React.FC<NewIncomeModalProps> = ({
  goals,
  onClose,
  onAddIncome,
}) => {
  const [amountStr, setAmountStr] = useState<string>("");
  const [category, setCategory] = useState<Income["category"]>("Bourse");
  const [label, setLabel] = useState<string>("");
  const [saveDirectly, setSaveDirectly] = useState<boolean>(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id || "");
  const [savedPortion, setSavedPortion] = useState<string>("");

  const currentAmount = Number(amountStr) || 0;
  const activeGoals = goals.filter((g) => !g.completed && !g.archived);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAmount <= 0) return;

    let saveToGoal: { goalId: string; amount: number } | undefined = undefined;
    if (saveDirectly && selectedGoalId && Number(savedPortion) > 0) {
      saveToGoal = {
        goalId: selectedGoalId,
        amount: Math.min(currentAmount, Number(savedPortion)),
      };
    }

    onAddIncome(
      {
        amount: currentAmount,
        category,
        label: label.trim() || undefined,
        timestamp: Date.now(),
      },
      saveToGoal
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-md mx-auto bg-[#FAF6EF] rounded-t-[20px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-t border-[#E8DDC9]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 pb-2 px-6 flex flex-col items-center border-b border-[#E8DDC9]/50">
          <div className="w-10 h-1 bg-[#E8DDC9] rounded-full mb-3" />
          <div className="w-full flex items-center justify-between">
            <h2 className="font-fraunces text-xl font-semibold text-[#1F1A15]">
              Nouveau revenu
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#8A8884] hover:text-[#1F1A15]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs text-[#8A8884] mb-1">Montant reçu (FCFA)</label>
            <input
              type="number"
              required
              autoFocus
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="w-full text-3xl font-fraunces p-3 bg-white rounded-[14px] border border-[#E8DDC9] focus:outline-none focus:border-[#4A6B3F]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#8A8884] mb-1.5">Source du revenu</label>
            <div className="flex flex-wrap gap-2">
              {INCOME_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    category === cat
                      ? "bg-[#4A6B3F] text-[#FAF6EF] border-[#4A6B3F]"
                      : "bg-white text-[#55534F] border-[#E8DDC9]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8A8884] mb-1">Note ou description (optionnel)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Virement mensuel, petit service..."
              className="w-full text-xs p-2.5 bg-white rounded-lg border border-[#E8DDC9] focus:outline-none"
            />
          </div>

          {/* Option : Mettre de côté tout de suite vers un objectif */}
          {activeGoals.length > 0 && currentAmount > 0 && (
            <div className="p-3 bg-[#E8DDC9]/30 rounded-[12px] border border-[#E8DDC9] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveDirectly}
                  onChange={(e) => {
                    setSaveDirectly(e.target.checked);
                    if (e.target.checked && !savedPortion) {
                      setSavedPortion(Math.round(currentAmount * 0.2).toString());
                    }
                  }}
                  className="rounded text-[#B5541F]"
                />
                <span className="text-xs font-medium text-[#1F1A15] flex items-center gap-1">
                  <CaurisIcon size={14} color="#C9922E" filled />
                  Mettre une partie de côté tout de suite ?
                </span>
              </label>

              {saveDirectly && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="text-xs p-2 bg-white rounded-lg border border-[#E8DDC9]"
                  >
                    {activeGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={savedPortion}
                    onChange={(e) => setSavedPortion(e.target.value)}
                    placeholder="Montant épargné"
                    className="text-xs p-2 bg-white rounded-lg border border-[#E8DDC9]"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={currentAmount <= 0}
              className="w-full py-3.5 bg-[#4A6B3F] disabled:opacity-40 text-[#FAF6EF] rounded-full text-sm font-medium shadow-sm active:scale-[0.98]"
            >
              Enregistrer le revenu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
