"""Build standalone English and Chinese HA Blueprints from one control flow."""
from __future__ import annotations

import argparse
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "blueprints/automation/ecobee_dual_fuel_scheduler.yaml"
CHINESE_OUTPUT = ROOT / "blueprints/automation/ecobee_dual_fuel_scheduler_zh.yaml"
# "Re-import blueprint" and the My Home Assistant import link fetch each file from here.
REPOSITORY = "https://github.com/maigougou/ha-ecobee-dual-fuel-heat-pump-scheduler"


def source_url(output: Path) -> str:
    return f"{REPOSITORY}/blob/main/blueprints/automation/{output.name}"
MACROS = (ROOT / "src/policy.jinja").read_text().strip()


class Input(str):
    """A Home Assistant !input tag."""


class Dumper(yaml.SafeDumper):
    pass


Dumper.add_representer(Input, lambda d, v: d.represent_scalar("!input", str(v)))
Dumper.add_representer(str, lambda d, v: d.represent_scalar(
    "tag:yaml.org,2002:str", v, style="|" if "\n" in v else None))


def template(expression: str) -> str:
    return MACROS + "\n{{ " + expression + " }}\n"


def condition(value: str) -> dict:
    return {"condition": "template", "value_template": value}


def notify(message: str) -> dict:
    return {
        "if": [condition("{{ notify }}")],
        "then": [{"action": "persistent_notification.create", "data": {
            "notification_id": "{{ notification_id }}",
            "title": "ecobee Dual-Fuel Heat Pump Scheduler",
            "message": message,
        }}],
    }


def stop_if(condition_template: str, message: str, *, notification: bool = False) -> dict:
    actions = [notify(message)] if notification else []
    actions.append({"stop": message})
    return {"if": [condition(condition_template)], "then": actions}


def still_current() -> dict:
    return stop_if(template("policy() != expected_policy"),
                   "Policy, HVAC mode or entity availability changed. The next run will reconcile.")


def cutoff_still_confirmed() -> dict:
    return stop_if(template("expected_policy == 'heat' and manage_cutoff and not (cutoff_matches() | bool)"),
                   "Compressor cutoff changed before heat-mode confirmation. Stopped; the next run will recheck the cutoff.", notification=True)


def wait_for(expression: str) -> dict:
    return {
        "wait_template": template(f"policy() != expected_policy or ({expression})"),
        "timeout": {"seconds": "{{ acknowledgement_timeout | int }}"},
        "continue_on_timeout": True,
    }


def selector(domain: str, **kwargs: object) -> dict:
    return {"entity": {"filter": [{"integration": "ecobee", "domain": domain, **kwargs}]}}


