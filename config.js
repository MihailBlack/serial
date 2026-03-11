// Конфигурация Google Sheets API
const CONFIG = {
    SPREADSHEET_ID: '1ijID-VPJ48qz53gq4MXQTxAxhrFdMuEltm0TY6gwIYQ',
    SHEET_NAME: 'Sheet1',
    API_KEY: 'AIzaSyAJr_tsIBBK3COL6AL_8fziqJrKDWDhUVM',
    RANGE: 'A:C' // A - серийник, B - дата (ДД.ММ.ГГГГ), C - дни гарантии
};

const DEFAULT_WARRANTY_DAYS = 730; // 2 года по умолчанию