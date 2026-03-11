// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

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
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchSerial());
        this.serialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchSerial();
        });
    }

    // НОВАЯ ФУНКЦИЯ: Парсинг даты из формата ДД.ММ.ГГГГ
    parseDate(dateStr) {
        if (!dateStr || dateStr === 'Не указана') return null;
        
        // Пробуем разные форматы
        let parts;
        
        // Формат ДД.ММ.ГГГГ
        if (dateStr.includes('.')) {
            parts = dateStr.split('.');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // Месяцы в JS от 0 до 11
                const year = parseInt(parts[2]);
                return new Date(year, month, day);
            }
        }
        
        // Формат ГГГГ-ММ-ДД (на всякий случай)
        if (dateStr.includes('-')) {
            parts = dateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                return new Date(year, month, day);
            }
        }
        
        // Если ничего не подошло, пробуем стандартный парсинг
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
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
            await this.initGoogleSheets();
            const data = await this.getSheetData();
            const result = this.findSerial(data, serial);
            
            if (result) {
                this.showResult(result);
                tg.sendData(JSON.stringify({
                    action: 'search',
                    serial: serial,
                    found: true,
                    data: result
                }));
            } else {
                this.showError('Серийный номер не найден');
                tg.sendData(JSON.stringify({
                    action: 'search',
                    serial: serial,
                    found: false
                }));
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Ошибка при поиске. Попробуйте позже.');
        } finally {
            this.hideLoader();
        }
    }

    initGoogleSheets() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: CONFIG.API_KEY,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async getSheetData() {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: `${CONFIG.SHEET_NAME}!${CONFIG.RANGE}`
            });
            
            return response.result.values || [];
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    // ОБНОВЛЕННАЯ функция поиска
    findSerial(data, searchSerial) {
        if (!data || data.length === 0) return null;
        
        // Пропускаем заголовки, если они есть
        const startIndex = data[0][0] && data[0][0].toLowerCase().includes('серийный') ? 1 : 0;
        
        for (let i = startIndex; i < data.length; i++) {
            const row = data[i];
            if (row[0] && row[0].toString().toLowerCase() === searchSerial.toLowerCase()) {
                
                // Получаем срок гарантии из таблицы
                let warrantyDays = DEFAULT_WARRANTY_DAYS;
                if (row[2] && !isNaN(parseInt(row[2]))) {
                    warrantyDays = parseInt(row[2]);
                }
                
                // Дата продажи (может быть в любом формате)
                const saleDate = row[1] || 'Не указана';
                
                return {
                    serial: row[0],
                    saleDate: saleDate,
                    warrantyDays: warrantyDays
                };
            }
        }
        
        return null;
    }

    // ОБНОВЛЕННАЯ функция расчета гарантии
    calculateWarrantyInfo(saleDateStr, warrantyDays) {
        // Парсим дату продажи
        const saleDate = this.parseDate(saleDateStr);
        
        if (!saleDate) {
            return {
                warrantyUntil: 'Дата не указана',
                daysLeft: null,
                status: 'unknown',
                years: null,
                saleDateFormatted: 'Не указана'
            };
        }

        // Рассчитываем дату окончания гарантии
        const warrantyUntil = new Date(saleDate);
        warrantyUntil.setDate(warrantyUntil.getDate() + warrantyDays);
        
        const today = new Date();
        // Убираем время из today для корректного сравнения
        today.setHours(0, 0, 0, 0);
        
        const daysLeft = Math.ceil((warrantyUntil - today) / (1000 * 60 * 60 * 24));
        
        // Рассчитываем количество лет гарантии
        const years = (warrantyDays / 365).toFixed(1);
        
        let status = 'valid';
        let statusText = '✅ Гарантия действительна';
        
        if (daysLeft < 0) {
            status = 'expired';
            statusText = '❌ Гарантия истекла';
        } else if (daysLeft < 30) {
            status = 'warning';
            statusText = '⚠️ Гарантия скоро истекает';
        }

        return {
            saleDateFormatted: this.formatDate(saleDate),
            warrantyUntil: this.formatDate(warrantyUntil),
            daysLeft: daysLeft,
            status: status,
            statusText: statusText,
            years: years,
            warrantyDays: warrantyDays
        };
    }

    // ОБНОВЛЕННАЯ функция отображения результатов
    showResult(data) {
        const warrantyInfo = this.calculateWarrantyInfo(data.saleDate, data.warrantyDays);
        
        this.serialNumber.textContent = data.serial;
        this.saleDate.textContent = warrantyInfo.saleDateFormatted;
        this.warrantyUntil.textContent = warrantyInfo.warrantyUntil;
        
        // Обновляем статус
        this.statusIcon.className = 'status-icon ' + warrantyInfo.status;
        this.statusText.className = 'status-text ' + warrantyInfo.status;
        this.statusText.textContent = warrantyInfo.statusText;

        // Дни до окончания
        if (warrantyInfo.daysLeft !== null) {
            if (warrantyInfo.daysLeft < 0) {
                this.daysRemaining.textContent = 'Истекла';
                this.daysRemaining.style.color = '#f56565';
            } else {
                this.daysRemaining.textContent = `${warrantyInfo.daysLeft} дн.`;
                if (warrantyInfo.daysLeft < 30) {
                    this.daysRemaining.style.color = '#ed8936';
                }
                if (warrantyInfo.daysLeft < 7) {
                    this.daysRemaining.style.color = '#f56565';
                }
            }
        }

        // Добавляем информацию о сроке гарантии (если еще не добавлена)
        const resultContent = this.result.querySelector('.result-content');
        
        // Проверяем, есть ли уже строка с сроком гарантии
        const existingWarrantyRow = resultContent.querySelector('.warranty-period-row');
        if (!existingWarrantyRow) {
            const warrantyPeriodRow = document.createElement('div');
            warrantyPeriodRow.className = 'info-row warranty-period-row';
            warrantyPeriodRow.innerHTML = `
                <span class="info-label">Срок гарантии:</span>
                <span class="info-value">${warrantyInfo.years} лет (${warrantyInfo.warrantyDays} дн.)</span>
            `;
            
            // Вставляем перед последней строкой (дни до окончания)
            const daysRow = resultContent.lastElementChild;
            resultContent.insertBefore(warrantyPeriodRow, daysRow);
        }

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
        
        tg.showPopup({
            title: 'Ошибка',
            message: message,
            buttons: [{type: 'ok'}]
        });
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
    
    if (tg.colorScheme === 'dark') {
        document.body.style.background = 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)';
    }
});