sudo chown -R node:node . 

if [ -f package.json ]; then
    pnpm install
    npx playwright install --with-deps chromium
fi

pip install requests python-dotenv