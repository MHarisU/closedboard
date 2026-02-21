import { useState, useEffect } from 'react';
import { authenticatePin } from '../utils/api';

const AUTH_KEY = 'closedboard_auth';
const AUTH_DURATION_MS = 24 * 60 * 60 * 1000;

export default function PinGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const authData = localStorage.getItem(AUTH_KEY);
    if (authData) {
      try {
        const { timestamp, token } = JSON.parse(authData);
        if (Date.now() - timestamp < AUTH_DURATION_MS && token) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(AUTH_KEY);
        }
      } catch {
        localStorage.removeItem(AUTH_KEY);
      }
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length < 5 || isVerifying) return;

    setIsVerifying(true);
    setError('');

    const result = await authenticatePin(pin);

    if (result.success) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ timestamp: Date.now(), token: pin }));
      setIsAuthenticated(true);
    } else if (result.error === 'Network error') {
      setError('Cannot reach server. It may be waking up — try again in 30s.');
    } else {
      setError('Incorrect PIN');
      setPin('');
    }

    setIsVerifying(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-white mb-2">ClosedBoard</h1>
          <p className="text-slate-400 text-sm">Enter PIN to access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="•••••"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-center text-2xl tracking-widest placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              disabled={isVerifying}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 5 || isVerifying}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            {isVerifying ? 'Verifying...' : 'Unlock'}
          </button>
        </form>

        <p className="text-slate-500 text-xs text-center mt-6">
          Session expires after 24 hours
        </p>
      </div>
    </div>
  );
}
