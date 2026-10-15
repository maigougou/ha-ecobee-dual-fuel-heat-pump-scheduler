import test from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig, languageFor, cardModel, powerReading, powerCandidates, editorSchema, scheduleRequest, settingsPath, escapeHTML, EcobeeDualFuelCard } from "../../ecobee-dual-fuel-card.js";
const THERMOSTAT = "climate.family_thermostat", AUX = "switch.family_aux", AUTOMATION = "automation.night_heating";
const HP = "sensor.shelly_compressor_watts", FURNACE = "sensor.my_custom_indoor_circuit";
const config = { entity: THERMOSTAT, aux_switch: AUX, automation: AUTOMATION };
function state(entity_id, value, attributes = {}) { return { entity_id, state: value, attributes }; }
function fixture(overrides = {}) {
  return { locale: { language: "en" }, config: { unit_system: { temperature: "°C" } }, states: {
    [THERMOSTAT]: state(THERMOSTAT, "heat", { current_temperature: 22.6, temperature: 21.8, preset_mode: "Sleep", equipment_running: "", fan: "off" }),
    [AUX]: state(AUX, "off"), [AUTOMATION]: state(AUTOMATION, "on", { id: "arbitrary-config-id" }),
    [HP]: state(HP, "1542.5", { unit_of_measurement: "W" }),
    [FURNACE]: state(FURNACE, "0.127", { unit_of_measurement: "kW" }), ...overrides,
  } };
}

test("new cards never guess a thermostat or monitor, and power is optional", () => {
  const stub = EcobeeDualFuelCard.getStubConfig();
  for (const key of ["entity", "automation", "heat_pump_power_entity", "furnace_power_entity"]) assert.equal(stub[key], undefined);
  assert.equal(stub.language, "auto");
  const m = cardModel(fixture(), config);
  assert.equal(m.outdoorPower, null); assert.equal(m.furnacePower, null);
  assert.equal(m.current, "22.6 °C"); assert.equal(m.target, "21.8 °C");
});

test("language follows the viewer, with explicit overrides and English fallback", () => {
  assert.equal(languageFor({ locale: { language: "zh-Hans" } }), "zh");
  assert.equal(languageFor({ language: "zh" }), "zh");
  assert.equal(languageFor({ locale: { language: "zh" } }, { language: "en" }), "en");
  assert.equal(languageFor({ locale: { language: "en-CA" } }, { language: "zh" }), "zh");
  assert.equal(languageFor({ locale: { language: "fr" } }), "en");
});

for (const [outdoor, furnace] of [[false, false], [true, false], [false, true], [true, true]]) {
  test(`monitor selection is independent: outdoor=${outdoor}, furnace=${furnace}`, () => {
    const m = cardModel(fixture(), { ...config, heat_pump_power_entity: outdoor ? HP : "", furnace_power_entity: furnace ? FURNACE : "" });
    assert.equal(m.outdoorPower?.value ?? null, outdoor ? 1542.5 : null);
    assert.equal(m.furnacePower?.value ?? null, furnace ? 0.127 : null);
    assert.equal(m.heat, 0); assert.equal(m.aux, 0); // Wattage never implies heat or stages.
  });
}

test("any sensor name/provider with W or kW is offered, including offline sensors", () => {
  const hass = fixture({
    "sensor.total_energy": state("sensor.total_energy", "15", { unit_of_measurement: "kWh" }),
    "sensor.offline_power": state("sensor.offline_power", "unavailable", { unit_of_measurement: "W" }),
    "sensor.classless_power": state("sensor.classless_power", "99", { unit_of_measurement: "W" }),
  });
  assert.deepEqual(powerCandidates(hass), [FURNACE, "sensor.classless_power", "sensor.offline_power", HP].sort());
  const schema = editorSchema(hass, { ...config, furnace_power_entity: "sensor.deleted_old_name" });
  const fields = schema.flatMap(group => group.schema);
  for (const key of ["heat_pump_power_entity", "furnace_power_entity"]) {
    const field = fields.find(f => f.name === key);
    assert.notEqual(field.required, true);
    assert(field.selector.entity.include_entities.includes("sensor.deleted_old_name"));
    assert(!field.selector.entity.include_entities.includes("sensor.total_energy"));
  }
});

