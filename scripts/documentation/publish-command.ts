import { cwd, stdin, stdout } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { cancel, confirm, intro, isCancel, log, note, outro, select, text } from "@clack/prompts";
import { isNumber, isString } from "@howmanysmall/arktype-utilities";
import { CliError } from "@howmanysmall/cli-utilities/cli-error";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name";
import { DOCUMENTATION_ORIGIN, REPOSITORY_PATH } from "@howmanysmall/documentation-theme/site";
import { type } from "arktype";
import { exec } from "tinyexec";

import { getSitesAsync } from "./documentation-sites";

import type { DocumentationSiteEntry } from "./documentation-sites";

const scriptName = getScriptName(true);

const WORKFLOW = "documentation.yaml";
const RUN_LOOKUP_ATTEMPTS = 15;
const RUN_LOOKUP_INTERVAL_MS = 2000;
const TAG_LIMIT = 6;
const COMMIT_REGEXP = /^[\da-f]{7,40}$/u;

const isRunList = type({
	createdAt: isString,
	databaseId: isNumber,
	url: isString,
}).array();
const parseJson = type("string.json.parse");

/** A git ref someone might publish from. */
interface RefChoice {
	/** What it is, such as the commit it points at. */
	readonly hint: string;
	/** The branch or tag name. */
	readonly ref: string;
}

/** A workflow run on GitHub. */
interface WorkflowRun {
	readonly id: number;
	/** The run's page on GitHub. */
	readonly url: string;
}

/** How `publish` was asked to run. */
interface PublishOptions {
	readonly dryRun: boolean;
	/** Whether someone is at a terminal to answer questions. */
	readonly interactive: boolean;
	readonly watch: boolean;
	readonly yes: boolean;
}

/**
 * Runs a command and returns what it printed, trimmed.
 *
 * @param command - The program to run.
 * @param parameters - The arguments to pass it.
 * @returns What it wrote to stdout.
 * @rejects When the command exits with an error.
 */
async function readCommandAsync(command: string, parameters: ReadonlyArray<string>): Promise<string> {
	const { stdout: output } = await exec(command, parameters, { throwOnError: true });
	return output.trim();
}

/**
 * Works out which refs to offer: the default branch, then the newest release
 * tags.
 *
 * @returns The refs, newest first after the branch.
 */
async function getRefChoicesAsync(): Promise<Array<RefChoice>> {
	const [branch, tags] = await Promise.all([
		readCommandAsync("git", ["log", "-1", "--format=%h %s", "origin/main"]),
		readCommandAsync("git", ["tag", "--list", "*@*", "--sort=-creatordate"]),
	]);
	const releases = tags
		.split("\n")
		.filter((tag) => tag.length > 0)
		.slice(0, TAG_LIMIT)
		.map((tag) => ({ hint: "release", ref: tag }));

	return [{ hint: branch, ref: "main" }, ...releases];
}

/**
 * Asks which ref to publish from.
 *
 * @returns The chosen branch, tag, or commit.
 * @rejects When the question is canceled.
 */
async function askRefAsync(): Promise<string> {
	const choices = await getRefChoicesAsync();
	const answer = await select({
		message: "Publish from which ref?",
		options: [
			...choices.map(({ hint, ref }) => ({ hint, label: ref, value: ref })),
			{ hint: "a branch, tag, or commit", label: "Another ref…", value: "" },
		],
	});

	if (isCancel(answer)) {
		throw new CliError("Canceled.", 130);
	}

	if (answer.length > 0) return answer;

	const typed = await text({
		message: "Which ref?",
		validate: (value) => ((value ?? "").trim().length === 0 ? "Type a branch, tag, or commit." : undefined),
	});

	if (isCancel(typed)) {
		throw new CliError("Canceled.", 130);
	}

	return typed.trim();
}

