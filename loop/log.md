# 循环日志

每轮执行后在末尾追加记录（见 loop/ROUND.md 第 8 节）。

## 第 1 轮（2026-11-05）

### 新增案例（7 个，均为 draft）
| ID | 类型 | 阶段 | 产品 | 失效模式 | 头号指标 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| APP-018 | ci | production | 男式涤纶速干 Polo 衫 | absorbency | absorbency-s 33 → 3.5 s |
| HT-018 | incident | production | 涤棉床单套件 | pilling | pilling-grade 2.0 → 3.5 |
| HT-019 | gate | development | 床品配套套件（棉缎被套 + 涤纶丝绒抱枕套） | metamerism | metamerism-index 2.6 → 0.7 |
| HT-020 | ci | production | 纯棉毛圈浴巾 | dimensional-change | dimensional-change-pct -8.6 → -4.9% |
| RM-011 | incident | production | 涤纶包芯缝纫线（Tex 40） | seam-failure | seam-break-force-lbf 42 → 64 |
| RM-012 | gate | development | 涤纶塔夫绸里布 | seam-slippage | seam-opening-load-lbf 9.5 → 18.0 |
| RM-013 | ci | production | PU 涂层锦纶塔夫绸面料 | blocking | blocking-grade 2 → 4 |

注册表：新增标准 ASTM-D204（缝纫线试验方法，verifiedAt 为空，条款待核实）。为 APP-019 新增的指标 packing-moisture-regain 随该案撤回。

### 审计
- 首轮（`audits/AUDIT-20261105-loop01.md`）：Critical 0 / Major 2 / Minor 15 / Observation 4。Major：HT-020 生产批数与节奏矛盾；APP-019 柜别与烘干机分层混淆、柜体因素未排除。主要 Minor：改进前指标口径（APP-018 混入旧工艺批）、处置数量重复计算（RM-011）、方法条件不全（RM-013 载荷面积、HT-019 测色几何与 MI 公式）、已流出批未处置（RM-013）、时间线偏紧（HT-018）、本轮验证段多用 2 × 2 套路。
- 复审（`audits/AUDIT-20261105-loop01-r2.md`，APP-019、HT-020）：Critical 0 / Major 1 / Minor 6 / Observation 3。
- 合计（state.json）：Critical 0 / Major 3 / Minor 21 / Observation 7。处理结果见 `audits/AUDIT-20261105-loop01-response.md`。

### 被删案例
- **APP-019**（纯棉斜纹休闲裤海运发霉，incident/shipment）：复审后仍有 Major——补的“柜别 × 烘干机”交叉表显示 B 机货在 1 号柜几乎不长霉，与“封袋后袋内湿度由成衣含湿决定、柜内条件只是叠加因素”的机理相矛盾，柜内受潮如何进入封口袋内没有交代。审计轮次已用完，按规程删除，编号留空。

### 下一轮注意
1. **补分层数据前先核对它与机理是否自洽**：APP-019 为回应首轮意见补了交叉表，新数据反而推翻了原机理。补数据时同步检查每一条机理论断。
2. **验证形式不要同一轮集中用 2 × 2**：首轮审计指出套路化。可交替使用留样追溯、单因素梯度、分层复测、生产记录追溯。
3. **数字口径**：改进前后要用同一口径（同一批范围、同一测试时点）；生产批数要与生产节奏、观察期匹配；尺寸变化用负号时限值写成“≥ -x%”，不要与“缩率 ≤ x%”混用。
4. **方法条件写全**：载荷连同试样面积或压强、测色几何（SCI/SCE）、MI 计算公式、撕破方向定义。
5. **ci 类案例也要交代已流出的不合格品怎么处置、谁承担**；溶剂型工艺改排风要评估 LEL 安全。
6. 本轮轮换：服装 1 个（原计划 2 个，删 1 个）、家纺 3 个、原料辅料 3 个。下一轮 rotationIndex = 1，家纺得 2 个。

## 第 2 轮（2026-11-05）

