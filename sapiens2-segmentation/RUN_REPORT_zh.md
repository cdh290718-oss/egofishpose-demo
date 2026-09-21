# Sapiens2-1B 八帧人体部位分割验证

完成日期：2026-09-21。实验目录：`experiments/sapiens2_seg_eight_20260921_v1`。

## 实测结论

已完成全部8帧自动分割，输出29类标签、每类概率、原图叠加、手臂/手部放大，以及上一版网格与新分割轮廓的对照。本次没有运行网格优化，也没有使用人工标注。

外边界有参考价值，但身体部位类别不可靠：多帧裸露前臂被标成左/右手，右前臂内部还出现左手色块。这不是“手臂完全没分出来”，而是区域外形与区域语义的质量不同。不能直接将Left_Lower_Arm和Right_Lower_Arm两类作为可信的完整前臂掩码。

为了让外边界易于核查，另外生成了6类并集：左右手、左右前臂、左右上臂。黄色线为并集各连通区域的外边界，不显示这些类别之间的内部边界。该并集没有人工修正，没有补洞或左右重分配；表带造成的断开仍然保留。它是后续约束的候选输入，不是真值。

## 逐场景视觉复核

| 场景 | 观察 | 当前可用程度 |
|---|---|---|
| 普通姿态，两相机 | 双手及裸露前臂整体外形大致贴近图像；大部分前臂被归入手类，Cam3右前臂还有左右类别混杂 | 合并外边界可作候选；细部位类别不可直接使用 |
| 手物交互，两相机 | 手持物体大部分与手分开，腕表区域切断部分皮肤掩码；前臂仍大量归入手类 | 裸露皮肤的可见外边界较有用，物体接触边缘需单独处理 |
| 遮挡Cam3左手 | 近处大手被分出，杯体主体未整体并入手，局部手指间隙/接触边界仍需谨慎；右手没有可用手类区域 | 大手可见区域可作候选，不能据此补出被遮挡的手/前臂 |
| 遮挡Cam4左手 | 可见手指与杯体大致分开；旧网格与分割边界存在明显错位，手掌下缘和杯旁零碎区域不应全信 | 对齐有参考价值，遮挡边界不能施加完整手轮廓等式约束 |
| 失败Cam3右手 | 手及裸露前臂外形大致被识别；手臂内部类别混杂，旧网格鼓包明显突出黄色外边界 | 最值得先尝试局部外轮廓约束的案例 |
| 失败Cam4右手 | 可见手臂区域被分出，但手接近图像边缘，类别同样混杂 | 可使用图内可靠外边界，不能把图像裁切边当解剖轮廓 |

这些是视觉复核结论，不是人工真值评测。没有计算真实分割IoU或宣称分割准确率；softmax未经校准，高分也可能对应错误类别。

## 后续如何接入

建议首先使用“合并皮肤候选区域＋自动肘腕点限定局部区域”，不要直接相信左右前臂类别。优先约束可信的皮肤—背景边界，排除衣物、腕表、物体遮挡与画面裁切边界。保持标准模型体型/骨长，用轮廓距离调整姿态、深度和腕部方向。

尤其不能要求完整三维手的投影严格等于杯子遮挡后的可见手掩码，否则会压缩手指或前臂。遮挡感知的可见性处理和区域质量筛选仍需实现。本次仅提供和验证候选分割，没有自动启动下一轮拟合。

## 模型和坐标流程

- 官方模型：https://huggingface.co/facebook/sapiens2-seg-1b
- 权重：`pretrained_models/sapiens2_seg/sapiens2_1b_seg.safetensors`，5,883,353,380字节。
- SHA256：`4b73c44963b377e93fcb4c4053f72a189836a22d05e12c30383046b9cd3c5bd4`，与官方LFS一致；严格加载全部参数，无缺失/多余参数。
- 官方本地实现：`EgoSMPLX/official_baseline/sapiens2`。
- 沿用官方test_pipeline，将原图直接缩放为1024×768（高×宽，keep_ratio=False），BGR→RGB及官方均值方差归一化。未增加鱼眼校正、旋转、裁剪或测试时增强。
- GPU bfloat16 autocast推理；logits转float32双线性插值回原始720×1280后softmax/argmax，align_corners=False。
- 29类概率以float16压缩保存，标签由保存前float32概率确定；极接近概率在float16下可能并列，不应要求重新argmax逐像素完全相同。
- 标签NPY与PNG逐像素一致；全部概率有限、尺寸正确、概率和误差低于0.002。图像SHA256与模型、配置、代码来源已记录。

## 输出

每帧 `frames/<condition>/<camera>/`：

- `labels.npy` / `labels.png`：原图分辨率0–28类别ID；PNG是标签而非普通彩色照片。
- `probabilities.npz`：29×720×1280逐类概率、类别索引、坐标定义。
- `all_parts.jpg` / `part_colors.png`：全部类别叠加/纯颜色图。
- `arms_hands.jpg` / `boundaries.jpg`：六类区域叠加/分部位边界。
- `mask_06.png`等：六类各自二值掩码。
- `arms_hands_union.png` / `arms_hands_union_probability.npy`：六类标签并集及概率和。概率和不代表左右身份。
- `confidence.jpg`：最大softmax可视化，不是准确率热图。
- `stats.json`：像素面积、预测分数、自动包围盒和输入哈希。

`comparison/`提供可分享网页、自动裁剪局部图、分割与旧网格对照；`validation.json`记录重载与自动肘腕点类别交叉检查。旧网格来自`wrist_shape_refinement_20260920_v1`，本次没有修改该网格。

## 运行

项目根目录，已下载官方权重后：

```bash
OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 /vepfs-mlp2/mlp-public/huyaoqing/miniconda3/envs/stereo-hand-fusion/bin/python experiments/sapiens2_seg_eight_20260921_v1/run_seg.py
OMP_NUM_THREADS=2 /vepfs-mlp2/mlp-public/huyaoqing/miniconda3/envs/stereo-hand-fusion/bin/python experiments/sapiens2_seg_eight_20260921_v1/build_review.py
OMP_NUM_THREADS=2 /vepfs-mlp2/mlp-public/huyaoqing/miniconda3/envs/stereo-hand-fusion/bin/python experiments/sapiens2_seg_eight_20260921_v1/validate.py
OMP_NUM_THREADS=2 /vepfs-mlp2/mlp-public/huyaoqing/miniconda3/envs/stereo-hand-fusion/bin/python experiments/sapiens2_seg_eight_20260921_v1/merge_and_report.py
```

脚本路径绑定当前实验；保留结果另开实验时应复制脚本到新的实验目录。离线页面内嵌展示图片和报告，下载后可直接打开。
