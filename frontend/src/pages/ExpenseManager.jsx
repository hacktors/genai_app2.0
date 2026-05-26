import { Filter, Search, Trash2 } from 'lucide-react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getApiErrorMessage } from '../lib/api';

const categories = ['Food', 'Travel', 'Entertainment', 'Shopping', 'Medical', 'Education', 'Utilities', 'Bills', 'Groceries', 'Others'];

const ExpenseManager = () => {
  const { user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/expenses', {
        params: { search, category }
      });
      setExpenses(res.data.expenses);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Expense synchronization failed.'));
    } finally {
      setLoading(false);
    }
  }, [category, search, user]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Deletion failed.'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Expense Ledger</h1>
        <div className="flex w-full flex-wrap gap-3 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-3.5 text-brand-muted" size={16} />
            <input type="text" placeholder="Search merchant..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-white/10 bg-brand-surface py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-brand-accent" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3.5 top-3.5 text-brand-muted" size={16} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-white/10 bg-brand-surface py-2.5 pl-10 pr-8 text-sm text-white outline-none transition focus:border-brand-accent">
              <option value="">All categories</option>
              {categories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      <section className="overflow-hidden rounded-lg border border-white/5 glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wider text-brand-muted">
                <th className="p-4">Merchant</th>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-white">
              {loading ? (
                <tr><td colSpan="5" className="p-6 text-center text-brand-accent">Fetching expenses...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-brand-muted">No records matched active filters.</td></tr>
              ) : expenses.map((expense) => (
                <tr key={expense._id} className="transition hover:bg-white/5">
                  <td className="p-4 font-medium">{expense.merchant}</td>
                  <td className="p-4 text-brand-muted">{expense.date.substring(0, 10)}</td>
                  <td className="p-4">
                    <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">{expense.category}</span>
                  </td>
                  <td className="p-4 font-semibold text-emerald-400">${Number(expense.total).toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(expense._id)} className="rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20" aria-label={`Delete ${expense.merchant}`} title="Delete expense">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ExpenseManager;
