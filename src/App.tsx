import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Transaction, ThemeType, ReminderSettings, SavingsGoal } from './types';
import { APP_THEMES, getCategoryDetails, INCOME_CATEGORIES, EXPENSE_CATEGORIES, CategoryInfo } from './themes';
import { TransactionForm } from './components/TransactionForm';
import { FinancialCharts } from './components/FinancialCharts';
import { ExportPanel } from './components/ExportPanel';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { ReminderPanel } from './components/ReminderPanel';
import { Toast, ToastContainer, ToastType } from './components/NotificationToast';
import { AuthModal } from './components/AuthModal';
import { CategoryManager } from './components/CategoryManager';
import { 
  generateSyncKey, 
  uploadTransactionsToCloud, 
  downloadTransactionsFromCloud, 
  uploadUserProfileToCloud,
  downloadUserProfileFromCloud,
  clearAllCloudData,
  verifySyncKey,
  validateUsername,
  signUpUser,
  loginUser,
  uploadCategoriesToCloud,
  downloadCategoriesFromCloud,
  uploadThemeToCloud,
  downloadThemeFromCloud,
  subscribeToTransactions,
  subscribeToProfile,
  saveTransactionToCloud,
  deleteTransactionFromCloud
} from './firebase';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Calendar, 
  Trash2, 
  Edit2, 
  Edit3,
  Moon, 
  Sun, 
  Palette, 
  Cloud, 
  Info, 
  X, 
  Sparkles,
  Home,
  BarChart2,
  Settings,
  Bell,
  CheckCircle,
  HelpCircle,
  Clock,
  LogIn,
  LogOut,
  User,
  Lock,
  Paperclip,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  List,
  Smartphone,
  Lightbulb,
  Repeat
} from 'lucide-react';

// No initial transactions - start completely fresh
const INITIAL_TRANSACTIONS: Transaction[] = [];

