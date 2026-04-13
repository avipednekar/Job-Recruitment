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

// External Jobs
export const fetchExternalJobs = (params = {}) => API.get("/external-jobs", { params });
export const scrapeDirectBoards = (urls, extract = false) =>
  API.post("/external-jobs/direct", { urls, extract });

export default API;
