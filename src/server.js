import express from 'express';
import { WebhookHandler } from './WebhookHandler.js';
import { readFile } from 'fs/promises';

const app = express();
const port = process.env.PORT || 3000;
const webhookSecret = process.env.WEBHOOK_SECRET || '';

app.use(express.json());

const handler = new WebhookHandler({
  giteaUrl: process.env.GITEA_URL || 'http://synbox.ruv.wtf:8418',
  giteaToken: process.env.GITEA_TOKEN || '',
  webhookSecret,
  repoOwner: 'litruv',
  repoName: 'Plugin-Directory'
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * List all plugins endpoint
 */
app.get('/plugins', async (req, res) => {
  try {
    const plugins = await handler.listPlugins();
    res.json({ plugins, count: plugins.length });
  } catch (error) {
    console.error('Error listing plugins:', error);
    res.status(500).json({ error: 'Failed to list plugins' });
  }
});

/**
 * Get specific plugin endpoint
 */
app.get('/plugins/:pluginId', async (req, res) => {
  try {
    const plugin = await handler.getPlugin(req.params.pluginId);
    if (plugin) {
      res.json(plugin);
    } else {
      res.status(404).json({ error: 'Plugin not found' });
    }
  } catch (error) {
    console.error('Error getting plugin:', error);
    res.status(500).json({ error: 'Failed to get plugin' });
  }
});

/**
 * Webhook endpoint for Gitea PR events
 */
app.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-gitea-signature'];
    const event = req.headers['x-gitea-event'];
    
    if (!handler.verifySignature(req.body, signature)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log(`Received webhook event: ${event}`);

    if (event === 'pull_request') {
      await handler.handlePullRequest(req.body);
    }

    res.json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.listen(port, () => {
  console.log(`Plugin Directory server running on port ${port}`);
  console.log(`Webhook endpoint: http://localhost:${port}/webhook`);
  console.log(`Plugin list: http://localhost:${port}/plugins`);
});
