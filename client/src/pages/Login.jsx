import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';

function PinInput({ value, onChange }) {
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const digits = value.split('').concat(['', '', '', '']).slice(0, 4);

  function handleChange(index, e) {
    const char = e.target.value.slice(-1);
    if (char && !/\d/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const newPin = newDigits.join('');
    onChange(newPin);

    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs[index - 1].current?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    onChange(pasted.padEnd(0, ''));
    const focusIdx = Math.min(pasted.length, 3);
    inputRefs[focusIdx].current?.focus();
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={inputRefs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-14 h-14 text-center text-2xl font-bold bg-slate-700 border-2 border-slate-600 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors caret-transparent"
        />
      ))}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setPin('');
  }, [tab]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const fn = tab === 'login' ? api.login : api.register;
      const { token, user } = await fn(name.trim(), pin);
      login(token, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏃</div>
          <h1 className="text-3xl font-bold text-teal-400">QuickFit</h1>
          <p className="text-slate-400 mt-1">Office Fitness Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
          {/* Tabs */}
          <div className="flex mb-8 bg-slate-900 rounded-xl p-1">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                  tab === t
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {tab === 'login' ? 'Your Name' : 'Choose a Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alice"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                autoFocus
              />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
                {tab === 'login' ? 'Enter PIN' : 'Create a 4-digit PIN'}
              </label>
              <PinInput value={pin} onChange={setPin} />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
            >
              {loading
                ? 'Please wait...'
                : tab === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
