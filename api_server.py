from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
import os

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


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


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
        reply = ""
        for event in agent.stream(
            {"messages": [HumanMessage(content=request.message)]},
            config=config,
        ):
            for node_name, node_output in event.items():
                if isinstance(node_output, dict) and "messages" in node_output:
                    for msg in node_output["messages"]:
                        if hasattr(msg, "type") and msg.type == "ai":
                            if hasattr(msg, "content") and msg.content:
                                reply += msg.content
        
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 静态文件服务
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")


@app.get("/")
async def read_root():
    return FileResponse("frontend/html/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
