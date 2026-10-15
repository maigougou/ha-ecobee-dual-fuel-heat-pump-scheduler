# Changelog

## Managed Auto / HACS package 0.4.0 (unreleased)

- Package the Blueprint and card inside the integration for a single HACS installation. A new setup menu installs these assets independently of the optional Managed Auto controller.
- Register the bundled card automatically, migrate an existing local card resource, and preserve imported Blueprint paths with backups on replacement. No thermostat commands are sent by package setup.
- Add HACS metadata and bundle freshness checks. GitHub publication and an actual HACS download are still pending.
- Add an optional dependency-free Python installer with backups and resource registration for manual deployments.
- Support the HA 2024.12 native ecobee cache layout, with config-entry identity checks.
- Ignore controller callbacks queued before unload so they cannot reacquire control afterwards.
- Fix diagnostics for the installation entry, migrate HACS resources when using the script, and update both previously installed Blueprint languages.
- Card 0.9.9: the history report follows the thermostat mode. Heat shows only heating history (*Heating report*) and Cool only cooling (*Cooling report*); Heat/Cool, Managed Auto, Off and unknown modes keep Heating/Cooling tabs under a neutral *Runtime report* title, so the title no longer contradicts the tabs.
- Correct restart-setting descriptions and add HACS/hassfest validation workflows. See the [pre-release review](docs/release-review.zh-CN.md) for remaining release checks.

## Card 0.9.8 / optional Managed Auto 0.3.0

Managed Auto 0.3.0:

- An HA **restart** keeps control: no mode command is sent on the way down or up. On HA OS / Supervised every restart (UI button, `ha core restart`, Core update) reaches HA as a plain stop signal, so the controller asks the Supervisor whether a Core restart/update/rebuild job is running; if the Supervisor cannot be asked, it treats the stop as a shutdown. A host reboot or Core stop counts as a shutdown. The controller resumes in place once readings are valid; data missing for more than 10 minutes after start still restores native Auto. A shutdown, reload, options change or disable still restores native Auto first. A mode changed while HA was down still wins (manual override).
- New `syncing` status while HA's climate/Aux entities catch up with ecobee's cache; lagging entities are refreshed immediately instead of waiting up to 30 s for the next poll. `awaiting_device` now only means a mode command is waiting for readback.
- The logbook records taking control, manual override, restored Auto and restart hold/resume, with readable reasons (e.g. "Managed Auto turned off") instead of internal status keys.
- The switch uses the device name only (no more "ecobee Managed Auto Managed Auto").

Card 0.9.8:

- The report and the Past 24 hours strip stay visible while refreshing; a failed refresh keeps the last good data with a "Refresh failed · Showing data from HH:MM" note and retries after about a minute.
- Syncing, restoring and awaiting-confirmation states use a neutral pending tone instead of yellow.
- kWh always shows two decimals. Coverage intersection for energy is linear (10-second power history: 7.8 s → 0.17 s); number/date formatters are cached.
- A hidden browser tab stops the clock, history reads and redraws; everything refreshes when shown again.
- Furnace-only operation shows the heat-pump tile as "Off · Furnace-only mode". The hero label no longer repeats "Managed Auto". The fan legend reads "Fan / ventilator". While Managed Auto is on, the source-schedule toggle notes that turning it off pauses Managed Auto.
- Build: `npm run build` (esbuild, pinned) writes the minified `dist/ecobee-dual-fuel-card.js` (133 KB → 104 KB; 34 KB gzip), which is the file to install. `npm run check` fails when `dist/` is stale.

## Card 0.9.7

- The physical ecobee mode (`ecobee: <mode>`) moved from the hero chips into the Managed Auto panel headline, so the hero chips fit on one row.

## Card 0.9.6

- Removed the Recorder-retention note under the report; the partial/no-history legend remains.

## Card 0.9.5

