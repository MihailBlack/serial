// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран
tg.enableClosingConfirmation(); // Подтверждение закрытия

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
        
        // Элементы результата
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
                // Отправляем данные в Telegram бот
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

    findSerial(data, searchSerial) {
        if (!data || data.length === 0) return null;
        
        // Пропускаем заголовки, если они есть
        const startIndex = data[0][0] === 'Серийный номер' ? 1 : 0;
        
        for (let i = startIndex; i < data.length; i++) {
            const row = data[i];
            if (row[0] && row[0].toString().toLowerCase() === searchSerial.toLowerCase()) {
                return {
                    serial: row[0],
                    saleDate: row[1] || 'Не указана',
                    warrantyPeriod: row[2] || WARRANTY_DAYS
                };
            }
        }
        
        return null;
    }

    calculateWarrantyInfo(saleDateStr, warrantyDays) {
        const saleDate = new Date(saleDateStr);
        if (isNaN(saleDate.getTime())) {
            return {
                warrantyUntil: 'Дата не указана',
                daysLeft: null,
                status: 'unknown'
            };
        }

        const warrantyUntil = new Date(saleDate);
        warrantyUntil.setDate(warrantyUntil.getDate() + parseInt(warrantyDays));
        
        const today = new Date();
        const daysLeft = Math.ceil((warrantyUntil - today) / (1000 * 60 * 60 * 24));
        
        let status = 'valid';
        if (daysLeft < 0) status = 'expired';
        else if (daysLeft < 30) status = 'warning';
        else status = 'valid';

        return {
            warrantyUntil: warrantyUntil.toLocaleDateString('ru-RU'),
            daysLeft: daysLeft,
            status: status
        };
    }

    showResult(data) {
        const warrantyInfo = this.calculateWarrantyInfo(data.saleDate, data.warrantyPeriod);
        
        this.serialNumber.textContent = data.serial;
        this.saleDate.textContent = new Date(data.saleDate).toLocaleDateString('ru-RU');
        this.warrantyUntil.textContent = warrantyInfo.warrantyUntil;
        
        // Обновляем статус
        this.statusIcon.className = 'status-icon ' + warrantyInfo.status;
        this.statusText.className = 'status-text ' + warrantyInfo.status;
        
        if (warrantyInfo.status === 'valid') {
            this.statusText.textContent = 'Гарантия действительна';
        } else if (warrantyInfo.status === 'warning') {
            this.statusText.textContent = 'Гарантия скоро истекает';
        } else if (warrantyInfo.status === 'expired') {
            this.statusText.textContent = 'Гарантия истекла';
        }

        // Дни до окончания
        if (warrantyInfo.daysLeft !== null) {
            let daysClass = 'days-remaining';
            if (warrantyInfo.daysLeft < 0) {
                this.daysRemaining.textContent = 'Истекла';
            } else {
                this.daysRemaining.textContent = `${warrantyInfo.daysLeft} дн.`;
                if (warrantyInfo.daysLeft < 30) daysClass += ' warning';
                if (warrantyInfo.daysLeft < 7) daysClass += ' critical';
            }
            this.daysRemaining.className = daysClass;
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
        
        // Показываем уведомление в Telegram
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
    
    // Настраиваем тему Telegram
    if (tg.colorScheme === 'dark') {
        document.body.style.background = 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)';
    }
});