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
        
        // Приветственная вибрация (очень легкая)
        this.vibrate('light');
    }

    // НОВЫЙ МЕТОД: Вибрация разных типов
    vibrate(type = 'light') {
        if (!tg || !tg.HapticFeedback) return;
        
        try {
            switch(type) {
                case 'light':
                    // Легкое нажатие (для кнопок, полей ввода)
                    tg.HapticFeedback.impactOccurred('light');
                    break;
                    
                case 'medium':
                    // Среднее нажатие (для важных действий)
                    tg.HapticFeedback.impactOccurred('medium');
                    break;
                    
                case 'heavy':
                    // Сильное нажатие (для очень важных действий)
                    tg.HapticFeedback.impactOccurred('heavy');
                    break;
                    
                case 'success':
                    // Успешное действие
                    tg.HapticFeedback.notificationOccurred('success');
                    break;
                    
                case 'error':
                    // Ошибка
                    tg.HapticFeedback.notificationOccurred('error');
                    break;
                    
                case 'warning':
                    // Предупреждение
                    tg.HapticFeedback.notificationOccurred('warning');
                    break;
                    
                case 'selection':
                    // Изменение выделения
                    tg.HapticFeedback.selectionChanged();
                    break;
                    
                default:
                    tg.HapticFeedback.impactOccurred('light');
            }
        } catch (e) {
            console.log('Haptic feedback error:', e);
        }
    }

    loadGoogleAPI() {
        gapi.load('client', () => {
            console.log('Google API загружен');
            this.vibrate('light'); // Легкая вибрация при загрузке API
        });
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => {
            this.vibrate('medium'); // Вибрация при нажатии на поиск
            this.searchSerial();
        });
        
        this.clearBtn.addEventListener('click', () => {
            this.vibrate('light'); // Легкая вибрация при очистке
            this.clearInput();
        });
        
        this.scanBtn.addEventListener('click', () => {
            this.vibrate('heavy'); // Сильная вибрация при открытии сканера
            this.scanQRCode();
        });
        
        this.serialInput.addEventListener('input', () => {
            this.toggleClearButton();
        });
        
        this.serialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.vibrate('medium'); // Вибрация при поиске через Enter
                this.searchSerial();
            }
        });
        
        // Вибрация при фокусе на поле ввода
        this.serialInput.addEventListener('focus', () => {
            this.vibrate('light');
        });
    }

    scanQRCode() {
        if (!tg || !tg.showScanQrPopup) {
            this.showError('Сканирование не поддерживается в этом окружении');
            this.vibrate('error'); // Вибрация ошибки
            return;
        }

        try {
            tg.showScanQrPopup({
                text: 'Наведите камеру на QR-код с серийным номером'
            }, (qrText) => {
                console.log('Отсканирован QR:', qrText);
                
                // Успешное сканирование
                this.vibrate('success'); // Вибрация успеха
                
                // Вставляем отсканированный текст
                this.serialInput.value = qrText;
                this.toggleClearButton();
                
                // Автоматически запускаем поиск после сканирования (опционально)
                setTimeout(() => {
                    this.vibrate('medium');
                    this.searchSerial();
                }, 300);
                
                return true;
            });

            tg.onEvent('scanQrPopupClosed', () => {
                console.log('Сканер закрыт');
                this.vibrate('light'); // Легкая вибрация при закрытии
            });

        } catch (error) {
            console.error('Ошибка при открытии сканера:', error);
            this.showError('Не удалось открыть сканер QR-кодов');
            this.vibrate('error');
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
        this.vibrate('light'); // Легкая вибрация при очистке
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
            this.vibrate('error'); // Вибрация ошибки
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
                this.vibrate('error');
                return;
            }

            // Ищем серийный номер
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
                this.vibrate('success'); // Тройная вибрация успеха
            } else {
                this.showError('Серийный номер не найден');
                this.vibrate('error'); // Вибрация ошибки
            }

        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Ошибка при поиске. Проверьте подключение к интернету.');
            this.vibrate('error');
        } finally {
            this.hideLoader();
        }
    }

    showResult(data) {
        // Парсим дату продажи
        const saleDate = this.parseDate(data.saleDate);
        
        if (!saleDate) {
            this.showError('Неверный формат даты в таблице');
            this.vibrate('error');
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
        
        // Определяем статус с соответствующей вибрацией
        let status = 'valid';
        let statusText = '✅ Гарантия действительна';
        
        if (daysLeft < 0) {
            status = 'expired';
            statusText = '❌ Гарантия истекла';
            this.vibrate('warning'); // Вибрация предупреждения для истекшей гарантии
        } else if (daysLeft < 30) {
            status = 'warning';
            statusText = '⚠️ Гарантия скоро истекает';
            this.vibrate('warning'); // Вибрация предупреждения
        } else {
            this.vibrate('success'); // Успех для действующей гарантии
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
        
        // Дополнительная вибрация при появлении результата
        setTimeout(() => {
            this.vibrate('light');
        }, 200);
    }

    showLoader() {
        this.loader.classList.remove('hidden');
        this.searchBtn.disabled = true;
        this.scanBtn.disabled = true;
        this.vibrate('light'); // Легкая вибрация при начале загрузки
    }

    hideLoader() {
        this.loader.classList.add('hidden');
        this.searchBtn.disabled = false;
        this.scanBtn.disabled = false;
    }

    showError(message) {
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        this.vibrate('error'); // Вибрация ошибки
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