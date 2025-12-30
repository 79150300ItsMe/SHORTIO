const axios = require('axios');
const url = 'https://videco.me/v/%3Fid=TestDebug736';
console.log('Checking:', url);
axios.head(url, { maxRedirects: 0, validateStatus: null })
    .then(res => {
        console.log('Status:', res.status);
        console.log('Location:', res.headers.location);
    })
    .catch(err => console.error('Error:', err.message));
