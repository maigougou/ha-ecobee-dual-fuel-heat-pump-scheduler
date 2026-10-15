"""Optional Auto controller; the standalone Heat Blueprint remains independent."""

DOMAIN = "ecobee_managed_auto"
DEFAULTS = {"minimum_mode_minutes": 10, "maximum_data_age_minutes": 20,
            "acknowledgement_minutes": 8, "resume_after_restart": True, "notify": True}
DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

# Every controller status, also the options of the status sensor.
STATUSES = ("waiting_for_auto", "syncing", "disabled", "manual_override", "waiting_for_schedule", "schedule_paused",
            "configuration_error", "command_failed", "waiting_for_connection", "restoring_auto",
            "restore_failed", "awaiting_device", "minimum_mode_wait", "heat_pump_window",
            "furnace_selected", "cooling_selected")
# Normal operation; reaching one of these clears an earlier problem notification.
HEALTHY = ("waiting_for_auto", "heat_pump_window", "furnace_selected", "cooling_selected", "minimum_mode_wait")
# A data outage must last this long before it is reported.
CONNECTION_NOTICE_SECONDS = 1800
# After a restart that kept control, wait this long for ecobee data before restoring Auto.
HOLD_GRACE_SECONDS = 600
# Supervisor jobs after which Core starts again (verified against Supervisor's homeassistant/core.py).
SUPERVISOR_RESTART_JOBS = {"home_assistant_core_restart", "home_assistant_core_update", "home_assistant_core_rebuild"}

NOTICES = {
    "en": {
        "title": "ecobee Managed Auto",
        "restore_failed": "Managed Auto could not restore native Auto after two attempts. The thermostat may remain in {mode} and cannot switch between heating and cooling by itself. Choose the intended mode on the thermostat.",
        "manual_override": "Managed Auto stopped because the HVAC mode was changed manually. Turn the Managed Auto switch back on to resume.",
        "configuration_error": "Managed Auto stopped and restored native Auto: {detail}. Check the integration, the source-schedule Blueprint binding and the selected entities, then turn it back on.",
        "command_failed": "Managed Auto stopped because ecobee did not confirm a mode change within the readback timeout. Native Auto is being restored. Turn it back on after checking the thermostat.",
        "connection": "ecobee runtime data has been unavailable for more than 30 minutes ({detail}). Managed Auto cannot change modes; the thermostat keeps its last mode until data returns.",
        "unexpected_shutdown": "Home Assistant stopped unexpectedly while Managed Auto controlled the thermostat. Native Auto is being restored and Managed Auto stays off until you turn it back on.",
        "modes": {"auto": "Auto", "auxHeatOnly": "Auxiliary heat only", "cool": "Cool", "heat": "Heat", "off": "Off"},
        "log": {
            "window": "Heat-pump window: native Auto",
            "heat": "{current} ≤ heat target {heat}: furnace (Auxiliary heat only)",
            "cool": "{current} ≥ cool target {cool}: Cool",
            "nearest_heat": "Furnace-only window began nearer the heat target ({current}): furnace (Auxiliary heat only)",
            "nearest_cool": "Furnace-only window began nearer the cool target ({current}): Cool",
            "restore": "Restoring native Auto ({reason})",
            "acquire": "Took control: ecobee is in Auto",
            "restored": "Native Auto confirmed; control released",
            "override": "Stopped: the HVAC mode was changed manually",
            "hold": "Home Assistant is restarting: keeping the current mode",
            "resume": "Resumed control after the Home Assistant restart",
        },
        "reasons": {"waiting_for_auto": "re-arming", "disabled": "Managed Auto turned off",
                    "schedule_paused": "source schedule off or in observation", "configuration_error": "configuration error",
                    "command_failed": "mode change not confirmed", "shutdown": "Home Assistant shutting down"},
    },
    "zh": {
        "title": "ecobee 自动冷暖调度",
        "restore_failed": "自动冷暖调度两次尝试后仍未能恢复原生自动冷暖。温控器可能停留在「{mode}」，无法自行在制暖与制冷之间切换。请在温控器上选择需要的模式。",
        "manual_override": "HVAC 模式被手动更改，自动冷暖调度已停止。重新打开「自动冷暖调度」开关即可恢复。",
        "configuration_error": "自动冷暖调度已停止并恢复原生自动冷暖：{detail}。请检查集成、热源日程 Blueprint 的绑定及所选实体，然后重新打开。",
        "command_failed": "ecobee 在回读超时内没有确认模式切换，自动冷暖调度已停止，正在恢复原生自动冷暖。请检查温控器后重新打开。",
        "connection": "ecobee 运行数据已超过 30 分钟不可用（{detail}）。自动冷暖调度无法切换模式，数据恢复前温控器保持最后模式。",
        "unexpected_shutdown": "Home Assistant 在自动冷暖调度控制温控器时异常停止。正在恢复原生自动冷暖；在你重新打开前，自动冷暖调度保持关闭。",
        "modes": {"auto": "自动冷暖", "auxHeatOnly": "仅辅助供暖（炉子）", "cool": "制冷", "heat": "制暖", "off": "关闭"},
        "log": {
            "window": "热泵时段：原生自动冷暖",
            "heat": "{current} ≤ 制暖目标 {heat}：炉子（仅辅助供暖）",
            "cool": "{current} ≥ 制冷目标 {cool}：制冷",
            "nearest_heat": "进入仅炉子时段时更接近制暖目标（{current}）：炉子（仅辅助供暖）",
            "nearest_cool": "进入仅炉子时段时更接近制冷目标（{current}）：制冷",
            "restore": "恢复原生自动冷暖（{reason}）",
            "acquire": "开始接管：ecobee 处于自动冷暖",
            "restored": "已确认原生自动冷暖，释放控制",
            "override": "已停止：HVAC 模式被手动更改",
            "hold": "Home Assistant 正在重启：保持当前模式",
            "resume": "Home Assistant 重启后继续接管",
        },
        "reasons": {"waiting_for_auto": "重新接管", "disabled": "已关闭自动冷暖调度",
                    "schedule_paused": "热源日程关闭或处于观察模式", "configuration_error": "配置错误",
                    "command_failed": "模式切换未确认", "shutdown": "Home Assistant 正在关闭"},
    },
}
