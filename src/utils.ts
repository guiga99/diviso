import { Friend, Expense, Debt, Category, Group } from './types';

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Alimentação', icon: 'Utensils', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { id: 'transport', name: 'Transporte', icon: 'Car', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { id: 'lodging', name: 'Hospedagem', icon: 'Home', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  { id: 'leisure', name: 'Lazer & Viagem', icon: 'Sparkles', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  { id: 'groceries', name: 'Mercado', icon: 'ShoppingCart', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { id: 'utilities', name: 'Contas da Casa', icon: 'Tv', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { id: 'other', name: 'Outros', icon: 'DollarSign', color: 'text-gray-600', bgColor: 'bg-gray-100' },
];

export const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-fuchsia-500'
];

/**
 * Calculadora de Saldos: calcula o saldo líquido de cada amigo em um grupo ou globalmente.
 * Retorna um mapeamento de friendId para saldo (positivo = a receber, negativo = deve pagar).
 */
// Allocate integer cents once per expense, so every cent is accounted for.
export function expenseShares(expense: Expense): Record<string, number> {
  const entries = Object.entries(expense.splits).filter(([, value]) => value > 0);
  const cents = Math.round(expense.amount * 100);
  if (!entries.length) return {};
  if (expense.splitType === 'exact') {
    return Object.fromEntries(entries.map(([id, value]) => [id, Math.round(value * 100)]));
  }
  const weights = entries.map(([, value]) => expense.splitType === 'equal' ? 1 : value);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const raw = weights.map(weight => cents * weight / totalWeight);
  const shares = raw.map(Math.floor);
  const order = raw.map((value, index) => ({ index, remainder: value - shares[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const remaining = cents - shares.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < remaining; i++) shares[order[i].index]++;
  return Object.fromEntries(entries.map(([id], index) => [id, shares[index]]));
}

export function calculateBalances(
  expenses: Expense[], friendIds: string[], groupId?: string | null
): Record<string, number> {
  const balances = Object.fromEntries(friendIds.map(id => [id, 0]));
  for (const expense of expenses) {
    if (groupId !== undefined && expense.groupId !== groupId) continue;
    const shares = expenseShares(expense);
    if (!Object.keys(shares).length) continue;
    const amount = Math.round(expense.amount * 100);
    if (expense.paidById in balances) balances[expense.paidById] += amount;
    for (const [id, share] of Object.entries(shares)) {
      if (id in balances) balances[id] -= share;
    }
  }
  return Object.fromEntries(Object.entries(balances).map(([id, cents]) => [id, cents / 100]));
}

// Positive means the other friend owes the active user; negative means the reverse.
export function balanceWithFriend(expenses: Expense[], userId: string, otherId: string): number {
  if (userId === otherId) return 0;
  let cents = 0;
  for (const expense of expenses) {
    const shares = expenseShares(expense);
    if (expense.paidById === userId) cents += shares[otherId] || 0;
    if (expense.paidById === otherId) cents -= shares[userId] || 0;
  }
  return cents / 100;
}

/**
 * Algoritmo de Simplificação de Dívidas:
 * Combina credores e devedores para reduzir as transferências necessárias.
 */
export function simplifyDebts(
  expenses: Expense[],
  friends: Friend[],
  groupId?: string | null
): Debt[] {
  const friendIds = friends.map(f => f.id);
  const balances = calculateBalances(expenses, friendIds, groupId);

  // Divide em credores (balance >= 0.01) e devedores (balance <= -0.01)
  const creditors: { id: string; balance: number }[] = [];
  const debtors: { id: string; balance: number }[] = [];

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance >= 0.01) {
      creditors.push({ id, balance });
    } else if (balance <= -0.01) {
      debtors.push({ id, balance: -balance }); // Guardamos o débito como positivo para facilitar
    }
  });

  const transactions: Debt[] = [];

  let cPointer = 0;
  let dPointer = 0;

  // Ordena para que os maiores valores se encontrem primeiro (reduz mais transações)
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  while (cPointer < creditors.length && dPointer < debtors.length) {
    const creditor = creditors[cPointer];
    const debtor = debtors[dPointer];

    // Valor da transferência é o menor entre a dívida e o crédito
    const amount = Math.min(creditor.balance, debtor.balance);
    
    if (amount >= 0.01) {
      transactions.push({
        fromId: debtor.id,
        toId: creditor.id,
        amount: Math.round(amount * 100) / 100
      });
    }

    creditor.balance = Math.round((creditor.balance - amount) * 100) / 100;
    debtor.balance = Math.round((debtor.balance - amount) * 100) / 100;

    if (creditor.balance < 0.01) {
      cPointer++;
    }
    if (debtor.balance < 0.01) {
      dPointer++;
    }
  }

  return transactions;
}

