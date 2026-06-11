import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Friend, Group, Expense, Debt } from './types';
import {
  calculateBalances,
  simplifyDebts,
  INITIAL_FRIENDS,
  INITIAL_GROUPS,
  INITIAL_EXPENSES,
  CATEGORIES
} from './utils';
import AddFriendModal from './components/AddFriendModal';
import AddGroupModal from './components/AddGroupModal';
import AddExpenseModal from './components/AddExpenseModal';
import SettleModal from './components/SettleModal';

// Icons
import {
  Plus,
  Users,
  User,
  Receipt,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  ChevronRight,
  Info,
  Landmark,
  Check,
  CheckCircle,
  PiggyBank,
  AlertCircle,
  XSquare,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';

export default function App() {
  // --- Persistent States ---
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // --- Profile Simulation ---
  const [activeUserId, setActiveUserId] = useState<string>(''); // Who "you" are in the dashboard

  // --- Active Route/View Configuration ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'groups' | 'friends' | 'history' | 'settings'>('dashboard');

  // Selected Detail views
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // --- Modals State ---
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  // --- Prefilled Settlement flow parameters ---
  const [settlePayerId, setSettlePayerId] = useState('');
  const [settleReceiverId, setSettleReceiverId] = useState('');
  const [settleAmount, setSettleAmount] = useState(0);

  // --- Search/Filter States (General Logs) ---
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState('all');
  const [historyGroup, setHistoryGroup] = useState('all');
  const [historyPaidBy, setHistoryPaidBy] = useState('all');

  // File Upload Reference for JSON Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success message toast notifier
  const [toastMessage, setToastMessage] = useState('');

  // Auto-hide toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // --- Load and Initialize State ---
  useEffect(() => {
    const storedFriends = localStorage.getItem('splitter_friends');
    const storedGroups = localStorage.getItem('splitter_groups');
    const storedExpenses = localStorage.getItem('splitter_expenses');
    const storedActiveUser = localStorage.getItem('splitter_active_user');

    if (storedFriends && storedGroups && storedExpenses) {
      const f = JSON.parse(storedFriends);
      const g = JSON.parse(storedGroups);
      const e = JSON.parse(storedExpenses);
      setFriends(f);
      setGroups(g);
      setExpenses(e);

      if (storedActiveUser) {
        setActiveUserId(storedActiveUser);
      } else if (f.length > 0) {
        setActiveUserId(f[0].id);
      }
    } else {
      // Preload mockup data
      setFriends(INITIAL_FRIENDS);
      setGroups(INITIAL_GROUPS);
      setExpenses(INITIAL_EXPENSES);
      setActiveUserId(INITIAL_FRIENDS[0].id);
      saveToDisk(INITIAL_FRIENDS, INITIAL_GROUPS, INITIAL_EXPENSES, INITIAL_FRIENDS[0].id);
    }
  }, []);

  const saveToDisk = (f: Friend[], g: Group[], e: Expense[], uId: string) => {
    localStorage.setItem('splitter_friends', JSON.stringify(f));
    localStorage.setItem('splitter_groups', JSON.stringify(g));
    localStorage.setItem('splitter_expenses', JSON.stringify(e));
    localStorage.setItem('splitter_active_user', uId);
  };

  // --- Mutative Business logic actions ---
  const handleAddFriend = (newFriendData: Omit<Friend, 'id'>) => {
    const newFriend: Friend = {
      ...newFriendData,
      id: 'f_' + Date.now(),
    };
    const updated = [...friends, newFriend];
    setFriends(updated);
    saveToDisk(updated, groups, expenses, activeUserId);
    showNotice(`Amigo "${newFriend.name}" adicionado com sucesso!`);
  };

  const handleAddGroup = (newGroupData: Omit<Group, 'id' | 'createdAt'>) => {
    const newGroup: Group = {
      ...newGroupData,
      id: 'g_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...groups, newGroup];
    setGroups(updated);
    saveToDisk(friends, updated, expenses, activeUserId);
    showNotice(`Grupo "${newGroup.name}" criado com sucesso!`);
    setSelectedGroupId(newGroup.id);
    setActiveTab('groups');
  };

  const handleAddExpense = (newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...newExpenseData,
      id: 'e_' + Date.now(),
    };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveToDisk(friends, groups, updated, activeUserId);
    showNotice(`Despesa "${newExpense.description}" adicionada!`);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveToDisk(friends, groups, updated, activeUserId);
    showNotice('Despesa apagada com sucesso.');
  };

  const handleResetDemoData = () => {
    setFriends(INITIAL_FRIENDS);
    setGroups(INITIAL_GROUPS);
    setExpenses(INITIAL_EXPENSES);
    setActiveUserId(INITIAL_FRIENDS[0].id);
    saveToDisk(INITIAL_FRIENDS, INITIAL_GROUPS, INITIAL_EXPENSES, INITIAL_FRIENDS[0].id);
    showNotice('Dados originais de demonstração restaurados!');
  };

  const handleWipeAll = () => {
    if (confirm('Tem certeza de que deseja apagar TODOS os seus lançamentos, grupos e amigos?')) {
      setFriends([]);
      setGroups([]);
      setExpenses([]);
      setActiveUserId('');
      localStorage.clear();
      showNotice('Todos os dados foram excluídos com sucesso.');
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ friends, groups, expenses }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_splitwise_pessoal_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Backup exportado com sucesso!');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.friends && parsed.groups && parsed.expenses) {
          setFriends(parsed.friends);
          setGroups(parsed.groups);
          setExpenses(parsed.expenses);
          const defaultUser = parsed.friends[0]?.id || '';
          setActiveUserId(defaultUser);
          saveToDisk(parsed.friends, parsed.groups, parsed.expenses, defaultUser);
          showNotice('Backup importado e restaurado com sucesso!');
        } else {
          alert('Formato de arquivo inválido. Certifique-se de que é um arquivo JSON exportado por este aplicativo.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showNotice = (msg: string) => {
    setToastMessage(msg);
  };

  const handleSwitchUser = (userId: string) => {
    setActiveUserId(userId);
    localStorage.setItem('splitter_active_user', userId);
    showNotice(`Visualizando como: ${friends.find(f => f.id === userId)?.name}`);
  };

  // --- Aggregate Computations ---
  const activeUser = friends.find(f => f.id === activeUserId);
  const friendIds = friends.map(f => f.id);

  // General outstanding balances for all friends across the system
  const globalBalances = calculateBalances(expenses, friendIds);
  const activeUserBalance = globalBalances[activeUserId] || 0;

  // Splitwise minimum transactions required to balance the ecosystem
  const globalDebtsSimplified = simplifyDebts(expenses, friends);

  // Filter bills in custom context
  const getExpensesSharedWithFriend = (otherId: string) => {
    return expenses.filter(e => {
      // Direct settlement or shared transaction
      const isPayer = e.paidById === activeUserId || e.paidById === otherId;
      const operatesFriend = e.splits[activeUserId] > 0 || e.splits[otherId] > 0;
      return isPayer && operatesFriend;
    });
  };

  // Pre-fill settlement and open dialog
  const promptDirectSettlement = (fromId: string, toId: string, amount: number) => {
    setSettlePayerId(fromId);
    setSettleReceiverId(toId);
    setSettleAmount(amount);
    setIsSettleModalOpen(true);
  };

  const renderCategoryIcon = (iconName: string, className = '') => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent size={16} className={className} />;
  };

  return (
    <div className="min-h-screen bg-nat-bg text-nat-text flex flex-col font-sans selection:bg-nat-green-light selection:text-white" id="app-root-layout">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-nat-primary border border-nat-border text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-sans"
            id="toast-notifications-banner"
          >
            <CheckCircle size={18} className="text-nat-green-light" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Top Navbar --- */}
      <header className="sticky top-0 z-40 bg-nat-sidebar border-b border-nat-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-none" id="app-top-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-nat-primary flex items-center justify-center text-white font-black shadow-sm">
            <PiggyBank size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold italic tracking-tight text-nat-text" id="app-title-logo-header">
              Diviso
            </h1>
            <p className="text-xs text-nat-muted font-medium">Controle de rateio e simplificação de acertos</p>
          </div>
        </div>

        {/* User context simulating tool */}
        <div className="flex items-center gap-3.5 bg-white/50 p-2 pl-3 rounded-2xl border border-nat-border/50" id="payer-context-container">
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wider font-bold text-nat-muted">Ambiente de Teste</span>
            <span className="block text-xs font-semibold text-nat-text">Simular como:</span>
          </div>

          <select
            value={activeUserId}
            onChange={(e) => handleSwitchUser(e.target.value)}
            className="rounded-xl border border-nat-border bg-white px-3 py-1.5 text-xs font-bold text-nat-primary focus:border-nat-primary outline-none cursor-pointer shadow-sm"
            id="active-user-simulator-select"
          >
            {friends.length === 0 && <option value="">(Nenhum Usuário)</option>}
            {friends.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} {f.id === activeUserId ? '(Você)' : ''}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* --- Main Contents Container --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6" id="app-main-grid">
        
        {/* --- Navigation Panel (Left Column) --- */}
        <section className="lg:col-span-1 space-y-4" id="app-left-navigation-panel">
          
          {/* Main Action Buttons */}
          <div className="bg-white p-4 rounded-3xl border border-nat-border/70 shadow-xs space-y-2.5">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="w-full bg-nat-primary hover:bg-nat-primary-hover text-white font-bold py-3 px-4 rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              id="action-btn-add-expense"
              disabled={friends.length === 0}
            >
              <Plus size={18} />
              Adicionar Despesa
            </button>
            
            <button
              onClick={() => {
                setSettlePayerId('');
                setSettleReceiverId('');
                setSettleAmount(0);
                setIsSettleModalOpen(true);
              }}
              className="w-full bg-white hover:bg-nat-sidebar text-nat-primary border border-nat-primary/85 font-bold py-2.5 px-4 rounded-full transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              id="action-btn-settle-debt"
              disabled={friends.length < 2}
            >
              <Check size={16} />
              Quitar / Registrar Acerto
            </button>
          </div>

          {/* Navigation Items menu */}
          <div className="bg-white rounded-3xl border border-nat-border/70 shadow-xs overflow-hidden p-2">
            <nav className="space-y-1" id="vertical-sidebar-nav">
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedGroupId(null); setSelectedFriendId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard' 
                    ? 'bg-nat-primary text-white shadow-xs' 
                    : 'text-nat-text hover:bg-nat-sidebar'
                }`}
                id="tab-nav-dashboard"
              >
                <div className={`p-1 rounded-full ${activeTab === 'dashboard' ? 'bg-white/15 text-white' : 'bg-nat-sidebar text-nat-muted'}`}>
                  <Icons.LayoutDashboard size={16} />
                </div>
                <span>Painel Principal</span>
              </button>

              <button
                onClick={() => { setActiveTab('groups'); setSelectedGroupId(null); setSelectedFriendId(null); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'groups' && selectedGroupId === null
                    ? 'bg-nat-primary text-white shadow-xs' 
                    : 'text-nat-text hover:bg-nat-sidebar'
                }`}
                id="tab-nav-groups"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${activeTab === 'groups' && selectedGroupId === null ? 'bg-white/15 text-white' : 'bg-nat-sidebar text-nat-muted'}`}>
                    <Users size={16} />
                  </div>
                  <span>Meus Grupos</span>
                </div>
                <span className={`text-xs py-0.5 px-2 rounded-full font-bold ${
                  activeTab === 'groups' && selectedGroupId === null ? 'bg-white/20 text-white' : 'bg-nat-sidebar text-nat-muted'
                }`}>
                  {groups.length}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('friends'); setSelectedGroupId(null); setSelectedFriendId(null); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'friends' && selectedFriendId === null
                    ? 'bg-nat-primary text-white shadow-xs' 
                    : 'text-nat-text hover:bg-nat-sidebar'
                }`}
                id="tab-nav-friends"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${activeTab === 'friends' && selectedFriendId === null ? 'bg-white/15 text-white' : 'bg-nat-sidebar text-nat-muted'}`}>
                    <User size={16} />
                  </div>
                  <span>Amigos</span>
                </div>
                <span className={`text-xs py-0.5 px-2 rounded-full font-bold ${
                  activeTab === 'friends' && selectedFriendId === null ? 'bg-white/20 text-white' : 'bg-nat-sidebar text-nat-muted'
                }`}>
                  {friends.length}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('history'); setSelectedGroupId(null); setSelectedFriendId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'history' 
                    ? 'bg-nat-primary text-white shadow-xs' 
                    : 'text-nat-text hover:bg-nat-sidebar'
                }`}
                id="tab-nav-history"
              >
                <div className={`p-1 rounded-full ${activeTab === 'history' ? 'bg-white/15 text-white' : 'bg-nat-sidebar text-nat-muted'}`}>
                  <Calendar size={16} />
                </div>
                <span>Extrato & Histórico</span>
              </button>

              <button
                onClick={() => { setActiveTab('settings'); setSelectedGroupId(null); setSelectedFriendId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'bg-nat-primary text-white shadow-xs' 
                    : 'text-nat-text hover:bg-nat-sidebar'
                }`}
                id="tab-nav-settings"
              >
                <div className={`p-1 rounded-full ${activeTab === 'settings' ? 'bg-white/15 text-white' : 'bg-nat-sidebar text-nat-muted'}`}>
                  <SlidersHorizontal size={16} />
                </div>
                <span>Configurar Backup</span>
              </button>
            </nav>
          </div>

          {/* Quick List - Shortcut to Active Groups */}
          {groups.length > 0 && (
            <div className="bg-white rounded-3xl border border-nat-border/70 p-4 shadow-xs hidden md:block">
              <h4 className="text-xs font-bold text-nat-muted uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <Users size={12} /> Grupos Ativos
              </h4>
              <ul className="space-y-1 text-xs">
                {groups.map(g => (
                  <li key={g.id}>
                    <button
                      onClick={() => {
                        setSelectedGroupId(g.id);
                        setActiveTab('groups');
                      }}
                      className={`w-full text-left p-2 px-3 rounded-full font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        activeTab === 'groups' && selectedGroupId === g.id
                          ? 'bg-nat-sidebar text-nat-primary'
                          : 'text-nat-text hover:bg-nat-sidebar'
                      }`}
                    >
                      <span className="truncate">{g.name}</span>
                      <ChevronRight size={12} className="opacity-60" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* --- Primary Dashboard Window (Right Column) --- */}
        <section className="lg:col-span-3 min-h-[500px]" id="app-primary-dashboard-window">
          
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              id="dashboard-tab-view"
            >
              {/* Profile welcome header card */}
              <div className="bg-white rounded-[32px] border border-nat-border/70 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${activeUser?.avatarColor || 'bg-nat-primary'} flex items-center justify-center text-white text-lg font-black`}>
                    {activeUser?.name?.charAt(0).toUpperCase() || 'P'}
                  </div>
                  <div>
                    <h2 className="text-3xl font-serif font-bold italic tracking-tight text-nat-text leading-tight">
                      Olá, {activeUser?.name || 'Visitante'}
                    </h2>
                    <p className="text-xs text-nat-muted mt-1">Este é o balanço consolidado de todas as suas divisões.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsFriendModalOpen(true)}
                    className="border border-nat-border bg-white hover:bg-nat-sidebar text-nat-text text-xs font-bold py-2 px-3.5 rounded-full transition-all cursor-pointer"
                    id="welcome-add-friend-btn"
                  >
                    + Novo Amigo
                  </button>
                  <button
                    onClick={() => setIsGroupModalOpen(true)}
                    className="border border-nat-border bg-white hover:bg-nat-sidebar text-nat-text text-xs font-bold py-2 px-3.5 rounded-full transition-all cursor-pointer"
                    id="welcome-add-group-btn"
                  >
                    + Novo Grupo
                  </button>
                </div>
              </div>

              {/* Balances Highlight grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="balances-cards-row">
                <div className="bg-white rounded-[32px] border border-nat-border/60 p-5 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-nat-bg text-nat-green rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-nat-muted">Te devem no total</span>
                    <span className="block text-2xl font-serif font-bold text-nat-green leading-tight">
                      R$ {Object.values(globalBalances).reduce((acc, b) => b > 0 ? acc + b : acc, 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border border-nat-border/60 p-5 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-nat-bg text-nat-red rounded-2xl">
                    <TrendingDown size={24} />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-nat-muted">Você deve no total</span>
                    <span className="block text-2xl font-serif font-bold text-nat-red leading-tight">
                      R$ {Math.abs(Object.values(globalBalances).reduce((acc, b) => b < 0 ? acc + b : acc, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-nat-primary rounded-[32px] p-5 shadow-md flex items-center gap-4 text-white">
                  <div className="p-3 bg-white/10 text-white rounded-2xl">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-white/80">Saldo Geral Líquido</span>
                    <span className="block text-2xl font-serif font-black leading-tight">
                      {activeUserBalance >= 0 ? '+' : ''} R$ {activeUserBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Debt simplifications list */}
              <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-nat-border/40">
                  <div>
                    <h3 className="text-md font-bold text-nat-text flex items-center gap-1.5 font-serif italic">
                      <Sparkles size={18} className="text-nat-primary" />
                      Acertos Recomendados (Dívidas Simplificadas)
                    </h3>
                    <p className="text-xs text-nat-muted">Menor número de transações para quitar saldos do grupo</p>
                  </div>
                  
                  {globalDebtsSimplified.length > 0 && (
                    <span className="text-[10px] bg-nat-sidebar text-nat-primary py-1 px-3 rounded-full font-bold uppercase tracking-widest">
                      {globalDebtsSimplified.length} Transações
                    </span>
                  )}
                </div>

                {globalDebtsSimplified.length === 0 ? (
                  <div className="py-8 text-center text-nat-muted flex flex-col items-center gap-2">
                    <CheckCircle size={32} className="text-nat-green/60" />
                    <div>
                      <p className="text-sm font-semibold">Tudo zerado! Ninguém deve a ninguém.</p>
                      <p className="text-xs text-nat-muted mt-0.5">Adicione despesas para começar a calcular.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {globalDebtsSimplified.map((debt, index) => {
                      const fromFriend = friends.find(f => f.id === debt.fromId);
                      const toFriend = friends.find(f => f.id === debt.toId);
                      
                      if (!fromFriend || !toFriend) return null;

                      const isInvolved = debt.fromId === activeUserId || debt.toId === activeUserId;

                      return (
                        <div
                          key={index}
                          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl border transition-all ${
                            isInvolved 
                              ? 'bg-nat-sidebar/45 border-nat-border' 
                              : 'bg-white/40 border-nat-border/50'
                          }`}
                          id={`simplified-debt-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-sm font-bold text-nat-text">{fromFriend.name}</span>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-nat-muted">Deve pagar</span>
                            </div>
                            
                            <ArrowRight size={14} className="text-nat-muted" />
                            
                            <span className="text-sm font-bold text-nat-primary">{toFriend.name}</span>
                          </div>

                          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 mt-3 sm:mt-0 pt-2.5 sm:pt-0 border-t sm:border-0 border-dashed border-nat-border">
                            <span className="text-sm font-black text-nat-text font-mono">
                              R$ {debt.amount.toFixed(2)}
                            </span>

                            {/* Easy pay flow */}
                            <button
                              onClick={() => promptDirectSettlement(debt.fromId, debt.toId, debt.amount)}
                              className={`text-[11px] font-bold py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${
                                isInvolved
                                  ? 'bg-nat-primary hover:bg-nat-primary-hover text-white shadow-xs'
                                  : 'bg-white hover:bg-nat-sidebar text-nat-text border border-nat-border'
                              }`}
                              id={`pay-via-pixels-${index}`}
                            >
                              Registrar Acerto Pix
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Friends Balances Grid list */}
              <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-md font-bold text-nat-text font-serif italic">Balanço Individual por Amigo</h3>
                    <p className="text-xs text-nat-muted">Seu saldo com cada amigo no sistema</p>
                  </div>
                  <button
                    onClick={() => setIsFriendModalOpen(true)}
                    className="text-xs font-bold text-nat-primary hover:text-nat-primary-hover hover:underline cursor-pointer"
                    id="add-friend-link-sec"
                  >
                    + Novo Amigo
                  </button>
                </div>

                {friends.length === 0 ? (
                  <p className="text-sm text-nat-muted py-6 text-center">Nenhum amigo adicionado ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="friends-balances-grid">
                    {friends.map(friend => {
                      const balance = globalBalances[friend.id] || 0;
                      return (
                        <div
                          key={friend.id}
                          onClick={() => {
                            setSelectedFriendId(friend.id);
                            setActiveTab('friends');
                          }}
                          className="p-3.5 border border-nat-border/55 hover:border-nat-border rounded-2xl bg-nat-bg/15 hover:bg-nat-sidebar/25 transition-all cursor-pointer flex items-center justify-between gap-2"
                          id={`friend-balance-card-${friend.id}`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className={`w-9 h-9 rounded-full ${friend.avatarColor} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                              {friend.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <span className="block text-xs font-bold text-nat-text truncate">{friend.name}</span>
                              <span className="block text-[10px] text-nat-muted truncate">{friend.email || 'Sem e-mail'}</span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            {balance > 0 ? (
                              <div>
                                <span className="block text-[9px] uppercase font-bold text-nat-green tracking-wider">Credor</span>
                                <span className="block text-xs font-bold text-nat-green">
                                  + R$ {balance.toFixed(2)}
                                </span>
                              </div>
                            ) : balance < 0 ? (
                              <div>
                                <span className="block text-[9px] uppercase font-bold text-nat-red tracking-wider">Devedor</span>
                                <span className="block text-xs font-bold text-nat-red">
                                  R$ {balance.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-nat-muted">Tudo zerado</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: MEUS GRUPOS */}
          {activeTab === 'groups' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              id="groups-tab-view"
            >
              {selectedGroupId === null ? (
                // --- Group Listing Selection ---
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-serif font-bold italic tracking-tight text-nat-text">Meus Grupos de Divisão</h2>
                      <p className="text-xs text-nat-muted">Selecione ou crie um grupo para ver balanço de rateios</p>
                    </div>
                    <button
                      onClick={() => setIsGroupModalOpen(true)}
                      className="bg-nat-primary hover:bg-nat-primary-hover text-white font-bold text-xs py-2.5 px-4.5 rounded-full shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      id="groups-create-group-btn"
                    >
                      <Plus size={14} /> Novo Grupo
                    </button>
                  </div>

                  {groups.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-nat-border/60 p-12 text-center shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-nat-sidebar text-nat-primary flex items-center justify-center mx-auto mb-4">
                        <Users size={22} />
                      </div>
                      <h3 className="text-sm font-bold text-nat-text mb-1">Nenhum Grupo Ativo</h3>
                      <p className="text-xs text-nat-muted mb-4 max-w-sm mx-auto">
                        Grupos ajudam a juntar pessoas específicas (viagens, república, jantar) para facilitar as contas.
                      </p>
                      <button
                        onClick={() => setIsGroupModalOpen(true)}
                        className="bg-nat-primary hover:bg-nat-primary-hover text-white text-xs font-bold py-2 px-4 rounded-full cursor-pointer"
                        id="groups-create-group-btn-sec"
                      >
                        Criar meu primeiro grupo
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="groups-list-grid">
                      {groups.map(group => {
                        const members = friends.filter(friend => group.memberIds.includes(friend.id));
                        const groupExpenses = expenses.filter(e => e.groupId === group.id);
                        const groupTotalSpent = groupExpenses.reduce((acc, e) => e.isSettlement ? acc : acc + e.amount, 0);

                        return (
                          <div
                            key={group.id}
                            onClick={() => setSelectedGroupId(group.id)}
                            className="bg-white border border-nat-border/65 hover:border-nat-border rounded-[32px] p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-44"
                            id={`group-row-${group.id}`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-nat-text hover:text-nat-primary truncate">
                                  {group.name}
                                </h3>
                                <span className="text-[10px] text-nat-muted font-medium bg-nat-sidebar px-2 py-0.5 rounded-full font-sans">
                                  {new Date(group.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-nat-muted line-clamp-2 min-h-[2rem]">
                                {group.description || 'Sem descrição.'}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-t border-nat-border/30 pt-3.5 mt-3.5 animate-pulse-subtle">
                              <div>
                                <span className="block text-[9px] uppercase tracking-wider font-bold text-nat-muted">Total Gasto</span>
                                <span className="block text-xs font-bold text-nat-text font-mono">
                                  R$ {groupTotalSpent.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="block text-[9px] uppercase tracking-wider font-bold text-nat-muted">Membros</span>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  {members.slice(0, 3).map(m => (
                                    <div
                                      key={m.id}
                                      title={m.name}
                                      className={`w-5 h-5 rounded-full text-[8px] font-black text-white flex items-center justify-center ${m.avatarColor}`}
                                    >
                                      {m.name.charAt(0).toUpperCase()}
                                    </div>
                                  ))}
                                  {members.length > 3 && (
                                    <span className="text-[8px] font-extrabold text-nat-muted bg-nat-sidebar w-5 h-5 rounded-full flex items-center justify-center">
                                      +{members.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // --- Group Details Page View ---
                (() => {
                  const group = groups.find(g => g.id === selectedGroupId);
                  if (!group) return null;

                  const groupMembers = friends.filter(friend => group.memberIds.includes(friend.id));
                  const groupExpenses = expenses.filter(e => e.groupId === group.id);
                  const groupTotalSpent = groupExpenses.reduce((acc, e) => e.isSettlement ? acc : acc + e.amount, 0);

                  // Calculate group balances
                  const groupBalances = calculateBalances(expenses, group.memberIds, group.id);
                  const activeUserGroupBalance = groupBalances[activeUserId] || 0;

                  // Simplify group debts
                  const groupDebtsSimplified = simplifyDebts(expenses, groupMembers, group.id);

                  return (
                    <div className="space-y-6" id="group-details-container">
                      {/* Detailed Header Card */}
                      <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs relative">
                        <button
                          onClick={() => setSelectedGroupId(null)}
                          className="absolute right-6 top-6 text-xs font-bold text-nat-muted hover:text-nat-primary cursor-pointer"
                          id="group-back-btn"
                        >
                          &larr; Voltar para Lista
                        </button>

                        <div className="max-w-xl">
                          <span className="text-[10px] bg-nat-sidebar text-nat-primary py-1 px-3 rounded-full font-bold uppercase tracking-widest">
                            Grupo de Divisão
                          </span>
                          <h2 className="text-2xl font-serif font-bold italic tracking-tight text-nat-text mt-2.5 mb-1">{group.name}</h2>
                          <p className="text-sm text-nat-muted leading-relaxed">{group.description || 'Sem descrição.'}</p>
                        </div>

                        {/* Top quick metrics for the group */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t border-nat-border/40">
                          <div>
                            <span className="block text-[10px] uppercase font-bold tracking-wider text-nat-muted">Total Gasto do Grupo</span>
                            <span className="block text-lg font-bold text-nat-text font-mono">
                              R$ {groupTotalSpent.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold tracking-wider text-nat-muted">Seu Saldo Neste Grupo</span>
                            <span className={`block text-lg font-bold font-serif italic ${
                              activeUserGroupBalance >= 0 ? 'text-nat-green' : 'text-nat-red'
                            }`}>
                              {activeUserGroupBalance >= 0 ? '+' : ''} R$ {activeUserGroupBalance.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-start md:justify-end gap-2.5">
                            <button
                              onClick={() => {
                                setIsExpenseModalOpen(true);
                              }}
                              className="bg-nat-primary hover:bg-nat-primary-hover text-white text-xs font-bold py-2.5 px-4.5 rounded-full shadow-sm transition-colors cursor-pointer"
                              id="group-detail-add-expense-btn"
                            >
                              + Despesa no Grupo
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Members list & specific group debt simplifications */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Member balances (Left) */}
                        <div className="md:col-span-1 bg-white rounded-[32px] border border-nat-border/60 p-5 shadow-xs space-y-4">
                          <h3 className="text-sm font-bold text-nat-text pb-2.5 border-b border-nat-border/30 font-serif italic">
                            Saldos do Grupo ({groupMembers.length})
                          </h3>
                          <ul className="space-y-3">
                            {groupMembers.map(member => {
                              const b = groupBalances[member.id] || 0;
                              return (
                                <li key={member.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 truncate">
                                    <div className={`w-6.5 h-6.5 rounded-full ${member.avatarColor} text-white flex items-center justify-center font-bold text-[10px]`}>
                                      {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-nat-text truncate">{member.name}</span>
                                  </div>

                                  <div className="text-right">
                                    {b > 0 ? (
                                      <span className="font-bold text-nat-green font-mono">
                                        +R$ {b.toFixed(2)}
                                      </span>
                                    ) : b < 0 ? (
                                      <span className="font-bold text-nat-red font-mono">
                                        R$ {b.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-nat-muted font-medium">Zerar</span>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {/* Debt Simplification logic (Right) */}
                        <div className="md:col-span-2 bg-white rounded-[32px] border border-nat-border/60 p-5 shadow-xs space-y-4">
                          <div>
                            <h3 className="text-sm font-bold text-nat-text pb-2.5 border-b border-nat-border/30 font-serif italic">
                              Acertos do Grupo ({groupDebtsSimplified.length})
                            </h3>
                          </div>

                          {groupDebtsSimplified.length === 0 ? (
                            <div className="py-6 text-center text-nat-muted">
                              <CheckCircle size={26} className="text-nat-green/60 mx-auto mb-2" />
                              <p className="text-xs font-semibold leading-none">Sem pendências neste grupo!</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {groupDebtsSimplified.map((debt, idx) => {
                                const from = friends.find(f => f.id === debt.fromId);
                                const to = friends.find(f => f.id === debt.toId);
                                if (!from || !to) return null;

                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-2.5 bg-nat-bg/15 border border-nat-border/50 rounded-2xl text-xs"
                                    id={`group-debt-card-${idx}`}
                                  >
                                    <div className="flex items-center gap-1 truncation">
                                      <span className="font-bold text-nat-text">{from.name}</span>
                                      <span className="text-[10px] text-nat-muted uppercase tracking-wider font-semibold mx-1">deve para</span>
                                      <span className="font-bold text-nat-primary">{to.name}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-nat-text font-mono">
                                        R$ {debt.amount.toFixed(2)}
                                      </span>
                                      <button
                                        onClick={() => promptDirectSettlement(debt.fromId, debt.toId, debt.amount)}
                                        className="bg-nat-primary hover:bg-nat-primary-hover text-white py-1.5 px-3.5 rounded-full text-[10px] font-bold cursor-pointer shadow-sm transition-colors"
                                        id={`group-debt-pay-btn-${idx}`}
                                      >
                                        Pagar Pix
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Group Expenses Logging List */}
                      <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-nat-border/30">
                          <div>
                            <h3 className="text-md font-bold text-nat-text font-serif italic">Histórico de Contas no Grupo</h3>
                            <p className="text-xs text-nat-muted">Fluxo cronológico de gastos e acertos registrados</p>
                          </div>
                        </div>

                        {groupExpenses.length === 0 ? (
                          <p className="text-sm text-nat-muted py-10 text-center animate-pulse-subtle">Nenhuma conta cadastrada nesta temporada.</p>
                        ) : (
                          <div className="divide-y divide-nat-border/40 overflow-hidden rounded-[32px] border border-nat-border/55">
                            {groupExpenses.map(expense => {
                              const payer = friends.find(f => f.id === expense.paidById);
                              const isPayerMe = expense.paidById === activeUserId;
                              const category = CATEGORIES.find(c => c.id === expense.categoryId);

                              return (
                                <div
                                  key={expense.id}
                                  className="p-4 bg-white hover:bg-nat-sidebar/10 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                                  id={`group-expense-list-row-${expense.id}`}
                                >
                                  {/* Left context */}
                                  <div className="flex items-start gap-3.5">
                                    <div className={`p-2.5 rounded-xl border border-nat-border/30 bg-nat-bg text-nat-primary flex-shrink-0 mt-0.5`}>
                                      {expense.isSettlement ? <Landmark size={18} /> : renderCategoryIcon(category?.icon || 'HelpCircle')}
                                    </div>

                                    <div>
                                      <p className="font-bold text-nat-text leading-tight">{expense.description}</p>
                                      
                                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-nat-muted mt-1">
                                        <span className="font-semibold bg-nat-sidebar text-nat-text px-2 py-0.5 rounded-full text-[10px]">
                                          {expense.isSettlement ? 'Acerto direto' : category?.name || 'Outros'}
                                        </span>
                                        <span>&bull;</span>
                                        <span>Pago por <strong className="font-semibold text-nat-text">{payer?.name || 'Inexistente'}</strong></span>
                                        <span>&bull;</span>
                                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right values */}
                                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-5 border-t sm:border-0 border-dashed border-nat-border pt-2.5 sm:pt-0">
                                    <div className="text-left sm:text-right">
                                      <span className="block text-[10px] text-nat-muted font-bold uppercase tracking-wider">Total da Nota</span>
                                      <span className="block text-sm font-bold text-nat-text font-mono">
                                        R$ {expense.amount.toFixed(2)}
                                      </span>
                                    </div>

                                    {/* Action items deletion */}
                                    <button
                                      onClick={() => handleDeleteExpense(expense.id)}
                                      className="p-1.5 text-nat-muted hover:text-nat-red hover:bg-nat-red/10 rounded-full transition-colors flex-shrink-0 cursor-pointer"
                                      title="Apagar despesa"
                                      id={`group-expense-delete-${expense.id}`}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </motion.div>
          )}

          {/* TAB 3: AMIGOS LEDGERS */}
          {activeTab === 'friends' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              id="friends-tab-view"
            >
              {selectedFriendId === null ? (
                // --- Friends list selector grid ---
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-serif font-bold italic tracking-tight text-nat-text">Meus Amigos no Rateio</h2>
                      <p className="text-xs text-nat-muted">Inspecione transações de contas compartilhadas com cada amigo</p>
                    </div>
                    <button
                      onClick={() => setIsFriendModalOpen(true)}
                      className="bg-nat-primary hover:bg-nat-primary-hover text-white font-bold text-xs py-2.5 px-4.5 rounded-full shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      id="friends-add-friend-btn"
                    >
                      <Plus size={14} /> Novo Amigo
                    </button>
                  </div>

                  {friends.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-nat-border/60 p-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-nat-sidebar text-nat-primary flex items-center justify-center mx-auto mb-4">
                        <User size={22} />
                      </div>
                      <h3 className="text-sm font-bold text-nat-text mb-1">Nenhum Amigo Cadastrado</h3>
                      <p className="text-xs text-nat-muted mb-4 max-w-sm mx-auto">
                        Adicione seus amigos e compartilhe despesas facilmente para reajustar saldos.
                      </p>
                      <button
                        onClick={() => setIsFriendModalOpen(true)}
                        className="bg-nat-primary hover:bg-nat-primary-hover text-white text-xs font-bold py-2.5 px-4.5 rounded-full cursor-pointer"
                        id="friends-add-friend-btn-sec"
                      >
                        Cadastrar primeiro amigo
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="friends-grid-listing">
                      {friends.map(friend => {
                        const balance = globalBalances[friend.id] || 0;
                        const sharedCount = getExpensesSharedWithFriend(friend.id).length;

                        return (
                          <div
                            key={friend.id}
                            onClick={() => setSelectedFriendId(friend.id)}
                            className="bg-white border border-nat-border/55 hover:border-nat-border rounded-[32px] p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                            id={`friend-row-${friend.id}`}
                          >
                            <div className="flex items-center gap-3.5 truncate">
                              <div className={`w-11 h-11 rounded-full ${friend.avatarColor} text-white flex items-center justify-center text-sm font-black`}>
                                {friend.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <h3 className="text-sm font-bold text-nat-text leading-snug">{friend.name}</h3>
                                <p className="text-xs text-nat-muted mt-0.5">{friend.email || 'Nenhum e-mail registrado'}</p>
                                <span className="inline-block text-[10px] text-nat-primary font-semibold bg-nat-sidebar px-2.5 py-0.5 rounded-full mt-1.5">
                                  {sharedCount} compartilhadas
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              {balance > 0 ? (
                                <div>
                                  <span className="block text-[9px] uppercase font-bold text-nat-green tracking-wider">Te deve</span>
                                  <span className="block text-sm font-bold text-nat-green">
                                    + R$ {balance.toFixed(2)}
                                  </span>
                                </div>
                              ) : balance < 0 ? (
                                <div>
                                  <span className="block text-[9px] uppercase font-bold text-nat-red tracking-wider">Você deve</span>
                                  <span className="block text-sm font-bold text-nat-red">
                                    R$ {balance.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-nat-muted">Tudo zerado</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // --- Detailed Ledger view with a specific friend ---
                (() => {
                  const friend = friends.find(f => f.id === selectedFriendId);
                  if (!friend) return null;

                  const balance = globalBalances[friend.id] || 0;
                  const sharedExpenses = getExpensesSharedWithFriend(friend.id);

                  return (
                    <div className="space-y-6" id="friend-detail-view-container">
                      {/* Friend Header Card */}
                      <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs relative">
                        <button
                          onClick={() => setSelectedFriendId(null)}
                          className="absolute right-6 top-6 text-xs font-bold text-nat-muted hover:text-nat-primary cursor-pointer"
                          id="friend-back-btn"
                        >
                          &larr; Voltar para Amigos
                        </button>

                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-full ${friend.avatarColor} text-white flex items-center justify-center text-lg font-black`}>
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[10px] bg-nat-sidebar text-nat-primary py-1 px-3 rounded-full font-bold uppercase tracking-widest">
                              Amigo da Rede
                            </span>
                            <h2 className="text-2xl font-serif font-bold italic tracking-tight text-nat-text mt-1.5 mb-0.5">{friend.name}</h2>
                            <p className="text-xs text-nat-muted">{friend.email || 'Sem e-mail'}</p>
                          </div>
                        </div>

                        {/* Balance display / prompt settlement details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-nat-border/40">
                          <div>
                            <span className="block text-[10px] uppercase font-bold tracking-wider text-nat-muted font-sans">Situação Recíproca</span>
                            {balance > 0 ? (
                              <p className="text-sm font-medium text-nat-green leading-relaxed mt-1">
                                {friend.name} te deve <strong className="font-extrabold text-md font-mono">R$ {balance.toFixed(2)}</strong> no geral.
                              </p>
                            ) : balance < 0 ? (
                              <p className="text-sm font-medium text-nat-red leading-relaxed mt-1">
                                Você deve <strong className="font-extrabold text-md font-mono">R$ {Math.abs(balance).toFixed(2)}</strong> para {friend.name}.
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-nat-muted leading-relaxed mt-1">
                                Balanço zerado! Nenhuma pendência financeira pendente.
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-start md:justify-end">
                            {balance !== 0 && (
                              <button
                                onClick={() => {
                                  if (balance < 0) {
                                    // You pay friend
                                    promptDirectSettlement(activeUserId, friend.id, Math.abs(balance));
                                  } else {
                                    // Friend pays you
                                    promptDirectSettlement(friend.id, activeUserId, balance);
                                  }
                                }}
                                className="bg-nat-primary hover:bg-nat-primary-hover text-white text-xs font-bold py-2.5 px-4.5 rounded-full shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                                id="settle-friend-directly-btn"
                              >
                                <Check size={14} /> Quitar Contas com {friend.name}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transações Compartilhadas Log Feed */}
                      <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs space-y-4">
                        <div className="pb-3 border-b border-nat-border/30">
                          <h3 className="text-md font-bold text-nat-text font-serif italic">Transações Compartilhadas</h3>
                          <p className="text-xs text-nat-muted">Histórico de despesas nas quais ambos participam</p>
                        </div>

                        {sharedExpenses.length === 0 ? (
                          <p className="text-sm text-nat-muted py-10 text-center animate-pulse-subtle">Nenhum acerto partilhado até o momento.</p>
                        ) : (
                          <div className="divide-y divide-nat-border/40 overflow-hidden rounded-[32px] border border-nat-border/55">
                            {sharedExpenses.map(expense => {
                              const payer = friends.find(f => f.id === expense.paidById);
                              const isPayerMe = expense.paidById === activeUserId;
                              const category = CATEGORIES.find(c => c.id === expense.categoryId);

                              return (
                                <div
                                  key={expense.id}
                                  className="p-4 bg-white hover:bg-nat-sidebar/10 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                                  id={`shared-expense-item-${expense.id}`}
                                >
                                  {/* Left side info */}
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="p-2 border border-nat-border/30 bg-nat-bg text-nat-primary rounded-2xl flex-shrink-0 mt-0.5">
                                      {expense.isSettlement ? <Landmark size={16} /> : renderCategoryIcon(category?.icon || 'HelpCircle')}
                                    </div>
                                    <div>
                                      <p className="font-bold text-nat-text leading-tight">{expense.description}</p>
                                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-nat-muted mt-1 font-sans">
                                        <span className="font-semibold bg-nat-sidebar text-nat-text px-2 py-0.5 rounded-full text-[10px]">
                                          {expense.isSettlement ? 'Acerto / Pix' : category?.name}
                                        </span>
                                        <span>&bull;</span>
                                        <span>Pago por <strong className="text-nat-text font-semibold">{payer?.name || 'Sistema'}</strong></span>
                                        <span>&bull;</span>
                                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right side currency amount */}
                                  <div className="flex items-center gap-4 text-right flex-shrink-0 border-t sm:border-0 border-dashed border-nat-border w-full sm:w-auto pt-2 sm:pt-0 justify-between sm:justify-end">
                                    <div>
                                      <span className="block text-[10px] text-nat-muted font-bold uppercase tracking-wider">Nota Total</span>
                                      <span className="block text-xs font-bold text-nat-text font-mono">
                                        R$ {expense.amount.toFixed(2)}
                                      </span>
                                    </div>
                                    
                                    <button
                                      onClick={() => handleDeleteExpense(expense.id)}
                                      className="p-1.5 text-nat-muted hover:text-nat-red hover:bg-nat-red/10 rounded-full transition-colors cursor-pointer"
                                      id={`delete-shared-expense-${expense.id}`}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </motion.div>
          )}

          {/* TAB 4: EXTRATO COMPLETO & HISTÓRICO */}
          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              id="history-tab-view"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                  <h2 className="text-3xl font-serif font-bold italic tracking-tight text-nat-text">Extrato Geral de Lançamentos</h2>
                  <p className="text-xs text-nat-muted">Analise, filtre e audite todas as despesas lançadas no aplicativo</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-nat-primary hover:bg-nat-primary-hover text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
                  id="print-report-btn"
                >
                  <Icons.Printer size={15} />
                  Versão de Impressão (PDF)
                </button>
              </div>

              {/* Master filter configuration box */}
              <div className="bg-white rounded-[32px] border border-nat-border/60 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="history-filter-controls">
                {/* Text search */}
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-nat-muted uppercase tracking-wider mb-1 px-1">Buscar por Descrição</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nat-muted" />
                    <input
                      type="text"
                      placeholder="Ex: Aluguel, Mercado..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full text-xs rounded-full border border-nat-border/55 bg-nat-bg/10 pl-8.5 pr-3 py-2 outline-none focus:border-nat-primary font-sans transition-colors"
                    />
                  </div>
                </div>

                {/* Filter Category */}
                <div>
                  <label className="block text-[10px] font-bold text-nat-muted uppercase tracking-wider mb-1 px-1">Filtrar Categoria</label>
                  <select
                    value={historyCategory}
                    onChange={(e) => setHistoryCategory(e.target.value)}
                    className="w-full text-xs rounded-full border border-nat-border/55 bg-nat-bg/10 px-3.5 py-2 outline-none focus:border-nat-primary font-sans transition-colors cursor-pointer"
                  >
                    <option value="all">Todas as Categorias</option>
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="settlements">Pagamentos / Acertos</option>
                  </select>
                </div>

                {/* Filter Group */}
                <div>
                  <label className="block text-[10px] font-bold text-nat-muted uppercase tracking-wider mb-1 px-1">Filtrar Grupo</label>
                  <select
                    value={historyGroup}
                    onChange={(e) => setHistoryGroup(e.target.value)}
                    className="w-full text-xs rounded-full border border-nat-border/55 bg-nat-bg/10 px-3.5 py-2 outline-none focus:border-nat-primary font-sans transition-colors cursor-pointer"
                  >
                    <option value="all">Todos os Grupos</option>
                    <option value="none">Fora de Grupos (Individuais)</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Payer */}
                <div>
                  <label className="block text-[10px] font-bold text-nat-muted uppercase tracking-wider mb-1 px-1">Quem pagou</label>
                  <select
                    value={historyPaidBy}
                    onChange={(e) => setHistoryPaidBy(e.target.value)}
                    className="w-full text-xs rounded-full border border-nat-border/55 bg-nat-bg/10 px-3.5 py-2 outline-none focus:border-nat-primary font-sans transition-colors cursor-pointer"
                  >
                    <option value="all">Pessoa que Pagou: Todos</option>
                    {friends.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data table logic list */}
              {(() => {
                const filteredExpenses = expenses.filter(e => {
                  // Text search
                  const matchesText = e.description.toLowerCase().includes(historySearch.toLowerCase());
                  
                  // Category match
                  let matchesCategory = true;
                  if (historyCategory !== 'all') {
                    if (historyCategory === 'settlements') {
                      matchesCategory = !!e.isSettlement;
                    } else {
                      matchesCategory = !e.isSettlement && e.categoryId === historyCategory;
                    }
                  }

                  // Group match
                  let matchesGroup = true;
                  if (historyGroup !== 'all') {
                    if (historyGroup === 'none') {
                      matchesGroup = e.groupId === null;
                    } else {
                      matchesGroup = e.groupId === historyGroup;
                    }
                  }

                  // Paid by match
                  const matchesPayer = historyPaidBy === 'all' || e.paidById === historyPaidBy;

                  return matchesText && matchesCategory && matchesGroup && matchesPayer;
                });

                const totalSummaryOfFiltered = filteredExpenses.reduce((acc, exp) => exp.isSettlement ? acc : acc + exp.amount, 0);

                return (
                  <>
                    <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs space-y-4 print:hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-nat-border/40 gap-2">
                      <span className="text-xs font-semibold text-nat-muted" id="filtered-total-records-text">
                        Encontrados {filteredExpenses.length} lançamentos
                      </span>

                      <div className="text-[11px] bg-nat-primary text-white font-bold px-4 py-2 rounded-full flex items-center gap-1 font-mono shadow-sm">
                        <span>Soma dos Gastos Filtrados:</span>
                        <strong className="text-white">R$ {totalSummaryOfFiltered.toFixed(2)}</strong>
                      </div>
                    </div>

                    {filteredExpenses.length === 0 ? (
                      <div className="py-12 text-center text-nat-muted">
                        <AlertCircle size={28} className="text-nat-muted mx-auto mb-2" />
                        <p className="text-sm font-semibold text-nat-text">Nenhum lançamento corresponde aos filtros ativos.</p>
                        <p className="text-xs text-nat-muted mt-1">Limpe as buscas ou filtre de outras maneiras.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-nat-border/40 overflow-hidden rounded-[32px] border border-nat-border/55">
                        {filteredExpenses.map(expense => {
                          const payer = friends.find(f => f.id === expense.paidById);
                          const gName = expense.groupId ? groups.find(g => g.id === expense.groupId)?.name : 'Indiv.';
                          const category = CATEGORIES.find(c => c.id === expense.categoryId);

                          return (
                            <div
                              key={expense.id}
                              className="p-4 bg-white hover:bg-nat-sidebar/10 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                              id={`full-history-row-${expense.id}`}
                            >
                              <div className="flex items-start gap-3.5">
                                <div className={`p-2.5 rounded-xl border border-nat-border/30 bg-nat-bg text-nat-primary flex-shrink-0 mt-0.5`}>
                                  {expense.isSettlement ? <Landmark size={18} /> : renderCategoryIcon(category?.icon || 'HelpCircle')}
                                </div>

                                <div>
                                  <p className="font-bold text-nat-text leading-tight">{expense.description}</p>
                                  
                                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-nat-muted mt-1 font-sans">
                                    <span className="font-semibold text-nat-primary bg-nat-sidebar px-2.5 py-0.5 rounded-full text-[10px]">
                                      {expense.isSettlement ? 'Acerto / Transferência' : category?.name}
                                    </span>
                                    <span>&bull;</span>
                                    <span className="text-nat-text/80">Grupo: <strong>{gName}</strong></span>
                                    <span>&bull;</span>
                                    <span>Pago por <strong>{payer?.name || 'Zerad.'}</strong></span>
                                    <span>&bull;</span>
                                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-5 justify-between w-full sm:w-auto mt-2.5 sm:mt-0 pt-2.5 sm:pt-0 border-t sm:border-0 border-dashed border-nat-border">
                                <div className="text-left sm:text-right">
                                  <span className="block text-[9px] uppercase tracking-wider font-bold text-nat-muted">Total</span>
                                  <span className="block text-xs font-bold text-nat-text font-mono">
                                    R$ {expense.amount.toFixed(2)}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="p-1.5 text-nat-muted hover:text-nat-red hover:bg-nat-red/10 rounded-full transition-colors flex-shrink-0 cursor-pointer"
                                  title="Apagar permanente"
                                  id={`delete-history-btn-${expense.id}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* PRINT-ONLY VERSION OF THE LIST */}
                  <div className="hidden print:block bg-white text-nat-text p-4 font-sans" id="print-only-report-section">
                    <div className="flex justify-between items-start border-b-2 border-nat-primary pb-5 mb-6">
                      <div>
                        <h1 className="text-3xl font-serif font-bold italic text-nat-primary">Diviso</h1>
                        <p className="text-xs text-nat-muted mt-1">Divisor de Despesas &amp; Controle de Rateio</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-bold uppercase tracking-wider text-[10px] text-nat-muted">Relatório de Lançamentos</p>
                        <p className="text-nat-text">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    {/* Filter parameters summary block */}
                    <div className="bg-nat-sidebar/20 border border-nat-border/40 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <div className="col-span-2 border-b border-nat-border/30 pb-1.5 mb-1">
                        <h3 className="font-bold uppercase text-[9px] tracking-wider text-nat-muted">Filtros Ativos</h3>
                      </div>
                      <div>
                        <span className="text-nat-muted">Buscar termo:</span>{' '}
                        <strong className="text-nat-text">{historySearch || '(Nenhum)'}</strong>
                      </div>
                      <div>
                        <span className="text-nat-muted">Categoria:</span>{' '}
                        <strong className="text-nat-text">
                          {historyCategory === 'all'
                            ? 'Todas as Categorias'
                            : historyCategory === 'settlements'
                            ? 'Apenas Acertos/Transferências'
                            : CATEGORIES.find(c => c.id === historyCategory)?.name || historyCategory}
                        </strong>
                      </div>
                      <div>
                        <span className="text-nat-muted">Grupo:</span>{' '}
                        <strong className="text-nat-text">
                          {historyGroup === 'all'
                            ? 'Todos os Grupos'
                            : historyGroup === 'none'
                            ? 'Apenas Despesas Individuais'
                            : groups.find(g => g.id === historyGroup)?.name || historyGroup}
                        </strong>
                      </div>
                      <div>
                        <span className="text-nat-muted">Quem pagou:</span>{' '}
                        <strong className="text-nat-text">
                          {historyPaidBy === 'all' ? 'Qualquer pessoa' : friends.find(f => f.id === historyPaidBy)?.name || historyPaidBy}
                        </strong>
                      </div>
                    </div>

                    {/* KPI indicators summary cards in print */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="border border-nat-border/50 rounded-2xl p-4 text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-nat-muted mb-1">Lançamentos Exibidos</span>
                        <strong className="text-2xl font-serif text-nat-primary">{filteredExpenses.length}</strong>
                      </div>
                      <div className="border border-nat-border/50 rounded-2xl p-4 text-center bg-nat-sidebar/10">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-nat-muted mb-1">Total Consolidado</span>
                        <strong className="text-2xl font-serif text-nat-green">R$ {totalSummaryOfFiltered.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Printable structured HTML table */}
                    {filteredExpenses.length === 0 ? (
                      <p className="text-center font-bold text-nat-muted py-6">Nenhum lançamento encontrado para os filtros selecionados.</p>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse border border-nat-border/60">
                        <thead>
                          <tr className="bg-nat-sidebar/40 text-[10px] uppercase font-bold text-nat-muted border-b border-nat-border/60">
                            <th className="py-2.5 px-3 border-r border-nat-border/40 w-24">Data</th>
                            <th className="py-2.5 px-3 border-r border-nat-border/40">Descrição</th>
                            <th className="py-2.5 px-3 border-r border-nat-border/40 w-32">Categoria</th>
                            <th className="py-2.5 px-3 border-r border-nat-border/40 w-24">Grupo</th>
                            <th className="py-2.5 px-3 border-r border-nat-border/40 w-32">Pago Por</th>
                            <th className="py-2.5 px-3 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredExpenses.map((expense, idx) => {
                            const payer = friends.find(f => f.id === expense.paidById);
                            const gName = expense.groupId ? groups.find(g => g.id === expense.groupId)?.name : 'Individual';
                            const category = CATEGORIES.find(c => c.id === expense.categoryId);

                            return (
                              <tr 
                                key={expense.id} 
                                className={`border-b border-nat-border/30 ${idx % 2 === 1 ? 'bg-nat-sidebar/10' : 'bg-white'}`}
                              >
                                <td className="py-2 px-3 border-r border-nat-border/30 font-mono text-[10px]">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                                <td className="py-2 px-3 border-r border-nat-border/30 font-semibold text-nat-text">{expense.description}</td>
                                <td className="py-2 px-3 border-r border-nat-border/30 text-nat-text">
                                  {expense.isSettlement ? 'Acerto / Transferência' : category?.name || 'Despesa'}
                                </td>
                                <td className="py-2 px-3 border-r border-nat-border/30 text-nat-muted">{gName}</td>
                                <td className="py-2 px-3 border-r border-nat-border/30 text-nat-text font-medium">{payer?.name || 'Zerad.'}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-nat-text">
                                  R$ {expense.amount.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-nat-sidebar/30 border-t-2 border-nat-primary">
                            <td colSpan={4} className="py-3 px-3 font-bold border-r border-nat-border/30 text-right uppercase tracking-wider text-[10px] text-nat-muted">Somatório Consolidado (Sem Acertos):</td>
                            <td colSpan={2} className="py-3 px-3 font-mono text-right font-black text-sm text-nat-primary">
                              R$ {totalSummaryOfFiltered.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    )}

                    <div className="mt-8 pt-4 border-t border-dashed border-nat-border/60 text-center text-[10px] text-nat-muted">
                      <p>Relatório gerado diretamente do aplicativo Diviso. Todos os dados são guardados localmente em seu dispositivo.</p>
                    </div>
                  </div>
                </>
              );
              })()}
            </motion.div>
          )}

          {/* TAB 5: BACKUP & DATA MAINTENANCE */}
          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              id="settings-tab-view"
            >
              <div>
                <h2 className="text-3xl font-serif font-bold italic tracking-tight text-nat-text">Gerenciar Meus Dados</h2>
                <p className="text-xs text-nat-muted">Sendo um app pessoal, seus dados são salvos localmente. Exporte backups para guardá-los com segurança.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Data utilities box */}
                <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-nat-text font-serif italic flex items-center gap-1.5 pb-2.5 border-b border-nat-border/30">
                    <Download size={18} className="text-nat-primary" />
                    Manutenção & Backups
                  </h3>
                  <p className="text-xs text-nat-muted leading-relaxed">
                    Sincronize ou salve seu progresso. Você pode fazer o download de um arquivo de extensão <code className="bg-nat-sidebar px-1.5 py-0.5 rounded text-[11px] font-mono">.json</code> e reimportá-lo neste ou em outro computador a qualquer momento.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Export button */}
                    <button
                       onClick={handleExportData}
                       className="bg-nat-primary hover:bg-nat-primary-hover text-white text-xs font-bold py-3 px-4 rounded-full shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                       id="utility-export-btn"
                    >
                      <Download size={15} />
                      Exportar Dados
                    </button>

                    {/* Import button trigger */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white hover:bg-nat-sidebar/10 text-nat-text border border-nat-border/75 text-xs font-bold py-3 px-4 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      id="utility-import-btn"
                    >
                      <Upload size={15} />
                      Importar Backup
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportData}
                      accept=".json"
                      className="hidden"
                      id="file-backup-hidden-input"
                    />
                  </div>
                </div>

                {/* Danger actions and restore box */}
                <div className="bg-white rounded-[32px] border border-nat-border/60 p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-nat-text font-serif italic flex items-center gap-1.5 pb-2.5 border-b border-nat-border/30">
                    <AlertCircle size={18} className="text-nat-primary" />
                    Zona de Perigo & Demonstração
                  </h3>
                  <p className="text-xs text-nat-muted leading-relaxed">
                    Use estas ferramentas para reinicializar sua jornada no app ou para limpar dados obsoletos de seu histórico de rateios.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handleResetDemoData}
                      className="flex-1 bg-nat-sidebar/60 hover:bg-nat-sidebar text-nat-text border border-nat-border/30 text-xs font-bold py-3 px-4 rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      id="utility-reset-demo-btn"
                    >
                      <RefreshCw size={15} />
                      Restaurar Demonstração
                    </button>

                    <button
                      onClick={handleWipeAll}
                      className="flex-1 bg-nat-red/10 hover:bg-nat-red/25 text-nat-red border border-nat-red/20 text-xs font-bold py-3 px-4 rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      id="utility-wipe-all-btn"
                    >
                      <Trash2 size={15} />
                      Limpar Tudo (Sair)
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </section>
      </main>

      {/* --- Footer element --- */}
      <footer className="bg-white border-t border-nat-border/40 py-6 text-center text-xs text-nat-muted mt-auto flex flex-col sm:flex-row items-center justify-between px-8 gap-3" id="app-footer">
        <p>&copy; 2026 Divisor de Despesas Pessoal. Otimize seus rateios sem taxas extras.</p>
        <p className="flex items-center gap-1 font-sans">
          Feito para uso individual e offline &bull; Amigo do Pix.
        </p>
      </footer>

      {/* --- Master Modals Container --- */}
      <AddFriendModal
        isOpen={isFriendModalOpen}
        onClose={() => setIsFriendModalOpen(false)}
        onAdd={handleAddFriend}
      />

      <AddGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        friends={friends}
        onAddGroup={handleAddGroup}
      />

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        friends={friends}
        groups={groups}
        activeGroupId={selectedGroupId}
        onAddExpense={handleAddExpense}
      />

      <SettleModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        friends={friends}
        groups={groups}
        activeGroupId={selectedGroupId}
        initialFromId={settlePayerId}
        initialToId={settleReceiverId}
        initialAmount={settleAmount}
        onAddSettlement={handleAddExpense}
      />
    </div>
  );
}
