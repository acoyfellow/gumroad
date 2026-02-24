# Reference

## CLI Commands

### Global Options

| Option          | Description  |
| --------------- | ------------ |
| `--help, -h`    | Show help    |
| `--version, -v` | Show version |

### Auth Commands

```
gr auth login <token>   Save API token
gr auth logout          Remove saved token
gr auth status          Check login status
```

### User Commands

```
gr user                 Get current user info
```

### Product Commands

```
gr products list        List all products
gr products get <id>   Get product by ID
```

### Sales Commands

```
gr sales list           List all sales
gr sales get <id>     Get sale by ID
```

### Subscriber Commands

```
gr subscribers list     List all subscribers
gr subscribers get <id> Get subscriber by ID
```

### License Commands

```
gr licenses verify <key>    Verify license key
gr licenses list            List all licenses
```

## Environment

| Variable | Description                  |
| -------- | ---------------------------- |
| `HOME`   | Used for `~/.gr-config.json` |

## Exit Codes

| Code | Description                              |
| ---- | ---------------------------------------- |
| 0    | Success                                  |
| 1    | Error (invalid command, API error, etc.) |

## Output Format

All commands output JSON by default for easy parsing by AI agents.
