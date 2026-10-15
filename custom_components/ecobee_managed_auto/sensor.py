"""Controller status as an enum sensor, so it has history and can drive automations."""
from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import EntityCategory

from .const import DOMAIN, STATUSES


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ManagedAutoStatus(entry)])


class ManagedAutoStatus(SensorEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "status"
    _attr_should_poll = False
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = list(STATUSES)
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, entry):
        self.controller = entry.runtime_data
        self._attr_unique_id = f"{entry.entry_id}_status"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)}}

    @property
    def native_value(self):
        return self.controller.status

    @property
    def extra_state_attributes(self):
        return {"detail": self.controller.detail or None}

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        self.controller.listeners.append(self.async_write_ha_state)
        self.async_on_remove(lambda: self.controller.listeners.remove(self.async_write_ha_state))
