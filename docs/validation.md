# Validation history

## Pre-release review — 2026-10-13

After the release-review fixes, the complete Python suite passed **296 tests** on each supported test target (HA 2024.12.0 and 2026.10.1), both with exit code 0. Frontend: **164 passed**. Standalone installer: **17 passed** (also included in the full Python totals). Generated Blueprint, fallback dashboards, card and HACS bundle match their sources. Local Markdown file links resolve. A pattern scan of 79 Git-visible release files found no household identifiers, private local paths, private keys or token patterns; this is not a general secret-detection guarantee.

Added regressions cover the legacy native ecobee cache and wrong-entry rejection, controller callbacks after unload, installation-entry diagnostics before and after setup, script migration of a HACS card resource, and upgrades with both Blueprint languages installed. Restart descriptions now match 0.3.0 behavior. HACS and hassfest workflows are configured but have not run on GitHub.

The macOS Python 3.14.8 finalization crash was reproduced with a single HA registry-lifecycle test using a copy of the HA fixture outside the repository, **without importing any project integration modules**. It still exits 139 after passing its assertion. This narrows the issue to the test/runtime environment; the native root cause remains unproven. Full-suite success does not erase that focused-test failure. See the [release review](release-review.zh-CN.md) for uncompleted release acceptance checks.

## HACS packaging 0.4.0 (unreleased)

On 2026-10-13, the complete Python suite passed **290 tests** on both HA 2024.12.0 / Python 3.12 and HA 2026.10.1 / Python 3.14, with process exit code 0. The standalone installer passed 16 tests. Generated card and HACS bundle consistency checks passed.

Coverage includes installation without an HVAC controller, Blueprint backups and existing paths, duplicate resource detection, legacy card resource migration, YAML resource loading, both Lovelace data layouts, and registration through Home Assistant's real resource collection. Installer tests cover repeat runs, restoration, interrupted writes, authentication and WebSocket framing using local fixtures.

The repository has not been published. Actual HACS download/update, hosted CI, HACS validation, and default-list review have not been completed. The new package has not been deployed to a household server.

Running only `tests/test_installation.py` on local macOS Python 3.14.8 reports 12 passing assertions but exits with signal 11 during interpreter garbage collection. Excluding the real-resource-collection test also reproduces it. The same focused suite exits normally on Python 3.12, and both full suites exit normally. The native finalization crash remains unresolved; it must not be reported as a clean focused test run.

## Blueprint 0.1.0

Local validation completed on 2026-10-13:

| Home Assistant Core | Python | Result |
| --- | --- | --- |
| 2024.12.0 | 3.12.14 | 69 tests passed; process exit code 0 |
| 2026.10.1 | 3.14.8 | 69 tests passed; process exit code 0 |

The generated Blueprint consistency check also passed. The GitHub Actions workflow is configured to repeat these checks on Linux after publication; this document does not claim that a hosted CI run has already occurred.

Tests load the shipped YAML through Home Assistant's own Blueprint loader, substitute inputs, validate the expanded automation, render its templates, and execute its actions with Home Assistant's Script engine. Test devices, config entries, entities, and HVAC services are simulated locally. Tests do not connect to an ecobee account, a household Home Assistant server, or physical equipment.

Coverage includes window boundaries, start-day weekdays, same-day and overnight windows, daylight-saving clock changes, observation mode, ignored HVAC modes, invalid and unavailable entities, idempotent commands, both temperature units and all native cutoff choices, service failures, readback timeouts, bounded retries, manual Off during a wait, schedule changes during a wait, and a cutoff changed during the final mode readback.

These are schema and simulated behavior checks. Physical equipment operation, cloud reliability, thermostat firmware, billing savings, and unattended operation have not been validated on a real installation.

## Development environment note

An exploratory standalone registry-setup script crashed during Python 3.14.8 interpreter finalization on macOS. The later full pytest process completed normally with exit code 0; the standalone experiment was discontinued. The cause of that native shutdown crash has not been established or claimed fixed. Python development scripts are not part of the deployed Blueprint, which consists of one YAML file.

## Frontend card 0.2.0

On 2026-10-13, the full Python suite completed with **117 passed** on both HA 2024.12.0 / Python 3.12 and HA 2026.10.1 / Python 3.14. This includes Blueprint, localization, and native fallback dashboard checks. Generated artifact consistency checks passed. Node 22 syntax checks and **28 frontend tests** also passed. Hosted CI has not yet run.

