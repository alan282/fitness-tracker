# 健身助手

基于 [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) 精选 300 个动作的移动端优先 PWA：根据健身房器械定制 3/4/5 分化训练方案，逐组记录训练，追踪渐进超载。

## 功能

- 器材管理：勾选健身房实际拥有的器械（不配置则默认全有），方案只从可用器械中生成
- 方案生成：3 分（推拉腿）/ 4 分（胸背肩腿）/ 5 分（五分化）× 增肌 / 力量 / 耐力目标，自动安排组数、次数、组间休息
- 训练记录：逐组记录重量 × 次数，组间休息倒计时，训练中可加动作 / 加组
- 渐进超载：首练按体重系数估算建议重量，之后按上次完成度自动加重
- 进度分析：每周训练容量、单动作重量曲线、身体指标（体重 / 围度）
- 数据本地存储（localStorage），支持导出 / 导入 JSON 备份

## 使用

静态站点，无构建步骤。任意 HTTP 服务器托管 `index.html` 即可。

手机安装为 PWA：浏览器打开 → 添加到主屏幕。看过的动作图和 GIF 自动缓存，离线可查看。

## 技术栈

纯原生 HTML / CSS / JavaScript，无框架无依赖。数据源为 exercises-dataset 精选子集（300 动作含中文翻译，图片视频约 30MB）。

## 版权声明

- 代码：MIT License
- 动作图片与 GIF：© Gym visual — https://gymvisual.com/（经 [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) 授权再分发，180×180 分辨率）
