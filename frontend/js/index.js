const API_URL = 'http://localhost:8000';

let currentConversation = null;
let activeActions = null;

// ===== DOM =====
const messagesContainer = document.getElementById('messages');
const noteInput = document.getElementById('noteInput');
const submitBtn = document.getElementById('submitBtn');
const canvas = document.getElementById('canvas');


// ===== 调用智能体API =====
async function callAgentAPI(userText) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { reply: data.reply, message_id: data.message_id };
    } catch (error) {
        console.error('调用API失败:', error);
        if (error.name === 'AbortError') {
            return { reply: '请求超时，请重试', message_id: 0 };
        }
        return { reply: `抱歉，处理您的请求时出现错误: ${error.message}`, message_id: 0 };
    }
}


// ===== 提交 =====
async function handleSubmit() {
    const text = noteInput.value.trim();
    if (!text) return;

    noteInput.value = '';
    noteInput.style.height = '50px';

    // 直接显示AI回复，不显示用户输入
    await showAIResponse(text);
}


// ===== 创建消息元素 =====
function createMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (role === 'ai') {
        const label = document.createElement('div');
        label.className = 'message-label';
        bubble.appendChild(label);
    }

    // 删除按钮（右上角×）
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'msg-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = '删除';

    wrapper.appendChild(bubble);
    wrapper.appendChild(deleteBtn);

    // 鼠标悬停显示删除按钮
    wrapper.addEventListener('mouseenter', () => {
        deleteBtn.classList.add('show');
    });
    wrapper.addEventListener('mouseleave', () => {
        deleteBtn.classList.remove('show');
    });

    // 删除按钮事件
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(wrapper);
    });

    // 添加拖拽功能
    makeDraggable(wrapper);
    // 添加调整大小功能
    makeResizable(wrapper);

    return { element: wrapper, bubble, deleteBtn, text };
}


// ===== 隐藏所有操作菜单 =====
function hideAllActions() {
    document.querySelectorAll('.msg-delete-btn.show').forEach(el => {
        el.classList.remove('show');
    });
    activeActions = null;
}


// ===== 查找空白位置 =====
function findEmptyPosition(newWidth, newHeight) {
    const container = messagesContainer;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const padding = 20;

    // 如果容器尺寸为0，返回默认位置
    if (containerWidth === 0 || containerHeight === 0) {
        return {
            x: padding + Math.random() * 300,
            y: padding + Math.random() * 300
        };
    }

    // 获取现有消息的位置
    const existingMessages = container.querySelectorAll('.message');
    const occupiedAreas = [];

    existingMessages.forEach(msg => {
        const left = parseFloat(msg.style.left) || 0;
        const top = parseFloat(msg.style.top) || 0;
        const width = msg.offsetWidth;
        const height = msg.offsetHeight;
        occupiedAreas.push({
            x: left,
            y: top,
            width: width,
            height: height
        });
    });

    // 尝试找到空白位置
    const maxAttempts = 50;
    for (let i = 0; i < maxAttempts; i++) {
        const x = padding + Math.random() * Math.max(0, containerWidth - newWidth - padding * 2);
        const y = padding + Math.random() * Math.max(0, containerHeight - newHeight - padding * 2);

        // 检查是否与现有消息重叠
        let overlaps = false;
        for (const area of occupiedAreas) {
            if (x < area.x + area.width + padding &&
                x + newWidth + padding > area.x &&
                y < area.y + area.height + padding &&
                y + newHeight + padding > area.y) {
                overlaps = true;
                break;
            }
        }

        if (!overlaps) {
            return { x, y };
        }
    }

    // 如果找不到空白位置，返回随机位置
    return {
        x: padding + Math.random() * Math.max(0, containerWidth - newWidth - padding * 2),
        y: padding + Math.random() * Math.max(0, containerHeight - newHeight - padding * 2)
    };
}

// ===== 标记消息已完全渲染 =====
async function markFullyRendered(messageId) {
    if (!messageId) return;
    try {
        await fetch(`${API_URL}/api/chat-messages/${messageId}/fully-rendered`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fully_rendered: 1 }),
        });
    } catch (err) {
        console.error('标记渲染完成失败:', err);
    }
}

// ===== 创建独立加载指示器 =====
function createLoadingDots() {
    const wrapper = document.createElement('div');
    wrapper.className = 'loading-indicator';
    wrapper.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    messagesContainer.appendChild(wrapper);
    return wrapper;
}

