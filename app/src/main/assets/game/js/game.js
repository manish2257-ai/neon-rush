// Neon Rush 3D - Full 3D Endless Runner Engine
// Built with Three.js (Procedural 3D geometries, materials, lighting, physics, audio)

(function () {
    'use strict';

    // Game Constants
    const LANES = [-3.2, 0, 3.2];
    const BASE_SPEED = 24;
    const MAX_SPEED = 68;
    const JUMP_VELOCITY = 14.5;
    const GRAVITY = -36;
    const SLIDE_DURATION = 0.65;
    const SEGMENT_LENGTH = 60;
    const NUM_SEGMENTS = 5;

    // Dynamic Speed Tiers & 3D Atmosphere Presets
    const SPEED_TIERS = [
        {
            id: 'cruise',
            name: 'CRUISE',
            minSpeed: 24,
            maxSpeed: 32,
            color: '#00f0ff',
            className: 'tier-cruise',
            fogColor: 0x080416,
            fogDensity: 0.012,
            ambientColor: 0x351d5a,
            ambientIntensity: 0.85,
            dirColor: 0x00f0ff,
            dirIntensity: 1.20,
            backColor: 0xff007f,
            backIntensity: 0.60,
            skyColor: 0x00f0ff,
            skyRotSpeedY: 0.035,
            skyRotSpeedX: 0.008,
            skyRotSpeedZ: 0.012,
            skyScrollSpeed: 0.045,
            engineBoost: 1.0
        },
        {
            id: 'hyper',
            name: 'HYPER DRIVE',
            minSpeed: 32,
            maxSpeed: 42,
            color: '#00ff88',
            className: 'tier-hyper',
            fogColor: 0x021814,
            fogDensity: 0.0135,
            ambientColor: 0x0f362a,
            ambientIntensity: 0.95,
            dirColor: 0x00ff88,
            dirIntensity: 1.35,
            backColor: 0x00f0ff,
            backIntensity: 0.75,
            skyColor: 0x00ff88,
            skyRotSpeedY: 0.08,
            skyRotSpeedX: 0.018,
            skyRotSpeedZ: 0.026,
            skyScrollSpeed: 0.09,
            engineBoost: 1.35
        },
        {
            id: 'sonic',
            name: 'SONIC VELOCITY',
            minSpeed: 42,
            maxSpeed: 52,
            color: '#ffe600',
            className: 'tier-sonic',
            fogColor: 0x1a1202,
            fogDensity: 0.0145,
            ambientColor: 0x3b2a04,
            ambientIntensity: 1.05,
            dirColor: 0xffe600,
            dirIntensity: 1.55,
            backColor: 0xff6600,
            backIntensity: 0.90,
            skyColor: 0xffe600,
            skyRotSpeedY: 0.15,
            skyRotSpeedX: 0.035,
            skyRotSpeedZ: 0.06,
            skyScrollSpeed: 0.16,
            engineBoost: 1.75
        },
        {
            id: 'overdrive',
            name: 'CYBER OVERDRIVE',
            minSpeed: 52,
            maxSpeed: 62,
            color: '#ff007f',
            className: 'tier-overdrive',
            fogColor: 0x220318,
            fogDensity: 0.016,
            ambientColor: 0x480830,
            ambientIntensity: 1.20,
            dirColor: 0xff007f,
            dirIntensity: 1.70,
            backColor: 0xff2200,
            backIntensity: 1.05,
            skyColor: 0xff007f,
            skyRotSpeedY: 0.26,
            skyRotSpeedX: 0.065,
            skyRotSpeedZ: 0.12,
            skyScrollSpeed: 0.28,
            engineBoost: 2.25
        },
        {
            id: 'warp',
            name: 'WARP MAXIMUM',
            minSpeed: 62,
            maxSpeed: 999,
            color: '#df44ff',
            className: 'tier-warp',
            fogColor: 0x16002b,
            fogDensity: 0.0175,
            ambientColor: 0x3c0658,
            ambientIntensity: 1.35,
            dirColor: 0xdf44ff,
            dirIntensity: 1.95,
            backColor: 0x00f0ff,
            backIntensity: 1.25,
            skyColor: 0xdf44ff,
            skyRotSpeedY: 0.44,
            skyRotSpeedX: 0.11,
            skyRotSpeedZ: 0.22,
            skyScrollSpeed: 0.48,
            engineBoost: 3.0
        }
    ];
    let currentSpeedTierIndex = 0;
    let speedSurgeTimeout = null;

    // Game State
    const STATE = {
        MENU: 0,
        PLAYING: 1,
        PAUSED: 2,
        GAMEOVER: 3
    };

    let currentState = STATE.MENU;
    let score = 0;
    let distance = 0;
    let coins = 0;
    let currentSpeed = BASE_SPEED;
    let highScore = 0;
    let totalCoins = 0;

    // Power-ups State
    let shieldActive = false;
    let magnetTimer = 0;
    let doubleScoreTimer = 0;

    // Player Movement
    let currentLane = 1; // 0: Left, 1: Center, 2: Right
    let targetX = LANES[1];
    let isJumping = false;
    let isSliding = false;
    let slideTimer = 0;
    let verticalVelocity = 0;

    // Three.js Core
    let scene, camera, renderer;
    let playerGroup, playerMesh, shieldMesh, engineLight;
    let ambientLight, dirLight, backLight;
    let skylineBuildingMat, skylineWindowMat;
    let skyboxMesh, skyboxMat, skyGridTexture;
    let trackSegments = [];
    let obstacles = [];
    let collectibleCoins = [];
    let powerupItems = [];
    let particles = [];
    let buildings = [];

    // Atmosphere Transition Targets & Cache
    let targetFogColor = null;
    let targetAmbientColor = null;
    let targetDirColor = null;
    let targetBackColor = null;
    let targetSkyColor = null;
    let currentSkyRotY = 0.035;
    let currentSkyRotX = 0.008;
    let currentSkyRotZ = 0.012;
    let currentSkyScroll = 0.045;
    let targetFogDensity = 0.012;
    let targetAmbientIntensity = 0.85;
    let targetDirIntensity = 1.20;
    let targetBackIntensity = 0.60;
    let targetEngineBoost = 1.0;
    let atmosphereFlashIntensity = 0;

    // Animation & Timing
    let lastTime = performance.now();
    let clock = new THREE.Clock();
    let cameraShake = 0;
    let runAnimTime = 0;

    // Load persistent data
    function loadStorage() {
        try {
            highScore = parseInt(localStorage.getItem('neonrush_highscore') || '0', 10);
            totalCoins = parseInt(localStorage.getItem('neonrush_totalcoins') || '0', 10);

            const savedSkins = JSON.parse(localStorage.getItem('neonrush_unlocked_skins') || 'null');
            if (Array.isArray(savedSkins)) unlockedSkins = savedSkins;
            const savedSkin = localStorage.getItem('neonrush_selected_skin');
            if (savedSkin && SKINS_CATALOG.find(s => s.id === savedSkin)) selectedSkin = savedSkin;

            const savedTrails = JSON.parse(localStorage.getItem('neonrush_unlocked_trails') || 'null');
            if (Array.isArray(savedTrails)) unlockedTrails = savedTrails;
            const savedTrail = localStorage.getItem('neonrush_selected_trail');
            if (savedTrail && TRAILS_CATALOG.find(t => t.id === savedTrail)) selectedTrail = savedTrail;
        } catch (e) {
            console.warn('Storage read error', e);
        }
        updateMenuStats();
        initDailyMissions();
        initDailyStreak();
        initLeaderboard();
        applySkin(selectedSkin);
    }

    function saveStorage() {
        try {
            if (score > highScore) {
                highScore = Math.floor(score);
                localStorage.setItem('neonrush_highscore', highScore.toString());
            }
            totalCoins += coins;
            localStorage.setItem('neonrush_totalcoins', totalCoins.toString());

            // Sync with Android Bridge if running in native APK
            if (window.AndroidBridge && window.AndroidBridge.saveScore) {
                window.AndroidBridge.saveScore(highScore, totalCoins);
            }
        } catch (e) {
            console.warn('Storage save error', e);
        }
    }

    // --- Daily Mission System ---
    // --- Dynamic Daily Challenges System (Refreshes Every 24 Hours) ---
    const CHALLENGE_POOLS = {
        // Group 1: Agility & Obstacle Maneuvers
        agility: [
            {
                subId: 'slide_obs_10',
                type: 'slide_obstacles',
                title: 'Slide under 10 obstacles',
                icon: '🛹',
                target: 10,
                reward: 250
            },
            {
                subId: 'slide_obs_8',
                type: 'slide_obstacles',
                title: 'Slide under 8 laser barriers',
                icon: '⚡',
                target: 8,
                reward: 220
            },
            {
                subId: 'jump_hurdles_12',
                type: 'jump_hurdles',
                title: 'Leap over 12 hurdles',
                icon: '🦘',
                target: 12,
                reward: 240
            },
            {
                subId: 'slides_20',
                type: 'slides',
                title: 'Perform 20 slides',
                icon: '💨',
                target: 20,
                reward: 180
            },
            {
                subId: 'jumps_25',
                type: 'jumps',
                title: 'Perform 25 jumps',
                icon: '⬆️',
                target: 25,
                reward: 180
            }
        ],
        // Group 2: Economy, Coins & Power-ups
        collection: [
            {
                subId: 'coins_200',
                type: 'coins',
                title: 'Collect 200 coins',
                icon: '🟡',
                target: 200,
                reward: 220
            },
            {
                subId: 'coins_150',
                type: 'coins',
                title: 'Collect 150 coins',
                icon: '🟡',
                target: 150,
                reward: 180
            },
            {
                subId: 'coins_250',
                type: 'coins',
                title: 'Collect 250 coins',
                icon: '🟡',
                target: 250,
                reward: 280
            },
            {
                subId: 'powerups_3',
                type: 'powerups',
                title: 'Grab 3 power-ups',
                icon: '🛡️',
                target: 3,
                reward: 200
            },
            {
                subId: 'powerups_4',
                type: 'powerups',
                title: 'Grab 4 power-ups',
                icon: '⚡',
                target: 4,
                reward: 260
            }
        ],
        // Group 3: Endurance, Distance & Mastery
        endurance: [
            {
                subId: 'dist_500',
                type: 'reach_distance',
                title: 'Reach 500m distance',
                icon: '🏃',
                target: 500,
                reward: 220
            },
            {
                subId: 'dist_750',
                type: 'reach_distance',
                title: 'Reach 750m distance',
                icon: '🏃',
                target: 750,
                reward: 300
            },
            {
                subId: 'dist_400',
                type: 'reach_distance',
                title: 'Reach 400m distance',
                icon: '🏃',
                target: 400,
                reward: 170
            },
            {
                subId: 'lanes_35',
                type: 'lane_switches',
                title: 'Switch lanes 35 times',
                icon: '↔️',
                target: 35,
                reward: 190
            },
            {
                subId: 'score_10000',
                type: 'reach_score',
                title: 'Score 10,000 points',
                icon: '⚡',
                target: 10000,
                reward: 250
            }
        ]
    };

    let runStats = {
        coins: 0,
        distance: 0,
        score: 0,
        jumps: 0,
        slides: 0,
        powerups: 0,
        laneSwitches: 0,
        laserSlides: 0,
        hurdleJumps: 0
    };

    let dailyMissions = [];
    let missionToastTimeout = null;
    let countdownTimerInterval = null;
    let dayOffset = 0;

    try {
        dayOffset = parseInt(localStorage.getItem('neonrush_daily_offset') || '0', 10);
    } catch (_) {}

    function getTodayString(offset = 0) {
        const d = new Date();
        if (offset !== 0) {
            d.setDate(d.getDate() + offset);
        }
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function generateDailyChallenges(dateStr, isFirstTime = false) {
        if (isFirstTime) {
            return [
                { ...CHALLENGE_POOLS.agility[0], id: `${dateStr}_${CHALLENGE_POOLS.agility[0].subId}` },
                { ...CHALLENGE_POOLS.collection[0], id: `${dateStr}_${CHALLENGE_POOLS.collection[0].subId}` },
                { ...CHALLENGE_POOLS.endurance[0], id: `${dateStr}_${CHALLENGE_POOLS.endurance[0].subId}` }
            ];
        }

        let seed = 0;
        for (let i = 0; i < dateStr.length; i++) {
            seed = ((seed << 5) - seed) + dateStr.charCodeAt(i);
            seed |= 0;
        }
        seed = Math.abs(seed);

        const idx1 = seed % CHALLENGE_POOLS.agility.length;
        const idx2 = Math.floor(seed / 7) % CHALLENGE_POOLS.collection.length;
        const idx3 = Math.floor(seed / 31) % CHALLENGE_POOLS.endurance.length;

        const c1 = CHALLENGE_POOLS.agility[idx1];
        const c2 = CHALLENGE_POOLS.collection[idx2];
        const c3 = CHALLENGE_POOLS.endurance[idx3];

        return [
            { ...c1, id: `${dateStr}_${c1.subId}` },
            { ...c2, id: `${dateStr}_${c2.subId}` },
            { ...c3, id: `${dateStr}_${c3.subId}` }
        ];
    }

    function initDailyMissions(forceAdvance = false) {
        if (forceAdvance) {
            dayOffset++;
            try {
                localStorage.setItem('neonrush_daily_offset', dayOffset.toString());
            } catch (_) {}
        }

        const today = getTodayString(dayOffset);
        let savedDate = null;
        let savedData = null;

        try {
            savedDate = localStorage.getItem('neonrush_daily_date');
            savedData = JSON.parse(localStorage.getItem('neonrush_daily_missions') || 'null');
        } catch (e) {
            console.warn('Daily mission load error', e);
        }

        const isNewDay = (savedDate !== today);
        const isFirstTime = (!savedDate && !savedData);
        const selectedTemplates = generateDailyChallenges(today, isFirstTime);

        dailyMissions = selectedTemplates.map(template => {
            let progress = 0;
            let completed = false;
            let claimed = false;

            if (!isNewDay && savedData && savedData[template.id]) {
                progress = savedData[template.id].progress || 0;
                completed = !!savedData[template.id].completed;
                claimed = !!savedData[template.id].claimed;
            }

            return {
                ...template,
                progress: progress,
                completed: completed,
                claimed: claimed
            };
        });

        saveDailyMissions();
        updateMissionsBadge();
        const modalEl = document.getElementById('missions-screen');
        if (modalEl && modalEl.classList.contains('active')) {
            renderMissionsModal();
        }
    }

    function saveDailyMissions() {
        try {
            const today = getTodayString(dayOffset);
            const dataToSave = {};
            dailyMissions.forEach(m => {
                dataToSave[m.id] = {
                    progress: m.progress,
                    completed: m.completed,
                    claimed: m.claimed
                };
            });
            localStorage.setItem('neonrush_daily_date', today);
            localStorage.setItem('neonrush_daily_missions', JSON.stringify(dataToSave));
        } catch (e) {
            console.warn('Daily mission save error', e);
        }
    }

    function addDailyChallengeProgress(type, amount, isAbsolute = false) {
        let changed = false;
        dailyMissions.forEach(m => {
            if (!m.completed && m.type === type) {
                let nextVal = isAbsolute ? Math.max(m.progress, amount) : (m.progress + amount);
                nextVal = Math.min(m.target, nextVal);
                if (nextVal > m.progress) {
                    m.progress = nextVal;
                    changed = true;
                    if (m.progress >= m.target) {
                        m.completed = true;
                        showMissionToast(m);
                        window.soundManager.playMissionComplete();
                        window.soundManager.vibrate([100, 60, 150]);
                    }
                }
            }
        });
        if (changed) {
            saveDailyMissions();
            updateMissionsBadge();
        }
    }

    function checkMissionsProgress() {
        addDailyChallengeProgress('reach_distance', Math.floor(runStats.distance), true);
        addDailyChallengeProgress('reach_score', Math.floor(runStats.score), true);
    }

    function showMissionToast(mission) {
        const toast = document.getElementById('hud-mission-toast');
        const desc = document.getElementById('hud-mission-toast-desc');
        if (toast && desc) {
            desc.innerText = `${mission.title} (+${mission.reward} 🟡)`;
            toast.classList.add('show');
            if (missionToastTimeout) clearTimeout(missionToastTimeout);
            missionToastTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 3500);
        }
    }

    function claimMissionReward(missionId) {
        const mission = dailyMissions.find(m => m.id === missionId);
        if (mission && mission.completed && !mission.claimed) {
            mission.claimed = true;
            totalCoins += mission.reward;
            saveStorage();
            saveDailyMissions();
            window.soundManager.playRewardClaim();
            window.soundManager.vibrate(120);
            updateMenuStats();
            updateMissionsBadge();
            renderMissionsModal();
            renderGameOverMissions();
        }
    }

    function updateMissionsBadge() {
        const badge = document.getElementById('missions-badge');
        if (!badge) return;
        const unclaimed = dailyMissions.filter(m => m.completed && !m.claimed).length;
        if (unclaimed > 0) {
            badge.innerText = unclaimed;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function updateCountdownDisplay() {
        const countdown = document.getElementById('missions-countdown');
        if (!countdown) return;

        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const diffMs = midnight - now;

        if (diffMs <= 0) {
            initDailyMissions();
            renderMissionsModal();
            return;
        }

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
        countdown.innerText = `RESETS IN ${String(diffHours).padStart(2, '0')}H ${String(diffMins).padStart(2, '0')}M ${String(diffSecs).padStart(2, '0')}S`;
    }

    function renderMissionsModal() {
        const list = document.getElementById('missions-list');
        if (!list) return;
        list.innerHTML = '';

        updateCountdownDisplay();
        if (countdownTimerInterval) clearInterval(countdownTimerInterval);
        countdownTimerInterval = setInterval(updateCountdownDisplay, 1000);

        dailyMissions.forEach(m => {
            const card = document.createElement('div');
            card.className = `mission-card ${m.completed ? 'completed' : ''}`;
            const pct = Math.min(100, Math.floor((m.progress / m.target) * 100));

            let actionHtml = '';
            if (m.claimed) {
                actionHtml = `<span class="mission-claimed-tag">✓ CLAIMED</span>`;
            } else if (m.completed) {
                actionHtml = `<button class="btn-claim-reward" data-id="${m.id}">CLAIM +${m.reward} 🟡</button>`;
            } else {
                actionHtml = `<span class="challenge-in-progress-tag">IN PROGRESS</span>`;
            }

            card.innerHTML = `
                <div class="mission-top-row">
                    <div class="mission-info">
                        <span class="mission-icon">${m.icon}</span>
                        <div class="mission-text-container">
                            <span class="mission-name">${m.title}</span>
                        </div>
                    </div>
                    <span class="mission-reward-tag">+${m.reward} 🟡</span>
                </div>
                <div class="mission-progress-container">
                    <div class="mission-progress-meta">
                        <span>PROGRESS</span>
                        <span>${m.progress} / ${m.target} (${pct}%)</span>
                    </div>
                    <div class="mission-progress-bar-bg">
                        <div class="mission-progress-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
                ${actionHtml}
            `;
            list.appendChild(card);
        });

        list.querySelectorAll('.btn-claim-reward').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                claimMissionReward(btn.getAttribute('data-id'));
            });
        });
    }

    function renderGameOverMissions() {
        const list = document.getElementById('gameover-missions-list');
        const statusSpan = document.getElementById('gameover-missions-status');
        if (!list) return;
        list.innerHTML = '';

        const unclaimed = dailyMissions.filter(m => m.completed && !m.claimed).length;
        if (statusSpan) {
            statusSpan.innerText = unclaimed > 0 ? `(${unclaimed} REWARD READY!)` : '';
        }

        dailyMissions.forEach(m => {
            const item = document.createElement('div');
            item.className = `mission-card ${m.completed ? 'completed' : ''}`;
            item.style.padding = '8px 10px';
            item.style.gap = '6px';
            const pct = Math.min(100, Math.floor((m.progress / m.target) * 100));

            let actionHtml = '';
            if (m.claimed) {
                actionHtml = `<span class="mission-claimed-tag" style="padding: 2px 6px;">✓ CLAIMED</span>`;
            } else if (m.completed) {
                actionHtml = `<button class="btn-claim-reward" data-id="${m.id}" style="padding: 4px 10px;">CLAIM +${m.reward} 🟡</button>`;
            } else {
                actionHtml = `<span style="font-size: 9px; color: #7777aa; font-weight: 800; align-self: flex-end;">${m.progress}/${m.target}</span>`;
            }

            item.innerHTML = `
                <div class="mission-top-row">
                    <div class="mission-info" style="gap: 6px;">
                        <span style="font-size: 16px;">${m.icon}</span>
                        <span style="font-size: 11px; font-weight: 700; color: #fff;">${m.title}</span>
                    </div>
                    ${actionHtml}
                </div>
                <div class="mission-progress-bar-bg" style="height: 5px;">
                    <div class="mission-progress-bar-fill" style="width: ${pct}%;"></div>
                </div>
            `;
            list.appendChild(item);
        });

        list.querySelectorAll('.btn-claim-reward').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                claimMissionReward(btn.getAttribute('data-id'));
            });
        });
    }

    // ==========================================
    // DAILY STREAK COUNTER & 7-DAY ROADMAP SYSTEM
    // ==========================================
    const STREAK_SCHEDULE = [
        { day: 1, reward: 50, title: 'Starter Sparks', icon: '🟡' },
        { day: 2, reward: 100, title: 'Neon Momentum', icon: '🟡' },
        { day: 3, reward: 150, title: 'Speed Surge', icon: '⚡' },
        { day: 4, reward: 200, title: 'Grid Runner', icon: '🟡' },
        { day: 5, reward: 300, title: 'Cyber Ace', icon: '🛡️' },
        { day: 6, reward: 450, title: 'Overdrive', icon: '🔥' },
        { day: 7, reward: 750, title: 'MEGA JACKPOT', icon: '👑', isJackpot: true }
    ];

    let currentStreak = 0;
    let lastStreakClaimDate = null;
    let streakClaimedToday = false;
    let streakToastTimeout = null;

    function getDaysDiff(dStr1, dStr2) {
        if (!dStr1 || !dStr2) return 999;
        const p1 = dStr1.split('-').map(Number);
        const p2 = dStr2.split('-').map(Number);
        const ut1 = Date.UTC(p1[0], p1[1] - 1, p1[2]);
        const ut2 = Date.UTC(p2[0], p2[1] - 1, p2[2]);
        return Math.round((ut2 - ut1) / (1000 * 60 * 60 * 24));
    }

    function initDailyStreak(forceAdvance = false) {
        if (forceAdvance) {
            dayOffset++;
            try {
                localStorage.setItem('neonrush_daily_offset', dayOffset.toString());
            } catch (_) {}
            initDailyMissions();
        }

        const today = getTodayString(dayOffset);

        try {
            currentStreak = parseInt(localStorage.getItem('neonrush_streak_count') || '0', 10);
            lastStreakClaimDate = localStorage.getItem('neonrush_streak_last_date');
        } catch (e) {
            console.warn('Daily streak load error', e);
        }

        if (!lastStreakClaimDate) {
            // First time player: streak is 0, ready to claim Day 1
            currentStreak = 0;
            streakClaimedToday = false;
        } else if (lastStreakClaimDate === today) {
            // Already claimed today
            streakClaimedToday = true;
        } else {
            const diff = getDaysDiff(lastStreakClaimDate, today);
            if (diff === 1) {
                // Consecutive day! Streak intact, next day ready to claim
                streakClaimedToday = false;
            } else if (diff > 1) {
                // Missed one or more calendar days: streak reset to Day 1
                currentStreak = 0;
                streakClaimedToday = false;
            } else {
                // Future date safety fallback
                streakClaimedToday = true;
            }
        }

        updateStreakUI();
        renderStreakModal();
    }

    function updateStreakUI() {
        const streakBadge = document.getElementById('menu-streak-badge');
        const streakDesc = document.getElementById('menu-streak-subtext');
        const streakBtnText = document.getElementById('streak-cta-text');
        const streakCard = document.getElementById('menu-streak-card');
        const streakNotify = document.getElementById('streak-badge-notify');
        const modalStreakCount = document.getElementById('streak-modal-count');

        const activeCycleDay = streakClaimedToday
            ? (((currentStreak - 1) % 7) + 1)
            : ((currentStreak % 7) + 1);
        const rewardAmount = STREAK_SCHEDULE[activeCycleDay - 1].reward;

        if (streakBadge) {
            streakBadge.innerText = `${currentStreak} ${currentStreak === 1 ? 'DAY' : 'DAYS'}`;
        }
        if (modalStreakCount) {
            modalStreakCount.innerText = `${currentStreak} ${currentStreak === 1 ? 'DAY' : 'DAYS'}`;
        }

        if (streakCard) {
            if (streakClaimedToday) {
                streakCard.classList.remove('claimable');
                streakCard.classList.add('claimed');
            } else {
                streakCard.classList.add('claimable');
                streakCard.classList.remove('claimed');
            }
        }

        if (streakDesc) {
            if (streakClaimedToday) {
                streakDesc.innerText = `Day ${activeCycleDay} Claimed! Next tomorrow`;
            } else {
                streakDesc.innerText = `Day ${activeCycleDay}: +${rewardAmount} Coins Ready!`;
            }
        }

        if (streakBtnText) {
            streakBtnText.innerText = streakClaimedToday ? 'CLAIMED ✓' : `CLAIM +${rewardAmount} 🟡`;
        }

        if (streakNotify) {
            streakNotify.style.display = streakClaimedToday ? 'none' : 'flex';
        }
    }

    function claimDailyStreak() {
        if (streakClaimedToday) {
            showScreen('streak-screen');
            return;
        }

        const today = getTodayString(dayOffset);
        currentStreak++;
        const cycleDay = ((currentStreak - 1) % 7) + 1;
        const reward = STREAK_SCHEDULE[cycleDay - 1].reward;

        totalCoins += reward;
        lastStreakClaimDate = today;
        streakClaimedToday = true;

        try {
            localStorage.setItem('neonrush_streak_count', currentStreak.toString());
            localStorage.setItem('neonrush_streak_last_date', today);
        } catch (e) {
            console.warn('Daily streak save error', e);
        }

        saveStorage();
        updateMenuStats();
        updateStreakUI();
        renderStreakModal();

        // Audio & Haptic Celebration
        if (window.soundManager) {
            if (window.soundManager.playRewardClaim) window.soundManager.playRewardClaim();
            if (window.soundManager.playCoin) window.soundManager.playCoin();
            if (window.soundManager.vibrate) window.soundManager.vibrate([100, 60, 150]);
        }

        showStreakClaimToast(cycleDay, currentStreak, reward);
    }

    function showStreakClaimToast(cycleDay, totalStreak, reward) {
        const toast = document.getElementById('streak-claim-toast');
        const title = document.getElementById('streak-toast-title');
        const desc = document.getElementById('streak-toast-desc');
        if (toast && title && desc) {
            title.innerText = `🔥 DAY ${totalStreak} STREAK CLAIMED!`;
            desc.innerText = `+${reward} Cyber Coins Added!`;
            toast.classList.add('show');
            if (streakToastTimeout) clearTimeout(streakToastTimeout);
            streakToastTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 3500);
        }
    }

    function renderStreakModal() {
        const grid = document.getElementById('streak-days-container');
        const modalBtn = document.getElementById('btn-streak-claim-modal');
        const modalBtnText = document.getElementById('streak-modal-claim-text');
        if (!grid) return;
        grid.innerHTML = '';

        const activeCycleDay = streakClaimedToday
            ? (((currentStreak - 1) % 7) + 1)
            : ((currentStreak % 7) + 1);

        STREAK_SCHEDULE.forEach(item => {
            const card = document.createElement('div');
            card.className = 'streak-day-card';
            if (item.isJackpot) card.classList.add('jackpot');

            let statusClass = 'status-locked';
            let statusText = 'LOCKED 🔒';

            if (item.day < activeCycleDay || (item.day === activeCycleDay && streakClaimedToday)) {
                card.classList.add('claimed');
                statusClass = 'status-claimed';
                statusText = 'CLAIMED ✓';
            } else if (item.day === activeCycleDay && !streakClaimedToday) {
                card.classList.add('today');
                statusClass = 'status-ready';
                statusText = 'READY ⚡';
            }

            card.innerHTML = `
                <div class="streak-day-num">DAY ${item.day}</div>
                <div class="streak-day-icon">${item.icon}</div>
                <div class="streak-day-reward">+${item.reward}</div>
                <div class="streak-day-status ${statusClass}">${statusText}</div>
            `;
            grid.appendChild(card);
        });

        if (modalBtn && modalBtnText) {
            if (streakClaimedToday) {
                modalBtn.style.opacity = '0.6';
                modalBtn.style.cursor = 'default';
                modalBtnText.innerText = '✓ CLAIMED TODAY (COME BACK TOMORROW)';
            } else {
                modalBtn.style.opacity = '1';
                modalBtn.style.cursor = 'pointer';
                const todayReward = STREAK_SCHEDULE[activeCycleDay - 1].reward;
                modalBtnText.innerText = `⚡ CLAIM DAY ${activeCycleDay} BONUS (+${todayReward} 🟡)`;
            }
        }
    }

    // --- Cyber Shop System ---
    const SKINS_CATALOG = [
        {
            id: 'skin_striker',
            name: 'Neon Striker',
            desc: 'Classic high-voltage cyber suit with ionic cyan visor.',
            icon: '⚡',
            price: 0,
            colors: {
                board: 0x111122,
                rails: 0x00f0ff,
                torso: 0x1a153a,
                core: 0xff007f,
                head: 0x0d091e,
                visor: 0x00f0ff,
                thruster: 0x222233,
                light: 0x00f0ff
            }
        },
        {
            id: 'skin_phantom',
            name: 'Cyber Phantom',
            desc: 'Stealth matte black chassis with hot magenta neon core.',
            icon: '🥷',
            price: 500,
            colors: {
                board: 0x08080c,
                rails: 0xff007f,
                torso: 0x121018,
                core: 0xff0055,
                head: 0x08060e,
                visor: 0xff007f,
                thruster: 0x181220,
                light: 0xff007f
            }
        },
        {
            id: 'skin_solar',
            name: 'Solar Flare',
            desc: 'Radiant golden alloy armor with blazing sunburst plasma core.',
            icon: '☀️',
            price: 1000,
            colors: {
                board: 0x281a00,
                rails: 0xffe600,
                torso: 0xb8860b,
                core: 0xff4400,
                head: 0x6e4d00,
                visor: 0xffe600,
                thruster: 0x3d2800,
                light: 0xffaa00
            }
        },
        {
            id: 'skin_matrix',
            name: 'Toxic Matrix',
            desc: 'Overclocked bio-synthetic weave with radioactive emerald glow.',
            icon: '☣️',
            price: 1500,
            colors: {
                board: 0x06150a,
                rails: 0x00ff88,
                torso: 0x0d2e18,
                core: 0x00ff44,
                head: 0x051a0b,
                visor: 0x00ff88,
                thruster: 0x12361b,
                light: 0x00ff88
            }
        },
        {
            id: 'skin_void',
            name: 'Hyper Void',
            desc: 'Extradimensional polished chrome with ultraviolet hyperlight.',
            icon: '🌌',
            price: 2500,
            colors: {
                board: 0x181028,
                rails: 0xb537f2,
                torso: 0xd8d8f0,
                core: 0x00f0ff,
                head: 0xa8a8c8,
                visor: 0xb537f2,
                thruster: 0x281840,
                light: 0xb537f2
            }
        }
    ];

    const TRAILS_CATALOG = [
        {
            id: 'trail_cyan',
            name: 'Cyan Pulse',
            desc: 'Iconic high-frequency cyan ionic jet thruster stream.',
            icon: '🔷',
            price: 0,
            colorHex: 0x00f0ff
        },
        {
            id: 'trail_magenta',
            name: 'Laser Magenta',
            desc: 'Hyper-concentrated photon beam sparks trailing behind.',
            icon: '💖',
            price: 400,
            colorHex: 0xff007f
        },
        {
            id: 'trail_gold',
            name: 'Golden Spark',
            desc: 'Sparkling stardust and golden energy motes.',
            icon: '✨',
            price: 800,
            colorHex: 0xffe600
        },
        {
            id: 'trail_matrix',
            name: 'Matrix Code',
            desc: 'Cascading digital green data stream in your wake.',
            icon: '🟩',
            price: 1200,
            colorHex: 0x00ff88
        },
        {
            id: 'trail_rainbow',
            name: 'Prismatic Flux',
            desc: 'Shifting multi-chromatic spectrum quantum trail.',
            icon: '🌈',
            price: 2000,
            colorHex: 'rainbow'
        }
    ];

    let unlockedSkins = ['skin_striker'];
    let selectedSkin = 'skin_striker';
    let unlockedTrails = ['trail_cyan'];
    let selectedTrail = 'trail_cyan';
    let activeShopTab = 'skins';
    let playerParts = null;
    let thrusterTimer = 0;

    function saveShopStorage() {
        try {
            localStorage.setItem('neonrush_unlocked_skins', JSON.stringify(unlockedSkins));
            localStorage.setItem('neonrush_selected_skin', selectedSkin);
            localStorage.setItem('neonrush_unlocked_trails', JSON.stringify(unlockedTrails));
            localStorage.setItem('neonrush_selected_trail', selectedTrail);
        } catch (e) {
            console.warn('Shop storage save error', e);
        }
    }

    function applySkin(skinId) {
        if (!playerParts) return;
        const skin = SKINS_CATALOG.find(s => s.id === skinId) || SKINS_CATALOG[0];

        playerParts.board.material.color.setHex(skin.colors.board);
        playerParts.leftRail.material.color.setHex(skin.colors.rails);
        playerParts.rightRail.material.color.setHex(skin.colors.rails);
        playerParts.torso.material.color.setHex(skin.colors.torso);
        playerParts.core.material.color.setHex(skin.colors.core);
        playerParts.head.material.color.setHex(skin.colors.head);
        playerParts.visor.material.color.setHex(skin.colors.visor);
        playerParts.tLeft.material.color.setHex(skin.colors.thruster);
        playerParts.tRight.material.color.setHex(skin.colors.thruster);
        playerParts.engineLight.color.setHex(skin.colors.light);
    }

    function emitTrailParticle() {
        if (!playerGroup) return;
        const trail = TRAILS_CATALOG.find(t => t.id === selectedTrail) || TRAILS_CATALOG[0];

        let colorHex = trail.colorHex;
        if (colorHex === 'rainbow') {
            const hue = (performance.now() * 0.002) % 1;
            const c = new THREE.Color().setHSL(hue, 1.0, 0.5);
            colorHex = c.getHex();
        }

        const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const pMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });

        [-0.25, 0.25].forEach(offset => {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(
                playerGroup.position.x + offset,
                playerGroup.position.y + 0.9,
                playerGroup.position.z + 0.6
            );
            p.userData = {
                velX: (Math.random() - 0.5) * 1.5,
                velY: (Math.random() - 0.3) * 2.0,
                velZ: Math.random() * 5 + 10,
                life: 0.5
            };
            scene.add(p);
            particles.push(p);
        });
    }

    function renderShopUI() {
        const container = document.getElementById('shop-items-container');
        const balanceEl = document.getElementById('shop-total-coins');
        if (balanceEl) balanceEl.innerText = totalCoins.toLocaleString();
        if (!container) return;
        container.innerHTML = '';

        const isSkins = (activeShopTab === 'skins');
        const catalog = isSkins ? SKINS_CATALOG : TRAILS_CATALOG;
        const unlockedList = isSkins ? unlockedSkins : unlockedTrails;
        const currentEquipped = isSkins ? selectedSkin : selectedTrail;

        catalog.forEach(item => {
            const isUnlocked = unlockedList.includes(item.id);
            const isEquipped = (currentEquipped === item.id);

            const card = document.createElement('div');
            card.className = `shop-item-card ${isEquipped ? 'equipped' : (isUnlocked ? 'owned' : '')}`;

            let swatchColor = '#00f0ff';
            if (isSkins) {
                swatchColor = '#' + item.colors.visor.toString(16).padStart(6, '0');
            } else {
                swatchColor = (item.colorHex === 'rainbow') ? 'linear-gradient(45deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)' : '#' + item.colorHex.toString(16).padStart(6, '0');
            }

            let actionBtnHtml = '';
            if (isEquipped) {
                actionBtnHtml = `<span class="shop-equipped-badge">✓ EQUIPPED</span>`;
            } else if (isUnlocked) {
                actionBtnHtml = `<button class="btn-shop-equip" data-type="${isSkins ? 'skin' : 'trail'}" data-id="${item.id}">EQUIP</button>`;
            } else {
                actionBtnHtml = `<button class="btn-shop-buy" data-type="${isSkins ? 'skin' : 'trail'}" data-id="${item.id}">BUY ${item.price} 🟡</button>`;
            }

            const swatchStyle = (isSkins || item.colorHex !== 'rainbow') 
                ? `background-color: ${swatchColor}; box-shadow: 0 0 10px ${swatchColor};` 
                : `background: ${swatchColor};`;

            card.innerHTML = `
                <div class="shop-item-icon-box" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);">
                    <div class="shop-item-swatch" style="${swatchStyle}"></div>
                </div>
                <div class="shop-item-info">
                    <div class="shop-item-title-row">
                        <span style="font-size: 16px;">${item.icon}</span>
                        <span class="shop-item-name">${item.name}</span>
                    </div>
                    <span class="shop-item-desc">${item.desc}</span>
                </div>
                <div class="shop-item-action">
                    ${actionBtnHtml}
                </div>
            `;

            container.appendChild(card);
        });

        // Attach buy/equip listeners
        container.querySelectorAll('.btn-shop-buy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                buyShopItem(btn.getAttribute('data-type'), btn.getAttribute('data-id'));
            });
        });

        container.querySelectorAll('.btn-shop-equip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                equipShopItem(btn.getAttribute('data-type'), btn.getAttribute('data-id'));
            });
        });
    }

    function buyShopItem(type, id) {
        const isSkins = (type === 'skin');
        const catalog = isSkins ? SKINS_CATALOG : TRAILS_CATALOG;
        const item = catalog.find(i => i.id === id);
        if (!item) return;

        if (totalCoins >= item.price) {
            totalCoins -= item.price;
            if (isSkins) {
                unlockedSkins.push(item.id);
                selectedSkin = item.id;
                applySkin(selectedSkin);
            } else {
                unlockedTrails.push(item.id);
                selectedTrail = item.id;
            }
            saveStorage();
            saveShopStorage();
            window.soundManager.playPurchase();
            updateMenuStats();
            renderShopUI();
        } else {
            window.soundManager.playError();
            const msgEl = document.getElementById('shop-message');
            if (msgEl) {
                msgEl.innerText = `NOT ENOUGH COINS! NEED ${item.price - totalCoins} MORE COINS.`;
                msgEl.style.display = 'block';
                setTimeout(() => { msgEl.style.display = 'none'; }, 2600);
            }
        }
    }

    function equipShopItem(type, id) {
        const isSkins = (type === 'skin');
        if (isSkins) {
            selectedSkin = id;
            applySkin(selectedSkin);
        } else {
            selectedTrail = id;
        }
        saveShopStorage();
        window.soundManager.playEquip();
        renderShopUI();
    }

    // --- Local All-Time Leaderboard System ---
    const DEFAULT_LEADERBOARD = [
        { name: 'CYBER_ACE', score: 25000, distance: 1650, date: '2026-10-24' },
        { name: 'NEON_GHOST', score: 18500, distance: 1220, date: '2026-10-25' },
        { name: 'GLITCH_X', score: 12000, distance: 880, date: '2026-10-25' },
        { name: 'PHANTOM_7', score: 8200, distance: 640, date: '2026-10-26' },
        { name: 'ZERO_COOL', score: 5000, distance: 410, date: '2026-10-26' }
    ];

    let leaderboard = [];
    let pendingLeaderboardEntry = null;
    let lastEnteredName = '';

    function initLeaderboard() {
        try {
            const saved = localStorage.getItem('neonrush_leaderboard');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    leaderboard = parsed;
                }
            }
            if (leaderboard.length === 0) {
                leaderboard = JSON.parse(JSON.stringify(DEFAULT_LEADERBOARD));
                saveLeaderboard();
            }
            lastEnteredName = localStorage.getItem('neonrush_player_name') || 'CYBER_ACE';
        } catch (e) {
            console.warn('Leaderboard load error', e);
            leaderboard = JSON.parse(JSON.stringify(DEFAULT_LEADERBOARD));
        }

        // Sort descending and ensure top 5 entries
        leaderboard.sort((a, b) => b.score - a.score);
        if (leaderboard.length > 5) {
            leaderboard = leaderboard.slice(0, 5);
        }
    }

    function saveLeaderboard() {
        try {
            localStorage.setItem('neonrush_leaderboard', JSON.stringify(leaderboard));
        } catch (e) {
            console.warn('Leaderboard save error', e);
        }
    }

    function isLeaderboardQualifying(finalScore) {
        if (!finalScore || finalScore <= 0) return false;
        if (leaderboard.length < 5) return true;
        return finalScore > leaderboard[leaderboard.length - 1].score;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, (m) => {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    function renderLeaderboardUI() {
        const container = document.getElementById('leaderboard-rows');
        if (!container) return;
        container.innerHTML = '';

        leaderboard.slice(0, 5).forEach((entry, idx) => {
            const rank = idx + 1;
            const row = document.createElement('div');
            row.className = `leaderboard-row rank-${rank}`;

            const rankMedal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `#${rank}`));

            row.innerHTML = `
                <div class="leaderboard-left">
                    <div class="leaderboard-rank-badge">${rank <= 3 ? rankMedal : '#' + rank}</div>
                    <div class="leaderboard-player-meta">
                        <span class="leaderboard-name">${escapeHtml(entry.name || 'RUNNER')}</span>
                        <span class="leaderboard-date">${entry.date || getTodayString()}</span>
                    </div>
                </div>
                <div class="leaderboard-score-meta">
                    <span class="leaderboard-score-val">${entry.score.toLocaleString()}</span>
                    <span class="leaderboard-dist-val">${Math.floor(entry.distance || 0).toLocaleString()} m</span>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function submitScoreToLeaderboard() {
        if (!pendingLeaderboardEntry) return;

        const input = document.getElementById('player-name-input');
        let callSign = (input ? input.value : '').trim().toUpperCase();
        callSign = callSign.replace(/[^A-Z0-9_]/g, '');
        if (!callSign) {
            callSign = 'CYBER_ACE';
        }
        if (callSign.length > 10) {
            callSign = callSign.substring(0, 10);
        }

        lastEnteredName = callSign;
        try {
            localStorage.setItem('neonrush_player_name', callSign);
        } catch (e) {}

        const newEntry = {
            name: callSign,
            score: pendingLeaderboardEntry.score,
            distance: pendingLeaderboardEntry.distance,
            date: pendingLeaderboardEntry.date || getTodayString()
        };

        leaderboard.push(newEntry);
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 5);
        saveLeaderboard();

        pendingLeaderboardEntry = null;
        window.soundManager.playMissionComplete();
        renderLeaderboardUI();
        showScreen('leaderboard-screen');
    }

    // Initialize 3D Engine
    function initThree() {
        const container = document.getElementById('canvas-container');

        // Scene & Fog
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x080416);
        scene.fog = new THREE.FogExp2(0x080416, 0.012);

        // Pre-allocate Atmosphere Target Colors for 60fps performance
        targetFogColor = new THREE.Color(0x080416);
        targetAmbientColor = new THREE.Color(0x351d5a);
        targetDirColor = new THREE.Color(0x00f0ff);
        targetBackColor = new THREE.Color(0xff007f);
        targetSkyColor = new THREE.Color(SPEED_TIERS[0].skyColor);

        // Camera (Third person perspective behind and above player)
        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 350);
        camera.position.set(0, 4.2, 7.5);
        camera.lookAt(0, 1.2, -8);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Dynamic 3D Environment Lighting
        ambientLight = new THREE.AmbientLight(0x351d5a, 0.85);
        scene.add(ambientLight);

        dirLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
        dirLight.position.set(0, 20, 10);
        scene.add(dirLight);

        backLight = new THREE.DirectionalLight(0xff007f, 0.6);
        backLight.position.set(0, 5, -30);
        scene.add(backLight);

        // Build Environment
        createPlayer();
        createTrack();
        createCitySkyline();
        createSkybox();
        setupEvents();

        loadStorage();
        initBatteryMonitor();
        initWarpCanvas();
        animate();
    }

    // 3D Player Character (Futuristic Cyberpunk Runner)
    function createPlayer() {
        playerGroup = new THREE.Group();

        // Cyber Sled / Hoverboard
        const boardGeo = new THREE.BoxGeometry(1.4, 0.18, 2.2);
        const boardMat = new THREE.MeshStandardMaterial({
            color: 0x111122,
            metalness: 0.8,
            roughness: 0.2
        });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.y = 0.12;
        playerGroup.add(board);

        // Board Neon Rails (Glowing cyan stripes)
        const railGeo = new THREE.BoxGeometry(0.08, 0.1, 2.22);
        const railMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.set(-0.7, 0.14, 0);
        const rightRail = new THREE.Mesh(railGeo, railMat);
        rightRail.position.set(0.7, 0.14, 0);
        playerGroup.add(leftRail);
        playerGroup.add(rightRail);

        // Runner Torso
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.1, 0.5);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x1a153a,
            roughness: 0.3,
            metalness: 0.5
        });
        playerMesh = new THREE.Mesh(bodyGeo, bodyMat);
        playerMesh.position.y = 1.0;
        playerGroup.add(playerMesh);

        // Neon Cyber Vest / Core (glowing chest heart)
        const coreGeo = new THREE.BoxGeometry(0.35, 0.35, 0.1);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, 1.1, -0.26);
        playerGroup.add(core);

        // Runner Head / Helmet
        const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x0d091e, roughness: 0.2 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.85;
        playerGroup.add(head);

        // Glowing Visor
        const visorGeo = new THREE.BoxGeometry(0.48, 0.18, 0.1);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.85, -0.28);
        playerGroup.add(visor);

        // Jetpack / Thrusters
        const thrusterGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 8);
        const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
        const tLeft = new THREE.Mesh(thrusterGeo, thrusterMat);
        tLeft.position.set(-0.25, 1.1, 0.32);
        const tRight = new THREE.Mesh(thrusterGeo, thrusterMat);
        tRight.position.set(0.25, 1.1, 0.32);
        playerGroup.add(tLeft);
        playerGroup.add(tRight);

        // Dynamic Thruster Light
        engineLight = new THREE.PointLight(0x00f0ff, 2.0, 8);
        engineLight.position.set(0, 0.6, 0.5);
        playerGroup.add(engineLight);

        // Shield Mesh (Hidden by default)
        const shieldGeo = new THREE.SphereGeometry(1.6, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            wireframe: true,
            transparent: true,
            opacity: 0.4
        });
        shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.y = 1.0;
        shieldMesh.visible = false;
        playerGroup.add(shieldMesh);

        playerParts = {
            board: board,
            leftRail: leftRail,
            rightRail: rightRail,
            torso: playerMesh,
            core: core,
            head: head,
            visor: visor,
            tLeft: tLeft,
            tRight: tRight,
            engineLight: engineLight
        };
        applySkin(selectedSkin);

        playerGroup.position.set(targetX, 0, 0);
        scene.add(playerGroup);
    }

    // Infinite 3-Lane Track Segments
    function createTrack() {
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            const segment = createTrackSegment(-i * SEGMENT_LENGTH);
            trackSegments.push(segment);
            scene.add(segment);
        }
    }

    function createTrackSegment(zPos) {
        const segment = new THREE.Group();
        segment.position.z = zPos;

        // Road Surface
        const roadWidth = 11.5;
        const roadGeo = new THREE.PlaneGeometry(roadWidth, SEGMENT_LENGTH);
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x0c071d,
            roughness: 0.6,
            metalness: 0.4
        });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        segment.add(road);

        // Lane Dividers (Dashed glowing lines)
        const dividerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const numDashes = 10;
        const dashLength = 3.5;
        const dashGap = 2.5;

        [-1.6, 1.6].forEach(x => {
            for (let j = 0; j < numDashes; j++) {
                const dashGeo = new THREE.PlaneGeometry(0.12, dashLength);
                const dash = new THREE.Mesh(dashGeo, dividerMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(x, 0.02, -j * (dashLength + dashGap) + SEGMENT_LENGTH / 2 - dashLength);
                segment.add(dash);
            }
        });

        // Glowing Side Rails (Left & Right)
        const railGeo = new THREE.BoxGeometry(0.3, 0.4, SEGMENT_LENGTH);
        const railMat = new THREE.MeshBasicMaterial({ color: 0xff007f });

        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.set(-roadWidth / 2, 0.2, 0);
        segment.add(leftRail);

        const rightRail = new THREE.Mesh(railGeo, railMat);
        rightRail.position.set(roadWidth / 2, 0.2, 0);
        segment.add(rightRail);

        // Neon Glow Strip along ground edge
        const stripGeo = new THREE.PlaneGeometry(0.25, SEGMENT_LENGTH);
        const stripMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

        const leftStrip = new THREE.Mesh(stripGeo, stripMat);
        leftStrip.rotation.x = -Math.PI / 2;
        leftStrip.position.set(-roadWidth / 2 + 0.3, 0.02, 0);
        segment.add(leftStrip);

        const rightStrip = new THREE.Mesh(stripGeo, stripMat);
        rightStrip.rotation.x = -Math.PI / 2;
        rightStrip.position.set(roadWidth / 2 - 0.3, 0.02, 0);
        segment.add(rightStrip);

        return segment;
    }

    // Cyberpunk Horizon Cityscape (Lightweight procedural buildings)
    function createCitySkyline() {
        skylineBuildingMat = new THREE.MeshBasicMaterial({ color: 0x140832, wireframe: true });
        skylineWindowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

        for (let i = 0; i < 30; i++) {
            const side = (i % 2 === 0) ? -1 : 1;
            const x = side * (18 + Math.random() * 25);
            const z = -Math.random() * 280;
            const height = 15 + Math.random() * 35;
            const width = 6 + Math.random() * 8;

            const bGeo = new THREE.BoxGeometry(width, height, width);
            const building = new THREE.Mesh(bGeo, skylineBuildingMat);
            building.position.set(x, height / 2 - 2, z);
            scene.add(building);
            buildings.push(building);

            // Glowing rooftop beacon
            const beaconGeo = new THREE.SphereGeometry(0.6, 6, 6);
            const beaconMat = new THREE.MeshBasicMaterial({ color: (i % 3 === 0) ? 0xff007f : 0x00f0ff });
            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.set(x, height - 1.5, z);
            scene.add(beacon);
            buildings.push(beacon);
        }
    }

    // ==========================================
    // PROCEDURAL DYNAMIC NEON SKYBOX
    // ==========================================
    function generateProceduralSkyGridTexture() {
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Deep Cyberspace Background Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, size);
        bgGrad.addColorStop(0, '#030108');
        bgGrad.addColorStop(0.3, '#0b041a');
        bgGrad.addColorStop(0.5, '#16082e');
        bgGrad.addColorStop(0.7, '#0b041a');
        bgGrad.addColorStop(1, '#030108');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        // Distant Cyber Data Stars & Celestial Nexus Points
        let seed = 42;
        function rnd() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        }

        const numStars = 180;
        for (let i = 0; i < numStars; i++) {
            const sx = rnd() * size;
            const sy = rnd() * size;
            const sRadius = 0.5 + rnd() * 1.5;
            const sAlpha = 0.25 + rnd() * 0.7;
            const isCyan = rnd() > 0.4;

            ctx.beginPath();
            ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
            ctx.fillStyle = isCyan ? `rgba(0, 240, 255, ${sAlpha})` : `rgba(255, 68, 204, ${sAlpha})`;
            ctx.fill();

            if (sRadius > 1.2) {
                ctx.beginPath();
                ctx.arc(sx, sy, sRadius * 2.8, 0, Math.PI * 2);
                ctx.fillStyle = isCyan ? `rgba(0, 240, 255, ${sAlpha * 0.25})` : `rgba(255, 68, 204, ${sAlpha * 0.25})`;
                ctx.fill();
            }
        }

        // Minor Neon Grid (Dense 32x32 subdivisions, fine 1px cyber lines)
        const minorStep = size / 32;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
        ctx.beginPath();
        for (let i = 0; i <= size; i += minorStep) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
        }
        ctx.stroke();

        // Major Neon Grid (8x8 divisions with high-voltage glowing halo)
        const majorStep = size / 8;

        // Outer glow pass for major grid lines
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
        ctx.beginPath();
        for (let i = 0; i <= size; i += majorStep) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
        }
        ctx.stroke();

        // Inner luminous core for major grid lines
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        for (let i = 0; i <= size; i += majorStep) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
        }
        ctx.stroke();

        // High-Voltage Intersection Nodes (Glowing cyber nexus points)
        for (let x = 0; x <= size; x += majorStep) {
            for (let y = 0; y <= size; y += majorStep) {
                // Radial glow
                const glowGrad = ctx.createRadialGradient(x, y, 1, x, y, 14);
                glowGrad.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
                glowGrad.addColorStop(0.4, 'rgba(255, 0, 128, 0.4)');
                glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(x, y, 14, 0, Math.PI * 2);
                ctx.fill();

                // Bright diamond node core
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(x, y - 4);
                ctx.lineTo(x + 4, y);
                ctx.lineTo(x, y + 4);
                ctx.lineTo(x - 4, y);
                ctx.closePath();
                ctx.fill();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 4);
        texture.needsUpdate = true;
        return texture;
    }

    function createSkybox() {
        skyGridTexture = generateProceduralSkyGridTexture();

        // Celestial sphere enclosing the entire cyberpunk world
        const skyGeo = new THREE.SphereGeometry(265, 36, 26);
        skyboxMat = new THREE.MeshBasicMaterial({
            map: skyGridTexture,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.92,
            fog: false, // Prevents FogExp2 from washing out crisp neon lines
            depthWrite: false
        });

        skyboxMesh = new THREE.Mesh(skyGeo, skyboxMat);
        skyboxMesh.position.copy(camera.position);
        scene.add(skyboxMesh);
    }

    function updateSkybox(dt) {
        if (!skyboxMesh || !skyboxMat || !skyGridTexture) return;

        // Position skybox seamlessly centered on camera so it forms an infinite cosmic dome
        if (camera) {
            skyboxMesh.position.copy(camera.position);
        }

        const currentTier = SPEED_TIERS[currentSpeedTierIndex] || SPEED_TIERS[0];

        // Smoothly interpolate multi-axis rotation speeds and UV scroll rate toward active tier targets
        const lerpRate = Math.min(1.0, 3.0 * dt);
        currentSkyRotY += (currentTier.skyRotSpeedY - currentSkyRotY) * lerpRate;
        currentSkyRotX += (currentTier.skyRotSpeedX - currentSkyRotX) * lerpRate;
        currentSkyRotZ += (currentTier.skyRotSpeedZ - currentSkyRotZ) * lerpRate;
        currentSkyScroll += (currentTier.skyScrollSpeed - currentSkyScroll) * lerpRate;

        // Multi-axis rotation (yaw drift, pitch oscillation, and roll)
        skyboxMesh.rotation.y += currentSkyRotY * dt;
        skyboxMesh.rotation.x += currentSkyRotX * dt;
        skyboxMesh.rotation.z += currentSkyRotZ * dt;

        // UV offset scrolling: forward stream driven by current player speed relative to base speed
        const speedRatio = (currentState === STATE.PLAYING) ? Math.max(1.0, currentSpeed / BASE_SPEED) : 0.6;
        skyGridTexture.offset.y = (skyGridTexture.offset.y + currentSkyScroll * speedRatio * dt) % 1.0;
        skyGridTexture.offset.x = (skyGridTexture.offset.x + currentSkyRotY * 0.12 * dt) % 1.0;

        // Dynamic color tinting to match the current speed tier atmosphere
        if (targetSkyColor) {
            targetSkyColor.setHex(currentTier.skyColor);
            skyboxMat.color.lerp(targetSkyColor, Math.min(1.0, 3.5 * dt));
        }

        // Atmosphere flash boosts skybox luminescence during tier transitions
        skyboxMat.opacity = Math.min(1.0, 0.92 + (atmosphereFlashIntensity * 0.08));
    }

    // ==========================================
    // ADDITIVE SCREEN-SPACE NEON WARP TRANSITION
    // ==========================================
    let warpCanvas = null;
    let warpCtx = null;
    let warpActive = false;
    let warpTimer = 0;
    const WARP_DURATION = 1.35;
    let warpColor = '#00f0ff';
    let warpRgb = { r: 0, g: 240, b: 255 };
    let warpParticles = [];
    let warpRings = [];
    let warpSparks = [];

    function hexToRgb(hex) {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(c => c + c).join('');
        }
        const num = parseInt(cleanHex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function initWarpCanvas() {
        warpCanvas = document.getElementById('warp-canvas');
        if (warpCanvas) {
            warpCtx = warpCanvas.getContext('2d', { alpha: true });
            resizeWarpCanvas();
        }
    }

    function resizeWarpCanvas() {
        if (!warpCanvas || !warpCtx) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        warpCanvas.width = window.innerWidth * dpr;
        warpCanvas.height = window.innerHeight * dpr;
        warpCanvas.style.width = window.innerWidth + 'px';
        warpCanvas.style.height = window.innerHeight + 'px';
    }

    function triggerWarpTransition(tier) {
        if (!warpCanvas || !warpCtx) {
            initWarpCanvas();
            if (!warpCanvas || !warpCtx) return;
        }

        warpActive = true;
        warpTimer = 0;
        warpColor = (tier && tier.color) ? tier.color : '#00f0ff';
        warpRgb = hexToRgb(warpColor);

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = warpCanvas.width;
        const h = warpCanvas.height;

        // Vanishing focal point matching road perspective horizon
        const cx = w * 0.5;
        const cy = h * 0.44;

        // 1. Generate 140 Additive Warp Laser Streaks
        warpParticles = [];
        const numStreaks = 140;
        for (let i = 0; i < numStreaks; i++) {
            const angle = Math.random() * Math.PI * 2;
            const initialDist = 15 + Math.random() * 90 * dpr;
            const speed = (950 + Math.random() * 2200) * dpr;
            const lengthScale = 0.45 + Math.random() * 0.8;
            const width = (1.2 + Math.random() * 2.8) * dpr;
            const delay = Math.random() * 0.22; // subtle staggered burst
            warpParticles.push({
                angle: angle,
                dist: initialDist,
                speed: speed,
                lengthScale: lengthScale,
                width: width,
                delay: delay
            });
        }

        // 2. Generate Concentric Shockwave Blast Rings
        warpRings = [
            { radius: 20 * dpr, speed: 1800 * dpr, delay: 0, maxRadius: Math.hypot(w, h) * 0.65 },
            { radius: 10 * dpr, speed: 1400 * dpr, delay: 0.12, maxRadius: Math.hypot(w, h) * 0.55 }
        ];

        // 3. Generate Floating Quantum Sparkles
        warpSparks = [];
        const numSparks = 45;
        for (let j = 0; j < numSparks; j++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 150 * dpr;
            const speed = (400 + Math.random() * 1200) * dpr;
            const size = (1.5 + Math.random() * 3.5) * dpr;
            warpSparks.push({
                angle: angle,
                dist: dist,
                speed: speed,
                size: size,
                alpha: 0.8 + Math.random() * 0.2
            });
        }
    }

    function updateWarpEffect(dt) {
        if (!warpActive || !warpCanvas || !warpCtx) return;

        warpTimer += dt;
        const progress = warpTimer / WARP_DURATION;

        const w = warpCanvas.width;
        const h = warpCanvas.height;
        const cx = w * 0.5;
        const cy = h * 0.44;

        // Clear canvas
        warpCtx.clearRect(0, 0, w, h);

        if (progress >= 1.0) {
            warpActive = false;
            return;
        }

        // Hardware Additive Blending Mode for Electric Neon Warp Energy
        warpCtx.save();
        warpCtx.globalCompositeOperation = 'lighter';

        // Overall intensity curve: fast punchy ramp-up, smooth exponential decay
        const intensity = Math.sin(Math.min(1.0, progress * 2.5) * Math.PI * 0.5) * Math.pow(1.0 - progress, 1.4);
        const { r, g, b } = warpRgb;

        // 1. Central Warp Horizon Core Bloom
        const coreRadius = Math.max(25, Math.min(w, h) * 0.26 * (1.0 + progress * 0.5));
        const coreGrad = warpCtx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
        coreGrad.addColorStop(0.0, `rgba(255, 255, 255, ${0.85 * intensity})`);
        coreGrad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${0.65 * intensity})`);
        coreGrad.addColorStop(0.70, `rgba(${r}, ${g}, ${b}, ${0.15 * intensity})`);
        coreGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        warpCtx.fillStyle = coreGrad;
        warpCtx.beginPath();
        warpCtx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        warpCtx.fill();

        // 2. Render & Update Warp Laser Streaks
        for (let i = 0; i < warpParticles.length; i++) {
            const p = warpParticles[i];
            if (warpTimer < p.delay) continue;

            const localDt = dt;
            // Accelerate as distance from horizon expands
            p.dist += (p.speed + (p.dist * 3.2)) * localDt;

            // Tail length elongates dynamically with radial distance
            const streakLength = Math.min(320, 25 + p.dist * 0.45 * p.lengthScale);
            const rInner = Math.max(10, p.dist - streakLength);
            const rOuter = p.dist;

            const cosA = Math.cos(p.angle);
            const sinA = Math.sin(p.angle);

            const x1 = cx + cosA * rInner;
            const y1 = cy + sinA * rInner;
            const x2 = cx + cosA * rOuter;
            const y2 = cy + sinA * rOuter;

            // Fade based on edge proximity and overall warp intensity
            const streakAlpha = Math.max(0, Math.min(1.0, (1.0 - progress) * 1.25));

            const grad = warpCtx.createLinearGradient(x1, y1, x2, y2);
            grad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, 0)`);
            grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${0.75 * streakAlpha})`);
            grad.addColorStop(1.0, `rgba(255, 255, 255, ${0.98 * streakAlpha})`);

            warpCtx.strokeStyle = grad;
            warpCtx.lineWidth = p.width;
            warpCtx.lineCap = 'round';
            warpCtx.beginPath();
            warpCtx.moveTo(x1, y1);
            warpCtx.lineTo(x2, y2);
            warpCtx.stroke();
        }

        // 3. Render Concentric Shockwave Rings
        for (let k = 0; k < warpRings.length; k++) {
            const ring = warpRings[k];
            if (warpTimer < ring.delay) continue;

            ring.radius += ring.speed * dt;
            if (ring.radius > ring.maxRadius) continue;

            const ringProgress = ring.radius / ring.maxRadius;
            const ringAlpha = Math.max(0, (1.0 - ringProgress) * 0.75 * intensity);

            warpCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${ringAlpha})`;
            warpCtx.lineWidth = Math.max(1, (1.0 - ringProgress) * 5);
            warpCtx.beginPath();
            warpCtx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
            warpCtx.stroke();
        }

        // 4. Render Quantum Sparkles
        for (let s = 0; s < warpSparks.length; s++) {
            const sp = warpSparks[s];
            sp.dist += sp.speed * dt;
            const sx = cx + Math.cos(sp.angle) * sp.dist;
            const sy = cy + Math.sin(sp.angle) * sp.dist;

            const sparkAlpha = Math.max(0, sp.alpha * (1.0 - progress));
            warpCtx.fillStyle = `rgba(255, 255, 255, ${sparkAlpha})`;
            warpCtx.beginPath();
            warpCtx.arc(sx, sy, sp.size, 0, Math.PI * 2);
            warpCtx.fill();

            // Glow halo around spark
            warpCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${sparkAlpha * 0.4})`;
            warpCtx.beginPath();
            warpCtx.arc(sx, sy, sp.size * 2.2, 0, Math.PI * 2);
            warpCtx.fill();
        }

        warpCtx.restore();
    }

    // Dynamic Speed Tier Alert Notification & Atmosphere Surge
    function triggerSpeedTierNotification(tier) {
        if (!tier) return;
        if (window.soundManager && window.soundManager.playSpeedTierUp) {
            window.soundManager.playSpeedTierUp();
        }
        cameraShake = 0.28;
        atmosphereFlashIntensity = 0.85; // Dramatic atmospheric light burst on speed surge

        // Additive Screen-Space Neon Warp Particle Transition
        triggerWarpTransition(tier);

        const banner = document.getElementById('hud-speed-surge');
        const nameEl = document.getElementById('hud-surge-tier-name');
        if (banner && nameEl) {
            nameEl.innerText = tier.name;
            banner.style.borderColor = tier.color;
            banner.style.boxShadow = `0 0 25px ${tier.color}`;
            banner.classList.add('show');
            if (speedSurgeTimeout) clearTimeout(speedSurgeTimeout);
            speedSurgeTimeout = setTimeout(() => {
                banner.classList.remove('show');
            }, 1800);
        }
    }

    // Procedural Obstacle & Item Spawning with Dynamic Difficulty
    let nextSpawnZ = -45;

    function spawnGameElements() {
        while (nextSpawnZ > -270) {
            // Difficulty ratio: 0.0 at start up to 1.0 at ~1300m
            const diffRatio = Math.min(1.0, distance / 1300);

            // Dynamic Spacing: decreases from ~48m down to 21m as distance & speed increase
            const baseSpacing = 48 - (diffRatio * 24);
            const speedCompression = (currentSpeed - BASE_SPEED) * 0.16;
            const spacing = Math.max(19, baseSpacing - speedCompression - (Math.random() * 3));

            const rand = Math.random();

            if (distance < 130) {
                // Tier 1 Early Game: wide spacing, single lane obstacles, teaching mechanics
                if (rand < 0.60) {
                    spawnSingleObstacle(nextSpawnZ);
                    spawnCoinRow(nextSpawnZ - 10);
                } else if (rand < 0.78) {
                    spawnDoubleObstacle(nextSpawnZ);
                } else if (rand < 0.89) {
                    spawnJumpHurdle(nextSpawnZ);
                    spawnJumpCoins(nextSpawnZ);
                } else {
                    spawnSlideBarrier(nextSpawnZ);
                    spawnSlideCoins(nextSpawnZ);
                }
            } else if (distance < 450) {
                // Tier 2 Mid Game: higher frequency of double obstacles and lane switches
                if (rand < 0.35) {
                    spawnSingleObstacle(nextSpawnZ);
                    spawnCoinRow(nextSpawnZ - 8);
                } else if (rand < 0.68) {
                    spawnDoubleObstacle(nextSpawnZ);
                } else if (rand < 0.84) {
                    spawnSlideBarrier(nextSpawnZ);
                    spawnSlideCoins(nextSpawnZ);
                } else {
                    spawnJumpHurdle(nextSpawnZ);
                    spawnJumpCoins(nextSpawnZ);
                }
            } else {
                // Tier 3+ High Speed / Overdrive: rapid obstacle sequences and dynamic combos
                if (rand < 0.18) {
                    spawnSingleObstacle(nextSpawnZ);
                    spawnCoinRow(nextSpawnZ - 6);
                } else if (rand < 0.48) {
                    spawnDoubleObstacle(nextSpawnZ);
                } else if (rand < 0.68) {
                    spawnSlideBarrier(nextSpawnZ);
                    spawnSlideCoins(nextSpawnZ);
                } else if (rand < 0.82) {
                    spawnJumpHurdle(nextSpawnZ);
                    spawnJumpCoins(nextSpawnZ);
                } else {
                    // High thrill combos!
                    if (Math.random() < 0.5) {
                        spawnZigZagCombo(nextSpawnZ);
                    } else {
                        spawnJumpSlideCombo(nextSpawnZ);
                    }
                }
            }

            // Chance for Power-up (scales up slightly at higher speeds to allow clutch recoveries)
            const powerupChance = 0.20 + (diffRatio * 0.12);
            if (Math.random() < powerupChance) {
                spawnRandomPowerup(nextSpawnZ - 14);
            }

            nextSpawnZ -= spacing;
        }
    }

    // Obstacle 1: Neon Monolith (Blocks entire lane, dodge left/right)
    function spawnSingleObstacle(z) {
        const laneIdx = Math.floor(Math.random() * 3);
        createMonolith(LANES[laneIdx], z);
    }

    function createMonolith(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const geo = new THREE.BoxGeometry(1.9, 3.2, 1.2);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x1d0f36,
            roughness: 0.3,
            metalness: 0.7
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 1.6;
        group.add(mesh);

        // Glowing Warning Edge
        const edgeGeo = new THREE.BoxGeometry(2.0, 0.2, 1.3);
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const topEdge = new THREE.Mesh(edgeGeo, edgeMat);
        topEdge.position.y = 3.2;
        group.add(topEdge);

        const coreGeo = new THREE.BoxGeometry(1.2, 2.2, 0.1);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const coreFront = new THREE.Mesh(coreGeo, coreMat);
        coreFront.position.set(0, 1.6, 0.62);
        group.add(coreFront);

        group.userData = {
            type: 'MONOLITH',
            x: x,
            width: 1.8,
            minY: 0,
            maxY: 3.5
        };

        scene.add(group);
        obstacles.push(group);
    }

    // Obstacle 2: Double Monolith (Leaves 1 free lane)
    function spawnDoubleObstacle(z) {
        const freeLane = Math.floor(Math.random() * 3);
        for (let i = 0; i < 3; i++) {
            if (i !== freeLane) {
                createMonolith(LANES[i], z);
            }
        }
        // Spawn guiding coins in the safe lane!
        for (let c = 0; c < 3; c++) {
            createCoin(LANES[freeLane], 0.8, z - c * 3.5);
        }
    }

    // Obstacle 3: High Laser Barrier (Slide under!)
    function spawnSlideBarrier(z) {
        const laneIdx = Math.floor(Math.random() * 3);
        createSlideBarrierAt(LANES[laneIdx], z);
    }

    function createSlideBarrierAt(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Side Pillars
        const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.6, 8);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333344 });
        const pLeft = new THREE.Mesh(pillarGeo, pillarMat);
        pLeft.position.set(-1.1, 1.8, 0);
        const pRight = new THREE.Mesh(pillarGeo, pillarMat);
        pRight.position.set(1.1, 1.8, 0);
        group.add(pLeft);
        group.add(pRight);

        // High Laser Beam (Y = 1.4 to 3.0)
        const beamGeo = new THREE.BoxGeometry(2.3, 1.2, 0.3);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xff0055,
            transparent: true,
            opacity: 0.85
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 2.1;
        group.add(beam);

        // Warning Sign
        const signGeo = new THREE.PlaneGeometry(1.6, 0.4);
        const signMat = new THREE.MeshBasicMaterial({ color: 0xffe600 });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 2.9, 0.2);
        group.add(sign);

        group.userData = {
            type: 'HIGH_BARRIER',
            x: x,
            width: 2.2,
            minY: 1.2, // Can duck under if Y <= 1.2 and sliding!
            maxY: 3.2
        };

        scene.add(group);
        obstacles.push(group);
    }

    // Obstacle 4: Low Cyber Hurdle / Spikes (Jump over!)
    function spawnJumpHurdle(z) {
        const laneIdx = Math.floor(Math.random() * 3);
        createHurdleAt(LANES[laneIdx], z);
    }

    function createHurdleAt(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Low Energy Bar
        const barGeo = new THREE.BoxGeometry(2.2, 0.7, 0.5);
        const barMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.y = 0.35;
        group.add(bar);

        // Base stands
        const baseGeo = new THREE.BoxGeometry(0.3, 0.8, 0.6);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
        const bLeft = new THREE.Mesh(baseGeo, baseMat);
        bLeft.position.set(-1.0, 0.4, 0);
        const bRight = new THREE.Mesh(baseGeo, baseMat);
        bRight.position.set(1.0, 0.4, 0);
        group.add(bLeft);
        group.add(bRight);

        group.userData = {
            type: 'LOW_HURDLE',
            x: x,
            width: 2.0,
            minY: 0,
            maxY: 0.9 // Can jump over if player Y > 0.9!
        };

        scene.add(group);
        obstacles.push(group);
    }

    // Dynamic High-Speed Combo 1: Zig-Zag Weave
    function spawnZigZagCombo(z) {
        const startLane = (Math.random() < 0.5) ? 0 : 2;
        const otherLane = (startLane === 0) ? 2 : 0;
        createMonolith(LANES[startLane], z);
        createMonolith(LANES[1], z - 13);
        createMonolith(LANES[otherLane], z - 26);
        createCoin(LANES[1], 0.8, z);
        createCoin(LANES[startLane], 0.8, z - 13);
        createCoin(LANES[1], 0.8, z - 26);
    }

    // Dynamic High-Speed Combo 2: Jump-then-Slide Rapid Combo
    function spawnJumpSlideCombo(z) {
        const laneIdx = Math.floor(Math.random() * 3);
        const otherIdx = (laneIdx + 1) % 3;
        createHurdleAt(LANES[laneIdx], z);
        createCoin(LANES[laneIdx], 2.2, z);
        createSlideBarrierAt(LANES[otherIdx], z - 14);
        createCoin(LANES[otherIdx], 0.4, z - 14);
    }

    // Collectible Neon Coins
    function createCoin(x, y, z) {
        const coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12);
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffe600,
            emissive: 0xffa600,
            emissiveIntensity: 0.6,
            metalness: 0.8,
            roughness: 0.2
        });
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(x, y, z);
        coin.userData = { initialY: y };
        scene.add(coin);
        collectibleCoins.push(coin);
    }

    function spawnCoinRow(z) {
        const laneIdx = Math.floor(Math.random() * 3);
        const count = 4;
        for (let i = 0; i < count; i++) {
            createCoin(LANES[laneIdx], 0.8, z - i * 3.2);
        }
    }

    function spawnSlideCoins(z) {
        // Low coins right under the high barrier
        const laneIdx = Math.floor(Math.random() * 3);
        createCoin(LANES[laneIdx], 0.4, z);
        createCoin(LANES[laneIdx], 0.4, z - 3);
    }

    function spawnJumpCoins(z) {
        // High arc of coins over the hurdle
        const laneIdx = Math.floor(Math.random() * 3);
        createCoin(LANES[laneIdx], 1.2, z + 2);
        createCoin(LANES[laneIdx], 2.2, z);
        createCoin(LANES[laneIdx], 1.2, z - 2);
    }

    // Power-ups (Shield, Magnet, 2X Multiplier)
    function spawnRandomPowerup(z) {
        const types = ['SHIELD', 'MAGNET', 'DOUBLE'];
        const type = types[Math.floor(Math.random() * types.length)];
        const lane = LANES[Math.floor(Math.random() * 3)];

        const group = new THREE.Group();
        group.position.set(lane, 1.2, z);

        let color = 0x00f0ff;
        if (type === 'MAGNET') color = 0xff007f;
        if (type === 'DOUBLE') color = 0x00ff88;

        const orbGeo = new THREE.OctahedronGeometry(0.6, 1);
        const orbMat = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        group.add(orb);

        const innerGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const innerMat = new THREE.MeshBasicMaterial({ color: color });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        group.add(inner);

        group.userData = { type: type };
        scene.add(group);
        powerupItems.push(group);
    }

    // Particle Burst System for impacts / pickups
    function createParticles(x, y, z, colorHex, count = 12) {
        const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(x, y, z);
            p.userData = {
                velX: (Math.random() - 0.5) * 8,
                velY: Math.random() * 8 + 2,
                velZ: (Math.random() - 0.5) * 8,
                life: 1.0
            };
            scene.add(p);
            particles.push(p);
        }
    }

    // Controls Handling
    function moveLeft() {
        if (currentState !== STATE.PLAYING) return;
        if (currentLane > 0) {
            currentLane--;
            targetX = LANES[currentLane];
            runStats.laneSwitches++;
            addDailyChallengeProgress('lane_switches', 1);
            checkMissionsProgress();
            window.soundManager.playLaneSwitch();
        }
    }

    function moveRight() {
        if (currentState !== STATE.PLAYING) return;
        if (currentLane < 2) {
            currentLane++;
            targetX = LANES[currentLane];
            runStats.laneSwitches++;
            addDailyChallengeProgress('lane_switches', 1);
            checkMissionsProgress();
            window.soundManager.playLaneSwitch();
        }
    }

    function jump() {
        if (currentState !== STATE.PLAYING) return;
        if (!isJumping) {
            isJumping = true;
            verticalVelocity = JUMP_VELOCITY;
            isSliding = false;
            slideTimer = 0;
            playerMesh.scale.y = 1.0;
            runStats.jumps++;
            addDailyChallengeProgress('jumps', 1);
            checkMissionsProgress();
            window.soundManager.playJump();
        }
    }

    function slide() {
        if (currentState !== STATE.PLAYING) return;
        if (!isSliding) {
            isSliding = true;
            slideTimer = SLIDE_DURATION;
            if (isJumping) {
                // Fast drop downwards
                verticalVelocity = -20;
            }
            playerMesh.scale.y = 0.45;
            runStats.slides++;
            addDailyChallengeProgress('slides', 1);
            checkMissionsProgress();
            window.soundManager.playSlide();
        }
    }

    // Input Listeners
    function setupEvents() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    moveLeft();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    moveRight();
                    break;
                case 'ArrowUp':
                case 'w':
                case 'W':
                case ' ':
                    jump();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    slide();
                    break;
                case 'p':
                case 'P':
                case 'Escape':
                    togglePause();
                    break;
            }
        });

        // Swipe Gestures on Canvas
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        window.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = performance.now();
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            const dt = performance.now() - touchStartTime;

            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            const minSwipe = 30;

            if (dt < 450) {
                if (absX > absY && absX > minSwipe) {
                    if (dx > 0) moveRight();
                    else moveLeft();
                } else if (absY > absX && absY > minSwipe) {
                    if (dy < 0) jump();
                    else slide();
                }
            }
        }, { passive: true });

        // Touch Control Buttons
        document.getElementById('btn-left').addEventListener('click', (e) => { e.stopPropagation(); moveLeft(); });
        document.getElementById('btn-right').addEventListener('click', (e) => { e.stopPropagation(); moveRight(); });
        document.getElementById('btn-jump').addEventListener('click', (e) => { e.stopPropagation(); jump(); });
        document.getElementById('btn-slide').addEventListener('click', (e) => { e.stopPropagation(); slide(); });

        // UI Menu Buttons
        document.getElementById('btn-play').addEventListener('click', () => {
            window.soundManager.playClick();
            startGame();
        });

        document.getElementById('btn-tutorial').addEventListener('click', () => {
            window.soundManager.playClick();
            showScreen('tutorial-screen');
        });

        document.getElementById('btn-close-tutorial').addEventListener('click', () => {
            window.soundManager.playClick();
            showScreen('menu-screen');
        });

        // Daily Streak Interactions
        const streakCardBody = document.getElementById('streak-card-body');
        if (streakCardBody) {
            streakCardBody.addEventListener('click', () => {
                window.soundManager.playClick();
                renderStreakModal();
                showScreen('streak-screen');
            });
        }

        const quickClaimBtn = document.getElementById('btn-streak-quick-claim');
        if (quickClaimBtn) {
            quickClaimBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (streakClaimedToday) {
                    window.soundManager.playClick();
                    renderStreakModal();
                    showScreen('streak-screen');
                } else {
                    claimDailyStreak();
                }
            });
        }

        const openStreakBtn = document.getElementById('btn-open-streak');
        if (openStreakBtn) {
            openStreakBtn.addEventListener('click', () => {
                window.soundManager.playClick();
                renderStreakModal();
                showScreen('streak-screen');
            });
        }

        const closeStreakBtn = document.getElementById('btn-close-streak');
        if (closeStreakBtn) {
            closeStreakBtn.addEventListener('click', () => {
                window.soundManager.playClick();
                showScreen('menu-screen');
            });
        }

        const modalClaimBtn = document.getElementById('btn-streak-claim-modal');
        if (modalClaimBtn) {
            modalClaimBtn.addEventListener('click', () => {
                if (!streakClaimedToday) {
                    claimDailyStreak();
                }
            });
        }

        const streakAdvanceBtn = document.getElementById('btn-streak-test-advance');
        if (streakAdvanceBtn) {
            streakAdvanceBtn.addEventListener('click', () => {
                window.soundManager.playClick();
                initDailyStreak(true);
            });
        }

        document.getElementById('btn-missions').addEventListener('click', () => {
            window.soundManager.playClick();
            renderMissionsModal();
            showScreen('missions-screen');
        });

        document.getElementById('btn-close-missions').addEventListener('click', () => {
            window.soundManager.playClick();
            if (countdownTimerInterval) clearInterval(countdownTimerInterval);
            showScreen('menu-screen');
        });

        const rerollBtn = document.getElementById('btn-reroll-test');
        if (rerollBtn) {
            rerollBtn.addEventListener('click', () => {
                window.soundManager.playClick();
                initDailyMissions(true);
                initDailyStreak();
                renderMissionsModal();
            });
        }

        document.getElementById('btn-shop').addEventListener('click', () => {
            window.soundManager.playClick();
            activeShopTab = 'skins';
            document.getElementById('tab-btn-skins').classList.add('active');
            document.getElementById('tab-btn-trails').classList.remove('active');
            renderShopUI();
            showScreen('shop-screen');
        });

        document.getElementById('btn-close-shop').addEventListener('click', () => {
            window.soundManager.playClick();
            showScreen('menu-screen');
        });

        document.getElementById('tab-btn-skins').addEventListener('click', () => {
            window.soundManager.playClick();
            activeShopTab = 'skins';
            document.getElementById('tab-btn-skins').classList.add('active');
            document.getElementById('tab-btn-trails').classList.remove('active');
            renderShopUI();
        });

        document.getElementById('tab-btn-trails').addEventListener('click', () => {
            window.soundManager.playClick();
            activeShopTab = 'trails';
            document.getElementById('tab-btn-trails').classList.add('active');
            document.getElementById('tab-btn-skins').classList.remove('active');
            renderShopUI();
        });

        document.getElementById('btn-pause').addEventListener('click', () => {
            window.soundManager.playClick();
            pauseGame();
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            window.soundManager.playClick();
            resumeGame();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            window.soundManager.playClick();
            startGame();
        });

        document.getElementById('btn-pause-menu').addEventListener('click', () => {
            window.soundManager.playClick();
            goToMenu();
        });

        document.getElementById('btn-gameover-retry').addEventListener('click', () => {
            window.soundManager.playClick();
            startGame();
        });

        document.getElementById('btn-gameover-menu').addEventListener('click', () => {
            window.soundManager.playClick();
            goToMenu();
        });

        // Leaderboard Screen Listeners
        const btnLeaderboard = document.getElementById('btn-leaderboard');
        if (btnLeaderboard) {
            btnLeaderboard.addEventListener('click', () => {
                window.soundManager.playClick();
                renderLeaderboardUI();
                showScreen('leaderboard-screen');
            });
        }

        const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
        if (btnCloseLeaderboard) {
            btnCloseLeaderboard.addEventListener('click', () => {
                window.soundManager.playClick();
                if (currentState === STATE.GAMEOVER) {
                    showScreen('gameover-screen');
                } else {
                    showScreen('menu-screen');
                }
            });
        }

        const btnGameoverLeaderboard = document.getElementById('btn-gameover-leaderboard');
        if (btnGameoverLeaderboard) {
            btnGameoverLeaderboard.addEventListener('click', () => {
                window.soundManager.playClick();
                renderLeaderboardUI();
                showScreen('leaderboard-screen');
            });
        }

        // Rank Entry Listeners
        const btnSubmitScore = document.getElementById('btn-submit-score');
        if (btnSubmitScore) {
            btnSubmitScore.addEventListener('click', () => {
                window.soundManager.playClick();
                submitScoreToLeaderboard();
            });
        }

        const btnSkipScore = document.getElementById('btn-skip-score');
        if (btnSkipScore) {
            btnSkipScore.addEventListener('click', () => {
                window.soundManager.playClick();
                pendingLeaderboardEntry = null;
                showScreen('gameover-screen');
            });
        }

        const nameInput = document.getElementById('player-name-input');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.soundManager.playClick();
                    submitScoreToLeaderboard();
                }
            });
        }

        // Sound & Vibration Toggles
        setupToggle('toggle-sound', () => {
            const next = !window.soundManager.soundEnabled;
            window.soundManager.setSoundEnabled(next);
            updateToggleButtons();
        });

        setupToggle('toggle-sound-pause', () => {
            const next = !window.soundManager.soundEnabled;
            window.soundManager.setSoundEnabled(next);
            updateToggleButtons();
        });

        setupToggle('toggle-vibe', () => {
            const next = !window.soundManager.vibrationEnabled;
            window.soundManager.setVibrationEnabled(next);
            updateToggleButtons();
        });

        updateToggleButtons();

        // Responsive Resizing
        window.addEventListener('resize', onWindowResize);
    }

    function setupToggle(elementId, callback) {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                callback();
            });
        }
    }

    function updateToggleButtons() {
        const soundOn = window.soundManager.soundEnabled;
        const vibeOn = window.soundManager.vibrationEnabled;

        const updateBtn = (id, active, iconOn, iconOff) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.toggle('off', !active);
                btn.innerHTML = active ? iconOn : iconOff;
            }
        };

        updateBtn('toggle-sound', soundOn, '🔊', '🔇');
        updateBtn('toggle-sound-pause', soundOn, '🔊', '🔇');
        updateBtn('toggle-vibe', vibeOn, '📳', '📴');
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        resizeWarpCanvas();
    }

    // Screens Routing
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        if (screenId) {
            const target = document.getElementById(screenId);
            if (target) target.classList.add('active');
        }
    }

    function updateMenuStats() {
        document.getElementById('menu-best-score').innerText = highScore.toLocaleString();
        document.getElementById('menu-total-coins').innerText = totalCoins.toLocaleString();
    }

    function startGame() {
        // Reset Variables
        score = 0;
        distance = 0;
        coins = 0;
        currentSpeed = BASE_SPEED;
        currentSpeedTierIndex = 0;
        resetAtmosphere(true);
        currentLane = 1;
        targetX = LANES[1];
        playerGroup.position.set(targetX, 0, 0);
        verticalVelocity = 0;
        isJumping = false;
        isSliding = false;
        slideTimer = 0;
        playerMesh.scale.y = 1.0;
        shieldActive = false;
        shieldMesh.visible = false;
        magnetTimer = 0;
        doubleScoreTimer = 0;

        // Reset speed effects & alert banners
        const speedLinesEl = document.getElementById('speed-lines');
        if (speedLinesEl) speedLinesEl.style.opacity = '0';
        const surgeBanner = document.getElementById('hud-speed-surge');
        if (surgeBanner) surgeBanner.classList.remove('show');
        if (warpActive) {
            warpActive = false;
            if (warpCtx && warpCanvas) warpCtx.clearRect(0, 0, warpCanvas.width, warpCanvas.height);
        }
        if (window.soundManager && window.soundManager.setGameSpeed) {
            window.soundManager.setGameSpeed(BASE_SPEED, BASE_SPEED);
        }

        // Reset Run Stats for Daily Missions
        runStats = {
            coins: 0,
            distance: 0,
            score: 0,
            jumps: 0,
            slides: 0,
            powerups: 0,
            laneSwitches: 0,
            laserSlides: 0,
            hurdleJumps: 0
        };

        // Clear existing dynamic objects
        clearWorld();

        // Reset Track
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            trackSegments[i].position.z = -i * SEGMENT_LENGTH;
        }
        nextSpawnZ = -50;
        spawnGameElements();

        currentState = STATE.PLAYING;
        showScreen(null);
        document.getElementById('hud-layer').style.display = 'flex';
        checkBatteryStatus(true);
        updateHUD();

        window.soundManager.startMusic();
    }

    function pauseGame() {
        if (currentState !== STATE.PLAYING) return;
        currentState = STATE.PAUSED;
        showScreen('pause-screen');
    }

    function resumeGame() {
        if (currentState !== STATE.PAUSED) return;
        currentState = STATE.PLAYING;
        showScreen(null);
        lastTime = performance.now();
    }

    function togglePause() {
        if (currentState === STATE.PLAYING) pauseGame();
        else if (currentState === STATE.PAUSED) resumeGame();
    }

    function goToMenu() {
        currentState = STATE.MENU;
        showScreen('menu-screen');
        document.getElementById('hud-layer').style.display = 'none';
        updateMenuStats();
        updateMissionsBadge();
        updateStreakUI();
        applySkin(selectedSkin);
        resetAtmosphere(false);
        window.soundManager.stopMusic();
    }

    function gameOver() {
        currentState = STATE.GAMEOVER;
        window.soundManager.playCrash();
        window.soundManager.stopMusic();
        cameraShake = 0.45;

        // Visual flash & explosion particles
        createParticles(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z, 0xff007f, 25);

        // Update Record & Save
        const finalScore = Math.floor(score);
        const finalDistance = Math.floor(distance);
        const isNewRecord = finalScore > highScore;
        saveStorage();

        // Update Game Over Modal UI
        document.getElementById('gameover-final-score').innerText = finalScore.toLocaleString();
        document.getElementById('gameover-distance').innerText = finalDistance + 'm';
        document.getElementById('gameover-coins').innerText = '+' + coins;
        document.getElementById('gameover-total-coins').innerText = totalCoins.toLocaleString();

        const badge = document.getElementById('new-record-badge');
        if (badge) badge.style.display = isNewRecord ? 'inline-block' : 'none';

        renderGameOverMissions();

        const qualifies = isLeaderboardQualifying(finalScore);

        setTimeout(() => {
            if (qualifies) {
                pendingLeaderboardEntry = {
                    score: finalScore,
                    distance: finalDistance,
                    date: getTodayString()
                };
                const rankScoreEl = document.getElementById('rank-entry-score');
                if (rankScoreEl) rankScoreEl.innerText = finalScore.toLocaleString();

                const nameInput = document.getElementById('player-name-input');
                if (nameInput) {
                    nameInput.value = lastEnteredName || 'CYBER_ACE';
                }
                showScreen('rank-entry-screen');
                if (nameInput) {
                    setTimeout(() => nameInput.focus(), 250);
                }
            } else {
                showScreen('gameover-screen');
            }
        }, 600);
    }

    function clearWorld() {
        obstacles.forEach(o => scene.remove(o));
        obstacles = [];
        collectibleCoins.forEach(c => scene.remove(c));
        collectibleCoins = [];
        powerupItems.forEach(p => scene.remove(p));
        powerupItems = [];
        particles.forEach(p => scene.remove(p));
        particles = [];
    }

    // ==========================================
    // SYSTEM-AWARE BATTERY STATUS MONITOR
    // ==========================================
    let cachedBatteryLevel = 1.0;
    let cachedBatteryCharging = false;
    let webBatteryObject = null;
    let lastBatteryPollTime = 0;

    function initBatteryMonitor() {
        // 1. Try Native Android Bridge first
        if (window.AndroidBridge && typeof window.AndroidBridge.getBatteryLevel === 'function') {
            try {
                cachedBatteryLevel = window.AndroidBridge.getBatteryLevel();
                cachedBatteryCharging = !!(window.AndroidBridge.isBatteryCharging && window.AndroidBridge.isBatteryCharging());
            } catch (e) {
                console.warn('Native battery read error', e);
            }
        } else if (navigator.getBattery) {
            // 2. Standard Chromium / Android WebView Battery Status API
            navigator.getBattery().then(battery => {
                webBatteryObject = battery;
                cachedBatteryLevel = battery.level;
                cachedBatteryCharging = battery.charging;
                updateBatteryUI(cachedBatteryLevel, cachedBatteryCharging);

                battery.addEventListener('levelchange', () => {
                    cachedBatteryLevel = battery.level;
                    updateBatteryUI(cachedBatteryLevel, cachedBatteryCharging);
                });
                battery.addEventListener('chargingchange', () => {
                    cachedBatteryCharging = battery.charging;
                    updateBatteryUI(cachedBatteryLevel, cachedBatteryCharging);
                });
            }).catch(() => {});
        }

        updateBatteryUI(cachedBatteryLevel, cachedBatteryCharging);
    }

    function checkBatteryStatus(force = false) {
        const now = performance.now();
        // Throttle queries to once every 4 seconds during 60fps gameplay to minimize bridge calls
        if (!force && (now - lastBatteryPollTime < 4000)) return;
        lastBatteryPollTime = now;

        if (window.AndroidBridge && typeof window.AndroidBridge.getBatteryLevel === 'function') {
            try {
                cachedBatteryLevel = window.AndroidBridge.getBatteryLevel();
                cachedBatteryCharging = !!(window.AndroidBridge.isBatteryCharging && window.AndroidBridge.isBatteryCharging());
            } catch (e) {}
        } else if (webBatteryObject) {
            cachedBatteryLevel = webBatteryObject.level;
            cachedBatteryCharging = webBatteryObject.charging;
        }

        updateBatteryUI(cachedBatteryLevel, cachedBatteryCharging);
    }

    function updateBatteryUI(level, isCharging) {
        const card = document.getElementById('hud-battery');
        const fill = document.getElementById('battery-fill');
        const shell = document.getElementById('battery-shell');
        const tip = document.getElementById('battery-tip');
        const pctEl = document.getElementById('battery-pct');
        const boltEl = document.getElementById('battery-bolt');

        if (!card || !fill || !shell || !tip || !pctEl) return;

        const clampedLevel = Math.max(0, Math.min(1.0, isNaN(level) ? 1.0 : level));
        const pct = Math.round(clampedLevel * 100);
        pctEl.innerText = `${pct}%`;

        // Dynamic Color shift from Green to Red:
        // Level >= 0.50: Golden Yellow (#ffe600) -> Neon Green (#00ff88)
        // Level < 0.50:  Critical Red (#ff0055)  -> Golden Yellow (#ffe600)
        let r, g, b;
        if (clampedLevel >= 0.50) {
            const t = (clampedLevel - 0.50) / 0.50;
            r = Math.round(255 * (1 - t) + 0 * t);
            g = Math.round(230 * (1 - t) + 255 * t);
            b = Math.round(0 * (1 - t) + 136 * t);
        } else {
            const t = clampedLevel / 0.50;
            r = 255;
            g = Math.round(0 * (1 - t) + 230 * t);
            b = Math.round(85 * (1 - t) + 0 * t);
        }

        const colorRgb = `rgb(${r}, ${g}, ${b})`;
        const colorGlow = `rgba(${r}, ${g}, ${b}, 0.45)`;

        fill.style.width = `${Math.max(6, pct)}%`;
        fill.style.backgroundColor = colorRgb;
        fill.style.boxShadow = `0 0 6px ${colorGlow}`;

        shell.style.borderColor = colorRgb;
        tip.style.backgroundColor = colorRgb;
        card.style.borderColor = colorRgb;
        card.style.boxShadow = `0 0 10px ${colorGlow}`;
        pctEl.style.color = (clampedLevel <= 0.20) ? colorRgb : '#ffffff';

        // Critical warning pulse if <= 15% and not plugged into charger
        if (clampedLevel <= 0.15 && !isCharging) {
            card.classList.add('critical');
        } else {
            card.classList.remove('critical');
        }

        if (boltEl) {
            boltEl.style.display = isCharging ? 'inline-block' : 'none';
        }
    }

    function updateHUD() {
        document.getElementById('hud-score').innerText = Math.floor(score).toLocaleString();
        document.getElementById('hud-distance').innerText = Math.floor(distance) + ' m';
        document.getElementById('hud-coins').innerText = coins;

        // Dynamic Speedometer & Speed Tier Display
        const speedValEl = document.getElementById('hud-speed-val');
        if (speedValEl) speedValEl.innerText = Math.round(currentSpeed);
        const tierBadgeEl = document.getElementById('hud-tier-badge');
        if (tierBadgeEl) {
            const tier = SPEED_TIERS[currentSpeedTierIndex] || SPEED_TIERS[0];
            tierBadgeEl.innerText = tier.name;
            tierBadgeEl.className = 'hud-tier-badge ' + tier.className;
        }

        // Periodic System Battery Status Update
        checkBatteryStatus();

        // Power-ups display
        const container = document.getElementById('hud-powerups');
        container.innerHTML = '';
        if (shieldActive) {
            container.innerHTML += `<div class="powerup-pill" style="color: #00f0ff; border-color: #00f0ff;">🛡️ SHIELD READY</div>`;
        }
        if (magnetTimer > 0) {
            container.innerHTML += `<div class="powerup-pill" style="color: #ff007f; border-color: #ff007f;">🧲 MAGNET (${Math.ceil(magnetTimer)}s)</div>`;
        }
        if (doubleScoreTimer > 0) {
            container.innerHTML += `<div class="powerup-pill" style="color: #00ff88; border-color: #00ff88;">⚡ 2X SCORE (${Math.ceil(doubleScoreTimer)}s)</div>`;
        }
    }

    // Dynamic Atmosphere Management (Fog Color & Light Intensity by Speed Tier)
    function updateAtmosphere(dt) {
        if (!scene || !scene.fog || !ambientLight || !dirLight || !backLight) return;

        const currentTier = SPEED_TIERS[currentSpeedTierIndex] || SPEED_TIERS[0];

        targetFogColor.setHex(currentTier.fogColor);
        targetAmbientColor.setHex(currentTier.ambientColor);
        targetDirColor.setHex(currentTier.dirColor);
        targetBackColor.setHex(currentTier.backColor);
        targetFogDensity = currentTier.fogDensity;
        targetAmbientIntensity = currentTier.ambientIntensity;
        targetDirIntensity = currentTier.dirIntensity;
        targetBackIntensity = currentTier.backIntensity;
        targetEngineBoost = currentTier.engineBoost || 1.0;

        // Smooth color interpolation factor (~3.5x for responsive, fluid atmospheric shift)
        const lerpFactor = Math.min(1.0, 3.5 * dt);

        // Smoothly shift scene fog color & background color (seamless horizon match)
        scene.fog.color.lerp(targetFogColor, lerpFactor);
        if (scene.background) {
            scene.background.lerp(targetFogColor, lerpFactor);
        }

        // Smoothly adjust fog density
        scene.fog.density += (targetFogDensity - scene.fog.density) * (2.5 * dt);

        // Atmosphere Flash decay (extra intensity pulse when speed surge triggers)
        if (atmosphereFlashIntensity > 0) {
            atmosphereFlashIntensity = Math.max(0, atmosphereFlashIntensity - (dt * 1.8));
        }

        // Smoothly adjust ambient light color and intensity
        ambientLight.color.lerp(targetAmbientColor, lerpFactor);
        const desiredAmbient = targetAmbientIntensity + (atmosphereFlashIntensity * 0.45);
        ambientLight.intensity += (desiredAmbient - ambientLight.intensity) * (3.5 * dt);

        // Smoothly adjust primary directional light color and intensity
        dirLight.color.lerp(targetDirColor, lerpFactor);
        const desiredDir = targetDirIntensity + (atmosphereFlashIntensity * 0.75);
        dirLight.intensity += (desiredDir - dirLight.intensity) * (3.5 * dt);

        // Smoothly adjust back rim light color and intensity
        backLight.color.lerp(targetBackColor, lerpFactor);
        const desiredBack = targetBackIntensity + (atmosphereFlashIntensity * 0.35);
        backLight.intensity += (desiredBack - backLight.intensity) * (3.5 * dt);

        // Dynamically tint distant skyline buildings and windows to match the atmosphere
        if (skylineBuildingMat) {
            skylineBuildingMat.color.lerp(targetAmbientColor, lerpFactor * 0.8);
        }
        if (skylineWindowMat) {
            skylineWindowMat.color.lerp(targetDirColor, lerpFactor * 0.8);
        }

        // Engine thruster light reacts dynamically to speed tier
        if (engineLight && currentState === STATE.PLAYING) {
            const flicker = Math.sin(performance.now() * 0.02) * 0.15;
            engineLight.intensity = (1.8 * targetEngineBoost) + flicker + (atmosphereFlashIntensity * 1.5);
            engineLight.color.lerp(targetDirColor, lerpFactor * 0.5);
        }
    }

    function resetAtmosphere(instant = true) {
        if (!scene || !scene.fog || !ambientLight || !dirLight || !backLight) return;
        const tier = SPEED_TIERS[0];
        targetFogColor.setHex(tier.fogColor);
        targetAmbientColor.setHex(tier.ambientColor);
        targetDirColor.setHex(tier.dirColor);
        targetBackColor.setHex(tier.backColor);
        targetFogDensity = tier.fogDensity;
        targetAmbientIntensity = tier.ambientIntensity;
        targetDirIntensity = tier.dirIntensity;
        targetBackIntensity = tier.backIntensity;
        targetEngineBoost = tier.engineBoost || 1.0;
        atmosphereFlashIntensity = 0;

        if (instant) {
            scene.fog.color.copy(targetFogColor);
            if (scene.background) scene.background.copy(targetFogColor);
            scene.fog.density = targetFogDensity;
            ambientLight.color.copy(targetAmbientColor);
            ambientLight.intensity = targetAmbientIntensity;
            dirLight.color.copy(targetDirColor);
            dirLight.intensity = targetDirIntensity;
            backLight.color.copy(targetBackColor);
            backLight.intensity = targetBackIntensity;
            if (skylineBuildingMat) skylineBuildingMat.color.copy(targetAmbientColor);
            if (skylineWindowMat) skylineWindowMat.color.copy(targetDirColor);
            if (targetSkyColor) targetSkyColor.setHex(tier.skyColor);
            if (skyboxMat && targetSkyColor) {
                skyboxMat.color.copy(targetSkyColor);
                skyboxMat.opacity = 0.92;
            }
            if (skyboxMesh) {
                skyboxMesh.rotation.set(0, 0, 0);
            }
        }
        currentSkyRotY = tier.skyRotSpeedY;
        currentSkyRotX = tier.skyRotSpeedX;
        currentSkyRotZ = tier.skyRotSpeedZ;
        currentSkyScroll = tier.skyScrollSpeed;
    }

    // Main Game Loop (Delta-Time Based)
    function animate() {
        requestAnimationFrame(animate);

        const now = performance.now();
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        dt = Math.min(dt, 0.1); // Clamp dt to prevent teleportation lag

        if (currentState === STATE.PLAYING) {
            updatePhysics(dt);
            updateAtmosphere(dt);
            updateSkybox(dt);
            updateTrack(dt);
            updateObstaclesAndItems(dt);
            updateParticles(dt);
            updatePowerups(dt);
            updateCamera(dt);
            updateHUD();
        } else if (currentState === STATE.MENU) {
            // Idle background scrolling in menu
            updateAtmosphere(dt * 0.5);
            updateSkybox(dt * 0.4);
            updateTrack(dt * 0.3);
            playerGroup.position.x = 0;
            playerGroup.position.y = Math.sin(now * 0.003) * 0.15;
            engineLight.intensity = 1.5 + Math.sin(now * 0.008) * 0.5;
        } else {
            // Paused or Game Over - subtle slow rotation
            updateAtmosphere(dt * 0.2);
            updateSkybox(dt * 0.2);
        }

        renderer.render(scene, camera);

        // Additive Screen-Space Neon Warp Particle Transition
        if (warpActive) {
            updateWarpEffect(dt);
        }
    }

    // Player Physics & Movement
    function updatePhysics(dt) {
        // Dynamic Progressive Speed Curve:
        // Responsive ramp: increases noticeably every 100m, accelerating into hyper speed
        const rampedBonus = (distance * 0.024) + Math.pow(Math.min(distance, 2000) / 280, 1.35) * 3.6;
        currentSpeed = Math.min(BASE_SPEED + rampedBonus, MAX_SPEED);

        // Dynamic Speed Tier Tracking & Surge Alert
        let newTierIndex = 0;
        for (let i = SPEED_TIERS.length - 1; i >= 0; i--) {
            if (currentSpeed >= SPEED_TIERS[i].minSpeed) {
                newTierIndex = i;
                break;
            }
        }
        if (newTierIndex > currentSpeedTierIndex) {
            currentSpeedTierIndex = newTierIndex;
            triggerSpeedTierNotification(SPEED_TIERS[currentSpeedTierIndex]);
        }

        // Dynamic Audio Tempo synchronization
        if (window.soundManager && window.soundManager.setGameSpeed) {
            window.soundManager.setGameSpeed(currentSpeed, BASE_SPEED);
        }

        // Dynamic Speed lines visual intensity
        const speedLinesEl = document.getElementById('speed-lines');
        if (speedLinesEl) {
            const intensity = Math.min(0.85, Math.max(0, (currentSpeed - 28) / 36));
            speedLinesEl.style.opacity = intensity;
        }

        // Distance & Score progression
        distance += currentSpeed * dt * 0.6;
        const scoreMultiplier = (doubleScoreTimer > 0) ? 2 : 1;
        score += currentSpeed * dt * 2.5 * scoreMultiplier;
        runStats.distance = distance;
        runStats.score = score;
        checkMissionsProgress();

        // Smooth Lane Switching (Lerp)
        playerGroup.position.x += (targetX - playerGroup.position.x) * 16 * dt;

        // Slight banking/roll on turn
        const rollTarget = (targetX - playerGroup.position.x) * -0.08;
        playerGroup.rotation.z += (rollTarget - playerGroup.rotation.z) * 12 * dt;

        // Jump physics
        if (isJumping) {
            playerGroup.position.y += verticalVelocity * dt;
            verticalVelocity += GRAVITY * dt;

            // Jump pitch
            playerGroup.rotation.x = -verticalVelocity * 0.02;

            if (playerGroup.position.y <= 0) {
                playerGroup.position.y = 0;
                verticalVelocity = 0;
                isJumping = false;
                playerGroup.rotation.x = 0;
            }
        }

        // Slide physics
        if (isSliding) {
            slideTimer -= dt;
            playerGroup.rotation.x = -0.4; // Lean forward/down
            // Slide spark particles
            if (Math.random() < 0.45) {
                const trailObj = TRAILS_CATALOG.find(t => t.id === selectedTrail);
                const sparkColor = (trailObj && trailObj.colorHex !== 'rainbow') ? trailObj.colorHex : 0xffe600;
                createParticles(playerGroup.position.x, 0.1, playerGroup.position.z + 0.8, sparkColor, 2);
            }
            if (slideTimer <= 0) {
                isSliding = false;
                playerMesh.scale.y = 1.0;
                playerGroup.rotation.x = 0;
            }
        }

        // Hoverboard Idle oscillation when on ground
        if (!isJumping && !isSliding) {
            runAnimTime += dt * (currentSpeed * 0.4);
            playerGroup.position.y = Math.sin(runAnimTime) * 0.08;
            playerGroup.rotation.x = Math.sin(runAnimTime * 0.5) * 0.03;
        }

        // Jet Thruster Particle Trail
        thrusterTimer += dt;
        if (thrusterTimer > 0.045) {
            thrusterTimer = 0;
            emitTrailParticle();
        }

        // Shield pulse
        if (shieldActive) {
            shieldMesh.rotation.y += dt * 3;
            shieldMesh.rotation.x += dt * 2;
        }
    }

    // Track Recycling
    function updateTrack(dt) {
        const moveDist = currentSpeed * dt;

        trackSegments.forEach(segment => {
            segment.position.z += moveDist;
            if (segment.position.z > SEGMENT_LENGTH) {
                // Find furthest segment
                let minZ = 0;
                trackSegments.forEach(s => { if (s.position.z < minZ) minZ = s.position.z; });
                segment.position.z = minZ - SEGMENT_LENGTH;
            }
        });

        // Parallax Skyline
        buildings.forEach(b => {
            b.position.z += moveDist * 0.25;
            if (b.position.z > 20) {
                b.position.z -= 280;
            }
        });

        nextSpawnZ += moveDist;
        spawnGameElements();
    }

    // Collision & Item Updates
    function updateObstaclesAndItems(dt) {
        const moveDist = currentSpeed * dt;
        const playerX = playerGroup.position.x;
        const playerY = playerGroup.position.y;
        const playerZ = playerGroup.position.z;

        // Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.position.z += moveDist;

            // Collision Check with Player
            const dz = Math.abs(obs.position.z - playerZ);
            if (dz < 1.3) {
                const dx = Math.abs(obs.userData.x - playerX);
                if (dx < 1.1) {
                    const type = obs.userData.type;
                    let hit = false;

                    if (type === 'MONOLITH') {
                        hit = true;
                    } else if (type === 'LOW_HURDLE') {
                        // Cleared if jumping sufficiently high
                        if (playerY < obs.userData.maxY) {
                            hit = true;
                        } else if (!obs.userData.cleared) {
                            obs.userData.cleared = true;
                            runStats.hurdleJumps++;
                            addDailyChallengeProgress('jump_hurdles', 1);
                            checkMissionsProgress();
                        }
                    } else if (type === 'HIGH_BARRIER') {
                        // Cleared if sliding
                        if (!isSliding || playerY > 0.8) {
                            hit = true;
                        } else if (!obs.userData.cleared) {
                            obs.userData.cleared = true;
                            runStats.laserSlides++;
                            addDailyChallengeProgress('slide_obstacles', 1);
                            checkMissionsProgress();
                        }
                    }

                    if (hit) {
                        if (shieldActive) {
                            // Shield absorbs the blow!
                            shieldActive = false;
                            shieldMesh.visible = false;
                            window.soundManager.playPowerup();
                            cameraShake = 0.35;
                            createParticles(playerX, playerY + 1, playerZ, 0x00f0ff, 20);
                            scene.remove(obs);
                            obstacles.splice(i, 1);
                            continue;
                        } else {
                            gameOver();
                            return;
                        }
                    }
                }
            }

            // Remove when behind camera
            if (obs.position.z > 15) {
                scene.remove(obs);
                obstacles.splice(i, 1);
            }
        }

        // Coins
        for (let i = collectibleCoins.length - 1; i >= 0; i--) {
            const coin = collectibleCoins[i];
            coin.position.z += moveDist;
            coin.rotation.z += dt * 4;

            // Magnet Attraction
            if (magnetTimer > 0) {
                const distToPlayer = coin.position.distanceTo(playerGroup.position);
                if (distToPlayer < 12) {
                    coin.position.x += (playerX - coin.position.x) * 12 * dt;
                    coin.position.y += (playerY + 0.8 - coin.position.y) * 12 * dt;
                    coin.position.z += (playerZ - coin.position.z) * 12 * dt;
                }
            }

            // Pickup check
            const dist = coin.position.distanceTo(new THREE.Vector3(playerX, playerY + 0.8, playerZ));
            if (dist < 1.6) {
                coins++;
                runStats.coins++;
                const multiplier = (doubleScoreTimer > 0) ? 2 : 1;
                score += 50 * multiplier;
                addDailyChallengeProgress('coins', 1);
                checkMissionsProgress();
                window.soundManager.playCoin();
                createParticles(coin.position.x, coin.position.y, coin.position.z, 0xffe600, 8);
                scene.remove(coin);
                collectibleCoins.splice(i, 1);
                continue;
            }

            if (coin.position.z > 15) {
                scene.remove(coin);
                collectibleCoins.splice(i, 1);
            }
        }

        // Power-up Pickups
        for (let i = powerupItems.length - 1; i >= 0; i--) {
            const item = powerupItems[i];
            item.position.z += moveDist;
            item.rotation.y += dt * 3;
            item.rotation.x += dt * 2;

            const dist = item.position.distanceTo(new THREE.Vector3(playerX, playerY + 1, playerZ));
            if (dist < 1.8) {
                const pType = item.userData.type;
                runStats.powerups++;
                addDailyChallengeProgress('powerups', 1);
                checkMissionsProgress();
                window.soundManager.playPowerup();

                if (pType === 'SHIELD') {
                    shieldActive = true;
                    shieldMesh.visible = true;
                    createParticles(item.position.x, item.position.y, item.position.z, 0x00f0ff, 15);
                } else if (pType === 'MAGNET') {
                    magnetTimer = 10;
                    createParticles(item.position.x, item.position.y, item.position.z, 0xff007f, 15);
                } else if (pType === 'DOUBLE') {
                    doubleScoreTimer = 10;
                    createParticles(item.position.x, item.position.y, item.position.z, 0x00ff88, 15);
                }

                scene.remove(item);
                powerupItems.splice(i, 1);
                continue;
            }

            if (item.position.z > 15) {
                scene.remove(item);
                powerupItems.splice(i, 1);
            }
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.position.x += p.userData.velX * dt;
            p.position.y += p.userData.velY * dt;
            p.position.z += p.userData.velZ * dt;
            p.userData.velY += GRAVITY * 0.4 * dt;
            p.userData.life -= dt * 2.2;
            p.scale.setScalar(p.userData.life);

            if (p.userData.life <= 0) {
                scene.remove(p);
                particles.splice(i, 1);
            }
        }
    }

    function updatePowerups(dt) {
        if (magnetTimer > 0) magnetTimer = Math.max(0, magnetTimer - dt);
        if (doubleScoreTimer > 0) doubleScoreTimer = Math.max(0, doubleScoreTimer - dt);
    }

    function updateCamera(dt) {
        // Camera smooth follow
        const targetCamX = playerGroup.position.x * 0.45;
        camera.position.x += (targetCamX - camera.position.x) * 8 * dt;

        // Dynamic FOV based on speed (warp-speed perspective widening)
        const targetFOV = 64 + (currentSpeed - BASE_SPEED) * 0.48;
        camera.fov += (targetFOV - camera.fov) * 6 * dt;
        camera.updateProjectionMatrix();

        // Screen shake + high speed kinetic vibration rumble
        const speedRumble = (currentSpeed > 48) ? (currentSpeed - 48) * 0.003 : 0;
        const totalShake = cameraShake + speedRumble;

        if (totalShake > 0) {
            camera.position.x += (Math.random() - 0.5) * totalShake;
            camera.position.y = 4.2 + (Math.random() - 0.5) * totalShake;
            if (cameraShake > 0) {
                cameraShake -= dt * 1.5;
                if (cameraShake < 0) cameraShake = 0;
            }
        } else {
            camera.position.y = 4.2;
        }
    }

    // Start 3D Engine on load
    window.addEventListener('DOMContentLoaded', () => {
        initThree();
    });

})();
