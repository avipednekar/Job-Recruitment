import User from "../models/User.js";
import Candidate from "../models/Candidate.js";
import Company from "../models/Company.js";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

const flattenProfileEntries = (entries) =>
  Array.isArray(entries)
    ? entries
        .map((entry) =>
          typeof entry === "string" ? entry : Object.values(entry || {}).join(" "),
        )
        .join(" ")
    : "";

const buildCandidateEmbeddingText = ({
  personal_info = {},
  skills = {},
  experience = [],
  projects = [],
}) => {
  const skillsList = skills?.skills || [];
  const summary = personal_info?.summary || "";
  const location = personal_info?.location || "";
  const experienceText = flattenProfileEntries(experience);
  const projectText = flattenProfileEntries(projects);

  return `${summary} ${skillsList.join(" ")} ${experienceText} ${projectText} ${location}`.trim();
};

// ─────────────────────────────────────────────
// GET /api/profile/me
// ─────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let profileData = null;

    if (user.role === "job_seeker") {
      profileData = await Candidate.findOne({ user: user._id }).lean();
    } else if (user.role === "recruiter") {
      profileData = await Company.findOne({ user: user._id }).lean();
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        linkedin: user.linkedin,
        avatar: user.avatar,
        profileComplete: user.profileComplete,
        createdAt: user.createdAt,
      },
      profile: profileData,
    });
  } catch (error) {
    console.error("Get Profile Error:", error.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// ─────────────────────────────────────────────
// POST /api/profile/job-seeker
// ─────────────────────────────────────────────
export const createJobSeekerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { personal_info, skills, education, experience, projects } = req.body;

    // Build embedding from summary + skills + experience + projects + location
    const combinedText = buildCandidateEmbeddingText({
      personal_info,
      skills,
      experience,
      projects,
    });

    let candidate = await Candidate.findOne({ user: user._id });

    if (candidate) {
      candidate.personal_info = personal_info || candidate.personal_info;
      candidate.skills = skills || candidate.skills;
      candidate.education = education || candidate.education;
      candidate.experience = experience || candidate.experience;
      candidate.projects = projects || candidate.projects;
      // Keep existing embedding for now
      await candidate.save();
    } else {
      let initialEmbedding = new Array(384).fill(0);
      candidate = await Candidate.create({
        personal_info,
        skills,
        education,
        experience,
        projects,
        embedding: initialEmbedding,
        user: user._id,
      });
    }

    axios.post(`${AI_SERVICE_URL}/embed`, { text: combinedText })
      .then(async (embedRes) => {
        await Candidate.findByIdAndUpdate(candidate._id, { embedding: embedRes.data.embedding });
      })
      .catch((err) => console.warn("Background embedding failed:", err.message));

    // Update user
    user.profileComplete = true;
    user.candidate = candidate._id;
    if (personal_info?.phone) user.phone = personal_info.phone;
    if (personal_info?.linkedin) user.linkedin = personal_info.linkedin;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Job seeker profile created successfully",
      profile: candidate,
    });
  } catch (error) {
    console.error("Create Job Seeker Profile Error:", error.message);
    res.status(500).json({ error: "Failed to create job seeker profile" });
  }
};

// ─────────────────────────────────────────────
// POST /api/profile/company
// ─────────────────────────────────────────────
export const createCompanyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const {
      name,
      description,
      website,
      location,
      industry,
      size,
      founded,
      logo,
    } = req.body;

    // Upsert
    let company = await Company.findOne({ user: user._id });

    if (company) {
      if (name) company.name = name;
      if (description !== undefined) company.description = description;
      if (website !== undefined) company.website = website;
      if (location !== undefined) company.location = location;
      if (industry !== undefined) company.industry = industry;
      if (size !== undefined) company.size = size;
      if (founded !== undefined) company.founded = founded;
      if (logo !== undefined) company.logo = logo;
      await company.save();
    } else {
      company = await Company.create({
        user: user._id,
        name: name || user.name,
        description: description || "",
        website: website || "",
        location: location || "",
        industry: industry || "",
        size: size || "",
        founded: founded || "",
        logo: logo || "",
      });
    }

    user.profileComplete = true;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Company profile created successfully",
      profile: company,
    });
  } catch (error) {
    console.error("Create Company Profile Error:", error.message);
    res.status(500).json({ error: "Failed to create company profile" });
  }
};

// ─────────────────────────────────────────────
// PUT /api/profile/me
// ─────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user-level fields
    const { name, phone, linkedin, avatar, personal_info } = req.body;
    const nextName = name !== undefined ? name : personal_info?.name;
    const nextPhone = phone !== undefined ? phone : personal_info?.phone;
    const nextLinkedin = linkedin !== undefined ? linkedin : personal_info?.linkedin;

    if (nextName !== undefined) user.name = nextName;
    if (nextPhone !== undefined) user.phone = nextPhone;
    if (nextLinkedin !== undefined) user.linkedin = nextLinkedin;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    let profile = null;

    if (user.role === "job_seeker") {
      const existingCandidate = await Candidate.findOne({ user: user._id }).lean();

      if (personal_info) {
        const mergedPersonalInfo = {
          ...(existingCandidate?.personal_info || {}),
          ...personal_info,
          name:
            personal_info.name ??
            existingCandidate?.personal_info?.name ??
            user.name,
          email:
            personal_info.email ??
            existingCandidate?.personal_info?.email ??
            user.email,
          phone:
            personal_info.phone ??
            existingCandidate?.personal_info?.phone ??
            user.phone ??
            "",
          location:
            personal_info.location ??
            existingCandidate?.personal_info?.location ??
            "",
          github:
            personal_info.github ??
            existingCandidate?.personal_info?.github ??
            "",
          linkedin:
            personal_info.linkedin ??
            existingCandidate?.personal_info?.linkedin ??
            user.linkedin ??
            "",
          summary:
            personal_info.summary ??
            existingCandidate?.personal_info?.summary ??
            "",
        };

        const candidatePayload = {
          user: user._id,
          personal_info: mergedPersonalInfo,
          skills: existingCandidate?.skills || { skills: [], confidence_score: 0 },
          education: existingCandidate?.education || [],
          experience: existingCandidate?.experience || [],
          projects: existingCandidate?.projects || [],
          embedding: existingCandidate?.embedding || new Array(384).fill(0),
        };

        const combinedText = buildCandidateEmbeddingText(candidatePayload);

        // Remove synchronous embedding update here

        const updatedCandidate = await Candidate.findOneAndUpdate(
          { user: user._id },
          {
            $set: {
              personal_info: candidatePayload.personal_info,
              skills: candidatePayload.skills,
              education: candidatePayload.education,
              experience: candidatePayload.experience,
              projects: candidatePayload.projects,
              embedding: candidatePayload.embedding,
              user: user._id,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        );

        
        axios.post(`${AI_SERVICE_URL}/embed`, { text: combinedText })
          .then(async (embedRes) => {
            await Candidate.findByIdAndUpdate(updatedCandidate._id, { embedding: embedRes.data.embedding });
          })
          .catch((err) => console.warn("Background embedding failed:", err.message));
          
        user.profileComplete = true;
        user.candidate = updatedCandidate._id;
        await user.save();
      }

      profile = await Candidate.findOne({ user: user._id }).lean();
    } else if (user.role === "recruiter") {
      profile = await Company.findOne({ user: user._id }).lean();
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        linkedin: user.linkedin,
        avatar: user.avatar,
        profileComplete: user.profileComplete,
      },
      profile,
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
};
