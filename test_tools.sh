#!/bin/bash
# 测试带工具提示词的 completion
curl -s -X POST http://localhost:3005/api/hq/chat/completion \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "system", "content": "你有一个工具 list_dir 可以列出目录。当用户要求列出目录时，请输出: <tool_call><name>list_dir</name><params>{\"path\": \"用户指定的路径\"}</params></tool_call>"}, {"role": "user", "content": "请列出 /home/ubuntu 目录"}]}'
