import json
import re
import urllib.request as u

BASE = "http://localhost:3005/api"

TOOLS = [
    ("list_dir", {"path": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"}, "请调用 list_dir 工具查看项目根目录，并只返回工具调用。"),
    ("read_file", {"filePath": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/README.md", "startLine": 1, "endLine": 5}, "请调用 read_file 读取 README.md 前 5 行，并只返回工具调用。"),
    ("write_file", {"filePath": "/tmp/agentrix_tool_check.txt", "content": "tool check"}, "请调用 write_file 写入 /tmp/agentrix_tool_check.txt，并只返回工具调用。"),
    ("edit_file", {"filePath": "/tmp/agentrix_tool_check.txt", "oldString": "tool check", "newString": "tool check ok"}, "请调用 edit_file 替换 /tmp/agentrix_tool_check.txt 内容，并只返回工具调用。"),
    ("run_command", {"command": "echo agentrix_tool_check"}, "请调用 run_command 执行 echo agentrix_tool_check，并只返回工具调用。"),
    ("fetch_url", {"url": "https://example.com", "method": "GET"}, "请调用 fetch_url 获取 https://example.com，并只返回工具调用。"),
    ("search_knowledge", {"query": "payment", "category": "architecture"}, "请调用 search_knowledge 搜索 payment，并只返回工具调用。"),
    ("list_knowledge", {}, "请调用 list_knowledge 并只返回工具调用。"),
]

BEDROCK_AGENTS = [
    {"code": "ARCHITECT-01", "provider": "bedrock-opus", "model": "us.anthropic.claude-opus-4-5-20251101-v1:0"},
    {"code": "CODER-01", "provider": "bedrock-haiku", "model": "us.anthropic.claude-haiku-4-5-20251001-v1:0"},
    {"code": "GROWTH-01", "provider": "bedrock-haiku", "model": "us.anthropic.claude-haiku-4-5-20251001-v1:0"},
    {"code": "BD-01", "provider": "bedrock-haiku", "model": "us.anthropic.claude-haiku-4-5-20251001-v1:0"},
]

def post(data):
    req = u.Request(BASE + "/hq/chat", data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    with u.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def tool_prompt_for(name: str, params: dict) -> str:
    return (
        "你有以下工具可以使用来执行文件/命令操作。当你需要读写文件时，必须使用工具。\n\n"
        "只允许使用以下格式输出工具调用：\n"
        "<tool_call>\n"
        f"<name>{name}</name>\n"
        f"<params>{json.dumps(params, ensure_ascii=False)}</params>\n"
        "</tool_call>\n"
    )


def has_tool_call(content: str, name: str) -> bool:
    pattern = rf"<tool_call>[\s\S]*?<name>\s*{re.escape(name)}\s*<\/name>[\s\S]*?<params>[\s\S]*?<\/params>[\s\S]*?<\/tool_call>"
    return re.search(pattern, content or "", re.IGNORECASE) is not None


results = []
for agent in BEDROCK_AGENTS:
    for tool_name, tool_params, user_prompt in TOOLS:
        payload = {
            "agentId": agent["code"],
            "messages": [{"role": "user", "content": user_prompt}],
            "useMemory": False,
            "toolPrompt": tool_prompt_for(tool_name, tool_params),
            "provider": agent["provider"],
            "model": agent["model"],
        }
        resp = post(payload)
        content = resp.get("content") or ""
        results.append({
            "code": agent["code"],
            "tool": tool_name,
            "actual": resp.get("model"),
            "toolCall": has_tool_call(content, tool_name),
        })

print(json.dumps(results, ensure_ascii=False, indent=2))
