# Seal ANY agent's decisions in one line (the "witness" recipe)

ZéroJour seals its own steps into a NoireBox journal — but sealing is **not** ZéroJour-specific.
NoireBox ships a standard MCP server (`noirebox.mcp_server`, stdio JSON-RPC), so **any** MCP-capable
agent — yours, ours, anyone's — can mount it and get the same tamper-evident trail:
hash-chained events, Ed25519 signatures, RFC 3161 timestamps, signed attestation.

This is an open invitation to every #sanitychallenge participant: **seal your own submission**.
Nobody should take our word for what their agent did — including us.

## What the agent gains (4 tools)

| Tool | Effect |
| --- | --- |
| `noirebox_log_event` | Appends a signed event (decision, tool call, answer) to the journal |
| `noirebox_verify` | Verifies the whole chain (order, links, signatures) |
| `noirebox_attestation` | Signed snapshot of the journal state |
| `noirebox_scan` | Injection guardrail on prompts/transcripts, incidents logged too |

## The one-block setup (any MCP client)

```bash
pip install noirebox
export NOIREBOX_DB=~/noirebox.db   # your journal lives there
```

MCP client config (Claude Code, Cursor, any stdio MCP host):

```json
{
  "mcpServers": {
    "noirebox": {
      "command": "python3",
      "args": ["-m", "noirebox.mcp_server"],
      "env": { "NOIREBOX_DB": "/absolute/path/to/noirebox.db" }
    }
  }
}
```

Then tell your agent once: *"Before each decision, seal it with noirebox_log_event; on demand,
prove integrity with noirebox_verify."* That's the whole integration.

## What "tamper-evident" buys you

Edit one sealed answer after the fact — the chain breaks. Verify returns the first broken link.
The dashboard (`noirebox serve` → `http://127.0.0.1:8768/dashboard`) shows the journal live.

Zero-grade rule we hold ourselves to: the agent that cannot produce a proof must not claim one.
