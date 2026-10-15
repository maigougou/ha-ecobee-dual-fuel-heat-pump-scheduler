# ecobee 双热源项目开发交接

> 最新发布状态与本轮修复以[发布前检查](release-review.zh-CN.md)为准：两版 HA 各 296 项通过，前端 164 项，独立安装器 17 项；HACS 实际下载、升级及官方 CI 尚待公开仓库后验收。

## HACS 安装打包 0.4.0（未发布，2026-10-13）

- 集成显示名称改为 **ecobee Dual-Fuel Heat Pump Scheduler**，domain 保留 `ecobee_managed_auto`。新增设置菜单：安装蓝图和卡片／添加自动冷暖控制器。
- HACS 只下载 `custom_components/ecobee_managed_auto/`；`bundle/` 包含卡片 0.9.9 和两种语言的 Blueprint 0.2.0。修改源文件后运行 `python3 scripts/build_bundle.py`，CI 检查副本一致。
- 安装条目负责复制所选语言蓝图、备份旧文件、注册卡片资源；不会创建供暖控制器。已有自动化路径与卡片设置保留。旧 `/local/ecobee-dual-fuel-card.js` 资源迁移至集成静态地址。
- README 以 HACS 自定义仓库为主入口；`install.py` 是可选终端安装器，详细流程见 [安装与维护](installation.md)。升级替换蓝图后需重新加载自动化。
- 本地完整测试：HA 2024.12.0 和 2026.10.1 各 290 项通过且退出码为 0；安装器独立测试 16 项通过。Python 3.14 单独运行安装测试时有解释器退出崩溃，记录于 [验证记录](validation.md)，未声称修复。
- **未公开发布，未部署到家庭 HA，未完成真实 HACS 下载／升级验证，也未申请默认列表收录。** 下方 0.3.0 指之前的部署版本。

> 当前：卡片 0.9.9、Managed Auto 0.3.0（变更见 CHANGELOG；HA 重启保持接管，卡片安装文件为 `dist/ecobee-dual-fuel-card.js`，由 `npm run build` 生成）。此前：卡片 0.9.2、Managed Auto 0.2.0。卡片 0.9.1 修复：`outdoor_only` 仅排除热泵运行时的室内送风机电耗；炉子实际供暖始终累计所选炉子功率传感器。两种调度窗口均适用，已增加回归测试。

## 卡片 0.9.3–0.9.4（2026-10-13）

- 性能：`set hass` 只在 `watchedEntities()` 中的实体、语言或 HA 配置变化时重绘（`hassChanged`）。历史改为增量读取：缓存 `_history`，每 5 分钟只读取最后一段（重叠 gap+10 分钟），用 `mergeHistory` 合并；每 6 小时整段重读一次。
- 主栏新增「过去 24 小时」实际运行条（`recentActivity`）：热泵/炉子/制冷/送风分段，无数据处显示斜纹。
- 报告：两个窗口合并为一张按时间倒序的表；默认显示最近 4 个时段，「显示全部」展开；跨日同月日期写成「10月12日 → 13日」，不再在手机上断行。
- 「仅炉子模式待确认」改为醒目警告；Off 用中性面板；活动文字放到圆形图标下方（取代单独的状态行，待机时右上角为空）；kWh 用正文色；自动冷暖两个目标合成一个区间芯片。
- **部署注意**：HA 的 `/local` 有 31 天浏览器缓存，每次部署都必须更改 Lovelace 资源 URL 的 `?v=`。

## 卡片 0.9.2 / Managed Auto 0.2.0（2026-10-13）

- 干净重启、重载或修改选项：先恢复原生 Auto，确认后自动重新接管（选项「干净重启后自动恢复」，默认开）。异常停机：可信时恢复 Auto，保持关闭并发通知。存储新增 `clean_shutdown`。
- 日程关闭或观察模式改为**暂停**（`schedule_paused`）：恢复 Auto，开关保持开，日程恢复后自动继续。数据中断时保持启用，恢复 Auto 后等待数据，超过 30 分钟才通知。
- 持久通知（单条、可替换、恢复健康自动消除）：restore_failed、manual_override、configuration_error、command_failed、unexpected_shutdown、connection。可在选项关闭。
- 新增诊断状态传感器（enum，15 种状态，中英翻译）、带原因的日志簿条目、诊断下载；`runtime_updated`、`current_c` 不写入 recorder。
- 指向设备、区域或 `all` 的服务调用也视为手动接管。设置流程按具体失败项报错（9 种原因）。
- 共享日程测试向量 `tests/fixtures/schedule_windows.json`：Blueprint 模板、集成和卡片三方一致（含 DST）。CI 每周对 HA 预发布版运行一次，失败不阻断，仅作 `adapter.py` 内部接口预警。
- 卡片：受控时标题显示当前侧（热泵 · 炉子备用／仅炉子供暖／热泵制冷），新增「ecobee 显示：<模式>」标签（0.9.7 起位于自动冷暖面板标题右侧）、死区条（制暖目标 ↔ 当前 ↔ 制冷目标）、24 小时时段条和倒计时；底部合并为一行（热源日程 + 自动冷暖调度开关）；报告合并为一张按时间倒序的时段表，每行色条和名称标明热泵时段／仅炉子时段；状态胶囊文字与正文色混合，浅色主题也清晰。

