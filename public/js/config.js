// Shared Configuration
const CONFIG = {
    API_URL: 'http://localhost:3000/api',
    PORT: 3000,

    // Avatar paths
    DEFAULT_AVATAR_BOY: 'assets/default_boy.png',
    DEFAULT_AVATAR_GIRL: 'assets/default_girl.png',

    // Timing configurations (in milliseconds)
    SLIDE_DURATION: 10000, // 10 seconds
    DATA_REFRESH_INTERVAL: 5000, // 5 saniye - admin değişikliklerinin hızlı yansıması için
    CLOCK_UPDATE_INTERVAL: 1000, // 1 second

    // School schedule
    SCHOOL_START_TIME: { hour: 9, minute: 0 }, // 09:00
    SCHOOL_END_TIME: { hour: 14, minute: 30 }, // 14:30
    CLASS_DURATION: 40, // minutes

    // Break durations
    BREAK_DURATIONS: {
        SHORT: 10, // minutes
        LONG: 15,  // minutes
        LUNCH: 40  // minutes
    },

    // Confetti settings
    CONFETTI_PARTICLE_COUNT: 100
};

// Export for Node.js (server-side)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Export for browser (client-side)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
