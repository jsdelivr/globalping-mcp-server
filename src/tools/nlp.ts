/**
 * Globalping MCP Server - Natural Language Processing
 * 
 * This module provides functionality to process natural language queries
 * and determine the appropriate Globalping measurements to run.
 * 
 * It analyzes user input to extract:
 * - Measurement type(s) to run (ping, traceroute, dns, mtr, http)
 * - Target(s) to measure (domains or IP addresses)
 * - Location constraints (continents, countries, networks)
 * - Other measurement options specific to each type
 * 
 * This allows the Globalping MCP server to handle general queries like:
 * - "What is the latency to google.com in Europe?"
 * - "Which site is faster, google.com or bing.com?"
 * - "How does the domain cdn.jsdelivr.net resolve in USA?"
 * 
 * SUPPORTED MEASUREMENT TYPES:
 * - ping: ICMP/TCP ping test for basic latency/connectivity checks
 * - traceroute: Network route tracing to see the path packets take
 * - dns: DNS resolution tests to check how domains resolve
 * - mtr: My Traceroute (combined ping and traceroute) for detailed path analysis
 * - http: HTTP/HTTPS requests to test website performance
 * 
 * SUPPORTED LOCATION SPECIFICATIONS:
 * - Continents: "Europe", "Asia", "North America", etc.
 * - Countries: "USA", "Germany", "Japan", etc.
 * - Networks: Currently limited support - planned for future expansion
 * 
 * IMPLEMENTATION NOTES:
 * When no specific location is provided, the tool defaults to a diverse global selection.
 * When a comparative query is detected, the tool will run the same measurement type for all targets.
 */

import { MeasurementType, MeasurementRequest, LocationSpecification } from './types.js';

/**
 * Interface for a parsed query
 */
export interface ParsedQuery {
    type: QueryType;
    measurements: {
        type: MeasurementType;
        target: string;
        locations?: LocationSpecification[];
        options?: Record<string, any>;
    }[];
}

/**
 * The type of query being processed
 */
export enum QueryType {
    SINGLE = 'single',      // Single measurement (e.g., "Ping google.com")
    COMPARATIVE = 'comparative', // Compare multiple targets (e.g., "Which is faster, A or B?")
    ANALYTICAL = 'analytical'    // Analyze results (e.g., "How does X resolve in Y?")
}

/**
 * Patterns to identify measurement types from natural language
 * These patterns help determine which Globalping measurement type is most appropriate
 * for a given query based on the terms and phrases used.
 */
const MEASUREMENT_PATTERNS = {
    ping: [
        /latency/i,
        /ping/i,
        /response time/i,
        /reachable/i,
        /round-?trip/i,
    ],
    traceroute: [
        /traceroute/i,
        /trace route/i,
        /network path/i,
        /route to/i,
        /hops/i,
        /path to/i,
    ],
    dns: [
        /dns/i,
        /resolve/i,
        /lookup/i,
        /name server/i,
        /record/i,
        /domain/i,
    ],
    mtr: [
        /mtr/i,
        /my traceroute/i,
        /comprehensive/i,
        /detailed path/i,
        /path analysis/i,
    ],
    http: [
        /http/i,
        /https/i,
        /website/i,
        /web/i,
        /performance/i,
        /fast/i,
        /faster/i,
        /speed/i,
        /load/i,
        /request/i,
    ]
};

/**
 * Patterns to identify comparative queries
 */
const COMPARATIVE_PATTERNS = [
    /which (one|site|domain|address|target|host) is (better|faster|quicker|slower)/i,
    /compare/i,
    /(faster|slower|better|worse) (than|between)/i,
    /difference between/i,
    /vs\.?/i,
    /versus/i,
    /or/i
];

/**
 * Patterns to identify locations
 */
const LOCATION_PATTERNS = {
    continent: {
        'africa': 'AF' as const,
        'antarctica': 'AN' as const,
        'asia': 'AS' as const,
        'europe': 'EU' as const,
        'north america': 'NA' as const,
        'oceania': 'OC' as const,
        'south america': 'SA' as const
    },
    country: {
        'usa': 'US',
        'united states': 'US',
        'uk': 'GB',
        'united kingdom': 'GB',
        'england': 'GB',
        'australia': 'AU',
        'canada': 'CA',
        'germany': 'DE',
        'france': 'FR',
        'japan': 'JP',
        'china': 'CN',
        'india': 'IN',
        'brazil': 'BR',
        'russia': 'RU',
        'italy': 'IT',
        'spain': 'ES'
        // Add more as needed
    }
};

/**
 * Extracts targets from a query string
 * 
 * Uses regular expressions to identify domain names and IP addresses (v4 and v6)
 * within the natural language query. This is a critical function as targets are
 * required for all Globalping measurements.
 * 
 * @param query - The natural language query
 * @returns Array of target hostnames/IPs extracted
 */
function extractTargets(query: string): string[] {
    // Extract domains using a comprehensive regex pattern
    const domainPattern = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b/gi;
    const ipv4Pattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    const ipv6Pattern = /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi;
    
    const domains = query.match(domainPattern) || [];
    const ipv4s = query.match(ipv4Pattern) || [];
    const ipv6s = query.match(ipv6Pattern) || [];
    
    // Combine all results and remove duplicates
    return [...new Set([...domains, ...ipv4s, ...ipv6s])];
}

