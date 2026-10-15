/** A one-line footer message, such as a copied ID or a failure. */
export interface StatusMessage {
	readonly text: string;
	readonly tone: "error" | "success";
}
