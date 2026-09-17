import React, { useState } from "react";
import { AppState, Category, Expense } from "../../types";
import { formatFCFA, isSameDay } from "../../utils/engine";
import { CaurisIcon, BalaiIcon } from "../icons/CustomIcons";
import { Search, Filter, Printer, Calendar, Copy, ChevronDown } from "lucide-react";

interface HistoryScreenProps {
  state: AppState;
  onDeleteExpense: (id: string) => void;
  onDuplicateExpense: (expense: Expense) => void;
  onOpenPdf: () => void;
  onOpenNewExpense: (defaultCat?: string, defaultAmount?: number) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  state,
  onDeleteExpense,
  onDuplicateExpense,
  onOpenPdf,
  onOpenNewExpense,
}) => {
  const [activeSubView, setActiveSubView] = useState<"liste" | "analyse">("liste");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<"this_month" | "last_month" | "all">("this_month");

  const now = new Date();

  // Filtrage selon la période
  const filteredByPeriod = state.expenses.filter((e) => {
    const d = new Date(e.timestamp);
    if (periodFilter === "this_month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (periodFilter === "last_month") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
    }
    return true;
  });

  // Filtrage par catégorie et recherche
  const filteredExpenses = filteredByPeriod.filter((e) => {
    if (selectedCategoryId !== "all" && e.categoryId !== selectedCategoryId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = state.categories.find((c) => c.id === e.categoryId);
      const matchLabel = e.label ? e.label.toLowerCase().includes(q) : false;
      const matchCat = cat ? cat.name.toLowerCase().includes(q) : false;
      const matchAmount = e.amount.toString().includes(q);
      return matchLabel || matchCat || matchAmount;
    }
    return true;
  });

  // Regroupement par jour
  const groupedByDay: { [dateStr: string]: Expense[] } = {};
  filteredExpenses.forEach((exp) => {
    const dateObj = new Date(exp.timestamp);
    const dateKey = dateObj.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!groupedByDay[dateKey]) {
      groupedByDay[dateKey] = [];
    }
    groupedByDay[dateKey].push(exp);
  });

  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Statistiques par catégorie pour la sous-vue Analyse
  const categoryStats = state.categories.map((cat) => {
    const catExpenses = filteredByPeriod.filter((e) => e.categoryId === cat.id);
    const total = catExpenses.reduce((s, e) => s + e.amount, 0);
    const ratio = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
    return {
      category: cat,
      total,
      count: catExpenses.length,
      percentage: Math.round(ratio),
    };
  }).filter((s) => s.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col min-h-full pb-24 text-[#1F1A15]">
      {/* 7.1 En-tête */}
      <div className="pt-4 pb-2 px-5 border-b border-[#E8DDC9]/40 bg-[#FAF6EF]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-fraunces text-xl font-semibold text-[#1F1A15]">
              Mémoire
            </h1>
            <p className="text-xs text-[#8A8884]">
              Chaque dépense a son histoire.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8DDC9] hover:bg-[#FAF6EF] rounded-full text-xs font-medium text-[#1F1A15]"
          >
            <Printer className="w-3.5 h-3.5 text-[#B5541F]" />
            <span>Rapport PDF</span>
          </button>
        </div>

        {/* Deux sous-vues : Liste / Analyse */}
        <div className="flex bg-white rounded-full p-1 border border-[#E8DDC9] max-w-xs mx-auto mb-2">
          <button
            type="button"
            onClick={() => setActiveSubView("liste")}
            className={`flex-1 py-1 rounded-full text-xs font-medium transition-all ${
              activeSubView === "liste"
                ? "bg-[#B5541F] text-white shadow-xs"
                : "text-[#55534F] hover:text-[#1F1A15]"
            }`}
          >
            Liste chronologique
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView("analyse")}
            className={`flex-1 py-1 rounded-full text-xs font-medium transition-all ${
              activeSubView === "analyse"
                ? "bg-[#B5541F] text-white shadow-xs"
                : "text-[#55534F] hover:text-[#1F1A15]"
            }`}
          >
            Analyse par catégorie
          </button>
        </div>
      </div>

      {activeSubView === "liste" ? (
        <div className="p-5 space-y-4">
          {/* Barre de recherche et filtres de période */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8A8884]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (déjeuner, taxi...)"
                className="w-full pl-8 pr-3 py-2 bg-white rounded-[10px] border border-[#E8DDC9] text-xs focus:outline-none"
              />
            </div>

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="p-2 bg-white rounded-[10px] border border-[#E8DDC9] text-xs font-medium text-[#55534F]"
            >
              <option value="this_month">Ce mois</option>
              <option value="last_month">Mois dernier</option>
              <option value="all">Toutes dates</option>
            </select>
          </div>

          {/* Pastilles filtres par catégorie */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className={`px-3 py-1 rounded-full text-[11px] font-medium shrink-0 border ${
                selectedCategoryId === "all"
                  ? "bg-[#1F1A15] text-white border-[#1F1A15]"
                  : "bg-white text-[#55534F] border-[#E8DDC9]"
              }`}
            >
              Toutes
            </button>
            {state.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium shrink-0 border flex items-center gap-1.5 ${
                  selectedCategoryId === cat.id
                    ? "bg-[#1F1A15] text-white border-[#1F1A15]"
                    : "bg-white text-[#55534F] border-[#E8DDC9]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Total de la sélection */}
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs text-[#8A8884]">
              {filteredExpenses.length} dépense{filteredExpenses.length > 1 ? "s" : ""}
            </span>
            <span className="font-fraunces text-sm font-bold text-[#1F1A15] tab-num">
              Total : {formatFCFA(totalSpent)}
            </span>
          </div>

          {/* Dépenses groupées par jour */}
          {filteredExpenses.length === 0 ? (
            <div className="p-8 bg-white rounded-[14px] border border-[#E8DDC9] text-center">
              <p className="text-xs text-[#8A8884] italic">
                Aucune dépense ne correspond à ces critères.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(groupedByDay).map((dateKey) => {
                const dayExpenses = groupedByDay[dateKey];
                const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

                return (
                  <div key={dateKey} className="space-y-1.5">
                    {/* En-tête de jour avec total du jour à droite */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-[#8A8884] capitalize">
                        {dateKey}
                      </span>
                      <span className="text-xs font-medium text-[#55534F] font-fraunces tab-num">
                        {formatFCFA(dayTotal)}
                      </span>
                    </div>

                    {/* Cartes des dépenses du jour */}
                    <div className="space-y-1.5">
                      {dayExpenses.map((exp) => {
                        const cat = state.categories.find((c) => c.id === exp.categoryId);
                        const expDate = new Date(exp.timestamp);
                        const timeStr = `${expDate.getHours()}h${expDate
                          .getMinutes()
                          .toString()
                          .padStart(2, "0")}`;

                        return (
                          <div
                            key={exp.id}
                            className="p-3 bg-white rounded-[12px] border border-[#E8DDC9]/70 flex items-center justify-between shadow-xs hover:border-[#B5541F]/30 transition-all"
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
                                  {cat?.name} · {timeStr}
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
                                    <CaurisIcon size={9} color="#C9922E" filled />
                                    +{formatFCFA(exp.roundUpSaved)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onDuplicateExpense(exp)}
                                  className="text-[#8A8884] hover:text-[#B5541F] p-1"
                                  title="Dupliquer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteExpense(exp.id)}
                                  className="text-[#8A8884] hover:text-[#A8453F] p-1"
                                  title="Supprimer"
                                >
                                  <BalaiIcon size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 7.3 Sous-vue Analyse par catégorie */
        <div className="p-5 space-y-6">
          <div className="p-4 bg-white rounded-[14px] border border-[#E8DDC9] text-center">
            <span className="text-xs text-[#8A8884] uppercase font-bold block">
              Dépenses totales sur la période
            </span>
            <span className="font-fraunces text-3xl font-bold text-[#B5541F] tab-num mt-1 block">
              {formatFCFA(totalSpent)}
            </span>
            <span className="text-xs text-[#55534F] mt-1 block">
              Moyenne : ~{formatFCFA(Math.round(totalSpent / (filteredExpenses.length || 1)))} par dépense
            </span>
          </div>

          <div>
            <h2 className="font-fraunces text-sm font-semibold text-[#1F1A15] mb-3">
              Répartition par catégorie
            </h2>

            {categoryStats.length === 0 ? (
              <p className="text-xs text-[#8A8884] italic p-4 bg-white rounded-lg border border-[#E8DDC9]">
                Pas encore assez de données pour l'analyse.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((item) => (
                  <div
                    key={item.category.id}
                    className="p-3.5 bg-white rounded-[12px] border border-[#E8DDC9] space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.category.color }}
                        />
                        <span className="font-semibold text-[#1F1A15]">{item.category.name}</span>
                        <span className="text-[#8A8884] text-[11px]">({item.count})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-fraunces font-bold text-[#1F1A15] tab-num">
                          {formatFCFA(item.total)}
                        </span>
                        <span className="text-xs text-[#8A8884] ml-1.5">({item.percentage}%)</span>
                      </div>
                    </div>

                    {/* Barre de répartition */}
                    <div className="w-full h-2 bg-[#FAF6EF] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.category.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
