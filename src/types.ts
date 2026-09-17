export type CurrencyCode = "FCFA";

export type RoundingUnit = 25 | 50 | 100 | 500;

export type UserSituation = 
  | "etudiant" 
  | "apprenti" 
  | "sans_activite" 
  | "autre";

export type GoalVisual = "cauris" | "calebasse" | "baobab";

export type GoalMode = "libre" | "regulier" | "temoin";

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  visual: GoalVisual;
  mode: GoalMode;
  targetDate?: string;
  regularAmount?: number;
  regularFrequency?: "hebdomadaire" | "mensuelle";
  witnessName?: string;
  witnessPhone?: string;
  isEmergencyFund?: boolean;
  completed?: boolean;
  completedDate?: string;
  archived?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  iconName: string;
  budgetPercentage?: number;
  monthlyLimit?: number;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  label?: string;
  timestamp: number; // epoch ms
  roundUpSaved?: number;
  targetGoalId?: string;
}

export interface Income {
  id: string;
  amount: number;
  category: "Bourse" | "Aide familiale" | "Job" | "Tontine reçue" | "Cadeau" | "Autre";
  label?: string;
  timestamp: number;
}

export interface Debt {
  id: string;
  type: "i_owe" | "they_owe";
  person: string;
  amount: number;
  dateCreated: number;
  dueDate?: string;
  phone?: string;
  note?: string;
  status: "pending" | "settled";
}

export interface Tontine {
  id: string;
  name: string;
  contributionAmount: number;
  membersCount: number;
  myTurnNumber: number;
  frequency: "mensuelle" | "hebdomadaire";
  paidRounds: number;
  collected: boolean;
}

// Backward-compatibility aliases
export type DebtItem = Debt;
export type TontineItem = Tontine;

export interface QuickTile {
  id: string;
  label: string;
  amount: number;
  categoryId: string;
}

export interface DailyChallenge {
  id: string;
  dateKey: string; // YYYY-MM-DD
  title: string;
  estimatedSavings: number;
  status: "pending" | "accepted" | "declined";
}

export interface AppProfile {
  name: string;
  situation: UserSituation;
  situationCustom?: string;
  language: "fr" | "moore" | "dioula" | "fulfulde";
  currency: CurrencyCode;
  smallestDenomination: RoundingUnit;
  roundUpSavingsEnabled: boolean;
  incomeSources: {
    hasGrant: boolean;
    grantAmount?: number;
    grantDay?: number;
    hasFamilyAid: boolean;
    familyAidAmount?: number;
    hasRegularJob: boolean;
    jobFrequency?: "semaine" | "mois";
    jobAmount?: number;
    hasTontine: boolean;
    tontineContribution?: number;
    isIrregularIncome: boolean;
    hasNoIncome: boolean;
  };
  dailyBudgetTarget?: number;
  observationMode: boolean;
  observationStartTimestamp?: number;
  pocketBalance?: number; // Solde en poche réel
  lastOpenedTimestamp: number;
  darkMode: boolean;
  privateMode: boolean;
  pinCodeEnabled: boolean;
  pinCode?: string;
  onboardingCompleted: boolean;
}

export interface AppState {
  profile: AppProfile;
  categories: Category[];
  expenses: Expense[];
  incomes: Income[];
  goals: Goal[];
  debts: DebtItem[];
  tontines: TontineItem[];
  quickTiles: QuickTile[];
  dailyChallenges: DailyChallenge[];
}
