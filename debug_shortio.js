require('dotenv').config();
const axios = require('axios');

async function test() {
    const apiKey = process.env.SHORTIO_API_KEY_VIDECO;
    const domain = 'videco.me';
    const originalURL = 'https://example.com';
    const path = 'v/?id=TestDebug' + Math.floor(Math.random() * 1000);

    console.log(`Testing creation with path: "${path}" on domain: "${domain}"`);

    try {
        const response = await axios.post('https://api.short.io/links', {
            originalURL,
            domain,
            path
        }, {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });
        console.log('Success!');
        console.log('Short URL:', response.data.shortURL);
        console.log('Path returned:', response.data.path);
    } catch (error) {
        console.error('Error!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

test();
