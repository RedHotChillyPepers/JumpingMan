// Версия игры
const GAME_VERSION = '1.2.1';

class BabyVillagerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 400;
        this.canvas.height = 600;

        // Игровые состояния
        this.gameState = 'start'; // start, playing, gameOver
        this.continueAttempts = 2; // Количество попыток продолжить игру
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('babyVillagerHighScore') || '0');
        this.lastScore = parseInt(localStorage.getItem('babyVillagerLastScore') || '0');

        // Призрак
        this.ghost = {
            y: 0,
            visible: false,
            animation: 0
        };

        // Фейковые призраки
        this.fakeGhosts = [];

        // Генератор случайных ников
        this.nicknamePrefixes = [
            'Player', 'Gamer', 'Jump', 'Sky', 'Cloud', 'Pixel', 'Mine', 'Doodle',
            'High', 'Top', 'Champ', 'Walker', 'Surfer', 'Ninja', 'Master', 'Star',
            'Rider', 'Dancer', 'Warrior', 'Legend', 'Pilot', 'Hopper', 'Knight', 'Hero',
            'Pro', 'King', 'Queen', 'Lord', 'Lady', 'Boss', 'Chief', 'Elite', 'Alpha',
            'Beta', 'Gamma', 'Omega', 'Storm', 'Fire', 'Ice', 'Wind', 'Earth'
        ];

        this.nicknameSuffixes = [
            '123', '456', '789', '2024', '2025', 'X', 'Z', 'Pro', 'Max', 'Ultra',
            'Prime', 'Gold', 'Silver', 'Bronze', 'Diamond', 'Platinum', 'Master',
            'Champ', 'King', 'Queen', 'Lord', 'Boss', 'Elite', 'Alpha', 'Beta',
            'Storm', 'Fire', 'Ice', 'Wind', 'Earth', 'Sky', 'Cloud', 'Star'
        ];

        // Звуки
        this.sounds = {
            jump: null,
            spring: null,
            break: null,
            gameOver: null,
            background: null,
            coin: null
        };
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.initSounds();

        // Система анимаций
        this.animationState = 'idle'; // idle, jumping, falling, superJump
        this.animationTimer = 0;
        this.lastVelocityY = 0;

        // Игровые объекты
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 30,
            height: 30,
            velocityY: 0,
            velocityX: 0,
            onGround: false,
            jumpPower: -15,
            maxSpeed: 8,
            doubleJumpAvailable: false,
            doubleJumpUsed: false
        };

        this.platforms = [];
        this.camera = { y: 0 };
        this.platformTypes = ['normal', 'moving', 'breakable', 'spring'];
        this.frameCount = 0;

        // Система монет
        this.coins = [];
        this.coinsCollected = 0;
        this.totalCoins = parseInt(localStorage.getItem('babyVillagerCoins') || '0');

        // Система реактивного ранца
        this.jetpacks = [];
        this.playerJetpackActive = false;
        this.jetpackTimeLeft = 0;
        this.jetpackDuration = 3000; // 3 секунды в миллисекундах

        // Система параллакса
        this.parallaxLayers = [];
        // Облака рисуются динамически
        this.timeOfDay = 'day'; // day, night
        this.nightHeight = 3000; // Высота начала ночи
        this.cycleHeight = 6000; // Высота для перезапуска цикла

        // Система магазина
        this.shop = {
            doubleJumpCount: parseInt(localStorage.getItem('babyVillagerDoubleJumpCount') || '0'),
            skins: {
                default: { name: 'Классический', price: 0, owned: true },
                golden: { name: 'Золотой', price: 500, owned: false },
                rainbow: { name: 'Радужный', price: 1000, owned: false },
                fire: { name: 'Огненный', price: 1500, owned: false },
                ice: { name: 'Ледяной', price: 2000, owned: false }
            },
            currentSkin: localStorage.getItem('babyVillagerCurrentSkin') || 'default',
            prices: {
                doubleJump: 50
            }
        };

        // Загружаем скины из localStorage
        this.loadSkinsFromStorage();

        // Инициализация Яндекс.Игры SDK (после инициализации shop)
        this.initYandexSDK();

        // Физика
        this.gravity = 0.8;
        this.friction = 0.9;

        // Управление
        this.keys = {};
        this.mobileKeys = {}; // Отдельные флаги для мобильных кнопок
        this.mouseX = 0;
        
        // Время для стабильной скорости игры
        this.lastTime = 0;
        this.deltaTime = 0;

        this.init();
    }

    initYandexSDK() {
        // Проверяем, что мы находимся в Яндекс.Играх
        if (typeof YaGames !== 'undefined') {
            YaGames.init().then(ysdk => {
                this.ysdk = ysdk;
                this.detectLanguage();
                
                // Уведомляем Яндекс.Игры, что игра готова к запуску
                this.callGameReadyAPI();
            }).catch(error => {
                console.log('Yandex SDK initialization failed:', error);
                this.setDefaultLanguage();
            });
        } else {
            // Если SDK недоступен, используем язык по умолчанию
            this.setDefaultLanguage();
        }
    }

    callGameReadyAPI() {
        if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) {
            try {
                this.ysdk.features.GameplayAPI.ready();
                console.log('Game Ready API called successfully');
            } catch (error) {
                console.log('Game Ready API call failed:', error);
            }
        }
    }

    callGameplayStart() {
        if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) {
            try {
                this.ysdk.features.GameplayAPI.start();
                console.log('Gameplay Start API called successfully');
            } catch (error) {
                console.log('Gameplay Start API call failed:', error);
            }
        }
    }

    callGameplayStop() {
        if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) {
            try {
                this.ysdk.features.GameplayAPI.stop();
                console.log('Gameplay Stop API called successfully');
            } catch (error) {
                console.log('Gameplay Stop API call failed:', error);
            }
        }
    }

    detectLanguage() {
        if (this.ysdk && this.ysdk.environment) {
            // Получаем язык из SDK
            const language = this.ysdk.environment.i18n.lang;
            this.setLanguage(language);
        } else {
            this.setDefaultLanguage();
        }
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        this.updateUITexts();
    }

    setDefaultLanguage() {
        // Определяем язык браузера или используем русский по умолчанию
        const browserLang = navigator.language || navigator.userLanguage;
        const lang = browserLang.startsWith('ru') ? 'ru' : 'en';
        this.setLanguage(lang);
    }

    updateUITexts() {
        const texts = this.getTexts();
        
        // Обновляем тексты в HTML
        const elements = {
            'startBtn': texts.startGame,
            'shopBtn': texts.shop,
            'menuBtn': texts.mainMenu,
            'continueBtn': texts.continue,
            'restartBtn': texts.restart,
            'backFromShopBtn': texts.back,
            'doubleJumpBtn': texts.buyDoubleJump,
            'soundBtn': texts.sound,
            'jumpBtn': texts.jump
        };

        Object.entries(elements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = text;
            }
        });

        // Обновляем заголовки
        const titleElement = document.querySelector('h1');
        if (titleElement) {
            titleElement.textContent = texts.gameTitle;
        }

        const shopTitleElement = document.querySelector('#shopScreen h2');
        if (shopTitleElement) {
            shopTitleElement.textContent = texts.shop;
        }

        const gameOverTitleElement = document.querySelector('#gameOverScreen h2');
        if (gameOverTitleElement) {
            gameOverTitleElement.textContent = texts.gameOver;
        }

        // Обновляем статистику
        const highScoreElements = document.querySelectorAll('.stat-label');
        highScoreElements.forEach(element => {
            if (element.textContent.includes('Рекорд') || element.textContent.includes('Record')) {
                element.textContent = texts.highScore + ':';
            }
        });

        // Обновляем тексты скинов
        this.updateSkinTexts(texts);
    }

    updateSkinTexts(texts) {
        const skinNames = {
            'default': texts.skinDefault,
            'golden': texts.skinGolden,
            'rainbow': texts.skinRainbow,
            'fire': texts.skinFire,
            'ice': texts.skinIce
        };

        // Обновляем названия скинов
        Object.entries(skinNames).forEach(([skinId, skinName]) => {
            const skinItem = document.querySelector(`[data-skin="${skinId}"]`);
            if (skinItem) {
                const nameElement = skinItem.querySelector('.skin-name');
                if (nameElement) {
                    nameElement.textContent = skinName;
                }
            }
        });

        // Обновляем цены скинов (только если shop инициализирован)
        if (this.shop && this.shop.skins) {
            this.updateShopSkins();
        }
    }

    getTexts() {
        const texts = {
            ru: {
                gameTitle: 'Джампер Мэн',
                startGame: 'Начать игру',
                shop: 'Магазин',
                mainMenu: 'Главное меню',
                continue: 'Продолжить',
                restart: 'Начать заново',
                back: 'Назад',
                buyDoubleJump: 'Купить двойной прыжок',
                sound: '🔊',
                jump: '🦘',
                gameOver: 'Игра окончена!',
                highScore: 'Рекорд',
                score: 'Счет',
                coins: 'Монеты',
                doubleJumps: 'Двойные прыжки',
                // Тексты скинов
                skinDefault: 'Классический',
                skinGolden: 'Золотой',
                skinRainbow: 'Радужный',
                skinFire: 'Огненный',
                skinIce: 'Ледяной',
                skinFree: 'Бесплатно',
                skinOwned: 'Куплено',
                skinSelected: 'Выбрано'
            }
        };

        return texts[this.currentLanguage] || texts.ru;
    }

    initSounds() {
        // Создаем звуки программно для совместимости
        this.createSoundEffects();
    }

    createSoundEffects() {
        // Создаем звуковые эффекты в стиле iOS с помощью Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioContext = audioContext;
        } catch (error) {
            console.warn('Web Audio API не поддерживается:', error);
            this.soundEnabled = false;
            return;
        }

        // Звук прыжка (низкий и приятный)
        this.sounds.jump = () => {
            if (!this.soundEnabled || !this.audioContext) return;
            this.createIOSClickSound(200, 0.08, 0.12);
        };

        // Звук пружины (средний тон, более энергичный)
        this.sounds.spring = () => {
            if (!this.soundEnabled || !this.audioContext) return;
            this.createIOSClickSound(300, 0.1, 0.15);
        };

        // Звук ломающейся платформы (очень низкий и короткий)
        this.sounds.break = () => {
            if (!this.soundEnabled || !this.audioContext) return;
            this.createIOSClickSound(150, 0.12, 0.08);
        };

        // Звук окончания игры (мелодия в стиле iOS)
        this.sounds.gameOver = () => {
            if (!this.soundEnabled || !this.audioContext) return;
            this.playIOSGameOverSound();
        };

        // Фоновая музыка (тихая и ненавязчивая)
        this.sounds.background = () => {
            if (!this.soundEnabled || !this.audioContext) return;
            this.playIOSBackgroundMusic();
        };

        // Звук монетки (мелодичный звон)
        this.sounds.coin = () => {
            if (!this.soundEnabled || !this.audioContext) return;
            this.createCoinSound();
        };
    }

    createIOSClickSound(frequency, duration, volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Настройка фильтра для iOS-подобного звука (более низкий)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.audioContext.currentTime);

        // Частота с небольшим вибрато
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(frequency * 0.8, this.audioContext.currentTime + duration);

        // Громкость с плавным затуханием
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playIOSGameOverSound() {
        // Низкая мелодия в стиле iOS
        const notes = [261.63, 233.08, 220.00, 196.00]; // C, A#, A, G (на октаву ниже)
        const noteDuration = 0.25;

        notes.forEach((note, index) => {
            setTimeout(() => {
                this.createIOSClickSound(note, noteDuration, 0.1);
            }, index * noteDuration * 1000);
        });
    }

    createCoinSound() {
        // Создаем мягкий и приятный звук монетки
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        // Подключаем компоненты
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Настройка фильтра для мягкого звука
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        filter.Q.setValueAtTime(0.5, this.audioContext.currentTime);

        // Средняя частота для приятного звука
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.type = 'sine'; // Синусоидальная волна для самого мягкого звука

        // Мягкий и приятный звук
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.06, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        // Запускаем осциллятор
        oscillator.start(now);
        oscillator.stop(now + 0.12);
    }

    loadSkinsFromStorage() {
        // Загружаем информацию о купленных скинах
        const savedSkins = localStorage.getItem('babyVillagerSkins');
        if (savedSkins) {
            const skinsData = JSON.parse(savedSkins);
            Object.keys(skinsData).forEach(skinId => {
                if (this.shop.skins[skinId]) {
                    this.shop.skins[skinId].owned = skinsData[skinId];
                }
            });
        }
    }

    saveSkinsToStorage() {
        // Сохраняем информацию о купленных скинах
        const skinsData = {};
        Object.keys(this.shop.skins).forEach(skinId => {
            skinsData[skinId] = this.shop.skins[skinId].owned;
        });
        localStorage.setItem('babyVillagerSkins', JSON.stringify(skinsData));
    }

    drawSkinPreview(canvas, skinId) {
        const ctx = canvas.getContext('2d');
        const x = canvas.width / 2;
        const y = canvas.height / 2;

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Включаем сглаживание
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Рисуем скин в зависимости от типа
        switch (skinId) {
            case 'default':
                this.drawDefaultSkin(ctx, x, y);
                break;
            case 'golden':
                this.drawGoldenSkin(ctx, x, y);
                break;
            case 'rainbow':
                this.drawRainbowSkin(ctx, x, y);
                break;
            case 'fire':
                this.drawFireSkin(ctx, x, y);
                break;
            case 'ice':
                this.drawIceSkin(ctx, x, y);
                break;
        }
    }

    drawDefaultSkin(ctx, x, y) {
        // Классический скин - коричневый Baby Villager
        ctx.fillStyle = '#8B4513'; // Коричневый
        ctx.fillRect(x - 12, y - 12, 24, 24);

        // Глаза
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 8, y - 8, 4, 4);
        ctx.fillRect(x + 4, y - 8, 4, 4);

        // Зрачки
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 6, y - 6, 2, 2);
        ctx.fillRect(x + 6, y - 6, 2, 2);

        // Рот
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 4, y + 2, 8, 2);
    }

    drawGoldenSkin(ctx, x, y) {
        // Золотой скин
        const gradient = ctx.createLinearGradient(x - 12, y - 12, x + 12, y + 12);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FFA500');
        gradient.addColorStop(1, '#FF8C00');

        ctx.fillStyle = gradient;
        ctx.fillRect(x - 12, y - 12, 24, 24);

        // Глаза
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 8, y - 8, 4, 4);
        ctx.fillRect(x + 4, y - 8, 4, 4);

        // Зрачки
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 6, y - 6, 2, 2);
        ctx.fillRect(x + 6, y - 6, 2, 2);

        // Рот
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 4, y + 2, 8, 2);
    }

    drawRainbowSkin(ctx, x, y) {
        // Радужный скин
        const gradient = ctx.createLinearGradient(x - 12, y - 12, x + 12, y + 12);
        gradient.addColorStop(0, '#FF0000');
        gradient.addColorStop(0.2, '#FF8000');
        gradient.addColorStop(0.4, '#FFFF00');
        gradient.addColorStop(0.6, '#00FF00');
        gradient.addColorStop(0.8, '#0080FF');
        gradient.addColorStop(1, '#8000FF');

        ctx.fillStyle = gradient;
        ctx.fillRect(x - 12, y - 12, 24, 24);

        // Глаза
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 8, y - 8, 4, 4);
        ctx.fillRect(x + 4, y - 8, 4, 4);

        // Зрачки
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 6, y - 6, 2, 2);
        ctx.fillRect(x + 6, y - 6, 2, 2);

        // Рот
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 4, y + 2, 8, 2);
    }

    drawFireSkin(ctx, x, y) {
        // Огненный скин
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
        gradient.addColorStop(0, '#FF4500');
        gradient.addColorStop(0.5, '#FF6347');
        gradient.addColorStop(1, '#DC143C');

        ctx.fillStyle = gradient;
        ctx.fillRect(x - 12, y - 12, 24, 24);

        // Глаза
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 8, y - 8, 4, 4);
        ctx.fillRect(x + 4, y - 8, 4, 4);

        // Зрачки
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 6, y - 6, 2, 2);
        ctx.fillRect(x + 6, y - 6, 2, 2);

        // Рот
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 4, y + 2, 8, 2);

        // Огненные эффекты
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x - 14, y - 10, 2, 4);
        ctx.fillRect(x + 12, y - 8, 2, 6);
        ctx.fillRect(x - 10, y + 8, 3, 2);
        ctx.fillRect(x + 7, y + 10, 3, 2);
    }

    drawIceSkin(ctx, x, y) {
        // Ледяной скин
        const gradient = ctx.createLinearGradient(x - 12, y - 12, x + 12, y + 12);
        gradient.addColorStop(0, '#B0E0E6');
        gradient.addColorStop(0.5, '#87CEEB');
        gradient.addColorStop(1, '#4682B4');

        ctx.fillStyle = gradient;
        ctx.fillRect(x - 12, y - 12, 24, 24);

        // Глаза
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 8, y - 8, 4, 4);
        ctx.fillRect(x + 4, y - 8, 4, 4);

        // Зрачки
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 6, y - 6, 2, 2);
        ctx.fillRect(x + 6, y - 6, 2, 2);

        // Рот
        ctx.fillStyle = 'black';
        ctx.fillRect(x - 4, y + 2, 8, 2);

        // Ледяные кристаллы
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(x - 14, y - 6, 2, 2);
        ctx.fillRect(x + 12, y - 4, 2, 2);
        ctx.fillRect(x - 8, y + 8, 2, 2);
        ctx.fillRect(x + 6, y + 10, 2, 2);
    }

    playIOSBackgroundMusic() {
        if (this.backgroundMusicPlaying) return;
        this.backgroundMusicPlaying = true;

        // Низкая фоновая мелодия в стиле iOS
        const melody = [130.81, 164.81, 196.00, 261.63]; // C, E, G, C (на октаву ниже)
        let noteIndex = 0;

        const playNote = () => {
            if (!this.soundEnabled || this.gameState !== 'playing') {
                this.backgroundMusicPlaying = false;
                return;
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Настройка для мягкого фонового звука
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.audioContext.currentTime);

            oscillator.frequency.setValueAtTime(melody[noteIndex], this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime); // Очень тихо
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 1.5);

            noteIndex = (noteIndex + 1) % melody.length;
            setTimeout(playNote, 3000); // Каждые 3 секунды
        };

        playNote();
    }


    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('soundEnabled', this.soundEnabled.toString());
        this.updateSoundButton();
    }

    updateSoundButton() {
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn) {
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
        }
    }

    init() {
        this.setupEventListeners();
        this.generateInitialPlatforms();
        this.updateUI();
        this.updateSoundButton();
        this.drawMainScreenCharacter();
        this.updateMainScreenStats();
        this.initParallax();
        this.gameLoop();
    }

    setupEventListeners() {
        // Запрещаем контекстное меню для всей игры
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Запрещаем выделение текста для всей игры
        document.addEventListener('selectstart', (e) => {
            e.preventDefault();
            return false;
        });

        // Кнопки
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());

        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.continueGame();
            });
        }

        document.getElementById('menuBtn').addEventListener('click', () => this.showStartScreen());
        document.getElementById('soundBtn').addEventListener('click', () => this.toggleSound());
        document.getElementById('shopBtn').addEventListener('click', () => this.showShop());
        document.getElementById('backFromShopBtn').addEventListener('click', () => this.showStartScreen());
        document.getElementById('doubleJumpBtn').addEventListener('click', () => this.buyDoubleJump());
        document.getElementById('jumpBtn').addEventListener('click', () => this.jump());

        // Обработчики для скинов
        document.querySelectorAll('.skin-item').forEach(item => {
            item.addEventListener('click', () => {
                const skinId = item.getAttribute('data-skin');
                const skin = this.shop.skins[skinId];

                if (skin.owned) {
                    // Если скин куплен, выбираем его
                    this.selectSkin(skinId);
                } else if (this.totalCoins >= skin.price) {
                    // Если скин не куплен, но есть деньги, покупаем
                    this.buySkin(skinId);
                }
            });
        });

        // Управление только горизонтальным движением
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.jump();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Мышь только для горизонтального движения
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
        });

        // Виртуальные кнопки для мобильных устройств
        document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = true;
            this.mobileKeys['ArrowLeft'] = true;
        });

        document.getElementById('leftBtn').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = false;
            this.mobileKeys['ArrowLeft'] = false;
        });

        document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = true;
            this.mobileKeys['ArrowRight'] = true;
        });

        document.getElementById('rightBtn').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = false;
            this.mobileKeys['ArrowRight'] = false;
        });

        // Обычные клики для кнопок (для тестирования на десктопе)
        document.getElementById('leftBtn').addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = true;
        });

        document.getElementById('leftBtn').addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = false;
        });

        document.getElementById('rightBtn').addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = true;
        });

        document.getElementById('rightBtn').addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = false;
        });

        // Убираем касания и клики для прыжков
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
        });
    }

    generateInitialPlatforms() {
        this.platforms = [];

        // Стартовая платформа
        this.platforms.push({
            x: this.canvas.width / 2 - 50,
            y: this.canvas.height - 50,
            width: 100,
            height: 20,
            type: 'normal',
            color: '#8B4513'
        });

        // Генерируем платформы выше (больше платформ для бесконечной игры)
        for (let i = 1; i < 100; i++) {
            this.generatePlatform(i * 80);
        }
    }

    generatePlatform(y) {
        const type = this.platformTypes[Math.floor(Math.random() * this.platformTypes.length)];
        const width = type === 'spring' ? 60 : 80 + Math.random() * 40;
        const x = Math.random() * (this.canvas.width - width);

        const platform = {
            x: x,
            y: y,
            width: width,
            height: 20,
            type: type,
            color: this.getPlatformColor(type),
            velocityX: type === 'moving' ? (Math.random() - 0.5) * 2 : 0,
            direction: type === 'moving' ? (Math.random() > 0.5 ? 1 : -1) : 0,
            broken: false
        };

        this.platforms.push(platform);

        // Добавляем монету на платформу с вероятностью 30%
        if (Math.random() < 0.3) {
            this.coins.push({
                x: x + width / 2 - 10, // Центр платформы
                y: y - 30, // Над платформой
                width: 20,
                height: 20,
                collected: false,
                animation: 0,
                value: 1
            });
        }

        // Добавляем реактивный ранец на каждые 500 единиц высоты
        const heightInterval = 500;
        const currentHeight = Math.abs(y);
        const jetpackHeight = Math.floor(currentHeight / heightInterval) * heightInterval;

        if (Math.abs(currentHeight - jetpackHeight) < 50 && Math.random() < 0.15) {
            this.jetpacks.push({
                x: x + width / 2 - 12, // Центр платформы
                y: y - 35, // Над платформой
                size: 24,
                collected: false,
                animation: 0
            });
        }
    }

    getPlatformColor(type) {
        const colors = {
            'normal': '#8B4513',
            'moving': '#A0522D',
            'breakable': '#CD853F',
            'spring': '#32CD32'
        };
        return colors[type] || '#8B4513';
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.continueAttempts = 2; // Сбрасываем количество попыток
        this.fallingStartCameraY = null;
        this.fallingStartScore = null;
        this.startPlayerY = undefined;
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 30,
            height: 30,
            velocityY: 0,
            velocityX: 0,
            onGround: false,
            jumpPower: -15,
            maxSpeed: 8,
            doubleJumpAvailable: false,
            doubleJumpUsed: false
        };
        this.camera.y = 0;
        this.platforms = [];
        this.generateInitialPlatforms();

        // Устанавливаем призрака на высоту последнего счета
        this.setupGhost();

        this.showGameScreen();
        this.updateUI();
        
        // Уведомляем Яндекс.Игры, что игровой процесс начался
        this.callGameplayStart();

        // Запускаем фоновую музыку
        this.sounds.background();
    }

    setupGhost() {
        if (this.lastScore > 0) {
            // Конвертируем счет в высоту (примерно 10 пикселей за очко)
            this.ghost.y = this.canvas.height - this.lastScore * 10;
            this.ghost.visible = true;
            this.ghost.animation = 0;
        } else {
            this.ghost.visible = false;
        }

        // Генерируем фейковых призраков
        this.generateFakeGhosts();
    }

    generateFakeGhosts() {
        this.fakeGhosts = [];
        // Плавное распределение призраков по высотам:
        // 1-2500: часто (90-70%)
        // 2500-5000: пореже (70-40%) 
        // 5000-7500: еще реже (40-15%)
        // 7500-10000: совсем редко (15-5%)

        for (let score = 50; score <= 20000; score += 25) { // Увеличили до 20000 для покрытия больших высот
            let probability;

            if (score <= 2500) {
                // 1-2500: часто появляются (90-70%)
                probability = 0.90 - (score - 50) / 2450 * 0.20; // От 90% до 70%
            } else if (score <= 5000) {
                // 2500-5000: пореже (70-40%)
                probability = 0.70 - (score - 2500) / 2500 * 0.30; // От 70% до 40%
            } else if (score <= 7500) {
                // 5000-7500: еще реже (40-15%)
                probability = 0.40 - (score - 5000) / 2500 * 0.25; // От 40% до 15%
            } else if (score <= 10000) {
                // 7500-10000: совсем редко (15-5%)
                probability = 0.15 - (score - 7500) / 2500 * 0.10; // От 15% до 5%
            } else {
                // 10000+: минимальная вероятность, но не нулевая (5-2%)
                probability = Math.max(0.02, 0.05 - (score - 10000) / 10000 * 0.03); // От 5% до 2%
            }

            // Проверяем, должен ли появиться призрак на этой высоте
            if (Math.random() < probability) {
                // Добавляем небольшую случайность к высоте
                const randomOffset = Math.floor(Math.random() * 20) - 10; // ±10 очков
                const finalScore = Math.max(20, score + randomOffset);

                this.addFakeGhost(finalScore);
            }
        }

        // Гарантируем призраков на каждом уровне - добавляем недостающих
        const levelRanges = [
            { min: 50, max: 2500, step: 200, minCount: 8 },    // Низкие уровни
            { min: 2500, max: 5000, step: 300, minCount: 5 },  // Средние уровни  
            { min: 5000, max: 7500, step: 400, minCount: 3 },  // Высокие уровни
            { min: 7500, max: 10000, step: 500, minCount: 2 }, // Очень высокие уровни
            { min: 10000, max: 15000, step: 1000, minCount: 1 }, // Экстремальные высоты
            { min: 15000, max: 20000, step: 2000, minCount: 1 }  // Максимальные высоты
        ];

        for (const range of levelRanges) {
            let countInRange = 0;
            // Подсчитываем призраков в этом диапазоне
            for (const ghost of this.fakeGhosts) {
                const ghostScore = (this.canvas.height - ghost.y) / 10;
                if (ghostScore >= range.min && ghostScore <= range.max) {
                    countInRange++;
                }
            }

            // Добавляем недостающих призраков
            while (countInRange < range.minCount) {
                const score = range.min + Math.floor(Math.random() * (range.max - range.min));
                this.addFakeGhost(score);
                countInRange++;
            }
        }
    }

    addFakeGhost(score) {
        const fakeHeight = this.canvas.height - score * 10;

        // Проверяем, что фейковый призрак не слишком близко к реальному
        if (this.lastScore > 0 && Math.abs(fakeHeight - this.ghost.y) < 80) {
            return;
        }

        // Проверяем, что призрак не слишком близко к другим
        for (let existingGhost of this.fakeGhosts) {
            if (Math.abs(fakeHeight - existingGhost.y) < 60) {
                return;
            }
        }

        const fakeGhost = {
            name: this.generateRandomNickname(),
            y: fakeHeight,
            score: score,
            animation: Math.random() * Math.PI * 2,
            color: this.getRandomGhostColor(),
            style: Math.floor(Math.random() * 3)
        };

        this.fakeGhosts.push(fakeGhost);

        // Ограничиваем общее количество призраков (не более 100)
        // Удаляем только призраков с низких высот, чтобы сохранить высокие
        if (this.fakeGhosts.length > 100) {
            // Сортируем по высоте (по убыванию) и удаляем самые низкие
            this.fakeGhosts.sort((a, b) => b.y - a.y);
            this.fakeGhosts.splice(-10, 10); // Удаляем 10 самых низких
        }
    }

    generateRandomNickname() {
        const prefix = this.nicknamePrefixes[Math.floor(Math.random() * this.nicknamePrefixes.length)];
        const suffix = this.nicknameSuffixes[Math.floor(Math.random() * this.nicknameSuffixes.length)];

        // 70% шанс на prefix + suffix, 30% только prefix
        if (Math.random() < 0.7) {
            return prefix + suffix;
        } else {
            return prefix;
        }
    }

    getRandomGhostColor() {
        const colors = [
            '#E0E0E0', // Светло-серый
            '#FFE0E0', // Светло-розовый
            '#E0FFE0', // Светло-зеленый
            '#E0E0FF', // Светло-синий
            '#FFF0E0', // Светло-оранжевый
            '#F0E0FF'  // Светло-фиолетовый
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    showStartScreen() {
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('shopScreen').classList.add('hidden');
        this.gameState = 'start';
    }

    showShop() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('shopScreen').classList.remove('hidden');
        this.updateShopScreen();
        this.updateShopSkins();
    }

    updateShopScreen() {
        // Обновляем счетчик монет в магазине
        const shopCoinCountElement = document.getElementById('shopCoinCount');
        if (shopCoinCountElement) {
            shopCoinCountElement.textContent = this.totalCoins;
        }

        // Отрисовываем иконку монеты в магазине
        this.drawShopCoinIcon();

        // Обновляем состояние кнопок магазина
        this.updateShopButtons();
    }

    drawShopCoinIcon() {
        const canvas = document.getElementById('shopCoinIcon');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        const animation = Date.now() * 0.01;

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Анимация парения
        const floatOffset = Math.sin(animation * 0.8) * 1;
        const currentY = y + floatOffset;

        // Включаем сглаживание для лучшего качества
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Простой золотой круг (как в иконке) - увеличенный размер
        ctx.fillStyle = '#FFD700'; // Яркий золотой цвет
        ctx.beginPath();
        ctx.arc(x, currentY, 18, 0, Math.PI * 2); // Увеличиваем радиус с 9 до 18
        ctx.fill();

        // Белая буква "Р" в центре - увеличенный шрифт
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial'; // Увеличиваем шрифт с 9px до 18px
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Р', x, currentY);
    }

    showGameScreen() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
    }

    showGameOverScreen() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.remove('hidden');
        this.gameState = 'gameOver';

        // Сохраняем позицию камеры и счет для продолжения
        // Используем сохраненные значения падения, если они есть
        this.savedCameraY = this.fallingStartCameraY || this.camera.y;
        this.savedScore = this.fallingStartScore || this.score;

        const finalScore = document.getElementById('finalScore');
        const newRecord = document.getElementById('newRecord');
        const continueBtn = document.getElementById('continueBtn');

        finalScore.textContent = `Ваш счет: ${this.score}`;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('babyVillagerHighScore', this.highScore.toString());
            newRecord.classList.remove('hidden');
        } else {
            newRecord.classList.add('hidden');
        }

        // Показываем кнопку продолжения только если есть попытки
        if (this.continueAttempts > 0) {
            continueBtn.style.display = 'flex';
            continueBtn.innerHTML = `<span class="ad-icon">📺</span> Продолжить (${this.continueAttempts})`;
        } else {
            continueBtn.style.display = 'none';
        }

        // Уведомляем Яндекс.Игры, что игровой процесс остановлен
        this.callGameplayStop();

        this.updateUI();
    }

    continueGame() {
        console.log('Нажата кнопка "Продолжить"');

        // Показываем рекламу для продолжения игры
        if (typeof YaGames !== 'undefined' && window.ysdk) {
            console.log('Показываем рекламу...');
            window.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        console.log('Реклама для продолжения открыта');
                    },
                    onRewarded: () => {
                        console.log('Игрок получил награду за просмотр рекламы');
                        this.resumeGame();
                    },
                    onClose: () => {
                        console.log('Реклама для продолжения закрыта');
                    },
                    onError: (error) => {
                        console.log('Ошибка рекламы для продолжения:', error);
                        // Если реклама не загрузилась, продолжаем игру бесплатно
                        this.resumeGame();
                    }
                }
            });
        } else {
            // Если SDK не загружен, продолжаем игру бесплатно
            console.log('SDK не загружен, продолжаем без рекламы');
            this.resumeGame();
        }
    }

    resumeGame() {
        // Продолжаем игру с того же места
        this.gameState = 'playing';

        // Уменьшаем количество попыток
        this.continueAttempts--;

        // Восстанавливаем сохраненную позицию камеры и счет
        this.camera.y = this.savedCameraY || this.camera.y;
        this.score = this.savedScore || this.score;

        // Позиционируем игрока на безопасной высоте относительно камеры
        // Игрок должен быть виден на экране
        const targetPlayerY = this.camera.y + this.canvas.height * 0.3;
        this.player.y = targetPlayerY;

        // Сохраняем стартовую позицию игрока для расчета счета
        this.startPlayerY = this.player.y;

        console.log('Продолжение игры - настройка:');
        console.log('- Восстановленная камера:', this.camera.y);
        console.log('- Восстановленный счет:', this.score);
        console.log('- Позиция игрока:', this.player.y);
        console.log('- Стартовая позиция игрока:', this.startPlayerY);
        this.player.velocityY = 0;
        this.player.velocityX = 0;
        this.player.onGround = false;

        // Генерируем платформы вокруг новой позиции игрока
        this.generatePlatformsAroundPlayer();

        this.showGameScreen();
        this.updateUI();
        
        // Уведомляем Яндекс.Игры, что игровой процесс возобновился
        this.callGameplayStart();

        // Запускаем фоновую музыку
        this.sounds.background();
    }

    generatePlatformsAroundPlayer() {
        // Генерируем платформы в радиусе вокруг игрока
        const playerY = this.player.y;
        const platformSpacing = 80;
        const range = 400; // Генерируем платформы в радиусе 400 пикселей

        // Очищаем старые платформы
        this.platforms = [];

        // Генерируем платформы выше и ниже игрока
        for (let y = playerY - range; y <= playerY + range; y += platformSpacing) {
            // Пропускаем если платформа слишком близко к игроку
            if (Math.abs(y - playerY) < 50) continue;

            this.generatePlatform(y);
        }

        // Добавляем стартовую платформу под игроком
        this.platforms.push({
            x: this.player.x - 50,
            y: playerY + 50,
            width: 100,
            height: 20,
            type: 'normal',
            color: '#8B4513'
        });

        // Генерируем дополнительные платформы выше для продолжения игры
        this.generateAdditionalPlatformsAbove(playerY);
    }

    generateAdditionalPlatformsAbove(startY) {
        // Генерируем платформы выше стартовой позиции для бесконечной игры
        const platformSpacing = 80;
        const maxHeight = startY - 2000; // Генерируем на 2000 пикселей выше

        for (let y = startY - 200; y >= maxHeight; y -= platformSpacing) {
            this.generatePlatform(y);
        }
    }

    restartGame() {
        // Сохраняем текущий счет как последний
        this.lastScore = this.score;
        localStorage.setItem('babyVillagerLastScore', this.lastScore.toString());

        // Обновляем рекорд если нужно
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('babyVillagerHighScore', this.highScore.toString());
        }

        // Полный перезапуск игры
        this.gameState = 'playing';
        this.score = 0;
        this.continueAttempts = 2; // Сбрасываем количество попыток
        this.fallingStartCameraY = null;
        this.fallingStartScore = null;
        this.startPlayerY = undefined;
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 30,
            height: 30,
            velocityY: 0,
            velocityX: 0,
            onGround: false,
            jumpPower: -15,
            maxSpeed: 8,
            doubleJumpAvailable: false,
            doubleJumpUsed: false
        };
        this.camera.y = 0;
        this.platforms = [];
        this.coins = [];
        this.jetpacks = [];
        this.playerJetpackActive = false;
        this.jetpackTimeLeft = 0;
        this.generateInitialPlatforms();

        // Устанавливаем призрака на новую высоту
        this.setupGhost();

        this.showGameScreen();
        this.updateUI();
        
        // Уведомляем Яндекс.Игры, что игровой процесс начался заново
        this.callGameplayStart();

        // Запускаем фоновую музыку
        this.sounds.background();
    }

    jump() {
        if (this.gameState !== 'playing') return;

        if (this.shop.doubleJumpCount > 0 && this.player.doubleJumpAvailable && !this.player.doubleJumpUsed) {
            // Двойной прыжок в воздухе - тратим один прыжок
            this.player.velocityY = this.player.jumpPower * 1.0; // Такая же высота как обычный прыжок
            this.player.doubleJumpUsed = true;
            this.shop.doubleJumpCount--; // Тратим один двойной прыжок
            localStorage.setItem('babyVillagerDoubleJumpCount', this.shop.doubleJumpCount.toString());
            this.sounds.jump();
        }
    }

    autoJump() {
        // Автоматический прыжок при приземлении на платформу
        if (this.gameState !== 'playing') return;

        if (this.player.onGround) {
            this.player.velocityY = this.player.jumpPower;
            this.player.onGround = false;
            this.player.doubleJumpAvailable = true; // Двойной прыжок доступен после автоматического прыжка
            this.player.doubleJumpUsed = false;
            this.sounds.jump();
        }
    }

    updatePlayer() {
        if (this.gameState !== 'playing') return;

        // Нормализуем deltaTime к 60 FPS (16.67ms)
        const timeScale = this.deltaTime / 16.67;
        
        // Горизонтальное движение - одинаковая скорость для всех устройств
        let acceleration = 0.8 * timeScale; // Уменьшенное ускорение для плавности
        
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.velocityX = Math.max(this.player.velocityX - acceleration, -this.player.maxSpeed);
        } else if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.velocityX = Math.min(this.player.velocityX + acceleration, this.player.maxSpeed);
        } else {
            this.player.velocityX *= Math.pow(this.friction, timeScale);
        }

        // Применяем гравитацию или эффект реактивного ранца
        if (this.playerJetpackActive) {
            // Реактивный ранец - плавное набирание скорости
            const jetpackAcceleration = 0.8 * timeScale; // Ускорение ранца (увеличено)
            const maxJetpackSpeed = -18; // Максимальная скорость вверх от ранца (увеличено)

            // Плавно набираем скорость до максимума
            if (this.player.velocityY > maxJetpackSpeed) {
                this.player.velocityY -= jetpackAcceleration;
            }

            // Ограничиваем максимальную скорость
            if (this.player.velocityY < maxJetpackSpeed) {
                this.player.velocityY = maxJetpackSpeed;
            }
        } else {
            // Обычная гравитация
            this.player.velocityY += this.gravity * timeScale;
        }

        // Обновляем позицию
        this.player.x += this.player.velocityX * timeScale;
        this.player.y += this.player.velocityY * timeScale;

        // Обновляем состояние анимации
        this.updateAnimationState();

        // Ограничиваем движение по горизонтали
        if (this.player.x < 0) {
            this.player.x = this.canvas.width;
        } else if (this.player.x > this.canvas.width) {
            this.player.x = 0;
        }

        // Проверяем коллизии с платформами
        this.checkPlatformCollisions();

        // Автоматический прыжок при приземлении
        this.autoJump();

        // Обновляем камеру
        this.updateCamera();

        // Проверяем смерть и показываем Game Over экран
        if (this.player.y > this.camera.y + this.canvas.height + 300) {
            this.sounds.gameOver();
            this.showGameOverScreen();
        }

        // Сохраняем позицию камеры когда игрок начинает падать
        // Это нужно для правильного расчета счета при продолжении
        if (this.player.velocityY > 0 && this.player.y > this.camera.y + this.canvas.height * 0.5) {
            // Игрок падает и находится в нижней половине экрана
            if (!this.fallingStartCameraY) {
                this.fallingStartCameraY = this.camera.y;
                this.fallingStartScore = this.score;
            }
        } else {
            // Игрок не падает или находится в верхней части экрана
            this.fallingStartCameraY = null;
            this.fallingStartScore = null;
        }

        // Генерируем новые платформы
        this.generateNewPlatforms();
    }

    checkPlatformCollisions() {
        this.player.onGround = false;

        for (let platform of this.platforms) {
            if (platform.broken) continue;

            if (this.player.x < platform.x + platform.width &&
                this.player.x + this.player.width > platform.x &&
                this.player.y + this.player.height > platform.y &&
                this.player.y + this.player.height < platform.y + platform.height + 10 &&
                this.player.velocityY > 0) {

                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.onGround = true;
                this.player.doubleJumpAvailable = true; // Двойной прыжок доступен после столкновения с любой платформой
                this.player.doubleJumpUsed = false;

                // Обработка разных типов платформ
                this.handlePlatformType(platform);
            }
        }
    }

    handlePlatformType(platform) {
        switch (platform.type) {
            case 'spring':
                this.player.velocityY = this.player.jumpPower * 1.5;
                this.player.onGround = false;
                this.sounds.spring();
                break;
            case 'breakable':
                platform.broken = true;
                this.sounds.break();
                setTimeout(() => {
                    const index = this.platforms.indexOf(platform);
                    if (index > -1) {
                        this.platforms.splice(index, 1);
                    }
                }, 100);
                break;
        }
    }

    updateCamera() {
        // Камера следует за персонажем в обе стороны (вверх и вниз)
        const targetY = this.player.y - this.canvas.height * 0.6;
        const cameraSpeed = 0.1;
        this.camera.y = this.camera.y + (targetY - this.camera.y) * cameraSpeed;
    }

    generateNewPlatforms() {
        // Генерируем платформы только сверху бесконечно
        const highestPlatform = Math.min(...this.platforms.map(p => p.y));

        // Генерируем платформы сверху
        if (highestPlatform > this.camera.y - 200) {
            this.generatePlatform(highestPlatform - 80);
        }

        // Очищаем старые платформы для оптимизации
        this.cleanupOldPlatforms();
    }

    cleanupOldPlatforms() {
        // Удаляем платформы, которые ушли за нижнюю границу экрана
        this.platforms = this.platforms.filter(platform =>
            platform.y > this.camera.y - 400 &&
            platform.y < this.camera.y + this.canvas.height + 100
        );
    }

    updatePlatforms() {
        const timeScale = this.deltaTime / 16.67;
        
        for (let platform of this.platforms) {
            if (platform.type === 'moving') {
                platform.x += platform.velocityX * platform.direction * timeScale;

                if (platform.x <= 0 || platform.x + platform.width >= this.canvas.width) {
                    platform.direction *= -1;
                }
            }

        }
    }

    updateCoins() {
        const timeScale = this.deltaTime / 16.67;
        
        for (let coin of this.coins) {
            if (!coin.collected) {
                coin.animation += 0.2 * timeScale;

                // Проверяем столкновение с игроком
                if (this.player.x < coin.x + coin.width &&
                    this.player.x + this.player.width > coin.x &&
                    this.player.y < coin.y + coin.height &&
                    this.player.y + this.player.height > coin.y) {

                    coin.collected = true;
                    this.coinsCollected++;
                    this.totalCoins++;
                    localStorage.setItem('babyVillagerCoins', this.totalCoins.toString());

                    // Звук сбора монеты
                    this.sounds.coin();
                }
            }
        }

        // Удаляем собранные монеты и монеты, ушедшие за нижнюю границу экрана
        this.coins = this.coins.filter(coin => {
            if (coin.collected) return false;

            // Удаляем монеты, которые ушли за нижнюю границу экрана
            const coinBottom = coin.y + coin.height;
            const screenBottom = this.camera.y + this.canvas.height;

            if (coinBottom > screenBottom + 100) { // +100 для буфера
                return false;
            }

            return true;
        });
    }

    updateJetpacks() {
        const timeScale = this.deltaTime / 16.67;
        
        for (let jetpack of this.jetpacks) {
            if (!jetpack.collected) {
                jetpack.animation += 0.15 * timeScale;

                // Проверяем столкновение с игроком
                if (this.player.x < jetpack.x + jetpack.size &&
                    this.player.x + this.player.width > jetpack.x &&
                    this.player.y < jetpack.y + jetpack.size &&
                    this.player.y + this.player.height > jetpack.y) {

                    jetpack.collected = true;
                    this.playerJetpackActive = true;
                    this.jetpackTimeLeft = this.jetpackDuration;

                    // Звук сбора реактивного ранца
                    this.sounds.coin(); // Используем тот же звук, что и для монет
                }
            }
        }

        // Удаляем собранные ранцы и ранцы, ушедшие за нижнюю границу экрана
        this.jetpacks = this.jetpacks.filter(jetpack => {
            if (jetpack.collected) return false;

            // Удаляем ранцы, которые ушли за нижнюю границу экрана
            const jetpackBottom = jetpack.y + jetpack.size;
            const screenBottom = this.camera.y + this.canvas.height;

            if (jetpackBottom > screenBottom + 100) { // +100 для буфера
                return false;
            }

            return true;
        });

        // Обновляем состояние реактивного ранца игрока
        if (this.playerJetpackActive) {
            this.jetpackTimeLeft -= this.deltaTime; // Используем реальное время

            if (this.jetpackTimeLeft <= 0) {
                this.playerJetpackActive = false;
                this.jetpackTimeLeft = 0;
            }
        }
    }

    updateScore() {
        // При продолжении игры используем startPlayerY, иначе обычный расчет
        if (this.startPlayerY !== undefined) {
            // Продолжение игры - считаем от стартовой позиции игрока + сохраненный счет
            const currentHeight = this.startPlayerY - this.player.y;
            const additionalScore = Math.max(0, Math.floor(currentHeight / 10));
            const newScore = this.savedScore + additionalScore;

            if (newScore > this.score) {
                this.score = newScore;
                this.updateUI();
            }
        } else {
            // Обычная игра - считаем от высоты экрана
            const currentHeight = this.canvas.height - this.player.y;
            const newScore = Math.max(0, Math.floor(currentHeight / 10));

            if (newScore > this.score) {
                this.score = newScore;
                this.updateUI();
            }
        }
    }

    updateGhost() {
        if (this.ghost.visible) {
            // Анимация призрака (плавное покачивание)
            this.ghost.animation += 0.1;
        }

        // Обновляем анимацию фейковых призраков
        for (let fakeGhost of this.fakeGhosts) {
            fakeGhost.animation += 0.05 + Math.random() * 0.05; // Разная скорость анимации
        }
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;

        // Обновляем счетчик монет
        const coinCountElement = document.getElementById('coinCount');
        if (coinCountElement) {
            coinCountElement.textContent = this.totalCoins;
        }

        // Обновляем счетчик двойных прыжков
        const doubleJumpCountElement = document.getElementById('doubleJumpCount');
        if (doubleJumpCountElement) {
            doubleJumpCountElement.textContent = this.shop.doubleJumpCount;
        }


        // Отрисовываем иконку монеты
        this.drawCoinIcon();

        // Обновляем статистику на главном экране
        this.updateMainScreenStats();
    }

    updateMainScreenStats() {
        // Обновляем рекорд на главном экране
        const mainHighScoreElement = document.getElementById('mainHighScore');
        if (mainHighScoreElement) {
            mainHighScoreElement.textContent = this.highScore;
        }

        // Обновляем количество монет на главном экране
        const mainCoinCountElement = document.getElementById('mainCoinCount');
        if (mainCoinCountElement) {
            mainCoinCountElement.textContent = this.totalCoins;
        }

        // Отрисовываем иконку монеты на главном экране
        this.drawMainCoinIcon();

        // Обновляем состояние кнопок магазина
        this.updateShopButtons();
        
        // Обновляем версию игры на главном экране
        this.updateGameVersion();
    }

    updateGameVersion() {
        const versionElement = document.querySelector('.version-info');
        if (versionElement) {
            versionElement.textContent = `Версия ${GAME_VERSION}`;
        }
    }

    updateMobileJumpButton() {
        const jumpBtn = document.getElementById('jumpBtn');
        if (jumpBtn) {
            // Кнопка активна только если есть двойные прыжки и игрок может их использовать
            const canUseDoubleJump = this.shop.doubleJumpCount > 0 &&
                this.player.doubleJumpAvailable &&
                !this.player.doubleJumpUsed;


            jumpBtn.disabled = !canUseDoubleJump;


            if (canUseDoubleJump) {
                jumpBtn.style.background = 'rgba(0, 150, 0, 0.3)';
                jumpBtn.style.borderColor = 'rgba(0, 255, 0, 0.8)';
            } else {
                jumpBtn.style.background = 'rgba(0, 0, 0, 0.2)';
                jumpBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
        }
    }

    initParallax() {
        // Облака рисуются динамически в drawClouds()

        // Горы убраны

        // Деревья убраны - они мешают видимости персонажа
    }

    // getMountainColor убрана - горы больше не используются

    // getTreeColor убрана - деревья больше не используются

    updateParallax() {
        // Обновляем только во время игры
        if (this.gameState !== 'playing') return;

        // Обновляем время суток
        this.updateTimeOfDay();

        // Облака рисуются динамически в drawClouds()

        // Деревья убраны
    }

    updateTimeOfDay() {
        const currentHeight = Math.abs(this.camera.y);

        // Циклическая смена фона без сброса камеры
        const cycleHeight = currentHeight % this.cycleHeight;

        if (cycleHeight > this.nightHeight) {
            this.timeOfDay = 'night';
        } else {
            this.timeOfDay = 'day';
        }
    }

    drawParallax() {
        // Рисуем небо с градиентом (самый задний план)
        this.drawSky();

        // Рисуем облака (передний план)
        this.drawClouds();
    }

    drawSky() {
        // Небо должно покрывать всю видимую область с учетом камеры
        const skyY = this.camera.y;
        const skyHeight = this.canvas.height + Math.abs(this.camera.y);

        const gradient = this.ctx.createLinearGradient(0, skyY, 0, skyY + skyHeight);

        switch (this.timeOfDay) {
            case 'day':
                gradient.addColorStop(0, '#87CEEB'); // Небесно-голубой
                gradient.addColorStop(1, '#E0F6FF'); // Светло-голубой
                break;
            case 'night':
                gradient.addColorStop(0, '#191970'); // Полуночно-синий
                gradient.addColorStop(0.7, '#000080'); // Темно-синий
                gradient.addColorStop(1, '#000000'); // Черный
                break;
        }

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, skyY, this.canvas.width, skyHeight);

        // Рисуем звезды ночью
        if (this.timeOfDay === 'night') {
            this.drawStars();
        }
    }

    drawStars() {
        this.ctx.fillStyle = 'white';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.canvas.width;
            const y = this.camera.y + (i * 23) % (this.canvas.height / 2);
            const size = Math.random() * 2;

            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    updateShopButtons() {
        const doubleJumpBtn = document.getElementById('doubleJumpBtn');
        if (doubleJumpBtn) {
            if (this.totalCoins >= this.shop.prices.doubleJump) {
                doubleJumpBtn.innerHTML = `
                    <span class="shop-icon">🦘</span>
                    <div class="shop-item-info">
                        <span class="shop-item-name">Двойной прыжок</span>
                        <span class="shop-item-desc">50 монет (1 прыжок)</span>
                    </div>
                    <span class="shop-price">50</span>
                `;
                doubleJumpBtn.disabled = false;
                doubleJumpBtn.style.background = 'rgba(0, 150, 0, 0.3)';
            } else {
                doubleJumpBtn.innerHTML = `
                    <span class="shop-icon">🦘</span>
                    <div class="shop-item-info">
                        <span class="shop-item-name">Двойной прыжок</span>
                        <span class="shop-item-desc">50 монет (1 прыжок)</span>
                    </div>
                    <span class="shop-price">50</span>
                `;
                doubleJumpBtn.disabled = true;
                doubleJumpBtn.style.background = 'rgba(0, 0, 0, 0.2)';
            }
        }
    }

    updateShopSkins() {
        // Проверяем, что shop.skins инициализирован
        if (!this.shop || !this.shop.skins) {
            return;
        }
        
        // Обновляем превью скинов
        Object.keys(this.shop.skins).forEach(skinId => {
            const skinItem = document.querySelector(`[data-skin="${skinId}"]`);
            if (skinItem) {
                const canvas = skinItem.querySelector('.skin-preview');
                const priceElement = skinItem.querySelector('.skin-price');
                const skin = this.shop.skins[skinId];

                // Рисуем превью
                if (canvas) {
                    this.drawSkinPreview(canvas, skinId);
                }

                // Обновляем цену
                if (priceElement) {
                    const texts = this.getTexts();
                    if (skin.owned) {
                        if (skinId === this.shop.currentSkin) {
                            priceElement.textContent = texts.skinSelected;
                        } else {
                            priceElement.textContent = texts.skinOwned;
                        }
                    } else {
                        if (skinId === 'default') {
                            priceElement.textContent = texts.skinFree;
                        } else {
                            priceElement.textContent = skin.price.toString();
                        }
                    }
                }

                // Обновляем классы
                skinItem.classList.remove('owned', 'selected');
                if (skin.owned) {
                    skinItem.classList.add('owned');
                }
                if (skinId === this.shop.currentSkin) {
                    skinItem.classList.add('selected');
                }
            }
        });
    }

    buyDoubleJump() {
        if (this.totalCoins >= this.shop.prices.doubleJump) {
            this.totalCoins -= this.shop.prices.doubleJump;
            this.shop.doubleJumpCount += 1; // Покупаем 1 двойной прыжок за 50 монет

            // Сохраняем в localStorage
            localStorage.setItem('babyVillagerCoins', this.totalCoins.toString());
            localStorage.setItem('babyVillagerDoubleJumpCount', this.shop.doubleJumpCount.toString());

            // Обновляем UI
            this.updateMainScreenStats();
            this.updateShopScreen();

            // Звук покупки
            this.sounds.coin();
        }
    }

    buySkin(skinId) {
        const skin = this.shop.skins[skinId];
        if (skin && !skin.owned && this.totalCoins >= skin.price) {
            this.totalCoins -= skin.price;
            skin.owned = true;
            localStorage.setItem('babyVillagerCoins', this.totalCoins.toString());
            this.saveSkinsToStorage();
            this.updateUI();
            this.updateShopSkins();
            this.sounds.coin();
        }
    }

    selectSkin(skinId) {
        const skin = this.shop.skins[skinId];
        if (skin && skin.owned) {
            this.shop.currentSkin = skinId;
            localStorage.setItem('babyVillagerCurrentSkin', skinId);
            this.updateShopSkins();
            this.drawMainScreenCharacter(); // Обновляем персонажа на главном экране
        }
    }

    drawMainCoinIcon() {
        const canvas = document.getElementById('mainCoinIcon');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        const animation = Date.now() * 0.01;

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Анимация парения
        const floatOffset = Math.sin(animation * 0.8) * 1;
        const currentY = y + floatOffset;

        // Включаем сглаживание для лучшего качества
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Простой золотой круг (как в иконке) - увеличенный размер
        ctx.fillStyle = '#FFD700'; // Яркий золотой цвет
        ctx.beginPath();
        ctx.arc(x, currentY, 18, 0, Math.PI * 2); // Увеличиваем радиус с 9 до 18
        ctx.fill();

        // Белая буква "Р" в центре - увеличенный шрифт
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial'; // Увеличиваем шрифт с 9px до 18px
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Р', x, currentY);
    }

    drawCoinIcon() {
        const canvas = document.getElementById('coinIcon');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        const animation = Date.now() * 0.01;

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Анимация парения
        const floatOffset = Math.sin(animation * 0.8) * 1.5;
        const currentY = y + floatOffset;

        // Включаем сглаживание для лучшего качества
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Простой золотой круг (как в иконке) - увеличенный размер
        ctx.fillStyle = '#FFD700'; // Яркий золотой цвет
        ctx.beginPath();
        ctx.arc(x, currentY, 24, 0, Math.PI * 2); // Увеличиваем радиус с 12 до 24
        ctx.fill();

        // Белая буква "Р" в центре - увеличенный шрифт
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial'; // Увеличиваем шрифт с 12px до 24px
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Р', x, currentY);
    }

    render() {
        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState !== 'playing') return;

        // Сохраняем контекст
        this.ctx.save();

        // Применяем камеру
        this.ctx.translate(0, -this.camera.y);

        // Рисуем параллакс (включает небо, горы, деревья, облака)
        this.drawParallax();

        // Рисуем платформы
        this.drawPlatforms();

        // Рисуем фейковых призраков
        this.drawFakeGhosts();

        // Рисуем призрака
        this.drawGhost();

        // Рисуем игрока
        this.drawPlayer();

        // Восстанавливаем контекст
        this.ctx.restore();
    }

    drawBackground() {
        // Градиентный фон
        const gradient = this.ctx.createLinearGradient(0, this.camera.y, 0, this.camera.y + this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#98FB98');
        gradient.addColorStop(1, '#90EE90');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, this.camera.y, this.canvas.width, this.canvas.height);

        // Облака
        this.drawClouds();
    }

    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        // Оптимизация: рисуем только видимые облака
        const startY = this.camera.y;
        const endY = this.camera.y + this.canvas.height;

        for (let i = 0; i < 8; i++) {
            // Горизонтальное движение с циклическим возвратом
            let x = (i * 150 + this.frameCount * 0.3) % (this.canvas.width + 200) - 100;
            const y = this.camera.y + 50 + (i * 60) % 150;

            // Если облако ушло за левый край, возвращаем его справа
            if (x < -100) {
                x = this.canvas.width + 100 + (i * 50) % 100;
            }

            // Рисуем только если облако в видимой области
            if (y >= startY - 50 && y <= endY + 50) {
                this.drawCloud(x, y);
            }
        }
    }

    drawCloud(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
        this.ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        this.ctx.arc(x + 25, y - 15, 20, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPlatforms() {
        // Оптимизация: рисуем только видимые платформы
        const visiblePlatforms = this.platforms.filter(platform => {
            if (platform.broken) return false;
            const screenY = platform.y - this.camera.y;
            return screenY >= -50 && screenY <= this.canvas.height + 50;
        });


        for (let platform of visiblePlatforms) {
            if (!platform.broken) {
                this.ctx.fillStyle = platform.color;
                this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

                // Детали платформы
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                this.ctx.fillRect(platform.x, platform.y, platform.width, 5);

                // Специальные эффекты
                if (platform.type === 'spring') {
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.fillRect(platform.x + platform.width / 2 - 10, platform.y - 5, 20, 5);
                }
            }
        }

        // Отрисовка монет
        this.drawCoins();

        // Отрисовка реактивных ранцев
        this.drawJetpacks();
    }

    drawCoins() {
        const visibleCoins = this.coins.filter(coin => {
            if (coin.collected) return false;
            const screenY = coin.y - this.camera.y;
            return screenY >= -50 && screenY <= this.canvas.height + 50;
        });

        for (let coin of visibleCoins) {
            // Анимация парения (вертикальное движение) - замедленная
            const floatOffset = Math.sin(coin.animation * 0.8) * 3;
            const currentY = coin.y + floatOffset;

            this.ctx.save();
            this.ctx.translate(coin.x + coin.width / 2, currentY + coin.height / 2);

            // Отключаем сглаживание для четкого pixel art
            this.ctx.imageSmoothingEnabled = false;

            // Простой золотой круг (как в иконке) - фиксированный радиус
            this.ctx.fillStyle = '#FFD700'; // Яркий золотой цвет
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 10, 0, Math.PI * 2); // Фиксированный радиус 10
            this.ctx.fill();

            // Белая буква "Р" в центре
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Р', 0, 0);

            this.ctx.restore();
        }
    }

    drawJetpacks() {
        const visibleJetpacks = this.jetpacks.filter(jetpack => {
            if (jetpack.collected) return false;
            const screenY = jetpack.y - this.camera.y;
            return screenY >= -50 && screenY <= this.canvas.height + 50;
        });

        for (let jetpack of visibleJetpacks) {
            // Анимация парения (вертикальное движение)
            const floatOffset = Math.sin(jetpack.animation * 0.6) * 2;
            const currentY = jetpack.y + floatOffset;

            this.ctx.save();
            this.ctx.translate(jetpack.x + jetpack.size / 2, currentY + jetpack.size / 2);

            // Рисуем реактивный ранец
            this.drawJetpackIcon(0, 0, jetpack.size);

            this.ctx.restore();
        }
    }

    drawJetpackIcon(x, y, size) {
        const halfSize = size / 2;

        // Основной корпус ранца (серый)
        this.ctx.fillStyle = '#666666';
        this.ctx.fillRect(x - halfSize, y - halfSize, size, size);

        // Рамка ранца
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - halfSize, y - halfSize, size, size);

        // Детали ранца
        this.ctx.fillStyle = '#888888';
        this.ctx.fillRect(x - halfSize + 2, y - halfSize + 2, size - 4, 4);
        this.ctx.fillRect(x - halfSize + 2, y + halfSize - 6, size - 4, 4);

        // Огненные струи (анимированные)
        const flameHeight = 8 + Math.sin(this.frameCount * 0.3) * 3;
        this.ctx.fillStyle = '#FF4500';
        this.ctx.fillRect(x - 2, y + halfSize, 4, flameHeight);
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(x - 1, y + halfSize, 2, flameHeight * 0.7);

        // Символ реактивного ранца
        this.ctx.fillStyle = 'white';
        this.ctx.font = `bold ${size * 0.4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🚀', x, y);
    }

    drawPlayer() {
        const screenY = this.player.y - this.camera.y;
        if (screenY < -50 || screenY > this.canvas.height + 50) return;

        const x = this.player.x + this.player.width / 2;
        const y = this.player.y + this.player.height / 2;
        const animation = Date.now() * 0.01;

        // Анимации состояний
        const stateAnimation = this.getStateAnimation();

        // Без базовых анимаций в игре
        const blinkAnimation = 1; // Глаза всегда открыты
        const bounceAnimation = 0; // Без покачивания
        const armSwing = 0; // Без размахивания руками
        const eyeGlow = 1.0; // Без пульсации глаз

        // Ребенок-Житель из Майнкрафта с гипертрофированными анимациями состояний
        // Применяем масштабирование
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(stateAnimation.scale, stateAnimation.scale);
        this.ctx.translate(-x, -y);

        // Цвет головы в зависимости от скина
        let headColor = '#F5DEB3'; // По умолчанию
        let bodyColor = '#8B4513'; // По умолчанию

        switch (this.shop.currentSkin) {
            case 'golden':
                headColor = '#FFD700';
                bodyColor = '#FFA500';
                break;
            case 'rainbow':
                // Радужный градиент будет применен отдельно
                headColor = '#FF0000';
                bodyColor = '#FF8000';
                break;
            case 'fire':
                headColor = '#FF4500';
                bodyColor = '#DC143C';
                break;
            case 'ice':
                headColor = '#B0E0E6';
                bodyColor = '#4682B4';
                break;
        }

        // Голова (квадратная, как в Майнкрафте) с анимацией состояния
        if (this.shop.currentSkin === 'rainbow') {
            // Радужный градиент для головы
            const gradient = this.ctx.createLinearGradient(x - 12, y - 30, x + 12, y + 6);
            gradient.addColorStop(0, '#FF0000');
            gradient.addColorStop(0.2, '#FF8000');
            gradient.addColorStop(0.4, '#FFFF00');
            gradient.addColorStop(0.6, '#00FF00');
            gradient.addColorStop(0.8, '#0080FF');
            gradient.addColorStop(1, '#8000FF');
            this.ctx.fillStyle = gradient;
        } else {
            this.ctx.fillStyle = headColor;
        }
        this.ctx.fillRect(x - 12, y - 30 + stateAnimation.headOffset, 24, 24);

        // Обводка головы
        this.ctx.strokeStyle = '#D2B48C'; // Темно-бежевый
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - 12, y - 30 + stateAnimation.headOffset, 24, 24);

        // Глаза (с анимацией свечения)
        // Свечение глаз
        this.ctx.fillStyle = `rgba(255, 255, 0, ${stateAnimation.eyeGlow * 0.3})`;
        this.ctx.fillRect(x - 10, y - 27 + stateAnimation.headOffset, 8, 6);
        this.ctx.fillRect(x + 2, y - 27 + stateAnimation.headOffset, 8, 6);

        // Глаза (черные квадраты)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(x - 8, y - 25 + stateAnimation.headOffset, 4, 4);
        this.ctx.fillRect(x + 4, y - 25 + stateAnimation.headOffset, 4, 4);

        // Нос (большой квадратный нос жителя)
        this.ctx.fillStyle = '#D2B48C';
        this.ctx.fillRect(x - 2, y - 20 + stateAnimation.headOffset, 4, 4);

        // Рот (обычная улыбка)
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 15 + stateAnimation.headOffset, 6, 0, Math.PI);
        this.ctx.stroke();

        // Тело (мантия) с цветом в зависимости от скина
        if (this.shop.currentSkin === 'rainbow') {
            // Радужный градиент для тела
            const bodyGradient = this.ctx.createLinearGradient(x - 15, y - 10, x + 15, y + 10);
            bodyGradient.addColorStop(0, '#FF0000');
            bodyGradient.addColorStop(0.2, '#FF8000');
            bodyGradient.addColorStop(0.4, '#FFFF00');
            bodyGradient.addColorStop(0.6, '#00FF00');
            bodyGradient.addColorStop(0.8, '#0080FF');
            bodyGradient.addColorStop(1, '#8000FF');
            this.ctx.fillStyle = bodyGradient;
        } else {
            this.ctx.fillStyle = bodyColor;
        }
        this.ctx.fillRect(x - 15, y - 10, 30, 20);

        // Детали мантии
        this.ctx.fillStyle = '#A0522D'; // Темно-коричневый
        this.ctx.fillRect(x - 15, y - 10, 30, 3);
        this.ctx.fillRect(x - 15, y + 7, 30, 3);

        // Руки (с анимацией состояния)
        this.ctx.fillStyle = '#F5DEB3'; // Цвет кожи
        this.ctx.fillRect(x - 18, y - 5 + stateAnimation.armOffset, 6, 12);
        this.ctx.fillRect(x + 12, y - 5 - stateAnimation.armOffset, 6, 12);

        // Ноги (с анимацией состояния)
        this.ctx.fillStyle = bodyColor;
        this.ctx.fillRect(x - 8, y + 10 + stateAnimation.legOffset, 6, 8);
        this.ctx.fillRect(x + 2, y + 10 - stateAnimation.legOffset, 6, 8);

        // Волнообразный низ (призрачный эффект)
        for (let i = 0; i < 6; i++) {
            const waveX = x - 15 + i * 5;
            const waveY = y + 18 + Math.sin(animation * 0.8 + i) * 1.2;
            this.ctx.fillStyle = bodyColor;
            this.ctx.fillRect(waveX, waveY, 5, 2);
        }

        // Тень
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(this.player.x + 2, this.player.y + this.player.height, this.player.width - 4, 5);

        // Эффект реактивного ранца на игроке
        if (this.playerJetpackActive) {
            this.drawPlayerJetpackEffect(x, y);
        }

        // Восстанавливаем контекст
        this.ctx.restore();
    }

    drawPlayerJetpackEffect(x, y) {
        // Огненные струи под игроком
        const flameHeight = 15 + Math.sin(this.frameCount * 0.4) * 5;
        const flameWidth = 8;

        // Основное пламя
        this.ctx.fillStyle = '#FF4500';
        this.ctx.fillRect(x - flameWidth / 2, y + 15, flameWidth, flameHeight);

        // Внутреннее пламя (желтое)
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(x - flameWidth / 2 + 1, y + 15, flameWidth - 2, flameHeight * 0.7);

        // Внешнее пламя (белое)
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(x - flameWidth / 2 + 2, y + 15, flameWidth - 4, flameHeight * 0.4);

        // Искры
        for (let i = 0; i < 5; i++) {
            const sparkX = x - flameWidth / 2 + Math.random() * flameWidth;
            const sparkY = y + 15 + flameHeight + Math.random() * 10;
            const sparkSize = 1 + Math.random() * 2;

            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(sparkX, sparkY, sparkSize, sparkSize);
        }
    }

    updateAnimationState() {
        // Определяем состояние анимации на основе скорости
        if (this.player.velocityY < -15) {
            // Супер прыжок (с буст платформы)
            this.animationState = 'superJump';
            this.animationTimer = 0;
        } else if (this.player.velocityY < -5) {
            // Обычный прыжок
            this.animationState = 'jumping';
            this.animationTimer = 0;
        } else if (this.player.velocityY > 5) {
            // Падение
            this.animationState = 'falling';
            this.animationTimer = 0;
        } else {
            // Покой (на платформе) - без анимации
            this.animationState = 'idle';
        }

        this.animationTimer += 0.016; // Примерно 60 FPS
        this.lastVelocityY = this.player.velocityY;
    }

    getStateAnimation() {
        const timer = this.animationTimer;

        switch (this.animationState) {
            case 'jumping':
                return {
                    headOffset: Math.sin(timer * 8) * 2, // Голова поднимается
                    armOffset: Math.sin(timer * 12) * 3, // Руки вверх
                    legOffset: Math.sin(timer * 10) * 2, // Ноги согнуты
                    eyeGlow: 1.2, // Глаза светятся
                    scale: 1.0 + Math.sin(timer * 6) * 0.1, // Легкое увеличение
                    colorShift: 0.1 // Легкий сдвиг цвета
                };
            case 'falling':
                return {
                    headOffset: -Math.sin(timer * 6) * 1, // Голова опущена
                    armOffset: -Math.sin(timer * 8) * 2, // Руки вниз
                    legOffset: Math.sin(timer * 12) * 3, // Ноги разведены
                    eyeGlow: 0.7, // Глаза тусклее
                    scale: 1.0 - Math.sin(timer * 4) * 0.05, // Легкое сжатие
                    colorShift: -0.1 // Легкий сдвиг цвета
                };
            case 'superJump':
                return {
                    headOffset: Math.sin(timer * 10) * 3, // Голова высоко
                    armOffset: Math.sin(timer * 15) * 4, // Руки высоко
                    legOffset: Math.sin(timer * 12) * 2, // Ноги согнуты
                    eyeGlow: 1.5, // Глаза ярко светятся
                    scale: 1.0 + Math.sin(timer * 8) * 0.15, // Увеличение
                    colorShift: 0.2 // Сдвиг цвета
                };
            default: // idle - без анимации
                return {
                    headOffset: 0,
                    armOffset: 0,
                    legOffset: 0,
                    eyeGlow: 1.0,
                    scale: 1.0,
                    colorShift: 0
                };
        }
    }

    getMainScreenStateAnimation(state, progress) {
        // Только анимация ожидания (idle) на главном экране
        return {
            headOffset: 0,
            armOffset: 0,
            legOffset: 0,
            eyeGlow: 1.0,
            scale: 1.0
        };
    }

    drawMainScreenCharacter() {
        const canvas = document.getElementById('characterCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        const animation = Date.now() * 0.01;

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Только анимация ожидания на главном экране
        const stateAnimation = this.getMainScreenStateAnimation('idle', 0);

        // Только анимация покоя на главном экране
        const blinkAnimation = 1; // Глаза всегда открыты
        const bounceAnimation = Math.sin(animation * 0.8) * 1.2; // Покачивание
        const armSwing = Math.sin(animation * 1.5) * 1.5; // Размахивание руками
        const eyeGlow = Math.sin(animation * 0.7) * 0.15 + 0.85; // Свечение глаз

        // Ребенок-Житель из Майнкрафта с анимациями состояний
        // Применяем масштабирование
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(stateAnimation.scale, stateAnimation.scale);
        ctx.translate(-x, -y);

        // Цвет головы в зависимости от скина
        let headColor = '#F5DEB3'; // По умолчанию
        let bodyColor = '#8B4513'; // По умолчанию

        switch (this.shop.currentSkin) {
            case 'golden':
                headColor = '#FFD700';
                bodyColor = '#FFA500';
                break;
            case 'rainbow':
                // Радужный градиент будет применен отдельно
                headColor = '#FF0000';
                bodyColor = '#FF8000';
                break;
            case 'fire':
                headColor = '#FF4500';
                bodyColor = '#DC143C';
                break;
            case 'ice':
                headColor = '#B0E0E6';
                bodyColor = '#4682B4';
                break;
        }

        // Голова (квадратная, как в Майнкрафте) с покачиванием
        if (this.shop.currentSkin === 'rainbow') {
            // Радужный градиент для головы
            const gradient = ctx.createLinearGradient(x - 12, y - 30, x + 12, y + 6);
            gradient.addColorStop(0, '#FF0000');
            gradient.addColorStop(0.2, '#FF8000');
            gradient.addColorStop(0.4, '#FFFF00');
            gradient.addColorStop(0.6, '#00FF00');
            gradient.addColorStop(0.8, '#0080FF');
            gradient.addColorStop(1, '#8000FF');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = headColor;
        }
        ctx.fillRect(x - 12, y - 30 + bounceAnimation, 24, 24);

        // Обводка головы
        ctx.strokeStyle = '#D2B48C'; // Темно-бежевый
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 12, y - 30 + bounceAnimation, 24, 24);

        // Глаза (светятся)
        // Свечение глаз
        ctx.fillStyle = `rgba(255, 255, 0, ${eyeGlow * 0.3})`;
        ctx.fillRect(x - 10, y - 27 + bounceAnimation, 8, 6);
        ctx.fillRect(x + 2, y - 27 + bounceAnimation, 8, 6);

        // Глаза (большие черные квадраты)
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 8, y - 25 + bounceAnimation, 4, 4);
        ctx.fillRect(x + 4, y - 25 + bounceAnimation, 4, 4);

        // Нос (большой квадратный нос жителя)
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(x - 2, y - 20 + bounceAnimation, 4, 4);

        // Рот (анимированная улыбка)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const mouthRadius = 6 + Math.sin(animation * 1.0) * 0.6; // Пульсирующий рот
        ctx.arc(x, y - 15 + bounceAnimation, mouthRadius, 0, Math.PI);
        ctx.stroke();

        // Тело (мантия) с покачиванием и цветом в зависимости от скина
        if (this.shop.currentSkin === 'rainbow') {
            // Радужный градиент для тела
            const bodyGradient = ctx.createLinearGradient(x - 15, y - 10, x + 15, y + 10);
            bodyGradient.addColorStop(0, '#FF0000');
            bodyGradient.addColorStop(0.2, '#FF8000');
            bodyGradient.addColorStop(0.4, '#FFFF00');
            bodyGradient.addColorStop(0.6, '#00FF00');
            bodyGradient.addColorStop(0.8, '#0080FF');
            bodyGradient.addColorStop(1, '#8000FF');
            ctx.fillStyle = bodyGradient;
        } else {
            ctx.fillStyle = bodyColor;
        }
        ctx.fillRect(x - 15, y - 10 + bounceAnimation, 30, 20);

        // Детали мантии (анимированные полосы)
        ctx.fillStyle = '#A0522D'; // Темно-коричневый
        const stripeOffset = Math.sin(animation * 0.5) * 0.2;
        ctx.fillRect(x - 15, y - 10 + bounceAnimation + stripeOffset, 30, 3);
        ctx.fillRect(x - 15, y + 7 + bounceAnimation - stripeOffset, 30, 3);

        // Руки (анимированные - размахивают)
        ctx.fillStyle = '#F5DEB3'; // Цвет кожи
        ctx.fillRect(x - 18, y - 5 + bounceAnimation + armSwing, 6, 12);
        ctx.fillRect(x + 12, y - 5 + bounceAnimation - armSwing, 6, 12);

        // Ноги (анимированные - бегут)
        ctx.fillStyle = bodyColor;
        const legOffset = Math.sin(animation * 2) * 0.6;
        ctx.fillRect(x - 8, y + 10 + bounceAnimation + legOffset, 6, 8);
        ctx.fillRect(x + 2, y + 10 + bounceAnimation - legOffset, 6, 8);

        // Волнообразный низ (призрачный эффект) с анимацией
        for (let i = 0; i < 6; i++) {
            const waveX = x - 15 + i * 5;
            const waveY = y + 18 + Math.sin(animation * 0.8 + i) * 1.2 + bounceAnimation;
            ctx.fillStyle = bodyColor;
            ctx.fillRect(waveX, waveY, 5, 2);
        }

        // Специальные эффекты для скинов
        if (this.shop.currentSkin === 'fire') {
            // Огненные эффекты
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x - 14, y - 10 + bounceAnimation, 2, 4);
            ctx.fillRect(x + 12, y - 8 + bounceAnimation, 2, 6);
            ctx.fillRect(x - 10, y + 8 + bounceAnimation, 3, 2);
            ctx.fillRect(x + 7, y + 10 + bounceAnimation, 3, 2);
        } else if (this.shop.currentSkin === 'ice') {
            // Ледяные кристаллы
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(x - 14, y - 6 + bounceAnimation, 2, 2);
            ctx.fillRect(x + 12, y - 4 + bounceAnimation, 2, 2);
            ctx.fillRect(x - 8, y + 8 + bounceAnimation, 2, 2);
            ctx.fillRect(x + 6, y + 10 + bounceAnimation, 2, 2);
        }

        // Восстанавливаем контекст
        ctx.restore();
    }

    drawGhost() {
        if (!this.ghost.visible) return;

        const screenY = this.ghost.y - this.camera.y;
        if (screenY < -50 || screenY > this.canvas.height + 50) return;

        // Анимация покачивания
        const sway = Math.sin(this.ghost.animation) * 3;
        const x = this.canvas.width / 2 + sway;

        // Прозрачность призрака
        this.ctx.globalAlpha = 0.6;

        // Тело призрака (полупрозрачное)
        this.ctx.fillStyle = '#E0E0E0';
        this.ctx.fillRect(x - 15, this.ghost.y - 20, 30, 20);

        // Голова призрака
        this.ctx.fillStyle = '#F0F0F0';
        this.ctx.fillRect(x - 10, this.ghost.y - 25, 20, 20);

        // Глаза призрака
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 6, this.ghost.y - 18, 3, 3);
        this.ctx.fillRect(x + 3, this.ghost.y - 18, 3, 3);

        // Рот призрака
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 3, this.ghost.y - 12, 6, 2);

        // Волнообразный низ призрака
        this.ctx.fillStyle = '#E0E0E0';
        for (let i = 0; i < 6; i++) {
            const waveX = x - 15 + i * 5;
            const waveY = this.ghost.y + Math.sin(this.ghost.animation * 2 + i) * 2;
            this.ctx.fillRect(waveX, waveY, 5, 5);
        }

        // Сброс прозрачности
        this.ctx.globalAlpha = 1.0;

        // Текст "Вы"
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Вы', x, this.ghost.y + 15);
    }

    drawFakeGhosts() {
        for (let fakeGhost of this.fakeGhosts) {
            const screenY = fakeGhost.y - this.camera.y;
            if (screenY < -50 || screenY > this.canvas.height + 50) continue;

            // Анимация покачивания
            const sway = Math.sin(fakeGhost.animation) * 2;
            const x = this.canvas.width / 2 + sway + (Math.sin(fakeGhost.animation * 0.5) * 20);

            // Прозрачность фейкового призрака
            this.ctx.globalAlpha = 0.4;

            // Рисуем призрак в зависимости от стиля
            this.drawFakeGhost(fakeGhost, x, fakeGhost.y);

            // Сброс прозрачности
            this.ctx.globalAlpha = 1.0;

            // Текст с именем и счетом
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${fakeGhost.name} (${fakeGhost.score})`, x, fakeGhost.y + 20);
        }
    }

    drawFakeGhost(fakeGhost, x, y) {
        const baseColor = fakeGhost.color;

        switch (fakeGhost.style) {
            case 0: // Обычный призрак
                this.drawStandardGhost(x, y, baseColor, fakeGhost.animation);
                break;
            case 1: // Призрак с шляпой
                this.drawHatGhost(x, y, baseColor, fakeGhost.animation);
                break;
            case 2: // Призрак с крыльями
                this.drawWingedGhost(x, y, baseColor, fakeGhost.animation);
                break;
        }
    }

    drawStandardGhost(x, y, color, animation) {
        // Тело призрака
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 12, y - 15, 24, 15);

        // Голова призрака
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 8, y - 20, 16, 16);

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 5, y - 15, 2, 2);
        this.ctx.fillRect(x + 3, y - 15, 2, 2);

        // Волнообразный низ
        for (let i = 0; i < 4; i++) {
            const waveX = x - 12 + i * 6;
            const waveY = y + Math.sin(animation * 2 + i) * 1;
            this.ctx.fillRect(waveX, waveY, 6, 3);
        }
    }

    drawHatGhost(x, y, color, animation) {
        // Шляпа
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x - 6, y - 25, 12, 4);
        this.ctx.fillRect(x - 4, y - 28, 8, 4);

        // Тело призрака
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 12, y - 15, 24, 15);

        // Голова призрака
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 8, y - 20, 16, 16);

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 5, y - 15, 2, 2);
        this.ctx.fillRect(x + 3, y - 15, 2, 2);

        // Волнообразный низ
        for (let i = 0; i < 4; i++) {
            const waveX = x - 12 + i * 6;
            const waveY = y + Math.sin(animation * 2 + i) * 1;
            this.ctx.fillRect(waveX, waveY, 6, 3);
        }
    }

    drawWingedGhost(x, y, color, animation) {
        // Крылья
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x - 18, y - 12, 6, 8);
        this.ctx.fillRect(x + 12, y - 12, 6, 8);

        // Тело призрака
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 12, y - 15, 24, 15);

        // Голова призрака
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 8, y - 20, 16, 16);

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 5, y - 15, 2, 2);
        this.ctx.fillRect(x + 3, y - 15, 2, 2);

        // Волнообразный низ
        for (let i = 0; i < 4; i++) {
            const waveX = x - 12 + i * 6;
            const waveY = y + Math.sin(animation * 2 + i) * 1;
            this.ctx.fillRect(waveX, waveY, 6, 3);
        }
    }

    gameLoop(currentTime = 0) {
        // Вычисляем deltaTime для стабильной скорости на всех мониторах
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
        }
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Ограничиваем deltaTime для предотвращения больших скачков
        this.deltaTime = Math.min(this.deltaTime, 16.67); // Максимум 60 FPS
        
        this.frameCount++;
        this.updatePlayer();
        this.updatePlatforms();
        this.updateCoins();
        this.updateJetpacks();
        this.updateScore();
        this.updateGhost();
        this.updateParallax();
        this.render();
        this.drawMainScreenCharacter(); // Обновляем персонажа на главном экране
        this.updateMobileJumpButton(); // Обновляем мобильную кнопку прыжка каждый кадр

        requestAnimationFrame((time) => this.gameLoop(time));
    }

}

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BabyVillagerGame();
});
