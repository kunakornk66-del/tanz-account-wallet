import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Sparkles, AlertCircle, Heart, Check } from 'lucide-react';
import { ReminderSettings } from '../types';

interface ReminderPanelProps {
  settings: ReminderSettings;
  onSaveSettings: (settings: ReminderSettings) => void;
  isDark: boolean;
  onTriggerTestNotification: (msg: string) => void;
  accentClass?: string;
  enabledBgClass?: string;
  primaryBtnClass?: string;
}

export const ReminderPanel: React.FC<ReminderPanelProps> = ({
  settings,
  onSaveSettings,
  isDark,
  onTriggerTestNotification,
  accentClass,
  enabledBgClass,
  primaryBtnClass
}) => {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [time, setTime] = useState(settings.time);
  const [message, setMessage] = useState(settings.message);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setEnabled(settings.enabled);
    setTime(settings.time);
    setMessage(settings.message);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      enabled,
      time,
      message,
      days: [0, 1, 2, 3, 4, 5, 6] // all days
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);

    // Request native permission just in case
    if (enabled && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('System Notification Permission Granted');
        }
      });
    }
  };

  const handleTest = () => {
    onTriggerTestNotification(message || 'ก๊อกๆ 🧸 ได้เวลาบันทึกรายรับรายจ่ายแสนน่ารักแล้วน้าค้าบ~');
  };

  return (
    <div className={`p-4 rounded-3xl border transition-all ${
      isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
    }`}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : accentClass || 'bg-rose-50 text-rose-500'}`}>
          <Bell size={16} className={enabled ? 'animate-swing' : ''} />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            แจ้งเตือนจดบัญชีประจำวัน
          </h3>
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            ตั้งเวลาเตือนความจำให้คุณจดบันทึกทุกวัน
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            {enabled ? (
              <span className="text-emerald-500 flex items-center gap-1">🟢 เปิดใช้งานแจ้งเตือน</span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">⚪ ปิดใช้งาน</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-6.5 rounded-full p-1 transition-all duration-300 ${
              enabled ? `${enabledBgClass || 'bg-rose-500'} flex justify-end` : 'bg-slate-300 dark:bg-slate-700 flex justify-start'
            }`}
          >
            <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md block" />
          </button>
        </div>

        {enabled && (
          <div className="space-y-3.5 pt-1.5 slide-up">
            {/* Time Picker */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className={`text-xs font-bold col-span-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                ⏰ ตั้งเวลาเตือน:
              </span>
              <div className="relative col-span-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Clock size={13} />
                </div>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`block w-full pl-9 pr-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                      : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Message input */}
            <div>
              <span className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                💬 ข้อความเตือนความจำน่ารักๆ:
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="พิมพ์ข้อความที่ต้องการแจ้งเตือนความจำ..."
                rows={2}
                className={`block w-full p-2.5 text-xs font-medium rounded-xl border focus:outline-none ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'
                }`}
                required
              />
            </div>
          </div>
        )}

        {/* Informational Warning about Sandbox / iframe */}
        <div className={`p-3 rounded-2xl text-[10px] flex gap-2 items-start leading-relaxed ${
          isDark ? 'bg-slate-950/40 text-slate-400 border border-slate-900' : 'bg-amber-50/40 text-slate-500 border border-amber-100/40'
        }`}>
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-600 dark:text-slate-300">💡 การเตือนความจำน่ารัก:</p>
            <p>ระบบจะมีการเตือนความจำแบบเรียลไทม์ (In-App Notification) ด้วยผู้ช่วยน้องหมี Kuma-Kun 🧸 ทุกครั้งที่คุณใช้งานและถึงเวลา หรือกดทดสอบเพื่อจำลองการแจ้งเตือนได้ทันที!</p>
          </div>
        </div>

        {/* Action button row */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            className={`flex-1 py-2 px-3 border rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles size={12} className="text-amber-500" />
            <span>ทดสอบแจ้งเตือน</span>
          </button>

          <button
            type="submit"
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-extrabold ${primaryBtnClass || 'text-white bg-rose-500 hover:bg-rose-600'} transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm`}
          >
            {isSaved ? (
              <>
                <Check size={12} />
                <span>บันทึกแล้ว!</span>
              </>
            ) : (
              <>
                <Heart size={12} />
                <span>เซฟการตั้งค่า</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
