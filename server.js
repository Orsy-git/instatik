const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Route pour la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API de téléchargement
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.json({ success: false, error: 'URL est requise' });
        }

        console.log('🔗 URL reçue:', url);

        let videoData;

        if (url.includes('tiktok.com')) {
            videoData = await getTikTokVideo(url);
        } else if (url.includes('instagram.com')) {
            videoData = await getInstagramVideo(url);
        } else {
            return res.json({ success: false, error: 'Seuls TikTok et Instagram sont supportés' });
        }

        if (videoData && videoData.url) {
            res.json({
                success: true,
                videoUrl: videoData.url,
                title: videoData.title || 'Video',
                message: 'Vidéo trouvée avec succès!'
            });
        } else {
            res.json({ 
                success: false, 
                error: 'Vidéo non trouvée. Le lien peut être privé ou invalide.' 
            });
        }

    } catch (error) {
        console.error('❌ Erreur serveur:', error.message);
        res.json({ 
            success: false, 
            error: 'Erreur temporaire du serveur' 
        });
    }
});

// Service TikTok - Version optimisée
async function getTikTokVideo(url) {
    const services = [
        {
            name: 'TikWM',
            url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
            method: 'GET',
            transform: (data) => {
                if (data.data && data.data.play) {
                    let videoUrl = data.data.play;
                    if (videoUrl && !videoUrl.startsWith('http')) {
                        videoUrl = 'https://www.tikwm.com' + videoUrl;
                    }
                    return {
                        url: videoUrl,
                        title: data.data.title
                    };
                }
                return null;
            }
        },
        {
            name: 'TikDown',
            url: 'https://tikdown.org/api/ajaxSearch',
            method: 'POST',
            data: `url=${encodeURIComponent(url)}`,
            transform: (data) => {
                if (data.links && data.links[0]) {
                    return { url: data.links[0], title: 'TikTok Video' };
                }
                return null;
            }
        }
    ];

    for (const service of services) {
        try {
            console.log(`🔄 Essai service: ${service.name}`);
            
            const config = {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            };

            let response;
            if (service.method === 'POST') {
                response = await axios.post(service.url, service.data, {
                    ...config,
                    headers: {
                        ...config.headers,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Origin': 'https://tikdown.org',
                        'Referer': 'https://tikdown.org/'
                    }
                });
            } else {
                response = await axios.get(service.url, config);
            }

            const result = service.transform(response.data);
            if (result) {
                console.log(`✅ Succès avec ${service.name}`);
                return result;
            }
        } catch (error) {
            console.log(`❌ ${service.name} échoué:`, error.message);
            continue;
        }
    }

    return null;
}

// Service Instagram
async function getInstagramVideo(url) {
    const services = [
        {
            name: 'Igram',
            url: `https://igram.io/api/ig?url=${encodeURIComponent(url)}`,
            transform: (data) => {
                if (data.url) return { url: data.url, title: 'Instagram Video' };
                return null;
            }
        },
        {
            name: 'InstaDownloader',
            url: `https://instadownloader.co/api/?url=${encodeURIComponent(url)}`,
            transform: (data) => {
                if (data.video) return { url: data.video, title: 'Instagram Video' };
                return null;
            }
        }
    ];

    for (const service of services) {
        try {
            console.log(`📸 Essai service Instagram: ${service.name}`);
            
            const response = await axios.get(service.url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const result = service.transform(response.data);
            if (result) {
                console.log(`✅ Instagram succès avec ${service.name}`);
                return result;
            }
        } catch (error) {
            console.log(`❌ Instagram ${service.name} échoué:`, error.message);
            continue;
        }
    }

    return null;
}

// Routes API supplémentaires
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online',
        service: 'Instagram/TikTok Downloader',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version
    });
});

app.get('/api/services', (req, res) => {
    res.json({
        tiktok: ['TikWM', 'TikDown'],
        instagram: ['Igram', 'InstaDownloader'],
        status: 'operational'
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint non trouvé' });
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 Serveur démarré!');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`⚡ Node.js: ${process.version}`);
    console.log('✅ Prêt pour le déploiement Vercel');
});

module.exports = app;
