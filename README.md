# EgoFishPose 自动优化流程与结果

当前采用版本（2026-09-30）：**MANO 辅助身体优化 → 原有有界轮廓接缝融合**。

[流程首页](https://cdh290718-oss.github.io/egofishpose-demo/) · [八帧与 figure9.2 对比](https://cdh290718-oss.github.io/egofishpose-demo/eight-mano-guided-original-seam/)

## 流程

1. EgoSMPLX 推理初值和各相机对应的鱼眼标定。
2. Sapiens2 自动关节点：第一阶段优化 global_orient/transl；第二阶段优化 19 个 body_pose 关节并微调整体参数。
3. WiLoR 自动手部及已有左右匹配；腕点、前臂轮廓约束细化身体。
4. MANO 手腕、掌根和腕环投影辅助身体优化，固定体型、骨长并保留原姿态先验、角度、腕距及深度约束。
5. 使用原接缝算法融合 SMPL-X 身体与 MANO 手部，并进行有界局部表面调整。
6. 独立重载、网格一致性、拓扑与局部穿插检查，检查原图投影。

figure9.2 仅用于事后对比，自动流程不使用人工标注。当前采用路线不使用另一条新版固定 MANO 腕口候选。八帧复用已核验的网络预测缓存，重新执行身体增强和融合。

## 指标与限制

- 身体对同一批 Sapiens2 自动点：增强前 41.45 → 本次 37.52 px；不含鼻点为 40.55 → 38.57 px。
- 手部对同一批 294 个 WiLoR 自动点：增强前 14.91 → 本次 17.62 px；更早原链接为 33.00 px。
- 8/8 重载通过；4/8 局部穿插检查通过。当前采用版本不是所有指标最优，自动点残差不是人工真值误差。
- figure9.2 使用过人工身体初始化。身体原口径受异常鼻点残差主导，提供统一排除鼻点的补充口径。

[运行报告](eight-mano-guided-original-seam/RUN_REPORT_zh.md) · [身体 RMSE](eight-mano-guided-original-seam/BODY_RMSE_zh.md) · [视觉检查](eight-mano-guided-original-seam/VISUAL_REVIEW_zh.md)

## 文件、运行与恢复

本仓库为 GitHub Pages 展示仓库，包含公开图像、报告和结果下载包；结果包包含参数、网格、实验代码和输入快照，不包含模型权重。2026-09-29 结果包保持原快照，身体评估报告和 CSV/JSON 单独补充。

开发机实验：`EgoFishPose/experiments/eight_conditions_mano_guided_original_seam_20260929_v1`。在既有环境与模型资源下依次运行 `guided.py` → `fuse.py` → `fuse.py --verify` → `compare.py` → `package.py`；已有输出会被跳过，新实验使用新目录。环境与依赖详情见运行报告，展示仓库本身不是完整独立推理环境。

- 优化实验提交：`06f5472`（开发机 EgoFishPose 仓库）。
- 身体评估提交：`f4e082e`（开发机 EgoFishPose 仓库）。
- 优化前 checkpoint：`313f7c9`，分支 `checkpoint/eight-before-mano-guided-20260929`（开发机）。
- 本站更新前：`661992868c7cc5947aa63ad97e5d049648a4a16c`，标签 `checkpoint-before-default-flow-20260930`（本 GitHub 仓库）。

[原八帧缝合页面](wilor-stitched-auto/)与[原首页](sapiens2-two-stage-archive.html)保留；原页面仅增加新版入口。其他历史结果目录保留。

GitHub Pages 使用 main 分支根目录发布。
