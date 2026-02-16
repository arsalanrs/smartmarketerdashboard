#!/bin/bash
# Backup current .env
cp .env .env.backup 2>/dev/null || true

# Update DATABASE_URL for local development
NEW_DB_URL="postgresql://$(whoami)@localhost:5432/pixel_insights?schema=public"

# Check if .env exists
if [ -f .env ]; then
  # Replace DATABASE_URL line
  if grep -q "^DATABASE_URL=" .env; then
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"$NEW_DB_URL\"|" .env
    echo "✅ Updated DATABASE_URL in .env"
  else
    echo "DATABASE_URL=\"$NEW_DB_URL\"" >> .env
    echo "✅ Added DATABASE_URL to .env"
  fi
else
  echo "DATABASE_URL=\"$NEW_DB_URL\"" > .env
  echo "✅ Created .env with DATABASE_URL"
fi

echo ""
echo "📝 DATABASE_URL set to: $NEW_DB_URL"
