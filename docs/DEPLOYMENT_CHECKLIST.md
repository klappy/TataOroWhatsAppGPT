# 🚨 MANDATORY DEPLOYMENT CHECKLIST

## BEFORE EVERY DEPLOYMENT - NO EXCEPTIONS!

### 1. ✅ Version Bump (MANDATORY)

```bash
# Update package.json version
# Update wrangler.toml version comment
# Update CHANGELOG.md with new version entry
```

### 2. ✅ Commit Changes (MANDATORY)

```bash
git add -A
git commit -m "v1.X.X: Brief description of changes"
```

### 3. ✅ Deploy (ONLY AFTER COMMIT)

```bash
npx wrangler deploy
```

### 4. ✅ Test Deployment

```bash
# Test the deployed functionality
# Verify version shows correctly in debug output
```

## 🔥 CRITICAL RULES

### NEVER DEPLOY WITHOUT:

- [ ] Bumping version in package.json
- [ ] Updating version comment in wrangler.toml
- [ ] Adding changelog entry
- [ ] Committing changes first
- [ ] Testing the deployment

### VERSION BUMPING RULES:

- **Patch (1.X.Y)**: Bug fixes, small improvements
- **Minor (1.X.0)**: New features, significant changes
- **Major (2.0.0)**: Breaking changes, architecture overhauls

### CHANGELOG FORMAT:

```markdown
## [1.X.X] - YYYY-MM-DD

- **🚨 CRITICAL FIX**: Description for critical bugs
- **🎯 NEW FEATURE**: Description for new features
- **🔧 IMPROVEMENT**: Description for improvements
- **📋 DOCUMENTATION**: Description for doc updates
```

## 🚫 WHAT HAPPENS IF YOU FORGET

If you deploy without version bump:

1. **STOP** - Don't panic
2. **Immediately bump version**
3. **Update changelog**
4. **Commit the version bump**
5. **Deploy again** with proper version
6. **Never do it again**

## 📝 DEPLOYMENT SCRIPT (FUTURE)

Consider creating a deployment script that enforces this process:

```bash
#!/bin/bash
# deploy.sh - Enforced deployment process

# Check if git is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Git working directory not clean. Commit changes first."
  exit 1
fi

# Prompt for version bump
echo "Current version: $(jq -r '.version' package.json)"
read -p "New version (or press Enter to skip): " new_version

if [[ -n $new_version ]]; then
  # Update package.json
  jq ".version = \"$new_version\"" package.json > tmp.json && mv tmp.json package.json

  # Update wrangler.toml
  sed -i "s/# Version .*/# Version $new_version/" wrangler.toml

  # Prompt for changelog
  echo "Update CHANGELOG.md manually, then press Enter to continue..."
  read

  # Commit changes
  git add -A
  git commit -m "v$new_version: Version bump"
fi

# Deploy
npx wrangler deploy

echo "✅ Deployment complete!"
```

## 🎯 REMEMBER

**The version number is not just decoration - it's critical for:**

- Debugging production issues
- Tracking which fixes are deployed
- Understanding what changed between releases
- Maintaining professional development practices

**STOP FORGETTING TO BUMP THE VERSION!** 🔥
