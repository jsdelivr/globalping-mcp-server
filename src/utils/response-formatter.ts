/**
 * Utility functions for formatting responses to MCP clients
 */

/**
 * Format response data as a rich text markdown response
 * @param title The title of the response
 * @param content The content to format
 * @returns Formatted MCP response
 */
export function formatMarkdownResponse(title: string, content: string): any {
  return {
    content: [
      {
        type: 'text',
        text: `# ${title}\n\n${content}`
      }
    ]
  };
}

/**
 * Format an error response
 * @param errorMessage The error message
 * @returns Formatted MCP error response
 */
export function formatErrorResponse(errorMessage: string): any {
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${errorMessage}`
      }
    ]
  };
}

/**
 * Format a table from an array of objects
 * @param data Array of objects to format as a table
 * @param columns Column definitions
 * @returns Markdown table string
 */
export function formatTable(
  data: Record<string, any>[],
  columns: { key: string; header: string }[]
): string {
  if (!data || data.length === 0) {
    return 'No data available';
  }

  // Create the header row
  let table = '| ' + columns.map(col => col.header).join(' | ') + ' |\n';
  
  // Create the separator row
  table += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
  
  // Create data rows
  data.forEach(row => {
    table += '| ' + columns.map(col => {
      const value = row[col.key];
      return value === undefined || value === null ? 'N/A' : String(value);
    }).join(' | ') + ' |\n';
  });
  
  return table;
}

/**
 * Format a JSON object as a collapsible section
 * @param title The title of the section
 * @param data The data to format
 * @returns Markdown string with collapsible section
 */
export function formatCollapsibleSection(title: string, data: any): string {
  return `<details>
<summary>${title}</summary>

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

</details>
`;
}

/**
 * Format a code block
 * @param content The content to format
 * @param language The language of the code
 * @returns Markdown code block
 */
export function formatCodeBlock(content: string, language = 'json'): string {
  return `\`\`\`${language}
${content}
\`\`\``;
}

/**
 * Format a measurement summary for use in a comparison
 * @param type Measurement type
 * @param data Measurement data
 * @returns Formatted summary string
 */
export function formatMeasurementSummary(type: string, data: any): string {
  switch (type) {
    case 'ping':
      return `Average RTT: ${data.avgRtt?.toFixed(2) ?? 'N/A'} ms, Packet Loss: ${data.avgPacketLoss?.toFixed(2) ?? 'N/A'}%`;
    case 'http':
      return `Average Response Time: ${data.avgResponseTime?.toFixed(2) ?? 'N/A'} ms, Success Rate: ${((data.successRate ?? 0) * 100).toFixed(2)}%`;
    case 'traceroute':
    case 'mtr':
      return `Average Hop Count: ${data.avgHopCount?.toFixed(2) ?? 'N/A'}`;
    case 'dns':
      return `Average Query Time: ${data.avgQueryTime?.toFixed(2) ?? 'N/A'} ms, Success Rate: ${((data.successRate ?? 0) * 100).toFixed(2)}%`;
    default:
      return 'No summary available';
  }
}
