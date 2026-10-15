"""Installer tests use temporary files and simulated HA; never a real thermostat."""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import socket
import struct
import tempfile
import threading
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('installer', ROOT / 'install.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class FakeHA:
    def __init__(self, resources=None, admin=True):
        self.resources = resources or []
        self.admin = admin
        self.calls = []

    def call(self, kind, **values):
        self.calls.append((kind, values))
        if kind == 'auth/current_user': return {'is_admin': self.admin}
        if kind == 'lovelace/resources': return self.resources
        if kind.endswith('/create'):
            row = {'id': 'new', 'url': values['url'], 'type': values['res_type']}
            self.resources.append(row)
            return row
        if kind.endswith('/update'):
            row = next(r for r in self.resources if r['id'] == values['resource_id'])
            row.update(url=values['url'], type=values['res_type'])
            return row
        raise AssertionError(kind)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config = Path(self.temp.name)
        (self.config / 'configuration.yaml').write_text('default_config:\n')

    def test_fresh_install_and_idempotent_update(self):
        files = m.plan_files(ROOT, self.config, 'en')
        backup = m.apply_files(self.config, files)
        self.assertTrue((backup / 'manifest.json').is_file())
        for name, data in files.items(): self.assertEqual((self.config / name).read_bytes(), data)
        self.assertIsNone(m.apply_files(self.config, files))
        self.assertEqual((self.config / 'configuration.yaml').read_text(), 'default_config:\n')
        self.assertFalse((self.config / '.storage').exists())
        self.assertFalse((self.config / 'automations.yaml').exists())

    def test_chinese_and_heat_only(self):
        files = m.plan_files(ROOT, self.config, 'zh', False)
        self.assertEqual(len(files), 2)
        self.assertTrue(any(p.endswith('_zh.yaml') for p in files))
        self.assertFalse(any(p.startswith('custom_components') for p in files))

    def test_update_preserves_imported_blueprint_path(self):
        path = self.config / 'blueprints/automation/another/ecobee_dual_fuel_scheduler.yaml'
        path.parent.mkdir(parents=True); path.write_text('old')
        files = m.plan_files(ROOT, self.config, 'en')
        self.assertIn(str(path.relative_to(self.config)), files)
        self.assertNotIn('blueprints/automation/ecobee_dual_fuel_scheduler/ecobee_dual_fuel_scheduler.yaml', files)

    def test_duplicate_blueprints_fail_before_write(self):
        for d in ['a','b']:
            p = self.config / 'blueprints/automation' / d / 'ecobee_dual_fuel_scheduler.yaml'
            p.parent.mkdir(parents=True); p.write_text('old')
        with self.assertRaises(m.InstallError): m.plan_files(ROOT, self.config, 'en')
        self.assertFalse((self.config / 'www').exists())

    def test_wrong_config_and_missing_sources(self):
        with self.assertRaises(m.InstallError): m.plan_files(ROOT, self.config / 'missing', 'en')
        with self.assertRaises(m.InstallError): m.plan_files(self.config, self.config, 'en')

    def test_symlink_and_traversal_refused(self):
        (self.config / 'www').symlink_to(self.config / 'elsewhere')
        with self.assertRaises(m.InstallError): m.plan_files(ROOT, self.config, 'en')
        for name in ['../outside', '/absolute']:
            with self.assertRaises(m.InstallError): m.safe_path(self.config, name)

    def test_backups_restore_bytes_and_permissions(self):
        old = self.config / 'www/ecobee-dual-fuel-card.js'
        old.parent.mkdir();old.write_bytes(b'old');old.chmod(0o640)
        backup = m.apply_files(self.config, {'www/ecobee-dual-fuel-card.js': b'new'})
        m.restore_files(self.config, backup)
        self.assertEqual(old.read_bytes(), b'old')
        self.assertEqual(old.stat().st_mode & 0o777, 0o640)

    def test_restore_refuses_changed_file_and_tampered_backup(self):
        p=self.config / 'www/card.js';p.parent.mkdir();p.write_bytes(b'old')
        backup=m.apply_files(self.config, {'www/card.js':b'new'})
        p.write_bytes(b'user edit')
        with self.assertRaises(m.InstallError):m.restore_files(self.config,backup)
        p.write_bytes(b'new');(backup/'files/www/card.js').write_bytes(b'tampered')
        with self.assertRaises(m.InstallError):m.restore_files(self.config,backup)
        self.assertEqual(p.read_bytes(),b'new')

    def test_failed_copy_rolls_back_prior_writes(self):
        (self.config/'first').write_bytes(b'old')
        real=m.atomic_write
        def fail(path,data,mode=0o644):
            if path == self.config/'second':raise OSError('simulated disk failure')
            return real(path,data,mode)
        with patch.object(m,'atomic_write',side_effect=fail):
            with self.assertRaises(OSError):m.apply_files(self.config,{'first':b'new','second':b'x'})
        self.assertEqual((self.config/'first').read_bytes(),b'old')
        self.assertFalse((self.config/'second').exists())

    def test_dry_run_no_files_or_network(self):
        with patch.object(m,'HAClient',side_effect=AssertionError('network forbidden')):
            self.assertEqual(m.main(['--config',str(self.config),'--dry-run']),0)
        self.assertEqual([p.name for p in self.config.iterdir()],['configuration.yaml'])

    def test_create_update_no_duplicate_resources(self):
        ha=FakeHA()
        plan=m.resource_plan(ha,'1.0',b'a');m.register_resource(ha,plan)
        self.assertEqual(len(ha.resources),1)
        again=m.resource_plan(ha,'1.0',b'a');m.register_resource(ha,again)
        self.assertEqual(sum(k.endswith('/create') for k,_ in ha.calls),1)
        changed=m.resource_plan(ha,'1.0',b'b');m.register_resource(ha,changed)
        self.assertEqual(len(ha.resources),1)
        self.assertNotEqual(plan['url'],changed['url'])
        self.assertTrue(all(not k.startswith('call_service') for k,_ in ha.calls))

    def test_resource_update_preserves_other_resources(self):
        other={'id':'other','url':'/local/other.js','type':'module'}
        ha=FakeHA([other.copy(),{'id':'ours','url':m.CARD_PATH+'?v=old','type':'module'}])
        m.register_resource(ha,m.resource_plan(ha,'1',b'x'))
        self.assertEqual(ha.resources[0],other)
        self.assertEqual(ha.resources[1]['id'],'ours')

    def test_resource_preflight_errors(self):
        with self.assertRaises(m.InstallError):m.resource_plan(FakeHA(admin=False),'1',b'x')
        for rows in [[{'url':m.CARD_PATH}], [{'id':'a','url':m.CARD_PATH},{'id':'b','url':m.CARD_PATH+'?v=1'}]]:
            with self.assertRaises(m.InstallError):m.resource_plan(FakeHA(rows),'1',b'x')

    def test_script_migrates_hacs_resource_without_duplicate(self):
        old={'id':'ours','url':'/ecobee-dual-fuel/ecobee-dual-fuel-card.js?v=old','type':'module'}
        ha=FakeHA([old])
        m.register_resource(ha,m.resource_plan(ha,'1',b'x'))
        self.assertEqual(len(ha.resources),1)
        self.assertEqual(ha.resources[0]['id'],'ours')
        self.assertTrue(ha.resources[0]['url'].startswith(m.CARD_PATH))
        ha.resources.append({'id':'duplicate','url':'/ecobee-dual-fuel/ecobee-dual-fuel-card.js'})
        with self.assertRaises(m.InstallError):m.resource_plan(ha,'1',b'x')

    def test_bad_urls_do_not_connect(self):
        with patch.object(m.socket,'create_connection',side_effect=AssertionError('unexpected network')):
            for url in ['ftp://host','http://u:p@host','http://host?token=secret','http://host/\r\nGET']:
                with self.assertRaises(m.InstallError):m.HAClient(url,'secret')

    def test_masked_frames_fragmentation_and_ping(self):
        a,b=socket.socketpair();self.addCleanup(a.close);self.addCleanup(b.close)
        client=object.__new__(m.HAClient);client.sock=a
        client.send({'value':'x'*150})
        first=b.recv(2);self.assertEqual(first[0],129);self.assertEqual(first[1],254)
        n=struct.unpack('!H',b.recv(2))[0];mask=b.recv(4);data=b.recv(n)
        decoded=bytes(v^mask[i%4] for i,v in enumerate(data))
        self.assertEqual(json.loads(decoded),{'value':'x'*150})
        b.sendall(b'\x01\x06{"ok":'+b'\x89\x01x'+b'\x80\x05true}')
        self.assertEqual(client.receive(),{'ok':True})
        self.assertEqual(b.recv(2),b'\x8a\x81')

    def test_full_auth_handshake_and_command(self):
        a,b=socket.socketpair();a.settimeout(2);b.settimeout(2)
        errors=[]
        def server():
            try:
                header=b''
                while not header.endswith(b'\r\n\r\n'):header+=b.recv(1)
                key=next(l.split(b': ',1)[1] for l in header.split(b'\r\n') if l.startswith(b'Sec-WebSocket-Key:'))
                accept=base64.b64encode(hashlib.sha1(key+b'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest())
                b.sendall(b'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+b'\r\n\r\n')
                def send(x):
                    data=json.dumps(x).encode();b.sendall(bytes([129,len(data)])+data)
                def receive():
                    _,n=b.recv(2);n &=127
                    if n==126:n=struct.unpack('!H',b.recv(2))[0]
                    mask=b.recv(4);data=b''
                    while len(data)<n:data+=b.recv(n-len(data))
                    return json.loads(bytes(v^mask[i%4] for i,v in enumerate(data)))
                send({'type':'auth_required'});auth=receive();self.assertEqual(auth['access_token'],'test-only')
                send({'type':'auth_ok'});request=receive()
                send({'id':request['id'],'type':'result','success':True,'result':{'is_admin':True}})
            except BaseException as e:errors.append(e)
            finally:b.close()
        thread=threading.Thread(target=server);thread.start()
        try:
            with patch.object(m.socket,'create_connection',return_value=a):
                client=m.HAClient('http://ha.test:8123','test-only')
            self.assertEqual(client.call('auth/current_user'),{'is_admin':True});client.close()
        finally:a.close();thread.join(3)
        self.assertFalse(thread.is_alive());self.assertEqual(errors,[])


if __name__=='__main__':unittest.main()
