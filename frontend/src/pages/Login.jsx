import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBrain } from "react-icons/fa";
import { HiArrowRight, HiEye, HiEyeOff, HiLockClosed, HiMail } from "react-icons/hi";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import InputField from "../components/ui/InputField";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success("Welcome back!");
      navigate("/resume-parser");
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="section-container py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-6 items-stretch">
          <Card className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary-strong to-primary text-white">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-white/20">
                <FaBrain className="size-5" />
              </span>
              <span className="font-display text-2xl">RecruitAI</span>
            </Link>
            <div className="space-y-4">
              <p className="text-sm font-semibold tracking-wide uppercase text-white/80">Talent Intelligence Platform</p>
              <h1 className="font-display text-4xl leading-tight">Sign in and continue hiring with signal, not noise.</h1>
            </div>
          </Card>

          <Card className="p-6 sm:p-10 max-w-xl w-full mx-auto">
            <div className="lg:hidden mb-7 text-center">
              <Link to="/" className="inline-flex items-center gap-2">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
                  <FaBrain className="size-5" />
                </span>
                <span className="font-display text-2xl text-text-primary">RecruitAI</span>
              </Link>
            </div>

            <header className="mb-7 text-center lg:text-left">
              <h1 className="font-display text-3xl text-text-primary">Welcome back</h1>
              <p className="mt-2 text-text-secondary">Sign in to access your dashboard and parser workflows.</p>
            </header>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <InputField
                id="email"
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                icon={<HiMail className="size-5" />}
              />

              <InputField
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                icon={<HiLockClosed className="size-5" />}
                rightIcon={
                  <button
                    type="button"
                    className="text-text-secondary hover:text-text-primary"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <HiEyeOff className="size-5" /> : <HiEye className="size-5" />}
                  </button>
                }
              />

              <p className="text-sm text-text-secondary">Password reset is not configured yet. Contact your administrator.</p>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign in
                    <HiArrowRight className="size-5" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              New here?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default Login;
