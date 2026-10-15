"""Isolated Home Assistant fixtures; no network or real thermostat is used."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import inspect
from pathlib import Path
from types import MappingProxyType
from typing import Any, Callable
from zoneinfo import ZoneInfo

import pytest
import pytest_asyncio

from homeassistant import loader
from homeassistant.components.automation.config import (
    AUTOMATION_BLUEPRINT_SCHEMA,
    async_validate_config_item,
)
from homeassistant.components.blueprint.models import Blueprint, BlueprintInputs
from homeassistant.config_entries import ConfigEntries, ConfigEntry
from homeassistant.core import Context, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import trigger as trigger_helper
from homeassistant.helpers.entity import entity_sources
from homeassistant.helpers.script import Script
from homeassistant.helpers.template import Template
from homeassistant.util import dt as dt_util, yaml as yaml_util

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT_PATH = ROOT / "blueprints/automation/ecobee_dual_fuel_scheduler.yaml"
THERMOSTAT = "climate.test_ecobee"
AUX_SWITCH = "switch.test_ecobee_auxiliary_heat_only"
CUTOFF = "number.test_ecobee_compressor_minimum_temperature"
AUTOMATION = "automation.test_ecobee_dual_fuel"
TORONTO = ZoneInfo("America/Toronto")


@pytest.fixture
def blueprint() -> Blueprint:
    return Blueprint(
        yaml_util.load_yaml_dict(BLUEPRINT_PATH),
        path=BLUEPRINT_PATH.name,
        expected_domain="automation",
        schema=AUTOMATION_BLUEPRINT_SCHEMA,
    )


@pytest.fixture
def expand_blueprint(blueprint):
    """Use HA's own input validation/defaults/substitution, not a YAML imitation."""

    def expand(**overrides):
        inputs = {"thermostat": THERMOSTAT, "aux_switch": AUX_SWITCH, **overrides}
        instance = BlueprintInputs(
            blueprint,
            {
                "id": "test_ecobee_dual_fuel",
                "alias": "Test ecobee dual fuel",
                "use_blueprint": {"path": BLUEPRINT_PATH.name, "input": inputs},
            },
        )
        instance.validate()
        return instance.async_substitute()

    return expand


@dataclass
class MockThermostat:
    hass: HomeAssistant
    other_device_id: str = ""
    calls: list[tuple[str, dict[str, Any]]] = field(default_factory=list)
    notifications: dict[str, dict[str, Any]] = field(default_factory=dict)
    acknowledge: bool = True
    fail_services: set[str] = field(default_factory=set)
    on_call: Callable[[str, dict[str, Any]], None] | None = None

    def set_state(self, entity_id: str, value: Any, **attributes):
        previous = self.hass.states.get(entity_id)
        merged = dict(previous.attributes) if previous else {}
        self.hass.states.async_set(entity_id, value, {**merged, **attributes})

    @callback
    def service(self, call: ServiceCall) -> None:
        name = f"{call.domain}.{call.service}"
        data = dict(call.data)
        self.calls.append((name, data))
        if self.on_call is not None:
            self.on_call(name, data)
        if name in self.fail_services:
            raise HomeAssistantError(f"Simulated {name} failure")
        if name == "persistent_notification.create":
            self.notifications[data.get("notification_id", "test")] = data
            return
        if name == "persistent_notification.dismiss":
            self.notifications.pop(data["notification_id"], None)
            return
        if not self.acknowledge:
            return
        entities = data.get("entity_id", [])
        if isinstance(entities, str):
            entities = [entities]
        if name == "switch.turn_on":
            for entity in entities:
                self.set_state(entity, "on")
        elif name == "climate.set_hvac_mode":
            for entity in entities:
                self.set_state(entity, data["hvac_mode"])
            # ecobee's explicit normal Heat command also clears Aux Only.
            self.set_state(AUX_SWITCH, "off")
        elif name == "number.set_value":
            for entity in entities:
                self.set_state(entity, data["value"])

    @property
    def writes(self):
        return [call for call in self.calls if not call[0].startswith("persistent_notification.")]


