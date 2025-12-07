// Interval & Timeout Manager
// Prevents memory leaks by tracking and cleaning up all intervals/timeouts

class IntervalManager {
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
        this.eventListeners = new Map(); // Track event listeners for cleanup
    }

    /**
     * Create an interval and track it
     * @param {Function} callback - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Interval ID
     */
    setInterval(callback, delay) {
        const id = setInterval(callback, delay);
        this.intervals.add(id);
        return id;
    }

    /**
     * Create a timeout and track it
     * @param {Function} callback - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setTimeout(callback, delay) {
        const id = setTimeout(callback, delay);
        this.timeouts.add(id);
        return id;
    }

    /**
     * Clear specific interval
     * @param {number} id - Interval ID
     */
    clearInterval(id) {
        clearInterval(id);
        this.intervals.delete(id);
    }

    /**
     * Clear specific timeout
     * @param {number} id - Timeout ID
     */
    clearTimeout(id) {
        clearTimeout(id);
        this.timeouts.delete(id);
    }

    /**
     * Add event listener and track it
     * @param {Element} element - DOM element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {object} options - Event options
     */
    addEventListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);

        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }

        this.eventListeners.get(element).push({
            event,
            handler,
            options
        });
    }

    /**
     * Clean up all intervals, timeouts and event listeners
     */
    cleanup() {
        // Clear all intervals
        this.intervals.forEach(id => clearInterval(id));
        this.intervals.clear();

        // Clear all timeouts
        this.timeouts.forEach(id => clearTimeout(id));
        this.timeouts.clear();

        // Remove all event listeners
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        });
        this.eventListeners.clear();

        if (typeof logger !== 'undefined') {
            logger.debug(COMPONENTS.SYSTEM, 'Interval manager cleaned up');
        }
    }

    /**
     * Get current count of tracked resources
     * @returns {object} Count of intervals, timeouts and listeners
     */
    getStats() {
        return {
            intervals: this.intervals.size,
            timeouts: this.timeouts.size,
            eventListeners: Array.from(this.eventListeners.values())
                .reduce((sum, arr) => sum + arr.length, 0)
        };
    }
}

// Create singleton instance
const intervalManager = new IntervalManager();

// Export
if (typeof window !== 'undefined') {
    window.IntervalManager = IntervalManager;
    window.intervalManager = intervalManager;

    // Auto cleanup on page unload
    window.addEventListener('beforeunload', () => intervalManager.cleanup());
    window.addEventListener('pagehide', () => intervalManager.cleanup());
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IntervalManager, intervalManager };
}
