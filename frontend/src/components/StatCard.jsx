import { motion } from 'framer-motion';

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
  rose: 'bg-rose-500/10 text-rose-400'
};

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-lg p-6 glass-panel">
      <div className="min-w-0">
        <p className="mb-1 text-sm font-medium text-brand-muted">{title}</p>
        <h3 className="truncate text-3xl font-bold tracking-tight text-white">{value}</h3>
      </div>
      <div className={`rounded-lg p-4 ${colorClasses[color] || colorClasses.blue}`}>
        <Icon size={24} aria-hidden="true" />
      </div>
    </motion.div>
  );
};

export default StatCard;