// ===== 显示 AI 回复 =====
async function showAIResponse(userText) {
    // 1. 显示加载指示器（无卡片）
    const loadingEl = createLoadingDots();

    // 2. 等待 API 响应
    const result = await callAgentAPI(userText);
    loadingEl.remove();

    const displayText = result.reply && result.reply.trim() ? result.reply : '操作完成';

    // 3. 创建卡片，使用正确尺寸
    const aiMsg = createMessage('ai');
    aiMsg.element.classList.add('msg-animate-in');

    const size = calculateSizeByTextLength(displayText.length);
    const position = findEmptyPosition(size.width, size.height);

    aiMsg.element.style.left = position.x + 'px';
    aiMsg.element.style.top = position.y + 'px';
    aiMsg.element.style.width = size.width + 'px';
    aiMsg.element.style.height = size.height + 'px';
    messagesContainer.appendChild(aiMsg.element);

    // 4. 保存位置到数据库
    if (result.message_id) {
        aiMsg.element.dataset.messageId = result.message_id;
        updateMessagePosition(aiMsg.element);
    }

    // 5. 打字机效果渲染，完成后标记 fully_rendered
    typewriterEffect(displayText, aiMsg.bubble, () => {
        markFullyRendered(result.message_id);
        currentConversation = { aiMsg };
    });
}


// ===== 逐字打字 =====
function typewriterEffect(text, container, callback) {
    let index = 0;

    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '|';
    container.appendChild(cursor);

    const interval = setInterval(() => {
        if (index < text.length) {
            const span = document.createElement('span');
            span.className = 'char char-animate';
            span.textContent = text[index];
            container.insertBefore(span, cursor);
            index++;
        } else {
            clearInterval(interval);
            setTimeout(() => {
                cursor.style.opacity = '0';
                setTimeout(() => cursor.remove(), 300);
            }, 800);
            if (callback) callback();
        }
    }, 55);
}


// ===== 删除 =====
async function handleDelete(wrapper) {
    const messageId = wrapper.dataset.messageId;
    if (messageId) {
        try {
            await fetch(`${API_URL}/api/chat-messages/${messageId}`, {
                method: 'DELETE',
            });
            console.log('消息已从数据库删除，ID:', messageId);
        } catch (err) {
            console.error('删除消息失败:', err);
        }
    }
    wrapper.classList.add('msg-fade-out');
    setTimeout(() => {
        wrapper.remove();
    }, 500);
}


// ===== 淡出对话 =====
function fadeOutConversation() {
    const allMsgs = messagesContainer.querySelectorAll('.message');
    allMsgs.forEach((msg, i) => {
        setTimeout(() => {
            msg.classList.add('msg-fade-out');
        }, i * 80);
    });

    setTimeout(() => {
        messagesContainer.innerHTML = '';
        currentConversation = null;
        noteInput.focus();
    }, allMsgs.length * 80 + 500);
}


// ===== 清除对话（无动画） =====
function clearCurrentConversation() {
    hideAllActions();
    messagesContainer.innerHTML = '';
    currentConversation = null;
}


// ===== 滚动 =====
function scrollToBottom() {
    setTimeout(() => {
        canvas.scrollTop = canvas.scrollHeight;
    }, 50);
}


// ===== 根据字数计算合适的宽高 =====
function calculateSizeByTextLength(textLength) {
    // 基础宽高
    let width = 250;
    let height = 100;

    if (textLength <= 50) {
        // 极短文本
        width = 250;
        height = 150;
    } else if (textLength <= 120) {
        // 短文本
        width = 320;
        height = 180;
    } else if (textLength <= 200) {
        // 中等文本
        width = 380;
        height = 220;
    } else if (textLength <= 350) {
        // 较长文本
        width = 440;
        height = 270;
    } else if (textLength <= 500) {
        // 长文本
        width = 500;
        height = 330;
    } else {
        // 超长文本
        width = 560;
        height = 370;
    }

    return { width, height };
}

