const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Token & User storage helpers
export const getToken = () => localStorage.getItem("auth_token");
export const setToken = (token) => localStorage.setItem("auth_token", token);
export const removeToken = () => localStorage.removeItem("auth_token");

export const getStoredUser = () => {
    try {
        const u = localStorage.getItem("auth_user");
        return u ? JSON.parse(u) : null;
    } catch {
        return null;
    }
};

export const setStoredUser = (user) => {
    localStorage.setItem("auth_user", JSON.stringify(user));
};

export const removeStoredUser = () => {
    localStorage.removeItem("auth_user");
};

// Event emitter for auth events (401 token expiry, logout)
export const authEvents = new EventTarget();

export const notifyUnauthorized = () => {
    removeToken();
    removeStoredUser();
    authEvents.dispatchEvent(new CustomEvent("unauthorized"));
};

// Authorized fetch wrapper that handles Authorization header and 401 handling
export const authFetch = async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        notifyUnauthorized();
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Session expired or unauthorized. Please log in.");
    }

    return response;
};

// ========================================
// AUTH API
// ========================================

export const registerUser = async (email, password) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.error || "Registration failed");
    }

    if (data.token) {
        setToken(data.token);
    }
    if (data.user) {
        setStoredUser(data.user);
    }

    return data;
};

export const loginUser = async (email, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.error || "Login failed");
    }

    if (data.token) {
        setToken(data.token);
    }
    if (data.user) {
        setStoredUser(data.user);
    }

    return data;
};

export const getMe = async () => {
    const response = await authFetch("/auth/me");
    if (!response.ok) {
        throw new Error("Failed to fetch user profile");
    }
    const data = await response.json();
    if (data.user) {
        setStoredUser(data.user);
    }
    return data.user || data;
};

export const logoutUser = () => {
    removeToken();
    removeStoredUser();
    authEvents.dispatchEvent(new CustomEvent("logout"));
};

// ========================================
// TASK API (Protected with JWT)
// ========================================

export const getTasks = async () => {
    const response = await authFetch("/tasks");
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to fetch tasks");
    }
    return response.json();
};

export const createTask = async (task) => {
    const response = await authFetch("/tasks", {
        method: "POST",
        body: JSON.stringify(task),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to create task");
    }
    return data;
};

export const updateTask = async (id, task) => {
    const response = await authFetch(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(task),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to update task");
    }
    return data;
};

export const deleteTask = async (id) => {
    const response = await authFetch(`/tasks/${id}`, {
        method: "DELETE",
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to delete task");
    }
    return data;
};

// ========================================
// AI API (Practical 13)
// ========================================

export const generateTaskDescription = async (title) => {
    const response = await fetch(`${BASE_URL}/ai/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI description");
    }
    return data;
};