The custom module was installed on one HA 2026.10.1 server and visually checked in its actual dashboard and visual card editor. Checked independent removal of either power source and both sources, entity-ID search, GUI save/readback, English automatic language, live blower updates, and a 390-pixel viewport without horizontal overflow. The settings button opened the existing Blueprint form. No HVAC service was invoked for visual testing. These checks do not prove physical heating/cooling/Aux staging, cloud reliability, or compatibility with every firmware and monitoring integration.

## Control logic display 0.3.0

The Node suite now contains **49 passing tests**, adding configuration reads/defaults, rejected unsupported or mismatched automations, weekday/midnight/DST boundaries in HA's time zone, next changes, same-device weather association, Celsius/Fahrenheit comparison, unavailable/stale data, mode agreement, observation/paused/disabled states, read-only configuration access, and permission failures. No tests call real thermostat services.

Browser verification of 0.3.0 on HA 2026.10.1 confirmed that the existing saved 23:00–07:00 schedule was loaded, the current source was shown once, the next 07:00 change was displayed, and the same thermostat's ecobee weather and compressor minimum appeared in Celsius. The 390-pixel viewport had no horizontal overflow. The automation configuration read before and after the frontend update was identical. No thermostat mode, temperature, threshold or fan command was sent during this update.

## Runtime report 0.4.0

Node syntax checks and 64 frontend tests pass. Added tests cover exact schedule splits, heating versus cooling/fan activity, stage deduplication, simultaneous heat sources, unavailable and restored states, missing attributes, long history gaps, clipping, duplicate/out-of-order records, midnight/weekdays/seconds, DST elapsed time, empty history, localization, read-only API flags, request throttling and stale asynchronous results after changing card configuration. No heating is activated for these checks.

Installed on HA 2026.10.1 and verified the live report loads recorded attribute history, displays separate heat-pump/auxiliary totals and incomplete coverage, and exposes report toggle/gap settings in the visual editor. A 390-pixel viewport had a 372-pixel card and 328-pixel report table with no horizontal overflow. Only the frontend file and dashboard resource URL changed; no equipment command was sent.

## Daily report 0.4.1

68 frontend tests pass, including seven-date range selection, daily source/window separation, missing dates, midnight attribution, partial-day clipping, 23/25-hour DST dates, today-at-midnight and reconciliation with aggregate totals.

Verified live HA shows exactly seven date rows and four runtime cells per date. A 390-pixel browser viewport showed no horizontal overflow (361-pixel card, 317-pixel report table). Missing dates display dashes and the current date is highlighted.

## Optional electricity 0.5.0

80 frontend tests pass. Energy tests cover W/kW normalization, integration methods, exact boundary clipping, midnight and DST, measured zero versus missing, invalid/negative/restored readings, no extrapolation across gaps, no-monitor and display-off behavior, partial display, isolated power history requests, failure isolation and sensor-change cache invalidation.

Verified the installed card on HA 2026.10.1: both report-window buttons preserve all seven date rows, the heat-pump view includes optional outdoor-unit electricity, and disabling electricity in the visual editor removes its column. The preview change was cancelled, preserving the household configuration. A 390-pixel viewport had no horizontal overflow. The updated layout separates temperature, source policy, equipment and daily history, with coverage details collapsed. Only the frontend module and resource URL were updated; no HVAC commands were sent.

## Schedule periods 0.5.1

83 frontend tests and Node syntax checks pass. Regression coverage replaces calendar-day expectations with continuous schedule periods, shared runtime/energy boundaries across midnight, seven occurrences per window, exact switch instants, in-progress totals, weekly schedules with long auxiliary periods, and DST skipped/repeated hours including second-level schedule boundaries.

Live HA 2026.10.1 verification confirmed the complete Oct 12 23:00–Oct 13 07:00 window appears as one row (8 hours of runtime coverage), with electricity assigned to the same occurrence. The auxiliary view shows Oct 13 07:00–23:00 as in progress. Seven rows fit a 390-pixel viewport without horizontal table overflow. No heating, fan, threshold or schedule commands were sent.

## Compact report headings 0.5.2

Node syntax checks and all 83 frontend tests pass. Live verification confirms both report tabs lead directly into the table, with per-occurrence date/time labels retained. The optional kWh column retains its outdoor-unit scope in the heading tooltip and details.

## Stage runtime 0.6.0

