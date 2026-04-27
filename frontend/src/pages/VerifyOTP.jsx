import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { FaBrain } from "react-icons/fa";
import { HiArrowRight, HiMail, HiRefresh } from "react-icons/hi";
import toast from "react-hot-toast";
import { verifyOTP, resendOTP } from "../services/api";
import { useAuth } from "../context/useAuth";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const email = location.state?.email || "";

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleDigitChange = (index, value) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (digit && index === OTP_LENGTH - 1 && newDigits.every((d) => d !== "")) {
      handleVerify(newDigits.join(""));
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
      const newDigits = pasted.split("");
      setDigits(newDigits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (otpString) => {
    const otp = otpString || digits.join("");
    if (otp.length !== OTP_LENGTH) {
      toast.error("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOTP({ email, otp });
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      toast.success("Email verified! Welcome to RecruitAI.");
      navigate(res.data.user.profileComplete ? "/" : "/setup-profile", { replace: true });
    } catch (error) {
      const errMsg = error.response?.data?.error || "Verification failed";
      toast.error(errMsg);
      // Clear digits on error
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    try {
      await resendOTP({ email });
      toast.success("New verification code sent!");
      setResendTimer(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c)
    : "";

  if (!email) return null;

  return (
    <main className="login-page">
      <div className="login-bg-orb login-bg-orb--1" />
      <div className="login-bg-orb login-bg-orb--2" />

      <div className="login-card animate-fade-in-up" style={{ maxWidth: "460px" }}>
        {/* Header */}
        <div className="login-header">
          <Link to="/" className="login-brand">
            <span className="login-brand-icon">
              <FaBrain className="w-5 h-5" />
            </span>
            <span className="login-brand-name">RecruitAI</span>
          </Link>
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
          <h1 className="login-title">Check your email</h1>
          <p className="login-subtitle">
            We sent a 6-digit code to <strong>{maskedEmail}</strong>
          </p>
        </div>

        {/* OTP Input */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            margin: "28px 0",
          }}
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
                width: 52,
                height: 60,
                textAlign: "center",
                fontSize: 24,
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
                caretColor: "var(--color-primary, #2176FF)",
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

        {/* Verify Button */}
        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={loading || digits.some((d) => !d)}
          className="login-submit-btn"
          style={{ width: "100%", marginBottom: 16 }}
        >
          {loading ? (
            <>
              <span className="login-spinner" />
              Verifying…
            </>
          ) : (
            <>
              Verify Email
              <HiArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Resend */}
        <div style={{ textAlign: "center" }}>
          {resendTimer > 0 ? (
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary, #64748b)",
              }}
            >
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
                fontSize: 14,
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

        {/* Footer */}
        <p className="login-footer" style={{ marginTop: 24 }}>
          Wrong email?{" "}
          <Link to="/register" className="login-footer-link">
            Go back
          </Link>
        </p>
      </div>
    </main>
  );
}
