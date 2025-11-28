require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🍃 MongoDB Connecté !'))
    .catch(err => console.error('❌ Erreur Mongo:', err));

const EncryptionLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    algo: String,
    action: String,
    encryptedData: String,
    userId: String
});
const EncryptionLog = mongoose.model('EncryptionLog', EncryptionLogSchema);

// --- MIDDLEWARES ---
app.use(helmet());
const allowedOrigins = ['http://localhost:3000', 'https://securecrypt-app.onrender.com'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) callback(null, true);
        else callback(null, true);
    },
    methods: ['GET', 'POST', 'DELETE'] // Ajout de DELETE
}));
app.use(bodyParser.json());

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (await User.findOne({ username })) return res.status(400).json({ error: "Pseudo pris" });
        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username, password: hashedPassword }).save();
        res.status(201).json({ message: "Succès" });
    } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: "Erreur identifiants" });
        const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username });
    } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

// --- CRYPTO UTILS ---
const ALGO_AES = 'aes-256-gcm';

function encryptAES(text, secretKey) {
    const key = crypto.createHash('sha256').update(String(secretKey)).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO_AES, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

function decryptAES(data, secretKey) {
    const parts = data.split(':');
    if (parts.length !== 3) throw new Error("Format invalide");
    const key = crypto.createHash('sha256').update(String(secretKey)).digest();
    const decipher = crypto.createDecipheriv(ALGO_AES, key, Buffer.from(parts[0], 'hex'));
    decipher.setAuthTag(Buffer.from(parts[1], 'hex'));
    let decrypted = decipher.update(parts[2], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function generateRSA() {
    return crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
}

function encryptRSA(text, pubKey) {
    return crypto.publicEncrypt({ key: pubKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(text)).toString('base64');
}

function decryptRSA(data, privKey) {
    return crypto.privateDecrypt({ key: privKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(data, 'base64')).toString('utf8');
}

function signMessage(text, privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(text);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

function verifySignature(text, signature, publicKey) {
    const verify = crypto.createVerify('SHA256');
    verify.update(text);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
}

// --- ROUTES CRYPTO ---

app.get('/api/generate-keys', (req, res) => {
    try {
        const { publicKey, privateKey } = generateRSA();
        res.json({ publicKey, privateKey });
    } catch (e) { res.status(500).json({ error: "Erreur clés" }); }
});

app.post('/api/encrypt', authenticateToken, async (req, res) => {
    const { type, text, key } = req.body;
    try {
        let result;
        if (type === 'AES') result = encryptAES(text, key);
        else if (type === 'RSA') result = encryptRSA(text, key);
        else return res.status(400).json({ error: "Algo inconnu" });

        await new EncryptionLog({ algo: type, action: 'ENCRYPT', encryptedData: result, userId: req.user._id }).save();
        res.json({ result });
    } catch (e) { res.status(500).json({ error: "Erreur chiffrement" }); }
});

app.post('/api/decrypt', authenticateToken, (req, res) => {
    const { type, encryptedData, key } = req.body;
    try {
        let result;
        if (type === 'AES') result = decryptAES(encryptedData, key);
        else if (type === 'RSA') result = decryptRSA(encryptedData, key);
        res.json({ result });
    } catch (e) { res.status(500).json({ error: "Erreur déchiffrement" }); }
});

app.post('/api/sign', authenticateToken, async (req, res) => {
    const { text, privateKey } = req.body;
    try {
        if (!text || !privateKey) return res.status(400).json({ error: "Données manquantes" });
        const signature = signMessage(text, privateKey);
        await new EncryptionLog({ algo: 'RSA-SIGN', action: 'SIGN', encryptedData: signature, userId: req.user._id }).save();
        res.json({ result: signature });
    } catch (e) { res.status(500).json({ error: "Erreur signature" }); }
});

app.post('/api/verify', authenticateToken, (req, res) => {
    const { text, signature, publicKey } = req.body;
    try {
        const isValid = verifySignature(text, signature, publicKey);
        res.json({ message: isValid ? "✅ Signature VALIDE" : "❌ Signature INVALIDE" });
    } catch (e) { res.status(500).json({ error: "Erreur vérification" }); }
});

// --- HISTORIQUE MIS À JOUR ---
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const logs = await EncryptionLog.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(10);
        const formatted = logs.map(l => ({
            id: l._id,
            timestamp: new Date(l.timestamp).toLocaleTimeString(),
            algo: l.algo,
            mode: l.action,
            content: l.encryptedData // On envoie TOUT le contenu, pas de substring
        }));
        res.json(formatted);
    } catch (e) { res.status(500).json({ error: "Erreur historique" }); }
});

// --- NOUVEAU : SUPPRESSION D'UN LOG ---
app.delete('/api/history/:id', authenticateToken, async (req, res) => {
    try {
        await EncryptionLog.deleteOne({ _id: req.params.id, userId: req.user._id });
        res.json({ message: "Supprimé" });
    } catch (e) { res.status(500).json({ error: "Erreur suppression" }); }
});

app.listen(PORT, () => {
    console.log(`✅ Serveur lancé sur le port ${PORT}`);
});