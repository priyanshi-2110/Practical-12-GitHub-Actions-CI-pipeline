const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const aiRoutes = require("./routes/aiRoutes");
require("./utils/listeners"); // Load event listeners

const app = express();

const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(
        `${req.method} ${req.url} - ${new Date().toISOString()}`
    );
    next();
});

// ========================================
// Connect to MongoDB
// ========================================
if (process.env.NODE_ENV !== "test") {
    mongoose
        .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskmanager")
        .then(() => {
            console.log("MongoDB connected successfully");
        })
        .catch((err) => {
            console.error("MongoDB connection error:", err);
        });
}

// ========================================
// Health / Root Route
// ========================================
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is healthy" });
});

// ========================================
// Mount Routes
// ========================================
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/tasks", taskRoutes);
app.use("/tasks", taskRoutes);

app.use("/api/ai", aiRoutes);
app.use("/ai", aiRoutes);

// ========================================
// 404 Handler
// ========================================
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found"
    });
});

// ========================================
// Global Error Handler
// ========================================
app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    // Mongoose validation error
    if (err.name === "ValidationError") {
        const errors = {};
        for (const field in err.errors) {
            errors[field] = err.errors[field].message;
        }

        return res.status(400).json({
            error: "Validation failed",
            details: errors
        });
    }

    // Invalid MongoDB ObjectId
    if (err.name === "CastError") {
        return res.status(400).json({
            error: "Invalid task ID"
        });
    }

    // JWT errors
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return res.status(401).json({
            error: "Unauthorized",
            message: err.message
        });
    }

    res.status(500).json({
        error: "Something went wrong",
        details: err.message
    });
});

// ========================================
// Start server
// ========================================
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;