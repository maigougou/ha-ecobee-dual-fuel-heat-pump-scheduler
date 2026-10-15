# Managed Auto (optional integration)

Implemented with card 0.9.9, Blueprint 0.2.0 and `custom_components/ecobee_managed_auto` 0.4.0 (public test version). The native integration adapter has been inspected against **Home Assistant 2026.10.1**. This optional controller is separate from the standalone Heat-only Blueprint, which continues to support HA 2024.12+.

## What it does

| Requested operation | Physical ecobee mode | Heating | Cooling |
|---|---|---|---|
| Ordinary Heat | Heat / Auxiliary heat only | Existing Blueprint schedule | Not requested |
| Ordinary Cool | Cool | Not requested | Native ecobee control |
| Off | Off | No controller commands | No controller commands |
| Managed Auto, heat-pump window | Auto | Heat pump, with ecobee auxiliary backup/protections | Native ecobee control |
| Managed Auto, outside window, heating side | Auxiliary heat only | Furnace | HA monitors the cooling target and selects Cool when needed |
| Managed Auto, outside window, cooling side | Cool | HA monitors the heating target and selects Auxiliary heat only when needed | Heat pump |

This is **HA-managed changeover**, not an independent heat-source option inside ecobee's native Auto. The thermostat/app may display Cool or Auxiliary heat only during managed operation. The custom card distinguishes the requested Managed Auto operation from the physical device mode.

No electricity tariff is fetched. The user defines the preferred heat-pump window in the existing Blueprint. No power monitor is required. No room temperature, hold, Comfort, participating-sensor, fan or staging setting is written.

## Limits to understand before enabling

- Requires running HA and the existing native ecobee cloud integration. ecobee runtime temperature normally arrives in batches up to 15 minutes apart, plus HA polling/command latency. Source/time and heat/cool changes are **not immediate**; room temperature can pass a target before HA changes mode. This is not equivalent to a local thermostat's Auto response.
- If HA, the Internet or ecobee cloud is unavailable, the thermostat retains its last physical mode. In Aux-only it cannot cool; in Cool it cannot heat. Native protections still apply to the selected mode, but do not provide missing automatic changeover. Do not use Managed Auto where unattended cooling/heating changeover must remain available offline.
- An HA **restart** (the `homeassistant.restart` service, or on HA OS / Supervised a running Supervisor Core restart/update/rebuild job, which covers the UI button and `ha core restart`) keeps the current managed mode: no command is sent while HA stops or starts, and control resumes in place once valid readings return (if they stay missing for 10 minutes after start, native Auto is restored as usual). Disable, reload, options changes, an HA **shutdown**, a Core stop, a host reboot and any stop the Supervisor cannot confirm as a restart restore native Auto first; after a reload the controller re-arms itself once native Auto is confirmed. Both behaviours follow the option *Resume after a clean restart* (on by default); with it off, restart also restores Auto and waits for manual re-arming. Abrupt power loss cannot execute recovery: on the next start an owned transaction is reconciled, native Auto is restored where ownership is still credible, the controller **stays off** and a notification asks you to re-enable it. Mode changes made while HA is down take priority when distinguishable.
- A manual HVAC-mode or Aux-switch change disarms control. HA service calls are recognized immediately whether they target the entity, its device, its area or `all`; thermostat/app changes are detected at cloud readback. Re-selecting the identical physical mode in the ecobee app may be indistinguishable from no change. Use the Managed Auto switch to stop explicitly.
- No new compressor cutoff is applied in Managed Auto. The thermostat's existing equipment protection remains in force. The Blueprint's optional cutoff management applies to ordinary Heat scheduling only. Do not raise a compressor-wide limit to force gas in Auto: it could affect cooling.
- This release is validated in isolated HA tests and installed without forcing a live heating/cooling cycle. A supervised real-equipment changeover remains necessary before relying on it unattended.

## Install and bind (no household-specific IDs)

