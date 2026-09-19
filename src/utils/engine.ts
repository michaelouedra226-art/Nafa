import { AppState, Goal, DailyChallenge } from "../types";

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

/**
 * Formatage strict des montants pour le document PDF (Section 4.2 du Cahier Technique)
 * Utilise des espaces réguliers et termine par " F".
 */
export function formatAmountPDF(amount: number): string {
  return (
    Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " F"
  );
}

/**
 * Analyse du mode observation : propose un budget après 7 jours
 */
export function computeObservationBudgetSuggestion(state: AppState): {
  isEligible: boolean;
  daysObserved: number;
  averageDailySpent: number;
  suggestedBudget: number;
} {
  const start =
    state.profile.observationStartTimestamp ||
    state.profile.lastOpenedTimestamp - 7 * 86400000;
  const daysObserved = Math.max(1, Math.floor((Date.now() - start) / 86400000));
  const isEligible = Boolean(state.profile.observationMode && daysObserved >= 7);

  const totalSpentInPeriod = state.expenses
    .filter((e) => e.timestamp >= start)
    .reduce((s, e) => s + e.amount, 0);

  const averageDailySpent = Math.round(totalSpentInPeriod / daysObserved);
  const unit = state.profile.smallestDenomination || 100;
  const suggestedBudget = Math.max(
    unit,
    Math.round(averageDailySpent / unit) * unit
  );

  return {
    isEligible,
    daysObserved,
    averageDailySpent,
    suggestedBudget,
  };
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

/**
 * Génère ou récupère l'objectif / micro-défi contextuel du jour
 */
export const DAILY_CHALLENGES_CATALOG: { title: string; estimatedSavings: number }[] = [
  { title: "Aujourd'hui : cuisine au lieu d'acheter dehors.", estimatedSavings: 1000 },
  { title: "Zéro dépense superflue ou boisson sucrée aujourd'hui.", estimatedSavings: 500 },
  { title: "Déplace-toi à pied ou partage ton trajet si la distance le permet.", estimatedSavings: 600 },
  { title: "Prépare ta bouteille d'eau au lieu d'acheter des sachets en route.", estimatedSavings: 300 },
  { title: "Reporte tout achat non vital d'au moins 24 heures.", estimatedSavings: 1500 },
  { title: "Ne sors pas d'argent liquide supplémentaire aujourd'hui.", estimatedSavings: 1000 },
  { title: "Garde la monnaie de la journée intacte pour tes projets.", estimatedSavings: 400 },
];

export function getOrGenerateTodayChallenge(state: AppState, date: Date = new Date()): DailyChallenge {
  const dateKey = date.toISOString().slice(0, 10);
  const existing = state.dailyChallenges?.find((c) => c.dateKey === dateKey);
  if (existing) {
    return existing;
  }

  // Calcul déterministe basé sur le jour de l'année pour varier chaque jour
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const template = DAILY_CHALLENGES_CATALOG[dayOfYear % DAILY_CHALLENGES_CATALOG.length];

  return {
    id: `challenge_${dateKey}`,
    dateKey,
    title: template.title,
    estimatedSavings: template.estimatedSavings,
    status: "pending",
  };
}

/**
 * 2.1 Radar de fin de mois : projection intelligente du solde au dernier jour du mois
 */
export interface EndOfMonthRadarResult {
  projectedBalance: number;
  lastDayOfMonth: number;
  daysRemaining: number;
  status: "green" | "orange" | "red";
  statusColor: string;
  shortPhrase: string;
  detailsPhrase: string;
}

export function computeEndOfMonthRadar(state: AppState): EndOfMonthRadarResult {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDate = new Date(year, month + 1, 0);
  const lastDayOfMonth = lastDate.getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, lastDayOfMonth - currentDay + 1);

  // Solde disponible actuel
  const monthlySpent = state.expenses
    .filter((e) => isCurrentMonth(e.timestamp, now))
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyIncome = state.incomes
    .filter((i) => isCurrentMonth(i.timestamp, now))
    .reduce((sum, i) => sum + i.amount, 0);

  const currentBalance =
    state.profile.pocketBalance !== undefined && state.profile.pocketBalance !== null
      ? state.profile.pocketBalance
      : Math.max(0, monthlyIncome - monthlySpent);

  // Cadence quotidienne observée sur les 7 derniers jours (ou depuis le début du mois)
  const sevenDaysAgo = now.getTime() - 7 * 86400000;
  const recentExpenses = state.expenses.filter((e) => e.timestamp >= sevenDaysAgo);
  const recentSpent = recentExpenses.reduce((s, e) => s + e.amount, 0);
  const daysWithData = Math.max(1, Math.min(7, currentDay));
  
  // Si peu ou pas de dépenses récentes, utiliser l'allocation journalière de base
  const allowance = computeDailyAllowance(state);
  const dailyBurn =
    recentSpent > 0 ? Math.round(recentSpent / daysWithData) : allowance.dailyAllowance;

  // Projection du solde restant le dernier jour du mois
  const projectedBurn = dailyBurn * (daysRemaining - 1);
  const projectedBalance = Math.round(currentBalance - projectedBurn);

  let status: "green" | "orange" | "red" = "green";
  let statusColor = "#4A6B3F"; // Baobab vert
  let shortPhrase = "";
  let detailsPhrase = "";

  if (projectedBalance >= 5000) {
    status = "green";
    statusColor = "#4A6B3F";
    shortPhrase = `À ce rythme, tu finiras le mois avec ≈ ${formatFCFA(projectedBalance)}`;
    detailsPhrase = "Tu es large. Cap serein.";
  } else if (projectedBalance >= 0) {
    status = "orange";
    statusColor = "#C9922E";
    shortPhrase = `À ce rythme, tu finiras le mois avec ≈ ${formatFCFA(projectedBalance)}`;
    detailsPhrase = "Attention, marge serrée. Priorise l'essentiel.";
  } else {
    status = "red";
    statusColor = "#A8453F";
    const deficit = Math.abs(projectedBalance);
    shortPhrase = `À ce rythme, tu vas finir dans le rouge (≈ -${formatFCFA(deficit)})`;
    detailsPhrase = "Tu vas finir dans le rouge. Serre les dépenses dès aujourd'hui.";
  }

  return {
    projectedBalance,
    lastDayOfMonth,
    daysRemaining,
    status,
    statusColor,
    shortPhrase,
    detailsPhrase,
  };
}

