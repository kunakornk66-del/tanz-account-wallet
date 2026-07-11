import { AppTheme } from './types';

export const APP_THEMES: AppTheme[] = [
  {
    id: 'cherry',
    name: 'ซากุระพาสเทล (Sakura Pink)',
    primary: 'bg-rose-400 text-white hover:bg-rose-500',
    secondary: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
    accent: 'text-rose-500 bg-rose-100/50',
    background: 'bg-[#FFF5F6]',
    cardBg: 'bg-white',
    textPrimary: 'text-slate-800',
    textSecondary: 'text-slate-500',
    borderColor: 'border-rose-100',
    isDark: false,
    emoji: '🌸'
  },
  {
    id: 'matcha',
    name: 'ชาเขียวมัทฉะ (Matcha Green)',
    primary: 'bg-emerald-400 text-white hover:bg-emerald-500',
    secondary: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    accent: 'text-emerald-500 bg-emerald-100/50',
    background: 'bg-[#F4F9F4]',
    cardBg: 'bg-white',
    textPrimary: 'text-slate-800',
    textSecondary: 'text-slate-500',
    borderColor: 'border-emerald-100',
    isDark: false,
    emoji: '🍵'
  },
  {
    id: 'blueberry',
    name: 'บลูเบอร์รี่ครีม (Blueberry Blue)',
    primary: 'bg-sky-400 text-white hover:bg-sky-500',
    secondary: 'bg-sky-50 text-sky-600 hover:bg-sky-100',
    accent: 'text-sky-500 bg-sky-100/50',
    background: 'bg-[#F2F7FC]',
    cardBg: 'bg-white',
    textPrimary: 'text-slate-800',
    textSecondary: 'text-slate-500',
    borderColor: 'border-sky-100',
    isDark: false,
    emoji: '🫐'
  },
  {
    id: 'peach',
    name: 'พีชแสนหวาน (Sweet Peach)',
    primary: 'bg-amber-400 text-white hover:bg-amber-500',
    secondary: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    accent: 'text-amber-500 bg-amber-100/50',
    background: 'bg-[#FFF8F3]',
    cardBg: 'bg-white',
    textPrimary: 'text-slate-800',
    textSecondary: 'text-slate-500',
    borderColor: 'border-amber-100',
    isDark: false,
    emoji: '🍊'
  },
  {
    id: 'cocoa',
    name: 'โกโก้ดาร์กโหมด (Dark Cocoa)',
    primary: 'bg-amber-500 text-slate-900 hover:bg-amber-400',
    secondary: 'bg-slate-800 text-amber-400 hover:bg-slate-700',
    accent: 'text-amber-400 bg-slate-800',
    background: 'bg-slate-950',
    cardBg: 'bg-slate-900',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    borderColor: 'border-slate-800',
    isDark: true,
    emoji: '🍫'
  },
  {
    id: 'natural',
    name: 'เอิร์ธโทนอบอุ่น (Natural Tones)',
    primary: 'bg-[#8BA888] text-white hover:bg-[#7b9978]',
    secondary: 'bg-[#F2ECE4] text-[#7A6046] hover:bg-[#E7DED3]',
    accent: 'text-[#D4A373] bg-[#D4A373]/10',
    background: 'bg-[#F7F3F0]',
    cardBg: 'bg-white',
    textPrimary: 'text-stone-800',
    textSecondary: 'text-stone-500',
    borderColor: 'border-[#EBE3DB]',
    isDark: false,
    emoji: '🌿'
  }
];

export interface CategoryInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  subCategories?: string[];
}

export const INCOME_CATEGORIES: CategoryInfo[] = [
  { id: 'salary', name: 'เงินเดือน', emoji: '💰', color: 'text-emerald-500', bgColor: 'bg-emerald-100' },
  { id: 'freelance', name: 'งานเสริม', emoji: '💻', color: 'text-cyan-500', bgColor: 'bg-cyan-100' },
  { id: 'investment', name: 'ลงทุน', emoji: '📈', color: 'text-indigo-500', bgColor: 'bg-indigo-100' },
  { id: 'allowance', name: 'ค่าขนม', emoji: '🎁', color: 'text-pink-500', bgColor: 'bg-pink-100' },
  { id: 'others', name: 'รายรับอื่นๆ', emoji: '🪙', color: 'text-amber-500', bgColor: 'bg-amber-100' }
];

export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  { id: 'food', name: 'อาหาร & เครื่องดื่ม', emoji: '🍔', color: 'text-orange-500', bgColor: 'bg-orange-100' },
  { id: 'travel', name: 'เดินทาง & รถสาธารณะ', emoji: '🚗', color: 'text-sky-500', bgColor: 'bg-sky-100' },
  { id: 'shopping', name: 'ช้อปปิ้ง & แฟชั่น', emoji: '🛍️', color: 'text-rose-500', bgColor: 'bg-rose-100' },
  { id: 'rent', name: 'ค่าเช่า & ที่อยู่อาศัย', emoji: '🏠', color: 'text-blue-500', bgColor: 'bg-blue-100' },
  { id: 'bills', name: 'ค่าน้ำ/ไฟ/เน็ต/มือถือ', emoji: '⚡', color: 'text-amber-500', bgColor: 'bg-amber-100' },
  { id: 'entertainment', name: 'สตรีมมิ่ง & ความบันเทิง', emoji: '🎬', color: 'text-purple-500', bgColor: 'bg-purple-100' },
  { id: 'health', name: 'สุขภาพ & ยา & ประกัน', emoji: '🏥', color: 'text-teal-500', bgColor: 'bg-teal-100' },
  { id: 'beauty', name: 'เสริมสวย & ดูแลตัวเอง', emoji: '💅', color: 'text-pink-500', bgColor: 'bg-pink-100' },
  { id: 'education', name: 'การศึกษา & หนังสือ', emoji: '📚', color: 'text-indigo-500', bgColor: 'bg-indigo-100' },
  { id: 'family', name: 'ครอบครัว & บุตรหลาน', emoji: '👶', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { id: 'pets', name: 'สัตว์เลี้ยงแสนรัก', emoji: '🐱', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { id: 'investment', name: 'ออมเงิน & การลงทุน', emoji: '🐷', color: 'text-emerald-500', bgColor: 'bg-emerald-100' },
  { id: 'debts', name: 'ผ่อนชำระ & บัตรเครดิต', emoji: '💳', color: 'text-violet-500', bgColor: 'bg-violet-100' },
  { id: 'social', name: 'สังสรรค์ & ของขวัญ & งานบุญ', emoji: '🍻', color: 'text-red-500', bgColor: 'bg-red-100' },
  { id: 'maintenance', name: 'ซ่อมบำรุงบ้าน/รถ', emoji: '🔧', color: 'text-stone-500', bgColor: 'bg-stone-100' },
  { id: 'tax', name: 'ภาษี & ค่าธรรมเนียม', emoji: '🧾', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'others', name: 'รายจ่ายอื่นๆ', emoji: '🧸', color: 'text-slate-500', bgColor: 'bg-slate-100' }
];

export function getCategoryDetails(id: string, type: 'income' | 'expense'): CategoryInfo {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const found = categories.find(c => c.id === id);
  if (found) return found;
  
  // Default fallbacks
  return type === 'income' 
    ? { id: 'others', name: 'รายรับอื่นๆ', emoji: '🪙', color: 'text-amber-500', bgColor: 'bg-amber-100' }
    : { id: 'others', name: 'รายจ่ายอื่นๆ', emoji: '🧸', color: 'text-slate-500', bgColor: 'bg-slate-100' };
}
