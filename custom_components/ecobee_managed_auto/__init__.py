"""Optional persistent Auto controller, in addition to the Heat-only Blueprint."""
from homeassistant.const import Platform
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .controller import Controller
from .installation import async_install

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
PLATFORMS = [Platform.SWITCH, Platform.SENSOR]


async def async_setup_entry(hass, entry):
    if entry.data.get("entry_type") == "installation":
        entry.runtime_data = await async_install(hass, entry.options.get("blueprint_language", entry.data.get("blueprint_language", "en")))
        entry.async_on_unload(entry.add_update_listener(_reload))
        return True
    controller = Controller(hass, entry)
    await controller.load()
    entry.runtime_data = controller
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_reload))
    return True


async def _reload(hass, entry):
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass, entry):
    if entry.data.get("entry_type") == "installation":
        return True
    await entry.runtime_data.stop()
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
