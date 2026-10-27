# Task Management Application - Full-Stack CI/CD Pipeline

[![CI Pipeline](https://github.com/priyanshi-2110/Practical-12-GitHub-Actions-CI-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/priyanshi-2110/Practical-12-GitHub-Actions-CI-pipeline/actions/workflows/ci.yml)

## Practical 12: CI/CD Pipeline with GitHub Actions
- **Course Outcome:** CO5 / PO3, PO5
- **Objective:** Automate testing and deployment of the application using a continuous integration (CI) pipeline powered by GitHub Actions.

---

## 🚀 CI Pipeline Architecture

```text
git push origin main / Pull Request
                │
                ▼
      GitHub Actions Trigger
                │
                ▼
   ┌─────────────────────────┐
   │    Job 1: Linting       │
   │   (Frontend - ESLint)   │
   └────────────┬────────────┘
                │ (needs: [lint])
                ▼
   ┌─────────────────────────┐
   │ Job 2: Build & Tests    │
   │  - Checkout Code        │
   │  - Setup Node.js (v18)  │
   │  - npm install          │
   │  - npm test (Jest)      │
   └────────────┬────────────┘
                │
         ───────┴───────
        │               │
        ▼               ▼
✅ Green Checkmark   ❌ Red X
  (Workflow Passed)   (Workflow Failed)
```

---

## 🛠️ Pipeline Configuration

The workflow is configured in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
- **Triggers:** Automatic execution on every `push` to `main` and on `pull_request` targeting `main`.
- **Job 1 (`lint`):** Validates frontend code syntax and standards using ESLint.
- **Job 2 (`build-and-test`):** Runs backend dependency installation and automated HTTP endpoint test suites via Jest and Supertest.

---

## 🧪 Local Testing

### Running Backend Automated Tests
```bash
cd backend
npm install
npm test
```

### Running Frontend Linting
```bash
cd frontend
npm install
npm run lint
```

---

## 📋 Demonstrating Pass vs. Fail in CI

### 1. Intentional Test Failure Demonstration
To demonstrate a failing pipeline (Red ❌):
1. In `backend/tests/task.test.js`, modify the expected status code:
   ```javascript
   // Deliberately broken expectation:
   expect(res.statusCode).toBe(500); // Instead of 200
   ```
2. Commit and push:
   ```bash
   git add backend/tests/task.test.js
   git commit -m "test: demonstrate deliberate CI test failure"
   git push origin main
   ```
3. Navigate to the **Actions** tab on GitHub: The `build-and-test` job will fail with exit code 1 and show a Red ❌.

### 2. Pipeline Fix Demonstration
To restore green status (Green ✅):
1. Revert `backend/tests/task.test.js` back to `200`:
   ```javascript
   expect(res.statusCode).toBe(200);
   ```
2. Commit and push:
   ```bash
   git add backend/tests/task.test.js
   git commit -m "fix: correct test assertion to restore green pipeline"
   git push origin main
   ```
3. The workflow will re-run automatically, pass all test suites, and show a Green ✅ checkmark.
