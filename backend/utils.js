// Shared Utility Functions

/**
 * Normalize file path for web compatibility
 * Converts Windows backslashes to forward slashes and ensures absolute paths
 * @param {string} filePath - File path to normalize
 * @param {boolean} ensureAbsolute - Whether to ensure path starts with /
 * @returns {string} Normalized path
 */
function normalizePath(filePath, ensureAbsolute = true) {
    if (!filePath) return filePath;

    // Convert backslashes to forward slashes
    let normalized = filePath.replace(/\\/g, '/');

    // Ensure absolute path if needed (for web URLs)
    if (ensureAbsolute && !normalized.startsWith('http') && !normalized.startsWith('/') && !normalized.startsWith('data:')) {
        normalized = '/' + normalized;
    }

    return normalized;
}

/**
 * Get avatar path for a student
 * @param {Object} student - Student object with photo and gender properties
 * @returns {string} Avatar path
 */
function getAvatarPath(student) {
    // If student has a photo, normalize path and return it
    if (student.photo) {
        return normalizePath(student.photo, true);
    }
    // Otherwise return default avatar based on gender
    const defaultAvatar = student.gender === 'F'
        ? CONFIG.DEFAULT_AVATAR_GIRL
        : CONFIG.DEFAULT_AVATAR_BOY;
    return normalizePath(defaultAvatar, true);
}

/**
 * Format time as HH:MM
 * @param {number} hours - Hours (0-23)
 * @param {number} minutes - Minutes (0-59)
 * @returns {string} Formatted time
 */
function formatTime(hours, minutes) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Calculate time difference in minutes
 * @param {number} currentHour - Current hour
 * @param {number} currentMinute - Current minute
 * @param {number} targetHour - Target hour
 * @param {number} targetMinute - Target minute
 * @returns {number} Difference in minutes
 */
function getTimeDifferenceInMinutes(currentHour, currentMinute, targetHour, targetMinute) {
    const currentTimeVal = currentHour * 60 + currentMinute;
    const targetTimeVal = targetHour * 60 + targetMinute;
    return targetTimeVal - currentTimeVal;
}

/**
 * Show error message to user
 * @param {string} message - Error message
 * @param {Error} error - Error object (optional)
 */
function showError(message, error = null) {
    // Use logger if available, otherwise silent
    if (typeof logger !== 'undefined') {
        logger.error(COMPONENTS.SYSTEM, message, error);
    }
    // You can extend this to show toast notifications or modal dialogs
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccess(message) {
    // Silent in production, can be extended for toast notifications
    // if (typeof alert !== 'undefined') {
    //     alert(message);
    // }
}

/**
 * Fetch data with error handling
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} Response data or null on error
 */
async function fetchWithErrorHandling(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.API, `Error fetching from ${url}`, error);
        }
        showError(`Veri alınırken hata oluştu: ${error.message}`, error);
        return null;
    }
}

/**
 * Get weather icon and tip based on weather code and temperature
 * @param {number} weatherCode - Weather code from API
 * @param {number} temperature - Temperature in Celsius
 * @returns {Object} Icon and tip
 */
function getWeatherInfo(weatherCode, temperature) {
    let icon = '☀️';
    let tip = 'Güneş gözlüğünü tak!';

    if (weatherCode > 3) {
        icon = '☁️';
        tip = 'Hava biraz bulutlu.';
    }
    if (weatherCode > 50) {
        icon = '🌧️';
        tip = 'Şemsiyeni almayı unutma!';
    }
    if (weatherCode > 70) {
        icon = '❄️';
        tip = 'Sıkı giyin, kar yağıyor!';
    }
    if (temperature < 10) {
        tip = 'Montunu giymeyi unutma!';
    }
    if (temperature > 25) {
        tip = 'Bol bol su iç!';
    }

    return { icon, tip };
}

// Export for Node.js (server-side)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizePath,
        getAvatarPath,
        formatTime,
        getTimeDifferenceInMinutes,
        showError,
        showSuccess,
        fetchWithErrorHandling,
        getWeatherInfo
    };
}

// Export for browser (client-side)
if (typeof window !== 'undefined') {
    window.Utils = {
        normalizePath,
        getAvatarPath,
        formatTime,
        getTimeDifferenceInMinutes,
        showError,
        showSuccess,
        fetchWithErrorHandling,
        getWeatherInfo
    };
}
