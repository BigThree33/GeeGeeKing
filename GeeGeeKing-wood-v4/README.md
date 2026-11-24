# GeeGeeKing V4 木头主题素材与接入示例

本压缩包包含 **V4 柔焰焦木版** 全部 6 张像素雪碧图（每张 `1344 × 44 px`，横向 `12 帧`无缝循环，单帧 `112 × 44 px`），以及适配 `Tauri 2 + React + TS + Vite` 的「热血电玩黄」接入示例代码。

## 目录说明

- `preview.html`：解压后直接双击用浏览器打开，即可离线查看全部 6 个雪碧图动画和点击「浇水 → 绿芽」效果。
- `sprites/`：
  - `calm.png`：不急（普通木头 + 微风嫩叶 + 漂浮光尘）
  - `urgent.png`：急（柔和暖焰 + 8 颗抛物线火星）
  - `critical.png`：急死了（全脊柔光烈焰 + 裂纹余烬 + 18 颗双向溅射火花与爆裂星芒，0 抖动）
  - `overdue.png`：逾期（哑光焦棕鳄鱼皮炭木 + 暖灰烬堆 + 右端烧缺碎落 + 微弱呼吸余烬）
  - `watering.png`：浇水过渡（12 帧单次播放：浇水灭火 → 白色蒸汽 → 冒出绿芽）
  - `done.png`：完成（绿芽藤蔓 + 樱粉/鹅黄像素小花 + 治愈星光）
- `src/styles/wood-theme-v4.css`：雪碧图 `steps()` 播放样式 + 热血电玩黄描边字体样式。
- `src/utils/urgency.ts`：紧迫度状态计算与按截止时间排序。
- `src/components/WoodTodoItem.tsx`：单条木头组件（内置浇水动画切换与预加载函数）。
- `src/App.example.tsx`：可直接参考的完整接入示例。

## 快速接入到你的项目

1. 将 `sprites/` 中的 6 张 `.png` 复制到你项目的 `src/assets/sprites/wood-v4/` 目录。
2. 将 `src/styles/wood-theme-v4.css`、`src/utils/urgency.ts`、`src/components/WoodTodoItem.tsx` 复制到你项目的 `src/` 对应目录。
3. **离线中文字体建议**：推荐下载免费开源可商用的 **Fusion Pixel 12px**（缝合像素字体）或 **Cubic 11**（俐方体 11 号），转成 `.woff2` 放到 `src/assets/fonts/fusion-pixel-12px.woff2`，然后取消 `wood-theme-v4.css` 顶部的 `@font-face` 注释即可。
4. 在 `wood-theme-v4.css` 的 `:root` 中，调整 `--pixel-scale` 可切换大小（**务必使用整数** `2` 或 `3` 以保持像素锐利不发虚）。
