import React, { useState, useEffect } from 'react';
import { Friend, Group, Expense, SplitType } from '../types';
import { CATEGORIES } from '../utils';
import { X, Receipt, HelpCircle, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  initialExpense?: Expense | null;
  onClose: () => void;
  friends: Friend[];
  groups: Group[];
  activeGroupId: string | null;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

export default function AddExpenseModal({
  isOpen,
  initialExpense,
  onClose,
  friends,
  groups,
  activeGroupId,
  onAddExpense,
}: AddExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('food');
  const [groupId, setGroupId] = useState<string | 'none'>(activeGroupId || 'none');
  const [paidById, setPaidById] = useState<string>('');
  
  const [splitType, setSplitType] = useState<SplitType>('equal');
  // Record of friendId -> numeric value (1/0 for equal, or custom values for exact/percentage)
  const [splits, setSplits] = useState<Record<string, number>>({});
  
  const [validationError, setValidationError] = useState('');

  // Get active members in context based on selected groupId
  const getContextMembers = (): Friend[] => {
    if (groupId && groupId !== 'none') {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        return friends.filter(f => group.memberIds.includes(f.id));
      }
    }
    return friends;
  };

  const membersInContext = getContextMembers();

  useEffect(() => {
    if (!isOpen) return;
    setDescription(initialExpense?.description || '');
    setAmountStr(initialExpense ? String(initialExpense.amount) : '');
    setDate(initialExpense?.date || new Date().toISOString().split('T')[0]);
    setCategoryId(initialExpense?.categoryId || 'food');
    setGroupId(initialExpense?.groupId || activeGroupId || 'none');
    setPaidById(initialExpense?.paidById || '');
    setSplitType(initialExpense?.splitType || 'equal');
    setValidationError('');
  }, [isOpen, initialExpense, activeGroupId]);

  useEffect(() => {
    if (!isOpen) return;
    const currentMembers = getContextMembers();
    const editingOriginal = initialExpense && groupId === (initialExpense.groupId || 'none');
    setPaidById(previous => currentMembers.some(m => m.id === previous) ? previous : currentMembers[0]?.id || '');
    setSplits(Object.fromEntries(currentMembers.map(m => [m.id,
      editingOriginal && splitType === initialExpense.splitType
        ? initialExpense.splits[m.id] || 0 : splitType === 'equal' ? 1 : 0
    ])));
  }, [groupId, friends, groups, splitType, isOpen, initialExpense]);

  // Handle participant toggle (mainly for equal split)
  const handleToggleParticipant = (friendId: string) => {
    setSplits(prev => {
      const nextSplits = { ...prev };
      if (splitType === 'equal') {
        nextSplits[friendId] = nextSplits[friendId] ? 0 : 1;
      } else {
        // For custom splits, if already has value, toggling it sets it to 0 / removes it
        if (nextSplits[friendId] > 0) {
          nextSplits[friendId] = 0;
        } else {
          // Put a basic default place-holder value
          nextSplits[friendId] = splitType === 'percentage' ? 25 : 10;
        }
      }
      return nextSplits;
    });
  };

  const handleCustomSplitChange = (friendId: string, value: number) => {
    setSplits(prev => ({
      ...prev,
      [friendId]: value
    }));
  };

  // Helper to dynamically balance custom exact divisions
  const forceEquallyCustom = () => {
    const amt = splitType === 'percentage' ? 100 : parseFloat(amountStr) || 0;
    if (amt <= 0) return;

    const participatingMembers = Object.keys(splits).filter(id => {
      // If it's a member in current context
      return membersInContext.some(m => m.id === id) && (splitType === 'equal' ? splits[id] === 1 : true);
    });

    if (participatingMembers.length === 0) return;

    const totalCents = Math.round(amt * 100);
    const base = Math.floor(totalCents / participatingMembers.length);
    const remainder = totalCents % participatingMembers.length;
    setSplits(prev => ({
      ...prev,
      ...Object.fromEntries(participatingMembers.map((id, index) =>
        [id, (base + (index < remainder ? 1 : 0)) / 100]
      )),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const amt = Math.round(Number(amountStr) * 100) / 100;
    if (!Number.isFinite(amt) || amt <= 0) {
      setValidationError('Insira um valor maior que zero.');
      return;
    }

    if (!description.trim()) {
      setValidationError('Insira uma descrição para a despesa.');
      return;
    }

    const participatingIds = Object.keys(splits).filter(id => {
      const inContext = membersInContext.some(m => m.id === id);
      if (splitType === 'equal') {
        return inContext && splits[id] === 1;
      }
      return inContext && splits[id] > 0;
    });

    if (participatingIds.length === 0) {
      setValidationError('Selecione pelo menos uma pessoa para participar do rateio.');
      return;
    }

    if (!membersInContext.some(m => m.id === paidById) || Object.keys(splits).some(id => !Number.isFinite(splits[id]) || splits[id] < 0)) {
      setValidationError('Confira o pagador e os valores do rateio.');
      return;
    }

    // Validate totals
    if (splitType === 'exact') {
      const sum = participatingIds.reduce((acc, id) => acc + (splits[id] || 0), 0);
      if (Math.round(sum * 100) !== Math.round(amt * 100)) {
        setValidationError(`A soma dos valores (R$ ${sum.toFixed(2)}) deve ser exatamente o total (R$ ${amt.toFixed(2)}). Balanço: R$ ${(amt - sum).toFixed(2)}`);
        return;
      }
    } else if (splitType === 'percentage') {
      const sum = participatingIds.reduce((acc, id) => acc + (splits[id] || 0), 0);
      if (Math.abs(sum - 100) > 0.000001) {
        setValidationError(`A soma das porcentagens deve ser exatamente 100%. Soma atual: ${sum}%`);
        return;
      }
    }

    // Prepare data for save
    const preparedSplits: Record<string, number> = {};
    if (splitType === 'equal') {
      // Store 1 for active participant, 0 for inactive
      membersInContext.forEach(m => {
        preparedSplits[m.id] = splits[m.id] === 1 ? 1 : 0;
      });
    } else {
      // Store direct numeric value
      membersInContext.forEach(m => {
        preparedSplits[m.id] = splits[m.id] || 0;
      });
    }

    onAddExpense({
      description: description.trim(),
      amount: amt,
      date,
      categoryId,
      groupId: groupId === 'none' ? null : groupId,
      paidById,
      splitType,
      splits: preparedSplits,
    });

    // Reset fields
    setDescription('');
    setAmountStr('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('food');
    setValidationError('');
    onClose();
  };

  // Helper to render Lucide Icons dynamically
  const renderCategoryIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || HelpCircle;
    return <IconComponent size={18} />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white p-6 shadow-xl z-10 flex flex-col max-h-[90vh] border border-nat-border/50"
            id="add-expense-modal-container"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-nat-border/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-nat-sidebar text-nat-primary rounded-2xl">
                  <Receipt size={20} id="add-expense-modal-icon-header" />
                </div>
                <h3 className="text-lg font-bold text-nat-text font-serif italic" id="add-expense-modal-title">
                  {initialExpense ? 'Editar Despesa' : 'Adicionar Despesa'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-nat-muted hover:bg-nat-sidebar transition-colors cursor-pointer"
                id="add-expense-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {validationError && (
              <p className="mt-4 p-3 bg-nat-red/10 text-nat-red rounded-2xl text-xs font-semibold leading-relaxed flex-shrink-0 border border-nat-red/20" id="add-expense-error-msg">
                {validationError}
              </p>
            )}

            {/* Scrollable Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4" id="add-expense-form">
              {/* Group context selector */}
              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="expense-group-select">
                  Grupo de Rateio
                </label>
                <select
                  id="expense-group-select"
                  value={groupId === null ? 'none' : groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans cursor-pointer"
                >
                  <option value="none">Nenhum Grupo (Despesa Individual)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Description & Amount */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="expense-desc-input">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    id="expense-desc-input"
                    placeholder="Ex: Mercado, Almoço..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="expense-amount-input">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    id="expense-amount-input"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans"
                    required
                  />
                </div>
              </div>

              {/* Date & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="expense-date-input">
                    Data
                  </label>
                  <input
                    type="date"
                    id="expense-date-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="expense-category-select">
                    Categoria
                  </label>
                  <div className="relative">
                    <select
                      id="expense-category-select"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payer Configuration */}
              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="expense-payer-select">
                  Pago por *
                </label>
                <select
                  id="expense-payer-select"
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans cursor-pointer"
                >
                  {membersInContext.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Split Type Selector */}
              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider">
                  Método de Divisão
                </label>
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-nat-bg/10 border border-nat-border/40 rounded-full" id="split-type-tabs">
                  <button
                    type="button"
                    onClick={() => setSplitType('equal')}
                    className={`py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                      splitType === 'equal' 
                        ? 'bg-nat-primary text-white shadow-sm' 
                        : 'text-nat-muted hover:text-nat-text'
                    }`}
                  >
                    Igual (=)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('exact')}
                    className={`py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                      splitType === 'exact' 
                        ? 'bg-nat-primary text-white shadow-sm' 
                        : 'text-nat-muted hover:text-nat-text'
                    }`}
                  >
                    Valores (R$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('percentage')}
                    className={`py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                      splitType === 'percentage' 
                        ? 'bg-nat-primary text-white shadow-sm' 
                        : 'text-nat-muted hover:text-nat-text'
                    }`}
                  >
                    Porcentagem (%)
                  </button>
                </div>
              </div>

              {/* Members Splits Listing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-nat-text uppercase tracking-wider">
                    {splitType === 'equal' 
                      ? 'Quem fará parte da divisão?' 
                      : 'Especifique as partes de cada um'
                    }
                  </label>
                  
                  {/* Dynamic split balancer helper for custom division */}
                  {splitType !== 'equal' && parseFloat(amountStr) > 0 && (
                    <button
                      type="button"
                      onClick={forceEquallyCustom}
                      className="text-xs font-bold text-nat-primary hover:text-nat-primary-hover hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <DollarSign size={12} />
                      Equilibrar Igualmente
                    </button>
                  )}
                </div>

                <div className="border border-nat-border/40 rounded-[24px] divide-y divide-nat-border/30 overflow-hidden bg-white max-h-[220px] overflow-y-auto p-1.5">
                  {membersInContext.map(friend => {
                    // Check if participating
                    const isChecked = splitType === 'equal'
                      ? splits[friend.id] === 1
                      : splits[friend.id] !== undefined && splits[friend.id] > 0;

                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-2.5 transition-colors"
                        id={`split-friend-row-${friend.id}`}
                      >
                        <div
                          onClick={() => handleToggleParticipant(friend.id)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-nat-primary border-nat-primary text-white'
                              : 'border-nat-border bg-white'
                          }`}>
                            {isChecked && <Icons.Check size={12} strokeWidth={3} />}
                          </div>
                          
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${friend.avatarColor}`}>
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-nat-text font-medium">{friend.name}</p>
                          </div>
                        </div>

                        {/* Custom input box depending on splits types */}
                        {splitType === 'exact' && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-nat-muted">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              value={splits[friend.id] || ''}
                              onChange={(e) => handleCustomSplitChange(friend.id, parseFloat(e.target.value) || 0)}
                              className="w-20 rounded-full border border-nat-border/55 bg-nat-bg/10 px-3 py-1.5 text-xs text-right outline-none focus:border-nat-primary font-sans"
                            />
                          </div>
                        )}

                        {splitType === 'percentage' && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              value={splits[friend.id] || ''}
                              onChange={(e) => handleCustomSplitChange(friend.id, parseFloat(e.target.value) || 0)}
                              className="w-16 rounded-full border border-nat-border/55 bg-nat-bg/10 px-3 py-1.5 text-xs text-right outline-none focus:border-nat-primary font-sans"
                            />
                            <span className="text-xs text-nat-muted">%</span>
                          </div>
                        )}

                        {splitType === 'equal' && isChecked && (
                          <span className="text-xs font-semibold text-nat-green bg-nat-sidebar px-2.5 py-0.5 rounded-full" id={`equal-split-share-badge-${friend.id}`}>
                            Ativo
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-nat-border/30 flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2.5 text-sm font-bold text-nat-muted hover:bg-nat-sidebar transition-all cursor-pointer"
                  id="add-expense-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-nat-primary hover:bg-nat-primary-hover text-white px-5 py-2.5 text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  id="add-expense-submit-btn"
                >
                  <Receipt size={16} />
                  Salvar Despesa
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
