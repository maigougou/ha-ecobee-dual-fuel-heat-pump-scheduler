"""HACS package assets: install Blueprint and load the bundled card, without HVAC writes."""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
from pathlib import Path
import tempfile
from datetime import datetime, timezone
from urllib.parse import urlsplit

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
try:
    from homeassistant.components.lovelace.const import LOVELACE_DATA
except ImportError:  # HA 2024.12 stores Lovelace data in a dictionary.
    LOVELACE_DATA = "lovelace"
from homeassistant.exceptions import ConfigEntryNotReady

BUNDLE = Path(__file__).parent / 'bundle'
STATIC_URL = '/ecobee-dual-fuel/ecobee-dual-fuel-card.js'
STATE_KEY = 'ecobee_dual_fuel_installation'


def _write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd,temp=tempfile.mkstemp(prefix='.'+path.name+'.',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f:
            os.fchmod(f.fileno(),0o644);f.write(data);f.flush();os.fsync(f.fileno())
        os.replace(temp,path)
    finally:
        if os.path.exists(temp):os.unlink(temp)


def install_blueprint(config_dir, language):
    """Install the chosen language and update other previously installed translations."""
    if language not in ('en','zh'):
        raise ValueError('Unsupported Blueprint language')
    root=Path(config_dir).resolve()
    languages=[language]
    for other in ('en','zh'):
        name='ecobee_dual_fuel_scheduler'+('_zh' if other=='zh' else '')+'.yaml'
        if other!=language and any((root/'blueprints/automation').rglob(name)):
            languages.append(other)
    # Validate every destination before replacing any file.
    plans=[_blueprint_plan(root, item) for item in languages]
    for target,data in plans:
        _install_blueprint(root,target,data)
    return str(plans[0][0].relative_to(root))


def _blueprint_plan(root, language):
    name='ecobee_dual_fuel_scheduler'+('_zh' if language=='zh' else '')+'.yaml'
    data=(BUNDLE/name).read_bytes()
    base=root/'blueprints/automation'
    matches=list(base.rglob(name))
    if len(matches)>1:
        raise ValueError('Multiple copies of the selected Blueprint exist; keep one active copy.')
    target=matches[0] if matches else base/'ecobee_dual_fuel_scheduler'/name
    for path in (target,*target.parents):
        if path==root:break
        if path.is_symlink():raise ValueError('Blueprint paths cannot be symlinks')
    return target,data


def _install_blueprint(root, target, data):
    if target.is_file() and target.read_bytes()==data:
        return
    if target.exists():
        old=target.read_bytes()
        backup_root=root/'.ecobee-dual-fuel-backups'
        if backup_root.is_symlink():raise ValueError('Backup directory cannot be a symlink')
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        _write(backup_root/stamp/target.name,old)
    _write(target,data)


async def async_install(hass, language):
    """Serialized and idempotent across startup/reload; no automation or service calls."""
    state=hass.data.setdefault(STATE_KEY,{})
    lock=state.setdefault('lock',asyncio.Lock())
    async with lock:
        try:
            blueprint=await hass.async_add_executor_job(install_blueprint,hass.config.config_dir,language)
            def read_version():
                card=(BUNDLE/'ecobee-dual-fuel-card.js').read_bytes()
                version=json.loads((BUNDLE/'versions.json').read_text())['card']
                return f'{STATIC_URL}?v={version}-{hashlib.sha256(card).hexdigest()[:12]}'
            url=await hass.async_add_executor_job(read_version)
            if not state.get('static_registered'):
                await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL,str(BUNDLE/'ecobee-dual-fuel-card.js'),True)])
                state['static_registered']=True
            lovelace=hass.data[LOVELACE_DATA]
            resources=lovelace["resources"] if isinstance(lovelace,dict) else lovelace.resources
            mode=lovelace["mode"] if isinstance(lovelace,dict) else lovelace.resource_mode
            if mode=='storage':
                if not resources.loaded:
                    await resources.async_load();resources.loaded=True
                matches=[r for r in resources.async_items() if urlsplit(r.get('url','')).path in (STATIC_URL,'/local/ecobee-dual-fuel-card.js')]
                if len(matches)>1:
                    raise ValueError('Duplicate card resources exist; remove the duplicate in dashboard Resources.')
                if matches:
                    row=matches[0]
                    if row.get('url')!=url or row.get('type')!='module':
                        await resources.async_update_item(row['id'],{'url':url,'res_type':'module'})
                else:
                    await resources.async_create_item({'url':url,'res_type':'module'})
            else:
                # No YAML edits. HA's supported frontend hook also works with YAML dashboards.
                rows=resources.async_items()
                if any(urlsplit(r.get('url','')).path in (STATIC_URL,'/local/ecobee-dual-fuel-card.js') for r in rows):
                    raise ValueError('Remove the manually configured ecobee card resource from YAML before enabling bundled loading.')
                if state.get('extra_url')!=url:
                    if state.get('extra_url'):frontend.remove_extra_js_url(hass,state['extra_url'])
                    frontend.add_extra_js_url(hass,url);state['extra_url']=url
            return {'blueprint':blueprint,'card_url':url}
        except (OSError,ValueError,KeyError,AttributeError) as exc:
            raise ConfigEntryNotReady(f'Could not install Blueprint/card: {exc}') from exc
