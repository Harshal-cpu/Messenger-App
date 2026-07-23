import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoadingScreen from './components/LoadingScreen';
import PublicLayout from './layouts/MarketingLayout';
import Home from './pages/marketing/Home';
import About from './pages/marketing/About';
import Features from './pages/marketing/Features';
import Contact from './pages/marketing/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ChatPage from './pages/ChatPage';
import Settings from './pages/Settings';

// Code-split: Recharts (the biggest single dependency in the bundle) and the
// admin dashboard are only ever needed by admins, so there's no reason to
// ship that weight to every visitor's initial page load.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3500,
                style: {
                  background: 'var(--toast-bg, #16262A)',
                  color: '#EDEAE3',
                  fontSize: '13px',
                },
              }}
            />
            <Routes>
              {/* Public marketing site */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/features" element={<Features />} />
                <Route path="/contact" element={<Contact />} />
              </Route>

              {/* Auth flows (standalone, no marketing chrome) */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/verify-email/:token" element={<VerifyEmail />} />

              {/* The messenger app itself */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingScreen />}>
                      <AdminDashboard />
                    </Suspense>
                  </AdminRoute>
                }
              />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
