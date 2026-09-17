import { AppState, Goal } from "../types";

export interface DailyAllowanceResult {
  dailyAllowance: number;
  spentToday: number;
  statusColor: string; // #4A6B3F, #C9922E, #B5541F, #A8453F
  humanMessage: string;
  daysRemainingInMonth: number;
  monthlySpent: number;
  monthlyBudget: number;
  monthlyRemaining: number;
  progressRatio: number; // 0 to 1
  overspentAmount: number;
}

export function getDaysRemainingInMonth(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = date.getDate();
  return Math.max(1, lastDay - currentDay + 1);
}

export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const d1 = new Date(timestamp1);
  const d2 = new Date(timestamp2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isCurrentMonth(timestamp: number, referenceDate: Date = new Date()): boolean {
  const d = new Date(timestamp);
  return (
    d.getFullYear() === referenceDate.getFullYear() &&
    d.getMonth() === referenceDate.getMonth()
  );
}

export function computeDailyAllowance(state: AppState): DailyAllowanceResult {
  const now = new Date();
  const daysRemaining = getDaysRemainingInMonth(now);

  // Dépenses d'aujourd'hui
  const spentToday = state.expenses
    .filter((e) => isSameDay(e.timestamp, now.getTime()))
    .reduce((sum, e) => sum + e.amount, 0);

  // Dépenses du mois
  const monthlySpent = state.expenses
    .filter((e) => isCurrentMonth(e.timestamp, now))
    .reduce((sum, e) => sum + e.amount, 0);

  // Revenus du mois
  const monthlyIncome = state.incomes
    .filter((i) => isCurrentMonth(i.timestamp, now))
    .reduce((sum, i) => sum + i.amount, 0);

  // Solde en poche ou solde calculé
  let balance = state.profile.pocketBalance;
  if (balance === undefined || balance === null) {
    // Calculé depuis revenus - dépenses
    balance = Math.max(0, monthlyIncome - monthlySpent);
  }

  // Objectifs à honorer ce mois
  const activeGoals = state.goals.filter((g) => !g.completed && !g.archived);
  const regularGoalsMonthly = activeGoals.reduce((sum, g) => {
    if (g.mode === "regulier" && g.regularAmount) {
      return sum + (g.regularFrequency === "hebdomadaire" ? g.regularAmount * 4 : g.regularAmount);
    }
    return sum;
  }, 0);

  const reserveImposee = state.profile.dailyBudgetTarget ? (state.profile.dailyBudgetTarget * 3) : 0;

  let baseDaily = 0;
  if (state.profile.dailyBudgetTarget && state.profile.dailyBudgetTarget > 0) {
    // Si un budget quotidien a été choisi à l'onboarding
    baseDaily = state.profile.dailyBudgetTarget;
  } else if (state.profile.incomeSources.isIrregularIncome && state.expenses.length > 0) {
    // Mode revenu irrégulier : 85% de la moyenne journalière
    const totalPast = state.expenses.reduce((s, e) => s + e.amount, 0);
    const daysActive = Math.max(1, Math.min(90, Math.ceil((Date.now() - (state.profile.lastOpenedTimestamp - 30 * 86400000)) / 86400000)));
    baseDaily = Math.round((totalPast / daysActive) * 0.85);
  } else {
    // Reste à vivre = (Solde - réserve - objectifs) / jours restants
    const available = Math.max(0, balance - reserveImposee - regularGoalsMonthly);
    baseDaily = Math.round(available / daysRemaining);
  }

  // Arrondi selon plus petit billet habituel
  const unit = state.profile.smallestDenomination || 100;
  baseDaily = Math.max(0, Math.round(baseDaily / unit) * unit);

  // Calcul du restant journalier aujourd'hui
  const remainingToday = baseDaily - spentToday;
  const overspentAmount = spentToday > baseDaily ? spentToday - baseDaily : 0;

  // Calcul du budget mensuel et consommation
  const monthlyBudget = baseDaily * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthlyRemaining = Math.max(0, monthlyBudget - monthlySpent);
  const progressRatio = monthlyBudget > 0 ? Math.min(1, monthlySpent / monthlyBudget) : 0;

  // Couleurs et messages selon les règles strictes NAFA
  // Baobab #4A6B3F (>45%), Or #C9922E (15-45%), Terre cuite #B5541F (5-15%), Rose kola #A8453F (<0%)
  let statusColor = "#4A6B3F"; // Feuille de baobab
  let humanMessage = "Rythme sain.";

  if (overspentAmount > 0) {
    statusColor = "#A8453F"; // Rose kola
    humanMessage = `Dépassement de ${formatFCFA(overspentAmount)}.`;
  } else if (baseDaily > 0) {
    const ratioRemaining = remainingToday / baseDaily;
    if (ratioRemaining > 0.45) {
      statusColor = "#4A6B3F"; // Feuille de baobab
      humanMessage = spentToday === 0 ? "Rythme sain." : "Tu as de la marge.";
    } else if (ratioRemaining >= 0.15) {
      statusColor = "#C9922E"; // Or sahélien
      humanMessage = "Rythme correct.";
    } else {
      statusColor = "#B5541F"; // Terre cuite
      humanMessage = "Serre les vis.";
    }
  }

  return {
    dailyAllowance: Math.max(0, remainingToday),
    spentToday,
    statusColor,
    humanMessage,
    daysRemainingInMonth: daysRemaining,
    monthlySpent,
    monthlyBudget,
    monthlyRemaining,
    progressRatio,
    overspentAmount,
  };
}

export function formatFCFA(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("fr-FR")} F`;
}

export function calculateRoundUp(amount: number, unit: number = 100): { targetRounded: number; diff: number } {
  if (amount <= 0) return { targetRounded: 0, diff: 0 };
  const remainder = amount % unit;
  if (remainder === 0) {
    return { targetRounded: amount + unit, diff: unit };
  }
  const targetRounded = amount + (unit - remainder);
  const diff = targetRounded - amount;
  return { targetRounded, diff };
}

export function detectContextualAlerts(state: AppState): string[] {
  const alerts: string[] = [];
  const now = new Date();

  // 1. App pas ouverte depuis 3+ jours
  const daysInactive = Math.floor((now.getTime() - state.profile.lastOpenedTimestamp) / (1000 * 60 * 60 * 24));
  if (daysInactive >= 3) {
    alerts.push(`Ça fait ${daysInactive} jours. Tu veux rattraper des dépenses manquées ?`);
  }

  // 2. Jour sensible : Veille de vendredi (jeudi) ou vendredi
  const dayOfWeek = now.getDay(); // 4 = Jeudi, 5 = Vendredi
  if (dayOfWeek === 4) {
    // Calcul des dépenses de sorties récentes
    const sortiesExpenses = state.expenses
      .filter((e) => e.categoryId === "cat_sorties")
      .reduce((s, e) => s + e.amount, 0);
    if (sortiesExpenses > 0) {
      alerts.push("Demain c'est vendredi. Pense à garder le cap sur tes sorties.");
    }
  }

  // 3. Objectif qui approche du but (> 80% et < 100%)
  const nearGoal = state.goals.find((g) => {
    if (g.completed || g.archived) return false;
    const pct = g.currentAmount / g.targetAmount;
    return pct >= 0.8 && pct < 1.0;
  });
  if (nearGoal) {
    const needed = nearGoal.targetAmount - nearGoal.currentAmount;
    alerts.push(`Il te manque ${formatFCFA(needed)} pour ${nearGoal.name}.`);
  }

  return alerts;
}

export const AFRICAN_PROVERBS = [
  "Petit à petit, l'oiseau fait son nid.",
  "La patience est un chemin d'or.",
  "Ce que tu gardes aujourd'hui te nourrira demain.",
  "Goutte à goutte, on remplit la calebasse.",
  "L'arbre ne grandit pas en un jour, mais chaque racine compte.",
  "Le fleuve commence par un ruisseau discret.",
  "Qui ménage sa monture voyagera loin.",
];

export function getRandomProverb(): string {
  const idx = Math.floor(Math.random() * AFRICAN_PROVERBS.length);
  return AFRICAN_PROVERBS[idx];
}
