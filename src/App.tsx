import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Transaction, ThemeType, ReminderSettings } from './types';
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
  verifySyncKey,
  validateUsername,
  signUpUser,
  loginUser,
  loginWithGoogle,
  uploadCategoriesToCloud,
  downloadCategoriesFromCloud,
  uploadThemeToCloud,
  downloadThemeFromCloud
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
  Smartphone
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'stats' | 'settings'>('dashboard');
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
  const [defaultAddDate, setDefaultAddDate] = useState<string | undefined>(undefined);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

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
    const id = Date.now().toString();
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
    try {
      setLoggedInUser(username);
      localStorage.setItem('kuma_logged_in_user', username);
      
      // Switch to the user's sync key
      setSyncKey(userSyncKey);
      localStorage.setItem('kuma_sync_key', userSyncKey);
      
      // Download cloud data for this key with a timeout
      setIsSyncing(true);
      addToast('กำลังดึงข้อมูลกระเป๋าเงินของคุณจากระบบคลาวด์... 🧸☁️', 'info');
      
      const timeoutMs = 4500; // 4.5s is standard to avoid feeling stuck
      
      const txPromise = downloadTransactionsFromCloud(userSyncKey);
      const catsPromise = downloadCategoriesFromCloud(userSyncKey);
      const themePromise = downloadThemeFromCloud(userSyncKey);

      const downloadedTx = await Promise.race([
        txPromise,
        new Promise<string>((resolve) => setTimeout(() => resolve('TIMEOUT'), timeoutMs))
      ]);

      const downloadedCats = await Promise.race([
        catsPromise,
        new Promise<string>((resolve) => setTimeout(() => resolve('TIMEOUT'), timeoutMs))
      ]);

      const downloadedTheme = await Promise.race([
        themePromise,
        new Promise<string>((resolve) => setTimeout(() => resolve('TIMEOUT'), timeoutMs))
      ]);
      
      setIsSyncing(false);

      const isTimeout = downloadedTx === 'TIMEOUT' || downloadedCats === 'TIMEOUT' || downloadedTheme === 'TIMEOUT';

      if (isTimeout) {
        addToast('⚡ เชื่อมต่อระบบคลาวด์ล่าช้า คุมะคุงขอเข้าใช้งานแบบออฟไลน์ให้ก่อนนะครับ ไม่ต้องห่วง ข้อมูลปลอดภัยในระบบแน่นอนครับ! 🧸💼☁️', 'sync');
        setIsInitialSync(false);
        setIsSyncing(false);
        return;
      }

      const finalTx = downloadedTx as Transaction[] | null;
      const finalCats = downloadedCats as { incomeCategories: any[], expenseCategories: any[] } | null;
      const finalTheme = downloadedTheme as string | null;
      
      // 1. Recover/sync theme
      if (finalTheme) {
        setSelectedThemeId(finalTheme as ThemeType);
        localStorage.setItem('kuma_theme', finalTheme);
      } else {
        // Back up current theme if they don't have one saved on cloud yet
        const currentThemeId = localStorage.getItem('kuma_theme') || 'warm-rose';
        await uploadThemeToCloud(userSyncKey, currentThemeId);
      }

      // 2. Recover/sync transactions using ID deduplication so guest/local data is merged
      let finalTxList: Transaction[] = [];
      if (finalTx !== null && finalTx.length > 0) {
        const localTx = transactions || [];
        const combined = [...finalTx, ...localTx];
        const uniqueMap = new Map();
        combined.forEach(t => {
          if (!uniqueMap.has(t.id)) {
            uniqueMap.set(t.id, t);
          }
        });
        finalTxList = Array.from(uniqueMap.values()) as Transaction[];
        finalTxList.sort((a, b) => b.createdAt - a.createdAt);
        
        setTransactions(finalTxList);
        localStorage.setItem('kuma_transactions', JSON.stringify(finalTxList));
        addToast('ดึงข้อมูลบัญชีและซิงค์ข้อมูลเสร็จเรียบร้อยแล้วค้าบ! ✨🧸', 'success');
        
        // Update cloud with the merged dataset
        await uploadTransactionsToCloud(userSyncKey, finalTxList);
      } else {
        // Cloud has no transactions. If we have local transactions, upload them!
        const localTx = transactions || [];
        if (localTx.length > 0) {
          setTransactions(localTx);
          localStorage.setItem('kuma_transactions', JSON.stringify(localTx));
          await uploadTransactionsToCloud(userSyncKey, localTx);
          addToast('ซิงค์ข้อมูลรายการของคุณขึ้นระบบคลาวด์เรียบร้อยแล้วครับ! 🧸☁️', 'success');
        } else {
          setTransactions([]);
          localStorage.setItem('kuma_transactions', JSON.stringify([]));
          addToast('ยินดีต้อนรับเข้าสู่ระบบบัญชีใหม่ครับ เริ่มต้นบันทึกรายวันกันเลย! 🧸✨', 'success');
        }
      }

      // 3. Recover/sync categories
      if (finalCats !== null) {
        setIncomeCategories(finalCats.incomeCategories);
        setExpenseCategories(finalCats.expenseCategories);
        localStorage.setItem('kuma_income_categories', JSON.stringify(finalCats.incomeCategories));
        localStorage.setItem('kuma_expense_categories', JSON.stringify(finalCats.expenseCategories));
      } else {
        // Back up current categories to this user's cloud profile
        await uploadCategoriesToCloud(userSyncKey, incomeCategories, expenseCategories);
      }
    } catch (error) {
      console.error("Error during login sync:", error);
      addToast('เกิดข้อผิดพลาดในการเชื่อมต่อคลาวด์คุมะคุงขออภัยด้วยนะค้าบ 🥺💧', 'error');
    } finally {
      setIsInitialSync(false);
      setIsSyncing(false);
    }
  };

  const handleSignupSuccess = async (username: string, userSyncKey: string) => {
    // Initialize cloud profile on their new syncKey with clean transactions
    // and customized/default categories to ensure it's ready when they log in!
    await uploadTransactionsToCloud(userSyncKey, []);
    await uploadCategoriesToCloud(userSyncKey, incomeCategories, expenseCategories);
    
    // Show success popup and redirect to login page
    showConfirm(
      'สมัครสมาชิกสำเร็จ 🎉',
      'สมัครสมาชิกเรียบร้อยแล้วครับ! กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้งานและรหัสผ่านที่คุณตั้งไว้ เพื่อเริ่มต้นใช้งานกระเป๋าเงิน CashSniper นะครับ 🧸💼',
      () => {
        setAuthPassword(''); // Clear password
        setAuthTab('login'); // Redirect to login tab
      },
      'เข้าสู่ระบบ',
      '' // Empty cancel text hides the cancel button!
    );
  };

  const handleLogout = () => {
    showConfirm(
      'ออกจากระบบ 🧸🚪',
      'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีของคุณ? ข้อมูลจะถูกเก็บอย่างปลอดภัยบนระบบคลาวด์ และระบบจะล้างข้อมูลส่วนตัวในเครื่องนี้ทันทีครับ',
      () => {
        setLoggedInUser(null);
        localStorage.removeItem('kuma_logged_in_user');
        
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

        // Reset categories
        setIncomeCategories(INCOME_CATEGORIES);
        setExpenseCategories(EXPENSE_CATEGORIES);
        localStorage.setItem('kuma_income_categories', JSON.stringify(INCOME_CATEGORIES));
        localStorage.setItem('kuma_expense_categories', JSON.stringify(EXPENSE_CATEGORIES));
        
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

    if (transactions.length === 0) {
      setMascotMessage('ยังไม่มีบันทึกเลยค้าบ กดปุ่มบวกสีชมพูด้านล่างเพื่อจดรายการแรกกับคุมะคุงเลยน้า 🧸💕');
    } else if (!recordedToday) {
      setMascotMessage('ก๊อกๆ 🧸 วันนี้คุมะคุงยังไม่เห็นบันทึกรายจ่ายเลยน้า อย่าลืมจดข้าวเที่ยงหรือชานมไข่มุกนะค้าบ ✨');
    } else if (expenseSum > incomeSum && incomeSum > 0) {
      setMascotMessage('โอ๊ะโอ... เดือนนี้รายจ่ายเยอะกว่ารายรับแล้วน้าคุมะเป็นห่วง ค่อยๆ ออมเงินกันน้าค้าบ 🧸💧');
    } else if (net > 2000) {
      setMascotMessage('เดือนนี้มีเงินออมเหลือตั้ง ฿' + Math.floor(net).toLocaleString() + ' แหนะ! เก่งสุดๆ เลย คุมะภูมิใจมากค้าบ 🌟🧁');
    } else {
      setMascotMessage('คุมะคุงสแตนด์บายพร้อมบันทึกทุกบาททุกสตางค์แล้วค้าบ! วันนี้ออมเงินเพื่อเป้าหมายกันเถอะนะ 🧸✨');
    }
  }, [transactions, selectedMonth]);

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
    localStorage.setItem('kuma_transactions', JSON.stringify(updated));
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
    const successCat = await uploadCategoriesToCloud(syncKey, incomeCategories, expenseCategories);
    setIsSyncing(false);
    if (successTx && successCat) {
      const now = Date.now();
      setLastSyncedAt(now);
      localStorage.setItem('kuma_last_synced', now.toString());
      addToast('☁️ สำรองข้อมูลขึ้นคลาวด์สำเร็จ! ยอดบัญชีและหมวดหมู่ปลอดภัยหายห่วง 💯', 'success');
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

      const fetchedCats = await Promise.race([
        downloadCategoriesFromCloud(targetKey),
        new Promise<any>((resolve) => setTimeout(() => resolve(null), timeoutMs))
      ]);
      
      setIsSyncing(false);

      if (fetchedTx !== null) {
        // Save
        setTransactions(fetchedTx);
        localStorage.setItem('kuma_transactions', JSON.stringify(fetchedTx));
        
        if (fetchedCats) {
          setIncomeCategories(fetchedCats.incomeCategories);
          setExpenseCategories(fetchedCats.expenseCategories);
          localStorage.setItem('kuma_income_categories', JSON.stringify(fetchedCats.incomeCategories));
          localStorage.setItem('kuma_expense_categories', JSON.stringify(fetchedCats.expenseCategories));
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
          'ลบทุกรายการแล้วเริ่มนับหนึ่งใหม่ใช่ไหมเอ่ย?',
          async () => {
            setTransactions([]);
            localStorage.setItem('kuma_transactions', JSON.stringify([]));
            
            if (syncKey) {
              setIsSyncing(true);
              const success = await uploadTransactionsToCloud(syncKey, []);
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
      const timeoutMs = 6000; // 6 seconds timeout for server handshake
      
      if (authTab === 'login') {
        const authPromise = loginUser(authUsername, authPassword);
        const result = await Promise.race([
          authPromise,
          new Promise<any>((resolve) => setTimeout(() => resolve({
            success: false,
            message: '⏱️ เชื่อมต่อเซิร์ฟเวอร์คลาวด์ล่าช้า กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้งนะค้าบ 🧸'
          }), timeoutMs))
        ]);

        if (result.success && result.username && result.syncKey) {
          addToast(result.message, 'success');
          handleLoginSuccess(result.username, result.syncKey);
        } else {
          addToast(result.message || 'เข้าสู่ระบบไม่สำเร็จครับ 🥺', 'error');
        }
      } else {
        // Sign Up
        const authPromise = signUpUser(authUsername, authPassword, syncKey);
        const result = await Promise.race([
          authPromise,
          new Promise<any>((resolve) => setTimeout(() => resolve({
            success: false,
            message: '⏱️ เชื่อมต่อเซิร์ฟเวอร์คลาวด์ล่าช้า กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้งนะค้าบ 🧸'
          }), timeoutMs))
        ]);

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

  const handleAuthGoogleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const timeoutMs = 15000; // Allow 15 seconds for Google account selection popup
      const googleAuthPromise = loginWithGoogle(syncKey);
      
      const result = await Promise.race([
        googleAuthPromise,
        new Promise<any>((resolve) => setTimeout(() => resolve({
          success: false,
          message: '⏱️ หน้าต่างเลือกบัญชี Google ทำงานล่าช้า กรุณาเปิดแอปในแท็บใหม่เพื่อแก้ไขปัญหาระบบความปลอดภัยของ iFrame นะครับ 🧸'
        }), timeoutMs))
      ]);

      if (result.success && result.username && result.syncKey) {
        addToast(result.message, 'success');
        handleLoginSuccess(result.username, result.syncKey);
      } else {
        addToast(result.message || 'ไม่สามารถลงชื่อเข้าใช้งานด้วย Google ได้ครับ 🥺', 'error');
      }
    } catch (err) {
      console.error('Google Auth error:', err);
      addToast('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Auth 🥺', 'error');
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
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  disabled={isAuthLoading}
                  placeholder="ภาษาอังกฤษและตัวเลขเท่านั้น"
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

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
            <span className="px-2 text-[10px] font-bold text-slate-400 uppercase">หรือ</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleAuthGoogleSignIn}
            disabled={isAuthLoading}
            className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-97 border flex items-center justify-center gap-2 ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:text-white' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02c1-2.93 3.73-5.54 6.72-5.54z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.54c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 7.56C.5 9.36 0 11.33 0 13.41s.5 4.05 1.39 5.85l3.89-3.02z"
              />
              <path
                fill="#34A853"
                d="M12 22.96c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.5 1.18-4.23 1.18-2.99 0-5.72-2.61-6.72-5.54l-3.89 3.02c1.98 3.89 5.96 6.56 10.61 6.56z"
              />
            </svg>
            <span>เชื่อมต่อผ่านบัญชี Google ☁️</span>
          </button>
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
              <div className="text-center py-2 relative z-10">
                <span className="text-[10px] font-bold text-white/75 tracking-wider uppercase">ยอดคงเหลือประจำเดือน</span>
                <h2 className="text-3xl font-extrabold tracking-tight mt-0.5">
                  ฿{summaryTotals.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </h2>
              </div>

              {/* Income vs Expense Grid */}
              <div className="grid grid-cols-2 gap-3.5 mt-4 pt-4 border-t border-white/15 relative z-10 text-xs">
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

                  {/* Category Grid Filter (Extremely beautiful, organized & symmetric) */}
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
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{catDetail.name}{t.subCategory ? ` • ${t.subCategory}` : ''}</span>
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
        <div className="max-w-md mx-auto px-6 flex justify-between items-center text-[10px] font-bold">
          
          {/* Menu Home/Dashboard */}
          <button
            onClick={() => { setActiveTab('dashboard'); setEditingTransaction(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all ${
              activeTab === 'dashboard'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Home size={18} />
            <span>หน้าหลัก</span>
          </button>

          {/* Menu Add Transaction */}
          <button
            onClick={() => { setActiveTab('add'); setDefaultAddDate(undefined); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all ${
              activeTab === 'add'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 -mt-3.5 shadow-md border-3 transition-transform ${
              currentTheme.primary.split(' ')[0]
            } ${
              currentTheme.primary.split(' ')[1]
            } ${
              isDark ? 'border-slate-950' : 'border-white'
            }`}>
              <Plus size={18} />
            </div>
            <span>จดบัญชี</span>
          </button>

          {/* Menu Stats */}
          <button
            onClick={() => { setActiveTab('stats'); setEditingTransaction(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all ${
              activeTab === 'stats'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <BarChart2 size={18} />
            <span>กราฟสถิติ</span>
          </button>

          {/* Menu Settings */}
          <button
            onClick={() => { setActiveTab('settings'); setEditingTransaction(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all ${
              activeTab === 'settings'
                ? `scale-105 ${currentTheme.accent.split(' ')[0]}`
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Settings size={18} />
            <span>ตั้งค่า&ส่งออก</span>
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
