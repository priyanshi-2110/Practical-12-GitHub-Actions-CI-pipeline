# Practical 13: AI API Integration into a Web Application

## Course Objectives & Mapping
- **Practical:** 13
- **CO / PO:** CO6 / PO3, PO5, PO12
- **Objective:** Integrate an external AI service (OpenAI / Gemini) into the full-stack Task Management application while ensuring responsible AI usage and graceful failure handling.

---

## Architecture Flow

```
   ┌─────────────────────────────────────────────────────────────┐
   │                     React Frontend                          │
   │  - User enters task title (e.g. "Implement OAuth2 Login")   │
   │  - Clicks "✨ Generate description with AI" button         │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ POST /api/ai/generate-description
                                  │ { title: "Implement OAuth2 Login" }
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                     Express Backend                         │
   │  - Reads API Key securely from .env (NEVER exposed to web)  │
   │  - Validates title input (returns 400 if empty)             │
   └──────────────┬──────────────────────────────┬───────────────┘
                  │                              │
         (Key valid & network ok)       (Key invalid / timeout / quota)
                  ▼                              ▼
   ┌─────────────────────────────┐┌──────────────────────────────┐
   │     Remote AI Service       ││   Graceful Fallback Handler  │
   │   - OpenAI (gpt-4o-mini) /  ││  - Catches API error         │
   │   - Gemini (1.5-flash)      ││  - Generates local template  │
   └──────────────┬──────────────┘│  - Suggests task priority    │
                  │               └──────────────┬───────────────┘
                  ▼                              ▼
          200 OK Response               200 OK Fallback Response
         { description,                { description,
           fallback: false,              fallback: true,
           provider: "openai" }          provider: "local-fallback" }
                  │                              │
                  └──────────────┬───────────────┘
                                 ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                     React Frontend                          │
   │  - Populates editable description textarea                  │
   │  - Auto-selects suggested priority                          │
   │  - Shows status badge (AI generated vs Fallback)            │
   │  - Student can freely accept, modify, or reject suggestion  │
   └─────────────────────────────────────────────────────────────┘
```

---

## Key Theory & Responsible AI Principles

### 1. Server-Side Key Isolation (Security)
- **Principle:** API keys for paid AI services (OpenAI, Google Gemini, Anthropic) must **never** be exposed in client-side bundles (e.g., React `VITE_` or inline script tags) where malicious actors can scrape them from network traffic.
- **Implementation:** The client communicates only with the backend endpoint (`POST /api/ai/generate-description`). The server reads `OPENAI_API_KEY` from the private `.env` file (which is excluded from Git via `.gitignore`).

### 2. Graceful Degradation & Resilience
- **Principle:** External AI APIs are subject to latency spikes, network failures, rate limiting (HTTP 429), quota exhaustion, and invalid keys. A dependable enterprise application must never crash or block core operations when an AI service fails.
- **Implementation:** The backend route wraps AI calls inside a `try/catch` block. If the remote AI call rejects or fails, the handler catches the error, logs a server warning, and immediately returns a clean, structured fallback suggestion (`{ description: "...", fallback: true }`).

### 3. Human-in-the-Loop (HITL) Design
- **Principle:** AI-generated content can hallucinate or produce inaccurate details. Users should always be presented with AI outputs as **editable suggestions** rather than direct irreversible submissions.
- **Implementation:** The returned description is populated into an editable textarea, allowing the user to review, modify, or rewrite the content before clicking "Create Task".

---

## Implementation Details

### 1. Backend Route (`backend/routes/aiRoutes.js`)
- Handles incoming `title` in request body.
- Supports both OpenAI (`gpt-4o-mini`) and Gemini (`gemini-1.5-flash`).
- Automatically defaults to intelligent fallback template when unconfigured or failing.

```javascript
router.post("/generate-description", async (req, res) => {
  const { title } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Task title is required." });
  }

  try {
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write a short task description for: ${title}` }]
    });
    res.json({ description: completion.choices[0].message.content, fallback: false });
  } catch (err) {
    // Graceful fallback: Core application keeps working
    res.status(200).json({
      description: `Objective: ${title}. Key steps: 1. Review requirements. 2. Implement solution. 3. Validate functionality.`,
      fallback: true
    });
  }
});
```

### 2. Frontend Client (`frontend/src/api.js` & `frontend/src/pages/Projects.jsx`)
- Adds `generateTaskDescription(title)` helper in `api.js`.
- Adds `"✨ Generate description with AI"` button on the Task creation form.
- Shows AI / Fallback banner and populates editable textarea.

---

## Automated Verification

The test suite in [`backend/tests/task.test.js`](../tests/task.test.js) verifies:
1. `POST /api/ai/generate-description` returns status 200 with generated description and suggested priority.
2. `POST /api/ai/generate-description` returns status 400 when title is missing.
3. **Failure path test:** When `OPENAI_API_KEY` is set to an invalid key (`sk-invalid_key`), the server does not crash; it catches the error and returns `{ fallback: true }` with HTTP 200.
