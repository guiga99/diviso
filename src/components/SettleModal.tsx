import React, { useState, useEffect } from 'react';
import { Friend, Group, Expense } from '../types';
import { calculateBalances } from '../utils';
import { X, Check, Landmark, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  groups: Group[];
  activeGroupId: string | null;
  onAddSettlement: (expense: Omit<Expense, 'id'>) => void;
  initialFromId?: string; // Optional pre-fill
  initialToId?: string;   // Optional pre-fill
  initialAmount?: number; // Optional pre-fill
}

export default function SettleModal({
  isOpen,
  onClose,
  friends,
  groups,
  activeGroupId,
  onAddSettlement,
  initialFromId = '',
  initialToId = '',
  initialAmount = 0,
}: SettleModalProps) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [groupId, setGroupId] = useState<string | 'none'>(activeGroupId || 'none');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // Sincronizar parâmetros herdados quando o modal é aberto ou alterado
  useEffect(() => {
    if (isOpen) {
      setFromId(initialFromId);
      setToId(initialToId);
      setAmountStr(initialAmount > 0 ? initialAmount.toFixed(2) : '');
      setGroupId(activeGroupId || 'none');
    }
  }, [isOpen, initialFromId, initialToId, initialAmount, activeGroupId]);

  // Escolha dinâmica do escopo de balanços para sugerir valores a pagar
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    // Calcula balanços com base na seleção de grupo para ajudar a guiar o acerto
    const gId = groupId === 'none' ? undefined : groupId;
    const currentBalances = calculateBalances(
      [], // Usando dados locais calculados no App
      friends.map(f => f.id),
      gId
    );
    setBalances(currentBalances);
  }, [groupId, friends]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fromId) {
      setError('Selecione quem está pagando.');
      return;
    }
    if (!toId) {
      setError('Selecione quem está recebendo.');
      return;
    }
    if (fromId === toId) {
      setError('Quem paga deve ser diferente do recebedor.');
      return;
    }

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setError('Insira um valor de acerto maior que zero.');
      return;
    }

    const fromFriend = friends.find(f => f.id === fromId);
    const toFriend = friends.find(f => f.id === toId);

    if (!fromFriend || !toFriend) return;

    onAddSettlement({
      description: `Pagamento / Acerto (${fromFriend.name} para ${toFriend.name})`,
      amount: amt,
      date,
      categoryId: 'other', // Outros
      groupId: groupId === 'none' ? null : groupId,
      paidById: fromId, // Pagador da liquidação
      splitType: 'exact',
      splits: { [toId]: amt }, // Destinatário recebe o valor total
      isSettlement: true,
    });

    onClose();
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
            className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white p-6 shadow-xl z-20 flex flex-col border border-nat-border/50"
            id="settle-modal-container"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-nat-border/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-nat-sidebar text-nat-primary rounded-2xl">
                  <Landmark size={20} id="settle-modal-icon-header" />
                </div>
                <h3 className="text-lg font-bold text-nat-text font-serif italic" id="settle-modal-title">
                  Registrar Pagamento (Acerto)
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-nat-muted hover:bg-nat-sidebar transition-colors cursor-pointer"
                id="settle-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <p className="mt-4 p-2.5 bg-nat-red/10 text-nat-red border border-nat-red/20 rounded-2xl text-sm font-medium flex-shrink-0" id="settle-error-msg">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4" id="settle-form">
              {/* Context Selector */}
              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="settle-group-select">
                  Grupo do Acerto
                </label>
                <select
                  id="settle-group-select"
                  value={groupId === null ? 'none' : groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm bg-white outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans cursor-pointer h-10"
                >
                  <option value="none">Equilíbrio Geral (Fora de Grupos)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Paying and receiving flows */}
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="settle-payer-select">
                    Quem pagou (Devedor)
                  </label>
                  <select
                    id="settle-payer-select"
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm bg-white outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans cursor-pointer h-10"
                    required
                  >
                    <option value="">Selecione...</option>
                    {friends.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="settle-receiver-select">
                    Quem recebeu (Creditor)
                  </label>
                  <select
                    id="settle-receiver-select"
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm bg-white outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans cursor-pointer h-10"
                    required
                  >
                    <option value="">Selecione...</option>
                    {friends.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount of settlement */}
              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="settle-amount-input">
                  Quantia Enviada (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="settle-amount-input"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="settle-date-input">
                  Data de envio
                </label>
                <input
                  type="date"
                  id="settle-date-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans cursor-pointer h-10"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-nat-border/30 flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2.5 text-sm font-bold text-nat-muted hover:bg-nat-sidebar transition-all cursor-pointer"
                  id="settle-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-nat-primary hover:bg-nat-primary-hover text-white px-5 py-2.5 text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  id="settle-submit-btn"
                >
                  <Check size={16} />
                  Confirmar Acerto
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
