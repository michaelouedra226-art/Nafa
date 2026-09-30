import { AppState, Expense, Goal, Transaction } from "../types";

function withUpdatedGoal(goal: Goal, amountDelta: number): Goal {
  const currentAmount = Math.max(0, goal.currentAmount + amountDelta);
  const completed = currentAmount >= goal.targetAmount;
  return {
    ...goal,
    currentAmount,
    completed,
    completedDate: completed ? goal.completedDate || new Date().toISOString().slice(0, 10) : undefined,
  };
}

function expenseTransactions(expense: Expense, state: AppState, roundUpToGoalId?: string): Transaction[] {
  const category = state.categories.find((item) => item.id === expense.categoryId);
  const goalId = roundUpToGoalId || expense.targetGoalId;
  const goal = goalId ? state.goals.find((item) => item.id === goalId) : undefined;
  const transactions: Transaction[] = [
    {
      id: `tx_exp_${expense.id}`,
      type: "expense",
      amount: expense.amount,
      direction: "out",
      categoryId: expense.categoryId,
      label: expense.label || category?.name || "Dépense",
      timestamp: expense.timestamp,
    },
  ];

  if (expense.roundUpSaved && expense.roundUpSaved > 0) {
    transactions.push({
      id: `tx_rup_${expense.id}`,
      type: "round_up",
      amount: expense.roundUpSaved,
      direction: "out",
      goalId,
      label: `Arrondi vers « ${goal?.name || "Épargne"} »`,
      timestamp: expense.timestamp,
      relatedExpenseId: expense.id,
    });
  }

  return transactions;
}

/** Apply one new expense and all of its ledger effects as a single immutable state update. */
export function addExpenseToState(
  state: AppState,
  expense: Expense,
  roundUpToGoalId?: string,
): AppState {
  const targetGoalId = roundUpToGoalId || expense.targetGoalId;
  const pocketImpact = Math.max(0, expense.pocketBalanceImpact || 0);
  const savedAmount = Math.max(0, expense.roundUpSaved || 0);
  const transactions = expenseTransactions(expense, state, targetGoalId);

  return {
    ...state,
    profile: {
      ...state.profile,
      lastUsedCategoryId: expense.categoryId,
      pocketBalance:
        state.profile.pocketBalance === undefined
          ? undefined
          : Math.max(0, state.profile.pocketBalance - pocketImpact),
    },
    expenses: [expense, ...state.expenses],
    goals: targetGoalId && savedAmount > 0
      ? state.goals.map((goal) => goal.id === targetGoalId ? withUpdatedGoal(goal, savedAmount) : goal)
      : state.goals,
    transactions: [...transactions, ...(state.transactions || [])],
  };
}

/** Remove an expense and reverse the balance and goal effects recorded for it. */
export function removeExpenseFromState(state: AppState, expenseId: string): AppState {
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) return state;

  const pocketImpact = Math.max(0, expense.pocketBalanceImpact || 0);
  const goalId = expense.targetGoalId || state.transactions.find(
    (transaction) => transaction.relatedExpenseId === expenseId && transaction.goalId,
  )?.goalId;
  const savedAmount = Math.max(0, expense.roundUpSaved || 0);

  return {
    ...state,
    profile: {
      ...state.profile,
      pocketBalance: state.profile.pocketBalance === undefined
        ? undefined
        : state.profile.pocketBalance + pocketImpact,
    },
    expenses: state.expenses.filter((item) => item.id !== expenseId),
    goals: goalId && savedAmount > 0
      ? state.goals.map((goal) => goal.id === goalId ? withUpdatedGoal(goal, -savedAmount) : goal)
      : state.goals,
    transactions: (state.transactions || []).filter(
      (transaction) => transaction.id !== `tx_exp_${expenseId}` && transaction.relatedExpenseId !== expenseId,
    ),
  };
}

/** Restore a just-deleted expense for the short-lived Undo action. */
export function restoreExpenseToState(
  state: AppState,
  expense: Expense,
  deletedTransactions: Transaction[],
): AppState {
  if (state.expenses.some((item) => item.id === expense.id)) return state;

  const pocketImpact = Math.max(0, expense.pocketBalanceImpact || 0);
  const goalId = expense.targetGoalId || deletedTransactions.find((transaction) => transaction.goalId)?.goalId;
  const savedAmount = Math.max(0, expense.roundUpSaved || 0);

  return {
    ...state,
    profile: {
      ...state.profile,
      pocketBalance: state.profile.pocketBalance === undefined
        ? undefined
        : Math.max(0, state.profile.pocketBalance - pocketImpact),
    },
    expenses: [expense, ...state.expenses],
    goals: goalId && savedAmount > 0
      ? state.goals.map((goal) => goal.id === goalId ? withUpdatedGoal(goal, savedAmount) : goal)
      : state.goals,
    transactions: [...deletedTransactions, ...(state.transactions || [])],
  };
}

/** Reverse a just-added income and its optional goal transfer for an Undo action. */
export function removeIncomeFromState(
  state: AppState,
  incomeId: string,
  pocketCredit: number,
  pocketWasDefined: boolean,
  goalId?: string,
  goalSaving = 0,
  transactionIds: string[] = [],
): AppState {
  if (!state.incomes.some((income) => income.id === incomeId)) return state;
  const credit = Number.isSafeInteger(pocketCredit) ? Math.max(0, pocketCredit) : 0;
  const savings = Number.isSafeInteger(goalSaving) ? Math.max(0, goalSaving) : 0;
  const currentPocket = state.profile.pocketBalance;
  const explicitTransactionIds = new Set([`tx_inc_${incomeId}`, ...transactionIds]);

  return {
    ...state,
    profile: {
      ...state.profile,
      pocketBalance: currentPocket === undefined
        ? undefined
        : !pocketWasDefined && currentPocket === credit
          ? undefined
          : Math.max(0, currentPocket - credit),
    },
    incomes: state.incomes.filter((income) => income.id !== incomeId),
    goals: goalId && savings > 0
      ? state.goals.map((goal) => {
          if (goal.id !== goalId) return goal;
          const currentAmount = Math.max(0, goal.currentAmount - savings);
          const completed = currentAmount >= goal.targetAmount;
          return {
            ...goal,
            currentAmount,
            completed,
            completedDate: completed ? goal.completedDate : undefined,
          };
        })
      : state.goals,
    transactions: (state.transactions || []).filter((transaction) => !explicitTransactionIds.has(transaction.id)),
  };
}