### 新增案例（8 个，均为 draft）
| ID | 类型 | 阶段 | 产品 | 失效模式 | 头号指标 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| APP-020 | incident | shipment | 男式涤纶针织运动 T 恤（塑溶胶印花） | blocking | blocking-grade 2 → 4 |
| APP-021 | gate | development | 女式撞色拼接纯棉针织连衣裙 | colorfastness | staining-grade 2.5 → 4.0 |
| APP-022 | ci | production | 男式棉涤抓绒连帽卫衣 | lint-shedding | lint-loss 0.9 → 0.35% |
| HT-021 | incident | production | 涤纶浴帘（金属扣眼） | corrosion | salt-spray-hours 4 → 72 h |
| HT-022 | ci | production | 涤纶纤维枕芯（纯棉高密布壳） | seam-failure | seam-break-force-N 168 → 245 N |
| RM-014 | incident | production | 20D 锦纶高密防绒塔夫绸 | down-leakage | downproof-air-permeability 1.9 → 0.6 cc/s/cm² |
| RM-015 | gate | development | 7D 中空三维卷曲涤纶短纤（填充物） | loft-loss | loft-retention-pct 72 → 91% |
| RM-016 | ci | production | 精梳棉单面汗布（150 g/m²） | weight-deficiency | fabric-gsm 143 → 151 g/m² |

编号：APP-019 按第 1 轮决定留空，服装从 APP-020 起编（`coverage.mjs` 仍显示下一个为 APP-019，因为它只看现有目录）。
注册表：新增标准 ASTM-D737（织物透气性）、ASTM-D3937（人造短纤维卷曲频率，名称待核实），verifiedAt 均为空，英文已补。APP-020 引用 FTC-303，新增一条与本案相关的“法规未核实”警告（总数 24 → 25）。

### 审计
- 首轮（`audits/AUDIT-20261105-loop02.md`）：Critical 0 / Major 2 / Minor 12 / Observation 10。Major：APP-021 放行指标取自补染试验缸而非大货批，大货批补皂洗后的复测与副作用未交代；RM-015 进货卷曲数下限 6.5 按本案数据不足以保证 85% 蓬松保持率、含油率无限值。主要 Minor：降级品去标后 RN 标识（APP-020）、单因素试验混入针尖类型（HT-022）、已出运货物的数量与跟踪数据（HT-022）、单耗前后不一致（RM-014）、IDFB 方法未注明部分版本（RM-014）、注册表备注把标准条件写成客户规定（ASTM-D737）。
- 复审（`audits/AUDIT-20261105-loop02-r2.md`，APP-021、RM-015）：Critical 0 / Major 0 / Minor 5 / Observation 3。主要问题：英文 note 未同步、返工费用归属、溶剂萃取不能表征交联硅油（改为 XRF 测硅）、卷曲数未引用标准方法。
- 合计（state.json）：Critical 0 / Major 2 / Minor 17 / Observation 13。处理结果见 `audits/AUDIT-20261105-loop02-response.md`，全部已修正或采纳，无不同意。

### 被删案例
无。

### 下一轮注意
1. **根因类型要换样**：本轮 8 个中有 5 个是“供应商/车间擅自变更、跳过工序或设备失控，未通知”。下一轮优先写设计缺陷、规格互相冲突、测量系统问题、消费者使用方式等根因。
2. **验证方式要换样**：本轮单因素梯度用了 3 次（“第一行与大货一致、中间档最优”），分层 + “改进后 N 批约 3 个月，同厂同实验室可比”用了 2 次，句式也雷同。可以用全因子 DOE、现场失效分析（断口、显微、成分）、退货实物统计。
3. **放行数据要来自被放行的那一批**：试验样确定工艺，放行要写大货批本身的复测数值，并评估返工工序（如补皂洗洗掉柔软剂）的副作用。
4. **进货筛查限值要由数据推出**：限值要与门禁要求一致（内插或实测范围），并配合定期的性能复测。
5. **方法要真能测出要测的性质**（如溶剂萃取测不出交联硅油）；作为限值的计数类方法要引用标准，写清预加张力与计数规则。
6. **中英文同步**：修改中文的 note、术语时，英文条目同时修改；check-en 只比对数字。
7. 本轮轮换：服装 3、家纺 2、原料辅料 3。下一轮 rotationIndex = 2，原料辅料得 2 个。
