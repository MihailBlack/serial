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
        this.loader = document.getElementById('loader');
        this.result = document.getElementById('result');
        this.error = document.getElementById('error');
        
        this.serialNumber = document.getElementById('serialNumber');
        this.saleDate = document.getElementById('saleDate');
        this.warrantyUntil = document.getElementById('warrantyUntil');
        this.daysRemaining = document.getElementById('daysRemaining');
        this.statusIcon = document.getElementById('statusIcon');
        this.statusText = document.getElementById('statusText');
        
        // Загружаем Google API
        this.loadGoogleAPI();
    }

    loadGoogleAPI() {
        gapi.load('client', () => {
            console.log('Google API загружен');
        });
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchSerial());
        this.serialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchSerial();
        });
    }

    // Парсинг даты из формата ДД.ММ.ГГГГ
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Очищаем строку от лишних пробелов
        dateStr = dateStr.toString().trim();
        
        // Пробуем формат ДД.ММ.ГГГГ
        if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                
                // Проверяем корректность даты
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
            // Инициализируем Google Sheets API
            await gapi.client.init({
                apiKey: CONFIG.API_KEY,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            // Получаем данные из таблицы
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
                        saleDate: row[1] || '',
                        warrantyDays: row[2] ? parseInt(row[2], 10) : DEFAULT_WARRANTY_DAYS
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
            this.showError('Ошибка при поиске. Проверьте консоль.');
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
        this.serialNumber.textContent = data.serial;
        this.saleDate.textContent = this.formatDate(saleDate);
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
        if (daysLeft < 0) {
            this.daysRemaining.textContent = 'Истекла';
        } else {
            this.daysRemaining.textContent = daysLeft + ' дн.';
        }

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
});