// Dados de simulação iniciais para preencher o app de forma bonita na primeira abertura
export const INITIAL_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Lucas Silva', email: 'lucas@email.com', avatarColor: 'bg-indigo-500' },
  { id: 'f2', name: 'Mariana Costa', email: 'mariana@email.com', avatarColor: 'bg-emerald-500' },
  { id: 'f3', name: 'Rodrigo Alves', email: 'rodrigo@email.com', avatarColor: 'bg-amber-500' },
  { id: 'f4', name: 'Juliana Meireles', email: 'juliana@email.com', avatarColor: 'bg-purple-500' },
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'Viagem para Floripa',
    description: 'Viagem de ano novo com a galera da faculdade',
    memberIds: ['f1', 'f2', 'f3', 'f4'],
    createdAt: '2026-01-01T12:00:00Z',
  },
  {
    id: 'g2',
    name: 'Despesas do Apartamento',
    description: 'Contas do apê 42B',
    memberIds: ['f1', 'f2', 'f3'],
    createdAt: '2026-03-15T15:30:00Z',
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  // Viagem Floripa
  {
    id: 'e1',
    description: 'Aluguel do Airbnb',
    amount: 1200,
    date: '2026-05-10',
    categoryId: 'lodging',
    groupId: 'g1',
    paidById: 'f1', // Lucas pagou
    splitType: 'equal',
    splits: { f1: 1, f2: 1, f3: 1, f4: 1 } // Dividido igualmente por 4
  },
  {
    id: 'e2',
    description: 'Gasolina e Pedágio',
    amount: 250,
    date: '2026-05-11',
    categoryId: 'transport',
    groupId: 'g1',
    paidById: 'f3', // Rodrigo pagou
    splitType: 'equal',
    splits: { f1: 1, f2: 1, f3: 1, f4: 1 }
  },
  {
    id: 'e3',
    description: 'Churrasco de Boas-vindas',
    amount: 400,
    date: '2026-05-12',
    categoryId: 'food',
    groupId: 'g1',
    paidById: 'f2', // Mariana pagou
    splitType: 'exact',
    splits: { f1: 100, f2: 100, f3: 120, f4: 80 } // Divisão personalizada
  },
  {
    id: 'e4',
    description: 'Ingressos Balada',
    amount: 300,
    date: '2026-05-13',
    categoryId: 'leisure',
    groupId: 'g1',
    paidById: 'f4', // Juliana pagou
    splitType: 'equal',
    splits: { f1: 1, f2: 0, f3: 1, f4: 1 } // Dividido apenas entre Lucas, Rodrigo e Juliana
  },
  // Despesas Apartamento
  {
    id: 'e5',
    description: 'Mercado do Mês',
    amount: 480,
    date: '2026-06-01',
    categoryId: 'groceries',
    groupId: 'g2',
    paidById: 'f2', // Mariana pagou
    splitType: 'equal',
    splits: { f1: 1, f2: 1, f3: 1 }
  },
  {
    id: 'e6',
    description: 'Internet Fibra',
    amount: 150,
    date: '2026-06-05',
    categoryId: 'utilities',
    groupId: 'g2',
    paidById: 'f1', // Lucas pagou
    splitType: 'equal',
    splits: { f1: 1, f2: 1, f3: 1 }
  },
  // Settlement individual fora de grupo
  {
    id: 'e7',
    description: 'Acerto de contas pelo Pix',
    amount: 100,
    date: '2026-06-08',
    categoryId: 'other',
    groupId: null,
    paidById: 'f3', // Rodrigo pagou diretamente
    splitType: 'exact',
    splits: { f1: 100 }, // Para o Lucas (Rodrigo pagando para o Lucas)
    isSettlement: true
  }
];
