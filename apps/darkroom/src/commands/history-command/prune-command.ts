import { stderr, stdin } from "node:process";
import { ValidationError } from "@cliffy/command";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import prettyBytes from "pretty-bytes";

import { InterruptedError } from "$errors/interrupted-error";
import { log } from "$generation/cli-runner";
import { formatHistoryList } from "$history/format-history";
import { deleteAsync, getRunSizeAsync, readAllAsync } from "$history/history-store";
import { selectForPrune, toPruneCriteria } from "$history/prune-selection";
import { OutputFormat } from "$validators/output-format-type";

import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";
import type { PruneFlags } from "$history/prune-selection";

const scriptName = getScriptName(true);

interface PruneCommandFlags extends PruneFlags {
	readonly dryRun?: true | undefined;
	readonly yes?: true | undefined;
}

function warn(message: string): void {
	log.warn(message);
}

async function confirmAsync(count: number): Promise<boolean> {
	if (!stdin.isTTY || !stderr.isTTY) {
		throw new ValidationError("Pass --yes to delete runs when not running in a terminal.");
	}
	const { confirm, isCancel } = await import("@clack/prompts");
	const answer = await confirm({ message: `Delete ${count} ${toPlural(count, "run")}?`, output: stderr });
	if (isCancel(answer)) throw new InterruptedError("Cancelled.");
	return answer;
}

async function getSizesAsync(store: HistoryStore, entries: ReadonlyArray<HistoryEntry>): Promise<Map<string, number>> {
	const sizes = await Promise.all(
		entries.map(async (entry) => [entry.id, await getRunSizeAsync(store, entry.id)] as const),
	);
	return new Map(sizes);
}

function sumSizes(sizes: ReadonlyMap<string, number>, ids: Iterable<string>): number {
	let total = 0;
	for (const id of ids) total += sizes.get(id) ?? 0;
	return total;
}

async function deleteRunsAsync(
	store: HistoryStore,
	doomed: ReadonlyArray<HistoryEntry>,
	freed: string,
	flags: PruneCommandFlags,
): Promise<void> {
	const listing = formatHistoryList(doomed, OutputFormat.Pretty);
	const noun = toPlural(doomed.length, "run");
	if (flags.dryRun === true) {
		console.log(listing);
		log.info(`Would delete ${doomed.length} ${noun} and free ${freed}.`);
		return;
	}

	stderr.write(`${listing}\n`);
	if (flags.yes !== true && !(await confirmAsync(doomed.length))) {
		log.info("Nothing deleted.");
		return;
	}
	const removed = await deleteAsync(store, new Set(doomed.map((entry) => entry.id)), warn);
	log.success(`Deleted ${removed} ${toPlural(removed, "run")} and freed ${freed}.`);
}

export const pruneCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	"Delete old runs and their images. With no flags, report the history's size.",
)
	.option("--older-than <duration:string>", "Delete runs older than this, like 30d or 12h.")
	.option("--keep <count:integer>", "Keep only the newest this many runs.")
	.option("--max-size <size:string>", "Delete the oldest runs until the history fits, like 2GB.")
	.option("-y, --yes", "Delete without asking.")
	.option("--dry-run", "List what would be deleted without deleting it.")
	.action(async (flags) => {
		const criteria = toPruneCriteria(flags);
		const { getHistoryStore } = await import("$generation/cli-runner");
		const store = getHistoryStore();
		const entries = await readAllAsync(store, warn);
		const sizes = await getSizesAsync(store, entries);

		if (criteria === undefined) {
			const total = prettyBytes(sumSizes(sizes, sizes.keys()));
			console.log(`${entries.length} ${toPlural(entries.length, "run")} · ${total} · ${store.root}`);
			return;
		}

		const selected = selectForPrune(entries, sizes, criteria, Date.now());
		if (selected.size === 0) {
			log.info("Nothing to prune.");
			return;
		}
		const doomed = entries.filter((entry) => selected.has(entry.id)).toReversed();
		await deleteRunsAsync(store, doomed, prettyBytes(sumSizes(sizes, selected)), flags);
	});
