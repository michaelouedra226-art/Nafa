import { describe, expect, it } from "vitest";
import { INITIAL_APP_STATE } from "./storage";
import { computeDailyAllowance, getCrossedGoalMilestone, getDaysRemainingInMonth, isCurrentMonth } from "./engine";
import type { AppState } from "../types";

function makeState(): AppState {
  return {
    ...INITIAL_APP_STATE,
    profile: {
      ...INITIAL_APP_STATE.profile,
      incomeSources: { ...INITIAL_APP_STATE.profile.incomeSources },
      dailyBudgetTarget: 1_000,
      smallestDenomination: 100,
      pocketBalance: 20_000,
    },
    categories: [...INITIAL_APP_STATE.categories],
    expenses: [],
    incomes: [],
    goals: [],
    debts: [],
    tontines: [],
    quickTiles: [],
    dailyChallenges: [],
    transactions: [],
  };
}

describe("budget calendar boundaries", () => {
  it("counts the current day and handles leap February", () => {
    expect(getDaysRemainingInMonth(new Date(2024, 1, 29, 12))).toBe(1);
    expect(getDaysRemainingInMonth(new Date(2024, 1, 1, 12))).toBe(29);
    expect(getDaysRemainingInMonth(new Date(2025, 1, 1, 12))).toBe(28);
  });

  it("distinguishes the previous, current, and next month across a year boundary", () => {
    const reference = new Date(2025, 0, 1, 12);
    expect(isCurrentMonth(new Date(2024, 11, 31, 12).getTime(), reference)).toBe(false);
    expect(isCurrentMonth(new Date(2025, 0, 1, 12).getTime(), reference)).toBe(true);
    expect(isCurrentMonth(new Date(2025, 1, 1, 12).getTime(), reference)).toBe(false);
  });
});

describe("computeDailyAllowance", () => {
  it("subtracts today's expenses and excludes spending outside the current month", () => {
    const state = makeState();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 12).getTime();
    state.expenses = [
      { id: "today", amount: 150, categoryId: "cat_nourriture", timestamp: today },
      { id: "previous", amount: 900, categoryId: "cat_transport", timestamp: previousMonth },
    ];
    const result = computeDailyAllowance(state);
    expect(result.spentToday).toBe(150);
    expect(result.monthlySpent).toBe(150);
    expect(result.dailyAllowance).toBe(850);
    expect(result.overspentAmount).toBe(0);
  });

  it("never returns a negative allowance after overspending", () => {
    const state = makeState();
    state.expenses = [{
      id: "overspent",
      amount: 1_350,
      categoryId: "cat_nourriture",
      timestamp: Date.now(),
    }];
    const result = computeDailyAllowance(state);
    expect(result.dailyAllowance).toBe(0);
    expect(result.overspentAmount).toBe(350);
    expect(result.statusColor).toBe("#A8453F");
  });
});

describe("goal progress milestones", () => {
  it("reports the highest newly crossed quarter milestone", () => {
    expect(getCrossedGoalMilestone(0, 600, 1_000)).toBe(50);
    expect(getCrossedGoalMilestone(0, 900, 1_000)).toBe(75);
  });

  it("does not repeat old milestones or show one at completion", () => {
    expect(getCrossedGoalMilestone(500, 700, 1_000)).toBeUndefined();
    expect(getCrossedGoalMilestone(750, 1_000, 1_000)).toBeUndefined();
  });
});
