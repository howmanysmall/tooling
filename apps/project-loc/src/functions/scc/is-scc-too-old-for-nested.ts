import { MINIMUM_NESTED_SCC_MAJOR } from "$constants/preflight-constants";

export function isSccTooOldForNested(version: string): boolean {
	const [major] = version.split(".", 1);
	return Number(major) < MINIMUM_NESTED_SCC_MAJOR;
}
