(function (root) {
    'use strict';

    const MAGIC_THEME_ID = 'magic-park';
    const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=39.79043&longitude=32.80903&current=temperature_2m,weather_code,is_day&timezone=Europe%2FIstanbul';
    const WEATHER_CACHE_KEY = 'classroom_magic_clock_weather_v3';
    const WEATHER_FRESH_TTL_MS = 15 * 60 * 1000;
    const WEATHER_REFRESH_MS = 10 * 60 * 1000;
    const PHASE_REFRESH_MS = 30 * 1000;
    const WEATHER_TIMEOUT_MS = 6500;

    const WEATHER_ASSETS = Object.freeze({
        sun: '/assets/ui-icons-3d/weather-sun.png',
        cloud: '/assets/ui-icons-3d/weather-partly-cloudy.png',
        rain: '/assets/ui-icons-3d/weather-rain.png',
        snow: '/assets/ui-icons-3d/weather-snow.png'
    });

    const WEATHER_LABELS = Object.freeze({
        sun: 'güneşli',
        cloud: 'bulutlu',
        rain: 'yağmurlu',
        snow: 'karlı'
    });

    function getDayPhase(hour) {
        const normalized = Number(hour);
        if (normalized >= 5 && normalized < 10) return 'morning';
        if (normalized >= 10 && normalized < 17) return 'day';
        if (normalized >= 17 && normalized < 21) return 'evening';
        return 'night';
    }

    function weatherCodeToKind(code, isDay) {
        const value = Number(code);
        if ([71, 73, 75, 77, 85, 86].includes(value)) return 'snow';
        if ((value >= 51 && value <= 67) || (value >= 80 && value <= 82) || (value >= 95 && value <= 99)) return 'rain';
        if (value === 0 && Number(isDay) === 1) return 'sun';
        return 'cloud';
    }

    function normalizeWeatherPayload(payload) {
        const current = payload && payload.current;
        const temperature = Number(current && current.temperature_2m);
        const weatherCode = Number(current && current.weather_code);
        if (!Number.isFinite(temperature) || !Number.isFinite(weatherCode)) return null;
        return {
            temperature: Math.round(temperature),
            weatherCode,
            isDay: Number(current.is_day) === 1,
            observedAt: typeof current.time === 'string' ? current.time : ''
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getDayPhase, weatherCodeToKind, normalizeWeatherPayload };
    }

    if (!root || !root.document) return;

    const document = root.document;
    let active = false;
    let activationToken = 0;
    let weatherTimer = 0;
    let phaseTimer = 0;
    let weatherAbortController = null;
    let currentPhase = '';

    function getRoot() {
        return document.getElementById('clock-board');
    }

    function getClockNow() {
        if (root.TimeProvider && typeof root.TimeProvider.now === 'function') return root.TimeProvider.now();
        return new Date();
    }

    function getWeatherElements() {
        return {
            root: document.getElementById('clock-weather'),
            icon: document.getElementById('clock-weather-icon'),
            temperature: document.getElementById('clock-weather-temperature')
        };
    }

    function readWeatherCache() {
        try {
            const raw = root.localStorage.getItem(WEATHER_CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !Number.isFinite(parsed.savedAt) || !parsed.data) return null;
            const data = normalizeWeatherPayload({
                current: {
                    temperature_2m: parsed.data.temperature,
                    weather_code: parsed.data.weatherCode,
                    is_day: parsed.data.isDay ? 1 : 0,
                    time: parsed.data.observedAt
                }
            });
            return data ? { savedAt: parsed.savedAt, data } : null;
        } catch (_) {
            return null;
        }
    }

    function writeWeatherCache(data) {
        try {
            root.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
        } catch (_) {
            // Storage is optional; the Clock must always keep working.
        }
    }

    function hideWeather() {
        const elements = getWeatherElements();
        if (elements.root) elements.root.hidden = true;
    }

    function renderWeather(data) {
        if (!data) return;
        const elements = getWeatherElements();
        if (!elements.root || !elements.icon || !elements.temperature) return;
        const kind = weatherCodeToKind(data.weatherCode, data.isDay ? 1 : 0);
        elements.icon.src = WEATHER_ASSETS[kind];
        elements.temperature.textContent = `${data.temperature}°`;
        elements.root.dataset.weatherKind = kind;
        elements.root.setAttribute('aria-label', `Gölbaşı hava durumu: ${data.temperature} derece, ${WEATHER_LABELS[kind]}`);
        elements.root.hidden = false;
    }

    async function refreshWeather(token) {
        if (!active || token !== activationToken) return;
        if (weatherAbortController) weatherAbortController.abort();
        weatherAbortController = new AbortController();
        const timeout = root.setTimeout(() => weatherAbortController && weatherAbortController.abort(), WEATHER_TIMEOUT_MS);

        try {
            const response = await root.fetch(WEATHER_URL, {
                signal: weatherAbortController.signal,
                cache: 'no-store',
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error(`weather HTTP ${response.status}`);
            const data = normalizeWeatherPayload(await response.json());
            if (!data) throw new Error('weather payload invalid');
            if (!active || token !== activationToken) return;
            writeWeatherCache(data);
            renderWeather(data);
        } catch (_) {
            if (!active || token !== activationToken) return;
            const cached = readWeatherCache();
            if (cached) renderWeather(cached.data);
            else hideWeather();
        } finally {
            root.clearTimeout(timeout);
            weatherAbortController = null;
        }
    }

    function startWeather(token) {
        const cached = readWeatherCache();
        if (cached) renderWeather(cached.data);
        else hideWeather();

        const isFresh = cached && (Date.now() - cached.savedAt) < WEATHER_FRESH_TTL_MS;
        if (!isFresh) refreshWeather(token);

        if (weatherTimer) root.clearInterval(weatherTimer);
        weatherTimer = root.setInterval(() => refreshWeather(token), WEATHER_REFRESH_MS);
    }

    function updatePhase(force) {
        const phase = getDayPhase(getClockNow().getHours());
        if (!force && phase === currentPhase) return;
        currentPhase = phase;
        const clockRoot = getRoot();
        if (clockRoot) clockRoot.dataset.dayPhase = phase;
    }

    function activate() {
        if (active) {
            updatePhase(false);
            return;
        }
        active = true;
        const token = ++activationToken;
        updatePhase(true);
        startWeather(token);
        if (phaseTimer) root.clearInterval(phaseTimer);
        phaseTimer = root.setInterval(() => updatePhase(false), PHASE_REFRESH_MS);
    }

    function deactivate() {
        if (!active) return;
        active = false;
        activationToken += 1;
        if (phaseTimer) root.clearInterval(phaseTimer);
        if (weatherTimer) root.clearInterval(weatherTimer);
        phaseTimer = 0;
        weatherTimer = 0;
        if (weatherAbortController) weatherAbortController.abort();
        weatherAbortController = null;
        hideWeather();
    }

    function handleThemeChange(event) {
        if (event && event.detail && event.detail.themeId === MAGIC_THEME_ID) activate();
        else deactivate();
    }

    function handleTimeSimulationChange() {
        if (active) updatePhase(true);
    }

    function init() {
        root.addEventListener('classroom:theme-change', handleThemeChange);
        root.addEventListener('timeSimulationChanged', handleTimeSimulationChange);
        root.addEventListener('pagehide', deactivate, { once: true });
        if (document.body && document.body.dataset.theme === MAGIC_THEME_ID) activate();
    }

    root.MagicClock = {
        activate,
        deactivate,
        getDayPhase,
        weatherCodeToKind,
        normalizeWeatherPayload,
        getDebugState() {
            return {
                active,
                phase: currentPhase,
                weatherTimerActive: Boolean(weatherTimer),
                phaseTimerActive: Boolean(phaseTimer)
            };
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})(typeof window !== 'undefined' ? window : null);
