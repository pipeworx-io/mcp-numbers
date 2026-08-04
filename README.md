# mcp-numbers

Number utilities MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `convert_base` | Convert an integer between numeral bases 2-36 (keyless, offline). E.g. number "ff" from_base 16 to_base 2 -> "11111111". |
| `to_roman` | Convert an integer (1-3999) to Roman numerals. |
| `from_roman` | Convert a Roman numeral to an integer (rejects malformed numerals). |
| `number_to_words` | Spell an integer in English words, e.g. 1234 -> "one thousand two hundred thirty-four". |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "numbers": {
      "url": "https://gateway.pipeworx.io/numbers/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Numbers data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
