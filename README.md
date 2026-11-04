# 纺织服装家纺质量案例库 v2

面向美国市场的服装、家纺与原辅料质量案例库：**结构化事实 + 叙述 + 注册表 + 可执行的治理规则**。

> 全部案例为示例案例（`provenance: illustrative`），数字用于教学；法规与标准条目是工作参考，不构成法律意见。

## 快速开始
```bash
npm run build
```
构建会先运行校验器（有错误就停止），再生成 `dist/catalog.json` 与 `dist/catalog.js`。之后直接用浏览器打开 `index.html` 即可离线浏览；也可以在项目根目录起一个静态服务器。

只做检查：
```bash
npm run validate
```

校验器自测（在临时副本中注入 16 类典型错误，确认每条规则都会触发）：
```bash
npm test
```

## 目录
| 路径 | 内容 | 是否手工维护 |
| :--- | :--- | :---: |
| `governance/` | 治理文件 GOV-00 至 GOV-10 | 是 |
| `registry/` | **唯一事实来源**：分类（taxonomy）、标准、法规、指标口径、编辑规则 | 是 |
| `cases/<前缀>/<ID>_<slug>/` | `case.json`（事实与数字）+ `case.md`（叙述）+ 评审记录 | 是 |
| `playbooks/` | 8D、FMEA、DMAIC、RCA、控制计划、SPC、MSA、AQL 模板 | 是 |
| `sops/` | 跨部门 SOP（DFQ、IQC、召回、8D、面料风控等） | 是 |
| `references/` | 法规指南（CPSIA/燃烧性等）、检测矩阵（解释性，与注册表冲突时以注册表为准） | 是 |
| `frameworks/` | 质量架构论（成熟度模型、COQ、供应商架构、数据架构） | 是 |
| `interview/` | 高频问答、冲突情景（STAR 索引由构建生成） | 是 |
| `templates/` | 新案例模板、评审记录模板 | 是 |
| `scripts/` | 校验器、构建脚本、校验器自测 | 是 |
| `audits/` | 独立审计报告存档 | 由 `/audit-cases` 生成，不删除 |
| `.claude/agents/case-auditor.md` | 独立审计代理定义 | 是 |
| `.claude/commands/audit-cases.md` | `/audit-cases` 命令 | 是 |
| `site/` + `index.html` | 数据驱动的浏览站点，不写死任何内容 | 是 |
| `dist/` | 构建产物 | **否，禁止手改** |

## 设计要点
1. **数字只写一次**：指标、损失台账、处置决策写在 `case.json`；卡片标题、STAR 索引由构建生成；叙述中的数字由校验器与 `case.json` 比对。
2. **规则可执行**：撤销的标准、废止的法规、等级型指标算 Cpk、台账加总不符、真实品牌名、绝对化措辞、失效链接，都会被 `npm run validate` 拦截。
3. **区分要求来源**：法定 / 客户 / 行业惯例分开写；法规条目带来源与核实日期，过期自动提醒。
4. **事故必写处置与代价**：质量事故类案例缺少处置或损失台账会报错。
5. **评审流程**：draft → technical-review → compliance-review → approved → retired（见 [GOV-01](governance/GOV-01_roles-and-review-workflow.md)）。

## 独立审计
在 Claude Code 中运行：
```
/audit-cases APP-001
/audit-cases HT
/audit-cases all
```
审计代理 `case-auditor` 以资深审计员身份工作：只读、只找问题、不代写；先跑校验器，只报告机器查不出的问题；每条发现带位置、原文、依据、严重度（Critical/Major/Minor/Observation）与置信度。报告保存在 `audits/`。规则见 [GOV-10](governance/GOV-10_independent-audit.md)。

## 新增一个案例
1. 复制 `templates/case-incident/`（或 `case-short/`）到 `cases/<前缀>/<新ID>_<slug>/`；
2. 填 `case.json`：枚举值取自 `registry/taxonomy.json`，指标 ID 取自 `registry/metrics.json`，标准/法规 ID 取自对应注册表（没有就先登记）；
3. 写 `case.md`，遵守 [GOV-02 案例编写标准](governance/GOV-02_case-writing-standard.md)；
4. `npm run validate` 直到零错误，提交评审。

## 当前状态
- 46 个案例、34 个文档（含 9 个 playbooks、8 个 SOPs、3 个 references、4 个 frameworks），全部为 `draft`，待指定评审人；
- 法规注册表负责人未指定；未核实条目在站点“治理与健康度”页列出。
