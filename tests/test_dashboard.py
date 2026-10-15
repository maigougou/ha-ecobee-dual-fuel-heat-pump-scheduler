"""Exercise the published native cards through HA's real Jinja environment."""

from __future__ import annotations

from html.parser import HTMLParser
import re

import pytest

from homeassistant.helpers.template import Template
from homeassistant.util import yaml as yaml_util

from conftest import ROOT

CLIMATE = "climate.example_ecobee"
AUX = "switch.example_ecobee_auxiliary_heat_only"
AUTOMATION = "automation.example_ecobee_dual_fuel"
HEAT_PUMP_POWER = "sensor.example_heat_pump_power"
FURNACE_POWER = "sensor.example_furnace_power"
CORE_ENTITIES = {CLIMATE, AUX, AUTOMATION}


class RenderedCard(HTMLParser):
    """Extract user-visible text and equipment cells without asserting layout."""

    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.parts = []
        self.cells = []
        self._cell = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        if tag == "td":
            self._cell = []

    def handle_endtag(self, tag):
        if tag == "td" and self._cell is not None:
            self.cells.append(self._normalize(self._cell))
            self._cell = None

    def handle_data(self, data):
        self.parts.append(data)
        if self._cell is not None:
            self._cell.append(data)

    @staticmethod
    def _normalize(parts):
        return " ".join(" ".join(parts).split())

    @property
    def text(self):
        return self._normalize(self.parts)

    @property
    def visible_text(self):
        return RenderedCard(self.source.partition("<details>")[0]).text

    def equipment(self, name):
        return next(cell for cell in self.cells if cell.startswith(name))


def load_card(language="zh", with_power=False):
    name = "dashboard_card" + ("_power" if with_power else "")
    name += ("_en" if language == "en" else "") + ".yaml"
    return yaml_util.load_yaml_dict(ROOT / "examples" / name)


def configured_content(card, **settings):
    """Apply the same entity/format settings exposed at the template's top."""
    content = card["cards"][0]["content"]
    for name, value in settings.items():
        content, count = re.subn(
            rf"(set {re.escape(name)} = )'[^']*'",
            lambda match: match[1] + repr(value),
            content,
            count=1,
        )
        assert count == 1, f"Missing documented card setting: {name}"
    return content


@pytest.fixture
def dashboard(ha):
    ha.set_state(CLIMATE, "heat", equipment_running="", current_temperature=22,
                 temperature=22.5, preset_mode="Home")
    ha.set_state(AUX, "off")
    ha.set_state(AUTOMATION, "on")
    ha.set_state(HEAT_PUMP_POWER, "1420.5", unit_of_measurement="W")
    ha.set_state(FURNACE_POWER, "0.17", unit_of_measurement="kW")

    def render(language="zh", with_power=False, **settings):
        card = load_card(language, with_power)
        content = configured_content(card, **settings)
        return RenderedCard(Template(content, ha.hass).async_render())

    return render


@pytest.mark.asyncio
@pytest.mark.parametrize(("signal", "equipment", "status"), [
    ("heatPump", "热泵", "制暖 · 1 级"),
    ("heatPump2", "热泵", "制暖 · 2 级"),
    ("heatPump3", "热泵", "制暖 · 3 级"),
    ("compCool1", "热泵", "制冷 · 1 级"),
    ("compCool2", "热泵", "制冷 · 2 级"),
    ("auxHeat1", "炉子", "制暖 · 1 级"),
    ("auxHeat2", "炉子", "制暖 · 2 级"),
    ("auxHeat3", "炉子", "制暖 · 3 级"),
])
async def test_all_ecobee_stages(ha, dashboard, signal, equipment, status):
    ha.set_state(CLIMATE, "heat", equipment_running=signal)
    assert status in dashboard().equipment(equipment)


@pytest.mark.asyncio
async def test_highest_stages_and_unknown_raw_codes_remain_visible(ha, dashboard):
    raw = " heatPump, heatPump2, auxHeat1,auxHeat3,compCool2,newEquipment "
    ha.set_state(CLIMATE, "heat", equipment_running=raw)
    result = dashboard()
    assert "制暖 · 2 级" in result.equipment("热泵")
    assert "制冷 · 2 级" in result.equipment("热泵")
    assert "制暖 · 3 级" in result.equipment("炉子")
    assert raw.strip() in result.text
    assert "状态待确认" in result.text


@pytest.mark.asyncio
@pytest.mark.parametrize(("mode", "aux", "expected"), [
    ("heat", "off", "热泵 · 炉子备用"),
    ("heat", "on", "仅炉子供暖"),
    ("heat", "unavailable", "制暖 · 热源状态未知"),
    ("cool", "off", "制冷模式"),
    ("heat_cool", "off", "自动冷暖 · 定时切换暂停"),
    ("off", "off", "已关闭"),
    ("unknown", "off", "状态未知"),
    ("unavailable", "on", "状态未知"),
])
async def test_mode_describes_configuration_not_clock_or_operation(
        ha, dashboard, mode, aux, expected):
    ha.set_state(CLIMATE, mode, equipment_running="")
    ha.set_state(AUX, aux)
    result = dashboard()
    assert expected in result.text
    assert "级" not in result.equipment("热泵")
    assert "级" not in result.equipment("炉子")


