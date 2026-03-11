import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    HiUser,
    HiMail,
    HiPhone,
    HiPencil,
    HiOfficeBuilding,
    HiGlobe,
    HiLocationMarker,
    HiCalendar,
    HiTag,
    HiUserGroup,
    HiAcademicCap,
    HiBriefcase,
    HiCode,
    HiExternalLink,
} from "react-icons/hi";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import { getProfile } from "../services/api";

const ProfileView = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getProfile();
                setProfile(res.data.profile);
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <main className="page-shell">
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                </div>
            </main>
        );
    }

    const isJobSeeker = user?.role === "job_seeker";

    // ────────────────────────────
    // RECRUITER VIEW
    // ────────────────────────────
    if (!isJobSeeker) {
        return (
            <main className="page-shell">
                <section className="section-container py-8 sm:py-12">
                    <div className="content-max-width">
                        <Card className="p-6 sm:p-10 max-w-3xl mx-auto animate-fade-in-up">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary-strong to-accent text-white text-2xl font-bold shadow-md">
                                        {profile?.name?.charAt(0)?.toUpperCase() || "C"}
                                    </div>
                                    <div>
                                        <h1 className="font-display text-2xl text-text-primary">
                                            {profile?.name || "Company"}
                                        </h1>
                                        {profile?.industry && (
                                            <p className="text-text-secondary flex items-center gap-1.5">
                                                <HiTag className="size-4" /> {profile.industry}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Link to="/profile/setup">
                                    <Button variant="secondary" size="sm">
                                        <HiPencil className="size-4" /> Edit
                                    </Button>
                                </Link>
                            </div>

                            {/* Details */}
                            <div className="space-y-5">
                                <div className="grid sm:grid-cols-3 gap-5">
                                    {profile?.size && (
                                        <InfoBlock
                                            icon={<HiUserGroup className="size-5" />}
                                            label="Size"
                                            value={profile.size}
                                            capitalize
                                        />
                                    )}
                                    {profile?.founded && (
                                        <InfoBlock
                                            icon={<HiCalendar className="size-5" />}
                                            label="Founded"
                                            value={profile.founded}
                                        />
                                    )}
                                    {profile?.location && (
                                        <InfoBlock
                                            icon={<HiLocationMarker className="size-5" />}
                                            label="Location"
                                            value={profile.location}
                                        />
                                    )}
                                </div>

                                {profile?.website && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <HiGlobe className="size-4 text-text-secondary" />
                                        <a
                                            href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline flex items-center gap-1"
                                        >
                                            {profile.website}
                                            <HiExternalLink className="size-3" />
                                        </a>
                                    </div>
                                )}

                                {profile?.description && (
                                    <div>
                                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
                                            About
                                        </h3>
                                        <p className="text-text-primary whitespace-pre-line leading-relaxed">
                                            {profile.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </section>
            </main>
        );
    }

    // ────────────────────────────
    // JOB SEEKER VIEW
    // ────────────────────────────
    const pi = profile?.personal_info || {};
    const skillList = profile?.skills?.skills || [];

    return (
        <main className="page-shell">
            <section className="section-container py-8 sm:py-12">
                <div className="content-max-width">
                    {/* Profile Header Card */}
                    <Card className="p-6 sm:p-10 max-w-3xl mx-auto animate-fade-in-up">
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary-strong to-accent text-white text-2xl font-bold shadow-md">
                                    {pi.name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div>
                                    <h1 className="font-display text-2xl text-text-primary">
                                        {pi.name || user?.name || "Unknown"}
                                    </h1>
                                    <p className="text-text-secondary text-sm">{pi.email || user?.email}</p>
                                </div>
                            </div>
                            <Link to="/profile/setup">
                                <Button variant="secondary" size="sm">
                                    <HiPencil className="size-4" /> Edit
                                </Button>
                            </Link>
                        </div>

                        {/* Contact & Links */}
                        <div className="flex flex-wrap gap-4 text-sm mb-8">
                            {pi.phone && (
                                <span className="flex items-center gap-1.5 text-text-secondary">
                                    <HiPhone className="size-4" /> {pi.phone}
                                </span>
                            )}
                            {pi.linkedin && (
                                <a
                                    href={pi.linkedin.startsWith("http") ? pi.linkedin : `https://${pi.linkedin}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-primary hover:underline"
                                >
                                    <HiExternalLink className="size-4" /> LinkedIn
                                </a>
                            )}
                            {pi.github && (
                                <a
                                    href={pi.github.startsWith("http") ? pi.github : `https://${pi.github}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-primary hover:underline"
                                >
                                    <HiCode className="size-4" /> GitHub
                                </a>
                            )}
                        </div>

                        {/* Summary */}
                        {pi.summary && (
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <HiUser className="size-4" /> Summary
                                </h3>
                                <p className="text-text-primary whitespace-pre-line leading-relaxed">
                                    {pi.summary}
                                </p>
                            </div>
                        )}

                        {/* Skills */}
                        {skillList.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">
                                    Skills
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {skillList.map((s) => (
                                        <Badge key={s} tone="brand">
                                            {s}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Education */}
                        {profile?.education?.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <HiAcademicCap className="size-4" /> Education
                                </h3>
                                <div className="space-y-3">
                                    {profile.education.map((edu, i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl border border-border bg-surface-2 p-4"
                                        >
                                            <p className="font-semibold text-text-primary">
                                                {typeof edu === "string"
                                                    ? edu
                                                    : edu.degree || edu.institution || JSON.stringify(edu)}
                                            </p>
                                            {edu.institution && edu.degree && (
                                                <p className="text-sm text-text-secondary">
                                                    {edu.institution}
                                                </p>
                                            )}
                                            {edu.year && (
                                                <p className="text-xs text-text-secondary mt-1">
                                                    {edu.year}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Experience */}
                        {profile?.experience?.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <HiBriefcase className="size-4" /> Experience
                                </h3>
                                <div className="space-y-3">
                                    {profile.experience.map((exp, i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl border border-border bg-surface-2 p-4"
                                        >
                                            <p className="font-semibold text-text-primary">
                                                {typeof exp === "string"
                                                    ? exp
                                                    : exp.title || exp.company || exp.role || JSON.stringify(exp)}
                                            </p>
                                            {exp.company && exp.title && (
                                                <p className="text-sm text-text-secondary">
                                                    {exp.company}
                                                </p>
                                            )}
                                            {exp.duration && (
                                                <p className="text-xs text-text-secondary mt-1">
                                                    {exp.duration}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Projects */}
                        {profile?.projects?.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <HiCode className="size-4" /> Projects
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {profile.projects.map((proj, i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl border border-border bg-surface-2 p-4"
                                        >
                                            <p className="font-semibold text-text-primary">
                                                {typeof proj === "string"
                                                    ? proj
                                                    : proj.name || proj.title || JSON.stringify(proj)}
                                            </p>
                                            {proj.description && (
                                                <p className="text-sm text-text-secondary mt-1 line-clamp-3">
                                                    {proj.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </section>
        </main>
    );
};

// ────────────────────────────
// Small helper component
// ────────────────────────────
const InfoBlock = ({ icon, label, value, capitalize }) => (
    <div className="flex items-start gap-2">
        <span className="text-text-secondary mt-0.5">{icon}</span>
        <div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                {label}
            </span>
            <p className={`text-text-primary ${capitalize ? "capitalize" : ""}`}>
                {value}
            </p>
        </div>
    </div>
);

export default ProfileView;
