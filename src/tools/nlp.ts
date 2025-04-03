import { MeasurementType, Location } from '../globalping/types.js';

// Constants for NLP pattern matching
const DOMAIN_REGEX = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b/gi;
const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
const IPV6_REGEX = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|\b(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}\b|\b(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}\b|\b(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}\b|\b[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}\b|\b:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)\b/g;

// Patterns for comparative queries
const COMPARATIVE_PATTERNS = [
    /which (is|are) (faster|slower|better|quicker)/i,
    /compare .+ (with|to|against|vs\.?|versus)/i,
    /difference between .+ and .+/i,
    /how do .+ and .+ compare/i
];

// Continent and country code types for proper typing
type ContinentCode = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';
type CountryCode = string; // Using string for simplicity, but could be enumerated

/**
 * Enhanced location patterns for better location detection
 * Includes continents, countries, regions, and special location types
 */
const LOCATION_PATTERNS: {
    continent: Record<string, ContinentCode>;
    country: Record<string, CountryCode>;
    region: Record<string, { country?: string; region: string }>;
    special: Record<string, { tags: string[] }>;
} = {
    continent: {
        'africa': 'AF',
        'antarctica': 'AN',
        'asia': 'AS',
        'europe': 'EU',
        'north america': 'NA',
        'oceania': 'OC',
        'australia': 'OC', // Common alternative name
        'south america': 'SA'
    },
    country: {
        'united states': 'US',
        'usa': 'US',
        'us': 'US',
        'united kingdom': 'GB',
        'uk': 'GB',
        'great britain': 'GB',
        'canada': 'CA',
        'germany': 'DE',
        'france': 'FR',
        'japan': 'JP',
        'china': 'CN',
        'india': 'IN',
        'brazil': 'BR',
        'australia': 'AU',
        'russia': 'RU',
        'singapore': 'SG',
        'hong kong': 'HK',
        'italy': 'IT',
        'spain': 'ES',
        'mexico': 'MX',
        'netherlands': 'NL',
        'holland': 'NL',
        'south korea': 'KR',
        'korea': 'KR',
        'sweden': 'SE',
        'switzerland': 'CH',
        'poland': 'PL',
        'belgium': 'BE',
        'norway': 'NO',
        'denmark': 'DK',
        'finland': 'FI',
        'ireland': 'IE',
        'south africa': 'ZA',
        'israel': 'IL',
        'turkey': 'TR',
        'new zealand': 'NZ',
        'argentina': 'AR',
        'chile': 'CL',
        'thailand': 'TH',
        'malaysia': 'MY',
        'indonesia': 'ID',
        'philippines': 'PH',
        'vietnam': 'VN',
        'portugal': 'PT',
        'greece': 'GR',
        'austria': 'AT',
        'uae': 'AE',
        'united arab emirates': 'AE',
        'saudi arabia': 'SA',
        'taiwan': 'TW'
    },
    region: {
        'eastern us': { country: 'US', region: 'Eastern US' },
        'western us': { country: 'US', region: 'Western US' },
        'northern us': { country: 'US', region: 'Northern US' },
        'southern us': { country: 'US', region: 'Southern US' },
        'central us': { country: 'US', region: 'Central US' },
        'midwest us': { country: 'US', region: 'Central US' },
        'northeast us': { country: 'US', region: 'Eastern US' },
        'northwest us': { country: 'US', region: 'Western US' },
        'southeast us': { country: 'US', region: 'Eastern US' },
        'southwest us': { country: 'US', region: 'Western US' },
        'west coast': { country: 'US', region: 'Western US' },
        'east coast': { country: 'US', region: 'Eastern US' },
        'west europe': { region: 'Western Europe' },
        'east europe': { region: 'Eastern Europe' },
        'north europe': { region: 'Northern Europe' },
        'south europe': { region: 'Southern Europe' },
        'central europe': { region: 'Central Europe' },
        'scandinavia': { region: 'Northern Europe' },
        'eastern asia': { region: 'Eastern Asia' },
        'southeast asia': { region: 'South-Eastern Asia' },
        'south asia': { region: 'Southern Asia' },
        'central asia': { region: 'Central Asia' },
        'western asia': { region: 'Western Asia' },
        'middle east': { region: 'Western Asia' },
        'latin america': { region: 'Latin America and the Caribbean' },
        'caribbean': { region: 'Latin America and the Caribbean' }
    },
    special: {
        'datacenter': { tags: ['datacenter'] },
        'datacenters': { tags: ['datacenter'] },
        'data center': { tags: ['datacenter'] },
        'data centers': { tags: ['datacenter'] },
        'cloud': { tags: ['datacenter'] },
        'cloud provider': { tags: ['datacenter'] },
        'cloud providers': { tags: ['datacenter'] },
        'aws': { tags: ['datacenter', 'aws'] },
        'amazon': { tags: ['datacenter', 'aws'] },
        'amazon web services': { tags: ['datacenter', 'aws'] },
        'azure': { tags: ['datacenter', 'azure'] },
        'microsoft': { tags: ['datacenter', 'azure'] },
        'gcp': { tags: ['datacenter', 'gcp'] },
        'google cloud': { tags: ['datacenter', 'gcp'] },
        'residential': { tags: ['residential'] },
        'homes': { tags: ['residential'] },
        'residential networks': { tags: ['residential'] },
        'home networks': { tags: ['residential'] },
        'mobile': { tags: ['mobile'] },
        'cellular': { tags: ['mobile'] },
        'mobile networks': { tags: ['mobile'] },
        'cellular networks': { tags: ['mobile'] },
        'backbone': { tags: ['backbone'] },
        'transit': { tags: ['backbone'] },
        'backbone networks': { tags: ['backbone'] },
        'broadband': { tags: ['broadband'] },
        'isps': { tags: ['broadband'] }
    }
};

