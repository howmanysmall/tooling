import { PackageManager } from "$meta/package-manager";

export const MINIMUM_NESTED_SCC_MAJOR = 4;
export const PACKAGE_MANAGERS = Object.values({
	[PackageManager.Brew]: PackageManager.Brew,
	[PackageManager.Mise]: PackageManager.Mise,
	[PackageManager.Pacman]: PackageManager.Pacman,
	[PackageManager.Paru]: PackageManager.Paru,
	[PackageManager.Yay]: PackageManager.Yay,
} satisfies Record<PackageManager, PackageManager>);
