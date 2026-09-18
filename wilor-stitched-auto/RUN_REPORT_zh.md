# 纯自动 WiLoR 手部缝合：八帧结果

完成日期：2026-09-18。输出目录：`experiments/sapiens2_wilor_stitched_eight_conditions_20260918_v1/`。

## 结果

8 帧全部完成，接入 14 只自动检测手。8/8 独立进程重建通过，混合网格最大顶点差 0 m，手部网格回归关节差 0 m，OBJ 与 NPZ 一致。14/14 手的 16 条腕部接缝边均被两个反向相邻面共享，16 个边界顶点位移均为 0 m；手部内部边也通过相同检查。

对同一批 294 个 WiLoR 自动目标点，统一用实际网格线性回归关节：此前标准 SMPL-X 自动结果 RMSE **70.45 px**，此次纯自动缝合 **33.00 px**，figure9.2 历史缝合网格 **9.02 px**。本次相对标准自动结果整体降低 53.2%。这是自动目标拟合误差，不能作为独立真实精度。

| 场景 / 相机 | 接入手数 | 历史缝合 | 纯自动缝合 | 标准 SMPL-X 自动 |
| --- | ---: | ---: | ---: | ---: |
| condition_01_normal_pose / cam3 | 2 | 4.85 | 9.68 | 8.14 |
| condition_01_normal_pose / cam4 | 2 | 4.34 | 9.53 | 8.96 |
| condition_02_hand_object_interaction / cam3 | 2 | 3.76 | 11.78 | 7.46 |
| condition_02_hand_object_interaction / cam4 | 2 | 4.87 | 16.11 | 7.30 |
| condition_03_hand_object_occlusion / cam3 | 1 | 22.48 | 44.62 | 195.64 |
| condition_03_hand_object_occlusion / cam4 | 2 | 14.75 | 74.62 | 82.91 |
| condition_04_failure_case / cam3 | 2 | 3.89 | 9.35 | 83.15 |
| condition_04_failure_case / cam4 | 1 | 2.95 | 27.91 | 55.87 |

## 自动输入与执行范围

身体来自 Sapiens2 两阶段自动拟合缓存，以及此前完成的 WiLoR 1600 步受约束自动优化缓存。手部来自原始 WiLoR 检测和 MANO 回归缓存；每帧检查原图、标定、自动身体输入、Sapiens2 输出和 WiLoR NPZ 的 SHA256。

本次没有重新训练模型或重复运行 Sapiens2 / WiLoR 网络。新执行的是：自动身体候选选择、手部鱼眼几何构建、网格缝合、面朝向修正、独立重载以及旧新网格对比。每帧按已匹配的 WiLoR 腕点二维 MSE 自动选择两个可行身体候选之一；5 帧选择此前受约束优化，3 帧选择原 Sapiens2 第二阶段，未人工挑选。`recipe.json` 保留两个候选得分、选中路径、哈希和左右手匹配。

`run.py` 不读取人工标注、历史身体参数或 figure9.2 图片。历史数据仅由 `compare.py` 在 8 帧独立验收通过后读取；旧图 JPEG SHA256 与从 figure9.2 PDF 提取的原图一致。历史原图的身体初值使用过人工 13 点，因此不能称为纯自动结果。

## 方法及原约束

1. 用 Sapiens2 自动腕点（低置信度时退回自动身体腕点）、WiLoR 检测置信度和左右手信息做一对一匹配。修正 detector 的左右手误判仅使用自动证据。遮挡 Cam3 右手、失败 Cam4 左手未获得检测，保留自动身体手部，不补画假检测。
2. 复用旧 `lift_mano_to_fisheye`：将 WiLoR MANO 网格投影到其透视相机，把二维手腕平移到自动身体腕点，利用身体腕部径向距离加 MANO 相对径向距离逐顶点反投影。不是刚体变换，也不是跨相机三角化。
3. 使用 SMPL-X / MANO 同源的 778 手部顶点映射，删除相应 SMPL-X 内部手面片，替换为 MANO 面片。16 个腕边界顶点保持原位，沿 7 圈拓扑邻域 smoothstep 混合。保持原顶点编号，便于从混合网格回归关节。
4. 左手镜像会反转 MANO 朝向。本次根据原 SMPL-X 腕部面的有向边修正左手 winding，并检查每条手部及接缝边的两个面方向相反。
5. 新缝合不改动身体姿态与手外网格。身体候选沿用原姿态/相机先验；再次验证相对原 rigid 阶段的 19 关节角度上限、全局旋转 8°、脚部不变、固定形状与面部参数不变、平移 z∈[0.05,3]m、双腕径向距离下限 max(85% rigid,85% stage2)、Sapiens2 身体 RMSE 增量≤5px。
6. 整体网格最小相机 z 为 **0.026478 m**，全部高于 0.02m。代码设有沿原投影射线的近面保护，本批 14 只手均未触发该调整。

