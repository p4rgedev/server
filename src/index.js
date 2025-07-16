const express = require('express');
const winston = require('winston');
const moment = require('moment');
const cors = require('cors');
const axios = require('axios');
const session = require('express-session');
const os = require('os');
const fs = require('fs');
require('dotenv').config();

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const AUTH_USER_FILE = './authorized_github_user.json';

function getAuthorizedUser() {
  if (fs.existsSync(AUTH_USER_FILE)) {
    try {
      const data = fs.readFileSync(AUTH_USER_FILE, 'utf-8');
      const obj = JSON.parse(data);
      return obj.login;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function setAuthorizedUser(login, userInfo) {
  fs.writeFileSync(AUTH_USER_FILE, JSON.stringify({ login, userInfo }, null, 2));
}

let AUTHORIZED_USER = getAuthorizedUser();

// Store banned IPs
const bannedIPs = new Set();

// Track connected users, connections, verified IPs, connection times, and user locations
const connectedUsers = new Map(); // key: sessionID, value: { ip, login, loginTime, lastPath }
const connections = []; // Array of { ip, time, path }
const verifiedIPs = new Map(); // key: ip, value: { login, loginTime, lastPath }

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

// Middleware to track connections and user locations
app.use((req, res, next) => {
  const now = new Date();
  const sessionID = req.sessionID;
  const ip = req.ip;
  const path = req.path;

  // Track all connections
  connections.push({ ip, time: now, path });
  if (connections.length > 1000) connections.shift(); // Limit memory usage

  // Track authenticated users
  if (req.session && req.session.authenticated) {
    connectedUsers.set(sessionID, {
      ip,
      login: AUTHORIZED_USER,
      loginTime: req.session.loginTime || now,
      lastPath: path
    });
    verifiedIPs.set(ip, {
      login: AUTHORIZED_USER,
      loginTime: req.session.loginTime || now,
      lastPath: path
    });
    if (!req.session.loginTime) req.session.loginTime = now;
  } else {
    connectedUsers.delete(sessionID);
  }
  next();
});

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
    const login = userResponse.data.login;

    // If no authorized user file, save this user as the only allowed user
    if (!AUTHORIZED_USER) {
      setAuthorizedUser(login, userResponse.data);
      AUTHORIZED_USER = login;
    }

    if (login === AUTHORIZED_USER) {
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

// New /stats endpoint
app.get('/stats', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpus = os.cpus();
  const load = os.loadavg ? os.loadavg() : [];
  const serverIP = getServerIP();

  res.json({
    uptime,
    serverTime: new Date(),
    ip: serverIP,
    port,
    connectedUsers: Array.from(connectedUsers.values()),
    connections: connections.slice(-100),
    bannedIPs: Array.from(bannedIPs),
    verifiedIPs: Array.from(verifiedIPs.entries()).map(([ip, data]) => ({ ip, ...data })),
    deviceUsage: {
      memory: memoryUsage,
      cpus,
      load
    }
  });
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
    ip: ips[0] || getServerIP() || 'unknown',
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