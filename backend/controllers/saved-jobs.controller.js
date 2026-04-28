import User from "../models/User.js";
import Job from "../models/Job.js";

// ─────────────────────────────────────────────
// POST /api/saved-jobs/:jobId  — Toggle save
// ─────────────────────────────────────────────
export const toggleSavedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const index = user.savedJobs.findIndex(
      (id) => id.toString() === jobId,
    );

    let saved;
    if (index === -1) {
      // Add to saved
      user.savedJobs.push(jobId);
      saved = true;
    } else {
      // Remove from saved
      user.savedJobs.splice(index, 1);
      saved = false;
    }

    await user.save({ validateModifiedOnly: true });

    res.json({
      success: true,
      saved,
      savedJobs: user.savedJobs,
    });
  } catch (error) {
    console.error("[SavedJobs] Toggle error:", error.message);
    res.status(500).json({ error: "Failed to update saved jobs" });
  }
};

// ─────────────────────────────────────────────
// GET /api/saved-jobs  — List all saved jobs
// ─────────────────────────────────────────────
export const getSavedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "savedJobs",
      select: "title company location employment_type salary_range skills description createdAt",
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Filter out any null refs (deleted jobs)
    const jobs = (user.savedJobs || []).filter(Boolean);

    res.json({ success: true, jobs });
  } catch (error) {
    console.error("[SavedJobs] List error:", error.message);
    res.status(500).json({ error: "Failed to fetch saved jobs" });
  }
};

// ─────────────────────────────────────────────
// GET /api/saved-jobs/ids  — Just the IDs (lightweight)
// ─────────────────────────────────────────────
export const getSavedJobIds = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("savedJobs");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      savedJobIds: (user.savedJobs || []).map((id) => id.toString()),
    });
  } catch (error) {
    console.error("[SavedJobs] IDs error:", error.message);
    res.status(500).json({ error: "Failed to fetch saved job IDs" });
  }
};
