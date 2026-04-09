# Code Conventions

## Overview

The codebase follows modern JavaScript (ESM) conventions for the frontend and backend, and standard Python patterns for the AI service. Code style is generally consistent within each service.

---

## JavaScript Conventions (Backend + Frontend)

### Module System
- **ES Modules throughout** — Both `backend/` and `frontend/` use `"type": "module"` in `package.json`
- All imports use `import`/`export` syntax (no `require()`)
- File extensions included in backend imports: `import User from "../models/User.js"`

### Variable Naming
- **camelCase** for variables, functions, and object properties
- **PascalCase** for React components and Mongoose model names
- **UPPER_SNAKE_CASE** for constants (e.g., `JWT_SECRET`, `CACHE_TTL`, `INDIA_STATE_TERMS`)

### String Style
- **Double quotes** in backend JavaScript: `import express from "express"`
- **Double quotes** in frontend JSX: `className="min-h-screen"`

### Semicolons
- Semicolons used consistently in both frontend and backend

### Arrow Functions
- Preferred for controller handlers, middleware, and React components
- Example pattern:
```javascript
export const uploadResume = async (req, res) => {
  try {
    // ...
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Upload Error:", error.message);
    res.status(500).json({ error: "Failed to process resume" });
  }
};
```

---

## Backend Patterns

### Controller Pattern
Every controller function follows a consistent structure:
1. Async handler wrapped in `try/catch`
2. Input validation at the top
3. Business logic in the middle
4. Success response: `{ success: true, ...data }`
5. Error response: `{ error: "Human-readable message" }`
6. Console logging: `console.error("Context:", error.message)`

```javascript
// Standard success response
res.status(201).json({ success: true, candidate_id: candidate._id, parsed_data });

// Standard error response
res.status(500).json({ error: "Failed to process resume" });
```

### Route Pattern
- Each domain has a dedicated route file that creates an Express `Router`
- Route files import controller functions by name
- Middleware applied inline: `router.get("/me", protect, getMe)`
- Auth + role guard chaining: `router.post("/", protect, authorize("recruiter", "admin"), createJob)`

### Model Pattern
- Mongoose schemas with validation messages: `required: [true, "Name is required"]`
- Enum fields with explicit value lists
- Timestamps enabled: `{ timestamps: true }`
- Password excluded by default: `select: false`
- Pre-save hooks for password hashing
- Instance methods for password comparison

### Error Handling
- **No centralized error handler** — Each controller handles its own errors
- All errors caught in try/catch, logged with `console.error`
- Generic fallback messages returned to client (no stack traces)
- AI service failures handled gracefully (continue with empty embedding)

### Auth Cookie Pattern
- JWT set in httpOnly cookie with security options:
```javascript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
```

---

## Frontend Patterns

### Component Structure
- **Functional components only** — No class components
- **Default exports** for pages and components
- **Named exports** for provider components (e.g., `AuthProvider`)

### State Management
- **React Context** for global state (Auth, Theme)
- **Context split pattern:** Separate files for context object + provider component + hook
  - `auth-context.js` — `createContext(null)` 
  - `AuthContext.jsx` — Provider component with state logic
  - `useAuth.js` — Consumer hook with error guard

### Routing
- React Router DOM v7 with `BrowserRouter`
- Route protection via wrapper components:
  - `ProtectedRoute` — Redirects to login if not authenticated, redirects to profile setup if profile incomplete
  - `ProfileSetupRoute` — Requires auth but doesn't redirect to profile setup (avoids loop)

### API Calls
- Centralized in `frontend/src/services/api.js`
- Single Axios instance with base URL and credentials
- Request interceptor attaches JWT from localStorage
- Each API function is a named export wrapping an Axios call

### CSS / Styling
- **Tailwind CSS 4** with Vite plugin integration
- Custom CSS variables for theming in `index.css` (47KB — extensive custom theme with light/dark mode)
- Dark mode via `html.dark` class toggle
- Utility functions: `cn()` = `clsx()` + `tailwind-merge()`

### Toast Notifications
- `react-hot-toast` for user feedback
- Configured globally in `App.jsx` with themed styling
- Usage: `toast.success("Message")`, `toast.error("Message")`

---

## Python Conventions (AI Service)

### Code Style
- PEP 8 compliant (snake_case functions/variables, PascalCase classes)
- Private functions prefixed with underscore: `_normalize_text()`, `_parse_date()`
- Docstrings on public functions (triple-quoted, descriptive)
- Module-level docstrings with endpoint documentation

### Import Style
- Standard library first, then third-party, then local
- Lazy imports in Flask routes for expensive modules (sentence-transformers loaded on first use)

### Error Handling
- Flask endpoints wrap logic in try/except, return JSON errors with status codes:
```python
try:
    result = parse_resume(temp_path)
    return jsonify({"success": True, "data": result})
except Exception as e:
    return jsonify({"error": str(e)}), 500
```

### Matching Algorithm Constants
- Extensive use of `Set` for O(1) lookup (e.g., `INDIA_STATE_TERMS`, `SKILL_ALIASES`)
- Compiled regex patterns stored as module-level constants
- Scoring weights as inline floats with comments

### Data Handling
- Defensive access throughout: `candidate_data.get('skills', {})` with type checking
- Handles both `dict` and `list` formats for parsed data (skills, projects, experience)
- Zero vectors (`[0.0] * 384`) as fallback for empty embeddings

---

## Shared Patterns

### Location Matching
Both backend (`job.controller.js`, `external-jobs.controller.js`) and AI service (`matcher.py`) implement similar India-specific location matching:
- Indian state/UT term sets (35 entries)
- Locality prefix stripping (village, taluka, dist, etc.)
- Remote job detection
- Multi-level matching: exact → locality → broader terms

**Note:** This logic is **duplicated** between backend and AI service, which is a code smell (see CONCERNS.md).

### Embedding Text Construction
The combined text for embeddings is built the same way in multiple places:
```
summary + skills + experience + projects + location
```
Used in: `candidate.controller.js`, `profile.controller.js`, `matcher.py`

### Response Format
All API responses follow:
- Success: `{ success: true, ...payload }`
- Error: `{ error: "message" }` (or `{ success: true, error: "context" }` for graceful failures)
