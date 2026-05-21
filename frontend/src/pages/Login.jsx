import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../lib/api';

const Login = () => {
  const { register, handleSubmit } = useForm();
  const { loginSession } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', data);
      loginSession(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg p-8 glass-panel">
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-white">Sign in</h2>
        <p className="mb-6 text-sm text-brand-muted">Access your expense intelligence workspace.</p>
        {error && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input {...register('email')} type="email" placeholder="Email address" className="w-full rounded-lg border border-white/10 bg-brand-dark px-4 py-3 text-white outline-none transition focus:border-brand-accent" required />
          <input {...register('password')} type="password" placeholder="Password" className="w-full rounded-lg border border-white/10 bg-brand-dark px-4 py-3 text-white outline-none transition focus:border-brand-accent" required />
          <button type="submit" disabled={submitting} className="mt-2 w-full rounded-lg bg-brand-accent py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 disabled:opacity-60">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-brand-muted">
          New workspace? <Link to="/register" className="text-brand-accent hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
