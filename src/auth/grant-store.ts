import { DurableObject } from "cloudflare:workers";
import { OAuthError } from "@cloudflare/workers-oauth-provider";
import type { GlobalpingEnv } from "../types";

// Grants live in one Durable Object per user, not in KV.
// KV can return old data for up to 60 seconds, and a refresh with an old grant fails.

const GRANT_PREFIX = "grant:";

// A null value marks a deleted grant.
type Entry = { value: string | null; expiresAt?: number };

export class GrantStore extends DurableObject {
	// Returns null for a deleted or expired grant, undefined for a grant that was never here.
	async read(key: string): Promise<string | null | undefined> {
		const entry = await this.ctx.storage.get<Entry>(key);
		if (!entry) {
			return undefined;
		}
		if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
			return null;
		}
		return entry.value;
	}

	async write(
		key: string,
		value: string,
		expiresAt?: number,
		expected?: string | null,
	): Promise<boolean> {
		if ((await this.read(key)) !== expected) {
			return false;
		}
		await this.ctx.storage.put<Entry>(key, { value, expiresAt });
		await this.scheduleCleanup();
		return true;
	}

	async remove(key: string): Promise<void> {
		// Can be a plain delete after 2027-01-01.
		await this.ctx.storage.put<Entry>(key, {
			value: null,
			expiresAt: Date.now() + 60 * 60 * 1000,
		});
		await this.scheduleCleanup();
	}

	async list(): Promise<string[]> {
		return [...(await this.ctx.storage.list()).keys()];
	}

	async alarm(): Promise<void> {
		await this.deleteExpired();
		await this.scheduleCleanup();
	}

	private async deleteExpired(): Promise<void> {
		for (const [key, { expiresAt }] of await this.ctx.storage.list<Entry>()) {
			if (expiresAt !== undefined && expiresAt <= Date.now()) {
				await this.ctx.storage.delete(key);
			}
		}
	}

	private async scheduleCleanup(): Promise<void> {
		const entries = [...(await this.ctx.storage.list<Entry>()).values()];
		const expiryTimes = entries.flatMap(({ expiresAt }) => expiresAt ?? []);
		if (expiryTimes.length > 0) {
			await this.ctx.storage.setAlarm(Math.min(...expiryTimes));
		}
	}
}

export function withGrantStore(env: GlobalpingEnv): GlobalpingEnv {
	const kv = env.OAUTH_KV;
	// Keys look like grant:{userId}:{grantId}.
	const storeFor = (key: string) =>
		env.GRANT_STORE.get(
			env.GRANT_STORE.idFromName(key.slice(GRANT_PREFIX.length, key.lastIndexOf(":"))),
		);

	// What the store returned for each grant that this request read.
	const seen = new Map<string, string | null | undefined>();

	const grantKV = {
		async get(key: string, options?: any) {
			if (!key.startsWith(GRANT_PREFIX)) {
				return kv.get(key, options);
			}
			let value = await storeFor(key).read(key);
			seen.set(key, value);

			// Old grants are still in KV. Can be removed after 2027-01-01.
			if (value === undefined) {
				value = await kv.get(key);
			}

			if (value === null) {
				return null;
			}
			return options?.type === "json" ? JSON.parse(value) : value;
		},

		async put(key: string, value: string, options?: KVNamespacePutOptions) {
			if (!key.startsWith(GRANT_PREFIX)) {
				return kv.put(key, value, options);
			}
			const expiresAt = options?.expiration
				? options.expiration * 1000
				: options?.expirationTtl
					? Date.now() + options.expirationTtl * 1000
					: undefined;
			if (!(await storeFor(key).write(key, value, expiresAt, seen.get(key)))) {
				throw new OAuthError("temporarily_unavailable", {
					description: "The grant was changed by another request, retry",
					statusCode: 503,
					headers: { "Retry-After": "1" },
				});
			}
		},

		async delete(key: string) {
			if (!key.startsWith(GRANT_PREFIX)) {
				return kv.delete(key);
			}
			// Old grants are still in KV. Can be removed after 2027-01-01.
			// KV goes first, so a read between the two deletes does not find the grant there.
			await kv.delete(key);
			await storeFor(key).remove(key);
		},

		async list(options?: KVNamespaceListOptions) {
			const prefix = options?.prefix;
			if (!prefix?.startsWith(GRANT_PREFIX)) {
				return kv.list(options);
			}
			if (prefix === GRANT_PREFIX || !prefix.endsWith(":")) {
				throw new Error("Grants can only be listed for one user");
			}
			const names = new Set(await storeFor(prefix).list());

			// Old grants are still in KV. Can be removed after 2027-01-01.
			let cursor: string | undefined;
			do {
				const page = await kv.list({ prefix, cursor });
				for (const { name } of page.keys) {
					names.add(name);
				}
				cursor = page.list_complete ? undefined : page.cursor;
			} while (cursor);

			return { keys: [...names].map((name) => ({ name })), list_complete: true };
		},
	};

	return { ...env, OAUTH_KV: grantKV as unknown as KVNamespace };
}
