import which from "which";

import { PACKAGE_MANAGERS } from "$constants/preflight-constants";

import type { PackageManager } from "$meta/package-manager";

export async function findPackageManagersAsync(): Promise<ReadonlySet<PackageManager>> {
	const found = await Promise.all(
		PACKAGE_MANAGERS.map(async (packageManager) => {
			const cliPath = await which(packageManager, { nothrow: true });
			return cliPath === null ? undefined : packageManager;
		}),
	);

	return new Set(found.filter((packageManager): packageManager is PackageManager => packageManager !== undefined));
}
