# Security Model

## Authentication vs Git Configuration

### How User Identity Works

**Question:** Can't I just set my git username to anything and bypass validation?

**Answer:** No. The validation uses **Gitea account authentication**, not git commit authors.

#### Git Commit Author (NOT used for validation)
```bash
# This can be set to anything locally
git config user.name "anyone"
git config user.email "anyone@example.com"
git commit -m "My commit"
```
These values are **NOT** used for plugin ownership validation.

#### PR Creator (used for validation)
When you create a Pull Request:
1. You must be logged into your Gitea account
2. The PR is created through Gitea's authenticated API
3. `github.event.pull_request.user.login` = your authenticated Gitea username

**This is what validation checks against.**

### Example Attack Scenario (Prevented)

❌ **Attacker tries:**
```bash
# Configure git to impersonate someone
git config user.name "victim"
git config user.email "victim@example.com"

# Modify victim's plugin
vim plugins/victim-plugin.json
# Change author to "attacker"

git commit -m "Update plugin"
git push

# Create PR (must log into Gitea as "attacker" account)
```

✅ **What happens:**
1. PR is created by authenticated Gitea user: `attacker`
2. Validation script receives: `prAuthor = "attacker"`
3. Validation checks original plugin from main branch: `original.author = "victim"`
4. Check fails: `"victim" !== "attacker"`
5. **Result:** ❌ `Cannot modify plugin owned by "victim" (you are "attacker")`

The git commit author is irrelevant - what matters is **who is logged into Gitea when creating the PR**.

## Security Measures

### 1. Dual Checkout
```yaml
- Checkout main branch → base/ (trusted validation scripts)
- Checkout PR branch → pr/ (untrusted user submissions)
```
Validation script always runs from `base/`, never from PR branch.

### 2. Infrastructure Protection
PRs that modify `.gitea/` directory are automatically rejected.

### 3. Ownership Verification
All modifications/deletions check **original ownership from main branch**:
```javascript
// Check original plugin from main (base/)
const originalPlugin = readFile('../base/plugins/example.json');

// User can only modify if they own the original
if (originalPlugin.author !== prAuthor) {
  reject("Cannot modify plugin owned by someone else");
}
```

### 4. Author Field Validation
New plugins must have `author` field matching the PR creator's authenticated Gitea username.

## What About Collaboration?

**Q:** What if I want someone else to update my plugin?

**A:** They cannot submit PRs directly. Options:
1. Transfer ownership by updating the `author` field yourself
2. They fork your plugin repo and create their own plugin entry
3. Add them as collaborators to your plugin repository (not the directory)

## Trust Model

### Trusted Components
- Main branch content (validated history)
- Gitea authentication system
- GitHub Actions runner environment
- Validation scripts on main branch

### Untrusted Components
- PR branch content (user submissions)
- Git commit metadata (names, emails)
- PR descriptions and comments

### Validation Flow
```
1. User authenticates to Gitea → Trusted user identity
2. User creates PR → github.event.pull_request.user.login
3. Validation runs from main branch scripts → Trusted code
4. Checks plugin ownership against main → Trusted ownership data
5. Validates PR author matches plugin author → Secure check
```

## Reporting Security Issues

If you find a security vulnerability in the plugin directory system:
1. **Do NOT create a public issue or PR**
2. Contact the repository maintainer directly
3. Provide detailed reproduction steps
4. Allow time for a fix before public disclosure

## Additional Safeguards

### Rate Limiting
Gitea's built-in rate limiting prevents spam PR attacks.

### Branch Protection
The `main` branch is protected:
- Direct pushes disabled
- All changes via PR
- Auto-merge only after validation passes

### Audit Trail
All changes are tracked in git history:
- Who created the PR (Gitea account)
- What changed (git diff)
- When it was merged (git commit timestamp)
- Why validation passed (CI logs)