def build() -> dict:
    weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    inputs = {
        "equipment": {
            "name": "1 · Equipment",
            "description": "Use the native ecobee integration. Both entities must belong to the same thermostat.",
            "input": {
                "thermostat": {"name": "ecobee thermostat", "selector": selector("climate")},
                "aux_switch": {
                    "name": "Auxiliary heat only switch",
                    "description": "Select Auxiliary heat only, NOT a ventilator or other switch. Aux must be your intended backup heat source.",
                    "selector": selector("switch"),
                },
                "managed_auto_entity": {
                    "name": "Managed Auto controller (optional)", "default": "",
                    "description": "Select the switch from the optional ecobee Managed Auto integration. It uses this schedule in Heat/Cool and pauses this Blueprint while controlling the same thermostat. Leave empty for Heat-only scheduling.",
                    "selector": {"entity": {"filter": [{"domain": "switch", "integration": "ecobee_managed_auto"}]}},
                },
            },
        },
        "schedule": {
            "name": "2 · Heat pump preferred window",
            "description": "Within the window: normal Heat with native auxiliary backup. Outside: Auxiliary heat only. HA local time; weekdays name the start day.",
            "input": {
                "start_time": {"name": "Window begins", "default": "23:00:00", "selector": {"time": {}}},
                "end_time": {"name": "Window ends", "default": "07:00:00", "selector": {"time": {}}},
                "weekdays": {"name": "Window start days", "default": weekdays, "selector": {"select": {
                    "multiple": True, "options": [{"label": name, "value": key} for key, name in zip(
                        weekdays, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])]}}},
            },
        },
        "protection": {
            "name": "3 · Optional compressor outdoor cutoff",
            "description": "Normally leave this off and configure the thermostat's equipment protection directly. If enabled, verify your heat pump's approved operating limit first. This is a persistent setting, NOT restored when the automation stops.",
            "collapsed": True,
            "input": {
                "manage_cutoff": {"name": "Manage compressor minimum outdoor temperature", "default": False, "selector": {"boolean": {}}},
                "cutoff_entity": {
                    "name": "Compressor minimum temperature number (optional)", "default": "",
                    "description": "Required only when management is enabled. Choose the ecobee Compressor minimum temperature number on the same device.",
                    "selector": selector("number", device_class="temperature"),
                },
                "cutoff_f": {"name": "Compressor minimum outdoor temperature", "default": "15", "description": "Native ecobee increments are 5°F. Labels show °C too; conversion to your entity's unit is automatic. The default is a placeholder, not an equipment recommendation. Never choose below your equipment's approved limit.", "selector": {"select": {
                    "options": [{"label": f"{f}°F / {(f - 32) * 5 / 9:.1f}°C", "value": str(f)} for f in range(-25, 66, 5)]}}},
            },
        },
        "operation": {
            "name": "4 · Operation and verification",
            "input": {
                "observation_mode": {"name": "Observation mode (no equipment commands)", "default": True,
                    "description": "Start here. Run actions to see the proposed source in HA Notifications. Turn this off after checking the entities, schedule and thermostat protections.", "selector": {"boolean": {}}},
                "acknowledgement_timeout": {"name": "Readback timeout per command", "default": 240,
                    "description": "The cloud integration may take several minutes to refresh. A timeout does not prove a command failed; another attempt checks current state first.",
                    "selector": {"number": {"min": 60, "max": 600, "step": 30, "unit_of_measurement": "s", "mode": "box"}}},
                "max_attempts": {"name": "Maximum attempts per command per run", "default": 2,
                    "description": "After a failed run, the next periodic check may try again. This is not a lifetime retry limit.",
                    "selector": {"number": {"min": 1, "max": 3, "step": 1, "mode": "box"}}},
                "notify": {"name": "Show observation and failure notifications", "default": True, "selector": {"boolean": {}}},
            },
        },
    }
    names = [name for section in inputs.values() for name in section["input"]]
    cutoff_confirmed = "cutoff_matches() | bool"
    source_confirmed = "is_state(aux_switch, 'off' if expected_policy == 'heat' else 'on')"
    cutoff_sequence = [
        {"repeat": {"count": "{{ max_attempts | int }}", "sequence": [
            still_current(),
            {"if": [condition(template(f"not ({cutoff_confirmed})"))], "then": [
                {"action": "number.set_value", "continue_on_error": True,
                 "target": {"entity_id": "{{ cutoff_entity }}"}, "data": {"value": template("cutoff_value() | float")}},
                wait_for(cutoff_confirmed),
            ]},
        ]}},
        still_current(),
        stop_if(template(f"not ({cutoff_confirmed})"),
                "Compressor cutoff was not confirmed. No transition to heat-pump-permitted mode was attempted. Check the number entity and cloud connection; the next periodic run may retry.", notification=True),
    ]
    source_sequence = [
        {"repeat": {"count": "{{ max_attempts | int }}", "sequence": [
            still_current(),
            # A cutoff modified during an earlier wait must not authorize a new heat command.
            cutoff_still_confirmed(),
            {"if": [condition("{{ not is_state(aux_switch, 'off' if expected_policy == 'heat' else 'on') }}")], "then": [
                {"choose": [{"conditions": [condition("{{ expected_policy == 'heat' }}")], "sequence": [
                    {"action": "climate.set_hvac_mode", "continue_on_error": True,
                     "target": {"entity_id": "{{ thermostat }}"}, "data": {"hvac_mode": "heat"}},
                ]}], "default": [
                    {"action": "switch.turn_on", "continue_on_error": True, "target": {"entity_id": "{{ aux_switch }}"}},
                ]},
                wait_for(source_confirmed),
            ]},
        ]}},
        still_current(),
        cutoff_still_confirmed(),
        stop_if("{{ not is_state(aux_switch, 'off' if expected_policy == 'heat' else 'on') }}",
                "Heat source mode was not confirmed. Inspect the thermostat and HA trace. This checks the reported mode, not physical heat output. The next periodic run may retry.", notification=True),
    ]
    return {
        "blueprint": {
            "name": "ecobee Dual-Fuel Heat Pump Scheduler",
            "description": "Schedule normal Heat (heat pump permitted with ecobee auxiliary backup) versus Auxiliary heat only. Keeps ecobee temperatures, Comfort Settings and sensor participation intact. Requires native ecobee integration and a dual-fuel installation. Runs only in Heat; optional Managed Auto integration handles Heat/Cool using this same schedule. Off and native Cool are left alone. Starts in observation mode. Disabling this automation leaves the last device settings in place. Cloud control is not an exact-time or offline guarantee. Version 0.2.0.",
            "source_url": source_url(OUTPUT),
            "domain": "automation", "homeassistant": {"min_version": "2024.12.0"}, "input": inputs,
        },
        "mode": "single", "max_exceeded": "silent",
        "triggers": [
            {"trigger": "time", "at": Input("start_time")},
            {"trigger": "time", "at": Input("end_time")},
            {"trigger": "time_pattern", "minutes": "/5"},
            {"trigger": "homeassistant", "event": "start"},
            {"trigger": "event", "event_type": "automation_reloaded"},
        ],
        "variables": {**{name: Input(name) for name in names},
            "notification_id": "{{ 'ecobee_dual_fuel_' ~ (this.entity_id | default('manual', true) | replace('.', '_')) }}"},
        "actions": [
            {"variables": {"expected_policy": template("policy()")}},
            stop_if("{{ expected_policy.startswith('error:') }}",
                    "Configuration or availability check failed: {{ expected_policy }}. No equipment command was sent. Check that entities are available and belong to the same native ecobee device.", notification=True),
            {"if": [condition("{{ expected_policy.startswith('skip:') }}")], "then": [
                {"action": "persistent_notification.dismiss", "data": {"notification_id": "{{ notification_id }}"}},
                {"stop": "Thermostat is outside Heat scheduling or Managed Auto owns the mode. No equipment command was sent."},
            ]},
            {"if": [condition("{{ observation_mode }}")], "then": [
                notify("Observation only: desired mode is {{ 'normal Heat (heat pump permitted, native Aux backup)' if expected_policy == 'heat' else 'Auxiliary heat only' }}. Current Aux switch: {{ states(aux_switch) }}. Compressor cutoff management: {{ 'enabled' if manage_cutoff else 'disabled' }}. {% if manage_cutoff %}Selected cutoff: {{ cutoff_f }}°F / {{ ((cutoff_f | float - 32) * 5 / 9) | round(1) }}°C; currently {{ states(cutoff_entity) }} {{ state_attr(cutoff_entity, 'unit_of_measurement') }}. This cutoff is reconciled only during the heat-pump window. {% endif %}No equipment command was sent. Thermostat schedule and room temperatures are untouched."),
                {"stop": "Observation mode: no equipment commands."},
            ]},
            {"if": [condition("{{ expected_policy == 'heat' and manage_cutoff }}")], "then": cutoff_sequence},
            *source_sequence,
            {"action": "persistent_notification.dismiss", "data": {"notification_id": "{{ notification_id }}"}},
        ],
    }


