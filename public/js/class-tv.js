(function initClassTVModule(global) {
    'use strict';

    const PROGRAMME_DWELL_MIN = 6500;
    const PROGRAMME_DWELL_JITTER = 2500;
    const PIP_DURATION = 3800;
    const TAKEOVER_DURATION = 3600;
    const QUIET_PIP_COOLDOWN = 42000;
    const MEDIUM_PIP_COOLDOWN = 14500;
    const HIGH_TAKEOVER_COOLDOWN = 11500;
    const MAGIC_THEME_ID = 'magic-park';
    const PROGRAMME_TRANSITIONS = ['tune', 'sweep', 'pop'];

    const MASCOT_IMAGES = {
        low: 'assets/noise-states/quiet.webp',
        medium: 'assets/noise-states/attention.webp',
        high: 'assets/noise-states/loud.webp'
    };

    const ATATURK_PROGRAMMES = [
        ['assets/ataturk-slides/ataturk-1.webp', 'Vatanını en çok seven, görevini en iyi yapandır.'],
        ['assets/ataturk-slides/ataturk-2.webp', 'Hayatta en hakiki mürşit ilimdir.'],
        ['assets/ataturk-slides/ataturk-3.webp', 'Küçük hanımlar, küçük beyler! Sizler hepiniz geleceğin bir gülü, yıldızı ve mutluluk parıltısısınız.'],
        ['assets/ataturk-slides/ataturk-4.webp', 'Çalışmadan, yorulmadan, üretmeden rahat yaşamak isteyen toplumlar önce haysiyetlerini kaybederler.'],
        ['assets/ataturk-slides/ataturk-5.webp', 'Öğretmenler! Yeni nesil sizin eseriniz olacaktır.'],
        ['assets/ataturk-slides/ataturk-6.webp', 'Egemenlik kayıtsız şartsız milletindir.'],
        ['assets/ataturk-slides/ataturk-7.webp', 'Bütün ümidim gençliktedir.']
    ];

    function escapeHtml(value) {
        if (global.Utils && typeof global.Utils.escapeHtml === 'function') {
            return global.Utils.escapeHtml(String(value ?? ''));
        }
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function avatarPath(student) {
        if (global.Utils && typeof global.Utils.getAvatarPath === 'function') {
            return global.Utils.getAvatarPath(student);
        }
        if (student?.photo) return student.photo;
        if (student?.gender === 'F') return global.CONFIG?.DEFAULT_AVATAR_GIRL || '';
        return global.CONFIG?.DEFAULT_AVATAR_BOY || '';
    }

    class ClassTVDirector {
        constructor(options = {}) {
            this.document = options.document || global.document;
            this.setTimeout = options.setTimeout || global.setTimeout.bind(global);
            this.clearTimeout = options.clearTimeout || global.clearTimeout.bind(global);
            this.now = options.now || (() => Date.now());
            this.random = options.random || Math.random;
            this.gsap = options.gsap === undefined ? global.gsap : options.gsap;

            this.snapshot = { stats: null, roles: [] };
            this.currentFamily = null;
            this.lastFamily = null;
            this.ataturkIndex = 0;
            this.transitionIndex = 0;
            this.programmeTimer = null;
            this.pipTimer = null;
            this.takeoverTimer = null;
            this.mascotRepeatTimer = null;
            this.lastPipAt = -Infinity;
            this.lastTakeoverAt = -Infinity;
            this.noiseLevel = null;
            this.initialized = false;
            this.themeActive = false;

            this.handleNoiseEvent = event => this.handleNoise(event?.detail || {});
            this.handleThemeEvent = event => this.setThemeActive(event?.detail?.themeId === MAGIC_THEME_ID);
        }

        init() {
            if (this.initialized) return this;
            this.elements = {
                root: this.document?.getElementById?.('class-tv-layer') || null,
                programme: this.document?.getElementById?.('class-tv-programme') || null,
                pip: this.document?.getElementById?.('class-tv-mascot-pip') || null,
                takeover: this.document?.getElementById?.('class-tv-takeover') || null,
                slideshow: this.document?.getElementById?.('slideshow-container') || null
            };
            if (!this.elements.root || !this.elements.programme) return this;

            global.addEventListener?.('classroom:noise-state', this.handleNoiseEvent);
            global.addEventListener?.('classroom:theme-change', this.handleThemeEvent);
            this.initialized = true;
            const initialThemeId = this.document?.body?.dataset?.theme || MAGIC_THEME_ID;
            this.setThemeActive(initialThemeId === MAGIC_THEME_ID);
            return this;
        }

        setThemeActive(active) {
            const shouldBeActive = Boolean(active);
            if (this.themeActive === shouldBeActive) return;
            this.themeActive = shouldBeActive;

            if (this.elements?.root) {
                this.elements.root.dataset.broadcastActive = shouldBeActive ? 'true' : 'false';
            }

            if (!shouldBeActive) {
                if (this.programmeTimer) this.clearTimeout(this.programmeTimer);
                this.programmeTimer = null;
                this.clearMascotRepeat();

                if (this.pipTimer) this.clearTimeout(this.pipTimer);
                this.pipTimer = null;
                if (this.elements?.pip) {
                    this.elements.pip.hidden = true;
                    this.elements.pip.classList?.remove?.('is-visible', 'is-low', 'is-medium');
                }

                if (this.takeoverTimer) this.clearTimeout(this.takeoverTimer);
                this.takeoverTimer = null;
                if (this.elements?.takeover) {
                    this.elements.takeover.hidden = true;
                    this.elements.takeover.classList?.remove?.('is-visible');
                    this.elements.takeover.innerHTML = '';
                }
                return;
            }

            if (!this.currentFamily) this.showProgramme('ataturk');
            this.scheduleNextProgramme();
        }

        updateStats(stats) {
            if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return;
            this.snapshot.stats = {
                ...stats,
                absentStudents: Array.isArray(stats.absentStudents) ? stats.absentStudents.slice() : []
            };
        }

        updateRoles(roles) {
            if (!Array.isArray(roles)) return;
            this.snapshot.roles = roles.slice();
        }

        getProgrammeFamilies() {
            const stats = this.snapshot.stats;
            const roles = this.snapshot.roles;
            const families = [];

            if (stats) families.push('attendance', 'gender');
            if (stats?.absentStudents?.length) families.push('absent');
            if (roles.some(role => role.role_type === 'vice_president')) families.push('vice-presidents');
            if (roles.some(role => role.role_type === 'duty')) families.push('duty');
            if (roles.some(role => role.role_type === 'star')) families.push('stars');
            families.push('ataturk', 'base-media');
            return families;
        }

        pickNextProgramme() {
            const families = this.getProgrammeFamilies();
            const alternatives = families.filter(family => family !== this.currentFamily);
            const pool = alternatives.length ? alternatives : families;
            if (!pool.length) return 'base-media';
            const index = Math.min(pool.length - 1, Math.floor(this.random() * pool.length));
            return pool[index];
        }

        scheduleNextProgramme() {
            if (!this.initialized || !this.themeActive) return;
            if (this.programmeTimer) this.clearTimeout(this.programmeTimer);
            const delay = PROGRAMME_DWELL_MIN + Math.round(this.random() * PROGRAMME_DWELL_JITTER);
            this.programmeTimer = this.setTimeout(() => {
                this.programmeTimer = null;
                this.showNextProgramme();
            }, delay);
        }

        showNextProgramme() {
            this.showProgramme(this.pickNextProgramme());
            this.scheduleNextProgramme();
        }

        showProgramme(family) {
            if (!this.elements?.programme) return;
            this.lastFamily = this.currentFamily;
            this.currentFamily = family;
            if (this.elements.root) this.elements.root.dataset.programme = family;

            if (family === 'base-media') {
                this.elements.programme.innerHTML = '';
                this.elements.programme.hidden = true;
                return;
            }

            const html = this.renderProgramme(family);
            if (!html) {
                this.currentFamily = 'base-media';
                if (this.elements.root) this.elements.root.dataset.programme = 'base-media';
                this.elements.programme.innerHTML = '';
                this.elements.programme.hidden = true;
                return;
            }

            this.elements.programme.hidden = false;
            this.elements.programme.innerHTML = html;
            this.animateProgrammeIn();
        }

        renderProgramme(family) {
            const stats = this.snapshot.stats;
            const roles = this.snapshot.roles;

            switch (family) {
                case 'attendance': {
                    if (!stats) return '';
                    const present = Number(stats.todayPresent) || 0;
                    const absent = Number(stats.todayAbsent) || 0;
                    const totalToday = present + absent;
                    return `
                        <section class="class-tv-card class-tv-card--attendance">
                            <div class="class-tv-kicker">BUGÜN SINIFTA</div>
                            <div class="class-tv-hero-number">${totalToday ? present : '—'}<span> / ${Number(stats.total) || 0}</span></div>
                            <div class="class-tv-message">${totalToday ? (absent ? `${absent} arkadaşımız bugün aramızda değil` : 'Tam kadro, harika!') : 'Yoklama birazdan burada'}</div>
                        </section>`;
                }
                case 'gender': {
                    if (!stats) return '';
                    return `
                        <section class="class-tv-card class-tv-card--gender">
                            <div class="class-tv-kicker">2/D RENKLİ TAKIMI</div>
                            <div class="class-tv-split">
                                <div class="class-tv-stat class-tv-stat--girl"><img src="assets/ui-icons-3d/student-girl.png" alt=""><strong>${Number(stats.girls) || 0}</strong><span>Kız Öğrenci</span></div>
                                <div class="class-tv-stat class-tv-stat--boy"><img src="assets/ui-icons-3d/student-boy.png" alt=""><strong>${Number(stats.boys) || 0}</strong><span>Erkek Öğrenci</span></div>
                            </div>
                        </section>`;
                }
                case 'absent': {
                    const students = stats?.absentStudents || [];
                    if (!students.length) return '';
                    const items = students.slice(0, 4).map(student => `
                        <div class="class-tv-person">
                            <img src="${escapeHtml(avatarPath(student))}" alt="" aria-hidden="true">
                            <strong>${escapeHtml(student.name || 'Arkadaşımız')}</strong>
                        </div>`).join('');
                    return `<section class="class-tv-card class-tv-card--people"><div class="class-tv-kicker">BUGÜN ÖZLEDİKLERİMİZ</div><div class="class-tv-people-grid">${items}</div><div class="class-tv-message">Yarın görüşmek üzere!</div></section>`;
                }
                case 'vice-presidents': {
                    const vicePresidents = roles.filter(role => role.role_type === 'vice_president').slice(0, 2);
                    if (!vicePresidents.length) return '';
                    return this.renderPeopleProgramme('BAŞKAN YARDIMCILARIMIZ', vicePresidents, 'Birlikte daha güçlüyüz!');
                }
                case 'duty': {
                    const duties = roles.filter(role => role.role_type === 'duty').slice(0, 4);
                    if (!duties.length) return '';
                    return this.renderPeopleProgramme('BUGÜNÜN NÖBETÇİLERİ', duties, 'Sınıfımız onlara emanet!');
                }
                case 'stars': {
                    const stars = roles.filter(role => role.role_type === 'star').slice(0, 3);
                    if (!stars.length) return '';
                    return this.renderPeopleProgramme('HAFTANIN YILDIZLARI', stars, 'Alkışlar sizin için!');
                }
                case 'ataturk': {
                    const item = ATATURK_PROGRAMMES[this.ataturkIndex % ATATURK_PROGRAMMES.length];
                    this.ataturkIndex = (this.ataturkIndex + 1) % ATATURK_PROGRAMMES.length;
                    return `
                        <section class="class-tv-card class-tv-card--ataturk">
                            <img class="class-tv-ataturk" src="${item[0]}" alt="Mustafa Kemal Atatürk">
                            <div class="class-tv-quote"><span>ATATÜRK'TEN</span><blockquote>“${escapeHtml(item[1])}”</blockquote></div>
                        </section>`;
                }
                default:
                    return '';
            }
        }

        renderPeopleProgramme(title, people, message) {
            const items = people.map(person => `
                <div class="class-tv-person">
                    <img src="${escapeHtml(avatarPath(person))}" alt="" aria-hidden="true">
                    <strong>${escapeHtml(person.name || 'Arkadaşımız')}</strong>
                </div>`).join('');
            return `<section class="class-tv-card class-tv-card--people"><div class="class-tv-kicker">${escapeHtml(title)}</div><div class="class-tv-people-grid">${items}</div><div class="class-tv-message">${escapeHtml(message)}</div></section>`;
        }

        animateProgrammeIn() {
            const target = this.elements?.programme;
            if (!target) return;

            const transitionName = PROGRAMME_TRANSITIONS[this.transitionIndex % PROGRAMME_TRANSITIONS.length];
            this.transitionIndex = (this.transitionIndex + 1) % PROGRAMME_TRANSITIONS.length;
            if (this.elements?.root) this.elements.root.dataset.transition = transitionName;

            if (!this.gsap || typeof this.gsap.fromTo !== 'function') return;
            const reduceMotion = global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
            if (reduceMotion) {
                this.gsap.fromTo(target,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.2, ease: 'power1.out', overwrite: true }
                );
                return;
            }

            const variants = {
                tune: {
                    from: { opacity: 0, scaleX: 1.02, scaleY: 0.055, filter: 'brightness(1.85) saturate(0.7)' },
                    to: { opacity: 1, scaleX: 1, scaleY: 1, filter: 'brightness(1) saturate(1)', duration: 0.64, ease: 'expo.out', overwrite: true }
                },
                sweep: {
                    from: { opacity: 0, xPercent: -4, clipPath: 'inset(0 100% 0 0 round 7%)', filter: 'saturate(1.35)' },
                    to: { opacity: 1, xPercent: 0, clipPath: 'inset(0 0% 0 0 round 7%)', filter: 'saturate(1)', duration: 0.72, ease: 'power3.out', overwrite: true }
                },
                pop: {
                    from: { opacity: 0, scale: 0.88, rotationY: -7, transformPerspective: 900, filter: 'brightness(1.18)' },
                    to: { opacity: 1, scale: 1, rotationY: 0, filter: 'brightness(1)', duration: 0.68, ease: 'back.out(1.35)', overwrite: true }
                }
            };
            const variant = variants[transitionName];
            this.gsap.fromTo(target, variant.from, variant.to);
        }

        handleNoise(detail) {
            if (!this.themeActive) return;
            const level = ['low', 'medium', 'high'].includes(detail?.level) ? detail.level : null;
            this.noiseLevel = level;
            if (!level || detail?.micState === 'unavailable') {
                this.clearMascotRepeat();
                return;
            }

            if (level === 'high') {
                this.showTakeover(detail.score);
                this.scheduleMascotRepeat('high');
                return;
            }

            const cooldown = level === 'medium' ? MEDIUM_PIP_COOLDOWN : QUIET_PIP_COOLDOWN;
            if (this.now() - this.lastPipAt >= cooldown) this.showPip(level);
            this.scheduleMascotRepeat(level);
        }

        showPip(level) {
            const pip = this.elements?.pip;
            if (!pip || this.takeoverTimer) return;
            if (this.pipTimer) this.clearTimeout(this.pipTimer);
            this.lastPipAt = this.now();
            const title = level === 'medium' ? 'Şşşt… biraz daha sessiz' : 'Harika gidiyoruz!';
            pip.innerHTML = `<img src="${MASCOT_IMAGES[level]}" alt="" aria-hidden="true"><span>${title}</span>`;
            pip.hidden = false;
            pip.classList?.add?.('is-visible', `is-${level}`);
            this.pipTimer = this.setTimeout(() => {
                this.pipTimer = null;
                pip.hidden = true;
                pip.classList?.remove?.('is-visible', 'is-low', 'is-medium');
            }, PIP_DURATION);
        }

        showTakeover(score) {
            const takeover = this.elements?.takeover;
            if (!takeover || this.takeoverTimer) return;
            if (this.now() - this.lastTakeoverAt < HIGH_TAKEOVER_COOLDOWN) return;

            this.lastTakeoverAt = this.now();
            if (this.pipTimer && this.elements.pip) {
                this.clearTimeout(this.pipTimer);
                this.pipTimer = null;
                this.elements.pip.hidden = true;
            }
            takeover.innerHTML = `
                <div class="class-tv-takeover__burst">
                    <img src="${MASCOT_IMAGES.high}" alt="" aria-hidden="true">
                    <strong>ÇOK SESLİYİZ!</strong>
                    <span>Lavunu bizi duyabilmek istiyor · ${Math.round(Number(score) || 0)}%</span>
                </div>`;
            takeover.hidden = false;
            takeover.classList?.add?.('is-visible');

            if (this.gsap && typeof this.gsap.fromTo === 'function') {
                this.gsap.fromTo(takeover,
                    { opacity: 0, scale: 0.96, rotation: -0.4 },
                    { opacity: 1, scale: 1, rotation: 0.4, duration: 0.18, repeat: 5, yoyo: true, ease: 'power1.inOut', overwrite: true }
                );
            }

            this.takeoverTimer = this.setTimeout(() => {
                this.takeoverTimer = null;
                takeover.hidden = true;
                takeover.classList?.remove?.('is-visible');
                takeover.innerHTML = '';
            }, TAKEOVER_DURATION);
        }

        scheduleMascotRepeat(level) {
            this.clearMascotRepeat();
            const delay = level === 'high'
                ? HIGH_TAKEOVER_COOLDOWN
                : (level === 'medium' ? MEDIUM_PIP_COOLDOWN : QUIET_PIP_COOLDOWN);
            this.mascotRepeatTimer = this.setTimeout(() => {
                this.mascotRepeatTimer = null;
                if (this.noiseLevel !== level) return;
                if (level === 'high') this.showTakeover(100);
                else this.showPip(level);
                this.scheduleMascotRepeat(level);
            }, delay);
        }

        clearMascotRepeat() {
            if (!this.mascotRepeatTimer) return;
            this.clearTimeout(this.mascotRepeatTimer);
            this.mascotRepeatTimer = null;
        }

        destroy() {
            this.setThemeActive(false);
            for (const timerName of ['programmeTimer', 'pipTimer', 'takeoverTimer', 'mascotRepeatTimer']) {
                if (this[timerName]) this.clearTimeout(this[timerName]);
                this[timerName] = null;
            }
            global.removeEventListener?.('classroom:noise-state', this.handleNoiseEvent);
            global.removeEventListener?.('classroom:theme-change', this.handleThemeEvent);
            this.initialized = false;
        }
    }

    global.ClassTVDirector = ClassTVDirector;
    global.createClassTV = options => new ClassTVDirector(options);

    global.document?.addEventListener?.('DOMContentLoaded', () => {
        if (global.ClassTV) return;
        global.ClassTV = global.createClassTV();
        global.ClassTV.init();
    });
})(window);
