/** One way to install the darkroom command line tool. */
export interface PackageManager {
	/** The command that installs darkroom globally. */
	readonly install: string;
	/** What the docs call the manager, such as `pnpm`. */
	readonly label: string;
}

/** The package on npm that ships the `darkroom` command. */
export const PACKAGE_NAME = "@pobammer-ts/darkroom";

/**
 * Every package manager the docs offer, best first. Each command installs
 * globally, because darkroom is a command line tool rather than a dependency.
 * The `yarn` one only works on Yarn 1: Yarn 2 dropped global installs.
 */
export const PACKAGE_MANAGERS = [
	{ install: `pnpm add --global ${PACKAGE_NAME}`, label: "pnpm" },
	{ install: `ni --global ${PACKAGE_NAME}`, label: "ni" },
	{ install: `aube add --global ${PACKAGE_NAME}`, label: "aube" },
	{ install: `bun add --global ${PACKAGE_NAME}`, label: "bun" },
	{ install: `deno install --global npm:${PACKAGE_NAME}`, label: "deno" },
	{ install: `vp add --global ${PACKAGE_NAME}`, label: "vp" },
	{ install: `yarn global add ${PACKAGE_NAME}`, label: "yarn" },
	{ install: `npm install --global ${PACKAGE_NAME}`, label: "npm" },
] as const satisfies ReadonlyArray<PackageManager>;

/**
 * The manager the home page names in its single install line. Pages with room
 * for more use `PACKAGE_MANAGERS` and let the reader pick.
 */
export const [PREFERRED_PACKAGE_MANAGER] = PACKAGE_MANAGERS;
