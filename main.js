const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 80;
const BAN_FILE = path.join(__dirname, 'ban.json');

app.use(bodyParser.urlencoded({ extended: false }));

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

// Simple landing page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Login</title></head>
      <body>
        <h2>Login Page</h2>
        <form method="POST" action="/login">
          <input type="text" name="username" placeholder="Username" required /><br/>
          <input type="password" name="password" placeholder="Password" required /><br/>
          <button type="submit">Login</button>
        </form>
      </body>
    </html>
  `);
});

// Placeholder for login logic
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
    return res.send('<h2>Login successful! Welcome to p4rge-locals.</h2>');
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
    return res.send(`<h2>Login failed! Attempt ${failedAttempts[ip]} of 3.</h2><a href="/">Try again</a>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 