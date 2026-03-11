import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBrain, FaBuilding, FaUser } from "react-icons/fa";
import { HiArrowRight, HiEye, HiEyeOff, HiLockClosed, HiMail, HiUser } from "react-icons/hi";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import InputField from "../components/ui/InputField";
import Button from "../components/ui/Button";
import { cn } from "../utils/cn";
import { useAuth } from "../context/useAuth";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "job_seeker",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.password, formData.role);
      toast.success("Account created successfully");
      navigate("/profile/setup");
    } catch (error) {
      toast.error(error.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="section-container py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-6 items-stretch">
          <Card className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-accent to-primary text-white">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-white/20">
                <FaBrain className="size-5" />
              </span>
              <span className="font-display text-2xl">RecruitAI</span>
            </Link>
            <div className="space-y-4">
              <p className="text-sm font-semibold tracking-wide uppercase text-white/80">Create your workspace</p>
              <h1 className="font-display text-4xl leading-tight">Start screening candidates with confident AI support.</h1>
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
              <h1 className="font-display text-3xl text-text-primary">Create account</h1>
              <p className="mt-2 text-text-secondary">Choose your role and set up credentials.</p>
            </header>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-text-primary">I am a</legend>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: "job_seeker" }))}
                    className={cn(
                      "btn btn-md justify-center",
                      formData.role === "job_seeker" ? "btn-primary" : "btn-secondary"
                    )}
                  >
                    <FaUser className="size-4" />
                    Job seeker
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: "recruiter" }))}
                    className={cn(
                      "btn btn-md justify-center",
                      formData.role === "recruiter" ? "btn-primary" : "btn-secondary"
                    )}
                  >
                    <FaBuilding className="size-4" />
                    Recruiter
                  </button>
                </div>
              </fieldset>

              <InputField
                id="name"
                label="Full name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                icon={<HiUser className="size-5" />}
              />

              <InputField
                id="email"
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                icon={<HiMail className="size-5" />}
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <InputField
                  id="password"
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
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

                <InputField
                  id="confirmPassword"
                  label="Confirm password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  icon={<HiLockClosed className="size-5" />}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Complete registration
                    <HiArrowRight className="size-5" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              Already registered?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default Register;
