import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useAuth } from "./context/useAuth";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProfileSetup from "./pages/ProfileSetup";
import ProfileView from "./pages/ProfileView";
import ATSChecker from "./pages/ATSChecker";

// ─────────────────────────────────────────────
// Route guards
// ─────────────────────────────────────────────

/** Spinner shown while auth state is loading */
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
  </div>
);

/**
 * ProtectedRoute — requires login + completed profile.
 * Redirects to /login if not authenticated.
 * Redirects to /setup-profile if profileComplete === false.
 */
function ProtectedRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user.profileComplete) return <Navigate to="/setup-profile" replace />;
  return children;
}

/**
 * SetupRoute — requires login but does NOT check profileComplete
 * (avoids infinite redirect loop on the setup page itself).
 * If profile is already complete, send them to the dashboard.
 */
function SetupRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.profileComplete) return <Navigate to="/" replace />;
  return children;
}

/**
 * GuestRoute — only for unauthenticated users (login/register).
 * If already logged in, redirect based on profile status.
 */
function GuestRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) {
    return <Navigate to={user.profileComplete ? "/" : "/setup-profile"} replace />;
  }
  return children;
}

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-surface text-text-primary transition-colors duration-300">
            <Navbar />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/ats-checker" element={<ATSChecker />} />

              {/* Guest-only (redirect if logged in) */}
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

              {/* Onboarding (requires auth, skips profile-complete check) */}
              <Route path="/setup-profile" element={<SetupRoute><ProfileSetup /></SetupRoute>} />

              {/* Protected (requires auth + completed profile) */}
              <Route path="/profile" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />

              {/* Legacy redirect */}
              <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
              <Route path="/profile/setup" element={<Navigate to="/setup-profile" replace />} />
              <Route path="/resume-parser" element={<Navigate to="/setup-profile" replace />} />
            </Routes>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              className: "bg-surface-light text-text-primary border border-border shadow-soft",
              style: {
                background: "var(--color-surface-2)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                fontSize: "14px",
              },
              success: { iconTheme: { primary: "#2176FF", secondary: "#fff" } },
              error: { iconTheme: { primary: "#F79824", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
