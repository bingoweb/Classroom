// API Service - Centralized fetch handling
// Replaces 30+ duplicate fetch patterns across codebase

class APIService {
    constructor(baseURL) {
        this.baseURL = baseURL || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
    }

    /**
     * Generic fetch method with error handling
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // Response might not be JSON
                }
                throw new Error(errorMessage);
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return await response.text();
        } catch (error) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.API, `API request failed: ${endpoint}`, error, {
                    url,
                    method: options.method || 'GET'
                });
            }
            throw error;
        }
    }

    // Convenience methods
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async upload(endpoint, formData) {
        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set Content-Type for FormData
        });
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.APIService = APIService;
    window.api = new APIService();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIService };
}
