// Simple fetch wrapper with JWT authentication and automatic refresh
// Assumes backend API is served from /api/ (adjust BASE_URL as needed)

// Use Vite env var if provided, else default to backend on port 8000
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

let accessToken = localStorage.getItem("access") || "";
let refreshToken = localStorage.getItem("refresh") || "";

export function setTokens({ access, refresh }) {
  if (access) {
    accessToken = access;
    localStorage.setItem("access", access);
  }
  if (refresh) {
    refreshToken = refresh;
    localStorage.setItem("refresh", refresh);
  }
}

export function clearTokens() {
  accessToken = "";
  refreshToken = "";
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

async function fetchWithAuth(url, options = {}, retry = true) {
  const headers = { ...(options.headers || {}) };

  // Only set JSON content-type if the caller didn't specify one and the body isn't FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry && refreshToken) {
    // Try refreshing token
    const refreshResp = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (refreshResp.ok) {
      const data = await refreshResp.json();
      setTokens({ access: data.access });
      // Retry original request once
      return fetchWithAuth(url, options, false);
    } else {
      clearTokens();
    }
  }

  return response;
}

export const api = {
  login: async (username, password) => {
    const res = await fetchWithAuth("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw await res.json();
    const data = await res.json();
    setTokens({ access: data.access, refresh: data.refresh });
    return data;
  },

  register: async (payload) => {
    const res = await fetch(`${BASE_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  logout: async () => {
    if (!refreshToken) return;
    await fetchWithAuth("/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    });
    clearTokens();
  },

  getCurrentUser: async () => {
    const res = await fetchWithAuth("/auth/user/");
    if (!res.ok) throw await res.json();
    return res.json();
  },

  getDestinations: async () => {
    const res = await fetchWithAuth("/destinations/");
    if (!res.ok) throw await res.json();
    const data = await res.json();
    // DRF pagination returns {results: []}
    return Array.isArray(data) ? data : data.results || [];
  },

  createDestination: async (payload) => {
    const res = await fetchWithAuth("/destinations/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  updateDestination: async (id, payload) => {
    const res = await fetchWithAuth(`/destinations/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  deleteDestination: async (id) => {
    const res = await fetchWithAuth(`/destinations/${id}/`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw await res.json();
    return true;
  },

  getAuditLogs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetchWithAuth(`/audit/logs/${query ? '?' + query : ''}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  getUsers: async () => {
    const res = await fetchWithAuth('/auth/users/');
    if (!res.ok) throw await res.json();
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  },

  deleteUser: async (id) => {
    const res = await fetchWithAuth(`/auth/users/${id}/`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) throw await res.json()
    return true
  },

  importDicom: async (formData) => {
    const res = await fetchWithAuth("/dicom/import/", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  sendSeries: async (payload) => {
    const res = await fetchWithAuth("/dicom/send/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  getTransferStatus: async (params) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetchWithAuth(`/dicom/status/?${query}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },
}; 