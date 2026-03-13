import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResumeParser from "./pages/ResumeParser";
import ProfileSetup from "./pages/ProfileSetup";
import ProfileView from "./pages/ProfileView";

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-surface text-text-primary transition-colors duration-300">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/profile/setup"
                element={
                  <ProfileSetupRoute>
                    <ProfileSetup />
                  </ProfileSetupRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resume-parser"
                element={
                  <ProtectedRoute>
                    <ResumeParser />
                  </ProtectedRoute>
                }
              />
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

/**
 * Profile setup route — requires auth but does NOT redirect to /profile/setup
 * (to avoid infinite redirect loop).
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/useAuth";

function ProfileSetupRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default App;
