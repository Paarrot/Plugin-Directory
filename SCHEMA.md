# Plugin Schema

All plugin definitions must be valid JSON files following this schema.

## Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier (must match filename) | `"awesome-plugin"` |
| `name` | string | Display name | `"Awesome Plugin"` |
| `version` | string | Semantic version | `"1.0.0"` |
| `description` | string | What the plugin does | `"Does awesome things"` |
| `author` | string | Gitea username of creator | `"litruv"` |
| `repository` | string | Git repository URL | `"http://synbox.ruv.wtf:8418/litruv/awesome-plugin.git"` |

## Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `downloadUrl` | string | Direct download URL | `"http://synbox.ruv.wtf:8418/litruv/awesome-plugin/archive/main.zip"` |
| `homepage` | string | Plugin homepage or documentation | `"http://synbox.ruv.wtf:8418/litruv/awesome-plugin"` |
| `tags` | array | Category tags | `["utility", "automation"]` |
| `addedDate` | string | ISO 8601 date | `"2026-04-17T00:00:00.000Z"` |
| `dependencies` | object | Required dependencies | `{"lodash": "^4.17.21"}` |

## Example

```json
{
  "id": "example-plugin",
  "name": "Example Plugin",
  "version": "1.0.0",
  "description": "An example plugin demonstrating the plugin system capabilities",
  "author": "litruv",
  "repository": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example.git",
  "downloadUrl": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example/archive/main.zip",
  "homepage": "http://synbox.ruv.wtf:8418/litruv/Plugin-Example",
  "tags": ["example", "demo"],
  "addedDate": "2026-04-17T00:00:00.000Z"
}
```

## Validation Rules

1. **Filename Match**: Plugin ID must match the filename (without .json extension)
   - ✅ `awesome-plugin.json` with `"id": "awesome-plugin"`
   - ❌ `awesome-plugin.json` with `"id": "different-name"`

2. **Version Format**: Must follow semantic versioning (X.Y.Z)
   - ✅ `"1.0.0"`, `"2.5.3"`, `"0.1.0"`
   - ❌ `"1.0"`, `"v1.0.0"`, `"latest"`

3. **Author Matching**: For new plugins, author must match PR creator
   - If PR is by user `litruv`, author field must be `"litruv"`

4. **Valid URLs**: Repository, downloadUrl, and homepage must be valid URLs
   - ✅ `"http://example.com/repo.git"`
   - ❌ `"not-a-url"`, `"//example.com"`

5. **Tags**: If present, must be an array of strings
   - ✅ `["tag1", "tag2"]`
   - ❌ `"tag1,tag2"`, `{"tag": "value"}`

## Submission Process

1. Create a JSON file in the `plugins/` directory
2. Filename must be `{plugin-id}.json`
3. Ensure all required fields are present
4. Author field must match your Gitea username
5. Create a Pull Request
6. Automated validation will run
7. If valid, PR auto-merges
8. If invalid, you'll receive comments explaining what to fix
