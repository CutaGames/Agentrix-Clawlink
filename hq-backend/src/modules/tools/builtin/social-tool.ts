/**
 * Social Media Tools - Twitter/Telegram/Discord/Email/GitHub
 * 
 * 让 Agent 能够通过 function calling 直接操作社交媒体平台
 * 所有 API token 已在 .env 中配置就绪
 */

import { ToolDefinition, ToolExecutor, ToolExecutionResult } from '../tool-registry';
import axios from 'axios';

// ========== Twitter Tools ==========

export const tweetToolDefinition: ToolDefinition = {
  name: 'twitter_post',
  description: 'Post a tweet on Twitter/X (Blue Verified account, up to 4000 chars). For long-form content, write detailed insights (500-2000 chars recommended for engagement). Can also reply to an existing tweet by providing replyToId. IMPORTANT: Write substantive, value-rich content — not short generic messages. Include hashtags and a call-to-action.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Tweet content (up to 4000 characters for Blue Verified). Write detailed, engaging content with hashtags.',
      },
      replyToId: {
        type: 'string',
        description: 'Optional tweet ID to reply to',
      },
    },
    required: ['content'],
  },
  allowedRoles: ['growth', 'bd', 'support', 'social', 'commander', 'content', 'devrel'],
  timeout: 15,
};

export const tweetToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { content, replyToId } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would tweet: ${content}`, executionTimeMs: 0 };
  }

  try {
    // Environment variable mapping for Twitter (handles several conventions)
    const apiKey = process.env.TWITTER_API_KEY || process.env.TWITTER_APIKEY || process.env.TWITTER_CONSUMER_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET || process.env.TWITTER_APIKEY_SECRET || process.env.TWITTER_APIKEY_SECRET || process.env.TWITTER_CONSUMER_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET || process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      throw new Error('Twitter API credentials not fully configured in .env');
    }

    const { TwitterApi } = require('twitter-api-v2');
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    const tweetParams: any = { text: content };
    if (replyToId) {
      tweetParams.reply = { in_reply_to_tweet_id: replyToId };
    }

    const result = await client.v2.tweet(tweetParams);
    return {
      success: true,
      output: `Tweet posted successfully. Tweet ID: ${result.data?.id}`,
      data: { tweetId: result.data?.id },
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return { success: false, output: '', error: `Twitter post failed: ${error.message}`, executionTimeMs: Date.now() - startTime };
  }
};

export const twitterSearchToolDefinition: ToolDefinition = {
  name: 'twitter_search',
  description: 'Search tweets by keyword or hashtag. Returns recent tweets matching the query.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (keywords, hashtags, or handles)',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results (default: 10, max: 100)',
      },
    },
    required: ['query'],
  },
  allowedRoles: ['growth', 'bd', 'analyst', 'support', 'social', 'commander', 'content', 'devrel'],
  timeout: 20,
};

export const twitterSearchToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { query, maxResults = 10 } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would search Twitter for: ${query}`, executionTimeMs: 0 };
  }

  try {
    const { TwitterApi } = require('twitter-api-v2');
    
    // Environment variable mapping for Twitter (handles several conventions)
    const apiKey = process.env.TWITTER_API_KEY || process.env.TWITTER_APIKEY || process.env.TWITTER_CONSUMER_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET || process.env.TWITTER_APIKEY_SECRET || process.env.TWITTER_CONSUMER_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET || process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      throw new Error('Twitter API credentials not fully configured in .env');
    }

    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    const result = await client.v2.search(query, {
      max_results: Math.min(maxResults, 100),
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
    });

    const tweets = result.data?.data || [];
    const summary = tweets.map((t: any, i: number) =>
      `${i + 1}. [${t.id}] ${t.text?.substring(0, 120)}... | Likes: ${t.public_metrics?.like_count || 0} | RT: ${t.public_metrics?.retweet_count || 0}`
    ).join('\n');

    return {
      success: true,
      output: `Found ${tweets.length} tweets for "${query}":\n${summary}`,
      data: { tweets, count: tweets.length },
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return { success: false, output: '', error: `Twitter search failed: ${error.message}`, executionTimeMs: Date.now() - startTime };
  }
};

export const twitterEngageToolDefinition: ToolDefinition = {
  name: 'twitter_engage',
  description: 'Engage with a tweet: like, retweet, or reply. Use for KOL interaction and community engagement.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      tweetId: {
        type: 'string',
        description: 'The tweet ID to engage with',
      },
      action: {
        type: 'string',
        description: 'Engagement action: like, retweet, or reply',
        enum: ['like', 'retweet', 'reply'],
      },
      replyContent: {
        type: 'string',
        description: 'Reply content (required if action is "reply")',
      },
    },
    required: ['tweetId', 'action'],
  },
  allowedRoles: ['growth', 'bd', 'support', 'social', 'commander', 'content', 'devrel'],
  timeout: 15,
};

