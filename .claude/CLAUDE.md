# Claude Code Configuration

This directory contains Claude Code configuration for frontend development.

## Structure

```
.claude/
├── settings.json              # Claude Code settings and preferences
├── agents/                    # AI agent configurations
│   └── frontend-developer.md  # Frontend developer agent
├── commands/                  # Custom slash commands
│   ├── build.md              # Build the project
│   ├── dev.md                # Start dev server
│   ├── analyze-bundle.md     # Analyze bundle size
│   ├── fix-errors.md         # Find and fix errors
│   ├── code-review.md        # Review code quality
│   ├── create-component.md   # Create new React component
│   └── optimize-performance.md # Performance optimization
└── hooks/                     # Automation hooks
```

## Available Commands

Use these slash commands in Claude Code:

- `/build` - Build the project for production
- `/dev` - Start the development server
- `/analyze-bundle` - Analyze bundle size and dependencies
- `/fix-errors` - Identify and fix TypeScript/runtime errors
- `/code-review` - Review recent changes for quality
- `/create-component` - Create a new React component
- `/optimize-performance` - Find and implement performance improvements

## Frontend Developer Agent

The `frontend-developer` agent is configured with expertise in:
- React & TypeScript
- Modern web development practices
- Performance optimization
- Accessibility
- Build tooling (Vite)

## Project Context

This is a React + TypeScript + Vite project for an AI content platform featuring:
- Google Generative AI integration
- Canvas and PDF generation
- Netlify deployment
- Modern React patterns and hooks

## Customization

Feel free to:
- Add new commands in `.claude/commands/`
- Modify agent instructions in `.claude/agents/`
- Update settings in `.claude/settings.json`
- Add hooks for automation in `.claude/hooks/`

## Usage Tips

1. **Ask for help**: Claude understands the project context
2. **Use commands**: Quick access to common tasks
3. **Code reviews**: Regular reviews maintain quality
4. **Performance**: Monitor and optimize bundle size
5. **Type safety**: Leverage TypeScript for better code

## Learn More

- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Vite Documentation](https://vitejs.dev)