@pytest_asyncio.fixture
async def ha(tmp_path, monkeypatch):
    """Create only HA core and fake entity/service registries, never integrations."""
    hass = HomeAssistant(str(tmp_path))
    hass.config.time_zone = "America/Toronto"
    dt_util.set_default_time_zone(TORONTO)
    loader.async_setup(hass)
    hass.data[loader.DATA_CUSTOM_COMPONENTS] = {}
    if hasattr(trigger_helper, "async_setup"):
        await trigger_helper.async_setup(hass)
    hass.config_entries = ConfigEntries(hass, {})
    await hass.config_entries.async_initialize()
    entry_values = {
        "data": {}, "discovery_keys": MappingProxyType({}), "domain": "ecobee",
        "minor_version": 1, "options": {}, "source": "user", "title": "Test ecobee",
        "unique_id": "test_ecobee", "version": 1, "subentries_data": None,
    }
    entry = ConfigEntry(**{
        key: value for key, value in entry_values.items()
        if key in inspect.signature(ConfigEntry).parameters
    })
    # Register metadata only. async_add would start the real ecobee integration.
    hass.config_entries._entries[entry.entry_id] = entry

    if hasattr(dr, "async_setup"):
        dr.async_setup(hass)
    devices = dr.async_get(hass)
    await devices.async_load()
    device = devices.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={("ecobee", "test_ecobee")},
    )
    other_device = devices.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={("ecobee", "other_test_ecobee")},
    )
    registry = er.async_get(hass)
    await registry.async_load()
    for entity_id in (THERMOSTAT, AUX_SWITCH, CUTOFF):
        domain, object_id = entity_id.split(".", 1)
        registry.async_get_or_create(
            domain,
            "ecobee",
            object_id,
            suggested_object_id=object_id,
            device_id=device.id,
            config_entry=entry,
        )
        entity_sources(hass)[entity_id] = {"domain": "ecobee"}

    fake = MockThermostat(hass, other_device_id=other_device.id)
    fake.set_state(
        THERMOSTAT,
        "heat",
        hvac_modes=["off", "heat", "cool", "heat_cool"],
        current_temperature=22,
        temperature=22,
        hvac_action="idle",
        preset_mode="Home",
    )
    fake.set_state(AUX_SWITCH, "off")
    fake.set_state(CUTOFF, 10, min=-31.7, max=18.9, step=2.7778, unit_of_measurement="°C", device_class="temperature")
    fake.set_state(AUTOMATION, "on")
    for domain, service in (
        ("switch", "turn_on"),
        ("climate", "set_hvac_mode"),
        ("number", "set_value"),
        ("persistent_notification", "create"),
        ("persistent_notification", "dismiss"),
    ):
        hass.services.async_register(domain, service, fake.service)

    yield fake
    await hass.async_stop(force=True)


@pytest.fixture
def clock(monkeypatch):
    """Control HA's local wall clock while leaving asyncio timeout time real."""
    instant = datetime(2026, 10, 12, 23, 30, tzinfo=TORONTO)

    def set_time(value: str | datetime):
        nonlocal instant
        instant = datetime.fromisoformat(value) if isinstance(value, str) else value
        if instant.tzinfo is None:
            instant = instant.replace(tzinfo=TORONTO)
        return instant

    monkeypatch.setattr(dt_util, "now", lambda time_zone=None: instant.astimezone(time_zone or TORONTO))
    return set_time


@pytest.fixture
def run_blueprint(ha, expand_blueprint):
    async def run(**overrides):
        config = expand_blueprint(**overrides)
        validated = await async_validate_config_item(ha.hass, "automation", config)
        assert validated is not None
        assert validated.validation_status == "ok", validated.validation_error
        script = Script(
            ha.hass,
            validated["actions"],
            "Test ecobee dual fuel",
            "automation",
            script_mode=validated.get("mode", "single"),
            variables=validated.get("variables"),
        )
        await script.async_run(
            {"this": ha.hass.states.get(AUTOMATION)}, context=Context()
        )
        await ha.hass.async_block_till_done()
        return validated

    return run


@pytest.fixture
def render_policy(ha, expand_blueprint):
    """Render the policy from the shipped YAML through HA's template engine."""
    def render(**overrides):
        config = expand_blueprint(**overrides)
        source = config["actions"][0]["variables"]["expected_policy"]
        return Template(source, ha.hass).async_render(config["variables"])

    return render