Node syntax checks and 87 frontend tests pass. Added stage tests cover independent heat-pump/furnace counts, highest-stage exclusivity, stage changes across midnight, clipping at schedule switches, third-stage preservation, and missing versus recorded-zero values.

Live HA verification showed the latest complete heat-pump period as Total 57m, Stage 1 42m and Stage 2 15m, with furnace totals and both stages at zero. Both report tabs show all three lines in each source cell. At a 390-pixel viewport, neither table nor source cells overflowed horizontally. The frontend update sent no equipment commands.

## Modern layout 0.7.0

On 2026-10-13: Node syntax checks and **90 frontend tests** pass. New tests cover the 24-hour strip for overnight, single-weekday, same-day and midnight-ending windows; the next-switch countdown across both DST transitions; and furnace-controlled blower status during auxiliary heat. The full Python suite passes **118 tests** on HA 2026.10.1 / Python 3.14.8, including the native fallback's new blower state. Generated artifact checks pass. HA 2024.12.0 was not re-run for this change. Hosted CI has not run.

The blower change follows recorded history from one installation. Over three days, every heat-pump record reported `fan`; no `auxHeat1` record did, while the furnace circuit drew 224–357 W against 10–59 W at idle. The card does not use that power reading. It only stops claiming the blower is off when ecobee leaves the blower to the furnace.

Installed on one HA 2026.10.1 server with the Frosted Glass theme and checked at a 375-pixel phone width and a desktop width. Checked: the 24-hour strip and countdown against the saved 23:00–07:00 schedule; both report tabs, with the selected tab clearly indicated; switching tabs without the page scrolling; the in-progress auxiliary period; the furnace tile; no horizontal overflow. Only the frontend module and its resource URL changed; no HVAC, schedule or threshold command was sent.

## Seasonal card 0.8.0

On 2026-10-13: **112 frontend tests** and **135 Python tests on HA 2026.10.1** pass. Syntax validation passes. Added mode-specific rendering, Auto dual targets, both-window cooling stages and electricity, optional scope, report visibility/selection, independent periods, contradictory reports, duplicate mappings, partial source failure and actual intersection of disjoint circuit coverage. HA Script tests cover Cool/Auto/Off/unknown/unavailable at both schedule boundaries with cutoff management and observation on/off, and user mode changes during cutoff acknowledgement.

The simulated browser fixture verifies Cool and Auto at desktop and 390-pixel widths, English/Chinese, light/dark themes and no power monitoring. It does not connect to HA. Blueprint control remains 0.1.0; no true thermostat mode change was used for visual checks. Hosted CI and older HA were not rerun for this release.

Deployment was verified on the existing HA dashboard: the 0.8.0 module loaded, Heating/Cooling history switched without changing thermostat mode, and the visual editor exposed report visibility, circuit scope and independent period controls. The custom-period form was tested as an unsaved preview and cancelled. Existing Heat scheduling remained configured.

The actual HA editor was reopened after initializing its empty form schema; the earlier undefined-schema render error did not recur. The dashboard was left out of edit mode, using the final installed module.


## Managed Auto validation — 2026-10-13

Blueprint 0.2.0, card 0.9.0, optional integration 0.1.0: 182 Python tests passed on HA 2024.12.0 and 2026.10.1; 117 frontend tests passed. The new tests include actual HA BlueprintInputs representation, wrong-device rejection, schedule guard binding and cancellation, dual targets during physical Aux, cloud freshness, manual Off during journal persistence, failed/uncertain commands and restart recovery. Generated Blueprint and fallback dashboard examples pass freshness checks. The native adapter is inspected against HA 2026.10.1. These checks do not certify physical heat/cool changeover or guarantee offline operation.

## Managed Auto 0.2.0 validation — 2026-10-13

Card 0.9.2, Blueprint 0.2.0, optional integration 0.2.0: 246 Python tests passed on HA 2024.12.0 and 2026.10.1; 149 frontend tests passed. New coverage: clean-restart resume and unexpected-shutdown disarm, schedule pause/resume, persistent notifications (single, deduplicated, auto-dismissed, 30-minute connection threshold, option off), logbook reasons, device/area/`all` override targets, specific config-flow errors, translation completeness, status sensor and diagnostics. 24 shared schedule vectors (overnight, weekdays, seconds, Sunday wrap, DST) agree across the Blueprint template, the integration and the card. Card layouts were checked in headless Chrome at desktop and phone widths in English and Chinese. These checks do not certify physical heat/cool changeover.
