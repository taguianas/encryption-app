<div align="center">

<h1>🛡️ SecureCrypt</h1>

<p>
<strong>Next-Gen End-to-End Encryption Platform</strong>

<p>
<a href="https://securecrypt-app.onrender.com">🔴 <strong>View Live Demo</strong></a>
&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="DOCS_TECHNICAL.md">⚙️ <strong>Installation & API</strong></a>
</p>

<p>
<img src="https://www.google.com/search?q=https://img.shields.io/badge/status-active-success.svg" alt="Status" />
<img src="https://www.google.com/search?q=https://img.shields.io/github/license/taguianas/encryption-app" alt="License" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/security-A%252B-blue" alt="Security Rating" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/maintained%253F-yes-green.svg" alt="Maintained" />
</p>

<br />
</div>

## 📖 About The Project

SecureCrypt is a full-stack cryptographic application designed to demonstrate secure data transmission and storage principles. Unlike simple text obfuscators, SecureCrypt implements industry-standard algorithms (AES-GCM & RSA-OAEP) to ensure confidentiality, integrity, and authenticity.

The application features a modern, responsive React frontend communicating with a hardened Node.js/Express backend, secured via standard HTTP security headers (Helmet) and strict CORS policies.

## 📸 Interface Gallery


<table width="100%">
<tr>
<td align="center" width="50%">
<img src="screenshots/home-screen.png" alt="Home Screen" style="width: 100%">
<br />
<strong>Home & Dashboard</strong>
<br />
<em>Clean Dark Mode UI with intuitive navigation.</em>
</td>
<td align="center" width="50%">
<img src="screenshots/aes-demo.png" alt="AES Encryption" style="width: 100%">
<br />
<strong>AES Encryption (GCM)</strong>
<br />
<em>Symmetric encryption with integrity check.</em>
</td>
</tr>
<tr>
<td align="center" width="50%">
<img src="screenshots/rsa-keygen.png" alt="RSA KeyGen" style="width: 100%">
<br />
<strong>RSA Key Management</strong>
<br />
<em>2048-bit Key pair generation & export.</em>
</td>
<td align="center" width="50%">
<img src="screenshots/history-feature.png" alt="History" style="width: 100%">
<br />
<strong>Activity History</strong>
<br />
<em>Local storage persistence for recent tasks.</em>
</td>
</tr>
</table>

## 🛠️ Tech Stack

### Frontend (Client)

**React.js 18** - Component-based UI.

**Tailwind CSS** - Utility-first styling for dark mode.

**Lucide React** - Modern iconography.

### Backend (Server)

**Node.js** - Runtime environment.

**Express.js** - REST API Framework.

**Native Crypto** - Zero-dependency cryptography implementation.

### Infrastructure & Security

**Helmet.js** - HTTP Header hardening.

**CORS** - Strict Origin Resource Sharing.

**Render** - Cloud Deployment (CI/CD).

## 🔐 Security Architecture

This project follows the "Secure by Design" principle.

### 1. Symmetric Encryption (AES-256-GCM)

We moved away from the older CBC mode to GCM (Galois/Counter Mode).

**Why?** CBC is malleable (vulnerable to bit-flipping attacks).

**Solution:** GCM provides an Authentication Tag. If the encrypted payload is tampered with during transit, the decryption will fail instantly, preserving data integrity.

**IV:** A unique 12-byte Initialization Vector is generated for every request.

### 2. Asymmetric Encryption (RSA-2048-OAEP)

**Padding:** We utilize OAEP (Optimal Asymmetric Encryption Padding) with SHA-256.

**Protection:** Prevents Padding Oracle Attacks which affect older PKCS#1 v1.5 implementations.

**Key Format:** Keys are exported in standard PEM format (PKCS#8 for private keys).

### 3. Application Flow

sequenceDiagram
    participant User
    participant Client (React)
    participant Server (Node.js)
    
    User->>Client: Enters Message + Key
    Client->>Server: POST /api/encrypt (HTTPS)
    Note right of Client: JSON Body { text, type, key }
    
    rect rgb(30, 30, 30)
        Note right of Server: 1. Hash Key (SHA-256)<br/>2. Generate IV/Nonce<br/>3. Encrypt & Generate Tag
    end
    
    Server-->>Client: Returns { IV : Tag : CipherText }
    Client->>User: Displays Encrypted Data

    <div align="center">
<small>Check <a href="DOCS_TECHNICAL.md">DOCS_TECHNICAL.md</a> for Installation & API Reference.</small>
</div>

