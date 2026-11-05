import { PackageManager } from "$meta/package-manager";

export const MINIMUM_NESTED_SCC_MAJOR = 4;
export const PACKAGE_MANAGERS = [
	PackageManager.Mise,
	PackageManager.Brew,
	PackageManager.Pacman,
	PackageManager.Paru,
	PackageManager.Yay,
] as const;
