# pixelfox

[English](README.md) | [简体中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

PixelFox 是一个现代像素画 / 拼豆图纸编辑器界面（[pixelfox.art](https://pixelfox.art)），基于 React、TypeScript 和 shadcn/ui 构建。

## 业务概览

PixelFox 当前代码实现的是一个纯前端的图纸编辑工作台，核心业务流程是：

1. 创建空白画布，或上传图片。
2. 将图片转换成受指定色板约束的像素 / 拼豆网格，也可以手动绘制和编辑。
3. 通过系统色板、画布已用色、颜色替换和颜色删除管理图纸颜色。
4. 预览作品、导出带品牌信息和用色统计的 PNG 图纸，或进入装裱 / 拼搭模式按颜色逐步完成作品。

当前项目没有后端业务调用。画布数据、编辑器偏好、色板设置、导出设置和装裱进度都保存在浏览器 `localStorage` 中。

## 技术栈

- **框架**: React 19
- **构建工具**: Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **组件**: shadcn/ui (Radix UI)
- **状态管理**: Zustand
- **路由**: React Router v7
- **国际化**: i18next
- **3D 预览**: Three.js, React Three Fiber, drei

## 路由结构

- `/`: 主编辑器页面，包含画布、侧边工具栏、色板面板、上传弹窗、3D 预览弹窗、导出弹窗和颜色替换弹窗。
- `/assembly`: 独立装裱页面，全屏打开装裱流程，关闭后回到 `/`。

应用外壳由 `AppLayout` 负责。它渲染导航栏、全局 toast，并通过 React Router outlet context 向页面传递上传、导出和图片生成等共享状态。

## 核心业务逻辑

### 画布编辑

画布状态集中在 `src/store/useEditorStore.ts`。

- `pixels` 是已提交的像素表，key 为 `"x,y"`，value 为 hex 颜色。
- `pixelBuffer` 是为高频绘制优化的 `Uint32Array`。画笔和橡皮擦会先写入 buffer，`saveHistory()` 再把 buffer 同步回 `pixels`。
- 画布默认尺寸是 `30 x 30`，宽高都限制在 `1..200` 个拼豆格。
- 撤销 / 重做历史保存 `{ pixels, width, height }` 快照，内存最多保留 30 条。
- 当前画布快照保存在 `pixelfox-editor-canvas-storage`。完整历史默认不落盘，避免大画布产生很重的 `localStorage` 写入。
- 当前工具、主色、背景色和缩放比例等编辑偏好保存在 `pixelfox-editor-storage`。

画布渲染和交互由 `src/components/editor/PixelCanvas.tsx` 以及 `src/components/editor/pixel-canvas/` 下的 hooks 协同完成。

- 画笔和橡皮擦会对指针移动点做插值，避免快速拖动时断线。
- 油漆桶使用 flood fill，既可以填充同色区域，也可以填充连续空白格。
- 吸管拾取当前像素颜色后自动回到画笔工具。
- 魔棒选择连续同色区域，并提供删除和替换入口。
- 手型工具、滚轮、双指手势和工具栏支持平移 / 缩放视图。
- 画布边缘拖拽可以从指定方向调整尺寸，并按方向平移或裁剪已有像素。

### 图片上传与像素化

上传流程由 `src/components/editor/UploadPhotoDialog.tsx` 和 `src/lib/image-processor.ts` 实现。

用户可以上传图片，设置输出宽高，锁定或解除宽高比，翻转 / 旋转图片，裁掉背景边缘，选择系统色板，并配置颜色合并强度。

`convertImageToPixelArt()` 的转换流程：

1. 加载原图到离屏 canvas。
2. 按目标拼豆尺寸缩放图片。
3. 根据 `poolSize` 将局部像素池化，每个池取出现次数最多的可见颜色。
4. 将 RGB 转成 Lab 色彩空间。
5. 用 CIEDE2000 色差和 k-d tree 查找最接近的色板色。
6. 当颜色合并阈值大于 0 时，对相邻且色差接近的区域做 BFS 合并，并统一成区域主色。
7. 返回 `ImageData`、宽高、拼豆数和色板 id。

`AppLayout.handleGenerate()` 接收转换结果后，会把非透明像素写入编辑器状态，调整画布尺寸，切换当前系统色板，把当前绘制色映射到目标色板的最近颜色，保存历史，并高亮“已用色”标签。

### 色板与颜色管理

色板状态集中在 `src/store/usePaletteStore.ts`。

- `currentPaletteId` 指向 `src/lib/palettes/` 中的系统色板。
- `usedColors` 和 `recentColors` 会持久化，并有数量上限。
- `activeTab` 控制色板面板展示全部颜色还是画布已用色。
- `selectedUsedColor` 表示当前被选中、可替换或删除的已用色。

`src/components/palette/PalettePanel.tsx` 负责主要色板工作流。

- “全部颜色”展示当前系统色板的所有色块。
- “已用色”从当前画布快照中计算颜色和数量。
- 点击色块会更新编辑器主色。
- 删除已用色会移除画布中所有匹配像素并保存历史。
- 把一个已用色拖到另一个已用色上，会把源颜色全部替换成目标颜色。
- 切换到不包含当前画布颜色的色板时，会弹出确认框；继续切换会先清空画布。

颜色替换逻辑集中在 `src/lib/palette-replace.ts`。它负责标准化 hex 颜色、按需限制替换范围、更新画布像素、保存历史，并在需要时选中替换后的颜色。

### 图纸导出

`src/components/editor/ExportPatternDialog.tsx` 会把当前画布导出为带品牌头图和统计信息的 PNG 图纸。

导出选项包括：

- 自动裁剪到非空像素区域
- 白底或透明背景
- 主 / 次网格线
- 网格间隔和网格颜色
- 坐标轴
- 每格色号
- 镜像翻转
- 从色号和用色统计中排除近白色

导出渲染器会生成一张 canvas 图片，内容包括：

- 像素网格主体
- 可选坐标轴和网格线
- 使用 `public/logo_with_name.png` 或 `public/logo.png` 的品牌头部
- 色板、尺寸、拼豆数和站点域名等摘要信息
- 按用量排序的颜色统计徽标

当画布为空时，侧边栏会禁用导出入口。

### 装裱 / 拼搭模式

`src/components/editor/AssemblyDialog.tsx` 为当前图纸提供按颜色逐步拼搭的流程。

- 按标准化颜色统计画布像素。
- 根据当前色板把颜色映射到色号标签；找不到色号时使用兜底标签。
- 步骤按拼豆数量降序排列，再按标签排序。
- 预览区只高亮当前步骤颜色，其他颜色会淡化。
- 用户可以标记颜色完成、切换步骤、缩放 / 平移预览、镜像翻转、显示网格 / 坐标轴 / 色号，并排除近白色背景等颜色。
- 进度按图纸签名持久化。签名由色板 id、画布尺寸和像素内容 hash 得到，所以进度只绑定到当前这张具体图纸。
- 所有未排除颜色完成后，会显示完成弹窗并触发 confetti 动效。

### 3D 预览

`src/components/editor/Preview3DDialog.tsx` 使用 Three.js 把当前像素网格渲染为拼豆 3D 预览。拼豆形状相关常量定义在 `src/lib/constants.ts` 的 `PREVIEW_3D_CONFIG`。

### 国际化与主题

- i18n 配置在 `src/i18n/config.ts`。
- 文案资源位于 `src/i18n/locales/`，目前包含英文、中文、韩文和日文。
- 主题切换由 `src/components/theme-provider.tsx` 管理，并从导航栏暴露入口。

## 关键文件

- `src/App.tsx`: 路由定义。
- `src/components/layout/AppLayout.tsx`: 应用外壳和图片生成结果接入。
- `src/pages/Editor.tsx`: 主编辑器页面组合。
- `src/pages/Assembly.tsx`: 独立装裱路由。
- `src/store/useEditorStore.ts`: 画布、工具、历史、持久化和弹窗状态。
- `src/store/usePaletteStore.ts`: 色板、最近 / 已用颜色和色板面板 UI 状态。
- `src/lib/image-processor.ts`: 图片像素化和色板匹配算法。
- `src/lib/palettes/`: 内置色板定义。
- `src/components/editor/PixelCanvas.tsx`: 画布渲染和交互编排。
- `src/components/palette/PalettePanel.tsx`: 色板标签、已用色操作和色板切换。
- `src/components/editor/ExportPatternDialog.tsx`: 图纸图片渲染和下载。
- `src/components/editor/AssemblyDialog.tsx`: 分颜色装裱 / 拼搭流程。

## 本地启动

1. 克隆仓库。
2. 安装依赖：

   ```bash
   pnpm install
   ```

3. 启动开发服务器：

   ```bash
   pnpm dev
   ```

## 开发命令

- `pnpm dev`: 启动开发服务器。
- `pnpm build`: 生产构建。
- `pnpm lint`: 运行 ESLint。
- `pnpm format`: 使用 Prettier 格式化代码。
- `pnpm typecheck`: 运行 TypeScript 类型检查。
