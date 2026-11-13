import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBalances, simplifyDebts, balanceWithFriend, expenseShares } from '../src/utils';
import type { Expense, Friend } from '../src/types';
const ids = ['a', 'b', 'c'];
const friends: Friend[] = ids.map(id => ({ id, name: id }));
const bill = (paidById: string, amount: number, splits = { a: 1, b: 1, c: 1 }): Expense => ({
  id: 'e', description: 'Teste', amount, date: '2026-11-13', categoryId: 'other',
  groupId: 'g', paidById, splitType: 'equal', splits,
});
test('multiple payers: A pays 90 and B pays 60 for three people', () => {
  const expenses = [bill('a', 90), bill('b', 60)];
  assert.deepEqual(calculateBalances(expenses, ids), { a: 40, b: 10, c: -50 });
  assert.equal(balanceWithFriend(expenses, 'a', 'b'), 10);
  assert.equal(balanceWithFriend(expenses, 'a', 'c'), 30);
  assert.equal(balanceWithFriend(expenses, 'b', 'a'), -10);
  assert.deepEqual(simplifyDebts(expenses, friends), [
    { fromId: 'c', toId: 'a', amount: 40 }, { fromId: 'c', toId: 'b', amount: 10 },
  ]);
});
test('every cent is assigned and one-cent debts can be settled', () => {
  const expense = bill('a', 10);
  assert.deepEqual(expenseShares(expense), { a: 334, b: 333, c: 333 });
  assert.equal(Object.values(calculateBalances([expense], ids)).reduce((s, n) => s + Math.round(n * 100), 0), 0);
  assert.deepEqual(simplifyDebts([bill('a', .01, { a: 0, b: 1, c: 0 })], friends), [{ fromId: 'b', toId: 'a', amount: .01 }]);
});
test('exact and percentage splits, excluded payer, filters and settlements', () => {
  const exact = { ...bill('a', 60), splitType: 'exact' as const, splits: { a: 10, b: 20, c: 30 } };
  const percent = { ...bill('b', 100), splitType: 'percentage' as const, splits: { a: 25, b: 25, c: 50 } };
  assert.deepEqual(calculateBalances([exact, percent], ids), { a: 25, b: 55, c: -80 });
  assert.deepEqual(calculateBalances([bill('a', 90, { a: 0, b: 1, c: 1 })], ids), { a: 90, b: -45, c: -45 });
  const settled = [...[exact, percent], { ...bill('c', 25), isSettlement: true, splitType: 'exact' as const, splits: { a: 25 } }];
  assert.deepEqual(calculateBalances(settled, ids, 'g'), { a: 0, b: 55, c: -55 });
  assert.deepEqual(calculateBalances(settled, ids, null), { a: 0, b: 0, c: 0 });
});
test('a friend global credit is not the debt between two friends', () => {
  const expenses = [bill('c', 90), bill('b', 120)];
  assert.equal(calculateBalances(expenses, ids).b, 50);
  assert.equal(balanceWithFriend(expenses, 'a', 'b'), -40);
  const settlement = { ...bill('a', 40), splitType: 'exact' as const, splits: { b: 40 }, isSettlement: true };
  assert.equal(balanceWithFriend([...expenses, settlement], 'a', 'b'), 0);
});
