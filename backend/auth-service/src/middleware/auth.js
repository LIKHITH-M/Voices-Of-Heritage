const https = require('https');
const jwt = require('jsonwebtoken');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'voicesofheritage-ef533';
const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Cache Google's public signing certs (they rotate daily)
let _certs = null;
let _certExpiry = 0;

function fetchGooglePublicCerts() {
  return new Promise((resolve, reject) => {
    if (_certs && Date.now() < _certExpiry) return resolve(_certs);
    https
      .get(CERTS_URL, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            _certs = JSON.parse(data);
            const cc = res.headers['cache-control'] || '';
            const maxAge = parseInt((cc.match(/max-age=(\d+)/) || [])[1]) || 3600;
            _certExpiry = Date.now() + maxAge * 1000;
            resolve(_certs);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Authenticate middleware — verifies Firebase ID token from Authorization: Bearer header.
 * Attaches { firebase_uid, email, name } to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const token = authHeader.slice(7);
    const header = jwt.decode(token, { complete: true });
    if (!header) return res.status(401).json({ error: 'Invalid token.' });

    const certs = await fetchGooglePublicCerts();
    const cert = certs[header.header.kid];
    if (!cert) return res.status(401).json({ error: 'Unknown token signing key.' });

    const decoded = jwt.verify(token, cert, {
      algorithms: ['RS256'],
      audience: PROJECT_ID,
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    });

    req.user = {
      firebase_uid: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.email,
      email_verified: decoded.email_verified || false,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * RBAC guard — restrict to specified roles.
 * Must be used AFTER authenticate middleware.
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.user.role && !roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}.` });
  }
  next();
};

module.exports = { authenticate, authorize };
