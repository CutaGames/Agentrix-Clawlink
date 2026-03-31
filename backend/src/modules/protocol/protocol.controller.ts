import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ProtocolService } from './protocol.service';

@Controller('api')
export class ProtocolController {
  constructor(private readonly protocolService: ProtocolService) {}

  // UCP (Unified Commerce Protocol) - Gemini
  @Get('ucp/skills')
  async getUcpSkills(@Query('category') category?: string) {
    return this.protocolService.getUcpSkills(category);
  }

  @Get('ucp/skills/:skillId')
  async getUcpSkillDetail(@Param('skillId') skillId: string) {
    return this.protocolService.getUcpSkillDetail(skillId);
  }

  @Post('ucp/skills/:skillId/invoke')
  async invokeUcpSkill(
    @Param('skillId') skillId: string,
    @Body() params: any,
  ) {
    return this.protocolService.invokeUcpSkill(skillId, params);
  }

  // MCP (Model Context Protocol) - Claude
  @Get('mcp/skills')
  async getMcpSkills(@Query('category') category?: string) {
    return this.protocolService.getMcpSkills(category);
  }

  @Get('mcp/skills/:skillId')
  async getMcpSkillDetail(@Param('skillId') skillId: string) {
    return this.protocolService.getMcpSkillDetail(skillId);
  }

  @Post('mcp/skills/:skillId/invoke')
  async invokeMcpSkill(
    @Param('skillId') skillId: string,
    @Body() params: any,
  ) {
    return this.protocolService.invokeMcpSkill(skillId, params);
  }

  // ACP (Action/ChatGPT Protocol) - OpenAI
  @Get('acp/skills')
  async getAcpSkills(@Query('category') category?: string) {
    return this.protocolService.getAcpSkills(category);
  }

  @Get('acp/skills/:skillId')
  async getAcpSkillDetail(@Param('skillId') skillId: string) {
    return this.protocolService.getAcpSkillDetail(skillId);
  }

  @Post('acp/skills/:skillId/invoke')
  async invokeAcpSkill(
    @Param('skillId') skillId: string,
    @Body() params: any,
  ) {
    return this.protocolService.invokeAcpSkill(skillId, params);
  }

  // X402 (Payment Protocol)
  @Get('x402/skills')
  async getX402Skills(@Query('category') category?: string) {
    return this.protocolService.getX402Skills(category);
  }

  @Get('x402/skills/:skillId')
  async getX402SkillDetail(@Param('skillId') skillId: string) {
    return this.protocolService.getX402SkillDetail(skillId);
  }

  @Post('x402/skills/:skillId/invoke')
  async invokeX402Skill(
    @Param('skillId') skillId: string,
    @Body() params: any,
  ) {
    return this.protocolService.invokeX402Skill(skillId, params);
  }

  // Protocol Discovery
  @Get('protocols/discovery')
  async getProtocolDiscovery() {
    return this.protocolService.getProtocolDiscovery();
  }
}
