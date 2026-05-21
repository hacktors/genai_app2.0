import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Wallet } from 'lucide-react';

const Navbar = () => {
  const { user, logoutSession } = useContext(AuthContext);

  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 px-4 glass-panel sm:px-6">
      <div className="flex items-center gap-2 text-xl font-bold">
        <Wallet className="text-blue-500" aria-hidden="true" />
        <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">LEDGER.AI</span>
      </div>
      {user && (
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden truncate text-sm text-brand-muted sm:block">
            Identity: <b className="text-white">{user.name}</b>
          </span>
          <button
            onClick={logoutSession}
            className="rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
