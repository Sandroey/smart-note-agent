const API_URL = 'http://localhost:8000';

let currentConversation = null;
let notes = [];
let activeActions = null;

// ===== DOM =====
const messagesContainer = document.getElementById('messages');
const noteInput = document.getElementById('noteInput');
const submitBtn = document.getElementById('submitBtn');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const overlay = document.getElementById('overlay');
const notesList = document.getElementById('notesList');
const noteCount = document.getElementById('noteCount');
const saveToast = document.getElementById('saveToast');
const canvas = document.getElementById('canvas');


// ===== 调用智能体API =====
async function callAgentAPI(userText) {
    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error('调用API失败:', error);
        return `抱歉，处理您的请求时出现错误: ${error.message}`;
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

    // 操作按钮（内嵌在消息底部）
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'msg-actions';
    actionsDiv.innerHTML = `
        <button class="msg-btn msg-btn-save">保 存</button>
        <button class="msg-btn msg-btn-discard">放 弃</button>
    `;

    // 删除按钮（初始隐藏）
    const deleteDiv = document.createElement('div');
    deleteDiv.className = 'msg-delete';
    deleteDiv.innerHTML = `<button class="msg-btn msg-btn-delete">删 除</button>`;

    wrapper.appendChild(bubble);
    wrapper.appendChild(actionsDiv);
    wrapper.appendChild(deleteDiv);

    // 状态标记
    wrapper.dataset.state = 'new'; // new, saved, discarded

    // 点击消息 → 显示操作
    wrapper.addEventListener('click', (e) => {
        if (e.target.classList.contains('msg-btn')) return;
        if (wrapper.dataset.state === 'new') {
            // 固定宽度，防止点击后宽度变化
            if (!wrapper.style.width) {
                wrapper.style.width = wrapper.offsetWidth + 'px';
            }
            toggleActions(actionsDiv);
        } else {
            toggleDelete(deleteDiv);
        }
    });

    // 按钮事件 - 直接操作当前wrapper
    actionsDiv.querySelector('.msg-btn-save').addEventListener('click', () => {
        handleSave(wrapper);
    });

    actionsDiv.querySelector('.msg-btn-discard').addEventListener('click', () => {
        handleDiscard(wrapper);
    });

    deleteDiv.querySelector('.msg-btn-delete').addEventListener('click', () => {
        handleDelete(wrapper);
    });

    // 添加拖拽功能
    makeDraggable(wrapper);
    // 添加调整大小功能
    makeResizable(wrapper);

    return { element: wrapper, bubble, actionsDiv, deleteDiv, text };
}


// ===== 切换操作菜单 =====
function toggleActions(actionsDiv) {
    // 关闭其他已打开的
    if (activeActions && activeActions !== actionsDiv) {
        activeActions.classList.remove('show');
    }

    actionsDiv.classList.toggle('show');
    activeActions = actionsDiv.classList.contains('show') ? actionsDiv : null;
}

// ===== 切换删除按钮 =====
function toggleDelete(deleteDiv) {
    // 关闭其他已打开的
    document.querySelectorAll('.msg-delete.show').forEach(el => {
        if (el !== deleteDiv) el.classList.remove('show');
    });
    deleteDiv.classList.toggle('show');
}


