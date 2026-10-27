"""Local LAN discovery responder. Optional helper to locate this community server."""
import socket
import os

PORT = int(os.environ.get("DISCOVERY_PORT", "37020"))
APP_PORT = int(os.environ.get("PORT", "3001"))

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", PORT))
    print(f"LAN discovery listening on UDP {PORT}; web port {APP_PORT}")
    while True:
        data, address = sock.recvfrom(256)
        if data.strip() == b"PRIVATE-COMMUNITY-DISCOVER":
            host = socket.gethostbyname(socket.gethostname())
            sock.sendto(f"PRIVATE-COMMUNITY {host} {APP_PORT}".encode(), address)

if __name__ == "__main__":
    main()
