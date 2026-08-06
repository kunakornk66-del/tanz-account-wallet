export type TransactionType = 'income' | 'expense' | 'transfer';

export type PaymentMethod = 'cash' | 'transfer' | 'promptpay' | 'credit' | 'other';

export type BankType = 
  | 'cash' 
  | 'kbank' 
  | 'scb' 
  | 'bbl' 
  | 'ktb' 
  | 'bay' 
  | 'ttb' 
  | 'gsb' 
  | 'baac' 
  | 'ghb' 
  | 'uob' 
  | 'cimb' 
  | 'lhb' 
  | 'kkp' 
  | 'tisco' 
  | 'icbc' 
  | 'isbt' 
  | 'sme' 
  | 'exim' 
  | 'citibank' 
  | 'truemoney' 
  | 'shopeepay' 
  | 'rabbitlinepay' 
  | 'paotang' 
  | 'savings' 
  | 'credit' 
  | 'other';

export interface BankAccount {
  id: string;
  name: string;
  bankKey: BankType;
  accountNumber?: string;
  initialBalance: number; // เงินตั้งต้นก่อนเอาเงินเข้าบัญชี
  color?: string;
  isDefault?: boolean;
}

export interface BankPreset {
  key: BankType;
  name: string;
  shortName: string;
  logoEmoji: string;
  bgGradient: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export const BANK_PRESETS: BankPreset[] = [
  {
    key: 'cash',
    name: 'เงินสด (Cash)',
    shortName: 'เงินสด',
    logoEmoji: '💵',
    bgGradient: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500'
  },
  {
    key: 'kbank',
    name: 'ธนาคารกสิกรไทย (KBank)',
    shortName: 'กสิกรไทย',
    logoEmoji: '💚',
    bgGradient: 'from-emerald-600 to-green-700',
    badgeBg: 'bg-emerald-600',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-600'
  },
  {
    key: 'scb',
    name: 'ธนาคารไทยพาณิชย์ (SCB)',
    shortName: 'ไทยพาณิชย์',
    logoEmoji: '💜',
    bgGradient: 'from-purple-600 to-indigo-800',
    badgeBg: 'bg-purple-700',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-600'
  },
  {
    key: 'bbl',
    name: 'ธนาคารกรุงเทพ (BBL)',
    shortName: 'กรุงเทพ',
    logoEmoji: '💙',
    bgGradient: 'from-blue-700 to-indigo-900',
    badgeBg: 'bg-blue-800',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-700'
  },
  {
    key: 'ktb',
    name: 'ธนาคารกรุงไทย (KTB)',
    shortName: 'กรุงไทย',
    logoEmoji: '🩵',
    bgGradient: 'from-sky-400 to-cyan-600',
    badgeBg: 'bg-sky-500',
    textColor: 'text-sky-500',
    borderColor: 'border-sky-500'
  },
  {
    key: 'bay',
    name: 'ธนาคารกรุงศรีอยุธยา (BAY)',
    shortName: 'กรุงศรี',
    logoEmoji: '💛',
    bgGradient: 'from-amber-400 to-yellow-600',
    badgeBg: 'bg-amber-500',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500'
  },
  {
    key: 'ttb',
    name: 'ธนาคารทหารไทยธนชาต (ttb)',
    shortName: 'ttb',
    logoEmoji: '🔷',
    bgGradient: 'from-blue-500 to-blue-700',
    badgeBg: 'bg-blue-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-600'
  },
  {
    key: 'gsb',
    name: 'ธนาคารออมสิน (GSB)',
    shortName: 'ออมสิน',
    logoEmoji: '🩷',
    bgGradient: 'from-pink-500 to-rose-600',
    badgeBg: 'bg-pink-500',
    textColor: 'text-pink-500',
    borderColor: 'border-pink-500'
  },
  {
    key: 'baac',
    name: 'ธนาคารเพื่อการเกษตรฯ (ธ.ก.ส.)',
    shortName: 'ธ.ก.ส.',
    logoEmoji: '🌾',
    bgGradient: 'from-emerald-700 to-teal-800',
    badgeBg: 'bg-emerald-700',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-700'
  },
  {
    key: 'ghb',
    name: 'ธนาคารอาคารสงเคราะห์ (ธอส.)',
    shortName: 'ธอส.',
    logoEmoji: '🏠',
    bgGradient: 'from-orange-500 to-amber-600',
    badgeBg: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500'
  },
  {
    key: 'uob',
    name: 'ธนาคารยูโอบี (UOB)',
    shortName: 'UOB',
    logoEmoji: '🩶',
    bgGradient: 'from-slate-700 to-slate-900',
    badgeBg: 'bg-slate-700',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-600'
  },
  {
    key: 'cimb',
    name: 'ธนาคารซีไอเอ็มบี ไทย (CIMB)',
    shortName: 'CIMB',
    logoEmoji: '❤️',
    bgGradient: 'from-red-600 to-rose-800',
    badgeBg: 'bg-red-600',
    textColor: 'text-red-600',
    borderColor: 'border-red-600'
  },
  {
    key: 'lhb',
    name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
    shortName: 'LH Bank',
    logoEmoji: '🪙',
    bgGradient: 'from-teal-600 to-cyan-800',
    badgeBg: 'bg-teal-600',
    textColor: 'text-teal-600',
    borderColor: 'border-teal-600'
  },
  {
    key: 'kkp',
    name: 'ธนาคารเกียรตินาคินภัทร (KKP / Dime!)',
    shortName: 'KKP',
    logoEmoji: '🏛️',
    bgGradient: 'from-indigo-600 to-purple-800',
    badgeBg: 'bg-indigo-600',
    textColor: 'text-indigo-600',
    borderColor: 'border-indigo-600'
  },
  {
    key: 'tisco',
    name: 'ธนาคารทิสโก้ (TISCO)',
    shortName: 'TISCO',
    logoEmoji: '🏢',
    bgGradient: 'from-blue-600 to-indigo-800',
    badgeBg: 'bg-blue-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-600'
  },
  {
    key: 'icbc',
    name: 'ธนาคารไอซีบีซี (ไทย) (ICBC)',
    shortName: 'ICBC',
    logoEmoji: '🔴',
    bgGradient: 'from-red-700 to-rose-900',
    badgeBg: 'bg-red-700',
    textColor: 'text-red-700',
    borderColor: 'border-red-700'
  },
  {
    key: 'isbt',
    name: 'ธนาคารอิสลามแห่งประเทศไทย (iBank)',
    shortName: 'iBank',
    logoEmoji: '🌙',
    bgGradient: 'from-emerald-800 to-teal-900',
    badgeBg: 'bg-emerald-800',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-800'
  },
  {
    key: 'sme',
    name: 'ธนาคาร SME D Bank',
    shortName: 'SME Bank',
    logoEmoji: '💼',
    bgGradient: 'from-sky-600 to-blue-800',
    badgeBg: 'bg-sky-600',
    textColor: 'text-sky-600',
    borderColor: 'border-sky-600'
  },
  {
    key: 'exim',
    name: 'ธนาคาร EXIM Bank',
    shortName: 'EXIM',
    logoEmoji: '🚢',
    bgGradient: 'from-cyan-600 to-blue-800',
    badgeBg: 'bg-cyan-600',
    textColor: 'text-cyan-600',
    borderColor: 'border-cyan-600'
  },
  {
    key: 'citibank',
    name: 'ซิตี้แบงก์ (Citibank)',
    shortName: 'Citibank',
    logoEmoji: '🏙️',
    bgGradient: 'from-blue-500 to-indigo-700',
    badgeBg: 'bg-blue-500',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500'
  },
  {
    key: 'truemoney',
    name: 'ทรูมันนี่ วอลเล็ท (TrueMoney)',
    shortName: 'TrueMoney',
    logoEmoji: '🧡',
    bgGradient: 'from-orange-500 to-red-500',
    badgeBg: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500'
  },
  {
    key: 'shopeepay',
    name: 'ช้อปปี้เพย์ (ShopeePay)',
    shortName: 'ShopeePay',
    logoEmoji: '🟠',
    bgGradient: 'from-orange-600 to-amber-600',
    badgeBg: 'bg-orange-600',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-600'
  },
  {
    key: 'rabbitlinepay',
    name: 'แรบบิท ไลน์ เพย์ (LINE Pay)',
    shortName: 'LINE Pay',
    logoEmoji: '💚',
    bgGradient: 'from-green-500 to-emerald-600',
    badgeBg: 'bg-green-500',
    textColor: 'text-green-500',
    borderColor: 'border-green-500'
  },
  {
    key: 'paotang',
    name: 'เป๋าตัง (Paotang G-Wallet)',
    shortName: 'เป๋าตัง',
    logoEmoji: '🩵',
    bgGradient: 'from-cyan-500 to-sky-600',
    badgeBg: 'bg-cyan-500',
    textColor: 'text-cyan-500',
    borderColor: 'border-cyan-500'
  },
  {
    key: 'savings',
    name: 'กระปุกออมเงิน / สลากออมทรัพย์',
    shortName: 'เงินออม',
    logoEmoji: '🐷',
    bgGradient: 'from-pink-400 to-purple-500',
    badgeBg: 'bg-pink-400',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-400'
  },
  {
    key: 'credit',
    name: 'บัตรเครดิต (Credit Card)',
    shortName: 'บัตรเครดิต',
    logoEmoji: '💳',
    bgGradient: 'from-violet-600 to-purple-900',
    badgeBg: 'bg-violet-600',
    textColor: 'text-violet-600',
    borderColor: 'border-violet-600'
  },
  {
    key: 'other',
    name: 'ธนาคาร / บัญชีอื่นๆ',
    shortName: 'อื่นๆ',
    logoEmoji: '🏦',
    bgGradient: 'from-slate-600 to-stone-800',
    badgeBg: 'bg-slate-600',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-600'
  }
];

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subCategory?: string; // Optional sub-category (e.g., 'พ่อ', 'แม่', 'ลูก' under 'family')
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  createdAt: number; // timestamp
  slipImage?: string; // Optional base64 or file URL for bank slip
  slipImages?: string[]; // Optional array of base64 or file URLs for multiple bank slips
  isRecurring?: boolean; // Mark transaction as recurring monthly
  recurringDay?: number; // Day of month for recurring (1-31)
  recurringParentId?: string; // ID of the parent recurring transaction if generated automatically
  paymentMethod?: PaymentMethod; // เงินสด / โอนเงิน / พร้อมเพย์ / บัตรเครดิต
  accountId?: string; // ID ของ BankAccount ต้นทาง (เช่น 'acc_cash', 'acc_kbank')
  toAccountId?: string; // ID ของ BankAccount ปลายทาง (กรณีโอนเงินระหว่างบัญชี)
}

export type ThemeType = 'cherry' | 'matcha' | 'blueberry' | 'peach' | 'cocoa' | 'natural';

export interface AppTheme {
  id: ThemeType;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
  emoji: string;
}

export interface SyncProfile {
  uid: string;
  displayName: string;
  syncKey: string;
  lastSyncedAt: number;
}

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM
  message: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  emoji: string;
  createdAt: number;
}

