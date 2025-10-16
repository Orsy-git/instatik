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

// Headers très réalistes pour Instagram
const INSTAGRAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
};

// API de téléchargement
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.json({ success: false, error: 'URL est requise' });
        }

        console.log('🔗 Tentative de téléchargement:', url);

        let result;

        if (url.includes('tiktok.com')) {
            result = await downloadTikTok(url);
        } else if (url.includes('instagram.com')) {
            result = await downloadInstagramPro(url);
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
            error: 'Erreur de traitement'
        });
    }
});

// TikTok - Version éprouvée
async function downloadTikTok(url) {
    try {
        console.log('🎵 Extraction TikTok...');
        const response = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tikwm.com/'
            }
        });

        if (response.data && response.data.data && response.data.data.play) {
            let videoUrl = response.data.data.play;
            if (videoUrl && !videoUrl.startsWith('http')) {
                videoUrl = 'https://www.tikwm.com' + videoUrl;
            }
            console.log('✅ TikTok réussi');
            return {
                success: true,
                videoUrl: videoUrl,
                downloadUrl: videoUrl,
                title: response.data.data.title || 'TikTok Video'
            };
        }
    } catch (error) {
        console.log('❌ TikTok échoué:', error.message);
    }

    return { 
        success: false, 
        error: 'Impossible de récupérer la vidéo TikTok'
    };
}

