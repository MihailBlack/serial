// Обновленная функция findSerial в app.js
findSerial(data, searchSerial) {
    if (!data || data.length === 0) return null;
    
    // Пропускаем заголовки, если они есть
    const startIndex = data[0][0] === 'Серийный номер' ? 1 : 0;
    
    for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (row[0] && row[0].toString().toLowerCase() === searchSerial.toLowerCase()) {
            
            // Получаем срок гарантии из таблицы (колонка C)
            // Если в таблице пусто, используем DEFAULT_WARRANTY_DAYS
            let warrantyDays = DEFAULT_WARRANTY_DAYS;
            if (row[2] && !isNaN(parseInt(row[2]))) {
                warrantyDays = parseInt(row[2]);
            }
            
            return {
                serial: row[0],
                saleDate: row[1] || 'Не указана',
                warrantyDays: warrantyDays // Используем срок из таблицы
            };
        }
    }
    
    return null;
}

// Обновленная функция calculateWarrantyInfo
calculateWarrantyInfo(saleDateStr, warrantyDays) {
    const saleDate = new Date(saleDateStr);
    if (isNaN(saleDate.getTime())) {
        return {
            warrantyUntil: 'Дата не указана',
            daysLeft: null,
            status: 'unknown',
            years: null
        };
    }

    const warrantyUntil = new Date(saleDate);
    warrantyUntil.setDate(warrantyUntil.getDate() + warrantyDays);
    
    const today = new Date();
    const daysLeft = Math.ceil((warrantyUntil - today) / (1000 * 60 * 60 * 24));
    
    // Рассчитываем количество лет гарантии
    const years = (warrantyDays / 365).toFixed(1);
    
    let status = 'valid';
    if (daysLeft < 0) status = 'expired';
    else if (daysLeft < 30) status = 'warning';
    else status = 'valid';

    return {
        warrantyUntil: warrantyUntil.toLocaleDateString('ru-RU'),
        daysLeft: daysLeft,
        status: status,
        years: years,
        warrantyDays: warrantyDays
    };
}

// Обновленная функция showResult
showResult(data) {
    const warrantyInfo = this.calculateWarrantyInfo(data.saleDate, data.warrantyDays);
    
    this.serialNumber.textContent = data.serial;
    this.saleDate.textContent = new Date(data.saleDate).toLocaleDateString('ru-RU');
    this.warrantyUntil.textContent = warrantyInfo.warrantyUntil;
    
    // Добавляем информацию о сроке гарантии
    const warrantyPeriodText = document.createElement('div');
    warrantyPeriodText.className = 'info-row';
    warrantyPeriodText.innerHTML = `
        <span class="info-label">Срок гарантии:</span>
        <span class="info-value">${warrantyInfo.years} лет (${warrantyInfo.warrantyDays} дн.)</span>
    `;
    
    // Вставляем перед строкой с остатком дней
    const resultContent = this.result.querySelector('.result-content');
    const daysRow = resultContent.lastElementChild;
    resultContent.insertBefore(warrantyPeriodText, daysRow);
    
    // Обновляем статус
    this.statusIcon.className = 'status-icon ' + warrantyInfo.status;
    this.statusText.className = 'status-text ' + warrantyInfo.status;
    
    if (warrantyInfo.status === 'valid') {
        this.statusText.textContent = '✅ Гарантия действительна';
    } else if (warrantyInfo.status === 'warning') {
        this.statusText.textContent = '⚠️ Гарантия скоро истекает';
    } else if (warrantyInfo.status === 'expired') {
        this.statusText.textContent = '❌ Гарантия истекла';
    }

    // Дни до окончания
    if (warrantyInfo.daysLeft !== null) {
        let daysClass = 'days-remaining';
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

    this.result.classList.remove('hidden');
}