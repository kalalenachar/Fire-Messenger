#!/bin/bash
# =================================================================
# 🚀 AGNI MESSENGER - AUTOMATED ORACLE CLOUD UBUNTU DEPLOYMENT SCRIPT
# =================================================================

set -e

echo "🔥 Starting Agni Messenger Deployment on Oracle Cloud Ubuntu..."

# 1. Update System & Firewall Rules
echo "🔓 Step 1: Setting up Linux Firewall Rules (ports 80, 443, 5000)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5000 -j ACCEPT || true

if command -v netfilter-persistent &> /dev/null; then
    sudo netfilter-persistent save || true
fi

# 2. Install Dependencies
echo "📦 Step 2: Installing Node.js 20, Nginx, and PM2..."
sudo apt update -y
sudo apt install -y curl git build-essential nginx iptables-persistent

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 3. Install NPM Dependencies & Build React Bundle
echo "🔨 Step 3: Installing project dependencies & building production bundle..."
npm install --legacy-peer-deps
npm run build

# 4. Configure PM2 Process Manager
echo "🔄 Step 4: Starting Node.js backend & Socket.IO server with PM2..."
pm2 stop agni-messenger || true
pm2 delete agni-messenger || true
pm2 start server.js --name "agni-messenger"
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER || true

# 5. Configure Nginx Reverse Proxy for agni.run.place & Public IP
echo "🌐 Step 5: Configuring Nginx Reverse Proxy with WebSockets & SSL support..."
sudo apt install -y certbot python3-certbot-nginx

cat << 'NGINX_CONF' | sudo tee /etc/nginx/sites-available/agni-messenger
server {
    listen 80;
    listen [::]:80;
    server_name agni.run.place 140.245.245.37 _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # WebSockets for Socket.IO & WebRTC
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONF

sudo ln -sf /etc/nginx/sites-available/agni-messenger /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Automatically run Certbot for agni.run.place if requested
if [ -d "/etc/letsencrypt/live/agni.run.place" ]; then
    echo "🔒 Existing SSL Certificate found for agni.run.place! Re-applying Certbot SSL..."
    sudo certbot --nginx -d agni.run.place --non-interactive --reinstall || true
else
    echo "🔒 Configuring Certbot SSL for agni.run.place..."
    sudo certbot --nginx -d agni.run.place --non-interactive --agree-tos --register-unsafely-without-email || true
fi

sudo systemctl reload nginx

echo "================================================================="
echo "🎉 AGNI MESSENGER IS DEPLOYED & RUNNING SUCCESSFULLY!"
echo "👉 Domain HTTPS URL: https://agni.run.place"
echo "👉 Direct IP URL:    http://140.245.245.37"
echo "================================================================="
