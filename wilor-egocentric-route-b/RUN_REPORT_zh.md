# 第一视角 WiLoR checkpoint：八帧路线 B 对照

完成日期：2026-09-20。新结果目录：`experiments/wilor_egocentric_routeB_eight_20260920_v1/`。未覆盖原实验，也未使用人工标注拟合或选择结果。

## 执行结论

按用户指定 checkpoint 完成 8 张原图重新推理与路线 B 网格构建。检测器仍检测到 14 只手；原匹配规则接入 12 只。另提供固定旧自动检测身份的 14 手诊断组，用于分离回归权重变化与匹配门限影响。

原规则组 8/8、诊断组 8/8 独立重载验收通过；网格和网格回归手部关节重建差均为 0m；OBJ 与 NPZ 一致。已接入手的腕环和手内边均有两个方向相反的相邻面，腕环 16 顶点位置不变。身体参数逐字节等于此前路线 B 身体，全部原身体角度/腕距/深度保护通过。

本批没有呈现稳定的视觉投影改善。正常/交互帧整体变化较小，近距离遮挡帧存在较明显手形变化；遮挡 Cam4 的左手更难与固定身体腕点协调。该结论限于当前固定身体的八帧实验，不能推广为微调模型在所有数据上的准确度下降。

## 使用的权重与实际加载检查

```text
/vepfs-mlp2/mlp-public/huyaoqing/WiLoR/logs/train/runs/train_hoi4d_clean_egofishhands_quarter_8gpu_from_wilor_60epoch_bs60_v1/checkpoints/step=063312-val_loss=0.49383.ckpt
```

SHA256：`a316cfeca3887bbc02855a2334f9954336505b6ecdb22483530374cba293d7a0`。

使用该训练运行的 `model_config.yaml`，检测器仍为原 `pretrained_models/detector.pt`；未替换检测器权重。Lightning 加载检查：missing keys = 0，unexpected keys = 0，**464 个可学习参数张量与 checkpoint 中逐项完全一致**，见 `checkpoint_load_audit.json`。

推理环境：`/vepfs-mlp2/mlp-public/huyaoqing/miniconda3/envs/wilor/bin/python`，GPU 0，原 WiLoR 工程工作目录。推理使用原 `infer_wilor_8pictures.py` 的同一处理流程，仅加入参数加载核验。检测阈值 0.20、手框放大系数 2.0、左右镜像及原图坐标恢复方式保持。

本批新旧检测框最大差 0.00000000px，类别一致，置信度最大差 0.00000000。原图及标定 SHA256 与旧实验一致。

## 对照设计与两种匹配输出

保持上一版路线 B 每帧已选择的 `body_params.npz` 不变，没有重新跑 EgoSMPLX / Sapiens2，也没有用新权重重新优化路线 A 或重新选择身体候选。因此这是固定身体条件下的 WiLoR 回归权重替换实验，不是从头重新优化身体的端到端实验。

主结果 `frames/`：按新 WiLoR 预测重新自动匹配，门限保持置信度≥0.25、腕点到自动锚点≤150px、至少12点在图内。12 手通过。相较旧版新增两个拒绝：

- 遮挡 Cam4 左手：21点在图内，但新预测腕点到 Sapiens2 锚点 152.34px，超过150px。诊断组强制沿用旧自动身份后，缝合对齐身体需整体平移约150.26px。
- 失败 Cam4 右手：仅10个预测点在图内，低于12点门限；若沿用旧自动身份则可生成网格，但属于诊断输出。

原本无检测的遮挡 Cam3 右手、失败 Cam4 左手仍然无检测。主结果没有接入新 MANO 的位置保留固定身体里的手，显示灰色骨架；不当作融合成功。

诊断组 `fixed_identity_frames/`：因为新旧检测框和类别一致，沿用旧版纯自动匹配的候选编号接入14手，没有手工标注。它绕过新预测的腕距/图内点数匹配门限，仅用于权重变化诊断；身体和网格几何约束仍全部检查。不能把它说成14手都通过原匹配门限。

两组均保持逐顶点鱼眼反投影、7圈过渡、16腕环、左右面片方向修正等路线 B 算法。最终仍是混合网格，不能只用标准 SMPL-X 参数恢复。

