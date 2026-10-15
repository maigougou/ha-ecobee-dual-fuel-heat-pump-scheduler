# 原生 YAML 备用卡片

[English](native_dashboard.md)

使用 HA 自带的 Markdown 和 Entities 卡片，显示温度、热源、运行级数和自动化开关。此版本需要手工替换实体，不包含新版自定义卡片的可视化编辑器和运行报告。

## 选择文件

| 语言 | 无功率监控 | 有功率监控 |
| --- | --- | --- |
| 中文 | [基础版](../examples/dashboard_card.yaml) | [功率版](../examples/dashboard_card_power.yaml) |
| 英文 | [基础版](../examples/dashboard_card_en.yaml) | [功率版](../examples/dashboard_card_power_en.yaml) |

## 安装

1. 编辑仪表盘，添加「手动」卡片，粘贴所选 YAML。
2. 替换 `climate.example_ecobee`、`switch.example_ecobee_auxiliary_heat_only` 和 `automation.example_ecobee_dual_fuel`。同步替换模板赋值、Markdown 的 `entity_id` 列表及底部自动化开关的实体。
3. 将 `temperature_unit` 设为温控器实际显示的 `°C` 或 `°F`；此项只改变标签，不换算数值。
4. 参数按钮默认打开自动化列表。可将 `navigation_path` 改为该自动化编辑页的实际路径。
5. 保存并核对显示值。

如需显示压缩机最低外温，将 `cutoff_entity` 填为相应 number 实体，并加入 Markdown 的 `entity_id` 列表。卡片只读取该数值。

## 可选功率

功率版中，将 `heat_pump_power_entity` 和 `furnace_power_entity` 设为对应电路的 W/kW 传感器，并更新 `entity_id` 列表。只监控一路时，把另一路设为 `''` 并移除其监听项。没有监控时直接使用基础版。

未配置时隐藏功率；已配置但缺失数据时显示不可用。不要选择累计 kWh 电量。`power_note` 可留空，或填写符合实际的采样说明。

运行级数来自 ecobee 的设备报告；送风机读取 Fan 运行状态。炉子制暖但未报告 Fan 时显示「由炉子控制」。炉子电功率不代表燃气消耗。

卡片语言由 YAML 文件决定，HA 自带控件跟随用户语言。自动化名称和说明、自定义舒适设置名称保留原文。