## Managed Auto 最新交接（2026-10-13）

- 新后端 `custom_components/ecobee_managed_auto/`，含设置／选项流程、开关实体、状态机和持久化写前日志。仅在用户已启用且原生模式为 Auto 时取得控制权；普通 Heat 保留 Blueprint。
- 唯一时段来源仍是选定 Blueprint 的输入。兼容性适配读取 HA `AutomationEntity._blueprint_inputs`，**不是**已展开的 `raw_config`。两者差异已通过真实 BlueprintInputs 类型测试。
- Blueprint 0.2.0 新增 `managed_auto_entity` 可选输入；控制器接管、恢复过程中，以及选定控制器失联时，Blueprint 不写设备。控制器也验证自动化绑定、同一温控器、观察模式和启用状态。
- 卡片 0.9.0 编辑器新增控制器选择；接管时显示双目标和供暖热源，实际设备级数和功率仍来自原始 ecobee 状态。Managed Auto 按钮打开原生开关详情。
- 非热泵窗口按当前 ecobee 冷暖目标选择 Cool／Aux-only。目标间保留当前侧；首入按距离选择。默认模式间隔 10 分钟、数据时效 20 分钟、回读超时 8 分钟，均在集成 GUI 可调。
- 超低电价窗口恢复原生 Auto，允许热泵制暖、制冷及原生辅助供暖。控制器不修改阈值、目标温度、日程或传感器参与设置。
- 手动模式变更停用托管；异常或普通停用尝试恢复 Auto。突然停电或断网期间无法保证双向冷暖切换，重新启动后需核对恢复并重新启用。这是软件控制的实质限制。
- 当前验证：HA 2024.12 和 2026.10.1 各 182 项 Python 测试通过；前端 117 项通过；当前 HA 原生适配正式核对版本为 2026.10.1。安装验证未强制实际制冷／供暖切换，不能将模拟测试表述为实机验证。
- 完整安装、状态含义、故障恢复和卸载流程见 [Managed Auto](managed-auto.md)。公开源码没有家庭实体 ID 或凭据；部署 ID 和备份路径只保留在仓库外的私有交接文档。


> 2026-10-13 更新：可选 Managed Auto 已实现（集成 0.1.0 / Blueprint 0.2.0 / 卡片 0.9.0）。以 [Managed Auto 文档](managed-auto.md) 为当前控制架构依据。下文原生 Auto 不调度的描述，适用于未启用该控制器的情况。托管模式依赖 HA/云端，断线不会自动恢复双向冷暖。


更新日期：2026 年 10 月 13 日。本文对应 **卡片 0.8.0、Blueprint 0.1.0**，用于继续开发、排查问题和准备公开发布。功能行为以仓库源码为准，历史验证结果见 [validation.md](validation.md)。

项目由两部分组成：**Blueprint 负责按时间选择供暖热源；自定义卡片负责展示、配置入口和运行报告。** ecobee 继续管理温度、Comfort Settings、房间传感器和设备分级。项目不计算最便宜的能源，也不替代 ecobee 的设备保护。

## 0.8.0 全年模式更新

卡片已升级为 0.8.0，Blueprint 保留 0.1.0。新增四季布局、制冷报告、独立分析时段及按实际活动分配的电量。`runtimeReport` 现在包含 cool/stages.cool/fan/idle；`activityEnergy` 取代旧窗口决定用电来源的逻辑，结果为 `activityEnergy[heating|cooling|fan][heat|aux]`。`heat/aux` 在最后一层只是时间窗口标识，不限制其中可以发生的活动。

`combineEnergy` 保存并求有效覆盖区间交集，已修正 min(两路覆盖时长) 的错误。电量仍是各路已知部分之和，星号和共同覆盖率说明不完整程度，不能把部分和当成完整电量。相同实体误选两次会隐藏电量并提示。

新增配置：`show_heating_report`、`show_cooling_report`、`heat_pump_energy_scope`（`outdoor_only` 或兼容默认 `with_blower`）、`report_schedule_source`（automation/custom）、`report_start/end/days`。后四项只影响分析，不能发送设备命令。GUI 自动跟随 HA 语言。

验证：前端 112 项通过，HA 2026.10.1 脚本/Schema 等 135 项通过；手机/宽屏、英文/中文、明暗主题、有/无电力监测的模拟界面验证完成。保留 `tests/preview.html` 供后续复现；所有数据为模拟，不能控制真实设备。

原生 Auto 内强制炉子依旧不支持；保留原生制冷/Auto 比模拟温控更符合本项目边界。没有为视觉验证强制启动家庭压缩机或炉子。下面较早章节的 0.7.0 细节以本节和现行源码为准。

## 继续工作前先读什么

全年工况的下一轮设计见 [全年运行与模式自适应方案](all-season-plan.zh-CN.md)。该文件区分拟实现的 Cool/Auto 布局与统计，以及现有接口尚不能提供的 Auto 内定时来源控制；不要将计划视为已上线功能。