// ===== 保存聊天消息到数据库 =====
async function saveChatMessage(text, element) {
    try {
        const size = calculateSizeByTextLength(text.length);
        const pos_x = parseFloat(element.style.left) || 0;
        const pos_y = parseFloat(element.style.top) || 0;

        const response = await fetch(`${API_URL}/api/chat-messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: text,
                pos_x: pos_x,
                pos_y: pos_y,
                width: size.width,
                height: size.height
            }),
        });

        if (response.ok) {
            const data = await response.json();
            element.dataset.messageId = data.id;
            console.log('消息已保存到数据库，ID:', data.id);
        }
    } catch (err) {
        console.error('保存消息失败:', err);
    }
}


// ===== 从数据库加载聊天记录 =====
async function loadChatHistory() {
    try {
        const response = await fetch(`${API_URL}/api/chat-messages`);
        if (response.ok) {
            const data = await response.json();
            const messages = data.messages || [];
            console.log('从数据库加载聊天记录，共', messages.length, '条');
            messages.forEach(msg => {
                renderHistoryMessage(msg);
            });
        }
    } catch (err) {
        console.error('加载聊天记录失败:', err);
    }
}


// ===== 渲染一条历史消息 =====
function renderHistoryMessage(msg) {
    const aiMsg = createMessage('ai');

    // 使用数据库中的尺寸，如果没有则根据字数计算
    const size = msg.width && msg.height ?
        { width: msg.width, height: msg.height } :
        calculateSizeByTextLength(msg.content.length);
    aiMsg.element.style.width = size.width + 'px';
    aiMsg.element.style.height = size.height + 'px';

    // 使用数据库中的位置，如果是(0,0)则生成新位置
    let pos_x = msg.pos_x || 0;
    let pos_y = msg.pos_y || 0;
    if (pos_x === 0 && pos_y === 0) {
        const position = findEmptyPosition(size.width, size.height);
        pos_x = position.x;
        pos_y = position.y;
    }
    aiMsg.element.style.left = pos_x + 'px';
    aiMsg.element.style.top = pos_y + 'px';
    aiMsg.element.dataset.messageId = msg.id;
    messagesContainer.appendChild(aiMsg.element);

    // 根据 fully_rendered 标记决定渲染方式
    if (msg.fully_rendered) {
        // 已完成渲染：直接显示文本
        const textSpan = document.createElement('span');
        textSpan.style.opacity = '1';
        textSpan.style.display = 'inline';
        textSpan.textContent = msg.content;
        aiMsg.bubble.appendChild(textSpan);
    } else {
        // 未完成渲染（中途刷新）：用打字机效果重新渲染
        typewriterEffect(msg.content, aiMsg.bubble, () => {
            markFullyRendered(msg.id);
        });
    }
}


// ===== 工具函数 =====
function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ===== 事件绑定 =====
submitBtn.addEventListener('click', handleSubmit);

noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
        return false;
    }
});

noteInput.addEventListener('input', () => {
    noteInput.style.height = '50px';
    noteInput.style.height = Math.min(noteInput.scrollHeight, 140) + 'px';
});

canvas.addEventListener('click', (e) => {
    if (e.target === canvas || e.target === messagesContainer) {
        hideAllActions();
    }
});

// ===== 更新消息位置到数据库 =====
async function updateMessagePosition(element) {
    const messageId = element.dataset.messageId;
    if (!messageId) return;

    const pos_x = parseFloat(element.style.left) || 0;
    const pos_y = parseFloat(element.style.top) || 0;
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    try {
        await fetch(`${API_URL}/api/chat-messages/${messageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pos_x, pos_y, width, height }),
        });
        console.log('消息位置已更新，ID:', messageId);
    } catch (err) {
        console.error('更新消息位置失败:', err);
    }
}


// ===== 消息拖拽功能 =====
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY;
    let initialLeft, initialTop;

    element.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('msg-delete-btn')) return;
        if (e.target.classList.contains('resize-handle')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        // 获取当前的left和top值
        initialLeft = parseFloat(element.style.left) || 0;
        initialTop = parseFloat(element.style.top) || 0;
        element.style.zIndex = '1000';
        element.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            element.style.left = (initialLeft + deltaX) + 'px';
            element.style.top = (initialTop + deltaY) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'grab';
            element.style.zIndex = '10';
            // 更新数据库
            updateMessagePosition(element);
        }
    });
}

// ===== 消息调整大小功能 =====
function makeResizable(element) {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    element.appendChild(handle);

    let isResizing = false;
    let startX, startY;
    let startWidth, startHeight;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            const newWidth = Math.max(200, startWidth + deltaX);
            const newHeight = Math.max(100, startHeight + deltaY);
            element.style.width = newWidth + 'px';
            element.style.height = newHeight + 'px';
            element.style.overflow = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            // 更新数据库
            updateMessagePosition(element);
        }
    });
}




// ===== 初始化 =====
loadChatHistory();
noteInput.focus();