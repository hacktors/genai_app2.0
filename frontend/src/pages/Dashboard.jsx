import { AlertCircle, DollarSign, PieChart, TrendingUp } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart as RePie, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from '../components/StatCard';
import { AuthContext } from '../context/AuthContext';
import api from '../lib/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [metrics, setMetrics] = useState({ grandTotal: 0, rawCount: 0, breakdown: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/api/expenses/analytics');
        setMetrics(res.data);
      } catch (err) {
        console.error('Metrics engine offline.', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  if (loading) return <div className="p-6 text-brand-accent">Streaming data...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-4xl font-extrabold tracking-tight text-white">Financial Overview</h1>
        <p className="text-brand-muted">Aggregated expense intelligence from your uploaded receipts.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard title="Total Spent" value={`$${metrics.grandTotal.toFixed(2)}`} icon={DollarSign} color="blue" />
        <StatCard title="Ingested Receipts" value={metrics.rawCount || 0} icon={PieChart} color="emerald" />
        <StatCard title="Top Category" value={metrics.breakdown[0]?.name || 'None'} icon={TrendingUp} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex h-96 flex-col rounded-lg p-6 glass-panel">
          <h3 className="mb-4 text-lg font-semibold text-white">Category Distribution</h3>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <RePie>
                <Pie data={metrics.breakdown} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {metrics.breakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#161F30', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
              </RePie>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="flex h-96 flex-col rounded-lg p-6 glass-panel">
          <h3 className="mb-4 text-lg font-semibold text-white">Spend by Category</h3>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.breakdown}>
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ background: '#161F30', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="flex items-start gap-4 rounded-lg border border-blue-500/20 bg-blue-600/10 p-6">
        <AlertCircle className="mt-0.5 shrink-0 text-blue-400" />
        <div>
          <h4 className="mb-1 font-semibold text-white">AI Financial Observation</h4>
          <p className="text-sm leading-relaxed text-brand-muted">
            {metrics.grandTotal > 500
              ? 'High spending detected. Review shopping, entertainment, and recurring bill categories for optimization.'
              : 'Spending is currently within a modest range. Keep uploading receipts to improve category visibility.'}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
