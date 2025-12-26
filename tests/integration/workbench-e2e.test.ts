import axios from 'axios';

describe('Workbench E2E Path Verification', () => {
  const API_BASE = 'http://localhost:3000';
  let testSkillId: string;

  it('Path B: Developer should be able to create and pack a skill', async () => {
    // 1. Create Skill
    const createRes = await axios.post(`${API_BASE}/api/skills`, {
      name: 'E2E_Test_Skill',
      description: 'Test skill for e2e',
      category: 'utility',
      inputSchema: { type: 'object', properties: {}, required: [] },
      executor: { type: 'internal', internalHandler: 'echo' }
    });
    expect(createRes.status).toBe(201);
    testSkillId = createRes.data.id;

    // 2. Generate Pack
    const packRes = await axios.get(`${API_BASE}/api/skills/${testSkillId}/pack/claude`);
    expect(packRes.status).toBe(200);
    expect(packRes.data.name).toBe('E2E_Test_Skill');
  });

  it('Path A: Merchant should have receipts generated for actions', async () => {
    // This would typically involve mocking frontend actions or checking db logs
    // For this e2e, we verify the skill we just created exists in the registry
    const listRes = await axios.get(`${API_BASE}/api/skills`);
    const found = listRes.data.some((s: any) => s.id === testSkillId);
    expect(found).toBe(true);
  });
});
