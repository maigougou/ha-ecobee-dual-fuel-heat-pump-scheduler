# Design

This document covers the ordinary Heat Blueprint. For automatic heating/cooling with the same source schedule, see [Managed Auto](managed-auto.md). The Blueprint yields control while that controller owns or is recovering the thermostat.

## Scope and control contract

The scheduler chooses between normal Heat and Auxiliary heat only according to a user-configured local-time window. It does not choose the comfortable room temperature or calculate the cheapest heating source.

Supported entities come from one device in the native Home Assistant ecobee integration:

- `climate`: current HVAC mode and an explicit normal-Heat command.
- `switch`: Auxiliary heat only state and its turn-on command.
- `number`, optionally: compressor minimum outdoor temperature.

The climate entity reports both normal Heat and Auxiliary heat only as `heat`. The auxiliary switch is therefore required to distinguish them. A climate-only adapter or a HomeKit-only connection does not meet this contract.

The control artifact is a single automation Blueprint. The optional standalone card is a separate frontend module with an editor, seasonal layouts and recorded-activity reports. The repository's generation and test code runs only during development. The Blueprint does not create helpers, a custom integration, additional entities, or a separate GUI panel; configuration uses Home Assistant's native Blueprint input form.

## Seasonal control boundary

Heat alone participates in source scheduling. Cool, Heat/Cool Auto, Off and unknown/unavailable modes never receive source or cutoff writes. Waits recheck the current mode before retries or dependent commands. Cloud commands already dispatched cannot be recalled; there is no atomic transaction guarantee. The card is read-only except for explicitly toggling the existing automation; report controls never operate equipment.

Native Auto displays two targets and manages both cooling and heating locally. Auxiliary-only is a mutually exclusive thermostat mode, so timed furnace-only control inside Auto is unsupported. The card changes layout with HVAC mode and attributes runtime/energy to actual activity in every analysis window. Independent report periods do not control hardware.

## Schedule semantics

The window is start-inclusive and end-exclusive. Selected weekdays identify the date on which the window starts.

For a same-day window, the current weekday must be selected and the current local clock time must fall inside the window. For an overnight window, the late-evening portion uses today's weekday and the early-morning portion uses yesterday's weekday. Equal endpoints are invalid. Outside the selected windows, the auxiliary-only policy applies.

Use Home Assistant local clock time and weekday, rather than adding a fixed duration to the start timestamp. A fall-back hour can occur twice without requiring another mode write; a spring-forward gap is recovered by periodic reconciliation. There is no promise of second-accurate execution through cloud APIs.

## Reconciliation

Startup, automation reload, schedule boundaries, and a five-minute periodic check cause the automation to consider current policy. It does not interpret a delayed trigger as permission to execute a stale command for a previous window.

The action sequence contains its own guards. This matters because Home Assistant's manual Run actions skips top-level automation conditions. The scheduler verifies configuration, device association, availability, and active Heat mode before equipment writes.

The logical decisions are:

| Observed state | Desired policy | Action |
| --- | --- | --- |
| Observation mode | Either | Record/trace the decision; no HVAC writes. |
| Off, Cool, Heat/Cool, or unusable entities | Either | Stop without changing equipment. |
| Normal Heat | Normal Heat | No mode write; optionally reconcile an explicitly managed cutoff. |
| Auxiliary-only Heat | Normal Heat | Confirm managed cutoff if enabled, then explicitly request Heat and observe auxiliary switch off. |
| Normal Heat | Auxiliary only | Turn on auxiliary switch and observe it on. |
| Auxiliary-only Heat | Auxiliary only | No duplicate auxiliary-on command. |

Commands are serialized. Before a retry or another dependent write, recompute the current policy and check that the thermostat is still in Heat and its required entities remain usable. If a window changes while waiting, abandon that old decision and let reconciliation consider the new one.

Cloud state is not an atomic device transaction. A user can act directly on the thermostat between a read and a write, or a cloud acknowledgement may arrive late. Rechecking and readback reduce avoidable conflicts, but cannot provide absolute ownership or eliminate all races.

## Why leaving auxiliary mode uses an explicit Heat command

The native auxiliary switch remembers the preceding HVAC mode in memory when `turn_on` is called. Repeated `turn_on` calls can replace that memory with auxiliary-only mode itself. After integration restart, the remembered value can return to the implementation's default.

The scheduler therefore does not use `switch.turn_off` as a restore operation. It requests `climate.set_hvac_mode` with `heat`. Success requires observing the auxiliary switch off as well as a Heat climate state; climate state alone cannot distinguish the two source policies.

