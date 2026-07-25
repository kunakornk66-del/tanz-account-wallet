import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, X, Sparkles, RefreshCw, LogIn, Key } from 'lucide-react';
import { signUpUser, loginUser } from '../firebase';

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

  React.useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setShowPassword(false);
    onClose();
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
          setUsername('');
          setPassword('');
          setShowPassword(false);
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
          setUsername('');
          setPassword('');
          setShowPassword(false);
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
          onClick={handleClose}
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
            ระบบเข้าสู่ระบบตรงด้วย Gmail & Password (ไม่ติดปัญหา iFrame) ☁️
          </p>
        </div>

        {/* Slidey Pill Tab Switcher */}
        <div className={`grid grid-cols-2 p-1.5 rounded-2xl mb-4 border ${
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
        <div className={`p-3 rounded-2xl text-xs mb-4 border ${
          isDark 
            ? 'bg-slate-950/50 border-slate-800/80 text-slate-300' 
            : 'bg-rose-50/40 border-rose-100/50 text-slate-600'
        }`}>
          <p className="leading-relaxed text-[11px] font-semibold">
            {activeTab === 'login' 
              ? '💡 ใส่ Gmail หรือ Username + รหัสผ่าน เพื่อดึงข้อมูลบัญชีของคุณกลับมาได้ทันทีครับ!' 
              : '🧸 สมัครด้วย Gmail หรือ Username + ตั้งรหัสผ่าน ข้อมูลจะซิงค์กับคลาวด์ Firebase ทันทีโดยไม่ติดปัญหา Popup!'}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Username / Gmail */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Gmail หรือ Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User size={15} />
              </span>
              <input
                type="text"
                name="username"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                placeholder="เช่น yourname@gmail.com หรือ kuma_user"
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
                name="password"
                autoComplete="new-password"
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

        {/* Quick hint bottom */}
        <div className="mt-4 text-center">
          <p className="text-[9px] font-bold text-slate-400 flex items-center justify-center gap-1">
            <Key size={10} /> ซิงค์ข้อมูลอัตโนมัติปลอดภัยผ่าน Firebase Cloud DB ☁️
          </p>
        </div>
      </div>
    </div>
  );
};
