import Application from "../models/Application.js";
import Candidate from "../models/Candidate.js";
import Job from "../models/Job.js";
import { isValidObjectId } from "mongoose";

export const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!isValidObjectId(jobId)) {
      return res.status(400).json({
        error: "Only internal platform jobs can be applied to here. Open external jobs on their source site.",
      });
    }

    const [job, candidate] = await Promise.all([
      Job.findById(jobId).lean(),
      Candidate.findOne({ user: req.user.id }).lean(),
    ]);

    if (!job || job.status !== "active") {
      return res.status(404).json({ error: "Active job not found" });
    }

    if (!candidate) {
      return res.status(400).json({
        error: "Candidate profile not found. Complete your profile before applying.",
      });
    }

    const existingApplication = await Application.findOne({
      job: jobId,
      user: req.user.id,
    }).lean();

    if (existingApplication) {
      return res.status(409).json({ error: "You have already applied to this job" });
    }

    const application = await Application.create({
      job: jobId,
      candidate: candidate._id,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    console.error("Apply To Job Error:", error.message);
    res.status(500).json({ error: "Failed to submit application" });
  }
};

export const listApplications = async (req, res) => {
  try {
    const applications = await Application.find({ user: req.user.id })
      .populate("job", "title company location employment_type remote")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("List Applications Error:", error.message);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};
