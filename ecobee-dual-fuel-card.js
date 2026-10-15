/** ecobee Dual-Fuel Heat Pump Scheduler card — local-only display/editor, no vendor-specific IDs. */
export const CARD_VERSION = "0.9.9";
const TYPE = "custom:ecobee-dual-fuel-card";
const ENTITY_FIELDS = {
  entity: "climate", aux_switch: "switch", automation: "automation", managed_auto_entity: "switch",
  heat_pump_power_entity: "sensor", furnace_power_entity: "sensor", cutoff_entity: "number",
};
const LABELS = {
  en: {
    indoor: "Indoor temperature", target: "Target", home: "Home", away: "Away", sleep: "Sleep",
    unknown: "Unknown", noData: "No data", idle: "Idle", fanOnly: "Fan / ventilation",
    other: "Other equipment active", check: "Check equipment status", heating: "Heating", cooling: "Cooling",
    normalHeat: "Heat pump · Furnace backup", auxOnly: "Furnace only", heatUnknown: "Heating · Source unknown",
    heatMode: "Heating mode", coolMode: "Cooling mode", autoMode: "Heat / Cool · Source schedule paused", off: "Off",
    stage: "Stage", furnaceControlled: "Controlled by furnace", hpHeating: "Heat pump heating", humidity: "Humidity", notRunning: "Not running", running: "Running", auxHeat: "Furnace heating", blower: "Blower",
    outdoor: "Heat pump", furnace: "Furnace / blower", powerUnavailable: "Power unavailable",
    powerUnitError: "Use a W / kW power sensor", details: "Details", schedule: "Source schedule",
    scheduleSettings: "Schedule settings", scheduleOff: "Schedule disabled; last source settings remain.",
    scheduleUnknown: "Schedule unavailable", cutoff: "Minimum compressor outdoor temperature",
    report: "ecobee report", stateNote: "Equipment stages and Fan status come from ecobee and may be delayed. Fan mode is a setting, not an operating report. During furnace heating many furnaces run their own blower, so ecobee does not report Fan; the card then shows it as controlled by the furnace rather than guessing from power.", termNote: "Furnace is the equipment ecobee calls auxiliary heat (Aux); runtime and stages come from its auxHeat reports.",
    powerNote: "Power is electrical input, not delivered heat or gas use. Furnace electricity includes the blower; heat-pump heating and cooling share one reading.",
    tempNote: "The control temperature may combine participating room sensors. Temperature schedules remain managed by ecobee.",
    setup: "Select an ecobee thermostat in the card editor.", loading: "Loading Home Assistant…", actionFailed: "Could not change the automation. Check Home Assistant permissions and try again.",
    equipmentSection: "Equipment and schedule", powerSection: "Optional power monitoring", displaySection: "Display",
    entity: "ecobee thermostat", aux_switch: "Auxiliary heat only switch (optional)", automation: "Source automation (optional)",
    heat_pump_power_entity: "Heat pump power (optional)", furnace_power_entity: "Furnace / blower power (optional)",
    cutoff_entity: "Compressor cutoff number (optional)", power_note: "Power sampling note (optional)", language: "Language",
    show_runtime_report: "Show last 7 schedule periods", history_gap_minutes: "Maximum history gap (minutes)", reportSection: "Runtime report", reportHelper: "Uses recorded ecobee heating states, without a power monitor. Requires the selected schedule and History access.", gapHelper: "Exclude longer gaps as uncertain. A larger limit counts more unchanged-state time but may bridge outages.",
    show_energy_report: "Show electricity in report", energy_integration_method: "Power integration method", energyHelper: "Counts electricity only while ecobee reports that equipment running. Heat-pump hours use the heat-pump sensor plus the furnace sensor for the blower; furnace-only hours use the furnace sensor. A tab without its sensor leaves kWh empty.", methodHelper: "Trapezoidal interpolates readings; Left holds the previous value; Right uses the following sample (e.g. a preceding-period average). All are estimates from recorded power.", trapezoidal: "Trapezoidal", left: "Left", right: "Right",
    name: "Card title (optional)", show_details: "Show details", autoLanguage: "Auto — Home Assistant language",
    entityHelper: "Choose the native ecobee climate entity. The card does not change temperature or HVAC mode.",
    auxHelper: "Select Auxiliary heat only for this thermostat. Leave empty for a general heating-mode label.",
    automationHelper: "Select your Blueprint automation to display its enable switch and settings shortcut. Empty means read-only monitoring.",
    outdoorHelper: "Select this equipment's electrical power sensor. Any brand, W or kW; leave empty to hide power.",
    furnaceHelper: "Select the furnace / indoor blower circuit power sensor. Any brand, W or kW; leave empty to hide power.",
    cutoffHelper: "Optional read-only display; choose the number on this ecobee device.",
    samplingHelper: "Describe your selected sensors, e.g. 1-minute average. Leave empty if their sampling periods differ or are unknown.",
    languageHelper: "Auto uses the current viewer's HA language. Chinese and English are supported; other languages use English.",
  },
  zh: {
    indoor: "当前室温", target: "目标", home: "在家", away: "离家", sleep: "睡眠",
    unknown: "状态未知", noData: "暂无数据", idle: "待机", fanOnly: "送风／通风",
    other: "其他设备运行", check: "状态待确认", heating: "制暖", cooling: "制冷",
    normalHeat: "热泵 · 炉子备用", auxOnly: "仅炉子供暖", heatUnknown: "制暖 · 热源状态未知",
    heatMode: "制暖模式", coolMode: "制冷模式", autoMode: "自动冷暖 · 定时切换暂停", off: "已关闭",
    stage: "级", furnaceControlled: "由炉子控制", hpHeating: "热泵制暖", humidity: "湿度", notRunning: "未运行", running: "运行中", auxHeat: "炉子制暖", blower: "送风机",
    outdoor: "热泵", furnace: "炉子／送风机", powerUnavailable: "功率不可用",
    powerUnitError: "请选择 W／kW 功率实体", details: "更多信息", schedule: "热源自动调度",
    scheduleSettings: "时段与设置", scheduleOff: "自动调度已停用，保留最后的热源设置。",
    scheduleUnknown: "自动调度不可用", cutoff: "压缩机最低室外温度",
    report: "ecobee 状态", stateNote: "设备级数和 Fan 运行状态来自 ecobee，更新可能延迟。风扇模式只是设定，不用于判断是否运行。炉子制暖时，很多燃气炉由炉子主板自行控制送风机，ecobee 不会报告 Fan；此时卡片显示“由炉子控制”，不根据功率猜测。", termNote: "“炉子”即 ecobee 中的辅助供暖（Auxiliary heat / Aux），运行时长和级数来自 auxHeat 报告。",
    powerNote: "功率为电路耗电，不代表供热量或燃气消耗。炉子电路包括送风机；热泵制暖与制冷共用同一读数。",
    tempNote: "控温温度可能由多个房间传感器组合，温度日程仍由 ecobee 管理。",
    setup: "请在卡片编辑器中选择 ecobee 温控器。", loading: "正在加载 Home Assistant…", actionFailed: "未能修改自动化，请检查 HA 权限后重试。",
    equipmentSection: "设备与调度", powerSection: "可选功率监控", displaySection: "显示",
    entity: "ecobee 温控器", aux_switch: "Auxiliary heat only 开关（可选）", automation: "热源自动化（可选）",
    heat_pump_power_entity: "热泵功率（可选）", furnace_power_entity: "炉子／送风机功率（可选）",
    cutoff_entity: "压缩机最低室外温度实体（可选）", power_note: "功率采样说明（可选）", language: "语言",
    show_runtime_report: "显示最近 7 次日程时段", history_gap_minutes: "历史记录最大间隔（分钟）", reportSection: "运行报告", reportHelper: "使用 ecobee 制暖状态历史，无需功率监控；需要所选日程及历史访问权限。", gapHelper: "超过此间隔的记录区间视为未知。增大数值会计入更多状态未变化的时间，也可能跨过停机空档。",
    show_energy_report: "报告显示用电量", energy_integration_method: "功率积分方式", energyHelper: "只统计 ecobee 报告设备运行期间的用电。热泵时段使用热泵功率传感器，并用炉子功率传感器计入送风机；仅炉子时段使用炉子功率传感器。缺少对应传感器的时段 kWh 留空。", methodHelper: "梯形：读数间线性变化；左矩形：沿用前一读数；右矩形：使用后一读数（如前一采样周期的平均功率）。均为历史功率估算。", trapezoidal: "梯形", left: "左矩形", right: "右矩形",
    name: "卡片标题（可选）", show_details: "显示详情", autoLanguage: "自动 — 跟随 HA 用户语言",
    entityHelper: "请选择原生 ecobee 集成的 climate 实体。卡片不修改温度或冷暖模式。",
    auxHelper: "选择同一台温控器的 Auxiliary heat only 开关。留空时只显示制暖模式，不推断热源策略。",
    automationHelper: "选择 Blueprint 创建的自动化，以显示启停开关及设置入口。留空则仅显示设备状态。",
    outdoorHelper: "选择热泵电路的功率传感器，支持任意品牌的 W／kW。留空可隐藏功率。",
    furnaceHelper: "选择炉子／室内送风机电路的功率传感器，支持任意品牌的 W／kW。留空可隐藏功率。",
    cutoffHelper: "仅用于显示，请选择同一 ecobee 的数值实体；卡片不修改阈值。",
    samplingHelper: "按实际传感器填写，例如“1 分钟平均”。采样周期不同或不清楚时可留空。",
    languageHelper: "自动模式跟随当前查看者的 HA 语言，支持中英文，其他语言使用英文。",
  },
};

Object.assign(LABELS.en, {
  nativeAuto: "Native Auto", nativeSchedule: "ecobee schedule", heatTarget: "Heat target", coolTarget: "Cool target", indoorCircuit: "Indoor circuit",
  nativeAutoNote: "Heating source schedule is paused in Auto. ecobee manages heating and cooling.",
  nativeCoolNote: "ecobee manages cooling. Heating source scheduling is paused.",
  show_heating_report: "Show heating history", show_cooling_report: "Show cooling history",
  heat_pump_energy_scope: "Heat-pump electricity scope", outdoor_only: "Outdoor heat-pump circuit only", with_blower: "Heat pump + indoor blower",
  report_schedule_source: "Report periods", automationPeriods: "Use source automation", customPeriods: "Independent analysis periods",
  report_start: "First period starts", report_end: "First period ends", report_days: "First period start days",
  analysisSection: "Independent report periods", analysisHelper: "For analysis only. These times never control heating or cooling. Unselected days belong to the other continuous period.",
  energyHelper: "Electricity follows actual ecobee activity in both periods. Heat-pump scope controls whether its blower is included. Furnace heating always uses the selected furnace sensor. No sensors means no electricity column.",
  reportHelper: "Recorded heating and cooling stages, grouped into continuous periods. No power monitor required.",
  duplicatePower: "The same sensor is selected for both circuits. Electricity totals are hidden until the mapping is corrected.",
});
Object.assign(LABELS.zh, {
  nativeAuto: "原生自动冷暖", nativeSchedule: "ecobee 舒适日程", heatTarget: "制暖目标", coolTarget: "制冷目标", indoorCircuit: "室内机电路",
  nativeAutoNote: "自动冷暖模式暂停热源调度，由 ecobee 管理制暖和制冷。",
  nativeCoolNote: "由 ecobee 管理制冷，供暖热源调度已暂停。",
  show_heating_report: "显示制暖历史", show_cooling_report: "显示制冷历史",
  heat_pump_energy_scope: "热泵用电统计范围", outdoor_only: "仅室外热泵电路", with_blower: "热泵与室内送风机",
  report_schedule_source: "报告时段来源", automationPeriods: "使用热源自动化", customPeriods: "独立分析时段",
  report_start: "第一时段开始", report_end: "第一时段结束", report_days: "第一时段开始日",
  analysisSection: "独立报告时段", analysisHelper: "仅用于统计，不控制冷暖设备。未选择的日期并入另一连续时段。",
  energyHelper: "两个时段均按 ecobee 实际活动统计电量。热泵统计范围决定是否包含送风机；炉子制暖始终使用已选的炉子功率传感器。未选功率传感器时隐藏电量。",
  reportHelper: "按连续时段统计制暖、制冷及各级运行时间，不需要功率监测。",
  duplicatePower: "两个电路选择了同一传感器，修正前不显示用电总量，避免重复统计。",
});


Object.assign(LABELS.en, {
  managed_auto_entity: "Managed Auto controller (optional)", managedAuto: "Managed Auto",
  managedUnavailable: "Managed Auto controller unavailable or belongs to another thermostat.",
  managedCooling: "Heat pump cooling", managedGas: "Furnace only", managedPump: "Heat pump · Furnace backup",
  deviceMode: "ecobee: {mode}", deviceModes: { auto: "Auto", auxHeatOnly: "Aux (furnace)", cool: "Cool", heat: "Heat", off: "Off" },
  bandHeat: "≤ {t} → Furnace", bandCool: "≥ {t} → Cool", bandKeep: "Between the targets the current mode is kept.", bandAux: "At or below the heat target: furnace selected.", bandCoolNow: "At or above the cool target: Cool selected.",
  bandWindow: "Heat-pump window: ecobee native Auto chooses heating or cooling.", bandCurrent: "Now {t}",
  managedNextWindow: "Native Auto (heat pump)", managedNextDay: "Furnace / Cool", managedDayHours: "Furnace / Cool hours",
  offNote: "ecobee is off: no heating or cooling. Source scheduling resumes when Heat is selected.", targetRange: "Heat {heat} · Cool {cool}",
  recentTitle: "Past 24 hours", recentKinds: { heat: "Heat pump", aux: "Furnace", cool: "Cooling", fan: "Fan / ventilator" }, recentIdle: "No heating or cooling",
  recentTicks: ["−24h", "−18h", "−12h", "−6h", "Now"], recentGap: "No data",
  managedNote: "HA selects the heating source and cooling mode. ecobee controls Comfort targets and equipment stages. Cloud updates can delay changeover. During outages the last device mode remains. Manual HVAC changes disarm Managed Auto.",
  managedSettings: "Auto settings", physicalMode: "Device mode", heatingSource: "Heating source",
  heatPumpLocked: "Off · Furnace-only mode", schedulePausesManaged: "Off pauses Managed Auto",
});
Object.assign(LABELS.zh, {
  managed_auto_entity: "自动冷暖控制器（可选）", managedAuto: "自动冷暖调度",
  managedUnavailable: "自动冷暖控制器不可用或属于其他温控器。",
  managedCooling: "热泵制冷", managedGas: "仅炉子供暖", managedPump: "热泵 · 炉子备用",
  deviceMode: "ecobee 显示：{mode}", deviceModes: { auto: "自动冷暖", auxHeatOnly: "辅助供暖（炉子）", cool: "制冷", heat: "制暖", off: "关闭" },
  bandHeat: "≤ {t} → 炉子", bandCool: "≥ {t} → 制冷", bandKeep: "两个目标之间保持当前模式。", bandAux: "已到达或低于制暖目标：选择炉子。", bandCoolNow: "已到达或高于制冷目标：选择制冷。",
  bandWindow: "热泵时段：由 ecobee 原生自动冷暖选择制暖或制冷。", bandCurrent: "当前 {t}",
  managedNextWindow: "原生自动冷暖（热泵）", managedNextDay: "炉子 / 制冷", managedDayHours: "炉子 / 制冷时段",
  offNote: "ecobee 已关闭，不制暖也不制冷。切回制暖模式后恢复热源调度。", targetRange: "制暖 {heat} · 制冷 {cool}",
  recentTitle: "过去 24 小时", recentKinds: { heat: "热泵", aux: "炉子", cool: "制冷", fan: "送风 / 新风" }, recentIdle: "未制暖或制冷",
  recentTicks: ["−24时", "−18时", "−12时", "−6时", "现在"], recentGap: "无数据",
  managedNote: "HA 选择供暖热源及制冷模式，ecobee 管理舒适日程和设备级数。云端更新可能导致切换延迟。断线时保留最后设备模式，手动切换冷暖模式会停用自动冷暖调度。",
  managedSettings: "自动冷暖设置", physicalMode: "设备模式", heatingSource: "供暖热源",
  heatPumpLocked: "未启用 · 仅炉子模式", schedulePausesManaged: "关闭会暂停自动冷暖调度",
});
const AUTO_STATUS = {
  en: { waiting_for_auto: "Ready · Select Heat/Cool to start", disabled: "Disabled", manual_override: "Paused after manual mode change", waiting_for_schedule: "Check source schedule and controller binding", schedule_paused: "Paused · Source schedule off or in observation", configuration_error: "Check controller configuration", command_failed: "Stopped · ecobee did not confirm the mode change", waiting_for_connection: "Data unavailable · Waiting to restore Auto", restoring_auto: "Restoring native Auto", restore_failed: "Restore failed · Check thermostat mode", awaiting_device: "Waiting for device confirmation", syncing: "Syncing with the thermostat", minimum_mode_wait: "Waiting before mode change", heat_pump_window: "Heat pump heating · Cooling available", furnace_selected: "Furnace selected · Cooling monitored", cooling_selected: "Cooling selected · Heating monitored" },
  zh: { waiting_for_auto: "已就绪 · 切换为自动冷暖后生效", disabled: "已停用", manual_override: "手动切换模式后已暂停", waiting_for_schedule: "请检查热源日程及控制器绑定", schedule_paused: "已暂停 · 热源日程关闭或处于观察模式", configuration_error: "请检查控制器配置", command_failed: "已停止 · ecobee 未确认模式切换", waiting_for_connection: "数据不可用 · 等待恢复原生自动冷暖", restoring_auto: "正在恢复原生自动冷暖", restore_failed: "恢复失败 · 请检查温控器模式", awaiting_device: "等待设备确认", syncing: "正在同步温控器状态", minimum_mode_wait: "等待模式切换间隔", heat_pump_window: "热泵供暖 · 可自动制冷", furnace_selected: "已选炉子供暖 · 监测制冷需求", cooling_selected: "已选制冷 · 监测供暖需求" },
};
export function managedAutoModel(hass, config) {
  if (!config.managed_auto_entity) return null;
  const state = hass?.states?.[config.managed_auto_entity], attr = state?.attributes || {};
  const valid = available(state) && attr.thermostat === config.entity && typeof attr.owns_mode === "boolean";
  const t = labelsFor(hass,config), language = languageFor(hass,config), active = valid && attr.owns_mode;
    // While a command awaits readback, show the side being selected; the panel also says it is unconfirmed.
  const mode = attr.pending_mode || attr.device_mode;
  const side = !active ? null : attr.heat_pump_window ? "heat" : mode === "cool" ? "cool" : mode === "auxHeatOnly" ? "aux" : "idle";
  const tone = !valid ? "warning" : MANAGED_HEALTHY.has(attr.status) ? "normal" : MANAGED_PENDING.has(attr.status) ? "pending" : MANAGED_FAILED.has(attr.status) ? "error" : "warning";
  return { valid, active, side, tone, enabled: state?.state === "on", available: available(state), attributes: valid ? attr : {},
    sideText: { heat: t.managedPump, cool: t.managedCooling, aux: t.managedGas, idle: t.managedAuto }[side] || "",
    deviceText: valid && attr.device_mode ? t.deviceMode.replace("{mode}", t.deviceModes[attr.device_mode] || attr.device_mode) : "",
    status: valid ? AUTO_STATUS[language][attr.status] || t.unknown : t.managedUnavailable };
}
const MANAGED_HEALTHY = new Set(["waiting_for_auto", "heat_pump_window", "furnace_selected", "cooling_selected", "minimum_mode_wait"]);
const MANAGED_PENDING = new Set(["awaiting_device", "restoring_auto", "syncing"]);
const MANAGED_FAILED = new Set(["restore_failed", "configuration_error", "command_failed", "waiting_for_schedule"]);
// Heat target, current and cool target on one scale; positions are percentages of the strip.
export function deadbandModel(attr, unit) {
  const convert = value => numeric(value) ? (unit === "°F" ? Number(value) * 9 / 5 + 32 : Number(value)) : null;
  const heat = convert(attr?.heat_target_c), cool = convert(attr?.cool_target_c), current = convert(attr?.current_c);
  if (heat === null || cool === null || cool <= heat) return null;
  const pad = Math.max((cool - heat) * .6, unit === "°F" ? 2 : 1);
  const low = Math.min(heat - pad, current ?? heat), high = Math.max(cool + pad, current ?? cool), at = v => (v - low) / (high - low) * 100;
  return { heat, cool, current, heatAt: at(heat), coolAt: at(cool), currentAt: current === null ? null : at(current),
    zone: current === null ? null : current <= heat ? "aux" : current >= cool ? "cool" : "keep" };
}
export function managedRequest(hass, config, enabled) {
  const id = config.managed_auto_entity;
  if (!id?.startsWith("switch.") || !["on", "off"].includes(hass?.states?.[id]?.state)) return null;
  return { domain: "switch", service: enabled ? "turn_on" : "turn_off", data: { entity_id: id } };
}

