require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet'); 


const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
//  VERROUILLAGE DES PORTES (CORS Restreint)
const allowedOrigins = [
  'http://localhost:3000',
  'https://securecrypt-app.onrender.com' 
];

app.use(cors({
    origin: function (origin, callback) {
        // Autorise les requêtes sans origine (comme Postman ou mobile apps)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'La politique CORS interdit l\'accès depuis cette origine.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST']
}));
app.use(bodyParser.json());

//  LOGIQUE CRYPTOGRAPHIQUE 
//  GCM (Galois/Counter Mode) pour la sécurité moderne

const ALGORITHM_AES = 'aes-256-gcm';

/**
 * Chiffrement AES-GCM
 * @param {string} text - Texte à chiffrer
 * @param {string} secretKey - Clé utilisateur (doit être hashée pour faire 32 bytes)
 */
function encryptAES(text, secretKey) {
    // On s'assure que la clé fait 32 bytes via SHA-256
    const key = crypto.createHash('sha256').update(String(secretKey)).digest();
    // Génération d'un IV aléatoire de 12 bytes pour GCM
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(ALGORITHM_AES, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // On retourne l'IV et le texte chiffré séparés par ':'
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/**
 * Déchiffrement AES-GCM
 * @param {string} encryptedData - Format "IV:Contenue Chiffré"
 * @param {string} secretKey - Clé utilisateur
 */
function decryptAES(encryptedData, secretKey) {
    const textParts = encryptedData.split(':');
    // Vérification simple du format
    if (textParts.length !== 3) throw new Error("Format invalide. Attendu: IV:Tag:Données");

    const iv = Buffer.from(textParts[0], 'hex');
    const tag = Buffer.from(textParts[1], 'hex'); 
    const encryptedText = textParts[2];
    const key = crypto.createHash('sha256').update(String(secretKey)).digest();

    const decipher = crypto.createDecipheriv(ALGORITHM_AES, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Génération de paires de clés RSA
 */
function generateRSAKeys() {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
}

/**
 * Chiffrement RSA (Utilise la clé Publique)
 */
function encryptRSA(text, publicKey) {
    const buffer = Buffer.from(text, 'utf8');
    const encrypted = crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        buffer
    );
    return encrypted.toString('base64');
}

/**
 * Déchiffrement RSA (Utilise la clé Privée)
 */
function decryptRSA(encryptedBase64, privateKey) {
    const buffer = Buffer.from(encryptedBase64, 'base64');
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        buffer
    );
    return decrypted.toString('utf8');
}

//  ROUTES API

// Route pour générer des clés RSA (pour aider le front-end)
app.get('/api/generate-keys', (req, res) => {
    try {
        const { publicKey, privateKey } = generateRSAKeys();
        res.json({ publicKey, privateKey });
    } catch (error) {
        res.status(500).json({ error: "Erreur génération clés" });
    }
});

app.post('/api/encrypt', (req, res) => {
    const { type, text, key } = req.body;

    try {
        let result;
        if (type === 'AES') {
            if (!key) return res.status(400).json({ error: "Clé requise pour AES" });
            result = encryptAES(text, key);
        } else if (type === 'RSA') {
            if (!key) return res.status(400).json({ error: "Clé publique requise pour RSA" });
            result = encryptRSA(text, key); // Ici 'key' est la clé publique
        } else {
            return res.status(400).json({ error: "Algorithme non supporté" });
        }
        res.json({ result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Échec du chiffrement. Vérifiez la clé." });
    }
});

app.post('/api/decrypt', (req, res) => {
    const { type, encryptedData, key } = req.body;

    try {
        let result;
        if (type === 'AES') {
            if (!key) return res.status(400).json({ error: "Clé requise pour AES" });
            result = decryptAES(encryptedData, key);
        } else if (type === 'RSA') {
            if (!key) return res.status(400).json({ error: "Clé privée requise pour RSA" });
            result = decryptRSA(encryptedData, key); // Ici 'key' est la clé privée
        } else {
            return res.status(400).json({ error: "Algorithme non supporté" });
        }
        res.json({ result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Échec du déchiffrement. Clé ou données incorrectes." });
    }
});

app.listen(PORT, () => {
    console.log(` Serveur sécurisé lancé sur le port ${PORT}`);
    console.log(`  Sécurité Helmet activée`);
    console.log(` CORS restreint à http://localhost:3000`);
});