export const twitterEngageToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { tweetId, action, replyContent } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would ${action} tweet ${tweetId}`, executionTimeMs: 0 };
  }

  try {
    const { TwitterApi } = require('twitter-api-v2');
    
    // Environment variable mapping for Twitter (handles several conventions)
    const apiKey = process.env.TWITTER_API_KEY || process.env.TWITTER_APIKEY || process.env.TWITTER_CONSUMER_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET || process.env.TWITTER_APIKEY_SECRET || process.env.TWITTER_CONSUMER_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET || process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      throw new Error('Twitter API credentials not fully configured in .env');
    }

    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    const me = await client.v2.me();
    const myId = me.data.id;

    switch (action) {
      case 'like':
        await client.v2.like(myId, tweetId);
        return { success: true, output: `Liked tweet ${tweetId}`, executionTimeMs: Date.now() - startTime };
      case 'retweet':
        await client.v2.retweet(myId, tweetId);
        return { success: true, output: `Retweeted tweet ${tweetId}`, executionTimeMs: Date.now() - startTime };
      case 'reply':
        if (!replyContent) {
          return { success: false, output: '', error: 'replyContent is required for reply action', executionTimeMs: Date.now() - startTime };
        }
        const result = await client.v2.tweet({ text: replyContent, reply: { in_reply_to_tweet_id: tweetId } });
        return { success: true, output: `Replied to tweet ${tweetId}. Reply ID: ${result.data?.id}`, data: { replyId: result.data?.id }, executionTimeMs: Date.now() - startTime };
      default:
        return { success: false, output: '', error: `Unknown action: ${action}`, executionTimeMs: Date.now() - startTime };
    }
  } catch (error: any) {
    return { success: false, output: '', error: `Twitter engage failed: ${error.message}`, executionTimeMs: Date.now() - startTime };
  }
};

// ========== Telegram Tool ==========

export const telegramSendToolDefinition: ToolDefinition = {
  name: 'telegram_send',
  description: 'Send a message to a Telegram channel or chat. Supports Markdown formatting.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: 'Channel username (without @) or chat ID',
      },
      message: {
        type: 'string',
        description: 'Message content (supports Markdown)',
      },
    },
    required: ['target', 'message'],
  },
  allowedRoles: ['growth', 'bd', 'support', 'social', 'commander', 'content', 'devrel'],
  timeout: 15,
};

export const telegramSendToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { target, message } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would send to TG ${target}: ${message.substring(0, 100)}...`, executionTimeMs: 0 };
  }

  try {
    const TelegramBot = require('node-telegram-bot-api');
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    const chatTarget = target.startsWith('@') || /^\d+$/.test(target) ? target : `@${target}`;
    await bot.sendMessage(chatTarget, message, { parse_mode: 'Markdown' });
    return {
      success: true,
      output: `Message sent to Telegram ${chatTarget}`,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return { success: false, output: '', error: `Telegram send failed: ${error.message}`, executionTimeMs: Date.now() - startTime };
  }
};

// ========== Discord Tool ==========

export const discordSendToolDefinition: ToolDefinition = {
  name: 'discord_send',
  description: 'Send a message to a Discord channel via webhook or bot.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      channelId: {
        type: 'string',
        description: 'Discord channel ID or use "announce" for the default announcement channel',
      },
      message: {
        type: 'string',
        description: 'Message content',
      },
    },
    required: ['channelId', 'message'],
  },
  allowedRoles: ['growth', 'bd', 'support', 'social', 'commander', 'content', 'devrel'],
  timeout: 15,
};

export const discordSendToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { channelId, message } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would send to Discord #${channelId}: ${message.substring(0, 100)}...`, executionTimeMs: 0 };
  }

  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const targetChannel = channelId === 'announce' ? process.env.DISCORD_ANNOUNCE_CHANNEL : channelId;

    if (webhookUrl) {
      // Use webhook (simpler, no bot needed)
      await axios.post(webhookUrl, { content: message });
      return { success: true, output: `Message sent to Discord via webhook`, executionTimeMs: Date.now() - startTime };
    }

    // Fallback to bot
    const { Client, GatewayIntentBits } = require('discord.js');
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(process.env.DISCORD_BOT_TOKEN);
    const channel = await client.channels.fetch(targetChannel);
    if (channel?.isTextBased()) {
      await channel.send(message);
    }
    client.destroy();
    return { success: true, output: `Message sent to Discord channel ${targetChannel}`, executionTimeMs: Date.now() - startTime };
  } catch (error: any) {
    return { success: false, output: '', error: `Discord send failed: ${error.message}`, executionTimeMs: Date.now() - startTime };
  }
};

// ========== Email Tool ==========