export function languageFor(hass, config = {}) {
  const requested = config.language === "auto" || !config.language
    ? hass?.locale?.language || hass?.language || "en" : config.language;
  return String(requested).toLowerCase().startsWith("zh") ? "zh" : "en";
}
export function labelsFor(hass, config = {}) { return LABELS[languageFor(hass, config)]; }
export function normalizeConfig(input = {}) {
  const config = { type: TYPE, language: "auto", show_details: true, show_runtime_report: true, show_energy_report: true, energy_integration_method: "trapezoidal", history_gap_minutes: 15, show_heating_report: true, show_cooling_report: true, heat_pump_energy_scope: "with_blower", report_schedule_source: "automation", report_start: "23:00:00", report_end: "07:00:00", report_days: ["mon","tue","wed","thu","fri","sat","sun"], ...input };
  for (const [field, domain] of Object.entries(ENTITY_FIELDS)) {
    if (config[field] == null || config[field] === "") { delete config[field]; continue; }
    if (typeof config[field] !== "string" || !config[field].startsWith(`${domain}.`) || !/^\w+\.[a-z0-9_]+$/.test(config[field])) {
      throw new Error(`${field} must be a ${domain} entity ID.`);
    }
  }
  if (!["auto", "en", "zh"].includes(config.language)) throw new Error("language must be auto, en or zh.");
  if (typeof config.show_details !== "boolean") throw new Error("show_details must be a boolean.");
  if (typeof config.show_runtime_report !== "boolean") throw new Error("show_runtime_report must be a boolean.");
  if (!Number.isInteger(config.history_gap_minutes) || config.history_gap_minutes < 5 || config.history_gap_minutes > 120) throw new Error("history_gap_minutes must be an integer from 5 to 120.");
  if (typeof config.show_energy_report !== "boolean") throw new Error("show_energy_report must be a boolean.");
  if (!["trapezoidal", "left", "right"].includes(config.energy_integration_method)) throw new Error("Invalid energy_integration_method.");
  for (const field of ["name", "power_note"]) {
    if (config[field] != null && typeof config[field] !== "string") throw new Error(`${field} must be text.`);
  }
  for (const key of ["show_heating_report", "show_cooling_report"]) if (typeof config[key] !== "boolean") throw new Error(`${key} must be boolean.`);
  if (!["outdoor_only", "with_blower"].includes(config.heat_pump_energy_scope)) throw new Error("Invalid heat-pump electricity scope.");
  if (!["automation", "custom"].includes(config.report_schedule_source)) throw new Error("Invalid report period source.");
  if (config.report_schedule_source === "custom" && (clockSeconds(config.report_start) === null || clockSeconds(config.report_end) === null || clockSeconds(config.report_start) === clockSeconds(config.report_end) || !Array.isArray(config.report_days) || !config.report_days.length || config.report_days.some(d => !DAYS.includes(d)))) throw new Error("Invalid analysis periods.");
  return config;
}
function numeric(value) {
  return ["number", "string"].includes(typeof value) && String(value).trim() !== "" && Number.isFinite(Number(value));
}
function available(state) { return Boolean(state && !["unknown", "unavailable"].includes(state.state)); }
// Intl constructors are costly and the card formats on every render; reuse them by locale and options.
const INTL_CACHE = new Map();
function intl(kind, locale, options) {
  const key = `${kind}|${locale}|${JSON.stringify(options)}`;
  let format = INTL_CACHE.get(key);
  if (!format) {
    format = new Intl[kind](locale, options);
    if (INTL_CACHE.size > 200) INTL_CACHE.clear();
    INTL_CACHE.set(key, format);
  }
  return format;
}
export const dateTimeFormat = (locale, options) => intl("DateTimeFormat", locale, options);
// fixed keeps trailing zeros, so kWh columns always read with the same precision.
function formatted(value, language, digits = 1, fixed = false) {
  return intl("NumberFormat", language === "zh" ? "zh-CN" : "en", { maximumFractionDigits: digits, ...(fixed ? { minimumFractionDigits: digits } : {}) }).format(Number(value));
}
export function powerReading(hass, entityId, config = {}) {
  if (!entityId) return null;
  const t = labelsFor(hass, config), language = languageFor(hass, config), state = hass?.states?.[entityId];
  if (!available(state) || !numeric(state.state)) return { entityId, status: "unavailable", text: t.powerUnavailable };
  const unit = state.attributes?.unit_of_measurement;
  if (!["W", "kW"].includes(unit)) return { entityId, status: "invalid_unit", text: t.powerUnitError };
  return { entityId, status: "ok", value: Number(state.state), unit, text: formatted(state.state, language, unit === "kW" ? 3 : 1) };
}
export function powerCandidates(hass, selected = []) {
  const ids = Object.values(hass?.states || {}).filter(state =>
    state.entity_id?.startsWith("sensor.") && ["W", "kW"].includes(state.attributes?.unit_of_measurement)
  ).map(state => state.entity_id);
  // Keep a configured sensor selectable even if it is disconnected or its metadata changed.
  return [...new Set([...ids, ...selected.filter(id => typeof id === "string" && id.startsWith("sensor."))])].sort();
}
const HEAT = ["heatPump", "heatPump2", "heatPump3"], COOL = ["compCool1", "compCool2"], AUX = ["auxHeat1", "auxHeat2", "auxHeat3"];
const FAN = ["fan", "ventilator", "economizer"];
const KNOWN = new Set([...HEAT, ...COOL, ...AUX, ...FAN, "humidifier", "dehumidifier", "compHotWater", "auxHotWater", "compWaterHeater"]);
function conflictingEquipment(codes) { return COOL.some(c=>codes.has(c)) && [...HEAT,...AUX].some(c=>codes.has(c)); }
function stage(signals, codes) { return codes.reduce((result, code, index) => signals.has(code) ? index + 1 : result, 0); }
export function cardModel(hass, input) {
  const config = normalizeConfig(input), t = labelsFor(hass, config), language = languageFor(hass, config);
  const managed = managedAutoModel(hass, config);
  const climate = hass?.states?.[config.entity], attr = climate?.attributes || {}, valid = available(climate);
  const reported = valid && typeof attr.equipment_running === "string";
  const signals = new Set(reported ? attr.equipment_running.split(",").map(x => x.trim()).filter(Boolean) : []);
  const unknownCodes = [...signals].filter(x => !KNOWN.has(x));
  const heat = stage(signals, HEAT), cool = stage(signals, COOL), aux = stage(signals, AUX);
  const stageLabel = n => language === "zh" ? `${n} ${t.stage}` : `${t.stage} ${n}`;
  // Aux-heat-only (scheduled or Managed Auto, confirmed by the device) locks the heat pump out: say so instead of a bare "Not running".
  const furnaceOnly = managed?.active ? managed.attributes.device_mode === "auxHeatOnly" && !managed.attributes.heat_pump_window : Boolean(config.aux_switch) && hass?.states?.[config.aux_switch]?.state === "on" && climate?.state === "heat";
  const outdoor = heat || cool ? [heat && `${t.heating} · ${stageLabel(heat)}`, cool && `${t.cooling} · ${stageLabel(cool)}`].filter(Boolean)
    : [reported && !unknownCodes.length ? furnaceOnly ? t.heatPumpLocked : t.notRunning : t.unknown];
  const auxiliary = aux ? `${t.heating} · ${stageLabel(aux)}` : `${t.heating}: ${reported && !unknownCodes.length ? t.notRunning : t.unknown}`;
  let blower = t.unknown;
  if (valid) {
    if (attr.fan === "on" || (attr.fan !== "off" && signals.has("fan"))) blower = t.running;
    else if (aux && (attr.fan === "off" || (reported && !unknownCodes.length))) blower = t.furnaceControlled;
    else if (attr.fan === "off") blower = t.notRunning;
    else if (reported && !unknownCodes.length) blower = t.notRunning;
  }
  const modeConflict = valid && ((climate.state === "cool" && (heat || aux)) || (climate.state === "heat" && cool) || (climate.state === "off" && (heat || cool || aux)));
  const auxState = hass?.states?.[config.aux_switch]?.state;
  let policy = t.unknown, policyIcon = "mdi:help-circle-outline";
  if (valid) {
    switch (climate.state) {
      case "heat":
        policy = !config.aux_switch ? t.heatMode : auxState === "on" ? t.auxOnly : auxState === "off" ? t.normalHeat : t.heatUnknown;
        policyIcon = "mdi:heat-pump-outline"; break;
      case "cool": policy = t.coolMode; policyIcon = "mdi:snowflake"; break;
      case "heat_cool": policy = t.nativeAuto; policyIcon = "mdi:autorenew"; break;
      case "fan_only": policy = t.fanOnly; policyIcon = "mdi:fan"; break;
      case "off": policy = t.off; policyIcon = "mdi:power"; break;
      default: policy = climate.state;
    }
  }
  let summary = "";
  if (!reported) summary = t.unknown;
  else if (unknownCodes.length) summary = t.check;
  else if (!heat && !cool && !aux) summary = blower === t.running || [...signals].some(x => FAN.includes(x)) ? t.fanOnly : signals.size ? t.other : t.idle;
  const unit = hass?.config?.unit_system?.temperature || attr.temperature_unit || "°C";
  const temperature = value => valid && numeric(value) ? `${formatted(value, language)} ${unit}` : "—";
  const preset = valid ? attr.preset_mode : null;
  const comfort = typeof preset === "string" && preset ? ({ home: t.home, away: t.away, sleep: t.sleep }[preset.toLowerCase()] || preset) : t.noData;
  const automation = hass?.states?.[config.automation];
  // One visual "activity" for the hero; each reported source keeps its own stage text.
  const activityParts = [heat && `${t.hpHeating} · ${stageLabel(heat)}`, aux && `${t.auxHeat} · ${stageLabel(aux)}`, cool && `${t.cooling} · ${stageLabel(cool)}`].filter(Boolean);
  const activity = aux ? "aux" : heat ? "heat" : cool ? "cool" : summary === t.fanOnly ? "fan" : summary === t.idle ? "idle" : "unknown";
  const autoTemp = value => temperature(numeric(value) ? (unit === "°F" ? Number(value) * 9 / 5 + 32 : Number(value)) : undefined);
  const heatTarget = managed?.active ? autoTemp(managed.attributes.heat_target_c) : temperature(attr.target_temp_low);
  const coolTarget = managed?.active ? autoTemp(managed.attributes.cool_target_c) : temperature(attr.target_temp_high);
  if (managed?.active) { policy = t.managedAuto; policyIcon = "mdi:autorenew"; }
  const presetIcon = { home: "mdi:home-outline", away: "mdi:account-arrow-right-outline", sleep: "mdi:weather-night" }[String(preset).toLowerCase()] || "mdi:account-clock-outline";
  return {
    mode: valid ? managed?.active ? "heat_cool" : climate.state : "unknown", heatTarget, coolTarget, managed,
    config, t, language, configured: Boolean(config.entity), valid, policy, policyIcon, summary,
    activity: (conflictingEquipment(signals) || modeConflict) ? "unknown" : activity, activityText: (conflictingEquipment(signals) || modeConflict) ? `${t.check} · ${activityParts.join(" + ")}` : activityParts.length ? activityParts.join("  +  ") : summary || t.unknown, presetIcon,
    currentValue: valid && numeric(attr.current_temperature) ? formatted(attr.current_temperature, language) : "—", unit,
    humidity: valid && numeric(attr.current_humidity) ? `${formatted(attr.current_humidity, language, 0)}%` : null,
    auxOnly: config.aux_switch && auxState === "on" && climate?.state === "heat",
    current: temperature(attr.current_temperature), target: climate?.state === "heat_cool" ? `${temperature(attr.target_temp_low)} – ${temperature(attr.target_temp_high)}` : temperature(attr.temperature), comfort,
    outdoor, auxiliary, blower, heat, cool, aux, raw: reported ? attr.equipment_running || t.idle : t.unknown,
    outdoorPower: powerReading(hass, config.heat_pump_power_entity, config), furnacePower: powerReading(hass, config.furnace_power_entity, config),
    automationState: automation?.state, automationAvailable: ["on", "off"].includes(automation?.state),
    settingsPath: settingsPath(hass, config),
    cutoff: config.cutoff_entity ? hass?.states?.[config.cutoff_entity] : null,
  };
}
export function settingsPath(hass, config) {
  if (!config.automation) return null;
  const id = hass?.states?.[config.automation]?.attributes?.id;
  return id ? `/config/automation/edit/${encodeURIComponent(id)}` : "/config/automation";
}
export function scheduleRequest(hass, config, enabled) {
  if (!config.automation?.startsWith("automation.") || !["on", "off"].includes(hass?.states?.[config.automation]?.state)) return null;
  return { domain: "automation", service: enabled ? "turn_on" : "turn_off", data: { entity_id: config.automation } };
}
export function editorSchema(hass, input = {}) {
  const config = normalizeConfig(input), t = labelsFor(hass, config);
  const entity = (name, domain, required = false) => ({ name, required, selector: { entity: { filter: [{ domain }] } } });
  const power = name => ({ name, selector: { entity: { filter: [{ domain: "sensor" }], include_entities: powerCandidates(hass, [config.heat_pump_power_entity, config.furnace_power_entity]) } } });
  return [
    { type: "expandable", name: "", title: t.equipmentSection, expanded: true, flatten: true, schema: [entity("entity", "climate", true), entity("aux_switch", "switch"), entity("automation", "automation"), entity("managed_auto_entity", "switch")] },
    { type: "expandable", name: "", title: t.powerSection, expanded: true, flatten: true, schema: [power("heat_pump_power_entity"), power("furnace_power_entity"), { name: "power_note", selector: { text: {} } }, { name: "heat_pump_energy_scope", selector: { select: { mode: "dropdown", options: ["outdoor_only", "with_blower"].map(value => ({ value, label: t[value] })) } } }] },
    { type: "expandable", name: "", title: t.reportSection, flatten: true, schema: [{ name: "show_runtime_report", selector: { boolean: {} } }, { name: "show_heating_report", selector: { boolean: {} } }, { name: "show_cooling_report", selector: { boolean: {} } }, { name: "show_energy_report", selector: { boolean: {} } }, { name: "energy_integration_method", selector: { select: { mode: "dropdown", options: ["trapezoidal", "left", "right"].map(value => ({ value, label: t[value] })) } } }, { name: "history_gap_minutes", selector: { number: { min: 5, max: 120, step: 1, mode: "box" } } }] },
    { type: "expandable", name: "", title: t.analysisSection, flatten: true, schema: [
      { name: "report_schedule_source", selector: { select: { options: [{ value: "automation", label: t.automationPeriods }, { value: "custom", label: t.customPeriods }] } } },
      ...(config.report_schedule_source === "custom" ? [{ name: "report_start", selector: { time: {} } }, { name: "report_end", selector: { time: {} } }, { name: "report_days", selector: { select: { multiple: true, options: DAYS.map((value, i) => ({ value, label: languageFor(hass,config) === "zh" ? ["周一","周二","周三","周四","周五","周六","周日"][i] : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i] })) } } }] : []),
    ] },
    { type: "expandable", name: "", title: t.displaySection, flatten: true, schema: [
      { name: "language", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: t.autoLanguage }, { value: "en", label: "English" }, { value: "zh", label: "中文" }] } } },
      { name: "name", selector: { text: {} } }, entity("cutoff_entity", "number"), { name: "show_details", selector: { boolean: {} } },
    ] },
  ];
}
// Presentation only: read the installed automation, never create a second control schedule.
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const LOGIC_LABELS = {
  en: {
    title: "Heating source", active: "Enabled", disabled: "Disabled", observation: "Observation only", paused: "Paused", unavailable: "Unverified", scheduledPolicy: "Expected", hours: "Heat-pump hours",
    schedule: "Schedule", heatWindow: "Heat-pump window", auxWindow: "Furnace-only window", next: "Next", until: "until", daily: "Daily",
    expectedHeat: "Heat pump · Furnace backup", expectedAux: "Furnace only", mode: "Device mode",
    match: "Matches schedule", mismatch: "Differs from schedule · Check automation trace", noSwitch: "Furnace-only mode not verified",
    loading: "Reading automation settings…", configUnknown: "Schedule configuration unavailable", unsupported: "This automation is not the supported Blueprint",
    wrongEquipment: "Card and automation equipment differ", invalid: "Invalid schedule configuration", pausedReason: "Source scheduling runs only in Heat mode",
    observationReason: "No source commands in observation mode", disabledReason: "Last source settings remain in place",
    weather: "Outdoor", minimum: "Minimum", weatherUnknown: "ecobee weather unavailable", cutoffUnknown: "Minimum not available",
    above: "Weather above minimum · Heat pump not restricted by this limit", below: "Weather below minimum · Heat pump restricted by this limit",
    stale: "Weather data older than 2 hours · Restriction unverified", weatherSource: "Source: ecobee online weather", updated: "Updated",
    nativeAux: "In Heat pump mode, ecobee can automatically start the furnace (its auxiliary heat) when its thresholds require it. This is the selected heating strategy; live equipment status is shown separately. Temperatures and room sensors follow the ecobee Comfort schedule.",
    configuredCutoff: "Configured minimum", awaitingCutoff: "Minimum differs from configuration · Check trace", verifiedOnly: "Device mode matches; check traces for execution results.",
    in: "in {d}", now: "Now", today: "Today",
  },
  zh: {
    title: "制暖热源", active: "调度启用", disabled: "已停用", observation: "仅观察", paused: "已暂停", unavailable: "待确认", scheduledPolicy: "日程要求", hours: "热泵时段",
    schedule: "日程", heatWindow: "热泵允许时段", auxWindow: "仅炉子时段", next: "下次", until: "至", daily: "每天",
    expectedHeat: "热泵 · 炉子备用", expectedAux: "仅炉子供暖", mode: "设备模式",
    match: "与日程一致", mismatch: "与日程不一致，请查看自动化跟踪", noSwitch: "仅炉子模式待确认",
    loading: "正在读取自动化设置…", configUnknown: "无法读取日程配置", unsupported: "所选自动化不是本项目的蓝图",
    wrongEquipment: "卡片与自动化所选设备不一致", invalid: "日程配置无效", pausedReason: "热源调度仅在 Heat 制暖模式执行",
    observationReason: "观察模式不发送热源命令", disabledReason: "保留最后的热源设置",
    weather: "室外", minimum: "最低外温", weatherUnknown: "ecobee 天气数据不可用", cutoffUnknown: "最低外温不可用",
    above: "天气外温高于阈值，热泵未受此限制", below: "天气外温低于阈值，热泵受此限制",
    stale: "天气数据超过 2 小时，外温限制待确认", weatherSource: "来源：ecobee 网络天气", updated: "更新于",
    nativeAux: "热泵模式下，达到 ecobee 本机阈值时可自动启动炉子（ecobee 称为辅助供暖）。这里显示所选供暖策略，设备实际运行状态单独显示。温度及房间传感器由 ecobee 舒适日程管理。",
    configuredCutoff: "配置最低外温", awaitingCutoff: "最低外温与配置不一致，请查看跟踪", verifiedOnly: "设备模式与日程一致；执行结果请查看跟踪。",
    in: "{d}后", now: "现在", today: "今天",
  },
};
function clockSeconds(value) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const [h, m, s = 0] = value.split(":").map(Number);
  return h < 24 && m < 60 && s < 60 ? h * 3600 + m * 60 + s : null;
}
export function readSchedule(data, config) {
  const bp = data?.use_blueprint;
  if (!/^(?:.*\/)?ecobee_dual_fuel_scheduler(?:_zh)?\.yaml$/.test(bp?.path || "")) return { status: "unsupported" };
  const i = bp.input || {};
  if (i.thermostat !== config.entity || (config.aux_switch && i.aux_switch !== config.aux_switch)) return { status: "wrongEquipment" };
  const start = i.start_time ?? "23:00:00", end = i.end_time ?? "07:00:00", days = i.weekdays ?? DAYS;
  if (clockSeconds(start) === null || clockSeconds(end) === null || start === end || clockSeconds(start) === clockSeconds(end)
    || !Array.isArray(days) || !days.length || days.some(d => !DAYS.includes(d))
    || typeof (i.observation_mode ?? true) !== "boolean" || typeof (i.manage_cutoff ?? false) !== "boolean"
    || ((i.manage_cutoff ?? false) && (!numeric(i.cutoff_f ?? "15") || Number(i.cutoff_f ?? "15") < -25 || Number(i.cutoff_f ?? "15") > 65 || Number(i.cutoff_f ?? "15") % 5 !== 0))) return { status: "invalid" };
  return { status: "ok", start, end, days: [...new Set(days)], observation: i.observation_mode ?? true,
    manageCutoff: i.manage_cutoff ?? false, cutoffF: Number(i.cutoff_f ?? "15"), cutoffEntity: i.cutoff_entity,
    auxSwitch: i.aux_switch };
}
export function reportSchedule(config, context) {
  return config.report_schedule_source === "custom"
    ? { status: "ok", start: config.report_start, end: config.report_end, days: config.report_days, analysisOnly: true }
    : context?.schedule;
}
export function deviceLinks(registry, config, schedule = {}) {
  if (!Array.isArray(registry)) return {};
  const thermostat = registry.find(r => r.entity_id === config.entity && r.platform === "ecobee");
  if (!thermostat?.device_id) return {};
  const same = registry.filter(r => r.platform === "ecobee" && r.device_id === thermostat.device_id);
  const weather = same.filter(r => r.entity_id.startsWith("weather.") && !r.disabled_by);
  const cutoffId = config.cutoff_entity || schedule.cutoffEntity || same.find(r => r.entity_id.startsWith("number.") && r.unique_id?.endsWith("_compressor_protection_min_temp"))?.entity_id;
  return { weatherId: weather.length === 1 ? weather[0].entity_id : undefined,
    cutoffId: same.some(r => r.entity_id === cutoffId) ? cutoffId : undefined,
    auxVerified: same.some(r => r.entity_id === (config.aux_switch || schedule.auxSwitch)),
    cutoffVerified: same.some(r => r.entity_id === schedule.cutoffEntity),
  };
}
export async function loadControlContext(hass, config, cachedRegistry) {
  const id = hass?.states?.[config.automation]?.attributes?.id;
  const [registry, automation] = await Promise.allSettled([
    cachedRegistry ? Promise.resolve(cachedRegistry) : hass.callWS({ type: "config/entity_registry/list" }),
    id ? hass.callApi("GET", `config/automation/config/${encodeURIComponent(id)}`) : Promise.reject(new Error("No automation config ID")),
  ]);
  const schedule = automation.status === "fulfilled" ? readSchedule(automation.value, config) : { status: "configUnknown" };
  const entries = registry.status === "fulfilled" ? registry.value : undefined;
  return { schedule, links: deviceLinks(entries, config, schedule), registry: entries, fetchedAt: Date.now() };
}
export function scheduleAt(schedule, timeZone, now = new Date()) {
  if (schedule?.status !== "ok" || !timeZone) return null;
  let parts;
  try { parts = Object.fromEntries(dateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now).map(p => [p.type, p.value])); }
  catch { return null; }
  const day = DAYS.indexOf(parts.weekday.toLowerCase()), second = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  const start = clockSeconds(schedule.start), end = clockSeconds(schedule.end);
  const active = start < end ? schedule.days.includes(DAYS[day]) && start <= second && second < end
    : second >= start ? schedule.days.includes(DAYS[day]) : second < end && schedule.days.includes(DAYS[(day + 6) % 7]);
  const weekSecond = day * 86400 + second, week = 7 * 86400;
  const boundaries = schedule.days.flatMap(d => {
    const index = DAYS.indexOf(d);
    return [{ time: schedule.start, second: index * 86400 + start, policy: "heat" },
      { time: schedule.end, second: (index * 86400 + end + (start > end ? 86400 : 0)) % week, policy: "aux" }];
  }).map(b => ({ ...b, distance: (b.second - weekSecond + week) % week || week })).sort((a, b) => a.distance - b.distance);
  return { policy: active ? "heat" : "aux", next: boundaries[0], day, second };
}
// Wall-clock heat-pump ranges (seconds) for one local day, for the 24-hour strip only.
export function dayTimeline(schedule, day) {
  const start = clockSeconds(schedule?.start), end = clockSeconds(schedule?.end);
  if (start === null || end === null || !Array.isArray(schedule?.days)) return [];
  const today = schedule.days.includes(DAYS[day]), yesterday = schedule.days.includes(DAYS[(day + 6) % 7]);
  return start < end ? (today ? [[start, end]] : []) : [...(yesterday && end ? [[0, end]] : []), ...(today ? [[start, 86400]] : [])];
}
// Real instant of the next wall-clock boundary; corrects the naive week-second distance across DST.
export function nextBoundaryTime(clock, timeZone, now = new Date()) {
  if (!clock?.next || !timeZone) return null;
  const fmt = dateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const weekSecond = time => { const p = Object.fromEntries(fmt.formatToParts(time).map(x => [x.type, x.value])); return DAYS.indexOf(p.weekday.toLowerCase()) * 86400 + +p.hour * 3600 + +p.minute * 60 + +p.second; };
  let target = now.getTime() + clock.next.distance * 1000;
  for (let i = 0; i < 2; i++) {
    const diff = ((clock.next.second - weekSecond(target)) % 604800 + 604800 + 302400) % 604800 - 302400;
    if (!diff) break;
    target += diff * 1000;
  }
  return target;
}
export function convertedTemperature(value, from, to) {
  if (!numeric(value) || !["°C", "°F"].includes(from) || !["°C", "°F"].includes(to)) return null;
  return from === to ? Number(value) : from === "°F" ? (Number(value) - 32) * 5 / 9 : Number(value) * 9 / 5 + 32;
}
export function logicModel(hass, config, context, now = new Date()) {
  const language = languageFor(hass, config), t = LOGIC_LABELS[language], labels = labelsFor(hass, config);
  const unit = hass?.config?.unit_system?.temperature || "°C", schedule = context?.schedule;
  const links = context?.links || {}, auto = hass?.states?.[config.automation], climate = hass?.states?.[config.entity];
  const clock = scheduleAt(schedule, hass?.config?.time_zone, now);
  const fmt = value => value === null ? "—" : `${formatted(value, language)} ${unit}`;
  const cut = hass?.states?.[links.cutoffId], weather = hass?.states?.[links.weatherId];
  const minimum = available(cut) ? convertedTemperature(cut.state, cut.attributes?.unit_of_measurement, unit) : null;
  const outside = available(weather) ? convertedTemperature(weather.attributes?.temperature, weather.attributes?.temperature_unit, unit) : null;
  const stamp = / at ([\d-]+ [\d:]+) UTC$/.exec(weather?.attributes?.attribution || "")?.[1];
  const weatherDate = stamp ? new Date(stamp.replace(" ", "T") + "Z") : null;
  const stale = weatherDate && Number.isFinite(weatherDate.getTime()) && (now.getTime() - weatherDate.getTime() > 7200000 || weatherDate > new Date(now.getTime() + 300000));
  let weatherTime = "";
  if (weatherDate && Number.isFinite(weatherDate.getTime())) {
    try { weatherTime = dateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", { timeZone: hass?.config?.time_zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(weatherDate); } catch { /* unknown time zone */ }
  }
  const auxId = config.aux_switch || schedule?.auxSwitch;
  const auxState = links.auxVerified ? hass?.states?.[auxId]?.state : undefined;
  const actualPolicy = available(climate) && climate.state === "heat" && ["on", "off"].includes(auxState) ? auxState === "on" ? "aux" : "heat" : null;
  let status = t.unavailable, reason = context ? t[schedule?.status] || t.configUnknown : t.loading, tone = "neutral";
  if (!config.automation) reason = labels.automationHelper;
  else if (auto?.state === "off") { status = t.disabled; reason = t.disabledReason; }
  else if (auto?.state !== "on") reason = labels.scheduleUnknown;
  else if (clock) {
    if (!available(climate)) reason = labels.noData;
    else if (climate.state !== "heat") { status = t.paused; reason = t.pausedReason; }
    else if (schedule.observation) { status = t.observation; reason = t.observationReason; }
    else { status = t.active; reason = actualPolicy ? actualPolicy === clock.policy ? t.match : t.mismatch : t.noSwitch; tone = actualPolicy === clock.policy ? "normal" : "warning"; }
  }
  const cutoffTarget = schedule?.manageCutoff ? convertedTemperature(schedule.cutoffF, "°F", unit) : null;
  const cutoffMismatch = clock?.policy === "heat" && auto?.state === "on" && climate?.state === "heat" && !schedule.observation && schedule?.manageCutoff && (minimum === null || !links.cutoffVerified || links.cutoffId !== schedule.cutoffEntity || Math.abs(minimum - cutoffTarget) >= (unit === "°C" ? 0.15 : 0.27));
  const dayLabels = language === "zh" ? ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const windowText = clock ? `${schedule.start.slice(0, 5)}–${schedule.end.slice(0, 5)} · ${schedule.days.length === 7 ? t.daily : DAYS.filter(d => schedule.days.includes(d)).map(d => dayLabels[DAYS.indexOf(d)]).join(', ')}` : "";
  const nextDay = clock && clock.next.distance >= 86400 ? dayLabels[Math.floor(clock.next.second / 86400)] + " " : "";
  const nextAt = clock ? nextBoundaryTime(clock, hass?.config?.time_zone, now) : null;
  return { t, status, reason, tone, clock, windowText,
    timeline: clock ? dayTimeline(schedule, clock.day) : [], nowFraction: clock ? clock.second / 86400 : null,
    countdown: nextAt && nextAt > now.getTime() ? t.in.replace("{d}", compactRuntimeDuration(nextAt - now.getTime(), language)) : "",
    nextPolicy: clock?.next.policy, below: outside !== null && minimum !== null && !stale && outside < minimum,
    window: clock ? clock.policy === "heat" ? t.heatWindow : t.auxWindow : "",
    expected: clock ? clock.policy === "heat" ? t.expectedHeat : t.expectedAux : "",
    nextLabel: clock ? `${nextDay}${clock.next.time.slice(0, 5)}` : "",
    nextText: clock ? `${t.next} ${nextDay}${clock.next.time.slice(0, 5)} → ${clock.next.policy === 'heat' ? t.expectedHeat : t.expectedAux}` : "",
    outside, minimum, outsideText: fmt(outside), minimumText: fmt(minimum), weatherTime, stale,
    weatherReason: outside === null ? t.weatherUnknown : minimum === null ? t.cutoffUnknown : stale ? t.stale : outside < minimum ? t.below : t.above,
    cutoffMismatch, cutoffTargetText: fmt(cutoffTarget),
    showWeather: Boolean(links.weatherId || links.cutoffId), rawWeather: weather?.attributes?.attribution || "", weatherId: links.weatherId,
  };
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
const BaseElement = globalThis.HTMLElement || class {};
const CSS = `
:host{display:block;font-family:var(--ha-font-family-body,var(--ha-font-family,inherit));color:var(--primary-text-color);
--edf-hp:var(--edf-heat-pump-color,#f5a524);--edf-aux:var(--edf-furnace-color,#ff6a3d);--edf-cool:var(--state-climate-cool-color,#3b9cff);--edf-fan:var(--edf-fan-color,#2bb3a3);--edf-ok:var(--success-color,#3fb27f);--edf-warn:var(--warning-color,#e8a33a);
--edf-surface:color-mix(in srgb,var(--primary-text-color) 4.5%,transparent);--edf-surface-2:color-mix(in srgb,var(--primary-text-color) 8%,transparent);--edf-line:color-mix(in srgb,var(--primary-text-color) 10%,transparent);--edf-muted:var(--secondary-text-color);--edf-r:18px}
ha-card{overflow:hidden;border-radius:var(--ha-card-border-radius,24px);container:edf/inline-size}
.wrap{padding:22px}.grid{display:grid;gap:18px;min-width:0}[hidden]{display:none!important}.col{display:flex;flex-direction:column;gap:14px;min-width:0}
.kind-heat{--k:var(--edf-hp)}.kind-aux{--k:var(--edf-aux)}.kind-cool{--k:var(--edf-cool)}.kind-fan{--k:var(--edf-fan)}.kind-idle,.kind-unknown{--k:var(--edf-muted)}
.hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.hero-text{min-width:0}.eyebrow{font-size:13px;color:var(--edf-muted);letter-spacing:.2px}
.temp{display:flex;align-items:flex-start;line-height:1;margin:6px 0 12px;font-variant-numeric:tabular-nums}.temp-value{font-size:58px;font-weight:600;letter-spacing:-2.5px}.temp-unit{font-size:20px;font-weight:500;color:var(--edf-muted);margin:8px 0 0 4px}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 10px 5px 8px;background:var(--edf-surface-2);font-size:12px;font-weight:500;white-space:nowrap}.chip ha-icon{--mdc-icon-size:15px;color:var(--edf-muted)}
.orb{flex:none;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;color:var(--k);background:radial-gradient(circle at 32% 28%,color-mix(in srgb,var(--k) 34%,transparent),color-mix(in srgb,var(--k) 10%,transparent) 70%);border:1px solid color-mix(in srgb,var(--k) 32%,transparent)}.orb ha-icon{--mdc-icon-size:30px}
.orb.live{animation:edf-glow 2.6s ease-in-out infinite}.orb.kind-aux.live ha-icon{animation:edf-flicker 1.8s ease-in-out infinite}.orb.kind-fan.live ha-icon{animation:edf-spin 2.4s linear infinite}
.activity{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:600;color:var(--primary-text-color)}.activity .dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--k)}.activity.live .dot{box-shadow:0 0 0 4px color-mix(in srgb,var(--k) 22%,transparent)}.activity.kind-idle,.activity.kind-unknown{font-weight:500;color:var(--edf-muted)}
.panel{border-radius:var(--edf-r);background:var(--edf-surface);border:1px solid var(--edf-line);padding:14px 16px}
.source-head{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;color:var(--edf-muted);text-transform:uppercase;letter-spacing:.6px;font-weight:500}
.pill{display:inline-flex;align-items:center;gap:6px;text-transform:none;letter-spacing:0;font-size:12px;border-radius:999px;padding:3px 10px;background:var(--edf-surface-2);color:var(--edf-muted);white-space:nowrap}.pill i{width:7px;height:7px;border-radius:50%;background:currentColor}.pill.normal{color:color-mix(in srgb,var(--edf-ok) 65%,var(--primary-text-color));background:color-mix(in srgb,var(--edf-ok) 14%,transparent)}.pill.warning{color:color-mix(in srgb,var(--edf-warn) 50%,var(--primary-text-color));background:color-mix(in srgb,var(--edf-warn) 18%,transparent)}.pill.normal i{background:var(--edf-ok)}.pill.warning i{background:var(--edf-warn)}
.source-main{display:flex;align-items:center;gap:10px;margin:10px 0 2px;font-size:18px;font-weight:600;line-height:1.3}.source-main ha-icon{--mdc-icon-size:22px;color:var(--k)}
.timeline{margin:14px 0 4px}.track{position:relative;height:10px;border-radius:999px;background:color-mix(in srgb,var(--edf-aux) 30%,transparent);overflow:visible}.seg{position:absolute;top:0;bottom:0;background:var(--edf-hp);border-radius:999px}.now{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1.5px;border-radius:2px;background:var(--primary-text-color);box-shadow:0 0 0 2px color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#000)) 70%,transparent)}
.ticks{display:flex;justify-content:space-between;font-size:10px;color:var(--edf-muted);margin-top:6px;font-variant-numeric:tabular-nums}
.legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--edf-muted);margin-top:8px}.legend span{display:inline-flex;align-items:center;gap:6px}.legend i{width:9px;height:9px;border-radius:3px;background:var(--edf-hp)}.legend i.aux{background:color-mix(in srgb,var(--edf-aux) 55%,transparent)}
.line{display:flex;align-items:flex-start;gap:7px;font-size:13px;line-height:1.45;margin-top:8px}.line ha-icon{--mdc-icon-size:16px;color:var(--edf-muted);margin-top:1px;flex:none}.countdown{color:var(--edf-muted);white-space:nowrap}
.sub{font-size:12px;color:var(--edf-muted);margin-top:6px;line-height:1.5}.sub.error{color:var(--error-color)}.sub.warn{display:flex;align-items:center;gap:6px;font-weight:600;color:color-mix(in srgb,var(--edf-warn) 55%,var(--primary-text-color));background:color-mix(in srgb,var(--edf-warn) 14%,transparent);border-radius:10px;padding:7px 10px}.sub.warn ha-icon{--mdc-icon-size:16px;flex:none}
.pulse{flex:none;display:flex;flex-direction:column;align-items:center;gap:8px;max-width:180px;text-align:center}.orb-label{font-size:12.5px;font-weight:600;line-height:1.35;color:color-mix(in srgb,var(--k) 45%,var(--primary-text-color))}.pulse.kind-unknown .orb-label{color:var(--edf-muted);font-weight:500}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.chip.range .dash{color:var(--edf-muted);margin:0 -1px}.chip.range ha-icon:first-child{color:var(--edf-aux)}.chip.range ha-icon:last-child{color:var(--edf-cool)}
.recent{border-top:1px solid var(--edf-line);padding-top:18px;margin-bottom:6px}.recent-head{font-size:12px;color:var(--edf-muted);text-transform:uppercase;letter-spacing:.6px;font-weight:500;margin-bottom:10px}.recent-track{position:relative;height:12px;border-radius:999px;background:var(--edf-surface-2);overflow:hidden}.recent-track span{position:absolute;top:0;bottom:0}.r-heat{background:var(--edf-hp)}.r-aux{background:var(--edf-aux)}.r-cool{background:var(--edf-cool)}.r-fan{background:color-mix(in srgb,var(--edf-fan) 60%,transparent)}.recent-track .r-gap{background:repeating-linear-gradient(135deg,transparent 0 4px,color-mix(in srgb,var(--primary-text-color) 12%,transparent) 4px 6px)}.recent .legend i.r-heat{background:var(--edf-hp)}.recent .legend i.r-aux{background:var(--edf-aux)}.recent .legend i.r-cool{background:var(--edf-cool)}.recent .legend i.r-fan{background:var(--edf-fan)}
.report-more{display:block;width:100%;margin:2px 0 6px;padding:9px;border:1px dashed var(--edf-line);border-radius:12px;background:transparent;color:var(--edf-muted);font:inherit;font-size:12.5px;cursor:pointer}.report-more:hover{background:var(--edf-surface);color:var(--primary-text-color)}.period-dates{white-space:nowrap}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.stat{border-radius:12px;background:var(--edf-surface-2);padding:8px 11px;min-width:0}.stat-label{font-size:11px;color:var(--edf-muted)}.stat-value{font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:1px}.stat.below .stat-value{color:var(--edf-cool)}
.equipment{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tile{border-radius:var(--edf-r);border:1px solid var(--edf-line);background:var(--edf-surface);padding:14px;min-width:0;display:flex;flex-direction:column;gap:8px;transition:background .3s,border-color .3s}.tile.live{background:color-mix(in srgb,var(--k) 11%,transparent);border-color:color-mix(in srgb,var(--k) 30%,transparent)}
.tile-head{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;line-height:1.3;min-width:0}.bubble{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--edf-surface-2);color:var(--edf-muted)}.bubble ha-icon{--mdc-icon-size:19px}.tile.live .bubble{background:color-mix(in srgb,var(--k) 22%,transparent);color:var(--k)}
.tile-row{display:flex;align-items:center;gap:6px;font-size:12px;line-height:1.4;color:var(--edf-muted);min-width:0}.tile-row ha-icon{--mdc-icon-size:15px;flex:none}.tile-row.on{color:var(--primary-text-color);font-weight:500}.tile-row.on ha-icon{color:var(--k)}.tile-row.spin ha-icon{animation:edf-spin 2.4s linear infinite;color:var(--edf-fan)}
.power{margin-top:auto;padding:0;border:0;background:none;color:inherit;font:inherit;font-size:26px;font-weight:600;letter-spacing:-.6px;text-align:left;cursor:pointer;font-variant-numeric:tabular-nums;line-height:1.1}.power small{font-size:12px;font-weight:500;color:var(--edf-muted);letter-spacing:0;margin-left:2px}.power:hover{opacity:.8}.power-error{margin-top:auto;font-size:12px;color:var(--edf-muted)}
.sampling{font-size:11px;color:var(--edf-muted);margin-top:-4px}
.notice{font-size:12px;line-height:1.5;border-radius:12px;padding:10px 12px;background:color-mix(in srgb,var(--edf-warn) 14%,transparent)}.error{color:var(--error-color)}.notice.error{background:color-mix(in srgb,var(--error-color,#db4437) 14%,transparent)}
details{color:var(--edf-muted);font-size:12px;line-height:1.6}summary{cursor:pointer;font-size:12px;list-style:none;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:var(--edf-surface)}summary::-webkit-details-marker{display:none}summary:before{content:'';width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform .2s}details[open] summary:before{transform:rotate(45deg)}details p{margin:10px 0}
button:focus-visible,summary:focus-visible{outline:2px solid var(--primary-color);outline-offset:3px}
.controls{border-top:1px solid var(--edf-line);padding:12px 22px;display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between}.toggles{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px;min-width:0}.toggle small{display:block;font-size:11px;font-weight:400;color:var(--edf-muted);line-height:1.35}.toggle small.tone-warning{color:color-mix(in srgb,var(--edf-warn) 50%,var(--primary-text-color))}.toggle small.tone-pending{color:color-mix(in srgb,var(--primary-color,#03a9f4) 70%,var(--primary-text-color))}.toggle small.tone-error{color:color-mix(in srgb,var(--error-color,#db4437) 70%,var(--primary-text-color))}.toggle{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500}.settings{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;font-weight:500;border:0;background:var(--edf-surface-2);border-radius:999px;padding:8px 14px;color:var(--primary-text-color);cursor:pointer;white-space:nowrap}.settings ha-icon{--mdc-icon-size:16px;color:var(--edf-muted)}.settings:hover{background:color-mix(in srgb,var(--primary-text-color) 12%,transparent)}
.runtime-report{border-top:1px solid var(--edf-line);padding-top:18px;min-width:0}.report-head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:16px;font-weight:600;margin-bottom:12px}.report-title{display:inline-flex;align-items:center;gap:8px}.report-title ha-icon{--mdc-icon-size:20px;color:var(--edf-muted)}.report-badge{font-size:11px;font-weight:500;color:var(--edf-muted);border-radius:999px;padding:3px 9px;background:var(--edf-surface-2);white-space:nowrap}
.runtime-table tbody tr>th:first-child{box-shadow:inset 3px 0 0 var(--w);padding-left:10px}.runtime-table tr.win-heat{--w:var(--edf-hp)}.runtime-table tr.win-aux{--w:var(--edf-aux)}.runtime-table tr.neutral.win-heat{--w:color-mix(in srgb,var(--primary-text-color) 45%,transparent)}.runtime-table tr.neutral.win-aux{--w:color-mix(in srgb,var(--primary-text-color) 15%,transparent)}.period-window{display:block;font-size:10.5px;margin-top:3px;color:color-mix(in srgb,var(--w) 70%,var(--primary-text-color))}
.runtime-table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0 8px;table-layout:fixed}.runtime-table th,.runtime-table td{padding:11px 5px;border-bottom:1px solid var(--edf-line);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;vertical-align:middle}.runtime-table th:first-child{text-align:left;width:31%;white-space:normal;padding-left:2px}.runtime-table.with-energy th:last-child{width:15%}
.runtime-table thead th{font-size:11px;color:var(--edf-muted);font-weight:500;padding-top:10px;padding-bottom:8px}.col-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:1px;background:var(--edf-hp)}.col-dot.aux{background:var(--edf-aux)}
.runtime-line{display:flex;justify-content:space-between;align-items:baseline;gap:4px;line-height:1.55}.runtime-label{font-size:10px;color:var(--edf-muted);font-weight:400}.runtime-total{font-weight:650;font-size:14px;margin-bottom:2px}.runtime-stage{font-size:11px;color:var(--edf-muted)}
.runtime-bar{display:flex;height:4px;border-radius:999px;background:var(--edf-surface-2);overflow:hidden;margin:4px 0 3px}.runtime-bar i{display:block;height:100%}.runtime-bar.heat i{background:var(--edf-hp)}.runtime-bar.aux i{background:var(--edf-aux)}.runtime-bar i.s2{opacity:.6}.runtime-bar i.s3{opacity:.35}
.period-dates{display:block;font-size:12px;font-weight:600}.period-times{display:block;font-size:11px;color:var(--edf-muted);margin-top:3px}.period-progress{display:inline-block;font-size:10px;font-weight:600;color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 15%,transparent);border-radius:999px;padding:1px 7px;margin-top:5px}
.runtime-table tbody th{font-weight:500}.runtime-table tr:last-child th,.runtime-table tr:last-child td{border-bottom:0}.runtime-table .energy-cell{color:var(--primary-text-color);font-weight:650;font-size:14px}.runtime-table sup{font-size:9px;vertical-align:super;color:var(--edf-muted);margin-left:1px}.report-empty{color:var(--edf-muted);opacity:.5}
.report-note{font-size:11px;color:var(--edf-muted);line-height:1.5;margin:8px 0}.report-note.warn{color:color-mix(in srgb,var(--edf-warn) 50%,var(--primary-text-color))}.runtime-report details{margin-top:6px}.coverage-list{padding-left:16px;font-size:11px}
.native-mode{display:flex;gap:12px;align-items:center;padding:16px 0;margin-bottom:16px;border-bottom:1px solid var(--divider-color)}.native-mode>ha-icon{color:var(--k,var(--primary-color));--mdc-icon-size:28px}.native-mode .sub{margin-top:4px}
.activity-tabs button[data-report-activity=heating][aria-pressed=true]{border-color:var(--edf-hp)}.activity-tabs button[data-report-activity=cooling][aria-pressed=true]{border-color:var(--edf-cool)}
.pill.error{color:color-mix(in srgb,var(--error-color,#db4437) 70%,var(--primary-text-color));background:color-mix(in srgb,var(--error-color,#db4437) 14%,transparent)}.pill.error i{background:var(--error-color,#db4437)}
.pill.pending{color:color-mix(in srgb,var(--primary-color,#03a9f4) 70%,var(--primary-text-color));background:color-mix(in srgb,var(--primary-color,#03a9f4) 12%,transparent)}
.pill.pending i{background:var(--primary-color,#03a9f4)}.source-main{flex-wrap:wrap}.source-main .device-mode{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;border-radius:999px;padding:4px 10px 4px 8px;background:color-mix(in srgb,var(--primary-color) 12%,transparent);white-space:nowrap}.source-main .device-mode ha-icon{--mdc-icon-size:15px;color:var(--primary-color)}
.band{margin:14px 0 4px}.band-track{position:relative;height:10px;border-radius:999px;background:var(--edf-surface-2);overflow:visible}.band-aux,.band-cool{position:absolute;top:0;bottom:0}.band-aux{left:0;border-radius:999px 0 0 999px;background:color-mix(in srgb,var(--edf-aux) 55%,transparent)}.band-cool{right:0;border-radius:0 999px 999px 0;background:color-mix(in srgb,var(--edf-cool) 55%,transparent)}.band.native .band-aux,.band.native .band-cool{opacity:.45}.band-now{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1.5px;border-radius:2px;background:var(--primary-text-color);box-shadow:0 0 0 2px color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#000)) 70%,transparent)}
.band-labels{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--edf-muted);margin:7px 0 2px;font-variant-numeric:tabular-nums}.band-labels .aux{color:color-mix(in srgb,var(--edf-aux) 80%,var(--primary-text-color))}.band-labels .cool{color:color-mix(in srgb,var(--edf-cool) 80%,var(--primary-text-color));text-align:right}.band.zone-aux .band-labels .aux,.band.zone-cool .band-labels .cool{font-weight:650}
.activity-tabs{display:flex;gap:18px;margin:10px 0 14px}.activity-tabs button{border:0;border-bottom:2px solid transparent;background:none;color:var(--edf-muted);font:inherit;padding:8px 0;cursor:pointer}.activity-tabs button[aria-pressed=true]{color:var(--primary-text-color);border-color:var(--primary-color);font-weight:650}.runtime-bar.cool i,.col-dot.cool{background:var(--info-color,#38bdf8)}
@keyframes edf-glow{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--k) 35%,transparent)}50%{box-shadow:0 0 0 10px transparent}}@keyframes edf-spin{to{transform:rotate(360deg)}}@keyframes edf-flicker{0%,100%{transform:scale(1)}50%{transform:scale(1.08) translateY(-1px)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@container edf (min-width:760px){.wrap{padding:26px 28px}.grid{grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:28px;align-items:start}.grid.single{grid-template-columns:minmax(0,1fr)}.runtime-report,.recent{border-top:0;padding-top:0}.recent+.runtime-report{border-top:1px solid var(--edf-line);padding-top:18px}.temp-value{font-size:64px}.controls{padding:12px 28px}}
@container edf (max-width:420px){.wrap{padding:18px}.temp-value{font-size:50px}.orb{width:56px;height:56px}.equipment{gap:10px}.tile{padding:12px}.power{font-size:23px}.runtime-table{font-size:12px}.runtime-table th,.runtime-table td{padding:10px 3px}.runtime-table thead th{font-size:10px}.col-dot{display:none}.controls{padding:12px 18px;gap:8px}.settings{max-width:50%;white-space:normal}}
`;
// Runtime estimates use equipment reports, never watts, HVAC mode, or fan state.
const REPORT_LABELS = {
  en: { totalLabel: "Total", stage1: "Stage 1", stage2: "Stage 2", stageNote: "Stage times are exclusive: the highest reported stage of each heat source is counted once. Totals include all reported stages. Partial-history markers apply to all three lines; missing records are not zero.", stage3Note: "Stage 3 was reported in this view. Its time is included in Total, but not Stage 1 or Stage 2.", daily: "By schedule", chooseWindow: "Report window", auxTab: "Furnace-only hours", auxColumn: "Furnace", energy: "kWh ≈", energyNote: "kWh ≈ Heat pump running, incl. blower · Estimated from power", auxEnergyNote: "kWh ≈ Furnace running · Estimated from power", noEnergySource: "No power sensor selected for this circuit", auxEnergyDetails: "Counts furnace-circuit electricity (controls, igniter and blower) only while ecobee reports the furnace running during furnace-only hours. Fan-only, ventilation and standby are excluded. It is electricity, not gas use or delivered heat. Integration uses historical W/kW, never current watts multiplied by runtime. Gaps, missing endpoints and times without a known ecobee status are excluded; * means a partial sum, not a complete period total.", energyDetails: "Counts electricity only while ecobee reports the heat pump running (heating or cooling) during heat-pump hours: the heat-pump circuit plus the furnace circuit, which then powers the blower. Standby, fan-only and ventilation are excluded; if the furnace also runs, the furnace circuit goes to the furnace. Integration uses historical W/kW, never current watts multiplied by runtime. Gaps, missing endpoints and times without a known ecobee status are excluded; * means a partial sum, not a complete period total.", noBlowerEnergy: "No furnace power sensor is selected, so blower electricity is not included.", energyUnavailable: "Power history unavailable", method: "Integration", date: "Period", shortHeat: "HP", shortAux: "Furnace", today: "In progress", partial: "* Partial history · — No history", dailyNote: "Each row is one continuous schedule period, shown with its start and end in the HA time zone. Overnight periods stay together. The latest seven started periods are shown for each window; the current period runs through the last refresh. Skipped weekdays remain part of one continuous furnace-only period.", title: "Last 7 days", heatWindow: "Heat-pump hours", auxWindow: "Furnace-only hours", window: "Schedule window", heat: "Heat pump", aux: "Furnace", loading: "Loading runtime history…", unavailable: "Runtime history unavailable", needsSchedule: "Select a supported schedule to group runtime.", noData: "No usable equipment history", recorded: "Recorded", missing: "Missing / uncertain", basis: "Heating runtime estimates · Grouped by current schedule", details: "Report details", note: "Uses ecobee equipment reports, not power or blower activity. Current schedule settings are applied to the entire period, including times the automation was disabled or configured differently. Missing records are not counted as zero runtime.", gap: "Intervals between records longer than {minutes} minutes are excluded, as outages cannot be distinguished from unchanged states. Short outages and cloud polling delays can still affect estimates.", failed: "Check History / Recorder access and retention for the selected thermostat.", through: "Through", h: "h", m: "min", underMinute: "<1 min", share: "Running {p}% of recorded time", showAll: "Show all {n} periods", showRecent: "Show recent periods", stale: "Refresh failed · Showing data from {time}" },
  zh: { totalLabel: "总计", stage1: "一级", stage2: "二级", stageNote: "各级时长互不重叠：每个热源按当时报告的最高级数计时。总计包含所有级数；历史不完整标记适用于三行，缺失不当作零运行。", stage3Note: "当前视图包含三级运行记录，其时长计入总计，不计入一级或二级。", daily: "按日程时段", chooseWindow: "报告时段", auxTab: "仅炉子时段", auxColumn: "炉子", energy: "kWh ≈", energyNote: "kWh ≈ 热泵运行（含送风机）· 根据历史功率估算", auxEnergyNote: "kWh ≈ 炉子运行 · 根据历史功率估算", noEnergySource: "未选择该电路的功率传感器", auxEnergyDetails: "只统计仅炉子时段内 ecobee 报告炉子运行期间的炉子电路用电（控制板、点火和送风机）；单独送风、通风和待机不计入。这是用电量，不是燃气用量或供热量。使用历史 W／kW 积分，不用当前功率乘运行时长。缺失区间、缺少端点及 ecobee 状态未知的时间不计入；星号表示部分记录的电量之和，并非完整时段总量。", energyDetails: "只统计热泵时段内 ecobee 报告热泵运行（制暖或制冷）期间的用电：热泵电路，加上此时为送风机供电的炉子电路。待机、单独送风和通风不计入；炉子同时运行时，炉子电路计入炉子。使用历史 W／kW 积分，不用当前功率乘运行时长。缺失区间、缺少端点及 ecobee 状态未知的时间不计入；星号表示部分记录的电量之和，并非完整时段总量。", noBlowerEnergy: "未选择炉子功率传感器，因此不含送风机用电。", energyUnavailable: "功率历史不可用", method: "积分方式", date: "时段", shortHeat: "热泵", shortAux: "炉子", today: "进行中", partial: "* 历史不完整 · — 无记录", dailyNote: "每行对应一次连续日程时段，显示 HA 时区的起止时间；跨夜不拆分。两个时段分别显示最近开始的七次，进行中的时段统计到上次刷新。未启用热泵的日期并入连续的炉子时段。", title: "最近 7 天", heatWindow: "热泵时段", auxWindow: "仅炉子时段", window: "日程时段", heat: "热泵", aux: "炉子", loading: "正在读取运行历史…", unavailable: "运行历史不可用", needsSchedule: "请选择支持的热源日程，以便按时段统计。", noData: "暂无可用的设备运行历史", recorded: "已记录", missing: "缺失／待确认", basis: "制暖运行时间估算 · 按当前日程分组", details: "统计说明", note: "依据 ecobee 设备运行记录，不使用功率或风机状态。整个统计周期按当前日程划分，包括自动化停用或日程配置不同的时间。缺失记录不计为零运行。", gap: "相邻记录超过 {minutes} 分钟的区间不计入，因为无法区分停机与状态长时间未变化。短时中断和云端更新延迟仍会影响估算。", failed: "请检查所选温控器的 History／Recorder 访问权限及历史保留设置。", through: "截至", h: "小时", m: "分", underMinute: "不足 1 分钟", share: "运行时间占已记录时长的 {p}%", showAll: "显示全部 {n} 个时段", showRecent: "只看最近时段", stale: "刷新失败 · 显示 {time} 的数据" },
};
Object.assign(REPORT_LABELS.en, {
  heating: "Heating", cooling: "Cooling", coolingTitle: "Cooling report", heatingTitle: "Heating report", runtimeTitle: "Runtime report", otherPeriod: "Other hours", firstPeriod: "Selected hours",
  activityEnergy: "kWh ≈ Selected circuits · Active equipment only", fanEnergy: "Fan-only electricity", energyMissing: "One selected circuit is unavailable; this is a partial sum.",
  circuitHeatPump: "Heat-pump circuit", circuitFurnace: "Indoor / furnace circuit", circuitScope: "Measured circuits",
  activityDetails: "Heating and cooling are counted separately in both periods. Only selected circuits are included. With the indoor circuit enabled, heating includes furnace heating and heat-pump blower electricity. Shared indoor power is assigned once. Fan-only electricity is listed separately; standby and unknown activity are excluded. These are electrical inputs, not gas consumption or delivered heat. * marks partial history; combined coverage is the intersection of the selected circuits' actual intervals.",
  basis: "Equipment runtime estimates · Grouped by current analysis periods", dailyNote: "Each row is one continuous period in the HA time zone. Overnight periods stay together. Seven started periods are shown per window; unselected weekdays remain in the other continuous period. These periods group history and do not restrict cooling.",
});
Object.assign(REPORT_LABELS.zh, {
  heating: "制暖", cooling: "制冷", coolingTitle: "制冷报告", heatingTitle: "制暖报告", runtimeTitle: "运行报告", otherPeriod: "其余时段", firstPeriod: "所选时段",
  activityEnergy: "kWh ≈ 所选电路 · 仅设备运行期间", fanEnergy: "单独送风用电", energyMissing: "一路所选电路不可用，当前为部分电量之和。",
  circuitHeatPump: "热泵电路", circuitFurnace: "室内机／炉子电路", circuitScope: "监测电路",
  activityDetails: "两个时段均分别统计制暖和制冷。仅计入所选范围的电路；包含室内电路时，制暖电量含炉子制暖和热泵送风用电。室内电路只归属一次，单独送风另列；待机及未知活动不计入。这是电耗，不是燃气用量或供热量。星号表示历史不完整，共同覆盖取所选电路实际有效区间的交集。",
  basis: "设备运行时间估算 · 按当前分析时段分组", dailyNote: "每行是 HA 时区内的一次连续时段，跨夜不拆分。每个窗口显示最近开始的七次；未选择的日期并入其余连续时段。时段仅用于统计，不限制制冷。",
});
function dateKey(parts) { return `${parts.year}-${parts.month}-${parts.day}`; }
function dateParts(time, timeZone) {
  return Object.fromEntries(dateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(time).map(p => [p.type, p.value]));
}
const periodCache = new Map();
const DEFAULT_REPORT_SCHEDULE = { status: "ok", start: "23:00:00", end: "07:00:00", days: DAYS };
// A period is one continuous schedule state, including across midnight and skipped weekdays.
// Scan actual UTC minutes and explicit schedule seconds so repeated/skipped DST hours follow
// the same wall-clock predicate as the controller. Cache the result for runtime and energy.
export function schedulePeriods(schedule, timeZone, end) {
  const from = clockSeconds(schedule?.start), until = clockSeconds(schedule?.end);
  if (!timeZone || !Number.isFinite(end) || schedule?.status !== "ok" || from === null || until === null || from === until || !schedule.days?.length || schedule.days.some(d => !DAYS.includes(d))) throw new Error("Invalid schedule period inputs");
  const key = JSON.stringify([schedule.start, schedule.end, schedule.days, timeZone, end]);
  if (periodCache.has(key)) return periodCache.get(key);
  const fmt = dateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const boundaries = [...new Set([0, from % 60, until % 60])].sort((a,b)=>a-b);
  const lookback = (Math.ceil(8 * 7 / new Set(schedule.days).size) + 8) * 86400000;
  const begin = Math.floor((end - lookback) / 60000) * 60000;
  const periods = { heat: [], aux: [] };
  let active = null;
  for (let cursor = begin; cursor <= end + 8 * 86400000;) {
    const p = Object.fromEntries(fmt.formatToParts(cursor).map(p=>[p.type,p.value]));
    const day = DAYS.indexOf(p.weekday.toLowerCase()), second = +p.hour*3600 + +p.minute*60 + +p.second;
    const inHeat = from < until ? schedule.days.includes(DAYS[day]) && from <= second && second < until : second >= from ? schedule.days.includes(DAYS[day]) : second < until && schedule.days.includes(DAYS[(day+6)%7]);
    const kind = inHeat ? "heat" : "aux";
    if (!active || active.kind !== kind) {
      if (active) {
        active.end = cursor;
        if (active.start > begin && active.start <= end) periods[active.kind].push(active);
        if (cursor > end) break;
      }
      active = { id: `${kind}:${cursor}`, kind, start: cursor, end: null };
    }
    const base = Math.floor(cursor/60000)*60000;
    cursor = boundaries.map(s=>base+s*1000).find(t=>t>cursor) ?? base+60000;
  }
  const result = Object.fromEntries(Object.entries(periods).map(([kind, list])=>[kind,list.slice(-7)]));
  if (result.heat.length !== 7 || result.aux.length !== 7) throw new Error("Could not resolve seven schedule periods");
  if (periodCache.size >= 8) periodCache.delete(periodCache.keys().next().value);
  periodCache.set(key, result);
  return result;
}
export function runtimePeriodStart(end, timeZone, schedule = DEFAULT_REPORT_SCHEDULE) {
  const periods = schedulePeriods(schedule, timeZone, end);
  return Math.min(periods.heat[0].start, periods.aux[0].start);
}
function emptyRuntimeRows() { return { heat: { total: 0, recorded: 0, heat: 0, aux: 0, cool: 0, fan: 0, idle: 0 }, aux: { total: 0, recorded: 0, heat: 0, aux: 0, cool: 0, fan: 0, idle: 0 } }; }
export function compactRuntimeDuration(ms, language = "en") {
  const minutes = Math.floor(ms / 60000), hours = Math.floor(minutes / 60), h = language === "zh" ? "时" : "h", m = language === "zh" ? "分" : "m";
  if (ms > 0 && ms < 60000) return `<1${m}`;
  return hours ? `${hours}${h}${minutes % 60 ? ` ${minutes % 60}${m}` : ''}` : `${minutes}${m}`;
}
export function runtimeDuration(ms, language = "en") {
  const t = REPORT_LABELS[language];
  if (ms > 0 && ms < 60000) return t.underMinute;
  const minutes = Math.floor(ms / 60000), hours = Math.floor(minutes / 60);
  return hours ? `${hours} ${t.h} ${minutes % 60} ${t.m}` : `${minutes} ${t.m}`;
}
function historyRecord(record) {
  const raw = record.lu ?? record.last_updated ?? record.lc ?? record.last_changed;
  const time = typeof raw === "number" ? raw * 1000 : Date.parse(raw);
  return { time, state: record.s ?? record.state, attributes: record.a ?? record.attributes };
}
export function runtimeReport(records, schedule, timeZone, start, end, gapMinutes = 15) {
  if (!Array.isArray(records) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end-start > 70*86400000 || !Number.isFinite(gapMinutes) || gapMinutes < 5 || gapMinutes > 120) throw new Error("Invalid runtime report inputs");
  const windows = schedulePeriods(schedule, timeZone, end), rows = emptyRuntimeRows();
  const ordered = records.map(historyRecord).filter(r=>Number.isFinite(r.time) && r.time<=end).sort((a,b)=>a.time-b.time);
  const points = ordered.filter((r,i)=>i===ordered.length-1 || r.time!==ordered[i+1].time);
  const periods = {};
  for (const kind of ["heat", "aux"]) {
    periods[kind] = windows[kind].filter(p=>p.end>start && p.start<=end).map(p=>({ ...p, observedEnd: Math.min(end,p.end), inProgress: p.end>end,
      total: Math.max(0,Math.min(end,p.end)-p.start), recorded:0, heat:0, aux:0, cool:0, fan:0, idle:0, stages:{heat:[0,0,0],aux:[0,0,0],cool:[0,0]} }));
    for (const p of periods[kind]) {
      for (let i=0;i<points.length;i++) {
        const record = points[i], next = points[i+1]?.time ?? end;
        const duration = Math.min(p.observedEnd,next)-Math.max(start,p.start,record.time);
        if (duration<=0 || next-record.time>gapMinutes*60000) continue;
        const equipment = record.attributes?.equipment_running;
        const signals = typeof equipment === "string" ? equipment.split(",").map(s=>s.trim()).filter(Boolean) : null;
        if (["unknown","unavailable"].includes(record.state) || record.attributes?.restored || !signals || !signals.every(s=>KNOWN.has(s))) continue;
        const codes = new Set(signals);
        if (conflictingEquipment(codes)) continue;
        p.recorded += duration;
        if (![...HEAT,...AUX,...COOL].some(c=>codes.has(c))) {
          if (FAN.some(c=>codes.has(c))) p.fan += duration;
          else if (!codes.size) p.idle += duration;
        }
        for (const [source, known] of [["heat",HEAT],["aux",AUX],["cool",COOL]]) {
          const level = stage(codes,known);
          if (level) { p[source] += duration; p.stages[source][level-1] += duration; }
        }
      }
      p.missing = p.total-p.recorded;
      for (const field of ["total","recorded","heat","aux","cool","fan","idle"]) rows[kind][field] += p[field];
    }
    periods[kind].reverse();
    rows[kind].missing = rows[kind].total-rows[kind].recorded;
  }
  return {start,end,rows,periods,recorded:rows.heat.recorded+rows.aux.recorded,missing:rows.heat.missing+rows.aux.missing,gapMinutes};
}
// Combine a cached history with a newer slice: newer records win, anything before keepFrom is dropped.
export function mergeHistory(cached, fresh, keepFrom) {
  const byTime = new Map();
  for (const record of [...(cached || []), ...(fresh || [])]) {
    const time = historyRecord(record).time;
    if (Number.isFinite(time) && time >= keepFrom) byTime.set(time, record);
  }
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, record]) => record);
}
// Actual equipment activity over the last 24 hours, merged into contiguous segments.
export function recentActivity(records, end, gapMinutes = 15, span = 86400000) {
  const from = end - span, totals = { heat: 0, aux: 0, cool: 0, fan: 0, idle: 0 }, segments = [];
  for (const interval of equipmentIntervals(records, end, gapMinutes)) {
    const start = Math.max(from, interval.start), stop = Math.min(end, interval.end);
    if (stop <= start) continue;
    const c = interval.codes, kind = furnaceRunning(c) ? "aux" : HEAT.some(x => c.has(x)) ? "heat" : COOL.some(x => c.has(x)) ? "cool" : FAN.some(x => c.has(x)) ? "fan" : "idle";
    totals[kind] += stop - start;
    const last = segments[segments.length - 1];
    if (last && last.kind === kind && last.end === start) last.end = stop; else segments.push({ start, end: stop, kind });
  }
  return { from, end, segments, totals, recorded: Object.values(totals).reduce((a, b) => a + b, 0) };
}
function recentHTML(recent, t, language) {
  const e = escapeHTML, span = recent.end - recent.from, at = time => ((time - recent.from) / span * 100).toFixed(3);
  const bars = recent.segments.filter(s => s.kind !== "idle").map(s => `<span class="r-${s.kind}" style="left:${at(s.start)}%;width:${(Math.max(.25, (s.end - s.start) / span * 100)).toFixed(3)}%"></span>`).join("");
  const gaps = [];
  let cursor = recent.from;
  for (const s of recent.segments) { if (s.start - cursor > 60000) gaps.push([cursor, s.start]); cursor = s.end; }
  if (recent.end - cursor > 60000) gaps.push([cursor, recent.end]);
  const gapBars = gaps.map(([a, b]) => `<span class="r-gap" style="left:${at(a)}%;width:${((b - a) / span * 100).toFixed(3)}%" title="${e(t.recentGap)}"></span>`).join("");
  const legend = Object.entries(t.recentKinds).filter(([kind]) => recent.totals[kind] >= 60000).map(([kind, label]) => `<span><i class="r-${kind}"></i>${e(label)} ${e(compactRuntimeDuration(recent.totals[kind], language))}</span>`).join("");
  return `<section class="recent" aria-label="${e(t.recentTitle)}"><div class="recent-head">${e(t.recentTitle)}</div><div class="recent-track">${gapBars}${bars}</div><div class="ticks">${t.recentTicks.map(x => `<span>${e(x)}</span>`).join("")}</div><div class="legend">${legend || `<span>${e(recent.recorded ? t.recentIdle : t.recentGap)}</span>`}</div></section>`;
}
export async function loadRuntimeHistory(hass, entityId, end = Date.now(), gapMinutes = 15, schedule = DEFAULT_REPORT_SCHEDULE, from = null) {
  const start = runtimePeriodStart(end, hass.config?.time_zone, schedule);
  const result = await hass.callWS({ type: "history/history_during_period", start_time: new Date(from ?? start-gapMinutes*60000).toISOString(), end_time:new Date(end).toISOString(), entity_ids:[entityId], include_start_time_state:false, significant_changes_only:false, minimal_response:false, no_attributes:false });
  if (!result || typeof result !== "object" || (result[entityId] !== undefined && !Array.isArray(result[entityId]))) throw new Error("Invalid history response");
  return {records:result[entityId] || [],start,end};
}
export function reportEnergySources(config) {
  const on = config.show_runtime_report && config.show_energy_report;
  return { heatPump: on && config.heat_pump_power_entity || null, furnace: on && config.furnace_power_entity || null };
}
// Known ecobee equipment state over time, using the same validity rules as the runtime report.
export function equipmentIntervals(records, end, gapMinutes = 15) {
  const ordered = records.map(historyRecord).filter(r=>Number.isFinite(r.time) && r.time<=end).sort((a,b)=>a.time-b.time);
  const points = ordered.filter((r,i)=>i===ordered.length-1 || r.time!==ordered[i+1].time), intervals = [];
  for (let i=0;i<points.length;i++) {
    const record = points[i], next = points[i+1]?.time ?? end;
    if (next<=record.time || next-record.time>gapMinutes*60000) continue;
    const equipment = record.attributes?.equipment_running;
    const signals = typeof equipment === "string" ? equipment.split(",").map(s=>s.trim()).filter(Boolean) : null;
    if (["unknown","unavailable"].includes(record.state) || record.attributes?.restored || !signals || !signals.every(s=>KNOWN.has(s))) continue;
    const codes = new Set(signals);
    if (!conflictingEquipment(codes)) intervals.push({start:record.time,end:next,codes});
  }
  return intervals;
}
const heatPumpRunning = codes => [...HEAT, ...COOL].some(c=>codes.has(c)), furnaceRunning = codes => AUX.some(c=>codes.has(c));
// Electricity is attributed to equipment only while ecobee reports it running. The blower sits on
// the furnace circuit, so furnace-circuit power while only the heat pump runs belongs to the heat pump.
export const ENERGY_ATTRIBUTION = {
  heatPump: heatPumpRunning,
  heatPumpBlower: codes => heatPumpRunning(codes) && !furnaceRunning(codes),
  furnace: furnaceRunning,
};
// Overlap of two interval lists in one pass; each list is sorted by start first.
export function intersectIntervals(left, right) {
  const a = [...left].sort((x, y) => x[0] - y[0]), b = [...right].sort((x, y) => x[0] - y[0]), out = [];
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    const start = Math.max(a[i][0], b[j][0]), end = Math.min(a[i][1], b[j][1]);
    if (end > start) out.push([start, end]);
    if (a[i][1] < b[j][1]) i++; else j++;
  }
  return out;
}
export function combineEnergy(...parts) {
  const ids = new Set(parts.flatMap(p=>Object.keys(p.periods))), periods = {};
  for (const id of ids) {
    const buckets = parts.map(p=>p.periods[id] || {kwh:0,recorded:0,coverage:[]});
    let common = buckets[0].coverage || [];
    for (const bucket of buckets.slice(1)) common = intersectIntervals(common, bucket.coverage || []);
    periods[id] = { kwh: buckets.reduce((sum,b)=>sum+b.kwh,0), recorded: common.reduce((sum,[a,b])=>sum+b-a,0), coverage: common, any: buckets.some(b=>b.recorded>0) };
  }
  return { periods, method: parts[0]?.method };
}
// All activities in both time windows. Each physical circuit contributes at most once.
export function activityEnergy(power, records, schedule, zone, start, end, config) {
  const intervals = equipmentIntervals(records, end, config.history_gap_minutes), result = {};
  const hpHeat = codes => HEAT.some(c=>codes.has(c)), cool = codes => COOL.some(c=>codes.has(c));
  const predicates = {
    heating: { heatPump: hpHeat, furnace: c=>furnaceRunning(c) || (config.heat_pump_energy_scope === "with_blower" && hpHeat(c)) },
    cooling: { heatPump: cool, furnace: c=>cool(c) && !furnaceRunning(c) && !hpHeat(c) },
    fan: { furnace: c=>FAN.some(x=>c.has(x)) && !heatPumpRunning(c) && !furnaceRunning(c) },
  };
  for (const [activity, mapping] of Object.entries(predicates)) {
    result[activity] = {};
    // The heat-pump scope excludes only its blower; furnace heating remains a separate load.
    const circuits = Object.keys(mapping).filter(c=>power[c] && (c !== "furnace" || activity === "heating" || config.heat_pump_energy_scope === "with_blower"));
    if (!circuits.length) continue;
    for (const window of ["heat","aux"]) {
      const parts = circuits.map(c => {
        if (power[c].status !== "fulfilled") return { periods:{}, method:config.energy_integration_method, failed:true };
        return periodEnergy(power[c].value, schedule, zone, start, end, config.history_gap_minutes, config.energy_integration_method, window, { intervals, active:mapping[c] });
      });
      result[activity][window] = { ...combineEnergy(...parts), status:parts.every(p=>p.failed) ? "unavailable" : "ok", partialSource:parts.some(p=>p.failed), circuits };
    }
  }
  return result;
}
export async function loadPowerHistory(hass, entityId, start, end, gapMinutes, from = null) {
  const result = await hass.callWS({ type: "history/history_during_period", start_time: new Date(from ?? start - gapMinutes * 60000).toISOString(), end_time: new Date(end).toISOString(), entity_ids: [entityId], include_start_time_state: false, significant_changes_only: false, minimal_response: false, no_attributes: false });
  if (!result || typeof result !== "object" || (result[entityId] !== undefined && !Array.isArray(result[entityId]))) throw new Error("Invalid power history response");
  return result[entityId] || [];
}
function watts(record) {
  if (record?.attributes?.restored || !numeric(record?.state) || Number(record.state) < 0) return null;
  const unit = record.attributes?.unit_of_measurement;
  return unit === "W" ? Number(record.state) : unit === "kW" ? Number(record.state) * 1000 : null;
}
export function periodEnergy(records, schedule, timeZone, start, end, gapMinutes = 15, method = "trapezoidal", window = "heat", attribution = null) {
  if (!Array.isArray(records) || !["left","right","trapezoidal"].includes(method) || !Number.isFinite(start) || !Number.isFinite(end) || end<=start || !Number.isFinite(gapMinutes) || gapMinutes<5 || gapMinutes>120) throw new Error("Invalid energy inputs");
  const windows = schedulePeriods(schedule,timeZone,end)[window === "aux" ? "aux" : "heat"];
  const sorted = records.map(historyRecord).filter(r=>Number.isFinite(r.time)).sort((a,b)=>a.time-b.time);
  const points = sorted.filter((r,i)=>i===sorted.length-1 || r.time!==sorted[i+1].time);
  const periods = {}, known = attribution?.intervals || [];
  let k = 0;
  for (let i=0;i+1<points.length;i++) {
    const a=points[i], b=points[i+1], wa=watts(a), wb=watts(b), span=b.time-a.time;
    if (wa===null || wb===null || span<=0 || span>gapMinutes*60000) continue;
    // Split the power interval by known equipment state; unknown state is not coverage.
    let pieces = [[a.time,b.time,true]];
    if (attribution) {
      while (k<known.length && known[k].end<=a.time) k++;
      pieces = [];
      for (let j=k;j<known.length && known[j].start<b.time;j++) pieces.push([Math.max(a.time,known[j].start),Math.min(b.time,known[j].end),attribution.active(known[j].codes)]);
    }
    for (const p of windows) for (const [from,to,active] of pieces) {
      const left=Math.max(start,p.start,from), right=Math.min(end,p.end,to);
      if (right<=left) continue;
      const bucket=periods[p.id] ||= {kwh:0,recorded:0,coverage:[]};
      if (active) {
        const startW=wa+(wb-wa)*(left-a.time)/span, endW=wa+(wb-wa)*(right-a.time)/span;
        const average=method==='left' ? wa : method==='right' ? wb : (startW+endW)/2;
        bucket.kwh += average*(right-left)/3600000000;
      }
      bucket.recorded += right-left;
      bucket.coverage.push([left,right]);
    }
  }
  return {periods,method};
}

