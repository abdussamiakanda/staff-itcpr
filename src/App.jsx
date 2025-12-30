import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Layout from './components/Layout';
import Staff from './pages/Staff';
import Applications from './pages/Applications';
import Users from './pages/Users';
import Finance from './pages/Finance';
import Issues from './pages/Issues';
import IssueDetail from './pages/IssueDetail';
import Emails from './pages/Emails';
import Newsletter from './pages/Newsletter';
import Publications from './pages/Publications';
import Responsibilities from './pages/Responsibilities';
import Technicals from './pages/Technicals';
import LoadingOverlay from './components/LoadingOverlay';

function App() {
  const { user, loading, isStaff } = useAuth();

  if (loading) {
    return <LoadingOverlay />;
  }

  if (!user || !isStaff) {
    return <Login />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-main)',
            color: 'var(--text-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/staff" replace />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/users" element={<Users />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/issues/:id" element={<IssueDetail />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/publications" element={<Publications />} />
            <Route path="/responsibilities" element={<Responsibilities />} />
            <Route path="/technicals" element={<Technicals />} />
          </Routes>
        </Layout>
      </Router>
    </>
  );
}

export default App;


