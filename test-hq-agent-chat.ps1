# 测试 HQ Agent 对话功能

Write-Host "⏳ 等待 HQ 服务器完全启动 (60秒)..."
Start-Sleep -Seconds 60

Write-Host "`n🧪 开始测试 Agent 对话..."

$body = @{
    agentId = "AGENT-GROWTH-001"
    messages = @(
        @{
            role = "user"
            content = "你好，请用一句话简单介绍你自己"
        }
    )
} | ConvertTo-Json -Depth 3

Write-Host "📤 发送请求到: http://localhost:3005/api/hq/chat"
Write-Host "📋 请求体: $body`n"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3005/api/hq/chat" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 30
    
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ 状态码: $($response.StatusCode)"
    Write-Host "🤖 Agent: $($result.agentName)"
    Write-Host "💬 回复: $($result.content)"
    Write-Host "🔧 模型: $($result.model)"
    
    if ($result.content -notlike "*所有*引擎*") {
        Write-Host "`n🎉 测试成功！Agent 可以正常对话！"
        exit 0
    } else {
        Write-Host "`n❌ 测试失败：AI引擎仍然不可用"
        exit 1
    }
} catch {
    Write-Host "❌ 请求失败: $_"
    exit 1
}
