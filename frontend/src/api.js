// Simple fetch wrapper with JWT authentication and automatic refresh
// Assumes backend API is served from /api/ (adjust BASE_URL as needed)

// Force VM backend URL - Updated v2
const BASE_URL = "http://10.200.20.105:8080/api";

// Debug: log the API URL being used
console.log("Frontend API URL (v2):", BASE_URL);
console.log("Build timestamp:", Date.now());

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

  resetUserPassword: async (id, password) => {
    const res = await fetchWithAuth(`/auth/users/${id}/reset_password/`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    if (!res.ok) throw await res.json()
    return res.json()
  },

  createUser: async (payload) => {
    const res = await fetchWithAuth('/auth/users/create/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw await res.json()
    return res.json()
  },

  importDicom: async (formData, onProgress) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Creating XMLHttpRequest for upload...');
        const xhr = new XMLHttpRequest();

        // Track upload progress
        if (onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              onProgress(percentComplete);
            }
          });
        }

        xhr.upload.addEventListener('loadstart', () => {
          console.log('Upload started');
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          console.log('Upload load event, status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error('Failed to parse response'));
            }
          } else if (xhr.status === 401 && refreshToken) {
            // Handle token refresh and retry
            fetch(`${BASE_URL}/auth/refresh/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: refreshToken }),
            })
            .then(async (refreshResp) => {
              if (refreshResp.ok) {
                const data = await refreshResp.json();
                setTokens({ access: data.access });
                // Retry the upload with new token
                api.importDicom(formData, onProgress).then(resolve).catch(reject);
              } else {
                clearTokens();
                reject(new Error('Authentication failed'));
              }
            })
            .catch(() => {
              clearTokens();
              reject(new Error('Authentication failed'));
            });
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(error);
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        // Handle errors
        xhr.addEventListener('error', (e) => {
          console.error('XHR error event:', e);
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          console.log('Upload aborted');
          reject(new Error('Upload cancelled'));
        });

        // Open and send request
        const uploadUrl = `${BASE_URL}/dicom/import/`;
        console.log('Opening XHR connection to:', uploadUrl);
        xhr.open('POST', uploadUrl);

        // Set auth header
        if (accessToken) {
          console.log('Setting Authorization header');
          xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        }

        console.log('Sending FormData...');
        xhr.send(formData);
      } catch (error) {
        reject(error);
      }
    });
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