import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, BankAccount, PaymentMethod, BANK_PRESETS } from '../types';
import { CategoryInfo } from '../themes';
import { Calendar, Clock, DollarSign, Edit3, Plus, Sparkles, Tag, X, Paperclip, Trash2, Image as ImageIcon, Check, AlertCircle, FileText, Repeat, CreditCard, Landmark, Wallet } from 'lucide-react';

interface TransactionFormProps {
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => void;
  editingTransaction: Transaction | null;
  onCancelEdit: () => void;
  isDark: boolean;
  primaryBtnClass: string;
  addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  defaultDate?: string;
  incomeCategories: CategoryInfo[];
  expenseCategories: CategoryInfo[];
  accounts?: BankAccount[];
  onOpenAccountManager?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSave,
  editingTransaction,
  onCancelEdit,
  isDark,
  primaryBtnClass,
  addToast,
  defaultDate,
  incomeCategories,
  expenseCategories,
  accounts = [],
  onOpenAccountManager
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  // Payment method & Account states
  const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [accountId, setAccountId] = useState<string>(defaultAccount?.id || '');
  const [toAccountId, setToAccountId] = useState<string>('');

  // Sync default account if accounts prop updates
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const def = accounts.find(a => a.isDefault) || accounts[0];
      setAccountId(def.id);
      if (def.bankKey === 'cash') setPaymentMethod('cash');
    }
  }, [accounts, accountId]);

  // Prefill current date/time in local time
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeString = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [date, setDate] = useState<string>(defaultDate || getLocalDateString());
  const [time, setTime] = useState<string>(getLocalTimeString());
  const [slipImages, setSlipImages] = useState<string[]>([]);
  const [subCategory, setSubCategory] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  const transferCategories: CategoryInfo[] = [
    { id: 'transfer', name: 'โอนเงินระหว่างบัญชี', emoji: '🔄', color: 'text-sky-500', bgColor: 'bg-sky-100' }
  ];

  const categories = type === 'income' ? incomeCategories : type === 'transfer' ? transferCategories : expenseCategories;

  // React to editing target
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setSubCategory(editingTransaction.subCategory || '');
      setDescription(editingTransaction.description);
      setDate(editingTransaction.date);
      setTime(editingTransaction.time);
      setIsRecurring(editingTransaction.isRecurring || false);
      setPaymentMethod(editingTransaction.paymentMethod || 'transfer');
      setAccountId(editingTransaction.accountId || (accounts[0]?.id || ''));
      setToAccountId(editingTransaction.toAccountId || '');
      
      // Handle backward compatibility for single slipImage vs multiple slipImages
      if (editingTransaction.slipImages && editingTransaction.slipImages.length > 0) {
        setSlipImages(editingTransaction.slipImages);
      } else if (editingTransaction.slipImage) {
        setSlipImages([editingTransaction.slipImage]);
      } else {
        setSlipImages([]);
      }
    } else {
      // Reset form (keep date/time as current or let user keep it)
      setAmount('');
      setDescription('');
      setSlipImages([]);
      setSubCategory('');
      setIsRecurring(false);
      setDate(defaultDate || getLocalDateString());
      if (categories.length > 0) {
        setCategory(categories[0].id);
      }
    }
  }, [editingTransaction, defaultDate, categories]);

  // Adjust default category when type toggles
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'transfer') {
      setCategory('transfer');
      setPaymentMethod('transfer');
      const otherAcc = accounts.find(a => a.id !== accountId) || accounts[0];
      if (otherAcc) setToAccountId(otherAcc.id);
    } else {
      const defaultCats = newType === 'income' ? incomeCategories : expenseCategories;
      setCategory(defaultCats[0]?.id || 'others');
      setToAccountId('');
    }
    setSubCategory('');
  };

  // Reset subcategory on main category change
  useEffect(() => {
    if (editingTransaction && editingTransaction.category === category) {
      setSubCategory(editingTransaction.subCategory || '');
    } else {
      setSubCategory('');
    }
  }, [category, editingTransaction]);

  // Helper to compress and resize image before saving/sending
  const compressAndResizeImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string || '');
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => {
          resolve(e.target?.result as string || '');
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (addToast) {
        addToast('กำลังประมวลผลย่อขนาดรูปภาพสลิป... 🧾✨', 'info');
      }

      const newCompressedImages: string[] = [];
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        try {
          const compressed = await compressAndResizeImage(file, 1000, 1000, 0.7);
          if (compressed) {
            newCompressedImages.push(compressed);
          }
        } catch (err) {
          console.error("Compression error:", err);
        }
      }

      if (newCompressedImages.length > 0) {
        setSlipImages((prev) => [...prev, ...newCompressedImages]);
        if (addToast) {
          addToast(`แนบรูปภาพสลิป ${newCompressedImages.length} รูปเรียบร้อยแล้วครับ! 🧾📸`, 'success');
        }
      }
      e.target.value = '';
    }
  };

  const handleRemoveSlip = (indexToRemove: number) => {
    setSlipImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (addToast) {
      addToast('ลบรูปภาพสลิปเรียบร้อยแล้วครับ 🗑️', 'info');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      if (addToast) {
        addToast('กรุณากรอกจำนวนเงินที่ถูกต้อง (มากกว่า 0) 🥺', 'error');
      } else {
        alert('กรุณากรอกจำนวนเงินที่ถูกต้อง (มากกว่า 0)');
      }
      return;
    }
    if (!category) {
      if (addToast) {
        addToast('กรุณาเลือกหมวดหมู่ 🥺', 'error');
      } else {
        alert('กรุณาเลือกหมวดหมู่');
      }
      return;
    }

    if (type === 'transfer') {
      if (!toAccountId || accountId === toAccountId) {
        if (addToast) {
          addToast('กรุณาเลือกบัญชีปลายทางที่ต่างจากบัญชีต้นทางครับ 🥺', 'error');
        } else {
          alert('กรุณาเลือกบัญชีปลายทางที่ต่างจากบัญชีต้นทางครับ');
        }
        return;
      }
    }

    const selectedDay = parseInt(date.split('-')[2], 10) || 1;
    const sourceAcc = accounts.find(a => a.id === accountId);
    const targetAcc = accounts.find(a => a.id === toAccountId);
    const defaultDesc = type === 'transfer'
      ? `โอนเงินจาก ${sourceAcc?.name || 'ต้นทาง'} ไป ${targetAcc?.name || 'ปลายทาง'}`
      : (categories.find(c => c.id === category)?.name || 'อื่นๆ');

    onSave({
      id: editingTransaction?.id,
      type,
      amount: numAmount,
      category,
      subCategory: subCategory || undefined,
      description: description.trim() || defaultDesc,
      date,
      time,
      slipImage: slipImages[0] || undefined,
      slipImages: slipImages.length > 0 ? slipImages : undefined,
      isRecurring: type === 'expense' ? isRecurring : false,
      recurringDay: (type === 'expense' && isRecurring) ? selectedDay : undefined,
      paymentMethod,
      accountId: accountId || (accounts[0]?.id || undefined),
      toAccountId: (type === 'transfer' || toAccountId) ? toAccountId : undefined
    });

    // Reset fields if adding new
    if (!editingTransaction) {
      setAmount('');
      setDescription('');
      setSubCategory('');
      setIsRecurring(false);
      setDate(getLocalDateString());
      setTime(getLocalTimeString());
      setSlipImages([]);
    }
  };

  // Quick cash amount addition
  const quickAmounts = [20, 50, 100, 500, 1000];
  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type Selector (3 distinct tactile buttons) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
            type === 'expense'
              ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20 scale-[1.02]'
              : isDark
                ? 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-2xl mb-0.5">💸</span>
          <span className="text-xs font-extrabold">รายจ่าย</span>
          <span className="text-[9px] opacity-80 font-semibold uppercase tracking-wider">Expense</span>
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
            type === 'income'
              ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20 scale-[1.02]'
              : isDark
                ? 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-2xl mb-0.5">💰</span>
          <span className="text-xs font-extrabold">รายรับ</span>
          <span className="text-[9px] opacity-80 font-semibold uppercase tracking-wider">Income</span>
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('transfer')}
          className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
            type === 'transfer'
              ? 'bg-sky-500 text-white border-sky-600 shadow-md shadow-sky-500/20 scale-[1.02]'
              : isDark
                ? 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-2xl mb-0.5">🔄</span>
          <span className="text-xs font-extrabold">โอนเงิน</span>
          <span className="text-[9px] opacity-80 font-semibold uppercase tracking-wider">Transfer</span>
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          จำนวนเงิน (บาท)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <span className={`text-lg font-bold ${
              type === 'expense' ? 'text-rose-500' : type === 'income' ? 'text-emerald-500' : 'text-sky-500'
            }`}>฿</span>
          </div>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`block w-full pl-9 pr-4 py-3 rounded-2xl text-xl font-bold border focus:outline-none transition-all ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-rose-400'
            }`}
            required
          />
        </div>

        {/* Quick entry helper buttons (Organized into a beautiful 3x2 grid so they are never hidden!) */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {quickAmounts.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAmount(val)}
              className={`py-2 text-xs font-extrabold rounded-xl border transition-all active:scale-95 flex items-center justify-center gap-1 ${
                isDark 
                  ? 'bg-slate-800/85 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50/20 shadow-xs'
              }`}
            >
              💸 +{val.toLocaleString()} ฿
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmount('')}
            className={`py-2 text-xs font-extrabold rounded-xl border transition-all active:scale-95 flex items-center justify-center gap-1 ${
              isDark 
                ? 'bg-rose-950/40 border-rose-900/40 text-rose-400 hover:bg-rose-950/60' 
                : 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100/60'
            }`}
          >
            🧹 ล้างทั้งหมด
          </button>
        </div>
      </div>

      {/* Payment Method & Bank Account Selector */}
      <div className={`p-3.5 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
      }`}>
        {/* Payment Method (เงินสด vs เงินโอน vs พร้อมเพย์ vs บัตรเครดิต) */}
        <div>
          <label className={`block text-xs font-bold mb-1.5 flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <span className="flex items-center gap-1.5">
              <Wallet size={14} className="text-emerald-500" />
              <span>ช่องทางการ{type === 'expense' ? 'ชำระเงิน' : 'รับเงิน'}</span>
            </span>
            <span className="text-[10px] font-medium text-slate-400">เงินสด / เงินโอน</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'transfer', label: 'เงินโอน', emoji: '📱', color: 'sky' },
              { id: 'cash', label: 'เงินสด', emoji: '💵', color: 'emerald' },
              { id: 'promptpay', label: 'พร้อมเพย์', emoji: '✨', color: 'purple' },
              { id: 'credit', label: 'บัตรเครดิต', emoji: '💳', color: 'rose' }
            ].map((method) => {
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id as PaymentMethod);
                    // Auto select cash account if cash selected
                    if (method.id === 'cash') {
                      const cashAcc = accounts.find(a => a.bankKey === 'cash');
                      if (cashAcc) setAccountId(cashAcc.id);
                    } else if (paymentMethod === 'cash') {
                      const nonCashAcc = accounts.find(a => a.bankKey !== 'cash') || accounts[0];
                      if (nonCashAcc) setAccountId(nonCashAcc.id);
                    }
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                    isSelected
                      ? isDark
                        ? 'bg-slate-800 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/50 shadow-xs'
                        : 'bg-white border-emerald-500 text-emerald-600 ring-1 ring-emerald-500/30 shadow-xs'
                      : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="text-base">{method.emoji}</span>
                  <span className="text-[10px]">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bank Account Selection */}
        {accounts.length > 0 && (
          <div className="pt-1 space-y-3">
            {/* Primary / Source Account */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Landmark size={14} className={type === 'transfer' ? 'text-rose-500' : 'text-amber-500'} />
                  <span>
                    {type === 'transfer' 
                      ? '📤 บัญชีต้นทาง (โอนออกจากบัญชีนี้)' 
                      : `บัญชี${type === 'expense' ? 'ที่ตัดเงิน' : 'ที่รับเข้า'} (${accounts.length} บัญชี)`}
                  </span>
                </label>
                {onOpenAccountManager && (
                  <button
                    type="button"
                    onClick={onOpenAccountManager}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    + จัดการบัญชี
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {accounts.map((acc) => {
                  const preset = BANK_PRESETS.find(p => p.key === acc.bankKey) || BANK_PRESETS[BANK_PRESETS.length - 1];
                  const isSelected = accountId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setAccountId(acc.id);
                        if (acc.bankKey === 'cash') {
                          setPaymentMethod('cash');
                        }
                        // If same as target account in transfer mode, change target account
                        if (type === 'transfer' && toAccountId === acc.id) {
                          const other = accounts.find(a => a.id !== acc.id);
                          if (other) setToAccountId(other.id);
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-2 active:scale-95 ${
                        isSelected
                          ? isDark
                            ? 'bg-slate-800 border-emerald-500 text-emerald-400 shadow-xs ring-1 ring-emerald-500'
                            : 'bg-white border-emerald-500 text-emerald-700 shadow-xs ring-1 ring-emerald-500'
                          : isDark
                            ? 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-850'
                            : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="text-sm">{preset.logoEmoji}</span>
                      <div className="text-left leading-tight">
                        <span>{acc.name}</span>
                        {acc.accountNumber && (
                          <span className="text-[9px] text-slate-400 font-normal block">{acc.accountNumber}</span>
                        )}
                      </div>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Account (When type is 'transfer' or when toAccountId is selected) */}
            {type === 'transfer' && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Landmark size={14} className="text-emerald-500" />
                    <span>📥 บัญชีปลายทาง (รับเงินเข้าบัญชีนี้)</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {accounts.map((acc) => {
                    const preset = BANK_PRESETS.find(p => p.key === acc.bankKey) || BANK_PRESETS[BANK_PRESETS.length - 1];
                    const isSelected = toAccountId === acc.id;
                    const isSource = accountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        disabled={isSource}
                        onClick={() => setToAccountId(acc.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-2 active:scale-95 ${
                          isSource 
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-200 text-slate-400'
                            : isSelected
                              ? isDark
                                ? 'bg-slate-800 border-sky-500 text-sky-400 shadow-xs ring-1 ring-sky-500'
                                : 'bg-white border-sky-500 text-sky-700 shadow-xs ring-1 ring-sky-500'
                              : isDark
                                ? 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-850'
                                : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <span className="text-sm">{preset.logoEmoji}</span>
                        <div className="text-left leading-tight">
                          <span>{acc.name}</span>
                          {acc.accountNumber && (
                            <span className="text-[9px] text-slate-400 font-normal block">{acc.accountNumber}</span>
                          )}
                        </div>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />}
                        {isSource && <span className="text-[9px] font-normal shrink-0">(ต้นทาง)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category selector grid */}
      <div>
        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          เลือกหมวดหมู่
        </label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center justify-center p-1.5 rounded-2xl border text-center transition-all duration-200 active:scale-95 relative min-h-[76px] ${
                  isSelected
                    ? isDark
                      ? 'bg-slate-800 border-amber-500 shadow-md ring-1 ring-amber-500'
                      : 'bg-rose-50 border-rose-400 shadow-sm ring-1 ring-rose-400'
                    : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl mb-1 filter drop-shadow-sm shrink-0 select-none">{cat.emoji}</span>
                <span className="text-[9px] font-bold leading-tight break-words text-center whitespace-normal w-full line-clamp-2 px-0.5">{cat.name}</span>
                {isSelected && (
                  <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${type === 'expense' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory selector (Dynamic) */}
      {category && (categories.find(c => c.id === category)?.subCategories?.length || 0) > 0 && (
        <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 transition-all duration-300">
          <label className={`block text-[10px] font-extrabold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            <span>👶👤</span>
            <span>ระบุผู้เกี่ยวข้อง หรือ หมวดย่อย (Sub-category)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setSubCategory('')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                subCategory === ''
                  ? isDark
                    ? 'bg-amber-500 border-amber-500 text-slate-950 font-extrabold shadow-xs'
                    : 'bg-rose-500 border-rose-500 text-white font-extrabold shadow-xs'
                  : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🌐 ทั่วไป/ส่วนกลาง
            </button>
            {categories.find(c => c.id === category)?.subCategories?.map((sub, idx) => {
              const isSelected = subCategory === sub;
              return (
                <button
                  key={`${sub}-${idx}`}
                  type="button"
                  onClick={() => setSubCategory(sub)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-amber-500 border-amber-500 text-slate-950 font-extrabold shadow-xs'
                        : 'bg-rose-500 border-rose-500 text-white font-extrabold shadow-xs'
                      : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  👤 {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Date & Time Picker Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            วันที่บันทึก
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar size={15} />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`block w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                  : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'
              }`}
              required
            />
          </div>
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            เวลาบันทึก
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Clock size={15} />
            </div>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`block w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                  : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'
              }`}
              required
            />
          </div>
        </div>
      </div>

      {/* Description input */}
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          บันทึกช่วยจำ (คำอธิบาย)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Edit3 size={15} />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder=""
            className={`block w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'
            }`}
          />
        </div>
      </div>

      {/* Recurring Expense Toggle */}
      {type === 'expense' && (
        <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
          isDark 
            ? isRecurring ? 'bg-rose-950/20 border-rose-800/60' : 'bg-slate-900/60 border-slate-800' 
            : isRecurring ? 'bg-rose-50/80 border-rose-200' : 'bg-slate-50/60 border-slate-200/70'
        }`}>
          <div className="flex items-center gap-3 pr-2">
            <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isRecurring
                ? 'bg-rose-500 text-white shadow-xs'
                : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/80 text-slate-500'
            }`}>
              <Repeat size={18} className={isRecurring ? 'animate-spin-slow' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  ตั้งเป็นรายจ่ายประจำเดือน 🔄
                </span>
                {isRecurring && (
                  <span className="text-[9px] font-extrabold bg-rose-500 text-white px-1.5 py-0.2 rounded-md">
                    ทุกเดือน
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                {isRecurring
                  ? `ระบบจะบันทึกรายจ่ายนี้ให้อัตโนมัติทุกวันที่ ${parseInt(date.split('-')[2], 10) || 1} ของทุกเดือนถัดไป`
                  : 'สร้างรายการนี้ซ้ำอัตโนมัติในวันเดียวกันของทุกๆ เดือนถัดไป'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRecurring(!isRecurring)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isRecurring ? 'bg-rose-500' : isDark ? 'bg-slate-700' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isRecurring ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {/* Optional Slip Attachment */}
      <div className={`p-3 rounded-2xl border ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/60 border-slate-100'
      }`}>
        <label className="flex items-center gap-1.5 text-xs font-bold mb-2 text-slate-500 dark:text-slate-400">
          <Paperclip size={13} />
          <span>แนบรูปสลิปธนาคาร (ไม่จำกัดจำนวน) 🧾✨</span>
        </label>

        {/* Upload Box (Always visible so they can add multiple slips) */}
        <div className="relative mb-3">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            id="slip-image-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
            isDark 
              ? 'border-slate-800 hover:border-amber-500 hover:bg-slate-850/50' 
              : 'border-slate-200 hover:border-rose-400 hover:bg-rose-50/30'
          }`}>
            <ImageIcon className="mx-auto mb-1 text-slate-400" size={20} />
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              คลิกเพื่อเลือกไฟล์รูปภาพ หรือ ถ่ายรูปสลิป (เลือกได้หลายรูป)
            </p>
            <p className="text-[9px] text-slate-400">
              ขนาดไฟล์ไม่เกิน 2MB ต่อรูป (JPG, PNG)
            </p>
          </div>
        </div>

        {/* Uploaded Slips Grid */}
        {slipImages.length > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-extrabold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                <span>✓ แนบรูปภาพสำเร็จ {slipImages.length} รูป</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSlipImages([]);
                  if (addToast) addToast('ลบรูปภาพสลิปทั้งหมดเรียบร้อยแล้วครับ 🗑️', 'info');
                }}
                className="text-[9px] font-bold text-red-500 hover:underline flex items-center gap-0.5 transition-colors"
              >
                <Trash2 size={10} /> ลบทั้งหมด
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {slipImages.map((img, idx) => (
                <div 
                  key={idx} 
                  className="relative group aspect-3/4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-xs"
                >
                  <img
                    src={img}
                    alt={`Uploaded slip ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-md"
                  />
                  {/* Delete overlay button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSlip(idx)}
                    className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-all active:scale-90 z-10"
                    title={`ลบรูปภาพที่ ${idx + 1}`}
                  >
                    <X size={10} className="stroke-[3]" />
                  </button>
                  {/* Counter badge */}
                  <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded text-[8px] font-extrabold bg-black/60 text-white select-none">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        {editingTransaction && (
          <button
            type="button"
            onClick={onCancelEdit}
            className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all border flex items-center justify-center gap-1.5 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <X size={16} /> ยกเลิกแก้ไข
          </button>
        )}
        <button
          type="submit"
          className={`flex-[2] py-3 rounded-2xl text-sm font-bold shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 ${primaryBtnClass}`}
        >
          {editingTransaction ? (
            <>
              <Sparkles size={16} /> บันทึกการแก้ไข
            </>
          ) : (
            <>
              <Plus size={16} /> บันทึกรายการ
            </>
          )}
        </button>
      </div>
    </form>
    </>
  );
};
