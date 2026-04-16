# Plugin Directory

Git-based plugin registry for Plugin Host. No server needed - just JSON files.

## How to Submit a Plugin

### 1. Create your plugin JSON file

Filename format: `plugins/{username}-{plugin-name}.json`

Example: `plugins/litruv-example-plugin.json`

```json
{
  "id": "litruv-example-plugin",
  "name": "Example Plugin",
  "version": "1.0.0",
  "description": "What your plugin does",
  "author": "litruv",
  "repository": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example",
  "homepage": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example",
  "thumbnail": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example/raw/branch/main/thumbnail.png",
  "tags": ["example"]
}
```

**Required fields:** `id`, `name`, `version`, `description`, `author`, `repository`

**Optional fields:** `homepage`, `thumbnail`, `tags`, `downloadUrl`

**Rules:**
- All URLs must NOT end with `.git`
- `repository` and `homepage` should point to your plugin repo (without .git)
- `thumbnail` must be `thumbnail.png`, `thumbnail.jpg`, or `thumbnail.gif` (max 512x512, max 2MB)

**Important:**
- Filename must start with your username: `{username}-`
- Plugin `id` must match filename (without .json)
- `author` field must match your Gitea username

### 2. Create a Pull Request

Push your branch and create a PR. Gitea Actions will automatically:
- Validate your submission
- Post approval comment if valid
- Auto-merge and update the plugin index

That's it! Your plugin will be available immediately after merge.

## Updating or Removing

- **Update:** Create PR with modified JSON (version bump required)
- **Remove:** Create PR deleting your plugin JSON file

You can only modify/remove plugins you authored.

## Plugin Discovery

Plugin Host fetches from:
```
http://synbox.ruv.wtf:8418/litruv/Plugin-Directory/raw/branch/main/plugins/index.json
```

