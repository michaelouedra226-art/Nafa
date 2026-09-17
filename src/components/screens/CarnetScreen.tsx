import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AppState, Debt, Tontine } from "../../types";
import { formatFCFA } from "../../utils/engine";
import { CaurisIcon } from "../icons/CustomIcons";
import { Plus, Check, MessageSquare, AlertCircle, X, ChevronRight, Users, Trash2 } from "lucide-react";

interface CarnetScreenProps {
  state: AppState;
  onAddDebt: (debt: Omit<Debt, "id">) => void;
  onSettleDebt: (debtId: string) => void;
  onDeleteDebt: (debtId: string) => void;
  onAddTontine: (tontine: Omit<Tontine, "id" | "paidRounds" | "collected">) => void;
  onTontinePayRound: (tontineId: string) => void;
  onTontineCollect: (tontineId: string) => void;
  onDeleteTontine: (tontineId: string) => void;
}

export const CarnetScreen: React.FC<CarnetScreenProps> = ({
  state,
  onAddDebt,
  onSettleDebt,
  onDeleteDebt,
  onAddTontine,
  onTontinePayRound,
  onTontineCollect,
  onDeleteTontine,
}) => {
  const [activeTab, setActiveTab] = useState<"debts" | "tontines">("debts");
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [showAddTontineModal, setShowAddTontineModal] = useState(false);

  // Gestion de la touche retour pour fermer les modaux locaux
  useEffect(() => {
    const handleScreenBack = (e: Event) => {
      const customEv = e as CustomEvent;
      if (showAddDebtModal) {
        setShowAddDebtModal(false);
        customEv.detail?.markHandled?.();
      } else if (showAddTontineModal) {
        setShowAddTontineModal(false);
        customEv.detail?.markHandled?.();
      }
    };
    window.addEventListener("nafa:screen-back", handleScreenBack);
    return () => window.removeEventListener("nafa:screen-back", handleScreenBack);
  }, [showAddDebtModal, showAddTontineModal]);

  // Formulaire dette
  const [debtPerson, setDebtPerson] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtType, setDebtType] = useState<"i_owe" | "they_owe">("i_owe");
  const [debtDueDate, setDebtDueDate] = useState("");
  const [debtPhone, setDebtPhone] = useState("");
  const [debtNote, setDebtNote] = useState("");

  // Formulaire tontine
  const [tontineName, setTontineName] = useState("");
  const [tontineContribution, setTontineContribution] = useState("");
  const [tontineMembers, setTontineMembers] = useState("5");
  const [tontineMyTurn, setTontineMyTurn] = useState("1");
  const [tontineFrequency, setTontineFrequency] = useState<"mensuelle" | "hebdomadaire">("mensuelle");

  const iOweDebts = state.debts.filter((d) => d.type === "i_owe" && d.status !== "settled");
  const theyOweDebts = state.debts.filter((d) => d.type === "they_owe" && d.status !== "settled");
  const settledDebts = state.debts.filter((d) => d.status === "settled");

  const totalIOwe = iOweDebts.reduce((s, d) => s + d.amount, 0);
  const totalTheyOwe = theyOweDebts.reduce((s, d) => s + d.amount, 0);

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtPerson.trim() || Number(debtAmount) <= 0) return;

    onAddDebt({
      person: debtPerson.trim(),
      amount: Number(debtAmount),
      type: debtType,
      status: "pending",
      dateCreated: Date.now(),
      dueDate: debtDueDate || undefined,
      phone: debtPhone.trim() || undefined,
      note: debtNote.trim() || undefined,
    });

    setShowAddDebtModal(false);
    setDebtPerson("");
    setDebtAmount("");
    setDebtDueDate("");
    setDebtPhone("");
    setDebtNote("");
  };

  const handleCreateTontine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tontineName.trim() || Number(tontineContribution) <= 0) return;

    onAddTontine({
      name: tontineName.trim(),
      contributionAmount: Number(tontineContribution),
      membersCount: Number(tontineMembers) || 5,
      myTurnNumber: Number(tontineMyTurn) || 1,
      frequency: tontineFrequency,
    });

    setShowAddTontineModal(false);
    setTontineName("");
    setTontineContribution("");
    setTontineMembers("5");
    setTontineMyTurn("1");
  };

  return (
    <div className="flex flex-col min-h-full pb-24 text-[#1F1A15]">
      {/* 6.1 En-tête */}
      <div className="pt-4 pb-2 px-5 border-b border-[#E8DDC9]/40 bg-[#FAF6EF]">
        <h1 className="font-fraunces text-xl font-semibold text-[#1F1A15]">
          Le Carnet
        </h1>
        <p className="text-xs text-[#8A8884] mb-3">
          Dettes, créances et tontines de confiance.
        </p>

        {/* Deux onglets sobres */}
        <div className="flex bg-white rounded-full p-1 border border-[#E8DDC9] max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab("debts")}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "debts"
                ? "bg-[#B5541F] text-[#FAF6EF] shadow-xs"
                : "text-[#55534F] hover:text-[#1F1A15]"
            }`}
          >
            Dettes & Créances ({state.debts.filter((d) => d.status !== "settled").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tontines")}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "tontines"
                ? "bg-[#B5541F] text-[#FAF6EF] shadow-xs"
                : "text-[#55534F] hover:text-[#1F1A15]"
            }`}
          >
            Tontines ({state.tontines.length})
          </button>
        </div>
      </div>

      {activeTab === "debts" ? (
        <div className="p-5 space-y-6">
          {/* Chiffres clés résumé dettes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-[14px] border border-[#E8DDC9]">
              <span className="text-[10px] text-[#8A8884] uppercase font-bold block">
                Ce que je dois
              </span>
              <span className="font-fraunces text-lg font-bold text-[#A8453F] tab-num">
                {formatFCFA(totalIOwe)}
              </span>
            </div>
            <div className="p-3 bg-white rounded-[14px] border border-[#E8DDC9]">
              <span className="text-[10px] text-[#8A8884] uppercase font-bold block">
                Ce qu'on me doit
              </span>
              <span className="font-fraunces text-lg font-bold text-[#4A6B3F] tab-num">
                {formatFCFA(totalTheyOwe)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddDebtModal(true)}
            className="w-full py-3 border border-dashed border-[#B5541F] bg-[#B5541F]/5 text-[#B5541F] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#B5541F]/10 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une dette ou créance</span>
          </button>

          {/* Section 1 : Ce que je dois */}
          <div>
            <h2 className="font-fraunces text-sm font-semibold text-[#1F1A15] mb-2">
              Ce que je dois ({iOweDebts.length})
            </h2>
            {iOweDebts.length === 0 ? (
              <p className="text-xs text-[#8A8884] italic p-3 bg-white rounded-lg border border-[#E8DDC9]">
                Tu ne dois rien à personne. L'esprit tranquille.
              </p>
            ) : (
              <div className="space-y-2">
                {iOweDebts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 bg-white rounded-[14px] border border-[#E8DDC9] flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#1F1A15] truncate">{d.person}</span>
                        {d.dueDate && (
                          <span className="text-[10px] text-[#A8453F] bg-[#A8453F]/10 px-1.5 py-0.5 rounded font-medium shrink-0">
                            Pour le {d.dueDate}
                          </span>
                        )}
                      </div>
                      <span className="font-fraunces text-base font-bold text-[#A8453F] tab-num block mt-0.5">
                        {formatFCFA(d.amount)}
                      </span>
                      {d.note && <p className="text-[11px] text-[#8A8884] truncate">{d.note}</p>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSettleDebt(d.id)}
                        className="px-2.5 py-1.5 bg-[#4A6B3F] text-white rounded-full text-[11px] font-medium flex items-center gap-1"
                        title="Marquer comme remboursé"
                      >
                        <Check className="w-3 h-3" />
                        <span>Soldé</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDebt(d.id)}
                        className="text-[#8A8884] hover:text-[#A8453F] p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2 : Ce qu'on me doit */}
          <div>
            <h2 className="font-fraunces text-sm font-semibold text-[#1F1A15] mb-2">
              Ce qu'on me doit ({theyOweDebts.length})
            </h2>
            {theyOweDebts.length === 0 ? (
              <p className="text-xs text-[#8A8884] italic p-3 bg-white rounded-lg border border-[#E8DDC9]">
                Personne ne te doit d'argent actuellement.
              </p>
            ) : (
              <div className="space-y-2">
                {theyOweDebts.map((d) => {
                  const whatsappMsg = `Bonjour ${d.person}, j'espère que tu vas bien. Je te fais un petit coucou cordial au sujet des ${formatFCFA(d.amount)}. Fais-moi signe quand c'est bon pour toi !`;
                  return (
                    <div
                      key={d.id}
                      className="p-3.5 bg-white rounded-[14px] border border-[#E8DDC9] flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-[#1F1A15] truncate">{d.person}</span>
                          {d.dueDate && (
                            <span className="text-[10px] text-[#8A8884] shrink-0">
                              Attendu pour {d.dueDate}
                            </span>
                          )}
                        </div>
                        <span className="font-fraunces text-base font-bold text-[#4A6B3F] tab-num block mt-0.5">
                          {formatFCFA(d.amount)}
                        </span>
                        {d.note && <p className="text-[11px] text-[#8A8884] truncate">{d.note}</p>}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {d.phone && (
                          <a
                            href={`https://wa.me/${d.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              whatsappMsg
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-[#4A6B3F]/10 text-[#4A6B3F] rounded-full hover:bg-[#4A6B3F]/20 transition-colors"
                            title="Envoyer un rappel courtois par WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => onSettleDebt(d.id)}
                          className="px-2.5 py-1.5 bg-[#4A6B3F] text-white rounded-full text-[11px] font-medium flex items-center gap-1 hover:bg-[#3D5734] transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>Reçu</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 6.3 Onglet Tontines */
        <div className="p-5 space-y-4">
          <button
            type="button"
            onClick={() => setShowAddTontineModal(true)}
            className="w-full py-3 border border-dashed border-[#B5541F] bg-[#B5541F]/5 text-[#B5541F] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#B5541F]/10 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Rejoindre ou créer une tontine</span>
          </button>

          {state.tontines.length === 0 ? (
            <div className="p-8 bg-white rounded-[14px] border border-[#E8DDC9] text-center">
              <Users className="w-8 h-8 text-[#B5541F] mx-auto mb-2 opacity-60" />
              <h3 className="font-fraunces text-sm font-semibold mb-1">
                Aucune tontine active
              </h3>
              <p className="text-xs text-[#8A8884] mb-3">
                La tontine est une force de solidarité : cotise ensemble, ramasse au tour de rôle.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.tontines.map((t) => {
                const totalPot = t.contributionAmount * t.membersCount;
                const isMyTurnNow = t.paidRounds + 1 === t.myTurnNumber;

                return (
                  <div
                    key={t.id}
                    className="p-5 bg-white rounded-[14px] border border-[#E8DDC9] shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="font-fraunces text-base font-bold text-[#1F1A15]">
                          {t.name}
                        </h2>
                        <p className="text-xs text-[#8A8884] capitalize">
                          {t.frequency} · {t.membersCount} membres
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteTontine(t.id)}
                        className="text-[#8A8884] hover:text-[#A8453F] p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Détails cagnotte */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-[#FAF6EF] rounded-[10px] border border-[#E8DDC9]/60 text-xs">
                      <div>
                        <span className="text-[10px] text-[#8A8884] block">Cotisation</span>
                        <strong className="font-fraunces font-bold text-[#1F1A15]">
                          {formatFCFA(t.contributionAmount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A8884] block">Total ramassé</span>
                        <strong className="font-fraunces font-bold text-[#4A6B3F]">
                          {formatFCFA(totalPot)}
                        </strong>
                      </div>
                    </div>

                    {/* Statut du tour */}
                    <div className="text-xs flex items-center justify-between">
                      <span className="text-[#55534F]">
                        Ton tour de ramassage : <strong>Tour {t.myTurnNumber}</strong> / {t.membersCount}
                      </span>
                      <span className="text-[11px] text-[#8A8884]">
                        Tours payés : {t.paidRounds}
                      </span>
                    </div>

                    {/* Actions tontine */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onTontinePayRound(t.id)}
                        className="flex-1 min-w-[130px] py-2 px-3 bg-[#FAF6EF] hover:bg-[#B5541F] text-[#B5541F] hover:text-white border border-[#B5541F]/40 rounded-full text-xs font-semibold transition-colors text-center"
                      >
                        + Cotiser ce tour
                      </button>

                      {!t.collected ? (
                        <button
                          type="button"
                          onClick={() => onTontineCollect(t.id)}
                          className="flex-1 min-w-[140px] py-2 px-3 bg-[#4A6B3F] hover:bg-[#3D5734] text-white rounded-full text-xs font-semibold text-center transition-colors"
                        >
                          Ramasser la cagnotte
                        </button>
                      ) : (
                        <span className="py-2 px-3 bg-[#4A6B3F]/10 text-[#4A6B3F] rounded-full text-[11px] font-semibold flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Ramassée
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Ajout Dette */}
      {showAddDebtModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs">
          <div
            className="w-full max-w-md mx-auto bg-[#FAF6EF] rounded-t-[20px] shadow-2xl p-5 border-t border-[#E8DDC9]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-fraunces text-lg font-semibold text-[#1F1A15]">
                Nouvelle dette / créance
              </h2>
              <button
                type="button"
                onClick={() => setShowAddDebtModal(false)}
                className="p-1 text-[#8A8884]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDebtType("i_owe")}
                  className={`py-2 rounded-lg text-xs font-medium border ${
                    debtType === "i_owe"
                      ? "bg-[#A8453F] text-white border-[#A8453F]"
                      : "bg-white text-[#55534F] border-[#E8DDC9]"
                  }`}
                >
                  Je dois de l'argent
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType("they_owe")}
                  className={`py-2 rounded-lg text-xs font-medium border ${
                    debtType === "they_owe"
                      ? "bg-[#4A6B3F] text-white border-[#4A6B3F]"
                      : "bg-white text-[#55534F] border-[#E8DDC9]"
                  }`}
                >
                  On me doit de l'argent
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-[#8A8884] mb-1">Nom de la personne *</label>
                <input
                  type="text"
                  required
                  value={debtPerson}
                  onChange={(e) => setDebtPerson(e.target.value)}
                  placeholder="Ex: Moussa, Tante Amina..."
                  className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8A8884] mb-1">Montant (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9] font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#8A8884] mb-1">Date promise (optionnel)</label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#8A8884] mb-1">Numéro WhatsApp (optionnel)</label>
                  <input
                    type="tel"
                    value={debtPhone}
                    onChange={(e) => setDebtPhone(e.target.value)}
                    placeholder="+226..."
                    className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#8A8884] mb-1">Note (optionnel)</label>
                <input
                  type="text"
                  value={debtNote}
                  onChange={(e) => setDebtNote(e.target.value)}
                  placeholder="Ex: Prêt pour le polycopié..."
                  className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#B5541F] text-white rounded-full text-xs font-semibold mt-2"
              >
                Enregistrer dans le carnet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajout Tontine */}
      {showAddTontineModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs">
          <div
            className="w-full max-w-md mx-auto bg-[#FAF6EF] rounded-t-[20px] shadow-2xl p-5 border-t border-[#E8DDC9]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-fraunces text-lg font-semibold text-[#1F1A15]">
                Nouvelle tontine
              </h2>
              <button
                type="button"
                onClick={() => setShowAddTontineModal(false)}
                className="p-1 text-[#8A8884]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTontine} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#8A8884] mb-1">Nom de la tontine *</label>
                <input
                  type="text"
                  required
                  value={tontineName}
                  onChange={(e) => setTontineName(e.target.value)}
                  placeholder="Ex: Tontine promo Licence"
                  className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8A8884] mb-1">Montant par cotisation (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={tontineContribution}
                  onChange={(e) => setTontineContribution(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9] font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-[#8A8884] mb-1">Membres</label>
                  <input
                    type="number"
                    value={tontineMembers}
                    onChange={(e) => setTontineMembers(e.target.value)}
                    className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#8A8884] mb-1">Mon tour</label>
                  <input
                    type="number"
                    value={tontineMyTurn}
                    onChange={(e) => setTontineMyTurn(e.target.value)}
                    className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#8A8884] mb-1">Fréquence</label>
                  <select
                    value={tontineFrequency}
                    onChange={(e) => setTontineFrequency(e.target.value as any)}
                    className="w-full p-2 text-xs bg-white rounded-lg border border-[#E8DDC9]"
                  >
                    <option value="mensuelle">Mois</option>
                    <option value="hebdomadaire">Semaine</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#B5541F] text-white rounded-full text-xs font-semibold mt-2"
              >
                Créer la tontine
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
