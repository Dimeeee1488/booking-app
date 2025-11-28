# Инструкция по деплою на VPS

## Шаг 1: Создание VPS

### Варианты VPS провайдеров:

1. **Hetzner Cloud** (рекомендую - дешево и быстро)
   - https://www.hetzner.com/cloud
   - Минимум: CX11 (2GB RAM, 1 vCPU) - ~€4/месяц
   - Рекомендуется: CPX11 (2GB RAM, 2 vCPU) - ~€5/месяц

2. **DigitalOcean**
   - https://www.digitalocean.com/
   - Минимум: Basic Droplet (1GB RAM) - $6/месяц
   - Рекомендуется: Basic Droplet (2GB RAM) - $12/месяц

3. **Linode**
   - https://www.linode.com/
   - Минимум: Nanode (1GB RAM) - $5/месяц

4. **Vultr**
   - https://www.vultr.com/
   - Минимум: Regular (1GB RAM) - $6/месяц

### Создание сервера:
1. Зарегистрируйся на выбранном провайдере
2. Создай новый сервер:
   - **OS**: Ubuntu 22.04 LTS
   - **Location**: ближайший к твоим пользователям
   - **Size**: минимум 1GB RAM (рекомендуется 2GB)
3. Сохрани IP адрес сервера

---

## Шаг 2: Подключение к серверу

### Через SSH:
```bash
ssh root@YOUR_SERVER_IP
```

Или если используешь ключ:
```bash
ssh -i ~/.ssh/your_key root@YOUR_SERVER_IP
```

---

## Шаг 3: Автоматическая настройка сервера

Я создал скрипт для автоматической настройки. Выполни на сервере:

```bash
# Скачай и запусти скрипт настройки
curl -fsSL https://raw.githubusercontent.com/Dimeeee1488/booking-app/main/scripts/setup-server.sh | bash
```

Или вручную:

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Установка PM2 для управления процессом
npm install -g pm2

# Установка Nginx
apt install -y nginx

# Установка Certbot для SSL
apt install -y certbot python3-certbot-nginx

# Установка Git
apt install -y git

# Установка UFW (файрвол)
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## Шаг 4: Клонирование и настройка проекта

```bash
# Перейди в домашнюю директорию
cd ~

# Клонируй проект
git clone https://github.com/Dimeeee1488/booking-app.git
cd booking-app

# Установи зависимости
npm install

# Создай файл с переменными окружения
nano .env
```

### Содержимое .env файла:
```env
PORT=3001
NODE_ENV=production

# RapidAPI
RAPIDAPI_KEY=твой_rapidapi_ключ
RAPIDAPI_HOST=booking-com15.p.rapidapi.com

# Telegram Bot
TELEGRAM_BOT_TOKEN=твой_telegram_bot_token
TELEGRAM_CHAT_ID=твой_telegram_chat_id

# CORS (замени на свой домен)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

Сохрани файл: `Ctrl+X`, затем `Y`, затем `Enter`

---

## Шаг 5: Сборка проекта

```bash
# Собери фронтенд
npm run build

# Проверь, что dist папка создалась
ls -la dist/
```

---

## Шаг 6: Настройка PM2

```bash
# Запусти сервер через PM2
pm2 start server.cjs --name booking-app

# Сохрани конфигурацию PM2
pm2 save

# Настрой автозапуск при перезагрузке сервера
pm2 startup
# Выполни команду, которую покажет PM2 (обычно что-то вроде: sudo env PATH=... pm2 startup systemd -u root --hp /root)
```

---

## Шаг 7: Настройка Nginx

```bash
# Создай конфигурацию Nginx
nano /etc/nginx/sites-available/booking-app
```

### Содержимое файла (замени yourdomain.com на свой домен):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Логи
    access_log /var/log/nginx/booking-app-access.log;
    error_log /var/log/nginx/booking-app-error.log;

    # Проксирование на Node.js приложение
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
        
        # Таймауты для долгих запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Сохрани файл: `Ctrl+X`, затем `Y`, затем `Enter`

```bash
# Активируй конфигурацию
ln -s /etc/nginx/sites-available/booking-app /etc/nginx/sites-enabled/

# Удали дефолтную конфигурацию (если есть)
rm -f /etc/nginx/sites-enabled/default

