import { readFile } from "node:fs/promises";

export async function readEnvironmentFileAsync(environmentFile: string): Promise<string | undefined> {
	try {
		return await readFile(environmentFile, "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
		throw error;
	}
}
