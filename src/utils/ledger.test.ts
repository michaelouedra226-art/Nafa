import { describe, expect, it } from "vitest";
import { INITIAL_APP_STATE } from "./storage";
import { calculateRoundUp } from "./engine";
import { addExpenseToState, removeExpenseFromState, removeIncomeFromState, restoreExpenseToState } from "./ledger";
import type { AppState, Expense } from "../types";

function makeState(): AppState {
  return {
    ...INITIAL_APP_STATE,
    profile: {
      ...INITIAL_APP_STATE.profile,
      incomeSources: { ...INITIAL_APP_STATE.profile.incomeSources },
      pocketBalance: 10_000,
    },
    categories: [...INITIAL_APP_STATE.categories],
    goals: [{
      id: "goal_trip",
      name: "Voyage",
      targetAmount: 5_000,
      currentAmount: 4_950,
      visual: "cauris",
      mode: "libre",
    }],
    expenses: [],
    incomes: [],
    debts: [],
    tontines: [],
    quickTiles: [],
    dailyChallenges: [],
    transactions: [],
  };
}

const expense: Expense = {
  id: "exp_test",
  amount: 1_250,
  categoryId: "cat_nourriture",
  label: "Repas",
  timestamp: 1_700_000_000_000,
  roundUpSaved: 50,
  targetGoalId: "goal_trip",
  pocketBalanceImpact: 1_300,
};

describe("calculateRoundUp", () => {
  it("does not add an extra unit when the amount is already rounded", () => {
    expect(calculateRoundUp(1_200, 100)).toEqual({ targetRounded: 1_200, diff: 0 });
  });

  it("rounds up to the next supported denomination", () => {
    expect(calculateRoundUp(1_251, 100)).toEqual({ targetRounded: 1_300, diff: 49 });
  });

  it("handles invalid units safely", () => {
    expect(calculateRoundUp(100, 0)).toEqual({ targetRounded: 0, diff: 0 });
    expect(calculateRoundUp(100.5, 100)).toEqual({ targetRounded: 0, diff: 0 });
  });
});

describe("expense ledger", () => {
  it("applies one expense, its pocket impact, goal saving, and journal rows", () => {
    const next = addExpenseToState(makeState(), expense);
    expect(next.profile.pocketBalance).toBe(8_700);
    expect(next.profile.lastUsedCategoryId).toBe("cat_nourriture");
    expect(next.expenses).toHaveLength(1);
    expect(next.goals[0].currentAmount).toBe(5_000);
    expect(next.goals[0].completed).toBe(true);
    expect(next.transactions.map((transaction) => transaction.type)).toEqual(["expense", "round_up"]);
  });

  it("reverses the pocket and goal effects when deleting an expense", () => {
    const initial = makeState();
    const added = addExpenseToState(initial, expense);
    const removed = removeExpenseFromState(added, expense.id);
    expect(removed.profile.pocketBalance).toBe(10_000);
    expect(removed.expenses).toHaveLength(0);
    expect(removed.goals[0].currentAmount).toBe(4_950);
    expect(removed.goals[0].completed).toBe(false);
    expect(removed.transactions).toHaveLength(0);
  });

  it("restores a deleted expense and its exact journal rows for Undo", () => {
    const initial = makeState();
    const added = addExpenseToState(initial, expense);
    const removedRows = [...added.transactions];
    const removed = removeExpenseFromState(added, expense.id);
    const restored = restoreExpenseToState(removed, expense, removedRows);
    expect(restored.profile.pocketBalance).toBe(added.profile.pocketBalance);
    expect(restored.expenses).toEqual(added.expenses);
    expect(restored.goals).toEqual(added.goals);
    expect(restored.transactions).toEqual(added.transactions);
  });

  it("does not guess an old expense's pocket impact when no marker exists", () => {
    const initial = makeState();
    const legacyExpense = { ...expense, roundUpSaved: undefined, targetGoalId: undefined };
    const added = addExpenseToState(initial, legacyExpense);
    const removed = removeExpenseFromState(added, legacyExpense.id);
    expect(removed.profile.pocketBalance).toBe(initial.profile.pocketBalance);
  });
});

describe("income undo", () => {
  it("reverses pocket credit, saved goal amount, income, and both journal rows", () => {
    const state = makeState();
    state.incomes = [{ id: "inc_undo", amount: 5_000, category: "Job", timestamp: 1_700_000_000_000 }];
    state.profile.pocketBalance = 14_000;
    state.goals[0] = { ...state.goals[0], currentAmount: 5_950, completed: true };
    state.transactions = [
      { id: "tx_inc_inc_undo", type: "income", amount: 5_000, direction: "in", timestamp: 1_700_000_000_000 },
      { id: "tx_goal_undo", type: "goal_deposit", amount: 1_000, direction: "out", goalId: "goal_trip", timestamp: 1_700_000_000_000 },
    ];
    const removed = removeIncomeFromState(state, "inc_undo", 4_000, true, "goal_trip", 1_000, ["tx_goal_undo"]);
    expect(removed.profile.pocketBalance).toBe(10_000);
    expect(removed.incomes).toHaveLength(0);
    expect(removed.goals[0].currentAmount).toBe(4_950);
    expect(removed.goals[0].completed).toBe(false);
    expect(removed.transactions).toHaveLength(0);
  });

  it("restores an undefined pocket balance when undoing the first received income", () => {
    const state = makeState();
    state.profile.pocketBalance = 1_000;
    state.incomes = [{ id: "inc_first", amount: 1_000, category: "Bourse", timestamp: 1_700_000_000_000 }];
    const removed = removeIncomeFromState(state, "inc_first", 1_000, false);
    expect(removed.profile.pocketBalance).toBeUndefined();
    expect(removed.incomes).toHaveLength(0);
  });
});
