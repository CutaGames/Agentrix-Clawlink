const fs = require('fs');
const path = 'backend/src/migrations/1768743398996-fix-missing-columns.ts';

let content = fs.readFileSync(path, 'utf8');

// Add IF EXISTS
content = content.replace(/DROP COLUMN (?!IF EXISTS)/g, 'DROP COLUMN IF EXISTS ');
content = content.replace(/DROP CONSTRAINT (?!IF EXISTS)/g, 'DROP CONSTRAINT IF EXISTS ');
content = content.replace(/DROP INDEX (?!IF EXISTS)/g, 'DROP INDEX IF EXISTS ');
content = content.replace(/DROP TYPE (?!IF EXISTS)/g, 'DROP TYPE IF EXISTS ');

// Fix doubles
content = content.replace(/IF EXISTS IF EXISTS/g, 'IF EXISTS');

// Wrap ALTER TABLE
content = content.replace(/await queryRunner\.query\(`ALTER TABLE "([^"]+)" ([^`]+)`\);/g, (match, table, action) => {
  return `await queryRunner.query(\`DO $$ BEGIN ALTER TABLE "${table}" ${action}; EXCEPTION WHEN undefined_table THEN NULL; END $$;\`);`;
});

fs.writeFileSync(path, content);
console.log('Fixed migration file.');
