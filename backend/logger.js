// Advanced Logger System for Slideshow
// Supports multiple outputs: console, file (server), database
// Log levels: ERROR, WARN, INFO, DEBUG

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const COMPONENTS = {
    SLIDESHOW: 'SLIDESHOW',
    ADMIN: 'ADMIN',
    API: 'API',
    TRANSITIONS: 'TRANSITIONS',
    MEDIA: 'MEDIA',
    DATABASE: 'DATABASE',
    SYSTEM: 'SYSTEM'
};

class Logger {
    constructor() {
        this.logLevel = LOG_LEVELS.INFO;
        this.debugMode = false;
        this.logs = []; // In-memory buffer for client-side
        this.maxBufferSize = 100;
    }

    // Initialize logger
    init(options = {}) {
        this.logLevel = options.logLevel !== undefined ? options.logLevel : LOG_LEVELS.INFO;
        this.debugMode = options.debugMode || false;
        
        // Check for debug mode in URL
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('debug') === 'true') {
                this.debugMode = true;
                this.logLevel = LOG_LEVELS.DEBUG;
            }
            
            // Check localStorage
            const storedDebug = localStorage.getItem('slideshow_debug_mode');
            if (storedDebug === 'true') {
                this.debugMode = true;
                this.logLevel = LOG_LEVELS.DEBUG;
            }
        }
    }

    // Format log message
    formatLog(level, component, message, errorDetails = null, context = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            component,
            message,
            errorDetails,
            context,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            url: typeof window !== 'undefined' ? window.location.href : null
        };

        // Add stack trace if error
        if (errorDetails && errorDetails instanceof Error) {
            logEntry.stackTrace = errorDetails.stack;
            logEntry.errorName = errorDetails.name;
            logEntry.errorMessage = errorDetails.message;
        }

        return logEntry;
    }

    // Write to console
    writeToConsole(logEntry) {
        const level = logEntry.level;
        const prefix = `[${logEntry.timestamp}] [${level}] [${logEntry.component}]`;
        const message = logEntry.message;
        const context = logEntry.context ? `| Context: ${JSON.stringify(logEntry.context)}` : '';
        const error = logEntry.errorDetails ? `| Error: ${logEntry.errorDetails}` : '';

        const fullMessage = `${prefix} ${message} ${context} ${error}`;

        switch (level) {
            case 'ERROR':
                console.error(fullMessage, logEntry.errorDetails || '');
                break;
            case 'WARN':
                console.warn(fullMessage);
                break;
            case 'DEBUG':
                if (this.debugMode) {
                    console.debug(fullMessage);
                }
                break;
            default:
                console.log(fullMessage);
        }
    }

    // Write to server (via API)
    async writeToServer(logEntry) {
        try {
            if (typeof fetch !== 'undefined' && typeof CONFIG !== 'undefined') {
                await fetch(`${CONFIG.API_URL}/logs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(logEntry)
                });
            }
        } catch (err) {
            // Silently fail - don't log logging errors
            console.error('Failed to send log to server:', err);
        }
    }

    // Add to in-memory buffer
    addToBuffer(logEntry) {
        this.logs.push(logEntry);
        if (this.logs.length > this.maxBufferSize) {
            this.logs.shift(); // Remove oldest
        }
    }

    // Main log function
    async log(level, component, message, errorDetails = null, context = null) {
        const levelNum = LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.INFO;
        
        // Skip if log level is too low
        if (levelNum > this.logLevel) {
            return;
        }

        const logEntry = this.formatLog(level, component, message, errorDetails, context);

        // Always write to console
        this.writeToConsole(logEntry);

        // Add to buffer
        this.addToBuffer(logEntry);

        // Write to server (async, don't wait)
        if (typeof window !== 'undefined') {
            this.writeToServer(logEntry).catch(() => {
                // Silently fail
            });
        }

        return logEntry;
    }

    // Convenience methods
    error(component, message, errorDetails = null, context = null) {
        return this.log('ERROR', component, message, errorDetails, context);
    }

    warn(component, message, errorDetails = null, context = null) {
        return this.log('WARN', component, message, errorDetails, context);
    }

    info(component, message, errorDetails = null, context = null) {
        return this.log('INFO', component, message, errorDetails, context);
    }

    debug(component, message, errorDetails = null, context = null) {
        return this.log('DEBUG', component, message, errorDetails, context);
    }

    // Get logs from buffer
    getLogs(filter = {}) {
        let filtered = [...this.logs];

        if (filter.level) {
            filtered = filtered.filter(log => log.level === filter.level);
        }

        if (filter.component) {
            filtered = filtered.filter(log => log.component === filter.component);
        }

        if (filter.since) {
            const sinceDate = new Date(filter.since);
            filtered = filtered.filter(log => new Date(log.timestamp) >= sinceDate);
        }

        return filtered;
    }

    // Clear buffer
    clearBuffer() {
        this.logs = [];
    }

    // Set debug mode
    setDebugMode(enabled) {
        this.debugMode = enabled;
        if (enabled) {
            this.logLevel = LOG_LEVELS.DEBUG;
        } else {
            this.logLevel = LOG_LEVELS.INFO;
        }

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('slideshow_debug_mode', enabled ? 'true' : 'false');
        }
    }
}

// Create singleton instance
const logger = new Logger();

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        logger.init();
    });
}

// Export
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.logger = logger;
    window.COMPONENTS = COMPONENTS;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger, logger, COMPONENTS, LOG_LEVELS };
}


