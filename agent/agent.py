import os
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from tools.note_tools import note_tools
from agent.prompt import SYSTEM_PROMPT

load_dotenv()


def create_note_agent():
    model = init_chat_model(
        "deepseek-chat",
        model_provider="deepseek",
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        temperature=0.7,
        top_p=0.9,
    )

    memory = MemorySaver()

    agent = create_react_agent(
        model=model,
        tools=note_tools,
        prompt=SYSTEM_PROMPT,
        checkpointer=memory,
    )

    return agent