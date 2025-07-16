# Arch Linux Server

A Node.js server for Arch Linux desktop PC with automated error logging, GitHub authentication, and a GUI interface.

## Features

- Automated error logging with timestamp-based filenames
- Secure GitHub authentication (single authorized user)
- IP banning for unauthorized access attempts
- GUI interface for server management
- Public network access via <ip>:4000
- Configurable port (default: 4000)
- Real-time error tracking and logging
- Environment-based configuration
- Cross-platform compatibility

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

3. Set up GitHub OAuth:
   - Go to GitHub Developer Settings
   - Create a new OAuth App
   - Set the callback URL to `http://localhost:4000/oauth-callback`
   - Copy the Client ID and Client Secret

4. Create environment file:
```bash
cp .env.example .env
# Add GitHub Client ID, Client Secret, username and session secret
```

5. Launch the GUI:
```bash
python src/gui.py
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