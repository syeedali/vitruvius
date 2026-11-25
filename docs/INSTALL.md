# Install

Vitruvius is a set of skills, agent roles, and validators. Install it into the
coding-agent host you already use, restart the host, and start a session with a
command such as `/engineering-research`.

## Fast install

### Any Agent Skills host

```bash
npx skills add adeerkhan/vitruvius
```

This installs the skills bundle and shared references.

### OpenCode

```bash
npx @adeerkhan/vitruvius --target . --host opencode
```

For a checkout, render every host adapter first:

```bash
git clone https://github.com/adeerkhan/vitruvius
cd vitruvius
node installer/install.mjs --target . --all
```

### Other hosts

| Host | Command |
| --- | --- |
| Claude Code | `npx skills add adeerkhan/vitruvius` |
| Cursor | `npx @adeerkhan/vitruvius --host cursor` |
| Codex | `npx skills add adeerkhan/vitruvius --agent codex` |
| Command Code | `npx @adeerkhan/vitruvius --host commandcode` |
| Pi | `pi install git:github.com/adeerkhan/vitruvius` |

The installer also renders Cline, Qoder, Windsurf, and global Agent Skills
bundles. See [installer/README.md](../installer/README.md) for the full host
matrix and environment overrides.

## Global install

Install the skills bundle into every supported host's global config root:

```bash
npx @adeerkhan/vitruvius --global --all
```

Or choose hosts explicitly:

```bash
npx @adeerkhan/vitruvius --global --host claude --host opencode --host codex
```

## Permissions

Research skills write artifacts. The host must allow file writes inside the
active project, normally under `outputs/`, `.runs/`, and the project's source
tree when you explicitly ask for code changes. Network access is optional but
needed for external sources.

See [notes/permissions.md](../notes/permissions.md) for host-specific settings.

## Verify the install

1. Restart the host; skill catalogs are built at startup.
2. Run `/vitruvius-help` or ask the host to list its skills.
3. Start a small run:

```text
/engineering-research "What does the repository say about retry behavior?"
```

4. Open the generated brief and provenance sidecar. Confirm the source anchors
   resolve before relying on the answer.

## Manual install

Copy `skills/` and `references/` into the host's skills directory while
preserving repository-relative paths. The proposal skill is self-contained;
the standalone artifact reader and Habit CLI need the helper scripts named in
their own documentation.

Manual copies do not receive generated host adapters. Prefer the installer when
the host has one.

## Uninstall

| Host | Remove |
| --- | --- |
| Claude Code | `~/.claude/skills/vitruvius` |
| Cursor | `~/.cursor/skills/vitruvius` or the project's `.cursor/` render |
| Codex | `~/.codex/skills/vitruvius` or the project's `.codex/` render |
| Command Code | `cmd skills remove vitruvius` and `cmd mods remove vitruvius` |
| OpenCode | the project's `.opencode/` render, plugin entry, or checkout |
| Pi | `pi uninstall vitruvius` |

Research outputs and Habit data are project-local. Remove `outputs/` only when
you intend to delete the run records as well.