@pytest.mark.asyncio
async def test_native_aux_backup_can_run_while_heat_pump_is_preferred(ha, dashboard):
    ha.set_state(CLIMATE, "heat", equipment_running="auxHeat2")
    result = dashboard()
    assert "热泵 · 炉子备用" in result.text
    assert "未运行" in result.equipment("热泵")
    assert "制暖 · 2 级" in result.equipment("炉子")


@pytest.mark.asyncio
async def test_idle_fan_missing_and_offline_statuses_are_distinct(ha, dashboard):
    assert "待机" in dashboard().text
    assert "未运行" in dashboard().equipment("炉子")
    ha.set_state(CLIMATE, "heat", equipment_running="fan,ventilator")
    result = dashboard()
    assert "送风／通风" in result.text
    assert "未运行" in result.equipment("热泵")
    assert "未运行" in result.equipment("炉子")
    for mode, raw in [("heat", None), ("unavailable", "heatPump2")]:
        ha.set_state(CLIMATE, mode, equipment_running=raw)
        result = dashboard()
        assert "状态未知" in result.equipment("热泵")
        assert "状态未知" in result.equipment("炉子")
        assert "2 级" not in result.text
    assert "22.5" not in result.text  # Do not show stale thermostat temperatures.
    assert "暂无数据" in result.text


@pytest.mark.asyncio
async def test_unknown_equipment_does_not_claim_idle_or_invent_stage(ha, dashboard):
    ha.set_state(CLIMATE, "heat", equipment_running="compHeat1,fan")
    result = dashboard()
    assert "状态待确认" in result.text
    assert "状态未知" in result.equipment("热泵")
    assert "compHeat1,fan" in result.text
    assert "待机" not in result.visible_text


@pytest.mark.asyncio
@pytest.mark.parametrize(("use_outdoor", "use_furnace"), [
    (False, False), (True, False), (False, True), (True, True),
])
async def test_power_entities_are_independently_optional(
        ha, dashboard, use_outdoor, use_furnace):
    settings = {
        "heat_pump_power_entity": HEAT_PUMP_POWER if use_outdoor else "",
        "furnace_power_entity": FURNACE_POWER if use_furnace else "",
        "power_note": "My monitor: 30-second samples",
    }
    result = dashboard(with_power=True, **settings)
    assert ("1420.5 W" in result.equipment("热泵")) == use_outdoor
    assert ("0.17 kW" in result.equipment("炉子")) == use_furnace
    assert (settings["power_note"] in result.text) == (use_outdoor or use_furnace)
    assert "功率不可用" not in result.text  # Blank does not mean disconnected.
    assert "未运行" in result.equipment("热泵")  # Power cannot imply stage.
    content = configured_content(load_card(with_power=True), **settings)
    info = Template(content, ha.hass).async_render_to_info()
    expected_power = ({HEAT_PUMP_POWER} if use_outdoor else set())
    expected_power |= {FURNACE_POWER} if use_furnace else set()
    assert set(info.entities) == CORE_ENTITIES | expected_power


@pytest.mark.asyncio
async def test_power_preserves_units_and_distinguishes_offline_from_zero(ha, dashboard):
    ha.set_state(HEAT_PUMP_POWER, "unavailable")
    ha.set_state(FURNACE_POWER, "0")
    result = dashboard(with_power=True)
    assert "功率不可用" in result.equipment("热泵")
    assert "0.0" not in result.equipment("热泵")
    assert "0.0 kW" in result.equipment("炉子")
    ha.set_state(HEAT_PUMP_POWER, "1.23456", unit_of_measurement="kW")
    ha.set_state(FURNACE_POWER, "122.36", unit_of_measurement="W")
    result = dashboard(with_power=True)
    assert "1.235 kW" in result.equipment("热泵")
    assert "122.4 W" in result.equipment("炉子")


@pytest.mark.asyncio
@pytest.mark.parametrize("unit", ["kWh", None])
async def test_energy_totals_and_unitless_values_are_not_displayed_as_power(
        ha, dashboard, unit):
    ha.set_state(HEAT_PUMP_POWER, "4567", unit_of_measurement=unit)
    result = dashboard(with_power=True)
    assert "请使用 W／kW 功率实体" in result.equipment("热泵")
    assert "4567" not in result.text


