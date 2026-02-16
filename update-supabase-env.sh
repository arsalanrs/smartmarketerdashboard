#!/bin/bash
NEW_DB_URL="postgresql://postgres:[?kMGs5i*NV!MAhr]@db.wuicezscactufhvxclhd.supabase.co:5432/postgres"

if [ -f .env ]; then
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
echo "📝 DATABASE_URL updated to Supabase"
