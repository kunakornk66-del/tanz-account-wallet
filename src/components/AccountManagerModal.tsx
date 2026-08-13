import React, { useState } from 'react';
import { BankAccount, BANK_PRESETS, BankType, Transaction } from '../types';
import { X, Plus, Edit2, Trash2, Check, Landmark, DollarSign, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  transactions?: Transaction[];
  onSaveAccounts?: (accounts: BankAccount[]) => void;
  onAddAccount?: (account: Omit<BankAccount, 'id'>) => void;
  onUpdateAccount?: (id: string, updates: Partial<BankAccount>) => void;
  onDeleteAccount?: (id: string) => void;
  onSetDefaultAccount?: (id: string) => void;
  getAccountCurrentBalance?: (accountId: string) => number;
  isDark: boolean;
  addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AccountManagerModal: React.FC<AccountManagerModalProps> = ({
  isOpen,
  onClose,
  accounts = [],
  transactions = [],
  onSaveAccounts,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSetDefaultAccount,
  getAccountCurrentBalance,
  isDark,
  addToast
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInitialId, setEditingInitialId] = useState<string | null>(null);
  const [editingInitialValue, setEditingInitialValue] = useState<string>('');
  const [editBalanceMode, setEditBalanceMode] = useState<'current' | 'initial'>('current');

  // Form states for new account
  const [bankKey, setBankKey] = useState<BankType>('kbank');
  const [accountName, setAccountName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [bankSearch, setBankSearch] = useState<string>('');

  // States for editing account details
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [editDetailsName, setEditDetailsName] = useState<string>('');
  const [editDetailsNumber, setEditDetailsNumber] = useState<string>('');
  const [editDetailsBankKey, setEditDetailsBankKey] = useState<BankType>('kbank');

  // State for delete confirmation modal
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  if (!isOpen) return null;

  // Helper to compute balance safely
  const computeCurrentBalance = (accId: string): number => {
    if (getAccountCurrentBalance) {
      return getAccountCurrentBalance(accId);
    }
    const targetAcc = accounts.find(a => a.id === accId);
    const initial = targetAcc?.initialBalance || 0;
    const defaultAcc = accounts.find(a => a.isDefault) || accounts[0];

    let income = 0;
    let expense = 0;

    (transactions || []).forEach((tx) => {
      const isMatch = tx.accountId === accId || (!tx.accountId && defaultAcc?.id === accId);
      if (isMatch) {
        if (tx.type === 'income') income += tx.amount;
        if (tx.type === 'expense') expense += tx.amount;
      }
    });

    return initial + income - expense;
  };

  const handleSelectBankPreset = (key: BankType) => {
    setBankKey(key);
    const preset = BANK_PRESETS.find(p => p.key === key);
    if (preset && !accountName) {
      setAccountName(preset.shortName);
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const preset = BANK_PRESETS.find(p => p.key === bankKey);
    const finalName = accountName.trim() || preset?.name || 'บัญชีธนาคาร';
    const initVal = parseFloat(initialBalance) || 0;

    const newAccData: Omit<BankAccount, 'id'> = {
      name: finalName,
      bankKey,
      accountNumber: accountNumber.trim() || undefined,
      initialBalance: initVal,
      isDefault: accounts.length === 0
    };

    if (onAddAccount) {
      onAddAccount(newAccData);
    } else if (onSaveAccounts) {
      const createdAcc: BankAccount = {
        ...newAccData,
        id: `acc_${Date.now()}`
      };
      onSaveAccounts([...accounts, createdAcc]);
    }

    if (addToast) {
      addToast(`เพิ่มบัญชี "${finalName}" พร้อมเงินตั้งต้น ฿${initVal.toLocaleString()} เรียบร้อยครับ! 🏦✨`, 'success');
    }

    // Reset form
    setAccountName('');
    setAccountNumber('');
    setInitialBalance('0');
    setShowAddForm(false);
  };

  const handleSaveInitialBalance = (id: string) => {
    const inputVal = parseFloat(editingInitialValue);
    if (isNaN(inputVal)) {
      if (addToast) addToast('กรุณากรอกจำนวนเงินให้ถูกต้องครับ 🥺', 'error');
      return;
    }

    let finalInitialBalance = inputVal;

    if (editBalanceMode === 'current') {
      const defaultAcc = accounts.find(a => a.isDefault) || accounts[0];
      let income = 0;
      let expense = 0;
      (transactions || []).forEach((tx) => {
        const isMatch = tx.accountId === id || (!tx.accountId && defaultAcc?.id === id);
        if (isMatch) {
          if (tx.type === 'income') income += tx.amount;
          if (tx.type === 'expense') expense += tx.amount;
        }
      });
      // Target Current = Initial + Income - Expense
      // So Initial = Target Current - Income + Expense
      finalInitialBalance = inputVal - income + expense;
    }

    if (onUpdateAccount) {
      onUpdateAccount(id, { initialBalance: finalInitialBalance });
    } else if (onSaveAccounts) {
      const updated = accounts.map(a => a.id === id ? { ...a, initialBalance: finalInitialBalance } : a);
      onSaveAccounts(updated);
    }

    setEditingInitialId(null);
    if (addToast) {
      if (editBalanceMode === 'current') {
        addToast(`ปรับยอดเงินคงเหลือปัจจุบันเป็น ฿${inputVal.toLocaleString()} เรียบร้อยแล้วครับ! 💰✨`, 'success');
      } else {
        addToast(`อัปเดตเงินตั้งต้นเป็น ฿${finalInitialBalance.toLocaleString()} เรียบร้อยแล้วครับ! 💰✨`, 'success');
      }
    }
  };

  const handleStartEditDetails = (acc: BankAccount) => {
    setEditingDetailsId(acc.id);
    setEditDetailsName(acc.name);
    setEditDetailsNumber(acc.accountNumber || '');
    setEditDetailsBankKey(acc.bankKey);
  };

  const handleSaveAccountDetails = (id: string) => {
    const preset = BANK_PRESETS.find(p => p.key === editDetailsBankKey);
    const finalName = editDetailsName.trim() || preset?.shortName || 'บัญชีธนาคาร';
    const finalNumber = editDetailsNumber.trim() || undefined;

    if (onUpdateAccount) {
      onUpdateAccount(id, {
        name: finalName,
        accountNumber: finalNumber,
        bankKey: editDetailsBankKey
      });
    } else if (onSaveAccounts) {
      const updated = accounts.map(a => a.id === id ? {
        ...a,
        name: finalName,
        accountNumber: finalNumber,
        bankKey: editDetailsBankKey
      } : a);
      onSaveAccounts(updated);
    }

    setEditingDetailsId(null);
    if (addToast) {
      addToast(`อัปเดตข้อมูลบัญชี "${finalName}" เรียบร้อยแล้วครับ! 🏦✨`, 'success');
    }
  };

  const handleSetDefault = (id: string) => {
    if (onSetDefaultAccount) {
      onSetDefaultAccount(id);
    } else if (onSaveAccounts) {
      const updated = accounts.map(a => ({
        ...a,
        isDefault: a.id === id
      }));
      onSaveAccounts(updated);
    }
  };

  const handleStartDelete = (acc: BankAccount) => {
    setAccountToDelete(acc);
  };

  const handleConfirmDelete = () => {
    if (!accountToDelete) return;
    const id = accountToDelete.id;
    const targetName = accountToDelete.name;

    if (onDeleteAccount) {
      onDeleteAccount(id);
    } else if (onSaveAccounts) {
      const updated = accounts.filter(a => a.id !== id);
      if (updated.length > 0 && !updated.some(a => a.isDefault)) {
        updated[0].isDefault = true;
      }
      onSaveAccounts(updated);
    }

    setAccountToDelete(null);
    if (addToast) addToast(`ลบบัญชี "${targetName}" เรียบร้อยแล้วครับ 🗑️`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className={`w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border transition-all ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md">
              <Landmark size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-1.5">
                <span>การจัดการบัญชีธนาคาร & เงินตั้งต้น</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">
                  Multi-Account
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                เพิ่มธนาคาร กำหนดเงินตั้งต้น และสลับใช้งานได้ง่ายๆ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Information box */}
          <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
            isDark ? 'bg-slate-850/60 border-slate-800' : 'bg-emerald-50/60 border-emerald-100'
          }`}>
            <Sparkles className="text-emerald-500 shrink-0 mt-0.5" size={18} />
            <div className="text-xs space-y-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                💡 เงินตั้งต้นก่อนเอาเงินเข้าบัญชี (Initial Starting Balance)
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                คุณสามารถระบุเงินที่มีอยู่เดิมในแต่ละธนาคารหรือกระเป๋าเงินสดได้ ระบบจะนำเงินตั้งต้นนี้ไปคำนวณรวมกับรายรับ-รายจ่ายให้อัตโนมัติครับ!
              </p>
            </div>
          </div>

          {/* List of accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wider uppercase text-slate-400">
                บัญชีของคุณทั้งหมด ({accounts.length})
              </span>
              {!showAddForm && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setAccountName(BANK_PRESETS.find(p => p.key === bankKey)?.shortName || '');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95"
                >
                  <Plus size={14} /> เพิ่มบัญชีธนาคาร
                </button>
              )}
            </div>

            {/* Account cards */}
            {accounts.map((acc) => {
              const preset = BANK_PRESETS.find(p => p.key === acc.bankKey) || BANK_PRESETS[BANK_PRESETS.length - 1];
              const currentNet = computeCurrentBalance(acc.id);
              const isEditing = editingInitialId === acc.id;
              const isEditingDetails = editingDetailsId === acc.id;

              return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    acc.isDefault
                      ? isDark
                        ? 'bg-slate-850 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-white border-emerald-300 shadow-md ring-1 ring-emerald-300'
                      : isDark
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Bank Icon Badge */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-sm shrink-0 bg-gradient-to-tr ${preset.bgGradient}`}>
                        {preset.logoEmoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                            {acc.name}
                          </h4>
                          {acc.isDefault && (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500 text-white flex items-center gap-1 shadow-xs shrink-0">
                              <ShieldCheck size={10} /> บัญชีหลัก
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                          {preset.name} {acc.accountNumber ? `• เลขบัญชี: ${acc.accountNumber}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Actions dropdown or buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditingDetails) {
                            setEditingDetailsId(null);
                          } else {
                            handleStartEditDetails(acc);
                          }
                        }}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:border-emerald-500 transition-colors flex items-center gap-1"
                        title="แก้ไขชื่อ/เลขบัญชี/ธนาคาร"
                      >
                        <Edit2 size={10} /> {isEditingDetails ? 'ปิด' : 'แก้ไขข้อมูล'}
                      </button>
                      {!acc.isDefault && (
                        <button
                          onClick={() => handleSetDefault(acc.id)}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-500 hover:border-emerald-500 transition-colors"
                          title="ตั้งเป็นบัญชีหลัก"
                        >
                          ตั้งหลัก
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartDelete(acc)}
                        disabled={accounts.length <= 1}
                        className={`p-1.5 rounded-lg transition-colors ${
                          accounts.length <= 1
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                        }`}
                        title={accounts.length <= 1 ? 'ต้องมีอย่างน้อย 1 บัญชีในระบบ' : 'ลบบัญชี'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Details Edit Panel */}
                  {isEditingDetails && (
                    <div className={`mt-3 p-3.5 rounded-2xl border space-y-3 animate-fade-in ${
                      isDark ? 'bg-slate-950/90 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Edit2 size={12} className="text-emerald-500" /> แก้ไขชื่อ / ธนาคาร / เลขที่บัญชี
                      </div>

                      {/* Bank Preset Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          เลือกธนาคาร / ประเภท
                        </label>
                        <div className="max-h-32 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-1.5 p-1 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                          {BANK_PRESETS.map((p) => (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => setEditDetailsBankKey(p.key)}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                                editDetailsBankKey === p.key
                                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <span>{p.logoEmoji}</span>
                              <span className="truncate">{p.shortName}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            ชื่อบัญชี
                          </label>
                          <input
                            type="text"
                            value={editDetailsName}
                            onChange={(e) => setEditDetailsName(e.target.value)}
                            placeholder="ชื่อบัญชี"
                            className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border focus:border-emerald-500 focus:outline-none ${
                              isDark 
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            เลขที่บัญชี (ใส่หรือไม่ใส่ก็ได้)
                          </label>
                          <input
                            type="text"
                            value={editDetailsNumber}
                            onChange={(e) => setEditDetailsNumber(e.target.value)}
                            placeholder="xxx-x-xxxxx-x"
                            className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border focus:border-emerald-500 focus:outline-none ${
                              isDark 
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingDetailsId(null)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveAccountDetails(acc.id)}
                          className="px-3 py-1.5 text-xs font-extrabold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs active:scale-95"
                        >
                          บันทึกการแก้ไข
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Financial Metrics Row inside Card */}
                  <div className={`mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs ${
                    isDark ? 'border-slate-800/80' : 'border-slate-100'
                  }`}>
                    {/* Initial Balance Box */}
                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          🌱 เงินตั้งต้นก่อนจด:
                        </span>
                        <button
                          onClick={() => {
                            setEditingInitialId(acc.id);
                            setEditBalanceMode('initial');
                            setEditingInitialValue(acc.initialBalance.toString());
                          }}
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                        >
                          <Edit2 size={10} /> แก้ไข
                        </button>
                      </div>
                      <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                        ฿{acc.initialBalance.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                      </div>
                    </div>

                    {/* Current Net Balance Box */}
                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          💳 ยอดคงเหลือปัจจุบัน:
                        </span>
                        <button
                          onClick={() => {
                            setEditingInitialId(acc.id);
                            setEditBalanceMode('current');
                            setEditingInitialValue(currentNet.toString());
                          }}
                          className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                        >
                          <Edit2 size={10} /> ปรับยอด
                        </button>
                      </div>
                      <div className={`text-sm font-black ${
                        currentNet >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        ฿{currentNet.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  {/* Inline Balance Edit Panel */}
                  {isEditing && (
                    <div className={`mt-3 p-3 rounded-xl border space-y-2 animate-fade-in ${
                      isDark ? 'bg-slate-950 border-emerald-500/50' : 'bg-emerald-50/60 border-emerald-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                          ⚙️ ตั้งค่ายอดเงินบัญชี "{acc.name}"
                        </span>
                        <button
                          onClick={() => setEditingInitialId(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Mode selector tab */}
                      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/60 dark:bg-slate-850 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setEditBalanceMode('current');
                            setEditingInitialValue(currentNet.toString());
                          }}
                          className={`py-1 rounded-md transition-all ${
                            editBalanceMode === 'current'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          💳 ยอดที่มีอยู่ตอนนี้
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditBalanceMode('initial');
                            setEditingInitialValue(acc.initialBalance.toString());
                          }}
                          className={`py-1 rounded-md transition-all ${
                            editBalanceMode === 'initial'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          🌱 เงินตั้งต้นก่อนจด
                        </button>
                      </div>

                      {/* Helper description */}
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        {editBalanceMode === 'current' 
                          ? '💡 ระบุจำนวนเงินคงเหลือในแอปธนาคาร/กระเป๋าเงินที่มีอยู่จริงขณะนี้ ระบบจะปรับเงินตั้งต้นให้อัตโนมัติ'
                          : '💡 ระบุเงินตั้งต้นก้อนแรกสุดก่อนเริ่มจดรายรับ-รายจ่าย'}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                          <input
                            type="number"
                            step="any"
                            value={editingInitialValue}
                            onChange={(e) => setEditingInitialValue(e.target.value)}
                            className={`w-full pl-6 pr-2 py-1.5 text-xs font-extrabold rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              isDark
                                ? 'bg-slate-900 border-emerald-500 text-white placeholder-slate-500'
                                : 'bg-white border-emerald-500 text-slate-800 placeholder-slate-400'
                            }`}
                            placeholder="0.00"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={() => handleSaveInitialBalance(acc.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
                        >
                          <Check size={14} /> บันทึก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Account Form Modal Body */}
          {showAddForm && (
            <form onSubmit={handleCreateAccount} className={`p-4 rounded-2xl border space-y-3 animate-fade-in ${
              isDark ? 'bg-slate-950/90 border-emerald-500/40' : 'bg-emerald-50/40 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus size={14} /> เพิ่มบัญชีธนาคาร / กระเป๋าเงินใหม่
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Bank Preset Selection Grid with Search */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    เลือกประเภทธนาคาร / กระเป๋าเงิน ({BANK_PRESETS.length} รายการ)
                  </label>
                </div>
                
                <div className="mb-2">
                  <input
                    type="text"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="🔍 พิมพ์ค้นหาธนาคาร (เช่น กสิกร, SCB, ธอส., TrueMoney...)"
                    className={`w-full px-3 py-1.5 text-xs font-bold rounded-xl border focus:outline-none ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border rounded-xl bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  {BANK_PRESETS
                    .filter(preset => 
                      !bankSearch.trim() || 
                      preset.name.toLowerCase().includes(bankSearch.toLowerCase()) || 
                      preset.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
                      preset.key.toLowerCase().includes(bankSearch.toLowerCase())
                    )
                    .map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleSelectBankPreset(preset.key)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 ${
                          bankKey === preset.key
                            ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-black'
                            : isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xl mb-1">{preset.logoEmoji}</span>
                        <span className="text-[9px] font-bold text-center truncate w-full">{preset.shortName}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  ชื่อบัญชี (เช่น กสิกรเงินเดือน, เงินสดติดตัว)
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="เช่น บัญชีออมทรัพย์ กสิกร"
                  className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>

              {/* Account Number & Initial Balance */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    เลขบัญชี (ระบุหรือไม่ก็ได้)
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="xxx-x-xxxxx-x"
                    className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    เงินตั้งต้นก่อนเริ่มจด (บาท)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-extrabold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-95 transition-all"
                >
                  บันทึกสร้างบัญชี
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold rounded-2xl bg-slate-800 text-white hover:bg-slate-700 transition-all active:scale-95 shadow-xs"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal Popup */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-xs sm:max-w-sm rounded-3xl p-5 shadow-2xl border text-center transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Trash2 size={26} />
            </div>
            <h4 className="text-base font-extrabold mb-1">ยืนยันการลบบัญชี 🗑️</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              คุณต้องการลบบัญชี <span className="font-bold text-slate-800 dark:text-slate-200">"{accountToDelete.name}"</span> ออกจากระบบหรือไม่?
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-rose-500 hover:bg-rose-600 text-white shadow-md active:scale-95 transition-all"
              >
                ยืนยันลบบัญชี
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
