# Smart Note Agent

一个基于 LangGraph + DeepSeek 的智能笔记助手，支持自然语言管理笔记，具有现代化的Web界面。

## 功能特性

### 核心功能
- 📝 添加笔记（自然语言输入，自动提取标题、内容、标签）
- 🔍 搜索笔记（关键词搜索）
- 📋 查看笔记列表
- ✏️ 修改笔记
- 🗑️ 删除笔记
- 🤖 AI 问答（基于笔记内容回答问题、做总结）

### Web界面功能
- 💬 连续问答（支持多轮对话）
- 🎨 自由布局（消息随机出现在空白位置）
- 🖱️ 拖拽移动（可拖拽每条消息调整位置）
- 📏 调整大小（拖拽边框调整消息大小）
- 💾 保存/放弃（保存后保留AI回复，放弃后整条消失）
- 🗑️ 删除功能（已操作的消息可删除）

## 技术栈

| 技术 | 用途 |
|------|------|
| Python 3.13 | 主语言 |
| LangGraph | Agent 框架 |
| DeepSeek API | 大模型 |
| SQLite | 数据存储 |
| FastAPI | Web API 框架 |
| HTML/CSS/JS | 前端界面 |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Sandroey/smart-note-agent.git
cd smart-note-agent
```

### 2. 安装依赖

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 3. 配置API密钥

复制 `.env.example` 为 `.env`，填入你的 DeepSeek API 密钥：

```bash
cp .env.example .env
# 编辑 .env 文件，填入 DEEPSEEK_API_KEY
```

### 4. 运行项目

#### 命令行模式
```bash
python main.py
```

#### Web模式
```bash
python api_server.py
```

然后访问 http://localhost:8000

### Windows用户

可以双击运行 `start_server.bat` 快速启动Web服务。

## 项目结构

```
smart-note-agent/
├── main.py              # 命令行入口
├── api_server.py        # Web API 服务器
├── start_server.bat     # Windows 启动脚本
├── requirements.txt     # Python 依赖
├── .env.example         # 环境变量模板
├── agent/
│   ├── agent.py         # Agent 核心逻辑
│   └── prompt.py        # System Prompt
├── tools/
│   └── note_tools.py    # 6 个笔记工具
├── utils/
│   └── database.py      # SQLite 数据库操作
└── frontend/
    ├── html/
    │   └── index.html   # 主页面
    ├── css/
    │   └── index.css    # 样式文件
    └── js/
        └── index.js     # 前端逻辑
```

## 使用说明

### Web界面操作

1. **发送消息**：在输入框输入内容，按 Enter 发送
2. **保存笔记**：点击消息显示操作按钮，点击"保存"
3. **放弃内容**：点击消息显示操作按钮，点击"放弃"
4. **删除消息**：已保存或放弃的消息，点击后显示"删除"按钮
5. **移动消息**：拖拽消息到任意位置
6. **调整大小**：拖拽消息右下角调整大小

### AI助手能力

- 记录笔记：告诉AI你想记录的内容
- 搜索笔记：让AI帮你查找相关笔记
- 查看列表：让AI展示所有笔记
- 修改笔记：告诉AI需要修改的内容
- 删除笔记：让AI删除指定笔记
- 内容问答：基于笔记内容回答问题

## API接口

### 发送消息
```
POST /api/chat
Content-Type: application/json

{
  "message": "你的消息内容"
}

Response:
{
  "reply": "AI的回复内容"
}
```

## 开发说明

### 添加新工具

在 `tools/note_tools.py` 中添加新的工具函数，并在 `note_tools` 列表中注册。

### 修改AI提示词

编辑 `agent/prompt.py` 中的 `SYSTEM_PROMPT` 来调整AI的行为。

### 自定义界面

- 样式：编辑 `frontend/css/index.css`
- 逻辑：编辑 `frontend/js/index.js`
- 结构：编辑 `frontend/html/index.html`

## 许可证

MIT License
