import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";

import { RunDeletion } from "$history/delete-run";
import { createHistoryStore } from "$history/history-store";

import { createSessionServices } from "./session-services";

import type { GenerationResult } from "$generation/run-generation";

async function existsAsync(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function deleteSavedAsync(directory: string, deletion: RunDeletion): Promise<boolean> {
	const saved = nodePath.join(directory, `${deletion}.png`);
	await writeFile(saved, "png");
	const services = createSessionServices(createHistoryStore(nodePath.join(directory, "history")));
	const result = fromPartial<GenerationResult>({
		id: "01M4YVAAAAAAAAAAAAAAAAAAA1",
		images: [{ mediaType: "image/png", path: saved }],
	});
	await services.deleteRunAsync(result, deletion);
	return existsAsync(saved);
}

describe("deleteRunAsync", () => {
	it("keeps your saved image unless asked to delete the files too", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const directory = await mkdtemp(nodePath.join(tmpdir(), "darkroom-delete-"));
		onTestFinished(async () => rm(directory, { force: true, recursive: true }));

		await expect(deleteSavedAsync(directory, RunDeletion.History)).resolves.toBe(true);
		await expect(deleteSavedAsync(directory, RunDeletion.Files)).resolves.toBe(false);
	});
});
