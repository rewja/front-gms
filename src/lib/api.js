// create API client using fetch wrapper
// export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
// Default to local deploy backend on 8001
// import.meta.env.VITE_API_BASE_URL || "http://172.15.3.141:8084/api";

// untuk akses file publik, misalnya upload di /storage
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api";
export const API_PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api$/, "");
export const fileUrl = (path) => {
  if (!path) return "";
  return `${API_PUBLIC_BASE_URL}/storage/${path}`;
};

let AUTH_TOKEN = null;

export function setAuthToken(token) {
  AUTH_TOKEN = token;
}

export function clearAuthToken() {
  AUTH_TOKEN = null;
}

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of entries) {
    if (Array.isArray(v)) {
      v.forEach((item) => usp.append(k, String(item)));
    } else {
      usp.set(k, String(v));
    }
  }
  return `?${usp.toString()}`;
}

export const api = {
  async request(
    path,
    { method = "GET", body, headers = {}, isForm = false, params } = {}
  ) {
    const query = buildQuery(params);
    const url = `${API_BASE_URL}${path}${query}`;
    const finalHeaders = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...headers,
    };
    if (AUTH_TOKEN) finalHeaders["Authorization"] = `Bearer ${AUTH_TOKEN}`;
    // Don't set Content-Type for FormData - browser will set it automatically with boundary
    // Only set Content-Type for JSON data when not using FormData
    if (!isForm && body && !(body instanceof FormData)) {
      finalHeaders["Content-Type"] = "application/json";
    } else if (isForm && body instanceof FormData) {
      // Explicitly remove Content-Type header for FormData to let browser set it
      delete finalHeaders["Content-Type"];
    }

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      let errorData = null;
      
      // Read response as text first to handle cases where HTML warnings might be present
      const contentType = res.headers.get("content-type") || "";
      try {
        const text = await res.text();
        console.log('Error response text (first 500 chars):', text.substring(0, 500)); // Debug log
        
        // Try to extract JSON from response (might have HTML warnings before JSON)
        // Look for JSON object in the text - try multiple strategies
        let jsonText = null;
        let parsedData = null;
        
        // Strategy 1: Find first { and last } and extract JSON
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonText = text.substring(jsonStart, jsonEnd + 1);
          try {
            parsedData = JSON.parse(jsonText);
          } catch (e) {
            // Try strategy 2: Find JSON after </b> or </br> tags
            const afterHtml = text.split(/<\/[^>]+>/).pop();
            const jsonStart2 = afterHtml.indexOf('{');
            const jsonEnd2 = afterHtml.lastIndexOf('}');
            if (jsonStart2 !== -1 && jsonEnd2 !== -1 && jsonEnd2 > jsonStart2) {
              jsonText = afterHtml.substring(jsonStart2, jsonEnd2 + 1);
              try {
                parsedData = JSON.parse(jsonText);
              } catch (e2) {
                // Strategy 3: Try to find JSON using regex
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  try {
                    parsedData = JSON.parse(jsonMatch[0]);
                  } catch (e3) {
                    console.error('All JSON parsing strategies failed');
                  }
                }
              }
            }
          }
        }
        
        if (parsedData) {
          errMsg = parsedData.message || errMsg;
          errorData = parsedData;
          console.log('Successfully parsed error data:', errorData); // Debug log
        } else {
          // No valid JSON found, extract message from HTML/text
          const htmlMessage = text.match(/<b>([^<]+)<\/b>/)?.[1] || 
                             text.match(/message["\s:]+"([^"]+)"/)?.[1] ||
                             text.match(/The ([^<]+)/)?.[1] ||
                             text.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
          errMsg = htmlMessage || text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || errMsg;
          errorData = { message: errMsg };
          console.log('Extracted error message from text:', errMsg); // Debug log
        }
      } catch (readError) {
        // If reading response fails, use default message
        console.error('Failed to read error response:', readError);
      }
      
      // Always throw an error object with response property for consistent handling
      const error = new Error(errMsg);
      error.response = {
        status: res.status,
        data: errorData || { message: errMsg }
      };
      throw error;
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return { data: await res.json() };
    }
    return { data: await res.text() };
  },

  get(path, options = {}) {
    return this.request(path, { method: "GET", ...options });
  },
  post(path, body, options = {}) {
    return this.request(path, { method: "POST", body, ...options });
  },
  patch(path, body, options = {}) {
    return this.request(path, { method: "PATCH", body, ...options });
  },
  put(path, body, options = {}) {
    return this.request(path, { method: "PUT", body, ...options });
  },
  delete(path) {
    return this.request(path, { method: "DELETE" });
  },
};
