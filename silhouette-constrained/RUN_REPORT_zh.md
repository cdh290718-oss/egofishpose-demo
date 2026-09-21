# Sapiens2轮廓约束的八帧自动优化

日期：2026-09-21。沿用之前14只手的WiLoR左右身份与原权重，未用Sapiens2左右类别重新匹配，没有人工标注。基线是`wrist_shape_refinement_20260920_v1`，本次新目录独立保存。

## 处理方法

1. 从Sapiens2分割的左右手、左右前臂、左右上臂六类取并集，忽略错误的内部左右类别边界。以已有Sapiens2肘点和既有匹配的WiLoR腕点确定每条手臂的二维方向。
2. 沿肘到腕的15%–88%区间自动扫描12个横截面。选择靠近该手臂中心线、连续宽度至少8px且合并概率大于0.55的皮肤区间；至少3条可见横截面才启用该侧前臂约束。横截面端点是自动观测，不是人工描边。遮挡Cam4左前臂可见区域不足，因此跳过其前臂轮廓项。
3. 根据原SMPL-X蒙皮权重和骨段位置选取对应前臂顶点，以鱼眼标定投影。轮廓损失包含“顶点超出皮肤区域的距离”和“可见边界到投影顶点的覆盖距离”，减少越界，同时避免只把模型缩入区域。强候选另外包含腕环顶点。
4. 保持SMPL-X体型betas、手指及脸部参数不变，优化原19身体关节与global_orient/transl。保留相对原刚体阶段的角度上限、整体旋转8°、平移深度范围、腕距下限、网格最小深度及身体点RMSE不超过原stage2加5px的保护。另限制每只匹配腕点相对上一版恶化不超过约3px。
5. 每帧比较上一版、轮廓权重0.08候选和轮廓权重0.4候选，使用同一完整目标自动选择。两组各400步，失败Cam3的强候选为先行试验500步；均从上一版开始。评分包含Sapiens2身体点、WiLoR腕点、腕环兼容性、原先验和轮廓项。CPU复验不通过时，向原参数回退或保留原结果。
6. 身体更新后重建MANO融合网格。接缝除了之前向MANO腕环靠拢的候选，还尝试受限的腕环方向候选；加入前臂及腕环越界距离评分。保持中立同体型腕环尺度先验、局部边长/面积和深度保护，再用平滑位移连接前臂与掌根。

本次重点是可见前臂及腕部。没有让完整三维手匹配杯子遮挡后的可见掩码，也没有优化MANO手指姿态。可见性由自动横截面筛选近似处理，并非完整的物体三维遮挡推理；衣袖、腕表附近仍可能存在边界不确定性。

## 数值结果

| 输出 | 294点手部RMSE px | 可见前臂越界距离RMS px | 可见边界覆盖距离RMS px |
|---|---:|---:|---:|
| 上一版 | 16.84 | 10.53 | 9.95 |
| 本次身体＋旧接缝 | 15.00 | 7.13 | 8.54 |
| 本次身体＋轮廓评价接缝 | 14.91 | 7.02 | 8.59 |

轮廓统计覆盖13条自动可见前臂，先分别计算每侧采样点RMS，再对各侧平方等权平均开方。所有输出使用同一组基线选定的采样顶点和边界目标，不为新结果重新挑选更有利的评价区域。此指标是局部采样距离，不是整片网格的像素IoU，也不等同于最大鼓包大小。294手点误差由实际网格回归的手部关节对WiLoR自动点计算。

以上是自动分割/自动关键点一致性，不是人工真值精度。由于身体候选还继续优化了原来的关键点目标，不能把所有变化都单独归因于新增轮廓损失；“身体＋旧接缝”用于分离接缝变化，而不是等迭代数的无轮廓对照。

## 逐帧记录

| 帧 | 身体候选 | 手点RMSE之前→之后 | 身体点RMSE之前→之后 |
|---|---|---:|---:|
| condition_01_normal_pose / cam3 | standard | 4.72 → 5.33 | 39.51 → 41.72 |
| condition_01_normal_pose / cam4 | strong | 5.21 → 5.17 | 31.90 → 32.11 |
| condition_02_hand_object_interaction / cam3 | strong | 5.00 → 4.92 | 43.21 → 44.20 |
| condition_02_hand_object_interaction / cam4 | strong | 4.80 → 4.63 | 32.84 → 33.06 |
| condition_03_hand_object_occlusion / cam3 | previous | 23.57 → 23.57 | 39.26 → 39.26 |
| condition_03_hand_object_occlusion / cam4 | strong | 39.91 → 34.15 | 30.39 → 31.43 |
| condition_04_failure_case / cam3 | strong | 3.66 → 2.88 | 52.72 → 57.70 |
| condition_04_failure_case / cam4 | strong | 2.62 → 2.62 | 45.77 → 46.36 |

## 验收和文件

8帧均独立重建NPZ、核对OBJ，并重新检查身体硬约束。最终网格顶点重建最大误差为0，OBJ顶点文本误差小于1e-7m；左右匹配和面拓扑保持不变。标准身体体型和运动学骨长不变，融合接缝允许受限表面形变，所以完整网格仍须用融合数据重建，不能仅凭标准SMPL-X参数恢复。

局部形变验收沿用前版：前臂受影响边长比0.70–1.40、面积比0.4–2.2，前臂面法向不反向；腕环平均半径相对标准0.85–1.15；手侧相对MANO参考的法向反向数不得增加，单手点误差对同身体旧接缝不得恶化超过3px。未进行全局自碰撞证明。可重建、连接拓扑和约束通过不能证明外形已经完全正确。

- `final_frames/<condition>/<cam>/body_params.npz`：选择后的身体参数。
- `hybrid_mesh.npz`、`hybrid_mesh.obj`：最终融合网格。
- `body_only_mesh.npz`：同身体、旧接缝对照。
- `wireframe_skeleton.jpg`：新网格叠加。
- `silhouette_targets.json/.jpg`：实际自动轮廓目标。
- `refinement.json`、`geometry_report.json`、`acceptance.json`：优化、候选、形变与独立验收。
- `active_frames/`、`strong_frames/`、`selected_frames/`：候选和选择过程。
- `comparison/`：网页、局部放大、逐帧指标和全部数值记录。

复核命令（项目根目录）：

```bash
OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 /vepfs-mlp2/mlp-public/huyaoqing/miniconda3/envs/egosmplx/bin/python experiments/silhouette_constrained_eight_20260921_v1/finalize.py --verify
OMP_NUM_THREADS=2 /vepfs-mlp2/mlp-public/huyaoqing/miniconda3/envs/egosmplx/bin/python experiments/silhouette_constrained_eight_20260921_v1/compare.py
```

视觉结论另见`VISUAL_REVIEW_zh.md`。输出为新实验，旧结果未覆盖。
