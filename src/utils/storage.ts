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

const STORAGE_KEY = "nafa_state_v5";
const LEGACY_STORAGE_KEYS = ["nafa_state_v4", "nafa_state_v3", "nafa_state_v2"];

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

    // Extraction robuste en cas d'imbrication profile.profile
    const rawProfile = parsed.profile || {};
    const nestedProfile = (rawProfile as any).profile || {};
    const resolvedName = (rawProfile.name?.trim() || nestedProfile.name?.trim() || "").replace(/^Awa$/i, "");

    const cleanedProfile: AppProfile = {
      ...INITIAL_APP_STATE.profile,
      ...nestedProfile,
      ...rawProfile,
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

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Erreur de sauvegarde locale:", err);
  }
}

export function exportStateAsJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(jsonString: string): AppState {
  const parsed = JSON.parse(jsonString);
  if (!parsed.profile || !Array.isArray(parsed.categories)) {
    throw new Error("Format JSON non valide pour NAFA");
  }
  return {
    ...INITIAL_APP_STATE,
    ...parsed,
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
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
