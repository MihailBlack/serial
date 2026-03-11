// Исправленная версия для Telegram

class WarrantyChecker {
    constructor() {
        this.init();
        this.bindEvents();
        
        // Приветственная вибрация
        setTimeout(() => {
            if (window.Platform) {
                window.Platform.vibrate('light');
            }
        }, 500);
    }

    init() {
        this.serialInput = document.getElementById('serialInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.scanBtn = document.getElementById('scanBtn');
        this.loader = document.getElementById('loader');
        this.result = document.getElementById('result');
        this.error = document.getElementById('error');
        
        // Элементы результата
        this.stationName = document.getElementById('stationName');
        this.serialNumber = document.getElementById('serialNumber');
        this.saleDate = document.getElementById('saleDate');
        this.warrantyPeriod = document.getElementById('warrantyPeriod');
        this.warrantyUntil = document.getElementById('warrantyUntil');
        this.daysRemaining = document.getElementById('daysRemaining');
        this.statusIcon = document.getElementById('statusIcon');
        this.statusText = document.getElementById('statusText');
        
        // Загружаем Google API
        this.loadGoogleAPI();
        
        // Показываем/скрываем крестик
        this.toggleClearButton();
        
        // Адаптация под тему Telegram
        this.applyTelegramTheme();
    }
    
    applyTelegramTheme() {
        if (!window.Platform) return;
        
        const scheme = window.Platform.getColorScheme();
        const container = document.querySelector('.container');
        const title = document.querySelector('.title');
        
        if (scheme === 'dark') {
            document.body.style.background = '#1a202c';
            if (container) {
                container.style.background = '#2d3748';
                container.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)';
            }
            if (title) {
                title.style.color = '#f7fafc';
            }
        } else {
            document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            if (container) {
                container.style.background = 'white';
            }
        }
    }

    loadGoogleAPI() {
        gapi.load('client', () => {
            console.log('Google API загружен');
        });
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => {
            if (window.Platform) window.Platform.vibrate('medium');
            this.searchSerial();
        });
        
        this.clearBtn.addEventListener('click', () => {
            if (window.Platform) window.Platform.vibrate('light');
            this.clearInput();
        });
        
        this.scanBtn.addEventListener('click', () => {
            if (window.Platform) window.Platform.vibrate('heavy');
            this.scanQRCode();
        });
        
        this.serialInput.addEventListener('input', () => {
            this.toggleClearButton();
        });
        
