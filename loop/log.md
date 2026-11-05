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
