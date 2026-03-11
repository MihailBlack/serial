// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

class WarrantyChecker {
    constructor() {
        this.init();
        this.bindEvents();
    }

    init() {
        this.serialInput = document.getElementById('serialInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.clearBtn = document.getElementById('clearBtn');
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
    }

    loadGoogleAPI() {
        gapi.load('client', () => {
            console.log('Google API загружен');
        });
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchSerial());
        this.clearBtn.addEventListener('click', () => this.clearInput());
        this.serialInput.addEventListener('input', () => this.toggleClearButton());
        this.serialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchSerial();
        });
    }

    // Показываем или скрываем крестик
    toggleClearButton() {
        if (this.serialInput.value.length > 0) {
            this.clearBtn.classList.remove('hidden');
        } else {
            this.clearBtn.classList.add('hidden');
        }
    }

    // Очищаем поле ввода
    clearInput() {
        this.serialInput.value = '';
        this.serialInput.focus();
        this.clearBtn.classList.add('hidden');
        this.hideResult();
        this.hideError();
    }

    // Парсинг даты из формата ДД.ММ.ГГГГ
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

    // Форматирование даты для отображения
    formatDate(date) {
        if (!date) return 'Не указана';
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    }

    // Форматирование срока гарантии
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
            console.log('Получены строки:', rows);

            if (!rows || rows.length === 0) {
                this.showError('Таблица пуста');
                return;
            }

            // Ищем серийный номер
            let found = null;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (row[0] && row[0].toString().toLowerCase() === serial.toLowerCase()) {
                    found = {
                        serial: row[0],
                        stationName: row[1] || 'Не указано',      // НОВОЕ: название станции
                        saleDate: row[2] || '',                   // Дата продажи
                        warrantyDays: row[3] ? parseInt(row[3], 10) : DEFAULT_WARRANTY_DAYS  // Срок гарантии
                    };
                    break;
                }
            }

            if (found) {
                this.showResult(found);
            } else {
                this.showError('Серийный номер не найден');
            }

        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Ошибка при поиске. Проверьте подключение к интернету.');
        } finally {
            this.hideLoader();
        }
    }

    showResult(data) {
        // Парсим дату продажи
        const saleDate = this.parseDate(data.saleDate);
        
        if (!saleDate) {
            this.showError('Неверный формат даты в таблице');
            return;
        }

        // Рассчитываем дату окончания гарантии
        const warrantyUntil = new Date(saleDate);
        warrantyUntil.setDate(warrantyUntil.getDate() + data.warrantyDays);

        // Рассчитываем оставшиеся дни
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        warrantyUntil.setHours(0, 0, 0, 0);
        
        const daysLeft = Math.ceil((warrantyUntil - today) / (1000 * 60 * 60 * 24));

        // Заполняем данные
        this.stationName.textContent = data.stationName;
        this.serialNumber.textContent = data.serial;
        this.saleDate.textContent = this.formatDate(saleDate);
        this.warrantyPeriod.textContent = this.formatWarrantyPeriod(data.warrantyDays);
        this.warrantyUntil.textContent = this.formatDate(warrantyUntil);
        
        // Определяем статус
        let status = 'valid';
        let statusText = '✅ Гарантия действительна';
        
        if (daysLeft < 0) {
            status = 'expired';
            statusText = '❌ Гарантия истекла';
        } else if (daysLeft < 30) {
            status = 'warning';
            statusText = '⚠️ Гарантия скоро истекает';
        }

        // Обновляем статус
        this.statusIcon.className = 'status-icon ' + status;
        this.statusText.className = 'status-text ' + status;
        this.statusText.textContent = statusText;

        // Дни до окончания
        this.daysRemaining.textContent = daysLeft < 0 ? 'Истекла' : daysLeft + ' дн.';
        this.daysRemaining.className = 'info-value days-remaining' + (daysLeft < 0 ? ' expired' : '');

        // Показываем результат
        this.result.classList.remove('hidden');
    }

    showLoader() {
        this.loader.classList.remove('hidden');
        this.searchBtn.disabled = true;
    }

    hideLoader() {
        this.loader.classList.add('hidden');
        this.searchBtn.disabled = false;
    }

    showError(message) {
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        
        // Вибрация на телефоне (если поддерживается)
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
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
    new WarrantyChecker();
    
    // Адаптация под тему Telegram
    if (tg.colorScheme === 'dark') {
        document.body.style.background = 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)';
    }
});