test("configured missing/unavailable, measured zero and no configuration are distinct", () => {
  const hass = fixture({ [HP]: state(HP, "0", { unit_of_measurement: "W" }), [FURNACE]: state(FURNACE, "unavailable", { unit_of_measurement: "kW" }) });
  assert.equal(powerReading(hass, ""), null);
  assert.equal(powerReading(hass, "sensor.missing").status, "unavailable");
  assert.equal(powerReading(hass, FURNACE).status, "unavailable");
  assert.equal(powerReading(hass, HP).value, 0); assert.equal(powerReading(hass, HP).text, "0");
});

for (const unit of ["kWh", "Wh", null]) {
  test(`energy totals or missing units are rejected as power: ${unit}`, () => {
    const reading = powerReading(fixture({ [HP]: state(HP, "123", { unit_of_measurement: unit }) }), HP);
    assert.equal(reading.status, "invalid_unit"); assert.equal(reading.value, undefined);
  });
}

for (const [code, expected, target] of [
  ["heatPump", 1, "heat"], ["heatPump2", 2, "heat"], ["heatPump3", 3, "heat"],
  ["compCool1", 1, "cool"], ["compCool2", 2, "cool"],
  ["auxHeat1", 1, "aux"], ["auxHeat2", 2, "aux"], ["auxHeat3", 3, "aux"],
]) {
  test(`thermostat stage ${code} is independent from fan and power`, () => {
    const hass = fixture(); hass.states[THERMOSTAT].attributes.equipment_running = code;
    const m = cardModel(hass, config);
    assert.equal(m[target], expected); assert.equal(m.blower, target === "aux" ? "Controlled by furnace" : "Not running");
  });
}

test("highest stages and simultaneously reported heating/cooling remain visible", () => {
  const hass = fixture(); hass.states[THERMOSTAT].attributes.equipment_running = "heatPump, heatPump2,compCool2,auxHeat1,auxHeat3,fan";
  delete hass.states[THERMOSTAT].attributes.fan;
  const m = cardModel(hass, config);
  assert.deepEqual(m.outdoor, ["Heating · Stage 2", "Cooling · Stage 2"]);
  assert.equal(m.aux, 3); assert.equal(m.blower, "Running");
});

test("fan operation is not inferred from fan_mode, ventilation or auxiliary heat", () => {
  const hass = fixture(); const attrs = hass.states[THERMOSTAT].attributes;
  attrs.fan_mode = "on"; delete attrs.fan; attrs.equipment_running = "ventilator";
  let m = cardModel(hass, config); assert.equal(m.blower, "Not running"); assert.equal(m.summary, "Fan / ventilation");
  attrs.equipment_running = "auxHeat2"; assert.equal(cardModel(hass, config).blower, "Controlled by furnace"); // Many furnaces drive their own blower without a Fan report.
  attrs.equipment_running = "fan"; m = cardModel(hass, config); assert.equal(m.blower, "Running"); assert.equal(m.aux, 0);
  attrs.fan = "on"; attrs.equipment_running = "auxHeat2,fan";
  m = cardModel(hass, config); assert.equal(m.aux, 2); assert.equal(m.blower, "Running");
});

