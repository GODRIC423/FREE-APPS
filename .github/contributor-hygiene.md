# Contributor hygiene

This repository keeps GitHub contributors readable through a shared contributor policy.

## Canonical contributor buckets

| Contributor | Use for | Canonical identity |
|---|---|---|
| Brian Hackett | Manual/human entries | `Brian Hackett <brian.hackett423@gmail.com>` |
| Hermes Agent (Local) | Local Hermes/Godric automation | `Hermes Agent (Local) <hermes-local@adeul.local>` |
| Hermes Agent (VPS) | VPS Hermes automation | `Hermes Agent (VPS) <hermes-vps@adeul.local>` |
| Claude Code | Claude Code authored work | `Claude Code <noreply@anthropic.com>` |

Bots stay explicit (`github-actions[bot]`, `cloudflare-workers-and-pages[bot]`, `dependabot[bot]`).

## Rules

1. Do not rewrite repository history just to clean old author names.
2. Add or update `.mailmap` when an old/alternate identity appears.
3. New automation should set `git config user.name` and `git config user.email` before committing.
4. Pull requests and pushes run `.github/workflows/contributor-hygiene.yml`; unknown identities should be mapped or fixed before merge.

## Local setup snippets

```bash
# Human/manual commits
git config user.name "Brian Hackett"
git config user.email "brian.hackett423@gmail.com"

# Hermes on the VPS
git config user.name "Hermes Agent (VPS)"
git config user.email "hermes-vps@adeul.local"

# Hermes local/Godric workstation
git config user.name "Hermes Agent (Local)"
git config user.email "hermes-local@adeul.local"

# Claude Code
git config user.name "Claude Code"
git config user.email "noreply@anthropic.com"
```

## Audit locally

```bash
git shortlog -sne --all --mailmap
git log --all --format='%aN <%aE>%n%cN <%cE>' | sort -u
```
