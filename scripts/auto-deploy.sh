#!/bin/bash

# Полностью автоматический деплой - запусти один раз и всё работает
# Использование: curl -fsSL https://raw.githubusercontent.com/Dimeeee1488/booking-app/main/scripts/auto-deploy.sh | bash

set -e

echo "🚀 Автоматический деплой booking-app..."
echo "📝 Всё настроится автоматически, контроль не требуется"

# Обновление системы
echo "📦 Обновляю систему..."
apt update -qq && apt upgrade -y -qq

# Установка Node.js
echo "📦 Устанавливаю Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs -qq

# Установка PM2
echo "📦 Устанавливаю PM2..."
npm install -g pm2 -q

# Установка Nginx
echo "📦 Устанавливаю Nginx..."
apt install -y nginx -qq

# Установка Certbot
echo "📦 Устанавливаю Certbot..."
apt install -y certbot python3-certbot-nginx -qq

# Установка Git
apt install -y git -qq

# Настройка файрвола
echo "🔒 Настраиваю файрвол..."
ufw --force allow 22/tcp > /dev/null 2>&1
ufw --force allow 80/tcp > /dev/null 2>&1
ufw --force allow 443/tcp > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1

# Клонирование проекта
echo "📥 Клонирую проект..."
if [ ! -d "/root/booking-app" ]; then
    git clone https://github.com/Dimeeee1488/booking-app.git /root/booking-app -q
else
    cd /root/booking-app
    git pull origin main -q
fi

cd /root/booking-app

# Установка зависимостей
echo "📦 Устанавливаю зависимости..."
npm install --silent

# Создание .env файла если его нет
if [ ! -f "/root/booking-app/.env" ]; then
    echo "📝 Создаю .env файл..."
    cat > /root/booking-app/.env << EOF
PORT=3001
NODE_ENV=production
RAPIDAPI_KEY=${RAPIDAPI_KEY:-your_rapidapi_key_here}
RAPIDAPI_HOST=booking-com15.p.rapidapi.com
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-}
CORS_ORIGIN=*
EOF
    echo "⚠️  ВАЖНО: Отредактируй /root/booking-app/.env и добавь свои ключи!"
fi

# Сборка проекта
echo "🔨 Собираю проект..."
npm run build > /dev/null 2>&1

# Настройка PM2
echo "⚙️  Настраиваю PM2..."
pm2 delete booking-app 2>/dev/null || true
pm2 start server.cjs --name booking-app --silent
pm2 save --silent
pm2 startup systemd -u root --hp /root | grep "sudo" | bash || true

# Настройка Nginx
echo "⚙️  Настраиваю Nginx..."
cat > /etc/nginx/sites-available/booking-app << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;

    access_log /var/log/nginx/booking-app-access.log;
    error_log /var/log/nginx/booking-app-error.log;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_CONFIG

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/booking-app /etc/nginx/sites-enabled/
nginx -t > /dev/null 2>&1
systemctl restart nginx > /dev/null 2>&1

# Настройка автоматического обновления
echo "⚙️  Настраиваю автоматическое обновление..."
cat > /root/booking-app/auto-update.sh << 'UPDATE_SCRIPT'
#!/bin/bash
cd /root/booking-app
git pull origin main -q
npm install --silent
npm run build > /dev/null 2>&1
pm2 restart booking-app --silent
UPDATE_SCRIPT

chmod +x /root/booking-app/auto-update.sh

# Добавление в cron (обновление каждый день в 3:00)
(crontab -l 2>/dev/null | grep -v "auto-update.sh"; echo "0 3 * * * /root/booking-app/auto-update.sh >> /var/log/booking-app-update.log 2>&1") | crontab -

# Настройка ротации логов PM2
pm2 install pm2-logrotate -q
pm2 set pm2-logrotate:max_size 10M -q
pm2 set pm2-logrotate:retain 7 -q

echo ""
echo "✅ Деплой завершён!"
echo ""
echo "📊 Статус:"
pm2 status
echo ""
echo "🌐 Приложение доступно по адресу: http://$(curl -s ifconfig.me)"
echo ""
echo "📝 Следующие шаги:"
echo "  1. Отредактируй /root/booking-app/.env и добавь свои API ключи"
echo "  2. Перезапусти: pm2 restart booking-app"
echo "  3. Если есть домен, настрой DNS и SSL: certbot --nginx -d yourdomain.com"
echo ""
echo "🔄 Автоматическое обновление настроено (каждый день в 3:00)"
echo "📋 Логи: pm2 logs booking-app"

