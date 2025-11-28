# Руководство по деплою и настройке домена

## Текущая ситуация
Проект уже развернут на **Render.com** через GitHub.

## Варианты настройки

### Вариант 1: Остаться на Render + купить домен (РЕКОМЕНДУЕТСЯ)

#### Шаг 1: Покупка домена
1. **Где купить домен:**
   - **Namecheap.com** (рекомендую) - дешево и надежно
   - **Cloudflare Registrar** - самая низкая цена, хорошая защита
   - **GoDaddy** - популярный, но дороже
   - **Google Domains** - простой интерфейс

2. **Выбери домен:**
   - Например: `yourbooking.com`, `booktravel.com`, `mybooking.site`
   - Проверь доступность на сайте регистратора

#### Шаг 2: Настройка домена на Render
1. Зайди в **Render Dashboard** → выбери свой сервис
2. Перейди в **Settings** → **Custom Domains**
3. Нажми **Add Custom Domain**
4. Введи свой домен (например: `yourbooking.com`)
5. Render покажет DNS записи, которые нужно добавить

#### Шаг 3: Настройка DNS у регистратора
1. Зайди в панель управления доменом у регистратора
2. Найди раздел **DNS Settings** или **Name Servers**
3. Добавь записи, которые показал Render:
   - **A Record**: `@` → IP адрес от Render
   - **CNAME Record**: `www` → `your-app.onrender.com`
   - Или используй **Name Servers** от Render (если поддерживается)

4. **Подожди 24-48 часов** для распространения DNS

#### Шаг 4: Настройка SSL
- Render автоматически выдаст SSL сертификат через Let's Encrypt
- После настройки DNS SSL активируется автоматически

---

### Вариант 2: Переход на VPS (DigitalOcean, Hetzner, etc.)

#### Преимущества VPS:
- Полный контроль
- Дешевле в долгосрочной перспективе
- Можно настроить как угодно

#### Недостатки:
- Нужно самому настраивать сервер
- Нужно следить за безопасностью
- Нужно настраивать SSL вручную

#### Шаги для деплоя на VPS:

1. **Создай VPS:**
   - DigitalOcean: Droplet (Ubuntu 22.04, минимум 1GB RAM)
   - Hetzner: Cloud Server (Ubuntu 22.04)
   - Linode: Nanode (Ubuntu 22.04)

2. **Подключись к серверу:**
   ```bash
   ssh root@your-server-ip
   ```

3. **Установи Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Установи PM2 (для управления процессом):**
   ```bash
   sudo npm install -g pm2
   ```

5. **Клонируй проект:**
   ```bash
   git clone https://github.com/Dimeeee1488/booking-app.git
   cd booking-app
   npm install
   ```

6. **Настрой переменные окружения:**
   ```bash
   cp server.env.example .env
   nano .env
   # Добавь все нужные переменные
   ```

7. **Собери проект:**
   ```bash
   npm run build
   ```

8. **Запусти сервер через PM2:**
   ```bash
   pm2 start server.cjs --name booking-app
   pm2 save
   pm2 startup
   ```

9. **Настрой Nginx (для проксирования):**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/booking-app
   ```
   
   Конфигурация Nginx:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   sudo ln -s /etc/nginx/sites-available/booking-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Настрой SSL через Certbot:**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```

---

### Вариант 3: Vercel/Netlify (для статики + серверные функции)

**Не рекомендуется** для этого проекта, так как у нас есть Express сервер (`server.cjs`), который нужен для проксирования API запросов.

---

## Рекомендация

**Остаться на Render + купить домен** - это самый простой и надежный вариант:
- ✅ Не нужно настраивать сервер
- ✅ Автоматический SSL
- ✅ Автоматические деплои из GitHub
- ✅ Бесплатный план для начала (с ограничениями)
- ✅ Легко масштабировать

## Стоимость

### Render:
- **Free план**: бесплатно (с ограничениями)
- **Starter план**: $7/месяц (рекомендуется для продакшена)

### Домен:
- **.com**: ~$10-15/год
- **.site**: ~$3-5/год
- **.online**: ~$1-3/год

### Итого:
- **Минимум**: ~$10-15/год (домен + Render Free)
- **Рекомендуется**: ~$100-120/год (домен + Render Starter)

## Что нужно сделать сейчас

1. **Реши, какой вариант тебе подходит**
2. **Если остаешься на Render:**
   - Купи домен
   - Настрой DNS записи
   - Добавь домен в Render Dashboard
3. **Если переходишь на VPS:**
   - Создай VPS
   - Следуй инструкциям выше
   - Настрой домен через DNS регистратора

## Помощь

Если нужна помощь с настройкой - напиши, какой вариант выбрал, и я помогу с конкретными шагами!

