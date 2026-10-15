"""Run the actual Blueprint actions in HA's Script engine with fake services."""

import asyncio

import pytest

from homeassistant.const import UnitOfTemperature
from homeassistant.util.unit_conversion import TemperatureConverter

from conftest import AUX_SWITCH, CUTOFF, THERMOSTAT


@pytest.mark.asyncio
async def test_observation_mode_never_writes_equipment(ha, clock, run_blueprint):
    clock("2026-10-13T12:00:00")
    await run_blueprint()
    assert ha.writes == []


@pytest.mark.asyncio
async def test_daytime_enters_aux_only_once(ha, clock, run_blueprint):
    clock("2026-10-13T12:00:00")
    await run_blueprint(observation_mode=False)
    assert [service for service, _ in ha.writes] == ["switch.turn_on"]
    assert ha.hass.states.is_state(AUX_SWITCH, "on")
    await run_blueprint(observation_mode=False)
    assert [service for service, _ in ha.writes] == ["switch.turn_on"]


@pytest.mark.asyncio
async def test_night_uses_explicit_heat_to_exit_aux(ha, clock, run_blueprint):
    clock("2026-10-12T23:30:00")
    ha.set_state(AUX_SWITCH, "on")
    await run_blueprint(observation_mode=False)
    assert [service for service, _ in ha.writes] == ["climate.set_hvac_mode"]
    assert ha.writes[0][1]["hvac_mode"] == "heat"
    assert ha.hass.states.is_state(AUX_SWITCH, "off")


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", ["off", "cool", "heat_cool", "unknown", "unavailable"])
@pytest.mark.parametrize("time", ["2026-10-13T07:00:00", "2026-10-13T23:00:00"])
@pytest.mark.parametrize("observation", [False, True])
async def test_other_modes_are_not_overridden(ha, clock, run_blueprint, mode, time, observation):
    clock(time)
    ha.set_state(THERMOSTAT, mode)
    await run_blueprint(observation_mode=observation, manage_cutoff=True, cutoff_entity=CUTOFF)
    assert ha.writes == []


@pytest.mark.asyncio
@pytest.mark.parametrize("fahrenheit", range(-25, 66, 5))
async def test_celsius_cutoff_write_preserves_native_api_precision(ha, clock, run_blueprint, fahrenheit):
    clock("2026-10-12T23:30:00")
    ha.set_state(AUX_SWITCH, "on")
    ha.set_state(CUTOFF, -20.25)
    await run_blueprint(observation_mode=False, manage_cutoff=True, cutoff_entity=CUTOFF, cutoff_f=str(fahrenheit))
    assert [name for name, _ in ha.writes] == ["number.set_value", "climate.set_hvac_mode"]
    sent_celsius = ha.writes[0][1]["value"]
    native = TemperatureConverter.convert(sent_celsius, UnitOfTemperature.CELSIUS, UnitOfTemperature.FAHRENHEIT)
    # python-ecobee-api encodes temperatures as int(native_fahrenheit * 10).
    # Rounding the C value to one decimal before sending breaks this contract.
    assert int(native * 10) == fahrenheit * 10


@pytest.mark.asyncio
async def test_fahrenheit_entity_gets_fahrenheit_value(ha, clock, run_blueprint):
    ha.set_state(AUX_SWITCH, "on")
    ha.set_state(CUTOFF, 50, unit_of_measurement="°F", min=-25, max=66, step=5)
    await run_blueprint(observation_mode=False, manage_cutoff=True, cutoff_entity=CUTOFF, cutoff_f="15")
    assert ha.writes[0][0] == "number.set_value"
    assert ha.writes[0][1]["value"] == 15.0


@pytest.mark.asyncio
async def test_rounded_readback_does_not_cause_repeated_cutoff_writes(ha, clock, run_blueprint):
    ha.set_state(AUX_SWITCH, "on")
    ha.set_state(CUTOFF, -9.4)
    await run_blueprint(observation_mode=False, manage_cutoff=True, cutoff_entity=CUTOFF, cutoff_f="15")
    assert [name for name, _ in ha.writes] == ["climate.set_hvac_mode"]


