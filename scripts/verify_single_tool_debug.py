import json
import re
import urllib.request as u

BASE = "http://localhost:3005/api"

def get_json(url, data=None):
    if data is None:
        with u.urlopen(url, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    req = u.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
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

name = "list_dir"
params = {"path": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"}
payload = {
    "agentId": "ARCHITECT-01",
    "messages": [{"role": "user", "content": "请调用 list_dir 工具查看项目根目录，并只返回工具调用。"}],
    "useMemory": False,
    "toolPrompt": tool_prompt_for(name, params),
    "provider": "bedrock-opus",
    "model": "us.anthropic.claude-opus-4-5-20251101-v1:0",
}
resp = get_json(BASE + "/hq/chat", payload)
content = resp.get("content") or ""
print(json.dumps({"content": content, "toolCall": has_tool_call(content, name)}, ensure_ascii=False, indent=2))
