// Test script to debug the provider setup API issue
const fetch = require('node-fetch');

async function testProviderSetup() {
  try {
    console.log('Testing Provider Setup API...');
    
    // First, let's try to login as provider user
    const loginResponse = await fetch('http://localhost:3000/api/auth/custom-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'provider@pinnacle.com',
        password: 'password123'
      }),
    });

    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginResponse.ok) {
      console.error('Login failed');
      return;
    }

    // Extract session cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies:', cookies);

    // Now test the provider setup POST request
    const setupResponse = await fetch('http://localhost:3000/api/provider/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || '',
      },
      body: JSON.stringify({
        clientId: '259c90b507469ea3ae492800bd1fae48',
        clientSecret: '78865a9f4eaa45aedb21de767bd883112027a403bc1921c9bb811ff5f36dd2e0',
        baseUrl: 'https://sandbox.e-invoice.gov.kh/',
        description: 'Pixel Pinnacle-WG CamInvoice Integration',
        redirectUrls: ['http://localhost:3000/auth/callback'],
      }),
    });

    console.log('Setup response status:', setupResponse.status);
    const setupData = await setupResponse.json();
    console.log('Setup response:', setupData);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProviderSetup();
