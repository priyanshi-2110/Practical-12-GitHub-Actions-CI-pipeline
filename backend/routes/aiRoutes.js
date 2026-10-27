const express = require("express");
const router = express.Router();

// Helper: Context-aware fallback generator when external AI fails or key is missing
function generateFallbackDescription(title) {
  const cleanTitle = title.trim();
  const lower = cleanTitle.toLowerCase();

  let suggestedPriority = "medium";
  if (lower.includes("urgent") || lower.includes("bug") || lower.includes("security") || lower.includes("auth") || lower.includes("fix")) {
    suggestedPriority = "high";
  } else if (lower.includes("docs") || lower.includes("style") || lower.includes("clean") || lower.includes("minor")) {
    suggestedPriority = "low";
  }

  const fallbackText = `Objective: ${cleanTitle}.
Key Steps:
1. Review requirements and technical scope.
2. Implement solution and ensure modular structure.
3. Verify edge cases and validate end-to-end functionality.`;

  return {
    description: fallbackText,
    suggestedPriority,
    fallback: true,
  };
}

// POST /api/ai/generate-description
router.post("/generate-description", async (req, res) => {
  const { title } = req.body || {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      error: "Task title is required to generate a description."
    });
  }

  const trimmedTitle = title.trim();
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Try OpenAI if key is configured and valid
  if (openaiKey && openaiKey.startsWith("sk-") && !openaiKey.includes("your_")) {
    try {
      const OpenAI = require("openai");
      const client = new OpenAI({ apiKey: openaiKey });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an assistant for a task management app. Generate a clear, concise 2-3 sentence task description and recommend a priority (low, medium, high) based on the task title."
          },
          {
            role: "user",
            content: `Task Title: "${trimmedTitle}"\nProvide a short, professional description for this task.`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const description = completion.choices?.[0]?.message?.content?.trim();
      if (description) {
        return res.status(200).json({
          description,
          suggestedPriority: trimmedTitle.toLowerCase().includes("bug") || trimmedTitle.toLowerCase().includes("security") ? "high" : "medium",
          fallback: false,
          provider: "openai"
        });
      }
    } catch (err) {
      console.warn("[AI Service - OpenAI Error]:", err.message);
      // Fall through to fallback handler below
    }
  }

  // 2. Try Gemini API if key is configured
  if (geminiKey && !geminiKey.includes("your_")) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const geminiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Write a short, concise, professional task description (2-3 sentences) for a software task titled: "${trimmedTitle}".`
                }
              ]
            }
          ]
        })
      });

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return res.status(200).json({
            description: text,
            suggestedPriority: trimmedTitle.toLowerCase().includes("fix") ? "high" : "medium",
            fallback: false,
            provider: "gemini"
          });
        }
      }
    } catch (err) {
      console.warn("[AI Service - Gemini Error]:", err.message);
      // Fall through to fallback handler below
    }
  }

  // 3. Graceful Fallback Path (Practical 13 Requirement)
  // Ensures core application never crashes when API key is missing, invalid, or remote API times out
  const fallbackResult = generateFallbackDescription(trimmedTitle);
  return res.status(200).json({
    description: fallbackResult.description,
    suggestedPriority: fallbackResult.suggestedPriority,
    fallback: true,
    provider: "local-fallback",
    message: "Remote AI service unavailable or unconfigured. Provided local fallback description."
  });
});

module.exports = router;
