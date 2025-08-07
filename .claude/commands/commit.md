# Git

When committing changes, use this format:

```
<type>(<scope>): <subject>

Tasks: #<id>.<slug>, #<id>.<slug>
Features: #<id>.<slug>, #<id>.<slug>

<body>
```

## Rules:

**Type** (required): `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `style`, `build`, `ci`, `chore`

**Scope** (optional): Component affected (e.g., `tasks`, `mcp`, `cli`, `refactoring`, `docs`, `ollama`)

**Subject** (required): 
- Imperative mood ("add" not "added")
- No capitalization, no period
- Max 50 characters

**Tasks**: Reference completed tasks using `#id.slug` format from task filenames
- Only include tasks marked as "Done"

**Features**: Reference parent/epic tasks using `#id.slug` format

**Body**: Explain why and what changed (wrap at 72 chars)

## Example:

```
feat(task-manager): add support for task dependencies

Tasks: #018d3f5a7b20.implement-dependencies, #018d3f5b8c30.add-circular-detection
Features: #018d3f4a1b10.task-dependency-management

- Implemented dependency validation in task creation
- Added circular dependency detection
- Updated task prioritization algorithm
```

Now create a commit following this format with the current changes. If a task or spec was completed, mark it as done and include that in the commit. 
