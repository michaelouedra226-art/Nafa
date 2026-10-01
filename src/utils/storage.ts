import { AppProfile, AppState, Category, Transaction } from "../types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat_nourriture",
    name: "Nourriture",
    color: "#B5541F", // Terre cuite
    iconName: "calebasse-bol",
    budgetPercentage: 40,
  },
  {
    id: "cat_transport",
    name: "Transport",
    color: "#1E2A44", // Indigo bogolan
    iconName: "moto",
    budgetPercentage: 15,
  },
  {
    id: "cat_sorties",
    name: "Sorties",
    color: "#C9922E", // Or sahélien
    iconName: "djembe",
    budgetPercentage: 10,
  },
  {
    id: "cat_etudes",
    name: "Études",
    color: "#4A6B3F", // Feuille de baobab
    iconName: "livre",
    budgetPercentage: 10,
  },
  {
    id: "cat_imprevus",
    name: "Imprévus",
    color: "#A8453F", // Rose kola
    iconName: "eclair",
    budgetPercentage: 15,
  },
  {
    id: "cat_epargne",
    name: "Épargne",
    color: "#C9922E",
    iconName: "cauris",
    budgetPercentage: 10,
  },
];

export const INITIAL_APP_STATE: AppState = {
  profile: {
    name: "",
    situation: "etudiant",
    language: "fr",
    currency: "FCFA",
    smallestDenomination: 100,
    roundUpSavingsEnabled: true,
    incomeSources: {
      hasGrant: false,
      hasFamilyAid: false,
      hasRegularJob: false,
      hasTontine: false,
      isIrregularIncome: false,
      hasNoIncome: false,
    },
    dailyBudgetTarget: undefined,
    observationMode: false,
    pocketBalance: undefined,
    lastOpenedTimestamp: Date.now(),
    darkMode: false,
    privateMode: false,
    pinCodeEnabled: false,
    onboardingCompleted: false,
    signatureBase64: undefined,
    signatureDate: undefined,
  },
  categories: DEFAULT_CATEGORIES,
  // STRICT RULE: No demo dummy transactions!
  expenses: [],
  incomes: [],
  goals: [],
  debts: [],
  tontines: [],
  quickTiles: [],
  dailyChallenges: [],
  transactions: [],
};

const STORAGE_KEY = "nafa_state_v6";
const LEGACY_STORAGE_KEYS = ["nafa_state_v5", "nafa_state_v4", "nafa_state_v3", "nafa_state_v2"];

export function loadAppState(): AppState {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Tentative de migration depuis une version antérieure
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          raw = legacyRaw;
          break;
        }
      }
    }

    if (!raw) return INITIAL_APP_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("État local NAFA non valide");
    }

    // Extraction robuste en cas d'imbrication profile.profile
    const rawProfile = parsed.profile && typeof parsed.profile === "object" ? parsed.profile : {};
    const profileCandidate = (rawProfile as any).profile;
    const nestedProfile = profileCandidate && typeof profileCandidate === "object" && !Array.isArray(profileCandidate)
      ? profileCandidate
      : {};
    const resolvedName = (rawProfile.name?.trim() || nestedProfile.name?.trim() || "").replace(/^Awa$/i, "");

    const cleanedProfile: AppProfile = {
      ...INITIAL_APP_STATE.profile,
      ...nestedProfile,
      ...rawProfile,
      incomeSources: {
        ...INITIAL_APP_STATE.profile.incomeSources,
        ...(nestedProfile.incomeSources && typeof nestedProfile.incomeSources === "object" ? nestedProfile.incomeSources : {}),
        ...(rawProfile.incomeSources && typeof rawProfile.incomeSources === "object" ? rawProfile.incomeSources : {}),
      },
      name: resolvedName,
      lastOpenedTimestamp: Date.now(),
    };

    const loadedExpenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    const loadedIncomes = Array.isArray(parsed.incomes) ? parsed.incomes : [];
    let loadedTransactions: Transaction[] = Array.isArray(parsed.transactions) ? parsed.transactions : [];

    // Si aucune transaction mais dépenses/revenus existants, reconstitution rétrocompatible
    if (loadedTransactions.length === 0 && (loadedExpenses.length > 0 || loadedIncomes.length > 0)) {
      const generated: Transaction[] = [];

      loadedIncomes.forEach((inc: any) => {
        generated.push({
          id: `tx_inc_${inc.id}`,
          type: "income",
          amount: inc.amount,
          direction: "in",
          label: inc.label || inc.category || "Revenu",
          timestamp: inc.timestamp,
        });
      });

      loadedExpenses.forEach((exp: any) => {
        generated.push({
          id: `tx_exp_${exp.id}`,
          type: "expense",
          amount: exp.amount,
          direction: "out",
          categoryId: exp.categoryId,
          label: exp.label,
          timestamp: exp.timestamp,
        });

        if (exp.roundUpSaved && exp.roundUpSaved > 0) {
          generated.push({
            id: `tx_rup_${exp.id}`,
            type: "round_up",
            amount: exp.roundUpSaved,
            direction: "out",
            goalId: exp.targetGoalId,
            label: "Arrondi d'épargne",
            timestamp: exp.timestamp,
            relatedExpenseId: exp.id,
          });
        }
      });

      loadedTransactions = generated.sort((a, b) => b.timestamp - a.timestamp);
    }

    const state: AppState = {
      ...INITIAL_APP_STATE,
      ...parsed,
      profile: cleanedProfile,
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 && parsed.categories.every(
        (item: any) => item && typeof item.id === "string" && typeof item.name === "string",
      ) ? parsed.categories : INITIAL_APP_STATE.categories,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      tontines: Array.isArray(parsed.tontines) ? parsed.tontines : [],
      quickTiles: Array.isArray(parsed.quickTiles) ? parsed.quickTiles : [],
      dailyChallenges: Array.isArray(parsed.dailyChallenges) ? parsed.dailyChallenges : [],
      transactions: loadedTransactions,
    };

    // Sauvegarde immédiate sous la clé v5
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignorer
    }

    return state;
  } catch (err) {
    console.error("Erreur de lecture du stockage local:", err);
    return INITIAL_APP_STATE;
  }
}

