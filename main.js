const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 80;
const BAN_FILE = path.join(__dirname, 'ban.json');
const APPROVED_FILE = path.join(__dirname, 'approved.json');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Helper to load bans
function loadBans() {
  if (!fs.existsSync(BAN_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(BAN_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// Helper to save bans
function saveBans(bans) {
  fs.writeFileSync(BAN_FILE, JSON.stringify(bans, null, 2));
}

function loadApproved() {
  if (!fs.existsSync(APPROVED_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(APPROVED_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveApproved(approved) {
  fs.writeFileSync(APPROVED_FILE, JSON.stringify(approved, null, 2));
}

// In-memory store for failed attempts (reset on server restart)
const failedAttempts = {};

// Middleware to check ban by IP
app.use((req, res, next) => {
  const bans = loadBans();
  const ip = req.ip;
  const banned = bans.find(b => b.ip === ip);
  if (banned) {
    return res.redirect('https://www.google.com');
  }
  next();
});

// Simple landing page with improved visuals
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Login</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div class="login-container">
          <h2>Login Page</h2>
          <form method="POST" action="/login">
            <input type="text" name="username" placeholder="Username" required autocomplete="username" />
            <input type="password" name="password" placeholder="Password" required autocomplete="current-password" />
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

// Login logic
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;

  // Check if already banned (should be caught by middleware, but double-check)
  const bans = loadBans();
  if (bans.find(b => b.ip === ip)) {
    return res.redirect('https://www.google.com');
  }

  // Check credentials
  if (username === 'p4rge' && password === 'ctrl_z_000') {
    // Success: reset failed attempts
    failedAttempts[ip] = 0;
    // Add to approved.json if not already present
    let approved = loadApproved();
    if (!approved.find(a => a.ip === ip)) {
      approved.push({
        ip,
        time: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || '',
      });
      saveApproved(approved);
    }
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Login Success</title>
          <link rel="stylesheet" href="/styles.css" />
        </head>
        <body>
          <div class="login-container">
            <h2>Login successful! <span style="font-weight:400;">Welcome to <b>p4rge-locals</b>.</span></h2>
            <a href="/">Back to Login</a>
          </div>
        </body>
      </html>
    `);
  } else {
    // Failure: increment failed attempts
    failedAttempts[ip] = (failedAttempts[ip] || 0) + 1;
    if (failedAttempts[ip] >= 3) {
      // Ban the IP
      const banEntry = {
        ip,
        time: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || '',
      };
      bans.push(banEntry);
      saveBans(bans);
      return res.redirect('https://www.google.com');
    }
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Login Failed</title>
          <link rel="stylesheet" href="/styles.css" />
        </head>
        <body>
          <div class="login-container">
            <h2>Login failed! Attempt ${failedAttempts[ip]} of 3.</h2>
            <a href="/">Try again</a>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 