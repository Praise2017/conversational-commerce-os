# Workflow Sandbox Design

## Runtime Options
- V8 isolate via `isolated-vm` (JS only, fast startup)
- WebAssembly (WASI) for polyglot & stricter isolation (Rust/Go/AssemblyScript)

## Security Model
- No network by default; only whitelisted RPC to host (`sdk`)
- Timeouts: 200ms per invocation (configurable), hard wall-clock
- Memory cap: 64MB per execution
- CPU metering: interrupt on long loops
- Deterministic I/O: JSON only in/out
- Secrets: accessed by handle (no raw values in code)

## API Surface (`sdk`)
- `sdk.vars.get(key)` / `sdk.vars.set(key, value)`
- `sdk.kv.get(key)` / `sdk.kv.put(key, value, {ttl})`
- `sdk.logger.info/warn/error(obj)`
- `sdk.http.fetch(url, opts)` (disabled by default)
- `sdk.now()`

## Execution Contract
- Input: `{ contact, message, vars, workspace, env }`
- Output: `{ vars?: object, next?: string, emits?: Array<{ topic: string, payload: any }> }`
- Error handling: capture stack, truncate payloads, surface as node failure event

## Example Code Block (JS)
```js
export function main({ contact, message, vars, workspace }) {
  const vip = (contact.tags || []).includes('vip');
  const greeting = vip ? `Hello VIP ${contact.displayName}` : `Hello ${contact.displayName}`;
  return { vars: { ...vars, greeting }, next: 'n2' };
}
```

## Sandboxing Flow
1. Compile/validate code upon publish
2. On event, hydrate `ctx`, run in isolate with limits
3. Persist logs and metrics per node execution (OTEL spans)
4. If `next` missing, workflow terminates; else continue to `next`