# Проверь конфигурацию
nginx -t

# Перезапусти Nginx
systemctl restart nginx
```

---

## Шаг 8: Настройка SSL (HTTPS)

```bash
# Получи SSL сертификат от Let's Encrypt
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Следуй инструкциям:
# - Введи email
# - Согласись с условиями
# - Выбери редирект с HTTP на HTTPS
```

Certbot автоматически обновит конфигурацию Nginx и добавит SSL.

---

## Шаг 9: Настройка DNS

1. Зайди в панель управления доменом у регистратора
2. Найди раздел DNS Settings
3. Добавь записи:

```
Type    Name    Value           TTL
A       @       YOUR_SERVER_IP  3600
A       www     YOUR_SERVER_IP  3600
```

Или если используешь Cloudflare:
- Добавь A запись: `@` → `YOUR_SERVER_IP`
- Добавь A запись: `www` → `YOUR_SERVER_IP`
- Включи "Proxy" (оранжевое облако) для защиты

---

## Шаг 10: Обновление CORS в .env

После настройки домена обнови CORS:

```bash
nano ~/booking-app/.env
```

Измени:
```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

Перезапусти PM2:
```bash
pm2 restart booking-app
```

---

## Шаг 11: Автоматическое обновление из GitHub

Создай скрипт для автоматического обновления:

```bash
nano ~/booking-app/update.sh
```

Содержимое:
```bash
#!/bin/bash
cd ~/booking-app
git pull origin main
npm install
npm run build
pm2 restart booking-app
echo "Update completed!"
```

Сделай исполняемым:
```bash
chmod +x ~/booking-app/update.sh
```

Теперь для обновления просто выполни:
```bash
~/booking-app/update.sh
```

---

## Полезные команды

### Просмотр логов:
```bash
# Логи приложения
pm2 logs booking-app

# Логи Nginx
tail -f /var/log/nginx/booking-app-access.log
tail -f /var/log/nginx/booking-app-error.log

# Логи системы
journalctl -u nginx -f
```

### Управление PM2:
```bash
pm2 status              # Статус процессов
pm2 restart booking-app  # Перезапуск
pm2 stop booking-app     # Остановка
pm2 start booking-app    # Запуск
pm2 logs booking-app     # Логи
```

### Перезапуск Nginx:
```bash
systemctl restart nginx
systemctl status nginx
```

### Обновление SSL сертификата:
```bash
certbot renew --dry-run  # Тест обновления
certbot renew            # Обновление
```

---

## Безопасность

### Настройка файрвола (UFW):
```bash
ufw status              # Проверка статуса
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP
ufw allow 443/tcp       # HTTPS
ufw enable              # Включить файрвол
```

### Отключение root логина (опционально):
```bash
# Создай нового пользователя
adduser deploy
usermod -aG sudo deploy

# Настрой SSH ключ для нового пользователя
su - deploy
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Вставь свой публичный SSH ключ

# Отключи root логин
sudo nano /etc/ssh/sshd_config
# Измени: PermitRootLogin no
sudo systemctl restart sshd
```

---

## Мониторинг

### Установка мониторинга (опционально):
```bash
pm2 install pm2-logrotate  # Ротация логов
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Резервное копирование

Создай скрипт для бэкапа:

```bash
nano ~/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Бэкап проекта
tar -czf $BACKUP_DIR/booking-app-$DATE.tar.gz ~/booking-app

# Удали старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: booking-app-$DATE.tar.gz"
```

Сделай исполняемым:
```bash
chmod +x ~/backup.sh
```

Добавь в cron для автоматического бэкапа:
```bash
crontab -e
# Добавь строку (бэкап каждый день в 3:00):
0 3 * * * /root/backup.sh
```

---

## Готово!

Теперь твой проект работает на собственном VPS с полным контролем!

**Преимущества:**
- ✅ Полный контроль над сервером
- ✅ Дешевле в долгосрочной перспективе
- ✅ Нет ограничений бесплатного плана
- ✅ Можно настроить как угодно

**Стоимость:**
- VPS: ~$5-10/месяц
- Домен: ~$10-15/год
- **Итого: ~$70-135/год** (вместо $84-144/год на Render)