/**
 * Checks that the ref is something GitHub can check out.
 *
 * @param ref - A branch, tag, or commit.
 * @rejects When origin has no branch or tag by that name.
 */
async function assertRefExistsAsync(ref: string): Promise<void> {
	if (COMMIT_REGEXP.test(ref)) return;

	const remote = await exec("git", ["ls-remote", "--exit-code", "origin", ref]);
	if (remote.exitCode !== 0) {
		throw new CliError(`origin has no branch or tag named ${ref}. Push it first.`, 1);
	}
}

/**
 * Checks that GitHub Pages is on and deploys from Actions, and offers to turn
 * it on when it isn't.
 *
 * @param repository - The repository, as `owner/name`.
 * @param options - How `publish` was asked to run.
 * @rejects When Pages is off and stays off, or builds from a branch.
 */
async function ensurePagesAsync(repository: string, options: PublishOptions): Promise<void> {
	const result = await exec("gh", ["api", `repos/${repository}/pages`, "--jq", ".build_type"]);
	if (result.exitCode === 0) {
		if (result.stdout.trim() === "workflow") return;
		throw new CliError(`GitHub Pages for ${repository} builds from a branch. Set its source to GitHub Actions.`, 1);
	}

	if (!options.yes) {
		if (!options.interactive) {
			throw new CliError(`GitHub Pages is off for ${repository}. Run this on a terminal, or pass --yes.`, 2);
		}

		const answer = await confirm({
			message: `GitHub Pages is off for ${repository}. Turn it on, deploying from Actions?`,
		});

		if (answer !== true) {
			throw new CliError("GitHub Pages is off, so there is nowhere to publish.", 1);
		}
	}

	await exec("gh", ["api", "--method", "POST", `repos/${repository}/pages`, "-f", "build_type=workflow"], {
		throwOnError: true,
	});
	log.success(`Turned on GitHub Pages for ${repository}.`);
}

/**
 * Asks GitHub for a workflow run that started after a dispatch.
 *
 * @param startedAt - When the dispatch was sent.
 * @returns The run, when GitHub lists one.
 */
async function findRunSinceAsync(startedAt: Date): Promise<undefined | WorkflowRun> {
	const listed = await readCommandAsync("gh", [
		"run",
		"list",
		"--workflow",
		WORKFLOW,
		"--event",
		"workflow_dispatch",
		"--limit",
		"5",
		"--json",
		"databaseId,createdAt,url",
	]);
	const runs = isRunList.assert(parseJson.assert(listed));
	const run = runs.find(({ createdAt }) => new Date(createdAt) >= startedAt);
	return run === undefined ? undefined : { id: run.databaseId, url: run.url };
}

/**
 * Finds the workflow run that a dispatch just started. GitHub lists a run a
 * few seconds after the dispatch, so this asks again until it appears.
 *
 * @param startedAt - When the dispatch was sent.
 * @returns The run, or `undefined` when GitHub never listed it.
 */
async function findDispatchedRunAsync(startedAt: Date): Promise<undefined | WorkflowRun> {
	for (let attempt = 0; attempt < RUN_LOOKUP_ATTEMPTS; attempt += 1) {
		// oxlint-disable-next-line no-await-in-loop -- each try follows the last
		const run = await findRunSinceAsync(startedAt);
		if (run !== undefined) return run;
		// oxlint-disable-next-line no-await-in-loop -- the wait between tries
		await delay(RUN_LOOKUP_INTERVAL_MS);
	}

	return undefined;
}

/**
 * Asks before publishing, unless `--yes` was passed.
 *
 * @param count - How many sites will be published.
 * @param options - How `publish` was asked to run.
 * @returns Whether to go ahead.
 */
async function confirmPublishAsync(count: number, options: PublishOptions): Promise<boolean> {
	if (options.yes) return true;

	const sites = count === 1 ? "this site" : `these ${count} sites`;
	const answer = await confirm({ message: `Publish ${sites}?` });
	return !isCancel(answer) && answer;
}

