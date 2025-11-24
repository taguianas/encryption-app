import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Shield, Key, RefreshCw, ArrowRight, Copy, CheckCircle, Server, Download, Clock, Trash2, History } from 'lucide-react';

//'false' pour connecter au vrai serveur Node.js sur le port 5000.

const USE_MOCK_SERVER = false; 

export default function EncryptionApp() {
  //  États de l'application 
  const [mode, setMode] = useState('encrypt'); // 'encrypt' ou 'decrypt'
  const [algorithm, setAlgorithm] = useState('AES'); // 'AES' ou 'RSA'
  const [inputText, setInputText] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [rsaKeys, setRsaKeys] = useState({ publicKey: '', privateKey: '' });
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // NOUVEAU : État pour l'historique, chargé depuis le localStorage au démarrage
  const [history, setHistory] = useState(() => {
      const saved = localStorage.getItem('cryptoHistory');
      return saved ? JSON.parse(saved) : [];
  });

  //  Simulation des appels API (Mock) 
  const mockApiCall = async (endpoint, body) => {
    await new Promise(r => setTimeout(r, 600)); // Latence artificielle

    if (endpoint === '/api/generate-keys') {
        // Génération RSA simple simulée pour la démo (clé courte pour rapidité)
        // En prod, utilisez le serveur pour de vraies clés 2048 bits
        return { 
            publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz...\n-----END PUBLIC KEY-----",
            privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoT...\n-----END PRIVATE KEY-----"
        };
    }

    if (endpoint === '/api/encrypt') {
        if (body.type === 'AES') {
            // Simulation AES : simple encodage pour la démo visuelle si pas de serveur
            // VRAIE CRYPTO NÉCESSAIRE CÔTÉ SERVEUR
            return { result: `[AES_ENCRYPTED_IV_XYZ]:${btoa(body.text)}` };
        } else {
             return { result: `[RSA_ENCRYPTED]:${btoa(body.text)}` };
        }
    }

    if (endpoint === '/api/decrypt') {
        try {
            const payload = body.encryptedData.split(':')[1];
            return { result: atob(payload) };
        } catch (e) {
            throw new Error("Données corrompues");
        }
    }
  };

  //  Logique API Réelle 
  
  const callServer = async (endpoint, body) => {
    if (USE_MOCK_SERVER) {
        try {
            return await mockApiCall(endpoint, body);
        } catch (err) {
            throw err;
        }
    }

    // Vrai appel fetch vers le serveur Node.js
    const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://encryption-app-1.onrender.com' 
    : 'http://localhost:5000';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: endpoint === '/api/generate-keys' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  };

   //  Gestion de l'historique 
  const addToHistory = (operationMode, algo, textResult) => {
      const newEntry = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          mode: operationMode,
          algo: algo,
          preview: textResult.substring(0, 40) + (textResult.length > 40 ? '...' : '')
      };
      
      const updatedHistory = [newEntry, ...history].slice(0, 10); // On garde les 10 derniers
      setHistory(updatedHistory);
      localStorage.setItem('cryptoHistory', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
      setHistory([]);
      localStorage.removeItem('cryptoHistory');
  };

  //  Gestionnaires d'événements 

  const handleAction = async () => {
    setLoading(true);
    setError('');
    setOutput('');

    try {
        const endpoint = mode === 'encrypt' ? '/api/encrypt' : '/api/decrypt';
        const payload = {
            type: algorithm,
            [mode === 'encrypt' ? 'text' : 'encryptedData']: inputText,
            key: keyInput
        };

        // Validation basique
        if (!inputText) throw new Error("Veuillez saisir du texte.");
        if (algorithm === 'AES' && !keyInput) throw new Error("Une clé secrète est requise pour AES.");
        if (algorithm === 'RSA' && !keyInput) throw new Error(`Une clé ${mode === 'encrypt' ? 'Publique' : 'Privée'} est requise.`);

        const data = await callServer(endpoint, payload);
        setOutput(data.result);

        // Sauvegarde dans l'historique après succès
        addToHistory(mode, algorithm, data.result);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const generateKeys = async () => {
    setLoading(true);
    try {
        const keys = await callServer('/api/generate-keys');
        setRsaKeys(keys);
        // Auto-remplissage intelligent selon le mode
        if (mode === 'encrypt') setKeyInput(keys.publicKey);
        else setKeyInput(keys.privateKey);
    } catch (err) {
        setError("Impossible de générer les clés.");
    } finally {
        setLoading(false);
    }
  };

  const downloadKeys = () => {
      if (!rsaKeys.publicKey || !rsaKeys.privateKey) return;
      const downloadFile = (filename, content) => {
          const element = document.createElement('a');
          const file = new Blob([content], {type: 'text/plain'});
          element.href = URL.createObjectURL(file);
          element.download = filename;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
      };
      downloadFile('public_key.pem', rsaKeys.publicKey);
      setTimeout(() => downloadFile('private_key.pem', rsaKeys.privateKey), 500);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  //  Rendu UI 

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">SecureCrypt</h1>
          <p className="text-slate-400">Chiffrement de bout en bout • AES & RSA</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Configuration Panel (Left) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Mode Selector */}
            <div className="bg-slate-800 rounded-2xl p-1 shadow-inner">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setMode('encrypt')}
                  className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                    mode === 'encrypt' 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Chiffrer</span>
                </button>
                <button
                  onClick={() => setMode('decrypt')}
                  className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                    mode === 'decrypt' 
                      ? 'bg-emerald-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                  <span>Déchiffrer</span>
                </button>
              </div>
            </div>

            {/* Algo Selector */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Algorithme</h3>
              <div className="space-y-3">
                <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                  algorithm === 'AES' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <input 
                    type="radio" 
                    name="algo" 
                    checked={algorithm === 'AES'} 
                    onChange={() => setAlgorithm('AES')}
                    className="hidden" 
                  />
                  <div className="bg-indigo-500 p-2 rounded-lg mr-3">
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">AES-256</div>
                    <div className="text-xs text-slate-400">Symétrique • Rapide</div>
                  </div>
                </label>

                <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                  algorithm === 'RSA' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <input 
                    type="radio" 
                    name="algo" 
                    checked={algorithm === 'RSA'} 
                    onChange={() => setAlgorithm('RSA')}
                    className="hidden" 
                  />
                  <div className="bg-purple-500 p-2 rounded-lg mr-3">
                    <Server className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">RSA-2048</div>
                    <div className="text-xs text-slate-400">Asymétrique • Public/Privé</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Key Management */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                  {algorithm === 'AES' ? 'Clé Secrète' : `Clé ${mode === 'encrypt' ? 'Publique' : 'Privée'}`}
                </h3>
                {algorithm === 'RSA' && (
                    <div className="flex space-x-2">
                        {rsaKeys.publicKey && (
                            <button onClick={downloadKeys} title="Télécharger les clés (.pem)" className="text-emerald-400 hover:text-emerald-300 transition-colors p-1 hover:bg-emerald-500/10 rounded">
                                <Download className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={generateKeys} title="Générer une nouvelle paire" className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 hover:bg-indigo-500/10 rounded">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                )}
              </div>
              
              <textarea
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={algorithm === 'AES' ? "Entrez votre mot de passe" : "BEGIN KEY :"}
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all"
              />
              {algorithm === 'AES' && (
                  <p className="text-xs text-slate-500 mt-2">
                      Cette clé est nécessaire pour chiffrer et déchiffrer. Ne la perdez pas.
                  </p>
              )}
            </div>
          </div>

          {/* Input/Output Area (Right) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Input Area */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {mode === 'encrypt' ? 'Message à sécuriser' : 'Message chiffré (incluant IV pour AES)'}
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={mode === 'encrypt' ? "Saisissez vos données confidentielles ici" : "Collez le résultat chiffré ici"}
                className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all text-base"
              />
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
                <button
                    onClick={handleAction}
                    disabled={loading || !inputText}
                    className={`group relative inline-flex items-center justify-center py-3 px-8 rounded-full font-bold text-white transition-all transform hover:scale-105 active:scale-95 ${
                        loading ? 'bg-slate-600 cursor-not-allowed' : 
                        mode === 'encrypt' 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/30' 
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30'
                    }`}
                >
                    {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        mode === 'encrypt' ? <Lock className="w-5 h-5 mr-2" /> : <Unlock className="w-5 h-5 mr-2" />
                    )}
                    <span>{mode === 'encrypt' ? 'Sécuriser les données' : 'Restaurer les données'}</span>
                    {!loading && <ArrowRight className="w-5 h-5 ml-2 opacity-70 group-hover:translate-x-1 transition-transform" />}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm flex items-center">
                    <Shield className="w-5 h-5 mr-3 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Output Area */}
            {output && (
                <div className="relative bg-slate-900 rounded-2xl border border-indigo-500/30 overflow-hidden shadow-2xl shadow-indigo-900/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Résultat</span>
                        <button 
                            onClick={copyToClipboard}
                            className="flex items-center space-x-1 text-xs text-indigo-300 hover:text-white transition-colors"
                        >
                            {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? 'Copié !' : 'Copier'}</span>
                        </button>
                    </div>
                    <div className="p-6 overflow-x-auto">
                        <pre className="font-mono text-sm text-emerald-400 break-all whitespace-pre-wrap">
                            {output}
                        </pre>
                    </div>
                </div>
            )}
            
          </div>
        </main>

        {/* --- NOUVEAU : Section Historique --- */}
        {history.length > 0 && (
            <div className="border-t border-slate-800 pt-8 animate-in fade-in duration-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                        <History className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-bold text-white">Historique récent</h2>
                    </div>
                    <button 
                        onClick={clearHistory}
                        className="flex items-center space-x-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                        <span>Effacer</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.map((item) => (
                        <div key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                        item.mode === 'encrypt' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                                    }`}>
                                        {item.mode === 'encrypt' ? 'CHIFFREMENT' : 'DÉCHIFFREMENT'}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">{item.algo}</span>
                                </div>
                                <span className="flex items-center text-xs text-slate-500">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {item.timestamp}
                                </span>
                            </div>
                            <div className="text-sm text-slate-400 font-mono truncate bg-slate-900/50 p-2 rounded-lg mb-2">
                                {item.preview}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <footer className="mt-12 text-center text-xs text-slate-600 pb-8">
           Projet pédagogique de cryptographie • Anas TAGUI
        </footer>
      </div>
    </div>
  );
}