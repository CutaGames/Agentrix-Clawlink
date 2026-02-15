import json
import re
import sys
import time
import urllib.request as u

BASE = "http://localhost:3005/api"
OUTPUT_PATH = "/tmp/verify_output.json"

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

mapping = get_json(BASE + "/hq/agents/model-mapping")
agents = mapping.get("agents", [])
TOOLS = [
    (
        "list_dir",
        {"path": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"},
        "请调用 list_dir 工具查看项目根目录，并只返回工具调用。",
    ),
    (
        "read_file",
        {
            "filePath": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/README.md",
            "startLine": 1,
            "endLine": 5,
        },
        "请调用 read_file 读取 README.md 前 5 行，并只返回工具调用。",
    ),
    (
        "write_file",
        {
            "filePath": "/tmp/agentrix_tool_check.txt",
            "content": "tool check",
        },
        "请调用 write_file 写入 /tmp/agentrix_tool_check.txt，并只返回工具调用。",
    ),
    (
        "edit_file",
        {
            "filePath": "/tmp/agentrix_tool_check.txt",
            "oldString": "tool check",
            "newString": "tool check ok",
        },
        "请调用 edit_file 替换 /tmp/agentrix_tool_check.txt 内容，并只返回工具调用。",
    ),
    (
        "run_command",
        {"command": "echo agentrix_tool_check"},
        "请调用 run_command 执行 echo agentrix_tool_check，并只返回工具调用。",
    ),
    (
        "fetch_url",
        {"url": "https://example.com", "method": "GET"},
        "请调用 fetch_url 获取 https://example.com，并只返回工具调用。",
    ),
    (
        "search_knowledge",
        {"query": "payment", "category": "architecture"},
        "请调用 search_knowledge 搜索 payment，并只返回工具调用。",
    ),
    (
        "list_knowledge",
        {},
        "请调用 list_knowledge 并只返回工具调用。",
    ),
]

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
    patterns = [
        rf"<tool_call>[\s\S]*?<name>\s*{re.escape(name)}\s*<\/name>[\s\S]*?<params>[\s\S]*?<\/params>[\s\S]*?<\/tool_call>",
        rf"<tool_use>[\s\S]*?<tool_name>\s*{re.escape(name)}\s*<\/tool_name>[\s\S]*?<parameters>[\s\S]*?<\/parameters>[\s\S]*?<\/tool_use>",
        rf"<tool>\s*{re.escape(name)}\s*<\/tool>[\s\S]*?<params>[\s\S]*?<\/params>",
    ]
    text = content or ""
    return any(re.search(p, text, re.IGNORECASE) is not None for p in patterns)

def is_quota_error(message: str) -> bool:
    return bool(re.search(r"RESOURCE_EXHAUSTED|quota|429|Too Many Requests", message or "", re.IGNORECASE))

results = []
for agent in agents:
    expected = agent.get("resolvedModel")
    for tool_name, tool_params, user_prompt in TOOLS:
        payload = {
            "agentId": agent.get("code"),
            "messages": [{"role": "user", "content": user_prompt}],
            "useMemory": False,
            "toolPrompt": tool_prompt_for(tool_name, tool_params),
            "provider": agent.get("resolvedProvider"),
            "model": expected,
        }
        attempt = 0
        while True:
            attempt += 1
            try:
                resp = get_json(BASE + "/hq/chat", payload)
                content = resp.get("content") or ""
                tool_call = has_tool_call(content, tool_name)
                actual = resp.get("model")
                model_match = True if not expected else (actual == expected)
                item = {
                    "code": agent.get("code"),
                    "tool": tool_name,
                    "expected": expected or "unknown",
                    "actual": actual or "unknown",
                    "modelMatch": model_match,
                    "toolCall": tool_call,
                }
                results.append(item)
                print(json.dumps(item, ensure_ascii=False))
                sys.stdout.flush()
                break
            except Exception as e:
                message = str(e)
                if is_quota_error(message) and attempt < 3:
                    time.sleep(15)
                    continue
                item = {"code": agent.get("code"), "tool": tool_name, "error": message}
                results.append(item)
                print(json.dumps(item, ensure_ascii=False))
                sys.stdout.flush()
                break

        provider = (agent.get("resolvedProvider") or "").lower()
        if "gemini" in provider:
            time.sleep(6)
        else:
            time.sleep(2)

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(json.dumps(results, ensure_ascii=False, indent=2))
