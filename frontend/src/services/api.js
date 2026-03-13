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

// Candidates / Resume
export const uploadResume = (formData) =>
  API.post("/candidates/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Jobs
export const createJob = (data) => API.post("/jobs", data);
export const searchJobs = (params = {}) => API.get("/jobs", { params });
export const getJobById = (id) => API.get(`/jobs/${id}`);
export const updateJob = (id, data) => API.put(`/jobs/${id}`, data);
export const deleteJob = (id) => API.delete(`/jobs/${id}`);
export const getMyJobs = () => API.get("/jobs/my");
export const getJobRecommendations = () => API.get("/jobs/recommendations");
export const applyToJob = (jobId) => API.post(`/applications/${jobId}`);

// External Jobs
export const fetchExternalJobs = (params = {}) => API.get("/external-jobs", { params });

// Profile
export const getProfile = () => API.get("/profile/me");
export const createJobSeekerProfile = (data) =>
  API.post("/profile/job-seeker", data);
export const createCompanyProfile = (data) =>
  API.post("/profile/company", data);
export const updateProfile = (data) => API.put("/profile/me", data);

export default API;
