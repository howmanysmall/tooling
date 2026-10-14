import { argv, exit, stdin } from "node:process";
import { text } from "node:stream/consumers";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name";
import { commitTypes } from "@howmanysmall/lint-configurations/constants";
import { consola } from "consola";

const scriptName = getScriptName(true);
const log = consola.withTag(scriptName);

const PREFIXLESS_BRANCHES: ReadonlySet<string> = new Set(["main"]);
const KEBAB_WORD_PATTERN = /^[\da-z]+$/u;

const HEADS_PREFIX = "refs/heads/";
const SHA_PATTERN = /^[0-9a-f]{40,64}$/u;
const ZERO_SHA_PATTERN = /^0+$/u;

interface RefRecord {
	/** The sha of the local ref; all zeros when the push deletes a branch. */
	readonly localSha: string;
	/** The ref name on the remote, like `refs/heads/feat/add-branchlint`. */
	readonly remoteRef: string;
}

function findBranchNameProblems(branchName: string): ReadonlyArray<string> {
	const slashIndex = branchName.indexOf("/");
	if (slashIndex === -1) {
		return [
			`"${branchName}" is missing its "<type>/" prefix; expected something like "feat/add-branchlint", where the type is one of: ${commitTypes.join(", ")}`,
		];
	}

	const type = branchName.slice(0, slashIndex);
	const description = branchName.slice(slashIndex + 1);
	const problems = new Array<string>();

	if (!commitTypes.includes(type)) {
		problems.push(`"${type}" is not an allowed type; use one of: ${commitTypes.join(", ")}`);
	}

	if (description.split("-").some((word) => !KEBAB_WORD_PATTERN.test(word))) {
		problems.push(`"${description}" is not lowercase kebab-case`);
	}

	return problems;
}

function isArrayOfSize4<TValue>(array: ReadonlyArray<TValue>): array is readonly [TValue, TValue, TValue, TValue] {
	return array.length === 4;
}

function parseRefRecord(line: string): RefRecord | undefined {
	const fields = line.split(" ");
	if (!isArrayOfSize4(fields)) return undefined;

	const [, localSha, remoteRef, remoteSha] = fields;
	if (!SHA_PATTERN.test(localSha) || !SHA_PATTERN.test(remoteSha)) return undefined;

	return { localSha, remoteRef };
}

async function readPushedBranchNamesAsync(): Promise<ReadonlyArray<string>> {
	if (stdin.isTTY) {
		log.fail("no branch names given; pass them as arguments, or pipe git's pre-push refs into stdin");
		exit(1);
	}

	const contents = await text(stdin);
	const branchNames = new Array<string>();

	for (const line of contents.split("\n")) {
		if (line.length === 0) continue;

		const record = parseRefRecord(line);
		if (record === undefined) {
			log.fail(`unrecognized pre-push ref record: ${line}`);
			log.fail('expected "<local-ref> <local-sha> <remote-ref> <remote-sha>"');
			exit(1);
		}

		// Deleting a badly named branch is how it goes away, and tags carry no
		// branch name to check.
		if (ZERO_SHA_PATTERN.test(record.localSha) || !record.remoteRef.startsWith(HEADS_PREFIX)) continue;

		branchNames.push(record.remoteRef.slice(HEADS_PREFIX.length));
	}

	return branchNames;
}

const command = createBaseCommand(
	scriptName,
	"1.0.0",
	"Checks branch names against the `<type>/<description>` convention.",
)
	.argument("[...branchNames:string]", "Branch names to check; reads git's pre-push refs from stdin when omitted.")
	.action(async (_options, ...branchNames) => {
		const names = branchNames.length > 0 ? branchNames : await readPushedBranchNamesAsync();
		const failures = new Array<{ readonly branchName: string; readonly problems: ReadonlyArray<string> }>();

		for (const branchName of names) {
			if (PREFIXLESS_BRANCHES.has(branchName)) continue;

			const problems = findBranchNameProblems(branchName);
			if (problems.length > 0) failures.push({ branchName, problems });
		}

		if (failures.length === 0) {
			// The hook runs on every push, so a clean stdin-mode run stays quiet.
			if (branchNames.length > 0) {
				for (const branchName of names) log.success(`"${branchName}" is a valid branch name`);
			}
			return;
		}

		for (const { branchName, problems } of failures) {
			log.fail(`branch name "${branchName}" is invalid`);
			for (const problem of problems) log.fail(`  - ${problem}`);
		}
		log.fail(`${failures.length} invalid branch name(s); rename with "git branch -m <old-name> <new-name>"`);
		exit(1);
	});

await command.parse(argv.slice(2));
