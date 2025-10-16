const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Headers réalistes pour contourner les protections
const REALISTIC_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
};

// API de téléchargement avec multiples méthodes
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.json({ success: false, error: 'URL est requise' });
        }

        console.log('🔗 Tentative de téléchargement:', url);

        let result;

        if (url.includes('tiktok.com')) {
            result = await downloadTikTokAdvanced(url);
        } else if (url.includes('instagram.com')) {
            result = await downloadInstagramAdvanced(url);
        } else {
            return res.json({ success: false, error: 'URL non supportée' });
        }

        if (result.success) {
            res.json({
                success: true,
                videoUrl: result.videoUrl,
                downloadUrl: result.downloadUrl,
                title: result.title,
                message: 'Vidéo trouvée avec succès!'
            });
        } else {
            res.json({ 
                success: false, 
                error: result.error,
                alternative: result.alternative
            });
        }

    } catch (error) {
        console.error('❌ Erreur serveur:', error.message);
        res.json({ 
            success: false, 
            error: 'Erreur de traitement: ' + error.message
        });
    }
});

// TikTok - Approche avancée avec multiple services
async function downloadTikTokAdvanced(url) {
    console.log('🎵 Début extraction TikTok...');
    
    // Méthode 1: Service TikWM (très fiable)
    try {
        console.log('🔄 Méthode 1: TikWM...');
        const response = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                ...REALISTIC_HEADERS,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tikwm.com/',
                'Origin': 'https://www.tikwm.com'
            }
        });

        if (response.data && response.data.data && response.data.data.play) {
            let videoUrl = response.data.data.play;
            if (videoUrl && !videoUrl.startsWith('http')) {
                videoUrl = 'https://www.tikwm.com' + videoUrl;
            }
            console.log('✅ TikTok méthode 1 réussie');
            return {
                success: true,
                videoUrl: videoUrl,
                downloadUrl: videoUrl,
                title: response.data.data.title || 'TikTok Video'
            };
        }
    } catch (error) {
        console.log('❌ TikTok méthode 1 échouée:', error.message);
    }

    // Méthode 2: Service SSSTik
    try {
        console.log('🔄 Méthode 2: SSSTik...');
        const response = await axios.post('https://ssstik.io/abc', 
            `id=${encodeURIComponent(url)}&locale=fr&tt=0`,
            {
                timeout: 15000,
                headers: {
                    ...REALISTIC_HEADERS,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://ssstik.io',
                    'Referer': 'https://ssstik.io/fr',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
                }
            }
        );

        if (response.data && response.data.url) {
            console.log('✅ TikTok méthode 2 réussie');
            return {
                success: true,
                videoUrl: response.data.url,
                downloadUrl: response.data.url,
                title: 'TikTok Video'
            };
        }
    } catch (error) {
        console.log('❌ TikTok méthode 2 échouée:', error.message);
    }

    // Méthode 3: Service TikDown
    try {
        console.log('🔄 Méthode 3: TikDown...');
        const formData = new URLSearchParams();
        formData.append('url', url);
        
        const response = await axios.post('https://tikdown.org/api/ajaxSearch', formData, {
            timeout: 15000,
            headers: {
                ...REALISTIC_HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://tikdown.org',
                'Referer': 'https://tikdown.org/',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (response.data && response.data.links && response.data.links[0]) {
            console.log('✅ TikTok méthode 3 réussie');
            return {
                success: true,
                videoUrl: response.data.links[0],
                downloadUrl: response.data.links[0],
                title: 'TikTok Video'
            };
        }
    } catch (error) {
        console.log('❌ TikTok méthode 3 échouée:', error.message);
    }

    return { 
        success: false, 
        error: 'Impossible de récupérer la vidéo TikTok',
        alternative: 'https://snaptik.app'
    };
}

// Instagram - Approche avancée
async function downloadInstagramAdvanced(url) {
    console.log('📸 Début extraction Instagram...');
    
    // Méthode 1: Service InstaDownloader
    try {
        console.log('🔄 Méthode 1: InstaDownloader...');
        const response = await axios.get(`https://instadownloader.co/api/?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: REALISTIC_HEADERS
        });

        if (response.data && response.data.video) {
            console.log('✅ Instagram méthode 1 réussie');
            return {
                success: true,
                videoUrl: response.data.video,
                downloadUrl: response.data.video,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram méthode 1 échouée:', error.message);
    }

    // Méthode 2: Service Igram
    try {
        console.log('🔄 Méthode 2: Igram...');
        const response = await axios.get(`https://igram.io/api/ig?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: REALISTIC_HEADERS
        });

        if (response.data && response.data.url) {
            console.log('✅ Instagram méthode 2 réussie');
            return {
                success: true,
                videoUrl: response.data.url,
                downloadUrl: response.data.url,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram méthode 2 échouée:', error.message);
    }

    // Méthode 3: Service SaveFrom
    try {
        console.log('🔄 Méthode 3: SaveFrom...');
        const response = await axios.get(`https://api.savefrom.net/api/convert?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: REALISTIC_HEADERS
        });

        if (response.data && response.data.url) {
            console.log('✅ Instagram méthode 3 réussie');
            return {
                success: true,
                videoUrl: response.data.url,
                downloadUrl: response.data.url,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram méthode 3 échouée:', error.message);
    }

    // Méthode 4: Dernier recours - DownloadGram
    try {
        console.log('🔄 Méthode 4: DownloadGram...');
        const response = await axios.post('https://downloadgram.org/wp-json/aio-dl/video-data/', 
            { url: url },
            {
                timeout: 15000,
                headers: {
                    ...REALISTIC_HEADERS,
                    'Content-Type': 'application/json',
                    'Origin': 'https://downloadgram.org',
                    'Referer': 'https://downloadgram.org/'
                }
            }
        );

        if (response.data && response.data.media) {
            console.log('✅ Instagram méthode 4 réussie');
            return {
                success: true,
                videoUrl: response.data.media,
                downloadUrl: response.data.media,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram méthode 4 échouée:', error.message);
    }

    return { 
        success: false, 
        error: 'Impossible de récupérer la vidéo Instagram',
        alternative: 'https://downloadgram.com'
    };
}

// Route de test des services
app.get('/api/test-services', async (req, res) => {
    const testUrl = req.query.url;
    
    if (!testUrl) {
        return res.json({ error: 'URL de test requise' });
    }

    const results = {
        tiktok: await testTikTokServices(testUrl),
        instagram: await testInstagramServices(testUrl)
    };

    res.json(results);
});

async function testTikTokServices(url) {
    const services = [
        { name: 'TikWM', url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}` },
        { name: 'SSSTik', url: 'https://ssstik.io/abc' },
        { name: 'TikDown', url: 'https://tikdown.org/api/ajaxSearch' }
    ];

    const results = [];
    
    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 10000 });
            results.push({ service: service.name, status: 'OK', data: response.data });
        } catch (error) {
            results.push({ service: service.name, status: 'ERROR', error: error.message });
        }
    }
    
    return results;
}

async function testInstagramServices(url) {
    const services = [
        { name: 'InstaDownloader', url: `https://instadownloader.co/api/?url=${encodeURIComponent(url)}` },
        { name: 'Igram', url: `https://igram.io/api/ig?url=${encodeURIComponent(url)}` },
        { name: 'SaveFrom', url: `https://api.savefrom.net/api/convert?url=${encodeURIComponent(url)}` }
    ];

    const results = [];
    
    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 10000 });
            results.push({ service: service.name, status: 'OK', data: response.data });
        } catch (error) {
            results.push({ service: service.name, status: 'ERROR', error: error.message });
        }
    }
    
    return results;
}

// Route de statut
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online',
        service: 'Instagram/TikTok Downloader Pro',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        features: ['Multi-service', 'Fallback automatique', 'Anti-bot']
    });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 Serveur Pro démarré!');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log('🛡️  Protection anti-bot activée');
    console.log('🔧 Multi-services configurés');
});

module.exports = app;
