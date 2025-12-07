// Media Analyzer v2.0 - Enhanced Smart Transition Selection Algorithm
// AI-powered transition selection based on content analysis and viewing patterns

/**
 * TRANSITION CATEGORIES
 * Organized by visual impact and use case
 */
const TRANSITION_CATEGORIES = {
    // Smooth, professional transitions
    SMOOTH: ['fade', 'dissolve', 'blur'],

    // Energetic, attention-grabbing
    DYNAMIC: ['zoom-in', 'zoom-out', 'rotate', 'flip'],

    // Directional movement
    DIRECTIONAL: ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'push', 'wipe'],

    // Advanced/Artistic effects
    ARTISTIC: ['particle', 'glitch', 'morph', 'cube', 'cover', 'uncover'],

    // Safe defaults (always work well)
    SAFE: ['fade', 'slide-left', 'slide-right', 'zoom-in', 'dissolve']
};

/**
 * IMPROVED TRANSITION RULES v2.0
 * More granular and context-aware
 */
const TRANSITION_RULES = {
    // Content type based rules - Now with primary and secondary choices
    contentType: {
        'celebration': {
            primary: ['particle', 'zoom-in', 'glitch'],
            secondary: ['rotate', 'flip', 'morph'],
            avoid: ['fade', 'blur'] // Too subtle for celebrations
        },
        'announcement': {
            primary: ['slide-up', 'fade', 'push'],
            secondary: ['dissolve', 'wipe'],
            avoid: ['glitch', 'morph'] // Too distracting
        },
        'rule': {
            primary: ['fade', 'slide-right', 'dissolve'],
            secondary: ['slide-left', 'blur'],
            avoid: ['glitch', 'particle'] // Too playful
        },
        'photo': {
            primary: ['zoom-in', 'zoom-out', 'dissolve'],
            secondary: ['fade', 'slide-left', 'slide-right'],
            avoid: ['glitch'] // Can distort photos
        },
        'custom': {
            primary: ['fade', 'slide-left', 'zoom-in'],
            secondary: ['slide-right', 'dissolve'],
            avoid: []
        }
    },

    // Media type based rules
    mediaType: {
        'video': {
            primary: ['fade', 'dissolve', 'slide-left'],
            secondary: ['slide-right', 'push'],
            avoid: ['zoom-in', 'zoom-out', 'rotate'] // Can cause disorientation with moving content
        },
        'gif': {
            primary: ['fade', 'slide-up', 'zoom-in'],
            secondary: ['slide-down', 'dissolve'],
            avoid: ['glitch'] // GIFs are already animated
        },
        'image': {
            primary: ['zoom-in', 'zoom-out', 'dissolve', 'fade'],
            secondary: ['slide-left', 'slide-right', 'blur'],
            avoid: []
        }
    },

    // Sequence position rules (NEW!)
    position: {
        'first': {
            primary: ['fade', 'zoom-in', 'slide-up'],
            reason: 'Gentle introduction'
        },
        'last': {
            primary: ['fade', 'zoom-out', 'dissolve'],
            reason: 'Smooth conclusion'
        },
        'middle': {
            primary: [...TRANSITION_CATEGORIES.DYNAMIC, ...TRANSITION_CATEGORIES.DIRECTIONAL],
            reason: 'Keep engagement high'
        }
    },

    // Contrast rules - Different from previous slide (NEW!)
    contrast: {
        afterSmooth: TRANSITION_CATEGORIES.DYNAMIC,
        afterDynamic: TRANSITION_CATEGORIES.SMOOTH,
        afterDirectional: [...TRANSITION_CATEGORIES.ARTISTIC, ...TRANSITION_CATEGORIES.SMOOTH]
    }
};

// Transition history tracking
let previousTransitions = [];
let transitionPatterns = {}; // Track which transitions work well together
const MAX_PREVIOUS_HISTORY = 8; // Increased from 5
const MIN_VARIETY_THRESHOLD = 3; // Minimum transitions before repeating

