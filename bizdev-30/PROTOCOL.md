# BizDev Console Bus — postMessage protocol v1

The Console Deck (`apps/00-console-deck/`) loads any of the 30 apps into an iframe ("the bay") and provides shared services ("connectors"). Apps remain fully standalone when opened directly; when loaded inside the console they link to it over `window.postMessage` (works from both `file://` and `http://`, no same-origin DOM access required).

## Messages

App → console (via `window.parent.postMessage(msg, '*')`):

| message | when |
| --- | --- |
| `{ bizdev: 'ready', v: 1, slug: '<slug>' }` | on mount, if `window.parent !== window` |
| `{ bizdev: 'toast', v: 1, text: string }` | optional: surface a note in the console chrome |

Console → app (via `iframe.contentWindow.postMessage(msg, '*')`):

| message | when |
| --- | --- |
| `{ bizdev: 'context', v: 1, connectors: Connectors }` | after `ready`, and again whenever connector config changes |

## Connectors payload

```ts
type Connectors = {
  claude:  { status: Status; userName: string; company: string; voiceNotes: string };
  profile: { status: Status; company: string; offer: string; icp: string; pricingAnchor: string };
  roster:  { status: Status; accounts: Array<{ name: string; segment?: string; notes?: string }> };
  email:   { status: Status; mode: 'mailto' | 'gmail-web' };
  calendar:{ status: Status; enabled: boolean };
  exportHub:{ status: Status; filenamePrefix: string };
};
type Status = 'connected' | 'needs-setup' | 'attention';
```

## App-side contract (the retrofit)

1. On mount, if framed, send `ready` and listen for `context`; store the payload in state.
2. When context is present: show a small "Console linked" indicator, and prepend a context header block (profile + Claude voice) to every Claude Copilot prompt the app generates. If `roster.accounts` is non-empty, apps with prospect/account inputs may offer "Pull from console roster".
3. Never require the console: with no context message, behave exactly as standalone.
4. Ignore messages whose `bizdev` field or `v` you don't recognize. Never eval or inject received strings into HTML — treat all payload fields as plain text (React text rendering).
