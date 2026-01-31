console.log('Test 1: Basic console works');

try {
  console.log('Test 2: Loading app.module...');
  const { AppModule } = require('./dist/app.module');
  console.log('Test 3: AppModule loaded:', typeof AppModule);
  
  console.log('Test 4: Loading NestJS...');
  const { NestFactory } = require('@nestjs/core');
  console.log('Test 5: NestFactory loaded:', typeof NestFactory);
  
  console.log('Test 6: Starting application...');
  NestFactory.create(AppModule).then(app => {
    console.log('Test 7: App created');
    app.listen(3005).then(() => {
      console.log('Test 8: Listening on 3005');
    });
  }).catch(err => {
    console.error('Test ERROR in create:', err);
  });
} catch (err) {
  console.error('Test ERROR:', err);
}