1. 本文的“必须保持的产品约定”和“统计规则”。它们记录了已经确认的需求，不能在重构时退回旧设计。
2. [README 中文版](../README.zh-CN.md)：安装条件、用户配置和离线行为。
3. [设计说明](design.md)：Blueprint 的控制与回读契约。
4. [卡片说明](dashboard.md)：卡片配置、功率和历史报告。
5. [开发规范](../CONTRIBUTING.md)、[验证记录](validation.md)、[版本记录](../CHANGELOG.md)。

家庭实例的实体、主机、安装路径及截图在仓库外的私人部署交接文件中，不属于公开项目。公开示例必须继续使用通用实体名。

## 当前完成状态

| 项目 | 当前状态 |
| --- | --- |
| 热源调度 | 中英文独立 Blueprint，控制逻辑来自同一份源文件 |
| 可视化卡片 | 单个 JavaScript 模块，带 HA 可视化编辑器；0.7.0 起为现代化布局，宽卡片左右分栏，兼容毛玻璃主题 |
| 实时状态 | 温度、目标、Comfort、来源模式、热泵、炉子、风机、级数 |
| 可选功率 | 热泵和炉子电路分别选择，支持任意品牌 W/kW 传感器 |
| 调度解释 | 读取已有自动化配置，显示时段、下次切换、天气和压缩机最低外温 |
| 历史报告 | 每类时段最近开始的七次连续周期，跨午夜不拆分 |
| 分级报告 | 热泵和炉子各自一个单元格，三行 Total、Stage 1、Stage 2 |
| 可选电量 | 按 ecobee 报告的运行时间归属：热泵运行时热泵电路＋送风机（炉子电路），炉子运行时炉子电路，显示估算 kWh |
| 语言 | 卡片默认跟随当前 HA 用户；Blueprint 由安装的语言版本决定 |
| 自动化测试 | 前端最近一次 90 项通过；Python 最近一次 HA 2026.10.1 下 118 项通过（HA 2024.12.0 上一次完整记录为 117 项） |
| 实机验证 | 已在一套 HA 2026.10.1 上部署并查看仪表盘、编辑器及手机布局 |
| GitHub 发布 | 截至本文日期未配置 Git remote，项目文件仍未跟踪，尚未发布或运行托管 CI |

上表中的测试和界面验证不等于已验证所有设备型号、实际燃烧过程、云端可靠性或长期无人值守运行。本文是当前版本快照，继续开发后应更新版本和验证记录。

## 必须保持的产品约定

### 功能边界

- 用户自己确定费率和希望使用热泵的时间。不要把 Ottawa 或任何电力公司的费率、节假日规则写入核心逻辑。
- 晨间预热属于 ecobee 的 Comfort 和 Schedule。项目不创建 Wake up 设置，不调整参与控温的房间传感器。
- 热泵时段是正常 Heat，仍允许 ecobee 按本机阈值调用辅助供暖。它不是“绝对只用热泵”。
- 不主动修改 Heat Differential、Compressor → Aux 温差、最短运行时间、双燃料同时运行规则等本机设置。
- Blueprint 输入只放控制需要的参数。功率传感器、显示语言、报告开关等放在卡片设置里。
- 不假定所有用户都有 Vue，不猜测任何人的实体名。两路功率都可以不选，也可以只选其中一路。
- 报告按连续日程时段统计。不能改回自然日统计，也不能只给七天合计。

### 界面约定

- HA 使用英文时，卡片默认英文；不能因为开发对话使用中文就把界面硬编码成中文。
- 使用专业、明确的词语。避免“保底”“未回报运行”等含糊表述。
- 卡片和原生备用卡片用设备名，不用 ecobee 术语：室外设备制暖、制冷都叫 Heat pump／热泵，不用 Outdoor unit／室外机；ecobee 的 auxiliary heat 叫 Furnace／炉子（如 `Heat pump · Furnace backup`、`Furnace only`、`Furnace-only hours`，炉子格显示 `Heating · Stage N`）。详情里说明“炉子即 ecobee 的辅助供暖”。Blueprint 和 `aux_switch` 选择器保留 ecobee 原名 Auxiliary heat only，代码内部 `aux` 命名不改。
- 当前调度策略和设备实际运行是不同概念。选了热泵时段，设备仍可能待机或启动炉子。
- 右上角的运行图标只在设备运行（热泵、炉子、制冷、送风）或状态未知时显示；待机时不显示任何图标。
- 炉子制暖状态与 blower 状态分别显示。风机转动不等于炉子在燃烧。
- 热泵制暖与压缩机制冷共用室外电路，只展示一次热泵功率。
- （0.9.2 起）报告不再分热泵时段/仅炉子时段两个 tab：两个窗口的时段合并为一张表，按开始时间倒序排列（最近 7 天，最多 14 行）。
- 每行左侧色条标明所属窗口（热泵时段琥珀色、仅炉子时段橙红色），时间下方显示窗口名称；原生 Auto／分析时段及制冷报告用中性色条且不显示窗口名。旧规则：选中的报告 tab 用对应颜色填充并描边，表头分隔线跟随该颜色。不能退回只差透明度的样式。
- 炉子运行但 ecobee 没有报告 Fan 时，送风机显示“由炉子控制 / Controlled by furnace”，不能显示“未运行”。实际历史中燃气炉辅助供暖时从不报告 `fan`，但风机在由炉子主板驱动。
- 单元格里的运行占比细条以“已记录时长”为分母，缺失历史不能画成待机。
- 卡片面板使用半透明表面（`color-mix` 叠加文字色），不要写死不透明背景，否则毛玻璃主题失效。
- 报告表头是 `Period`，行内显示起止日期和时间；进行中的周期明确标记 `In progress`。
- Heat pump 和 Furnace 每格三行：`Total`、`Stage 1`、`Stage 2`。
- 缺失显示 `—`，已知零才显示 `0m` 或 `0`；部分记录显示星号。

