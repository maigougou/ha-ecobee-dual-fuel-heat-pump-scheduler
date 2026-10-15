# Contributing

Keep this project focused on **heating-source scheduling through the native ecobee integration**. Temperature schedules, morning preheating, room selection, tariff retrieval, gas costs, COP estimation, and energy-monitor integrations belong outside the core Blueprint.

For the current architecture, confirmed product decisions, report semantics, code map, and remaining release work, see the [development handoff 中文](docs/development-handoff.zh-CN.md). Keep its version snapshot in sync when those contracts change.

## Development workflow

The HACS distribution is a Python custom integration bundling the generated card and English/Chinese Blueprints. Users install one Blueprint language; Managed Auto controllers are optional. The Blueprint and card also work as standalone installations. When changing generated content, update its generator, regenerate release files and run the validation workflow.

The generator is `scripts/build_blueprint.py`, with shared policy templates in `src/policy.jinja`. For the current CI target, create an isolated development environment with Python 3.14.2 or later:

```sh
python3.14 -m venv .venv
.venv/bin/python -m pip install \
  -c https://raw.githubusercontent.com/home-assistant/core/2026.10.1/homeassistant/package_constraints.txt \
  homeassistant==2026.10.1
.venv/bin/python -m pip install -r requirements-dev.txt
```

Activate that environment (`source .venv/bin/activate` on macOS/Linux), then run:

```sh
python scripts/build_blueprint.py
python scripts/build_blueprint.py --check
python scripts/build_dashboard.py
python scripts/build_dashboard.py --check
pytest
```

The supported minimum is Home Assistant 2024.12.0. Use the Python version supported by each Home Assistant test target. The `--check` command only verifies that the committed generated YAML matches its source; the pytest suite performs Blueprint/schema and behavior checks.

Chinese translations live in `src/translations/zh-CN.yaml`. The builder translates only presentation fields from the single English build; do not copy the control flow into a second implementation. A missing or obsolete translation fails generation. `tests/test_localization.py` checks identical input contracts and control expressions, validates the Chinese artifact with HA's schema, and renders its observation notifications in HA's script engine. Input keys, selector values, defaults, IDs, entity references, and decision templates must never change with language. Translate notification text without changing its control policy.

The native YAML fallback dashboard's source is `scripts/build_dashboard.py`. Regenerate all four `examples/dashboard_card*.yaml` files together: Chinese and English, each with a basic and an optional-power variant. Do not maintain independent stage logic in these artifacts. Keep the basic version free of power-monitor dependencies, allow each power sensor to be omitted independently, and accept provider-neutral W/kW sensors. Missing data, an unconfigured source, and a measured zero must remain distinct. Keep thermostat-reported stages separate from electrical power; neither a stage nor fuel consumption can be inferred from wattage. The dashboard must not add its own source schedule or thermostat writes.

For dashboard changes, run `pytest -q tests/test_dashboard.py` and check both language variants in a browser, including a narrow phone-sized layout. Cover absent monitoring, one or both power sensors, unavailable states, supported power units, and unsupported energy units. State whether screenshots show live or simulated data, and never activate actual heating solely for a visual test. See [dashboard setup](docs/dashboard.md) for user configuration and display semantics.

Do not make live thermostat calls from automated tests. Use simulated states and service-call recordings. State-machine checks should execute the generated Blueprint's logic or templates, rather than only exercising an independently rewritten algorithm that can disagree with the shipped YAML.

Test at least:

- Window start and end, same-day and overnight windows, unselected start days, Sunday rollover, equal endpoints, and local daylight-saving transitions.
- Observation mode and manual Run actions behavior.
- Off, Cool, Heat/Cool, unknown/unavailable entities, and selections from different devices.
- No duplicate auxiliary-on call when auxiliary mode is already active.
- Explicit normal Heat exit and auxiliary-switch readback, rather than mistaking climate's `heat` state for proof that auxiliary-only mode has ended.
- Cutoff unit conversion, supported values, range checking, and failed/unconfirmed writes.
- Timeouts, service failures, loss of availability, a schedule boundary during a wait, and a manual Off command during a run.
- Restart and reload reconciliation from current state, without replaying an old schedule decision.
- Absence of temperature, preset, resume-program, schedule, sensor-participation, or fan writes.

Passing automated checks proves the tested behavior, not compatibility with untested thermostat firmware or installations. Report which Home Assistant version was used for schema validation, and distinguish simulated tests from supervised physical-device tests.

## Changes to the contract

Preserve these invariants:

1. Observation mode is the initial default.
2. Safety gates are inside `actions`, so Run actions cannot bypass them.
3. The standalone Blueprint only manages Heat. The explicitly configured optional Managed Auto controller may acquire native Heat/Cool and select Auto/Cool/Aux with durable ownership and the Blueprint exclusion guard. Neither component may turn an Off system on. See docs/managed-auto.md.
4. Normal Heat retains native auxiliary backup. Do not implement a blanket auxiliary lockout.
5. Every write is necessary, bounded, and followed by observable confirmation where required.
6. A delayed run rechecks current policy before writing.
7. Disabling the automation or losing Home Assistant does not pretend to restore a saved configuration.

Do not use the auxiliary switch's `turn_off` to restore a prior mode. That prior mode is held in the integration's memory; request `climate.set_hvac_mode: heat` explicitly when the schedule requires normal Heat.

Do not add hidden household defaults or hard-code a provider's tariff. Parameters must describe what they do without claiming that a particular value is optimal or equipment-safe for everyone.

## Documentation and privacy

Update both README languages when behavior or defaults change. Keep `docs/design.md` and the changelog aligned with the actual artifact. Cite primary Home Assistant or ecobee documentation for integration assumptions, and verify source changes when upgrading compatibility requirements.

Examples must use generic entity names. Do not commit account details, API tokens, addresses, thermostat serial numbers, household logs, bills, screenshots with identifying data, or exported credentials. A sanitized automation trace is preferable to a full Home Assistant backup.

## Publishing

Only add an import link or Blueprint `source_url` after the repository and release YAML URL actually exist. Verify that the URL is public and points to the distributable YAML. Do not label an untested version as production-verified; document validation and any known limitations in release notes.

Contributions are licensed under the repository's [MIT License](LICENSE).

## Frontend card

The recommended card and visual editor are the standalone `ecobee-dual-fuel-card.js` module. Run `npm run check` and `npm test` with Node 20+; `npm ci` installs the pinned build dependency. Power entity mappings stay in the card configuration, never Blueprint inputs. Keep selectors provider-neutral, allow independent omission, do not guess household entity IDs, and preserve unavailable versus unconfigured versus measured-zero data. Automatic language selection applies to this card; translated Blueprint and native fallback YAML retain their chosen language. Browser-check the editor and responsive layout without calling live HVAC services.

## HACS package

The integration includes the generated card and Blueprint under `bundle/`. Run `python scripts/build_bundle.py` after generating either asset, and `python scripts/build_bundle.py --check` before release. See [installation architecture](docs/installation.md). The package setup entry only installs assets; equipment control remains in the separately created Managed Auto entries.
