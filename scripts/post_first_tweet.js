const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: '7eSUtcIU30pRwElb7EVv1tkDb',
  appSecret: '0SmBl2THdZabYZVuCSoV3r6NvA19T1gRbdpk8fdepc422gPxjl',
  accessToken: '1772249664492093440-Rg6ji7UC7M2DVyefqrFCafnLyQz5fH',
  accessSecret: 'KY6ayOuuf9WBm1UB2mmtlojgL4lnnG1bSKNmw2PhObiNU',
});

const tweet = `🚀 Introducing Agentrix - The payment infrastructure for AI Agents

We're building the "Stripe + App Store" for the Agent era:
✅ Commerce Skill - Pay, Split, Pool
✅ X402/UCP Protocol Support
✅ 0.1-0.4% fees (vs 2.9% traditional)

AI Agents deserve their own financial system.

#AI #Web3 #AgentEconomy`;

async function postTweet() {
  try {
    console.log('Attempting to post tweet...');
    const result = await client.v2.tweet(tweet);
    console.log('✅ Tweet posted successfully!');
    console.log('Tweet ID:', result.data.id);
    console.log('URL: https://twitter.com/i/status/' + result.data.id);
  } catch (error) {
    console.error('❌ Error posting tweet:', error.message);
    console.error('Error code:', error.code);
    console.error('Error type:', error.constructor.name);
    if (error.data) {
      console.error('API Error Details:', JSON.stringify(error.data, null, 2));
    }
    if (error.rateLimit) {
      console.error('Rate Limit:', JSON.stringify(error.rateLimit, null, 2));
    }
    // 打印完整错误对象
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  }
}

postTweet();