/**
 * Determines the most likely measurement type for a query
 * 
 * @param query - The natural language query
 * @returns The most likely measurement type for the query
 */
function determineMeasurementType(query: string): MeasurementType {
    // Create a map to store the score for each measurement type
    const scores: Record<MeasurementType, number> = {
        ping: 0,
        traceroute: 0,
        dns: 0,
        mtr: 0,
        http: 0
    };

    // Calculate scores based on pattern matches
    for (const [type, patterns] of Object.entries(MEASUREMENT_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(query)) {
                scores[type as MeasurementType] += 1;
            }
        }
    }

    // Special case: if the query is about speed/performance of a website with no other context,
    // prefer HTTP as it gives more relevant performance data
    if (/(speed|performance|fast|faster|slow|slower)/i.test(query) && 
        /(site|website|web|page|load)/i.test(query)) {
        scores.http += 2;
    }

    // Special case: if query is about how a domain resolves, prefer DNS
    if (/how does .+ resolve/i.test(query)) {
        scores.dns += 3;
    }

    // Return the type with the highest score, defaulting to ping if no matches
    let maxScore = 0;
    let bestType: MeasurementType = 'ping'; // Default to ping

    for (const [type, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestType = type as MeasurementType;
        }
    }

    return bestType;
}

/**
 * Determines if a query is comparing multiple targets
 * 
 * @param query - The natural language query
 * @returns Boolean indicating if it's a comparative query
 */
function isComparativeQuery(query: string): boolean {
    // Check if the query matches any comparative patterns
    for (const pattern of COMPARATIVE_PATTERNS) {
        if (pattern.test(query)) {
            return true;
        }
    }
    
    // Also check if there are multiple targets in the query and certain keywords
    const targets = extractTargets(query);
    if (targets.length >= 2 && /compare|versus|which/i.test(query)) {
        return true;
    }
    
    return false;
}

/**
 * Extracts location information from a query
 * 
 * @param query - The natural language query
 * @returns Array of location specifications
 */
function extractLocations(query: string): LocationSpecification[] {
    const locations: LocationSpecification[] = [];
    
    // Check for continent mentions
    for (const [name, code] of Object.entries(LOCATION_PATTERNS.continent)) {
        if (new RegExp(`\\b${name}\\b`, 'i').test(query)) {
            locations.push({ continent: code });
        }
    }
    
    // Check for country mentions
    for (const [name, code] of Object.entries(LOCATION_PATTERNS.country)) {
        if (new RegExp(`\\b${name}\\b`, 'i').test(query)) {
            locations.push({ country: code });
        }
    }
    
    // If no specific locations found, check for general location indicators
    if (locations.length === 0) {
        // Check for "globally" or similar terms
        if (/\b(global(ly)?|worldwide|world\s?wide|everywhere)\b/i.test(query)) {
            // For global measurements, we can use a mix of continents with limits
            return [
                { continent: 'NA', limit: 1 },
                { continent: 'EU', limit: 1 },
                { continent: 'AS', limit: 1 }
            ];
        }
    }
    
    return locations;
}

/**
 * Process a natural language query into structured measurement requests
 * 
 * This is the main entry point for the NLP module. It takes a natural language
 * query and returns a structured object with all the information needed to run
 * the appropriate Globalping measurement(s).
 * 
 * The function performs these steps:
 * 1. Extract targets (domains/IPs) from the query
 * 2. Determine if it's a comparative query (comparing multiple targets)
 * 3. Select the most appropriate measurement type based on query semantics
 * 4. Extract location constraints if specified
 * 5. Detect measurement-specific options (e.g., DNS record types)
 * 
 * @param query - The natural language query string
 * @returns The parsed query object with measurement details
 * @throws Error if no valid targets are found in the query
 */
export function processNaturalLanguageQuery(query: string): ParsedQuery {
    // Extract targets from the query
    const targets = extractTargets(query);
    
    if (targets.length === 0) {
        throw new Error("No valid targets (domains or IP addresses) found in the query");
    }
    
    // Determine if this is a comparative query
    const isComparative = isComparativeQuery(query);
    
    // Determine measurement type based on the query
    const measurementType = determineMeasurementType(query);
    
    // Extract location constraints
    const locations = extractLocations(query);
    
    // Special options based on measurement type
    const options: Record<string, any> = {};
    
    // For DNS, detect record types
    if (measurementType === 'dns') {
        if (/mx\s+record/i.test(query)) {
            options.queryType = 'MX';
        } else if (/a\s+record/i.test(query)) {
            options.queryType = 'A';
        } else if (/aaaa\s+record/i.test(query)) {
            options.queryType = 'AAAA';
        } else if (/txt\s+record/i.test(query)) {
            options.queryType = 'TXT';
        } else if (/ns\s+record/i.test(query)) {
            options.queryType = 'NS';
        }
        // Note: Other supported DNS types are CNAME, PTR, SOA, SRV
        // but they're less commonly requested in natural language
    }
    
    // Create measurement objects for each target
    const measurements = targets.map(target => ({
        type: measurementType,
        target,
        locations: locations.length > 0 ? locations : undefined,
        options: Object.keys(options).length > 0 ? options : {}
    }));
    
    return {
        type: isComparative ? QueryType.COMPARATIVE : QueryType.SINGLE,
        measurements
    };
}
