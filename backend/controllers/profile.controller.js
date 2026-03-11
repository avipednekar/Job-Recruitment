import User from "../models/User.js";
import Candidate from "../models/Candidate.js";
import Company from "../models/Company.js";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

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

    // Build embedding from summary + skills
    const skillsList = skills?.skills || [];
    const summary = personal_info?.summary || "";
    const combinedText = `${summary} ${skillsList.join(" ")}`;

    let embedding = [];
    try {
      const embedRes = await axios.post(`${AI_SERVICE_URL}/embed`, {
        text: combinedText,
      });
      embedding = embedRes.data.embedding;
    } catch (embedErr) {
      console.warn(
        "Embedding generation failed, saving without embedding:",
        embedErr.message,
      );
      // Generate a zero vector so the document can still be saved
      embedding = new Array(384).fill(0);
    }

    // Upsert: update if exists, create if not
    let candidate = await Candidate.findOne({ user: user._id });

    if (candidate) {
      candidate.personal_info = personal_info || candidate.personal_info;
      candidate.skills = skills || candidate.skills;
      candidate.education = education || candidate.education;
      candidate.experience = experience || candidate.experience;
      candidate.projects = projects || candidate.projects;
      candidate.embedding = embedding;
      await candidate.save();
    } else {
      candidate = await Candidate.create({
        personal_info,
        skills,
        education,
        experience,
        projects,
        embedding,
        user: user._id,
      });
    }

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
    const { name, phone, linkedin, avatar } = req.body;
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (linkedin !== undefined) user.linkedin = linkedin;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

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
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
};