@pytest.mark.asyncio
async def test_cutoff_timeout_blocks_heat_mode(ha, clock, run_blueprint):
    ha.set_state(AUX_SWITCH, "on")
    ha.acknowledge = False
    await run_blueprint(observation_mode=False, manage_cutoff=True, cutoff_entity=CUTOFF,
                        acknowledgement_timeout=0.01, max_attempts=2)
    assert [name for name, _ in ha.writes] == ["number.set_value", "number.set_value"]
    assert ha.hass.states.is_state(AUX_SWITCH, "on")
    assert ha.notifications


@pytest.mark.asyncio
async def test_aux_timeout_retries_are_bounded(ha, clock, run_blueprint):
    clock("2026-10-13T12:00:00")
    ha.acknowledge = False
    await run_blueprint(observation_mode=False, acknowledgement_timeout=0.01, max_attempts=2)
    assert [name for name, _ in ha.writes] == ["switch.turn_on", "switch.turn_on"]
    assert ha.notifications


@pytest.mark.asyncio
async def test_service_error_does_not_escape_without_failure_notice(ha, clock, run_blueprint):
    clock("2026-10-13T12:00:00")
    ha.fail_services.add("switch.turn_on")
    await run_blueprint(observation_mode=False, acknowledgement_timeout=0.01, max_attempts=2)
    assert len(ha.writes) == 2
    assert ha.notifications


@pytest.mark.asyncio
@pytest.mark.parametrize("entity", [THERMOSTAT, AUX_SWITCH, CUTOFF])
async def test_unavailable_entity_never_causes_equipment_write(ha, clock, run_blueprint, entity):
    ha.set_state(entity, "unavailable")
    await run_blueprint(observation_mode=False, manage_cutoff=True, cutoff_entity=CUTOFF)
    assert ha.writes == []
    assert ha.notifications


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", ["off", "cool", "heat_cool"])
async def test_manual_mode_during_cutoff_wait_cancels_remaining_commands(ha, clock, run_blueprint, mode):
    ha.set_state(AUX_SWITCH, "on")
    ha.acknowledge = False

    def turn_off_after_command(name, _data):
        if name == "number.set_value":
            asyncio.get_running_loop().call_later(0.01, ha.set_state, THERMOSTAT, mode)

    ha.on_call = turn_off_after_command
    await run_blueprint(observation_mode=False, manage_cutoff=True, cutoff_entity=CUTOFF,
                        acknowledgement_timeout=1, max_attempts=2)
    assert [name for name, _ in ha.writes] == ["number.set_value"]
    assert ha.hass.states.is_state(THERMOSTAT, mode)


@pytest.mark.asyncio
async def test_crossing_boundary_during_readback_does_not_apply_stale_heat(ha, clock, run_blueprint):
    clock("2026-10-13T06:59:59")
    ha.set_state(AUX_SWITCH, "on")
    ha.acknowledge = False

    def report_after_boundary():
        clock("2026-10-13T07:00:00")
        ha.set_state(CUTOFF, -9.4)

    def delayed_report(name, _data):
        if name == "number.set_value":
            asyncio.get_running_loop().call_later(0.01, report_after_boundary)

    ha.on_call = delayed_report
    await run_blueprint(observation_mode=False, manage_cutoff=True, cutoff_entity=CUTOFF,
                        acknowledgement_timeout=1, max_attempts=2)
    assert [name for name, _ in ha.writes] == ["number.set_value"]
    assert ha.hass.states.is_state(AUX_SWITCH, "on")


@pytest.mark.asyncio
async def test_cutoff_changed_during_final_heat_ack_is_not_reported_success(ha, clock, run_blueprint):
    ha.set_state(AUX_SWITCH, "on")
    ha.set_state(CUTOFF, -9.4)
    ha.acknowledge = False

    def report_heat_with_changed_cutoff():
        ha.set_state(CUTOFF, 10)
        ha.set_state(AUX_SWITCH, "off")

    def delayed_report(name, _data):
        if name == "climate.set_hvac_mode":
            asyncio.get_running_loop().call_later(0.01, report_heat_with_changed_cutoff)

    ha.on_call = delayed_report
    await run_blueprint(observation_mode=False, manage_cutoff=True, cutoff_entity=CUTOFF,
                        acknowledgement_timeout=1, max_attempts=1)
    assert [name for name, _ in ha.writes] == ["climate.set_hvac_mode"]
    assert ha.notifications
    assert any("cutoff" in note["message"].lower() for note in ha.notifications.values())