## 公平统计：固定14个位置、294个点

所有方法统一使用旧版14个手部槽位，共294个网格回归关节点。即使新规则拒绝接手，也统计该位置实际输出的原身体手，避免通过删除失败手降低误差。分别对旧权重、新权重自动二维预测计算 RMSE：

| 输出 | 对旧权重自动点 px | 对新权重自动点 px |
| --- | ---: | ---: |
| 原 WiLoR 路线 B | 33.00 | 34.13 |
| 第一视角权重，原匹配规则 | 96.34 | 92.81 |
| 第一视角权重，固定旧自动身份（诊断） | 52.42 | 41.87 |

两列都是自动目标拟合误差，不是人工真值精度。不能把原权重对自己目标的33.00px与新权重对自己目标的分数直接当作准确率对比。表中提供同一目标列的横向比较和固定身份组，说明几何变化与匹配拒绝各自的影响。

两网络原始二维手部预测之间 RMSE 为 23.61px；减去各自腕点后，手形相对预测差异 RMSE 为 30.72px。这是预测差异，不是真实误差。

下面逐帧均对同一旧权重目标计算；新目标对应指标保存在CSV和JSON。

| 场景 / 相机 | 新规则接入手数 | 原路线B | 新权重原规则 | 新权重固定身份 |
| --- | ---: | ---: | ---: | ---: |
| condition_01_normal_pose / cam3 | 2 | 9.68 | 13.27 | 13.27 |
| condition_01_normal_pose / cam4 | 2 | 9.53 | 13.30 | 13.30 |
| condition_02_hand_object_interaction / cam3 | 2 | 11.78 | 14.07 | 14.07 |
| condition_02_hand_object_interaction / cam4 | 2 | 16.11 | 16.41 | 16.41 |
| condition_03_hand_object_occlusion / cam3 | 1 | 44.62 | 52.82 | 52.82 |
| condition_03_hand_object_occlusion / cam4 | 1 | 74.62 | 83.03 | 128.39 |
| condition_04_failure_case / cam3 | 2 | 9.35 | 11.98 | 11.98 |
| condition_04_failure_case / cam4 | 0 | 27.91 | 333.81 | 28.02 |

失败 Cam4 主结果的333.81px主要反映右手被门限拒绝后保留的旧身体手位置，不能解释为新 MANO 手网格本身的直接误差；固定身份诊断为28.02px。遮挡 Cam4 的固定身份结果仍有明显偏移，说明并非仅放宽门限就能解决。

## 验收和交付

两组全帧最小相机z为 0.026478m，高于0.02m。数值验收不代表投影或真实三维精度正确；没有增加跨相机融合、手物接触或碰撞优化。

- `wilor/`：新权重网络原始NPZ、JSON、MANO OBJ、检测叠加图。
- `frames/<condition>/<cam>/`：正式原规则结果，含 body_params、wilor_predictions、hybrid_mesh NPZ/OBJ、recipe、投影图及 acceptance。
- `fixed_identity_frames/`：固定旧自动身份的诊断结果，产物同上。
- `comparison/index.html`：三列对比、同区域手部放大及新旧网络原始二维预测。
- `comparison/offline.html`：图片与报告下载内嵌的单文件离线页面。
- `comparison/metrics.csv`、`comparison_report.json`：逐帧与逐点统计。
- `inference_provenance.json`、`checkpoint_load_audit.json`：权重、配置、检测器及实际加载核验。

没有复制或公开发布7.69GB模型权重。完整本地结果包包含预测和网格；网页只发布图片、指标和报告。

## 运行脚本

`infer_wilor.py` 在 WiLoR 环境运行，传入上述 checkpoint、同运行 model_config.yaml、原 detector.pt、八帧原图根目录以及新的 `--output-dir`。`fuse.py`、`compare.py` 在 egosmplx 环境运行，OMP/MKL各2线程。顺序为：

```text
infer_wilor.py [原图、checkpoint、config、detector、输出目录参数]
fuse.py
fuse.py --verify-only
fuse.py --fixed-identities
fuse.py --fixed-identities --verify-only
compare.py
write_report.py
```

完整推理参数保存在 `inference_command.json`。复现应复制本实验脚本到同级新目录再运行，保留旧实验目录，不覆盖已完成帧。
