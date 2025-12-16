# Hooks Directory

This directory is for automation hooks that run in response to events.

## Hook Types

- `SessionStart.sh` - Runs when a Claude Code session starts
- `UserPromptSubmit.sh` - Runs before each user prompt is processed
- Other custom hooks as needed

## Example: SessionStart Hook

Create `.claude/hooks/SessionStart.sh`:

```bash
#!/bin/bash
echo "Frontend development session started"
echo "Project: AI Content Platform"
echo "Stack: React + TypeScript + Vite"
```

Make it executable:
```bash
chmod +x .claude/hooks/SessionStart.sh
```

## Learn More

See Claude Code documentation for more information about hooks and automation.
