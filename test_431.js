const axios = require('axios');
const token = '96652654-d76d-42ae-8cec-4cb89915ae54';

async function test() {
  try {
    console.log('Testing 4000...');
    const r1 = await axios.post('http://127.0.0.1:4000/auth/validate', { token });
    console.log('4000 OK:', r1.data);
  } catch(e) {
    console.error('4000 FAIL:', e.response?.status, e.response?.data);
  }
  
  try {
    console.log('Testing 3000...');
    const r2 = await axios.get('http://127.0.0.1:3000/api/evaluasi/kegiatan/semua', {
      headers: { 'x-api-key': 'gaspol_secret_key_2026' }
    });
    console.log('3000 OK:', r2.data.data ? r2.data.data.length + ' items' : 'no items');
  } catch(e) {
    console.error('3000 FAIL:', e.response?.status, e.response?.data);
  }
}
test();
