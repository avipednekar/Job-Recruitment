import axios from "axios";
import Job from "../models/Job.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

export const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      company,
      location,
      experience_level,
      salary_range,
    } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "title and description are required" });
    }

    const embedRes = await axios.post(`${AI_SERVICE_URL}/embed`, {
      text: `${title} ${description}`,
    });

    const embedding = embedRes.data.embedding;

    const job = new Job({
      title,
      description,
      company,
      location,
      experience_level,
      salary_range,
      skills: [],
      embedding,
      postedBy: req.user?.id,
    });

    await job.save();

    res.status(201).json({ success: true, job: job._id });
  } catch (error) {
    console.error("Job Create Error:", error.message);
    res.status(500).json({ error: "Failed to create job" });
  }
};

export const listJobs = async (req, res) => {
  try {
    const jobs = await Job.find().select("-embedding");
    res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};
