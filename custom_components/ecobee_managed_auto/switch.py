"""Arm Managed Auto; the switch exposes verifiable controller status to the card."""
from homeassistant.components.switch import SwitchEntity
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, EVENT_HOMEASSISTANT_STOP
from homeassistant.core import callback

from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ManagedAutoSwitch(entry)])


class ManagedAutoSwitch(SwitchEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "managed_auto"
    # Use the device name alone ("ecobee Managed Auto"), not "ecobee Managed Auto Managed Auto".
    _attr_name = None
    _attr_should_poll = False
    _attr_icon = "mdi:autorenew"
    # Changes every ecobee poll; keep it out of the recorder.
    _unrecorded_attributes = frozenset({"runtime_updated", "current_c"})

    def __init__(self, entry):
        self.controller = entry.runtime_data
        self._attr_unique_id = f"{entry.entry_id}_managed_auto"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)},
                                  "name": entry.title, "manufacturer": "ecobee Dual-Fuel Heat Pump Scheduler"}

    @property
    def is_on(self):
        return self.controller.enabled

    @property
    def extra_state_attributes(self):
        return self.controller.attributes

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        self.controller.entity_id = self.entity_id
        self.controller.listeners.append(self.async_write_ha_state)
        self.async_on_remove(lambda: self.controller.listeners.remove(self.async_write_ha_state))
        self.async_on_remove(self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, self._stop))
        if self.hass.is_running:
            self.controller.start()
        else:
            self.async_on_remove(self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, self._start))

    @callback
    def _start(self, _event):
        self.controller.start()

    async def _stop(self, _event):
        await self.controller.stop()

    async def async_turn_on(self, **kwargs):
        await self.controller.enable(True)

    async def async_turn_off(self, **kwargs):
        await self.controller.enable(False)
