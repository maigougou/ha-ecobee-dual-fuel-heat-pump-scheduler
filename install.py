#!/usr/bin/env python3
"""Install/update this checkout into a writable HA config directory (Python 3.10+)."""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import ssl
import struct
import sys
import tempfile
from datetime import datetime, timezone
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
CARD_PATH = '/local/ecobee-dual-fuel-card.js'
DOMAIN = 'ecobee_managed_auto'


class InstallError(Exception):
    """An actionable installation failure; never contains credentials."""


class HAClient:
    """Small bounded JSON WebSocket client; no third-party Python packages required."""
    def __init__(self, url, token):
        self.sock = None
        self.sequence = 0
        if any(ord(c) < 32 for c in url):
            raise InstallError('Invalid HA URL.')
        u = urlsplit(url)
        if u.scheme not in ('http', 'https') or not u.hostname or u.username or u.password or u.query or u.fragment:
            raise InstallError('Use the HA http(s) base URL, without credentials, query or fragment.')
        path = u.path.rstrip('/') + '/api/websocket'
        if any(ord(c) < 33 or ord(c) > 126 for c in path + u.netloc):
            raise InstallError('Invalid HA URL.')
        try:
            sock = socket.create_connection((u.hostname, u.port or (443 if u.scheme == 'https' else 80)), timeout=20)
            self.sock = sock
            if u.scheme == 'https':
                self.sock = ssl.create_default_context().wrap_socket(sock, server_hostname=u.hostname)
            key = base64.b64encode(secrets.token_bytes(16)).decode()
            self.sock.sendall((f'GET {path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
            header = bytearray()
            while not header.endswith(b'\r\n\r\n'):
                header.extend(self.exact(1))
                if len(header) > 16384:
                    raise InstallError('Invalid HA WebSocket handshake.')
            lines = header.decode('latin-1').split('\r\n')
            fields = {k.lower(): v.strip() for line in lines[1:] if ':' in line for k, v in [line.split(':', 1)]}
            accept = base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
            if lines[0].split()[1] != '101' or fields.get('sec-websocket-accept') != accept:
                raise InstallError('HA WebSocket connection refused. Check the URL and reverse proxy.')
            if self.receive().get('type') != 'auth_required':
                raise InstallError('This endpoint is not a Home Assistant WebSocket API.')
            self.send({'type': 'auth', 'access_token': token})
            if self.receive().get('type') != 'auth_ok':
                raise InstallError('HA authentication failed. Use an administrator access token.')
        except BaseException:
            self.close()
            raise

    def exact(self, n):
        result = bytearray()
        while len(result) < n:
            part = self.sock.recv(n-len(result))
            if not part:
                raise InstallError('HA closed the connection.')
            result.extend(part)
        return bytes(result)

    def frame(self, opcode, data):
        mask = secrets.token_bytes(4)
        n = len(data)
        header = bytes([0x80 | opcode, 0x80 | (n if n < 126 else 126 if n < 65536 else 127)])
        if n >= 126:
            header += struct.pack('!H' if n < 65536 else '!Q', n)
        self.sock.sendall(header + mask + bytes(x ^ mask[i % 4] for i, x in enumerate(data)))

    def send(self, value):
        self.frame(1, json.dumps(value).encode())

    def receive(self):
        data = bytearray()
        started = False
        while True:
            a, b = self.exact(2)
            opcode, final = a & 15, bool(a & 128)
            if a & 112 or b & 128:
                raise InstallError('Unsupported WebSocket frame.')
            n = b & 127
            if n == 126:
                n = struct.unpack('!H', self.exact(2))[0]
            elif n == 127:
                n = struct.unpack('!Q', self.exact(8))[0]
            if n > 4_000_000 or len(data) + n > 4_000_000:
                raise InstallError('HA response exceeds installer size limit.')
            payload = self.exact(n)
            if opcode >= 8:
                if not final or n > 125:
                    raise InstallError('Invalid WebSocket control frame.')
                if opcode == 8:
                    raise InstallError('HA closed the connection.')
                if opcode == 9:
                    self.frame(10, payload)
                elif opcode != 10:
                    raise InstallError('Unsupported WebSocket control frame.')
                continue
            if (opcode == 1 and started) or (opcode == 0 and not started) or opcode not in (0, 1):
                raise InstallError('Invalid WebSocket message.')
            started = True
            data.extend(payload)
            if final:
                value = json.loads(data.decode())
                if not isinstance(value, dict):
                    raise InstallError('Invalid HA JSON response.')
                return value

    def call(self, kind, **data):
        self.sequence += 1
        self.send({'id': self.sequence, 'type': kind, **data})
        result = self.receive()
        if result.get('id') != self.sequence or result.get('type') != 'result':
            raise InstallError('Unexpected HA command response.')
        if not result.get('success'):
            # Do not echo server error strings: they can include supplied data.
            raise InstallError(f'HA rejected {kind}. Check administrator access and dashboard resource mode.')
        return result.get('result')

    def close(self):
        if self.sock:
            self.sock.close()
            self.sock = None


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(root, relative):
    rel = Path(relative)
    if rel.is_absolute() or '..' in rel.parts:
        raise InstallError('Unsafe installation path.')
    target = root / rel
    cursor = target
    while cursor != root:
        if cursor.is_symlink():
            raise InstallError(f'Symlinks are not supported in installation targets: {rel}')
        cursor = cursor.parent
    return target


def atomic_write(path, data, mode=0o644):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix='.'+path.name+'.', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as f:
            os.fchmod(f.fileno(), mode)
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def plan_files(source, config, language, managed_auto=True):
    if not (config / 'configuration.yaml').is_file():
        raise InstallError('--config must be the HA directory containing configuration.yaml.')
    name = 'ecobee_dual_fuel_scheduler' + ('_zh' if language == 'zh' else '') + '.yaml'
    # Preserve existing automation references when the Blueprint was imported into another folder.
    existing = list((config / 'blueprints/automation').rglob(name))
    if len(existing) > 1:
        raise InstallError('Several copies of this Blueprint exist. Keep one active copy before updating.')
    blueprint = existing[0].relative_to(config) if existing else Path('blueprints/automation/ecobee_dual_fuel_scheduler') / name
    pairs = [(source / 'blueprints/automation' / name, blueprint),
             (source / 'dist/ecobee-dual-fuel-card.js', Path('www/ecobee-dual-fuel-card.js'))]
    if managed_auto:
        base = source / 'custom_components' / DOMAIN
        if not (base / 'manifest.json').is_file():
            raise InstallError('Managed Auto source files are missing. Download the complete repository.')
        pairs += [(p, p.relative_to(source)) for p in sorted(base.rglob('*'))
                  if p.is_file() and p.suffix in ('.py', '.json', '.js', '.yaml', '.png') and '__pycache__' not in p.parts]
    files = {}
    for src, relative in pairs:
        if not src.is_file() or src.is_symlink():
            raise InstallError(f'Missing or invalid package file: {src.name}')
        safe_path(config, relative)
        files[str(relative)] = src.read_bytes()
    return files


def resource_plan(client, version, card_bytes):
    if not client.call('auth/current_user').get('is_admin'):
        raise InstallError('An HA administrator token is required to register dashboard resources.')
    rows = client.call('lovelace/resources')
    matches = [r for r in rows if urlsplit(r.get('url', '')).path in
               (CARD_PATH, '/ecobee-dual-fuel/ecobee-dual-fuel-card.js')]
    if len(matches) > 1:
        raise InstallError('Duplicate card resources found. Remove the duplicate before updating.')
    before = matches[0] if matches else None
    if before and 'id' not in before:
        raise InstallError('YAML-managed resources require --files-only; update the resource URL in YAML.')
    return {'before': before, 'url': f'{CARD_PATH}?v={version}-{digest(card_bytes)[:12]}'}


def register_resource(client, plan):
    before = plan['before']
    if before and before.get('url') == plan['url'] and before.get('type') == 'module':
        return before
    values = {'url': plan['url'], 'res_type': 'module'}
    if before:
        return client.call('lovelace/resources/update', resource_id=before['id'], **values)
    return client.call('lovelace/resources/create', **values)


def apply_files(config, files, resource=None):
    changed = {p: data for p, data in files.items() if not safe_path(config, p).is_file() or safe_path(config, p).read_bytes() != data}
    if not changed:
        return None
    parent = safe_path(config, '.ecobee-dual-fuel-backups')
    parent.mkdir(mode=0o700, exist_ok=True)
    backup = Path(tempfile.mkdtemp(prefix=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ-'), dir=parent))
    entries = []
    for name, data in changed.items():
        target = safe_path(config, name)
        old = target.read_bytes() if target.exists() else None
        mode = target.stat().st_mode & 0o777 if old is not None else 0o644
        if old is not None:
            atomic_write(backup / 'files' / name, old, mode)
        entries.append({'path': name, 'existed': old is not None, 'before_sha256': digest(old) if old is not None else None,
                        'after_sha256': digest(data), 'mode': mode})
    manifest = {'format': 1, 'config': str(config), 'files': entries, 'resource': resource, 'status': 'prepared'}
    atomic_write(backup / 'manifest.json', json.dumps(manifest, indent=2).encode(), 0o600)
    written = []
    try:
        for entry in entries:
            target = safe_path(config, entry['path'])
            current = digest(target.read_bytes()) if target.exists() else None
            if current != entry['before_sha256']:
                raise InstallError('An installation target changed during the update; retry after other edits finish.')
            atomic_write(target, changed[entry['path']], entry['mode'])
            written.append(entry)
            if digest(target.read_bytes()) != entry['after_sha256']:
                raise InstallError('File verification failed.')
    except BaseException:
        for entry in reversed(written):
            target = safe_path(config, entry['path'])
            if entry['existed']:
                atomic_write(target, (backup / 'files' / entry['path']).read_bytes(), entry['mode'])
            else:
                target.unlink()
        raise
    manifest['status'] = 'files_installed'
    atomic_write(backup / 'manifest.json', json.dumps(manifest, indent=2).encode(), 0o600)
    return backup


def restore_files(config, backup):
    manifest = json.loads((backup / 'manifest.json').read_text())
    if manifest.get('format') != 1 or manifest.get('config') != str(config):
        raise InstallError('This backup belongs to another config directory.')
    for entry in manifest['files']:
        target = safe_path(config, entry['path'])
        if not target.is_file() or digest(target.read_bytes()) != entry['after_sha256']:
            raise InstallError('Files changed after this backup; refusing to overwrite later work.')
        if entry['existed'] and digest(safe_path(backup / 'files', entry['path']).read_bytes()) != entry['before_sha256']:
            raise InstallError('Backup integrity check failed.')
    for entry in reversed(manifest['files']):
        target = safe_path(config, entry['path'])
        if entry['existed']:
            atomic_write(target, (backup / 'files' / entry['path']).read_bytes(), entry['mode'])
        else:
            target.unlink()
    return manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=Path('/config'), help='Writable HA config directory (default: /config)')
    parser.add_argument('--ha-url', help='HA base URL for dashboard resource registration')
    parser.add_argument('--language', choices=('en', 'zh'), default='en', help='Blueprint language')
    parser.add_argument('--without-managed-auto', action='store_true', help='Install only Blueprint and card')
    parser.add_argument('--files-only', action='store_true', help='Skip HA API; register dashboard resource manually')
    parser.add_argument('--dry-run', action='store_true', help='List planned files without writes or authentication')
    parser.add_argument('--restore', type=Path, help='Restore files from an installer backup; resource stays registered')
    args = parser.parse_args(argv)
    client = None
    config = args.config.resolve()
    try:
        if args.restore:
            if args.dry_run:
                raise InstallError('--restore and --dry-run cannot be combined.')
            restore_files(config, args.restore.resolve())
            print('Files restored. Restart HA. The card resource is retained; refresh its version URL in Resources.')
            print('Before removing Managed Auto, disable it in HA and confirm native Auto has been restored.')
            return 0
        files = plan_files(ROOT, config, args.language, not args.without_managed_auto)
        version = json.loads((ROOT / 'package.json').read_text())['version']
        card = files['www/ecobee-dual-fuel-card.js']
        print(f'HA config: {config}\nCard version: {version}')
        changed = 0
        for name, data in files.items():
            target = safe_path(config, name)
            same = target.is_file() and target.read_bytes() == data
            changed += not same
            print(f'{"Unchanged" if same else "Install/update"}: {name}')
        if args.dry_run:
            print('Preview only: no files, resources or HA settings changed.')
            return 0
        plan = None
        if not args.files_only:
            url = args.ha_url or input('Home Assistant URL (for example http://homeassistant.local:8123): ').strip()
            token = os.environ.get('HA_INSTALL_TOKEN') or getpass.getpass('HA administrator long-lived access token (hidden; not saved): ')
            client = HAClient(url, token)
            del token
            plan = resource_plan(client, version, card)
        backup = apply_files(config, files, plan)
        if backup:
            print(f'Backup: {backup}')
        if client:
            try:
                register_resource(client, plan)
                rows = client.call('lovelace/resources')
                if not any(r.get('url') == plan['url'] and r.get('type') == 'module' for r in rows):
                    raise InstallError('Card resource readback failed.')
                print(f'Card resource registered: {plan["url"]}')
            except (InstallError, OSError, ValueError):
                print('Files installed, but card resource registration was not confirmed. Re-run this command to reconcile it.', file=sys.stderr)
                return 2
        else:
            print(f'Add a JavaScript module in HA Resources: {CARD_PATH}?v={version}-{digest(card)[:12]}')
        print('Installation complete.' if changed else 'Files already up to date.')
        if changed:
            print('Restart Home Assistant, then refresh your browser.')
        print('Create an automation from the installed Blueprint; select your thermostat, Aux switch and times.')
        print('Add the ecobee Dual-Fuel Heat Pump card and select your entities.')
        if not args.without_managed_auto:
            print('For Heat/Cool: add ecobee Dual-Fuel Heat Pump Scheduler, choose Add Managed Auto controller, then bind its switch in the Blueprint and card.')
        print('No automation was enabled and no thermostat command was sent.')
        return 0
    except (InstallError, OSError, ValueError, EOFError) as exc:
        # Library transport errors can include URLs; keep credentials out of logs.
        print(f'Installation stopped: {exc if isinstance(exc, InstallError) else type(exc).__name__ + ": check paths, permissions and HA connectivity."}', file=sys.stderr)
        return 1
    finally:
        if client:
            client.close()


if __name__ == '__main__':
    raise SystemExit(main())