- "Past 24 hours" moved to the top of the history column, above the report, keeping wide two-column cards balanced.

## Card 0.9.4

- Performance: the card redraws only when one of its own entities, the language or HA config changes, not on every state change in the house. History is read incrementally (only the newest slice every 5 minutes, a full read every 6 hours).
- New "Past 24 hours" strip in the main column shows actual heat-pump, furnace, cooling and fan time, with hatched gaps where no data exists.
- The report shows the 4 most recent periods with a "Show all" button; cross-day dates no longer repeat the month (Oct 12 → 13, 10月12日 → 13日), so they no longer wrap on phones.
- "Furnace-only mode not verified" is a highlighted warning. Off uses a calm panel instead of a warning-coloured notice.
- The activity text now sits under the orb instead of a separate status line; idle shows nothing at the top right.
- kWh values use the text colour. Heat/Cool targets appear as one range chip (heat – cool).

## Card 0.9.3

- The heating/cooling report merges heat-pump and furnace-only periods into one chronological table (newest first, last 7 days); each row carries a coloured window marker and label instead of separate window tabs. Status pills are mixed toward the text colour for legibility on light themes.
- While a mode command awaits readback, the Managed Auto headline shows the side being selected.


## Card 0.9.2 / optional Managed Auto 0.2.0

- Managed Auto resumes by itself after a clean HA restart, reload or options change (configurable). An unexpected shutdown still restores native Auto, keeps the controller off and notifies.
- Turning the source schedule off or switching it to observation now pauses Managed Auto (native Auto restored, switch stays on) and resumes when the schedule returns.
- Persistent notifications for restore failure, manual override, configuration errors, unconfirmed commands and runtime data missing for 30+ minutes; dismissed automatically when healthy.
- New diagnostic status sensor, logbook entries with the reason for each mode change, downloadable diagnostics, and recorder exclusion for the changing runtime attributes.
- Service calls that target the thermostat's device, area or `all` are recognized as manual overrides.
- Complete Chinese translations; the setup form reports the specific failed check instead of one generic equipment error.
- Shared schedule test vectors for Blueprint, integration and card; weekly non-blocking CI against the HA pre-release.
- Card: the Managed Auto panel shows the selected side (heat pump, furnace only or cooling), a deadband strip, the 24-hour window strip and countdown, and an `ecobee: <mode>` chip. Source schedule and Managed Auto toggles share one control row. Heating history tabs keep heat-pump/furnace colours in managed and native Auto; cooling tabs are blue.

## Card 0.9.1

- Fixed furnace heating showing zero electricity when `heat_pump_energy_scope: outdoor_only` was selected. This option now excludes only the blower during heat-pump operation; furnace heating uses its own mapped power sensor in both schedule windows.
- Clarified the English/Chinese scope selector and help text. Added regressions for a 300 W furnace running for 30 minutes (0.15 kWh), furnace-only monitoring and unavailable furnace history.


## Card 0.9.0 / Blueprint 0.2.0 / optional Managed Auto 0.1.0

- Added a persistent, opt-in HA integration for scheduled heating sources during managed Heat/Cool, with shared Blueprint schedule and native Comfort targets.
- Added ownership guard, manual override handling, runtime freshness checks, mode dwell, bounded readback/recovery and journal-before-command.
- Added native setup/options GUI and optional controller selection/status in the card. Existing Heat-only installations and optional power mappings remain supported.
- Documented cloud latency, offline loss of changeover, recovery/disarming and lack of supervised physical-cycle validation. This is not native/offline Auto source control.


## Card 0.8.0 — seasonal layouts and activity reports

