import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBrain } from "react-icons/fa";
import { HiArrowRight, HiEye, HiEyeOff, HiLockClosed, HiMail, HiRefresh } from "react-icons/hi";
import toast from "react-hot-toast";
import { forgotPassword, resetPassword } from "../services/api";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

/* ─── Floating-label input (reused from Login) ─── */
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

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Steps: "email" → "reset"
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  // Reset step state
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c)
    : "";

  // ─── Step 1: Send reset code ───
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your email address");

    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      const data = res.data;
      if (data.devOtp) setDevOtp(data.devOtp);
      toast.success(data.message || "Reset code sent!");
      setResendTimer(RESEND_COOLDOWN);
      setStep("reset");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP digit handling ───
  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setDigits(pasted.split(""));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  // ─── Step 2: Reset password ───
  const handleReset = async (e) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length !== OTP_LENGTH) return toast.error("Please enter all 6 digits");
    if (!newPassword || newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    setLoading(true);
    try {
      const res = await resetPassword({ email, otp, newPassword });
      toast.success(res.data.message || "Password reset successful!");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reset password");
      if (error.response?.data?.error?.includes("Invalid")) {
        setDigits(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend code ───
  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    try {
      const res = await forgotPassword({ email });
      const nextDevOtp = res.data?.devOtp || "";
      setDevOtp(nextDevOtp);
      toast.success(nextDevOtp ? `Development code: ${nextDevOtp}` : "New reset code sent!");
      setResendTimer(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-bg-orb login-bg-orb--1" />
      <div className="login-bg-orb login-bg-orb--2" />

      <div className="login-card animate-fade-in-up" style={{ maxWidth: step === "reset" ? "480px" : "440px" }}>
        {/* ── Header ── */}
        <div className="login-header">
          <Link to="/" className="login-brand">
            <span className="login-brand-icon">
              <FaBrain className="w-5 h-5" />
            </span>
            <span className="login-brand-name">RecruitAI</span>
          </Link>

          {step === "email" ? (
            <>
              <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: "var(--color-primary, #2176FF)",
                    display: "grid",
                    placeItems: "center",
                    color: "white",
                  }}
                >
                  <HiLockClosed className="w-8 h-8" />
                </div>
              </div>
              <h1 className="login-title">Forgot password?</h1>
              <p className="login-subtitle">
                Enter your email and we&apos;ll send you a reset code.
              </p>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: "var(--color-primary, #2176FF)",
                    display: "grid",
                    placeItems: "center",
                    color: "white",
                  }}
                >
                  <HiMail className="w-8 h-8" />
                </div>
              </div>
              <h1 className="login-title">Reset your password</h1>
              <p className="login-subtitle">
                Enter the 6-digit code sent to <strong>{maskedEmail}</strong> and your new password.
              </p>
              {devOtp ? (
                <p
                  style={{
                    marginTop: 12,
                    color: "var(--color-primary, #2176FF)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Development code: {devOtp}
                </p>
              ) : null}
            </>
          )}
        </div>

        {/* ── Step 1: Email form ── */}
        {step === "email" && (
          <form className="login-form" onSubmit={handleSendCode}>
            <FloatingInput
              id="forgot-email"
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Sending…
                </>
              ) : (
                <>
                  Send Reset Code
                  <HiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP + New password form ── */}
        {step === "reset" && (
          <form className="login-form" onSubmit={handleReset}>
            {/* OTP Input */}
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "0 0 20px" }}
              onPaste={handlePaste}
            >
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  disabled={loading}
                  style={{
                    width: 48,
                    height: 56,
                    textAlign: "center",
                    fontSize: 22,
                    fontWeight: 700,
                    borderRadius: 12,
                    border: digit
                      ? "2px solid var(--color-primary, #2176FF)"
                      : "2px solid var(--color-border, #e2e8f0)",
                    background: digit
                      ? "var(--color-primary-bg, #EEF4FF)"
                      : "var(--color-surface, #fff)",
                    color: "var(--color-text-primary, #1e293b)",
                    outline: "none",
                    transition: "all 0.2s ease",
                    fontFamily: "'Courier New', monospace",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--color-primary, #2176FF)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(33, 118, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit
                      ? "var(--color-primary, #2176FF)"
                      : "var(--color-border, #e2e8f0)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              ))}
            </div>

            {/* Resend */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              {resendTimer > 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-text-secondary, #64748b)" }}>
                  Resend code in{" "}
                  <span style={{ fontWeight: 700, color: "var(--color-primary, #2176FF)" }}>
                    {resendTimer}s
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary, #2176FF)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <HiRefresh className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                  {resending ? "Sending..." : "Resend code"}
                </button>
              )}
            </div>

            {/* New password fields */}
            <FloatingInput
              id="new-password"
              label="New password"
              type={showPassword ? "text" : "password"}
              name="newPassword"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

            <FloatingInput
              id="confirm-password"
              label="Confirm new password"
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Resetting…
                </>
              ) : (
                <>
                  Reset Password
                  <HiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Footer ── */}
        <p className="login-footer" style={{ marginTop: 24 }}>
          Remember your password?{" "}
          <Link to="/login" className="login-footer-link">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