test("unknown equipment and offline/missing reports never show stale stages or temperatures", () => {
  const hass = fixture(); const c = hass.states[THERMOSTAT];
  c.attributes.equipment_running = "unrecognized,fan"; delete c.attributes.fan;
  let m = cardModel(hass, config); assert.equal(m.summary, "Check equipment status"); assert.deepEqual(m.outdoor, ["Unknown"]); assert.equal(m.blower, "Running");
  c.state = "unavailable"; c.attributes.fan = "on"; c.attributes.equipment_running = "auxHeat2,fan";
  m = cardModel(hass, config); assert.equal(m.current, "—"); assert.equal(m.target, "—"); assert.equal(m.aux, 0); assert.equal(m.blower, "Unknown");
  c.state = "heat"; delete c.attributes.equipment_running; delete c.attributes.fan;
  m = cardModel(hass, config); assert.equal(m.summary, "Unknown"); assert.equal(m.blower, "Unknown");
});

test("Heat permission remains distinct from running Aux, and an absent Aux switch is not guessed", () => {
  const hass = fixture(); hass.states[THERMOSTAT].attributes.equipment_running = "auxHeat2";
  let m = cardModel(hass, config); assert.equal(m.policy, "Heat pump · Furnace backup"); assert.equal(m.aux, 2);
  m = cardModel(hass, { entity: THERMOSTAT }); assert.equal(m.policy, "Heating mode");
  hass.states[AUX].state = "on"; assert.equal(cardModel(hass, config).policy, "Furnace only");
});

test("temperature unit follows HA and custom comfort names are preserved", () => {
  const hass = fixture(); hass.config.unit_system.temperature = "°F";
  Object.assign(hass.states[THERMOSTAT], { state: "heat_cool" });
  Object.assign(hass.states[THERMOSTAT].attributes, { target_temp_low: 70, target_temp_high: 76, current_temperature: 72, preset_mode: "Wake up ready" });
  const m = cardModel(hass, config); assert.equal(m.current, "72 °F"); assert.equal(m.target, "70 °F – 76 °F"); assert.equal(m.comfort, "Wake up ready");
});

test("the only service request enables/disables the selected automation", () => {
  const hass = fixture(); assert.deepEqual(scheduleRequest(hass, config, false), { domain: "automation", service: "turn_off", data: { entity_id: AUTOMATION } });
  assert.equal(scheduleRequest(hass, { entity: THERMOSTAT }, true), null);
  hass.states[AUTOMATION].state = "unavailable"; assert.equal(scheduleRequest(hass, config, true), null);
});

test("settings shortcut uses the automation configuration ID rather than its entity name", () => {
  const hass = fixture(); assert.equal(settingsPath(hass, config), "/config/automation/edit/arbitrary-config-id");
  delete hass.states[AUTOMATION].attributes.id; assert.equal(settingsPath(hass, config), "/config/automation");
});

test("invalid entity domains and unsupported config values fail explicitly", () => {
  assert.throws(() => normalizeConfig({ entity: "sensor.temperature" }), /climate/);
  assert.throws(() => normalizeConfig({ furnace_power_entity: "switch.furnace" }), /sensor/);
  assert.throws(() => normalizeConfig({ language: "guess" }), /language/);
  assert.equal(normalizeConfig({ furnace_power_entity: "" }).furnace_power_entity, undefined);
});

test("all user-supplied text is escaped before HTML rendering", () => {
  assert.equal(escapeHTML('<img onerror="x">&\''), "&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;");
});

test("auxiliary heat without an ecobee Fan report is furnace-controlled, never shown as stopped", () => {
  const hass = fixture(); const attrs = hass.states[THERMOSTAT].attributes;
  attrs.equipment_running = "auxHeat1,ventilator"; attrs.fan = "off";
  assert.equal(cardModel(hass, config).blower, "Controlled by furnace");
  attrs.equipment_running = "auxHeat1,fan"; attrs.fan = "on"; assert.equal(cardModel(hass, config).blower, "Running");
  attrs.equipment_running = ""; attrs.fan = "off"; assert.equal(cardModel(hass, config).blower, "Not running");
  hass.locale.language = "zh"; attrs.equipment_running = "auxHeat2"; assert.equal(cardModel(hass, config).blower, "由炉子控制");
});
