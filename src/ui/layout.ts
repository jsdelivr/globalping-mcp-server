/**
 * HTML layout template
 */
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { PKCECodePair } from "../types";

export const layout = (content: HtmlEscapedString | string, title: string) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1.0"
			/>
			<title>${title}</title>
			<script src="https://cdn.tailwindcss.com"></script>
			<script>
				tailwind.config = {
					theme: {
						extend: {
							colors: {
								primary: "#3498db",
								secondary: "#2ecc71",
								accent: "#f39c12",
							},
							fontFamily: {
								sans: ["Inter", "system-ui", "sans-serif"],
								heading: ["Roboto", "system-ui", "sans-serif"],
							},
						},
					},
				};
			</script>
			<style>
				@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap");

				/* Custom styling for markdown content */
				.markdown h1 {
					font-size: 2.25rem;
					font-weight: 700;
					font-family: "Roboto", system-ui, sans-serif;
					color: #1a202c;
					margin-bottom: 1rem;
					line-height: 1.2;
				}

				.markdown h2 {
					font-size: 1.5rem;
					font-weight: 600;
					font-family: "Roboto", system-ui, sans-serif;
					color: #2d3748;
					margin-top: 1.5rem;
					margin-bottom: 0.75rem;
					line-height: 1.3;
				}

				.markdown h3 {
					font-size: 1.25rem;
					font-weight: 600;
					font-family: "Roboto", system-ui, sans-serif;
					color: #2d3748;
					margin-top: 1.25rem;
					margin-bottom: 0.5rem;
				}

				.markdown p {
					font-size: 1.125rem;
					color: #4a5568;
					margin-bottom: 1rem;
					line-height: 1.6;
				}

				.markdown a {
					color: #3498db;
					font-weight: 500;
					text-decoration: none;
				}

				.markdown a:hover {
					text-decoration: underline;
				}

				/* Preserve text-white for button-styled links */
				.markdown a.bg-primary,
				.markdown a.bg-secondary {
					color: white !important;
				}

				.markdown a.bg-primary:hover,
				.markdown a.bg-secondary:hover {
					text-decoration: none;
				}

				.markdown blockquote {
					border-left: 4px solid #f39c12;
					padding-left: 1rem;
					padding-top: 0.75rem;
					padding-bottom: 0.75rem;
					margin-top: 1.5rem;
					margin-bottom: 1.5rem;
					background-color: #fffbeb;
					font-style: italic;
				}

				.markdown blockquote p {
					margin-bottom: 0.25rem;
				}

				.markdown ul,
				.markdown ol {
					margin-top: 1rem;
					margin-bottom: 1rem;
					margin-left: 1.5rem;
					font-size: 1.125rem;
					color: #4a5568;
				}

				.markdown li {
					margin-bottom: 0.5rem;
				}

				.markdown ul li {
					list-style-type: disc;
				}

				.markdown ol li {
					list-style-type: decimal;
				}

				.markdown pre {
					background-color: #f7fafc;
					padding: 1rem;
					border-radius: 0.375rem;
					margin-top: 1rem;
					margin-bottom: 1rem;
					overflow-x: auto;
				}

				.markdown code {
					font-family: monospace;
					font-size: 0.875rem;
					background-color: #f7fafc;
					padding: 0.125rem 0.25rem;
					border-radius: 0.25rem;
				}

				.markdown pre code {
					background-color: transparent;
					padding: 0;
				}
			</style>
		</head>
		<body
			class="bg-gray-50 text-gray-800 font-sans leading-relaxed flex flex-col min-h-screen"
		>
			<header class="bg-white shadow-sm mb-8">
				<div
					class="container mx-auto px-4 py-4 flex justify-between items-center"
				>
					<a
						href="/"
						class="text-xl font-heading font-bold text-primary hover:text-primary/80 transition-colors"
						>Globalping MCP Server</a
					>
				</div>
			</header>
			<main class="container mx-auto px-4 pb-12 flex-grow">
				${content}
			</main>
			<footer class="bg-gray-100 py-6 mt-12">
				<div class="container mx-auto px-4 text-center text-gray-600">
					<p>
						&copy; ${new Date().getFullYear()} Globalping MCP Server.
						All rights reserved.
					</p>
				</div>
			</footer>
		</body>
	</html>
