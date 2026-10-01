import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppProfile, AppState, Expense, Goal, Income, QuickTile, Debt, Tontine, Transaction, DailyChallenge } from "./types";
import { loadAppState, saveAppState, resetAppState, DEFAULT_APP_STATE, importStateFromJson } from "./utils/storage";
import { TodayScreen } from "./components/screens/TodayScreen";
import { CaurisIcon } from "./components/icons/CustomIcons";
import { Sun, Target, BookOpen, Clock, Plus, Check } from "lucide-react";
import { useBackButton } from "./hooks/useBackButton";
import { useBatteryOptimization } from "./hooks/useBatteryOptimization";
import confetti from "canvas-confetti";
import { soundEffects, triggerHapticFeedback } from "./utils/hapticsAndAudio";
import { addExpenseToState, removeExpenseFromState, removeIncomeFromState, restoreExpenseToState } from "./utils/ledger";
import { getCrossedGoalMilestone } from "./utils/engine";

const PdfExportModal = React.lazy(() =>
  import("./components/modals/PdfExportModal").then((module) => ({ default: module.PdfExportModal })),
);
const GoalsScreen = React.lazy(() =>
  import("./components/screens/GoalsScreen").then((module) => ({ default: module.GoalsScreen })),
);
const CarnetScreen = React.lazy(() =>
  import("./components/screens/CarnetScreen").then((module) => ({ default: module.CarnetScreen })),
);
const HistoryScreen = React.lazy(() =>
  import("./components/screens/HistoryScreen").then((module) => ({ default: module.HistoryScreen })),
);
const OnboardingFlow = React.lazy(() =>
  import("./components/onboarding/OnboardingFlow").then((module) => ({ default: module.OnboardingFlow })),
);
const NewExpenseModal = React.lazy(() =>
  import("./components/modals/NewExpenseModal").then((module) => ({ default: module.NewExpenseModal })),
);
const NewIncomeModal = React.lazy(() =>
  import("./components/modals/NewIncomeModal").then((module) => ({ default: module.NewIncomeModal })),
);
const CatchUpModal = React.lazy(() =>
  import("./components/modals/CatchUpModal").then((module) => ({ default: module.CatchUpModal })),
);
const SettingsModal = React.lazy(() =>
  import("./components/modals/SettingsModal").then((module) => ({ default: module.SettingsModal })),
);
const CelebrationModal = React.lazy(() =>
  import("./components/modals/CelebrationModal").then((module) => ({ default: module.CelebrationModal })),
);
const SCREEN_LOADING = <div role="status" className="p-6 text-center text-xs text-[#8A8884]">Chargement de l’écran…</div>;
const MODAL_LOADING = <div role="status" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 text-sm text-white">Ouverture…</div>;

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
  const [toastAction, setToastAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageUnavailable = useRef(false);

  const showToast = (msg: string, action?: { label: string; onClick: () => void }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    setToastAction(action || null);
    toastTimer.current = setTimeout(() => {
      setToastMessage(null);
      setToastAction(null);
      toastTimer.current = null;
    }, action ? 5000 : 2400);
  };

  const handleToastAction = () => {
    const action = toastAction;
    if (!action) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToastMessage(null);
    setToastAction(null);
    action.onClick();
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // 1. Optimisation batterie & extinction des activités en arrière-plan
  useBatteryOptimization();

  // 2. Gestion hiérarchique de fermeture des modals pour la touche retour
  const isModalOpen = Boolean(
    showSetPocketModal ||
    celebrationGoal ||
    showPdfModal ||
    showSettings ||
    showCatchUp ||
    showNewIncome ||
    showNewExpense
  );

  const closeTopModal = useCallback((): boolean => {
    if (showSetPocketModal) {
      setShowSetPocketModal(false);
      return true;
    }
    if (celebrationGoal) {
      setCelebrationGoal(null);
      return true;
    }
    if (showPdfModal) {
      setShowPdfModal(false);
      return true;
    }
    if (showSettings) {
      setShowSettings(false);
      return true;
    }
    if (showCatchUp) {
      setShowCatchUp(false);
      return true;
    }
    if (showNewIncome) {
      setShowNewIncome(false);
      return true;
    }
    if (showNewExpense) {
      setShowNewExpense(false);
      return true;
    }
    return false;
  }, [
    showSetPocketModal,
    celebrationGoal,
    showPdfModal,
    showSettings,
    showCatchUp,
    showNewIncome,
    showNewExpense,
  ]);

  // 3. Gestionnaire universel de la touche retour :
  // - 1 clic : retour arrière (fermer modal/sous-dialogue ou revenir sur l'onglet d'accueil)
  // - 2 clics sur l'accueil (< 2000 ms) : quitter l'application
  useBackButton({
    activeTab,
    setActiveTab,
    isModalOpen,
    closeTopModal,
    onboardingCompleted: state.profile.onboardingCompleted,
    onShowToast: showToast,
  });

  // Synchronisation débouncée avec localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!saveAppState(state)) {
        if (!storageUnavailable.current) {
          showToast("Sauvegarde locale impossible : exporte une copie depuis Réglages.");
        }
        storageUnavailable.current = true;
      } else {
        storageUnavailable.current = false;
      }
    }, 150);
    return () => clearTimeout(timer);
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
    try {
      const validatedState = importStateFromJson(JSON.stringify(parsedState));
      setState({
        ...validatedState,
        profile: { ...validatedState.profile, onboardingCompleted: true },
      });
      showToast("Données restaurées et vérifiées.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Cette sauvegarde n’est pas valide.");
    }
  };

  // AJOUT D'UNE DÉPENSE
  const handleAddExpense = (newExpData: Omit<Expense, "id">, roundUpToGoalId?: string) => {
    if (!Number.isSafeInteger(newExpData.amount) || newExpData.amount <= 0) {
      showToast("Saisis un montant positif en FCFA entiers.");
      return;
    }
    const totalImpact = newExpData.amount + (newExpData.roundUpSaved || 0);
    const currentPocket = state.profile.pocketBalance;

    // Règle de protection : blocage si dépassement du solde en poche
    if (currentPocket !== undefined && totalImpact > currentPocket) {
      showToast(`Solde insuffisant. Il te reste ${currentPocket.toLocaleString("fr-FR")} F.`);
      return;
    }

    const newExpense: Expense = {
      ...newExpData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      pocketBalanceImpact: currentPocket !== undefined ? totalImpact : 0,
      targetGoalId: roundUpToGoalId || newExpData.targetGoalId,
    };

    const category = state.categories.find((c) => c.id === newExpense.categoryId);
    const catName = category ? category.name : "Dépense";
    const targetGoal = roundUpToGoalId ? state.goals.find((g) => g.id === roundUpToGoalId) : undefined;
    const goalName = targetGoal ? targetGoal.name : "Épargne";

    const nextState = addExpenseToState(state, newExpense, roundUpToGoalId);
    const completedGoal = nextState.goals.find(
      (goal) => goal.id === roundUpToGoalId && goal.completed && !state.goals.find((old) => old.id === goal.id)?.completed,
    );
    setState(nextState);
    if (completedGoal) setCelebrationGoal(completedGoal);
    triggerHapticFeedback([20]);
    const newPocketBalance = nextState.profile.pocketBalance;
    const undoAddedExpense = () => {
      setState((prev) => removeExpenseFromState(prev, newExpense.id));
      if (completedGoal) {
        setCelebrationGoal((current) => current?.id === completedGoal.id ? null : current);
      }
      showToast("Dépense annulée · solde et épargne rétablis.");
    };

    const soldeStr = newPocketBalance !== undefined ? ` · Solde : ${newPocketBalance.toLocaleString("fr-FR")} F` : "";
    if (newExpense.roundUpSaved && newExpense.roundUpSaved > 0) {
      showToast(
        `−${newExpense.amount.toLocaleString("fr-FR")} F (${catName}) · +${newExpense.roundUpSaved.toLocaleString("fr-FR")} F vers « ${goalName} »${soldeStr}`,
        { label: "Annuler", onClick: undoAddedExpense },
      );
    } else {
      showToast(`−${newExpense.amount.toLocaleString("fr-FR")} F (${catName})${soldeStr}`, {
        label: "Annuler",
        onClick: undoAddedExpense,
      });
    }
  };

  // AJOUT D'UN REVENU
  const handleAddIncome = (
    newIncData: Omit<Income, "id">,
    saveToGoal?: { goalId: string; amount: number }
  ) => {
    if (!Number.isSafeInteger(newIncData.amount) || newIncData.amount <= 0) {
      showToast("Saisis un revenu positif en FCFA entiers.");
      return;
    }
    if (saveToGoal && (!Number.isSafeInteger(saveToGoal.amount) || saveToGoal.amount < 0 || saveToGoal.amount > newIncData.amount)) {
      showToast("La part épargnée doit être comprise entre 0 et le revenu reçu.");
      return;
    }

    const newIncome: Income = {
      ...newIncData,
      id: `inc_${Date.now()}`,
    };

    const savedPart = saveToGoal ? saveToGoal.amount : 0;
    const currentPocket = state.profile.pocketBalance;
    const newPocketBalance =
      currentPocket !== undefined
        ? currentPocket + newIncome.amount - savedPart
        : newIncome.amount - savedPart;
    const incomeTransactionId = `tx_inc_${newIncome.id}`;
    const goalTransactionId = saveToGoal && savedPart > 0 ? `tx_gldep_${Date.now()}` : undefined;
    const goalBeforeIncome = saveToGoal ? state.goals.find((goal) => goal.id === saveToGoal.goalId) : undefined;
    const completedGoalByIncome = Boolean(
      goalBeforeIncome && saveToGoal && !goalBeforeIncome.completed &&
      goalBeforeIncome.currentAmount + savedPart >= goalBeforeIncome.targetAmount,
    );

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

      if (triggeredCelebration) {
        setCelebrationGoal(triggeredCelebration);
      }

      const newTransactions: Transaction[] = [
        {
          id: incomeTransactionId,
          type: "income",
          amount: newIncome.amount,
          direction: "in",
          label: newIncome.label || newIncome.category || "Revenu",
          timestamp: newIncome.timestamp,
        },
      ];

      if (saveToGoal && saveToGoal.amount > 0) {
        const goal = prev.goals.find((g) => g.id === saveToGoal.goalId);
        newTransactions.push({
          id: goalTransactionId || `tx_gldep_${Date.now()}`,
          type: "goal_deposit",
          amount: saveToGoal.amount,
          direction: "out",
          goalId: saveToGoal.goalId,
          label: `Épargne sur revenu vers « ${goal?.name || "Projet"} »`,
          timestamp: newIncome.timestamp,
        });
      }

      return {
        ...prev,
        profile: {
          ...prev.profile,
          pocketBalance: newPocketBalance,
        },
        incomes: [newIncome, ...prev.incomes],
        goals: updatedGoals,
        transactions: [...newTransactions, ...(prev.transactions || [])],
      };
    });

    const undoAddedIncome = () => {
      setState((prev) => removeIncomeFromState(
        prev,
        newIncome.id,
        newIncome.amount - savedPart,
        currentPocket !== undefined,
        saveToGoal?.goalId,
        savedPart,
        goalTransactionId ? [goalTransactionId] : [],
      ));
      if (completedGoalByIncome && saveToGoal) {
        setCelebrationGoal((current) => current?.id === saveToGoal.goalId ? null : current);
      }
      showToast("Revenu annulé · solde et épargne rétablis.");
    };
    showToast(`+${newIncome.amount.toLocaleString("fr-FR")} F · Solde disponible : ${newPocketBalance.toLocaleString("fr-FR")} F`, {
      label: "Annuler",
      onClick: undoAddedIncome,
    });
  };

  // MODE PAIE REÇUE (1.2 PRO)
  const handleReceivePayday = (amount: number, label: string = "Salaire / Bourse") => {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      showToast("Saisis un montant positif en FCFA entiers.");
      return;
    }
    const prevBal = state.profile.pocketBalance || 0;
    const pocketWasDefined = state.profile.pocketBalance !== undefined;
    const newBal = prevBal + amount;
    const newInc: Income = {
      id: `inc_payday_${Date.now()}`,
      amount,
      category: "Job",
      label,
      timestamp: Date.now(),
    };
    const tx: Transaction = {
      id: `tx_inc_${newInc.id}`,
      type: "income",
      amount,
      direction: "in",
      label,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        pocketBalance: newBal,
      },
      incomes: [newInc, ...prev.incomes],
      transactions: [tx, ...(prev.transactions || [])],
    }));

    soundEffects.playCaurisClink();
    triggerHapticFeedback([40, 50, 40]);
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.5 },
      colors: ["#4A6B3F", "#C9922E", "#B5541F"],
    });

    const undoPaydayIncome = () => {
      setState((prev) => removeIncomeFromState(prev, newInc.id, amount, pocketWasDefined));
      showToast("Revenu annulé · solde et journal rétablis.");
    };
    showToast(`+${amount.toLocaleString("fr-FR")} F enregistrés · Solde en poche : ${newBal.toLocaleString("fr-FR")} F`, {
      label: "Annuler",
      onClick: undoPaydayIncome,
    });
  };

  // RATTRAPAGE DE DÉPENSES GROUPÉES
  const handleSaveBatchExpenses = (batch: Omit<Expense, "id">[]) => {
    const created: Expense[] = batch.map((item, idx) => ({
      ...item,
      id: `exp_batch_${Date.now()}_${idx}`,
      // Une saisie rétroactive complète le journal, sans débiter un solde réel déjà actualisé.
      pocketBalanceImpact: 0,
    }));

    const batchTransactions: Transaction[] = created.map((exp) => ({
      id: `tx_exp_${exp.id}`,
      type: "expense",
      amount: exp.amount,
      direction: "out",
      categoryId: exp.categoryId,
      label: exp.label,
      timestamp: exp.timestamp,
    }));

    setState((prev) => ({
      ...prev,
      expenses: [...created, ...prev.expenses],
      transactions: [...batchTransactions, ...(prev.transactions || [])],
    }));

    showToast(`${created.length} dépenses ajoutées au journal · solde inchangé`);
  };

  // SUPPRESSION DE DÉPENSE
  const handleDeleteExpense = (id: string) => {
    const removedExpense = state.expenses.find((expense) => expense.id === id);
    if (!removedExpense) return;
    const removedTransactions = (state.transactions || []).filter(
      (transaction) => transaction.id === `tx_exp_${id}` || transaction.relatedExpenseId === id,
    );
    const restoreDeletedExpense = () => {
      setState((prev) => restoreExpenseToState(prev, removedExpense, removedTransactions));
      showToast("Suppression annulée", { label: "Rétablir", onClick: deleteAgain });
    };
    const deleteAgain = () => {
      setState((prev) => removeExpenseFromState(prev, id));
      showToast("Suppression rétablie", { label: "Annuler", onClick: restoreDeletedExpense });
    };
    setState((prev) => removeExpenseFromState(prev, id));
    showToast("Dépense supprimée", {
      label: "Annuler",
      onClick: restoreDeletedExpense,
    });
  };

  // DUPLICATION DE DÉPENSE
  const handleDuplicateExpense = (expense: Expense) => {
    handleAddExpense({
      amount: expense.amount,
      categoryId: expense.categoryId,
      label: expense.label,
      timestamp: Date.now(),
      // La copie ne recrée pas l'arrondi-épargne de la transaction d'origine.
    });
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
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      showToast("Saisis un montant positif en FCFA entiers.");
      return;
    }
    const currentPocket = state.profile.pocketBalance;

    // Règle de protection : blocage si solde insuffisant
    if (currentPocket !== undefined && amount > currentPocket) {
      showToast(`Solde insuffisant. Il te reste ${currentPocket.toLocaleString("fr-FR")} F.`);
      return;
    }

    const targetGoal = state.goals.find((g) => g.id === goalId);
    const goalName = targetGoal ? targetGoal.name : "Projet";
    const newPocketBalance = currentPocket !== undefined ? Math.max(0, currentPocket - amount) : undefined;
    const projectedAmount = (targetGoal?.currentAmount || 0) + amount;
    const milestone = targetGoal && projectedAmount < targetGoal.targetAmount
      ? getCrossedGoalMilestone(targetGoal.currentAmount, projectedAmount, targetGoal.targetAmount)
      : undefined;

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

      const goalTx: Transaction = {
        id: `tx_dep_${Date.now()}`,
        type: "goal_deposit",
        amount,
        direction: "out",
        goalId,
        label: `Versement vers « ${goalName} »`,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        profile: {
          ...prev.profile,
          pocketBalance: newPocketBalance,
        },
        goals: updatedGoals,
        transactions: [goalTx, ...(prev.transactions || [])],
      };
    });

    const soldeStr = newPocketBalance !== undefined ? ` · Solde : ${newPocketBalance.toLocaleString("fr-FR")} F` : "";
    if (milestone) triggerHapticFeedback([18]);
    const milestoneText = milestone ? ` · Étape ${milestone} % atteinte` : "";
    showToast(`−${amount.toLocaleString("fr-FR")} F vers « ${goalName} »${soldeStr}${milestoneText}`);
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

  // DÉFIS / OBJECTIFS DU JOUR
  const handleAcceptChallenge = (challenge: DailyChallenge | string) => {
    const challengeId = typeof challenge === "string" ? challenge : challenge.id;
    setState((prev) => {
      const exists = prev.dailyChallenges.some((c) => c.id === challengeId);
      if (exists) {
        return {
          ...prev,
          dailyChallenges: prev.dailyChallenges.map((c) =>
            c.id === challengeId ? { ...c, status: "accepted" as const } : c
          ),
        };
      }
      if (typeof challenge !== "string") {
        return {
          ...prev,
          dailyChallenges: [{ ...challenge, status: "accepted" as const }, ...prev.dailyChallenges],
        };
      }
      return prev;
    });
    showToast("Objectif du jour accepté ! Tiens bon.");
  };

  const handleValidateChallenge = (challenge: DailyChallenge | string) => {
    const challengeId = typeof challenge === "string" ? challenge : challenge.id;
    setState((prev) => {
      const exists = prev.dailyChallenges.some((c) => c.id === challengeId);
      if (exists) {
        return {
          ...prev,
          dailyChallenges: prev.dailyChallenges.map((c) =>
            c.id === challengeId
              ? { ...c, status: "completed" as const, completedAt: Date.now() }
              : c
          ),
        };
      }
      if (typeof challenge !== "string") {
        return {
          ...prev,
          dailyChallenges: [
            { ...challenge, status: "completed" as const, completedAt: Date.now() },
            ...prev.dailyChallenges,
          ],
        };
      }
      return prev;
    });
    showToast("Bravo ! Objectif du jour validé avec succès.");
  };

  const handleFailChallenge = (challenge: DailyChallenge | string) => {
    const challengeId = typeof challenge === "string" ? challenge : challenge.id;
    setState((prev) => {
      const exists = prev.dailyChallenges.some((c) => c.id === challengeId);
      if (exists) {
        return {
          ...prev,
          dailyChallenges: prev.dailyChallenges.map((c) =>
            c.id === challengeId
              ? { ...c, status: "failed" as const, failedAt: Date.now() }
              : c
          ),
        };
      }
      if (typeof challenge !== "string") {
        return {
          ...prev,
          dailyChallenges: [
            { ...challenge, status: "failed" as const, failedAt: Date.now() },
            ...prev.dailyChallenges,
          ],
        };
      }
      return prev;
    });
    showToast("Objectif du jour marqué comme échoué. Demain est un autre jour.");
  };

  const handleSkipChallenge = (challenge: DailyChallenge | string) => {
    const challengeId = typeof challenge === "string" ? challenge : challenge.id;
    setState((prev) => {
      const exists = prev.dailyChallenges.some((c) => c.id === challengeId);
      if (exists) {
        return {
          ...prev,
          dailyChallenges: prev.dailyChallenges.map((c) =>
            c.id === challengeId
              ? { ...c, status: "skipped" as const, skippedAt: Date.now() }
              : c
          ),
        };
      }
      if (typeof challenge !== "string") {
        return {
          ...prev,
          dailyChallenges: [
            { ...challenge, status: "skipped" as const, skippedAt: Date.now() },
            ...prev.dailyChallenges,
          ],
        };
      }
      return prev;
    });
    showToast("Objectif du jour passé.");
  };

  const handleResetChallenge = (challengeId: string) => {
    setState((prev) => ({
      ...prev,
      dailyChallenges: prev.dailyChallenges.map((c) =>
        c.id === challengeId ? { ...c, status: "pending" as const } : c
      ),
    }));
    showToast("Objectif réinitialisé.");
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
        <Suspense fallback={SCREEN_LOADING}>
          <OnboardingFlow
            onComplete={handleCompleteOnboarding}
            onImportFromPdf={handlePdfParsedState}
            onRestoreJson={(jsonStr) => {
              try {
                const parsed = JSON.parse(jsonStr);
                handlePdfParsedState(parsed);
              } catch {
                showToast("Fichier de sauvegarde invalide");
              }
            }}
          />
        </Suspense>
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
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`fixed left-1/2 -translate-x-1/2 z-70 flex items-center gap-2 px-4 py-2.5 bg-[#1F1A15]/95 text-[#FAF6EF] border border-[#E8DDC9]/20 rounded-full text-xs font-medium shadow-2xl backdrop-blur-sm ${toastAction ? "pointer-events-auto" : "pointer-events-none"} transition-all animate-fade-in ${
              toastMessage.includes("quitter") || toastMessage.includes("Fermeture")
                ? "bottom-24"
                : "top-4"
            }`}
          >
            {toastMessage.includes("quitter") || toastMessage.includes("Fermeture") ? (
              <span className="w-2 h-2 rounded-full bg-[#C9922E] shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 text-[#4A6B3F] shrink-0" />
            )}
            <span>{toastMessage}</span>
            {toastAction && (
              <button
                type="button"
                onClick={handleToastAction}
                className="ml-1 font-bold text-[#E6B95C] underline underline-offset-2"
                aria-label={`${toastAction.label} la dernière opération`}
              >
                {toastAction.label}
              </button>
            )}
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
              <Suspense fallback={SCREEN_LOADING}>
              {activeTab === "today" && (
                <TodayScreen
                  state={state}
                  onOpenNewExpense={(cat, amount) => {
                    setExpenseDefaultCat(cat);
                    setExpenseDefaultAmount(amount);
                    setShowNewExpense(true);
                  }}
                  onOpenNewIncome={() => setShowNewIncome(true)}
                  onOpenCatchUp={() => setShowCatchUp(true)}
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenFullHistory={() => setActiveTab("history")}
                  onDeleteExpense={handleDeleteExpense}
                  onDuplicateExpense={handleDuplicateExpense}
                  onQuickTileTap={handleQuickTileTap}
                  onSetPocketBalance={() => setShowSetPocketModal(true)}
                  onReceivePayday={handleReceivePayday}
                  onAcceptChallenge={handleAcceptChallenge}
                  onValidateChallenge={handleValidateChallenge}
                  onFailChallenge={handleFailChallenge}
                  onSkipChallenge={handleSkipChallenge}
                  onResetChallenge={handleResetChallenge}
                  onDeclineChallenge={handleSkipChallenge}
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
              </Suspense>
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
        <Suspense fallback={MODAL_LOADING}>
        {showNewExpense && (
          <NewExpenseModal
            categories={state.categories}
            goals={state.goals}
            smallestDenomination={state.profile.smallestDenomination}
            roundUpSavingsEnabled={state.profile.roundUpSavingsEnabled}
            pocketBalance={state.profile.pocketBalance}
            defaultCategory={expenseDefaultCat || state.profile.lastUsedCategoryId}
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
          <PdfExportModal state={state} onClose={() => setShowPdfModal(false)} />
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
        </Suspense>

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
                min="0"
                step="1"
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
                    const newBal = tempPocketVal.trim() ? Number(tempPocketVal) : undefined;
                    if (newBal !== undefined && (!Number.isSafeInteger(newBal) || newBal < 0)) {
                      showToast("Le solde doit être un montant positif en FCFA entiers, ou zéro.");
                      return;
                    }
                    const prevBal = state.profile.pocketBalance || 0;
                    if (newBal !== undefined) {
                      const diff = newBal - prevBal;
                      const adjTx: Transaction = {
                        id: `tx_adj_${Date.now()}`,
                        type: "balance_adjustment",
                        amount: Math.abs(diff),
                        direction: diff >= 0 ? "in" : "out",
                        label: "Ajustement solde en poche",
                        timestamp: Date.now(),
                      };
                      setState((prev) => ({
                        ...prev,
                        transactions: [adjTx, ...(prev.transactions || [])],
                      }));
                    }
                    handleUpdateProfile({
                      pocketBalance: newBal,
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
