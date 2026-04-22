import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { t } = useTranslation();
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError(t('login.error'));
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      setResetError(t('login.error'));
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-white tracking-tight">
            Eva<span className="text-blue-400">Bus</span>
          </span>
          <p className="text-slate-400 text-sm mt-2">{t('login.subtitle')}</p>
        </div>

        {!showReset ? (
          /* Login form */
          <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl shadow-xl p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('login.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                autoFocus
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('login.emailPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {t('login.submit')}
            </button>

            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="w-full text-slate-400 hover:text-slate-200 text-sm text-center transition-colors"
            >
              {t('login.forgotPassword')}
            </button>
          </form>
        ) : (
          /* Forgot password form */
          <form onSubmit={handleReset} className="bg-slate-800 rounded-2xl shadow-xl p-8 space-y-5">
            {!resetSent ? (
              <>
                <p className="text-slate-300 text-sm">{t('login.resetEmailLabel')}</p>
                <div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => { setResetEmail(e.target.value); setResetError(''); }}
                    autoFocus
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('login.emailPlaceholder')}
                  />
                </div>
                {resetError && (
                  <p className="text-red-400 text-sm">{resetError}</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {t('login.sendResetEmail')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="w-full text-slate-400 hover:text-slate-200 text-sm text-center transition-colors"
                >
                  ← Back to Sign In
                </button>
              </>
            ) : (
              <>
                <p className="text-green-400 text-sm">{t('login.resetEmailSent')}</p>
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(''); }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Back to Sign In
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
