import os
import sys
import subprocess
import datetime
import time
from pathlib import Path
import requests
import platform

SERVER_URL = 'http://localhost:4000'  # Adjust if needed
REFRESH_INTERVAL = 0.5  # seconds

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

def clear_screen():
    if platform.system() == 'Windows':
        os.system('cls')
    else:
        os.system('clear')

def fetch_stats():
    try:
        resp = requests.get(f'{SERVER_URL}/stats', timeout=2)
        if resp.status_code == 200:
            return resp.json()
        else:
            return None
    except Exception as e:
        return None

def format_uptime(seconds):
    return str(datetime.timedelta(seconds=int(seconds)))

def dashboard():
    start_time = time.time()
    while True:
        clear_screen()
        stats = fetch_stats()
        if not stats:
            print('Could not fetch server stats. Is the server running?')
            time.sleep(REFRESH_INTERVAL)
            continue
        server_ip = stats.get('ip', 'unknown')
        server_port = stats.get('port', 'unknown')
        print('==== Server Dashboard ====' )
        print(f"Server URL: http://{server_ip}:{server_port}/")
        print(f"Server Time: {stats.get('serverTime')}")
        print(f"Uptime: {format_uptime(stats.get('uptime', 0))}")
        print(f"IP:Port: {server_ip}:{server_port}")
        print()
        print(f"Connected Users: {len(stats.get('connectedUsers', []))}")
        for user in stats.get('connectedUsers', []):
            print(f"  - IP: {user['ip']} | Login: {user['login']} | Login Time: {user['loginTime']} | Last Path: {user['lastPath']}")
        print()
        print(f"Connections (last 100): {len(stats.get('connections', []))}")
        for conn in stats.get('connections', [])[-5:]:
            ip = conn['ip']
            if ip == '127.0.0.0':
                print(f"  - IP: {ip} (invalid) | Time: {conn['time']} | Path: {conn['path']}")
            else:
                print(f"  - IP: {ip} | Time: {conn['time']} | Path: {conn['path']}")
        print()
        print(f"Banned IPs: {', '.join(stats.get('bannedIPs', [])) or 'None'}")
        print()
        print(f"Verified IPs:")
        for v in stats.get('verifiedIPs', []):
            print(f"  - IP: {v['ip']} | Login: {v['login']} | Login Time: {v['loginTime']} | Last Path: {v['lastPath']}")
        print()
        print('Device Usage:')
        mem = stats['deviceUsage']['memory']
        print(f"  Memory: RSS={mem['rss']//1024//1024}MB, Heap Used={mem['heapUsed']//1024//1024}MB")
        print(f"  CPU Cores: {len(stats['deviceUsage']['cpus'])}")
        if stats['deviceUsage']['load']:
            print(f"  Load Avg: {', '.join(str(x) for x in stats['deviceUsage']['load'])}")
        print(f'\n(Refreshing every {REFRESH_INTERVAL} seconds. Press Ctrl+C to exit.)')
        time.sleep(REFRESH_INTERVAL)

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
        time.sleep(2)  # Give server time to start
        dashboard()

        # Monitor server output (not shown in dashboard mode)
        while True:
            output = process.stdout.readline()
            if output:
                print(output.strip())
            error = process.stderr.readline()
            if error:
                print('Error detected:', error.strip(), file=sys.stderr)
                create_error_file(error)
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
        sys.exit(0)
    except Exception as e:
        error_message = f'Unexpected error:\n{str(e)}'
        print(error_message, file=sys.stderr)
        create_error_file(error_message)
        sys.exit(1)

if __name__ == '__main__':
    run_server()
