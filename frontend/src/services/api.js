import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true,
});

// Attach JWT token from localStorage to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);
export const logoutUser = () => API.post("/auth/logout");
export const getMe = () => API.get("/auth/me");
export const verifyOTP = (data) => API.post("/auth/verify-otp", data);
export const resendOTP = (data) => API.post("/auth/resend-otp", data);

// Resume upload (returns parsed data from AI service)
export const uploadResume = (formData) => API.post("/candidates/upload", formData);

// Profile — single upsert endpoint per role
export const getProfile = () => API.get("/profile/me");
export const saveJobSeekerProfile = (data) => API.put("/profile/job-seeker", data);
export const saveCompanyProfile = (data) => API.put("/profile/company", data);

// Jobs
export const createJob = (data) => API.post("/jobs", data);
export const getJobById = (id) => API.get(`/jobs/${id}`);
export const updateJob = (id, data) => API.put(`/jobs/${id}`, data);
export const deleteJob = (id) => API.delete(`/jobs/${id}`);
export const getMyJobs = () => API.get("/jobs/my");
export const getJobRecommendations = () => API.get("/jobs/recommendations");
export const applyToJob = (jobId) => API.post(`/applications/${jobId}`);
export const getApplications = () => API.get("/applications");
export const fetchRecommendationInsights = (topJobs) =>
  API.post("/jobs/recommendation-insights", { top_jobs: topJobs });

// External Jobs
export const fetchExternalJobs = (params = {}) => API.get("/external-jobs", { params });

// ATS Checker
export const checkATSScore = (formData) =>
  API.post("/ats/check", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

// Notifications
export const getNotifications = () => API.get("/notifications");
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put("/notifications/read-all");

// Feedback (public)
export const submitFeedback = (data) => API.post("/feedback", data);

export default API;
