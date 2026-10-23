import packageJson from "$package" with { type: "json" };

export const description = packageJson.description satisfies string;
export const name = packageJson.name satisfies string;
export const version = packageJson.version satisfies string;
