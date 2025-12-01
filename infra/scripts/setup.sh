#!/bin/bash
# ===========================================
# PasarSuara Pintar - Setup Script
# ===========================================

echo "🚀 Setting up PasarSuara Pintar..."

# Check prerequisites
command -v go >/dev/null 2>&1 || { echo "❌ Go is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "⚠️ Docker is optional but recommended."; }

# Copy env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
else
    echo "ℹ️ .env file already exists"
fi

# Install Go dependencies
echo "📦 Installing Go dependencies..."
cd apps/backend && go mod download && cd ../..
cd apps/wa-gateway && go mod download && cd ../..

# Install Node dependencies
echo "📦 Installing Node dependencies..."
cd apps/web && npm install && cd ../..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your API keys"
echo "2. Run 'cd apps/backend && go run cmd/main.go' to start backend"
echo "3. Run 'cd apps/web && npm run dev' to start frontend"