export const sendEmailToolDefinition: ToolDefinition = {
  name: 'send_email',
  description: 'Send an email via SendGrid or SMTP. Use for outreach, grant applications, partnership proposals.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient email address',
      },
      subject: {
        type: 'string',
        description: 'Email subject line',
      },
      body: {
        type: 'string',
        description: 'Email body (HTML or plain text)',
      },
      isHtml: {
        type: 'boolean',
        description: 'Whether body is HTML (default: false)',
      },
    },
    required: ['to', 'subject', 'body'],
  },
  allowedRoles: ['bd', 'growth', 'support', 'commander', 'content', 'devrel'],
  requiresApproval: true,
  timeout: 15,
};

export const sendEmailToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { to, subject, body, isHtml = false } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would send email to ${to}: ${subject}`, executionTimeMs: 0 };
  }

  try {
    const sgKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'hello@agentrix.top';

    if (sgKey) {
      // SendGrid
      await axios.post('https://api.sendgrid.com/v3/mail/send', {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: 'Agentrix' },
        subject,
        content: [{ type: isHtml ? 'text/html' : 'text/plain', value: body }],
      }, {
        headers: { Authorization: `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
      });
    } else {
      // Fallback: use nodemailer with SMTP
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        [isHtml ? 'html' : 'text']: body,
      });
    }

    return { success: true, output: `Email sent to ${to}: "${subject}"`, executionTimeMs: Date.now() - startTime };
  } catch (error: any) {
    return { success: false, output: '', error: `Email send failed: ${error.message}`, executionTimeMs: Date.now() - startTime };
  }
};

// ========== GitHub Tool ==========

export const githubToolDefinition: ToolDefinition = {
  name: 'github_action',
  description: 'Interact with GitHub: create issues, comment on issues/PRs, update README, check repo stats.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'GitHub action to perform',
        enum: ['create_issue', 'comment_issue', 'get_issues', 'get_repo_stats', 'create_release'],
      },
      repo: {
        type: 'string',
        description: 'Repository in format "owner/repo" (default: agentrix/agentrix)',
      },
      title: {
        type: 'string',
        description: 'Issue/release title (for create_issue, create_release)',
      },
      body: {
        type: 'string',
        description: 'Issue/comment/release body content',
      },
      issueNumber: {
        type: 'number',
        description: 'Issue number (for comment_issue)',
      },
      tag: {
        type: 'string',
        description: 'Release tag (for create_release)',
      },
    },
    required: ['action'],
  },
  allowedRoles: ['growth', 'bd', 'coder', 'support', 'analyst', 'devrel', 'commander'],
  timeout: 20,
};

export const githubToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { action, repo = 'agentrix/agentrix', title, body, issueNumber, tag } = params;
  const startTime = Date.now();
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return { success: false, output: '', error: 'GITHUB_TOKEN not configured', executionTimeMs: 0 };
  }

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would ${action} on ${repo}`, executionTimeMs: 0 };
  }

  const headers = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' };
  const apiBase = `https://api.github.com/repos/${repo}`;

  try {
    switch (action) {
      case 'create_issue': {
        const res = await axios.post(`${apiBase}/issues`, { title, body }, { headers });
        return { success: true, output: `Issue created: #${res.data.number} - ${res.data.html_url}`, data: { issueNumber: res.data.number, url: res.data.html_url }, executionTimeMs: Date.now() - startTime };
      }
      case 'comment_issue': {
        const res = await axios.post(`${apiBase}/issues/${issueNumber}/comments`, { body }, { headers });
        return { success: true, output: `Comment added to issue #${issueNumber}`, data: { commentId: res.data.id }, executionTimeMs: Date.now() - startTime };
      }
      case 'get_issues': {
        const res = await axios.get(`${apiBase}/issues?state=open&per_page=20`, { headers });
        const issues = res.data.map((i: any) => `#${i.number}: ${i.title} (${i.labels.map((l: any) => l.name).join(',')})`).join('\n');
        return { success: true, output: `Open issues for ${repo}:\n${issues || 'No open issues'}`, data: { count: res.data.length }, executionTimeMs: Date.now() - startTime };
      }
      case 'get_repo_stats': {
        const res = await axios.get(`https://api.github.com/repos/${repo}`, { headers });
        const d = res.data;
        return { success: true, output: `Repo: ${d.full_name}\nStars: ${d.stargazers_count} | Forks: ${d.forks_count} | Issues: ${d.open_issues_count}\nLanguage: ${d.language} | Size: ${d.size}KB\nCreated: ${d.created_at} | Updated: ${d.updated_at}`, data: { stars: d.stargazers_count, forks: d.forks_count }, executionTimeMs: Date.now() - startTime };
      }
      case 'create_release': {
        const res = await axios.post(`${apiBase}/releases`, { tag_name: tag, name: title, body }, { headers });
        return { success: true, output: `Release created: ${res.data.html_url}`, data: { releaseId: res.data.id }, executionTimeMs: Date.now() - startTime };
      }
      default:
        return { success: false, output: '', error: `Unknown GitHub action: ${action}`, executionTimeMs: Date.now() - startTime };
    }
  } catch (error: any) {
    return { success: false, output: '', error: `GitHub action failed: ${error.message}`, executionTimeMs: Date.now() - startTime };
  }
};

