/**
 * E2E Test Suite — P1-C: Agent Space Service
 *
 * Covers:
 *   - Space CRUD (create, get, archive)
 *   - Member management (add, remove)
 *   - Message persistence (send, get, agent reply, task update)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AgentSpaceService } from './agent-space.service';
import {
  AgentSpace,
  AgentSpaceMessage,
  SpaceStatus,
  SpaceType,
  SpaceMessageType,
} from '../../entities/agent-space.entity';

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'mock-id', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-id', ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
}

describe('AgentSpaceService — P1-C', () => {
  let service: AgentSpaceService;
  let spaceRepo: ReturnType<typeof mockRepo>;
  let msgRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    spaceRepo = mockRepo();
    msgRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentSpaceService,
        { provide: getRepositoryToken(AgentSpace), useValue: spaceRepo },
        { provide: getRepositoryToken(AgentSpaceMessage), useValue: msgRepo },
      ],
    }).compile();

    service = module.get<AgentSpaceService>(AgentSpaceService);
  });

  // ── Space CRUD ──────────────────────────────────────────────────────────

  describe('createSpace', () => {
    it('should create a space with correct defaults', async () => {
      const result = await service.createSpace({
        name: 'Research Task Room',
        ownerId: 'user-1',
        description: 'Collaborate on research',
        type: SpaceType.TASK_ROOM,
      });
      expect(spaceRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Research Task Room',
        ownerId: 'user-1',
        type: SpaceType.TASK_ROOM,
        memberIds: ['user-1'],
      }));
      expect(spaceRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Research Task Room');
    });

    it('should default to GENERAL type', async () => {
      await service.createSpace({ name: 'General', ownerId: 'user-1' });
      expect(spaceRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: SpaceType.GENERAL,
      }));
    });

    it('should include owner in memberIds', async () => {
      await service.createSpace({ name: 'Test', ownerId: 'user-42' });
      expect(spaceRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        memberIds: ['user-42'],
      }));
    });
  });

  describe('getSpacesForUser', () => {
    it('should return spaces where user is owner or member', async () => {
      spaceRepo.find.mockResolvedValue([
        { id: 's1', ownerId: 'user-1', memberIds: ['user-1'] },
        { id: 's2', ownerId: 'user-2', memberIds: ['user-2', 'user-1'] },
        { id: 's3', ownerId: 'user-3', memberIds: ['user-3'] },
      ]);
      const spaces = await service.getSpacesForUser('user-1');
      expect(spaces).toHaveLength(2);
      expect(spaces.map((s: any) => s.id)).toEqual(['s1', 's2']);
    });

    it('should return empty array for user with no spaces', async () => {
      spaceRepo.find.mockResolvedValue([]);
      const spaces = await service.getSpacesForUser('user-orphan');
      expect(spaces).toEqual([]);
    });
  });

  describe('getSpaceById', () => {
    it('should return a space if found', async () => {
      spaceRepo.findOne.mockResolvedValue({ id: 's1', name: 'Test' });
      const space = await service.getSpaceById('s1');
      expect(space.name).toBe('Test');
    });

    it('should throw NotFoundException if not found', async () => {
      spaceRepo.findOne.mockResolvedValue(null);
      await expect(service.getSpaceById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('archiveSpace', () => {
    it('should set status to ARCHIVED', async () => {
      await service.archiveSpace('s1');
      expect(spaceRepo.update).toHaveBeenCalledWith('s1', { status: SpaceStatus.ARCHIVED });
    });
  });

  // ── Member Management ───────────────────────────────────────────────────

  describe('addMember', () => {
    it('should add a new member', async () => {
      spaceRepo.findOne.mockResolvedValue({ id: 's1', memberIds: ['user-1'] });
      await service.addMember('s1', 'user-2');
      expect(spaceRepo.update).toHaveBeenCalledWith('s1', {
        memberIds: ['user-1', 'user-2'],
      });
    });

    it('should not add duplicate member', async () => {
      spaceRepo.findOne.mockResolvedValue({ id: 's1', memberIds: ['user-1', 'user-2'] });
      await service.addMember('s1', 'user-2');
      expect(spaceRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the list', async () => {
      spaceRepo.findOne.mockResolvedValue({ id: 's1', memberIds: ['user-1', 'user-2', 'user-3'] });
      await service.removeMember('s1', 'user-2');
      expect(spaceRepo.update).toHaveBeenCalledWith('s1', {
        memberIds: ['user-1', 'user-3'],
      });
    });
  });

  // ── Messages ────────────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('should return paginated messages in ASC order', async () => {
      const mockMsgs = [
        { id: 'm1', content: 'Hello', createdAt: new Date() },
        { id: 'm2', content: 'World', createdAt: new Date() },
      ];
      msgRepo.findAndCount.mockResolvedValue([mockMsgs, 2]);
      const result = await service.getMessages('s1', 1, 50);
      expect(result.messages).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(msgRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: { spaceId: 's1' },
        order: { createdAt: 'ASC' },
      }));
    });
  });

  describe('sendMessage', () => {
    it('should create and save a text message', async () => {
      const result = await service.sendMessage({
        spaceId: 's1',
        senderId: 'user-1',
        senderName: 'Alice',
        content: 'Hello team!',
      });
      expect(msgRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        spaceId: 's1',
        senderId: 'user-1',
        content: 'Hello team!',
        type: SpaceMessageType.TEXT,
      }));
      expect(msgRepo.save).toHaveBeenCalled();
      expect(spaceRepo.update).toHaveBeenCalledWith('s1', expect.objectContaining({ updatedAt: expect.any(Date) }));
    });
  });

  describe('sendAgentReply', () => {
    it('should send a message with AGENT_REPLY type', async () => {
      await service.sendAgentReply({
        spaceId: 's1',
        agentName: 'ResearchBot',
        content: 'Here are the search results...',
      });
      expect(msgRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        senderId: 'agent_ResearchBot',
        senderName: '🤖 @ResearchBot',
        type: SpaceMessageType.AGENT_REPLY,
      }));
    });
  });

  describe('sendTaskUpdate', () => {
    it('should send a message with TASK_UPDATE type', async () => {
      await service.sendTaskUpdate({
        spaceId: 's1',
        content: 'Task progress: 75% complete',
        metadata: { progress: 75 },
      });
      expect(msgRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        senderId: 'system',
        type: SpaceMessageType.TASK_UPDATE,
        metadata: { progress: 75 },
      }));
    });
  });
});
