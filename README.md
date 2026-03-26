# MVP знакомств для мероприятий

Статический сайт, готовый к публикации на GitHub Pages.

## Структура
- `index.html` - входная точка для GitHub Pages (перенаправляет в `frontend/`).
- `frontend/` - интерфейс приложения (HTML/CSS/JS).
- `data/mock-users.json` - тестовая база из 15 пользователей.
- `docs/` - спецификация MVP.

## Публикация в GitHub Pages
1. Залей проект в репозиторий GitHub.
2. Открой `Settings -> Pages`.
3. В `Build and deployment` выбери:
   - `Source: Deploy from a branch`
   - `Branch: main` (или `master`), папка `/ (root)`
4. Сохрани настройки и дождись публикации.

После деплоя сайт будет доступен по адресу:
- `https://<username>.github.io/<repo>/`

## Локальный запуск
```bash
cd /Users/mishka/Documents/hakaton
python3 -m http.server 8000
```

Открыть:
- `http://localhost:8000/`