export function saveAppState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error("Erreur de sauvegarde locale:", err);
    return false;
  }
}

export function exportStateAsJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(jsonString: string): AppState {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !parsed.profile || typeof parsed.profile !== "object" || !Array.isArray(parsed.categories)) {
    throw new Error("Format JSON non valide pour NAFA");
  }

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const isAmount = (value: unknown, allowZero = false) =>
    typeof value === "number" && Number.isSafeInteger(value) && (allowZero ? value >= 0 : value > 0);
  const assertCollection = (key: string, predicate: (item: Record<string, unknown>) => boolean) => {
    const value = parsed[key];
    if (value === undefined) return;
    if (!Array.isArray(value) || !value.every((item) => isRecord(item) && predicate(item))) {
      throw new Error(`Données « ${key} » non valides dans cette sauvegarde`);
    }
  };

  if (typeof parsed.profile.name !== "string") {
    throw new Error("Profil NAFA non valide dans cette sauvegarde");
  }
  const profile = parsed.profile as Record<string, unknown>;
  if (profile.language !== undefined && !["fr", "moore", "dioula", "fulfulde"].includes(profile.language as string)) {
    throw new Error("Langue non valide dans cette sauvegarde");
  }
  if (profile.smallestDenomination !== undefined && ![25, 50, 100, 500].includes(profile.smallestDenomination as number)) {
    throw new Error("Unité d’arrondi non valide dans cette sauvegarde");
  }
  if (profile.dailyBudgetTarget !== undefined && !isAmount(profile.dailyBudgetTarget)) {
    throw new Error("Budget quotidien non valide dans cette sauvegarde");
  }
  if (profile.pocketBalance !== undefined && !isAmount(profile.pocketBalance, true)) {
    throw new Error("Solde en poche non valide dans cette sauvegarde");
  }
  if (profile.lastUsedCategoryId !== undefined && typeof profile.lastUsedCategoryId !== "string") {
    throw new Error("Préférence de catégorie non valide dans cette sauvegarde");
  }
  if (profile.incomeSources !== undefined && !isRecord(profile.incomeSources)) {
    throw new Error("Sources de revenus non valides dans cette sauvegarde");
  }
  if (parsed.categories.length === 0 || !parsed.categories.every(
    (item: unknown) => isRecord(item) && typeof item.id === "string" && typeof item.name === "string",
  )) {
    throw new Error("Catégories NAFA non valides dans cette sauvegarde");
  }
  assertCollection("expenses", (item) =>
    typeof item.id === "string" && typeof item.categoryId === "string" &&
    isAmount(item.amount) && typeof item.timestamp === "number" && Number.isFinite(item.timestamp) &&
    (item.roundUpSaved === undefined || isAmount(item.roundUpSaved, true)) &&
    (item.pocketBalanceImpact === undefined || isAmount(item.pocketBalanceImpact, true)),
  );
  assertCollection("incomes", (item) =>
    typeof item.id === "string" && isAmount(item.amount) &&
    typeof item.timestamp === "number" && Number.isFinite(item.timestamp),
  );
  assertCollection("goals", (item) =>
    typeof item.id === "string" && typeof item.name === "string" &&
    isAmount(item.targetAmount) && isAmount(item.currentAmount, true),
  );
  assertCollection("transactions", (item) =>
    typeof item.id === "string" && isAmount(item.amount, true) &&
    typeof item.timestamp === "number" && Number.isFinite(item.timestamp) &&
    (item.direction === "in" || item.direction === "out") &&
    ["expense", "income", "goal_deposit", "balance_adjustment", "round_up"].includes(item.type as string),
  );
  assertCollection("quickTiles", (item) =>
    typeof item.id === "string" && typeof item.label === "string" &&
    typeof item.categoryId === "string" && isAmount(item.amount),
  );
  for (const key of ["debts", "tontines", "dailyChallenges"]) {
    assertCollection(key, (item) => typeof item.id === "string");
  }

  return {
    ...INITIAL_APP_STATE,
    ...parsed,
    profile: {
      ...INITIAL_APP_STATE.profile,
      ...parsed.profile,
      incomeSources: {
        ...INITIAL_APP_STATE.profile.incomeSources,
        ...(isRecord(parsed.profile.incomeSources) ? parsed.profile.incomeSources : {}),
      },
    },
    expenses: parsed.expenses || [],
    incomes: parsed.incomes || [],
    goals: parsed.goals || [],
    debts: parsed.debts || [],
    tontines: parsed.tontines || [],
    quickTiles: parsed.quickTiles || [],
    dailyChallenges: parsed.dailyChallenges || [],
    transactions: parsed.transactions || [],
  };
}

export const DEFAULT_APP_STATE: AppState = INITIAL_APP_STATE;

export function resetAppState(): AppState {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
  } catch (err) {
    console.error("Erreur lors de la réinitialisation:", err);
  }
  return {
    ...INITIAL_APP_STATE,
    profile: { ...INITIAL_APP_STATE.profile, lastOpenedTimestamp: Date.now() },
  };
}
