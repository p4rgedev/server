const express = require('express');
const winston = require('winston');
const moment = require('moment');
const cors = require('cors');
const axios = require('axios');
const session = require('express-session');
const os = require('os');
require('dotenv').config();

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const AUTHORIZED_USER = process.env.GITHUB_USERNAME;

// Store banned IPs
const bannedIPs = new Set();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Authentication middleware
const authenticate = (req, res, next) => {
  if (bannedIPs.has(req.ip)) {
    return res.redirect('https://www.google.com');
  }
  if (!req.session.authenticated) {
    return res.redirect('/login');
  }
  next();
};

// Routes
app.get('/login', (req, res) => {
  res.send(`<a href="https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}">Login with GitHub</a>`);
});

app.get('/oauth-callback', async (req, res) => {
  const code = req.query.code;
  try {
    // Get access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: { Accept: 'application/json' }
    });

    const accessToken = tokenResponse.data.access_token;

    // Get user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` }
    });

    if (userResponse.data.login === AUTHORIZED_USER) {
      req.session.authenticated = true;
      res.redirect('/');
    } else {
      bannedIPs.add(req.ip);
      res.redirect('https://www.google.com');
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Server status endpoint
app.get('/status', (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  const ips = [];
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(interface => {
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push(interface.address);
      }
    });
  });

  res.json({
    status: 'online',
    ip: ips[0] || 'unknown',
    port: port
  });
});

// Protect all other routes
app.use(authenticate);

// Configure error logging
const errorLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: `./logs/error-${moment().format('YYYY-MM-DD-HH-mm-ss')}.txt`,
      level: 'error',
      handleExceptions: true
    })
  ]
});

// Error handling middleware
app.use((err, req, res, next) => {
  const timestamp = moment().format('YYYY/MM/DD-HH:mm:ss');
  errorLogger.error({
    timestamp,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query
  });

  res.status(500).json({
    error: 'Internal Server Error',
    timestamp
  });
});

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Test error route
app.get('/test-error', (req, res, next) => {
  try {
    throw new Error('Test error for logging system');
  } catch (error) {
    next(error);
  }
});

// Start server
// const os = require('os'); // <-- Remove this duplicate line

// Get server's IP address
function getServerIP() {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const interface = networkInterfaces[interfaceName];
    for (const config of interface) {
      // Skip internal and non-IPv4 addresses
      if (config.internal === false && config.family === 'IPv4') {
        return config.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback to localhost
}

app.listen(port, '0.0.0.0', () => {
  const serverIP = getServerIP();
  console.log('Server running on:');
  console.log(`- Local: http://localhost:${port}`);
  console.log(`- Network: http://${serverIP}:${port}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  errorLogger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  errorLogger.error('Unhandled Rejection:', error);
  process.exit(1);
});