## 仓库结构和修改入口

```text
ha-ecobee-dual-fuel-heat-pump-scheduler/
├── README.md / README.zh-CN.md       用户安装与行为说明
├── CONTRIBUTING.md                 开发约束和验证流程
├── CHANGELOG.md                    版本记录
├── ecobee-dual-fuel-card.js         自定义卡片、编辑器、历史计算
├── package.json                    卡片版本与 Node 检查命令
├── src/
│   ├── policy.jinja                Blueprint 的共享决策模板
│   ├── translations/zh-CN.yaml     中文 Blueprint 文案
│   └── dashboard/                  原生 YAML 备用卡片模板
├── scripts/
│   ├── build_blueprint.py          生成两种语言的 Blueprint
│   └── build_dashboard.py          生成四种原生备用卡片
├── blueprints/automation/          可安装的独立 YAML 产物
├── examples/                      通用配置示例
├── tests/
│   ├── frontend/                  Node 内置测试
│   └── test_*.py                  HA schema、模板和 Script 引擎测试
├── docs/                          设计、仪表盘、单位和验证文档
└── .github/workflows/              HA 兼容性及前端测试
```

| 想修改的内容 | 应修改的源文件 |
| --- | --- |
| 热源时段判定、实体验证 | `src/policy.jinja` |
| Blueprint 输入、动作、重试、通知 | `scripts/build_blueprint.py` |
| Blueprint 中文文案 | `src/translations/zh-CN.yaml` |
| 自定义卡片布局、表单、运行报告 | `ecobee-dual-fuel-card.js` |
| 原生 Markdown/Entities 备用卡片 | `scripts/build_dashboard.py`、`src/dashboard/` |

**不要直接维护两份 Blueprint 控制逻辑。** 安装 YAML 是生成产物；改源文件后一起生成中英文版本。原生备用卡片同样通过生成器维护。自定义 JavaScript 卡片目前不需要打包，也没有 npm 依赖。

## Blueprint 控制流程

### 所需实体

要求原生 HA ecobee 集成提供同一设备上的 `climate` 与 `Auxiliary heat only` 开关。可选阈值管理还需要同设备的压缩机最低外温 `number`。

普通 Heat 和 Auxiliary heat only 在 climate 的顶层状态都可能是 `heat`。因此必须读取辅助供暖开关，不能只看 climate 判断当前来源模式。HomeKit 或 ecobee-local 单独提供的 climate 不满足这份契约。

### 每次执行的顺序

1. 从当前时间和输入计算目标策略。
2. 验证所选实体、原生集成归属、同设备关系、可用性及日程有效性。
3. 当前必须是 Heat。Off、Cool、Heat/Cool 不由本项目接管。
4. 观察模式只记录决定，不发送设备命令。
5. 进入正常 Heat 前，如启用了阈值管理，先核对并在必要时写入阈值，等待可观察的回读。
6. 只有当前状态与目标不同才发送来源切换命令。
7. 每次重试或后续写入前重新检查当前时段和设备状态；等待中已经跨时段或用户切到 Off，就放弃旧决定。

来源切换方式：

| 目标 | 命令 | 必须核对 |
| --- | --- | --- |
| 正常 Heat | `climate.set_hvac_mode`，`hvac_mode: heat` | climate 仍为 Heat，并且辅助开关关闭 |
| 仅辅助供暖 | 辅助供暖开关 `switch.turn_on` | 辅助开关开启 |

**不要用辅助开关 `turn_off` 来恢复正常 Heat。** 现有设计避免依赖集成内存中保存的“上一模式”。原因见 [design.md](design.md)。

### 触发与容错

- 时段起止、HA 启动、自动化重新加载，以及每五分钟触发核对。
- `mode: single`，避免同时执行多次写入流程。
- 默认每条命令等待 240 秒、每次执行最多尝试两次，参数可配置。
- 安全条件位于 actions 内，手动 Run actions 也不会绕过。
- 成功调用服务不等于设备状态已经确认。
- 重试次数限制针对单次执行中的命令；后续周期仍可能重试，不是故障全生命周期的总上限。

停用自动化不会恢复之前的模式或阈值。HA 或云端离线时，ecobee 保留最后设置并继续自己的控温逻辑，可能错过时段边界。

