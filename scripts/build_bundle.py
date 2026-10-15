"""Put all HACS runtime assets inside the one custom integration."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def build(check=False):
    base = ROOT / 'custom_components/ecobee_managed_auto/bundle'
    files = {'ecobee-dual-fuel-card.js': (ROOT/'dist/ecobee-dual-fuel-card.js').read_bytes(),
             'versions.json': (json.dumps({'card':json.loads((ROOT/'package.json').read_text())['version']},indent=2)+'\n').encode()}
    for language in ('','_zh'):
        name=f'ecobee_dual_fuel_scheduler{language}.yaml'
        files[name]=(ROOT/'blueprints/automation'/name).read_bytes()
    for name,data in files.items():
        target=base/name
        if check:
            if not target.is_file() or target.read_bytes()!=data:
                raise SystemExit(f'HACS bundle is out of date: {name}; run python scripts/build_bundle.py')
        else:
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    print('HACS bundle is current.' if check else 'HACS bundle built.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');build(parser.parse_args().check)
