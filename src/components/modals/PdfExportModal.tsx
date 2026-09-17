import React, { useState } from "react";
import { AppState } from "../../types";
import { CaurisIcon, BogolanFrise } from "../icons/CustomIcons";
import { formatFCFA } from "../../utils/engine";
import { Printer, Download, X, CheckSquare, Square, ShieldCheck } from "lucide-react";

interface PdfExportModalProps {
  state: AppState;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ state, onClose }) => {
  const [period, setPeriod] = useState<"this_month" | "all">("this_month");
  const [docType, setDocType] = useState<"rapport" | "attestation">("rapport");
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);
  const [includeExpenses, setIncludeExpenses] = useState<boolean>(true);
  const [includeGoals, setIncludeGoals] = useState<boolean>(true);
  const [includeCarnet, setIncludeCarnet] = useState<boolean>(true);

  const now = new Date();
  const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const fullDate = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  // Filtrer les dépenses et revenus
  const filteredExpenses = period === "this_month"
    ? state.expenses.filter((e) => {
        const d = new Date(e.timestamp);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
    : state.expenses;

  const filteredIncomes = period === "this_month"
    ? state.incomes.filter((i) => {
        const d = new Date(i.timestamp);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
    : state.incomes;

  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
  const totalSavedInGoals = state.goals.reduce((s, g) => s + g.currentAmount, 0);
  const completedGoalsCount = state.goals.filter((g) => g.completed).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="w-full max-w-4xl bg-[#FAF6EF] rounded-[20px] shadow-2xl my-auto overflow-hidden border border-[#E8DDC9] flex flex-col max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre d'outils haut (non imprimable) */}
        <div className="p-4 bg-white border-b border-[#E8DDC9] flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CaurisIcon size={22} color="#B5541F" filled />
            <h2 className="font-fraunces text-base font-semibold text-[#1F1A15]">
              Document officiel NAFA (A4)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#E8DDC9]/30 rounded-full p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDocType("rapport")}
                className={`px-3 py-1 rounded-full font-medium ${
                  docType === "rapport" ? "bg-[#B5541F] text-white" : "text-[#55534F]"
                }`}
              >
                Rapport financier
              </button>
              <button
                type="button"
                onClick={() => setDocType("attestation")}
                className={`px-3 py-1 rounded-full font-medium ${
                  docType === "attestation" ? "bg-[#B5541F] text-white" : "text-[#55534F]"
                }`}
              >
                Attestation d'épargne
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B5541F] text-white rounded-full text-xs font-medium hover:opacity-90 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#8A8884] hover:text-[#1F1A15]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aperçu du document A4 */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#FAF6EF]">
          <div className="max-w-[700px] mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-lg border border-[#E8DDC9]/80 text-[#1F1A15] relative">
            {/* Frise supérieure bogolan */}
            <div className="mb-6">
              <BogolanFrise color="#B5541F" height={10} />
            </div>

            {/* En-tête de document */}
            <div className="flex items-start justify-between border-b border-[#E8DDC9] pb-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FAF6EF] border border-[#E8DDC9] flex items-center justify-center">
                  <CaurisIcon size={24} color="#B5541F" filled />
                </div>
                <div>
                  <h1 className="font-fraunces text-2xl font-bold tracking-tight text-[#B5541F]">
                    NAFA
                  </h1>
                  <p className="text-[10px] text-[#8A8884] uppercase tracking-widest">
                    Chaque franc compte
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold text-[#1F1A15]">
                  {state.profile.name || "Étudiant"}
                </p>
                <p className="text-[11px] text-[#8A8884] capitalize">
                  {state.profile.situation} · Ouagadougou
                </p>
                <p className="text-[10px] text-[#8A8884] mt-0.5">{fullDate}</p>
              </div>
            </div>

            {/* Contenu selon type : Rapport ou Attestation */}
            {docType === "rapport" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-fraunces text-xl font-bold text-[#1F1A15]">
                    Rapport financier — {monthName}
                  </h2>
                  <p className="text-xs text-[#8A8884]">
                    Synthèse confidentielle de gestion budgétaire personnelle.
                  </p>
                </div>

                {/* Résumé en 4 chiffres clés */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#FAF6EF] rounded-[10px] border border-[#E8DDC9]">
                    <span className="text-[10px] text-[#8A8884] uppercase block">Entrées</span>
                    <span className="text-sm font-bold font-fraunces text-[#4A6B3F] tab-num">
                      {formatFCFA(totalIncome)}
                    </span>
                  </div>
                  <div className="p-3 bg-[#FAF6EF] rounded-[10px] border border-[#E8DDC9]">
                    <span className="text-[10px] text-[#8A8884] uppercase block">Dépenses</span>
                    <span className="text-sm font-bold font-fraunces text-[#B5541F] tab-num">
                      {formatFCFA(totalSpent)}
                    </span>
                  </div>
                  <div className="p-3 bg-[#FAF6EF] rounded-[10px] border border-[#E8DDC9]">
                    <span className="text-[10px] text-[#8A8884] uppercase block">Épargne cumulée</span>
                    <span className="text-sm font-bold font-fraunces text-[#C9922E] tab-num">
                      {formatFCFA(totalSavedInGoals)}
                    </span>
                  </div>
                  <div className="p-3 bg-[#FAF6EF] rounded-[10px] border border-[#E8DDC9]">
                    <span className="text-[10px] text-[#8A8884] uppercase block">Cauris dorés</span>
                    <span className="text-sm font-bold font-fraunces text-[#C9922E] tab-num">
                      {completedGoalsCount} atteints
                    </span>
                  </div>
                </div>

                {/* Tableau sobre des dépenses */}
                <div>
                  <h3 className="font-fraunces text-sm font-semibold mb-2">
                    Détail des dépenses enregistrées ({filteredExpenses.length})
                  </h3>
                  {filteredExpenses.length === 0 ? (
                    <p className="text-xs text-[#8A8884] italic p-4 bg-[#FAF6EF] rounded-lg">
                      Aucune dépense enregistrée sur cette période.
                    </p>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8DDC9] text-[#8A8884]">
                          <th className="py-2">Date</th>
                          <th className="py-2">Libellé</th>
                          <th className="py-2">Catégorie</th>
                          <th className="py-2 text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8DDC9]/50">
                        {filteredExpenses.slice(0, 15).map((exp) => {
                          const cat = state.categories.find((c) => c.id === exp.categoryId);
                          return (
                            <tr key={exp.id}>
                              <td className="py-2 text-[#8A8884]">
                                {new Date(exp.timestamp).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </td>
                              <td className="py-2 font-medium">{exp.label || "Dépense courante"}</td>
                              <td className="py-2">
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ backgroundColor: cat?.color || "#8A8884" }}
                                  />
                                  <span>{cat?.name || "Autre"}</span>
                                </span>
                              </td>
                              <td className="py-2 text-right font-medium tab-num">
                                {formatFCFA(exp.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#1F1A15] font-bold">
                          <td colSpan={3} className="py-2.5">
                            Total dépenses
                          </td>
                          <td className="py-2.5 text-right font-fraunces text-sm tab-num">
                            {formatFCFA(totalSpent)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>

                {/* Progrès des Objectifs */}
                {state.goals.length > 0 && (
                  <div>
                    <h3 className="font-fraunces text-sm font-semibold mb-2">
                      Progrès des objectifs d'épargne
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {state.goals.map((g) => (
                        <div
                          key={g.id}
                          className="p-2.5 rounded-lg border border-[#E8DDC9] bg-[#FAF6EF] text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold block">{g.name}</span>
                            <span className="text-[11px] text-[#8A8884]">
                              {formatFCFA(g.currentAmount)} / {formatFCFA(g.targetAmount)}
                            </span>
                          </div>
                          <span className="font-fraunces font-bold text-[#C9922E]">
                            {Math.round((g.currentAmount / g.targetAmount) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Attestation d'épargne formelle (bailleur, banque, tuteur) */
              <div className="space-y-6 py-4">
                <div className="text-center py-4 border-b border-[#E8DDC9]">
                  <h2 className="font-fraunces text-2xl font-bold text-[#1F1A15]">
                    ATTESTATION D'ÉPARGNE ET DE DISCIPLINE BUDGÉTAIRE
                  </h2>
                  <p className="text-xs text-[#8A8884] mt-1">
                    Document officiel pour présentation à un tiers (bailleur, tuteur, établissement)
                  </p>
                </div>

                <div className="text-xs leading-relaxed text-[#1F1A15] space-y-4">
                  <p>
                    Je soussigné(e), <strong>{state.profile.name || "l'étudiant"}</strong>, atteste
                    sur l'honneur tenir avec rigueur la mémoire financière de mes dépenses et de mes
                    engagements au moyen de l'application NAFA.
                  </p>

                  <div className="bg-[#FAF6EF] p-4 rounded-lg border border-[#E8DDC9] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#8A8884]">Montant total épargné à ce jour :</span>
                      <strong className="text-[#4A6B3F] font-fraunces text-sm">
                        {formatFCFA(totalSavedInGoals)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A8884]">Objectifs validés :</span>
                      <strong>{completedGoalsCount} projet(s) concrétisé(s)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A8884]">Méthode de gestion :</span>
                      <span>Plafond quotidien dynamique et arrondi systématique</span>
                    </div>
                  </div>

                  <p>
                    Cette attestation est établie pour servir et valoir ce que de droit, dans le cadre de
                    justifications auprès d'un parent, d'un bailleur ou d'un organisme partenaire.
                  </p>

                  <div className="pt-8 flex justify-between items-end border-t border-[#E8DDC9]/60">
                    <div>
                      <span className="text-[10px] text-[#8A8884] block">Sceau numérique NAFA</span>
                      <CaurisIcon size={28} color="#C9922E" filled />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#8A8884] block mb-6">Signature :</span>
                      <span className="font-fraunces text-sm italic">{state.profile.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Note d'intégrité et Proverbe en pied de page */}
            <div className="mt-8 pt-4 border-t border-[#E8DDC9] text-center">
              <p className="text-[10px] text-[#8A8884] italic mb-1">
                "Ce que tu gardes aujourd'hui te nourrira demain."
              </p>
              <p className="text-[9px] text-[#8A8884]/80">
                Ce document a été généré par NAFA à ta demande. Aucune donnée n'a quitté ton téléphone.
              </p>
            </div>

            {/* Frise inférieure bogolan */}
            <div className="mt-4">
              <BogolanFrise color="#C9922E" height={6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
