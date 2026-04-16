import { readFile } from 'fs/promises';

/**
 * Validator - Validates PR changes against plugin directory rules
 */
export class Validator {
  constructor() {
    this.requiredFields = ['id', 'name', 'version', 'description', 'author', 'repository'];
    this.optionalFields = ['downloadUrl', 'homepage', 'tags', 'addedDate', 'dependencies'];
  }

  /**
   * Validate a PR's file changes
   */
  async validatePR(files, prAuthor) {
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
        // Validate added/modified plugins
        try {
          const validation = await this.validatePluginFile(file, pluginId, prAuthor);
          
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
   * Validate a plugin JSON file
   */
  async validatePluginFile(file, pluginId, prAuthor) {
    const errors = [];

    try {
      // Parse the JSON content from the file patch
      const content = this.extractFileContent(file);
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
      if (file.status === 'added' && plugin.author !== prAuthor) {
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
      // Read the existing plugin file from disk
      const content = await readFile(`./plugins/${pluginId}.json`, 'utf-8');
      const plugin = JSON.parse(content);

      // Check if the PR author is the plugin author
      if (plugin.author !== prAuthor) {
        errors.push(`Cannot remove plugin: you are not the author (author: ${plugin.author})`);
      }
    } catch (error) {
      // If file doesn't exist, it's probably already removed
      console.warn(`Could not validate removal of ${pluginId}:`, error.message);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract file content from Gitea file object
   * In a real implementation, you'd fetch the raw content from the PR
   */
  extractFileContent(file) {
    // This is a simplified version
    // In production, fetch the actual file content from the PR's head branch
    
    // For now, return a placeholder that would need to be fetched
    throw new Error('File content extraction not fully implemented - fetch from PR branch');
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
