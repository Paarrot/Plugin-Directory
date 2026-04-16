import { WebhookHandler } from './WebhookHandler.js';
import fetch from 'node-fetch';

/**
 * Enhanced validator that fetches actual file content from PR
 */
export class Validator {
  constructor(webhookHandler) {
    this.handler = webhookHandler;
    this.requiredFields = ['id', 'name', 'version', 'description', 'author', 'repository'];
    this.optionalFields = ['downloadUrl', 'homepage', 'tags', 'addedDate', 'dependencies'];
  }

  /**
   * Validate a PR's file changes
   */
  async validatePR(files, prAuthor, prNumber) {
    const errors = [];
    const added = [];
    const removed = [];

    // Check that all files are in the plugins/ directory
    const invalidPaths = files.filter(f => !f.filename.startsWith('plugins/'));
    if (invalidPaths.length > 0) {
      errors.push(`Files outside plugins/ directory: ${invalidPaths.map(f => f.filename).join(', ')}`);
    }

    // Check that all files are .json files
    const nonJsonFiles = files.filter(f => 
      f.filename.startsWith('plugins/') && !f.filename.endsWith('.json')
    );
    if (nonJsonFiles.length > 0) {
      errors.push(`Non-JSON files in plugins/: ${nonJsonFiles.map(f => f.filename).join(', ')}`);
    }

    // Process each changed file
    for (const file of files) {
      if (!file.filename.startsWith('plugins/') || !file.filename.endsWith('.json')) {
        continue;
      }

      const pluginId = file.filename.replace('plugins/', '').replace('.json', '');

      if (file.status === 'added' || file.status === 'modified') {
        // Fetch and validate the file content
        try {
          const content = await this.fetchPRFileContent(prNumber, file.filename);
          const validation = await this.validatePluginContent(content, pluginId, prAuthor, file.status);
          
          if (!validation.valid) {
            errors.push(...validation.errors.map(e => `${file.filename}: ${e}`));
          } else {
            added.push(pluginId);
          }
        } catch (error) {
          errors.push(`${file.filename}: ${error.message}`);
        }
      } else if (file.status === 'removed') {
        // Validate removed plugins (check ownership)
        try {
          const canRemove = await this.validateRemoval(pluginId, prAuthor);
          
          if (!canRemove.valid) {
            errors.push(...canRemove.errors.map(e => `${file.filename}: ${e}`));
          } else {
            removed.push(pluginId);
          }
        } catch (error) {
          errors.push(`${file.filename}: ${error.message}`);
        }
      }
    }

    // Must have at least one change
    if (files.length === 0) {
      errors.push('PR has no file changes');
    }

    return {
      valid: errors.length === 0,
      errors,
      added,
      removed
    };
  }

  /**
   * Fetch file content from a PR
   */
  async fetchPRFileContent(prNumber, filename) {
    const pr = await this.getPRDetails(prNumber);
    const headSha = pr.head.sha;
    
    const url = `${this.handler.giteaUrl}/api/v1/repos/${this.handler.repoOwner}/${this.handler.repoName}/contents/${filename}?ref=${headSha}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${this.handler.giteaToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  }

  /**
   * Get PR details
   */
  async getPRDetails(prNumber) {
    const url = `${this.handler.giteaUrl}/api/v1/repos/${this.handler.repoOwner}/${this.handler.repoName}/pulls/${prNumber}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${this.handler.giteaToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PR: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Validate plugin JSON content
   */
  async validatePluginContent(content, pluginId, prAuthor, status) {
    const errors = [];

    try {
      const plugin = JSON.parse(content);

      // Check required fields
      for (const field of this.requiredFields) {
        if (!plugin[field]) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Check that ID matches filename
      if (plugin.id !== pluginId) {
        errors.push(`Plugin ID "${plugin.id}" does not match filename "${pluginId}.json"`);
      }

      // Validate version format (semver-ish)
      if (plugin.version && !this.isValidVersion(plugin.version)) {
        errors.push(`Invalid version format: ${plugin.version} (expected: X.Y.Z)`);
      }

      // Validate repository URL
      if (plugin.repository && !this.isValidUrl(plugin.repository)) {
        errors.push(`Invalid repository URL: ${plugin.repository}`);
      }

      // Validate author matches PR author (for new plugins)
      if (status === 'added' && plugin.author !== prAuthor) {
        errors.push(`Author "${plugin.author}" must match PR author "${prAuthor}"`);
      }

      // Validate tags if present
      if (plugin.tags && !Array.isArray(plugin.tags)) {
        errors.push('Tags must be an array');
      }

    } catch (error) {
      errors.push(`Invalid JSON: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that a user can remove a plugin
   */
  async validateRemoval(pluginId, prAuthor) {
    const errors = [];

    try {
      // Read the existing plugin file from main branch
      const url = `${this.handler.giteaUrl}/api/v1/repos/${this.handler.repoOwner}/${this.handler.repoName}/contents/plugins/${pluginId}.json`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `token ${this.handler.giteaToken}` }
      });

      if (!response.ok) {
        // If file doesn't exist on main, removal is fine
        return { valid: true, errors: [] };
      }

      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const plugin = JSON.parse(content);

      // Check if the PR author is the plugin author
      if (plugin.author !== prAuthor) {
        errors.push(`Cannot remove plugin: you are not the author (author: ${plugin.author})`);
      }
    } catch (error) {
      console.warn(`Could not validate removal of ${pluginId}:`, error.message);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate semantic version format
   */
  isValidVersion(version) {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version);
  }

  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
