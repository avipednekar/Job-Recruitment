import { Link } from "react-router-dom";
import { FaBrain, FaGithub, FaLinkedin } from "react-icons/fa";
import { HiMail } from "react-icons/hi";

const socials = [
  { icon: <FaGithub className="size-4" />, label: "GitHub", href: "https://github.com", available: false },
  { icon: <FaLinkedin className="size-4" />, label: "LinkedIn", href: "https://linkedin.com", available: false },
  { icon: <HiMail className="size-4" />, label: "Email", href: "mailto:hello@recruitai.local", available: false },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-surface-light">
      <div className="section-container py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-strong to-accent text-white">
                <FaBrain className="size-5" />
              </span>
              <span className="font-display text-xl text-text-primary">RecruitAI</span>
            </Link>
            <p className="max-w-md text-text-secondary leading-relaxed">
              AI-first hiring platform for resume intelligence, faster qualification, and stronger talent decisions.
            </p>
          </div>

          <div>
            <h3 className="font-display text-lg text-text-primary mb-3">Quick links</h3>
            <ul className="space-y-2 text-text-secondary">
              <li>
                <Link className="hover:text-primary" to="/">
                  Home
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" to="/register">
                  Create account
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" to="/login">
                  Log in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-lg text-text-primary mb-3">Connect</h3>
            <div className="flex gap-2">
              {socials.map(({ icon, label, href, available }) =>
                available ? (
                  <a
                    key={label}
                    href={href}
                    className="btn btn-secondary btn-sm min-w-10"
                    aria-label={label}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {icon}
                  </a>
                ) : (
                  <span
                    key={label}
                    className="btn btn-secondary btn-sm min-w-10 opacity-60"
                    aria-label={`${label} not configured`}
                    title={`${label} link not configured`}
                  >
                    {icon}
                  </span>
                )
              )}
            </div>
            <p className="mt-3 text-xs text-text-secondary">Social links will be enabled after configuration.</p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-text-secondary">
          <p>&copy; {new Date().getFullYear()} RecruitAI</p>
          <p>Built for high-signal hiring workflows</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
