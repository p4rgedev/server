const express = require('express');
const winston = require('winston');
const moment = require('moment');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

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
const os = require('os');

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