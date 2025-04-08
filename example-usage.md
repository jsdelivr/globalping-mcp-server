# Example Usage

This document provides examples of how to use the Globalping MCP server with different AI assistants and MCP clients.

## Using with Claude

Claude can interact with the Globalping MCP server in several ways:

### Direct Connection (Claude Web)

```
Please connect to my Globalping MCP server at https://your-worker-url.workers.dev/sse.
```

After connecting, you can ask Claude to run measurements:

```
Can you ping example.com from 3 locations in Europe and tell me if there are any packet loss issues?
```

```
Please run a traceroute to cloudflare.com from datacenters in Asia and summarize the network path.
```

```
Compare the HTTP response times between github.com and gitlab.com from both eyeball networks and datacenter networks.
```

### Claude Desktop

For Claude Desktop, add the following to your Claude configuration file (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "globalping": {
      "command": "npx",
      "args": ["mcp-remote", "https://your-worker-url.workers.dev/sse"]
    }
  }
}
```

After restarting Claude, you'll be presented with an authorization screen. Once authorized, you can use the tools directly.

## Using with ChatGPT

ChatGPT can also interact with MCP servers. With an appropriate plugin or via the browse capability, you can ask it to connect to your MCP server.

## Advanced Examples

Here are some advanced examples of what you can do with the Globalping MCP server:

### Global DNS Consistency Check

```
Using the dns tool, can you check if the DNS resolution for netflix.com is consistent across 
different regions of the world? Test from North America, Europe, and Asia, and let me know 
if you find any differences in the resolved IP addresses.
```

### Website Performance Comparison

```
I want to compare the performance of two CDN providers. Can you:
1. Run HTTP measurements for cdn.jsdelivr.net and cdnjs.cloudflare.com
2. Test from 5 different global locations
3. Compare the response times
4. Tell me which one is faster on average and by how much
```

### Network Path Analysis

```
I'm experiencing connectivity issues to my server in Singapore. Can you run traceroute 
measurements from several locations in Asia to my-server.example.com and identify if there 
are any common hops where packet loss occurs?
```

### Multi-Step Analysis

```
I need to debug a connectivity issue. Can you:
1. First run a ping test to api.example.com from multiple locations
2. If any location shows packet loss, run a traceroute from those specific locations
3. Check if the DNS resolution is consistent across all tested locations
4. Based on all the data, tell me what might be causing the issue and suggest next steps
```

### ISP Performance Comparison

```
I want to compare internet performance between different ISPs. Can you run ping and 
HTTP measurements to google.com from probes on Comcast, Verizon, and AT&T networks 
in the US? Then create a summary table showing the average ping time and HTTP response 
time for each ISP.
```

### Global Reachability Test

```
I'm planning to deploy a new service globally. Can you test if my test endpoint 
at test.example.com is reachable from all continents? Run ping tests from probes 
in North America, South America, Europe, Asia, Africa, and Oceania, and let me know 
if there are any regions where the service is unreachable or has high latency.
```

## Providing a Globalping API Token

To use your own Globalping API token (higher rate limits):

1. Get a token from [dash.globalping.io/tokens](https://dash.globalping.io/tokens)
2. When prompted during the authorization flow, enter your token
3. The token will be used for all subsequent measurements in that session

## Understanding Location Specifications

The location parameter accepts flexible formats:

### Geographic Locations
- Continents: "Europe", "North America", "Asia"
- Regions: "Western Europe", "Northern America", "Southeast Asia"
- Countries: "Germany", "US", "Japan" (names or ISO codes)
- US States: "California", "New York", "Texas"
- Cities: "London", "Tokyo", "New York"

### Network Locations
- ASNs: "AS13335" (Cloudflare), "AS15169" (Google)
- Network names: "Comcast", "Deutsche Telekom", "Orange"

### Cloud Regions
- AWS Regions: "aws-us-east-1", "aws-eu-west-1"
- Google Cloud Regions: "gcp-us-central1", "gcp-europe-west1"

### Network Types
- "datacenter-network" (generally more reliable)
- "eyeball-network" (end-user networks, more representative of real users)

### Combinations
You can combine criteria with "+" for more specific targeting:
- "Germany+Deutsche Telekom"
- "California+Comcast"
- "datacenter-network+Europe"

## Best Practices

1. **Start small**: Begin with a small number of probes (3-5) to avoid hitting rate limits
2. **Be specific**: Use specific locations rather than broad regions when possible
3. **Add context**: When asking AI to analyze results, provide context about what you're looking for
4. **Compare wisely**: When comparing targets, use the `compareTargets` tool for better analysis
5. **Authenticate**: If you need to run many measurements, get a Globalping API token