def localize_chinese(source: dict) -> dict:
    """Translate presentation text only; input keys and control values stay intact."""
    translations = yaml.safe_load((ROOT / "src/translations/zh-CN.yaml").read_text())
    used = set()

    def translate(value, field=None):
        if isinstance(value, Input):
            return value
        if isinstance(value, dict):
            return {key: translate(item, key) for key, item in value.items()}
        if isinstance(value, list):
            return [translate(item, field) for item in value]
        if isinstance(value, str):
            if field in {"name", "description", "label", "title", "message", "stop"} and value in translations:
                used.add(value)
                return translations[value]
            if field in {"name", "description", "title", "message", "stop"}:
                raise ValueError(f"Missing Chinese translation: {value}")
        return value

    translated = translate(source)
    unused = set(translations) - used
    if unused:
        raise ValueError(f"Obsolete Chinese translations: {sorted(unused)}")
    return translated


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the committed Blueprint differs from its source")
    args = parser.parse_args()
    english = build()
    chinese = localize_chinese(english)
    chinese["blueprint"]["source_url"] = source_url(CHINESE_OUTPUT)
    for output, blueprint in ((OUTPUT, english), (CHINESE_OUTPUT, chinese)):
        contents = "# Generated by scripts/build_blueprint.py; edit the builder or src/ sources.\n"
        contents += yaml.dump(blueprint, Dumper=Dumper, sort_keys=False, allow_unicode=True, width=110)
        if args.check:
            if not output.exists() or output.read_text() != contents:
                raise SystemExit(f"{output.name} is out of date. Run python scripts/build_blueprint.py")
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(contents)
            print(output)
    if args.check:
        print("Generated English and Chinese Blueprints are current.")


if __name__ == "__main__":
    main()
