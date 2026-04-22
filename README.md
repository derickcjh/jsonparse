# JSON Parse

一款基于 Electron + React 的 macOS 桌面 JSON 编辑器，支持大数据量 JSON 的高性能解析和可视化编辑。

---

## 功能特性

### 1. JSON 代码编辑器（左侧面板）
基于 Monaco Editor，提供专业级的 JSON 编辑体验。

- JSON 语法高亮
- 实时语法错误提示（红色波浪线标记）
- 括号配对高亮
- 自动缩进
- 行号显示

> 在左侧编辑器中输入或粘贴 JSON，右侧树形视图会实时同步更新。

### 2. 可编辑树形视图（右侧面板）
虚拟化渲染的树形结构，支持 10 万+ 节点流畅滚动。

- **展开/折叠** — 点击箭头展开或折叠节点
- **展开全部/折叠全部** — 树形视图顶部按钮一键操作
- **节点类型着色** — 字符串(绿色)、数字(橙色)、布尔(琥珀色)、null(青色)、key(紫色)
- **子节点计数** — 对象显示 `{ N }`，数组显示 `[ N ]`
- **懒加载** — 大文件自动截断深层节点，点击展开时按需加载

### 3. 节点增删改

#### 编辑节点
悬浮在节点上，点击铅笔图标进入内联编辑模式，可修改 key、value 和类型。

#### 添加子节点
悬浮在 object/array 节点上，点击 `+` 图标添加子节点，支持两种模式：

- **表单模式**（默认）— 逐字段填写 key、选择类型、输入 value
- **JSON 文本模式** — 点击 `{ }` 按钮切换，直接粘贴/编写完整的 JSON 文本（如 `{"name":"test","items":[1,2,3]}`），按 `Cmd+Enter` 保存

#### 删除节点
悬浮在节点上，点击垃圾桶图标删除。

> 所有树形视图的编辑操作会实时同步回左侧代码编辑器。

### 4. 复制功能

| 操作 | 说明 |
|------|------|
| 鼠标选中 + Cmd+C | 自由选中 key 或 value 文本进行复制 |
| 双击 key | 复制 key 名称，显示 "Copied!" 提示 |
| 双击 value | 复制 value 值（对象/数组会复制格式化后的 JSON） |
| 悬浮 → 复制路径按钮 | 复制 JSON Path（如 `$.data[0].name`） |
| 悬浮 → 复制 key:value 按钮 | 复制完整的 `"key": value` 格式 |

### 5. 格式化 / 压缩 / 校验
工具栏提供一键操作：

- **格式化**（`{ }` 图标）— 美化 JSON，2 空格缩进
- **压缩**（最小化图标）— 移除所有空白，输出单行 JSON
- **校验**（勾选图标）— 验证 JSON 合法性，显示成功/错误 toast 提示

### 6. 搜索 / 过滤
右侧面板顶部搜索栏：

- 输入关键词实时搜索 key 和 value
- 匹配节点高亮显示，当前匹配项突出标记
- `Enter` / `Shift+Enter` 在匹配结果间跳转，自动展开父节点
- 支持**区分大小写**和**正则表达式**模式切换
- 显示当前匹配位置（如 `3 / 15`）

### 7. 暗色 / 亮色主题
工具栏右侧的太阳/月亮图标一键切换。

- **亮色主题** — 清爽的浅灰渐变背景
- **暗色主题** — 深邃的深蓝灰渐变背景，护眼舒适

### 8. 文件操作
- **打开文件** — 工具栏文件夹图标，支持打开任意文件（默认 All Files）
- **拖拽打开** — 直接拖拽文件到窗口打开
- **保存文件** — 工具栏保存图标，导出为 `.json` 文件
- **加载进度条** — 大文件解析时底部显示进度

### 9. 多窗口支持
- **Cmd+N** 快捷键新建窗口
- 菜单栏 **文件 → 新建窗口**
- 工具栏窗口图标按钮
- 每个窗口独立编辑，互不干扰

