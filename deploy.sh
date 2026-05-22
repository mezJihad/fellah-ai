#!/bin/bash
set -e

APP_DIR="/var/www/fellah-ai"

echo "🚀 Déploiement Fellah AI..."

cd $APP_DIR

echo "📥 Pull des dernières modifications..."
git pull

echo "📦 Installation des dépendances..."
npm install

echo "🔨 Build..."
npm run build

echo "♻️  Redémarrage PM2..."
pm2 restart fellah-ai

echo "✅ Déploiement terminé !"
pm2 status