const REPORT_ROWS = 4;
// Heat shows heating history and Cool shows cooling history; Heat/Cool (native or managed), Off and
// unknown modes can show both. A history the editor switched off stays hidden; if the mode's own
// history is off, the other enabled one is shown instead.
export function reportActivities(config, mode) {
  const enabled = [config.show_heating_report && "heating", config.show_cooling_report && "cooling"].filter(Boolean);
  const relevant = enabled.filter(a => mode === "heat" ? a === "heating" : mode === "cool" ? a === "cooling" : true);
  return relevant.length ? relevant : enabled;
}
export function runtimeReportHTML(report, status, language, schedule, timeZone, open = false, selectedWindow = "heat", options = {}) {
  const t = REPORT_LABELS[language], e = escapeHTML, d = ms => runtimeDuration(ms, language), short = ms => compactRuntimeDuration(ms, language);
  const activity = options.activity === "cooling" ? "cooling" : "heating", cooling = activity === "cooling";
  // With both tabs the title stays neutral, so it never contradicts the selected tab.
  const title = options.activities?.length > 1 ? t.runtimeTitle : cooling ? t.coolingTitle : options.activity ? t.heatingTitle : t.title;
  const activityTabs = options.activities?.length > 1 ? `<div class="activity-tabs" role="group" aria-label="${e(language === "zh" ? "历史类型" : "History activity")}">${options.activities.map(a=>`<button type="button" data-report-activity="${a}" aria-pressed="${a===activity}">${e(t[a])}</button>`).join("")}</div>` : "";
  const head = `<div class="report-head"><span class="report-title"><ha-icon icon="mdi:chart-timeline-variant"></ha-icon>${e(title)}</span><span class="report-badge">${e(options.activity ? t.title : t.daily)}</span></div>`;
  if (!report) return `<section class="runtime-report" aria-label="${e(t.title)}">${head}${activityTabs}<div class="report-note">${e(t[status] || t.unavailable)}${status === "unavailable" ? ` · ${e(t.failed)}` : ''}</div></section>`;
  const energySet = report.activityEnergy?.[activity] || report.energy;
  const stale = options.staleAt ? `<div class="report-note warn">${e(t.stale.replace("{time}", dateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(options.staleAt)))}</div>` : "";
  // Both schedule windows in one list, newest first; each row keeps its own window's energy source.
  const sources = [energySet?.heat, energySet?.aux].filter(Boolean), source = sources[0];
  const energyColumn = sources.length > 0, showEnergy = energyColumn, energyNote = report.activityEnergy ? t.activityEnergy : energySet?.heat ? t.energyNote : t.auxEnergyNote;
  const activityColumns = cooling ? ["cool"] : ["heat","aux"];
  const locale = language === "zh" ? "zh-CN" : "en";
  const dateFormat = dateTimeFormat(locale, {timeZone,month:'short',day:'numeric'}), dayFormat = dateTimeFormat(locale, {timeZone,day:'numeric'});
  const timeFormat = dateTimeFormat(locale, {timeZone,hour:'2-digit',minute:'2-digit',...(schedule?.start?.split(':')[2] !== '00' || schedule?.end?.split(':')[2] !== '00' ? {second:'2-digit'} : {}),hourCycle:'h23'});
  const neutral = cooling || (options.mode !== undefined && ((options.mode !== "heat" && !options.managed) || schedule?.analysisOnly));
  const visible = ["heat", "aux"].flatMap(w => (report.periods[w] || []).map(r => ({ ...r, window: w }))).sort((a, b) => b.start - a.start);
  const coverageLines = [];
  const rowList = visible.map(r => {
    const window = r.window, source = energySet?.[window];
    const sameDate = dateKey(dateParts(r.start,timeZone)) === dateKey(dateParts(r.end,timeZone));
    const startDate = dateFormat.format(r.start), endDate = dateFormat.format(r.end);
    const sameMonth = !sameDate && dateParts(r.start,timeZone).month === dateParts(r.end,timeZone).month;
    const date = sameDate ? startDate : `${startDate} → ${sameMonth ? dayFormat.format(r.end) : endDate}`;
    const times = `${timeFormat.format(r.start)}–${timeFormat.format(r.end)}`;
    const full = `${startDate} ${timeFormat.format(r.start)} → ${endDate} ${timeFormat.format(r.end)}`;
    const coverage = `${t.recorded} ${d(r.recorded)} / ${d(r.total)}`;
    const energy = source?.periods?.[r.id];
    const fanEnergy = report.activityEnergy?.fan?.[window]?.periods?.[r.id];
    coverageLines.push(`<li><strong>${e(full)}</strong> · ${e(coverage)}${showEnergy ? ` · kWh: ${e(d(energy?.recorded || 0))} / ${e(d(r.total))}` : ''}${fanEnergy?.any || fanEnergy?.recorded ? ` · ${e(t.fanEnergy)}: ${e(formatted(fanEnergy.kwh,language,2,true))} kWh${fanEnergy.recorded < r.total ? "*" : ""}` : ""}</li>`);
    const cells = activityColumns.map(source => {
      const values = [r[source],r.stages[source][0],r.stages[source][1]];
      const lines = [t.totalLabel,t.stage1,t.stage2].map((label,index)=>`<div class="runtime-line ${index===0 ? 'runtime-total' : 'runtime-stage'}"><span class="runtime-label">${e(label)}</span><span class="runtime-value">${r.recorded ? `${e(short(values[index]))}${index===0 && r.missing>60000 ? '<sup>*</sup>' : ''}` : '<span class="report-empty">—</span>'}</span></div>`);
      // Share of recorded (not scheduled) time, so missing history never reads as idle.
      const share = ms => Math.min(100, ms / r.recorded * 100).toFixed(1);
      const bar = r.recorded ? `<div class="runtime-bar ${source}" title="${e(t.share.replace('{p}', formatted(r[source] / r.recorded * 100, language, 0)))}">${r.stages[source].map((ms,i)=>ms ? `<i class="s${i+1}" style="width:${share(ms)}%"></i>` : '').join('')}</div>` : '';
      return `<td class="runtime-source" title="${e(coverage)}">${lines[0]}${bar}${lines[1]}${lines[2]}</td>`;
    }).join('');
    const value = energy?.recorded || energy?.any ? `${energy.kwh > 0 && energy.kwh < .01 ? '&lt;0.01' : e(formatted(energy.kwh, language, 2, true))}${r.total-energy.recorded > 1000 ? '<sup>*</sup>' : ''}` : '<span class="report-empty">—</span>';
    const energyCell = source ? `<td class="energy-cell" title="${e(`${t.recorded} ${d(energy?.recorded || 0)} / ${d(r.total)}`)}">${value}</td>` : energyColumn ? `<td class="energy-cell" title="${e(t.noEnergySource)}"></td>` : '';
    const tag = neutral ? "" : `<span class="period-window">${e(window === "heat" ? t.heatWindow : t.auxTab)}</span>`;
    return `<tr class="win-${window}${neutral ? " neutral" : ""}${r.inProgress ? ' report-today' : ''}"><th scope="row" title="${e(full)}"><span class="period-dates">${e(date)}</span><span class="period-times">${e(times)}</span>${tag}${r.inProgress ? `<span class="period-progress">${e(t.today)}</span>` : ''}</th>${cells}${energyCell}</tr>`;
  });
  // Recent periods first; the rest of the week stays one tap away.
  const limit = options.expanded || rowList.length <= REPORT_ROWS + 1 ? rowList.length : REPORT_ROWS, rows = rowList.slice(0, limit).join('');
  const more = rowList.length > REPORT_ROWS + 1 ? `<button type="button" class="report-more" data-report-more aria-expanded="${limit === rowList.length}">${e(limit === rowList.length ? t.showRecent : t.showAll.replace('{n}', String(rowList.length)))}</button>` : '';
  const stamp = dateTimeFormat(language === "zh" ? "zh-CN" : "en-CA", { timeZone, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const hasMissing = visible.some(r=>r.missing>0 || (energySet?.[r.window] && r.total>(energySet[r.window].periods?.[r.id]?.recorded || 0)));
  const circuits = [...new Set(sources.flatMap(x => x.circuits || []))];
  return `<section class="runtime-report" aria-label="${e(t.title)}">${head}${activityTabs}${stale}<table class="runtime-table merged${energyColumn ? ' with-energy' : ''}"><thead><tr><th scope="col">${e(t.date)}</th>${cooling ? `<th scope="col"><span class="col-dot cool"></span>${e(t.cooling)}</th>` : `<th scope="col"><span class="col-dot"></span>${e(t.heat)}</th><th scope="col"><span class="col-dot aux"></span>${e(t.auxColumn)}</th>`}${energyColumn ? `<th scope="col" title="${e(showEnergy ? energyNote : t.noEnergySource)}">${e(t.energy)}</th>` : ''}</tr></thead><tbody>${rows}</tbody></table>${more}
    ${hasMissing ? `<div class="report-note">${e(t.partial)}</div>` : ''}${sources.some(x => x.partialSource) ? `<div class="report-note">${e(t.energyMissing)}</div>` : ""}${sources.some(x => x.status === 'unavailable') ? `<div class="report-note error">${e(t.energyUnavailable)}</div>` : ''}
    <details id="report-details" ${open ? 'open' : ''}><summary>${e(t.details)}</summary><p>${e(t.basis)}</p><p>${e(stamp.format(report.start))} – ${e(stamp.format(report.end))} (${e(timeZone)})</p><p>${report.recorded ? `${e(t.recorded)} ${e(d(report.recorded))}` : e(t.noData)} · ${e(t.missing)} ${e(d(report.missing))}</p><ul class="coverage-list">${coverageLines.join('')}</ul><p>${e(t.dailyNote)}</p><p>${e(t.stageNote)}</p>${visible.some(r=>r.stages.heat[2] || r.stages.aux[2]) ? `<p>${e(t.stage3Note)}</p>` : ''}${showEnergy ? `<p>${e(energyNote)}</p>${circuits.length ? `<p>${e(t.circuitScope)}: ${circuits.map(c=>e(c === "heatPump" ? t.circuitHeatPump : t.circuitFurnace)).join(" + ")}</p>` : ""}<p>${e(report.activityEnergy ? t.activityDetails : t.energyDetails)}</p>${!report.activityEnergy ? `<p>${e(t.auxEnergyDetails)}</p>` : ""}${energySet?.heat?.blower === false ? `<p>${e(t.noBlowerEnergy)}</p>` : ''}<p>${e(t.method)}: ${e(labelsFor({language}, {language})[source.method] || source.method)}</p>` : ''}<p>${e(t.note)}</p><p>${e(t.gap.replace('{minutes}', String(report.gapMinutes)))}</p></details></section>`;
}

export function watchedEntities(config = {}, context = null) {
  return [...new Set([config.entity, config.automation, config.aux_switch, config.heat_pump_power_entity, config.furnace_power_entity, config.managed_auto_entity, config.cutoff_entity,
    context?.links?.cutoffId, context?.links?.weatherId, context?.schedule?.auxSwitch].filter(Boolean))];
}
export function hassChanged(previous, next, ids) {
  if (!previous || !next) return true;
  if (previous.locale !== next.locale || previous.language !== next.language || previous.config !== next.config) return true;
  return ids.some(id => previous.states?.[id] !== next.states?.[id]);
}
// A background tab needs no clock, history reads or redraws; everything catches up when it is shown again.
const pageHidden = () => globalThis.document?.hidden === true;
export class EcobeeDualFuelCard extends BaseElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }
  static getStubConfig() { return { language: "auto", show_details: true }; }
  static async getConfigElement() {
    await ensureForm();
    return document.createElement("ecobee-dual-fuel-card-editor");
  }
  setConfig(config) { this._config = normalizeConfig(config); this._refreshContext(); this._refreshReport(); this._render(); }
  set hass(value) {
    const previous = this._hass;
    this._hass = value; this._refreshContext(); this._refreshReport();
    // HA replaces hass on every state change in the house; redraw only when this card's inputs changed.
    if (hassChanged(previous, value, watchedEntities(this._config, this._controlContext))) {
      if (pageHidden()) this._stale = true; else this._render();
    }
  }
  _tick() { this._stale = false; this._refreshContext(); this._refreshReport(); this._render(); }
  connectedCallback() {
    clearInterval(this._clockTimer);
    this._clockTimer = setInterval(() => { if (!pageHidden()) this._tick(); }, 30000);
    this._onVisibility ??= () => { if (!pageHidden()) this._tick(); };
    globalThis.document?.addEventListener("visibilitychange", this._onVisibility);
    this._refreshContext();
  }
  disconnectedCallback() {
    clearInterval(this._clockTimer); this._clockTimer = undefined;
    globalThis.document?.removeEventListener("visibilitychange", this._onVisibility);
  }
  async _refreshContext() {
    if (!this._hass || !this._config?.entity) return;
    const key = JSON.stringify([this._config.entity, this._config.automation, this._config.aux_switch, this._config.cutoff_entity, this._hass.states?.[this._config.automation]?.attributes?.id]);
    if (this._contextKey !== key) { this._contextKey = key; this._controlContext = null; this._checkedAt = 0; }
    if (this._readingKey === key || Date.now() - (this._checkedAt || 0) < 60000) return;
    this._readingKey = key; this._checkedAt = Date.now();
    try {
      const registry = Date.now() - (this._registryAt || 0) < 600000 ? this._registry : undefined;
      const context = await loadControlContext(this._hass, this._config, registry);
      if (this._contextKey !== key) return;
      if (!registry && context.registry) { this._registry = context.registry; this._registryAt = Date.now(); }
      this._controlContext = context;
    } catch { if (this._contextKey === key) this._controlContext = { schedule: { status: "configUnknown" }, links: {} }; }
    finally { if (this._readingKey === key) this._readingKey = null; this._refreshReport(); this._render(); }
  }
  async _refreshReport() {
    if (!this._hass || !this._config?.entity) return;
    const schedule = reportSchedule(this._config, this._controlContext);
    const key = JSON.stringify([this._contextKey, this._config.show_runtime_report, this._config.show_heating_report, this._config.show_cooling_report, this._config.history_gap_minutes, reportEnergySources(this._config), this._config.energy_integration_method, this._config.heat_pump_energy_scope, schedule, this._hass.config?.time_zone]);
    if (key !== this._reportKey) { this._reportKey = key; this._runtimeReport = null; this._reportCheckedAt = 0; }
    if (!this._config.show_runtime_report || (!this._config.show_heating_report && !this._config.show_cooling_report)) return;
    if (schedule?.status !== "ok") { this._reportStatus = this._readingKey ? "loading" : "needsSchedule"; return; }
    if (this._reportReadingKey === key || pageHidden() || Date.now() - (this._reportCheckedAt || 0) < 300000) return;
    this._reportReadingKey = key; this._reportCheckedAt = Date.now();
    // A refresh keeps showing the previous report; "loading" only appears before the first one.
    if (!this._runtimeReport) this._reportStatus = "loading";
    // Snapshot bindings so editing the card cannot mix two thermostats or schedules.
    const hass = this._hass, config = this._config, zone = hass.config?.time_zone;
    try {
      const end = Date.now(), start = runtimePeriodStart(end, zone, schedule), sources = reportEnergySources(config);
      const circuits = ["heatPump", "furnace"].filter(c => sources[c]), gap = config.history_gap_minutes, keepFrom = start - gap * 60000;
      // Only the newest slice is read again; a full read every 6 hours guards against recorder corrections.
      const cache = this._history?.key === key && end - this._history.fullAt < 21600000 ? this._history : null;
      const from = cache ? cache.end - (gap + 10) * 60000 : null;
      const [runtimeResult, ...energyResults] = await Promise.allSettled([
        loadRuntimeHistory(hass, config.entity, end, gap, schedule, from),
        ...circuits.map(c => loadPowerHistory(hass, sources[c], start, end, gap, cache?.power[c] ? from : null)),
      ]);
      if (this._reportKey !== key) return;
      if (runtimeResult.status !== "fulfilled") throw new Error("Runtime history unavailable");
      const records = mergeHistory(cache?.runtime, runtimeResult.value.records, keepFrom);
      const powerRecords = Object.fromEntries(circuits.map((c, i) => [c, energyResults[i].status === "fulfilled" ? { status: "fulfilled", value: mergeHistory(cache?.power[c], energyResults[i].value, keepFrom) } : energyResults[i]]));
      this._history = { key, end, fullAt: cache?.fullAt ?? end, runtime: records, power: Object.fromEntries(Object.entries(powerRecords).filter(([, r]) => r.status === "fulfilled").map(([c, r]) => [c, r.value])) };
      this._runtimeReport = runtimeReport(records, schedule, zone, start, end, gap);
      this._runtimeReport.recent = recentActivity(records, end, gap);
      if (circuits.length && sources.heatPump !== sources.furnace) {
        this._runtimeReport.activityEnergy = activityEnergy(powerRecords, records, schedule, zone, start, end, config);
      }
      this._reportStatus = "ok"; this._reportStaleAt = null;
    } catch {
      if (this._reportKey !== key) return;
      // Keep the last good report with a note, and retry in about a minute instead of five.
      if (this._runtimeReport) { this._reportStaleAt = this._history?.end ?? null; this._reportStatus = "ok"; this._reportCheckedAt = Date.now() - 240000; }
      else this._reportStatus = "unavailable";
    }
    finally { if (this._reportReadingKey === key) this._reportReadingKey = null; this._render(); }
  }
  getCardSize() { return (this._config?.automation ? 12 : 9) + (this._config?.show_runtime_report ? 6 : 0); }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6 }; }
  _power(reading) {
    if (!reading) return "";
    return reading.status === "ok" ? `<button type="button" class="power" data-info="${escapeHTML(reading.entityId)}" aria-label="${escapeHTML(reading.text + ' ' + reading.unit)}">${escapeHTML(reading.text)} <small>${escapeHTML(reading.unit)}</small></button>` : `<div class="power-error">${escapeHTML(reading.text)}</div>`;
  }
  _render() {
    if (!this.shadowRoot || !this._config) return;
    const detailsOpen = this.shadowRoot.querySelector("#equipment-details")?.open;
    const reportOpen = this.shadowRoot.querySelector("#report-details")?.open;
    const m = cardModel(this._hass, this._config), t = m.t, e = escapeHTML;
    if (!this._hass || !m.configured) {
      this._parts = null;
      this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div class="wrap">${e(this._hass ? t.setup : t.loading)}</div></ha-card>`; return;
    }
    const icon = name => `<ha-icon icon="${e(name)}"></ha-icon>`;
    // One control row: source schedule and Managed Auto toggles, then the matching settings shortcut.
    const showSchedule = this._config.automation && (m.mode === "heat" || m.managed?.active);
    const toggles = `${showSchedule ? `<label class="toggle"><ha-switch id="schedule" aria-label="${e(t.schedule)}"></ha-switch><span>${e(t.schedule)}${m.managed?.enabled ? `<small>${e(t.schedulePausesManaged)}</small>` : ""}</span></label>` : ""}${m.managed ? `<label class="toggle"><ha-switch id="managed" aria-label="${e(t.managedAuto)}"></ha-switch><span>${e(t.managedAuto)}${m.managed.active ? "" : `<small class="tone-${m.managed.tone}">${e(m.managed.status)}</small>`}</span></label>` : ""}`;
    const shortcut = showSchedule ? `<button class="settings" id="settings">${icon("mdi:tune-variant")}${e(t.scheduleSettings)}</button>` : m.managed ? `<button class="settings" data-info="${e(this._config.managed_auto_entity)}">${icon("mdi:autorenew")}${e(t.managedSettings)}</button>` : "";
    const controls = toggles ? `<div class="controls"><div class="toggles">${toggles}</div>${shortcut}</div>` : "";
    const l = logicModel(this._hass, this._config, this._controlContext), lt = l.t;
    const live = ["heat", "aux", "cool", "fan"].includes(m.activity);
    const orbIcon = { aux: "mdi:fire", heat: "mdi:heat-pump-outline", cool: "mdi:snowflake", fan: "mdi:fan", unknown: "mdi:help-circle-outline" }[m.activity];
    const targets = m.mode === "off" ? "" : m.mode === "heat_cool"
      ? `<span class="chip range" title="${e(t.targetRange.replace("{heat}", m.heatTarget).replace("{cool}", m.coolTarget))}">${icon("mdi:fire")}<span>${e(m.heatTarget.replace(` ${m.unit}`, ""))}</span><span class="dash">–</span><span>${e(m.coolTarget)}</span>${icon("mdi:snowflake")}</span>`
      : `<span class="chip">${icon("mdi:target")}${e(m.mode === "cool" ? t.coolTarget : t.target)} ${e(m.target)}</span>`;
    const hero = `<header class="hero"><div class="hero-text"><div class="eyebrow">${e(this._config.name || (m.mode === "cool" ? t.cooling : m.mode === "heat_cool" ? m.managed?.active ? t.indoor : t.nativeAuto : m.mode === "off" ? t.off : t.indoor))}</div>
      <div class="temp" aria-label="${e(m.current)}"><span class="temp-value">${e(m.currentValue)}</span>${m.currentValue !== "—" ? `<span class="temp-unit">${e(m.unit)}</span>` : ""}</div>
      <div class="chips">${targets}<span class="chip">${icon(m.presetIcon)}${e(m.comfort)}</span>${m.humidity ? `<span class="chip" title="${e(t.humidity)}">${icon("mdi:water-percent")}${e(m.humidity)}</span>` : ""}</div></div>
      ${orbIcon ? `<div class="pulse kind-${m.activity}" role="status"><div class="orb kind-${m.activity}${live ? " live" : ""}" aria-hidden="true">${icon(orbIcon)}</div><div class="orb-label">${e(m.activityText)}</div></div>` : `<span class="sr" role="status">${e(m.activityText)}</span>`}</header>`;
    const pct = s => `${(s / 864).toFixed(3)}%`;
    const timeline = l.clock && m.mode === "heat" && l.status === lt.active ? `<div class="timeline" aria-hidden="true"><div class="track">${l.timeline.map(([a, b]) => `<span class="seg" style="left:${pct(a)};width:${pct(b - a)}"></span>`).join("")}<span class="now" style="left:${(l.nowFraction * 100).toFixed(3)}%" title="${e(lt.now)}"></span></div><div class="ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>
      <div class="legend"><span><i></i>${e(lt.hours)} ${e(l.windowText)}</span><span><i class="aux"></i>${e(lt.auxWindow)}</span></div>
      <div class="line">${icon("mdi:clock-outline")}<span>${e(l.nextText)}${l.countdown ? ` <span class="countdown">· ${e(l.countdown)}</span>` : ""}</span></div>
      ${l.reason === lt.mismatch ? `<div class="sub">${e(lt.scheduledPolicy)}: ${e(l.expected)}</div>` : ""}` : "";
    const weather = l.showWeather ? `<div class="stats"><div class="stat${l.below ? " below" : ""}"><div class="stat-label">${e(lt.weather)}</div><div class="stat-value">${e(l.outsideText)}</div></div><div class="stat"><div class="stat-label">${e(lt.minimum)}</div><div class="stat-value">${e(l.minimumText)}</div></div></div>${l.weatherReason !== lt.above ? `<div class="sub">${e(l.weatherReason)}</div>` : ""}` : "";
    const sourceKind = !m.valid ? "unknown" : m.auxOnly ? "aux" : this._hass.states[this._config.entity]?.state === "heat" ? "heat" : this._hass.states[this._config.entity]?.state === "cool" ? "cool" : "idle";
    const heatSource = `<section class="panel source kind-${sourceKind}" aria-label="${e(lt.title)}"><div class="source-head"><span>${e(lt.title)}</span>${this._config.automation ? `<span class="pill ${e(l.tone)}"><i></i>${e(l.status)}</span>` : ""}</div>
      <div class="source-main">${icon(m.auxOnly ? "mdi:fire" : m.policyIcon)}<span>${e(m.policy)}</span></div>${timeline}
      ${this._config.automation && l.reason !== lt.match && l.reason !== lt.mismatch ? `<div class="sub${l.reason === lt.noSwitch ? " warn" : ""}">${l.reason === lt.noSwitch ? icon("mdi:alert-outline") : ""}${e(l.reason)}</div>` : l.reason === lt.mismatch ? `<div class="sub error">${e(l.reason)}</div>` : ""}
      ${l.cutoffMismatch ? `<div class="sub error">${e(lt.configuredCutoff)} ${e(l.cutoffTargetText)} · ${e(lt.awaitingCutoff)}</div>` : ""}${weather}</section>`;
    const ma = m.managed, band = ma?.active ? deadbandModel(ma.attributes, m.unit) : null, deg = v => `${formatted(v, m.language)} ${m.unit}`;
    const bandHTML = band ? `<div class="band zone-${band.zone || "none"}${ma.side === "heat" ? " native" : ""}"><div class="band-track"><span class="band-aux" style="width:${band.heatAt.toFixed(2)}%"></span><span class="band-cool" style="left:${band.coolAt.toFixed(2)}%"></span>${band.currentAt === null ? "" : `<span class="band-now" style="left:${band.currentAt.toFixed(2)}%" title="${e(t.bandCurrent.replace("{t}", deg(band.current)))}"></span>`}</div>
      <div class="band-labels"><span class="aux">${e(t.bandHeat.replace("{t}", deg(band.heat)))}</span>${band.current === null ? "" : `<span>${e(t.bandCurrent.replace("{t}", deg(band.current)))}</span>`}<span class="cool">${e(t.bandCool.replace("{t}", deg(band.cool)))}</span></div>
      <div class="sub">${e(ma.side === "heat" ? t.bandWindow : band.zone === "aux" ? t.bandAux : band.zone === "cool" ? t.bandCoolNow : t.bandKeep)}</div></div>` : "";
    const managedNext = l.clock ? `${lt.next} ${l.nextLabel} → ${l.clock.next.policy === "heat" ? t.managedNextWindow : t.managedNextDay}` : "";
    const managedTimeline = l.clock ? `<div class="timeline" aria-hidden="true"><div class="track">${l.timeline.map(([a, b]) => `<span class="seg" style="left:${pct(a)};width:${pct(b - a)}"></span>`).join("")}<span class="now" style="left:${(l.nowFraction * 100).toFixed(3)}%" title="${e(lt.now)}"></span></div><div class="ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>
      <div class="legend"><span><i></i>${e(lt.hours)} ${e(l.windowText)}</span><span><i class="aux"></i>${e(t.managedDayHours)}</span></div>
      <div class="line">${icon("mdi:clock-outline")}<span>${e(managedNext)}${l.countdown ? ` <span class="countdown">· ${e(l.countdown)}</span>` : ""}</span></div>` : "";
    const managedSource = ma?.active ? `<section class="panel source kind-${ma.side}" aria-label="${e(t.managedAuto)}"><div class="source-head"><span>${e(t.managedAuto)}</span><span class="pill ${ma.tone}"><i></i>${e(ma.status)}</span></div><div class="source-main">${icon({ heat: "mdi:heat-pump-outline", cool: "mdi:snowflake", aux: "mdi:fire" }[ma.side] || "mdi:autorenew")}<span>${e(ma.sideText)}</span>${ma.deviceText ? `<span class="device-mode" title="${e(t.physicalMode)}">${icon("mdi:thermostat")}${e(ma.deviceText)}</span>` : ""}</div>${ma.attributes.pending_mode ? `<div class="sub">${e(AUTO_STATUS[m.language].awaiting_device)} · ${e(t.deviceModes[ma.attributes.pending_mode] || ma.attributes.pending_mode)}</div>` : ""}${bandHTML}${managedTimeline}</section>` : "";
    const source = m.managed?.active ? managedSource : m.mode === "heat" ? heatSource : m.mode === "cool" || m.mode === "heat_cool"
      ? `<section class="native-mode kind-${m.mode === "cool" ? "cool" : "idle"}">${icon(m.policyIcon)}<div><strong>${e(m.mode === "cool" ? t.nativeSchedule : t.nativeAuto)}</strong><div class="sub">${e(m.mode === "cool" ? t.nativeCoolNote : t.nativeAutoNote)}</div></div></section>`
      : m.mode === "off" ? `<section class="native-mode kind-idle">${icon("mdi:power")}<div><strong>${e(t.off)}</strong><div class="sub">${e(t.offNote)}</div></div></section>`
      : `<div class="notice">${e(m.valid ? m.policy : t.unknown)}</div>`;
    const outdoorKind = m.heat ? "heat" : m.cool ? "cool" : "idle", blowerOn = m.blower === t.running;
    const furnaceKind = m.aux ? "aux" : blowerOn ? "fan" : "idle";
    const equipment = m.mode === "off" && m.activity === "idle" ? "" : `<div class="equipment"><section class="tile kind-${outdoorKind}${m.heat || m.cool ? " live" : ""}"><div class="tile-head"><span class="bubble">${icon(m.cool && !m.heat ? "mdi:snowflake" : "mdi:heat-pump-outline")}</span><span>${e(t.outdoor)}</span></div>
      ${m.outdoor.map(text => `<div class="tile-row${m.heat || m.cool ? " on" : ""}">${e(text)}</div>`).join("")}${this._power(m.outdoorPower)}</section>
      <section class="tile kind-${furnaceKind}${m.aux || blowerOn ? " live" : ""}"><div class="tile-head"><span class="bubble">${icon(m.aux ? "mdi:fire" : "mdi:fan")}</span><span>${e(m.mode === "cool" ? t.blower : t.furnace)}</span></div>
      ${m.mode !== "cool" || m.aux ? `<div class="tile-row${m.aux ? " on" : ""}">${icon("mdi:fire")}<span>${e(m.auxiliary)}</span></div>` : ""}<div class="tile-row${blowerOn ? " spin" : m.blower === t.furnaceControlled ? " on" : ""}">${icon("mdi:fan")}<span>${e(t.blower)}: ${e(m.blower)}</span></div>${m.mode === "cool" && m.furnacePower ? `<div class="sampling">${e(t.indoorCircuit)}</div>` : ""}${this._power(m.furnacePower)}</section></div>
      ${(m.outdoorPower || m.furnacePower) && this._config.power_note ? `<div class="sampling">${e(this._config.power_note)}</div>` : ""}`;
    const notices = `${this._config.heat_pump_power_entity && this._config.heat_pump_power_entity === this._config.furnace_power_entity ? `<div class="notice error">${e(t.duplicatePower)}</div>` : ""}${this._config.automation && m.automationState === "off" ? `<div class="notice">${e(t.scheduleOff)}</div>` : this._config.automation && !m.automationAvailable ? `<div class="notice">${e(t.scheduleUnknown)}</div>` : ""}${this._error ? `<div role="alert" class="notice error">${e(t.actionFailed)}</div>` : ""}`;
    const details = this._config.show_details ? `<details id="equipment-details" ${detailsOpen ? "open" : ""}><summary>${e(t.details)}</summary>${m.managed ? `<p>${e(t.managedNote)}</p><p>${e(t.physicalMode)}: ${e(m.managed.attributes.device_mode || t.unknown)}</p><a href="/config/integrations/integration/ecobee_managed_auto">${e(t.managedSettings)}</a>` : ""}${m.mode === "heat" || m.mode === "heat_cool" ? `<p>${e(t.termNote)}</p><p>${e(lt.nativeAux)}</p>` : ""}${m.mode === "heat" && l.showWeather ? `<p>${e(lt.weatherSource)}${l.weatherTime ? ` · ${e(lt.updated)} ${e(l.weatherTime)}` : ""}<br>${e(lt.minimum)}: ${e(l.minimumText)}<br>${e(l.weatherReason)}</p>` : ""}${l.rawWeather ? `<p>${e(l.rawWeather)}</p>` : ""}<p>${e(t.report)}: ${e(m.raw)}</p><p>${e(t.stateNote)}</p>${m.outdoorPower || m.furnacePower ? `<p>${e(t.powerNote)}</p>` : ""}<p>${e(t.tempNote)}</p></details>` : "";
    const activities = reportActivities(this._config, m.mode);
    const chosenActivity = activities.includes(this._reportActivity) ? this._reportActivity : activities.includes(m.mode === "cool" || m.activity === "cool" ? "cooling" : "heating") ? m.mode === "cool" || m.activity === "cool" ? "cooling" : "heating" : activities[0];
    const report = this._config.show_runtime_report && activities.length ? runtimeReportHTML(this._runtimeReport, this._reportStatus || "loading", m.language, reportSchedule(this._config,this._controlContext), this._hass.config?.time_zone, reportOpen, "heat", { mode:m.mode, managed:Boolean(m.managed?.active), activity:chosenActivity, activities, expanded:Boolean(this._reportExpanded), staleAt:this._reportStaleAt }) : "";
    // Keep ha-card and unchanged parts in place: theme styling stays applied and the page does not jump.
    this._ensureSkeleton();
    this._settingsPath = m.settingsPath;
    const recent = this._runtimeReport?.recent ? recentHTML(this._runtimeReport.recent, t, m.language) : "";
    // Recent activity opens the history column, so wide cards keep both columns balanced.
    this._setPart("main", `${hero}${source}${equipment}${notices}${details}`);
    this._setPart("report", report ? `${recent}${report}` : "");
    this._setPart("controls", controls);
    this.shadowRoot.querySelector(".grid").classList.toggle("single", !report);
    const toggle = this.shadowRoot.querySelector("#schedule");
    if (toggle) { toggle.checked = m.automationState === "on"; toggle.disabled = !m.automationAvailable || Boolean(this._pending); }
    const managedToggle = this.shadowRoot.querySelector("#managed");
    if (managedToggle) { managedToggle.checked = m.managed.enabled; managedToggle.disabled = !m.managed.valid || !m.managed.available || Boolean(this._pending); }
  }
  _ensureSkeleton() {
    if (this._parts) return;
    this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div class="wrap"><div class="grid"><div class="col" id="part-main"></div><div class="col" id="part-report"></div></div></div><div id="part-controls"></div></ha-card>`;
    this._parts = {};
    this.shadowRoot.addEventListener("click", event => {
      const target = event.composedPath().find(node => node?.matches?.("[data-report-activity], [data-report-more], #settings, [data-info]"));
      if (!target) return;
      if (target.hasAttribute("data-report-more")) {
        this._reportExpanded = !this._reportExpanded;
        this._render();
        this.shadowRoot.querySelector("[data-report-more]")?.focus({ preventScroll: true });
      } else if (target.dataset.reportActivity) {
        this._reportActivity = target.dataset.reportActivity;
        this._render();
        this.shadowRoot.querySelector(`[data-report-activity="${this._reportActivity}"]`)?.focus({ preventScroll:true });
      } else if (target.id === "settings") {
        if (!this._settingsPath) return;
        history.pushState(null, "", this._settingsPath); window.dispatchEvent(new Event("location-changed", { bubbles: true, composed: true }));
      } else {
        this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: target.dataset.info }, bubbles: true, composed: true }));
      }
    });
  }
  _setPart(name, html) {
    if (this._parts[name] === html) return;
    const part = this.shadowRoot.querySelector(`#part-${name}`);
    part.innerHTML = html; part.hidden = !html; this._parts[name] = html;
    if (name !== "controls") return;
    this.shadowRoot.querySelector("#schedule")?.addEventListener("change", event => this._call(scheduleRequest(this._hass, this._config, Boolean(event.target.checked))));
    this.shadowRoot.querySelector("#managed")?.addEventListener("change", event => this._call(managedRequest(this._hass, this._config, Boolean(event.target.checked))));
  }
  async _call(request) {
    if (!request || this._pending) { this._render(); return; }
    this._pending = true; this._error = false; this._render();
    try { await this._hass.callService(request.domain, request.service, request.data); }
    catch { this._error = true; }
    finally { this._pending = false; this._render(); }
  }
}
let formReady;
async function ensureForm() {
  if (globalThis.customElements?.get("ha-form")) return;
  formReady ||= (async () => {
    const helpers = await window.loadCardHelpers();
    const native = helpers.createCardElement({ type: "entities", entities: [] });
    await native.constructor.getConfigElement();
    await customElements.whenDefined("ha-form");
  })();
  return formReady;
}
export class EcobeeDualFuelEditor extends BaseElement {
  constructor() {
    super(); this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>:host{display:block}ha-form{display:block}</style><ha-form></ha-form>`;
    this._form = this.shadowRoot.querySelector("ha-form");
    // HA can render this element before hass/config arrive. Its schema must be iterable.
    this._form.schema = []; this._form.data = {};
    this._form.addEventListener("value-changed", event => {
      event.stopPropagation();
      this._config = normalizeConfig(event.detail.value);
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      this._update();
    });
  }
  setConfig(config) { this._config = normalizeConfig(config); this._update(); }
  set hass(value) { this._hass = value; this._update(); }
  _update() {
    if (!this._hass || !this._config) return;
    const t = labelsFor(this._hass, this._config);
    this._form.hass = this._hass; this._form.data = this._config;
    const schema = editorSchema(this._hass, this._config), key = JSON.stringify(schema);
    if (this._schemaKey !== key) { this._form.schema = schema; this._schemaKey = key; }
    this._form.computeLabel = field => t[field.name] || field.name;
    const helpers = {
      report_schedule_source: t.analysisHelper, report_start: t.analysisHelper, heat_pump_energy_scope: t.energyHelper, entity: t.entityHelper, aux_switch: t.auxHelper, automation: t.automationHelper,
      heat_pump_power_entity: t.outdoorHelper, furnace_power_entity: t.furnaceHelper,
      cutoff_entity: t.cutoffHelper, power_note: t.samplingHelper, language: t.languageHelper,
      show_runtime_report: t.reportHelper, history_gap_minutes: t.gapHelper, show_energy_report: t.energyHelper, energy_integration_method: t.methodHelper,
    };
    this._form.computeHelper = field => helpers[field.name];
  }
}
if (globalThis.customElements) {
  if (!customElements.get("ecobee-dual-fuel-card")) customElements.define("ecobee-dual-fuel-card", EcobeeDualFuelCard);
  if (!customElements.get("ecobee-dual-fuel-card-editor")) customElements.define("ecobee-dual-fuel-card-editor", EcobeeDualFuelEditor);
  window.customCards ||= [];
  if (!window.customCards.some(card => card.type === "ecobee-dual-fuel-card")) window.customCards.push({ type: "ecobee-dual-fuel-card", name: "ecobee Dual-Fuel Heat Pump", preview: true, documentationURL: "https://github.com/maigougou/ha-ecobee-dual-fuel-heat-pump-scheduler/blob/main/docs/dashboard.md", description: "HVAC stages, blower status and optional power — configure all entities visually." });
}
