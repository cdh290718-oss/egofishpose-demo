# MANO 辅助身体阶段：两帧实验

原流程 checkpoint：`b5c966263cae4e4add5d6de0c1e5f7c14d7583f0`；分支 `checkpoint/session-hand6-before-mano-guidance-20260929`。GitHub 原页面对应发布提交 `705008c`；源码及自动输入完全沿用原 session-hand6 流程。原文件、原网页均不覆盖。

## 方法

1. 复用 EgoSMPLX、Sapiens2、WiLoR、分割及左右手自动身份，权重和标定不变。以原发布流程的接缝前身体参数继续优化；不重新初始化身体，不使用人工目标。
2. 保留 19 个 body_pose 关节和 global_orient/transl 的原始角度、深度、腕距约束，固定 betas、手指参数、脚和面部。增加 WiLoR 四个非拇指 MCP 掌根点及 MANO 腕环 16 个对应像素，联合保留身体点和可见前臂轮廓。二维 MANO 目标直接来自原网络投影，不平移到身体腕点。
3. 损失：4×身体项 + 4×腕点 + 1×掌根 + 5×腕环 + 1.5×轮廓 + 姿态/平移先验。身体项为置信度加权 Huber(20 px) 加 0.15 倍平方误差；统一以 10000 归一化。权重是本次固定实验配置，不是已证实适用于任意图像的最优值。
4. 延续优化使用 Adam、角度投影及非线性约束回退；身体 RMSE 上界取原两阶段值+5 px 与原发布身体值+0.5 px 的较小值。全局非凸问题，不宣称全局收敛；约束导致的停滞在逐步日志中保存。
5. 为避免掌部目标拉离身体腕点，又比较了沿原优化结果回退的短程分支：把每只身体腕点的像素误差限制为原值+3 px。sample_03 使用此分支；sample_04 此限制阻碍原有错误深度的修正，身体 RMSE 回到 60.86 px，而初始增强分支的最终 MANO 手部、轮廓及局部几何均通过，因此保留 31.84 px 的初始增强分支。这里区分 SMPL-X 身体腕关节与最终 MANO 腕口；两帧均保持原解剖姿态增量、三维腕距和深度限制。此两帧对照不证明一种权重配置能自动泛化至任意图像。
6. 接缝做两种输出：增强身体搭配原有有界接缝（消融）；再尝试完全保留原生 MANO 投影的固定腕口，在局部前臂做有界形变。仅 6/10/14 个邻接环内选局部支持，不变更身体初值。检查边长、面积、法向、最大 25.5 mm 位移、近裁面及局部非相邻三角形交叉。未通过的侧回退到原有接缝，保留失败诊断。
7. MANO 的二维投影独立于身体，但三维根距离仍由拟合后的身体腕点提供。此单视角实验没有绝对深度真值，不能把这个距离当成独立 MANO 深度观测。

## 指标（像素）

| 帧 | 身体：原 Sapiens2 / 原发布融合基底 / 新身体 | 手部：原融合 / 新融合 | 固定 MANO 腕口全部通过 | 局部交叉通过 |
|---|---:|---:|---|---|
| sample_03_cam3 | 27.39 / 27.27 / 26.56 | 5.53 / 6.63 | False | False |
| sample_04_cam3 | 81.04 / 60.35 / 31.84 | 4.42 / 3.97 | True | True |

RMSE 以同一组 Sapiens2/WiLoR 自动点为参考，非人工真值。标准 SMPL-X 手部点未重新拟合手指，其误差不能直接解释为身体拟合误差。手部融合最终指标从最终网格回归 21 个手部点后投影计算。

## 恢复与重现

基线本地 commit：`b5c966263cae4e4add5d6de0c1e5f7c14d7583f0`。新增实验在 `experiment/session-hand6-mano-guided-20260929` 分支；可用 `git diff b5c966263cae4e4add5d6de0c1e5f7c14d7583f0 -- <路径>` 检查差异。原流程源代码、8 帧自动缓存、原输出以及外部依赖源码快照已纳入 checkpoint；模型权重未复制，原路径及 SHA256 保存在基线 model_provenance.json。
GitHub 同时保留恢复标签：[checkpoint-before-mano-guided-body-20260929](https://github.com/cdh290718-oss/egofishpose-demo/tree/checkpoint-before-mano-guided-body-20260929)。
需要恢复具体旧脚本时：`git restore --source checkpoint/session-hand6-before-mano-guidance-20260929 -- <具体路径>`。本次未改写任何旧流程文件；继续运行原目录即可使用旧流程。不要用整库清理命令删除其他未跟踪实验。

重建已交付结果：原 egosmplx Python 环境执行 `fusion.py --verify`。初始身体实验源码为 `guided_initial.py --steps 1400`；腕点保护分支为 `guided.py --steps 600 --continue-body --samples sample_03`，读入 diagnostic_before_image_wrist_guard 保存的初始实验身体参数。candidate_selection.json 记录两分支选择，诊断文件保留。然后执行 `fusion.py`、`fusion.py --verify`、`deliver.py`。新版最终融合必须加载 hybrid_mesh.npz/obj；body_params.npz 仅定义 SMPL-X 基底。

验证范围：参数重载、OBJ/NPZ 一致、拓扑及接缝边连接；局部交叉只检测不共享顶点的非共面穿插，不保证全身无碰撞。数值通过不等于视觉满意。

<!-- FINAL_REVIEW -->
## 最终结论

- sample_03_cam3：未通过整体验收，仅作诊断；不建议替换原流程。身体 RMSE 27.27 → 26.56 px，最终手部 RMSE 5.53 → 6.63 px。
- sample_04_cam3：局部几何检查通过，保留为改进候选。身体 RMSE 60.35 → 31.84 px，最终手部 RMSE 4.42 → 3.97 px。

sample_04 右前臂的大鼓包明显减轻，但腕口近端仍可见局部收窄/折线感，不能说外形已完全自然。sample_03 身体小幅改善，手部误差略升，原有接缝仍有局部穿插；固定 MANO 腕口候选因位移或法向等限制被拒绝。

## 冻结可见前臂区域的轮廓检查

| 帧 / 侧 | 越出皮肤区域 RMS：原 / 新(px) | 边界覆盖 RMS：原 / 新(px) | 局部非相邻面交叉：原 / 新 |
|---|---:|---:|---:|
| sample_03_cam3 / left | 5.27 / 5.48 | 7.80 / 8.61 | 50 / 48 |
| sample_03_cam3 / right | 2.81 / 2.12 | 7.98 / 7.69 | 12 / 2 |
| sample_04_cam3 / left | 1.14 / 0.19 | 7.80 / 0.23 | 0 / 0 |
| sample_04_cam3 / right | 9.44 / 0.44 | 5.54 / 0.71 | 70 / 0 |

轮廓指标只覆盖原流程冻结的可见前臂截面与顶点集合，未包含整个人体轮廓，也不是独立人工真值。三角形交叉检查范围和排除项见方法说明。