### 时间和温度单位

时间使用 HA 配置时区，起点包含、终点不包含。星期表示窗口开始的日期。例如只选 Monday 的 23:00–07:00，包含周一晚上到周二早上；未选日期继续执行窗口外策略。

`cutoff_f` 保存原生 Fahrenheit 档位，范围来自当前 Blueprint 的选项。服务写入时转换为 number 实体显示单位，不提前舍入；回读允许显示精度误差。15°F 显示约 −9.4°C，不表示可以把原生阈值改为任意 0.1°C 步长。不要把读回的舍入值反复写入。详见 [units.md](units.md)。

## 卡片的数据与交互

### 配置参数

| 参数 | 作用与默认值 |
| --- | --- |
| `type` | `custom:ecobee-dual-fuel-card` |
| `entity` | 温控器 climate，主要数据源 |
| `aux_switch` | 同温控器的辅助供暖模式开关 |
| `automation` | 已有调度自动化，提供时段读取、启停和设置入口 |
| `cutoff_entity` | 可选最低外温实体；也可从设备关联与自动化配置查找 |
| `heat_pump_power_entity` | 可选热泵 W/kW 功率实体 |
| `furnace_power_entity` | 可选炉子/风机电路 W/kW 功率实体 |
| `power_note` | 可选采样说明，由用户自行填写 |
| `language` | `auto`，也可 `en` 或 `zh` |
| `name` | 可选显示标题 |
| `show_details` | 默认 `true`，设备详情 |
| `show_runtime_report` | 默认 `true`，运行报告 |
| `history_gap_minutes` | 默认 15，允许 5–120 分钟的整数 |
| `show_energy_report` | 默认 `true`；热泵时段需要热泵功率源（有炉子功率源时计入送风机），仅炉子时段需要炉子功率源 |
| `energy_integration_method` | 默认 `trapezoidal`；另有 `left`、`right` |

完整通用示例见 [custom_dashboard_card.yaml](../examples/custom_dashboard_card.yaml)。不要将家庭实际实体 ID 放进默认配置。

### 数据来源

- 当前设备状态来自 HA 提供的 `hass.states`。
- 调度配置从已有 automation 的配置接口读取，关联实体从 entity registry 获取。
- 室外温度使用关联到同一原生 ecobee 设备的 weather 实体，不随意选择另一个家庭气温传感器。
- compressor minimum 来自关联 number。天气来源和新鲜度在详情中说明。
- 设备级数来自 climate 的 `equipment_running`，不从功率大小推测。
- blower 优先读 ecobee `fan` 运行属性，必要时回退到精确的 `fan` 运行代码；`fan_mode` 是设定，不能代替运行状态。辅助供暖运行且没有 Fan 报告时显示“由炉子控制”，同样不用功率推断。
- 历史通过 HA WebSocket `history/history_during_period` 读取，保留属性变化和单位。

卡片不存储 HA 或 ecobee 凭据，使用当前已登录前端的连接。是否能读取配置和历史取决于当前用户权限。

### 允许产生的写操作

卡片的 Source schedule 开关只启停所选自动化。Schedule settings 导航到已有自动化的设置页。点击功率打开实体详情，报告 tab 只切换显示。

卡片本身不发送温度、风机、HVAC mode、阈值或 Comfort 写入。自动化启用后能执行其已经配置的控制逻辑，因此 Source schedule 开关具有实际控制含义。

### 刷新与缓存

- 组件定时器每 30 秒检查刷新；从 DOM 移除时清除定时器。
- 渲染使用固定骨架（`_ensureSkeleton`）加分区更新（`_setPart`）：只替换内容有变化的 main / report / controls 区域，`ha-card` 不重建。点击使用委托事件。不要退回整卡 `innerHTML` 重绘，否则切换 tab 会让页面跳动，主题样式也会反复重新应用。
- 自动化上下文读取节流约一分钟，entity registry 缓存约十分钟。
- 历史报告读取节流五分钟，只在前端卡片运行时进行。
- 改温控器、日程或功率来源会使相关缓存失效。
- 异步请求结果必须匹配当前绑定，避免用户更换实体后把旧设备结果写回来。
- 功率历史读取失败不应让已有运行时间消失；温控器历史失败应显示不可用。

## 连续时段统计规则

### 行的定义

`schedulePeriods()` 为两类策略分别返回最近七次**已经开始**的连续时段。正在进行的时段占一行，未来时段不显示。

例如每天 23:00–07:00：

| 报告视图 | 一行代表的范围 |
| --- | --- |
| Heat-pump hours | 10 月 12 日 23:00 → 10 月 13 日 07:00 |
| Furnace-only hours | 10 月 13 日 07:00 → 10 月 13 日 23:00 |

23:59 和次日 00:01 属于同一个热泵周期。不能再使用日期字符串作为积分桶的唯一键。周期 ID 由类型和真实开始时间戳组成，例如 `heat:<timestamp>`。

如果只在周一开启热泵窗口，周二 07:00 到下周一 23:00 是一个连续炉子时段，不拆成六个日历日。因此“七次”可能覆盖数周，需要足够的 Recorder 保留时间。

