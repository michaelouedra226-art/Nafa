import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { AppState, Category, Expense, Transaction } from "../../types";
import { formatFCFA, isSameDay } from "../../utils/engine";
import { CaurisIcon, BalaiIcon } from "../icons/CustomIcons";
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Copy,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";

interface HistoryScreenProps {
  state: AppState;
  onDeleteExpense: (id: string) => void;
  onDuplicateExpense: (expense: Expense) => void;
  onOpenPdf: () => void;
  onOpenNewExpense: (defaultCat?: string, defaultAmount?: number) => void;
}

type FlowFilter = "all" | "expense" | "income" | "savings" | "adjustment";
type PeriodFilter = "today" | "this_week" | "this_month" | "all";

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
  const [flowFilter, setFlowFilter] = useState<FlowFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this_month");

  const now = new Date();

  // Liste unifiée des transactions (ou reconstruction si vide)
  const allTransactions: Transaction[] = useMemo(() => {
    if (state.transactions && state.transactions.length > 0) {
      return state.transactions;
    }
    // Fallback: reconstruction depuis expenses et incomes
    const list: Transaction[] = [];
    state.expenses.forEach((e) => {
      list.push({
        id: `tx_exp_${e.id}`,
        type: "expense",
        amount: e.amount,
        direction: "out",
        categoryId: e.categoryId,
        label: e.label,
        timestamp: e.timestamp,
      });
      if (e.roundUpSaved && e.roundUpSaved > 0) {
        list.push({
          id: `tx_rup_${e.id}`,
          type: "round_up",
          amount: e.roundUpSaved,
          direction: "out",
          goalId: e.targetGoalId,
          label: "Arrondi d'épargne",
          timestamp: e.timestamp,
          relatedExpenseId: e.id,
        });
      }
    });
    state.incomes.forEach((i) => {
      list.push({
        id: `tx_inc_${i.id}`,
        type: "income",
        amount: i.amount,
        direction: "in",
        label: i.label || i.category,
        timestamp: i.timestamp,
      });
    });
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [state.transactions, state.expenses, state.incomes]);

  // Filtrage temporel
  const filteredByPeriod = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOfWeek = (now.getDay() + 6) % 7; // Lundi = 0
    const startOfWeek = startOfToday - dayOfWeek * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return allTransactions.filter((tx) => {
      if (periodFilter === "today") {
        return tx.timestamp >= startOfToday;
      }
      if (periodFilter === "this_week") {
        return tx.timestamp >= startOfWeek;
      }
      if (periodFilter === "this_month") {
        return tx.timestamp >= startOfMonth;
      }
      return true;
    });
  }, [allTransactions, periodFilter]);

  // Filtrage par type de flux et recherche
  const filteredTransactions = useMemo(() => {
    return filteredByPeriod.filter((tx) => {
      // Filtre par type
      if (flowFilter === "expense" && tx.type !== "expense") return false;
      if (flowFilter === "income" && tx.type !== "income") return false;
      if (flowFilter === "savings" && tx.type !== "round_up" && tx.type !== "goal_deposit") return false;
      if (flowFilter === "adjustment" && tx.type !== "balance_adjustment") return false;

      // Filtre catégorie pour dépenses
      if (selectedCategoryId !== "all" && tx.categoryId !== selectedCategoryId) {
        return false;
      }

      // Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = state.categories.find((c) => c.id === tx.categoryId);
        const goal = state.goals.find((g) => g.id === tx.goalId);
        const matchLabel = tx.label ? tx.label.toLowerCase().includes(q) : false;
        const matchCat = cat ? cat.name.toLowerCase().includes(q) : false;
        const matchGoal = goal ? goal.name.toLowerCase().includes(q) : false;
        const matchAmount = tx.amount.toString().includes(q);
        return matchLabel || matchCat || matchGoal || matchAmount;
      }

      return true;
    });
  }, [filteredByPeriod, flowFilter, selectedCategoryId, searchQuery, state.categories, state.goals]);

  // Totaux de la sélection
  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.direction === "in") {
        totalIn += tx.amount;
      } else {
        totalOut += tx.amount;
      }
    });
    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    };
  }, [filteredTransactions]);

  // Groupement chronologique par jour
  const groupedByDay: { [dateStr: string]: Transaction[] } = useMemo(() => {
    const groups: { [dateStr: string]: Transaction[] } = {};
    filteredTransactions.forEach((tx) => {
      const dateObj = new Date(tx.timestamp);
      const dateKey = dateObj.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  // Statistiques pour sous-vue Analyse
  const categoryStats = useMemo(() => {
    const periodExpenses = filteredByPeriod.filter((t) => t.type === "expense");
    const totalExp = periodExpenses.reduce((s, t) => s + t.amount, 0);

    return state.categories
      .map((cat) => {
        const catTxs = periodExpenses.filter((t) => t.categoryId === cat.id);
        const total = catTxs.reduce((s, t) => s + t.amount, 0);
        const ratio = totalExp > 0 ? (total / totalExp) * 100 : 0;
        return {
          category: cat,
          total,
          count: catTxs.length,
          percentage: Math.round(ratio),
        };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filteredByPeriod, state.categories]);

  // Export CSV complet avec BOM UTF-8
  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Heure",
      "Type",
      "Direction",
      "Catégorie/Projet",
      "Description",
      "Montant (FCFA)",
    ];

    const rows = filteredTransactions.map((tx) => {
      const d = new Date(tx.timestamp);
      const dateStr = d.toISOString().slice(0, 10);
      const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      let typeLabel = "Dépense";
      if (tx.type === "income") typeLabel = "Revenu";
      else if (tx.type === "round_up") typeLabel = "Arrondi d'épargne";
      else if (tx.type === "goal_deposit") typeLabel = "Dépôt projet";
      else if (tx.type === "balance_adjustment") typeLabel = "Ajustement solde";

      const cat = state.categories.find((c) => c.id === tx.categoryId);
      const goal = state.goals.find((g) => g.id === tx.goalId);
      const contextName = cat?.name || goal?.name || "";
      const labelClean = (tx.label || "").replace(/"/g, '""');

      return [
        dateStr,
        timeStr,
        typeLabel,
        tx.direction === "in" ? "Entrée" : "Sortie",
        `"${contextName}"`,
        `"${labelClean}"`,
        tx.amount,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `nafa_flux_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-full pb-24 text-[#1F1A15]">
      {/* En-tête */}
      <div className="pt-4 pb-2 px-5 border-b border-[#E8DDC9]/40 bg-[#FAF6EF]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-fraunces text-xl font-semibold text-[#1F1A15]">
              Mémoire des flux
            </h1>
            <p className="text-xs text-[#8A8884]">
              Journal chronologique et consolidé de tes finances.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={handleExportCSV}
              title="Exporter au format CSV"
              className="p-2 bg-white border border-[#E8DDC9] hover:bg-[#FAF6EF] rounded-full text-xs font-medium text-[#1F1A15] shadow-2xs transition-colors shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#4A6B3F]" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.02 }}
              type="button"
              onClick={onOpenPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8DDC9] hover:bg-[#FAF6EF] active:bg-[#E8DDC9] rounded-full text-xs font-medium text-[#1F1A15] shadow-2xs transition-colors shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-[#B5541F]" />
              <span>Attestation A4</span>
            </motion.button>
          </div>
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
            Flux chronologique
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
            Analyse et synthèse
          </button>
        </div>
      </div>

      {activeSubView === "liste" ? (
        <div className="p-5 space-y-4">
          {/* Synthèse des flux de la sélection (Entrées / Sorties / Net) */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-white rounded-[14px] border border-[#E8DDC9] shadow-xs text-center">
            <div>
              <span className="text-[10px] text-[#8A8884] block font-medium">Entrées</span>
              <span className="font-fraunces text-xs font-bold text-[#4A6B3F] tab-num">
                +{formatFCFA(summary.totalIn)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#8A8884] block font-medium">Sorties</span>
              <span className="font-fraunces text-xs font-bold text-[#A8453F] tab-num">
                -{formatFCFA(summary.totalOut)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#8A8884] block font-medium">Solde net</span>
              <span
                className={`font-fraunces text-xs font-bold tab-num ${
                  summary.net >= 0 ? "text-[#4A6B3F]" : "text-[#A8453F]"
                }`}
              >
                {summary.net >= 0 ? "+" : ""}
                {formatFCFA(summary.net)}
              </span>
            </div>
          </div>

          {/* Recherche & Sélecteur temporel */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8A8884]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (déjeuner, taxi, vente...)"
                className="w-full pl-8 pr-3 py-2 bg-white rounded-[10px] border border-[#E8DDC9] text-xs focus:outline-none"
              />
            </div>

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="p-2 bg-white rounded-[10px] border border-[#E8DDC9] text-xs font-medium text-[#55534F]"
            >
              <option value="today">Aujourd'hui</option>
              <option value="this_week">Cette semaine</option>
              <option value="this_month">Ce mois</option>
              <option value="all">Tout</option>
            </select>
          </div>

          {/* Pastilles filtres par type de transaction */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all", label: "Tous les flux" },
              { id: "expense", label: "Dépenses" },
              { id: "income", label: "Revenus" },
              { id: "savings", label: "Épargne & Arrondis" },
              { id: "adjustment", label: "Ajustements" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFlowFilter(f.id as FlowFilter)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium shrink-0 border transition-all ${
                  flowFilter === f.id
                    ? "bg-[#1F1A15] text-white border-[#1F1A15]"
                    : "bg-white text-[#55534F] border-[#E8DDC9] hover:bg-[#FAF6EF]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Pastilles filtres par catégorie si vue dépenses/toutes */}
          {(flowFilter === "all" || flowFilter === "expense") && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategoryId("all")}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 border ${
                  selectedCategoryId === "all"
                    ? "bg-[#B5541F] text-white border-[#B5541F]"
                    : "bg-white text-[#55534F] border-[#E8DDC9]"
                }`}
              >
                Toutes catégories
              </button>
              {state.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 border flex items-center gap-1.5 ${
                    selectedCategoryId === cat.id
                      ? "bg-[#B5541F] text-white border-[#B5541F]"
                      : "bg-white text-[#55534F] border-[#E8DDC9]"
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Dépenses groupées par jour */}
          {filteredTransactions.length === 0 ? (
            <div className="p-8 bg-white rounded-[14px] border border-[#E8DDC9] text-center">
              <p className="text-xs text-[#8A8884] italic">
                Aucun mouvement enregistré pour ces critères.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(groupedByDay).map((dateKey) => {
                const dayTxs = groupedByDay[dateKey];
                const dayNet = dayTxs.reduce(
                  (s, tx) => (tx.direction === "in" ? s + tx.amount : s - tx.amount),
                  0
                );

                return (
                  <div key={dateKey} className="space-y-1.5">
                    {/* En-tête de jour avec net du jour */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-[#8A8884] capitalize">
                        {dateKey}
                      </span>
                      <span
                        className={`text-xs font-medium font-fraunces tab-num ${
                          dayNet >= 0 ? "text-[#4A6B3F]" : "text-[#8A8884]"
                        }`}
                      >
                        {dayNet >= 0 ? "+" : ""}
                        {formatFCFA(dayNet)}
                      </span>
                    </div>

                    {/* Cartes des transactions */}
                    <div className="space-y-1.5">
                      {dayTxs.map((tx) => {
                        const cat = state.categories.find((c) => c.id === tx.categoryId);
                        const goal = state.goals.find((g) => g.id === tx.goalId);
                        const txDate = new Date(tx.timestamp);
                        const timeStr = `${txDate.getHours()}h${txDate
                          .getMinutes()
                          .toString()
                          .padStart(2, "0")}`;

                        const isIncome = tx.direction === "in";
                        const isRoundUp = tx.type === "round_up";
                        const isGoalDep = tx.type === "goal_deposit";
                        const isAdj = tx.type === "balance_adjustment";

                        // Recherche dépense liée pour suppression/duplication si expense
                        const linkedExpense =
                          tx.type === "expense"
                            ? state.expenses.find(
                                (e) => e.id === tx.id.replace("tx_exp_", "")
                              )
                            : undefined;

                        return (
                          <div
                            key={tx.id}
                            className="p-3 bg-white rounded-[12px] border border-[#E8DDC9]/70 flex items-center justify-between shadow-xs hover:border-[#B5541F]/30 transition-all"
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Indicateur visuel */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                  isIncome
                                    ? "bg-[#4A6B3F]/10 text-[#4A6B3F]"
                                    : isRoundUp || isGoalDep
                                    ? "bg-[#C9922E]/10 text-[#C9922E]"
                                    : isAdj
                                    ? "bg-[#1E2A44]/10 text-[#1E2A44]"
                                    : "bg-[#B5541F]/10 text-[#B5541F]"
                                }`}
                              >
                                {isIncome ? (
                                  <ArrowDownLeft className="w-4 h-4" />
                                ) : isRoundUp || isGoalDep ? (
                                  <CaurisIcon size={14} color="#C9922E" filled />
                                ) : isAdj ? (
                                  <span className="text-[10px] font-bold">±</span>
                                ) : (
                                  <ArrowUpRight className="w-4 h-4" />
                                )}
                              </div>

                              <div>
                                <span className="text-xs font-medium text-[#1F1A15] block">
                                  {tx.label || cat?.name || (isGoalDep ? goal?.name : "Mouvement")}
                                </span>
                                <span className="text-[10px] text-[#8A8884]">
                                  {cat?.name || goal?.name || (isRoundUp ? "Épargne passive" : isIncome ? "Revenu" : "Ajustement")} · {timeStr}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span
                                  className={`text-sm font-fraunces font-bold tab-num block ${
                                    isIncome ? "text-[#4A6B3F]" : "text-[#1F1A15]"
                                  }`}
                                >
                                  {isIncome ? "+" : "-"}
                                  {formatFCFA(tx.amount)}
                                </span>
                              </div>

                              {linkedExpense && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onDuplicateExpense(linkedExpense)}
                                    className="text-[#8A8884] hover:text-[#B5541F] p-1"
                                    title="Dupliquer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteExpense(linkedExpense.id)}
                                    className="text-[#8A8884] hover:text-[#A8453F] p-1"
                                    title="Supprimer"
                                  >
                                    <BalaiIcon size={14} />
                                  </button>
                                </div>
                              )}
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
        /* Sous-vue Analyse par catégorie */
        <div className="p-5 space-y-6">
          <div className="p-4 bg-white rounded-[14px] border border-[#E8DDC9] text-center">
            <span className="text-xs text-[#8A8884] uppercase font-bold block">
              Dépenses totales sur la période
            </span>
            <span className="font-fraunces text-3xl font-bold text-[#B5541F] tab-num mt-1 block">
              {formatFCFA(summary.totalOut)}
            </span>
            <span className="text-xs text-[#55534F] mt-1 block">
              Entrées : +{formatFCFA(summary.totalIn)} · Net : {formatFCFA(summary.net)}
            </span>
          </div>

          <div>
            <h2 className="font-fraunces text-sm font-semibold text-[#1F1A15] mb-3">
              Répartition par catégorie
            </h2>

            {categoryStats.length === 0 ? (
              <p className="text-xs text-[#8A8884] italic p-4 bg-white rounded-lg border border-[#E8DDC9]">
                Pas encore assez de dépenses enregistrées sur cette période.
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