### 10. 大数据量优化
- **Web Worker** — JSON 解析/格式化/搜索全部在后台线程执行，不阻塞 UI
- **延迟解析** — 超过 1MB 的文件只解析前几层，展开时按需加载子树
- **虚拟列表** — 仅渲染可见行，10 万+ 节点依然流畅
- **防抖同步** — 编辑器输入防抖后再解析
- **进度反馈** — 大文件加载时显示解析进度和耗时

---

## 界面设计

v1.2.0 采用现代化开发工具风格设计：

- **配色系统** — 深蓝灰色调搭配蓝色强调色
- **玻璃拟态** — 工具栏和面板使用毛玻璃效果
- **等宽字体** — JetBrains Mono 用于代码显示
- **平滑动画** — 过渡效果和微交互动画
- **JSON 语法色** — 紫色 key、绿色 string、橙色 number、琥珀色 boolean、青色 null

---

## 环境依赖

| 依赖 | 版本要求 |
|------|---------|
| Node.js | >= 18.x |
| npm | >= 9.x |
| macOS | >= 12.0 (Monterey) |

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron 33 | 桌面应用框架 |
| React 18 | UI 框架 |
| TypeScript 5 | 类型安全 |
| Monaco Editor | 代码编辑器 |
| Zustand | 状态管理 |
| Tailwind CSS 3 | 样式系统 |
| Allotment | 可调整分割面板 |
| Lucide React | 图标库 |
| Sharp | 图标生成 |
| electron-vite | 构建工具 |
| electron-builder | 打包工具 |

---

## 安装与运行

### 1. 克隆仓库

```bash
git clone https://github.com/derickcjh/jsonparse.git
cd jsonparse
```

### 2. 安装依赖

```bash
npm install
```

> 如果 Electron 下载缓慢，可使用镜像：
> ```bash
> ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
> ```

### 3. 启动开发模式

```bash
npm run dev
```

应用窗口会自动打开，支持热更新。

### 4. 构建生产版本

```bash
npm run build
```

### 5. 打包为 macOS .dmg

```bash
npm run package
```

打包产物位于 `dist/` 目录。

### 6. 生成应用图标（可选）

```bash
node scripts/generate-icons.js
```

从 SVG 源文件生成各尺寸 PNG 和 macOS icns 图标。

---

## 项目结构

```
src/
├── main/                # Electron 主进程
│   ├── index.ts         # 应用入口、菜单、生命周期
│   ├── window.ts        # 窗口创建
│   └── ipc.ts           # IPC 通信（文件操作、新建窗口）
├── preload/             # 预加载脚本
│   └── index.ts         # contextBridge 安全 API
├── renderer/            # React 渲染进程
│   ├── App.tsx          # 根组件
│   ├── index.css        # 全局样式
│   ├── components/      # UI 组件
│   │   ├── Toolbar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── SplitPanel.tsx
│   │   ├── common/      # 通用组件
│   │   ├── editor/      # Monaco 编辑器
│   │   └── tree/        # 树形视图组件
│   ├── store/           # Zustand 状态管理
│   ├── workers/         # Web Worker（JSON 解析、搜索）
│   ├── hooks/           # 自定义 Hooks
│   └── utils/           # 工具函数
├── shared/              # 跨进程共享常量
assets/                  # 源图标文件
resources/               # 构建资源（图标）
scripts/                 # 构建脚本
```

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Cmd+N | 新建窗口 |
| Cmd+Z / Cmd+Shift+Z | 撤销 / 重做（编辑器内） |
| Cmd+C / Cmd+V | 复制 / 粘贴 |
| Cmd+A | 全选 |
| Cmd+W | 关闭窗口 |
| Enter | 搜索下一个匹配 |
| Shift+Enter | 搜索上一个匹配 |
| Cmd+Enter | JSON 文本模式下保存 |
| Escape | 取消编辑 |

---

## 版本历史

### v1.2.0
- 全新现代化 UI 设计
- 新应用图标
- 玻璃拟态效果
- JetBrains Mono 字体

### v1.1.1
- 修复文件打开对话框默认选项
- 修复截断节点箭头显示
- 修复展开/折叠功能

### v1.1.0
- 加载进度条
- 搜索结果跳转和高亮
- 性能优化

### v1.0.0
- 初始版本

---

## License

MIT