// ========== Web Search Tool (for research) ==========

export const webSearchToolDefinition: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web using Google/Bing. Use for market research, competitor analysis, grant hunting, resource discovery.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum results to return (default: 5)',
      },
    },
    required: ['query'],
  },
  timeout: 20,
};

export const webSearchToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { query, maxResults = 5 } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would search: ${query}`, executionTimeMs: 0 };
  }

  try {
    // Try Google Custom Search API first
    const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;

    if (googleKey && googleCx) {
      const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: { key: googleKey, cx: googleCx, q: query, num: Math.min(maxResults, 10) },
        timeout: 15000,
      });
      const items = res.data.items || [];
      const results = items.map((item: any, i: number) =>
        `${i + 1}. ${item.title}\n   ${item.link}\n   ${item.snippet}`
      ).join('\n\n');
      return { success: true, output: `Search results for "${query}":\n\n${results}`, data: { count: items.length }, executionTimeMs: Date.now() - startTime };
    }

    // Fallback: use SearXNG or DuckDuckGo
    const searxUrl = process.env.SEARX_URL || 'https://searx.be';
    const res = await axios.get(`${searxUrl}/search`, {
      params: { q: query, format: 'json', categories: 'general', language: 'en' },
      timeout: 15000,
    });
    const results = (res.data.results || []).slice(0, maxResults).map((r: any, i: number) =>
      `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content?.substring(0, 200)}`
    ).join('\n\n');
    return { success: true, output: `Search results for "${query}":\n\n${results}`, data: { count: res.data.results?.length || 0 }, executionTimeMs: Date.now() - startTime };
  } catch (error: any) {
    return { success: false, output: '', error: `Web search failed: ${error.message}`, executionTimeMs: Date.now() - startTime };
  }
};

// ========== Cross-platform Publish Tool ==========

export const socialPublishToolDefinition: ToolDefinition = {
  name: 'social_publish',
  description: 'Publish content to multiple social platforms at once (Twitter + Telegram + Discord). Great for announcements.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Content to publish (will be adapted per platform)',
      },
      platforms: {
        type: 'array',
        description: 'Platforms to publish to: twitter, telegram, discord (default: all)',
        items: { type: 'string' },
      },
    },
    required: ['content'],
  },
  allowedRoles: ['growth', 'bd', 'support', 'social', 'commander', 'content', 'devrel'],
  timeout: 30,
};

export const socialPublishToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { content, platforms = ['twitter', 'telegram', 'discord'] } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would publish to ${platforms.join(', ')}: ${content.substring(0, 100)}...`, executionTimeMs: 0 };
  }

  const results: Record<string, string> = {};

  for (const platform of platforms) {
    try {
      switch (platform) {
        case 'twitter': {
          const twitterResult = await tweetToolExecutor({ content: content.substring(0, 280) }, context);
          results.twitter = twitterResult.success ? '✅ Posted' : `❌ ${twitterResult.error}`;
          break;
        }
        case 'telegram': {
          const tgChannel = process.env.TELEGRAM_CHANNEL;
          if (tgChannel) {
            const tgResult = await telegramSendToolExecutor({ target: tgChannel, message: content }, context);
            results.telegram = tgResult.success ? '✅ Sent' : `❌ ${tgResult.error}`;
          } else {
            results.telegram = '⚠️ TELEGRAM_CHANNEL not configured';
          }
          break;
        }
        case 'discord': {
          const dcChannel = process.env.DISCORD_ANNOUNCE_CHANNEL;
          if (dcChannel) {
            const dcResult = await discordSendToolExecutor({ channelId: dcChannel, message: content }, context);
            results.discord = dcResult.success ? '✅ Sent' : `❌ ${dcResult.error}`;
          } else {
            results.discord = '⚠️ DISCORD_ANNOUNCE_CHANNEL not configured';
          }
          break;
        }
      }
    } catch (error: any) {
      results[platform] = `❌ ${error.message}`;
    }
  }

  const summary = Object.entries(results).map(([p, r]) => `${p}: ${r}`).join('\n');
  const allSuccess = Object.values(results).every(r => r.startsWith('✅'));

  return {
    success: allSuccess,
    output: `Cross-platform publish results:\n${summary}`,
    data: results,
    executionTimeMs: Date.now() - startTime,
  };
};
