# Plugin Directory

A simple git-based plugin registry for the Plugin Host system.

## 📦 What This Is

A collection of JSON files that describe available plugins. The Plugin Host fetches these definitions directly from the git repository.

## 🚀 How It Works

1. Plugin authors create a JSON file in `plugins/` directory
2. Submit via Pull Request
3. Gitea Actions validate the submission
4. If valid, maintainer merges the PR
5. Plugin Host automatically discovers the new plugin

## 📝 Submitting a Plugin

### 1. Fork this repository

### 2. Create your plugin definition

Create `plugins/your-plugin-id.json`:

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "description": "What your plugin does",
  "author": "your-gitea-username",
  "repository": "http://synbox.ruv.wtf:8418/you/your-plugin.git",
  "downloadUrl": "http://synbox.ruv.wtf:8418/you/your-plugin/archive/main.zip",
  "homepage": "http://synbox.ruv.wtf:8418/you/your-plugin",
  "tags": ["category", "keywords"]
}
```

**Required fields:**
- `id` - Must match filename (without .json)
- `name` - Display name
- `version` - Semantic version (X.Y.Z)
- `description` - Brief description
- `author` - Your Gitea username (must match PR creator)
- `repository` - Git repository URL

### 3. Create Pull Request

Gitea Actions will automatically validate:
- ✅ File is in `plugins/` directory
- ✅ File is valid JSON
- ✅ All required fields present
- ✅ ID matches filename
- ✅ Author matches your username
- ✅ Version format is valid
- ✅ URLs are valid

### 4. Merge

If validation passes, maintainer will merge your PR.

## 🗑️ Removing Your Plugin

Only plugin authors can remove their own plugins:

1. Fork this repository
2. Delete `plugins/your-plugin-id.json`
3. Create Pull Request

## 🔄 Updating Your Plugin

1. Fork this repository
2. Edit `plugins/your-plugin-id.json`
3. Update version number and any other fields
4. Create Pull Request

## 📋 Plugin Schema

See [SCHEMA.md](SCHEMA.md) for full schema documentation.

## 🔍 Validation Rules

PRs must:
- Only modify files in `plugins/` directory
- Only modify `.json` files
- Have valid JSON
- Match the plugin schema
- Have author field matching PR creator
- Have plugin ID matching filename

## 🏗️ Directory Structure

```
Plugin-Directory/
├── plugins/
│   ├── example-plugin.json
│   ├── your-plugin.json
│   └── ...
├── .gitea/
│   ├── workflows/
│   │   └── validate-pr.yml
│   └── scripts/
│       └── validate-pr.js
└── README.md
```

## 🔗 Plugin Host Integration

The Plugin Host fetches plugin definitions from:
```
http://synbox.ruv.wtf:8418/litruv/Plugin-Directory/raw/branch/main/plugins/
```

No server needed - just static JSON files served by Gitea!

## 📖 Example Plugins

- [example-plugin.json](plugins/example-plugin.json) - Reference implementation

## License

MIT
