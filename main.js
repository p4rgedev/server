const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads') });

const app = express();
const PORT = 80;
const BAN_FILE = path.join(__dirname, 'ban.json');
const APPROVED_FILE = path.join(__dirname, 'approved.json');
const NOTES_FILE = path.join(__dirname, 'notes.json');

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

function loadNotes() {
  if (!fs.existsSync(NOTES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function saveNotes(notes) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
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

// Middleware to require authentication for dashboard and other pages
function requireAuth(req, res, next) {
  const approved = loadApproved();
  const ip = req.ip;
  if (approved.find(a => a.ip === ip)) {
    next();
  } else {
    res.redirect('/');
  }
}

function navBar(active) {
  return `
    <nav class="navbar">
      <a href="/dashboard"${active==='dashboard'?' class="active"':''}>Home</a>
      <a href="/files"${active==='files'?' class="active"':''}>Files</a>
      <a href="/notes"${active==='notes'?' class="active"':''}>Notes</a>
      <a href="/todo"${active==='todo'?' class="active"':''}>To-Do</a>
      <a href="/settings"${active==='settings'?' class="active"':''}>Settings</a>
      <a href="/">Logout</a>
    </nav>
  `;
}

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
    return res.redirect('/dashboard');
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

// Dashboard page
app.get('/dashboard', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dashboard</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        ${navBar('dashboard')}
        <div class="dashboard-container">
          <h2>Welcome to your Dashboard!</h2>
          <p>This is your personal hub. More widgets coming soon!</p>
        </div>
      </body>
    </html>
  `);
});

// Files page (with upload, list, download, delete)
app.get('/files', requireAuth, (req, res) => {
  const files = fs.readdirSync(path.join(__dirname, 'uploads')).map(filename => {
    const stats = fs.statSync(path.join(__dirname, 'uploads', filename));
    return {
      name: filename,
      size: stats.size,
      mtime: stats.mtime
    };
  });
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Files</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        ${navBar('files')}
        <div class="dashboard-container">
          <h2>Files</h2>
          <form method="POST" action="/files/upload" enctype="multipart/form-data" style="margin-bottom:2rem;">
            <input type="file" name="file" required />
            <button type="submit">Upload</button>
          </form>
          <table style="width:100%;color:#fff;background:rgba(44,0,66,0.2);border-radius:8px;">
            <tr><th>Name</th><th>Size</th><th>Modified</th><th>Actions</th></tr>
            ${files.map(f => `
              <tr>
                <td>${f.name}</td>
                <td>${(f.size/1024).toFixed(1)} KB</td>
                <td>${f.mtime.toLocaleString()}</td>
                <td>
                  <a href="/files/download/${encodeURIComponent(f.name)}">Download</a> |
                  <form method="POST" action="/files/delete/${encodeURIComponent(f.name)}" style="display:inline;"><button type="submit" onclick="return confirm('Delete this file?')">Delete</button></form>
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
      </body>
    </html>
  `);
});

app.post('/files/upload', requireAuth, upload.single('file'), (req, res) => {
  res.redirect('/files');
});

app.get('/files/download/:filename', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

app.post('/files/delete/:filename', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.redirect('/files');
});

// Notes page (with add, edit, delete)
app.get('/notes', requireAuth, (req, res) => {
  const notes = loadNotes();
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Notes</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        ${navBar('notes')}
        <div class="dashboard-container">
          <h2>Notes</h2>
          <form method="POST" action="/notes/add" style="margin-bottom:2rem;">
            <textarea name="content" rows="3" style="width:100%;border-radius:8px;padding:8px;" placeholder="New note..." required></textarea><br>
            <button type="submit">Add Note</button>
          </form>
          <ul style="list-style:none;padding:0;">
            ${notes.map((note, i) => `
              <li style="background:rgba(44,0,66,0.2);margin-bottom:1rem;padding:1rem;border-radius:8px;">
                <form method="POST" action="/notes/edit/${i}" style="display:inline;">
                  <textarea name="content" rows="2" style="width:80%;border-radius:8px;padding:8px;">${note.content}</textarea>
                  <button type="submit">Save</button>
                </form>
                <form method="POST" action="/notes/delete/${i}" style="display:inline;margin-left:1rem;">
                  <button type="submit" onclick="return confirm('Delete this note?')">Delete</button>
                </form>
              </li>
            `).join('')}
          </ul>
        </div>
      </body>
    </html>
  `);
});

app.post('/notes/add', requireAuth, express.urlencoded({ extended: false }), (req, res) => {
  const notes = loadNotes();
  notes.push({ content: req.body.content });
  saveNotes(notes);
  res.redirect('/notes');
});

app.post('/notes/edit/:id', requireAuth, express.urlencoded({ extended: false }), (req, res) => {
  const notes = loadNotes();
  const id = parseInt(req.params.id);
  if (notes[id]) {
    notes[id].content = req.body.content;
    saveNotes(notes);
  }
  res.redirect('/notes');
});

app.post('/notes/delete/:id', requireAuth, (req, res) => {
  const notes = loadNotes();
  const id = parseInt(req.params.id);
  if (notes[id]) {
    notes.splice(id, 1);
    saveNotes(notes);
  }
  res.redirect('/notes');
});

// To-Do page (placeholder)
app.get('/todo', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>To-Do</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        ${navBar('todo')}
        <div class="dashboard-container">
          <h2>To-Do</h2>
          <p>To-Do list coming soon.</p>
        </div>
      </body>
    </html>
  `);
});

// Settings page (placeholder)
app.get('/settings', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Settings</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        ${navBar('settings')}
        <div class="dashboard-container">
          <h2>Settings</h2>
          <p>Settings and account management coming soon.</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 