/**
 * Advanced transition selection algorithm
 * @param {object} slide - Current slide data
 * @param {Array} allSlides - All slides in the presentation
 * @param {number} currentIndex - Current slide index
 * @returns {string} Selected transition name
 */
function getSmartTransition(slide, allSlides, currentIndex) {
    const { media_type, content_type, transition_mode, transition_type } = slide;

    // If manual mode and transition_type is set, use it
    if (transition_mode === 'manual' && transition_type) {
        return transition_type;
    }

    // If random mode, pick random intelligently
    if (transition_mode === 'random') {
        return getIntelligentRandom(slide, allSlides, currentIndex);
    }

    // Auto mode - enhanced analysis
    return getAutoTransition(slide, allSlides, currentIndex);
}

/**
 * Intelligent random selection (not truly random, but feels random)
 * Avoids repetition and poor combinations
 */
function getIntelligentRandom(slide, allSlides, currentIndex) {
    const allTransitions = [
        ...TRANSITION_CATEGORIES.SMOOTH,
        ...TRANSITION_CATEGORIES.DYNAMIC,
        ...TRANSITION_CATEGORIES.DIRECTIONAL,
        ...TRANSITION_CATEGORIES.ARTISTIC
    ];

    // Remove recently used
    const available = allTransitions.filter(t => !previousTransitions.includes(t));
    const pool = available.length >= MIN_VARIETY_THRESHOLD ? available : allTransitions;

    // Avoid transitions that don't work well with current content
    const rules = TRANSITION_RULES.contentType[slide.content_type] || {};
    const suitable = pool.filter(t => !rules.avoid || !rules.avoid.includes(t));

    const finalPool = suitable.length > 0 ? suitable : pool;
    const selected = finalPool[Math.floor(Math.random() * finalPool.length)];

    updateHistory(selected);
    return selected;
}

/**
 * Enhanced auto transition selection
 * Uses multiple factors for optimal selection
 */
function getAutoTransition(slide, allSlides, currentIndex) {
    let candidates = [];
    let weights = {}; // Track weight of each candidate

    // Factor 1: Content Type (40% weight)
    const contentRules = TRANSITION_RULES.contentType[slide.content_type];
    if (contentRules) {
        contentRules.primary.forEach(t => {
            if (!candidates.includes(t)) candidates.push(t);
            weights[t] = (weights[t] || 0) + 40;
        });
        contentRules.secondary.forEach(t => {
            if (!candidates.includes(t)) candidates.push(t);
            weights[t] = (weights[t] || 0) + 20;
        });

        // Remove explicitly avoided transitions
        if (contentRules.avoid) {
            candidates = candidates.filter(t => !contentRules.avoid.includes(t));
        }
    }

    // Factor 2: Media Type (30% weight)
    const mediaRules = TRANSITION_RULES.mediaType[slide.media_type];
    if (mediaRules) {
        mediaRules.primary.forEach(t => {
            if (!candidates.includes(t)) candidates.push(t);
            weights[t] = (weights[t] || 0) + 30;
        });
        mediaRules.secondary.forEach(t => {
            if (!candidates.includes(t)) candidates.push(t);
            weights[t] = (weights[t] || 0) + 15;
        });

        // Remove avoided transitions
        if (mediaRules.avoid) {
            candidates = candidates.filter(t => !mediaRules.avoid.includes(t));
        }
    }

    // Factor 3: Position in sequence (15% weight) - NEW!
    const position = currentIndex === 0 ? 'first'
        : currentIndex === allSlides.length - 1 ? 'last'
            : 'middle';
    const posRules = TRANSITION_RULES.position[position];
    if (posRules) {
        posRules.primary.forEach(t => {
            if (!candidates.includes(t)) candidates.push(t);
            weights[t] = (weights[t] || 0) + 15;
        });
    }

    // Factor 4: Contrast with previous (15% weight) - NEW!
    if (currentIndex > 0) {
        const prevTransition = previousTransitions[previousTransitions.length - 1];
        const prevCategory = getCategoryOfTransition(prevTransition);
        const contrastTransitions = TRANSITION_RULES.contrast[`after${capitalize(prevCategory)}`] || [];

        contrastTransitions.forEach(t => {
            if (candidates.includes(t)) {
                weights[t] = (weights[t] || 0) + 15;
            }
        });
    }

    // Factor 5: Avoid recent repetition (negative weight)
    previousTransitions.forEach((prevT, index) => {
        const recency = previousTransitions.length - index;
        const penalty = Math.max(0, 50 - (recency * 10)); // Recent = higher penalty
        if (weights[prevT]) {
            weights[prevT] = Math.max(0, weights[prevT] - penalty);
        }
    });

    // Select based on weights
    if (candidates.length === 0) {
        candidates = TRANSITION_CATEGORIES.SAFE;
        candidates.forEach(t => weights[t] = 10);
    }

    // Weighted random selection
    const selected = weightedRandomChoice(candidates, weights);
    updateHistory(selected);

    return selected;
}

