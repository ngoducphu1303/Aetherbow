import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ShieldCheck,
  User as UserIcon,
  UserPlus,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  getFirebaseAuthConsoleUrl,
  loginWithGoogle,
  loginWithPassword,
  mapAuthError,
  registerWithPassword,
} from '../services/playerCloudService';

export interface AuthSuccessMeta {
  displayNameOverride?: string;
  isNewRegistration?: boolean;
  preserveGuestSave?: boolean;
}

interface AuthGatePanelProps {
  modeInitial?: 'login' | 'register';
  title?: string;
  subtitle?: string;
  allowGuest?: boolean;
  isGuestLinking?: boolean;
  onAuthStart?: () => void;
  onAuthAbort?: () => void;
  onAuthSuccess: (user: User, meta?: AuthSuccessMeta) => Promise<void> | void;
  onContinueGuest?: () => void;
  onClose?: () => void;
  compact?: boolean;
}

const GoogleMarkSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-1.99 3.72-4.92 3.72-8.69z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.7-2.87c-.98.66-2.23 1.06-3.58 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
  </svg>
);

export const AuthGatePanel: React.FC<AuthGatePanelProps> = ({
  modeInitial = 'login',
  title = 'Cổng Tài Khoản Tinh Giới',
  subtitle = 'Lưu trữ toàn bộ anh hùng, trang bị và tiến trình lên đám mây Firebase',
  allowGuest = false,
  isGuestLinking = false,
  onAuthStart,
  onAuthAbort,
  onAuthSuccess,
  onContinueGuest,
  onClose,
  compact = false,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'register'>(modeInitial);
  const [accountInput, setAccountInput] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState<'password' | 'google' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showProviderHelp, setShowProviderHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setShowProviderHelp(false);

    if (authTab === 'register') {
      if (displayName.trim().length < 2 || displayName.trim().length > 24) {
        setErrorMsg('Tên hiển thị cần từ 2 đến 24 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp.');
        return;
      }
    }

    setSubmitting('password');
    onAuthStart?.();
    try {
      const user =
        authTab === 'register'
          ? await registerWithPassword(accountInput, password, displayName)
          : await loginWithPassword(accountInput, password);
      await onAuthSuccess(user, {
        displayNameOverride: authTab === 'register' ? displayName.trim() : undefined,
        isNewRegistration: authTab === 'register',
        preserveGuestSave: isGuestLinking,
      });
    } catch (err) {
      onAuthAbort?.();
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';
      if (code === 'auth/operation-not-allowed') {
        setShowProviderHelp(true);
      }
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (submitting) return;
    setErrorMsg(null);
    setShowProviderHelp(false);
    setSubmitting('google');
    onAuthStart?.();
    try {
      const user = await loginWithGoogle();
      await onAuthSuccess(user, {
        isNewRegistration: false,
        preserveGuestSave: isGuestLinking,
      });
    } catch (err) {
      onAuthAbort?.();
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      className={`cel-panel-ornate w-full rounded-3xl ${
        compact ? 'max-w-[440px] p-4 sm:p-5' : 'max-w-md p-5 sm:p-6'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
            <h2 className="font-display text-base sm:text-lg font-black text-white truncate">
              {title}
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-snug">
            {isGuestLinking
              ? 'Liên kết tài khoản để bảo vệ và đồng bộ toàn bộ tiến trình đang chơi trên máy.'
              : subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cổng tài khoản"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#050813] border border-amber-400/20 mb-3">
        <button
          type="button"
          onClick={() => {
            setAuthTab('login');
            setErrorMsg(null);
            setShowProviderHelp(false);
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            authTab === 'login'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-300/45'
              : 'text-slate-400 hover:text-slate-100 border border-transparent'
          }`}
        >
          <LogIn className="w-3.5 h-3.5 shrink-0" />
          <span>Đăng Nhập</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthTab('register');
            setErrorMsg(null);
            setShowProviderHelp(false);
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            authTab === 'register'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-300/45'
              : 'text-slate-400 hover:text-slate-100 border border-transparent'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span>Đăng Ký Mới</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {authTab === 'register' && (
          <div>
            <label
              htmlFor="auth-display-name"
              className="block text-[11px] font-semibold text-slate-300 mb-1"
            >
              Tên hiển thị trong game
            </label>
            <input
              id="auth-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ví dụ: Thần Tiễn Artemis"
              maxLength={24}
              autoComplete="nickname"
              className="w-full rounded-xl bg-[#050813] border border-amber-400/25 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-300"
              required
            />
          </div>
        )}

        <div>
          <label
            htmlFor="auth-account-id"
            className="block text-[11px] font-semibold text-slate-300 mb-1"
          >
            Tên tài khoản hoặc Email
          </label>
          <div className="relative">
            <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="auth-account-id"
              type="text"
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
              placeholder="Ví dụ: thanhlong99 hoặc email@gmail.com"
              autoComplete="username"
              maxLength={64}
              className="w-full rounded-xl bg-[#050813] border border-amber-400/25 pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-300"
              required
            />
          </div>
        </div>

        <div className={authTab === 'register' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : ''}>
          <div>
            <label
              htmlFor="auth-password"
              className="block text-[11px] font-semibold text-slate-300 mb-1"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete={authTab === 'register' ? 'new-password' : 'current-password'}
                minLength={6}
                maxLength={64}
                className="w-full rounded-xl bg-[#050813] border border-amber-400/25 pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-300"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {authTab === 'register' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-[11px] font-semibold text-slate-300 mb-1"
              >
                Nhập lại mật khẩu
              </label>
              <input
                id="auth-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu"
                autoComplete="new-password"
                minLength={6}
                maxLength={64}
                className="w-full rounded-xl bg-[#050813] border border-amber-400/25 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-300"
                required
              />
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/35 bg-rose-950/60 px-3 py-2 text-[11px] leading-relaxed text-rose-200 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div>{errorMsg}</div>
              {showProviderHelp && (
                <div className="text-[10px] text-amber-200/95">
                  Hướng dẫn bật Email/Password: mở Firebase Console tại{' '}
                  <span className="font-mono break-all underline">
                    {getFirebaseAuthConsoleUrl()}
                  </span>{' '}
                  → chọn <strong>Email/Password</strong> → bật <strong>Enable</strong> rồi lưu lại.
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting !== null}
          className="a2-yellow-btn w-full py-2.5 px-4 rounded-xl font-display font-black text-xs sm:text-sm tracking-[0.06em] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
        >
          {submitting === 'password' ? (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : authTab === 'register' ? (
            <UserPlus className="w-4 h-4 shrink-0" />
          ) : (
            <LogIn className="w-4 h-4 shrink-0" />
          )}
          <span>
            {submitting === 'password'
              ? 'Đang xác thực…'
              : authTab === 'register'
              ? isGuestLinking
                ? 'Tạo Tài Khoản & Giữ Tiến Trình'
                : 'Tạo Tài Khoản & Lưu Đám Mây'
              : 'Đăng Nhập Tài Khoản'}
          </span>
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-3">
        <span className="flex-1 h-px bg-amber-300/15" />
        <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
          Hoặc tiếp tục nhanh
        </span>
        <span className="flex-1 h-px bg-amber-300/15" />
      </div>

      {/* Google + Optional Guest Row */}
      <div className={allowGuest && onContinueGuest ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : ''}>
        <button
          type="button"
          disabled={submitting !== null}
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-60"
        >
          {submitting === 'google' ? (
            <span
              aria-hidden="true"
              className="size-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent"
            />
          ) : (
            <GoogleMarkSvg className="w-4 h-4 shrink-0" />
          )}
          <span>Đăng nhập Google</span>
        </button>

        {allowGuest && onContinueGuest && (
          <button
            type="button"
            disabled={submitting !== null}
            onClick={onContinueGuest}
            className="a2-slate-btn w-full py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <span>Chơi Thử (Khách)</span>
          </button>
        )}
      </div>
    </div>
  );
};
