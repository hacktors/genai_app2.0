import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, UploadCloud } from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Analyze Bill', path: '/upload', icon: UploadCloud },
  { name: 'Ledger Engine', path: '/expenses', icon: Receipt }
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed bottom-0 left-0 top-16 hidden w-64 flex-col gap-2 border-r border-white/10 p-4 glass-panel md:flex">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition ${
              isActive ? 'bg-brand-accent text-white shadow-lg shadow-blue-500/20' : 'text-brand-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={20} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </aside>
  );
};

export default Sidebar;
