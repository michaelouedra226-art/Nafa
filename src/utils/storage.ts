import { AppState, Category } from "../types";

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
};

const STORAGE_KEY = "nafa_state_v4";

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_APP_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_APP_STATE,
      ...parsed,
      profile: {
        ...INITIAL_APP_STATE.profile,
        ...(parsed.profile || {}),
        lastOpenedTimestamp: Date.now(),
      },
    };
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
  };
}

export const DEFAULT_APP_STATE: AppState = INITIAL_APP_STATE;

export function resetAppState(): AppState {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Erreur lors de la réinitialisation:", err);
  }
  return { ...INITIAL_APP_STATE, profile: { ...INITIAL_APP_STATE.profile, lastOpenedTimestamp: Date.now() } };
}
