"""Generate native Lovelace cards; no Python or custom frontend is needed on HA."""
from __future__ import annotations

import argparse
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]

TEXT = {
    "zh": {
        "indoor": "当前室温", "target": "目标", "unknown": "状态未知", "no_data": "暂无数据",
        "sleep": "睡眠", "home": "在家", "away": "离家", "idle": "待机", "fan": "送风／通风",
        "other": "其他设备运行", "check": "状态待确认", "off": "已关闭", "heat": "热泵 · 炉子备用",
        "aux_only": "仅炉子供暖", "heat_unknown": "制暖 · 热源状态未知", "cool": "制冷模式",
        "auto": "自动冷暖 · 定时切换暂停", "not_running": "未运行", "stage": "__N__ 级",
        "heating": "制暖", "cooling": "制冷", "aux_heating": "制暖", "aux_status": "制暖", "blower": "送风机", "running": "运行中", "furnace_controlled": "由炉子控制", "outdoor": "热泵", "furnace": "炉子／送风机",
        "power_unknown": "功率不可用", "power_unit_error": "请使用 W／kW 功率实体",
        "details": "更多信息", "reported": "ecobee 状态", "schedule_on": "自动调度已启用",
        "schedule_off": "自动调度已停用，保留最后的热源设置。", "schedule_unknown": "自动调度状态未知",
        "cutoff": "压缩机最低室外温度", "power_explain": "功率是电路耗电，不代表供热量或燃气消耗。热泵的制暖和制冷共用同一读数。",
        "state_explain": "运行状态和级数来自 ecobee，云端更新可能延迟；不由功率推算。送风机读取 Fan 运行状态，不使用风扇模式设置；新风机状态另行报告。待机、送风时仍可能耗电。",
        "temp_explain": "室温为 ecobee 当前用于控温的温度，可能由多个房间传感器组合。",
        "schedule_explain": "开关只表示自动化是否启用；观察模式、时段和执行结果请查看配置及运行记录。",
        "toggle": "自动调度", "settings": "时段与设置",
    },
    "en": {
        "indoor": "Indoor temperature", "target": "Target", "unknown": "Unknown", "no_data": "No data",
        "sleep": "Sleep", "home": "Home", "away": "Away", "idle": "Idle", "fan": "Fan / ventilation",
        "other": "Other equipment active", "check": "Check equipment status", "off": "Off", "heat": "Heat pump · Furnace backup",
        "aux_only": "Furnace only", "heat_unknown": "Heating · Source unknown", "cool": "Cooling mode",
        "auto": "Heat / Cool · Source schedule paused", "not_running": "Not running", "stage": "Stage __N__",
        "heating": "Heating", "cooling": "Cooling", "aux_heating": "Heating", "aux_status": "Heating", "blower": "Blower", "running": "Running", "furnace_controlled": "Controlled by furnace", "outdoor": "Heat pump", "furnace": "Furnace / blower",
        "power_unknown": "Power unavailable", "power_unit_error": "Use a W / kW power sensor",
        "details": "Details", "reported": "ecobee status", "schedule_on": "Source schedule enabled",
        "schedule_off": "Source schedule disabled; last source settings remain.", "schedule_unknown": "Schedule state unknown",
        "cutoff": "Minimum compressor outdoor temperature", "power_explain": "Power is electrical input, not heat output or gas use. Heat-pump heating and cooling share one reading.",
        "state_explain": "Equipment status and stages come from ecobee and may be delayed. They are never inferred from power. Blower status uses the Fan operating report, not fan mode; ventilation is reported separately. Idle equipment and fans can still use electricity.",
        "temp_explain": "Indoor temperature is the temperature ecobee uses for control; it may combine several room sensors.",
        "schedule_explain": "The toggle only indicates whether the automation is enabled. Check configuration and traces for observation mode, times and results.",
        "toggle": "Schedule", "settings": "Schedule settings",
    },
}


class Dumper(yaml.SafeDumper):
    pass


Dumper.add_representer(str, lambda d, v: d.represent_scalar(
    "tag:yaml.org,2002:str", v, style="|" if "\n" in v else None))


def content(language: str, with_power: bool) -> str:
    text = (ROOT / "src/dashboard/card.jinja").read_text()
    power_settings = """{%- set heat_pump_power_entity = 'sensor.example_heat_pump_power' -%}
{%- set furnace_power_entity = 'sensor.example_furnace_power' -%}
{%- set power_note = '' -%}"""
    power_macro = (ROOT / "src/dashboard/power.jinja").read_text()
    replacements = {
        "__POWER_SETTINGS__": power_settings if with_power else "",
        "__POWER_MACRO__": power_macro if with_power else "",
        "__OUTDOOR_POWER__": "{{ power(heat_pump_power_entity) }}" if with_power else "",
        "__FURNACE_POWER__": "{{ power(furnace_power_entity) }}" if with_power else "",
        "__POWER_NOTE__": "{% if power_note and (heat_pump_power_entity or furnace_power_entity) %}<p><small>{{ power_note | e }}</small></p>{% endif %}" if with_power else "",
        "__POWER_DETAILS__": "<p><small>__power_explain__</small></p>" if with_power else "",
    }
    for key, value in replacements.items():
        text = text.replace(key, value)
    for key, value in TEXT[language].items():
        text = text.replace(f"__{key}__", value)
    text = text.replace("__N__", "' ~ result.stage ~ '")
    return text.strip() + "\n"


def build(language: str = "zh", with_power: bool = False) -> dict:
    labels = TEXT[language]
    entities = ["climate.example_ecobee", "switch.example_ecobee_auxiliary_heat_only", "automation.example_ecobee_dual_fuel"]
    if with_power:
        entities += ["sensor.example_heat_pump_power", "sensor.example_furnace_power"]
    return {
        "type": "vertical-stack",
        "cards": [
            {"type": "markdown", "entity_id": entities, "content": content(language, with_power)},
            {"type": "entities", "show_header_toggle": False, "entities": [
                {"entity": "automation.example_ecobee_dual_fuel", "name": labels["toggle"],
                 "icon": "mdi:calendar-clock", "tap_action": {"action": "more-info"}},
                {"type": "button", "name": labels["settings"], "icon": "mdi:tune-variant",
                 "action_name": "打开" if language == "zh" else "Open",
                 "tap_action": {"action": "navigate", "navigation_path": "/config/automation"}},
            ]},
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for language in ("zh", "en"):
        for with_power in (False, True):
            name = "dashboard_card" + ("_power" if with_power else "") + ("_en" if language == "en" else "") + ".yaml"
            path = ROOT / "examples" / name
            header = "# Generated by scripts/build_dashboard.py. Native cards only; no custom frontend.\n"
            header += "# Replace example entities in both entity_id and content, plus the automation control row.\n"
            if with_power:
                header += "# Optional power: use W/kW entities from any brand; set an unused entity to ''.\n"
            data = header + yaml.dump(build(language, with_power), Dumper=Dumper, sort_keys=False, allow_unicode=True, width=120)
            if args.check:
                if not path.exists() or path.read_text() != data:
                    raise SystemExit(f"Out of date: {path.name}; run scripts/build_dashboard.py")
            else:
                path.write_text(data)
                print(path)
    if args.check:
        print("All four native dashboard examples are current.")


if __name__ == "__main__":
    main()
