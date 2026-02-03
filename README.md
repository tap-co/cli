# @tap-co/cli

Advertising infrastructure for AI agents. Search inventory, generate media plans, create ad creatives, and manage campaigns programmatically.

## Install

```bash
npm install -g @tap-co/cli
```

## Authentication

```bash
# Non-interactive (recommended for agents)
tap auth login -k <api-key>

# Or set environment variable
export TAP_API_KEY=<api-key>

# Verify
tap auth status
```

## Commands

All commands support `--json` for structured output. Use this for agent workflows.

### search — Query inventory

```bash
# All available platforms
tap search --json

# Filter by market, format, budget
tap search --market "New York" --format radio --budget 50 --json

# Filter by audience
tap search --audience "25-54" --json
```

### plan — Generate media plans

```bash
# Generate optimized plan
tap plan --budget 50000 --json

# With targeting
tap plan --budget 100000 --goal awareness --audience "25-54" --json

# Multi-market
tap plan --budget 75000 --markets "New York,Los Angeles" --json
```

### creative — Generate ad assets

```bash
# Display ads
tap creative generate --type display --prompt "Summer sale" --sizes "300x250,728x90" --json

# Audio ads
tap creative generate --type audio --prompt "B2B software ad" --duration 30s --json

# Video ads
tap creative generate --type video --prompt "Product launch" --duration 15s --json

# Get platform specs
tap creative specs <platform-id>
```

### campaigns — Manage campaigns

```bash
# List campaigns
tap campaigns list --json
tap campaigns list --status active --json

# Get campaign details
tap campaigns get <campaign-id> --json

# Create from plan (pipe)
tap plan --budget 25000 --json | tap campaigns create --from-stdin

# Create directly
tap campaigns create --name "Q1 Campaign" --budget 50000
```

## Agent patterns

```bash
# Search → filter with jq
tap search --market NYC --json | jq '.platforms[] | select(.cpm < 20)'

# Plan → create campaign
tap plan --budget 25000 --goal awareness --json | tap campaigns create --from-stdin

# Generate creative for specific platform
SPECS=$(tap creative specs <platform-id>)
tap creative generate --type audio --prompt "..." --duration 30s --json
```

## Environment

| Variable | Description |
|----------|-------------|
| `TAP_API_KEY` | API key (alternative to `tap auth login`) |
| `TAP_API_URL` | API base URL (default: `https://sdk.tap.co/v1`) |

## Docs

- [API Reference](https://docs.tap.co/api)
- [CLI Guide](https://docs.tap.co/cli)
