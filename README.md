# Arch Linux Server

A Node.js server implementation with automated error logging system for Arch Linux desktop PC.

## Features

- Express.js server setup
- Automated error logging system with timestamp-based file creation
- CORS enabled
- Environment variable configuration
- Comprehensive error handling
- Public network access via <ip>:4000
- Configurable port (default: 4000)

## Error Logging System

Errors are automatically logged to files in the `logs` directory with the following format:
- File naming: `error-YYYY-MM-DD-HH-mm-ss.txt`
- Includes detailed error information, stack traces, and request context
- Handles both synchronous and asynchronous errors

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm (Comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Usage

### Running the Server

You can run the server in two ways:

1. Using Python script (Recommended for error logging):
```bash
python main.py
```
This method provides automatic error file creation in the `logs` directory.

2. Using npm directly:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Testing
```bash
npm test
```

## API Endpoints

- `GET /`: Server status check (access via http://<your-ip>:4000/)
- `GET /test-error`: Test endpoint to trigger error logging (access via http://<your-ip>:4000/test-error)

## Error Handling

The server includes comprehensive error handling:
- Custom error logging middleware
- Uncaught exception handling
- Unhandled promise rejection handling
- Request context logging

## Project Structure

```
├── src/
│   └── index.js          # Main server file
├── logs/                 # Error log files (auto-generated)
├── .env                  # Environment variables
├── .gitignore           # Git ignore rules
├── package.json         # Project dependencies and scripts
└── README.md           # Project documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.