/**
 * Helper: Weighted random selection
 */
function weightedRandomChoice(candidates, weights) {
    const totalWeight = candidates.reduce((sum, c) => sum + (weights[c] || 1), 0);
    let random = Math.random() * totalWeight;

    for (const candidate of candidates) {
        random -= (weights[candidate] || 1);
        if (random <= 0) {
            return candidate;
        }
    }

    return candidates[candidates.length - 1]; // Fallback
}

/**
 * Helper: Get category of a transition
 */
function getCategoryOfTransition(transition) {
    for (const [category, transitions] of Object.entries(TRANSITION_CATEGORIES)) {
        if (transitions.includes(transition)) {
            return category.toLowerCase();
        }
    }
    return 'smooth'; // Default
}

/**
 * Helper: Capitalize first letter
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Update transition history
 */
function updateHistory(transition) {
    previousTransitions.push(transition);
    if (previousTransitions.length > MAX_PREVIOUS_HISTORY) {
        previousTransitions.shift();
    }
}

/**
 * Advanced: Analyze image characteristics (placeholder for future enhancement)
 * Could use Canvas API to analyze brightness, color, etc.
 */
function analyzeImageCharacteristics(mediaPath, mediaType) {
    const path = (mediaPath || '').toLowerCase();

    // Heuristic-based analysis
    const patterns = {
        celebration: ['celebration', 'party', 'birthday', 'festival', 'congrat'],
        announcement: ['announcement', 'notice', 'info', 'alert'],
        calm: ['calm', 'peaceful', 'serene', 'quiet'],
        energetic: ['energy', 'action', 'sport', 'dynamic']
    };

    for (const [mood, keywords] of Object.entries(patterns)) {
        if (keywords.some(keyword => path.includes(keyword))) {
            return {
                mood,
                brightness: mood === 'celebration' || mood === 'energetic' ? 'high' : 'medium',
                recommended: TRANSITION_RULES.contentType[mood === 'celebration' ? 'celebration' : 'custom']?.primary || []
            };
        }
    }

    return {
        mood: 'neutral',
        brightness: 'medium',
        recommended: TRANSITION_CATEGORIES.SAFE
    };
}

/**
 * Get statistics about transition usage (useful for debugging/optimization)
 */
function getTransitionStats() {
    const stats = {
        total: previousTransitions.length,
        history: [...previousTransitions],
        variety: new Set(previousTransitions).size,
        mostRecent: previousTransitions[previousTransitions.length - 1]
    };
    return stats;
}

/**
 * Reset history (useful when starting a new presentation cycle)
 */
function resetTransitionHistory() {
    previousTransitions = [];
    transitionPatterns = {};
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.getSmartTransition = getSmartTransition;
    window.analyzeImageCharacteristics = analyzeImageCharacteristics;
    window.getTransitionStats = getTransitionStats;
    window.resetTransitionHistory = resetTransitionHistory;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getSmartTransition,
        analyzeImageCharacteristics,
        getTransitionStats,
        resetTransitionHistory
    };
}
