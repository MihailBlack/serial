// Конфигурация Google Sheets API
const CONFIG = {
    // ID твоей Google таблицы
    SPREADSHEET_ID: '1ijID-VPJ48qz53gq4MXQTxAxhrFdMuEltm0TY6gwIYQ',
    
    // Название листа с данными (по умолчанию Sheet1)
    SHEET_NAME: 'Sheet1',
    
    // Твой API ключ
    API_KEY: 'AIzaSyAJr_tsIBBK3COL6AL_8fziqJrKDWDhUVM',
    
    // Диапазон данных (A - серийный номер, B - дата продажи, C - гарантия)
    RANGE: 'A:C'
};

// Настройки гарантии по умолчанию (в днях)
// Используется, если в таблице не указан свой срок гарантии
const WARRANTY_DAYS = 365; // 1 год