/**
 * 1.2 Streak « Jours Maîtrisés » : série de jours sans dépassement budgétaire
 */
export interface MasteredStreakResult {
  streakDays: number;
  isMilestone: boolean; // >= 7 jours
  milestoneBadge?: "bronze_7" | "silver_14" | "gold_30";
  badgeName?: string;
  flameLevel: 1 | 2 | 3; // 1: 1-2j, 2: 3-6j, 3: >=7j
  message: string;
}

export function computeMasteredDaysStreak(state: AppState): MasteredStreakResult {
  const allowance = computeDailyAllowance(state);
  const now = new Date();
  
  // 1. Si aucune activité enregistrée dans l'historique : série à 0
  const allTimestamps: number[] = [
    ...state.expenses.map((e) => e.timestamp),
    ...state.incomes.map((i) => i.timestamp),
    ...(state.transactions || []).map((t) => t.timestamp),
  ];
  if (state.profile.observationStartTimestamp) {
    allTimestamps.push(state.profile.observationStartTimestamp);
  }

  if (allTimestamps.length === 0) {
    return {
      streakDays: 0,
      isMilestone: false,
      flameLevel: 1,
      message: "Enregistre ta première dépense pour lancer ta série de jours maîtrisés.",
    };
  }

  // 2. Détermination de la date réelle de début d'activité (aucun jour antérieur ne peut être compté)
  const earliestTimestamp = Math.min(...allTimestamps);
  const earliestDate = new Date(earliestTimestamp);
  const earliestDayStart = new Date(
    earliestDate.getFullYear(),
    earliestDate.getMonth(),
    earliestDate.getDate(),
    0,
    0,
    0,
    0
  ).getTime();

  // Seuil de dépense journalière de référence (avec marge de tolérance de 10%)
  const dailyTarget =
    state.profile.dailyBudgetTarget && state.profile.dailyBudgetTarget > 0
      ? state.profile.dailyBudgetTarget
      : allowance.monthlyBudget > 0
      ? Math.round(allowance.monthlyBudget / 30)
      : 3000;
  const threshold = Math.max(1000, Math.round(dailyTarget * 1.1));

  // 3. Évaluation d'aujourd'hui (Jour 0)
  if (allowance.overspentAmount > 0) {
    return {
      streakDays: 0,
      isMilestone: false,
      flameLevel: 1,
      badgeName: "Dépassement",
      message: `Budget dépassé de ${formatFCFA(allowance.overspentAmount)} aujourd'hui. Resserre pour repartir du bon pied demain !`,
    };
  }

  // Aujourd'hui est conforme
  let streak = 1;

  // 4. Analyse rétrospective des jours précédents (jusqu'à 60 jours au plus)
  let consecutiveZeroSpendDays = 0;

  for (let i = 1; i <= 60; i++) {
    const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = new Date(
      checkDate.getFullYear(),
      checkDate.getMonth(),
      checkDate.getDate(),
      0,
      0,
      0,
      0
    ).getTime();
    const dayEnd = dayStart + 86400000;

    // Arrêt strict : impossible de compter des jours antérieurs à l'inscription / première activité
    if (dayStart < earliestDayStart) {
      break;
    }

    const dayExpenses = state.expenses.filter(
      (e) => e.timestamp >= dayStart && e.timestamp < dayEnd
    );

    if (dayExpenses.length === 0) {
      consecutiveZeroSpendDays++;
      // Plus d'un jour sans dépense consécutif = période sans saisie / inactivité (rupture de série)
      if (consecutiveZeroSpendDays > 1) {
        break;
      }
      // 1 jour sans dépense isolé (zéro franc dépensé) est un jour maîtrisé
      streak++;
      continue;
    }

    consecutiveZeroSpendDays = 0;
    const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

    if (dayTotal <= threshold) {
      streak++;
    } else {
      // Dépassement budgétaire avéré ce jour-là : la série continue s'arrête
      break;
    }
  }

  const isMilestone = streak >= 7;
  const flameLevel: 1 | 2 | 3 = streak >= 7 ? 3 : streak >= 3 ? 2 : 1;
  
  let message = "";
  let milestoneBadge: "bronze_7" | "silver_14" | "gold_30" | undefined = undefined;
  let badgeName: string | undefined = undefined;

  if (streak >= 30) {
    milestoneBadge = "gold_30";
    badgeName = "Maître du Cauris (30j)";
    message = "Un mois entier de maîtrise absolue. Tu inspires le respect.";
  } else if (streak >= 14) {
    milestoneBadge = "silver_14";
    badgeName = "Discipline d'Acier (14j)";
    message = "Deux semaines sans faux pas. La rigueur paie toujours.";
  } else if (streak >= 7) {
    milestoneBadge = "bronze_7";
    badgeName = "Cap des 7 jours";
    message = "7 jours sans dépassement. Tu tiens le rythme. C’est ça la rigueur.";
  } else if (streak >= 3) {
    message = `Belle régularité sur ${streak} jours. Continue sur cette lancée.`;
  } else if (streak === 1 || streak === 2) {
    message = "Journée sous contrôle. La discipline commence ici.";
  } else {
    message = "Nouveau départ aujourd'hui. Chaque franc compte.";
  }

  return {
    streakDays: streak,
    isMilestone,
    milestoneBadge,
    badgeName,
    flameLevel,
    message,
  };
}

