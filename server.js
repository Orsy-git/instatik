const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API pour TikTok (service le plus fiable)
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.json({ error: 'URL est requise' });
        }

        console.log('🔗 URL reçue:', url);

        let videoUrl;

        if (url.includes('tiktok.com')) {
            videoUrl = await getTikTokVideo(url);
        } else if (url.includes('instagram.com')) {
            videoUrl = await getInstagramVideo(url);
        } else {
            return res.json({ error: 'Seuls les liens TikTok et Instagram sont supportés' });
        }

        if (videoUrl) {
            res.json({
                success: true,
                videoUrl: videoUrl,
                message: 'Vidéo trouvée avec succès!'
            });
        } else {
            res.json({ error: 'Impossible de récupérer la vidéo. Essayez un autre lien.' });
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        res.json({ error: 'Erreur serveur: ' + error.message });
    }
});

// Service TikTok - TikWM (très fiable)
async function getTikTokVideo(url) {
    try {
        console.log('🎵 Récupération TikTok...');
        const response = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.tikwm.com/'
            }
        });

        console.log('📊 Réponse TikTok:', response.data);

        if (response.data && response.data.data) {
            const videoUrl = response.data.data.play;
            if (videoUrl && !videoUrl.startsWith('http')) {
                return 'https://www.tikwm.com' + videoUrl;
            }
            return videoUrl;
        }
    } catch (error) {
        console.log('❌ TikTok service 1 échoué:', error.message);
    }

    // Fallback: SSSTik
    try {
        console.log('🔄 Essai service TikTok alternatif...');
        const response = await axios.post('https://ssstik.io/abc?url=dl', 
            `id=${encodeURIComponent(url)}&locale=fr&tt=0`,
            {
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': 'https://ssstik.io',
                    'Referer': 'https://ssstik.io/fr'
                }
            }
        );

        if (response.data && response.data.url) {
            return response.data.url;
        }
    } catch (error) {
        console.log('❌ TikTok service 2 échoué:', error.message);
    }

    return null;
}

// Service Instagram
async function getInstagramVideo(url) {
    try {
        console.log('📸 Récupération Instagram...');
        const response = await axios.get(`https://igram.io/api/ig?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        console.log('📊 Réponse Instagram:', response.data);

        if (response.data && response.data.url) {
            return response.data.url;
        }
    } catch (error) {
        console.log('❌ Instagram service 1 échoué:', error.message);
    }

    // Fallback: InstaDownloader
    try {
        const response = await axios.get(`https://instadownloader.co/api/?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.data && response.data.video) {
            return response.data.video;
        }
    } catch (error) {
        console.log('❌ Instagram service 2 échoué:', error.message);
    }

    return null;
}

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ 
        status: '✅ OK',
        message: 'Serveur fonctionnel avec Node.js 22',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version
    });
});

// Route pour la santé de l'application
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'Instagram/TikTok Downloader',
        version: '2.0.0'
    });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 Serveur démarré avec succès!');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`⚡ Node.js: ${process.version}`);
    console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
