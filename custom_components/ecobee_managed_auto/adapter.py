"""Narrow compatibility boundary for native ecobee/automation internals.

Only reads cache/config; all device writes use public HA services. Tested against
HA 2026.10.1. Missing internals fail closed rather than inventing temperatures.
"""
from homeassistant.helpers import entity_registry as er


def native_thermostat(hass, climate_id, aux_id):
    registry = er.async_get(hass)
    climate, aux = registry.async_get(climate_id), registry.async_get(aux_id)
    if not climate or not aux or climate.platform != "ecobee" or aux.platform != "ecobee":
        raise ValueError("select_native_ecobee_entities")
    if not climate.device_id or climate.device_id != aux.device_id:
        raise ValueError("entities_must_share_device")
    if aux.unique_id != f"{climate.unique_id}_aux_heat_only":
        raise ValueError("select_auxiliary_heat_only_switch")
    entry = hass.config_entries.async_get_entry(climate.config_entry_id)
    if entry is None:
        raise ValueError("native_thermostat_unavailable")
    data = getattr(entry, "runtime_data", None)
    if data is None:
        # HA 2024.12 keeps the native EcobeeData singleton in hass.data.
        data = hass.data.get("ecobee")
        if data is None or getattr(data, "entry", None) is not entry:
            raise ValueError("native_thermostat_unavailable")
    thermostats = data.ecobee.thermostats
    for raw in thermostats:
        if raw.get("identifier") == climate.unique_id:
            return raw
    raise ValueError("native_thermostat_unavailable")


def schedule_inputs(hass, automation_id, climate_id, aux_id, guard_id):
    component = hass.data.get("automation")
    automation = component.get_entity(automation_id) if component else None
    # raw_config is already expanded and has NO use_blueprint key in HA 2026.10.
    # _blueprint_inputs retains the original instance and its explicit inputs.
    config = getattr(automation, "_blueprint_inputs", None)
    blueprint = (config or {}).get("use_blueprint", {})
    path = blueprint.get("path", "").split("/")[-1]
    if path not in ("ecobee_dual_fuel_scheduler.yaml", "ecobee_dual_fuel_scheduler_zh.yaml"):
        raise ValueError("select_scheduler_blueprint")
    inputs = blueprint.get("input", {})
    if inputs.get("thermostat") != climate_id or inputs.get("aux_switch") != aux_id:
        raise ValueError("schedule_device_mismatch")
    if inputs.get("managed_auto_entity") != guard_id:
        raise ValueError("configure_blueprint_auto_guard")
    return inputs
