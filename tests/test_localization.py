"""Chinese UI text must not change the input contract or equipment control flow."""

from pathlib import Path

import pytest

from homeassistant.components.automation.config import (
    AUTOMATION_BLUEPRINT_SCHEMA,
    async_validate_config_item,
)
from homeassistant.components.blueprint.models import Blueprint, BlueprintInputs
from homeassistant.core import Context
from homeassistant.helpers.script import Script
from homeassistant.util import yaml as yaml_util

ROOT = Path(__file__).resolve().parents[1]
ENGLISH = ROOT / "blueprints/automation/ecobee_dual_fuel_scheduler.yaml"
CHINESE = ROOT / "blueprints/automation/ecobee_dual_fuel_scheduler_zh.yaml"


def without_display_text(data):
    """Keep field presence, values, input tags and every control expression intact."""
    if isinstance(data, dict):
        return {
            key: "<display text>" if key in {"name", "description", "label", "stop", "title", "message", "source_url"}
            else without_display_text(value)
            for key, value in data.items()
        }
    if isinstance(data, list):
        return [without_display_text(value) for value in data]
    return data


def test_chinese_keeps_input_contract_and_equipment_control_identical():
    english = yaml_util.load_yaml_dict(ENGLISH)
    chinese = yaml_util.load_yaml_dict(CHINESE)
    assert without_display_text(chinese) == without_display_text(english)
    assert chinese["blueprint"]["name"] == "ecobee 双热源定时切换（中文版）"
    # Each file re-imports from itself, so a Chinese install never switches to English on update.
    assert english["blueprint"]["source_url"].endswith("/blob/main/blueprints/automation/ecobee_dual_fuel_scheduler.yaml")
    assert chinese["blueprint"]["source_url"].endswith("/blob/main/blueprints/automation/ecobee_dual_fuel_scheduler_zh.yaml")
    # Weekday values remain native keys even though their labels are Chinese.
    options = chinese["blueprint"]["input"]["schedule"]["input"]["weekdays"]["selector"]["select"]["options"]
    assert options[0] == {"label": "星期一", "value": "mon"}
    assert options[-1] == {"label": "星期日", "value": "sun"}


@pytest.fixture
def chinese_blueprint():
    blueprint = Blueprint(
        yaml_util.load_yaml_dict(CHINESE),
        path=CHINESE.name,
        expected_domain="automation",
        schema=AUTOMATION_BLUEPRINT_SCHEMA,
    )
    assert blueprint.validate() is None
    return blueprint


def expand_chinese(blueprint, **overrides):
    instance = BlueprintInputs(
        blueprint,
        {
            "id": "test_ecobee_dual_fuel",
            "alias": "中文蓝图测试",
            "use_blueprint": {
                "path": CHINESE.name,
                "input": {
                    "thermostat": "climate.test_ecobee",
                    "aux_switch": "switch.test_ecobee_auxiliary_heat_only",
                    **overrides,
                },
            },
        },
    )
    instance.validate()
    return instance.async_substitute()


@pytest.mark.asyncio
@pytest.mark.parametrize("overrides", [{}, {"manage_cutoff": True, "cutoff_entity": "number.test_ecobee_compressor_minimum_temperature"}])
async def test_chinese_expanded_automation_schema(ha, chinese_blueprint, overrides):
    config = await async_validate_config_item(ha.hass, "automation", expand_chinese(chinese_blueprint, **overrides))
    assert config is not None
    assert config.validation_status == "ok", config.validation_error


@pytest.mark.asyncio
@pytest.mark.parametrize("hour, expected", [(23, "正常制暖，允许辅助供暖"), (12, "仅辅助供暖")])
async def test_chinese_observation_notification_renders_without_equipment_commands(ha, clock, chinese_blueprint, hour, expected):
    clock(f"2026-10-13T{hour:02d}:30:00-04:00")
    config = await async_validate_config_item(ha.hass, "automation", expand_chinese(
        chinese_blueprint,
        manage_cutoff=True,
        cutoff_entity="number.test_ecobee_compressor_minimum_temperature",
    ))
    assert config.validation_status == "ok", config.validation_error
    script = Script(
        ha.hass, config["actions"], "中文蓝图测试", "automation",
        script_mode=config["mode"], variables=config["variables"],
    )
    await script.async_run({"this": ha.hass.states.get("automation.test_ecobee_dual_fuel")}, context=Context())
    await ha.hass.async_block_till_done()
    assert not ha.writes
    notification = next(iter(ha.notifications.values()))
    assert notification["title"] == "ecobee 双热源定时切换（中文版）"
    assert expected in notification["message"]
    assert "仅辅助供暖开关当前关闭" in notification["message"]
    assert "15°F / -9.4°C" in notification["message"]
    assert "未向设备发送控制指令" in notification["message"]
