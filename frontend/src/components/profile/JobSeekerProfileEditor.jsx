import { useMemo, useState } from "react";
import { HiPlus, HiTrash, HiX } from "react-icons/hi";
import InputField from "../ui/InputField";
import Button from "../ui/Button";
import {
  getEmptyEducationItem,
  getEmptyExperienceItem,
  getEmptyProjectItem,
  normalizeJobSeekerProfileData,
} from "./jobSeekerProfileData";

function SectionHeader({ title, description }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-bold uppercase tracking-wide text-text-secondary">{title}</h3>
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
    </div>
  );
}

function RepeatableSection({
  title,
  itemLabel,
  description,
  items,
  onAdd,
  onRemove,
  renderFields,
  addLabel,
  emptyState,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title={title} description={description} />
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <HiPlus className="size-4" /> {addLabel}
        </Button>
      </div>

      {items.length ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={`${title}-${index}`} className="rounded-2xl border border-border bg-surface-2 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">
                  {itemLabel} {index + 1}
                </p>
                <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
                  <HiTrash className="size-4" /> Remove
                </Button>
              </div>
              {renderFields(item, index)}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-text-secondary">
          {emptyState}
        </div>
      )}
    </div>
  );
}

export default function JobSeekerProfileEditor({
  data,
  onChange,
  idPrefix = "profile",
}) {
  const [skillInput, setSkillInput] = useState("");

  const safeData = useMemo(
    () => normalizeJobSeekerProfileData(data),
    [data],
  );

  const setField = (field) => (event) =>
    onChange({ ...safeData, [field]: event.target.value });

  const updateArrayItem = (field, index, key, value) => {
    const nextItems = safeData[field].map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item,
    );
    onChange({ ...safeData, [field]: nextItems });
  };

  const addArrayItem = (field, factory) => {
    onChange({ ...safeData, [field]: [...safeData[field], factory()] });
  };

  const removeArrayItem = (field, index) => {
    onChange({
      ...safeData,
      [field]: safeData[field].filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;

    const alreadyExists = safeData.skills.some(
      (skill) => skill.toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadyExists) {
      setSkillInput("");
      return;
    }

    onChange({ ...safeData, skills: [...safeData.skills, trimmed] });
    setSkillInput("");
  };

  const removeSkill = (skillToRemove) => {
    onChange({
      ...safeData,
      skills: safeData.skills.filter((skill) => skill !== skillToRemove),
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <SectionHeader
          title="Personal Information"
          description="Keep your core profile up to date so recruiters and the matching engine both see your latest details."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField id={`${idPrefix}-name`} label="Full Name" value={safeData.name} onChange={setField("name")} placeholder="John Doe" />
          <InputField id={`${idPrefix}-email`} label="Email" type="email" value={safeData.email} onChange={setField("email")} placeholder="john@example.com" />
          <InputField id={`${idPrefix}-phone`} label="Phone" value={safeData.phone} onChange={setField("phone")} placeholder="+91 98765 43210" />
          <InputField id={`${idPrefix}-location`} label="Location" value={safeData.location} onChange={setField("location")} placeholder="Bengaluru, India" />
          <InputField id={`${idPrefix}-title`} label="Job Title" value={safeData.title} onChange={setField("title")} placeholder="Frontend Developer" />
          <InputField id={`${idPrefix}-linkedin`} label="LinkedIn" value={safeData.linkedin} onChange={setField("linkedin")} placeholder="linkedin.com/in/johndoe" />
          <InputField id={`${idPrefix}-github`} label="GitHub" value={safeData.github} onChange={setField("github")} placeholder="github.com/johndoe" className="sm:col-span-2" />
        </div>
        <label htmlFor={`${idPrefix}-summary`} className="block space-y-2">
          <span className="text-sm font-semibold text-text-primary">Professional Summary</span>
          <textarea
            id={`${idPrefix}-summary`}
            className="input-field min-h-28 resize-y"
            value={safeData.summary}
            onChange={setField("summary")}
            placeholder="Highlight your experience, strongest skills, and the kind of roles you want next."
            rows={4}
          />
        </label>
      </div>

      <div className="space-y-4">
        <SectionHeader
          title="Skills"
          description="Add the tools, frameworks, and domain keywords you want matching to prioritize."
        />
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            value={skillInput}
            onChange={(event) => setSkillInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSkill();
              }
            }}
            placeholder="Type a skill and press Enter"
          />
          <Button variant="secondary" size="md" onClick={addSkill}>
            <HiPlus className="size-4" />
          </Button>
        </div>
        {safeData.skills.length ? (
          <div className="flex flex-wrap gap-2">
            {safeData.skills.map((skill, index) => (
              <button
                key={`${skill}-${index}`}
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <HiX className="size-3.5" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <RepeatableSection
        title="Experience"
        itemLabel="Experience"
        description="Add your work history with enough detail to improve recommendation quality."
        items={safeData.experience}
        onAdd={() => addArrayItem("experience", getEmptyExperienceItem)}
        onRemove={(index) => removeArrayItem("experience", index)}
        addLabel="Add experience"
        emptyState="No experience added yet. Add internships, freelance work, or full-time roles."
        renderFields={(item, index) => (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id={`${idPrefix}-experience-title-${index}`}
                label="Role"
                value={item.title}
                onChange={(event) => updateArrayItem("experience", index, "title", event.target.value)}
                placeholder="Software Engineer"
              />
              <InputField
                id={`${idPrefix}-experience-company-${index}`}
                label="Company"
                value={item.company}
                onChange={(event) => updateArrayItem("experience", index, "company", event.target.value)}
                placeholder="Acme Corp"
              />
            </div>
            <InputField
              id={`${idPrefix}-experience-duration-${index}`}
              label="Duration"
              value={item.duration}
              onChange={(event) => updateArrayItem("experience", index, "duration", event.target.value)}
              placeholder="Jan 2023 - Present"
            />
            <label htmlFor={`${idPrefix}-experience-description-${index}`} className="block space-y-2">
              <span className="text-sm font-semibold text-text-primary">Description</span>
              <textarea
                id={`${idPrefix}-experience-description-${index}`}
                className="input-field min-h-24 resize-y"
                value={item.description}
                onChange={(event) => updateArrayItem("experience", index, "description", event.target.value)}
                placeholder="Describe outcomes, responsibilities, and the stack you worked with."
                rows={4}
              />
            </label>
          </div>
        )}
      />

      <RepeatableSection
        title="Education"
        itemLabel="Education"
        description="Capture your degrees, certifications, or formal study history."
        items={safeData.education}
        onAdd={() => addArrayItem("education", getEmptyEducationItem)}
        onRemove={(index) => removeArrayItem("education", index)}
        addLabel="Add education"
        emptyState="No education added yet. Add your degree, school, or certification history."
        renderFields={(item, index) => (
          <div className="grid gap-4 sm:grid-cols-3">
            <InputField
              id={`${idPrefix}-education-degree-${index}`}
              label="Degree"
              value={item.degree}
              onChange={(event) => updateArrayItem("education", index, "degree", event.target.value)}
              placeholder="B.Tech Computer Science"
              className="sm:col-span-2"
            />
            <InputField
              id={`${idPrefix}-education-year-${index}`}
              label="Year"
              value={item.year}
              onChange={(event) => updateArrayItem("education", index, "year", event.target.value)}
              placeholder="2024"
            />
            <InputField
              id={`${idPrefix}-education-institution-${index}`}
              label="Institution"
              value={item.institution}
              onChange={(event) => updateArrayItem("education", index, "institution", event.target.value)}
              placeholder="ABC University"
              className="sm:col-span-3"
            />
          </div>
        )}
      />

      <RepeatableSection
        title="Projects"
        itemLabel="Project"
        description="Show practical proof of your work with concise descriptions and links."
        items={safeData.projects}
        onAdd={() => addArrayItem("projects", getEmptyProjectItem)}
        onRemove={(index) => removeArrayItem("projects", index)}
        addLabel="Add project"
        emptyState="No projects added yet. Add at least one project to strengthen profile credibility."
        renderFields={(item, index) => (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id={`${idPrefix}-project-name-${index}`}
                label="Project Name"
                value={item.name}
                onChange={(event) => updateArrayItem("projects", index, "name", event.target.value)}
                placeholder="RecruitAI Dashboard"
              />
              <InputField
                id={`${idPrefix}-project-link-${index}`}
                label="Project Link"
                value={item.link}
                onChange={(event) => updateArrayItem("projects", index, "link", event.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
            <label htmlFor={`${idPrefix}-project-description-${index}`} className="block space-y-2">
              <span className="text-sm font-semibold text-text-primary">Description</span>
              <textarea
                id={`${idPrefix}-project-description-${index}`}
                className="input-field min-h-24 resize-y"
                value={item.description}
                onChange={(event) => updateArrayItem("projects", index, "description", event.target.value)}
                placeholder="What did you build, how did it work, and what impact did it have?"
                rows={4}
              />
            </label>
          </div>
        )}
      />
    </div>
  );
}
