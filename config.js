// Конфигурация Google Sheets API
const CONFIG = {
    // ID твоей Google таблицы
    SPREADSHEET_ID: '1ijID-VPJ48qz53gq4MXQTxAxhrFdMuEltm0TY6gwIYQ',
    
    // Название листа с данными (по умолчанию Sheet1)
    SHEET_NAME: 'Sheet1',
    
    // Твой API ключ
    API_KEY: 'AIzaSyAJr_tsIBBK3COL6AL_8fziqJrKDWDhUVM',
    
    // Диапазон данных (A - серийный номер, B - дата продажи, C - срок гарантии в днях)
    // В колонке C указываем количество дней гарантии (730 для 2 лет, 1095 для 3 лет)
    RANGE: 'A:C'
};

// Значение по умолчанию на случай, если в таблице не указан срок гарантии
const DEFAULT_WARRANTY_DAYS = 730; // 2 года (можно изменить на любое значение)