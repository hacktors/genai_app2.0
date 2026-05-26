import { CheckCircle, Cpu, Upload } from 'lucide-react';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api, { getApiErrorMessage } from '../lib/api';

const categories = ['Food', 'Travel', 'Entertainment', 'Shopping', 'Medical', 'Education', 'Utilities', 'Bills', 'Groceries', 'Others'];
const paymentMethods = ['Cash', 'Card', 'UPI', 'NetBanking', 'Other'];

const UploadBill = () => {
  const { user } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const navigate = useNavigate();

  const handleUploadAndAnalyze = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('receipt', file);

    setAnalyzing(true);
    setError('');
    try {
      const res = await api.post('/api/ai/analyze', formData);
      setExtractedData(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'AI receipt analysis failed.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const saveExpenseToDB = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/expenses', extractedData);
      navigate('/expenses');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Database commit failed.'));
    } finally {
      setSaving(false);
    }
  };

  const updateExtracted = (field, value) => {
    setExtractedData((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="flex min-h-[400px] flex-col justify-between rounded-lg p-8 glass-panel">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-white">Document Parsing</h2>
          <p className="mb-6 text-sm text-brand-muted">Upload PNG, JPG, or PDF receipts for Gemini-powered extraction.</p>
        </div>
        <form onSubmit={handleUploadAndAnalyze} className="flex flex-1 flex-col justify-center gap-4">
          <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-white/10 p-8 transition hover:border-brand-accent/50">
            <Upload className="text-brand-muted transition group-hover:text-brand-accent" size={36} />
            <span className="max-w-full truncate text-sm text-brand-muted transition group-hover:text-white">{file ? file.name : 'Select receipt, bill, or invoice'}</span>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" accept="image/*,application/pdf" />
          </label>
          <button type="submit" disabled={!file || analyzing} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-accent py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 disabled:opacity-50">
            {analyzing ? (
              <>
                <Cpu className="animate-spin" size={18} />
                <span>Analyzing...</span>
              </>
            ) : (
              'Analyze receipt'
            )}
          </button>
          {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
        </form>
      </section>

      <section className="flex flex-col rounded-lg p-8 glass-panel">
        <h3 className="mb-4 text-xl font-bold text-white">Extracted Expense</h3>
        {extractedData ? (
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase text-brand-muted">Merchant</label>
                <input type="text" value={extractedData.merchant || ''} onChange={(e) => updateExtracted('merchant', e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-brand-dark/50 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-brand-muted">Total</label>
                <input type="number" min="0" step="0.01" value={extractedData.total || 0} onChange={(e) => updateExtracted('total', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-brand-dark/50 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-brand-muted">Subtotal</label>
                <input type="number" min="0" step="0.01" value={extractedData.subtotal || 0} onChange={(e) => updateExtracted('subtotal', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-brand-dark/50 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-brand-muted">Tax</label>
                <input type="number" min="0" step="0.01" value={extractedData.tax || 0} onChange={(e) => updateExtracted('tax', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-brand-dark/50 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-brand-muted">Category</label>
                <select value={extractedData.category || 'Others'} onChange={(e) => updateExtracted('category', e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-brand-dark/50 px-3 py-2 text-sm text-white">
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-brand-muted">Payment</label>
                <select value={extractedData.paymentMethod || 'Other'} onChange={(e) => updateExtracted('paymentMethod', e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-brand-dark/50 px-3 py-2 text-sm text-white">
                  {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase text-brand-muted">Date</label>
                <input type="date" value={(extractedData.date || '').substring(0, 10)} onChange={(e) => updateExtracted('date', e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-brand-dark/50 px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <button onClick={saveExpenseToDB} disabled={saving} className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:opacity-60">
              <CheckCircle size={18} />
              <span>{saving ? 'Saving...' : 'Save expense'}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-white/5 bg-brand-dark/20 p-6 text-sm text-brand-muted">
            Awaiting receipt analysis.
          </div>
        )}
      </section>
    </div>
  );
};

export default UploadBill;
