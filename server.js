const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/downloads', express.static('downloads'));

// Dossier de téléchargement
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Fonction pour nettoyer les fichiers anciens
function cleanOldFiles() {
    const files = fs.readdirSync(downloadsDir);
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    files.forEach(file => {
        const filePath = path.join(downloadsDir, file);
        try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.log('Erreur suppression fichier:', error);
        }
    });
}

// API pour télécharger les vidéos
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL est requis' });
        }

        console.log('Tentative de téléchargement:', url);

        // Nettoyer les anciens fichiers
        cleanOldFiles();

        let videoUrl;
        let filename;

        if (url.includes('instagram.com')) {
            videoUrl = await extractInstagramVideo(url);
        } else if (url.includes('tiktok.com')) {
            videoUrl = await extractTikTokVideo(url);
        } else {
            return res.status(400).json({ error: 'URL non supportée. Seuls Instagram et TikTok sont acceptés.' });
        }

        if (!videoUrl) {
            return res.status(500).json({ 
                error: 'Impossible de récupérer la vidéo. Essayez avec un autre lien public.' 
            });
        }

        // Télécharger la vidéo
        filename = `video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
        const filePath = path.join(downloadsDir, filename);

        console.log('Téléchargement depuis:', videoUrl);

        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'identity',
                'Range': 'bytes=0-'
            }
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('Vidéo téléchargée avec succès:', filename);
                res.json({
                    success: true,
                    downloadUrl: `/downloads/${filename}`,
                    message: 'Vidéo téléchargée avec succès',
                    filename: filename
                });
                resolve();
            });

            writer.on('error', (err) => {
                console.error('Erreur écriture:', err);
                res.status(500).json({ 
                    error: 'Erreur lors de l\'enregistrement de la vidéo' 
                });
                reject(err);
            });
        });

    } catch (error) {
        console.error('Erreur détaillée:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Erreur lors du téléchargement. Le serveur peut être temporairement indisponible.' 
        });
    }
});

// Services tiers pour Instagram
async function extractInstagramVideo(url) {
    console.log('Extraction Instagram:', url);
    
    try {
        // Méthode 1: Utilisation d'un service tiers
        const service1 = await axios.get(`https://igram.io/api/ig?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        
        if (service1.data && service1.data.url) {
            console.log('Instagram méthode 1 réussie');
            return service1.data.url;
        }
    } catch (error) {
        console.log('Instagram méthode 1 échouée:', error.message);
    }
    
    try {
        // Méthode 2: Autre service
        const service2 = await axios.get(`https://instadownloader.co/api/?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (service2.data && service2.data.video) {
            console.log('Instagram méthode 2 réussie');
            return service2.data.video;
        }
    } catch (error) {
        console.log('Instagram méthode 2 échouée:', error.message);
    }
    
    try {
        // Méthode 3: Dernier recours - scraping simple
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });
        
        const html = response.data;
        
        // Chercher les URLs vidéo dans le HTML
        const videoRegex = /"video_url":"([^"]+\.mp4[^"]*)"/g;
        const matches = [...html.matchAll(videoRegex)];
        
        if (matches.length > 0) {
            const videoUrl = matches[0][1].replace(/\\u0026/g, '&');
            console.log('Instagram méthode 3 réussie');
            return videoUrl;
        }
        
        // Autre pattern
        const videoRegex2 = /"contentUrl":"([^"]+\.mp4[^"]*)"/g;
        const matches2 = [...html.matchAll(videoRegex2)];
        
        if (matches2.length > 0) {
            const videoUrl = matches2[0][1];
            console.log('Instagram méthode 3 (alternative) réussie');
            return videoUrl;
        }
        
    } catch (error) {
        console.log('Instagram méthode 3 échouée:', error.message);
    }
    
    console.log('Toutes les méthodes Instagram ont échoué');
    return null;
}

// Services tiers pour TikTok
async function extractTikTokVideo(url) {
    console.log('Extraction TikTok:', url);
    
    try {
        // Méthode 1: API TikTok
        const service1 = await axios.get(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (service1.data && service1.data.html) {
            const videoMatch = service1.data.html.match(/src="([^"]+)"/);
            if (videoMatch) {
                console.log('TikTok méthode 1 réussie');
                return videoMatch[1];
            }
        }
    } catch (error) {
        console.log('TikTok méthode 1 échouée:', error.message);
    }
    
    try {
        // Méthode 2: Service tiers
        const service2 = await axios.post('https://tikdown.org/api/ajaxSearch', 
            new URLSearchParams({
                'url': url,
                'token': ''
            }), {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://tikdown.org',
                'Referer': 'https://tikdown.org/'
            }
        });
        
        if (service2.data && service2.data.links && service2.data.links[0]) {
            console.log('TikTok méthode 2 réussie');
            return service2.data.links[0];
        }
    } catch (error) {
        console.log('TikTok méthode 2 échouée:', error.message);
    }
    
    try {
        // Méthode 3: Autre service
        const service3 = await axios.get(`https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (service3.data && service3.data.video_url) {
            console.log('TikTok méthode 3 réussie');
            return service3.data.video_url;
        }
    } catch (error) {
        console.log('TikTok méthode 3 échouée:', error.message);
    }
    
    try {
        // Méthode 4: Dernier recours - ttdownloader
        const service4 = await axios.get(`https://ttdownloader.com/req/?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (service4.data && service4.data.video) {
            console.log('TikTok méthode 4 réussie');
            return service4.data.video;
        }
    } catch (error) {
        console.log('TikTok méthode 4 échouée:', error.message);
    }
    
    console.log('Toutes les méthodes TikTok ont échoué');
    return null;
}

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Serveur fonctionnel',
        timestamp: new Date().toISOString(),
        status: 'ready'
    });
});

// Route pour lister les fichiers téléchargés
app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(downloadsDir);
        res.json({ 
            files: files.map(file => ({
                name: file,
                url: `/downloads/${file}`,
                size: fs.statSync(path.join(downloadsDir, file)).size
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lecture fichiers' });
    }
});

// Route pour supprimer un fichier
app.delete('/api/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(downloadsDir, filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'Fichier supprimé' });
        } else {
            res.status(404).json({ error: 'Fichier non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur suppression fichier' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📱 Accédez à: http://localhost:${PORT}`);
    console.log(`⚡ API test: http://localhost:${PORT}/api/test`);
    console.log(`📁 Dossier downloads: ${downloadsDir}`);
});