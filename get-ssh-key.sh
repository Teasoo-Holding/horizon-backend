#!/bin/bash

# Script to help extract SSH private key for GitHub Actions
# Run this on your local machine where you have working SSH access to the server

echo "🔑 SSH Key Extraction for GitHub Actions"
echo "========================================"

read -p "Enter your server IP: " SERVER_IP
read -p "Enter path to your existing SSH private key (e.g., ~/.ssh/id_rsa): " SSH_KEY_PATH

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ SSH key not found at $SSH_KEY_PATH"
    exit 1
fi

echo ""
echo "📋 Your SSH private key content (copy this to GitHub Actions secret):"
echo "=================================================================="
echo ""
cat "$SSH_KEY_PATH"
echo ""
echo "=================================================================="

echo ""
echo "📝 INSTRUCTIONS:"
echo "==============="
echo "1. Copy the entire key content above (including -----BEGIN OPENSSH PRIVATE KEY----- and -----END OPENSSH PRIVATE KEY-----)"
echo "2. Go to horizon-backend repo → Settings → Secrets and variables → Actions"
echo "3. Update SSH_PRIVATE_KEY secret with the content above"
echo "4. Also update SERVER_IP secret with: $SERVER_IP"
echo ""

read -p "Do you want to test the SSH connection? (y/n): " test_ssh
if [ "$test_ssh" = "y" ] || [ "$test_ssh" = "Y" ]; then
    echo "Testing SSH connection..."
    ssh -o ConnectTimeout=10 -i "$SSH_KEY_PATH" root@$SERVER_IP "echo '✅ SSH connection successful'"
fi