实现依据实际 UTC 时间轴检查 HA 本地时钟和星期，并包含输入中的秒边界。夏令时跨夜可有 7 或 9 小时；回拨时，落在重复小时内的短窗口还可能形成两次独立连续时段。不要用固定 24 小时相减替代。

### 运行时间与级数

`runtimeReport()` 使用区间内的 ecobee 状态：

| 来源 | 一级 | 二级 | 三级 |
| --- | --- | --- | --- |
| 热泵制暖 | `heatPump` | `heatPump2` | `heatPump3` |
| 辅助供暖 | `auxHeat1` | `auxHeat2` | `auxHeat3` |

对每个来源独立取最高级数。例如 `heatPump,heatPump2` 表示该来源二级计时，不能同时把这一分钟计到一级。热泵与辅助同时出现时，各自分别计时，不跨来源去重。

每个周期保存总运行时间和三个级数的内部计数。界面按照当前产品要求只显示 Total、Stage 1、Stage 2 三行。三级如果出现，仍计入 Total，并在详情中提示，不伪装成二级。

只开风机和制冷不计作制暖。显示分钟向下取整，亚分钟使用 `<1m`；各项独立格式化，因此显示的分项之和偶尔可能与总计有一分钟差异，内部毫秒计数仍应相符。

### 缺失数据与进行中的时段

1. 记录按更新时间排序，同时间戳保留最后一条；不使用很旧的 `last_changed` 替代已有的 `last_updated`。
2. `unknown`、`unavailable`、恢复状态、缺少运行属性或未知设备代码不能当作待机。
3. 超过 `history_gap_minutes` 的记录间隔整段排除，不把最后状态无限延长。
4. 最后一个运行状态只在报告结束点仍满足间隔限制时延伸至刷新时间。
5. 请求不依赖 HA 合成的起点状态，而是向前多读一个允许间隔寻找真实记录。
6. 没有覆盖的单元格三行都是 `—`；有有效覆盖但没有运行才是 0。
7. 进行中的周期，只以开始到刷新时刻作为已过去范围；结束时刻仍显示计划边界。

当前运行时长星号有一分钟的显示容差，电量覆盖星号的容差为一秒。修改时必须保持覆盖率与数值含义一致。星号作用于整个三行单元格，不代表只有 Total 不完整。

**报告使用当前保存的日程回溯分组。** 它没有保存每个历史时刻的自动化配置、启停或观察模式，也不是自动化是否真正执行过的审计。更改日程会重新划分过去记录。

## 电量估算规则

`periodEnergy(..., window, attribution)` 与运行报告复用同一批周期 ID 和起止时间。`equipmentIntervals()` 用与运行报告相同的有效性规则把 ecobee 状态切成区间；功率区间再按这些区间切分，只有 `attribution.active(codes)` 为真的部分计入 kWh，状态已知的部分都计入覆盖时长，状态未知的部分不算覆盖。

归属规则（`ENERGY_ATTRIBUTION`）：

- 热泵时段：热泵电路在 `heatPump*` 或 `compCool*` 时计入；炉子电路在热泵运行且 `auxHeat*` 未运行时计入（送风机）。两者用 `combineEnergy()` 相加，覆盖时长取两者较小值。
- 仅炉子时段：炉子电路只在 `auxHeat*` 时计入。
- 待机、单独 `fan`、`ventilator` 都不计入；炉子与热泵同时运行时炉子电路归炉子。

`report.energy` 按 `{heat, aux}` 分别保存，各自有 `status`；`heat.blower=false` 表示未选炉子功率源，详情会说明不含送风机。

这符合“该设备运行时的用电”含义。它不是燃气用量、热量、COP，也不是“只在压缩机制暖时耗了多少电”的另一种指标。

计算方式：

```text
区间 kWh = 区间平均功率 W × 有效区间毫秒 / 3,600,000,000
周期 kWh = 与该周期相交的所有有效区间之和
```

支持三种方法：梯形法线性插值，left 使用区间前一读数，right 使用后一读数。根据传感器定义选择，不能把每分钟平均功率与瞬时功率不加区分地宣称为精确电表计量。

两端必须都有有效非负 W/kW 值；kW 转为 W。负值、未知值、恢复数据、kWh 等错误单位和过长间隔都不计入。首条之前、末条之后不外推。区间先裁剪到周期和读取范围，再积分。

只要选了任一功率传感器，就显示 kWh 列，保证列宽一致；没有对应传感器的时段单元格留空（不是 `—`）。两个都没选时隐藏该列且不请求功率历史。关闭电量显示保留运行报告，关闭整个报告则不读取这两类历史。

电量与设备状态历史覆盖率分别计算。`3.36*` 表示有效记录覆盖部分的估算之和，不能当作整夜完整电量。累计 Wh/kWh 电表和 HA 长期统计目前尚未接入此算法。

## 前端代码导航

