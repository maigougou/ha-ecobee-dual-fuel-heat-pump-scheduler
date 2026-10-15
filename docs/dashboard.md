# Dashboard card

[中文说明](dashboard.zh-CN.md)

The dashboard card shows HVAC status, source scheduling, stages, power and history. Install it through the [HACS package](../README.md#install-and-configure), then configure it in the visual editor. **Power sensors are selected in the card, not the Blueprint.**

## Seasonal behavior

The card follows the thermostat's actual HVAC mode. It never selects a season from the month or outdoor temperature.

| Mode | Display and control |
| --- | --- |
| Heat | Dual-source policy, enabled schedule timeline, heat pump and furnace stages. The Blueprint continues its existing Heat-only source control. |
| Cool | Cooling target, humidity, heat-pump cooling stage and optional power, blower status and indoor circuit power. No heating source controls, furnace countdown or heating cutoff panel. Cooling stays with ecobee. |
| Heat/Cool | Without Managed Auto: native Auto with source scheduling paused. With Managed Auto: separate Heat/Cool targets, the selected heating source, physical ecobee mode and controller status. |
| Off | Compact temperature/status and accessible history. No command switches equipment back on. Residual or contradictory equipment reports remain visible. |
| Unavailable | Unknown status; no inference from watts or the last selected source. |

For source scheduling in Heat/Cool, enable [Managed Auto](managed-auto.md). During heat-pump hours it uses native Auto; outside those hours it selects furnace heating or heat-pump cooling according to the current targets. Ordinary Cool remains controlled by ecobee.

The preview at `tests/preview.html` uses simulated data and cannot operate a device. Serve the repository locally to inspect mode, language, theme and monitoring combinations.

## Install

For HACS, the [package setup](../README.md#install-and-configure) registers the card automatically; skip the file/resource steps below. They apply to manual installation.

1. Copy the built [dist/ecobee-dual-fuel-card.js](../dist/ecobee-dual-fuel-card.js) (minified; the root `ecobee-dual-fuel-card.js` is the readable source and works too) to `/config/www/ecobee-dual-fuel-card.js`. If this is the first creation of `www`, restart Home Assistant Core once.
2. In **Settings → Dashboards → Resources**, add `/local/ecobee-dual-fuel-card.js?v=0.9.9` as **JavaScript module**. Enable Advanced mode in your HA profile if Resources is hidden. For YAML-managed resources, add the equivalent `url` and `type: module` entry to your Lovelace resources.
3. Refresh the browser. Edit your dashboard, choose **Add card → ecobee Dual-Fuel Heat Pump**, and select your thermostat in the visual form.
4. Optionally select the thermostat’s Auxiliary heat only switch and the existing scheduling automation. These selections are independent of the Blueprint inputs; choose the same equipment. The card does not automatically discover or guess entity names.
5. Under **Optional power monitoring**, select either, both, or neither power sensor. Search by friendly name or entity ID; clear a selection to hide that equipment’s power. Save the card.

The [minimal YAML example](../examples/custom_dashboard_card.yaml) is useful for manual installation, but sensor selection needs no YAML editing. Each thermostat/card has its own configuration.

## Card settings versus Schedule settings

**Edit dashboard → Edit card** changes displayed equipment, power sensors, sampling note, language, title, details, and the optional read-only compressor cutoff display.

The card’s **Schedule settings** button opens the selected automation’s Blueprint form for source time windows and control parameters. Power selections do not appear there. The button uses the automation’s actual configuration ID, which may differ from its entity ID. The source-schedule toggle controls the selected automation. In ordinary Heat, disabling it leaves the last source mode and cutoff in place. In Managed Auto, disabling the schedule pauses the controller and attempts to restore native Auto. The card also provides a separate Managed Auto toggle when a controller is selected.

| Card field | Purpose |
| --- | --- |
| ecobee thermostat | Required native ecobee climate entity. |
| Auxiliary heat only switch | Optional; select the switch for that thermostat to distinguish normal Heat from auxiliary-only policy. |
| Source automation | Optional; provides schedule status, an enable switch and settings shortcut. |
| Managed Auto controller | Optional controller switch; enables the managed heating/cooling view and controls. |
| Heat pump power | Optional W/kW sensor for the heat-pump circuit, shared by heating and cooling. |
| Furnace / blower power | Optional W/kW sensor for the indoor/furnace circuit. |
| Power sampling note | Optional accurate description, such as `1-minute average`; leave empty if unknown or different for the two sensors. |
| Language | `auto` (default), English, or Chinese. Auto follows the current viewer’s HA language; other languages fall back to English. |
| Card title | Optional custom heading; custom text is preserved as entered. |
| Compressor cutoff number | Optional read-only ecobee number entity; never written by the card. |
| Show details | Display equipment explanations. |
| Show last 7 schedule periods | Master report switch, on by default. |
| Show heating / cooling history | Independent switches, both on by default. The report follows the HVAC mode: Heat shows heating history (*Heating report*), Cool shows cooling history (*Cooling report*), and Heat/Cool (native or Managed Auto), Off and unknown modes show both as tabs under a neutral *Runtime report* title. If the mode's own history is switched off, the other enabled one is shown. A manually selected tab stays selected across live updates and returns when both tabs apply again. |
| Report periods | Reuse source automation (default), or explicitly choose independent analysis start/end times and start weekdays. These analysis settings never control equipment. |
| Heat-pump electricity scope | `with_blower` includes mapped blower electricity during heat-pump heating/cooling; `outdoor_only` excludes that blower electricity. Furnace heating always uses the mapped furnace circuit, regardless of this setting. Live watts are unchanged. |
| Show electricity in report | Attribute selected circuits to actual Heating and Cooling activity in both windows. With no eligible sensor, hide the column. Same entity selected for both circuits hides totals with a mapping warning. |
| Power integration method | Trapezoidal (default), Left, or Right; applies only to estimated electricity. |
| Maximum history gap (minutes) | Default 15, configurable 5–120; longer gaps are excluded as uncertain. |

Any monitoring brand can be used. Selectors list sensor entities with **W or kW**, including entities without `device_class: power`. A configured offline sensor remains removable. Cumulative energy in Wh/kWh is not power. Configured but unavailable data displays **Power unavailable**; no selection hides power; a measured zero displays zero. No Vue requirement or vendor-specific entity-name convention exists.

## Control logic status

The card reads the selected Blueprint automation's saved configuration through HA's existing read-only configuration API. It does not ask users to duplicate times or weekdays in the card and does not implement another equipment controller. It refreshes configuration once per minute and recomputes display time every 30 seconds in **HA's configured time zone**.

The main status area shows the configured heat-pump window and start days, current window, next boundary, current thermostat source policy, with a difference warning only when the device mode does not match the schedule. Normal operation does not repeat Scheduled policy and Device mode. Weather provenance and update time are kept in Details. It distinguishes enabled, disabled, observation only, paused outside ordinary Heat when Managed Auto is not active, unsupported/mismatched configuration, and unavailable configuration. **Enabled or Matches schedule does not prove an automation run succeeded**; inspect traces and notifications for execution results. Ordinary Cool and native Auto show their corresponding mode. Active Managed Auto retains the source timeline and adds controller status and the physical device mode.

Weather is automatically matched through the entity registry to a native ecobee `weather` entity on the **same device** as the selected climate. Other weather providers, other thermostats, disabled entities, and ambiguous matches are not used. Compressor minimum is the configured read-only number, the managed Blueprint number, or the same device's known ecobee compressor-minimum entity. Both temperatures are numerically converted into HA's preferred units, without changing thermostat settings.

The weather/minimum comparison describes **only this temperature limit**, not all prerequisites for starting a heat pump. Missing weather or cutoff remains unknown; weather with a provider timestamp older than two hours is marked stale, and is not presented as verified permission. Timestamp absence is not evidence of freshness. Weather is ecobee's reported online weather, not a measurement at the outdoor unit; raw attribution is in Details. Heat demand, native staging and auxiliary thresholds still apply.

Reading the automation configuration may require an administrator HA account and a storage-managed automation. If HA denies that read, the card shows **Schedule configuration unavailable**, while available equipment and same-device weather monitoring continue. It does not invent default settings in place of an unreadable configuration. YAML-managed automations may not be readable via this API. The same-device registry lookup is cached for ten minutes; reload the browser after changing entity registration.

## Last 7 continuous periods

The report uses recorded `equipment_running` to count heat-pump heating, furnace heating and heat-pump cooling independently in **both analysis windows**. Heating and Cooling views each display Total / Stage 1 / Stage 2. Heat uses the source schedule labels; Cool/Auto/Off and independent periods use neutral time labels. Non-daily schedules label the complement Other hours and preserve each continuous multi-day range. Runtime is elapsed time, not stage-weighted time: two reported stages count once. Fan-only, ventilation and cooling do not count as heating. No power monitor or extra helper is required. Simultaneously reported heat-pump and auxiliary heating count independently.

The table displays the latest seven **started schedule periods** for the selected window, newest first. Each row identifies its actual local start and end. For a daily 23:00–07:00 schedule, one heat-pump row is Oct 12 23:00 → Oct 13 07:00, and the following auxiliary-only row is Oct 13 07:00 → 23:00. Midnight never splits an occurrence. The current period is labelled **In progress** and counts only through the last refresh; future periods are omitted. Selected weekdays can produce longer continuous auxiliary-only periods, which remain one row. Each view has seven occurrences, so the time span can exceed seven days when not every weekday is selected. Runtime and outdoor electricity use exactly the same period boundaries. DST uses actual elapsed time; a normal overnight period can have seven or nine hours. Use the two period buttons to switch views without changing equipment or schedule settings. The report refreshes every five minutes while the card is open, reading only the configured thermostat, with all attribute changes retained. Changing the schedule re-groups the whole history with the new settings. **It is not an audit of which past automation settings were active or whether the automation actually ran**; disabled/observation periods are still grouped by clock time. The report does not change equipment or create history. Each Heat pump and Furnace cell has three lines: **Total**, **Stage 1**, and **Stage 2**. Stages use the highest active ecobee code for each source, so simultaneous first/second-stage codes count as Stage 2 only. Stage 3, when reported, remains in Total and is disclosed in details. Missing history displays dashes on all three lines; partial-history markers apply to the whole cell.

Coverage is available in Report details and cell hover text. Cells with partial window coverage have an asterisk. Missing dates remain visible with dashes. Missing, unavailable, restored, malformed and unrecognized equipment reports are excluded. Intervals with no record at their beginning, and intervals between records longer than the configured gap limit, are uncertain rather than idle; trailing stale records are also excluded. No synthetic start state is requested. An empty history shows dashes, not a fabricated zero. Zero means no heating found **within recorded coverage**, not proof of zero heating during missing time.

The gap limit is deliberately conservative: long unchanged states and outages cannot reliably be distinguished using frontend history alone. Increasing it can count more unchanged-state time but may incorrectly bridge an outage. Short outages and ecobee cloud polling delays can still affect estimates; these are recorded-state runtime estimates, not metered burner/compressor operating hours. Keep enough Recorder history for seven occurrences of each window (at least eight days for a daily schedule; approximately seven weeks for a weekly schedule) and include the climate entity's attributes; the card cannot recover purged history or ecobee cloud history from periods HA did not record. Read failures explicitly show an unavailable report instead of stale totals. Report settings are in **Edit card → Runtime report**, independently of equipment Details and the scheduling Blueprint.

## Optional electricity per schedule period

A **kWh ≈** column appears when electricity reporting is enabled and an eligible circuit is mapped. **Heating** sums selected-circuit electricity while ecobee reports heat-pump or furnace heating; **Cooling** sums selected-circuit electricity while it reports cooling. Both activities are counted in both time windows, including daytime cooling and overnight furnace operation. The column is an activity total for the explicitly selected circuits, not the whole period's standby consumption.

Choose **Outdoor heat-pump circuit only** (`outdoor_only`) to exclude the indoor blower from heat-pump heating/cooling electricity. **Furnace heating still counts the mapped furnace circuit in either schedule window.** Choose **Heat pump + indoor blower** (`with_blower`, compatibility default) to also include blower electricity during heat-pump operation. With just the indoor sensor, this measures indoor-circuit electricity only, not a whole-system total. Details list the circuits actually included. Fan-only indoor electricity appears separately in period details; standby, unknown and contradictory cooling/heating reports are excluded.

Shared indoor electricity is counted once during simultaneous heat-pump and furnace heating. Selecting the identical entity for both circuits displays a warning and hides electricity totals. Distinct entity IDs measuring overlapping physical circuits cannot be detected; users must map non-overlapping circuits. Runtime remains independent of monitoring hardware.

**Trapezoidal** integration linearly interpolates between two valid readings. **Left** holds the previous sample's power; **Right** applies the following sample to the preceding interval (useful when the sensor explicitly reports that interval's average). Choose according to your sensor's measurement semantics; all modes retain the history-gap limit. Intervals are clipped at schedule-period boundaries before integration. Both endpoints must be valid, nonnegative W/kW data; unit changes between W and kW are normalized. Unknown/restored/invalid-unit records and intervals exceeding the gap limit are excluded. There is no extrapolation before the first or after the last sample.

Power and thermostat histories have independent coverage. Hover an energy value to see its recorded duration within that period. An asterisk marks a **partial sum**, not a complete period total. No usable interval shows a dash; measured zero power shows zero; positive energy below 0.01 kWh displays `<0.01`. Missing power history never suppresses the runtime table, and a power-query failure displays an explicit warning. Long unchanged zero-power periods can be excluded conservatively as gaps, so do not interpret partial sums as complete metered consumption.

## Reading the card

- Source policy describes permitted equipment, not proof of equipment operation. Normal Heat allows native auxiliary backup. Ordinary Cool is controlled by ecobee; Heat/Cool source scheduling requires Managed Auto.
- The card calls ecobee’s auxiliary heat **Furnace**, with a short note in Details; the Blueprint and the switch selector keep ecobee’s own name. Heating, cooling, and furnace (`auxHeat`) stages come from ecobee `equipment_running` codes; the highest reported stage of each kind is displayed. Power never determines a stage.
- Blower status uses the climate’s `fan` operating attribute, falling back to the exact `fan` equipment code. `fan_mode` is a setting, and `ventilator` is not the blower. Auxiliary heating and blower operation are shown separately. While auxiliary heat runs without a Fan report, the blower is shown as **Controlled by furnace**: many furnaces drive their own blower during auxiliary heat and ecobee then does not report Fan. This is not inferred from power.
- In active Heat scheduling, the 24-hour strip shows the saved heat-pump window for the current local day with a now marker; the countdown to the next switch uses real elapsed time, including DST changes. The selected report tab is colour-filled (amber for heat-pump hours, orange-red for auxiliary-only hours). Each runtime cell's thin bar shows that source's share of the recorded time in the period, split by stage.
- Wide cards (about 760 px or more, such as a two-column section) show status and the report side by side. Card surfaces are translucent, so glass themes like Frosted Glass apply.
- An empty equipment report means idle; missing/unavailable data means unknown. Unrecognized codes remain available in Details. Cloud reports may be delayed and are not independent confirmation of combustion or compressor speed.
- Power represents electrical input. Furnace electricity includes the blower and does not measure gas use, heat delivery, or COP. Heat-pump power is displayed once, shared by heating and cooling.
- Control temperature may combine room sensors. Target temperature, Comfort Settings, participating sensors, and their schedules remain managed by ecobee. Units follow HA; known Home/Away/Sleep names are translated, custom comfort names are retained.
- Scheduler enabled does not prove observation mode is off or the last action succeeded. Inspect Blueprint settings, traces, and HA notifications when needed.

## Native YAML fallback and development

For installations that do not want a custom frontend module, the older native Markdown/Entities examples remain available. They require manual entity replacement and fixed-language YAML: [native card instructions](native_dashboard.md). They do not have this visual editor or automatic language selection.

Frontend checks: `npm ci`, then `npm run check` and `npm test` (Node 20+; the only dependency is the pinned esbuild used to build `dist/`). Browser verification must cover the real visual editor, clearing each optional sensor, live updates, and phone-sized layouts. Tests use simulated equipment states; do not activate heating just for layout checks.

Primary references: [HA custom cards and installation](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/), [HA dashboard resources](https://www.home-assistant.io/dashboards/dashboards/#resources), [HA ecobee integration](https://www.home-assistant.io/integrations/ecobee/).
