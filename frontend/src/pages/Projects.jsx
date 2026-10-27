import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { getTasks, createTask, updateTask, deleteTask, generateTaskDescription } from "../api";

function Projects({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiBanner, setAiBanner] = useState(null);

  // Filter & Search state
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'pending' | 'completed'
  const [searchQuery, setSearchQuery] = useState("");

  // Load tasks on mount
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // AI Description Generator (Practical 13)
  const handleGenerateAIDescription = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title first!");
      return;
    }
    try {
      setGeneratingAI(true);
      const res = await generateTaskDescription(title.trim());
      if (res && res.description) {
        setDescription(res.description);
        if (res.suggestedPriority) {
          setPriority(res.suggestedPriority);
        }
        if (res.fallback) {
          toast("Generated using smart fallback (AI service unconfigured/offline)", { icon: "ℹ️" });
          setAiBanner({
            message: "Using local AI fallback description. You can edit this freely.",
            isFallback: true,
          });
        } else {
          toast.success(`AI description generated via ${res.provider}!`);
          setAiBanner({
            message: `Generated via ${res.provider}. Edit or adapt as needed.`,
            isFallback: false,
          });
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate description");
    } finally {
      setGeneratingAI(false);
    }
  };

  // Create Task (POST /api/tasks)
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Task title is required");
      toast.error("Task title is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const newTask = await createTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        completed: false,
      });

      setTasks((prev) => [newTask, ...prev]);
      toast.success("Task created and saved to MongoDB!");

      // Reset form
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAiBanner(null);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Completion (PUT /api/tasks/:id)
  const handleToggleComplete = async (task) => {
    try {
      const updated = await updateTask(task._id, {
        completed: !task.completed,
      });

      setTasks((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      );

      if (updated.completed) {
        toast.success("Task marked complete!", { icon: "🎉" });
      } else {
        toast("Task marked pending", { icon: "⏳" });
      }
    } catch (err) {
      toast.error(err.message || "Failed to update task");
    }
  };

  // Delete Task (DELETE /api/tasks/:id)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      toast.success("Task deleted successfully");
    } catch (err) {
      toast.error(err.message || "Failed to delete task");
    }
  };

  // Filtered & Searched Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (filterStatus === "pending" && task.completed) return false;
      if (filterStatus === "completed" && !task.completed) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        return matchesTitle || matchesDesc;
      }

      return true;
    });
  }, [tasks, filterStatus, searchQuery]);

  // Task stats
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = totalCount - completedCount;

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "2rem 1.5rem 4rem",
        width: "100%",
      }}
    >
      {/* Top Banner / Welcome */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #fff, #94a3b8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.25rem",
            }}
          >
            Task Pipeline Dashboard
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Secured with JSON Web Token middleware and server-side request validation.
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div
            className="glass-card"
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Total
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
              {totalCount}
            </div>
          </div>
          <div
            className="glass-card"
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--accent-amber)", textTransform: "uppercase", fontWeight: 700 }}>
              Pending
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-amber)" }}>
              {pendingCount}
            </div>
          </div>
          <div
            className="glass-card"
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", textTransform: "uppercase", fontWeight: 700 }}>
              Done
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
              {completedCount}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* ========================================================
            LEFT COLUMN: CREATE TASK FORM
        ======================================================== */}
        <section
          className="glass-card"
          style={{
            padding: "1.75rem",
            position: "sticky",
            top: "85px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "1.2rem" }}>✍️</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Create New Task</h2>
          </div>

          {error && (
            <div
              style={{
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(244, 63, 94, 0.12)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fb7185",
                fontSize: "0.825rem",
                marginBottom: "1rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "0.4rem",
                }}
              >
                Task Title <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Implement refresh tokens"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.25rem", display: "block" }}>
                Validated on server via <code>validateTask</code> middleware.
              </span>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <label
                  style={{
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                  }}
                >
                  Description
                </label>
                <button
                  type="button"
                  id="btn-ai-generate"
                  onClick={handleGenerateAIDescription}
                  disabled={generatingAI || !title.trim()}
                  style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: generatingAI || !title.trim() ? "not-allowed" : "pointer",
                    opacity: generatingAI || !title.trim() ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    transition: "all 0.2s ease"
                  }}
                  title="Auto-generate description using AI based on Title"
                >
                  {generatingAI ? "✨ Generating..." : "✨ Generate description with AI"}
                </button>
              </div>

              {aiBanner && (
                <div
                  style={{
                    marginBottom: "0.5rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: aiBanner.isFallback ? "rgba(234, 179, 8, 0.12)" : "rgba(99, 102, 241, 0.12)",
                    border: aiBanner.isFallback ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid rgba(99, 102, 241, 0.3)",
                    color: aiBanner.isFallback ? "#ca8a04" : "#818cf8"
                  }}
                >
                  <span>{aiBanner.isFallback ? "⚡ Fallback Mode: " : "✨ AI Assistant: "}{aiBanner.message}</span>
                  <button
                    type="button"
                    onClick={() => setAiBanner(null)}
                    style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: "0.8rem", padding: "0 0.2rem" }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                placeholder="Optional details, notes, or subtasks... (or click 'Generate description with AI')"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ resize: "vertical" }}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.25rem", display: "block" }}>
                Editable suggestion: You can accept or modify the AI-generated text freely.
              </span>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "0.4rem",
                }}
              >
                Priority Level
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                {[
                  { id: "low", label: "Low", color: "#34d399" },
                  { id: "medium", label: "Medium", color: "#fbbf24" },
                  { id: "high", label: "High", color: "#fb7185" },
                ].map((p) => {
                  const isSelected = priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "var(--radius-sm)",
                        border: isSelected ? `2px solid ${p.color}` : "1px solid var(--border-subtle)",
                        background: isSelected ? "var(--bg-input-hover)" : "var(--bg-input)",
                        color: isSelected ? p.color : "var(--text-muted)",
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: "0.825rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
              }}
            >
              {saving ? "Saving to MongoDB..." : "+ Add Task"}
            </button>
          </form>
        </section>

        {/* ========================================================
            RIGHT COLUMN: TASK LIST & FILTERS
        ======================================================== */}
        <section>
          {/* Filter & Search Bar */}
          <div
            className="glass-card"
            style={{
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {/* Status Tabs */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg-primary)",
                padding: "3px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {[
                { id: "all", label: `All (${totalCount})` },
                { id: "pending", label: `Pending (${pendingCount})` },
                { id: "completed", label: `Done (${completedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    border: "none",
                    borderRadius: "6px",
                    background: filterStatus === tab.id ? "var(--primary)" : "transparent",
                    color: filterStatus === tab.id ? "#fff" : "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ minWidth: "220px", flex: "1 1 auto" }}>
              <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* Task Items */}
          {loading ? (
            <div
              className="glass-card"
              style={{
                padding: "3.5rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
              <p style={{ fontWeight: 600 }}>Loading protected tasks from backend...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div
              className="glass-card"
              style={{
                padding: "3.5rem 2rem",
                textAlign: "center",
                color: "var(--text-dim)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
              <h3 style={{ color: "var(--text-main)", marginBottom: "0.4rem" }}>
                {searchQuery ? "No matching tasks found" : "No tasks in this view"}
              </h3>
              <p style={{ fontSize: "0.9rem", maxWidth: "340px", margin: "0 auto" }}>
                {searchQuery
                  ? "Try adjusting your search terms or clearing the filter."
                  : "Use the form on the left to add your first authenticated task!"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {filteredTasks.map((task) => {
                const priorityClass =
                  task.priority === "high"
                    ? "badge-high"
                    : task.priority === "low"
                    ? "badge-low"
                    : "badge-medium";

                return (
                  <div
                    key={task._id}
                    className="glass-card animate-fade-in"
                    style={{
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "1rem",
                      transition: "all var(--transition-fast)",
                      borderLeft: task.completed
                        ? "4px solid #10b981"
                        : "4px solid var(--primary)",
                    }}
                  >
                    {/* Checkbox & Details */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flex: 1 }}>
                      {/* Completion Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(task)}
                        title={task.completed ? "Mark as pending" : "Mark as completed"}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "6px",
                          border: task.completed
                            ? "2px solid #10b981"
                            : "2px solid var(--text-dim)",
                          background: task.completed ? "#10b981" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "0.8rem",
                          flexShrink: 0,
                          marginTop: "2px",
                          transition: "all 0.15s",
                        }}
                      >
                        {task.completed && "✓"}
                      </button>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                          <h3
                            style={{
                              fontSize: "1.05rem",
                              fontWeight: 700,
                              textDecoration: task.completed ? "line-through" : "none",
                              color: task.completed ? "var(--text-dim)" : "var(--text-main)",
                            }}
                          >
                            {task.title}
                          </h3>

                          <span className={`badge ${priorityClass}`}>
                            {task.priority || "medium"}
                          </span>

                          {task.completed && (
                            <span className="badge badge-pill-status">
                              Completed
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p
                            style={{
                              fontSize: "0.885rem",
                              color: task.completed ? "var(--text-dim)" : "var(--text-muted)",
                              lineHeight: 1.45,
                              marginBottom: "0.5rem",
                            }}
                          >
                            {task.description}
                          </p>
                        )}

                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          Created: {task.createdAt ? new Date(task.createdAt).toLocaleString() : "Just now"}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleDelete(task._id)}
                        className="btn btn-danger"
                        style={{
                          padding: "0.4rem 0.75rem",
                          fontSize: "0.8rem",
                          borderRadius: "var(--radius-sm)",
                        }}
                        title="Delete task"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Projects;