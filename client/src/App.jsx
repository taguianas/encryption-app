import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Shield, Key, RefreshCw, ArrowRight, Copy, CheckCircle, Server, Download, History, LogOut, User, FileSignature, ShieldAlert, Eye, EyeOff, Trash2 } from 'lucide-react';

const USE_MOCK_SERVER = false; 

const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://encryption-app-1.onrender.com' 
    : 'http://localhost:5000';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const endpoint = isLogin ? '/api/login' : '/api/register';
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (isLogin) onLogin(data.token, data.username);
      else { setIsLogin(true); setError(''); setUsername(''); setPassword(''); alert("Inscription réussie !"); }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SecureCrypt</h1>
          <p className="text-slate-400 text-sm">{isLogin ? 'Accédez à votre coffre-fort' : 'Rejoignez la sécurité absolue'}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="relative">
            <User className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none" placeholder="Nom d'utilisateur" required />
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none" placeholder="Mot de passe" required />
          </div>
          {error && <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-lg text-center">{error}</div>}
          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
            {loading ? "..." : (isLogin ? "Se connecter" : "Créer le compte")}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-sm text-slate-400 hover:text-indigo-400">{isLogin ? "Créer un compte" : "Se connecter"}</button>
      </div>
    </div>
  );
}

export default function EncryptionApp() {
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(sessionStorage.getItem('username'));
  const [mode, setMode] = useState('encrypt');
  const [algorithm, setAlgorithm] = useState('AES');
  const [inputText, setInputText] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [signatureInput, setSignatureInput] = useState(''); 
  const [rsaKeys, setRsaKeys] = useState({ publicKey: '', privateKey: '' });
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  const callServer = useCallback(async (endpoint, body, method = 'POST') => {
    const options = { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, [token]);

  const fetchHistory = useCallback(async () => {
      if (!token) return;
      try { setHistory(await callServer('/api/history', null, 'GET')); } catch (e) {}
  }, [token, callServer]);

  const deleteHistoryItem = async (id) => {
      try {
          await callServer(`/api/history/${id}`, null, 'DELETE');
          setHistory(history.filter(item => item.id !== id)); 
      } catch (e) { console.error("Erreur suppression", e); }
  };

  useEffect(() => { if (token) fetchHistory(); }, [token, fetchHistory]);

  const handleLogin = (t, u) => { sessionStorage.setItem('token', t); sessionStorage.setItem('username', u); setToken(t); setCurrentUser(u); };
  const handleLogout = () => { sessionStorage.clear(); setToken(null); setCurrentUser(null); setHistory([]); setInputText(''); setKeyInput(''); setOutput(''); setMode('encrypt'); };

  if (!token) return <Auth onLogin={handleLogin} />;

  const handleAction = async () => {
    setLoading(true); setError(''); setOutput('');
    try {
        let endpoint = `/api/${mode}`, payload = { type: algorithm, key: keyInput };
        if (mode === 'encrypt') payload.text = inputText;
        else if (mode === 'decrypt') payload.encryptedData = inputText;
        else if (mode === 'sign') payload = { text: inputText, privateKey: keyInput };
        else if (mode === 'verify') payload = { text: inputText, signature: signatureInput, publicKey: keyInput };

        if (!inputText && mode !== 'verify') throw new Error("Texte requis.");
        if (!keyInput) throw new Error("Clé requise.");

        const data = await callServer(endpoint, payload);
        setOutput(mode === 'verify' ? data.message : data.result);
        if (mode === 'encrypt' || mode === 'sign') fetchHistory();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const generateKeys = async () => {
    setLoading(true);
    try {
        const k = await callServer('/api/generate-keys', null, 'GET');
        setRsaKeys(k);
        setKeyInput(mode === 'encrypt' || mode === 'verify' ? k.publicKey : k.privateKey);
    } catch (e) { setError("Erreur clés."); } finally { setLoading(false); }
  };

  // --- NOUVEAU : FONCTION DE TÉLÉCHARGEMENT ---
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

  const copyToClipboard = (text) => { if (text) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans relative">
      <div className="absolute top-0 right-0 p-4 md:p-6 flex items-center space-x-4 z-10">
        <div className="text-right hidden sm:block"><p className="text-xs text-slate-400">Connecté en tant que</p><p className="text-sm font-bold text-indigo-400">{currentUser}</p></div>
        <button onClick={handleLogout} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-400 border border-slate-700"><LogOut className="w-5 h-5" /></button>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8 pt-16">
        <header className="mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/30 mb-4 hover:scale-105 transition-transform"><Shield className="w-10 h-10 text-white" /></div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">SecureCrypt</h1>
          <p className="text-slate-400 text-lg">Chiffrement de bout en bout <span className="text-indigo-400">AES & RSA</span></p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-800 rounded-2xl p-2 shadow-inner grid grid-cols-2 gap-2 border border-slate-700/50">
                    <button onClick={() => setMode('encrypt')} className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-semibold transition-all ${mode === 'encrypt' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-400'}`}><Lock className="w-5 h-5 mb-1" /> Chiffrer</button>
                    <button onClick={() => setMode('decrypt')} className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-semibold transition-all ${mode === 'decrypt' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-400'}`}><Unlock className="w-5 h-5 mb-1" /> Déchiffrer</button>
                    <button onClick={() => { setMode('sign'); setAlgorithm('RSA'); }} className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-semibold transition-all ${mode === 'sign' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-400'}`}><FileSignature className="w-5 h-5 mb-1" /> Signer</button>
                    <button onClick={() => { setMode('verify'); setAlgorithm('RSA'); }} className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-semibold transition-all ${mode === 'verify' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-400'}`}><ShieldAlert className="w-5 h-5 mb-1" /> Vérifier</button>
                </div>
                
                {(mode === 'encrypt' || mode === 'decrypt') && (
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Algorithme</h3>
                        <div className="space-y-3">
                            <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${algorithm === 'AES' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'}`}><input type="radio" checked={algorithm === 'AES'} onChange={() => setAlgorithm('AES')} className="hidden" /><div className="bg-indigo-500 p-2 rounded-lg mr-3"><Key className="w-4 h-4 text-white" /></div><div><div className="font-semibold text-white">AES-256</div><div className="text-xs text-slate-400">Symétrique</div></div></label>
                            <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${algorithm === 'RSA' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'}`}><input type="radio" checked={algorithm === 'RSA'} onChange={() => setAlgorithm('RSA')} className="hidden" /><div className="bg-purple-500 p-2 rounded-lg mr-3"><Server className="w-4 h-4 text-white" /></div><div><div className="font-semibold text-white">RSA-2048</div><div className="text-xs text-slate-400">Asymétrique</div></div></label>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{mode === 'sign' || (mode === 'decrypt' && algorithm === 'RSA') ? 'Clé PRIVÉE' : mode === 'verify' || (mode === 'encrypt' && algorithm === 'RSA') ? 'Clé PUBLIQUE' : 'Clé Secrète'}</h3>
                        {(algorithm === 'RSA' || mode === 'sign' || mode === 'verify') && (
                            <div className="flex space-x-2">
                                {/* BOUTON TÉLÉCHARGER (Affiché si clés présentes) */}
                                {rsaKeys.publicKey && (
                                    <button onClick={downloadKeys} className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 p-1.5 rounded transition-colors" title="Télécharger les clés">
                                        <Download className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={generateKeys} className="text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 p-1.5 rounded transition-colors"><RefreshCw className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                    <textarea value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none resize-none" placeholder={algorithm === 'AES' ? "Clé secrète..." : "-----BEGIN KEY..."} />
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{mode === 'verify' ? 'Message ORIGINAL' : 'Données'}</label>
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-indigo-500 outline-none resize-none text-base" placeholder="..." />
                    {mode === 'verify' && <div className="mt-4"><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Signature</label><textarea value={signatureInput} onChange={(e) => setSignatureInput(e.target.value)} className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-sm" placeholder="Signature..." /></div>}
                </div>
                <div className="flex justify-center">
                    <button onClick={handleAction} disabled={loading} className={`text-white px-8 py-4 rounded-full font-bold hover:shadow-2xl hover:scale-105 transform transition-all disabled:opacity-50 flex items-center text-lg ${mode === 'encrypt' ? 'bg-indigo-600' : mode === 'decrypt' ? 'bg-emerald-600' : mode === 'sign' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                        {loading ? <RefreshCw className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />} {mode === 'encrypt' ? 'Sécuriser' : mode === 'decrypt' ? 'Restaurer' : mode === 'sign' ? 'Signer' : 'Vérifier'}
                    </button>
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm flex items-center"><ShieldAlert className="w-5 h-5 mr-3" />{error}</div>}
                {output && <div className={`rounded-2xl border overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 ${mode === 'verify' ? (output.includes('VALIDE') ? 'bg-emerald-900/20 border-emerald-500' : 'bg-red-900/20 border-red-500') : 'bg-slate-900 border-indigo-500/30'}`}><div className="flex justify-between px-6 py-3 border-b border-white/5 bg-white/5 items-center"><span className="text-xs font-bold text-white/70 uppercase">Résultat</span><button onClick={() => copyToClipboard(output)} className="text-xs hover:text-white flex items-center gap-1">{copied ? <CheckCircle className="w-3 h-3 text-emerald-400"/> : <Copy className="w-3 h-3" />} Copier</button></div><div className="p-6 overflow-x-auto"><pre className="font-mono text-sm break-all whitespace-pre-wrap text-emerald-400">{output}</pre></div></div>}
            </div>
        </main>

        {history.length > 0 && <div className="border-t border-slate-800 pt-10 animate-in fade-in"><div className="flex justify-between mb-6"><h2 className="text-xl font-bold text-white flex items-center gap-3"><History className="w-5 h-5 text-indigo-400" /> Historique Cloud</h2></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{history.map((item) => (
            <div key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 group relative">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span className="uppercase font-bold text-indigo-400">{item.mode} • {item.algo}</span>
                    <div className="flex items-center gap-2">
                        <span>{item.timestamp}</span>
                        <button onClick={() => deleteHistoryItem(item.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 rounded transition-colors" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="text-sm text-slate-300 font-mono bg-slate-900/50 p-3 rounded-lg break-all whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">{item.content}</div>
            </div>
        ))}</div></div>}
      </div>
    </div>
  );
}