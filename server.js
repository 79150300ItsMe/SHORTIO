const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to format slug
const formatSlug = (slug) => {
    if (!slug) return undefined;
    if (slug.includes('=') || slug.includes('/') || slug.includes('%3D')) {
        return slug;
    }
    return `v7id=${slug}`;
};

// Helper to generate random string
const generateRandomString = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// API: Create Single
app.post('/api/create-single', async (req, res) => {
    const { originalURL, idLength, customSlug, allowFallback = true, domain, format } = req.body;

    let apiKey;
    if (domain === 'govidey.site') {
        apiKey = process.env.SHORTIO_API_KEY_GOVIDEY;
    } else if (domain === 'govldey.site') {
        apiKey = process.env.SHORTIO_API_KEY_GOVLDEY;
    } else if (domain === 'vidby.it') {
        apiKey = process.env.SHORTIO_API_KEY_VIDBY;
    } else if (domain === 'videco.me') {
        apiKey = process.env.SHORTIO_API_KEY_VIDECO;
    }

    console.log('API create-single called');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Selected Domain:', domain);

    if (!apiKey || !domain) {
        return res.status(400).json({ error: 'Invalid or missing domain. Supported domains: govidey.site, govldey.site, vidby.it, videco.me' });
    }

    if (!originalURL) {
        return res.status(400).json({ error: 'originalURL is required' });
    }

    let path = undefined;
    if (customSlug && typeof customSlug === 'string' && customSlug.trim().length > 0) {
        path = formatSlug(customSlug.trim());
    } else {
        // Generate random ID based on format
        if (format === 'vid') {
            const randomId = generateRandomString(9);
            path = `v/id=${randomId}`;
        } else {
            // Default: v7id= (7 chars mixed)
            const randomId = generateRandomString(7);
            path = `v7id=${randomId}`;
        }
    }

    console.log('Processed customSlug:', customSlug);
    console.log('Generated path:', path);

    try {
        const response = await axios.post('https://api.short.io/links', {
            originalURL,
            domain,
            path,
            title: customSlug // Optional: use slug as title for easier search
        }, {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        res.json({
            originalURL: response.data.originalURL,
            slug: response.data.path,
            shortURL: response.data.shortURL,
            raw: response.data
        });
    } catch (error) {
        // Fallback logic
        if (allowFallback && customSlug && error.response && (error.response.status === 400 || error.response.status === 422)) {
            // Let's try v7id/<slug> if v7id=<slug> failed
            if (path && path.startsWith('v7id=')) {
                const altPath = path.replace('v7id=', 'v7id/');
                try {
                    const response = await axios.post('https://api.short.io/links', {
                        originalURL,
                        domain,
                        path: altPath,
                        title: customSlug
                    }, {
                        headers: {
                            'Authorization': apiKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    return res.json({
                        originalURL: response.data.originalURL,
                        slug: response.data.path,
                        shortURL: response.data.shortURL,
                        raw: response.data
                    });
                } catch (retryError) {
                    // ignore retry error, return original error
                }
            }
        }

        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        res.status(status).json(data);
    }
});

// API: Create Bulk
app.post('/api/create-bulk', async (req, res) => {
    const { originals, idLength, allowFallback = true, domain, format } = req.body;

    let apiKey;
    if (domain === 'govidey.site') {
        apiKey = process.env.SHORTIO_API_KEY_GOVIDEY;
    } else if (domain === 'govldey.site') {
        apiKey = process.env.SHORTIO_API_KEY_GOVLDEY;
    } else if (domain === 'vidby.it') {
        apiKey = process.env.SHORTIO_API_KEY_VIDBY;
    } else if (domain === 'videco.me') {
        apiKey = process.env.SHORTIO_API_KEY_VIDECO;
    }

    if (!apiKey || !domain) {
        return res.status(400).json({ error: 'Invalid or missing domain. Supported domains: govidey.site, govldey.site, vidby.it, videco.me' });
    }

    if (!originals || !Array.isArray(originals)) {
        return res.status(400).json({ error: 'originals array is required' });
    }

    const results = [];

    // Process sequentially to avoid rate limits if possible
    for (let i = 0; i < originals.length; i++) {
        const originalURL = originals[i];

        // Generate random ID based on format
        let path;
        if (format === 'vid') {
            const randomId = generateRandomString(9);
            path = `v/id=${randomId}`;
        } else {
            const randomId = generateRandomString(7);
            path = `v7id=${randomId}`;
        }

        try {
            const response = await axios.post('https://api.short.io/links', {
                originalURL,
                domain,
                path,
                title: path
            }, {
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                }
            });
            results.push({
                originalURL,
                slug: response.data.path,
                shortURL: response.data.shortURL,
                status: 'success'
            });
        } catch (error) {
            // Retry once with new ID if collision
            if (error.response && (error.response.status === 409 || error.response.status === 422)) {
                let retryPath;
                if (format === 'vid') {
                    const retryId = generateRandomString(9);
                    retryPath = `v/id=${retryId}`;
                } else {
                    const retryId = generateRandomString(7);
                    retryPath = `v7id=${retryId}`;
                }
                try {
                    const response = await axios.post('https://api.short.io/links', {
                        originalURL,
                        domain,
                        path: retryPath,
                        title: retryPath
                    }, {
                        headers: {
                            'Authorization': apiKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    results.push({
                        originalURL,
                        slug: response.data.path,
                        shortURL: response.data.shortURL,
                        status: 'success'
                    });
                    continue;
                } catch (retryError) {
                    // fall through
                }
            }

            results.push({
                originalURL,
                error: error.response ? error.response.data : error.message,
                status: 'failed'
            });
        }

        // Small delay to be nice to the API
        await new Promise(r => setTimeout(r, 200));
    }

    res.json({
        domain,
        results
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
