import json
import urllib.request as u

BASE = "http://localhost:3005/api"

def post(data):
    req = u.Request(
        BASE + "/hq/chat",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with u.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))

tool_prompt = (
    "你有以下工具可以使用来执行文件/命令操作。当你需要读写文件时，必须使用工具。\n\n"
    "只允许使用以下格式输出工具调用：\n"
    "<tool_call>\n"
    "<name>list_dir</name>\n"
    "<params>{\"path\":\"/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website\"}</params>\n"
    "</tool_call>\n"
)

payload = {
    "agentId": "ANALYST-01",
    "messages": [{"role": "user", "content": "请调用 list_dir 并只返回工具调用。"}],
    "useMemory": False,
    "toolPrompt": tool_prompt,
    "provider": "gemini",
    "model": "gemini-2.5-flash",
}

resp = post(payload)
print(json.dumps(resp, ensure_ascii=False, indent=2))
