# Native HVAC card

[中文说明](native_dashboard.zh-CN.md)

A compact native Lovelace card for temperature, source policy, reported equipment stages, an automation toggle, and a configuration shortcut. **Energy monitoring is optional.** No HACS frontend, custom integration, or helper is required; the card does not change the Blueprint's control logic.

## Choose a version

| Version | File | Use when |
| --- | --- | --- |
| Chinese, basic | [dashboard_card.yaml](../examples/dashboard_card.yaml) | Status and controls without power |
| Chinese, with power | [dashboard_card_power.yaml](../examples/dashboard_card_power.yaml) | Power monitoring for either or both circuits |
| English, basic | [dashboard_card_en.yaml](../examples/dashboard_card_en.yaml) | No power monitoring, or status and controls only |
| English, with power | [dashboard_card_power_en.yaml](../examples/dashboard_card_power_en.yaml) | Power monitoring for either or both pieces of equipment |

All four versions are generated from one source by `scripts/build_dashboard.py`. The basic card has no power placeholders. The power version accepts Vue or any other monitor that exposes suitable Home Assistant power sensors.

## Language selection

Card and Blueprint text uses the language of the installed YAML; it does not auto-detect the Home Assistant profile language. Use the English files for an English HA interface, or the Chinese files for a Chinese interface. HA's own controls follow the user's profile language. Automation names and descriptions are separate instance fields; changing the Blueprint does not translate them automatically.

## Install and configure

1. Add a **Manual** card to an editable dashboard and paste your chosen YAML.
2. Replace `climate.example_ecobee`, `switch.example_ecobee_auxiliary_heat_only`, and `automation.example_ecobee_dual_fuel` with the ecobee climate, its Auxiliary heat only switch, and the automation created from this Blueprint. Update both the template's assignments and Markdown's `entity_id` list. Also replace `entity` in the automation toggle row of the native `entities` card at the bottom; the configuration button occupies the following row.
3. Set `temperature_unit` to match the climate entity's displayed unit: `°C` or `°F`. This changes the label only, not the numeric value.
4. The configuration button opens `/config/automation`. Optionally replace its `navigation_path` with the automation editor's actual relative URL, such as `/config/automation/edit/YOUR_AUTOMATION_ID`. The configuration ID is not necessarily the entity ID.
5. Save and compare the displayed values with the actual entities. A layout check does not require starting heating equipment.

The compressor cutoff number entity is optional. To show it in the collapsed details, set `cutoff_entity` and add that entity to Markdown's `entity_id` list. It remains read-only.

For an automatically generated Home/Overview page, create a separate dashboard and add a shortcut where supported. Do not replace the existing dashboard configuration just to install this card.

### Optional power monitoring

In the power version, set `heat_pump_power_entity` and `furnace_power_entity` to the heat-pump and furnace circuit power sensors. Update their `entity_id` entries too. Either source can be omitted independently: set its template assignment to `''` and remove its unused example entity from `entity_id`. Equipment status and stages remain visible without a power reading. For no monitoring, use the basic version.

Sensors from any brand may be used if they provide numeric **W or kW** values. Cumulative energy in kWh is not power; unsupported units display an error. An unconfigured source hides its power display, while a configured but unavailable source shows unavailable data. Neither becomes a false zero.

Leave `power_note` empty or provide an accurate sampling label, such as `1-minute average` for the relevant Vue sensor. Outdoor-unit and furnace readings appear once each. Furnace electricity does not measure gas use or delivered heat. The compact card omits history charts; add separate native chart cards if needed.

## Reading the card

- **Source policy** comes from the thermostat mode and auxiliary switch; heat-pump permission is distinct from actual operation. Cool and Heat/Cool remain outside the Blueprint's heating control.
- **Reported stages** parse `heatPump/heatPump2/heatPump3` for heating, `compCool1/compCool2` for cooling, and `auxHeat1/auxHeat2/auxHeat3` for auxiliary heating; the highest stage of each kind is shown.
- **Aux heat and blower** are separate: blower status uses the climate entity’s `fan` operating attribute, falling back to the `fan` equipment code. It does not infer operation from `fan_mode`, ventilation, auxiliary stages, or electricity consumption. While auxiliary heat runs without a Fan report, the blower is shown as controlled by the furnace rather than not running.
- **Idle versus unknown:** an empty report means standby, while missing or unavailable data means unknown. Unrecognized codes remain in the details. Fan or ventilation operation can coexist with no reported heating or cooling.
- **Control temperature** may combine participating room sensors; it is not necessarily one floor's temperature. ecobee retains temperature scheduling and sensor selection.
- **Scheduler enabled** does not prove observation mode is off or an action succeeded; check configuration, traces, and HA notifications. Disabling preserves the last mode and cutoff rather than restoring earlier settings.

**Cloud reports may be delayed.** Stages are thermostat reports, not independent confirmation of combustion or compressor speed. Power never determines stages.

Custom Comfort names are preserved. Home Assistant's own controls follow the user's profile language.

## Development and verification

The distributables use native Markdown and Entities cards in a vertical stack. The automation toggle and configuration button occupy separate rows so their labels remain readable on phones. Check the result in your browser, particularly on a narrow viewport; no extra frontend dependency is required.

Edit `scripts/build_dashboard.py` and the shared templates in `src/dashboard/`, then regenerate all four examples and check for drift:

```sh
python scripts/build_dashboard.py
python scripts/build_dashboard.py --check
pytest -q tests/test_dashboard.py
```

The dashboard tests render the shipped templates with Home Assistant's Jinja environment. State, stage, availability, and unit checks use simulated data; they are not physical equipment tests or a substitute for browser verification.

Primary references: [HA Markdown card](https://www.home-assistant.io/dashboards/markdown/), [Entities card](https://www.home-assistant.io/dashboards/entities/), [ecobee equipment status](https://www.ecobee.com/home/developer/api/documentation/v1/objects/Thermostat.shtml), [HA ecobee climate mapping](https://github.com/home-assistant/core/blob/dev/homeassistant/components/ecobee/climate.py).
