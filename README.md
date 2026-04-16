# Plugin Directory

Automated plugin registry with PR validation and auto-merge capabilities for the Plugin Host system.

## Features

- 🤖 **Automated PR Processing**: Automatically validates and merges plugin submissions
- ✅ **Strict Validation**: Enforces plugin schema and ownership rules
- 🔒 **Ownership Protection**: Users can only remove plugins they authored
- 📡 **Webhook Integration**: Gitea webhook support for real-time PR handling
- 🔍 **Schema Validation**: Ensures all plugins meet quality standards
- 📦 **REST API**: List and query available plugins

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Gitea details:

```bash
cp .env.example .env
```

Edit `.env`:
```env
GITEA_URL=http://synbox.ruv.wtf:8418
GITEA_TOKEN=your_gitea_access_token_here
WEBHOOK_SECRET=your_webhook_secret_here
PORT=3000
```

### 3. Configure Gitea Webhook

In your Gitea repository settings:

1. Go to Settings → Webhooks → Add Webhook → Gitea
2. Set Payload URL: `http://your-server:3000/webhook`
3. Set Secret: (same as WEBHOOK_SECRET in .env)
4. Select events: `Pull Request`
5. Save webhook

### 4. Start Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Plugin Submission Rules

### Valid PRs Must:

1. ✅ Only modify files in the `plugins/` directory
2. ✅ Only add or remove `.json` files
3. ✅ Have valid JSON matching the plugin schema
4. ✅ Have plugin ID matching the filename
5. ✅ Have author field matching PR author (for new plugins)
6. ✅ Only remove plugins you authored

### Plugin Schema

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "description": "What your plugin does",
  "author": "your-gitea-username",
  "repository": "http://synbox.ruv.wtf:8418/username/plugin-repo.git",
  "downloadUrl": "http://synbox.ruv.wtf:8418/username/plugin-repo/archive/main.zip",
  "homepage": "http://synbox.ruv.wtf:8418/username/plugin-repo",
  "tags": ["tag1", "tag2"],
  "addedDate": "2026-04-17T00:00:00.000Z"
}
```

**Required Fields:**
- `id` - Unique identifier (must match filename without .json)
- `name` - Display name
- `version` - Semantic version (X.Y.Z)
- `description` - What the plugin does
- `author` - Your Gitea username
- `repository` - Git repository URL

**Optional Fields:**
- `downloadUrl` - Direct download link
- `homepage` - Plugin homepage or docs
- `tags` - Array of category tags
- `addedDate` - ISO 8601 date string
- `dependencies` - Required plugins or packages

## API Endpoints

### List All Plugins

```bash
GET /plugins
```

Response:
```json
{
  "plugins": [...],
  "count": 10
}
```

### Get Specific Plugin

```bash
GET /plugins/:pluginId
```

### Health Check

```bash
GET /health
```

### Webhook Endpoint

```bash
POST /webhook
```

## How It Works

1. User creates a PR adding/removing a plugin JSON file
2. Gitea sends webhook to the directory server
3. Server validates the PR:
   - Checks file locations
   - Validates JSON schema
   - Verifies ownership for removals
   - Ensures author matches PR creator
4. If valid: Auto-approves and merges
5. If invalid: Comments with error details

## Undoing Changes

To undo a merged plugin submission:

1. Create a new PR that reverses the change
2. To remove a plugin you added: delete the JSON file
3. To re-add a plugin you removed: add the JSON file back

The same validation rules apply - you can only remove plugins you authored.

## Development

The system consists of:

- `server.js` - Express server and endpoints
- `WebhookHandler.js` - Processes Gitea webhooks
- `ValidatorEnhanced.js` - Validates PR changes
- `plugins/` - Plugin registry JSON files

## Security

- Webhook signatures are verified using HMAC-SHA256
- Only PR authors can modify their own plugins
- All file operations are restricted to the `plugins/` directory
- JSON parsing errors are caught and reported

## License

MIT
