// 最简单的测试
console.log('Step 1: Starting...');

const startTime = Date.now();

process.on('exit', () => {
  console.log('Process exit after', Date.now() - startTime, 'ms');
});

console.log('Step 2: Require @nestjs/common...');
const common = require('@nestjs/common');
console.log('Step 3: @nestjs/common loaded in', Date.now() - startTime, 'ms');

console.log('Step 4: Done!');