This only changes HVAC mode. It does not use temperature holds, presets, `resume_program`, or program/sensor editing services.

## Optional compressor cutoff

By default, the existing compressor limit is left alone. Users may opt into managing a supported cutoff chosen using their equipment's requirements.

The UI choices use the native 5 °F steps and show equivalent Celsius labels. The number service accepts the selected entity's displayed unit, so the implementation converts the chosen native value for °C or °F as necessary and checks the entity's range. Do not confuse a selectable API value with an equipment operating recommendation.

When a managed cutoff is required before normal Heat, a write must be observed before the mode transition proceeds. If the threshold is already correct, do not write it again. If the threshold is unavailable, invalid, or remains unconfirmed, do not pretend that the dependent transition succeeded.

The setting persists in ecobee. The scheduler does not have a saved original value and does not restore one on disable, removal, or restart. A normal-Heat request remains subject to compressor protection and native auxiliary logic.

## Verification and retries

The native integration has a roughly 180-second cloud polling throttle. The default verification wait is 240 seconds per command attempt (configurable from 60 to 600 seconds), and the default maximum is two attempts per command per reconciliation run (configurable from one to three). A run that needs both a cutoff and a source change has two separately bounded command sequences.

A service call completing only confirms that Home Assistant finished the service action. The state readback determines whether the requested mode or threshold has become observable. An exhausted run ends; a later five-minute reconciliation can attempt again.

Attempts are bounded per command within a run, not for the lifetime of a fault. A pure Blueprint has no persistent fault counter, ownership record, or restart-proof backoff state. Avoid suggesting that the project guarantees a fixed maximum number of cloud requests across an outage.

The thermostat's reported state is not a physical combustion or compressor-power measurement. Aux-only mode is not evidence that the furnace burner is active. The project does not infer burner operation from blower electricity.

## Manual control and offline behavior

While the automation is active, it owns the scheduled selection between normal Heat and Auxiliary heat only. A manual choice between these two modes cannot be reliably distinguished from the scheduler's own choice after a restart. Disable the automation before manually taking over the source.

Off, Cool, and Heat/Cool are left alone. Existing temperature holds and ecobee temperature schedules are also left alone, but they do not suspend source scheduling.

Stopping the automation means no further managed writes. It is not a rollback. The thermostat keeps the last HVAC mode and managed cutoff. With Home Assistant offline, ecobee continues its own temperature control in that last mode, and may miss a tariff boundary. The next successful reconciliation derives a decision from current time and state.

## Native protections and known limits

- Native auxiliary backup remains available during normal Heat. The Blueprint is not an auxiliary lockout.
- Heat Differential, Compressor → Aux delta, staging runtimes, minimum on/off times, and auxiliary maximum outdoor temperature are outside this project's controls.
- The first release does not implement a warm-weather guard. The installer/user must confirm Aux Heat Max Outdoor Temperature and related settings for intended auxiliary-only operation. Do not claim that forcing auxiliary-only mode bypasses those restrictions.
- The scheduler does not change dual-fuel simultaneous-operation settings or equipment wiring.
- It cannot enforce billing boundaries while Home Assistant or the ecobee cloud is unavailable.
- It does not guarantee an economic optimum, a target temperature by a deadline, or heat-pump-only operation.
- It does not manage independent room zones or sensor participation, and cannot correct floor-to-floor temperature imbalance.

## Validation and sources

Behavioral tests should operate on the shipped artifact's decisions and actions, with simulated entities and service calls. Validate the generated YAML using Home Assistant's schema in addition to ordinary YAML parsing. Keep schema compatibility, simulated behavior, and supervised physical-device observations separate in release claims.

Implementation assumptions are based on primary sources:

- [Home Assistant Blueprint schema](https://www.home-assistant.io/docs/blueprint/schema/)
- [Native ecobee switch implementation](https://github.com/home-assistant/core/blob/dev/homeassistant/components/ecobee/switch.py)
- [Native ecobee climate implementation](https://github.com/home-assistant/core/blob/dev/homeassistant/components/ecobee/climate.py)
- [Native ecobee number implementation](https://github.com/home-assistant/core/blob/dev/homeassistant/components/ecobee/number.py)
- [Native ecobee update implementation](https://github.com/home-assistant/core/blob/dev/homeassistant/components/ecobee/__init__.py)
- [ecobee Settings API](https://www.ecobee.com/home/developer/api/documentation/v1/objects/Settings.shtml)

The linked source branch can change. Recheck the relevant behavior when changing supported Home Assistant versions.
