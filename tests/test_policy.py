"""Boundary behavior of the actual template embedded in the distributable."""

from datetime import datetime

import pytest

from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity import entity_sources

from conftest import AUX_SWITCH, CUTOFF, THERMOSTAT, TORONTO


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("instant", "expected"),
    [
        ("2026-10-12T22:59:59", "aux"),
        ("2026-10-12T23:00:00", "heat"),
        ("2026-10-13T00:00:00", "heat"),
        ("2026-10-13T06:59:59", "heat"),
        ("2026-10-13T07:00:00", "aux"),
        ("2026-10-13T23:00:00", "aux"),
    ],
)
async def test_cross_midnight_weekday_is_the_start_day(ha, clock, render_policy, instant, expected):
    clock(instant)
    assert render_policy(weekdays=["mon"]) == expected


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("instant", "expected"),
    [
        ("2026-10-12T06:59:59", "aux"),
        ("2026-10-12T07:00:00", "heat"),
        ("2026-10-12T22:59:59", "heat"),
        ("2026-10-12T23:00:00", "aux"),
        ("2026-10-13T12:00:00", "aux"),
    ],
)
async def test_same_day_window_boundaries(ha, clock, render_policy, instant, expected):
    clock(instant)
    assert render_policy(start_time="07:00:00", end_time="23:00:00", weekdays=["mon"]) == expected


@pytest.mark.asyncio
@pytest.mark.parametrize("fold", [0, 1])
async def test_fall_back_hour_stays_in_saturday_night_window(ha, clock, render_policy, fold):
    clock(datetime(2026, 11, 1, 1, 30, tzinfo=TORONTO, fold=fold))
    assert render_policy(weekdays=["sat"]) == "heat"


@pytest.mark.asyncio
@pytest.mark.parametrize("hour", [1, 3, 6, 7])
async def test_spring_forward_uses_local_wall_clock(ha, clock, render_policy, hour):
    clock(datetime(2026, 3, 8, hour, 30, tzinfo=TORONTO))
    assert render_policy(weekdays=["sat"]) == ("heat" if hour < 7 else "aux")


@pytest.mark.asyncio
async def test_minute_precision_times_are_accepted(ha, clock, render_policy):
    clock("2026-10-13T06:30:00")
    assert render_policy(start_time="23:00", end_time="07:00") == "heat"


@pytest.mark.asyncio
@pytest.mark.parametrize("overrides", [
    {"start_time": "07:00:00", "end_time": "07:00:00"},
    {"weekdays": []},
    {"weekdays": ["monday"]},
])
async def test_invalid_schedule_is_an_error(ha, clock, render_policy, overrides):
    assert render_policy(**overrides).startswith("error:")


@pytest.mark.asyncio
@pytest.mark.parametrize("value", ["14", "nan", "inf", "-30", "70"])
async def test_invalid_native_cutoff_is_an_error(ha, clock, render_policy, value):
    assert render_policy(manage_cutoff=True, cutoff_entity=CUTOFF, cutoff_f=value).startswith("error:")


@pytest.mark.asyncio
async def test_entities_from_two_thermostats_are_rejected(ha, clock, render_policy):
    er.async_get(ha.hass).async_update_entity(AUX_SWITCH, device_id=ha.other_device_id)
    assert render_policy() == "error:entities_must_share_one_native_ecobee_device"


@pytest.mark.asyncio
async def test_non_native_integration_entities_are_rejected(ha, clock, render_policy):
    entity_sources(ha.hass)[THERMOSTAT] = {"domain": "homekit_controller"}
    assert render_policy() == "error:entities_must_share_one_native_ecobee_device"
