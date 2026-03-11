/**
 * Универсальный адаптер для Telegram и MAX
 * Автоматически определяет платформу и предоставляет единый API
 */

class PlatformAdapter {
    constructor() {
        this.platform = this.detectPlatform();
        this.instance = null;
        this.isReady = false;
        
        console.log('Обнаружена платформа:', this.platform);
        
        // Инициализируем SDK соответствующей платформы
        this.init();
    }
    
    // Определяем, в какой платформе запущено приложение
    detectPlatform() {
        // Проверяем наличие Telegram Web App
        if (window.Telegram && window.Telegram.WebApp) {
            // Пробуем обратиться к initData - если есть, значит внутри Telegram
            try {
                const tg = window.Telegram.WebApp;
                if (tg.initData !== undefined) {
                    return 'telegram';
                }
            } catch (e) {
                console.log('Ошибка при проверке Telegram:', e);
            }
        }
        
        // Проверяем наличие MAX Bridge
        if (window.Max && window.Max.ready) {
            return 'max';
        }
        
        // Проверяем User Agent на наличие признаков платформ
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('telegram')) {
            return 'telegram';
        }
        if (ua.includes('max')) {
            return 'max';
        }
        
        // По умолчанию считаем, что это Telegram (или веб-версия)
        return 'telegram';
    }
    
    // Инициализация SDK
    init() {
        return new Promise((resolve) => {
            if (this.platform === 'telegram') {
                this.instance = window.Telegram.WebApp;
                this.instance.expand();
                this.isReady = true;
                console.log('Telegram SDK инициализирован');
                resolve();
            } 
            else if (this.platform === 'max') {
                this.instance = window.Max;
                this.instance.ready();
                this.isReady = true;
                console.log('MAX SDK инициализирован');
                resolve();
            }
            else {
                console.warn('Платформа не распознана, использую заглушку');
                this.instance = this.createDummyAdapter();
                this.isReady = true;
                resolve();
            }
        });
    }
    
    // Заглушка для веб-версии (если открыли в браузере)
    createDummyAdapter() {
        return {
            ready: () => {},
            expand: () => {},
            close: () => {},
            HapticFeedback: null,
            showPopup: (params) => {
                alert(params.message || params.title);
            },
            showScanQrPopup: (params, callback) => {
                alert('Сканирование QR доступно только в Telegram');
                return false;
            }
        };
    }
    
    // === ЕДИНЫЙ API ДЛЯ ОБЕИХ ПЛАТФОРМ ===
    
    // Развернуть приложение на весь экран
    expand() {
        if (this.platform === 'telegram') {
            this.instance.expand();
        }
        // MAX автоматически разворачивается при вызове ready()
    }
    
    // Закрыть приложение
    close() {
        if (this.instance && this.instance.close) {
            this.instance.close();
        }
    }
    
    // === ВИБРАЦИЯ (HAPTIC FEEDBACK) ===
    vibrate(type = 'light') {
        if (!this.instance) return;
        
        try {
            if (this.platform === 'telegram' && this.instance.HapticFeedback) {
                this.telegramVibrate(type);
            } 
            else if (this.platform === 'max' && this.instance.HapticFeedback) {
                this.maxVibrate(type);
            }
        } catch (e) {
            console.log('Haptic feedback error:', e);
        }
    }
    
    telegramVibrate(type) {
        const haptic = this.instance.HapticFeedback;
        
        switch(type) {
            case 'light':
            case 'medium':
            case 'heavy':
                haptic.impactOccurred(type);
                break;
            case 'success':
            case 'error':
            case 'warning':
                haptic.notificationOccurred(type);
                break;
            case 'selection':
                haptic.selectionChanged();
                break;
            default:
                haptic.impactOccurred('light');
        }
    }
    
    maxVibrate(type) {
        const haptic = this.instance.HapticFeedback;
        
        switch(type) {
            case 'light':
                haptic.impactLight();
                break;
            case 'medium':
                haptic.impactMedium();
                break;
            case 'heavy':
                haptic.impactHeavy();
                break;
            case 'success':
                haptic.notificationSuccess();
                break;
            case 'error':
                haptic.notificationError();
                break;
            case 'warning':
                haptic.notificationWarning();
                break;
            default:
                haptic.impactLight();
        }
    }
    
    // === СКАНИРОВАНИЕ QR-КОДА ===
    scanQRCode(onScan, onClose) {
        // В MAX нет встроенного сканера, показываем альтернативу
        if (this.platform !== 'telegram') {
            this.showPopup({
                title: 'Сканирование QR',
                message: 'В MAX сканирование QR через камеру пока не поддерживается. Введите номер вручную.',
                buttons: [{id: 'ok', text: 'OK'}]
            });
            return false;
        }
        
        // В Telegram используем нативный сканер
        if (this.platform === 'telegram' && this.instance.showScanQrPopup) {
            try {
                this.instance.showScanQrPopup({
                    text: 'Наведите камеру на QR-код с серийным номером'
                }, (qrText) => {
                    if (onScan) onScan(qrText);
                    return true;
                });
                
                if (onClose) {
                    this.instance.onEvent('scanQrPopupClosed', onClose);
                }
                
                return true;
            } catch (e) {
                console.error('Ошибка открытия сканера:', e);
                return false;
            }
        }
        
        return false;
    }
    
    // === ПОКАЗ ВСПЛЫВАЮЩИХ ОКОН ===
    showPopup(params) {
        if (!this.instance) return;
        
        if (this.platform === 'telegram' && this.instance.showPopup) {
            this.instance.showPopup(params);
        } 
        else if (this.platform === 'max' && this.instance.showPopup) {
            this.instance.showPopup(params);
        }
        else {
            // Заглушка для веб-версии
            alert(params.message || params.title);
        }
    }
    
    // === ОТПРАВКА ДАННЫХ В БОТА ===
    sendData(data) {
        if (!this.instance) return;
        
        if (this.platform === 'telegram' && this.instance.sendData) {
            this.instance.sendData(JSON.stringify(data));
        }
        // В MAX пока нет прямого аналога sendData
    }
    
    // === ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ПОЛЬЗОВАТЕЛЕ ===
    getUserInfo() {
        if (this.platform === 'telegram' && this.instance.initDataUnsafe) {
            return this.instance.initDataUnsafe.user;
        }
        if (this.platform === 'max' && this.instance.getUserInfo) {
            return this.instance.getUserInfo();
        }
        return null;
    }
    
    // === ТЕМА (СВЕТЛАЯ/ТЕМНАЯ) ===
    getColorScheme() {
        if (this.platform === 'telegram' && this.instance.colorScheme) {
            return this.instance.colorScheme;
        }
        if (this.platform === 'max' && this.instance.theme) {
            return this.instance.theme;
        }
        return 'light'; // по умолчанию
    }
    
    // === ПОЛУЧИТЬ НАЗВАНИЕ ПЛАТФОРМЫ ===
    getPlatformName() {
        return this.platform;
    }
}

// Создаем глобальный экземпляр адаптера
window.Platform = new PlatformAdapter();