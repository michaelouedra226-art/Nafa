import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppProfile, AppState, Expense, Goal, Income, QuickTile, Debt, Tontine } from "./types";
import { loadAppState, saveAppState, resetAppState, DEFAULT_APP_STATE } from "./utils/storage";
import { TodayScreen } from "./components/screens/TodayScreen";
import { GoalsScreen } from "./components/screens/GoalsScreen";
import { CarnetScreen } from "./components/screens/CarnetScreen";
import { HistoryScreen } from "./components/screens/HistoryScreen";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { NewExpenseModal } from "./components/modals/NewExpenseModal";
import { NewIncomeModal } from "./components/modals/NewIncomeModal";
import { CatchUpModal } from "./components/modals/CatchUpModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { PdfExportModal } from "./components/modals/PdfExportModal";
import { CelebrationModal } from "./components/modals/CelebrationModal";
import { CaurisIcon } from "./components/icons/CustomIcons";
import { Sun, Target, BookOpen, Clock, Plus, Check } from "lucide-react";

export function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<"today" | "goals" | "carnet" | "history">("today");

  // Modals
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [expenseDefaultCat, setExpenseDefaultCat] = useState<string | undefined>();
  const [expenseDefaultAmount, setExpenseDefaultAmount] = useState<number | undefined>();

  const [showNewIncome, setShowNewIncome] = useState(false);
  const [showCatchUp, setShowCatchUp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [celebrationGoal, setCelebrationGoal] = useState<Goal | null>(null);
  const [showSetPocketModal, setShowSetPocketModal] = useState(false);
  const [tempPocketVal, setTempPocketVal] = useState("");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  // Synchronisation avec localStorage
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Gestion du mode sombre
  const isDark = state.profile.darkMode;

  // Finalisation de l'onboarding
  const handleCompleteOnboarding = (dataOrProfile: any, maybeInitialGoal?: Goal) => {
    // Si dataOrProfile contient { profile, goals } provenant de OnboardingFlow
    const actualProfile: AppProfile = dataOrProfile?.profile ? dataOrProfile.profile : dataOrProfile;
    const initialGoals: Goal[] = Array.isArray(dataOrProfile?.goals)
      ? dataOrProfile.goals
      : (maybeInitialGoal ? [maybeInitialGoal] : []);

    const chosenName = (actualProfile.name && actualProfile.name.trim()) || "Michael";

    setState((prev) => {
      const updatedGoals = initialGoals.length > 0
        ? initialGoals
        : prev.goals;

      return {
        ...prev,
        profile: {
          ...prev.profile,
          ...actualProfile,
          name: chosenName,
          onboardingCompleted: true,
        },
        goals: updatedGoals,
      };
    });
    showToast(`Bienvenue sur NAFA, ${chosenName} !`);
  };

  // Traitement d'état importé depuis PDF
  const handlePdfParsedState = (parsedState: AppState) => {
    setState({
      ...parsedState,
      profile: {
        ...parsedState.profile,
        onboardingCompleted: true,
      },
    });
    showToast("Données importées depuis le PDF !");
  };

  // AJOUT D'UNE DÉPENSE
  const handleAddExpense = (newExpData: Omit<Expense, "id">, roundUpToGoalId?: string) => {
    const newExpense: Expense = {
      ...newExpData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };

    setState((prev) => {
      let updatedGoals = [...prev.goals];
      let triggeredCelebration: Goal | null = null;

      // Si arrondi versé vers un objectif
      if (roundUpToGoalId && newExpData.roundUpSaved) {
        updatedGoals = updatedGoals.map((g) => {
          if (g.id === roundUpToGoalId) {
            const updatedCurrent = g.currentAmount + newExpData.roundUpSaved!;
            const isNowCompleted = updatedCurrent >= g.targetAmount;
            const updatedGoal: Goal = {
              ...g,
              currentAmount: updatedCurrent,
              completed: isNowCompleted,
              completedDate: isNowCompleted ? new Date().toISOString().slice(0, 10) : g.completedDate,
            };
            if (isNowCompleted && !g.completed) {
              triggeredCelebration = updatedGoal;
            }
            return updatedGoal;
          }
          return g;
        });
      }

      // Mise à jour du solde en poche si renseigné
      const newPocketBalance =
        prev.profile.pocketBalance !== undefined
          ? Math.max(0, prev.profile.pocketBalance - newExpense.amount - (newExpense.roundUpSaved || 0))
          : undefined;

      if (triggeredCelebration) {
        setCelebrationGoal(triggeredCelebration);
      }

      return {
        ...prev,
        profile: {
          ...prev.profile,
          pocketBalance: newPocketBalance,
        },
        expenses: [newExpense, ...prev.expenses],
        goals: updatedGoals,
      };
    });

    showToast("Dépense enregistrée");
  };

  // AJOUT D'UN REVENU
  const handleAddIncome = (
    newIncData: Omit<Income, "id">,
    saveToGoal?: { goalId: string; amount: number }
  ) => {
    const newIncome: Income = {
      ...newIncData,
      id: `inc_${Date.now()}`,
    };

    setState((prev) => {
      let updatedGoals = [...prev.goals];
      let triggeredCelebration: Goal | null = null;

      if (saveToGoal) {
        updatedGoals = updatedGoals.map((g) => {
          if (g.id === saveToGoal.goalId) {
            const updatedCurrent = g.currentAmount + saveToGoal.amount;
            const isNowCompleted = updatedCurrent >= g.targetAmount;
            const updatedGoal: Goal = {
              ...g,
              currentAmount: updatedCurrent,
              completed: isNowCompleted,
              completedDate: isNowCompleted ? new Date().toISOString().slice(0, 10) : g.completedDate,
            };
            if (isNowCompleted && !g.completed) {
              triggeredCelebration = updatedGoal;
            }
            return updatedGoal;
          }
          return g;
        });
      }

      const newPocketBalance =
        prev.profile.pocketBalance !== undefined
          ? prev.profile.pocketBalance + newIncome.amount
          : prev.profile.pocketBalance;

      if (triggeredCelebration) {
        setCelebrationGoal(triggeredCelebration);
      }

      return {
        ...prev,
        profile: {
          ...prev.profile,
          pocketBalance: newPocketBalance,
        },
        incomes: [newIncome, ...prev.incomes],
        goals: updatedGoals,
      };
    });

    showToast("Revenu enregistré");
  };

  // RATTRAPAGE DE DÉPENSES GROUPÉES
  const handleSaveBatchExpenses = (batch: Omit<Expense, "id">[]) => {
    const created: Expense[] = batch.map((item, idx) => ({
      ...item,
      id: `exp_batch_${Date.now()}_${idx}`,
    }));

    setState((prev) => ({
      ...prev,
      expenses: [...created, ...prev.expenses],
    }));

    showToast(`${created.length} dépenses rattrapées`);
  };

  // SUPPRESSION DE DÉPENSE
  const handleDeleteExpense = (id: string) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
    showToast("Dépense retirée");
  };

  // DUPLICATION DE DÉPENSE
  const handleDuplicateExpense = (expense: Expense) => {
    const copy: Expense = {
      ...expense,
      id: `exp_${Date.now()}`,
      timestamp: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      expenses: [copy, ...prev.expenses],
    }));
    showToast("Dépense dupliquée");
  };

  // TUILE RAPIDE
  const handleQuickTileTap = (tile: QuickTile) => {
    handleAddExpense({
      amount: tile.amount,
      categoryId: tile.categoryId,
      label: tile.label,
      timestamp: Date.now(),
    });
  };

  // DÉPÔT VERS OBJECTIF
  const handleAddAmountToGoal = (goalId: string, amount: number) => {
    setState((prev) => {
      let triggeredCelebration: Goal | null = null;
      const updatedGoals = prev.goals.map((g) => {
        if (g.id === goalId) {
          const newCurrent = g.currentAmount + amount;
          const isNowCompleted = newCurrent >= g.targetAmount;
          const updatedGoal: Goal = {
            ...g,
            currentAmount: newCurrent,
            completed: isNowCompleted,
            completedDate: isNowCompleted ? new Date().toISOString().slice(0, 10) : g.completedDate,
          };
          if (isNowCompleted && !g.completed) {
            triggeredCelebration = updatedGoal;
          }
          return updatedGoal;
        }
        return g;
      });

      if (triggeredCelebration) {
        setCelebrationGoal(triggeredCelebration);
      }

      return {
        ...prev,
        goals: updatedGoals,
      };
    });
    showToast(`+${amount} F épargné !`);
  };

  // CRÉATION D'OBJECTIF
  const handleCreateGoal = (newGoalData: Omit<Goal, "id" | "currentAmount">) => {
    const newGoal: Goal = {
      ...newGoalData,
      id: `goal_${Date.now()}`,
      currentAmount: 0,
    };
    setState((prev) => ({
      ...prev,
      goals: [...prev.goals, newGoal],
    }));
    showToast("Objectif créé !");
  };

  // SUPPRESSION D'OBJECTIF
  const handleDeleteGoal = (goalId: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
    showToast("Objectif supprimé");
  };

  // ARCHIVAGE D'OBJECTIF
  const handleArchiveGoal = (goalId: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalId ? { ...g, archived: true } : g)),
    }));
  };

  // GESTION DES DETTES & TONTINES
  const handleAddDebt = (debtData: Omit<Debt, "id">) => {
    const newDebt: Debt = {
      ...debtData,
      id: `debt_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      debts: [newDebt, ...prev.debts],
    }));
    showToast("Dette enregistrée dans le carnet");
  };

  const handleSettleDebt = (debtId: string) => {
    setState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => (d.id === debtId ? { ...d, status: "settled" } : d)),
    }));
    showToast("Dette marquée comme soldée");
  };

  const handleDeleteDebt = (debtId: string) => {
    setState((prev) => ({
      ...prev,
      debts: prev.debts.filter((d) => d.id !== debtId),
    }));
  };

  const handleAddTontine = (tontineData: Omit<Tontine, "id" | "paidRounds" | "collected">) => {
    const newTontine: Tontine = {
      ...tontineData,
      id: `tontine_${Date.now()}`,
      paidRounds: 0,
      collected: false,
    };
    setState((prev) => ({
      ...prev,
      tontines: [newTontine, ...prev.tontines],
    }));
    showToast("Tontine créée");
  };

  const handleTontinePayRound = (tontineId: string) => {
    setState((prev) => ({
      ...prev,
      tontines: prev.tontines.map((t) =>
        t.id === tontineId ? { ...t, paidRounds: t.paidRounds + 1 } : t
      ),
    }));
    showToast("Cotisation tontine comptabilisée");
  };

  const handleTontineCollect = (tontineId: string) => {
    setState((prev) => ({
      ...prev,
      tontines: prev.tontines.map((t) =>
        t.id === tontineId ? { ...t, collected: true } : t
      ),
    }));
    showToast("Cagnotte tontine ramassée !");
  };

  const handleDeleteTontine = (tontineId: string) => {
    setState((prev) => ({
      ...prev,
      tontines: prev.tontines.filter((t) => t.id !== tontineId),
    }));
  };

  // DÉFIS QUOTIDIENS
  const handleAcceptChallenge = (challengeId: string) => {
    setState((prev) => ({
      ...prev,
      dailyChallenges: prev.dailyChallenges.map((c) =>
        c.id === challengeId ? { ...c, status: "accepted" } : c
      ),
    }));
    showToast("Défi accepté ! Tiens bon aujourd'hui.");
  };

  const handleDeclineChallenge = (challengeId: string) => {
    setState((prev) => ({
      ...prev,
      dailyChallenges: prev.dailyChallenges.map((c) =>
        c.id === challengeId ? { ...c, status: "declined" } : c
      ),
    }));
  };

  // MISE À JOUR DU PROFIL
  const handleUpdateProfile = (partial: Partial<AppProfile>) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...partial,
      },
    }));
  };

  // RÉINITIALISATION
  const handleResetApp = () => {
    const blank = resetAppState();
    setState(blank);
    setShowSettings(false);
    showToast("Données réinitialisées");
  };

  // Si premier lancement et onboarding non complété
  if (!state.profile.onboardingCompleted) {
    return (
      <div className={isDark ? "dark bg-[#17130F] text-[#FAF6EF]" : "bg-[#FAF6EF] text-[#1F1A15]"}>
        <OnboardingFlow
          onComplete={handleCompleteOnboarding}
          onImportFromPdf={handlePdfParsedState}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex justify-center selection:bg-[#B5541F]/20 ${
        isDark ? "dark bg-[#17130F] text-[#FAF6EF]" : "bg-[#FAF6EF] text-[#1F1A15]"
      }`}
    >
      {/* Conteneur Mobile-first bordé */}
      <main
        id="nafa-app-container"
        className={`w-full max-w-md min-h-screen relative flex flex-col shadow-xl transition-colors duration-300 ${
          isDark ? "bg-[#17130F] border-x border-[#2A231C]" : "bg-[#FAF6EF] border-x border-[#E8DDC9]"
        }`}
      >
        {/* Toast flottant discret */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-70 flex items-center gap-1.5 px-4 py-2 bg-[#1F1A15] text-[#FAF6EF] rounded-full text-xs font-medium shadow-lg animate-fade-in pointer-events-none">
            <Check className="w-3.5 h-3.5 text-[#4A6B3F]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ÉCRAN ACTIF AVEC TRANSITION FLUIDE */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-h-full"
            >
              {activeTab === "today" && (
                <TodayScreen
                  state={state}
                  onOpenNewExpense={(cat, amount) => {
                    setExpenseDefaultCat(cat);
                    setExpenseDefaultAmount(amount);
                    setShowNewExpense(true);
                  }}
                  onOpenCatchUp={() => setShowCatchUp(true)}
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenFullHistory={() => setActiveTab("history")}
                  onDeleteExpense={handleDeleteExpense}
                  onDuplicateExpense={handleDuplicateExpense}
                  onQuickTileTap={handleQuickTileTap}
                  onSetPocketBalance={() => setShowSetPocketModal(true)}
                  onAcceptChallenge={handleAcceptChallenge}
                  onDeclineChallenge={handleDeclineChallenge}
                />
              )}

              {activeTab === "goals" && (
                <GoalsScreen
                  state={state}
                  onAddAmountToGoal={handleAddAmountToGoal}
                  onCreateGoal={handleCreateGoal}
                  onDeleteGoal={handleDeleteGoal}
                  onArchiveGoal={handleArchiveGoal}
                />
              )}

              {activeTab === "carnet" && (
                <CarnetScreen
                  state={state}
                  onAddDebt={handleAddDebt}
                  onSettleDebt={handleSettleDebt}
                  onDeleteDebt={handleDeleteDebt}
                  onAddTontine={handleAddTontine}
                  onTontinePayRound={handleTontinePayRound}
                  onTontineCollect={handleTontineCollect}
                  onDeleteTontine={handleDeleteTontine}
                />
              )}

              {activeTab === "history" && (
                <HistoryScreen
                  state={state}
                  onDeleteExpense={handleDeleteExpense}
                  onDuplicateExpense={handleDuplicateExpense}
                  onOpenPdf={() => setShowPdfModal(true)}
                  onOpenNewExpense={(cat, amount) => {
                    setExpenseDefaultCat(cat);
                    setExpenseDefaultAmount(amount);
                    setShowNewExpense(true);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 3.1 NAVIGATION BASSE — 4 ONGLETS STRICTS AVEC MICRO-INTERACTIONS */}
        <nav
          aria-label="Navigation principale"
          className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-16 border-t px-2 flex items-center justify-around z-40 backdrop-blur-md transition-colors ${
            isDark
              ? "bg-[#17130F]/95 border-[#2A231C]"
              : "bg-[#FAF6EF]/95 border-[#E8DDC9]"
          }`}
        >
          {/* Onglet 1 : Aujourd'hui */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
              activeTab === "today"
                ? "text-[#B5541F] font-semibold"
                : "text-[#8A8884] hover:text-[#1F1A15]"
            }`}
          >
            <Sun className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Aujourd'hui</span>
            {activeTab === "today" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -top-1 w-8 h-1 bg-[#B5541F] rounded-full"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </motion.button>

          {/* Onglet 2 : Objectifs */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setActiveTab("goals")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
              activeTab === "goals"
                ? "text-[#B5541F] font-semibold"
                : "text-[#8A8884] hover:text-[#1F1A15]"
            }`}
          >
            <Target className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Objectifs</span>
            {activeTab === "goals" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -top-1 w-8 h-1 bg-[#B5541F] rounded-full"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </motion.button>

          {/* Onglet 3 : Carnet */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setActiveTab("carnet")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
              activeTab === "carnet"
                ? "text-[#B5541F] font-semibold"
                : "text-[#8A8884] hover:text-[#1F1A15]"
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Carnet</span>
            {activeTab === "carnet" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -top-1 w-8 h-1 bg-[#B5541F] rounded-full"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </motion.button>

          {/* Onglet 4 : Mémoire */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
              activeTab === "history"
                ? "text-[#B5541F] font-semibold"
                : "text-[#8A8884] hover:text-[#1F1A15]"
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Mémoire</span>
            {activeTab === "history" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -top-1 w-8 h-1 bg-[#B5541F] rounded-full"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </motion.button>
        </nav>

        {/* MODAL : NOUVELLE DÉPENSE (Partie 8.1) */}
        {showNewExpense && (
          <NewExpenseModal
            categories={state.categories}
            goals={state.goals}
            smallestDenomination={state.profile.smallestDenomination}
            roundUpSavingsEnabled={state.profile.roundUpSavingsEnabled}
            defaultCategory={expenseDefaultCat}
            defaultAmount={expenseDefaultAmount}
            onClose={() => {
              setShowNewExpense(false);
              setExpenseDefaultCat(undefined);
              setExpenseDefaultAmount(undefined);
            }}
            onAddExpense={handleAddExpense}
          />
        )}

        {/* MODAL : NOUVEAU REVENU (Partie 8.2) */}
        {showNewIncome && (
          <NewIncomeModal
            goals={state.goals}
            onClose={() => setShowNewIncome(false)}
            onAddIncome={handleAddIncome}
          />
        )}

        {/* MODAL : RATTRAPAGE RAPIDE (Partie 8.3) */}
        {showCatchUp && (
          <CatchUpModal
            categories={state.categories}
            onClose={() => setShowCatchUp(false)}
            onSaveBatch={handleSaveBatchExpenses}
          />
        )}

        {/* MODAL : RÉGLAGES (Partie 9 & 20) */}
        {showSettings && (
          <SettingsModal
            state={state}
            onClose={() => setShowSettings(false)}
            onUpdateProfile={handleUpdateProfile}
            onUpdateState={setState}
            onOpenPdf={() => setShowPdfModal(true)}
            onResetApp={handleResetApp}
          />
        )}

        {/* MODAL : EXPORT PDF & ATTESTATION A4 (Partie 15) */}
        {showPdfModal && (
          <PdfExportModal
            state={state}
            onClose={() => setShowPdfModal(false)}
          />
        )}

        {/* MODAL : CÉLÉBRATION DE PROJET ATTEINT (Partie 11) */}
        {celebrationGoal && (
          <CelebrationModal
            goal={celebrationGoal}
            onClose={() => setCelebrationGoal(null)}
            onNewGoal={() => {
              setCelebrationGoal(null);
              setActiveTab("goals");
            }}
          />
        )}

        {/* MODAL : DÉFINIR SOLDE EN POCHE */}
        {showSetPocketModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div
              className="w-full max-w-xs bg-[#FAF6EF] rounded-[18px] p-5 shadow-xl border border-[#E8DDC9]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-fraunces text-base font-semibold text-[#1F1A15] mb-1">
                Solde réel en poche
              </h3>
              <p className="text-xs text-[#8A8884] mb-4">
                Combien as-tu physiquement sur toi en ce moment ?
              </p>

              <input
                type="number"
                autoFocus
                value={tempPocketVal}
                onChange={(e) => setTempPocketVal(e.target.value)}
                placeholder="Ex: 3500"
                className="w-full p-2.5 bg-white rounded-lg border border-[#E8DDC9] text-base font-bold font-fraunces focus:outline-none focus:border-[#B5541F] mb-4"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateProfile({
                      pocketBalance: tempPocketVal ? Number(tempPocketVal) : undefined,
                    });
                    setShowSetPocketModal(false);
                    setTempPocketVal("");
                    showToast("Solde en poche mis à jour");
                  }}
                  className="flex-1 py-2 bg-[#B5541F] text-white rounded-full text-xs font-semibold"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSetPocketModal(false);
                    setTempPocketVal("");
                  }}
                  className="px-3 py-2 bg-white text-[#55534F] rounded-full text-xs"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