// Instagram - Version PRO avec multiples approches
async function downloadInstagramPro(url) {
    console.log('📸 Début extraction Instagram PRO...');
    
    // Méthode 1: InstaLoader (le plus fiable)
    try {
        console.log('🔄 Méthode 1: InstaLoader...');
        const response = await axios.get(`https://instadownloader.co/api/?url=${encodeURIComponent(url)}`, {
            timeout: 20000,
            headers: INSTAGRAM_HEADERS
        });

        console.log('📊 Réponse InstaLoader:', response.data);

        if (response.data && response.data.video) {
            console.log('✅ Instagram Méthode 1 réussie');
            return {
                success: true,
                videoUrl: response.data.video,
                downloadUrl: response.data.video,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram Méthode 1 échouée:', error.message);
    }

    // Méthode 2: Instagram Downloader API
    try {
        console.log('🔄 Méthode 2: Instagram Downloader API...');
        const response = await axios.post('https://igram.world/api/download', 
            { url: url },
            {
                timeout: 20000,
                headers: {
                    ...INSTAGRAM_HEADERS,
                    'Content-Type': 'application/json',
                    'Origin': 'https://igram.world',
                    'Referer': 'https://igram.world/'
                }
            }
        );

        console.log('📊 Réponse Instagram Downloader:', response.data);

        if (response.data && response.data.media) {
            const videoUrl = Array.isArray(response.data.media) ? response.data.media[0] : response.data.media;
            console.log('✅ Instagram Méthode 2 réussie');
            return {
                success: true,
                videoUrl: videoUrl,
                downloadUrl: videoUrl,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram Méthode 2 échouée:', error.message);
    }

    // Méthode 3: SaveFrom.net
    try {
        console.log('🔄 Méthode 3: SaveFrom.net...');
        const response = await axios.get(`https://api.savefrom.net/api/convert?url=${encodeURIComponent(url)}`, {
            timeout: 20000,
            headers: INSTAGRAM_HEADERS
        });

        console.log('📊 Réponse SaveFrom:', response.data);

        if (response.data && response.data.url) {
            console.log('✅ Instagram Méthode 3 réussie');
            return {
                success: true,
                videoUrl: response.data.url,
                downloadUrl: response.data.url,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram Méthode 3 échouée:', error.message);
    }

    // Méthode 4: Instagram Video Downloader
    try {
        console.log('🔄 Méthode 4: Instagram Video Downloader...');
        const response = await axios.get(`https://igram.io/api/ig?url=${encodeURIComponent(url)}`, {
            timeout: 20000,
            headers: INSTAGRAM_HEADERS
        });

        console.log('📊 Réponse Igram:', response.data);

        if (response.data && response.data.url) {
            console.log('✅ Instagram Méthode 4 réussie');
            return {
                success: true,
                videoUrl: response.data.url,
                downloadUrl: response.data.url,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram Méthode 4 échouée:', error.message);
    }

    // Méthode 5: DDL Instagram
    try {
        console.log('🔄 Méthode 5: DDL Instagram...');
        const response = await axios.get(`https://ddl.insta-vid.com/api?url=${encodeURIComponent(url)}`, {
            timeout: 20000,
            headers: INSTAGRAM_HEADERS
        });

        console.log('📊 Réponse DDL:', response.data);

        if (response.data && response.data.video) {
            console.log('✅ Instagram Méthode 5 réussie');
            return {
                success: true,
                videoUrl: response.data.video,
                downloadUrl: response.data.video,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram Méthode 5 échouée:', error.message);
    }

    // Méthode 6: InstaDownload (dernier recours)
    try {
        console.log('🔄 Méthode 6: InstaDownload...');
        const response = await axios.get(`https://instadownload.site/api?url=${encodeURIComponent(url)}`, {
            timeout: 20000,
            headers: INSTAGRAM_HEADERS
        });

        console.log('📊 Réponse InstaDownload:', response.data);

        if (response.data && response.data.downloadUrl) {
            console.log('✅ Instagram Méthode 6 réussie');
            return {
                success: true,
                videoUrl: response.data.downloadUrl,
                downloadUrl: response.data.downloadUrl,
                title: 'Instagram Video'
            };
        }
    } catch (error) {
        console.log('❌ Instagram Méthode 6 échouée:', error.message);
    }

    console.log('❌ Toutes les méthodes Instagram ont échoué');
    return { 
        success: false, 
        error: 'Instagram: Vidéo non accessible. Essayez un autre lien public.',
        alternative: 'https://downloadgram.com'
    };
}

// Route de test spécifique Instagram
app.get('/api/test-instagram', async (req, res) => {
    const url = req.query.url;
    
    if (!url || !url.includes('instagram.com')) {
        return res.json({ error: 'URL Instagram requise' });
    }

    const services = [
        { name: 'InstaDownloader.co', url: `https://instadownloader.co/api/?url=${encodeURIComponent(url)}` },
        { name: 'Igram.world', url: 'https://igram.world/api/download', method: 'POST' },
        { name: 'SaveFrom.net', url: `https://api.savefrom.net/api/convert?url=${encodeURIComponent(url)}` },
        { name: 'Igram.io', url: `https://igram.io/api/ig?url=${encodeURIComponent(url)}` },
        { name: 'DDL Instagram', url: `https://ddl.insta-vid.com/api?url=${encodeURIComponent(url)}` },
        { name: 'InstaDownload.site', url: `https://instadownload.site/api?url=${encodeURIComponent(url)}` }
    ];

    const results = [];
    
    for (const service of services) {
        try {
            console.log(`🧪 Test ${service.name}...`);
            let response;
            
            if (service.method === 'POST') {
                response = await axios.post(service.url, { url: url }, {
                    timeout: 15000,
                    headers: INSTAGRAM_HEADERS
                });
            } else {
                response = await axios.get(service.url, {
                    timeout: 15000,
                    headers: INSTAGRAM_HEADERS
                });
            }
            
            results.push({ 
                service: service.name, 
                status: 'OK', 
                data: response.data,
                working: checkIfWorking(response.data)
            });
        } catch (error) {
            results.push({ 
                service: service.name, 
                status: 'ERROR', 
                error: error.message,
                working: false
            });
        }
    }
    
    res.json({ services: results });
});

function checkIfWorking(data) {
    if (!data) return false;
    
    // Vérifier différents formats de réponse
    if (data.video) return true;
    if (data.url) return true;
    if (data.media) return true;
    if (data.downloadUrl) return true;
    if (data.data && data.data.video) return true;
    
    return false;
}

// Route de statut
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online',
        service: 'Instagram/TikTok Downloader ULTRA',
        version: '4.0.0',
        timestamp: new Date().toISOString(),
        features: ['6 services Instagram', '1 service TikTok', 'Mode debug avancé']
    });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 Serveur ULTRA démarré!');
    console.log(`📍 Port: ${PORT}`);
    console.log('📸 6 services Instagram configurés');
    console.log('🎵 1 service TikTok configuré');
    console.log('🔧 Mode debug disponible sur /api/test-instagram');
});

module.exports = app;
