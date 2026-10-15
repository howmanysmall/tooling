import type { LiteralUnion } from "type-fest";

export type LogicalOperator = LiteralUnion<"and" | "or", string>;

export function formatArrayAsEnglishList(
	array: ReadonlyArray<string>,
	logicalOperator: LogicalOperator = "and",
): string {
	return `${array.slice(0, -1).join(", ")}, ${logicalOperator} ${array.at(-1)}`;
}