// ===== 隐藏所有操作菜单 =====
function hideAllActions() {
    document.querySelectorAll('.msg-actions.show').forEach(el => {
        el.classList.remove('show');
    });
    document.querySelectorAll('.msg-delete.show').forEach(el => {
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
    
    // 获取现有消息的位置
    const existingMessages = container.querySelectorAll('.message');
    const occupiedAreas = [];
    
    existingMessages.forEach(msg => {
        const rect = msg.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        occupiedAreas.push({
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height
        });
    });
    
    // 尝试找到空白位置
    const maxAttempts = 50;
    for (let i = 0; i < maxAttempts; i++) {
        const x = padding + Math.random() * (containerWidth - newWidth - padding * 2);
        const y = padding + Math.random() * (containerHeight - newHeight - padding * 2);
        
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
        x: padding + Math.random() * (containerWidth - newWidth - padding * 2),
        y: padding + Math.random() * (containerHeight - newHeight - padding * 2)
    };
}

// ===== 显示 AI 回复 =====
async function showAIResponse(userText) {
    const aiMsg = createMessage('ai');
    
    // 先添加到容器中获取尺寸
    aiMsg.element.style.visibility = 'hidden';
    messagesContainer.appendChild(aiMsg.element);
    
    // 获取消息尺寸并找到空白位置
    const msgWidth = 350;
    const msgHeight = 150;
    const position = findEmptyPosition(msgWidth, msgHeight);
    
    // 设置位置并显示
    aiMsg.element.style.left = position.x + 'px';
    aiMsg.element.style.top = position.y + 'px';
    aiMsg.element.style.visibility = 'visible';

    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    aiMsg.bubble.appendChild(dots);

    try {
        const aiReply = await callAgentAPI(userText);
        dots.remove();
        typewriterEffect(aiReply, aiMsg.bubble, () => {
            currentConversation = { aiMsg };
        });
    } catch (error) {
        dots.remove();
        const errorMessage = `抱歉，处理您的请求时出现错误: ${error.message}`;
        typewriterEffect(errorMessage, aiMsg.bubble, () => {
            currentConversation = { aiMsg };
        });
    }
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
            span.className = 'char';
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


// ===== 保存 =====
async function handleSave(wrapper) {
    const actionsDiv = wrapper.querySelector('.msg-actions');
    actionsDiv.classList.remove('show');
    activeActions = null;

    saveToast.classList.add('show');
    setTimeout(() => saveToast.classList.remove('show'), 1000);

    // 获取AI回复内容
    const aiBubble = wrapper.querySelector('.message-bubble');
    const aiText = aiBubble.textContent;

    // 保存AI回复
    await saveNote(aiText);

    // 标记为已保存状态，显示删除按钮
    wrapper.dataset.state = 'saved';
}


// ===== 放弃 =====
function handleDiscard(wrapper) {
    const actionsDiv = wrapper.querySelector('.msg-actions');
    actionsDiv.classList.remove('show');
    activeActions = null;

    // 移除当前消息
    wrapper.classList.add('msg-fade-out');

    setTimeout(() => {
        wrapper.remove();
    }, 500);
}


// ===== 删除 =====
function handleDelete(wrapper) {
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


// ===== 保存笔记 =====
async function saveNote(text) {
    try {
        const resp = await fetch(`${API_URL}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: text.substring(0, 30), content: text, tags: '' }),
        });
        if (resp.ok) await loadNotes();
    } catch (err) {
        console.error('保存失败:', err);
    }
}


// ===== 加载笔记 =====
async function loadNotes() {
    try {
        const resp = await fetch(`${API_URL}/api/notes`);
        if (resp.ok) {
            const data = await resp.json();
            notes = data.notes || [];
            renderNotes();
        }
    } catch {
        notes = [];
        renderNotes();
    }
}


// ===== 渲染笔记 =====
function renderNotes() {
    noteCount.textContent = `${notes.length} 条`;
    if (notes.length === 0) {
        notesList.innerHTML = '<div class="empty-hint">还没有笔记</div>';
        return;
    }
    notesList.innerHTML = notes.map((note, i) => `
        <div class="note-card" style="animation-delay: ${i * 0.06}s">
            <div class="note-card-content">${escapeHtml(note.content)}</div>
            <div class="note-card-time">${formatTime(note.created_at)}</div>
        </div>
    `).join('');
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


// ===== 侧边栏 =====
function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
}


// ===== 事件绑定 =====
submitBtn.addEventListener('click', handleSubmit);
sidebarToggle.addEventListener('click', toggleSidebar);
sidebarClose.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

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

// ===== 消息拖拽功能 =====
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY;
    let initialLeft, initialTop;

    element.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('msg-btn')) return;
        if (e.target.classList.contains('resize-handle')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        element.style.position = 'fixed';
        element.style.left = initialLeft + 'px';
        element.style.top = initialTop + 'px';
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
        isResizing = false;
    });
}




// ===== 初始化 =====
loadNotes();
noteInput.focus();