import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, X, Sparkles, RefreshCw, LogIn, Key } from 'lucide-react';
import { signUpUser, loginUser, loginWithGoogle } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  currentSyncKey: string;
  onLoginSuccess: (username: string, syncKey: string) => void;
  onSignupSuccess: (username: string, syncKey: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'sync') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isDark,
  currentSyncKey,
  onLoginSuccess,
  onSignupSuccess,
  addToast
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle(currentSyncKey);
      if (result.success && result.username && result.syncKey) {
        addToast(result.message, 'success');
        onLoginSuccess(result.username, result.syncKey);
        onClose();
      } else {
        addToast(result.message || 'ไม่สามารถลงชื่อเข้าใช้งานด้วย Google ได้ครับ 🥺', 'error');
      }
    } catch (err) {
      console.error('Google Auth error:', err);
      addToast('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Auth 🥺', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      addToast('กรุณากรอกข้อมูลให้ครบถ้วนด้วยน้า 🧸🔑', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === 'login') {
        const result = await loginUser(username, password);
        if (result.success && result.username && result.syncKey) {
          addToast(result.message, 'success');
          onLoginSuccess(result.username, result.syncKey);
          onClose();
        } else {
          addToast(result.message || 'เข้าสู่ระบบไม่สำเร็จครับ 🥺', 'error');
        }
      } else {
        // Sign Up links to the current local syncKey so local transactions aren't lost!
        const result = await signUpUser(username, password, currentSyncKey);
        if (result.success && result.username && result.syncKey) {
          addToast(result.message, 'success');
          onSignupSuccess(result.username, result.syncKey);
          onClose();
        } else {
          addToast(result.message || 'สมัครสมาชิกไม่สำเร็จครับ 🥺', 'error');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      addToast('เกิดข้อผิดพลาดจากระบบเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งครับ 🥺', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div 
        id="auth-modal-card"
        className={`w-full max-w-sm rounded-3xl border p-6 relative shadow-2xl transition-all duration-300 transform scale-100 ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-100 text-slate-800'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X size={18} />
        </button>

        {/* Mascot & Welcome Message */}
        <div className="flex flex-col items-center text-center space-y-1 mb-5">
          <div className="text-5xl animate-cute-float select-none mb-2">🧸🔑</div>
          <h2 className="text-lg font-extrabold tracking-tight">
            {activeTab === 'login' ? 'เข้าสู่ระบบคุมะคิง' : 'สมัครสมาชิกคุมะคิง'}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold">
            บัญชีคุมะคิง - ซิงค์ข้อมูลข้ามเครื่องด้วย Username & Password ☁️
          </p>
        </div>

        {/* Slidey Pill Tab Switcher */}
        <div className={`grid grid-cols-2 p-1.5 rounded-2xl mb-5 border ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/50'
        }`}>
          <button
            onClick={() => { setActiveTab('login'); setPassword(''); }}
            disabled={isLoading}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'login'
                ? isDark ? 'bg-slate-800 text-amber-400 shadow-sm' : 'bg-white text-rose-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setPassword(''); }}
            disabled={isLoading}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'signup'
                ? isDark ? 'bg-slate-800 text-amber-400 shadow-sm' : 'bg-white text-rose-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            สมัครสมาชิกใหม่
          </button>
        </div>

        {/* Explanatory Mascot Text */}
        <div className={`p-3 rounded-2xl text-xs mb-5 border ${
          isDark 
            ? 'bg-slate-950/50 border-slate-800/80 text-slate-300' 
            : 'bg-rose-50/40 border-rose-100/50 text-slate-600'
        }`}>
          <p className="leading-relaxed text-[11px] font-semibold">
            {activeTab === 'login' 
              ? '💡 เข้าสู่ระบบเพื่อดึงข้อมูลรายรับ-รายจ่ายที่เคยสำรองไว้บนระบบคลาวด์มาไว้ในเครื่องนี้ทันทีครับ!' 
              : '🧸 สมัครสมาชิกง่ายๆ ข้อมูลรายชื่อบัญชีเดิมทั้งหมดในระบบจะถูกผูกเข้ากับ ID ใหม่นี้ทันทีน้า ข้อมูลไม่หายแน่นอนครับ!'}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User size={15} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                placeholder="ภาษาอังกฤษและตัวเลขเท่านั้น (e.g. kuma_kung)"
                className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400/50'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-rose-400/50 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                รหัสผ่าน (Password)
              </label>
              {activeTab === 'signup' && (
                <span className="text-[9px] font-semibold text-rose-500">ขั้นต่ำ 4 ตัวอักษร</span>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="กรอกรหัสผ่านของคุณ"
                className={`w-full pl-9 pr-10 py-2.5 rounded-2xl text-xs font-semibold border transition-all focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400/50'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-rose-400/50 focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-500 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-2xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition-all active:scale-97 shadow-md ${
              isDark 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/10' 
                : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-500/10'
            } ${isLoading ? 'opacity-70 cursor-not-allowed animate-pulse' : ''}`}
          >
            {isLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : activeTab === 'login' ? (
              <LogIn size={14} />
            ) : (
              <Sparkles size={14} />
            )}
            <span>
              {isLoading 
                ? 'กำลังเชื่อมต่อเซิร์ฟเวอร์...' 
                : activeTab === 'login' ? 'เข้าสู่ระบบบัญชีของคุณ' : 'สมัครสมาชิกใหม่ทันที'}
            </span>
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
          <span className="px-2 text-[10px] font-bold text-slate-400 uppercase">หรือ</span>
          <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-97 border flex items-center justify-center gap-2 ${
            isDark 
              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:text-white' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02c1-2.93 3.73-5.54 6.72-5.54z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.54c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 7.56C.5 9.36 0 11.33 0 13.41s.5 4.05 1.39 5.85l3.89-3.02z"
            />
            <path
              fill="#34A853"
              d="M12 22.96c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.5 1.18-4.23 1.18-2.99 0-5.72-2.61-6.72-5.54l-3.89 3.02c1.98 3.89 5.96 6.56 10.61 6.56z"
            />
          </svg>
          <span>เข้าสู่ระบบด้วย Google (Gmail) ☁️</span>
        </button>

        {/* Quick hint bottom */}
        <div className="mt-4 text-center">
          <p className="text-[9px] font-bold text-slate-400 flex items-center justify-center gap-1">
            <Key size={10} /> เข้ารหัสผ่านแบบปลอดภัย (Secure Plaintext Protection)
          </p>
        </div>
      </div>
    </div>
  );
};
