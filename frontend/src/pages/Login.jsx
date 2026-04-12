import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBrain, FaGoogle, FaLinkedinIn } from "react-icons/fa";
import { HiArrowRight, HiEye, HiEyeOff } from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";

/* ─── Floating-label input ─── */
const FloatingInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  name,
  autoComplete,
  required,
  rightAction,
}) => {
  const hasValue = value && value.length > 0;
  return (
    <div className="floating-group">
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        placeholder=" "
        className={`floating-input ${hasValue ? "has-value" : ""}`}
      />
      <label htmlFor={id} className="floating-label">
        {label}
      </label>
      {rightAction && (
        <span className="absolute inset-y-0 right-3 flex items-center">
          {rightAction}
        </span>
      )}
    </div>
  );
};

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(formData.email, formData.password);
      navigate(data.user.profileComplete ? "/" : "/setup-profile");
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      {/* Ambient gradient orbs */}
      <div className="login-bg-orb login-bg-orb--1" />
      <div className="login-bg-orb login-bg-orb--2" />

      <div className="login-card animate-fade-in-up">
        {/* ── Header ── */}
        <div className="login-header">
          <Link to="/" className="login-brand">
            <span className="login-brand-icon">
              <FaBrain className="w-5 h-5" />
            </span>
            <span className="login-brand-name">RecruitAI</span>
          </Link>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">
            Sign in to access your dashboard and workflows.
          </p>
        </div>

        {/* ── Form ── */}
        <form className="login-form" onSubmit={handleSubmit}>
          <FloatingInput
            id="email"
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
          />

          <FloatingInput
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            rightAction={
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <HiEyeOff className="w-5 h-5" />
                ) : (
                  <HiEye className="w-5 h-5" />
                )}
              </button>
            }
          />

          <div className="login-forgot-row">
            <Link to="#" className="login-forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-submit-btn"
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                Authenticating…
              </>
            ) : (
              <>
                Sign in
                <HiArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* ── Divider ── */}
        <div className="login-divider">
          <span className="login-divider-line" />
          <span className="login-divider-text">Or continue with</span>
          <span className="login-divider-line" />
        </div>

        {/* ── Social buttons ── */}
        <div className="login-social-row">
          <button type="button" className="login-social-btn">
            <FaGoogle className="w-4 h-4" />
            Google
          </button>
          <button type="button" className="login-social-btn">
            <FaLinkedinIn className="w-4 h-4" />
            LinkedIn
          </button>
        </div>

        {/* ── Footer ── */}
        <p className="login-footer">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="login-footer-link">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
};

export default Login;
