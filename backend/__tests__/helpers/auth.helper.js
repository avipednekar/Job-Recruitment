import jwt from "jsonwebtoken";
import User from "../../models/User.js";

const TEST_JWT_SECRET = "test_jwt_secret_for_testing";

// Set JWT_SECRET env var for tests
process.env.JWT_SECRET = TEST_JWT_SECRET;

export const createTestUser = async (overrides = {}) => {
  const defaults = {
    name: "Test User",
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: "TestPass123!",
    role: "job_seeker",
  };
  const userData = { ...defaults, ...overrides };
  const user = await User.create(userData);
  return user;
};

export const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    TEST_JWT_SECRET,
    { expiresIn: "1h" },
  );
};

export const getAuthHeader = (user) => {
  const token = generateTestToken(user);
  return `Bearer ${token}`;
};

export const createAuthenticatedUser = async (role = "job_seeker") => {
  const user = await createTestUser({ role });
  const token = generateTestToken(user);
  return { user, token, authHeader: `Bearer ${token}` };
};
