"""One set of window cases for the Blueprint (Jinja), the card (JS) and Managed Auto (Python).

tests/frontend/schedule-vectors.test.mjs runs the same fixture against the card.
"""
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from custom_components.ecobee_managed_auto.policy import heat_pump_window

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "schedule_windows.json").read_text())
ZONE = ZoneInfo(FIXTURE["time_zone"])
CASES = [pytest.param(case, id=case["name"]) for case in FIXTURE["cases"]]


def _local(case):
    return datetime.fromisoformat(case["utc"].replace("Z", "+00:00")).astimezone(ZONE)


@pytest.mark.parametrize("case", CASES)
def test_managed_auto_window_matches_fixture(case):
    inputs = {"start_time": case["start"], "end_time": case["end"], "weekdays": case["days"]}
    assert heat_pump_window(inputs, _local(case)) == (case["expected"] == "heat")


@pytest.mark.asyncio
@pytest.mark.parametrize("case", CASES)
async def test_blueprint_window_matches_fixture(ha, clock, render_policy, case):
    clock(_local(case))
    assert render_policy(start_time=case["start"], end_time=case["end"], weekdays=case["days"]) == case["expected"]