        this.serialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (window.Platform) window.Platform.vibrate('medium');
                this.searchSerial();
            }
        });
        
        this.serialInput.addEventListener('focus', () => {
            if (window.Platform) window.Platform.vibrate('light');
        });
    }

    scanQRCode() {
        if (!window.Platform) {
            this.showError('Ошибка инициализации');
            return;
        }
        
        const success = window.Platform.scanQRCode(
            (qrText) => {
                console.log('Отсканирован QR:', qrText);
                if (window.Platform) window.Platform.vibrate('success');
                
                this.serialInput.value = qrText;
                this.toggleClearButton();
                
                // Автоматически ищем после сканирования
                setTimeout(() => {
                    if (window.Platform) window.Platform.vibrate('medium');
                    this.searchSerial();
                }, 300);
            },
            () => {
                console.log('Сканер закрыт');
                if (window.Platform) window.Platform.vibrate('light');
            }
        );
        
        if (!success) {
            this.showError('Сканирование доступно только в Telegram');
        }
    }

    toggleClearButton() {
        if (this.serialInput.value.length > 0) {
            this.clearBtn.classList.remove('hidden');
        } else {
            this.clearBtn.classList.add('hidden');
        }
    }

    clearInput() {
        this.serialInput.value = '';
        this.serialInput.focus();
        this.clearBtn.classList.add('hidden');
        this.hideResult();
        this.hideError();
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        dateStr = dateStr.toString().trim();
        
        if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                
                if (day > 0 && day <= 31 && month >= 0 && month < 12 && year > 2000) {
                    return new Date(year, month, day);
                }
            }
        }
        
        return null;
    }

    formatDate(date) {
        if (!date) return 'Не указана';
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    }

    formatWarrantyPeriod(days) {
        const years = days / 365;
        if (years >= 1) {
            const yearsRounded = Math.round(years * 10) / 10;
            return `${yearsRounded} ${this.getYearWord(yearsRounded)} (${days} дн.)`;
        }
        return `${days} дней`;
    }

    getYearWord(years) {
        const num = Math.floor(years);
        if (num >= 11 && num <= 19) return 'лет';
        const lastDigit = num % 10;
        if (lastDigit === 1) return 'год';
        if (lastDigit >= 2 && lastDigit <= 4) return 'года';
        return 'лет';
    }

    async searchSerial() {
        const serial = this.serialInput.value.trim();
        
        if (!serial) {
            this.showError('Введите серийный номер');
            if (window.Platform) window.Platform.vibrate('error');
            return;
        }

        this.showLoader();
        this.hideResult();
        this.hideError();

        try {
            await gapi.client.init({
                apiKey: CONFIG.API_KEY,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: `${CONFIG.SHEET_NAME}!${CONFIG.RANGE}`
            });

            const rows = response.result.values;

            if (!rows || rows.length === 0) {
                this.showError('Таблица пуста');
                if (window.Platform) window.Platform.vibrate('error');
                return;
            }

            let found = null;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (row[0] && row[0].toString().toLowerCase() === serial.toLowerCase()) {
                    found = {
                        serial: row[0],
                        stationName: row[1] || 'Не указано',
                        saleDate: row[2] || '',
                        warrantyDays: row[3] ? parseInt(row[3], 10) : DEFAULT_WARRANTY_DAYS
                    };
                    break;
                }
            }

            if (found) {
                this.showResult(found);
                if (window.Platform) window.Platform.vibrate('success');
            } else {
                this.showError('Серийный номер не найден');
                if (window.Platform) window.Platform.vibrate('error');
            }

        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Ошибка при поиске. Проверьте подключение к интернету.');
            if (window.Platform) window.Platform.vibrate('error');
        } finally {
            this.hideLoader();
        }
    }

    showResult(data) {
        const saleDate = this.parseDate(data.saleDate);
        
        if (!saleDate) {
            this.showError('Неверный формат даты в таблице');
            if (window.Platform) window.Platform.vibrate('error');
            return;
        }

        const warrantyUntil = new Date(saleDate);
        warrantyUntil.setDate(warrantyUntil.getDate() + data.warrantyDays);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        warrantyUntil.setHours(0, 0, 0, 0);
        
        const daysLeft = Math.ceil((warrantyUntil - today) / (1000 * 60 * 60 * 24));

        this.stationName.textContent = data.stationName;
        this.serialNumber.textContent = data.serial;
        this.saleDate.textContent = this.formatDate(saleDate);
        this.warrantyPeriod.textContent = this.formatWarrantyPeriod(data.warrantyDays);
        this.warrantyUntil.textContent = this.formatDate(warrantyUntil);
        
        let status = 'valid';
        let statusText = '✅ Гарантия действительна';
        
        if (daysLeft < 0) {
            status = 'expired';
            statusText = '❌ Гарантия истекла';
        } else if (daysLeft < 30) {
            status = 'warning';
            statusText = '⚠️ Гарантия скоро истекает';
        }

        this.statusIcon.className = 'status-icon ' + status;
        this.statusText.className = 'status-text ' + status;
        this.statusText.textContent = statusText;

        this.daysRemaining.textContent = daysLeft < 0 ? 'Истекла' : daysLeft + ' дн.';
        
        if (daysLeft < 0) {
            this.daysRemaining.style.color = '#f56565';
        } else if (daysLeft < 30) {
            this.daysRemaining.style.color = '#ed8936';
        } else {
            this.daysRemaining.style.color = '#2d3748';
        }

        this.result.classList.remove('hidden');
    }

    showLoader() {
        this.loader.classList.remove('hidden');
        this.searchBtn.disabled = true;
        this.scanBtn.disabled = true;
    }

    hideLoader() {
        this.loader.classList.add('hidden');
        this.searchBtn.disabled = false;
        this.scanBtn.disabled = false;
    }

    showError(message) {
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        
        if (window.Platform) {
            window.Platform.vibrate('error');
        }
    }

    hideError() {
        this.error.classList.add('hidden');
    }

    hideResult() {
        this.result.classList.add('hidden');
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    // Даем время на инициализацию платформы
    setTimeout(() => {
        new WarrantyChecker();
    }, 100);
});