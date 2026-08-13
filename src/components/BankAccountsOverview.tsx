import React from 'react';
import { BankAccount, BANK_PRESETS, Transaction } from '../types';
import { Landmark, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface BankAccountsOverviewProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  selectedAccountId: string | 'all';
  onSelectAccount: (accountId: string | 'all') => void;
  onOpenAccountManager: () => void;
  isDark: boolean;
}

export const BankAccountsOverview: React.FC<BankAccountsOverviewProps> = ({
  accounts,
  transactions,
  selectedAccountId,
  onSelectAccount,
  onOpenAccountManager,
  isDark
}) => {
  // Helper to calculate total starting balance across all accounts
  const parseNum = (val: any) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const totalInitialBalance = accounts.reduce((sum, acc) => sum + parseNum(acc.initialBalance), 0);

  // Helper to calculate balance per account
  const getAccountMetrics = (accId: string, initialBal: number) => {
    let income = 0;
    let expense = 0;
    const defaultAccId = accounts.find(a => a.isDefault)?.id || accounts[0]?.id;
    const baseInitial = parseNum(initialBal);

    transactions.forEach((tx) => {
      const isSourceMatch = tx.accountId === accId || (!tx.accountId && defaultAccId === accId);
      const isTargetMatch = tx.toAccountId === accId;
      const amt = parseNum(tx.amount);

      if (tx.type === 'income') {
        if (isSourceMatch) income += amt;
      } else if (tx.type === 'expense') {
        if (isSourceMatch) expense += amt;
      } else if (tx.type === 'transfer') {
        if (isSourceMatch) expense += amt;
        if (isTargetMatch) income += amt;
      }
    });

    return {
      income,
      expense,
      netBalance: baseInitial + income - expense
    };
  };

  // Portfolio-wide totals
  const totalIncomeAll = transactions.reduce((sum, tx) => tx.type === 'income' ? sum + parseNum(tx.amount) : sum, 0);
  const totalExpenseAll = transactions.reduce((sum, tx) => tx.type === 'expense' ? sum + parseNum(tx.amount) : sum, 0);
  const totalNetAll = totalInitialBalance + totalIncomeAll - totalExpenseAll;

  return (
    <div className="space-y-3 mb-5">
      {/* Header title & Action */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xs">
            <Landmark size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>กระเป๋าเงิน & บัญชีธนาคาร</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-500">
                {accounts.length} บัญชี
              </span>
            </h3>
          </div>
        </div>

        <button
          onClick={onOpenAccountManager}
          className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-750'
              : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50 shadow-xs'
          }`}
        >
          <Plus size={14} /> เพิ่ม/จัดการเงินตั้งต้น
        </button>
      </div>

      {/* Horizontal Scrollable Bank Cards Container */}
      <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 no-scrollbar scroll-smooth">
        {/* Card 1: All Accounts Portfolio Card */}
        <div
          onClick={() => onSelectAccount('all')}
          className={`shrink-0 w-56 sm:w-64 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden active:scale-98 ${
            selectedAccountId === 'all'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-400 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400'
              : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                : 'bg-white border-slate-200/90 text-slate-800 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              <span className="text-xs font-extrabold">รวมทุกบัญชี</span>
            </div>
            {selectedAccountId === 'all' && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                กำลังดูอยู่
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold ${selectedAccountId === 'all' ? 'text-emerald-100' : 'text-slate-400'}`}>
                เงินตั้งต้นรวม:
              </span>
              <span className={`text-[11px] font-bold ${selectedAccountId === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                ฿{totalInitialBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold ${selectedAccountId === 'all' ? 'text-emerald-100' : 'text-slate-400'}`}>
                ยอดคงเหลือสุทธิ:
              </span>
              <div className={`text-base font-black ${selectedAccountId === 'all' ? 'text-white' : totalNetAll >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                ฿{totalNetAll.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Mini Flow Indicators */}
          <div className={`mt-2 pt-2 border-t grid grid-cols-2 gap-1 text-[9px] font-bold ${
            selectedAccountId === 'all'
              ? 'border-white/20 text-emerald-100'
              : isDark
                ? 'border-slate-800 text-slate-400'
                : 'border-slate-100 text-slate-500'
          }`}>
            <div className="flex items-center gap-0.5 text-emerald-400">
              <ArrowDownLeft size={10} />
              <span>+฿{totalIncomeAll.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-0.5 text-rose-300 justify-end">
              <ArrowUpRight size={10} />
              <span>-฿{totalExpenseAll.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Individual Account Cards */}
        {accounts.map((acc) => {
          const preset = BANK_PRESETS.find(p => p.key === acc.bankKey) || BANK_PRESETS[BANK_PRESETS.length - 1];
          const metrics = getAccountMetrics(acc.id, acc.initialBalance);
          const isSelected = selectedAccountId === acc.id;

          return (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(acc.id)}
              className={`shrink-0 w-56 sm:w-64 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden active:scale-98 ${
                isSelected
                  ? isDark
                    ? 'bg-slate-850 border-emerald-500 shadow-md ring-2 ring-emerald-500/80'
                    : 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-400'
                  : isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xs bg-gradient-to-tr ${preset.bgGradient}`}>
                    {preset.logoEmoji}
                  </div>
                  <div className="truncate max-w-[120px]">
                    <span className="text-xs font-black block truncate">{acc.name}</span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {preset.shortName}{acc.accountNumber ? ` • ${acc.accountNumber}` : ''}
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                    เลือกอยู่
                  </span>
                ) : acc.isDefault ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                    หลัก
                  </span>
                ) : null}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">เงินตั้งต้น:</span>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    ฿{acc.initialBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">ยอดคงเหลือสุทธิ:</span>
                  <div className={`text-base font-black ${metrics.netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ฿{metrics.netBalance.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* Mini Flow Indicators */}
              <div className={`mt-2 pt-2 border-t grid grid-cols-2 gap-1 text-[9px] font-bold ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
              }`}>
                <div className="flex items-center gap-0.5 text-emerald-500">
                  <ArrowDownLeft size={10} />
                  <span>+฿{metrics.income.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-0.5 text-rose-500 justify-end">
                  <ArrowUpRight size={10} />
                  <span>-฿{metrics.expense.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
