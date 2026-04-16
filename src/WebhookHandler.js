import crypto from 'crypto';
import fetch from 'node-fetch';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Validator } from './ValidatorEnhanced.js';

/**
 * WebhookHandler - Processes Gitea webhooks for automated PR handling
 */
export class WebhookHandler {
  constructor(options) {
    this.giteaUrl = options.giteaUrl;
    this.giteaToken = options.giteaToken;
    this.webhookSecret = options.webhookSecret;
    this.repoOwner = options.repoOwner;
    this.repoName = options.repoName;
    this.validator = new Validator(this);
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature) {
    if (!this.webhookSecret) return true; // Skip if no secret configured
    
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = hmac.update(JSON.stringify(payload)).digest('hex');
    return signature === digest;
  }

  /**
   * Handle pull request webhook
   */
  async handlePullRequest(payload) {
    const { action, pull_request, repository } = payload;
    
    console.log(`PR #${pull_request.number}: ${action} by ${pull_request.user.login}`);

    // Only process opened or synchronized PRs
    if (action !== 'opened' && action !== 'synchronize') {
      console.log('Skipping PR action:', action);
      return;
    }

    try {
      // Get PR details
      const prNumber = pull_request.number;
      const prAuthor = pull_request.user.login;
      const headBranch = pull_request.head.ref;
      const baseBranch = pull_request.base.ref;

      // Get file changes in the PR
      const files = await this.getPRFiles(prNumber);
      
      console.log(`PR files changed: ${files.map(f => `${f.filename} (${f.status})`).join(', ')}`);

      // Validate the PR
      const validation = await this.validator.validatePR(files, prAuthor, prNumber);

      if (!validation.valid) {
        console.log('Validation failed:', validation.errors);
        await this.commentOnPR(prNumber, this.buildErrorComment(validation.errors));
        await this.labelPR(prNumber, 'validation-failed');
        return;
      }

      // PR is valid, auto-approve and merge
      console.log('✓ PR validation passed');
      await this.commentOnPR(prNumber, this.buildSuccessComment(validation));
      await this.labelPR(prNumber, 'auto-approved');
      await this.mergePR(prNumber);
      
      console.log(`✓ Auto-merged PR #${prNumber}`);
    } catch (error) {
      console.error('Error handling PR:', error);
      await this.commentOnPR(pull_request.number, 
        `❌ **Automation Error**\n\nFailed to process this PR: ${error.message}`
      );
    }
  }

  /**
   * Get files changed in a PR
   */
  async getPRFiles(prNumber) {
    const url = `${this.giteaUrl}/api/v1/repos/${this.repoOwner}/${this.repoName}/pulls/${prNumber}/files`;
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${this.giteaToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PR files: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Comment on a PR
   */
  async commentOnPR(prNumber, body) {
    const url = `${this.giteaUrl}/api/v1/repos/${this.repoOwner}/${this.repoName}/issues/${prNumber}/comments`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.giteaToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body })
    });

    if (!response.ok) {
      console.error('Failed to comment on PR:', response.statusText);
    }
  }

  /**
   * Label a PR
   */
  async labelPR(prNumber, label) {
    const url = `${this.giteaUrl}/api/v1/repos/${this.repoOwner}/${this.repoName}/issues/${prNumber}/labels`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.giteaToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ labels: [label] })
    });

    if (!response.ok) {
      console.error('Failed to label PR:', response.statusText);
    }
  }

  /**
   * Merge a PR
   */
  async mergePR(prNumber) {
    const url = `${this.giteaUrl}/api/v1/repos/${this.repoOwner}/${this.repoName}/pulls/${prNumber}/merge`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.giteaToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Do: 'squash',
        MergeMessageField: 'Auto-merged plugin directory update',
        delete_branch_after_merge: true
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to merge PR: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Build error comment for PR
   */
  buildErrorComment(errors) {
    let comment = '❌ **Validation Failed**\n\nThis PR cannot be auto-merged due to the following issues:\n\n';
    
    errors.forEach(error => {
      comment += `- ${error}\n`;
    });

    comment += '\n**Rules:**\n';
    comment += '1. Only modify files in the `plugins/` directory\n';
    comment += '2. Only add or remove `.json` files\n';
    comment += '3. JSON files must match the plugin schema\n';
    comment += '4. You can only remove plugins you authored\n';
    comment += '5. Plugin ID must match the filename (without .json)\n';
    comment += '\nPlease fix these issues and push again.';

    return comment;
  }

  /**
   * Build success comment for PR
   */
  buildSuccessComment(validation) {
    let comment = '✅ **Validation Passed**\n\nThis PR has been automatically approved and will be merged.\n\n';
    
    if (validation.added.length > 0) {
      comment += `**Added plugins:** ${validation.added.join(', ')}\n`;
    }
    
    if (validation.removed.length > 0) {
      comment += `**Removed plugins:** ${validation.removed.join(', ')}\n`;
    }

    comment += '\nTo undo this change, create a new PR that reverses these changes.';

    return comment;
  }

  /**
   * List all plugins from the plugins directory
   */
  async listPlugins() {
    const pluginsDir = './plugins';
    const files = await readdir(pluginsDir);
    const plugins = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await readFile(join(pluginsDir, file), 'utf-8');
          const plugin = JSON.parse(content);
          plugins.push(plugin);
        } catch (error) {
          console.error(`Error reading plugin ${file}:`, error);
        }
      }
    }

    return plugins;
  }

  /**
   * Get a specific plugin
   */
  async getPlugin(pluginId) {
    const pluginsDir = './plugins';
    const filePath = join(pluginsDir, `${pluginId}.json`);
    
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
}
