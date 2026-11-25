import { DurableObject } from "cloudflare:workers";
import type { GlobalpingEnv } from "../types";

// The OAuth provider keeps grants in OAUTH_KV. KV caches reads in each Cloudflare
// location for up to 60 seconds, so a refresh in one location can read a grant from
// before a token rotation in another location and reject a valid refresh token.
// Grants are kept in one Durable Object per user instead, so all locations read the same data.

const GRANT_PREFIX = "grant:";

type Entry = { value: string; expiresAt?: number };

export class GrantStore extends DurableObject {
	async read(key: string): Promise<string | null> {
		return (await this.load(key))?.value ?? null;
	}

	async write(key: string, value: string, expiresAt?: number): Promise<void> {
		await this.ctx.storage.put<Entry>(key, { value, expiresAt });
	}

	// Migration from KV: can be removed after 2027-01-01.
	async writeIfMissing(key: string, value: string, expiresAt?: number): Promise<string> {
		const entry = await this.load(key);
		if (entry) {
			return entry.value;
		}
		await this.write(key, value, expiresAt);
		return value;
	}

	async remove(key: string): Promise<void> {
		await this.ctx.storage.delete(key);
	}

	async list(prefix: string): Promise<string[]> {
		const keys: string[] = [];
		for (const [key, entry] of await this.ctx.storage.list<Entry>({ prefix })) {
			if (isExpired(entry)) {
				await this.ctx.storage.delete(key);
			} else {
				keys.push(key);
			}
		}
		return keys;
	}

	private async load(key: string): Promise<Entry | undefined> {
		const entry = await this.ctx.storage.get<Entry>(key);
		if (entry && isExpired(entry)) {
			await this.ctx.storage.delete(key);
			return undefined;
		}
		return entry;
	}
}

function isExpired(entry: Entry) {
	return entry.expiresAt !== undefined && entry.expiresAt <= Date.now();
}

/**
 * Returns env with OAUTH_KV replaced by a KV that keeps grant:* keys in GrantStore
 * and passes all other keys to the real KV.
 */
export function withGrantStore(env: GlobalpingEnv): GlobalpingEnv {
	const kv = env.OAUTH_KV;
	const storeFor = (userId: string) => env.GRANT_STORE.get(env.GRANT_STORE.idFromName(userId));
	// Keys look like grant:{userId}:{grantId}.
	const userOf = (key: string) => key.slice(GRANT_PREFIX.length, key.lastIndexOf(":"));

	const grantKV = {
		async get(key: string, options?: any) {
			if (!key.startsWith(GRANT_PREFIX)) {
				return kv.get(key, options);
			}
			const store = storeFor(userOf(key));
			let value = await store.read(key);

			// Migration from KV: can be removed after 2027-01-01, when all grants in KV have expired.
			if (value === null) {
				const legacy = await kv.get(key);
				if (legacy !== null) {
					const { expiresAt } = JSON.parse(legacy);
					value = await store.writeIfMissing(
						key,
						legacy,
						typeof expiresAt === "number" ? expiresAt * 1000 : undefined,
					);
				}
			}

			if (value === null) {
				return null;
			}
			const type = typeof options === "string" ? options : (options?.type ?? "text");
			if (type === "json") {
				return JSON.parse(value);
			}
			if (type === "text") {
				return value;
			}
			throw new Error(`Unsupported read type for grants: ${type}`);
		},

		async put(key: string, value: any, options?: KVNamespacePutOptions) {
			if (!key.startsWith(GRANT_PREFIX)) {
				return kv.put(key, value, options);
			}
			if (typeof value !== "string") {
				throw new Error("Grants must be stored as strings");
			}
			const expiresAt = options?.expiration
				? options.expiration * 1000
				: options?.expirationTtl
					? Date.now() + options.expirationTtl * 1000
					: undefined;
			await storeFor(userOf(key)).write(key, value, expiresAt);
		},

		async delete(key: string) {
			if (!key.startsWith(GRANT_PREFIX)) {
				return kv.delete(key);
			}
			await storeFor(userOf(key)).remove(key);
			// Migration from KV: can be removed after 2027-01-01, when all grants in KV have expired.
			await kv.delete(key);
		},

		async list(options?: KVNamespaceListOptions) {
			const prefix = options?.prefix;
			if (!prefix?.startsWith(GRANT_PREFIX)) {
				return kv.list(options);
			}
			if (prefix === GRANT_PREFIX || !prefix.endsWith(":")) {
				throw new Error("Grants can only be listed for one user");
			}
			const names = new Set(
				await storeFor(prefix.slice(GRANT_PREFIX.length, -1)).list(prefix),
			);

			// Migration from KV: can be removed after 2027-01-01, when all grants in KV have expired.
			let cursor: string | undefined;
			do {
				const page = await kv.list({ prefix, cursor });
				for (const { name } of page.keys) {
					names.add(name);
				}
				cursor = page.list_complete ? undefined : page.cursor;
			} while (cursor);

			return {
				keys: [...names].map((name) => ({ name })),
				list_complete: true,
				cacheStatus: null,
			};
		},

		getWithMetadata: kv.getWithMetadata.bind(kv),
	};

	return { ...env, OAUTH_KV: grantKV as unknown as KVNamespace };
}
