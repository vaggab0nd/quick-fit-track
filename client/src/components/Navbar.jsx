import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        location.pathname === to
          ? 'bg-teal-600 text-white'
          : 'text-slate-300 hover:text-white hover:bg-slate-700'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-xl font-bold text-teal-400">QuickFit</span>
        <div className="flex gap-1">
          {navLink('/', 'Dashboard')}
          {navLink('/my-activities', 'My Activities')}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-300 text-sm">{user?.name}</span>
        <button
          onClick={logout}
          className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