/**
 * Helper function to process an extracted location string
 * and add it to the locations array after properly formatting it
 */
function processExtractedLocation(locationText: string, locations: Location[]): void {
    locationText = locationText.trim().toLowerCase();
    
    // Skip very short or empty locations
    if (locationText.length < 2) return;
    
    // Skip common words that aren't likely to be locations
    const commonWords = ['ping', 'trace', 'http', 'dns', 'mtr', 'test', 'traceroute', 
                         'request', 'using', 'query', 'via', 'through', 'host', 'network',
                         'measure', 'check', 'run', 'between', 'best', 'fastest', 'slowest'];
    
    if (!commonWords.includes(locationText) && locationText.length > 2) {
        // Instead of trying to categorize the location, use the magic parameter
        // which allows Globalping API to do fuzzy matching on the location string
        locations.push({
            magic: locationText
        });
    }
}

/**
 * Interface for a parsed query
 */
interface ParsedQuery {
    targets: string[];
    measurementType: MeasurementType;
    locations: Location[];
    options?: Record<string, any>;
    error?: string;
}

/**
 * The type of query being processed
 */
export enum QueryType {
    SINGLE = 'single',       // Single measurement for one target
    COMPARATIVE = 'comparative'  // Comparative measurement (multiple targets)
}

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
    const domains = query.match(DOMAIN_REGEX) || [];
    const ipv4s = query.match(IPV4_REGEX) || [];
    const ipv6s = query.match(IPV6_REGEX) || [];
    
    // Combine all matches and remove duplicates
    const allTargets = [...domains, ...ipv4s, ...ipv6s];
    return [...new Set(allTargets)];
}

/**
 * Determines if a query is comparing multiple targets
 * 
 * @param query - The natural language query
 * @returns Boolean indicating if it's a comparative query
 */
