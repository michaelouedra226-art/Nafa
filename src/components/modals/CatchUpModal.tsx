import React, { useState } from "react";
import { Category, Expense } from "../../types";
import { X, Plus, Trash2 } from "lucide-react";

interface CatchUpModalProps {
  categories: Category[];
  onClose: () => void;
  onSaveBatch: (expenses: Omit<Expense, "id">[]) => void;
}

interface BatchLine {
  amount: string;
  categoryId: string;
  note: string;
  dateStr: string;
}

export const CatchUpModal: React.FC<CatchUpModalProps> = ({
  categories,
  onClose,
  onSaveBatch,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [lines, setLines] = useState<BatchLine[]>([
    { amount: "", categoryId: categories[0]?.id || "cat_nourriture", note: "", dateStr: todayStr },
    { amount: "", categoryId: categories[1]?.id || "cat_transport", note: "", dateStr: todayStr },
  ]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        amount: "",
        categoryId: categories[0]?.id || "cat_nourriture",
        note: "",
        dateStr: todayStr,
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof BatchLine, value: string) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveAll = () => {
    const validLines = lines.filter((l) => Number(l.amount) > 0);
    if (validLines.length === 0) return;

    const newExpenses: Omit<Expense, "id">[] = validLines.map((l) => ({
      amount: Number(l.amount),
      categoryId: l.categoryId,
      label: l.note.trim() || undefined,
      timestamp: new Date(l.dateStr).getTime() + 12 * 3600000,
    }));

    onSaveBatch(newExpenses);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-md mx-auto bg-[#FAF6EF] rounded-t-[20px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border-t border-[#E8DDC9]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 pb-2 px-6 flex flex-col items-center border-b border-[#E8DDC9]/50">
          <div className="w-10 h-1 bg-[#E8DDC9] rounded-full mb-3" />
          <div className="w-full flex items-center justify-between">
            <div>
              <h2 className="font-fraunces text-xl font-semibold text-[#1F1A15]">
                Rattrapage rapide
              </h2>
              <p className="text-xs text-[#8A8884]">
                Saisis plusieurs dépenses passées en une seule fois.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#8A8884] hover:text-[#1F1A15]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="p-3 bg-white rounded-[14px] border border-[#E8DDC9] space-y-2 relative"
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Montant F"
                  value={line.amount}
                  onChange={(e) => updateLine(idx, "amount", e.target.value)}
                  className="flex-1 p-2 text-sm font-bold bg-[#FAF6EF] rounded-lg border border-[#E8DDC9] focus:outline-none"
                />
                <select
                  value={line.categoryId}
                  onChange={(e) => updateLine(idx, "categoryId", e.target.value)}
                  className="p-2 text-xs bg-[#FAF6EF] rounded-lg border border-[#E8DDC9]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="p-1.5 text-[#A8453F] hover:bg-[#A8453F]/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Note (ex: déjeuner)"
                  value={line.note}
                  onChange={(e) => updateLine(idx, "note", e.target.value)}
                  className="p-2 text-xs bg-[#FAF6EF] rounded-lg border border-[#E8DDC9]"
                />
                <input
                  type="date"
                  value={line.dateStr}
                  onChange={(e) => updateLine(idx, "dateStr", e.target.value)}
                  className="p-2 text-xs bg-[#FAF6EF] rounded-lg border border-[#E8DDC9]"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addLine}
            className="w-full py-2.5 border border-dashed border-[#B5541F] text-[#B5541F] rounded-[12px] text-xs font-medium flex items-center justify-center gap-1 hover:bg-[#B5541F]/5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une autre ligne</span>
          </button>
        </div>

        <div className="p-4 bg-[#FAF6EF] border-t border-[#E8DDC9]">
          <button
            type="button"
            onClick={handleSaveAll}
            className="w-full py-3.5 bg-[#B5541F] text-[#FAF6EF] rounded-full text-sm font-medium shadow-sm active:scale-[0.98]"
          >
            Enregistrer tout
          </button>
        </div>
      </div>
    </div>
  );
};
