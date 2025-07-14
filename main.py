import os
import sys
import subprocess
import datetime
import time
from pathlib import Path

def create_error_file(error_message):
    # Create logs directory if it doesn't exist
    logs_dir = Path('logs')
    logs_dir.mkdir(exist_ok=True)
    
    # Generate timestamp for the error file
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
    error_file = logs_dir / f'error-{timestamp}.txt'
    
    # Write error to file
    with open(error_file, 'w') as f:
        f.write(f'Timestamp: {datetime.datetime.now().strftime("%Y/%m/%d-%H:%M:%S")}\n')
        f.write('Error Details:\n')
        f.write(str(error_message))

def run_server():
    try:
        # Ensure node_modules exists
        if not os.path.exists('node_modules'):
            print('Installing dependencies...')
            subprocess.run(['npm', 'install'], check=True)

        # Start the server
        print('Starting server...')
        process = subprocess.Popen(
            ['node', 'src/index.js'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        # Monitor server output
        while True:
            output = process.stdout.readline()
            if output:
                print(output.strip())
            
            error = process.stderr.readline()
            if error:
                print('Error detected:', error.strip(), file=sys.stderr)
                create_error_file(error)

            # Check if process has ended
            if process.poll() is not None:
                remaining_error = process.stderr.read()
                if remaining_error:
                    create_error_file(remaining_error)
                break

    except subprocess.CalledProcessError as e:
        error_message = f'Failed to start server:\n{str(e)}'
        print(error_message, file=sys.stderr)
        create_error_file(error_message)
        sys.exit(1)
    except KeyboardInterrupt:
        print('\nShutting down server...')
        process.terminate()
        sys.exit(0)
    except Exception as e:
        error_message = f'Unexpected error:\n{str(e)}'
        print(error_message, file=sys.stderr)
        create_error_file(error_message)
        sys.exit(1)

if __name__ == '__main__':
    run_server()
