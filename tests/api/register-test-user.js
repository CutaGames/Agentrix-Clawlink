
const axios = require('axios');

async function registerTestUser() {
  const email = 'test@agentrix.io';
  const password = 'Password123!';

  try {
    console.log(`Checking if user ${email} exists...`);
    // Try to login first
    try {
      const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password
      });
      console.log('User already exists and login successful.');
      return;
    } catch (e) {
      // If 401, password might be different, but we'll try to register anyway
      console.log('Login failed, attempting registration...');
    }

    const res = await axios.post('http://localhost:3001/api/auth/register', {
      email,
      password
    });
    console.log('User registered successfully:', res.data.message || 'Success');
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log('User already exists.');
    } else {
      console.error('Registration failed:', error.response ? error.response.data : error.message);
    }
  }
}

registerTestUser();
