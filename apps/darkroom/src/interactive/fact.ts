/** A labelled value in a detail pane, like a run's cost or a model's price. */
export interface Fact {
	/** Shows the value dimmed, for details like IDs. */
	readonly isQuiet?: boolean | undefined;
	readonly label: string;
	readonly value: string;
}
