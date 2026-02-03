#!/bin/bash

# MANUAL DEPLOYMENT SCRIPT
# Run this locally when GitHub Actions SSH connectivity fails

set -e

# Configuration - UPDATE THESE VALUES
SERVER_IP="YOUR_SERVER_IP_HERE"  # Replace with your actual server IP
SSH_KEY_PATH="$HOME/.ssh/your-ssh-key"  # Path to your SSH private key

echo "🚀 MANUAL DEPLOYMENT TO VPS"
echo "============================"
echo "Server IP: $SERVER_IP"
echo "SSH Key: $SSH_KEY_PATH"
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ SSH key not found at $SSH_KEY_PATH"
    echo "Please update SSH_KEY_PATH in this script"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm ci
npx prisma generate --schema=./prisma/schema
npm run build

# Create deployment archive
echo "📦 Creating deployment archive..."
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"
cp -r dist package.json package-lock.json prisma "$DEPLOY_DIR/"

echo "📤 Uploading files to server..."
scp -i "$SSH_KEY_PATH" -r "$DEPLOY_DIR" root@$SERVER_IP:/var/www/esghorizon/

echo "⚙️ Installing and starting application..."
ssh -i "$SSH_KEY_PATH" root@$SERVER_IP << 'EOF'
    cd /var/www/esghorizon/backend

    # Backup current deployment
    if [ -d "dist" ]; then
        echo "📋 Creating backup..."
        mv dist dist.backup.$(date +%Y%m%d_%H%M%S)
    fi

    # Move new files
    echo "📁 Deploying new files..."
    mv deploy-*/dist ./
    mv deploy-*/package.json ./
    mv deploy-*/package-lock.json ./
    mv deploy-*/prisma ./

    # Clean up
    rm -rf deploy-*

    # Install dependencies
    echo "📦 Installing dependencies..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    npm install --omit=dev

    # Run migrations
    echo "🗄️ Running database migrations..."
    npx prisma migrate deploy

    # Restart application
    echo "⚙️ Restarting application..."
    pm2 delete esg-backend || true
    PORT=3000 pm2 start dist/src/main.js --name "esg-backend" --node-args="-r dotenv/config"
    pm2 save

    echo "✅ Deployment completed successfully!"
EOF

# Clean up local files
rm -rf "$DEPLOY_DIR"

echo ""
echo "🎉 MANUAL DEPLOYMENT COMPLETED!"
echo "Your application should now be running on the server."