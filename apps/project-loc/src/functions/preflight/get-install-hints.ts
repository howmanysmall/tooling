import { highlight } from "@howmanysmall/cli-utilities/cliffy-highlight" with { type: "macro" };

import { PackageManager } from "$meta/package-manager";

import type { InstallHints } from "$types/preflight-types";

const INSTALL_MISE = highlight("mise use --global github:boyter/scc");
const INSTALL_BREW = highlight("brew install scc");
const UPGRADE_BREW = highlight("brew upgrade scc");

// Macro arguments must be literals, so each AUR helper gets its own call.
const AUR_COMMANDS = [
	[PackageManager.Paru, highlight("paru -S scc-bin")],
	[PackageManager.Yay, highlight("yay -S scc-bin")],
] as const;

export function getInstallHints(upgrade: boolean, available: ReadonlySet<PackageManager>): InstallHints {
	const commands = new Array<string>();
	const notes = new Array<string>();

	if (available.has(PackageManager.Mise)) {
		commands.push(INSTALL_MISE);
	}

	if (available.has(PackageManager.Brew)) {
		commands.push(upgrade ? UPGRADE_BREW : INSTALL_BREW);
	}

	if (available.has(PackageManager.Pacman)) {
		// scc is not in Arch's repositories, only the AUR.
		const helper = AUR_COMMANDS.find(([name]) => available.has(name));
		if (helper === undefined) {
			notes.push("scc is only in the AUR (scc-bin): https://aur.archlinux.org/packages/scc-bin");
		} else {
			commands.push(helper[1]);
		}
	}

	if (
		!available.has(PackageManager.Mise) &&
		!available.has(PackageManager.Brew) &&
		!available.has(PackageManager.Pacman)
	) {
		notes.push("scc: download a build from https://github.com/boyter/scc/releases");
	}

	return { commands, heading: upgrade ? "Upgrade" : "Install", notes };
}
