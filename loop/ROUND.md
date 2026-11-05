# 自动扩充循环：单轮执行规程

你在无人值守状态下执行**一轮**案例扩充。没有人会回答问题，不要提问，也不要等待确认。库主（仓库所有者）已经授权本规程中的全部操作，包括直接提交并推送到 `main`。本规程没有授权的操作一律不做。

参数在 `loop/config.json`，进度在 `loop/state.json`，执行时先读这两个文件。

## 0. 准备与退出条件
1. 确认当前目录是本仓库的克隆；不是就 `git clone <config.repo>` 并进入。切到 `main`，执行 `git pull origin main`。
2. 依次检查，满足任一条就**立即结束本轮**，不做任何修改：
   - 仓库根目录存在 `LOOP_STOP` 文件；
   - `state.roundsCompleted >= config.maxRounds`：此时如果 `config.triggerId` 不为空，且有可用的定时任务工具，把该定时任务设为停用（enabled=false），然后结束；
   - `state.lock` 不为空，且距 `lock.startedAt` 不到 `config.lockHours` 小时（上一轮还在跑）。
3. 加锁：把 `state.lock` 设为 `{ "startedAt": "<当前 UTC 时间 ISO 格式>", "round": <roundsCompleted+1> }`，提交 `Loop round N: start`，推送。推送被拒时先 `git pull --rebase`，重新检查第 2 步，仍可继续就再推一次；还是失败就结束本轮。
4. `npm run validate` 必须是 0 errors。如果开始时就有错误，说明有人改坏了仓库：不要修，在 `loop/log.md` 记录错误，释放锁（`state.lock = null`），提交推送后结束。

## 1. 必读材料（每轮都读，不凭记忆）
- `governance/GOV-02_case-writing-standard.md`（编写标准，全文）、`GOV-03`（指标口径）、`GOV-05`（来源属性与保密）、`GOV-06`（评审清单）、`GOV-10`（独立审计）；
- `registry/` 下全部注册表；
- 风格参照各读一个完整案例（`case.json` 与 `case.md`）：事故类 `APP-001`，门禁类 `APP-008` 或 `HT-008`，持续改进类 `HT-009`；
- `loop/log.md` 的最近三轮记录（避免重复、吸取审计教训）。

## 2. 选题
1. 运行 `node scripts/coverage.mjs`，看三个领域现有的产品、失效模式、案例类型与阶段。
2. 本轮 `config.casesPerRound` 个案例按领域分配：`domainRotation[rotationIndex % 3]` 的领域得 2 个，其余两个领域各 3 个。**不写 systemic 体系类案例。**
3. 案例类型按 `config.caseTypeMix`（事故 3 / 门禁 2 / 持续改进 3），三个领域之间尽量交错，不要同一领域全是同一类型。
4. 去重与多样性（硬性要求）：
   - 产品 × 主失效模式的组合不得与已有案例相同；同一产品可以写，但必须是不同的失效机理；
   - 优先选择 `coverage.mjs` 中“本领域未用过的失效模式”，以及现有案例很少的阶段（产前/开发、产中、出货/到港）；
   - 不要把案例都写成“评论投诉率 X → Y”：头号指标优先用实验室或过程指标（强力、色牢度、缩率、pH、克重、透气量等），售后退货类指标只作辅助；
   - 原料辅料（RM）案例的主体是面料、纱线、辅料（拉链、纽扣、四合扣、松紧带、衬布、缝线、标签、填充物等）本身的问题，不是成衣问题。
5. 在动笔前，把本轮 8 个选题写成一张表（ID、领域、类型、阶段、产品、失效模式、头号指标、引用的标准），检查一遍是否满足以上要求，再开始写。

## 3. 写案例（中文）
每个案例一个目录：`cases/<前缀>/<ID>_<英文短名>/`，包含 `case.json` 与 `case.md`。编号接着现有最大号往下排（`coverage.mjs` 给出下一个编号）。

`case.json`：
- 以 `templates/case-incident/case.json` 为结构；`provenance: "illustrative"`；`market: "US"`；`version: "1.0.0"`；`updatedAt` 为今天；
- `review`：`status: "draft"`，评审人与日期为 `null`，`notes`: `自动循环第 N 轮生成，已经独立审计（audits/<报告文件名>），待指定评审人按 GOV-01 评审`；
- 事故类必须有 `order`、`ledger`（逐项注明口径，加总等于 `totalUsd`）与 `disposition`；门禁和持续改进类照同类型现有案例的写法（`order`、`ledger`、`disposition` 为 `null`）；
- 指标只用 `registry/metrics.json` 已有的 ID；确实没有合适的才新增（见第 5 节）。

`case.md`：
- 章节结构参照同类型的现有案例，必须包含 `registry/taxonomy.json` 中该类型的 `requiredMarkers`（如事故类：背景、根因、处置、验证、STAR）；
- 遵守 GOV-02 的全部写作规则：写清要求的来源（法定 / 客户 / 行业惯例）；方法引用写清条件；数字只写一次，叙述中的指标数值与 `case.json` 一致；事故必写处置与代价；时间线与工序周期匹配；措辞不绝对化；STAR 不引入新数字并写清代价；
- 不点名真实零售商、品牌、工厂、实验室（用“美国大型零售连锁”“第三方实验室”等泛称），产品用通用名称；
- 机理要在物理/化学上成立，根因要有验证试验（对比试验、分层复测）支撑，量级要可信。宁可写得朴素，也不要编造不存在的标准条款或检测方法。