`;

export const parseApproveFormBody = async (body: {
	[x: string]: string | File;
}) => {
	const action = body.action as string;
	const email = body.email as string;
	const password = body.password as string;
	let oauthReqInfo: AuthRequest | null = null;
	try {
		oauthReqInfo = JSON.parse(body.oauthReqInfo as string) as AuthRequest;
	} catch (e) {
		oauthReqInfo = null;
	}

	return { action, oauthReqInfo, email, password };
};

/**
 * Generate a random string for PKCE and state
 * @param length Length of the random string
 * @returns A URL-safe random string
 */
export function generateRandomString(length: number): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.substring(0, length);
}

/**
 * Create a code verifier and code challenge pair for PKCE
 * @returns A code verifier and challenge pair
 */
export async function createPKCECodes(): Promise<PKCECodePair> {
	// Generate code verifier (random string between 43-128 chars)
	const codeVerifier = generateRandomString(64);

	// Create code challenge using SHA-256
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);
	const digest = await crypto.subtle.digest("SHA-256", data);

	// Convert digest to base64url format
	const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");

	return {
		codeVerifier,
		codeChallenge: base64Digest,
	};
}

const STANDARD_PROTOCOLS = new Set([
	"http:",
	"https:",
	"ftp:",
	"file:",
	"mailto:",
	"tel:",
	"ws:",
	"wss:",
	"sms:",
	"data:",
	"blob:",
	"about:",
	"chrome:",
	"opera:",
	"edge:",
	"safari:",
	"javascript:",
]);

/**
 * Check if a URL is a deep link
 * @param url The URL to check
 * @returns
 */
export function isDeepLink(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		const protocol = parsedUrl.protocol.toLowerCase();
		return !STANDARD_PROTOCOLS.has(protocol);
	} catch (e) {
		return false;
	}
}

export function isExceptionHost(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		const exceptionHosts = new Set([
			"playground.ai.cloudflare.com",
			"mcp.docker.com",
			"mcptotal.io",
			// add more exception hosts here if needed
		]);
		return exceptionHosts.has(url.hostname);
	} catch (err) {
		// Invalid URL string
		return false;
	}
}

/**
 * Create a manual redirect confirmation page
 * Per OAuth 2.0 Security Best Practices (RFC 6819 section 7.12.2),
 * untrusted redirect URIs should require manual user confirmation
 * @param redirectUri The redirect URI to display
 * @returns HTML string for the confirmation page
 */
export const manualRedirectPage = (redirectUri: string) => html`
	<div class="markdown max-w-2xl mx-auto">
		<div class="bg-white rounded-lg shadow-md p-8 border-l-4 border-accent">
			<div class="mb-6">
				<svg
					class="w-16 h-16 mx-auto text-accent"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					></path>
				</svg>
			</div>

			<h1 class="text-center mb-4">Authentication successful</h1>

			<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg
							class="h-5 w-5 text-yellow-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm text-yellow-700 font-medium">
							Security notice
						</p>
					</div>
				</div>
			</div>

			<p class="mb-4">
				Your authentication was successful. However, for security reasons, you
				need to manually complete the redirect to the following URL:
			</p>

			<div class="bg-gray-100 p-4 rounded-md mb-6 break-all">
				<code class="text-sm text-gray-800">${redirectUri}</code>
			</div>

			<div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
				<p class="text-sm text-blue-700">
					<strong>Why do I need to click?</strong> As a security measure, this
					authorization server requires manual confirmation before redirecting
					to third-party websites. This helps protect you from potential
					phishing attacks.
				</p>
			</div>

			<div class="text-center">
				<a
					href="${redirectUri}"
					class="inline-block bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
				>
					Click here to complete authentication
				</a>
			</div>

			<p class="text-sm text-gray-500 mt-6 text-center">
				Only click the button above if you trust the destination and initiated
				this authentication request.
			</p>
		</div>
	</div>
`;
