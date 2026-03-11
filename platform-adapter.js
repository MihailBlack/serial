/**
 * Универсальный адаптер для Telegram и MAX
 * Исправленная версия для корректной работы в Telegram
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
    
    detectPlatform() {
        // СНАЧАЛА проверяем Telegram - он должен быть приоритетным
        if (window.Telegram && window.Telegram.WebApp) {
            try {
                const tg = window.Telegram.WebApp;
                // Проверяем, что это действительно Telegram Mini App
                if (tg.initData !== undefined || tg.version) {
                    return 'telegram';
                }
            } catch (e) {
                console.log('Ошибка при проверке Telegram:', e);
            }
        }
        
        // Потом проверяем MAX
        if (window.Max && typeof window.Max.ready === 'function') {
            return 'max';
        }
        
        // Проверяем User Agent
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('tg') || ua.includes('telegram')) {
            return 'telegram';
        }
        if (ua.includes('max')) {
            return 'max';
        }
        
        // По умолчанию - Telegram (так безопаснее)
        return 'telegram';
    }
    
    init() {
        if (this.platform === 'telegram') {
            this.instance = window.Telegram.WebApp;
            
            // ВАЖНО: Expand и настройки Telegram
            this.instance.expand();
            this.instance.enableClosingConfirmation();
            
            this.isReady = true;
            console.log('Telegram SDK инициализирован');
        } 
        else if (this.platform === 'max') {
            this.instance = window.Max;
            this.instance.ready();
            this.isReady = true;
            console.log('MAX SDK инициализирован');
        }
        else {
            console.warn('Платформа не распознана, использую заглушку');
            this.instance = this.createDummyAdapter();
            this.isReady = true;
        }
    }
    
    createDummyAdapter() {
        return {
            expand: () => {},
            close: () => {},
            HapticFeedback: null,
            showPopup: (params) => {
                alert(params.message || params.title);
            },
            showScanQrPopup: null
        };
    }
    
    // === ЕДИНЫЙ API ===
    
    vibrate(type = 'light') {
        if (!this.instance) return;
        
        try {
            if (this.platform === 'telegram' && this.instance.HapticFeedback) {
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
            else if (this.platform === 'max' && this.instance.HapticFeedback) {
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
        } catch (e) {
            console.log('Haptic feedback error:', e);
        }
    }
    
    scanQRCode(onScan, onClose) {
        // Только в Telegram есть нативный сканер
        if (this.platform === 'telegram' && this.instance && this.instance.showScanQrPopup) {
            try {
                this.instance.showScanQrPopup({
                    text: 'Наведите камеру на QR-код с серийным номером'
                }, (qrText) => {
                    if (onScan) onScan(qrText);
                    return true; // Закрыть после первого сканирования
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
        
        // В MAX и других платформах - не поддерживается
        return false;
    }
    
    showPopup(params) {
        if (!this.instance) return;
        
        if (this.platform === 'telegram' && this.instance.showPopup) {
            this.instance.showPopup(params);
        } 
        else if (this.platform === 'max' && this.instance.showPopup) {
            this.instance.showPopup(params);
        }
        else {
            alert(params.message || params.title);
        }
    }
    
    getPlatformName() {
        return this.platform;
    }
    
    getColorScheme() {
        if (this.platform === 'telegram' && this.instance && this.instance.colorScheme) {
            return this.instance.colorScheme;
        }
        return 'light';
    }
}

// Создаем глобальный экземпляр адаптера
window.Platform = new PlatformAdapter();