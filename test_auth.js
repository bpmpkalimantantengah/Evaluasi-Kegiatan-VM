const axios = require('axios');
axios.post('https://168-110-208-72.nip.io/evaluasi/api/action', {
  action: 'getSemuaKegiatan',
  token: '96652654-d76d-42ae-8cec-4cb89915ae54'
}).then(r => console.log('SUCCESS:', r.data))
.catch(e => console.error('ERROR:', e.response ? e.response.data : e.message));
