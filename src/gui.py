import dearpygui.dearpygui as dpg
import requests
import json
from datetime import datetime

def get_server_info():
    try:
        response = requests.get('http://localhost:4000/status')
        return response.json()
    except:
        return {'status': 'offline', 'error': 'Cannot connect to server'}

def refresh_server_info():
    info = get_server_info()
    dpg.set_value('server_status', f"Status: {info.get('status', 'Unknown')}")
    dpg.set_value('server_ip', f"IP: {info.get('ip', 'Unknown')}")
    dpg.set_value('last_update', f"Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def view_error_logs():
    try:
        with open('../logs/error-latest.txt', 'r') as f:
            errors = f.read()
        dpg.set_value('error_text', errors)
    except:
        dpg.set_value('error_text', 'No error logs found')

dpg.create_context()
dpg.create_viewport(title='Server Management GUI', width=800, height=600)

with dpg.window(label="Server Status", width=780, height=580):
    with dpg.tab_bar():
        with dpg.tab(label="Overview"):
            dpg.add_text("Server Information", color=(255, 255, 0))
            dpg.add_text("", tag="server_status")
            dpg.add_text("", tag="server_ip")
            dpg.add_text("", tag="last_update")
            dpg.add_button(label="Refresh", callback=refresh_server_info)

        with dpg.tab(label="Error Logs"):
            dpg.add_text("Error Log Viewer", color=(255, 255, 0))
            dpg.add_text("", tag="error_text", wrap=780)
            dpg.add_button(label="View Latest Errors", callback=view_error_logs)

        with dpg.tab(label="Authentication"):
            dpg.add_text("GitHub Authentication Status", color=(255, 255, 0))
            dpg.add_text("Login with your GitHub account to access the server")
            dpg.add_button(label="Login with GitHub", callback=lambda: dpg.show_item("auth_status"))
            dpg.add_text("", tag="auth_status", show=False)

dpg.setup_dearpygui()
dpg.show_viewport()

# Initial server info update
refresh_server_info()

dpg.start_dearpygui()
dpg.destroy_context()