function isComparativeQuery(query: string): boolean {
    const comparativePatterns = [
        // Direct comparison questions
        /\b(which|what|who|where)\b.+\b(faster|slower|better|worse|quicker|more reliable)\b/i,
        /\b(compare|comparison|versus|vs\.?|against)\b/i,
        /\bfaster\b.+\bor\b/i,
        /\bbetter\b.+\bor\b/i,
        // A or B style questions
        /\bis\s+([^,]+?)\s+(?:better|faster|slower|more reliable)\s+than\s+([^,]+?)\b/i,
        // Difference questions
        /\b(?:what|how much)\s+(?:is|are)\s+the\s+(?:difference|differences)\s+between\b/i,
        // Which one questions with multiple targets
        /\bwhich\s+(?:one|of\s+(?:these|them|those))\s+is\b/i,
        // Multiple targets with performance indicators
        /\blatenc(?:y|ies)\s+(?:between|to|of)\s+(?:both|multiple|several|different)\b/i,
        // Time comparisons
        /\b(?:how long|how fast|how quickly)\s+(?:do|does|can|could)\s+(?:each|both|they|all)\b/i
    ];

    // Check for comparative patterns
    for (const pattern of comparativePatterns) {
        if (pattern.test(query)) {
            return true;
        }
    }
    
    // Count the number of extracted targets as an additional signal
    const targets = extractTargets(query);
    if (targets.length >= 2) {
        // If we have 2+ targets and see any of these words, it's likely a comparison
        const compareWords = [
            'faster', 'slower', 'better', 'worse', 'quicker', 'reliable', 
            'performance', 'difference', 'comparing', 'comparison', 
            'fastest', 'slowest', 'best', 'worst'
        ];
        
        for (const word of compareWords) {
            if (query.toLowerCase().includes(word)) {
                return true;
            }
        }
        
        // Check for "which" or "what" with multiple targets
        if (/\b(which|what)\b/i.test(query)) {
            return true;
        }
    }

    return false;
}

/**
 * Extracts location information from a natural language query
 * 
 * This enhanced version uses the flexible "magic" parameter which allows 
 * the Globalping API to perform fuzzy matching on location terms. This simplifies
 * our code and improves location matching accuracy.
 * 
 * @param query - The natural language query
 * @returns Array of locations mentioned in the query
 */
