/**
 * What a fact's value too long for its pane does: `truncate-middle` keeps
 * both ends of a path; `wrap` continues under itself, for lists of choices.
 */
export type FactOverflow = "truncate-middle" | "wrap";
