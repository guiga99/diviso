import React, { useState } from 'react';
import { Friend } from '../types';
import { AVATAR_COLORS } from '../utils';
import { X, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (friend: Omit<Friend, 'id'>) => void;
}

export default function AddFriendModal({ isOpen, onClose, onAdd }: AddFriendModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome é obrigatório');
      return;
    }
    
    // Choose a random color for the avatar
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    onAdd({
      name: name.trim(),
      email: email.trim() || undefined,
      avatarColor: randomColor,
    });
    
    // Reset and close
    setName('');
    setEmail('');
    setError('');
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
            className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white p-6 shadow-xl z-10 border border-nat-border/50"
            id="add-friend-modal-container"
          >
            <div className="flex items-center justify-between pb-4 border-b border-nat-border/30">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-nat-sidebar text-nat-primary rounded-2xl">
                  <UserPlus size={20} id="add-friend-modal-icon-header" />
                </div>
                <h3 className="text-lg font-bold text-nat-text font-serif italic" id="add-friend-modal-title">
                  Adicionar Novo Amigo
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-nat-muted hover:bg-nat-sidebar transition-colors cursor-pointer"
                id="add-friend-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4" id="add-friend-form">
              {error && (
                <p className="text-sm font-medium text-nat-red" id="add-friend-error-msg">
                  {error}
                </p>
              )}

              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="friend-name-input">
                  Nome Completo ou Apelido *
                </label>
                <input
                  type="text"
                  id="friend-name-input"
                  placeholder="Ex: Pedro Alvares"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="friend-email-input">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  id="friend-email-input"
                  placeholder="Ex: pedro@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-nat-border/30">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2.5 text-sm font-bold text-nat-muted hover:bg-nat-sidebar transition-all cursor-pointer"
                  id="add-friend-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-nat-primary hover:bg-nat-primary-hover text-white px-5 py-2.5 text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  id="add-friend-submit-btn"
                >
                  <UserPlus size={16} />
                  Adicionar Amigo
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
