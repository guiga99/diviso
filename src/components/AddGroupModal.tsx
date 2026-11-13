import React, { useState, useEffect } from 'react';
import { Friend, Group } from '../types';
import { X, Users, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddGroupModalProps {
  isOpen: boolean;
  initialGroup?: Group | null;
  onClose: () => void;
  friends: Friend[];
  onAddGroup: (group: Omit<Group, 'id' | 'createdAt'>) => void | boolean;
}

export default function AddGroupModal({ isOpen, onClose, friends, onAddGroup, initialGroup }: AddGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(initialGroup?.name || '');
    setDescription(initialGroup?.description || '');
    setSelectedFriendIds(initialGroup?.memberIds || []);
    setSearchTerm('');
    setError('');
  }, [isOpen, initialGroup]);

  const handleToggleFriend = (id: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do grupo é obrigatório');
      return;
    }
    if (selectedFriendIds.length === 0) {
      setError('Selecione pelo menos 1 participante para o grupo');
      return;
    }

    const saved = onAddGroup({
      name: name.trim(),
      description: description.trim() || undefined,
      memberIds: selectedFriendIds,
    });

    if (saved === false) return;

    // Reset values
    setName('');
    setDescription('');
    setSelectedFriendIds([]);
    setSearchTerm('');
    setError('');
    onClose();
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (friend.email && friend.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            id="add-group-modal-container"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-nat-border/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-nat-sidebar text-nat-primary rounded-2xl">
                  <Users size={20} id="add-group-modal-icon-header" />
                </div>
                <h3 className="text-lg font-bold text-nat-text font-serif italic" id="add-group-modal-title">
                  {initialGroup ? 'Editar Grupo' : 'Criar Novo Grupo de Rateio'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-nat-muted hover:bg-nat-sidebar transition-colors cursor-pointer"
                id="add-group-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <p className="mt-4 p-2.5 bg-nat-red/10 text-nat-red border border-nat-red/20 rounded-2xl text-sm font-medium flex-shrink-0" id="add-group-error-msg">
                {error}
              </p>
            )}

            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4" id="add-group-form">
              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="group-name-input">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  id="group-name-input"
                  placeholder="Ex: Viagem de Férias, Despesas da Casa..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error && name.trim()) setError('');
                  }}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-nat-text mb-1.5 uppercase tracking-wider" htmlFor="group-desc-input">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  id="group-desc-input"
                  placeholder="Do que se trata este grupo de rateio?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 px-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all font-sans"
                />
              </div>

              {/* Members Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-nat-text uppercase tracking-wider">
                    Selecionar Participantes ({selectedFriendIds.length} selecionados) *
                  </label>
                </div>

                {/* Friend Search */}
                <div className="relative mb-3 flex-shrink-0">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nat-muted" />
                  <input
                    type="text"
                    placeholder="Buscar amigo pelo nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-full border border-nat-border/55 bg-nat-bg/10 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-nat-primary focus:ring-4 focus:ring-nat-primary/10 transition-all"
                  />
                </div>

                {/* Friends List Container */}
                <div className="border border-nat-border/40 rounded-[24px] max-h-48 overflow-y-auto p-1.5 divide-y divide-nat-border/30 bg-nat-sidebar/40">
                  {filteredFriends.length === 0 ? (
                    <p className="text-sm text-nat-muted py-6 text-center">Nenhum amigo encontrado.</p>
                  ) : (
                    filteredFriends.map(friend => {
                      const isSelected = selectedFriendIds.includes(friend.id);
                      return (
                        <div
                          key={friend.id}
                          onClick={() => handleToggleFriend(friend.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-nat-sidebar font-semibold' 
                              : 'hover:bg-white'
                          }`}
                          id={`group-member-select-${friend.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${friend.avatarColor}`}>
                              {friend.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm text-nat-text">{friend.name}</p>
                              {friend.email && <p className="text-xs text-nat-muted">{friend.email}</p>}
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-nat-primary border-nat-primary text-white' 
                              : 'border-nat-border'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-nat-border/30 flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2.5 text-sm font-bold text-nat-muted hover:bg-nat-sidebar transition-all cursor-pointer"
                  id="add-group-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-nat-primary hover:bg-nat-primary-hover text-white px-5 py-2.5 text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  id="add-group-submit-btn"
                >
                  <Users size={16} />
                  {initialGroup ? 'Salvar Grupo' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
