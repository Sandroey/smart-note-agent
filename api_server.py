from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from utils.database import NoteDB
import os
import random

app = FastAPI(title="Smart Note Agent API")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 智能体实例
agent = None
config = {"configurable": {"thread_id": "note-session"}}

# 数据库实例
db = NoteDB()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    message_id: int = 0


class NoteCreate(BaseModel):
    title: str
    content: str
    tags: str = ""


class ChatMessageCreate(BaseModel):
    content: str
    pos_x: float = 0
    pos_y: float = 0
    width: float = 350
    height: float = 150


class ChatMessageUpdate(BaseModel):
    pos_x: float
    pos_y: float
    width: float
    height: float


@app.on_event("startup")
async def startup_event():
    global agent
    from agent.agent import create_note_agent
    agent = create_note_agent()
    print("Agent 创建成功！")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not agent:
        raise HTTPException(status_code=500, detail="Agent 未初始化")
    
    try:
        all_ai_contents = []
        
        for event in agent.stream(
            {"messages": [HumanMessage(content=request.message)]},
            config=config,
        ):
            for node_name, node_output in event.items():
                if isinstance(node_output, dict) and "messages" in node_output:
                    for msg in node_output["messages"]:
                        # 提取AI消息内容
                        if hasattr(msg, "type") and msg.type == "ai":
                            if hasattr(msg, "content") and msg.content:
                                # 收集所有AI回复内容
                                all_ai_contents.append(msg.content)
                                print(f"[AI回复] {msg.content[:100]}...")
        
        # 使用最后一条AI消息作为回复
        reply = all_ai_contents[-1] if all_ai_contents else "操作完成"
        print(f"[AI回复完成] {reply[:100]}...")
        
        # 计算合适的宽高
        text_length = len(reply)
        if text_length <= 50:
            width, height = 250, 100
        elif text_length <= 120:
            width, height = 320, 130
        elif text_length <= 200:
            width, height = 380, 170
        elif text_length <= 350:
            width, height = 440, 220
        elif text_length <= 500:
            width, height = 500, 280
        else:
            width, height = 560, 340
        
        # 生成随机位置 (假设画布大小约为1200x800)
        pos_x = random.randint(20, max(20, 1200 - width - 20))
        pos_y = random.randint(20, max(20, 800 - height - 20))
        
        # 将回复保存到数据库
        try:
            # 保存到数据库，标记为未完成渲染
            saved_msg = db.add_chat_message(reply, pos_x, pos_y, width, height, fully_rendered=0)
            print(f"[保存到数据库] ID: {saved_msg['id']}, 位置: ({pos_x}, {pos_y})")
            
            # 最终回复，用于前端渲染和打字机效果
            print(f"[最终回复] {reply[:100]}...")
            
            return ChatResponse(reply=reply, message_id=saved_msg['id'])
        except Exception as db_error:
            print(f"[数据库错误] {str(db_error)}")
            # 即使数据库保存失败，也返回回复
            return ChatResponse(reply=reply, message_id=0)
    except Exception as e:
        print(f"[错误] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/chat", response_model=ChatResponse)
# async def chat(request: ChatRequest):
#     if not agent:
#         raise HTTPException(status_code=500, detail="Agent 未初始化")
    
#     try:
#         all_ai_contents = []
        
#         for event in agent.stream(
#             {"messages": [HumanMessage(content=request.message)]},
#             config=config,
#         ):
#             for node_name, node_output in event.items():
#                 if isinstance(node_output, dict) and "messages" in node_output:
#                     for msg in node_output["messages"]:
#                         # 提取AI消息内容
#                         if hasattr(msg, "type") and msg.type == "ai":
#                             if hasattr(msg, "content") and msg.content:
#                                 # 收集所有AI回复内容
#                                 all_ai_contents.append(msg.content)
#                                 print(f"[AI回复] {msg.content[:100]}...")
        
#         # 使用最后一条AI消息作为回复
#         reply = all_ai_contents[-1] if all_ai_contents else "操作完成"
#         print(f"[最终回复] {reply[:100]}...")
        
#         # 将回复保存到数据库
#         try:
#             # 计算合适的宽高
#             text_length = len(reply)
#             if text_length <= 50:
#                 width, height = 250, 100
#             elif text_length <= 120:
#                 width, height = 320, 130
#             elif text_length <= 200:
#                 width, height = 380, 170
#             elif text_length <= 350:
#                 width, height = 440, 220
#             elif text_length <= 500:
#                 width, height = 500, 280
#             else:
#                 width, height = 560, 340
            
#             # 生成随机位置 (假设画布大小约为1200x800)
#             pos_x = random.randint(20, max(20, 1200 - width - 20))
#             pos_y = random.randint(20, max(20, 800 - height - 20))
            
#             # 保存到数据库
#             saved_msg = db.add_chat_message(reply, pos_x, pos_y, width, height)
#             print(f"[保存到数据库] ID: {saved_msg['id']}, 位置: ({pos_x}, {pos_y})")
            
#             return ChatResponse(reply=reply, message_id=saved_msg['id'])
#         except Exception as db_error:
#             print(f"[数据库错误] {str(db_error)}")
#             # 即使数据库保存失败，也返回回复
#             return ChatResponse(reply=reply, message_id=0)
#     except Exception as e:
#         print(f"[错误] {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/notes")
async def create_note(note: NoteCreate):
    """创建新笔记"""
    result = db.add_note(note.title, note.content, note.tags)
    return result


@app.get("/api/notes")
async def get_notes():
    """获取所有笔记"""
    notes = db.get_all_notes(limit=50)
    return {"notes": notes}


@app.post("/api/chat-messages")
async def create_chat_message(msg: ChatMessageCreate):
    """保存聊天消息"""
    result = db.add_chat_message(msg.content, msg.pos_x, msg.pos_y, msg.width, msg.height)
    return result


@app.get("/api/chat-messages")
async def get_chat_messages():
    """获取所有聊天消息"""
    messages = db.get_all_chat_messages(limit=100)
    return {"messages": messages}


@app.delete("/api/chat-messages/{msg_id}")
async def delete_chat_message(msg_id: int):
    """删除聊天消息"""
    success = db.delete_chat_message(msg_id)
    if not success:
        raise HTTPException(status_code=404, detail="消息不存在")
    return {"success": True}


@app.put("/api/chat-messages/{msg_id}")
async def update_chat_message(msg_id: int, msg: ChatMessageUpdate):
    """更新聊天消息位置"""
    success = db.update_chat_message_position(msg_id, msg.pos_x, msg.pos_y, msg.width, msg.height)
    if not success:
        raise HTTPException(status_code=404, detail="消息不存在")
    return {"success": True}


class FullyRenderedUpdate(BaseModel):
    fully_rendered: int = 1


@app.put("/api/chat-messages/{msg_id}/fully-rendered")
async def update_fully_rendered(msg_id: int, body: FullyRenderedUpdate):
    """标记消息已完全渲染"""
    success = db.update_fully_rendered(msg_id, body.fully_rendered)
    if not success:
        raise HTTPException(status_code=404, detail="消息不存在")
    return {"success": True}


# 静态文件服务
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")


@app.get("/")
async def read_root():
    return FileResponse("frontend/html/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
