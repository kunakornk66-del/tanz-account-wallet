import React, { useState } from 'react';
import { Cloud, Copy, RefreshCw, Key, ArrowLeftRight, Check, HelpCircle } from 'lucide-react';

interface CloudSyncPanelProps {
  syncKey: string;
  lastSyncedAt: number;
  isDark: boolean;
  onSyncNow: () => void;
  onRestoreWithKey: (key: string) => Promise<boolean>;
  isSyncing: boolean;
  accentClass?: string;
  secondaryBtnClass?: string;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({
  syncKey,
  lastSyncedAt,
  isDark,
  onSyncNow,
  onRestoreWithKey,
  isSyncing,
  accentClass,
  secondaryBtnClass
}) => {
  const [inputKey, setInputKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreBox, setShowRestoreBox] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(syncKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    
    setIsRestoring(true);
    const success = await onRestoreWithKey(inputKey.trim());
    setIsRestoring(false);

    if (success) {
      setInputKey('');
      setShowRestoreBox(false);
    }
  };

  // Format sync timestamp
  const formattedSyncTime = lastSyncedAt > 0 
    ? new Date(lastSyncedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'ยังไม่ได้เชื่อมต่อ';

  return (
    <div className={`p-4 rounded-3xl border transition-all ${
      isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
    }`}>
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : accentClass || 'bg-rose-50 text-rose-500'}`}>
            <Cloud size={16} className={isSyncing ? 'animate-bounce' : ''} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              สำรองข้อมูลอัตโนมัติ (Cloud Sync)
            </h3>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              ซิงค์ข้อมูลปลอดภัย อุปกรณ์ iOS และ Android
            </p>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-1">
          <span className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          <span className="text-[9px] font-bold text-slate-400">คลาวด์ทำงานอยู่</span>
        </div>
      </div>

      {/* Cloud Profile Key Box */}
      <div className={`p-3.5 rounded-2xl border mb-3.5 relative overflow-hidden ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-indigo-50/20 border-indigo-100/50'
      }`}>
        <div className="flex justify-between items-start mb-1.5">
          <span className="text-[10px] font-bold text-indigo-600 dark:text-amber-400 flex items-center gap-1">
            <Key size={11} /> รหัสผ่านซิงค์ข้อมูล (My Sync Key)
          </span>
          <span className="text-[8px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full dark:bg-emerald-950/40 dark:text-emerald-400">
            คลาวด์ปลอดภัย 100%
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <code className="text-sm font-extrabold tracking-wider font-mono text-slate-800 dark:text-white">
            {syncKey || 'KUMA-SYNCING...'}
          </code>
          <button
            onClick={handleCopy}
            className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs'
            }`}
            title="Copy Key"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>

        <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">
          💡 ใช้รหัสนี้ล็อกอินบนโทรศัพท์ iOS / Android เพื่อเรียกคืนและแชร์ยอดบัญชีเดียวกันได้ทันที!
        </p>
      </div>

      {/* Manual Sync Bar */}
      <div className="flex items-center justify-between text-xs mb-3 font-semibold">
        <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          ซิงค์ล่าสุด: <span className="font-bold text-slate-600 dark:text-slate-200">{formattedSyncTime}</span>
        </span>
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 ${
            isDark 
              ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700 disabled:opacity-50' 
              : secondaryBtnClass || 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100 disabled:opacity-50'
          }`}
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลทีนี้'}
        </button>
      </div>

      {/* Restore/Sync with existing Key Button */}
      {!showRestoreBox ? (
        <button
          onClick={() => setShowRestoreBox(true)}
          className={`w-full py-2 px-3 border border-dashed rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
            isDark 
              ? 'border-slate-800 text-slate-400 hover:bg-slate-800/40' 
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <ArrowLeftRight size={12} />
          <span>เชื่อมต่อกับเครื่องอื่นด้วยรหัสซิงค์ (Sync Key)</span>
        </button>
      ) : (
        <form onSubmit={handleRestore} className="space-y-2 slide-up">
          <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
            <label className={`block text-[10px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              กรอกรหัส Sync Key เพื่อดึงข้อมูล:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder=""
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                className={`flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-none ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-rose-400'
                }`}
                required
              />
              <button
                type="submit"
                disabled={isRestoring}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isRestoring ? 'กู้คืน...' : 'ตกลง'}
              </button>
              <button
                type="button"
                onClick={() => setShowRestoreBox(false)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-300' 
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                ปิด
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
