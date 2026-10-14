# 原流程＋头部参考0.1：固定样本实验

[在线页面](https://cdh290718-oss.github.io/egofishpose-demo/head01-benchmark-20261014/)

本目录是无需构建的静态网页。index.html、styles.css、app.js与results.js可直接由GitHub Pages发布。

assets保留6张原始JPEG拼图，并提供预览、固定双目样本图及80张原分辨率阶段投影的WebP版本。downloads包含指标CSV、实验清单JSON、图像SHA256及诊断说明。

评分依据原开发机实验的固定100张自采投影、身体10对、手部10对，以及同一批身体20张的已有阶段参数。没有重推理或修改模型参数。论文数值为历史缓存参考；GT只评分和绘图。

自采100张外扩仅审查6张；94张未审。身体10对不能代表完整UnrealEgo-RW测试集。详细协议见网页与downloads/experiment_manifest.json。
