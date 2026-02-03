#!/bin/bash

# Generate new SSH keys for GitHub Actions deployment
# This creates a fresh key pair and shows you exactly what to copy to GitHub

echo "🔑 Generate New SSH Keys for GitHub Actions"
echo "==========================================="

KEY_NAME="github-actions-$(date +%Y%m%d)"
KEY_PATH="$HOME/.ssh/$KEY_NAME"

echo "Generating new SSH key pair..."
ssh-keygen -t rsa -b 4096 -C "github-actions-backend" -f "$KEY_PATH" -N ""

echo ""
echo "✅ SSH keys generated successfully!"
echo "Private key: $KEY_PATH"
echo "Public key: $KEY_PATH.pub"
echo ""

echo "📋 PUBLIC KEY (add this to your server's ~/.ssh/authorized_keys):"
echo "================================================================="
cat "$KEY_PATH.pub"
echo ""
echo "================================================================="

echo ""
echo "📋 PRIVATE KEY (copy this to GitHub Actions SSH_PRIVATE_KEY secret):"
echo "====================================================================="
cat "$KEY_PATH"
echo ""
echo "====================================================================="

echo ""
echo "📝 SETUP INSTRUCTIONS:"
echo "======================"
echo "1. Copy the PUBLIC KEY above and add it to your server's ~/.ssh/authorized_keys"
echo "   You can do this by running on your server:"
echo "   echo 'PASTE_PUBLIC_KEY_HERE' >> ~/.ssh/authorized_keys"
echo ""
echo "2. Copy the PRIVATE KEY above and add it to:"
echo "   - horizon-backend repo → Settings → Secrets → SSH_PRIVATE_KEY"
echo ""
echo "3. Make sure SERVER_IP secret is set: 46.202.140.73"
echo ""
echo "4. Test the connection:"
echo "   ssh -i $KEY_PATH root@46.202.140.73 'echo \"SSH works!\"'"
echo ""

echo ""
echo "🔐 Key files created:"
echo "  Private: $KEY_PATH"
echo "  Public: $KEY_PATH.pub"
echo ""
echo "⚠️  IMPORTANT: Keep the private key secure and never commit it to git!"

read -p "Do you want to test the SSH connection now? (y/n): " test_now
if [ "$test_now" = "y" ] || [ "$test_now" = "Y" ]; then
    echo "Testing SSH connection..."
    ssh -o ConnectTimeout=10 -i "$KEY_PATH" root@46.202.140.73 "echo '✅ SSH connection successful with new key!'"
fi