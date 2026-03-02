import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4000/api",
});

// TODO: Add JWT token to headers when auth is implemented
// API.interceptors.request.use((config) => {
//     const token = localStorage.getItem('token');
//     if (token) config.headers.Authorization = `Bearer ${token}`;
//     return config;
// });

// Resume Parser
export const uploadResume = (formData) =>
  API.post("/candidates/upload", formData);
export const rankCandidates = (jobId) => API.get(`/candidates/match/${jobId}`);

// Jobs
export const createJob = (data) => API.post("/jobs", data);
export const getJobs = () => API.get("/jobs");

// Auth (skeleton)
export const login = (data) => API.post("/auth/login", data);
export const register = (data) => API.post("/auth/register", data);

export default API;
