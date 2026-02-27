#!/bin/bash

echo "🔍 SSH Connection Diagnostics"
echo "=============================="

# Check if SSH service is running
echo "1. Checking SSH service status..."
if systemctl is-active --quiet ssh; then
    echo "✅ SSH service is running"
else
    echo "❌ SSH service is not running"
    echo "   Try: sudo systemctl start ssh"
fi

# Check SSH port
echo ""
echo "2. Checking SSH port (22)..."
if netstat -tlnp | grep :22 > /dev/null; then
    echo "✅ SSH port 22 is open"
else
    echo "❌ SSH port 22 is not open"
fi

# Check firewall
echo ""
echo "3. Checking firewall status..."
if command -v ufw >/dev/null 2>&1; then
    echo "UFW status:"
    sudo ufw status | head -10
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "FirewallD status:"
    sudo firewall-cmd --list-all
else
    echo "No common firewall detected"
fi

# Check server IP
echo ""
echo "4. Server network information:"
echo "External IP: $(curl -s ifconfig.me || echo 'Unable to determine')"
echo "Local IPs:"
ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print "  " $2}'
echo "Default gateway:"
ip route show | grep default || echo "No default route found"

# Test SSH key (you'll need to provide the public key)
echo ""
echo "5. SSH Key information:"
echo "Authorized keys file:"
if [ -f ~/.ssh/authorized_keys ]; then
    echo "  Found ~/.ssh/authorized_keys with $(wc -l < ~/.ssh/authorized_keys) key(s)"
else
    echo "  ❌ ~/.ssh/authorized_keys not found"
fi

echo ""
echo "6. Recent SSH logs:"
echo "Last 10 SSH connection attempts:"
sudo journalctl -u ssh -n 10 --no-pager -q 2>/dev/null || echo "Unable to read SSH logs"

echo ""
echo "🔧 Quick fixes to try:"
echo "1. sudo systemctl start ssh"
echo "2. sudo ufw allow 22/tcp"
echo "3. Check if your server IP has changed - update SERVER_IP secret in GitHub"
echo "4. Verify SSH private key is still valid"
echo "5. Test manual SSH: ssh -i /path/to/key root@YOUR_SERVER_IP"
echo "6. Check VPS provider firewall - they often block GitHub Actions IPs"
echo "7. Try different SSH port or contact your VPS provider about connectivity"