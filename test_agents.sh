#!/bin/bash

echo "=== 测试 1: 架构师 Agent (Claude Opus 4) ==="
curl -s -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d @test_architect.json

echo -e "\n\n=== 测试 2: 程序员 Agent (Claude Sonnet 4) ==="
curl -s -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d @test_coder.json

echo -e "\n\n=== 测试完成 ==="