- Initialize the editor form with an empty schema before HA supplies config, avoiding a transient HA frontend render error.
- Dedicated Cool layout; Native Auto with separate heating/cooling targets; compact Off layout. Source scheduling remains Heat-only and is not presented as active in Cool/Auto.
- Heating and Cooling report views, each with seven continuous periods and exclusive stages. Cooling in daytime periods is included. User-selected view remains stable.
- Visual editor adds history toggles, independent analysis periods and circuit scope. Power is optional and supports any W/kW sensors.
- Electricity is attributed by actual activity in every window, with separate fan-only detail. Shared indoor power is counted once; duplicate circuit mappings hide totals. Combined coverage uses actual interval intersection, and partial circuit failure preserves known energy with a partial marker.
- Conflicting heating/cooling reports are unverified, not fabricated idle time. Mode/readback mismatches remain visible.
- Retains Blueprint 0.1.0 and its Heat-only control guards. Native Auto cannot simultaneously force furnace-only mode.

## 0.7.0 — modern layout and furnace blower status, unpublished

- Redesign the card: large indoor temperature with target, Comfort and humidity chips; an activity orb (hidden while idle) and status line coloured by the running source; a 24-hour heat-pump/auxiliary strip with a now marker and a countdown to the next switch (real elapsed time, DST-safe); outdoor and minimum temperatures as stat tiles; equipment tiles that light up while running. Animations respect reduced-motion settings.
- Wide cards (≥760 px, e.g. a two-column dashboard section) place status and the runtime report side by side; narrow cards stack. Surfaces are translucent so glass themes such as Frosted Glass render correctly.
- Report tabs now show a clearly filled, colour-coded selected state, and the table header picks up the selected window's colour. Each runtime cell adds a stage-split bar showing the share of recorded (not scheduled) time.
- Show the blower as "Controlled by furnace" when auxiliary heat runs without an ecobee Fan report. Many furnaces drive their own blower during auxiliary heat, so "Not running" was wrong. Applied to the custom card and the native fallback cards; nothing is inferred from power.
- Use equipment names instead of ecobee jargon on the card and native fallback: the outdoor tile is "Heat pump" (「热泵」) for both heating and cooling, and auxiliary heat is "Furnace" (「炉子」): "Heat pump · Furnace backup", "Furnace only", "Furnace-only hours", and the furnace tile reads "Heating · Stage N". Power settings and kWh notes say heat-pump circuit. Details explain that Furnace is ecobee's auxiliary heat; the Blueprint and the switch selector keep ecobee's names.
- Attribute report electricity to equipment by ecobee running time. Heat-pump hours count the heat-pump circuit plus the furnace circuit (the blower) while the heat pump heats or cools; **Furnace-only hours** now show electricity too, counting the furnace circuit only while the furnace runs (not gas use). Standby, fan-only and ventilation are excluded. The kWh column appears on both tabs whenever either sensor is set, so the two tables line up.
- Keep a stable card skeleton and update only changed parts. Switching report tabs no longer rebuilds the card or scrolls the page, and theme styling is not re-applied on every state update.

## 0.6.0 — per-stage runtime, unpublished

- Show Total, Stage 1 and Stage 2 as three lines in each heat-pump and furnace runtime cell.
- Count the highest reported stage per source exclusively; retain higher-stage time in totals and disclose it in details. Preserve missing and partial coverage.

## 0.5.2 — compact report headings, unpublished

- Remove the redundant text row below the report tabs; each occurrence already shows its boundaries. Outdoor-unit energy scope remains in the kWh heading tooltip and report details.

## 0.5.1 — schedule-period reporting, unpublished

- Group runtime and outdoor-unit electricity by continuous schedule occurrences, keeping overnight windows intact.
- Show the latest seven started occurrences per window, their local start/end, and an explicit in-progress marker.
- Preserve continuous auxiliary periods across skipped weekdays and real elapsed time across DST; query history from the oldest displayed period.

## 0.5.0 — optional electricity and compact report layout, unpublished

