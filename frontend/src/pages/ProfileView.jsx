import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Pencil,
  Building,
  Globe,
  MapPin,
  Calendar,
  Tag,
  Users,
  GraduationCap,
  Briefcase,
  Code,
  ExternalLink,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import { getProfile, updateProfile, createJobSeekerProfile, createCompanyProfile } from "../services/api";

export default function ProfileView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Tab state (Job Seeker only)
  const [activeTab, setActiveTab] = useState("about"); // about, skills, experience, education, projects
  
  // Inline edit state
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getProfile();
      setProfile(res.data.profile);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const isJobSeeker = user?.role === "job_seeker";

  const handleEditStart = (field, currentVal) => {
    setEditingField(field);
    setEditValue(currentVal || "");
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleEditSave = async (section) => {
    setSaving(true);
    try {
      if (section === "user") {
        await updateProfile({ [editingField]: editValue });
        toast.success("Profile updated");
      } else if (isJobSeeker) {
        // Deep clone current profile data to update the specific section
        const updatedData = { ...profile };
        
        if (section === "personal_info") {
          updatedData.personal_info = updatedData.personal_info || {};
          updatedData.personal_info[editingField] = editValue;
        } else if (section === "skills") {
          // Expecting comma separated skills
          const skillsArray = editValue.split(",").map(s => s.trim()).filter(Boolean);
          updatedData.skills = { skills: skillsArray };
        }
        
        await createJobSeekerProfile(updatedData);
        toast.success("Saved successfully");
      } else {
        // Recruiter profile update
        await createCompanyProfile({ [editingField]: editValue });
        toast.success("Saved successfully");
      }
      
      await fetchProfile(); // Reload data
      setEditingField(null);
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      </main>
    );
  }

  // ────────────────────────────
  // RECRUITER VIEW
  // ────────────────────────────
  if (!isJobSeeker) {
    return (
      <main className="page-shell">
        <section className="section-container py-8 sm:py-12">
          <div className="content-max-width">
            
            {/* Back Navigation */}
            <button 
              onClick={() => navigate(-1)} 
              className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              Back
            </button>

            <Card className="p-6 sm:p-10 max-w-3xl mx-auto animate-fade-in-up">
              {/* Header */}
              <div className="flex items-start justify-between mb-8 pb-8 border-b border-border">
                <div className="flex items-center gap-5">
                  <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-primary-strong to-accent text-white text-3xl font-bold shadow-md">
                    {profile?.name?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <div>
                    <div className="group flex items-center gap-2">
                       {editingField === "name" ? (
                         <div className="flex items-center gap-2">
                           <input autoFocus className="input-field py-1 px-2 text-lg" value={editValue} onChange={e => setEditValue(e.target.value)} />
                           <button onClick={() => handleEditSave("company")} disabled={saving} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"><Check className="size-4" /></button>
                           <button onClick={handleEditCancel} className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200"><X className="size-4" /></button>
                         </div>
                       ) : (
                         <>
                           <h1 className="font-display text-3xl tracking-tight text-text-primary">
                             {profile?.name || "Company Name"}
                           </h1>
                           <button onClick={() => handleEditStart("name", profile?.name)} className="opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary hover:text-primary hover:bg-surface-2 rounded-md transition-all">
                             <Pencil className="size-4" />
                           </button>
                         </>
                       )}
                    </div>
                    {/* Industry */}
                    <div className="group flex items-center gap-2 mt-2">
                      {editingField === "industry" ? (
                        <div className="flex items-center gap-2">
                          <input autoFocus className="input-field py-1 px-2 text-sm" placeholder="e.g. Software, Finance" value={editValue} onChange={e => setEditValue(e.target.value)} />
                          <button onClick={() => handleEditSave("company")} disabled={saving} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"><Check className="size-3" /></button>
                          <button onClick={handleEditCancel} className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200"><X className="size-3" /></button>
                        </div>
                      ) : (
                        <p className="text-text-secondary flex items-center gap-1.5">
                          <Tag className="size-4" /> 
                          {profile?.industry || "Add Industry"}
                          <button onClick={() => handleEditStart("industry", profile?.industry)} className="opacity-0 group-hover:opacity-100 ml-1 p-1 inline-flex text-text-tertiary hover:text-primary transition-all">
                            <Pencil className="size-3" />
                          </button>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 gap-8">
                
                {/* Left Column: About */}
                <div>
                  <div className="group flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                      <Building className="size-4" /> About Company
                    </h3>
                    {editingField !== "description" && (
                      <button onClick={() => handleEditStart("description", profile?.description)} className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-primary transition-opacity">
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </div>
                  
                  {editingField === "description" ? (
                    <div className="space-y-3">
                      <textarea autoFocus rows={5} className="input-field py-2 text-sm leading-relaxed" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Write a short description..." />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditSave("company")} isLoading={saving}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={handleEditCancel}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-primary text-sm whitespace-pre-line leading-relaxed">
                      {profile?.description ? profile.description : <span className="text-text-tertiary italic">No description provided. Click the edit icon to add one.</span>}
                    </p>
                  )}
                </div>

                {/* Right Column: Stats */}
                <div className="space-y-6">
                   <EditableStatBlock icon={<Users />} label="Size" field="size" value={profile?.size} onEdit={handleEditStart} />
                   <EditableStatBlock icon={<Calendar />} label="Founded" field="founded" value={profile?.founded} onEdit={handleEditStart} />
                   <EditableStatBlock icon={<MapPin />} label="Location" field="location" value={profile?.location} onEdit={handleEditStart} />
                   <EditableStatBlock icon={<Globe />} label="Website" field="website" value={profile?.website} onEdit={handleEditStart} isLink />
                </div>
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
          
          {/* Back Navigation */}
          <button 
            onClick={() => navigate(-1)} 
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            Back
          </button>

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Sidebar Profile Card */}
            <Card className="p-6 lg:w-1/3 h-fit sticky top-24 animate-fade-in-up">
               <div className="text-center mb-6">
                  <div className="mx-auto grid size-24 place-items-center rounded-full bg-gradient-to-br from-primary-strong to-accent text-white text-4xl font-bold shadow-md mb-4 ring-4 ring-offset-2 ring-primary/20">
                    {pi.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  
                  {/* Name Edit */}
                  <div className="group flex items-center justify-center gap-2">
                    {editingField === "name" ? (
                      <div className="flex items-center gap-1 bg-surface py-1 px-2 rounded-lg border border-border">
                        <input autoFocus className="bg-transparent border-none text-center outline-none w-32" value={editValue} onChange={e => setEditValue(e.target.value)} />
                        <button onClick={() => handleEditSave("personal_info")} disabled={saving} className="text-green-600 hover:text-green-700"><Check className="size-4" /></button>
                        <button onClick={handleEditCancel} className="text-red-500 hover:text-red-600"><X className="size-4" /></button>
                      </div>
                    ) : (
                      <>
                        <h1 className="font-display text-2xl text-text-primary">
                          {pi.name || user?.name || "Unknown User"}
                        </h1>
                        <button onClick={() => handleEditStart("name", pi.name || user?.name)} className="opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-primary transition-opacity">
                          <Pencil className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-text-secondary text-sm mt-1">{user?.email}</p>
               </div>

               <hr className="border-border my-6" />

               {/* Contact Infos */}
               <div className="space-y-4">
                  <EditableStatBlock icon={<Phone />} label="Phone" field="phone" value={pi.phone} onEdit={handleEditStart} />
                  <EditableStatBlock icon={<ExternalLink />} label="LinkedIn" field="linkedin" value={pi.linkedin} onEdit={handleEditStart} isLink />
                  <EditableStatBlock icon={<Code />} label="GitHub" field="github" value={pi.github} onEdit={handleEditStart} isLink />
               </div>
            </Card>

            {/* Main Content Area */}
            <div className="lg:w-2/3 flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
               
               {/* Custom Tabs Navigation */}
               <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-surface-2 rounded-xl border border-border">
                 {["about", "skills", "experience", "education", "projects"].map((tab) => (
                   <button
                     key={tab}
                     onClick={() => setActiveTab(tab)}
                     className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg capitalize transition-all whitespace-nowrap ${
                       activeTab === tab 
                        ? "bg-white text-primary shadow-sm ring-1 ring-border" 
                        : "text-text-secondary hover:text-text-primary hover:bg-surface"
                     }`}
                   >
                     {tab}
                   </button>
                 ))}
               </div>

               <Card className="p-6 sm:p-8 min-h-[400px]">
                 
                 {/* TAB: ABOUT */}
                 {activeTab === "about" && (
                   <div className="animate-fade-in">
                     <div className="group flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                          <User className="size-5 text-primary" /> Professional Summary
                        </h2>
                        {editingField !== "summary" && (
                          <Button size="sm" variant="secondary" onClick={() => handleEditStart("summary", pi.summary)}>
                            <Pencil className="size-4 mr-1.5" /> Edit
                          </Button>
                        )}
                     </div>
                     
                     {editingField === "summary" ? (
                        <div className="space-y-4">
                          <textarea autoFocus rows={6} className="input-field py-3 leading-relaxed" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Write your professional summary here..." />
                          <div className="flex gap-3">
                            <Button onClick={() => handleEditSave("personal_info")} isLoading={saving}>Save Summary</Button>
                            <Button variant="secondary" onClick={handleEditCancel}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-surface-2 p-5 rounded-xl border border-border">
                          {pi.summary ? (
                            <p className="text-text-primary leading-relaxed whitespace-pre-line text-[15px]">{pi.summary}</p>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-text-tertiary mb-4">No summary provided yet.</p>
                              <Button size="sm" onClick={() => handleEditStart("summary", "")}>Add Summary</Button>
                            </div>
                          )}
                        </div>
                      )}
                   </div>
                 )}

                 {/* TAB: SKILLS */}
                 {activeTab === "skills" && (
                   <div className="animate-fade-in">
                      <div className="group flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                          <Tag className="size-5 text-primary" /> Technical Skills
                        </h2>
                        {editingField !== "skills" && (
                          <Button size="sm" variant="secondary" onClick={() => handleEditStart("skills", skillList.join(", "))}>
                            <Pencil className="size-4 mr-1.5" /> Edit
                          </Button>
                        )}
                     </div>

                     {editingField === "skills" ? (
                        <div className="space-y-4 bg-surface-2 p-5 rounded-xl border border-border">
                          <label className="text-sm font-medium mb-1 block">Skills (comma separated)</label>
                          <textarea autoFocus rows={3} className="input-field" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="React, Node.js, Python, AWS..." />
                          <div className="flex gap-3 pt-2">
                            <Button size="sm" onClick={() => handleEditSave("skills")} isLoading={saving}>Save Skills</Button>
                            <Button size="sm" variant="secondary" onClick={handleEditCancel}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {skillList.length > 0 ? (
                            <div className="flex flex-wrap gap-2.5">
                                {skillList.map((s) => (
                                    <Badge key={s} tone="brand" className="px-3 py-1.5 text-sm">
                                        {s}
                                    </Badge>
                                ))}
                            </div>
                          ) : (
                             <div className="text-center py-8 bg-surface-2 rounded-xl border border-border">
                              <p className="text-text-tertiary mb-4">No skills added yet.</p>
                              <Button size="sm" onClick={() => handleEditStart("skills", "")}>Add Skills</Button>
                            </div>
                          )}
                        </div>
                      )}
                   </div>
                 )}

                 {/* TAB: EXPERIENCE (View Only for now to show array rendering) */}
                 {activeTab === "experience" && (
                   <div className="animate-fade-in">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                          <Briefcase className="size-5 text-primary" /> Work Experience
                        </h2>
                        <Button size="sm" variant="secondary" disabled><Pencil className="size-4 mr-1.5" /> Advanced Edit in Setup</Button>
                     </div>

                      {profile?.experience?.length > 0 ? (
                          <div className="space-y-5 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                              {profile.experience.map((exp, i) => (
                                  <div key={i} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                      {/* Timeline dot */}
                                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        <Briefcase className="size-4" />
                                      </div>
                                      {/* Content */}
                                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border border-border bg-surface-2 shadow-sm transition-all hover:shadow-md">
                                          <h4 className="font-bold text-text-primary text-lg">
                                            {typeof exp === "string" ? exp : exp.role || exp.title || "Role"}
                                          </h4>
                                          {exp.company && (
                                            <p className="text-primary font-medium mt-1 mb-2">{exp.company}</p>
                                          )}
                                          {exp.duration && (
                                              <div className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary bg-surface px-2.5 py-1 rounded-md border border-border mb-3">
                                                <Calendar className="size-3" /> {exp.duration}
                                              </div>
                                          )}
                                          {exp.description && (
                                            <p className="text-sm text-text-secondary leading-relaxed">{exp.description}</p>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                         <div className="text-center py-12 bg-surface-2 rounded-xl border border-border">
                           <Briefcase className="size-10 text-border mx-auto mb-3" />
                           <p className="text-text-tertiary mb-4">No experience added yet.</p>
                           <Link to="/profile/setup">
                             <Button size="sm">Go to Full Profile Setup</Button>
                           </Link>
                         </div>
                      )}
                   </div>
                 )}

                 {/* TAB: EDUCATION */}
                 {activeTab === "education" && (
                   <div className="animate-fade-in">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                          <GraduationCap className="size-5 text-primary" /> Education History
                        </h2>
                        <Button size="sm" variant="secondary" disabled><Pencil className="size-4 mr-1.5" /> Advanced Edit in Setup</Button>
                     </div>

                      {profile?.education?.length > 0 ? (
                          <div className="space-y-4">
                              {profile.education.map((edu, i) => (
                                  <div key={i} className="flex gap-4 p-5 rounded-xl border border-border bg-surface-2 transition-all hover:border-primary/30">
                                      <div className="mt-1 grid size-12 shrink-0 place-items-center rounded-xl bg-surface border border-border text-primary">
                                        <GraduationCap className="size-6" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-text-primary text-lg">
                                            {typeof edu === "string" ? edu : edu.degree || "Degree"}
                                        </h4>
                                        {edu.institution && (
                                            <p className="text-text-secondary">{edu.institution}</p>
                                        )}
                                        {edu.year && (
                                            <p className="text-xs text-text-tertiary mt-2 flex items-center gap-1"><Calendar className="size-3"/> Class of {edu.year}</p>
                                        )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                         <div className="text-center py-12 bg-surface-2 rounded-xl border border-border">
                           <GraduationCap className="size-10 text-border mx-auto mb-3" />
                           <p className="text-text-tertiary mb-4">No education added yet.</p>
                           <Link to="/profile/setup">
                             <Button size="sm">Go to Full Profile Setup</Button>
                           </Link>
                         </div>
                      )}
                   </div>
                 )}

                 {/* TAB: PROJECTS */}
                 {activeTab === "projects" && (
                   <div className="animate-fade-in">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                          <Code className="size-5 text-primary" /> Projects & Portfolio
                        </h2>
                        <Button size="sm" variant="secondary" disabled><Pencil className="size-4 mr-1.5" /> Advanced Edit in Setup</Button>
                     </div>

                      {profile?.projects?.length > 0 ? (
                          <div className="grid sm:grid-cols-2 gap-5">
                              {profile.projects.map((proj, i) => (
                                  <div key={i} className="group p-6 rounded-xl border border-border bg-surface-2 flex flex-col h-full transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/40">
                                      <div className="mb-4">
                                        <div className="size-10 inline-flex items-center justify-center rounded-lg bg-surface border border-border text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                          <Code className="size-5" />
                                        </div>
                                      </div>
                                      <h4 className="font-bold text-text-primary text-[17px] mb-2">
                                          {typeof proj === "string" ? proj : proj.name || proj.title || "Project Title"}
                                      </h4>
                                      {proj.description && (
                                          <p className="text-sm text-text-secondary leading-relaxed flex-grow">
                                              {proj.description.length > 120 ? `${proj.description.substring(0, 120)}...` : proj.description}
                                          </p>
                                      )}
                                      <div className="mt-4 pt-4 border-t border-border flex justify-end">
                                        <button className="text-xs font-semibold text-primary inline-flex items-center gap-1 py-1 px-2 rounded hover:bg-surface">View Details <ArrowLeft className="size-3 rotate-135" /></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                         <div className="text-center py-12 bg-surface-2 rounded-xl border border-border">
                           <Code className="size-10 text-border mx-auto mb-3" />
                           <p className="text-text-tertiary mb-4">No projects added yet.</p>
                           <Link to="/profile/setup">
                             <Button size="sm">Go to Full Profile Setup</Button>
                           </Link>
                         </div>
                      )}
                   </div>
                 )}

               </Card>
            </div>
            
          </div>
        </div>
      </section>
    </main>
  );
}

// ────────────────────────────
// Small Contextual Edit Component
// ────────────────────────────
function EditableStatBlock({ icon, label, field, value, onEdit, isLink }) {
  // If no value is provided, we still render so the user can click to add one.
  const displayValue = value || <span className="text-text-tertiary italic text-[13px]">Add {label}</span>;
  
  return (
    <div className="group flex items-start gap-3">
      <div className="mt-0.5 text-text-secondary bg-surface p-1.5 rounded-md border border-border">
        {icon}
      </div>
      <div className="flex-grow">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block mb-0.5">
          {label}
        </span>
        
        <div className="flex items-center justify-between">
          <div className="truncate pr-4 max-w-[200px]">
            {isLink && value ? (
              <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline truncate inline-block w-full">
                {displayValue}
              </a>
            ) : (
              <span className="text-sm font-medium text-text-primary capitalize-first truncate inline-block w-full">
                {displayValue}
              </span>
            )}
          </div>
          
          {/* Edit Trigger */}
          <button 
            onClick={() => onEdit(field, value)} 
            className="opacity-0 group-hover:opacity-100 p-1 bg-surface-2 rounded text-text-secondary hover:text-primary hover:bg-surface transition-all shrink-0"
            title={`Edit ${label}`}
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
