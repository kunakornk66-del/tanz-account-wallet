import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { CategoryInfo } from '../themes';
import { Calendar, Clock, DollarSign, Edit3, Plus, Sparkles, Tag, X, Paperclip, Trash2, Image as ImageIcon } from 'lucide-react';

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
  expenseCategories
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
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
  const [slipImage, setSlipImage] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');

  const categories = type === 'income' ? incomeCategories : expenseCategories;

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
      setSlipImage(editingTransaction.slipImage || '');
    } else {
      // Reset form (keep date/time as current or let user keep it)
      setAmount('');
      setDescription('');
      setSlipImage('');
      setSubCategory('');
      setDate(defaultDate || getLocalDateString());
      if (categories.length > 0) {
        setCategory(categories[0].id);
      }
    }
  }, [editingTransaction, defaultDate, categories]);

  // Adjust default category when type toggles
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const defaultCats = newType === 'income' ? incomeCategories : expenseCategories;
    setCategory(defaultCats[0]?.id || 'others');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        if (addToast) {
          addToast('รูปภาพต้องมีขนาดไม่เกิน 2MB นะครับ 🥺', 'error');
        } else {
          alert('รูปภาพต้องมีขนาดไม่เกิน 2MB');
        }
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipImage(reader.result as string);
        if (addToast) {
          addToast('แนบรูปภาพสลิปเรียบร้อยแล้วครับ! 🧾📸', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSlip = () => {
    setSlipImage('');
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

    onSave({
      id: editingTransaction?.id,
      type,
      amount: numAmount,
      category,
      subCategory: subCategory || undefined,
      description: description.trim() || categories.find(c => c.id === category)?.name || 'อื่นๆ',
      date,
      time,
      slipImage: slipImage || undefined
    });

    // Reset fields if adding new
    if (!editingTransaction) {
      setAmount('');
      setDescription('');
      setSubCategory('');
      setDate(getLocalDateString());
      setTime(getLocalTimeString());
      setSlipImage('');
    }
  };

  // Quick cash amount addition
  const quickAmounts = [20, 50, 100, 500, 1000];
  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type Selector (Large, distinct tactile buttons) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`flex flex-col items-center justify-center py-4 px-4 rounded-3xl border-3 transition-all duration-200 active:scale-95 ${
            type === 'expense'
              ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20 scale-[1.02]'
              : isDark
                ? 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-3xl mb-1">💸</span>
          <span className="text-base font-extrabold">รายจ่าย</span>
          <span className="text-[10px] opacity-80 font-semibold uppercase tracking-wider">Expense</span>
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`flex flex-col items-center justify-center py-4 px-4 rounded-3xl border-3 transition-all duration-200 active:scale-95 ${
            type === 'income'
              ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20 scale-[1.02]'
              : isDark
                ? 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-3xl mb-1">💰</span>
          <span className="text-base font-extrabold">รายรับ</span>
          <span className="text-[10px] opacity-80 font-semibold uppercase tracking-wider">Income</span>
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          จำนวนเงิน (บาท)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <span className={`text-lg font-bold ${type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>฿</span>
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

      {/* Optional Slip Attachment */}
      <div className={`p-3 rounded-2xl border ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/60 border-slate-100'
      }`}>
        <label className="flex items-center gap-1.5 text-xs font-bold mb-2 text-slate-500 dark:text-slate-400">
          <Paperclip size={13} />
          <span>แนบรูปสลิปธนาคาร (ไม่บังคับ) 🧾✨</span>
        </label>

        {!slipImage ? (
          <div className="relative">
            <input
              type="file"
              accept="image/*"
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
                คลิกเพื่อเลือกไฟล์รูปภาพ หรือ ถ่ายรูปสลิป
              </p>
              <p className="text-[9px] text-slate-400">
                ขนาดไฟล์ไม่เกิน 2MB (JPG, PNG)
              </p>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2">
            <div className="flex items-center gap-3">
              <img
                src={slipImage}
                alt="Uploaded bank slip"
                referrerPolicy="no-referrer"
                className="w-12 h-16 object-cover rounded-md border border-slate-100 dark:border-slate-850 shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓ แนบรูปภาพสำเร็จ</span>
                </p>
                <p className="text-[9px] text-slate-400 truncate">
                  พร้อมบันทึกคู่กับรายการนี้แล้วครับ
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveSlip}
                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all dark:bg-red-950/30 dark:hover:bg-red-950/50"
                title="ลบรูปภาพสลิป"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
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
  );
};
