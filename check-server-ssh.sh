#!/bin/bash

# Check what SSH keys are configured on the server
# Run this locally to see what public keys are authorized

echo "🔍 Check SSH Keys on Server"
echo "==========================="

read -p "Enter your server IP: " SERVER_IP
read -p "Enter path to your SSH private key: " SSH_KEY_PATH

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ SSH key not found at $SSH_KEY_PATH"
    exit 1
fi

echo ""
echo "📋 SSH keys currently authorized on server:"
echo "==========================================="

ssh -i "$SSH_KEY_PATH" root@$SERVER_IP << 'EOF'
    echo "Server hostname: $(hostname)"
    echo "SSH service status:"
    systemctl is-active ssh && echo "✅ SSH service is running" || echo "❌ SSH service is not running"

    echo ""
    echo "Authorized keys file:"
    if [ -f ~/.ssh/authorized_keys ]; then
        echo "Found ~/.ssh/authorized_keys with $(wc -l < ~/.ssh/authorized_keys) keys:"
        echo ""
        cat ~/.ssh/authorized_keys | while read line; do
            # Extract comment/fingerprint info
            if [[ $line == ssh-rsa* ]] || [[ $line == ssh-ed25519* ]] || [[ $line == ecdsa-sha2* ]]; then
                key_type=$(echo $line | awk '{print $1}')
                comment=$(echo $line | awk '{print $3}')
                echo "  🔑 $key_type - Comment: ${comment:-"No comment"}"
            fi
        done
    else
        echo "❌ No ~/.ssh/authorized_keys file found"
    fi

    echo ""
    echo "Firewall status:"
    if command -v ufw >/dev/null 2>&1; then
        ufw status | grep -E "(OpenSSH|22|ALLOW)" || echo "No SSH rules found in UFW"
    else
        echo "UFW not found, checking iptables..."
        iptables -L | grep -i ssh || echo "No SSH rules found in iptables"
    fi
EOF