/**
 * 1.3 Message du Grand Frère quotidien (humain, contextuel, TTS-ready)
 */
export function generateGrandBrotherDailyMessage(state: AppState): string {
  const name = state.profile.name || "";
  const allowance = computeDailyAllowance(state);
  const radar = computeEndOfMonthRadar(state);
  const streak = computeMasteredDaysStreak(state);
  const now = new Date();
  const hour = now.getHours();

  let salute = "Bonjour";
  if (hour < 6) salute = "Bonne nuit";
  else if (hour >= 12 && hour < 18) salute = "Bon après-midi";
  else if (hour >= 18) salute = "Bonsoir";

  const greeting = name ? `${salute} ${name}.` : `${salute}.`;

  // 1. Priorité : objectif proche du but (>= 80%)
  const nearGoal = state.goals.find((g) => {
    if (g.completed || g.archived || g.targetAmount <= 0) return false;
    const ratio = g.currentAmount / g.targetAmount;
    return ratio >= 0.8 && ratio < 1;
  });

  if (nearGoal) {
    const pct = Math.round((nearGoal.currentAmount / nearGoal.targetAmount) * 100);
    return `${greeting} Tu es à ${pct} % de ton objectif ${nearGoal.name}. Encore un dernier effort, la victoire est à portée de main !`;
  }

  // 2. Priorité : streak remarquable (>= 7 jours)
  if (streak.streakDays >= 7) {
    return `${greeting} ${streak.streakDays} jours consécutifs sans dépassement ! Tu tiens le rythme, c’est ça la vraie rigueur.`;
  }

  // 3. Priorité : alerte rouge de fin de mois
  if (radar.status === "red") {
    return `${greeting} Attention, à ce rythme la fin de mois risque d'être tendue. Priorise la nourriture et le transport, reporte le reste.`;
  }

  // 4. Priorité : streak naissant ou bonne gestion
  if (streak.streakDays >= 3) {
    return `${greeting} T'as bien géré ces derniers jours. Garde ce rythme régulier, chaque franc préservé te protège.`;
  }

  // 5. Rythme sain standard
  if (allowance.dailyAllowance > 0) {
    return `${greeting} Il te reste ${formatFCFA(allowance.dailyAllowance)} par jour jusqu'à la fin du mois. ${allowance.humanMessage}`;
  }

  return `${greeting} Sois vigilant aujourd'hui, observe bien chaque dépense avant de sortir la monnaie.`;
}

/**
 * 2.2 Simulation rapide « Et si… »
 */
export function simulateDeposit(
  state: AppState,
  amount: number,
  targetGoalId?: string
): {
  currentBalance: number;
  newBalance: number;
  targetGoal?: Goal;
  currentRatio: number;
  newRatio: number;
  currentPercentage: number;
  newPercentage: number;
  canExecute: boolean;
} {
  const currentBalance = state.profile.pocketBalance ?? 0;
  const newBalance = Math.max(0, currentBalance - amount);
  const targetGoal = state.goals.find((g) => g.id === targetGoalId) || state.goals[0];

  let currentRatio = 0;
  let newRatio = 0;

  if (targetGoal && targetGoal.targetAmount > 0) {
    currentRatio = Math.min(1, targetGoal.currentAmount / targetGoal.targetAmount);
    newRatio = Math.min(1, (targetGoal.currentAmount + amount) / targetGoal.targetAmount);
  }

  return {
    currentBalance,
    newBalance,
    targetGoal,
    currentRatio,
    newRatio,
    currentPercentage: Math.round(currentRatio * 100),
    newPercentage: Math.round(newRatio * 100),
    canExecute: currentBalance >= amount && amount > 0,
  };
}

