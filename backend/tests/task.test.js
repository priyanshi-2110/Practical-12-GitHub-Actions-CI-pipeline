const request = require("supertest");
const app = require("../server");

describe("CI/CD Pipeline Automated Tests - Practical 12", () => {
  // Test 1: Verify Health Check endpoint
  test("GET /api/health returns 200 and health status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });

  // Test 2: Verify GET /tasks endpoint (as specified in Practical 12 instructions)
  test("GET /tasks returns 200", async () => {
    const res = await request(app).get("/tasks");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Test 3: Verify GET /api/tasks alias endpoint
  test("GET /api/tasks returns 200", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.statusCode).toBe(200);
  });

  // Test 4: Verify 404 handler for undefined route
  test("GET /unknown-route returns 404", async () => {
    const res = await request(app).get("/unknown-route");
    expect(res.statusCode).toBe(404);
  });

  // Practical 13 Tests: AI API Integration & Graceful Fallback
  describe("Practical 13: AI Integration & Graceful Error Handling", () => {
    test("POST /api/ai/generate-description returns 200 with description and fallback support", async () => {
      const res = await request(app)
        .post("/api/ai/generate-description")
        .send({ title: "Implement OAuth2 login with Google" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("description");
      expect(typeof res.body.description).toBe("string");
      expect(res.body.description.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty("suggestedPriority");
    });

    test("POST /api/ai/generate-description returns 400 if title is missing", async () => {
      const res = await request(app)
        .post("/api/ai/generate-description")
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("POST /api/ai/generate-description handles invalid API key gracefully without crashing (fallback=true)", async () => {
      // Simulate invalid API key
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "sk-invalid_key_testing_practical_13";

      const res = await request(app)
        .post("/api/ai/generate-description")
        .send({ title: "Fix security vulnerability in authentication header" });

      // Core application MUST continue to function normally and return 200 with fallback
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("description");
      expect(res.body.fallback).toBe(true);

      // Restore key
      process.env.OPENAI_API_KEY = originalKey;
    });
  });
});

