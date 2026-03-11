export interface StoragePort {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
	clear(): void;
}

export class BrowserStoragePort implements StoragePort {
	#storage: Storage;

	constructor(storage: Storage) {
		this.#storage = storage;
	}

	getItem(key: string): string | null {
		return this.#storage.getItem(key);
	}

	setItem(key: string, value: string): void {
		this.#storage.setItem(key, value);
	}

	removeItem(key: string): void {
		this.#storage.removeItem(key);
	}

	clear(): void {
		this.#storage.clear();
	}
}

export class InMemoryStoragePort implements StoragePort {
	#map = new Map<string, string>();

	getItem(key: string): string | null {
		return this.#map.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.#map.set(key, value);
	}

	removeItem(key: string): void {
		this.#map.delete(key);
	}

	clear(): void {
		this.#map.clear();
	}
}

