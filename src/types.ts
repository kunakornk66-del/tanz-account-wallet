export type TransactionType = 'income' | 'expense';

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
