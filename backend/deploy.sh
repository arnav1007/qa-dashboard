#!/bin/bash
# Deployment script for AWS EC2

echo "Installing system dependencies..."
sudo apt update
sudo apt install -y python3-pip python3-venv nginx

echo "Creating application directory..."
cd /home/ubuntu
mkdir -p qa-dashboard-backend
cd qa-dashboard-backend

echo "Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Setting up environment variables..."
# Create .env file with your actual values
cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF

echo "Setting up systemd service..."
sudo tee /etc/systemd/system/qa-dashboard.service > /dev/null << EOF
[Unit]
Description=Q&A Dashboard FastAPI Application
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/qa-dashboard-backend
Environment="PATH=/home/ubuntu/qa-dashboard-backend/venv/bin"
ExecStart=/home/ubuntu/qa-dashboard-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
EOF

echo "Setting up Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/qa-dashboard > /dev/null << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/qa-dashboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable qa-dashboard
sudo systemctl start qa-dashboard
sudo systemctl restart nginx

echo "Deployment complete!"
echo "Check status with: sudo systemctl status qa-dashboard"