export default function App() {
  // --- Core Application States ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem('kuma_transactions');
    return stored ? JSON.parse(stored) : INITIAL_TRANSACTIONS;
  });
  const [incomeCategories, setIncomeCategories] = useState<CategoryInfo[]>(() => {
    const stored = localStorage.getItem('kuma_income_categories');
    return stored ? JSON.parse(stored) : INCOME_CATEGORIES;
  });
  const [expenseCategories, setExpenseCategories] = useState<CategoryInfo[]>(() => {
    const stored = localStorage.getItem('kuma_expense_categories');
    return stored ? JSON.parse(stored) : EXPENSE_CATEGORIES;
  });

  const getCategoryDetailsDynamic = (id: string, type: 'income' | 'expense') => {
    const list = type === 'income' ? incomeCategories : expenseCategories;
    const found = list.find(c => c.id === id);
    if (found) return found;
    return {
      id: 'others',
      name: id === 'others' ? 'อื่นๆ' : id,
      emoji: '🧸',
      color: type === 'income' ? 'text-amber-500' : 'text-slate-500',
      bgColor: type === 'income' ? 'bg-amber-100' : 'bg-slate-100',
      subCategories: []
    };
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'stats' | 'insights' | 'settings'>('dashboard');
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeType>(() => {
    return (localStorage.getItem('kuma_theme') as ThemeType) || 'cherry';
  });
  const [syncKey, setSyncKey] = useState<string>(() => {
    return localStorage.getItem('kuma_sync_key') || '';
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(() => {
    const stored = localStorage.getItem('kuma_last_synced');
    return stored ? parseInt(stored) : 0;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isInitialSync, setIsInitialSync] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(() => {
    return localStorage.getItem('kuma_logged_in_user');
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Full screen Login/Signup states for initial lock
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authKey, setAuthKey] = useState<number>(0);

  // Clear auth inputs whenever loggedOut state changes
  useEffect(() => {
    if (!loggedInUser) {
      setAuthUsername('');
      setAuthPassword('');
      setShowAuthPassword(false);
      setAuthKey(prev => prev + 1);
    }
  }, [loggedInUser]);
  
  // Filtering states
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dashboardViewMode, setDashboardViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string>('all');
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('kuma_categories_collapsed') === 'true';
  });

  const toggleCategoriesCollapse = () => {
    setIsCategoriesCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('kuma_categories_collapsed', String(next));
      return next;
    });
  };
  const [defaultAddDate, setDefaultAddDate] = useState<string | undefined>(undefined);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  // --- Monthly Budget & Savings Goals States ---
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem('kuma_monthly_budgets');
    return stored ? JSON.parse(stored) : {};
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    const stored = localStorage.getItem('kuma_savings_goals');
    return stored ? JSON.parse(stored) : [];
  });

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState('');
  
  // State for creating savings goal
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalEmoji, setNewGoalEmoji] = useState('🎯');

  // Goal Deposit/Withdraw Action modal states
  const [isGoalActionModalOpen, setIsGoalActionModalOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [goalActionType, setGoalActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [goalActionAmount, setGoalActionAmount] = useState('');

  // Track previous syncKey to avoid uploading old local state when switching user accounts
  const prevSyncKeyRef = React.useRef(syncKey);

  // Trigger local storage save whenever budget or savings goal changes
  useEffect(() => {
    localStorage.setItem('kuma_monthly_budgets', JSON.stringify(monthlyBudgets));
    if (syncKey && prevSyncKeyRef.current === syncKey && !isInitialSync) {
      uploadUserProfileToCloud(syncKey, { monthlyBudgets });
    }
  }, [monthlyBudgets]);

  useEffect(() => {
    localStorage.setItem('kuma_savings_goals', JSON.stringify(savingsGoals));
    if (syncKey && prevSyncKeyRef.current === syncKey && !isInitialSync) {
      uploadUserProfileToCloud(syncKey, { savingsGoals });
    }
  }, [savingsGoals]);

  useEffect(() => {
    prevSyncKeyRef.current = syncKey;
  }, [syncKey]);


  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);
  const [pwaTab, setPwaTab] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      addToast('💡 หากใช้งานบน iOS แนะนำให้เปิดด้วย Safari แล้วกดปุ่มแชร์เลือก "เพิ่มไปยังหน้าจอโฮม" นะครับ', 'info');
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        addToast('🎉 ติดตั้งแอปสำเร็จแล้ว! เริ่มบันทึกผ่านไอคอนหน้าจอโฮมได้เลยน้า 🧸✨', 'success');
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };
  
  // Date helper
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form states
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Reminders states
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: true,
    time: '20:00',
    message: 'ก๊อกๆ 🧸 คุมะคุงเตือนใจ ได้เวลาบันทึกรายรับ-รายจ่ายแสนน่ารักวันนี้แล้วนะค้าบ~ 💕',
    days: [0, 1, 2, 3, 4, 5, 6]
  });

  // Toasts notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'ตกลง',
    cancelText: 'ยกเลิก',
    onConfirm: () => {}
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'ตกลง',
    cancelText = 'ยกเลิก'
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setTimeout(() => {
          onConfirm();
        }, 0);
      }
    });
  };

  // Mascot Custom Messages based on Financial Status
  const [mascotMessage, setMascotMessage] = useState<string>('สวัสดีครับ! วันนี้มาจดบัญชีน่ารักๆ กับคุมะคุงนะค้าบ 🧸✨');
  
  // Interactive Mascot Animation States
  const [mascotReaction, setMascotReaction] = useState<'idle' | 'happy' | 'celebrate' | 'proud' | 'shocked'>('idle');

  // Derive cute emojis based on current mascot reaction state
  const mascotEmoji = useMemo(() => {
    switch (mascotReaction) {
      case 'happy':
        return '🐻💖';
      case 'celebrate':
        return '🎉🐻🎉';
      case 'proud':
        return '🕶️🧸';
      case 'shocked':
        return '🐻💥';
      case 'idle':
      default:
        return '🧸';
    }
  }, [mascotReaction]);

  // Mascot trigger reaction helper
  const triggerMascotReaction = (reaction: 'happy' | 'celebrate' | 'proud' | 'shocked', message: string) => {
    setMascotReaction(reaction);
    setMascotMessage(message);
    
    // Confetti on celebrate or happy
    if (reaction === 'celebrate' || reaction === 'happy') {
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.6 }
      });
    }

    // Reset to idle after 5 seconds
    setTimeout(() => {
      setMascotReaction('idle');
    }, 5000);
  };

  // State for displaying bank slip preview modal
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);

  // Load the current active theme object
  const currentTheme = useMemo(() => {
    return APP_THEMES.find(t => t.id === selectedThemeId) || APP_THEMES[0];
  }, [selectedThemeId]);

  const isDark = currentTheme.isDark;

  // --- Toast Manager Helpers ---
  const addToast = (message: string, type: ToastType = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Initial Loading on Mount ---
  useEffect(() => {
    // 1. Theme
    const storedTheme = localStorage.getItem('kuma_theme') as ThemeType;
    if (storedTheme) {
      setSelectedThemeId(storedTheme);
    }

    // 2. Sync Key & Cloud sync values
    let key = localStorage.getItem('kuma_sync_key') || '';
    if (!key) {
      key = generateSyncKey();
      localStorage.setItem('kuma_sync_key', key);
      addToast(`🎉 ยินดีต้อนรับ! สร้างรหัสสำรองข้อมูลส่วนตัวให้คุณเรียบร้อยครับ: ${key}`, 'sync');
    }
    setSyncKey(key);

    const storedLastSync = localStorage.getItem('kuma_last_synced') || '0';
    setLastSyncedAt(parseInt(storedLastSync));

    // 3. Transactions
    const storedTx = localStorage.getItem('kuma_transactions');
    if (storedTx) {
      setTransactions(JSON.parse(storedTx));
    } else {
      // First load, seed cute data
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.setItem('kuma_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    }

    // 3.5. Dynamic Categories
    const storedIncomeCats = localStorage.getItem('kuma_income_categories');
    const storedExpenseCats = localStorage.getItem('kuma_expense_categories');
    if (storedIncomeCats && storedExpenseCats) {
      setIncomeCategories(JSON.parse(storedIncomeCats));
      setExpenseCategories(JSON.parse(storedExpenseCats));
    } else {
      setIncomeCategories(INCOME_CATEGORIES);
      setExpenseCategories(EXPENSE_CATEGORIES);
      localStorage.setItem('kuma_income_categories', JSON.stringify(INCOME_CATEGORIES));
      localStorage.setItem('kuma_expense_categories', JSON.stringify(EXPENSE_CATEGORIES));
    }

    // 4. Reminders
    const storedReminders = localStorage.getItem('kuma_reminders');
    if (storedReminders) {
      setReminderSettings(JSON.parse(storedReminders));
    }

    // 5. Logged In User
    const storedUser = localStorage.getItem('kuma_logged_in_user');
    if (storedUser) {
      setLoggedInUser(storedUser);
    }
  }, []);

  // --- Refs for Real-time Listener state comparison ---
  const transactionsRef = React.useRef(transactions);
  transactionsRef.current = transactions;

  const selectedThemeIdRef = React.useRef(selectedThemeId);
  selectedThemeIdRef.current = selectedThemeId;

  const incomeCategoriesRef = React.useRef(incomeCategories);
  incomeCategoriesRef.current = incomeCategories;

  const expenseCategoriesRef = React.useRef(expenseCategories);
  expenseCategoriesRef.current = expenseCategories;

  const monthlyBudgetsRef = React.useRef(monthlyBudgets);
  monthlyBudgetsRef.current = monthlyBudgets;

  const savingsGoalsRef = React.useRef(savingsGoals);
  savingsGoalsRef.current = savingsGoals;

  // --- Real-Time Sync Listener across Devices (Phone, Tablet, PC) ---
  useEffect(() => {
    if (!syncKey) return;

    let isSubscribed = true;

    // 1. Subscribe to real-time transaction updates from Cloud
    const unsubscribeTx = subscribeToTransactions(syncKey, (cloudTxList) => {
      if (!isSubscribed) return;

      const cloudJson = JSON.stringify(cloudTxList);
      const currentJson = JSON.stringify(transactionsRef.current);

      if (cloudJson !== currentJson) {
        setTransactions(cloudTxList);
        localStorage.setItem('kuma_transactions', cloudJson);
        const now = Date.now();
        setLastSyncedAt(now);
        localStorage.setItem('kuma_last_synced', now.toString());
      }
    });

    // 2. Subscribe to real-time profile/categories/theme/budgets/goals updates from Cloud
    const unsubscribeProfile = subscribeToProfile(syncKey, (profileData) => {
      if (!isSubscribed) return;

      if (profileData.themeId && profileData.themeId !== selectedThemeIdRef.current) {
        setSelectedThemeId(profileData.themeId as ThemeType);
        localStorage.setItem('kuma_theme', profileData.themeId);
      }

      if (profileData.incomeCategories && profileData.expenseCategories) {
        const incJson = JSON.stringify(profileData.incomeCategories);
        const expJson = JSON.stringify(profileData.expenseCategories);
        const currentIncJson = JSON.stringify(incomeCategoriesRef.current);
        const currentExpJson = JSON.stringify(expenseCategoriesRef.current);

        if (incJson !== currentIncJson || expJson !== currentExpJson) {
          setIncomeCategories(profileData.incomeCategories);
          setExpenseCategories(profileData.expenseCategories);
          localStorage.setItem('kuma_income_categories', incJson);
          localStorage.setItem('kuma_expense_categories', expJson);
        }
      }

      if (profileData.monthlyBudgets !== undefined) {
        const budgetsJson = JSON.stringify(profileData.monthlyBudgets);
        const currentBudgetsJson = JSON.stringify(monthlyBudgetsRef.current);
        if (budgetsJson !== currentBudgetsJson) {
          setMonthlyBudgets(profileData.monthlyBudgets);
          localStorage.setItem('kuma_monthly_budgets', budgetsJson);
        }
      }

      if (profileData.savingsGoals !== undefined) {
        const goalsJson = JSON.stringify(profileData.savingsGoals);
        const currentGoalsJson = JSON.stringify(savingsGoalsRef.current);
        if (goalsJson !== currentGoalsJson) {
          setSavingsGoals(profileData.savingsGoals);
          localStorage.setItem('kuma_savings_goals', goalsJson);
        }
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribeTx();
      unsubscribeProfile();
    };
  }, [syncKey, loggedInUser]);

  // --- Automatic Recurring Expenses Generator ---
  const processRecurringTransactions = (currentTxList: Transaction[]): { updatedList: Transaction[]; generatedCount: number } => {
    if (!currentTxList || currentTxList.length === 0) {
      return { updatedList: currentTxList, generatedCount: 0 };
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();

    const newGeneratedTx: Transaction[] = [];

    // Filter all expense transactions marked as isRecurring
    const recurringParents = currentTxList.filter(tx => tx.isRecurring && tx.type === 'expense');

    for (const parent of recurringParents) {
      if (!parent.date) continue;

      const parts = parent.date.split('-');
      if (parts.length < 3) continue;

      const startYear = parseInt(parts[0], 10);
      const startMonth = parseInt(parts[1], 10);
      const targetDay = parent.recurringDay || parseInt(parts[2], 10) || 1;

      if (isNaN(startYear) || isNaN(startMonth)) continue;

      let y = startYear;
      let m = startMonth + 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }

      while (y < currentYear || (y === currentYear && m <= currentMonth)) {
        // If target month is current month, check if current day >= targetDay
        if (y === currentYear && m === currentMonth && currentDay < targetDay) {
          break;
        }

        const monthStr = String(m).padStart(2, '0');
        const targetPrefix = `${y}-${monthStr}`;

        // Check if a generated transaction already exists for this parent in this target year and month
        const alreadyExists = currentTxList.some(tx => 
          (tx.recurringParentId === parent.id || (tx.id === parent.id && tx.date.startsWith(targetPrefix))) &&
          tx.date.startsWith(targetPrefix)
        ) || newGeneratedTx.some(tx => 
          tx.recurringParentId === parent.id && tx.date.startsWith(targetPrefix)
        );

        if (!alreadyExists) {
          const maxDaysInMonth = new Date(y, m, 0).getDate();
          const actualDay = Math.min(targetDay, maxDaysInMonth);
          const actualDayStr = String(actualDay).padStart(2, '0');
          const generatedDate = `${y}-${monthStr}-${actualDayStr}`;

          const newTx: Transaction = {
            id: 'tx_rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            type: parent.type,
            amount: parent.amount,
            category: parent.category,
            subCategory: parent.subCategory,
            description: parent.description ? `${parent.description} (รายการประจำเดือน)` : 'รายจ่ายประจำเดือน',
            date: generatedDate,
            time: parent.time || '08:00',
            createdAt: Date.now(),
            slipImage: parent.slipImage,
            slipImages: parent.slipImages,
            recurringParentId: parent.id,
            isRecurring: false
          };

          newGeneratedTx.push(newTx);
        }

        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
    }

    if (newGeneratedTx.length > 0) {
      const updatedList = [...newGeneratedTx, ...currentTxList];
      updatedList.sort((a, b) => {
        if (b.date !== a.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt - a.createdAt;
      });
      return { updatedList, generatedCount: newGeneratedTx.length };
    }

    return { updatedList: currentTxList, generatedCount: 0 };
  };

  // Run recurring expenses check whenever transactions state is set/loaded
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const { updatedList, generatedCount } = processRecurringTransactions(transactions);
      if (generatedCount > 0) {
        setTransactions(updatedList);
        localStorage.setItem('kuma_transactions', JSON.stringify(updatedList));
        addToast(`คุมะคุงช่วยบันทึกรายจ่ายประจำเดือนให้อัตโนมัติ ${generatedCount} รายการเรียบร้อยครับ! 🔄🧸✨`, 'success');
        if (syncKey) {
          triggerAutoCloudBackup(updatedList);
        }
      }
    }
  }, [transactions]);

  // --- Auto-trigger background Firestore backups on Transaction modifications ---
  const triggerAutoCloudBackup = async (updatedTx: Transaction[]) => {
    if (!syncKey) return;
    setIsSyncing(true);
    const success = await uploadTransactionsToCloud(syncKey, updatedTx);
    setIsSyncing(false);
    if (success) {
      const now = Date.now();
      setLastSyncedAt(now);
      localStorage.setItem('kuma_last_synced', now.toString());
    }
  };

  // --- Custom Authentication Handlers ---
  const handleLoginSuccess = async (username: string, userSyncKey: string) => {
    setIsInitialSync(true);
    setIsSyncing(true);
    addToast('กำลังดึงข้อมูลกระเป๋าเงินของคุณจากระบบคลาวด์... 🧸☁️', 'info');

    // Clear login inputs and increment auth key
    setAuthUsername('');
    setAuthPassword('');
    setShowAuthPassword(false);
    setAuthKey(prev => prev + 1);

    // Set user and sync key state immediately so real-time listeners activate
    setLoggedInUser(username);
    localStorage.setItem('kuma_logged_in_user', username);
    
    setSyncKey(userSyncKey);
    localStorage.setItem('kuma_sync_key', userSyncKey);

    try {
      const downloadedTx = await downloadTransactionsFromCloud(userSyncKey);
      const downloadedProfile = await downloadUserProfileFromCloud(userSyncKey);

      // 1. Recover/sync user profile data from cloud
      if (downloadedProfile) {
        if (downloadedProfile.themeId) {
          setSelectedThemeId(downloadedProfile.themeId as ThemeType);
          localStorage.setItem('kuma_theme', downloadedProfile.themeId);
        }
        if (downloadedProfile.incomeCategories && downloadedProfile.expenseCategories) {
          setIncomeCategories(downloadedProfile.incomeCategories);
          setExpenseCategories(downloadedProfile.expenseCategories);
          localStorage.setItem('kuma_income_categories', JSON.stringify(downloadedProfile.incomeCategories));
          localStorage.setItem('kuma_expense_categories', JSON.stringify(downloadedProfile.expenseCategories));
        }
        if (downloadedProfile.monthlyBudgets !== undefined) {
          setMonthlyBudgets(downloadedProfile.monthlyBudgets);
          localStorage.setItem('kuma_monthly_budgets', JSON.stringify(downloadedProfile.monthlyBudgets));
        }
        if (downloadedProfile.savingsGoals !== undefined) {
          setSavingsGoals(downloadedProfile.savingsGoals);
          localStorage.setItem('kuma_savings_goals', JSON.stringify(downloadedProfile.savingsGoals));
        }
      }

      // 2. Recover/sync transactions (Cloud data is authoritative source of truth)
      if (downloadedTx && downloadedTx.length > 0) {
        setTransactions(downloadedTx);
        localStorage.setItem('kuma_transactions', JSON.stringify(downloadedTx));
        addToast('ดึงข้อมูลบัญชีและซิงค์ข้อมูลเสร็จเรียบร้อยแล้วค้าบ! ✨🧸', 'success');
      } else {
        addToast(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับคุณ ${username} ครับ 🧸✨`, 'success');
      }
    } catch (error) {
      console.error("Error during login sync:", error);
      addToast('เชื่อมต่อคลาวด์เสร็จสิ้น ข้อมูลจะถูกซิงค์ผ่านระบบอัตโนมัติครับ 🧸☁️', 'info');
    } finally {
      setIsInitialSync(false);
      setIsSyncing(false);
    }
  };

  const handleSignupSuccess = async (username: string, userSyncKey: string) => {
    setIsSyncing(true);
    addToast('กำลังบันทึกข้อมูลและลงทะเบียนบัญชีใหม่ของคุณ... 🧸☁️', 'info');

    // Upload current user state so guest transactions/data are saved to their new account
    await uploadTransactionsToCloud(userSyncKey, transactions);
    await uploadUserProfileToCloud(userSyncKey, {
      themeId: selectedThemeId,
      incomeCategories,
      expenseCategories,
      monthlyBudgets,
      savingsGoals
    });

    setIsSyncing(false);
    
    // Auto login into their new account
    await handleLoginSuccess(username, userSyncKey);
  };

  const handleLogout = () => {
    showConfirm(
      'ออกจากระบบ 🧸🚪',
      'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีของคุณ? ข้อมูลจะถูกเก็บอย่างปลอดภัยบนระบบคลาวด์ และระบบจะล้างข้อมูลส่วนตัวในเครื่องนี้ทันทีครับ',
      () => {
        setLoggedInUser(null);
        localStorage.removeItem('kuma_logged_in_user');
        
        // Clear login form fields so username and password are not cached
        setAuthUsername('');
        setAuthPassword('');
        setShowAuthPassword(false);
        setAuthTab('login');
        setAuthKey(prev => prev + 1);
        
        // Generate a new clean anonymous sync key
        const newAnonymousKey = generateSyncKey();
        setSyncKey(newAnonymousKey);
        localStorage.setItem('kuma_sync_key', newAnonymousKey);
        
        // Reset last sync time
        setLastSyncedAt(0);
        localStorage.removeItem('kuma_last_synced');
        
        // Reset transactions to initial seed data for the guest/new session
        setTransactions(INITIAL_TRANSACTIONS);
        localStorage.setItem('kuma_transactions', JSON.stringify(INITIAL_TRANSACTIONS));

        // Reset categories, budgets, and savings goals
        setIncomeCategories(INCOME_CATEGORIES);
        setExpenseCategories(EXPENSE_CATEGORIES);
        setMonthlyBudgets({});
        setSavingsGoals([]);

        localStorage.setItem('kuma_income_categories', JSON.stringify(INCOME_CATEGORIES));
        localStorage.setItem('kuma_expense_categories', JSON.stringify(EXPENSE_CATEGORIES));
        localStorage.setItem('kuma_monthly_budgets', JSON.stringify({}));
        localStorage.setItem('kuma_savings_goals', JSON.stringify([]));
        
        addToast('ออกจากระบบและล้างข้อมูลส่วนตัวในเครื่องเรียบร้อยแล้วน้า บ๊ายบายครับ! 👋🧸', 'success');
      },
      'ใช่, ออกจากระบบ',
      'ยกเลิก'
    );
  };

  // --- Mascot Smart Dialog Logic ---
  useEffect(() => {
    if (mascotReaction !== 'idle') return;
    // Compute totals of current selected month
    let incomeSum = 0;
    let expenseSum = 0;
    const monthlyTx = transactions.filter(t => t.date.startsWith(selectedMonth));

    monthlyTx.forEach(t => {
      if (t.type === 'income') incomeSum += t.amount;
      else expenseSum += t.amount;
    });

    const net = incomeSum - expenseSum;

    // Check if recorded anything today
    const todayStr = new Date().toISOString().split('T')[0];
    const recordedToday = transactions.some(t => t.date === todayStr);

    const currentMonthBudget = monthlyBudgets[selectedMonth];

    if (transactions.length === 0) {
      setMascotMessage('ยังไม่มีบันทึกเลยค้าบ กดปุ่มบวกสีชมพูด้านล่างเพื่อจดรายการแรกกับคุมะคุงเลยน้า 🧸💕');
    } else if (currentMonthBudget && expenseSum >= currentMonthBudget) {
      setMascotMessage(`🚨 โอ๊ะโอ! เดือนนี้ใช้จ่ายไป ฿${expenseSum.toLocaleString()} เกินงบที่ตั้งไว้ ฿${currentMonthBudget.toLocaleString()} แล้วนะคุมะ! ประหยัดด่วนๆ เลยน้า 🧸💥`);
    } else if (currentMonthBudget && expenseSum >= currentMonthBudget * 0.8) {
      setMascotMessage(`⚠️ เตือนภัยคุมะ! เดือนนี้ใช้เงินไปแล้ว ฿${expenseSum.toLocaleString()} ใกล้จะหมดงบ ฿${currentMonthBudget.toLocaleString()} แล้วน้า (ใช้ไปแล้ว ${Math.round(expenseSum / currentMonthBudget * 100)}%) 🧸💧`);
    } else if (!recordedToday) {
      setMascotMessage('ก๊อกๆ 🧸 วันนี้คุมะคุงยังไม่เห็นบันทึกรายจ่ายเลยน้า อย่าลืมจดข้าวเที่ยงหรือชานมไข่มุกนะค้าบ ✨');
    } else if (expenseSum > incomeSum && incomeSum > 0) {
      setMascotMessage('โอ๊ะโอ... เดือนนี้รายจ่ายเยอะกว่ารายรับแล้วน้าคุมะเป็นห่วง ค่อยๆ ออมเงินกันน้าค้าบ 🧸💧');
    } else if (net > 2000) {
      setMascotMessage('เดือนนี้มีเงินออมเหลือตั้ง ฿' + Math.floor(net).toLocaleString() + ' แหนะ! เก่งสุดๆ เลย คุมะภูมิใจมากค้าบ 🌟🧁');
    } else {
      setMascotMessage('คุมะคุงสแตนด์บายพร้อมบันทึกทุกบาททุกสตางค์แล้วค้าบ! วันนี้ออมเงินเพื่อเป้าหมายกันเถอะนะ 🧸✨');
    }
  }, [transactions, selectedMonth, monthlyBudgets]);


  // --- Save / Edit / Delete Core Handlers ---
  const handleSaveTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => {
    let updated: Transaction[];

    if (txData.id) {
      // Editing
      updated = transactions.map(t => 
        t.id === txData.id 
          ? { ...t, ...txData, createdAt: t.createdAt } as Transaction
          : t
      );
      addToast('แก้ไขบันทึกเรียบร้อยแล้วค่ะ! ✨');
      setEditingTransaction(null);
    } else {
      // Adding new
      const newTx: Transaction = {
        ...txData,
        id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        createdAt: Date.now()
      } as Transaction;

      updated = [newTx, ...transactions];
      addToast('จดบัญชีเรียบร้อย คุมะคุงบันทึกให้แล้วครับ! 🧸🎉');

      // Mascot Reaction logic
      if (newTx.type === 'income') {
        if (newTx.amount >= 2000) {
          triggerMascotReaction(
            'celebrate',
            `ว้าวววสุดยอด! 🎉 คุณจดรายรับก้อนโตตั้ง ฿${newTx.amount.toLocaleString()} แน่ะ คุมะคุงตื่นเต้นดีใจมากเลยฮะ! ✨🧸💰`
          );
        } else {
          triggerMascotReaction(
            'happy',
            `ยินดีด้วยกับรายรับ ฿${newTx.amount.toLocaleString()} นะค้าบ! มีเงินสะสมเพิ่มขึ้นแล้ว เย้ๆ 💖🧸`
          );
        }
      } else {
        triggerMascotReaction(
          'happy',
          `จดรายจ่ายเรียบร้อย ฿${newTx.amount.toLocaleString()} ครับ คุมะคุงบันทึกใส่สมุดบัญชีแล้วน้า 🧸📝`
        );
      }
    }

    setTransactions(updated);
    try {
      localStorage.setItem('kuma_transactions', JSON.stringify(updated));
    } catch (err) {
      console.warn("localStorage quota exceeded, skipping local storage cache:", err);
    }
    setDefaultAddDate(undefined);
    setActiveTab('dashboard');

    // Trigger Cloud auto backup
    triggerAutoCloudBackup(updated);
  };

  const handleDeleteTransaction = (id: string) => {
    showConfirm(
      'คุณต้องการลบรายการนี้ใช่ไหมเอ่ย? 🧸❓',
      'หากลบรายการแล้ว ยอดเงินรวมจะถูกคำนวณใหม่โดยอัตโนมัติน้าค้าบ',
      () => {
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        localStorage.setItem('kuma_transactions', JSON.stringify(updated));
        addToast('ลบรายการเรียบร้อยแล้วครับ 🗑️');
        
        // Sync to cloud
        triggerAutoCloudBackup(updated);
      },
      'ใช่, ลบเลย',
      'ยกเลิก'
    );
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setActiveTab('add');
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setDefaultAddDate(undefined);
    setActiveTab('dashboard');
  };

  // --- Theme customization callback ---
  const handleThemeChange = async (themeId: ThemeType) => {
    setSelectedThemeId(themeId);
    localStorage.setItem('kuma_theme', themeId);
    addToast(`เปลี่ยนธีมเป็น "${APP_THEMES.find(t => t.id === themeId)?.name}" แล้วน่ารักขึ้น 300% 🌸✨`);
    
    // Auto-save selected theme to cloud if synced/logged in
    if (syncKey) {
      await uploadThemeToCloud(syncKey, themeId);
    }
  };

  // --- Category change callback ---
  const handleCategoriesChange = async (newIncome: CategoryInfo[], newExpense: CategoryInfo[]) => {
    setIncomeCategories(newIncome);
    setExpenseCategories(newExpense);
    localStorage.setItem('kuma_income_categories', JSON.stringify(newIncome));
    localStorage.setItem('kuma_expense_categories', JSON.stringify(newExpense));
    
    if (syncKey) {
      await uploadCategoriesToCloud(syncKey, newIncome, newExpense);
    }
  };

  // --- Sync manually callback ---
  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    addToast('กำลังอัปเดตข้อมูลขึ้นระบบคลาวด์ปลอดภัย... ☁️', 'sync');
    const successTx = await uploadTransactionsToCloud(syncKey, transactions);
    const successProfile = await uploadUserProfileToCloud(syncKey, {
      themeId: selectedThemeId,
      incomeCategories,
      expenseCategories,
      monthlyBudgets,
      savingsGoals
    });
    setIsSyncing(false);
    if (successTx && successProfile) {
      const now = Date.now();
      setLastSyncedAt(now);
      localStorage.setItem('kuma_last_synced', now.toString());
      addToast('☁️ สำรองข้อมูลขึ้นคลาวด์สำเร็จ! ยอดบัญชี, งบประมาณ และเป้าหมายปลอดภัยหายห่วง 💯', 'success');
    } else {
      addToast('❌ การซิงค์ล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ต', 'error');
    }
  };

  // --- Restore from another sync key callback ---
  const handleRestoreWithKey = async (targetKey: string): Promise<boolean> => {
    setIsSyncing(true);
    addToast('กำลังเชื่อมต่อฐานข้อมูลคลาวด์... 🔍', 'sync');
    
    const timeoutMs = 5000; // 5 seconds timeout
    
    try {
      const keyExists = await Promise.race([
        verifySyncKey(targetKey),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs))
      ]);

      if (!keyExists) {
        addToast('❌ เชื่อมต่อล่าช้าหรือรหัสซิงค์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้งครับ', 'error');
        setIsSyncing(false);
        return false;
      }

      const fetchedTx = await Promise.race([
        downloadTransactionsFromCloud(targetKey),
        new Promise<any[] | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
      ]);

      const fetchedProfile = await Promise.race([
        downloadUserProfileFromCloud(targetKey),
        new Promise<any>((resolve) => setTimeout(() => resolve(null), timeoutMs))
      ]);
      
      setIsSyncing(false);

      if (fetchedTx !== null) {
        // Save transactions
        setTransactions(fetchedTx);
        localStorage.setItem('kuma_transactions', JSON.stringify(fetchedTx));
        
        if (fetchedProfile) {
          if (fetchedProfile.themeId) {
            setSelectedThemeId(fetchedProfile.themeId as ThemeType);
            localStorage.setItem('kuma_theme', fetchedProfile.themeId);
          }
          if (fetchedProfile.incomeCategories && fetchedProfile.expenseCategories) {
            setIncomeCategories(fetchedProfile.incomeCategories);
            setExpenseCategories(fetchedProfile.expenseCategories);
            localStorage.setItem('kuma_income_categories', JSON.stringify(fetchedProfile.incomeCategories));
            localStorage.setItem('kuma_expense_categories', JSON.stringify(fetchedProfile.expenseCategories));
          }
          if (fetchedProfile.monthlyBudgets !== undefined) {
            setMonthlyBudgets(fetchedProfile.monthlyBudgets);
            localStorage.setItem('kuma_monthly_budgets', JSON.stringify(fetchedProfile.monthlyBudgets));
          }
          if (fetchedProfile.savingsGoals !== undefined) {
            setSavingsGoals(fetchedProfile.savingsGoals);
            localStorage.setItem('kuma_savings_goals', JSON.stringify(fetchedProfile.savingsGoals));
          } else {
            setSavingsGoals([]);
            localStorage.setItem('kuma_savings_goals', '[]');
          }
        }
        
        // Update local keys
        setSyncKey(targetKey);
        localStorage.setItem('kuma_sync_key', targetKey);
        
        const now = Date.now();
        setLastSyncedAt(now);
        localStorage.setItem('kuma_last_synced', now.toString());

        addToast('🎉 ยินดีด้วย! ซิงค์และกู้คืนข้อมูลบัญชีสำเร็จ เรียบร้อยแล้วค่ะ!', 'success');
        return true;
      } else {
        addToast('❌ เชื่อมต่อล่าช้าหรือมีข้อผิดพลาดในการดาวน์โหลดข้อมูล', 'error');
        return false;
      }
    } catch (e) {
      console.error(e);
      addToast('❌ มีข้อผิดพลาดในการดาวน์โหลดข้อมูล', 'error');
      setIsSyncing(false);
      return false;
    }
  };

  // --- Reminders save callback ---
  const handleSaveReminderSettings = (newSettings: ReminderSettings) => {
    setReminderSettings(newSettings);
    localStorage.setItem('kuma_reminders', JSON.stringify(newSettings));
    addToast('💾 บันทึกเวลาเตือนความจำสำเร็จแล้วค่ะ!');
  };

  // --- Trigger In-App Test Notification Toast ---
  const handleTriggerTestNotification = (msg: string) => {
    addToast(`🔔 แจ้งเตือน: ${msg}`, 'info');
  };

  // --- Reset All Data Callback ---
  const handleResetAllData = () => {
    showConfirm(
      '🧸 คุมะคุงเตือนภัย!',
      'คุณแน่ใจจริงๆ หรอค้าบว่าจะลบข้อมูลรายการเดินบัญชีทั้งหมด? ข้อมูลนี้จะหายไปเลยน้าคุมะกู้คืนไม่ได้น้า 🥺💔',
      () => {
        showConfirm(
          'ยืนยันอีกครั้งน้าค้าบ... 🧸🗑️',
          'ลบทุกรายการและข้อมูลการเงินทั้งหมด แล้วเริ่มนับหนึ่งใหม่ใช่ไหมเอ่ย?',
          async () => {
            // Reset state
            setTransactions([]);
            setMonthlyBudgets({});
            setSavingsGoals([]);
            setIncomeCategories(INCOME_CATEGORIES);
            setExpenseCategories(EXPENSE_CATEGORIES);

            // Reset local storage
            localStorage.setItem('kuma_transactions', JSON.stringify([]));
            localStorage.setItem('kuma_monthly_budgets', JSON.stringify({}));
            localStorage.setItem('kuma_savings_goals', JSON.stringify([]));
            localStorage.setItem('kuma_income_categories', JSON.stringify(INCOME_CATEGORIES));
            localStorage.setItem('kuma_expense_categories', JSON.stringify(EXPENSE_CATEGORIES));

            if (syncKey) {
              setIsSyncing(true);
              const success = await clearAllCloudData(syncKey, INCOME_CATEGORIES, EXPENSE_CATEGORIES);
              setIsSyncing(false);
              if (success) {
                const now = Date.now();
                setLastSyncedAt(now);
                localStorage.setItem('kuma_last_synced', now.toString());
              }
            }
            
            addToast('ล้างข้อมูลบัญชีทั้งหมดเรียบร้อยแล้วครับ! มาเริ่มจดบันทึกใหม่กันน้า 🧸✨', 'success');
            setActiveTab('dashboard');
          },
          'ใช่, ลบเลย!',
          'ยกเลิก'
        );
      },
      'ใช่, ฉันแน่ใจ',
      'ไม่ลบแล้ว'
    );
  };

  // --- Filtered and Searched list computed ---
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
      // Month
      const matchMonth = t.date.startsWith(selectedMonth);
      // Type
      const matchType = filterType === 'all' || t.type === filterType;
      // Category filter
      const matchCategory = selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;
      // Subcategory filter
      const matchSubCategory = selectedSubCategoryFilter === 'all' || 
        (selectedSubCategoryFilter === 'none' ? !t.subCategory : t.subCategory === selectedSubCategoryFilter);
      // Search text
      const matchSearch = searchQuery.trim() === '' || 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryDetailsDynamic(t.category, t.type).name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subCategory && t.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchMonth && matchType && matchCategory && matchSubCategory && matchSearch;
    });
  }, [transactions, selectedMonth, filterType, selectedCategoryFilter, selectedSubCategoryFilter, searchQuery, incomeCategories, expenseCategories]);

  // --- Category Specific Monthly Summary ---
  const categorySummary = useMemo(() => {
    if (selectedCategoryFilter === 'all') return null;
    
    // Filter items in the selected month for this category
    const monthlyCategoryItems = transactions.filter(t => 
      t.date.startsWith(selectedMonth) && 
      t.category === selectedCategoryFilter &&
      (selectedSubCategoryFilter === 'all' || 
        (selectedSubCategoryFilter === 'none' ? !t.subCategory : t.subCategory === selectedSubCategoryFilter))
    );
    
    const totalAmount = monthlyCategoryItems.reduce((sum, t) => sum + t.amount, 0);
    const count = monthlyCategoryItems.length;
    
    const isIncomeCat = incomeCategories.some(c => c.id === selectedCategoryFilter);
    const catDetails = getCategoryDetailsDynamic(selectedCategoryFilter, isIncomeCat ? 'income' : 'expense');
    
    return {
      name: catDetails.name,
      emoji: catDetails.emoji,
      color: catDetails.color,
      bgColor: catDetails.bgColor,
      totalAmount,
      count,
      type: isIncomeCat ? 'income' : ('expense' as const),
      subCategory: selectedSubCategoryFilter !== 'all' ? selectedSubCategoryFilter : null
    };
  }, [transactions, selectedMonth, selectedCategoryFilter, selectedSubCategoryFilter, incomeCategories, expenseCategories]);

  // --- Aggregate totals for display ---
  const summaryTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    // Calculate for selected month
    const monthlyItems = transactions.filter(t => t.date.startsWith(selectedMonth));
    monthlyItems.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [transactions, selectedMonth]);

  // --- Kuma Financial Insights Memo ---
  const kumaInsights = useMemo(() => {
    const monthlyItems = transactions.filter(t => t.date.startsWith(selectedMonth));
    const monthlyExpenses = monthlyItems.filter(t => t.type === 'expense');
    const totalExpense = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = monthlyItems.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    // Group expenses by category
    const catGroups: Record<string, number> = {};
    monthlyExpenses.forEach(t => {
      catGroups[t.category] = (catGroups[t.category] || 0) + t.amount;
    });

    const topExpenses = Object.keys(catGroups).map(catId => {
      const catDetails = expenseCategories.find(c => c.id === catId) || { name: 'อื่นๆ', emoji: '🧸' };
      return {
        id: catId,
        name: catDetails.name,
        emoji: catDetails.emoji,
        amount: catGroups[catId],
        percentage: totalExpense > 0 ? Math.round((catGroups[catId] / totalExpense) * 100) : 0
      };
    }).sort((a, b) => b.amount - a.amount).slice(0, 3);

    // Calculate daily average spending
    const expenseDates = new Set(monthlyExpenses.map(t => t.date));
    const uniqueDaysCount = expenseDates.size || 1;
    const dailyAverage = totalExpense / uniqueDaysCount;

    // Generate 4 distinct smart advices from Kuma
    const advicesList: Array<{ id: number; title: string; desc: string; emoji: string; status: 'good' | 'warn' | 'info' }> = [];

    // 1. Budget Advice
    const budget = monthlyBudgets[selectedMonth];
    if (budget) {
      const percent = (totalExpense / budget) * 100;
      if (percent >= 100) {
        advicesList.push({
          id: 1,
          title: 'งบประมาณรายจ่ายเกินกำหนด!',
          desc: `เดือนนี้รายจ่ายรวม ฿${totalExpense.toLocaleString()} เกินจากงบประมาณที่คุณตั้งไว้ที่ ฿${budget.toLocaleString()} แล้วน้าคุมะเป็นห่วง! คุมะว่าต้องชะลอการจ่ายด่วนเลยน้า 🚨🧸💧`,
          emoji: '🎯',
          status: 'warn'
        });
      } else if (percent >= 80) {
        advicesList.push({
          id: 1,
          title: 'งบรายจ่ายใกล้ถึงขีดจำกัด',
          desc: `คุณใช้จ่ายไปแล้ว ฿${totalExpense.toLocaleString()} คิดเป็น ${Math.round(percent)}% ของงบรายเดือน ฿${budget.toLocaleString()} ประหยัดขึ้นอีกนิดนะคุมะคอยเอาใจช่วย! ⚠️🧸✨`,
          emoji: '🎯',
          status: 'warn'
        });
      } else {
        advicesList.push({
          id: 1,
          title: 'การควบคุมงบประมาณดีเยี่ยม',
          desc: `ใช้ไปเพียง ${Math.round(percent)}% ของงบ ฿${budget.toLocaleString()} สภาพคล่องเยี่ยมมาก มีความประหยัดสุดยอดคุมะยกนิ้วให้เลย! 👍🧸🏆`,
          emoji: '🎯',
          status: 'good'
        });
      }
    } else {
      advicesList.push({
        id: 1,
        title: 'แนะนำให้ลองตั้งเป้าหมายงบรายจ่าย',
        desc: 'การตั้งงบประมาณควบคุมรายจ่ายช่วยจัดสรรเงินและระงับความอยากซื้อของที่ไม่จำเป็นได้ดีมากเลยน้า ลองกดตั้งงบดูสิคุมะคุงเชียร์อยู่! 🧸✨',
        emoji: '🎯',
        status: 'info'
      });
    }

    // 2. Top Expenses Category Advice
    const topCat = topExpenses[0];
    if (topCat) {
      if (topCat.id === 'food') {
        advicesList.push({
          id: 2,
          title: 'หมวดของอร่อยดีต่อใจแต่แอบเยอะน้า',
          desc: `คุณหมดเงินไปกับหมวด "${topCat.emoji} ${topCat.name}" มากสุดเป็นอันดับ 1 ในเดือนนี้ คิดเป็น ${topCat.percentage}% ของรายจ่ายทั้งหมดเลย ของอร่อยฮีลใจได้ดีแต่พยายามวางแผนทานบุฟเฟต์ลดลงหน่อยน้าคุมะเป็นห่วง 🍩🧸🍕`,
          emoji: '🍔',
          status: 'info'
        });
      } else if (topCat.id === 'shopping') {
        advicesList.push({
          id: 2,
          title: 'ของช้อปปิ้งมันต้องมีจริงรึเปล่าน้าคุมะ?',
          desc: `หมวด "${topCat.emoji} ${topCat.name}" นำโด่งแซงทุกหมวดคิดเป็น ${topCat.percentage}% ของรายจ่าย ก่อนกดสั่งซื้อลองปล่อยทิ้งไว้ในตะกร้าสัก 2 วัน แล้วค่อยกลับมาดูใหม่ ช่วยเซฟเงินได้เยอะสุดๆ เลยน้า 🛍️🧸✨`,
          emoji: '🛍️',
          status: 'info'
        });
      } else if (topCat.id === 'travel') {
        advicesList.push({
          id: 2,
          title: 'ทริปท่องเที่ยวและการเดินทางเบิกบานใจ',
          desc: `หมดงบไปกับการเดินทางและท่องเที่ยวค่อนข้างสูงคิดเป็น ${topCat.percentage}% ของรายจ่าย เที่ยวสนุกปลอดภัยเป็นเรื่องดีแต่อย่าลืมสำรองงบกลับบ้านกันด้วยนะค้าบ 🚗🧸🏕️`,
          emoji: '🏕️',
          status: 'info'
        });
      } else {
        advicesList.push({
          id: 2,
          title: `สัดส่วนรายจ่ายหมวดหลักค่อนข้างสูง`,
          desc: `เดือนนี้ใช้จ่ายหมวด "${topCat.emoji} ${topCat.name}" เป็นสัดส่วนเยอะที่สุดคิดเป็น ${topCat.percentage}% ของรายจ่าย ลองพิจารณาลดค่าใช้จ่ายย่อยที่ไม่จำเป็นในส่วนนี้ดูน้าคุมะคุงแนะนำ 💡🧸`,
          emoji: '💡',
          status: 'info'
        });
      }
    } else {
      advicesList.push({
        id: 2,
        title: 'พร้อมแนะนำพฤติกรรมใช้เงินหลัก',
        desc: 'เมื่อใดที่คุณเริ่มบันทึกรายจ่าย คุมะคุงจะคอยนำรายการมาจัดลำดับหมวดหมู่ที่ใช้เงินมากที่สุดเพื่อช่วยคุณวางแผนประหยัดอย่างมีประสิทธิภาพจ้า 📝🧸',
        emoji: '📊',
        status: 'info'
      });
    }

    // 3. Savings Rate Advice
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    if (totalIncome > 0) {
      if (savingsRate < 0) {
        advicesList.push({
          id: 3,
          title: 'กระเป๋าตังค์สั่นคลอน รายจ่ายเกินรายได้ 🚨',
          desc: `เดือนนี้รายจ่ายรวมสูงกว่ารายรับไปแล้วน้าคุมะ! คุมะคุงแนะนำเทคนิค "หักออมก่อนใช้" 10% ทันทีเมื่อได้รับเงินเข้ามา เพื่อความอุ่นใจในการใช้ชีวิตนะคุมะ 💧🧸`,
          emoji: '📈',
          status: 'warn'
        });
      } else if (savingsRate >= 30) {
        advicesList.push({
          id: 3,
          title: 'ยอดนักออมฝีมือระดับเหรียญทอง 🥇',
          desc: `คุณมีอัตราการออมสะสมสูงถึง ${Math.round(savingsRate)}% ในเดือนนี้! ถือว่ามีวินัยการเงินขั้นเทพสุดๆ คุมะคุงภูมิใจและขอส่งวิ้งค์น่ารักๆ ให้เป็นรางวัลเลยจ้า 😉🧸💖`,
          emoji: '📈',
          status: 'good'
        });
      } else {
        advicesList.push({
          id: 3,
          title: 'อัตราการออมอยู่ในเกณฑ์พัฒนาได้ดี',
          desc: `เดือนนี้คุณมีส่วนต่างเงินออมคิดเป็น ${Math.round(savingsRate)}% ของรายได้ ลองตั้งเป้าหมายเพิ่มพูนอัตราออมขึ้นทีละ 2-3% ในเดือนหน้า เพื่อความสนุกและมั่นคงน้า 🌱🧸`,
          emoji: '📈',
          status: 'good'
        });
      }
    } else {
      advicesList.push({
        id: 3,
        title: 'สูตรลับความมั่งคั่งสไตล์คุมะ',
        desc: 'จำสูตรลัดง่ายๆ: "รายรับ - เงินออม = รายจ่าย" ให้แบ่งออมทันทีที่เงินออก แล้วจะพบว่าคุณสามารถเก็บออมเงินได้ไวขึ้นอย่างน่าอัศจรรย์ใจคุมะ! 💰🧸🌟',
        emoji: '🌱',
        status: 'info'
      });
    }

    // 4. Savings Goal Completion Advice
    const activeGoal = savingsGoals[0];
    if (activeGoal) {
      const progress = Math.round((activeGoal.currentAmount / activeGoal.targetAmount) * 100);
      if (progress >= 100) {
        advicesList.push({
          id: 4,
          title: 'ยินดีด้วยอย่างยิ่งกับเป้าหมายออมสำเร็จ! 👑',
          desc: `เป้าหมายการออม "${activeGoal.emoji} ${activeGoal.name}" ของคุณทำสำเร็จทะลุ 100% เรียบร้อยแล้ว! วิเศษที่สุดเลย เก่งจังครับ คุมะคุงขอมอบมงกุฎให้คุณเลยคุมะ 🏆🧸👑`,
          emoji: '🏆',
          status: 'good'
        });
      } else {
        advicesList.push({
          id: 4,
          title: 'ภารกิจพิชิตฝันกำลังคืบหน้า',
          desc: `เป้าหมายออมเงิน "${activeGoal.emoji} ${activeGoal.name}" ดำเนินการคืบหน้าไปแล้วกว่า ${progress}% ค่อยๆ สะสมเพิ่มอีกวันละนิด ใกล้เส้นชัยความสำเร็จแล้วคุมะเอาใจเชียร์ขาดใจ! 🎯🧸✨`,
          emoji: '🏆',
          status: 'info'
        });
      }
    } else {
      advicesList.push({
        id: 4,
        title: 'สร้างเป้าหมายเพื่อสร้างกำลังใจการออม',
        desc: 'คุณยังไม่ได้กำหนดเป้าหมายออมเงินเลยน้า มาร่วมตั้งเป้าหมายน่ารักๆ เพื่อเดินทางท่องเที่ยว หรือซื้ออุปกรณ์ฮีลใจกันเถอะ คุมะคุงจะได้ช่วยนับเหรียญสะสมนะคุมะ! 🎯🧸',
        emoji: '🏆',
        status: 'info'
      });
    }

    // Generate main highlighted advice for backward compatibility
    let advice = 'เดือนนี้ยังไม่มีประวัติรายจ่ายเลยค้าบ ชิลๆ ถนอมกระเป๋าเงินไปก่อนน้าคุมะเชียร์อยู่! 🧸✨';
    let alertType: 'success' | 'warning' | 'info' = 'info';

    if (totalExpense > 0) {
      const savingsRateVal = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : -1;
      if (totalIncome > 0 && totalExpense > totalIncome * 0.85) {
        advice = `🚨 เตือนภัยกระเป๋าตังค์แบนคุมะ! รายจ่ายในเดือนนี้กินเงินไปถึง ${Math.round(totalExpense / totalIncome * 100)}% ของรายได้แล้วน้า คุมะคิดว่าเราควรพักปุ่มช้อปปิ้งกันสักหน่อยแล้วนะค้าบ 🧸💦`;
        alertType = 'warning';
      } else if (savingsRateVal >= 30) {
        advice = `🌟 ว้าวสุดยอดคุมะ! เดือนนี้คุณมีอัตราการออมเงินสูงถึง ${Math.round(savingsRateVal)}% เลยนะค้าบ ถือว่ามีวินัยการเงินที่ดีมากๆ คุมะขอยกนิ้วให้เลย รักษาฟอร์มแบบนี้ไว้น้า! 👍🧸✨`;
        alertType = 'success';
      } else if (topCat) {
        if (topCat.id === 'food') {
          advice = `🍩 เดือนนี้คุณหมดเงินไปกับ "${topCat.emoji} ${topCat.name}" มากที่สุดเป็นอันดับ 1 เลยน้า (คิดเป็น ${topCat.percentage}% ของรายจ่าย) ของอร่อยช่วยฮีลใจได้ดี แต่อย่าลืมวางแผนการเงินด้วยนะค้าบ 🧸🍕`;
        } else if (topCat.id === 'shopping') {
          advice = `🛍️ กระซิบๆ... เดือนนี้รายจ่ายหมวด "${topCat.emoji} ${topCat.name}" แซงทางโค้งมากเลยคุมะ (${topCat.percentage}%) ก่อนกดซื้อ ลองทิ้งไว้ในตะกร้าสัก 2 วัน แล้วค่อยกลับมาดูใหม่ ช่วยประหยัดได้เยอะเลยน้า 🧸✨`;
        } else if (topCat.id === 'travel') {
          advice = `🚗 เดือนนี้หมดไปกับการเดินทางท่องเที่ยวค่อนข้างเยอะเลยน้า (${topCat.percentage}%) เดินทางปลอดภัยหายห่วง แต่อย่าลืมเช็กแผนเงินออมกันด้วยนะคุมะ 🧸🏕️`;
        } else {
          advice = `💡 สังเกตๆ... เดือนนี้คุณใช้จ่ายไปกับหมวด "${topCat.emoji} ${topCat.name}" เป็นสัดส่วนเยอะที่สุดเลยน้า (${topCat.percentage}%) ลองพิจารณาลดทอนค่าใช้จ่ายที่ไม่จำเป็นในหมวดนี้ดูนะคุมะ 🧸`;
        }
      }
    }

    return {
      topExpenses,
      dailyAverage,
      advice,
      alertType,
      advicesList
    };
  }, [transactions, selectedMonth, expenseCategories, monthlyBudgets, savingsGoals]);

  // Handle month scroll helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
  };

  // Month Display Name in Thai
  const thaiMonthName = useMemo(() => {
    const [year, monthStr] = selectedMonth.split('-');
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${thaiMonths[parseInt(monthStr) - 1]} ${parseInt(year) + 543}`;
  }, [selectedMonth]);

  // --- Calendar Computation Hooks ---
  const calendarDays = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const startDate = new Date(year, month - 1, 1);
    const totalDays = new Date(year, month, 0).getDate();
    const startDayOfWeek = startDate.getDay();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
    const prevMonthYear = month === 1 ? year - 1 : year;
    const prevMonthNum = month === 1 ? 12 : month - 1;
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayVal = prevMonthTotalDays - i;
      const dateStr = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: dayVal,
        isCurrentMonth: false
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true
      });
    }

    const totalSlots = days.length <= 35 ? 35 : 42;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonthNum = month === 12 ? 1 : month + 1;
    const fillCount = totalSlots - days.length;
    for (let day = 1; day <= fillCount; day++) {
      const dateStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: false
      });
    }

    return days;
  }, [selectedMonth]);

  const dayFinanceMap = useMemo(() => {
    const map: Record<string, { income: number; expense: number; txs: Transaction[] }> = {};
    
    transactions.forEach(t => {
      if (!map[t.date]) {
        map[t.date] = { income: 0, expense: 0, txs: [] };
      }
      map[t.date].txs.push(t);
      if (t.type === 'income') {
        map[t.date].income += t.amount;
      } else {
        map[t.date].expense += t.amount;
      }
    });
    
    return map;
  }, [transactions]);

  // Full screen Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword) {
      addToast('กรุณากรอกข้อมูลให้ครบถ้วนด้วยน้า 🔑', 'error');
      return;
    }

    setIsAuthLoading(true);
    try {
      if (authTab === 'login') {
        const result = await loginUser(authUsername, authPassword);
        if (result.success && result.username && result.syncKey) {
          addToast(result.message, 'success');
          handleLoginSuccess(result.username, result.syncKey);
        } else {
          addToast(result.message || 'เข้าสู่ระบบไม่สำเร็จครับ 🥺', 'error');
        }
      } else {
        // Sign Up
        const result = await signUpUser(authUsername, authPassword, syncKey);
        if (result.success && result.username && result.syncKey) {
          addToast(result.message, 'success');
          handleSignupSuccess(result.username, result.syncKey);
        } else {
          addToast(result.message || 'สมัครสมาชิกไม่สำเร็จครับ 🥺', 'error');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      addToast('เกิดข้อผิดพลาดจากระบบเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งครับ 🥺', 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (!loggedInUser) {
    return (
      <div className={`min-h-screen font-sans flex flex-col items-center justify-center p-4 transition-all duration-300 ${currentTheme.background} ${currentTheme.textPrimary}`}>
        {/* Dynamic Toast Container */}
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Theme Quick Switcher on Login Screen */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => {
              const themeIds = APP_THEMES.map(t => t.id);
              const currentIndex = themeIds.indexOf(selectedThemeId);
              const nextIndex = (currentIndex + 1) % themeIds.length;
              handleThemeChange(themeIds[nextIndex]);
            }}
            className={`p-2.5 rounded-2xl border transition-all active:scale-95 flex items-center gap-1.5 shadow-sm text-xs font-extrabold ${
              isDark 
                ? 'bg-slate-900/90 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white/95 border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="เปลี่ยนธีมหน้าจอ"
          >
            <Palette size={14} className="text-pink-500" />
            <span className="hidden sm:inline">เปลี่ยนธีม</span>
          </button>
        </div>

        {/* Brand App Icon & Name */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse ${
              isDark ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            <img 
              src="https://img.icons8.com/fluency/512/wallet.png" 
              alt="CashSniper Wallet" 
              className="w-24 h-24 relative select-none animate-cute-float"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center justify-center gap-2">
            <span>CashSniper</span>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm animate-pulse">v2.0</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold">
            บันทึกรายรับ-รายจ่ายสุดอัจฉริยะ แม่นยำ และรวดเร็ว 🎯💸
          </p>
        </div>

        {/* Auth Main Card */}
        <div 
          className={`w-full max-w-sm rounded-3xl border p-6 relative shadow-2xl transition-all duration-300 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-white`}
        >
          {/* Slidey Pill Tab Switcher */}
          <div className={`grid grid-cols-2 p-1.5 rounded-2xl mb-5 border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/50'
          }`}>
            <button
              onClick={() => { setAuthTab('login'); setAuthPassword(''); }}
              disabled={isAuthLoading}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                authTab === 'login'
                  ? isDark ? 'bg-slate-800 text-amber-400 shadow-sm' : 'bg-white text-rose-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => { setAuthTab('signup'); setAuthPassword(''); }}
              disabled={isAuthLoading}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                authTab === 'signup'
                  ? isDark ? 'bg-slate-800 text-amber-400 shadow-sm' : 'bg-white text-rose-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              สมัครสมาชิกใหม่
            </button>
          </div>

          {/* Prompt banner */}
          <div className={`p-3 rounded-2xl text-xs mb-5 border ${
            isDark 
              ? 'bg-slate-950/50 border-slate-800/80 text-slate-300' 
              : 'bg-rose-50/40 border-rose-100/50 text-slate-600'
          }`}>
            <p className="leading-relaxed text-[11px] font-semibold">
              {authTab === 'login' 
                ? '💡 กรุณาลงชื่อเข้าใช้เพื่อเปิดระบบกระเป๋าเงิน และเชื่อมโยงข้อมูลคลาวด์ของคุณทันทีครับ!' 
                : '🧸 สมัครสมาชิกบัญชีใหม่ ข้อมูลบัญชีของท่านจะเริ่มต้นใหม่ทั้งหมดโดยไม่มีตัวอย่าง รวดเร็วและปลอดภัย!'}
            </p>
          </div>

          {/* Form */}
          <form key={`auth-form-${authKey}`} onSubmit={handleAuthSubmit} className="space-y-4" autoComplete="off">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Gmail หรือ Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  name="username"
                  autoComplete="off"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  disabled={isAuthLoading}
                  placeholder="เช่น yourname@gmail.com หรือ kuma_user"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all focus:outline-hidden ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400/50'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-rose-400/50 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  รหัสผ่าน (Password)
                </label>
                {authTab === 'signup' && (
                  <span className="text-[9px] font-semibold text-rose-500">ขั้นต่ำ 4 ตัวอักษร</span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  disabled={isAuthLoading}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  className={`w-full pl-9 pr-10 py-2.5 rounded-2xl text-xs font-semibold border transition-all focus:outline-hidden ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400/50'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-rose-400/50 focus:bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-500 transition-colors"
                >
                  {showAuthPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isAuthLoading}
              className={`w-full py-3 rounded-2xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition-all active:scale-97 shadow-md ${
                isDark 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/10' 
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-500/10'
              } ${isAuthLoading ? 'opacity-70 cursor-not-allowed animate-pulse' : ''}`}
            >
              {isAuthLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : authTab === 'login' ? (
                <LogIn size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              <span>
                {isAuthLoading 
                  ? 'กำลังเชื่อมต่อเซิร์ฟเวอร์...' 
                  : authTab === 'login' ? 'เข้าสู่ระบบบัญชีของคุณ' : 'สร้างบัญชีและใช้งานฟรี'}
              </span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={selectedThemeId}
      initial={{ opacity: 0.2 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className={`min-h-screen font-sans pb-24 ${currentTheme.background} ${currentTheme.textPrimary}`}
    >
      
      {/* Full-Screen Syncing Overlay */}
      {isInitialSync && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-amber-500 blur-3xl opacity-30 animate-pulse" />
            <img 
              src="https://img.icons8.com/fluency/512/wallet.png" 
              alt="Syncing" 
              className="w-24 h-24 relative select-none animate-bounce"
            />
          </div>
          <div className="space-y-3 max-w-sm">
            <h3 className="text-xl font-extrabold flex items-center justify-center gap-2">
              <span>กำลังดึงข้อมูลบัญชี... ☁️🧸</span>
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              คุมะคุงกำลังดึงข้อมูลบัญชี รายการ และธีมที่คุณเคยทำไว้กลับมาจากคลาวด์อย่างปลอดภัยนะค้าบ... กรุณารอสักครู่น้า ✨
            </p>
            {/* Adorable custom bouncing dots spinner */}
            <div className="flex justify-center items-center gap-1.5 pt-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.1s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* --- Top Cute iOS / Android App Style Bar --- */}
      <header className={`sticky top-0 z-40 px-4 py-3 border-b flex items-center justify-between transition-colors duration-200 ${currentTheme.borderColor} ${
        isDark ? 'bg-slate-950/80 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md'
      }`}>
        <div className="flex items-center gap-2">
          {/* Animated Mascot Wallet Icon */}
          <img 
            src="https://img.icons8.com/fluency/96/wallet.png" 
            alt="CashSniper Wallet" 
            className="w-8 h-8 select-none animate-cute-float"
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-tight flex items-center gap-1">
              <span>CashSniper</span> 
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">Snipe Expense</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400">บันทึกบัญชีอัจฉริยะ แม่นยำ รวดเร็ว 🎯💸</p>
          </div>
        </div>

        {/* Quick Sync & Light/Dark Quick Switcher */}
        <div className="flex items-center gap-2">
          {/* Cloud Auto status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-950/20">
            <Cloud size={11} className={isSyncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">คลาวด์สำรองแล้ว</span>
          </div>

          {/* Quick Login / Profile Button */}
          {loggedInUser ? (
            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[10px] font-extrabold transition-all active:scale-95 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                  : 'bg-[#8BA888]/10 border-[#8BA888]/20 text-[#8BA888] hover:bg-[#8BA888]/20'
              }`}
              title={`เข้าสู่ระบบด้วยชื่อ ${loggedInUser} (คลิกเพื่อออกจากระบบ)`}
            >
              <User size={13} className="text-amber-500 dark:text-amber-400" />
              <span className="max-w-[70px] truncate">{loggedInUser}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[10px] font-extrabold transition-all active:scale-95 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <LogIn size={13} />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}

          {/* Quick theme cycle button */}
          <button
            onClick={() => {
              const themeIds = APP_THEMES.map(t => t.id);
              const currentIndex = themeIds.indexOf(selectedThemeId);
              const nextIndex = (currentIndex + 1) % themeIds.length;
              handleThemeChange(themeIds[nextIndex]);
            }}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-[#8BA888] hover:bg-slate-50'
            }`}
            title="เปลี่ยนธีมหน้าจอ"
          >
            <Palette size={14} />
          </button>
        </div>
      </header>

      {/* --- Main Contents Container --- */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* --- 1. Cute Kuma-Kun Mascot Greeting Box --- */}
        <div className={`p-4 rounded-3xl border transition-all flex items-center gap-3.5 relative overflow-hidden shadow-xs ${
          isDark ? 'bg-slate-900/40 border-slate-800' : `${currentTheme.cardBg} ${currentTheme.borderColor}`
        }`}>
          {/* Pastel circular accent behind mascot (Dynamic glowing orb matching Kuma's mood) */}
          <motion.div 
            className="absolute -left-1 -bottom-4 w-16 h-16 rounded-full blur-xl pointer-events-none"
            animate={
              mascotReaction === 'happy' || mascotReaction === 'celebrate'
                ? {
                    scale: [1, 1.4, 1],
                    opacity: [0.15, 0.4, 0.15],
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.35)' // Golden Amber
                  }
                : mascotReaction === 'proud'
                ? {
                    scale: [1, 1.25, 1],
                    opacity: [0.15, 0.3, 0.15],
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.25)' // Emerald
                  }
                : mascotReaction === 'shocked'
                ? {
                    scale: [1, 1.6, 1],
                    opacity: [0.25, 0.55, 0.25],
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)' // Crimson/Red
                  }
                : {
                    scale: [1, 1.15, 1],
                    opacity: [0.1, 0.2, 0.1],
                    backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(139, 168, 136, 0.25)' // Warm Theme Glow
                  }
            }
            transition={{
              repeat: Infinity,
              duration: mascotReaction === 'shocked' ? 1.0 : mascotReaction === 'happy' ? 1.5 : 4,
              ease: "easeInOut"
            }}
          />
          
          <motion.div
            key={mascotReaction} // Forces animation to re-evaluate on reaction switch
            className="text-4xl shrink-0 select-none cursor-pointer"
            animate={
              mascotReaction === 'happy'
                ? {
                    scale: [1, 1.25, 1, 1.25, 1],
                    y: [0, -12, 0, -12, 0],
                    rotate: [0, 5, -5, 5, 0]
                  }
                : mascotReaction === 'celebrate'
                ? {
                    rotate: [0, 360, 720],
                    y: [0, -20, 0, -20, 0],
                    scale: [1, 1.35, 0.9, 1.15, 1]
                  }
                : mascotReaction === 'proud'
                ? {
                    x: [-6, 6, -6, 6, 0],
                    scale: [1, 1.15, 1.15, 1],
                    rotate: [0, -3, 3, -3, 0]
                  }
                : mascotReaction === 'shocked'
                ? {
                    x: [-3, 3, -3, 3, -3, 3, 0],
                    scale: [1, 1.3, 1.3, 1],
                    rotate: [0, 10, -10, 10, 0]
                  }
                : {
                    y: [0, -3, 0],
                    scaleY: [1, 1.04, 1],
                    scaleX: [1, 0.97, 1]
                  }
            }
            transition={
              mascotReaction === 'idle'
                ? {
                    repeat: Infinity,
                    duration: 3.2,
                    ease: "easeInOut"
                  }
                : {
                    duration: mascotReaction === 'celebrate' ? 1.5 : mascotReaction === 'shocked' ? 0.6 : 1.2,
                    ease: "easeInOut"
                  }
            }
            onClick={() => {
              triggerMascotReaction('happy', 'ฮิฮิ คุมะคุงดีใจจังที่คุณมากอดตัวผม บันทึกรายวันกันต่อเลยนะคุมะ! 💖🧸✨');
            }}
          >
            {mascotEmoji}
          </motion.div>

          <div className="space-y-0.5">
            <span className="text-[9px] font-bold text-[#8BA888] dark:text-amber-400 uppercase tracking-widest">Kuma Assistant</span>
            <p className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
              "
              <motion.span
                key={mascotMessage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="inline-block"
              >
                {mascotMessage}
              </motion.span>
              "
            </p>
          </div>
        </div>

        {/* --- Active View Render Router --- */}
        
        {/* VIEW: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 slide-up">
            
            {/* Monthly Budget Summary Card */}
            <div className={`p-5 rounded-3xl border border-white/15 text-white relative overflow-hidden shadow-md ${
              selectedThemeId === 'cherry' ? 'bg-gradient-to-br from-rose-400 to-rose-500' :
              selectedThemeId === 'matcha' ? 'bg-gradient-to-br from-emerald-400 to-emerald-500' :
              selectedThemeId === 'blueberry' ? 'bg-gradient-to-br from-sky-400 to-sky-500' :
              selectedThemeId === 'peach' ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
              selectedThemeId === 'natural' ? 'bg-gradient-to-br from-[#9BB598] to-[#7B9978]' :
              'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950'
            }`}>
              {/* Cute graphic rings decoration */}
              <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full border-16 border-white/5 pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 w-28 h-28 rounded-full border-8 border-white/5 pointer-events-none" />

              {/* Month Selector Row */}
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/35 active:scale-90 transition-all font-bold text-xs"
                >
                  ◀
                </button>
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide">
                  <Calendar size={13} />
                  <span>{thaiMonthName}</span>
                </div>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/35 active:scale-90 transition-all font-bold text-xs"
                >
                  ▶
                </button>
              </div>

              {/* Main Savings Balance */}
              <div className="text-center py-1 relative z-10">
                <span className="text-[10px] font-bold text-white/75 tracking-wider uppercase">ยอดคงเหลือประจำเดือน</span>
                <h2 className="text-3xl font-extrabold tracking-tight mt-0.5">
                  ฿{summaryTotals.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </h2>
              </div>

              {/* Monthly Spending Budget Limit Tracker */}
              <div className="mt-2.5 px-3 py-2 rounded-2xl bg-black/15 border border-white/5 relative z-10 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-extrabold text-[10px] tracking-wide text-white/90 flex items-center gap-1">
                    🎯 งบรายจ่ายของเดือนนี้
                  </span>
                  {monthlyBudgets[selectedMonth] ? (
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => {
                          setBudgetInputValue(String(monthlyBudgets[selectedMonth]));
                          setIsBudgetModalOpen(true);
                        }}
                        className="text-[9px] bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded font-extrabold transition-all active:scale-95"
                      >
                        แก้ไข
                      </button>
                      <button 
                        onClick={() => {
                          const nextBudgets = { ...monthlyBudgets };
                          delete nextBudgets[selectedMonth];
                          setMonthlyBudgets(nextBudgets);
                          addToast('ล้างงบประมาณรายจ่ายเรียบร้อยแล้วน้า 🧸🧼', 'success');
                        }}
                        className="text-[9px] bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 px-1.5 py-0.5 rounded font-extrabold transition-all active:scale-95"
                      >
                        ล้าง
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setBudgetInputValue('');
                        setIsBudgetModalOpen(true);
                      }}
                      className="text-[9px] bg-white/25 hover:bg-white/40 px-2 py-0.5 rounded font-extrabold transition-all active:scale-95"
                    >
                      + ตั้งงบรายจ่าย
                    </button>
                  )}
                </div>

                {monthlyBudgets[selectedMonth] ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-white/80 font-bold">
                      <span>ใช้จ่ายจริง: ฿{summaryTotals.expense.toLocaleString()}</span>
                      <span>งบทั้งหมด: ฿{monthlyBudgets[selectedMonth].toLocaleString()}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          summaryTotals.expense >= monthlyBudgets[selectedMonth] ? 'bg-red-400 shadow-sm' :
                          summaryTotals.expense >= monthlyBudgets[selectedMonth] * 0.8 ? 'bg-amber-400' :
                          'bg-emerald-300'
                        }`}
                        style={{ width: `${Math.min(100, (summaryTotals.expense / monthlyBudgets[selectedMonth]) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[8px] text-white/70">
                      <span>
                        {summaryTotals.expense >= monthlyBudgets[selectedMonth] ? '❌ เกินงบแล้วนะคุมะเป็นห่วง!' :
                         summaryTotals.expense >= monthlyBudgets[selectedMonth] * 0.8 ? '⚠️ ใช้ไปเยอะแล้ว ประหยัดหน่อยน้า!' :
                         '✅ สภาพคล่องเยี่ยม ประหยัดมากจ้า!'}
                      </span>
                      <span className="font-bold">
                        {Math.round((summaryTotals.expense / monthlyBudgets[selectedMonth]) * 100)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-0.5 text-white/60 text-[9px] italic">
                    คุมะคุงแนะนำให้ตั้งงบประมาณเพื่อติดตามควบคุมรายจ่ายนะคุมะ 🧸✨
                  </div>
                )}
              </div>

              {/* Income vs Expense Grid */}
              <div className="grid grid-cols-2 gap-3.5 mt-3 pt-3 border-t border-white/15 relative z-10 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-white/15">
                    <TrendingUp size={13} />
                  </div>
                  <div>
                    <span className="block text-[9px] text-white/70">รายรับรวม (In)</span>
                    <span className="font-bold">฿{summaryTotals.income.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                  <div className="p-1.5 rounded-xl bg-white/15">
                    <TrendingDown size={13} />
                  </div>
                  <div>
                    <span className="block text-[9px] text-white/70">รายจ่ายรวม (Out)</span>
                    <span className="font-bold">฿{summaryTotals.expense.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats summaries banner */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-900' : 'bg-white border-slate-100 shadow-xs'}`}>
                <span className="text-[9px] text-slate-400 font-bold block">บันทึกทั้งหมดเดือนนี้</span>
                <span className="text-sm font-extrabold">{filteredList.length} รายการ</span>
              </div>
              <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-900' : 'bg-white border-slate-100 shadow-xs'}`}>
                <span className="text-[9px] text-slate-400 font-bold block">อัตราการออมสะสม</span>
                <span className="text-sm font-extrabold text-emerald-500">
                  {summaryTotals.income > 0 ? Math.round(((summaryTotals.income - summaryTotals.expense) / summaryTotals.income) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* SAVINGS GOALS SECTION */}
            <div className={`p-4 rounded-3xl border ${
              isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🎯</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">เป้าหมายการออมเงินสุดน่ารัก</span>
                </div>
                <button
                  onClick={() => {
                    setNewGoalName('');
                    setNewGoalTarget('');
                    setNewGoalCurrent('');
                    setNewGoalEmoji('🎯');
                    setIsSavingsModalOpen(true);
                  }}
                  className="text-[10px] font-extrabold text-rose-500 dark:text-amber-400 bg-rose-500/10 dark:bg-amber-400/15 px-2.5 py-1 rounded-lg transition-all active:scale-95"
                >
                  + เพิ่มเป้าหมาย
                </button>
              </div>

              {savingsGoals.length === 0 ? (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs italic">
                  ไม่มีเป้าหมายการออมเลย มาร่วมสร้างเป้าหมายแรกเพื่ออนาคตกับคุมะคุงกันนะ 🧸✨
                </div>
              ) : (
                <div className="space-y-3">
                  {savingsGoals.map(goal => {
                    const progressPercent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                    const isCompleted = goal.currentAmount >= goal.targetAmount;
                    return (
                      <div 
                        key={goal.id} 
                        className={`p-3 rounded-2xl border transition-all relative overflow-hidden ${
                          isDark ? 'bg-slate-950/60 border-slate-900' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        {isCompleted && (
                          <div className="absolute right-1 top-1 text-[18px] transform rotate-12 z-20" title="เป้าหมายสำเร็จแล้ว!">
                            👑
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg select-none">{goal.emoji}</span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{goal.name}</span>
                                {isCompleted && (
                                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    สำเร็จแล้ว! 🎉
                                  </span>
                                )}
                              </h4>
                              <p className="text-[9px] text-slate-400 font-semibold">
                                ฿{goal.currentAmount.toLocaleString()} / ฿{goal.targetAmount.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 z-10">
                            <button
                              onClick={() => {
                                setActiveGoalId(goal.id);
                                setGoalActionType('deposit');
                                setGoalActionAmount('');
                                setIsGoalActionModalOpen(true);
                              }}
                              className="p-1 px-2 rounded-lg text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all"
                            >
                              ฝาก 💰
                            </button>
                            <button
                              onClick={() => {
                                setActiveGoalId(goal.id);
                                setGoalActionType('withdraw');
                                setGoalActionAmount('');
                                setIsGoalActionModalOpen(true);
                              }}
                              className="p-1 px-2 rounded-lg text-[9px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-90 transition-all"
                            >
                              ถอน 💸
                            </button>
                            <button
                              onClick={() => {
                                showConfirm(
                                  'ลบเป้าหมายการออม 🗑️',
                                  'ลบเป้าหมายการออมเงินนี้ใช่ไหมคุมะ? เงินสะสมเดิมจะหายไปน้า 🧸💧',
                                  () => {
                                    setSavingsGoals(prev => prev.filter(g => g.id !== goal.id));
                                    addToast('ลบเป้าหมายการออมเรียบร้อยแล้วค้าบ 🗑️', 'info');
                                  }
                                );
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 transition-all active:scale-90"
                              title="ลบเป้าหมาย"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted 
                                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500' 
                                  : isDark ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                            <span>{isCompleted ? 'คุมะยินดีด้วยน้าเก่งสุดๆ! 🐻💖' : 'เป้าหมายอยู่ไม่ไกล สู้ๆ ครับ!'}</span>
                            <span className={isCompleted ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-300'}>
                              {progressPercent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* KUMA FINANCIAL INSIGHTS SECTION (SIMPLE SUMMARY BUBBLE ONLY) */}
            <div className={`p-4 rounded-3xl border ${
              isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">💡</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">คุมะคุงวิเคราะห์กระเป๋าเงินประจำเดือน</span>
                </div>
                <button
                  onClick={() => setActiveTab('insights')}
                  className="text-[9px] font-extrabold text-rose-500 dark:text-amber-400 bg-rose-500/10 dark:bg-amber-400/15 px-2 py-0.5 rounded-md hover:scale-105 transition-all"
                >
                  ดูบทวิเคราะห์เชิงลึก ➔
                </button>
              </div>

              {/* Dynamic advice bubble */}
              <div className={`p-3 rounded-2xl border text-xs flex gap-2.5 items-start ${
                kumaInsights.alertType === 'warning' 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300' 
                  : kumaInsights.alertType === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/20 text-slate-700 dark:text-slate-300'
              }`}>
                <span className="text-base select-none">🧸</span>
                <p className="font-semibold leading-relaxed">
                  {kumaInsights.advice}
                </p>
              </div>
            </div>

            {/* View mode switcher */}
            <div className={`p-1 rounded-2xl border flex mb-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <button
                onClick={() => setDashboardViewMode('list')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  dashboardViewMode === 'list'
                    ? isDark ? 'bg-slate-800 text-amber-400 shadow-xs' : 'bg-white text-rose-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                <List size={13} />
                <span>รายการบันทึก</span>
              </button>
              <button
                onClick={() => setDashboardViewMode('calendar')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  dashboardViewMode === 'calendar'
                    ? isDark ? 'bg-slate-800 text-amber-400 shadow-xs' : 'bg-white text-rose-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                <Calendar size={13} />
                <span>ปฏิทินรายเดือน</span>
              </button>
            </div>

            {/* Shared Filters Area */}
            {!selectedCalendarDay && (
              <div className="space-y-2.5 mb-3">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <span>ตัวกรองข้อมูล</span>
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-bold">
                        {filteredList.length} รายการ
                      </span>
                    </h3>

                    {/* Tab type filter switcher */}
                    <div className={`p-0.5 rounded-xl flex text-[10px] font-bold ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <button
                        onClick={() => { setFilterType('all'); setSelectedCategoryFilter('all'); }}
                        className={`px-2 py-1 rounded-lg ${filterType === 'all' ? 'bg-white shadow-xs text-slate-800 dark:bg-slate-800 dark:text-white' : 'text-slate-400'}`}
                      >
                        ทั้งหมด
                      </button>
                      <button
                        onClick={() => { setFilterType('income'); setSelectedCategoryFilter('all'); }}
                        className={`px-2 py-1 rounded-lg ${filterType === 'income' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400'}`}
                      >
                        รายรับ
                      </button>
                      <button
                        onClick={() => { setFilterType('expense'); setSelectedCategoryFilter('all'); }}
                        className={`px-2 py-1 rounded-lg ${filterType === 'expense' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-400'}`}
                      >
                        รายจ่าย
                      </button>
                    </div>
                  </div>

                  {/* Category Header Row with Toggle Button */}
                  <div className="flex justify-between items-center px-1 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                      <span>📁 ค้นหาตามหมวดหมู่</span>
                      {selectedCategoryFilter !== 'all' && (
                        <span className="text-[9px] bg-rose-500/10 text-rose-500 dark:bg-amber-500/15 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                          เลือกอยู่: {
                            (incomeCategories.find(c => c.id === selectedCategoryFilter)?.name || 
                             expenseCategories.find(c => c.id === selectedCategoryFilter)?.name || '')
                          }
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedCategoryFilter('all'); 
                              setSelectedSubCategoryFilter('all'); 
                            }}
                            className="hover:text-red-500 text-[10px] ml-0.5"
                            title="ล้างตัวกรอง"
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </span>
                    <button
                      onClick={toggleCategoriesCollapse}
                      className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg transition-all active:scale-95 border border-slate-200/50 dark:border-slate-800/60"
                    >
                      {isCategoriesCollapsed ? (
                        <>แสดงหมวดหมู่ ▾</>
                      ) : (
                        <>ซ่อนหมวดหมู่ ▴</>
                      )}
                    </button>
                  </div>

                  {/* Category Grid Filter (Extremely beautiful, organized & symmetric) */}
                  <motion.div
                    initial={false}
                    animate={{
                      height: isCategoriesCollapsed ? 0 : 'auto',
                      opacity: isCategoriesCollapsed ? 0 : 1,
                      marginTop: isCategoriesCollapsed ? 0 : '0.375rem'
                    }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className={`p-3 rounded-2xl border transition-all ${
                      isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50/40 border-slate-100 shadow-xs'
                    }`}>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          onClick={() => { setSelectedCategoryFilter('all'); setSelectedSubCategoryFilter('all'); }}
                          className={`p-1.5 rounded-xl text-[10px] font-extrabold transition-all border flex flex-col items-center justify-center gap-1 min-h-[58px] text-center ${
                            selectedCategoryFilter === 'all'
                              ? isDark
                                ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                                : 'bg-rose-500 border-rose-500 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-950 border-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base">📁</span>
                          <span className="truncate w-full text-center">ทั้งหมด</span>
                        </button>
                        {(filterType === 'income' ? incomeCategories : filterType === 'expense' ? expenseCategories : [...incomeCategories, ...expenseCategories]).map((cat, idx) => {
                          const isSelected = selectedCategoryFilter === cat.id;
                          const keySuffix = incomeCategories.some(c => c.id === cat.id) ? 'inc' : 'exp';
                          return (
                            <button
                              key={`${cat.id}-${keySuffix}-${idx}`}
                              onClick={() => { setSelectedCategoryFilter(cat.id); setSelectedSubCategoryFilter('all'); }}
                              className={`p-1.5 rounded-xl text-[10px] font-extrabold transition-all border flex flex-col items-center justify-center gap-1 min-h-[58px] text-center ${
                                isSelected
                                  ? isDark
                                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                                    : 'bg-rose-500 border-rose-500 text-white shadow-xs'
                                  : isDark
                                    ? 'bg-slate-950 border-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-base select-none">{cat.emoji}</span>
                              <span className="truncate w-full text-center">{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>

                  {/* Subcategory Filter (If category has subcategories) */}
                  {(() => {
                    const selectedCatInfo = (filterType === 'income' ? incomeCategories : expenseCategories)
                      .find(c => c.id === selectedCategoryFilter) || [...incomeCategories, ...expenseCategories]
                      .find(c => c.id === selectedCategoryFilter);

                    if (selectedCategoryFilter !== 'all' && selectedCatInfo && selectedCatInfo.subCategories && selectedCatInfo.subCategories.length > 0) {
                      return (
                        <div className={`p-3 rounded-2xl border transition-all space-y-1.5 ${
                          isDark ? 'bg-slate-900/30 border-slate-800/60' : 'bg-slate-100/40 border-slate-200/40 shadow-xs'
                        }`}>
                          <span className={`text-[10px] font-extrabold block uppercase tracking-wider flex items-center gap-1 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            <span>👤 เจาะจงหมวดย่อย / ผู้เกี่ยวข้อง:</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setSelectedSubCategoryFilter('all')}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all border shrink-0 ${
                                selectedSubCategoryFilter === 'all'
                                  ? isDark
                                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                                    : 'bg-rose-500 border-rose-500 text-white shadow-xs'
                                  : isDark
                                    ? 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              🌟 ทั้งหมดในหมวด
                            </button>
                            <button
                              onClick={() => setSelectedSubCategoryFilter('none')}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all border shrink-0 ${
                                selectedSubCategoryFilter === 'none'
                                  ? isDark
                                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                                    : 'bg-rose-500 border-rose-500 text-white shadow-xs'
                                  : isDark
                                    ? 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              👤 ไม่มีหมวดย่อย (ทั่วไป)
                            </button>
                            {selectedCatInfo.subCategories.map((sub, idx) => {
                              const isSelected = selectedSubCategoryFilter === sub;
                              return (
                                <button
                                  key={`${sub}-${idx}`}
                                  onClick={() => setSelectedSubCategoryFilter(sub)}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all border shrink-0 flex items-center gap-1 ${
                                    isSelected
                                      ? isDark
                                        ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                                        : 'bg-rose-500 border-rose-500 text-white shadow-xs'
                                      : isDark
                                        ? 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  👤 {sub}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Category summary banner */}
                  {categorySummary && (
                    <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between shadow-xs ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs ${categorySummary.bgColor} dark:bg-slate-800`}>
                          {categorySummary.emoji}
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            หมวดหมู่: {categorySummary.name}
                            {categorySummary.subCategory && ` • ย่อย: ${categorySummary.subCategory}`}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold">
                            เฉพาะ {categorySummary.subCategory ? `หมวดย่อย "${categorySummary.subCategory}"` : 'หมวดหมู่นี้'} ในเดือนนี้มี <span className="text-slate-500 dark:text-slate-300 font-extrabold">{categorySummary.count} รายการ</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">ยอดรวมเดือนนี้</span>
                          <span className={`text-xs font-extrabold ${categorySummary.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {categorySummary.type === 'income' ? '+' : '-'}฿{categorySummary.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => { setSelectedCategoryFilter('all'); setSelectedSubCategoryFilter('all'); }}
                          className="p-1 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all text-slate-400 dark:hover:bg-red-950/30"
                          title="ล้างตัวกรอง"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cute Search Input */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="ค้นหารายการ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`block w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border focus:outline-none ${
                        isDark
                          ? 'bg-slate-900 border-slate-900 text-white focus:border-amber-500'
                          : 'bg-white border-slate-200 text-slate-700 focus:border-rose-400'
                      }`}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Transaction List / Calendar Area */}
            {dashboardViewMode === 'calendar' ? (
              <div className={`p-4 rounded-3xl border transition-all ${
                isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-xs'
              }`}>
                {/* Calendar Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
                  {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, idx) => (
                    <div 
                      key={day} 
                      className={idx === 0 ? 'text-red-400' : idx === 6 ? 'text-sky-400' : ''}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((day, idx) => {
                    const dayData = dayFinanceMap[day.dateStr] || { income: 0, expense: 0, txs: [] };
                    const isToday = day.dateStr === getLocalDateString();
                    const opacityClass = day.isCurrentMonth ? '' : 'opacity-30';
                    
                    return (
                      <button
                        key={`${day.dateStr}-${idx}`}
                        onClick={() => {
                          setSelectedCalendarDay(day.dateStr);
                        }}
                        className={`min-h-[56px] p-1 rounded-xl border transition-all flex flex-col justify-between items-start text-left relative group ${opacityClass} ${
                          isToday
                            ? isDark
                              ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/20'
                              : 'bg-rose-50 border-rose-300 ring-1 ring-rose-400/20'
                            : isDark
                              ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {/* Day Number and count badge */}
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[9px] font-extrabold ${
                            isToday 
                              ? isDark ? 'text-amber-400' : 'text-rose-500'
                              : idx % 7 === 0 
                                ? 'text-red-400' 
                                : idx % 7 === 6 
                                  ? 'text-sky-400' 
                                  : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {day.dayNum}
                          </span>
                          {dayData.txs.length > 0 && (
                            <span className="text-[7px] font-bold bg-slate-150 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1 rounded-full scale-90">
                              {dayData.txs.length}
                            </span>
                          )}
                        </div>

                        {/* Compact income/expense summary inside the cell */}
                        <div className="w-full space-y-0.5 mt-0.5">
                          {dayData.income > 0 && (
                            <div className="text-[7px] font-black text-emerald-500 dark:text-emerald-400 truncate leading-none">
                              +{dayData.income >= 1000 ? `${(dayData.income / 1000).toFixed(dayData.income % 1000 === 0 ? 0 : 1)}k` : dayData.income}
                            </div>
                          )}
                          {dayData.expense > 0 && (
                            <div className="text-[7px] font-black text-rose-500 dark:text-rose-400 truncate leading-none">
                              -{dayData.expense >= 1000 ? `${(dayData.expense / 1000).toFixed(dayData.expense % 1000 === 0 ? 0 : 1)}k` : dayData.expense}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Detail Modal popup */}
                {selectedCalendarDay && (() => {
                  const dayData = dayFinanceMap[selectedCalendarDay] || { income: 0, expense: 0, txs: [] };
                  const formattedDate = (() => {
                    const [y, m, d] = selectedCalendarDay.split('-');
                    const months = [
                      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
                    ];
                    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${parseInt(y) + 543}`;
                  })();

                  return (
                    <div 
                      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in"
                      onClick={() => setSelectedCalendarDay(null)}
                    >
                      <div 
                        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl border p-5 space-y-4 shadow-2xl transition-all scale-in max-h-[85vh] overflow-y-auto ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🧸📝</span>
                            <div>
                              <h3 className="text-sm font-extrabold">รายการของวันที่ {formattedDate}</h3>
                              <p className="text-[10px] text-slate-400 font-bold">
                                มีทั้งหมด {dayData.txs.length} รายการสำหรับวันนี้ครับ
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedCalendarDay(null)}
                            className={`p-1.5 rounded-xl border transition-all ${
                              isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Day's income vs expense summary */}
                        {dayData.txs.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                            <div className="bg-emerald-500/10 text-emerald-500 py-1.5 px-3 rounded-xl border border-emerald-500/20">
                              รายรับ: +฿{dayData.income.toLocaleString()}
                            </div>
                            <div className="bg-rose-500/10 text-rose-500 py-1.5 px-3 rounded-xl border border-rose-500/20">
                              รายจ่าย: -฿{dayData.expense.toLocaleString()}
                            </div>
                          </div>
                        )}

                        {/* Transaction list for this day */}
                        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                          {dayData.txs.length === 0 ? (
                            <div className="py-8 text-center space-y-2">
                              <span className="text-4xl block animate-bounce">🍃</span>
                              <p className="text-xs text-slate-400 font-bold">ไม่มีรายการบันทึกของวันนี้เลยน้า</p>
                            </div>
                          ) : (
                            dayData.txs.map(t => {
                              const catDetails = getCategoryDetailsDynamic(t.category, t.type);
                              return (
                                <div 
                                  key={t.id}
                                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/60 border-slate-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${catDetails.bgColor}`}>
                                      {catDetails.emoji}
                                    </div>
                                    <div className="min-w-0">
                                      <span className={`text-xs font-bold block truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                        {t.description}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                                        <span>{catDetails.name}{t.subCategory ? ` • ${t.subCategory}` : ''}</span>
                                        <span>•</span>
                                        <span>{t.time}</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span className={`text-xs font-extrabold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {t.type === 'income' ? '+' : '-'}฿{t.amount.toLocaleString()}
                                    </span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedCalendarDay(null);
                                          handleEditClick(t);
                                        }}
                                        className="p-1 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all dark:bg-blue-950/30 dark:text-blue-400"
                                        title="แก้ไข"
                                      >
                                        <Edit3 size={11} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedCalendarDay(null);
                                          handleDeleteTransaction(t.id);
                                        }}
                                        className="p-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all dark:bg-red-950/30 dark:text-red-400"
                                        title="ลบ"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Action Button: Add transaction for this day */}
                        <button
                          onClick={() => {
                            setSelectedCalendarDay(null);
                            setDefaultAddDate(selectedCalendarDay);
                            setEditingTransaction(null);
                            setActiveTab('add');
                            addToast(`เตรียมบันทึกรายการสำหรับวันที่ ${formattedDate} แล้วครับ 📝🧸`, 'info');
                          }}
                          className={`w-full py-2.5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm bg-gradient-to-r ${
                            isDark ? 'from-amber-500 to-orange-500' : 'from-rose-400 to-pink-500'
                          }`}
                        >
                          <Plus size={14} />
                          <span>เพิ่มรายการลืมจดของวันนี้</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Transactions Map */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar pr-1 pb-1">
                  {filteredList.length === 0 ? (
                    <div className={`p-8 rounded-2xl border text-center ${isDark ? 'bg-slate-900/20 border-slate-900' : 'bg-white border-slate-100'} text-slate-400 text-xs flex flex-col items-center justify-center`}>
                      <span className="text-3xl mb-1 filter drop-shadow-sm">🧸💧</span>
                      <p className="font-bold">ไม่มีประวัติสำหรับหมวดหมู่นี้ในเดือนนี้เลยน้า</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">กดบวกด้านล่างเพื่อเพิ่มข้อมูลใหม่ได้เลยค้าบ</p>
                    </div>
                  ) : (
                    filteredList.map((t) => {
                      const catDetail = getCategoryDetailsDynamic(t.category, t.type);
                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between transition-all hover:scale-101 duration-150 relative ${
                            isDark 
                              ? 'bg-slate-900/50 border-slate-900 hover:bg-slate-900/80' 
                              : 'bg-white border-slate-100 hover:bg-slate-50/50 hover:shadow-xs'
                          }`}
                        >
                          {/* Left Info Column */}
                          <div className="flex items-center gap-3">
                            {/* Emoji bubble */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-xs ${catDetail.bgColor} dark:bg-slate-800`}>
                              {catDetail.emoji}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{catDetail.name}{t.subCategory ? ` • ${t.subCategory}` : ''}</span>
                                {t.isRecurring && (
                                  <span className="text-[8px] font-extrabold bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                                    <Repeat size={8} /> ประจำเดือน
                                  </span>
                                )}
                                {t.recurringParentId && (
                                  <span className="text-[8px] font-extrabold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                                    <Repeat size={8} /> ออโต้
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold leading-none">{t.description}</p>
                              <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                                <Clock size={9} /> {t.date} | {t.time}
                              </span>
                            </div>
                          </div>

                          {/* Slip Image Thumbnail */}
                          {((t.slipImages && t.slipImages.length > 0) || t.slipImage) && (
                            <div className="flex items-center gap-1 ml-auto mr-2 shrink-0">
                              {(() => {
                                const images = t.slipImages && t.slipImages.length > 0 
                                  ? t.slipImages 
                                  : t.slipImage 
                                    ? [t.slipImage] 
                                    : [];
                                const maxVisible = 2;
                                const extraCount = images.length - maxVisible;
                                return (
                                  <>
                                    {images.slice(0, maxVisible).map((imgSrc, imgIdx) => {
                                      const isLast = imgIdx === maxVisible - 1 && extraCount > 0;
                                      return (
                                        <button
                                          key={imgIdx}
                                          onClick={() => setSelectedSlipUrl(imgSrc)}
                                          className="relative group w-8 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 transition-all active:scale-95 shadow-2xs hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20"
                                          title={`ดูรูปภาพสลิปที่ ${imgIdx + 1}`}
                                        >
                                          <img src={imgSrc} alt={`slip thumbnail ${imgIdx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          {isLast ? (
                                            <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                                              <span className="text-[10px] font-extrabold text-white">+{extraCount}</span>
                                            </div>
                                          ) : (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                              <Eye size={10} className="text-white" />
                                            </div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Right Value & Edit/Delete Buttons Column */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-sm font-extrabold pr-1.5 ${
                              t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {t.type === 'income' ? '+' : '-'}฿{t.amount.toLocaleString(undefined, {minimumFractionDigits: 1})}
                            </span>

                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditClick(t)}
                                className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                                title="แก้ไขรายการ"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1.5 rounded-lg border border-rose-100/50 hover:bg-rose-50 text-rose-400 hover:text-rose-600 dark:border-slate-800 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-colors"
                                title="ลบรายการ"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: ADD / EDIT TRANSACTION */}
        {activeTab === 'add' && (
          <div className="slide-up">
            <div className={`p-4 rounded-3xl border transition-all ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">📝</span>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {editingTransaction ? 'แก้ไขรายการบัญชี' : 'บันทึกรายรับ-รายจ่าย'}
                  </h3>
                </div>
                {editingTransaction && (
                  <button 
                    onClick={handleCancelEdit}
                    className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <TransactionForm
                onSave={handleSaveTransaction}
                editingTransaction={editingTransaction}
                onCancelEdit={handleCancelEdit}
                isDark={isDark}
                primaryBtnClass={currentTheme.primary}
                addToast={addToast}
                defaultDate={defaultAddDate}
                incomeCategories={incomeCategories}
                expenseCategories={expenseCategories}
              />
            </div>
          </div>
        )}

        {/* VIEW: STATISTICS */}
        {activeTab === 'stats' && (
          <div className="slide-up">
            <FinancialCharts
              transactions={transactions}
              isDark={isDark}
              selectedMonth={selectedMonth}
              incomeCategories={incomeCategories}
              expenseCategories={expenseCategories}
            />
          </div>
        )}

        {/* VIEW: KUMA FINANCIAL INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="space-y-4 slide-up pb-6">
            {/* Cute Header Card */}
            <div className={`p-4 rounded-3xl border text-center relative overflow-hidden ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="absolute top-2 right-2 opacity-15 text-5xl select-none pointer-events-none">🧠</div>
              <div className="text-4xl mb-1.5 select-none animate-bounce">🧸💡</div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-sans">
                คุมะคุงวิเคราะห์กระเป๋าเงินเชิงลึก 4 มิติ
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                ระบบคำนวณและวิเคราะห์พฤติกรรมการออม การใช้จ่าย และงบประมาณแบบเรียลไทม์
              </p>
            </div>

            {/* Month Selector inside Insights */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-900/20 border-slate-900' : 'bg-slate-50 border-slate-100'
            }`}>
              <button 
                onClick={handlePrevMonth}
                className={`py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all active:scale-90 ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-xs hover:bg-slate-100'
                }`}
              >
                ◀ ก่อนหน้า
              </button>
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                <Calendar size={13} className="text-rose-500 dark:text-amber-400" />
                <span>ประจำเดือน: {thaiMonthName}</span>
              </div>
              <button 
                onClick={handleNextMonth}
                className={`py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all active:scale-90 ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-xs hover:bg-slate-100'
                }`}
              >
                ถัดไป ▶
              </button>
            </div>

            {/* Dynamic 4 advice cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  คำแนะนำทางการเงินแบบเฉพาะตัว
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full select-none">
                  เรียลไทม์ (Real-time) ✨
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {kumaInsights.advicesList && kumaInsights.advicesList.map((adv) => (
                  <div 
                    key={adv.id}
                    className={`p-3.5 rounded-3xl border text-xs flex gap-3 items-start transition-all hover:scale-[1.01] shadow-xs ${
                      adv.status === 'warn' 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300' 
                        : adv.status === 'good'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/20 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-2xl select-none shrink-0 mt-0.5">{adv.emoji}</span>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                        <span>{adv.title}</span>
                      </h4>
                      <p className="font-semibold leading-relaxed text-[11px] opacity-90">
                        {adv.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis card for category distribution */}
            <div className={`p-4 rounded-3xl border ${
              isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-center gap-1.5 mb-3.5">
                <span className="text-sm">📊</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 font-sans">
                  สัดส่วนและอันดับค่าใช้จ่ายสูงสุดของเดือน
                </span>
              </div>

              {kumaInsights.topExpenses.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider px-0.5">
                    <span>อันดับค่าใช้จ่าย</span>
                    <span>จำนวนเงิน / สัดส่วน (%)</span>
                  </div>

                  <div className="space-y-2">
                    {kumaInsights.topExpenses.map((exp, idx) => (
                      <div 
                        key={exp.id} 
                        className={`p-3 rounded-2xl border space-y-2 transition-all ${
                          isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-slate-50/60 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-extrabold w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">{idx + 1}</span>
                            <span className="text-base select-none">{exp.emoji}</span>
                            <span className="text-slate-700 dark:text-slate-200">{exp.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-800 dark:text-slate-100">฿{exp.amount.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">({exp.percentage}%)</span>
                          </div>
                        </div>
                        {/* Progress visual */}
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-amber-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${exp.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Footer */}
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[10px] text-slate-400 font-bold px-0.5">
                    <div className="flex justify-between">
                      <span>ยอดจ่ายรวมทั้งหมดในเดือนนี้:</span>
                      <span className="text-rose-500 dark:text-rose-400 font-extrabold">฿{summaryTotals.expense.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ยอดจ่ายเฉลี่ยเฉพาะวันที่ใช้จ่ายจริง:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">฿{Math.round(kumaInsights.dailyAverage).toLocaleString()} / วัน</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs italic">
                  ไม่มีประวัติการใช้จ่ายในเดือนนี้เลยน้า บันทึกรายการเพื่อเริ่มการวิเคราะห์เชิงลึกจ้า 🧸✨
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS & EXPORT */}
        {activeTab === 'settings' && (
          <div className="space-y-4 slide-up pb-6">
            
            {/* 0. Kuma Account Card (Username/Password authentication status) */}
            <div className={`p-4 rounded-3xl border transition-all ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-50 text-rose-500'}`}>
                    <User size={16} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      บัญชีของฉัน (Kuma Account)
                    </h3>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                      เข้าสู่ระบบเพื่อความปลอดภัยและเชื่อมข้อมูลคลาวด์
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${loggedInUser ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                  <span className="text-[9px] font-bold text-slate-400">
                    {loggedInUser ? 'เข้าสู่ระบบแล้ว' : 'ยังไม่ได้เข้าสู่ระบบ'}
                  </span>
                </div>
              </div>

              {loggedInUser ? (
                <div className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-rose-50/30 border-rose-100/50'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl animate-cute-float select-none">🧸</span>
                      <div>
                        <p className={`text-xs font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          คุณ {loggedInUser}
                        </p>
                        <p className="text-[9px] font-semibold text-slate-400">
                          สมาชิกคุมะคิงระดับโกลด์ ✨
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className={`py-1.5 px-3 rounded-xl text-[10px] font-extrabold text-white transition-all active:scale-95 bg-red-500 hover:bg-red-600 shadow-xs flex items-center gap-1`}
                    >
                      <LogOut size={11} />
                      ออกจากระบบ
                    </button>
                  </div>
                  <div className="text-[9px] text-slate-400 leading-relaxed font-semibold">
                    💡 รายการรายรับ-รายจ่ายของคุณทั้งหมดกำลังถูกสำรองไว้ภายใต้บัญชีนี้และซิงค์อย่างปลอดภัยเรียบร้อยครับ!
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`p-3 rounded-2xl text-[11px] font-semibold leading-relaxed ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-400' : 'bg-slate-50 border border-slate-100 text-slate-600'
                  }`}>
                    สมัครสมาชิกและเข้าสู่ระบบง่ายๆ ด้วย Username & Password ของคุณ เพื่อบันทึกข้อมูลถาวร และแชร์ยอดบัญชีเดียวกันข้ามโทรศัพท์ อุปกรณ์ iOS/Android ได้ทันทีน้า 🧸☁️
                  </div>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className={`w-full py-2.5 px-4 rounded-2xl text-xs font-extrabold text-white transition-all active:scale-97 flex items-center justify-center gap-1.5 shadow-sm ${
                      isDark 
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' 
                        : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10'
                    }`}
                  >
                    <LogIn size={13} />
                    เข้าสู่ระบบ / สมัครสมาชิกใหม่
                  </button>
                </div>
              )}
            </div>

            {/* 1. Theme Picker Card */}
            <div className={`p-4 rounded-3xl border transition-all ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-50 text-rose-500'}`}>
                  <Palette size={16} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    แต่งตัวให้สมุดบัญชี (Custom Theme)
                  </h3>
                  <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    เลือกโทนสีน่ารักที่คุณชอบได้ตามใจเลยครับ
                  </p>
                </div>
              </div>

              {/* Theme buttons grid */}
              <div className="grid grid-cols-2 gap-2">
                {APP_THEMES.map((theme) => {
                  const isSelected = selectedThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`p-3 rounded-2xl border text-left text-xs font-bold flex items-center justify-between transition-all duration-200 active:scale-97 ${
                        isSelected
                          ? isDark
                            ? 'bg-slate-800 border-amber-500 shadow-sm'
                            : `${theme.secondary.split(' ')[0]} ${theme.borderColor} shadow-xs`
                          : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{theme.emoji}</span>
                        <span className="truncate max-w-[100px]">{theme.name.split(' ')[0]}</span>
                      </div>
                      {isSelected && <span className={`text-[10px] ${theme.accent.split(' ')[0]}`}>✔️</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PWA App Icon Installation Guide Card */}
            <div className={`p-4 rounded-3xl border transition-all ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-50 text-rose-500'}`}>
                  <Smartphone size={16} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    ติดตั้งแอปบนมือถือ (Install App Icon) 📲
                  </h3>
                  <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    สร้างทางลัดเป็นไอคอนแอปบนหน้าจอมือถือของคุณ สะดวก รวดเร็ว เหมือนแอปจริง!
                  </p>
                </div>
              </div>

              {/* Install button if prompt is available */}
              {showInstallBtn ? (
                <button
                  onClick={handleInstallClick}
                  className={`w-full py-2.5 px-4 mb-3 rounded-2xl text-xs font-extrabold text-white transition-all active:scale-97 flex items-center justify-center gap-1.5 shadow-sm animate-pulse ${
                    isDark 
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' 
                      : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10'
                  }`}
                >
                  📥 ติดตั้งแอป Kuma Wallet ทันที
                </button>
              ) : null}

              {/* iOS / Android tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 mb-3 rounded-2xl bg-slate-100 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setPwaTab('ios')}
                  className={`py-1.5 text-[10px] font-extrabold rounded-xl transition-all ${
                    pwaTab === 'ios'
                      ? isDark
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-rose-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  🍎 iOS (iPhone / iPad)
                </button>
                <button
                  type="button"
                  onClick={() => setPwaTab('android')}
                  className={`py-1.5 text-[10px] font-extrabold rounded-xl transition-all ${
                    pwaTab === 'android'
                      ? isDark
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-rose-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  🤖 Android (Chrome)
                </button>
              </div>

              {/* Tab content */}
              <div className={`p-3 rounded-2xl text-[10px] font-semibold leading-relaxed space-y-2 ${
                isDark ? 'bg-slate-950/40 border border-slate-900 text-slate-400' : 'bg-slate-50/50 border border-slate-100 text-slate-600'
              }`}>
                {pwaTab === 'ios' ? (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="bg-rose-100 dark:bg-slate-800 text-rose-500 dark:text-amber-400 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <p>เปิดสมุดบัญชีนี้ด้วยเบราว์เซอร์ <strong className="text-slate-800 dark:text-slate-200">Safari</strong> บน iPhone/iPad 🧭</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-rose-100 dark:bg-slate-800 text-rose-500 dark:text-amber-400 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <p>กดปุ่ม <strong className="text-slate-800 dark:text-slate-200">"แชร์" (Share)</strong> 📤 ที่แถบเครื่องมือด้านล่าง</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-rose-100 dark:bg-slate-800 text-rose-500 dark:text-amber-400 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <p>เลื่อนลงมาแล้วกดปุ่ม <strong className="text-slate-800 dark:text-slate-200">"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong> ➕</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-rose-100 dark:bg-slate-800 text-rose-500 dark:text-amber-400 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <p>คุณจะได้รับไอคอน <strong className="text-slate-800 dark:text-slate-200">Kuma Wallet 🧸</strong> บนหน้าจอ พร้อมใช้งานเหมือนแอปจริงทันที!</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="bg-rose-100 dark:bg-slate-800 text-rose-500 dark:text-amber-400 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <p>เปิดสมุดบัญชีนี้ด้วยเบราว์เซอร์ <strong className="text-slate-800 dark:text-slate-200">Google Chrome</strong> 🤖</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-rose-100 dark:bg-slate-800 text-rose-500 dark:text-amber-400 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <p>กดปุ่มเมนู <strong className="text-slate-800 dark:text-slate-200">3 จุด (More)</strong> ขวาบนของ Chrome</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-rose-100 dark:bg-slate-800 text-rose-500 dark:text-amber-400 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <p>เลือกเมนู <strong className="text-slate-800 dark:text-slate-200">"ติดตั้งแอป" (Install App)</strong> หรือ <strong className="text-slate-800 dark:text-slate-200">"เพิ่มลงในหน้าจอหลัก"</strong> ➕</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-rose-100 dark:bg-slate-800 text-rose-500 dark:text-amber-400 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <p>ไอคอนน้องหมี <strong className="text-slate-800 dark:text-slate-200">Kuma Wallet 🧸</strong> จะไปโลดแล่นอยู่บนหน้าจอโทรศัพท์ของคุณครับ!</p>
                    </div>
                  </>
                )}
              </div>
            </div>


            {/* Category Customization Manager */}
            <CategoryManager
              incomeCategories={incomeCategories}
              expenseCategories={expenseCategories}
              onChange={handleCategoriesChange}
              isDark={isDark}
              accentClass={currentTheme.accent}
            />

            {/* 2. Monthly Export Panel */}
            <ExportPanel
              transactions={transactions}
              isDark={isDark}
              selectedMonth={selectedMonth}
              primaryBtnClass={currentTheme.primary}
              addToast={addToast}
            />

            {/* 3. Automatic Cloud Backup Panel */}
            <CloudSyncPanel
              syncKey={syncKey}
              lastSyncedAt={lastSyncedAt}
              isDark={isDark}
              onSyncNow={handleManualSyncNow}
              onRestoreWithKey={handleRestoreWithKey}
              isSyncing={isSyncing}
              accentClass={currentTheme.accent}
              secondaryBtnClass={currentTheme.secondary}
            />

            {/* 4. Reminder Settings Panel */}
            <ReminderPanel
              settings={reminderSettings}
              onSaveSettings={handleSaveReminderSettings}
              isDark={isDark}
              onTriggerTestNotification={handleTriggerTestNotification}
              accentClass={currentTheme.accent}
              enabledBgClass={currentTheme.primary.split(' ')[0]}
              primaryBtnClass={currentTheme.primary}
            />

            {/* 5. Danger Zone / Reset Data */}
            <div className={`p-4 rounded-3xl border transition-all ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-xl bg-red-500/10 text-red-500`}>
                  <Trash2 size={16} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    ล้างข้อมูลเพื่อเริ่มใหม่ (Danger Zone)
                  </h3>
                  <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    ลบข้อมูลรายการเดินบัญชีทั้งหมด เพื่อเริ่มต้นนับหนึ่งใหม่
                  </p>
                </div>
              </div>

              <button
                onClick={handleResetAllData}
                className="w-full py-2.5 px-4 rounded-2xl text-xs font-extrabold text-white bg-red-500 hover:bg-red-600 active:scale-97 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Trash2 size={14} />
                ล้างข้อมูลทั้งหมดเพื่อเริ่มใหม่
              </button>
            </div>
          </div>
        )}

      </main>

      {/* --- Bottom App Navigation Bar (Standard iOS / Android Style) --- */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t py-1.5 transition-colors duration-200 ${
        isDark ? 'bg-slate-950 border-slate-900' : `${currentTheme.cardBg} ${currentTheme.borderColor} shadow-lg`
      }`}>
        <div className="max-w-md mx-auto px-4 flex justify-between items-center text-[9px] font-bold">
          
          {/* Menu Home/Dashboard */}
          <button
            onClick={() => { setActiveTab('dashboard'); setEditingTransaction(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
              activeTab === 'dashboard'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Home size={18} />
            <span>หน้าหลัก</span>
          </button>

          {/* Menu Stats */}
          <button
            onClick={() => { setActiveTab('stats'); setEditingTransaction(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
              activeTab === 'stats'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <BarChart2 size={18} />
            <span>สถิติ</span>
          </button>

          {/* Menu Add Transaction (Middle Button) */}
          <button
            onClick={() => { setActiveTab('add'); setDefaultAddDate(undefined); }}
            className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
              activeTab === 'add'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 -mt-3 shadow-md border-3 transition-transform ${
              currentTheme.primary.split(' ')[0]
            } ${
              currentTheme.primary.split(' ')[1]
            } ${
              isDark ? 'border-slate-950' : 'border-white'
            }`}>
              <Plus size={18} className="text-white" />
            </div>
            <span>จดบัญชี</span>
          </button>

          {/* Menu Insights (New Tab) */}
          <button
            onClick={() => { setActiveTab('insights'); setEditingTransaction(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
              activeTab === 'insights'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Lightbulb size={18} />
            <span>คุมะวิเคราะห์</span>
          </button>

          {/* Menu Settings */}
          <button
            onClick={() => { setActiveTab('settings'); setEditingTransaction(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
              activeTab === 'settings'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Settings size={18} />
            <span>ตั้งค่า</span>
          </button>

        </div>
      </nav>

      {/* Custom Theme-matched Confirmation Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className={`w-full max-w-xs rounded-3xl border p-5 space-y-4 shadow-xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="text-4xl">🧸</div>
              <h3 className="text-sm font-extrabold tracking-tight">
                {confirmDialog.title}
              </h3>
              <p className={`text-xs font-semibold leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {confirmDialog.message}
              </p>
            </div>
            
            <div className="flex gap-2 pt-2">
              {confirmDialog.cancelText && (
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {confirmDialog.cancelText}
                </button>
              )}
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold text-white transition-all active:scale-95 ${
                  confirmDialog.title.includes('เตือน') || confirmDialog.title.includes('ลบ') || confirmDialog.title.includes('🗑️')
                    ? 'bg-red-500 hover:bg-red-600 shadow-sm'
                    : currentTheme.primary.split(' ')[0]
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Bank Slip Preview Modal */}
      {selectedSlipUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedSlipUrl(null)}
        >
          <div 
            className={`w-full max-w-sm rounded-3xl overflow-hidden border p-4 transition-all shadow-xl scale-in ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🧾</span>
                <h4 className="text-xs font-bold">สลิปธนาคารที่คุณแนบไว้</h4>
              </div>
              <button 
                onClick={() => setSelectedSlipUrl(null)}
                className={`p-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-700'
                }`}
              >
                <X size={14} />
              </button>
            </div>

            {/* Slip Image Container */}
            <div className="relative w-full aspect-3/4 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-center shadow-inner">
              <img 
                src={selectedSlipUrl} 
                alt="Bank slip full preview" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setSelectedSlipUrl(null)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 text-center ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                ปิดหน้าต่าง
              </button>
              <a
                href={selectedSlipUrl}
                download="bank-slip.png"
                className={`flex-1 py-2 rounded-xl text-xs font-bold text-white text-center flex items-center justify-center gap-1.5 active:scale-95 shadow-sm ${
                  currentTheme.primary.split(' ')[0]
                }`}
              >
                <Download size={12} /> ดาวน์โหลดรูป
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 MODAL: SET BUDGET */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`w-full max-w-sm rounded-3xl p-5 border shadow-xl ${
            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                <span>🎯 ตั้งงบรายจ่ายรายเดือน</span>
              </h3>
              <button 
                onClick={() => setIsBudgetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4 font-semibold">
              กำหนดเป้าหมายค่าใช้จ่ายสำหรับเดือนนี้เพื่อให้คุมะคุงช่วยเตือนเมื่อคุณเริ่มใช้เยอะเกินไปนะค้าบ 🧸
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">จำนวนเงินงบประมาณ (บาท)</label>
                <input 
                  type="number"
                  placeholder="เช่น 10000"
                  value={budgetInputValue}
                  onChange={(e) => setBudgetInputValue(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-hidden transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' 
                      : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-rose-500'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsBudgetModalOpen(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    isDark ? 'bg-slate-900 hover:bg-slate-850' : 'bg-slate-100 hover:bg-slate-150'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    const amount = parseFloat(budgetInputValue);
                    if (isNaN(amount) || amount <= 0) {
                      addToast('กรุณากรอกจำนวนเงินให้ถูกต้องและมากกว่า 0 นะค้าบ 🧸💧', 'error');
                      return;
                    }
                    const nextBudgets = { ...monthlyBudgets };
                    nextBudgets[selectedMonth] = amount;
                    setMonthlyBudgets(nextBudgets);
                    setIsBudgetModalOpen(false);
                    triggerMascotReaction('celebrate', `ตั้งงบประมาณรายจ่ายเดือนนี้เรียบร้อยแล้วน้าคุมะ! ยอดรวมคือ ฿${amount.toLocaleString()} สู้ๆ นะค้าบ 🎉🧸🏆`);
                    addToast('ตั้งงบประมาณเรียบร้อยแล้วคุมะ! 🎉', 'success');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 ${
                    selectedThemeId === 'cherry' ? 'bg-rose-500' :
                    selectedThemeId === 'matcha' ? 'bg-emerald-500' :
                    selectedThemeId === 'blueberry' ? 'bg-sky-500' :
                    selectedThemeId === 'peach' ? 'bg-amber-500' :
                    selectedThemeId === 'natural' ? 'bg-[#7B9978]' : 'bg-slate-800'
                  }`}
                >
                  บันทึกงบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 MODAL: ADD SAVINGS GOAL */}
      {isSavingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`w-full max-w-sm rounded-3xl p-5 border shadow-xl ${
            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                <span>🎯 สร้างเป้าหมายการออมเงินใหม่</span>
              </h3>
              <button 
                onClick={() => setIsSavingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">อิโมจิเป้าหมาย</label>
                <div className="flex gap-1.5 overflow-x-auto py-1">
                  {['🎯', '✈️', '🏕️', '📱', '💻', '🚗', '🏠', '🎮', '🏍️', '☕', '🍩', '🛍️'].map(emo => (
                    <button
                      key={emo}
                      onClick={() => setNewGoalEmoji(emo)}
                      className={`text-lg p-2 rounded-xl transition-all border ${
                        newGoalEmoji === emo 
                          ? isDark ? 'bg-amber-500/20 border-amber-500' : 'bg-rose-500/10 border-rose-500' 
                          : 'border-transparent'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ชื่อเป้าหมาย</label>
                <input 
                  type="text"
                  placeholder="เช่น เที่ยวญี่ปุ่น, ซื้อนินเทนโดสวิตช์"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-hidden transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' 
                      : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-rose-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">ยอดเป้าหมาย (บาท)</label>
                  <input 
                    type="number"
                    placeholder="เช่น 10000"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-hidden transition-all ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' 
                        : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-rose-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">ยอดเริ่มต้นสะสม (บาท)</label>
                  <input 
                    type="number"
                    placeholder="เช่น 0 หรือ 500"
                    value={newGoalCurrent}
                    onChange={(e) => setNewGoalCurrent(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-hidden transition-all ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' 
                        : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsSavingsModalOpen(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    isDark ? 'bg-slate-900 hover:bg-slate-850' : 'bg-slate-100 hover:bg-slate-150'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    const targetAmt = parseFloat(newGoalTarget);
                    const currentAmt = parseFloat(newGoalCurrent || '0');
                    if (!newGoalName.trim()) {
                      addToast('กรุณากรอกชื่อเป้าหมายด้วยนะค้าบ 🧸', 'error');
                      return;
                    }
                    if (isNaN(targetAmt) || targetAmt <= 0) {
                      addToast('ยอดเป้าหมายต้องมากกว่า 0 นะค้าบ 🧸💧', 'error');
                      return;
                    }
                    if (isNaN(currentAmt) || currentAmt < 0) {
                      addToast('ยอดสะสมเริ่มต้นต้องไม่ติดลบน้า 🧸', 'error');
                      return;
                    }

                    const nextGoal: SavingsGoal = {
                      id: 'goal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                      name: newGoalName.trim(),
                      targetAmount: targetAmt,
                      currentAmount: currentAmt,
                      emoji: newGoalEmoji,
                      createdAt: Date.now()
                    };

                    setSavingsGoals(prev => [nextGoal, ...prev]);
                    setIsSavingsModalOpen(false);
                    triggerMascotReaction('celebrate', `ว้าว! สร้างเป้าหมายการออม "${newGoalEmoji} ${newGoalName.trim()}" สำเร็จแล้วน้าคุมะ ขอให้เก็บออมได้ไวๆ คุมะคุงคอยเชียร์น้า 🎉🧸🌟`);
                    addToast('สร้างเป้าหมายการออมเงินใหม่เรียบร้อยแล้ว! 🎉', 'success');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 ${
                    selectedThemeId === 'cherry' ? 'bg-rose-500' :
                    selectedThemeId === 'matcha' ? 'bg-emerald-500' :
                    selectedThemeId === 'blueberry' ? 'bg-sky-500' :
                    selectedThemeId === 'peach' ? 'bg-amber-500' :
                    selectedThemeId === 'natural' ? 'bg-[#7B9978]' : 'bg-slate-800'
                  }`}
                >
                  สร้างเป้าหมาย
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 MODAL: GOAL ACTION (DEPOSIT / WITHDRAW) */}
      {isGoalActionModalOpen && (() => {
        const goal = savingsGoals.find(g => g.id === activeGoalId);
        if (!goal) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-5 border shadow-xl ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                  <span>{goalActionType === 'deposit' ? '💰 ฝากเงินเข้าเป้าหมาย' : '💸 ถอนเงินจากเป้าหมาย'}</span>
                </h3>
                <button 
                  onClick={() => setIsGoalActionModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl text-center mb-3 text-xs">
                <span className="text-base select-none mr-1.5">{goal.emoji}</span>
                <span className="font-extrabold">{goal.name}</span>
                <span className="block text-[10px] text-slate-400 mt-1 font-bold">
                  สะสมอยู่: ฿{goal.currentAmount.toLocaleString()} / ฿{goal.targetAmount.toLocaleString()}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">จำนวนเงิน (บาท)</label>
                  <input 
                    type="number"
                    placeholder="ใส่จำนวนเงินที่นี่..."
                    value={goalActionAmount}
                    onChange={(e) => setGoalActionAmount(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-hidden transition-all ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' 
                        : 'bg-slate-50 border-slate-150 text-slate-800 focus:border-rose-500'
                    }`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsGoalActionModalOpen(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      isDark ? 'bg-slate-900 hover:bg-slate-850' : 'bg-slate-100 hover:bg-slate-150'
                    }`}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      const amount = parseFloat(goalActionAmount);
                      if (isNaN(amount) || amount <= 0) {
                        addToast('กรุณากรอกจำนวนเงินให้ถูกต้องและมากกว่า 0 นะค้าบ 🧸💧', 'error');
                        return;
                      }

                      let nextAmt = goal.currentAmount;
                      if (goalActionType === 'deposit') {
                        nextAmt += amount;
                      } else {
                        if (amount > goal.currentAmount) {
                          addToast('ถอนเงินออกมากกว่ายอดสะสมที่มีไม่ได้นะคุมะ! 🧸💧', 'error');
                          return;
                        }
                        nextAmt -= amount;
                      }

                      // Check if complete
                      const completedJustNow = goalActionType === 'deposit' && nextAmt >= goal.targetAmount && goal.currentAmount < goal.targetAmount;

                      setSavingsGoals(prev => prev.map(g => {
                        if (g.id === goal.id) {
                          return { ...g, currentAmount: nextAmt };
                        }
                        return g;
                      }));

                      setIsGoalActionModalOpen(false);

                      if (completedJustNow) {
                        triggerMascotReaction('celebrate', `🌟 ยินดีด้วยอย่างยิ่งเลยค้าบ!! เป้าหมายออมเงิน "${goal.emoji} ${goal.name}" สำเร็จครบ 100% เรียบร้อยแล้วน้าเก่งและวิเศษมากๆ คุมะคุงภูมิใจในตัวคุณฝุดๆ เลยค้าบ! 🎉🕶️🧸🏆✨`);
                        addToast(`เป้าหมาย ${goal.name} บรรลุความสำเร็จแล้ว! 🎉`, 'success');
                      } else {
                        const message = goalActionType === 'deposit' 
                          ? `ฝากเงิน ฿${amount.toLocaleString()} สำเร็จแล้วคุมะ! ตอนนี้สะสมได้ ฿${nextAmt.toLocaleString()} แล้วน้า สู้ๆ ต่อไปค้าบ 🎉🧸`
                          : `ถอนเงิน ฿${amount.toLocaleString()} จากเป้าหมายเรียบร้อยแล้วจ้า เหลือยอดออมสะสมคือ ฿${nextAmt.toLocaleString()} น้า 💸`;
                        triggerMascotReaction('happy', message);
                        addToast('อัปเดตเป้าหมายเงินออมเรียบร้อยแล้วคุมะ! 🎉', 'success');
                      }
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 ${
                      selectedThemeId === 'cherry' ? 'bg-rose-500' :
                      selectedThemeId === 'matcha' ? 'bg-emerald-500' :
                      selectedThemeId === 'blueberry' ? 'bg-sky-500' :
                      selectedThemeId === 'peach' ? 'bg-amber-500' :
                      selectedThemeId === 'natural' ? 'bg-[#7B9978]' : 'bg-slate-800'
                    }`}
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Username & Password Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isDark={isDark}
        currentSyncKey={syncKey}
        onLoginSuccess={handleLoginSuccess}
        onSignupSuccess={handleSignupSuccess}
        addToast={addToast}
      />
    </motion.div>
  );
}
