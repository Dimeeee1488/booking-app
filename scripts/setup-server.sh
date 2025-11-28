#!/bin/bash

# Скрипт автоматической настройки сервера для деплоя booking-app
# Использование: curl -fsSL https://raw.githubusercontent.com/Dimeeee1488/booking-app/main/scripts/setup-server.sh | bash

set -e

echo "🚀 Начинаю настройку сервера для booking-app..."

# Обновление системы
echo "📦 Обновляю систему..."
apt update && apt upgrade -y

# Установка Node.js 20.x
echo "📦 Устанавливаю Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Проверка версии Node.js
NODE_VERSION=$(node -v)
echo "✅ Node.js установлен: $NODE_VERSION"

# Установка PM2
echo "📦 Устанавливаю PM2..."
npm install -g pm2

# Установка Nginx
echo "📦 Устанавливаю Nginx..."
apt install -y nginx

# Установка Certbot
echo "📦 Устанавливаю Certbot для SSL..."
apt install -y certbot python3-certbot-nginx

# Установка Git
echo "📦 Устанавливаю Git..."
apt install -y git

# Установка UFW (файрвол)
echo "📦 Настраиваю файрвол..."
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Проверка установленных компонентов
echo ""
echo "✅ Настройка завершена!"
echo ""
echo "Установленные компоненты:"
echo "  - Node.js: $(node -v)"
echo "  - npm: $(npm -v)"
echo "  - PM2: $(pm2 -v)"
echo "  - Nginx: $(nginx -v 2>&1)"
echo "  - Git: $(git --version)"
echo ""
echo "📝 Следующие шаги:"
echo "  1. Клонируй проект: git clone https://github.com/Dimeeee1488/booking-app.git"
echo "  2. Перейди в директорию: cd booking-app"
echo "  3. Установи зависимости: npm install"
echo "  4. Создай .env файл с переменными окружения"
echo "  5. Собери проект: npm run build"
echo "  6. Запусти через PM2: pm2 start server.cjs --name booking-app"
echo "  7. Настрой Nginx (см. VPS_DEPLOYMENT.md)"
echo "  8. Настрой SSL: certbot --nginx -d yourdomain.com"
echo ""

