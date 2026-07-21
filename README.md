# Smart Note Agent

一个基于 LangGraph + DeepSeek 的智能笔记助手，支持自然语言管理笔记。

## 功能

- 📝 添加笔记（自然语言输入，自动提取标题、内容、标签）
- 🔍 搜索笔记（关键词搜索）
- 📋 查看笔记列表
- ✏️ 修改笔记
- 🗑️ 删除笔记
- 🤖 AI 问答（基于笔记内容回答问题、做总结）

## 技术栈

| 技术 | 用途 |
|------|------|
| Python 3.13 | 主语言 |
| LangGraph | Agent 框架 |
| DeepSeek API | 大模型 |
| SQLite | 数据存储 |

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

### 3. 运行项目

```bash
python main.py
```

## 结构
```
smart-note-agent/
├── main.py              # 入口
├── agent/
│   ├── agent.py         # Agent 核心逻辑
│   └── prompt.py        # System Prompt
├── tools/
│   └── note_tools.py    # 6 个笔记工具
└── utils/
    └── database.py      # SQLite 数据库操作
```
