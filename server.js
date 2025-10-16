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

// API de téléchargement améliorée
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.json({ success: false, error: 'URL est requise' });
        }

        console.log('🔗 URL reçue:', url);

        let result;

        if (url.includes('tiktok.com')) {
            result = await downloadTikTokDirect(url);
        } else if (url.includes('instagram.com')) {
            result = await downloadInstagramDirect(url);
        } else {
            return res.json({ success: false, error: 'URL non supportée' });
        }

        if (result.success) {
            res.json({
                success: true,
                videoUrl: result.videoUrl,
                downloadUrl: result.downloadUrl,
                title: result.title,
                message: 'Vidéo prête au téléchargement!'
            });
        } else {
            res.json({ 
                success: false, 
                error: result.error 
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

// TikTok - Approche directe
async function downloadTikTokDirect(url) {
    try {
        console.log('🎵 Récupération TikTok directe...');
        
        // Méthode 1: Extraction depuis la page
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            }
        });

        const html = response.data;
        
        // Chercher l'URL vidéo dans le HTML
        const videoRegex = /"playAddr":"([^"]+)"/g;
        const matches = [...html.matchAll(videoRegex)];
        
        if (matches.length > 0) {
            let videoUrl = matches[0][1];
            // Nettoyer l'URL
            videoUrl = videoUrl.replace(/\\u0026/g, '&');
            videoUrl = videoUrl.replace(/\\\//g, '/');
            
            console.log('✅ URL vidéo TikTok trouvée:', videoUrl);
            
            return {
                success: true,
                videoUrl: videoUrl,
                downloadUrl: videoUrl,
                title: 'TikTok Video'
            };
        }

        // Méthode alternative
        const videoRegex2 = /"downloadAddr":"([^"]+)"/g;
        const matches2 = [...html.matchAll(videoRegex2)];
        
        if (matches2.length > 0) {
            let videoUrl = matches2[0][1];
            videoUrl = videoUrl.replace(/\\u0026/g, '&');
            videoUrl = videoUrl.replace(/\\\//g, '/');
            
            console.log('✅ URL download TikTok trouvée:', videoUrl);
            
            return {
                success: true,
                videoUrl: videoUrl,
                downloadUrl: videoUrl,
                title: 'TikTok Video'
            };
        }

        return { success: false, error: 'Aucune vidéo trouvée dans la page' };

    } catch (error) {
        console.log('❌ TikTok direct échoué:', error.message);
        return { success: false, error: 'Accès refusé par TikTok' };
    }
}

// Instagram - Approche directe
async function downloadInstagramDirect(url) {
    try {
        console.log('📸 Récupération Instagram directe...');
        
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const html = response.data;
        
        // Chercher les URLs vidéo
        const videoRegex = /"video_url":"([^"]+)"/g;
        const matches = [...html.matchAll(videoRegex)];
        
        if (matches.length > 0) {
            let videoUrl = matches[0][1];
            videoUrl = videoUrl.replace(/\\u0026/g, '&');
            videoUrl = videoUrl.replace(/\\\//g, '/');
            
            console.log('✅ URL vidéo Instagram trouvée:', videoUrl);
            
            return {
                success: true,
                videoUrl: videoUrl,
                downloadUrl: videoUrl,
                title: 'Instagram Video'
            };
        }

        // Pour les posts multiples
        const videoRegex2 = /"contentUrl":"([^"]+)"/g;
        const matches2 = [...html.matchAll(videoRegex2)];
        
        if (matches2.length > 0) {
            let videoUrl = matches2[0][1];
            
            console.log('✅ URL content Instagram trouvée:', videoUrl);
            
            return {
                success: true,
                videoUrl: videoUrl,
                downloadUrl: videoUrl,
                title: 'Instagram Video'
            };
        }

        return { success: false, error: 'Aucune vidéo trouvée - Le post est-il public ?' };

    } catch (error) {
        console.log('❌ Instagram direct échoué:', error.message);
        return { success: false, error: 'Accès refusé par Instagram' };
    }
}

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ 
        status: '✅ OK',
        message: 'APIs directes activées',
        timestamp: new Date().toISOString()
    });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 Serveur démarré avec APIs directes!');
    console.log(`📍 Port: ${PORT}`);
});

module.exports = app;
