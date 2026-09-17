import React, { useState } from "react";
import { AppProfile, AppState, QuickTile, RoundingUnit } from "../../types";
import { CaurisIcon } from "../icons/CustomIcons";
import { exportStateAsJson, importStateFromJson } from "../../utils/storage";
import { formatFCFA } from "../../utils/engine";
import { X, Moon, Sun, Eye, EyeOff, Shield, Download, Upload, Trash2, Plus } from "lucide-react";

interface SettingsModalProps {
  state: AppState;
  onClose: () => void;
  onUpdateProfile: (profile: Partial<AppProfile>) => void;
  onUpdateState: (newState: AppState) => void;
  onOpenPdf: () => void;
  onResetApp: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  state,
  onClose,
  onUpdateProfile,
  onUpdateState,
  onOpenPdf,
  onResetApp,
}) => {
  const [name, setName] = useState(state.profile.name);
  const [dailyBudgetTarget, setDailyBudgetTarget] = useState(
    state.profile.dailyBudgetTarget ? state.profile.dailyBudgetTarget.toString() : ""
  );
  const [pocketBalance, setPocketBalance] = useState(
    state.profile.pocketBalance !== undefined ? state.profile.pocketBalance.toString() : ""
  );
  const [quickTileLabel, setQuickTileLabel] = useState("");
  const [quickTileAmount, setQuickTileAmount] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: name.trim() || state.profile.name,
      dailyBudgetTarget: dailyBudgetTarget ? Number(dailyBudgetTarget) : undefined,
      pocketBalance: pocketBalance ? Number(pocketBalance) : undefined,
    });
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportStateAsJson(state);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nafa_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const restored = importStateFromJson(content);
          onUpdateState(restored);
          alert("Sauvegarde restaurée avec succès !");
        } catch (err) {
          alert("Fichier JSON invalide.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAddQuickTile = () => {
    if (!quickTileLabel.trim() || Number(quickTileAmount) <= 0) return;
    if (state.quickTiles.length >= 3) {
      alert("Maximum 3 raccourcis rapides pour éviter la surcharge visuelle.");
      return;
    }
    const newTile: QuickTile = {
      id: `tile_${Date.now()}`,
      label: quickTileLabel.trim(),
      amount: Number(quickTileAmount),
      categoryId: state.categories[0].id,
    };
    onUpdateState({
      ...state,
      quickTiles: [...state.quickTiles, newTile],
    });
    setQuickTileLabel("");
    setQuickTileAmount("");
  };

  const handleDeleteQuickTile = (id: string) => {
    onUpdateState({
      ...state,
      quickTiles: state.quickTiles.filter((t) => t.id !== id),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div
        className="w-full max-w-md bg-[#FAF6EF] rounded-[20px] shadow-2xl overflow-hidden border border-[#E8DDC9] flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="p-4 bg-white border-b border-[#E8DDC9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CaurisIcon size={22} color="#B5541F" filled />
            <h2 className="font-fraunces text-lg font-semibold text-[#1F1A15]">
              Réglages de ton carnet
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              handleSaveProfile();
              onClose();
            }}
            className="p-1 text-[#8A8884] hover:text-[#1F1A15]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilant */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-[#55534F]">
          {/* Section Profil */}
          <div className="space-y-3">
            <h3 className="font-fraunces text-sm font-semibold text-[#1F1A15] uppercase tracking-wider text-[11px]">
              Profil personnel
            </h3>
            <div>
              <label className="block text-[#8A8884] mb-1">Prénom ou surnom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-white rounded-[10px] border border-[#E8DDC9] text-sm text-[#1F1A15] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#8A8884] mb-1">Budget par jour (F)</label>
                <input
                  type="number"
                  value={dailyBudgetTarget}
                  onChange={(e) => setDailyBudgetTarget(e.target.value)}
                  placeholder="Calcul automatique"
                  className="w-full p-2 bg-white rounded-[10px] border border-[#E8DDC9] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#8A8884] mb-1">Solde réel en poche (F)</label>
                <input
                  type="number"
                  value={pocketBalance}
                  onChange={(e) => setPocketBalance(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full p-2 bg-white rounded-[10px] border border-[#E8DDC9] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Devise et Arrondis */}
          <div className="space-y-3 pt-3 border-t border-[#E8DDC9]">
            <h3 className="font-fraunces text-sm font-semibold text-[#1F1A15] uppercase tracking-wider text-[11px]">
              Devise et arrondis
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-[#1F1A15] block">Arrondi d'épargne</span>
                <span className="text-[11px] text-[#8A8884]">
                  Propose d'arrondir à chaque dépense au plus proche {state.profile.smallestDenomination} F
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateProfile({
                    roundUpSavingsEnabled: !state.profile.roundUpSavingsEnabled,
                  })
                }
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  state.profile.roundUpSavingsEnabled ? "bg-[#B5541F]" : "bg-[#E8DDC9]"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    state.profile.roundUpSavingsEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-[#8A8884] mb-1.5">Unité d'arrondi habituelle</label>
              <div className="grid grid-cols-4 gap-2">
                {([25, 50, 100, 500] as RoundingUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => onUpdateProfile({ smallestDenomination: u })}
                    className={`py-1.5 rounded-lg border text-center font-medium ${
                      state.profile.smallestDenomination === u
                        ? "border-[#B5541F] bg-[#B5541F] text-white"
                        : "border-[#E8DDC9] bg-white text-[#55534F]"
                    }`}
                  >
                    {u} F
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Confidentialité & Mode privé */}
          <div className="space-y-3 pt-3 border-t border-[#E8DDC9]">
            <h3 className="font-fraunces text-sm font-semibold text-[#1F1A15] uppercase tracking-wider text-[11px]">
              Confidentialité & Affichage
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-[#1F1A15] block">Mode discret (privé)</span>
                <span className="text-[11px] text-[#8A8884]">
                  Floute les montants sur l'écran d'accueil
                </span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateProfile({ privateMode: !state.profile.privateMode })}
                className={`p-2 rounded-full ${
                  state.profile.privateMode ? "bg-[#B5541F] text-white" : "bg-[#E8DDC9] text-[#1F1A15]"
                }`}
              >
                {state.profile.privateMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-[#1F1A15] block">Mode sombre (Terre brûlée)</span>
                <span className="text-[11px] text-[#8A8884]">Écran de nuit économe pour batterie</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateProfile({ darkMode: !state.profile.darkMode })}
                className={`p-2 rounded-full ${
                  state.profile.darkMode ? "bg-[#17130F] text-white" : "bg-[#E8DDC9] text-[#1F1A15]"
                }`}
              >
                {state.profile.darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3 bg-[#E8DDC9]/30 rounded-lg flex items-center gap-2 text-[11px] text-[#4A6B3F]">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Aucune donnée ne quitte ton téléphone sans ton accord.</span>
            </div>
          </div>

          {/* Tuiles rapides (Max 3) */}
          <div className="space-y-3 pt-3 border-t border-[#E8DDC9]">
            <h3 className="font-fraunces text-sm font-semibold text-[#1F1A15] uppercase tracking-wider text-[11px]">
              Raccourcis rapides ({state.quickTiles.length}/3)
            </h3>
            <div className="space-y-1.5">
              {state.quickTiles.map((tile) => (
                <div
                  key={tile.id}
                  className="p-2 bg-white rounded-lg border border-[#E8DDC9] flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium text-[#1F1A15]">{tile.label}</span>
                    <span className="text-[#8A8884] ml-2">({formatFCFA(tile.amount)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuickTile(tile.id)}
                    className="text-[#A8453F] p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {state.quickTiles.length < 3 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nom (ex: Taxi)"
                  value={quickTileLabel}
                  onChange={(e) => setQuickTileLabel(e.target.value)}
                  className="flex-1 p-2 bg-white rounded-lg border border-[#E8DDC9]"
                />
                <input
                  type="number"
                  placeholder="Montant F"
                  value={quickTileAmount}
                  onChange={(e) => setQuickTileAmount(e.target.value)}
                  className="w-24 p-2 bg-white rounded-lg border border-[#E8DDC9]"
                />
                <button
                  type="button"
                  onClick={handleAddQuickTile}
                  className="p-2 bg-[#B5541F] text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Export & Sauvegarde */}
          <div className="space-y-2 pt-3 border-t border-[#E8DDC9]">
            <h3 className="font-fraunces text-sm font-semibold text-[#1F1A15] uppercase tracking-wider text-[11px]">
              Sauvegarde & Export
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="p-2.5 bg-white border border-[#E8DDC9] rounded-[10px] flex items-center justify-center gap-1.5 hover:bg-neutral-50 font-medium text-[#1F1A15]"
              >
                <Download className="w-3.5 h-3.5 text-[#B5541F]" />
                <span>Sauvegarde JSON</span>
              </button>

              <label className="p-2.5 bg-white border border-[#E8DDC9] rounded-[10px] flex items-center justify-center gap-1.5 hover:bg-neutral-50 font-medium text-[#1F1A15] cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#B5541F]" />
                <span>Restaurer JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreJson}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPdf();
              }}
              className="w-full py-2.5 bg-[#1E2A44] text-white rounded-[10px] font-medium"
            >
              Éditer le rapport / Attestation A4
            </button>
          </div>

          {/* Zone rouge */}
          <div className="pt-4 border-t border-[#A8453F]/20">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full py-2 text-[#A8453F] hover:bg-[#A8453F]/10 rounded-lg text-xs font-medium"
              >
                Réinitialiser les données de l'application
              </button>
            ) : (
              <div className="p-3 bg-[#A8453F]/10 rounded-lg border border-[#A8453F]/30 space-y-2 text-center">
                <p className="text-[11px] text-[#A8453F] font-semibold">
                  Supprimer toutes les dépenses et recommencer à zéro ?
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={onResetApp}
                    className="px-4 py-1.5 bg-[#A8453F] text-white rounded-full text-xs font-bold"
                  >
                    Confirmer l'effacement
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-4 py-1.5 bg-white text-[#55534F] rounded-full text-xs"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pied */}
        <div className="p-3 bg-[#FAF6EF] border-t border-[#E8DDC9] text-center">
          <button
            type="button"
            onClick={() => {
              handleSaveProfile();
              onClose();
            }}
            className="w-full py-2.5 bg-[#B5541F] text-white rounded-full font-medium"
          >
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  );
};
