console.log('Test 1: Basic console works');

try {
  console.log('Test 2a: Loading ConfigModule...');
  const { ConfigModule } = require('@nestjs/config');
  console.log('Test 2b: ConfigModule loaded');
  
  console.log('Test 3a: Loading TypeOrmModule...');
  const { TypeOrmModule } = require('@nestjs/typeorm');
  console.log('Test 3b: TypeOrmModule loaded');
  
  console.log('Test 4a: Loading database config...');
  const { HqDatabaseConfig } = require('./dist/config/database.config');
  console.log('Test 4b: HqDatabaseConfig loaded');
  
  console.log('Test 5a: Loading entities...');
  const path = require('path');
  const entityPath = path.join(__dirname, 'dist/entities/*.entity.js');
  console.log('Test 5b: Entity path:', entityPath);
  
  const glob = require('glob');
  const files = glob.sync('./dist/entities/*.entity.js');
  console.log('Test 5c: Entity files found:', files);
  
  for (const file of files) {
    console.log(`Test 5d: Loading ${file}...`);
    require(file);
    console.log(`Test 5e: ${file} loaded`);
  }
  
  console.log('Test 6: All entities loaded successfully');
  
} catch (err) {
  console.error('Test ERROR:', err);
}
