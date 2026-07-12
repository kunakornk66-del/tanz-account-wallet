import React, { useState } from 'react';
import { CategoryInfo } from '../themes';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Sparkles, 
  FolderPlus, 
  Info,
  ChevronDown,
  ChevronUp,
  Tags
} from 'lucide-react';

interface CategoryManagerProps {
  incomeCategories: CategoryInfo[];
  expenseCategories: CategoryInfo[];
  onChange: (income: CategoryInfo[], expense: CategoryInfo[]) => void;
  isDark: boolean;
  accentClass: string;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  incomeCategories,
  expenseCategories,
  onChange,
  isDark,
  accentClass
}) => {
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Form states for creating a new main category
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🧸');
  const [isCreatingMain, setIsCreatingMain] = useState(false);

  // States for editing main category name
  const [editingMainId, setEditingMainId] = useState<string | null>(null);
  const [editingMainName, setEditingMainName] = useState('');

  // States for editing a subcategory
  const [editingSubIndex, setEditingSubIndex] = useState<{ catId: string; index: number } | null>(null);
  const [editingSubName, setEditingSubName] = useState('');

  // State for adding a subcategory
  const [newSubNameMap, setNewSubNameMap] = useState<{ [catId: string]: string }>({});

  const categories = activeType === 'income' ? incomeCategories : expenseCategories;

  // Presets of cute emojis
  const emojiPresets = activeType === 'expense' 
    ? ['🍔', '🚗', '🛍️', '🏠', '⚡', '🎬', '🏥', '💅', '📚', '👶', '🐱', '🐷', '💳', '🍻', '🔧', '🧾', '🧸', '✈️', '🎁', '☕', '🍿', '⚽']
    : ['💰', '💻', '📈', '🎁', '🪙', '💵', '💸', '💼', '🏢', '🏪', '🎉', '🌟', '🧁', '🍪'];

  // Toggle category type
  const handleTypeChange = (type: 'expense' | 'income') => {
    setActiveType(type);
    setExpandedCat(null);
    setIsCreatingMain(false);
  };

  // Add a new main category
  const handleAddMainCategory = () => {
    if (!newCatName.trim()) return;

    const newId = 'custom-' + Date.now();
    const newCat: CategoryInfo = {
      id: newId,
      name: newCatName.trim(),
      emoji: newCatEmoji,
      color: activeType === 'income' ? 'text-emerald-500' : 'text-rose-500',
      bgColor: activeType === 'income' ? 'bg-emerald-100' : 'bg-rose-100',
      subCategories: []
    };

    if (activeType === 'income') {
      onChange([...incomeCategories, newCat], expenseCategories);
    } else {
      onChange(incomeCategories, [...expenseCategories, newCat]);
    }

    setNewCatName('');
    setNewCatEmoji('🧸');
    setIsCreatingMain(false);
    setExpandedCat(newId);
  };

  // Delete main category
  const handleDeleteMainCategory = (catId: string, name: string) => {
    const confirmDelete = window.confirm(`คุณแน่ใจไหมครับว่าต้องการลบหมวดหมู่ "${name}"? การลบนี้จะไม่ลบรายการบัญชีที่บันทึกไว้ในหมวดหมู่นี้ แต่อาจทำให้การแสดงผลไม่ตรงกับหมวดหมู่นะครับ 🧸`);
    if (!confirmDelete) return;

    if (activeType === 'income') {
      onChange(
        incomeCategories.filter(c => c.id !== catId),
        expenseCategories
      );
    } else {
      onChange(
        incomeCategories,
        expenseCategories.filter(c => c.id !== catId)
      );
    }

    if (expandedCat === catId) {
      setExpandedCat(null);
    }
  };

  // Start editing main category
  const startEditMain = (catId: string, currentName: string) => {
    setEditingMainId(catId);
    setEditingMainName(currentName);
  };

  // Save main category name
  const saveMainCategoryName = (catId: string) => {
    if (!editingMainName.trim()) return;

    const updateList = (list: CategoryInfo[]) => 
      list.map(c => c.id === catId ? { ...c, name: editingMainName.trim() } : c);

    if (activeType === 'income') {
      onChange(updateList(incomeCategories), expenseCategories);
    } else {
      onChange(incomeCategories, updateList(expenseCategories));
    }

    setEditingMainId(null);
  };

  // Add a subcategory to a specific main category
  const handleAddSubCategory = (catId: string) => {
    const subName = newSubNameMap[catId]?.trim();
    if (!subName) return;

    const updateList = (list: CategoryInfo[]) =>
      list.map(c => {
        if (c.id === catId) {
          const subs = c.subCategories || [];
          if (subs.includes(subName)) {
            alert('มีหมวดย่อยชื่อนี้อยู่แล้วครับ 🧸');
            return c;
          }
          return { ...c, subCategories: [...subs, subName] };
        }
        return c;
      });

    if (activeType === 'income') {
      onChange(updateList(incomeCategories), expenseCategories);
    } else {
      onChange(incomeCategories, updateList(expenseCategories));
    }

    // Reset sub input for this category
    setNewSubNameMap(prev => ({ ...prev, [catId]: '' }));
  };

  // Delete a subcategory
  const handleDeleteSubCategory = (catId: string, subIndex: number) => {
    const updateList = (list: CategoryInfo[]) =>
      list.map(c => {
        if (c.id === catId) {
          const subs = c.subCategories || [];
          return { ...c, subCategories: subs.filter((_, idx) => idx !== subIndex) };
        }
        return c;
      });

    if (activeType === 'income') {
      onChange(updateList(incomeCategories), expenseCategories);
    } else {
      onChange(incomeCategories, updateList(expenseCategories));
    }
  };

  // Start editing a subcategory
  const startEditSub = (catId: string, index: number, currentName: string) => {
    setEditingSubIndex({ catId, index });
    setEditingSubName(currentName);
  };

  // Save subcategory name
  const saveSubCategoryName = (catId: string, index: number) => {
    if (!editingSubName.trim()) return;

    const updateList = (list: CategoryInfo[]) =>
      list.map(c => {
        if (c.id === catId) {
          const subs = [...(c.subCategories || [])];
          subs[index] = editingSubName.trim();
          return { ...c, subCategories: subs };
        }
        return c;
      });

    if (activeType === 'income') {
      onChange(updateList(incomeCategories), expenseCategories);
    } else {
      onChange(incomeCategories, updateList(expenseCategories));
    }

    setEditingSubIndex(null);
  };

  return (
    <div className={`p-4 rounded-3xl border transition-all ${
      isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
    }`}>
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-50 text-rose-500'}`}>
            <Tags size={16} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              ตั้งค่าหมวดหมู่หลัก & หมวดย่อย
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold">
              เพิ่ม ลบ หรือแก้ไขชื่อหมวดหมู่และหมวดย่อยได้ตามใจเลยครับ
            </p>
          </div>
        </div>
      </div>

      {/* Selector tab buttons */}
      <div className={`p-1.5 rounded-2xl flex mb-4 font-bold ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <button
          onClick={() => handleTypeChange('expense')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            activeType === 'expense'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <span>💸</span>
          <span>หมวดรายจ่าย ({expenseCategories.length})</span>
        </button>
        <button
          onClick={() => handleTypeChange('income')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            activeType === 'income'
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <span>💰</span>
          <span>หมวดรายรับ ({incomeCategories.length})</span>
        </button>
      </div>

      {/* Main categories list */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar pr-1 pb-1">
        {categories.map((cat) => {
          const isExpanded = expandedCat === cat.id;
          const isEditingMain = editingMainId === cat.id;
          const subCount = cat.subCategories?.length || 0;

          return (
            <div 
              key={cat.id} 
              className={`rounded-2xl border transition-all ${
                isDark 
                  ? isExpanded ? 'bg-slate-900 border-slate-750' : 'bg-slate-950/60 border-slate-900' 
                  : isExpanded ? 'bg-slate-50/50 border-rose-100/60' : 'bg-white border-slate-100'
              }`}
            >
              {/* Main Category Header Row */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-2xl shrink-0 select-none">{cat.emoji}</span>
                  
                  {isEditingMain ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editingMainName}
                        onChange={(e) => setEditingMainName(e.target.value)}
                        className={`px-2 py-1 text-xs font-extrabold rounded-lg border w-full focus:outline-none ${
                          isDark 
                            ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' 
                            : 'bg-white border-slate-200 text-slate-800 focus:border-rose-450'
                        }`}
                        maxLength={25}
                        autoFocus
                      />
                      <button
                        onClick={() => saveMainCategoryName(cat.id)}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                        title="บันทึก"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setEditingMainId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        title="ยกเลิก"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      {/* Name wraps into 2 lines if long as requested */}
                      <p className={`text-xs font-extrabold break-words whitespace-normal leading-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {cat.name}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                        <span>📦 มีหมวดย่อย {subCount} รายการ</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isEditingMain && (
                    <>
                      <button
                        onClick={() => startEditMain(cat.id, cat.name)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        title="แก้ไขชื่อหมวดหมู่"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteMainCategory(cat.id, cat.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500"
                        title="ลบหมวดหมู่หลัก"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                    className="p-1.5 rounded-lg bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded Area: Subcategories */}
              {isExpanded && (
                <div className={`p-3 pt-0 border-t ${
                  isDark ? 'border-slate-900 bg-slate-950/30' : 'border-slate-50 bg-slate-50/10'
                } rounded-b-2xl space-y-2.5`}>
                  
                  {/* Current Subcategories list */}
                  {subCount > 0 ? (
                    <div className="space-y-1.5 mt-2.5">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">หมวดย่อยปัจจุบัน</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.subCategories?.map((sub, idx) => {
                          const isEditingSub = editingSubIndex?.catId === cat.id && editingSubIndex?.index === idx;

                          return (
                            <div 
                              key={`${sub}-${idx}`}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                isDark 
                                  ? 'bg-slate-900 border-slate-800 text-slate-300' 
                                  : 'bg-white border-slate-150 text-slate-750'
                              }`}
                            >
                              {isEditingSub ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingSubName}
                                    onChange={(e) => setEditingSubName(e.target.value)}
                                    className="px-1 py-0.5 text-[9px] font-bold rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none w-20"
                                    maxLength={20}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveSubCategoryName(cat.id, idx)}
                                    className="text-emerald-500 hover:text-emerald-600"
                                  >
                                    <Check size={11} />
                                  </button>
                                  <button
                                    onClick={() => setEditingSubIndex(null)}
                                    className="text-slate-400 hover:text-slate-500"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="truncate max-w-[120px]">{sub}</span>
                                  <button
                                    onClick={() => startEditSub(cat.id, idx, sub)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 shrink-0"
                                    title="แก้ไขชื่อหมวดย่อย"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubCategory(cat.id, idx)}
                                    className="text-slate-450 hover:text-red-500 shrink-0 ml-0.5"
                                    title="ลบหมวดย่อย"
                                  >
                                    <X size={10} />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-xl mt-2">
                      <p className="text-[10px] text-slate-400 font-semibold">
                        ยังไม่มีหมวดย่อยเลยครับ เพิ่มหมวดย่อยด้านล่างได้เลยนะค้าบ 🧸🧁
                      </p>
                    </div>
                  )}

                  {/* Add Subcategory input row */}
                  <div className="flex gap-1.5 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-900">
                    <input
                      type="text"
                      placeholder=""
                      value={newSubNameMap[cat.id] || ''}
                      onChange={(e) => setNewSubNameMap(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSubCategory(cat.id);
                        }
                      }}
                      className={`flex-1 px-3 py-1.5 rounded-xl text-[10px] font-bold border focus:outline-none ${
                        isDark 
                          ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' 
                          : 'bg-white border-slate-200 text-slate-700 focus:border-rose-400'
                      }`}
                      maxLength={20}
                    />
                    <button
                      onClick={() => handleAddSubCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold text-white transition-all active:scale-95 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-xs flex items-center gap-1 shrink-0`}
                    >
                      <Plus size={11} />
                      เพิ่มหมวดย่อย
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Button to show main category creator form */}
      {!isCreatingMain ? (
        <button
          onClick={() => setIsCreatingMain(true)}
          className="w-full mt-4 py-2.5 px-4 rounded-2xl text-xs font-extrabold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-97 transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <FolderPlus size={14} />
          เพิ่มหมวดหมู่หลักใหม่ ➕🧸
        </button>
      ) : (
        <div className={`mt-4 p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950 border-slate-850' : 'bg-rose-50/20 border-rose-100'
        } space-y-3.5`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-extrabold ${isDark ? 'text-white' : 'text-slate-800'} flex items-center gap-1.5`}>
              <Sparkles size={12} className="text-amber-500" />
              <span>สร้างหมวดหมู่หลักใหม่ ({activeType === 'income' ? 'รายรับ' : 'รายจ่าย'})</span>
            </h4>
            <button 
              onClick={() => setIsCreatingMain(false)}
              className="p-1 rounded-full hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400"
            >
              <X size={14} />
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                รูปสัญลักษณ์ (Emoji)
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {emojiPresets.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCatEmoji(emoji)}
                    className={`p-2 rounded-xl text-xl transition-all shrink-0 border ${
                      newCatEmoji === emoji 
                        ? 'bg-amber-100 border-amber-400 text-amber-600 scale-110' 
                        : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-850 text-slate-600'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
                {/* Input for custom emoji */}
                <input
                  type="text"
                  placeholder="อิโมจิอื่นๆ"
                  value={newCatEmoji}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val.length <= 2) setNewCatEmoji(val); // allow up to 2 chars for compound emojis
                  }}
                  className={`w-14 px-1.5 text-center text-sm rounded-xl border focus:outline-none shrink-0 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                  maxLength={4}
                  title="ป้อนอิโมจิที่คุณต้องการ"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                ชื่อหมวดหมู่หลัก
              </label>
              <input
                type="text"
                placeholder=""
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' 
                    : 'bg-white border-slate-200 text-slate-700 focus:border-rose-450'
                }`}
                maxLength={30}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreatingMain(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleAddMainCategory}
              className={`flex-[2] py-2 rounded-xl text-xs font-extrabold text-white text-center transition-all bg-emerald-500 hover:bg-emerald-600 shadow-sm`}
            >
              ตกลง เพิ่มหมวดหลักนี้ ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