- Redesign the card with clearer type hierarchy, lighter equipment panels, and a two-window report selector; retain seven dates, move coverage detail out of the main rows, and preserve partial-data indicators.
- Add estimated daily kWh during the heat-pump schedule window using the configured outdoor-unit power sensor's recorded W/kW samples.
- Hide the energy column and skip its history query when no outdoor monitor is configured; never include the furnace/blower circuit. Add independent display and integration-method controls.
- Integrate clipped intervals across schedule/midnight boundaries, reject invalid/negative data and long gaps, mark partial energy separately from runtime coverage, and preserve runtime results if power history fails.

## 0.4.1 — daily runtime breakdown, unpublished

- Replace the two aggregate report rows with seven calendar-date rows, each containing heat-pump and auxiliary runtime in both schedule windows.
- Use today plus the previous six dates in HA's timezone, split overnight runs at midnight, handle DST day lengths, and retain missing dates as dashes.
- Show per-date recorded coverage, partial-data markers and current-day highlighting.

## 0.4.0 — runtime report, unpublished

- Add a rolling seven-day report showing heat-pump and auxiliary heating time within each configured time window, with recorded/missing coverage and expandable methodology.
- Count actual recorded equipment signals independently of optional power sensors and fan-only operation; handle midnight, selected weekdays, DST, unavailable history and long record gaps.
- Add a report toggle and adjustable history-gap limit to the card's visual editor. History requests are read-only and refreshed at most every five minutes per unchanged card configuration.
- Group history by current schedule settings explicitly; do not claim to reconstruct historical automation configuration or cloud history while HA was offline.

## 0.3.0 — control logic display, unpublished

- Read the selected Blueprint configuration to display the current window, weekdays, next boundary, observation/paused/disabled state, and device-mode agreement without duplicating scheduling inputs.
- Match ecobee weather and compressor minimum by device registry; display unit-aware weather/threshold comparison and provider update time, with unavailable and stale data distinguished.
- Use the compact Heat pump · Auto backup label, with automatic auxiliary heating explained in Details; retain independent reported equipment stages and blower status.
- Keep the card a frontend monitor with only the existing automation enable/disable control. No thermostat or Blueprint control changes.

## 0.2.0 — frontend card, unpublished

- Add a standalone modern dashboard card with a visual HA editor, automatic viewer language, and independent equipment, automation, and optional power-sensor selection.
- Accept provider-neutral W/kW sensors; support zero, one, or two monitors without guessed entity names. Keep power mappings in card settings, separate from Blueprint scheduling.
- Separate ecobee heating/cooling/Aux stages from blower operation; retain native YAML examples as a manual fallback.
- Add frontend state/configuration tests and installation instructions. No scheduling control changes.

## 0.1.0 — local release candidate

- Add a Home Assistant automation Blueprint for scheduling normal Heat and Auxiliary heat only through the native ecobee integration.
- Default to observation mode and an editable daily 23:00–07:00 normal-Heat window.
- Preserve ecobee temperature schedules, Comfort Settings, sensor participation, and temperature holds.
- Add optional compressor cutoff management with temperature-unit conversion and readback before a dependent mode change.
- Serialize commands, avoid unnecessary writes, and bound verification attempts per run.
- Reconcile current schedule after startup, automation reload, and periodic checks.
- Include English and Chinese setup instructions and development validation.
- Generate complete English and Chinese Blueprint forms from one control flow, with translated weekday labels, notifications, and trace messages; preserve identical input keys, defaults, and equipment commands.
- Add compact native dashboard cards with temperature, source policy, heat-pump heating/cooling and Aux stages, an automation toggle, and configuration navigation. Keep raw equipment reports and explanatory details collapsed.
- Generate Chinese and English dashboard variants from one source. Provide a default version without power monitoring and an optional-power version supporting either or both equipment circuits through provider-neutral W/kW sensors; omit default history charts and duplicate power readings.

- Display ecobee Fan operation independently from auxiliary-heating stages in all native dashboard variants.

This entry describes the initial project implementation. It does not claim a published release or successful validation on every ecobee installation.
