import json
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from utils.database import NoteDB

db = NoteDB()


class AddNoteInput(BaseModel):
    title: str = Field(description="笔记标题")
    content: str = Field(description="笔记内容")
    tags: str = Field(description="标签，多个标签用逗号分隔", default="")


class SearchNoteInput(BaseModel):
    keyword: str = Field(description="搜索关键词")


class NoteIdInput(BaseModel):
    note_id: int = Field(description="笔记ID")


class UpdateNoteInput(BaseModel):
    note_id: int = Field(description="要修改的笔记ID")
    title: str = Field(description="新的标题，不需要修改则留空", default="")
    content: str = Field(description="新的内容，不需要修改则留空", default="")
    tags: str = Field(description="新的标签，不需要修改则留空", default="")


@tool(args_schema=AddNoteInput)
def add_note(title: str, content: str, tags: str = "") -> str:
    """添加一条新笔记。当用户要求记录、写笔记、保存内容时调用。"""
    result = db.add_note(title, content, tags)
    return json.dumps(result, ensure_ascii=False)


@tool(args_schema=SearchNoteInput)
def search_notes(keyword: str) -> str:
    """根据关键词搜索笔记。当用户要查找、搜索笔记时调用。"""
    results = db.search_notes(keyword)
    if not results:
        return f"没有找到包含'{keyword}'的笔记"
    return json.dumps(results, ensure_ascii=False)


@tool(args_schema=NoteIdInput)
def get_note(note_id: int) -> str:
    """根据笔记ID获取笔记详情。"""
    result = db.get_note_by_id(note_id)
    if not result:
        return f"笔记ID {note_id} 不存在"
    return json.dumps(result, ensure_ascii=False)


@tool
def list_notes() -> str:
    """查看最近的笔记列表。当用户要看所有笔记、最近的笔记时调用。"""
    results = db.get_all_notes(limit=20)
    if not results:
        return "还没有任何笔记"
    return json.dumps(results, ensure_ascii=False)


@tool(args_schema=UpdateNoteInput)
def update_note(note_id: int, title: str = "", content: str = "", tags: str = "") -> str:
    """修改已有笔记。当用户要求更新、修改笔记时调用。"""
    success = db.update_note(note_id, title or None, content or None, tags or None)
    if success:
        return f"笔记 {note_id} 已更新"
    return f"笔记 {note_id} 不存在"


@tool(args_schema=NoteIdInput)
def delete_note(note_id: int) -> str:
    """删除指定笔记。当用户要求删除笔记时调用。"""
    success = db.delete_note(note_id)
    if success:
        return f"笔记 {note_id} 已删除"
    return f"笔记 {note_id} 不存在"


note_tools = [add_note, search_notes, get_note, list_notes, update_note, delete_note]