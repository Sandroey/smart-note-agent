from langchain_core.messages import HumanMessage


def chat():
    print("正在创建 Agent...")
    from agent.agent import create_note_agent
    agent = create_note_agent()
    print("Agent 创建成功！")
    config = {"configurable": {"thread_id": "note-session"}}

    print("=" * 50)
    print("  智能笔记助手")
    print("  输入 q 退出")
    print("=" * 50)

    while True:
        user_input = input("你: ").strip()
        if user_input.lower() in ("q", "quit", "exit"):
            print("再见！")
            break
        if not user_input:
            continue

        print("助手: ", end="", flush=True)
        reply = ""
        for event in agent.stream(
            {"messages": [HumanMessage(content=user_input)]},
            config=config,
        ):
            for node_name, node_output in event.items():
                if isinstance(node_output, dict) and "messages" in node_output:
                    for msg in node_output["messages"]:
                        if hasattr(msg, "type") and msg.type == "ai":
                            if hasattr(msg, "content") and msg.content:
                                print(msg.content, end="", flush=True)
                                reply += msg.content
        print("\n")


if __name__ == "__main__":
    print("程序启动")
    chat()