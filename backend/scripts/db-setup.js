const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const ENV_PATH = path.join(__dirname, '../.env');

// Read existing schema to preserve models
let schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');

// Determine Environment
// Priority: Argument -> NODE_ENV -> Default to 'development'
const args = process.argv.slice(2);
const forcedEnv = args[0]; // 'dev' or 'prod'
const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = forcedEnv === 'prod' || (!forcedEnv && nodeEnv === 'production');

console.log(`🔧 Configuring Database for: ${isProd ? 'PRODUCTION (PostgreSQL)' : 'DEVELOPMENT (SQLite)'}`);

// 1. Define Datasource Block
let datasourceBlock;
if (isProd) {
    datasourceBlock = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;
} else {
    datasourceBlock = `datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}`;
}

// 2. Replace Datasource in Schema
// Regex looks for "datasource db { ... }" block including newlines
const newSchemaContent = schemaContent.replace(/datasource db \{[\s\S]*?\}/, datasourceBlock);

fs.writeFileSync(SCHEMA_PATH, newSchemaContent);
console.log(`✅ updated schema.prisma`);

// 3. Run Prisma Generate (Required to update Client)
try {
    console.log('🔄 Running prisma generate...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '../') });
} catch (error) {
    console.error('❌ Failed to generate prisma client');
    process.exit(1);
}

// 4. Handle DB Sync/Migration
if (isProd) {
    // In Prod, we expect migrations to be applied via deployment pipeline usually, 
    // but here we can optionally run it if requested or leave it to start script.
    console.log('ℹ️ Production mode: Run "npx prisma migrate deploy" to apply migrations.');
} else {
    // In Dev (SQLite), we use db push to sync schema rapidly
    try {
        console.log('🔄 Syncing SQLite database (db push)...');
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: path.join(__dirname, '../') });
        console.log('✅ SQLite database ready at backend/dev.db');
    } catch (error) {
        console.error('❌ Failed to sync SQLite db');
        process.exit(1);
    }
}