## 4. 写英文版
- 在 `site/cases-en.js` 的 `window.__CASES_EN__` 中为每个新案例加条目，字段与现有条目一致：`title, summary, headline, product, narrative, order, ledger, disposition, metricNotes, reviewNotes`。持续改进/门禁类的 `order`、`ledger`、`disposition` 为 `null`；事故类要逐项翻译台账与处置（条目数与中文相同）；
- `narrative` 的章节、段落、列表、表格与中文**一一对应**，标题编号用 `## 1.` 而不是 `## 一、`；中文的每个数字都要在英文中出现（写阿拉伯数字，“万”换算成完整数字）；`headline` 的格式与现有条目一致（`<指标英文名> <前值> ⟴ <后值> <单位>`）；
- 修改 `site/cases-en.js` 时用脚本读入、合并、按原格式写回（单行 JSON，保留开头的 BOM），不要手工改这个单行文件；新条目放在同前缀案例的末尾；
- 每次修改了 `site/cases-en.js`、`site/registry-en.js` 或 `site/i18n.js`，把 `index.html` 中对应 `<script>` 的 `?v=` 数字加 1。

## 5. 注册表（尽量不动）
- **法规**：不新增、不修改 `registry/regulations.json`；只引用已有条目。需要的法规不在注册表里，就换选题。
- **标准**：优先用已有条目；确有必要可新增，`verifiedAt` 必须为 `null`，`title` 只写你确定的正式名称，不确定的写进 `notes` 说明“名称待核实”；同时在 `site/registry-en.js` 补英文。
- **指标**：确有必要可在 `registry/metrics.json` 新增，写清单位、类型、方向、是否允许 Cpk 与定义（定义要写测试方法与条件）；同时在 `site/registry-en.js` 补英文；新方向值要在 `site/i18n.js` 的 `reg.met.dir` 中补中英文名称。
- **失效模式**：现有的都不合适才在 `registry/taxonomy.json` 新增，并在 `site/i18n.js` 的 `tx.failureModes` 中补中英文名称。
- 不修改任何已有的注册表条目、已有案例、治理文件、模板、SOP。

## 6. 机器检查
依次运行，全部通过才能进入审计：
```bash
npm run validate
npm test
node scripts/build.mjs
node scripts/check-en.mjs --strict <本轮全部新 ID>
node scripts/check-en.mjs
```
`validate` 须 0 errors（warnings 可以有，但不得比开始时多出与新案例无关的警告）；`check-en` 须 0 errors。不通过就修改新案例本身，直到通过。

## 7. 独立审计
1. 用子代理（Agent 工具，新的上下文）执行审计。给它的提示只包含：`请读 loop/AUDITOR.md，按其中的要求审计以下案例：<ID 列表>`。不要把写作过程、选题理由或你对案例的评价告诉它。
2. 把子代理返回的报告原文保存为 `audits/AUDIT-<YYYYMMDD>-loop<轮次两位数>.md`。
3. 逐条处理发现，写入 `audits/AUDIT-<YYYYMMDD>-loop<轮次>-response.md`：每条写“已修正（改了什么）/ 不同意（理由）/ 需更多信息”。Critical 与 Major 必须修正或给出站得住的不同意理由；Minor 能改就改。
4. 有 Critical 或 Major 的案例，修正后重新运行第 6 节检查，再用**新的**子代理只复审这些案例（报告存为 `...-loop<轮次>-r2.md`）。最多 `config.maxAuditPasses` 轮。
5. 最后一轮审计后仍有未解决 Critical/Major 的案例：从本轮**删除**（删目录与英文条目），在日志中写明原因。被删的编号可以留空，不必回收。

## 8. 收尾与推送
1. 再完整运行一次第 6 节检查，全部通过。
2. 更新 `CHANGELOG.md` 的“未发布”部分：一行写本轮新增的案例 ID 与审计报告文件名。
3. 更新 `loop/state.json`：`roundsCompleted + 1`、`rotationIndex + 1`、`lock: null`，在 `history` 追加 `{ round, date, cases: [...], dropped: [...], audit: "<报告文件名>", findings: { critical, major, minor, observation } }`。
4. 在 `loop/log.md` 末尾追加本轮记录：日期、新增案例表（ID、类型、产品、失效模式）、审计发现数量与主要问题、被删案例与原因、下一轮应注意的事项（例如审计反复指出的同类问题）。
5. 一次提交全部改动，提交信息：`Loop round N: add <数量> cases (<ID 列表>)`，正文列出审计发现统计。推送到 `main`：先 `git pull --rebase origin main`，再 `git push origin main`；网络失败按 2s、4s、8s、16s 重试。
6. 如果本轮一个案例都没有留下：仍然提交 `state.json`（释放锁，`roundsCompleted` 照常加 1）和 `log.md`，写明原因。

## 9. 出错时
- 任何一步无法继续（工具不可用、命令被拦截且没有替代办法、推送反复失败）：尽量把已完成且通过检查的案例提交推送；否则至少释放锁并在 `log.md` 记录原因再推送。不要留下 `lock` 不释放。
- 不得为了通过检查而修改校验器、测试、构建脚本、`check-en.mjs` 或治理文件。
