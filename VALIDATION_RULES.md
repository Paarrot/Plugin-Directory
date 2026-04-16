# Plugin Validation Rules

All plugin submissions are automatically validated before being merged. PRs must pass all validation checks to be auto-merged.

## Security

**The validation script runs from the main branch, not from your PR branch.** This prevents malicious PRs from modifying the validation logic. PRs that attempt to modify `.gitea/` directory files will be automatically rejected.

## File Requirements

### 1. Location
- ✅ Only modify files in `plugins/` directory
- ❌ Cannot modify files outside `plugins/`
- ❌ Cannot modify `.gitea/` infrastructure files
- ⚠️ `plugins/index.json` is auto-generated - don't manually edit it

### 2. File Naming
- **Filename must be prefixed with your username**
- Format: `username-plugin-name.json`
- Example: `litruv-example-plugin.json`
- ❌ Invalid: `example-plugin.json` (missing username prefix)
- ❌ Invalid: `otheruser-plugin.json` (wrong username)

This prevents naming conflicts and makes ownership visible.

### 3. File Type
- ✅ Only `.json` files are allowed in `plugins/` directory
- ❌ No other file types (images, scripts, etc. must be in plugin repo)

## Plugin JSON Schema

### Required Fields
Every plugin JSON must have these fields:

```json
{
  "id": "string",
  "name": "string",
  "version": "string",
  "description": "string",
  "author": "string",
  "repository": "string"
}
```

### Field Validation Rules

#### `id` (required)
- Must match the filename
- Example: `litruv-example-plugin.json` → `"id": "litruv-example-plugin"`
- Must include username prefix matching filename
- Lowercase, hyphens allowed, no spaces

#### `name` (required)
- Display name for the plugin
- Human-readable, any format

#### `version` (required)
- Must follow semantic versioning: `x.y.z`
- Example: `"1.0.0"`, `"2.1.3"`
- ❌ Invalid: `"v1.0"`, `"1.0"`, `"latest"`

#### `description` (required)
- Short description of what the plugin does
- Will be shown in the plugin browser

#### `author` (required)
- **MUST MATCH YOUR GITEA USERNAME**
- This enforces ownership - you can only submit/remove plugins authored by you
- Case-sensitive

#### `repository` (required)
- Git repository URL where the plugin code lives
- Must be a valid URL
- Example: `"http://synbox.ruv.wtf:8418/username/Plugin-Name.git"`

#### `thumbnail` (optional)
- URL to plugin thumbnail image
- **Requirements:**
  - Format: PNG, JPG, or GIF only
  - Max dimensions: 512×512 pixels
  - Max file size: 2MB
  - Must be accessible via HTTP/HTTPS
- Example: `"http://synbox.ruv.wtf:8418/username/Plugin-Name/raw/branch/main/thumbnail.png"`
- Validation checks actual image format (magic bytes), dimensions, and size

### Optional Fields
You can include any additional fields for metadata:
- `homepage` - Project homepage URL
- `downloadUrl` - Direct download link
- `tags` - Array of tags
- `addedDate` - ISO timestamp

## Ownership Rules

### Adding Plugins
- The `author` field must match your Gitea username
- This is checked automatically

### Modifying Plugins
- **You can only modify plugins where the ORIGINAL author (on main branch) is you**
- Even if you change the `author` field in your PR, validation checks against the original
- Attempting to modify someone else's plugin will fail validation with:
  ```
  ❌ plugins/their-plugin.json: Cannot modify plugin owned by "them" (you are "you")
  ```

### Removing Plugins
- **You can only remove plugins where the ORIGINAL author (on main branch) is you**
- The validation checks the plugin's author from the main branch, not from your PR
- Attempting to remove someone else's plugin will fail validation with:
  ```
  ❌ plugins/their-plugin.json: Cannot remove plugin owned by "them" (you are "you")
  ```

**Security Note:** All ownership checks use the plugin data from the `main` branch, not from your PR. You cannot bypass ownership by modifying the `author` field.

## Validation Process

1. **File check**: Ensures only `plugins/*.json` files are modified
2. **Infrastructure check**: Blocks any `.gitea/` modifications
3. **JSON parsing**: Validates JSON syntax
4. **Schema validation**: Checks all required fields exist
5. **Field validation**: Validates each field's format and rules
6. **Thumbnail validation** (if provided): Downloads and validates image
7. **Author matching**: Ensures `author` field matches PR creator
8. **Auto-merge**: If all checks pass, PR is automatically merged

## Testing Locally

You can test your plugin JSON before submitting:

```bash
cd Plugin-Directory
node .gitea/scripts/validate-pr.js "your-username" "plugins/your-plugin.json"
```

## Common Errors

### ❌ Author mismatch
```
❌ plugins/example-plugin.json: Author "someone" must match PR creator "you"
```
**Fix**: Change `"author": "someone"` to `"author": "you"`

### ❌ ID doesn't match filename
```litruv-my-plugin.json: Plugin ID "different-name" doesn't match filename "litruv-my-plugin.json"
```
**Fix**: Change `"id": "different-name"` to `"id": "litruv-my-plugin"`

### ❌ Filename missing username prefix
```
❌ plugins/my-plugin.json: Filename must start with your username "litruv-" (e.g., "litruv-my-plugin.json")
```
**Fix**: Rename file from `my-plugin.json` to `litruv-my-plugin.json` and update the `id` field
**Fix**: Change `"id": "different-name"` to `"id": "my-plugin"`

### ❌ Invalid version
```
❌ plugins/example-plugin.json: Invalid version format: v1.0
```
**Fix**: Use semantic versioning like `"version": "1.0.0"`

### ❌ Thumbnail too large
```
❌ plugins/example-plugin.json: Thumbnail validation failed: Thumbnail exceeds 2MB limit (3.45MB)
```
**Fix**: Compress your thumbnail to under 2MB

### ❌ Thumbnail dimensions too large
```
❌ plugins/example-plugin.json: Thumbnail validation failed: Thumbnail dimensions 1024x768 exceed 512x512
```
**Fix**: litruv-example-plugin",
  "name": "Example Plugin",
  "version": "1.0.0",
  "description": "An example plugin demonstrating the plugin system capabilities",
  "author": "litruv",
  "repository": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example.git",
  "thumbnail": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example/raw/branch/main/thumbnail.png",
  "homepage": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example",
  "tags": ["example", "demo"]
}
```

Filename: `litruv-example-plugin.json"author": "litruv",
  "repository": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example.git",
  "thumbnail": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example/raw/branch/main/thumbnail.png",
  "homepage": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example",
  "tags": ["example", "demo"]
}
```

## Security Note

**Never include sensitive information in plugin JSON files.** These files are public and will be served to all plugin host users. Do not include:
- API keys or tokens
- Passwords
- Private URLs or endpoints
- Personal information
