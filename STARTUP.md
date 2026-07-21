# Smart Note Agent 启动说明

## 前提条件

1. 安装 Python 3.8+
2. 确保 Python 已添加到系统 PATH

## 启动步骤

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置 API 密钥

编辑 `.env` 文件，填入你的 DeepSeek API 密钥：

```
DEEPSEEK_API_KEY=your_api_key_here
```

### 3. 启动服务器

```bash
python api_server.py
```

或者使用启动脚本：

```bash
start_server.bat
```

### 4. 访问应用

打开浏览器访问：http://localhost:8000

## 故障排除

### Python 未找到

如果提示"python 不是内部或外部命令"：

1. 下载并安装 Python：https://www.python.org/downloads/
2. 安装时勾选"Add Python to PATH"
3. 重启终端后重试

### 依赖安装失败

如果 pip 安装失败：

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 端口被占用

如果端口 8000 被占用，可以修改 `api_server.py` 中的端口号：

```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # 修改为其他端口
```

## 功能说明

- 连续问答：支持多轮对话
- 画布缩放：滚轮缩放画布
- 拖拽移动：拖拽画布移动视角
- 笔记拖拽：拖拽单条笔记移动
- 保存功能：保存后仅保留回答内容
- 放弃功能：放弃后整条问答消失