| 函数或类 | 职责 |
| --- | --- |
| `normalizeConfig`、`editorSchema` | 默认值、输入校验、可视化表单 |
| `languageFor`、`labelsFor` | 根据 HA 用户语言选择文案 |
| `cardModel`、`powerReading` | 实时设备、级数、风机、功率、湿度及主状态（activity）的显示模型 |
| `readSchedule`、`deviceLinks`、`loadControlContext` | 读取 Blueprint 输入和同设备关联 |
| `scheduleAt`、`logicModel` | 当前窗口、下次切换、策略差异、天气阈值展示 |
| `schedulePeriods`、`runtimePeriodStart` | 七次连续周期和历史请求起点 |
| `runtimeReport`、`loadRuntimeHistory` | 制暖总时间、各级时间及缺失覆盖 |
| `periodEnergy`、`loadPowerHistory` | 功率历史积分及独立覆盖 |
| `dayTimeline`、`nextBoundaryTime` | 当天 24 小时热源条、下次切换的真实时刻（跨夏令时校正） |
| `runtimeReportHTML` | 合并时段表（按时间倒序）、三行单元格、运行占比条、电量列、详情 |
| `EcobeeDualFuelCard` | 生命周期、缓存、请求协调、骨架与分区渲染、自动化启停 |
| `EcobeeDualFuelEditor` | HA 原生表单编辑器与配置变更事件 |

前端有时段判定实现，Blueprint 也有 Jinja 判定实现。它们用途不同但语义必须一致；修改星期、跨夜或夏令时规则时要同时检查两边的测试，不能只修显示。

## 开发和验证流程

### 前端修改

Node 20 或更高版本，无需安装 npm 包：

```sh
npm run check
npm test
```

测试文件分别覆盖设备与编辑器、控制逻辑、运行周期、电量。需要验证计算规则时增加行为测试；纯文案调整可以更新已有预期，不必创造镜像实现的测试。

浏览器验证至少包含当前改动涉及的状态：英文/中文、两种窗口的行、没有功率源或只有一路、完整/部分/无历史、手机和桌面。通过已有记录或模拟数据检查，不要为截图启动真实制暖。

### Blueprint 和原生备用卡片修改

用 [CONTRIBUTING.md](../CONTRIBUTING.md) 的隔离环境安装与目标版本匹配的 Home Assistant。当前仓库 CI 矩阵为 HA 2024.12.0 / Python 3.12，以及 HA 2026.10.1 / Python 3.14；较新的 HA 测试环境要求 Python 3.14.2 或以上。最旧测试组合还有 `josepy<2` 兼容约束，完整安装命令以 workflow 为准。

在已准备好的环境中运行：

```sh
python scripts/build_blueprint.py
python scripts/build_dashboard.py
python scripts/build_blueprint.py --check
python scripts/build_dashboard.py --check
python -m pytest -q
```

生成检查只比较产物与源文件是否一致；pytest 还使用 HA Blueprint loader、schema、模板及 Script 引擎。不能以“YAML 能解析”代替行为验证。

每次维护应记录运行的版本、检查结果和实机验证范围。不要把之前的 117 项 Python 测试写成刚刚又运行过，也不要把本地测试写成 GitHub Actions 已通过。

## 发布和部署

### 三套版本不要混淆

- Blueprint 的版本位于生成器产生的描述中；目前 0.1.0。
- 卡片版本同时维护 `CARD_VERSION` 和 `package.json`；目前 0.8.0。
- Dashboard resource URL 的 `?v=` 用于刷新缓存，应随部署同步。

### 卡片更新

1. 完成本地修改和相应检查。
2. 备份当前 `/config/www/ecobee-dual-fuel-card.js` 和相关仪表盘配置。
3. 将新的独立 JS 文件写到同一路径，尽可能使用临时文件加原子替换。
4. 在 HA Dashboard Resources 中更新已有 resource 为 `/local/ecobee-dual-fuel-card.js?v=<version>`，类型 module；避免创建重复加载项。
5. 刷新前端，核对实际加载的版本、卡片配置、数据和布局。普通 JS 更新不需要重启整个 HA。
6. 保存验证结果；出现问题时恢复旧 JS，并再次修改 resource 查询版本让浏览器重新加载。

仅更新前端时，不应重写 Blueprint 输入或触发实际设备命令。代码回滚也不会自动回滚历史数据或设备状态。

### Blueprint 更新

安装生成的 YAML 到 `/config/blueprints/automation/<项目目录>/`，保留现有 automation ID 和输入，随后重载自动化并检查。不要为了换文案新建第二个控制同一温控器的自动化。

### GitHub 发布前剩余步骤

截至本文日期，项目尚未创建可用的远程发布地址。下一次发布工作需要建立真实 repository、提交经检查的文件，再配置 remote 和推送；不应生成指向占位仓库的导入链接。

检查通用示例不含家庭实体、账号、序列号、账单或真实历史。工作区的私人输出不应一并上传。首次提交后运行仓库中的 CI，成功后再创建发布版本、补充真实 Blueprint `source_url` 和导入链接。

当前自定义卡片采用手动文件/resource 安装流程，不应对外宣传已经是 HACS 可安装项目。若准备支持 HACS，需要单独设计其目录、元数据、release 资产和验证流程。