/**
 * Starts the documentation workflow and follows it until it finishes.
 *
 * @param dispatch - The `gh` arguments that start the workflow.
 * @param sites - The sites it publishes.
 * @param options - How `publish` was asked to run.
 * @rejects When the workflow can't start, or fails while being followed.
 */
async function dispatchAsync(
	dispatch: ReadonlyArray<string>,
	sites: ReadonlyArray<DocumentationSiteEntry>,
	options: PublishOptions,
): Promise<void> {
	// Allow for clock drift between this machine and GitHub.
	const startedAt = new Date(Date.now() - 5000);
	await exec("gh", dispatch, { throwOnError: true });
	const run = await findDispatchedRunAsync(startedAt);
	if (run === undefined) {
		log.warn(`Started the workflow, but GitHub hasn't listed the run yet. See: gh run list --workflow ${WORKFLOW}`);
		return;
	}

	log.info(`Workflow run: ${run.url}`);

	if (!options.watch) return;

	await exec("gh", ["run", "watch", String(run.id), "--exit-status"], {
		nodeOptions: { stdio: "inherit" },
		throwOnError: true,
	});
	const urls = sites.map(({ url }) => url);
	if (options.interactive) {
		outro(`Published. ${urls.join("  ")}`);
	} else {
		stdout.write(`${urls.join("\n")}\n`);
	}
}

/**
 * Publishes every documentation site from one ref.
 *
 * @param givenRef - The ref from `--ref`, if any.
 * @param options - How `publish` was asked to run.
 * @rejects When something stops the publish, with a message saying what.
 */
async function publishAsync(givenRef: string | undefined, options: PublishOptions): Promise<void> {
	if (!options.interactive && !options.yes) {
		throw new CliError("Not on a terminal, so there is no one to ask. Pass --yes.", 2);
	}

	const sites = await getSitesAsync(cwd());

	if (options.interactive) {
		intro("Publish the documentation");
	}

	const fallbackRef = options.yes ? "main" : undefined;
	const ref = givenRef ?? fallbackRef ?? (await askRefAsync());
	await assertRefExistsAsync(ref);

	if (options.interactive) {
		const summary = sites.map(({ name, url }) => `${name}  ${url}`).join("\n");
		note(summary, `From ${ref}, to ${DOCUMENTATION_ORIGIN}${REPOSITORY_PATH}/`);
	}

	// The workflow file always comes from main; `ref` picks what it builds.
	const dispatch = ["workflow", "run", WORKFLOW, "--ref", "main", "-f", `ref=${ref}`];
	if (options.dryRun) {
		stdout.write(`gh ${dispatch.join(" ")}\n`);

		if (options.interactive) {
			outro("Dry run: nothing was started.");
		}

		return;
	}

	const repository = await readCommandAsync("gh", [
		"repo",
		"view",
		"--json",
		"nameWithOwner",
		"--jq",
		".nameWithOwner",
	]);

	await ensurePagesAsync(repository, options);

	if (!(await confirmPublishAsync(sites.length, options))) {
		cancel("Nothing was published.");
		return;
	}

	await dispatchAsync(dispatch, sites, options);
}

export const publishCommand = createBaseCommand(
	scriptName,
	undefined,
	"Publish the documentation sites to GitHub Pages, by running the documentation workflow.",
)
	.option("-r, --ref <ref:string>", "The branch, tag, or commit to build. Asks when not given.")
	.option("-y, --yes", "Publish without asking. Without --ref, publishes main.")
	.option("--no-watch", "Return once the workflow starts, instead of following it.")
	.option("--dry-run", "Show what would be published without starting anything.")
	.action(async ({ dryRun = false, ref, watch, yes = false }) => {
		const interactive = stdin.isTTY && stdout.isTTY;
		await publishAsync(ref, { dryRun, interactive, watch, yes });
	});
