import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, CloudLightning, CloudLightning as CloudIcon, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'sync';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          // Color styles based on type
          let bgClass = 'bg-white border-slate-100 text-slate-800';
          let Icon = Info;
          let iconColor = 'text-blue-500';

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-slate-900 dark:border-emerald-900 dark:text-emerald-300';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-500';
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-slate-900 dark:border-rose-900 dark:text-rose-300';
            Icon = AlertCircle;
            iconColor = 'text-rose-500';
          } else if (toast.type === 'sync') {
            bgClass = 'bg-sky-50 border-sky-100 text-sky-800 dark:bg-slate-900 dark:border-sky-900 dark:text-sky-300';
            Icon = Sparkles;
            iconColor = 'text-sky-500';
          } else {
            bgClass = 'bg-indigo-50 border-indigo-100 text-indigo-800 dark:bg-slate-900 dark:border-indigo-900 dark:text-indigo-300';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg pointer-events-auto ${bgClass}`}
            >
              <div className={`${iconColor} shrink-0`}>
                <Icon size={20} className="animate-pulse" />
              </div>
              <p className="text-sm font-medium pr-2">{toast.message}</p>
              <button
                onClick={() => onClose(toast.id)}
                className="ml-auto text-slate-400 hover:text-slate-600 transition-colors shrink-0 text-xs"
              >
                ✕
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