## 已知限制和待办

| 项目 | 当前影响或下一步 |
| --- | --- |
| 尚未公开发布 | 建立远程仓库、首次提交、CI、release 和真实安装链接 |
| 单个 JS 文件较大 | 后续可拆分测试友好的源码模块，但保持简单发布产物，不先引入无必要依赖 |
| 前端历史间隔保守 | 长时间状态不变可能被当作缺失，不能简单调大阈值并宣称精确 |
| 没有持久历史策略日志 | 统计使用当前日程；如需审计过去配置，需要单独设计记录机制 |
| 电量依赖原始功率历史 | HA 停机或清理后不能补回；累计电表和长期统计是独立后续功能 |
| 卡片打开时才计算报告 | 没有后台聚合器、报告存档或无人值守导出 |
| 阶段时间是云端状态估计 | 不能视为电气接点或燃烧器实测时长，更新延迟仍会影响边界 |
| 原生备用卡片功能不同 | 自定义卡片的 GUI 和运行报告不能自动等同于旧 YAML 示例 |
| 权限受限用户 | 应继续验证无法读取 automation 配置或 history 时的提示 |
| 长周期与异常时区 | 非每日窗口、跨月跨年、长运行时长、夏令时应继续纳入验证 |
| 目标温度显示差异 | 不用四舍五入“修正”真实状态；需要比较 ecobee 后端和 Comfort 数据 |
| 安全保护的可见性 | 目前无法从这些实体读全所有本机辅助供暖条件，不能显示成已经核实的配置 |

优先级建议：先完善公开发布与可重复安装；再改善历史覆盖、权限提示及更大数据量下的表现。不要在修界面时顺便引入费率优化、预热控制或家庭硬编码。

## 常见问题排查

| 现象 | 优先检查 |
| --- | --- |
| 更新后界面没有变化 | 已安装 JS 内容、resource 是否指向同一路径、版本参数、浏览器缓存及重复 resource |
| `Custom element doesn't exist` | JS resource 是否为 module，文件能否通过 `/local/` 访问，浏览器模块加载错误 |
| 模式看起来是 Heat 却仍为辅助供暖 | 查看同设备 Auxiliary heat only 开关；不要只检查 climate 顶层状态 |
| 正常热泵时段出现炉子运行 | 查看 ecobee 本机阈值、室温差和室外温度；正常 Heat 本来就允许辅助供暖 |
| 停用调度后仍保持炉子模式 | 停用不是恢复原始模式；检查当前 ecobee 模式，再决定用户希望保留的模式 |
| 自动化名称或说明还是旧语言 | 它们是 automation 独立字段；卡片 auto 语言不会翻译这些字段，也不会切换 Blueprint YAML |
| 没有 kWh 列或某类时段的 kWh 为空 | 是否选择了对应电路的 W/kW 实体，以及两个报告开关是否均开启 |
| 功率有数字但电量是横线 | 是否有至少两个有效历史端点、单位是否正确、间隔是否过长、Recorder 是否记录该实体 |
| 显示 `0m*` | 有效覆盖中没检测到运行，其余区间未知；不能解释为整个周期零运行 |
| 七次时段超过七天 | 非每日配置下这是预期行为；查看开始日选择及连续辅助时段的跨度 |
| Stage 1 与 Stage 2 之和不等于 Total | 核对显示舍入和是否存在 Stage 3；再检查内部毫秒数，不先修表面数字 |
| `Runtime history unavailable` | 查看配置实体、History/Recorder 访问权限、请求错误与保留时间 |
| 调度配置无法读取 | 所选 automation 是否存在、Blueprint 路径是否受支持、实体是否匹配、当前用户是否有配置读取权限 |
| 目标温度 21.8°C 与本机 UI 不同 | 按 units.md 比较原始值与 Comfort 设置，不能直接把卡片值改成 22°C |

排查当前记录时，先在 HA 中读取实体、现有配置和自动化 trace。不要用手动改变温度或启动炉子来验证一个纯显示问题。

## 下一次工作可直接使用的任务描述

> 请继续维护 ha-ecobee-dual-fuel-heat-pump-scheduler。先阅读 docs/development-handoff.zh-CN.md、CONTRIBUTING.md 和当前源码，检查 git 状态。当前基线为 Blueprint 0.1.0、卡片 0.8.0。保持按连续 schedule 周期分组、热泵和炉子每格 Total/Stage 1/Stage 2 三行、热泵电路可选电量、HA 用户语言、设备名术语（Heat pump／Furnace，不用 Outdoor unit／Aux）、清晰的彩色 tab、炉子运行时“由炉子控制”的送风机状态，以及骨架加分区更新的渲染方式。设备来源调度仍由 Blueprint 执行，温度和 Comfort 仍由 ecobee 管理。根据本次具体任务修改，运行适当验证；需要更新家庭 HA 时，先查看仓库外私人部署交接中的安装记录，并核对现有配置。不得把私人部署信息加入公共仓库。

继续工作后，请同时更新这里的版本快照、CHANGELOG 和 validation，避免未来再次按旧的“每天一行”或旧版本文案继续开发。
