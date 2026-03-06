import { Link } from "react-router-dom";
import { FaChartLine, FaFileAlt, FaRobot } from "react-icons/fa";
import { HiArrowRight, HiSparkles } from "react-icons/hi";
import Footer from "../components/Footer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionHeading from "../components/ui/SectionHeading";
import { useAuth } from "../context/useAuth";

const stats = [
  { value: "98%", label: "Parse accuracy" },
  { value: "10x", label: "Faster shortlisting" },
  { value: "50+", label: "Skills mapped" },
];

const features = [
  {
    icon: <FaFileAlt className="size-5" />,
    title: "Intelligent parsing",
    desc: "Extract structured candidate data from PDF and DOCX files with resilient field handling.",
  },
  {
    icon: <FaRobot className="size-5" />,
    title: "Semantic matching",
    desc: "Go beyond keyword checks and identify candidates by context, role fit, and signal quality.",
  },
  {
    icon: <FaChartLine className="size-5" />,
    title: "Skill analytics",
    desc: "See competency and confidence insights that support faster and clearer hiring decisions.",
  },
];

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-shell">
      <main>
        <section className="relative overflow-hidden pt-12 pb-18 sm:pt-16 sm:pb-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-[-8rem] top-14 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute right-[-8rem] bottom-8 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          </div>

          <div className="section-container grid lg:grid-cols-2 items-center gap-12">
            <div className="space-y-7 animate-fade-in-up">
              <Badge tone="brand" className="gap-1.5">
                <HiSparkles className="size-3.5" />
                AI-powered recruitment
              </Badge>
              <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl leading-tight text-text-primary">
                Hire faster with a bold, intelligence-first pipeline
              </h1>
              <p className="text-lg text-text-secondary max-w-2xl">
                RecruitAI parses resumes, surfaces relevant candidate signals, and helps teams make stronger decisions in less time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={isAuthenticated ? "/resume-parser" : "/register"} className="btn btn-primary btn-lg w-full sm:w-auto">
                  {isAuthenticated ? "Upload resume" : "Get started"}
                  <HiArrowRight className="size-5" />
                </Link>
                <Link to={isAuthenticated ? "/resume-parser" : "/login"} className="btn btn-secondary btn-lg w-full sm:w-auto">
                  {isAuthenticated ? "Open parser" : "Log in"}
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
                {stats.map((stat) => (
                  <Card key={stat.label} className="p-3 sm:p-4 text-center">
                    <p className="font-display text-2xl sm:text-3xl text-primary">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-text-secondary">{stat.label}</p>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-4 sm:p-5 animate-fade-in">
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src="/hero_ai_illustration.png"
                  alt="Abstract illustration of AI-powered hiring workflow"
                  className="w-full object-cover"
                />
                <div className="absolute left-4 top-4 glass-line rounded-xl px-3 py-2 text-sm font-semibold text-text-primary">
                  System Online
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="py-16 sm:py-20 border-y border-border bg-surface-light">
          <div className="section-container space-y-10">
            <SectionHeading
              align="center"
              title="Everything needed to modernize your hiring"
              subtitle="A focused toolkit that turns unstructured resumes into useful hiring intelligence."
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map(({ icon, title, desc }) => (
                <Card key={title} className="p-6">
                  <span className="mb-4 inline-grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    {icon}
                  </span>
                  <h3 className="font-display text-xl text-text-primary">{title}</h3>
                  <p className="mt-2 text-text-secondary leading-relaxed">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="section-container content-max-width">
            <Card className="p-8 sm:p-10 text-center">
              <SectionHeading
                align="center"
                title="Ready to accelerate your hiring?"
                subtitle="Use AI-backed resume parsing to reduce manual screening and focus on qualified talent."
              />
              <div className="mt-8">
                <Link to={isAuthenticated ? "/resume-parser" : "/register"} className="btn btn-primary btn-lg">
                  {isAuthenticated ? "Upload resume" : "Start free"}
                  <HiArrowRight className="size-5" />
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