@pytest.mark.asyncio
@pytest.mark.parametrize("language", ["zh", "en"])
@pytest.mark.parametrize("with_power", [False, True])
async def test_distributed_variants_render_and_watch_all_dependencies(
        ha, dashboard, language, with_power):
    ha.set_state(CLIMATE, "heat", equipment_running="heatPump2,auxHeat1")
    card = load_card(language, with_power)
    markdown = card["cards"][0]
    info = Template(markdown["content"], ha.hass).async_render_to_info()
    expected = CORE_ENTITIES | ({HEAT_PUMP_POWER, FURNACE_POWER} if with_power else set())
    assert set(info.entities) == expected
    assert set(markdown["entity_id"]) == expected
    result = dashboard(language=language, with_power=with_power)
    assert not re.search(r"__[A-Z_a-z]+__", result.text), "Untranslated template marker"
    assert "Vue" not in result.text
    assert "1 分钟" not in result.text
    assert "1-minute" not in result.text
    if language == "en":
        assert "Heating · Stage 2" in result.equipment("Heat pump")
        assert "Heating · Stage 1" in result.equipment("Furnace / blower")
        assert not re.search(r"[\u4e00-\u9fff]", result.text)
    else:
        assert "制暖 · 2 级" in result.equipment("热泵")
    if not with_power:
        assert "sensor." not in markdown["content"]
        assert "number." not in markdown["content"]
        assert "1420.5" not in result.text and "0.17" not in result.text


@pytest.mark.asyncio
async def test_custom_comfort_and_monitor_note_are_preserved_and_escaped(ha, dashboard):
    ha.set_state(CLIMATE, "heat", preset_mode="Wake Up <Ready>")
    note = "Other meter <30 seconds>"
    result = dashboard(with_power=True, power_note=note)
    assert "Wake Up <Ready>" in result.text and note in result.text
    assert "Wake Up &lt;Ready&gt;" in result.source
    assert "Other meter &lt;30 seconds&gt;" in result.source
    assert "Wake Up <Ready>" not in result.source


@pytest.mark.asyncio
@pytest.mark.parametrize(("preset", "label"), [("sleep", "睡眠"), ("Home", "在家"), ("away", "离家")])
async def test_builtin_comfort_names_are_translated(ha, dashboard, preset, label):
    ha.set_state(CLIMATE, "heat", preset_mode=preset)
    assert label in dashboard().cells[1]


@pytest.mark.asyncio
async def test_auto_mode_uses_both_temperature_targets_and_configured_unit(ha, dashboard):
    ha.set_state(CLIMATE, "heat_cool", temperature=99,
                 current_temperature=71, target_temp_low=68, target_temp_high=75)
    result = dashboard(temperature_unit="°F")
    assert re.search(r"68(?:\.0)? °F – 75(?:\.0)? °F", result.cells[1])
    assert "99" not in result.text
    assert re.search(r"71(?:\.0)? °F", result.cells[0])
    ha.set_state(CLIMATE, "heat_cool", target_temp_low=None)
    assert re.search(r"— – 75(?:\.0)? °F", dashboard(temperature_unit="°F").cells[1])


@pytest.mark.asyncio
async def test_disabled_or_unknown_schedule_does_not_claim_source_was_reset(ha, dashboard):
    ha.set_state(AUTOMATION, "off")
    assert "自动调度已停用，保留最后的热源设置。" in dashboard().text
    ha.set_state(AUTOMATION, "unavailable")
    assert "自动调度状态未知" in dashboard().text


@pytest.mark.asyncio
@pytest.mark.parametrize(("fan_report", "raw", "expected"), [
    ("on", "fan", "运行中"),
    ("off", "", "未运行"),
    (None, "fan", "运行中"),
    (None, "ventilator", "未运行"),
    (None, None, "状态未知"),
])
async def test_blower_uses_fan_report_independently_of_aux_heat(ha, dashboard, fan_report, raw, expected):
    ha.set_state(CLIMATE, "heat", fan=fan_report, equipment_running=raw, fan_mode="on")
    result = dashboard()
    assert f"送风机: {expected}" in result.equipment("炉子")
    if raw is not None:
        assert "制暖: 未运行" in result.equipment("炉子")


@pytest.mark.asyncio
async def test_aux_stage_and_blower_are_independent(ha, dashboard):
    ha.set_state(CLIMATE, "heat", fan="on", equipment_running="auxHeat2,fan")
    result = dashboard(language="en", with_power=True)
    assert "Heating · Stage 2" in result.equipment("Furnace")
    assert "Blower: Running" in result.equipment("Furnace")
    ha.set_state(CLIMATE, "heat", fan="off", equipment_running="heatPump2")
    result = dashboard()
    assert "制暖 · 2 级" in result.equipment("热泵")
    assert "制暖: 未运行" in result.equipment("炉子")
    assert "送风机: 未运行" in result.equipment("炉子")
    ha.set_state(CLIMATE, "unavailable", fan="on", equipment_running="auxHeat2,fan")
    assert "送风机: 状态未知" in dashboard().equipment("炉子")


@pytest.mark.asyncio
async def test_aux_heat_without_fan_report_is_furnace_controlled(ha, dashboard):
    # Many furnaces run their own blower during aux heat; ecobee then reports no Fan.
    ha.set_state(CLIMATE, "heat", fan="off", equipment_running="auxHeat1,ventilator")
    assert "送风机: 由炉子控制" in dashboard().equipment("炉子")
    assert "Blower: Controlled by furnace" in dashboard(language="en").equipment("Furnace")
    ha.set_state(CLIMATE, "heat", fan="on", equipment_running="auxHeat1,fan")
    assert "送风机: 运行中" in dashboard().equipment("炉子")
