import { useContext } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import ExpenseManager from './pages/ExpenseManager';
import Login from './pages/Login';
import Register from './pages/Register';
import UploadBill from './pages/UploadBill';

const AppLayout = ({ children }) => {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <Navbar />
      {user && <Sidebar />}
      <main className={`px-4 pb-8 pt-24 transition-all sm:px-6 ${user ? 'md:pl-72' : ''}`}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadBill /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><ExpenseManager /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