For HACS, follow the [README](../README.md#install-and-configure): the package installs the Blueprint and card together. Choose **Add Managed Auto controller** for the optional controller. The manual procedure below remains available.

1. Copy `custom_components/ecobee_managed_auto/` into HA's `/config/custom_components/`. Restart HA.
2. Update the installed English or Chinese Blueprint to 0.2.0 and reload automations. Existing Heat-only configurations need no new input.
3. Add **ecobee Dual-Fuel Heat Pump Scheduler** under Settings → Devices & services → Add integration, then choose **Add Managed Auto controller**. Select your native ecobee climate, its Auxiliary heat only switch, and the existing source-schedule Blueprint automation. Confirm the cloud/offline limitation in the form.
4. In that Blueprint automation's GUI, select the newly created **Managed Auto** switch under **Managed Auto controller (optional)**. Save. This guard is mandatory: without it the controller will not acquire the thermostat. Selectors and validation prevent choosing unrelated devices.
5. Keep the source automation enabled and observation mode off. The controller reads that automation's actual inputs, including days and times. It does not maintain a second schedule. Turning the schedule off or entering observation mode **pauses** Managed Auto: native Auto is restored, the switch stays on and the status shows `schedule_paused`. Control resumes when the schedule is enabled again. Other schedule errors still stop the controller.
6. Update the card JavaScript (`dist/ecobee-dual-fuel-card.js`) and resource URL to 0.9.9. In its editor select the same **Managed Auto controller (optional)** switch. Existing thermostat/power/report selections stay unchanged.
7. With the Managed Auto switch on, select **Heat/Cool** on ecobee. Ordinary Heat/Cool/Off are otherwise untouched. In ordinary Heat the original Blueprint still runs.

The card shows the side HA selected (heat pump, furnace only or heat-pump cooling), an `ecobee: <mode>` chip with the physical device mode, a deadband strip (heat target ↔ current ↔ cool target), the 24-hour window strip and the next switch with a countdown. The bottom row combines the source-schedule toggle and a one-tap Managed Auto toggle; while not in control its status appears under the toggle. Its Details section links to integration options. The source schedule button continues to edit the Blueprint. Card labels follow the viewer's HA language; Blueprint language is the installed file's language.

## Settings and decision rules

The integration options form exposes:

- Minimum mode interval: 10 minutes, configurable 5–30. Counted from confirmed mode readback; ecobee's own compressor protection also remains active.
- Maximum runtime age: 20 minutes, configurable 15–30. `runtime.connected` must be true and `lastStatusModified` must be within this limit. Stale/missing/invalid readings stop new economic scheduling; an owned mode is recovered only when valid data returns.
- Readback timeout: 8 minutes, configurable 5–15. One command at a time, no immediate retry of an ambiguous result. Failure disarms economic scheduling (`command_failed`) and attempts native Auto recovery, bounded to two attempts per recovery session.
- Resume after a clean restart: on. Turn off to require manual re-arming after every restart or reload.
- Notifications: on. Creates one HA persistent notification (replaced, never stacked) for restore failure, manual override, configuration error, unconfirmed command, an unexpected shutdown, or runtime data missing for more than 30 minutes. It is dismissed automatically when the controller is healthy again.

The native integration cache provides `desiredHeat`, `desiredCool`, and `actualTemperature` from the currently active program/event. API values are tenths Fahrenheit; the controller converts them to Celsius without rounding before comparison. It does not reconstruct the weekly program or average room sensors itself.

Outside the preferred window:

1. At or below the current heat target: select Aux-only.
2. At or above the current cool target: select Cool.
3. Between targets: retain the current Aux-only/Cool side. On first entry from native Auto, choose the nearest target; an exact midpoint chooses Cool.
4. Respect the mode interval before issuing a different mode. Setpoint gaps below 0.5°C and invalid data fail closed.

Selecting a mode does not force a heating/cooling cycle; ecobee's temperature differential and equipment controls still decide when to start. Native staging, including auxiliary backup in the preferred window, remains responsible for actual equipment operation. Daylight-saving transitions use HA local time and the Blueprint's start-day convention.

## Status, logbook and diagnostics

- **Status sensor** (diagnostic, enum): one of `waiting_for_auto`, `heat_pump_window`, `furnace_selected`, `cooling_selected`, `minimum_mode_wait`, `syncing` (HA entities catching up with ecobee), `awaiting_device` (a command awaits readback), `restoring_auto`, `restore_failed`, `waiting_for_connection`, `waiting_for_schedule`, `schedule_paused`, `manual_override`, `command_failed`, `configuration_error`, `disabled`, translated in English and Chinese. Use it for automations or history.
- **Logbook**: taking control, manual override, restored Auto and restart hold/resume are recorded. Every mode command records its reason, for example `20.6 °C ≤ heat target 21.0 °C: furnace (Auxiliary heat only)`, in the HA language and temperature unit.
- **Diagnostics**: *Download diagnostics* on the integration includes options and controller state (ownership, pending command, recovery set, attempts). It contains no credentials.
- The switch's frequently changing `runtime_updated` and `current_c` attributes are excluded from the recorder.

## Implementation boundaries

- `policy.py`: pure runtime validation, local-time window selection, deadband mode selection.
- `adapter.py`: only compatibility coupling to the native ecobee cache and automation `_blueprint_inputs`; writes always use public HA services. Unsupported internals prevent control. Recheck this adapter when upgrading HA.
- `controller.py`: ownership, journal-before-write, cloud acknowledgement, manual overrides, stale-data handling and recovery. `.storage/ecobee_managed_auto.<entry-id>` contains only controller state, no credentials.
- `config_flow.py` / `switch.py` / `sensor.py` / `diagnostics.py`: native setup/options GUI with a specific error per failed check, selectable controller entity, status sensor and diagnostics.
- Blueprint `managed_auto_entity`: blocks all writes while ownership/recovery is active, including when the switch is off but recovery has not finished. Missing/mismatched selected controllers fail closed.
- Card: presentation only. Closing all browsers does not stop the backend.

The report still uses actual ecobee equipment history. Cooling and furnace heating can both occur during an outside-window period. No electricity column appears without selected power sensors; heat-pump-only scope remains outdoor-circuit only.

## Validation and rollback

Run `python scripts/build_blueprint.py --check`, `python -m pytest -q`, `npm ci`, `npm run check` (includes the `dist/` freshness check), and `npm test`. Tests simulate mode changes, threshold crossing, Comfort changes, midnight/day boundaries, freshness, manual Off, ambiguous writes, timeout, restoration, restart/resume, notifications, device/area targets and Blueprint exclusion. `tests/fixtures/schedule_windows.json` holds shared schedule cases (overnight, weekdays, seconds, DST) that the Blueprint template, the integration and the card must all agree on. CI also runs the suite weekly against the newest HA pre-release as a non-blocking early warning for the `adapter.py` internals. No test calls a real thermostat.

To remove: turn off Managed Auto and wait until its status shows disabled and native ecobee shows Auto. If recovery failed, manually choose the intended native mode first. Remove the controller binding from the Blueprint and card, then remove the integration and files. Never remove a recovery guard while an ambiguous transaction is still outstanding.

Sources: [ecobee Runtime API](https://developer.ecobee.com/home/developer/api/documentation/v1/objects/Runtime.shtml), [ecobee Settings API](https://developer.ecobee.com/home/developer/api/documentation/v1/objects/Settings.shtml), [HA ecobee integration](https://www.home-assistant.io/integrations/ecobee/).
