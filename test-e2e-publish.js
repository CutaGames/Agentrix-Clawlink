
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testE2EPublish() {
  try {
    console.log('1. Creating a skill with pricing and protocol flags...');
    const createRes = await axios.post(`${API_BASE}/skills`, {
      name: 'test_commercial_skill_' + Date.now(),
      description: 'A test skill for commercialization',
      version: '1.0.0',
      category: 'commerce',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Product search query' }
        },
        required: ['query']
      },
      executor: {
        type: 'internal',
        internalHandler: 'search_products'
      },
      pricing: {
        type: 'revenue_share',
        commissionRate: 20
      },
      ucpEnabled: true,
      x402Enabled: true
    });

    const skillId = createRes.data.id;
    console.log(`   - Skill created with ID: ${skillId}`);
    console.log(`   - Initial UCP Enabled: ${createRes.data.ucpEnabled}`);
    console.log(`   - Initial X402 Enabled: ${createRes.data.x402Enabled}`);

    console.log('2. Publishing the skill...');
    const publishRes = await axios.post(`${API_BASE}/skills/${skillId}/publish`);
    const publishedSkill = publishRes.data;

    console.log('3. Verifying published state...');
    console.log(`   - Status: ${publishedSkill.status}`);
    console.log(`   - UCP Enabled: ${publishedSkill.ucpEnabled}`);
    console.log(`   - UCP Checkout Endpoint: ${publishedSkill.ucpCheckoutEndpoint}`);
    console.log(`   - X402 Enabled: ${publishedSkill.x402Enabled}`);
    console.log(`   - X402 Service Endpoint: ${publishedSkill.x402ServiceEndpoint}`);

    if (publishedSkill.status === 'published' && 
        publishedSkill.ucpEnabled && 
        publishedSkill.ucpCheckoutEndpoint &&
        publishedSkill.x402Enabled &&
        publishedSkill.x402ServiceEndpoint) {
      console.log('\n✅ E2E Publish Test Passed for Skill!');
      
      console.log('4. Verifying UCP Catalog Inclusion...');
      const catalogRes = await axios.get(`${API_BASE}/ucp/v1/products`);
      const skillInCatalog = catalogRes.data.skills.find(s => s.id === skillId);
      if (skillInCatalog) {
        console.log(`   - Skill found in UCP Catalog!`);
        console.log(`   - UCP Endpoint in catalog: ${skillInCatalog.ucp.checkout_endpoint}`);
      } else {
        console.error(`   - Skill NOT found in UCP Catalog!`);
      }
    } else {
      console.error('\n❌ E2E Publish Test Failed - some fields are missing or incorrect');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.response?.data || error.message);
  }
}

testE2EPublish();
