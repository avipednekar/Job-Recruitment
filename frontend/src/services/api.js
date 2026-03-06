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
export const getJobs = () => API.get("/jobs");

export default API;
