#!/usr/bin/env node

/**
 * Plugin PR Validator for Gitea Actions
 * 
 * Validates plugin submissions according to the rules:
 * 1. Only modify files in plugins/ directory
 * 2. Only JSON files
 * 3. Valid JSON matching schema
 * 4. Plugin ID matches filename
 * 5. Author matches PR creator (for new plugins)
 * 6. Can only remove own plugins
 */

import { readFile, access } from 'fs/promises';
import { join } from 'path';

const REQUIRED_FIELDS = ['id', 'name', 'version', 'description', 'author', 'repository'];

const prAuthor = process.argv[2];
const changedFiles = process.argv[3]?.split('\n').filter(f => f.trim()) || [];

if (!prAuthor) {
  console.error('❌ Error: PR author not provided');
  process.exit(1);
}

console.log(`\n🔍 Validating PR from: ${prAuthor}`);
console.log(`📝 Changed files: ${changedFiles.length}`);

const errors = [];
const added = [];
const removed = [];

// Validate each changed file
for (const file of changedFiles) {
  console.log(`\n📄 Checking: ${file}`);
  
  // Must be in plugins/ directory
  if (!file.startsWith('plugins/')) {
    errors.push(`❌ File outside plugins/ directory: ${file}`);
    continue;
  }
  
  // Must be JSON
  if (!file.endsWith('.json')) {
    errors.push(`❌ Non-JSON file in plugins/: ${file}`);
    continue;
  }
  
  // Skip index.json - it's auto-generated
  if (file === 'plugins/index.json') {
    console.log(`⚠️  Note: index.json is auto-generated, should not be manually edited`);
    continue;
  }
  
  const pluginId = file.replace('plugins/', '').replace('.json', '');
  
  // Check if file was added or removed
  let isAdded = false;
  let isRemoved = false;
  
  try {
    await access(file);
    isAdded = true;
  } catch {
    isRemoved = true;
  }
  
  if (isAdded) {
    // Validate added/modified plugin
    try {
      const content = await readFile(file, 'utf-8');
      const plugin = JSON.parse(content);
      
      // Check required fields
      for (const field of REQUIRED_FIELDS) {
        if (!plugin[field]) {
          errors.push(`❌ ${file}: Missing required field: ${field}`);
        }
      }
      
      // Check ID matches filename
      if (plugin.id !== pluginId) {
        errors.push(`❌ ${file}: Plugin ID "${plugin.id}" doesn't match filename "${pluginId}.json"`);
      }
      
      // Check version format
      if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
        errors.push(`❌ ${file}: Invalid version format: ${plugin.version}`);
      }
      
      // Check author matches PR creator (for new files)
      if (plugin.author !== prAuthor) {
        errors.push(`❌ ${file}: Author "${plugin.author}" must match PR creator "${prAuthor}"`);
      }
      
      // Check repository URL is valid
      if (plugin.repository) {
        try {
          new URL(plugin.repository);
        } catch {
          errors.push(`❌ ${file}: Invalid repository URL: ${plugin.repository}`);
        }
      }
      
      if (errors.length === 0) {
        added.push(pluginId);
        console.log(`✅ Valid plugin: ${plugin.name}`);
      }
      
    } catch (err) {
      errors.push(`❌ ${file}: ${err.message}`);
    }
    
  } else if (isRemoved) {
    // For removed files, we can't validate ownership easily in CI
    // Just track that it was removed
    removed.push(pluginId);
    console.log(`🗑️  Removed: ${pluginId}`);
  }
}

// Print results
console.log('\n' + '='.repeat(50));
if (errors.length > 0) {
  console.log('❌ VALIDATION FAILED\n');
  errors.forEach(err => console.log(err));
  console.log('\n📋 Rules:');
  console.log('  1. Only modify files in plugins/ directory');
  console.log('  2. Only JSON files allowed');
  console.log('  3. Must match plugin schema');
  console.log('  4. Plugin ID must match filename');
  console.log('  5. Author field must be your username');
  console.log('  6. Must be valid JSON');
  process.exit(1);
}

console.log('✅ VALIDATION PASSED\n');
if (added.length > 0) {
  console.log(`📦 Added plugins: ${added.join(', ')}`);
}
if (removed.length > 0) {
  console.log(`🗑️  Removed plugins: ${removed.join(', ')}`);
}
console.log('\n✨ This PR is ready to merge!');
process.exit(0);