## 骨架与重载口径

白色线框来自保存的 `hybrid_mesh.obj` 对应顶点和面片。红蓝手部骨架来自 `smpl_x.orig_hand_regressor` 及指尖顶点在同一混合网格上的线性回归，灰色是没有 WiLoR 匹配的原身体手；并非直接覆盖检测二维骨架。这里的网格回归点是几何核验用的关节估计，不等同于标准 SMPL-X 运动学关节。

旧图原始红蓝骨架直接画 WiLoR 二维预测，因此不能用它证明缝合后关节精度。此次恢复历史紧凑网格的原顶点映射，面片逐项核对，再用相同回归器计算历史指标；页面也提供旧网格真实回归骨架图。

最终输出是 **SMPL-X 身体 + 变形 MANO 手部混合网格**。`body_params.npz` 只能重建缝合前身体；必须同时使用 WiLoR 缓存、匹配和缝合步骤，或直接加载 `hybrid_mesh.npz` / OBJ，才能恢复最终结果。没有将它冒充成单靠标准 SMPL-X 参数可重建的网格。

## 已知不足与视觉结论

- 四帧普通姿态/交互手形基本保留，但统一网格点误差从此前 7–9px 变为约 10–16px，并非每帧都提高。身体腕点偏移被施加到整只 MANO 手，成为当前主要误差。
- 遮挡 Cam3 的近距离大手尺度恢复，RMSE 195.64→44.62px；遮挡 Cam4 左手腕偏差仍有 105.75px，整手偏移明显。不能声称已达到旧论文图效果。
- 失败 Cam3 改善明显（83.15→9.35px）；失败 Cam4 右手仍接近/超出画面上缘，27.91px，左手没有检测证据。
- 身体仍是自动初始化的结果，躯干、遮挡手臂等偏差未由手部缝合解决；未检测手可能保留不正确的原自动身体姿态。
- 拓扑接缝检查通过不代表没有自交或符合真实手形；此次没有碰撞/物体接触优化，也没有独立三维标注验证。Cam3 / Cam4 分别重建，未保证共同三维状态。

## 文件与复现

每帧 `frames/<condition>/<cam>/`：

- `body_params.npz`：自动选定的原 SMPL-X 参数与基础几何。
- `wilor_predictions.npz`：原始自动 WiLoR 预测副本。
- `recipe.json`：自动候选得分、选择、匹配及输入 SHA256。
- `hybrid_mesh.npz`：最终顶点/面片、几何回归手关节、身体关节、每手局部映射、反投影目标、混合权重、腕环及 candidate。
- `hybrid_mesh.obj`、`wireframe.jpg`、`wireframe_skeleton.jpg`。
- `fusion_report.json`、`acceptance.json`。

`comparison/index.html` 是完整对比页；`comparison/offline.html` 将展示图片内嵌，可单独下载后双击打开；`metrics.csv` 和 `comparison_report.json` 保留逐帧及逐点统计。

在开发机新目录复现（依赖现有模型环境、自动缓存和校准文件；无需人工标注）：

```bash
PY=/vepfs-mlp2/mlp-public/huyaoqing/miniconda3/envs/egosmplx/bin/python
SCRIPT=/vepfs-mlp2/mlp-public/huyaoqing/EgoFishPose/experiments/sapiens2_wilor_stitched_eight_conditions_20260918_v1
OUT=/vepfs-mlp2/mlp-public/huyaoqing/EgoFishPose/experiments/sapiens2_wilor_stitched_reproduce_new
OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 PYTHONDONTWRITEBYTECODE=1 "$PY" "$SCRIPT/run.py" --output-dir "$OUT"
OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 PYTHONDONTWRITEBYTECODE=1 "$PY" "$SCRIPT/run.py" --output-dir "$OUT" --verify-only
OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 PYTHONDONTWRITEBYTECODE=1 "$PY" "$SCRIPT/compare.py" --output-dir "$OUT"
```

前两步只处理自动数据；第三步才读取历史结果做对比。输出目录须为新目录，已有帧结果不会被覆盖。重建仍依赖项目原模型和代码，完整输入路径记录在清单中。