function extractLocations(query: string): Location[] {
    // Normalize the query for consistent matching
    const normalizedQuery = query.toLowerCase();
    const locations: Location[] = [];
    
    // Extract explicit location mentions using various patterns
    // Check for "from [location]" patterns
    const fromPatterns = [
        /\bfrom\s+(?:the\s+)?([a-z0-9 ,.'-]+?)(?:\s+to\b|\s+and\b|\s+then\b|$|\s*[,.])/i,
        /\bin\s+(?:the\s+)?([a-z0-9 ,.'-]+?)(?:\s+to\b|\s+and\b|\s+then\b|$|\s*[,.])/i,
        /\bwithin\s+(?:the\s+)?([a-z0-9 ,.'-]+?)(?:\s+to\b|\s+and\b|\s+then\b|$|\s*[,.])/i,
        /\busing\s+(?:probes|servers|nodes|locations)\s+(?:in|from|within)\s+(?:the\s+)?([a-z0-9 ,.'-]+?)(?:\s+to\b|\s+and\b|\s+then\b|$|\s*[,.])/i
    ];
    
    // Handle directional modifiers with locations
    const directionalModifiers = ['north', 'east', 'south', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'central', 'eastern', 'western', 'northern', 'southern'];
    const directionalPattern = new RegExp(`\\b(${directionalModifiers.join('|')})\\s+([a-z0-9 ,.'-]+?)(?:\\s+to\\b|\\s+and\\b|\\s+then\\b|$|\\s*[,.])`, 'i');
    
    // Process from patterns
    for (const pattern of fromPatterns) {
        const matches = normalizedQuery.match(pattern);
        if (matches && matches[1]) {
            const locationText = matches[1].trim();
            processExtractedLocation(locationText, locations);
        }
    }
    
    // Process directional patterns
    let dirMatch;
    while ((dirMatch = directionalPattern.exec(normalizedQuery)) !== null) {
        if (dirMatch && dirMatch[2]) {
            // Combine the directional with the location (e.g., "eastern US")
            const locationText = `${dirMatch[1]} ${dirMatch[2]}`.trim();
            processExtractedLocation(locationText, locations);
        }
    }
    
    // Check for continent/country/region/special location patterns directly
    // Instead of adding specific fields, use the magic parameter for all location types
    const allLocationKeys = [
        ...Object.keys(LOCATION_PATTERNS.continent),
        ...Object.keys(LOCATION_PATTERNS.country),
        ...Object.keys(LOCATION_PATTERNS.region),
        ...Object.keys(LOCATION_PATTERNS.special)
    ];
    
    for (const locationKey of allLocationKeys) {
        if (new RegExp(`\\b${locationKey}\\b`, 'i').test(normalizedQuery)) {
            locations.push({
                magic: locationKey
            });
        }
    }
    
    // Check for multiple locations with list patterns (comma-separated or "and")
    const listPatterns = [
        /\bfrom\s+(?:the\s+)?([a-z0-9 ,.'-]+?(?:\s+and\s+[a-z0-9 ,.'-]+?)+)(?:\s+to\b|\s+and\b|\s+then\b|$|\s*[,.])/i,
        /\bin\s+(?:the\s+)?([a-z0-9 ,.'-]+?(?:\s+and\s+[a-z0-9 ,.'-]+?)+)(?:\s+to\b|\s+and\b|\s+then\b|$|\s*[,.])/i,
        /\blocations\s+(?:like|such as|including)\s+([a-z0-9 ,.'-]+?(?:\s*,\s*[a-z0-9 ,.'-]+?)+)(?:\s+to\b|\s+and\b|\s+then\b|$|\s*[,.])/i
    ];
    
    // Process location lists
    for (const pattern of listPatterns) {
        const matches = normalizedQuery.match(pattern);
        if (matches && matches[1]) {
            const locationsList = matches[1].split(/\s*(?:,|and)\s+/).filter(Boolean);
            for (const locationText of locationsList) {
                processExtractedLocation(locationText.trim(), locations);
            }
        }
    }
    
    // Check for network type specifications
    const networkTypePatterns = {
        'datacenter': [/\b(?:data\s*centers?|datacenters?|cloud\s*providers?|aws|azure|gcp|amazon|google\s*cloud|microsoft\s*azure)\b/i],
        'residential': [/\b(?:residential|homes?|home\s*networks?|residential\s*networks?)\b/i],
        'mobile': [/\b(?:mobile|cellular|4g|5g|lte|mobile\s*networks?|cellular\s*networks?)\b/i],
        'broadband': [/\b(?:broadband|isps?|internet\s*providers?|consumer\s*internet)\b/i],
        'backbone': [/\b(?:backbone|transit|tier\s*1|backbone\s*networks?)\b/i]
    };
    
    for (const [tag, patterns] of Object.entries(networkTypePatterns)) {
        for (const pattern of patterns) {
            if (pattern.test(normalizedQuery)) {
                // Use the tag as a magic parameter instead of adding it to tags array
                const hasTag = locations.some(loc => loc.magic === tag);
                
                if (!hasTag) {
                    locations.push({
                        magic: tag
                    });
                }
            }
        }
    }
    
    // If no locations were found and there's a fairly obvious global query, add a simple empty location
    if (locations.length === 0 && 
        /\b(?:global|worldwide|world\s*wide|across\s*the\s*world|across\s*the\s*globe|globally|everywhere|all\s*over)\b/i.test(normalizedQuery)) {
        locations.push({});  // Empty location means no filters - global
    }
    
    // Default to 3 probes if no specific count is requested
    // If the user specifies a location but no probe count, we'll use 3 as the default
    if (locations.length > 0) {
        const probeCount = extractProbeCount(normalizedQuery);
        if (probeCount > 0) {
            // Apply the probe count to all locations
            locations.forEach(loc => {
                loc.limit = probeCount;
            });
        } else {
            // Default probe count
            locations.forEach(loc => {
                // Only set if not already specified
                if (!loc.limit) {
                    loc.limit = 3;
                }
            });
        }
    }
    
    // Log discovered locations for debugging
    if (locations.length > 0) {
        console.error('[NLP] Extracted locations:');
        locations.forEach((loc, i) => {
            console.error(`[NLP]   Location ${i + 1}:`, JSON.stringify(loc));
        });
    } else {
        console.error('[NLP] No locations extracted, will use global distribution');
    }
    
    return locations;
}

/**
 * Determines the most likely measurement type for a query
 * 
 * This enhanced version uses a weighted scoring approach with more context-aware
 * patterns to determine the appropriate measurement type. It examines keywords,
 * phrases, and the overall context of the query to make the best decision.
 * 
 * @param query - The natural language query
 * @returns The most likely measurement type for the query
 */
function determineMeasurementType(query: string): MeasurementType {
    // Normalize the query for easier pattern matching
    const normalizedQuery = query.toLowerCase();
    
    // Score-based approach to determine the most likely measurement type
    const scores: Record<MeasurementType, number> = {
        'ping': 0,
        'traceroute': 0,
        'dns': 0,
        'mtr': 0,
        'http': 0
    };
    
    // Explicit mention patterns - these are strong indicators
    const explicitPatterns: Record<MeasurementType, RegExp[]> = {
        'ping': [
            /\b(ping|pinging|pinged)\b/i,
            /\blatency\b/i,
            /\brtt\b/i,
            /\bround.?trip.?time\b/i,
            /\bpacket loss\b/i,
            /\bresponse time\b/i,
            /\bjitter\b/i
        ],
        'traceroute': [
            /\b(traceroute|tracert|trace route|trace path)\b/i,
            /\btrace packet(s)?\b/i,
            /\bhops?\b/i,
            /\broute\b/i,
            /\bnetwork path\b/i,
            /\bpath to\b/i
        ],
        'dns': [
            /\b(dns|domain name|nameserver|name server)\b/i,
            /\bresolv(e|ing|es|er)\b/i,
            /\blookup\b/i,
            /\bdig\b/i,
            /\bnslookup\b/i,
            /\brecord\b/i
        ],
        'mtr': [
            /\bmtr\b/i,
            /\bmy.?traceroute\b/i,
            /\bnetwork.?diagnostics\b/i,
            /\bcombined\b/i
        ],
        'http': [
            /\b(http|https|web|website|webpage|page)\b/i,
            /\b(curl|fetch|request|get)\b/i,
            /\bload(s|ed|ing)?\b/i,
            /\burl\b/i,
            /\bperformance\b/i,
            /\bspeed\b/i,
            /\bfast(er|est)?\b/i,
            /\bslow(er|est)?\b/i,
            /\bresponse\b/i
        ]
    };
    
    // Contextual patterns - these need more context to interpret
    const contextualPatterns: Record<MeasurementType, RegExp[]> = {
        'ping': [
            /\bfast\b/i, // If associated with "connection", "network", etc.
            /\bslow\b/i,
            /\brespond\b/i,
            /\bdelay\b/i,
            /\bavailability\b/i,
            /\buptime\b/i,
            /\bhealth\b/i
        ],
        'traceroute': [
            /\bpath\b/i,
            /\bjumps\b/i,
            /\brouters\b/i,
            /\bgateways\b/i,
            /\bintermediate\b/i,
            /\bthrough\b/i
        ],
        'dns': [
            /\bname\b/i,
            /\baddress\b/i,
            /\bip\b/i,
            /\btranslat(e|ion)\b/i,
            /\bmapping\b/i
        ],
        'mtr': [
            /\bdiagnostic\b/i,
            /\bdetailed\b/i,
            /\bcomprehensive\b/i,
            /\bthorough\b/i,
            /\btroubleshoot\b/i
        ],
        'http': [
            /\bopen\b/i,
            /\bbrowser\b/i,
            /\bclick\b/i,
            /\bload time\b/i,
            /\bconnect(s|ed|ion)?\b/i,
            /\baccess\b/i,
            /\bretrieve\b/i,
            /\bcontent\b/i
        ]
    };
    
    // Specific DNS record type patterns
    const dnsRecordPatterns = [
        /\b[a-z ]*record\b/i,
        /\bmx\b/i,
        /\bcname\b/i,
        /\btxt\b/i,
        /\baaaaa\b/i,
        /\bns\b/i,
        /\bptr\b/i,
        /\bsoa\b/i,
        /\bsrv\b/i
    ];
    
    // Check for explicit mentions of measurement types (high confidence)
    Object.entries(explicitPatterns).forEach(([type, patterns]) => {
        patterns.forEach(pattern => {
            if (pattern.test(normalizedQuery)) {
                scores[type as MeasurementType] += 3;
            }
        });
    });
    
    // Check for contextual patterns (medium confidence)
    Object.entries(contextualPatterns).forEach(([type, patterns]) => {
        patterns.forEach(pattern => {
            if (pattern.test(normalizedQuery)) {
                scores[type as MeasurementType] += 1;
            }
        });
    });
    
    // Special case: Check for DNS record type mentions (strong indicator for DNS)
    if (dnsRecordPatterns.some(pattern => pattern.test(normalizedQuery))) {
        scores.dns += 5; // Very high confidence if DNS record types are mentioned
    }
    
    // Special case: HTTP with website mentions
    if (scores.http > 0 && /\b(site|website|web|page|load)\b/i.test(normalizedQuery)) {
        scores.http += 2; // Boost HTTP score for website-related queries
    }
    
    // Special case: Speed/performance context
    if (/\b(speed|performance|fast|faster|slow|slower|quick|load\s+time)\b/i.test(normalizedQuery)) {
        // For websites, HTTP is more appropriate
        if (/\b(site|website|web|page|url)\b/i.test(normalizedQuery)) {
            scores.http += 3;
        } else {
            // For generic speed tests, ping is often the default
            scores.ping += 2;
        }
    }
    
    // Special case: Network troubleshooting context
    if (/\b(troubleshoot|diagnos(e|is|tic)|network issue|problem|debug|issue)\b/i.test(normalizedQuery)) {
        // MTR gives the most comprehensive view for troubleshooting
        scores.mtr += 3;
        // Traceroute is also helpful
        scores.traceroute += 2;
    }
    
    // Special case: Domain resolution
    if (/\b(how does .+ resolve|domain resolves|ip address for|address of|lookup)\b/i.test(normalizedQuery)) {
        scores.dns += 3;
    }
    
    // Special case: "What's the IP of..." is likely a DNS query
    if (/\b(what's|what is) (the|an) ip( address)? (for|of)\b/i.test(normalizedQuery)) {
        scores.dns += 4;
    }
    
    // Special case: "Can I reach..." is likely a ping
    if (/\b(can (I|we|you) (reach|connect to|ping))\b/i.test(normalizedQuery)) {
        scores.ping += 3;
    }
    
    // Special case: "How do I get to..." suggests traceroute
    if (/\b(how (do|does|can) (I|we|you|it|data) (get|route|travel) to)\b/i.test(normalizedQuery)) {
        scores.traceroute += 3;
    }
    
    // HTTP measurement is generally more expensive, so only prefer it when we're confident
    // For ties between HTTP and others, slightly favor the other measurement type
    if (scores.http > 0 && scores.http <= Math.max(scores.ping, scores.traceroute, scores.dns, scores.mtr)) {
        scores.http -= 0.5;
    }
    
    // Return the type with the highest score, defaulting to ping if no matches or tie
    let maxScore = 0;
    let bestType: MeasurementType = 'ping'; // Default to ping

    for (const [type, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestType = type as MeasurementType;
        }
    }
    
    // Log the decision process for debugging
    console.error(`[NLP] Measurement type scores for query "${query.slice(0, 50)}...":`);
    Object.entries(scores).forEach(([type, score]) => {
        console.error(`[NLP]   ${type}: ${score}`);
    });
    console.error(`[NLP] Selected measurement type: ${bestType}`);

    return bestType;
}

/**
 * Processes a natural language query into structured measurement requests
 * 
 * This enhanced version provides better support for comparative queries,
 * improved context understanding, and more accurate measurement type selection
 * based on the nature of the query.
 * 
 * @param query - The natural language query to process
 * @returns Structured information extracted from the query
 */
export function processNaturalLanguageQuery(query: string): ParsedQuery {
    // Extract targets from the query
    const targets = extractTargets(query);
    
    if (targets.length === 0) {
        return {
            targets: [],
            measurementType: 'ping', // Default
            locations: [],
            error: 'No valid targets found in the query. Please provide a domain, IP address, or URL to measure.'
        };
    }
    
    // Extract locations mentioned in the query
    const locations = extractLocations(query);
    
    // Detect if this is a comparative query (comparing multiple targets)
    const isComparative = isComparativeQuery(query);
    
    // Determine the appropriate measurement type
    let measurementType: MeasurementType;
    
    if (isComparative) {
        // For comparative queries, we need a consistent measurement type
        // that can provide comparable metrics
        if (/\b(load|fast|speed|download|performance|website|web page|render)\b/i.test(query)) {
            // Speed/performance comparisons work best with HTTP
            measurementType = 'http';
        } else if (/\b(route|path|hop|traceroute)\b/i.test(query)) {
            // Route comparisons work best with traceroute
            measurementType = 'traceroute';
        } else if (/\b(dns|resolve|lookup|name|record)\b/i.test(query)) {
            // DNS comparisons work best with DNS measurements
            measurementType = 'dns';
        } else {
            // Default to ping for general comparisons as it provides 
            // consistent metrics like latency and packet loss
            measurementType = 'ping';
        }
        
        console.error(`[NLP] Detected comparative query, using ${measurementType} measurement type`);
    } else {
        // For non-comparative queries, determine the best measurement type
        // based on the full query context
        measurementType = determineMeasurementType(query);
    }
    
    // Determine if we need special measurement options based on the query context
    const options = determineMeasurementOptions(query, measurementType);
    
    // Build the result object
    return {
        targets,
        measurementType,
        locations,
        options
    };
}

/**
 * Determines measurement options based on the query and selected measurement type
 * 
 * @param query - The natural language query
 * @param measurementType - The selected measurement type
 * @returns Measurement options object or undefined if no special options needed
 */
function determineMeasurementOptions(
    query: string, 
    measurementType: MeasurementType
): Record<string, any> | undefined {
    const options: Record<string, any> = {};
    const queryLower = query.toLowerCase();
    
    // Set common options
    if (measurementType === 'ping') {
        // Default packets is 3, but allow for more if requested
        if (/\b(\d+)\s+packet/i.test(queryLower)) {
            const match = queryLower.match(/\b(\d+)\s+packet/i);
            if (match && match[1]) {
                const packets = parseInt(match[1], 10);
                if (packets > 0 && packets <= 20) { // Reasonable limits
                    options.packets = packets;
                }
            }
        }
        
        // Check for TCP ping requests
        if (/\btcp\s+ping\b/i.test(queryLower)) {
            options.protocol = 'tcp';
            
            // Check for specific port
            const portMatch = queryLower.match(/\bport\s+(\d+)\b/i);
            if (portMatch && portMatch[1]) {
                options.port = parseInt(portMatch[1], 10);
            } else {
                options.port = 80; // Default to HTTP port
            }
        }
    } 
    else if (measurementType === 'traceroute') {
        // Check for specific protocol
        if (/\btcp\s+traceroute\b/i.test(queryLower)) {
            options.protocol = 'tcp';
        } else if (/\budp\s+traceroute\b/i.test(queryLower)) {
            options.protocol = 'udp';
        } else if (/\bicmp\s+traceroute\b/i.test(queryLower)) {
            options.protocol = 'icmp';
        }
        
        // Check for max hops
        const maxHopsMatch = queryLower.match(/\b(\d+)\s+(?:max\s+)?hops\b/i);
        if (maxHopsMatch && maxHopsMatch[1]) {
            const maxHops = parseInt(maxHopsMatch[1], 10);
            if (maxHops > 0 && maxHops <= 30) { // Reasonable limits
                options.maxHops = maxHops;
            }
        }
        
        // Check for specific port
        const portMatch = queryLower.match(/\bport\s+(\d+)\b/i);
        if (portMatch && portMatch[1]) {
            options.port = parseInt(portMatch[1], 10);
        }
    } 
    else if (measurementType === 'dns') {
        // Default to A record if not specified
        options.query = {
            type: 'A',
            name: ''  // This will be filled with the target
        };
        
        // Check for specific DNS record type
        const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'PTR', 'SOA', 'CAA'];
        for (const type of recordTypes) {
            const typeRegex = new RegExp(`\\b${type}\\s+record\\b`, 'i');
            if (typeRegex.test(queryLower) || queryLower.includes(` ${type.toLowerCase()} `)) {
                options.query.type = type;
                break;
            }
        }
        
        // Check for specific resolver
        const resolverMatch = queryLower.match(/\busing\s+(?:nameserver|resolver|dns\s+server)\s+([a-z0-9.-]+)\b/i);
        if (resolverMatch && resolverMatch[1]) {
            options.resolver = resolverMatch[1];
        }
        
        // Check for DNS protocol
        if (/\bdns\s+over\s+https\b/i.test(queryLower) || /\bdoh\b/i.test(queryLower)) {
            options.protocol = 'https';
        } else if (/\bdns\s+over\s+tcp\b/i.test(queryLower)) {
            options.protocol = 'tcp';
        }
    } 
    else if (measurementType === 'mtr') {
        // Similar options as traceroute
        if (/\btcp\s+mtr\b/i.test(queryLower)) {
            options.protocol = 'tcp';
        } else if (/\budp\s+mtr\b/i.test(queryLower)) {
            options.protocol = 'udp';
        } else if (/\bicmp\s+mtr\b/i.test(queryLower)) {
            options.protocol = 'icmp';
        }
        
        // Check for packet count
        const packetsMatch = queryLower.match(/\b(\d+)\s+packet/i);
        if (packetsMatch && packetsMatch[1]) {
            const packets = parseInt(packetsMatch[1], 10);
            if (packets > 0 && packets <= 20) { // Reasonable limits
                options.packets = packets;
            }
        }
        
        // Check for max hops
        const maxHopsMatch = queryLower.match(/\b(\d+)\s+(?:max\s+)?hops\b/i);
        if (maxHopsMatch && maxHopsMatch[1]) {
            const maxHops = parseInt(maxHopsMatch[1], 10);
            if (maxHops > 0 && maxHops <= 30) { // Reasonable limits
                options.maxHops = maxHops;
            }
        }
    } 
    else if (measurementType === 'http') {
        // Default to GET method
        options.method = 'GET';
        
        // Check for HEAD request method
        if (/\bhead\s+request\b/i.test(queryLower)) {
            options.method = 'HEAD';
        }
        
        // Check for specific path
        const pathMatch = queryLower.match(/\bpath\s+([^\s]+)\b/i);
        if (pathMatch && pathMatch[1]) {
            options.path = pathMatch[1];
        }
        
        // Check for redirect following
        if (/\bfollow\s+redirects\b/i.test(queryLower)) {
            options.followRedirects = true;
        } else if (/\bdon'?t\s+follow\s+redirects\b/i.test(queryLower)) {
            options.followRedirects = false;
        }
        
        // Check for DNS resolution options
        if (/\bresolve\s+with\s+dns\b/i.test(queryLower)) {
            options.resolveWithDns = true;
        }
    }
    
    // Return undefined if no options were set
    return Object.keys(options).length > 0 ? options : undefined;
}

/**
 * Extract the number of probes requested in a query
 * 
 * @param query - The natural language query
 * @returns The requested probe count (or 0 if not specified)
 */
function extractProbeCount(query: string): number {
    // Check for explicit probe count mentions
    const probePatterns = [
        /\b(\d+)\s+probe(s)?\b/i,
        /\busing\s+(\d+)\s+location(s)?\b/i,
        /\bfrom\s+(\d+)\s+(?:probe|location)(s)?\b/i,
        /\b(\d+)\s+(?:probe|location)(s)?\s+(?:should|must|to)\s+(?:run|test|measure)\b/i,
        /\blimit\s+(?:to\s+)?(\d+)\s+probe(s)?\b/i,
        /\b(\d+)\s+measurement(s)?\b/i
    ];
    
    for (const pattern of probePatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
            const count = parseInt(match[1], 10);
            // Ensure the count is reasonable (Globalping has a max limit of 500 probes)
            if (count > 0 && count <= 500) {
                return count;
            }
        }
    }
    
    return 0; // Default to 0, meaning no specific count was requested
}
