export const enum CursorMoveType {
	Move = 1,
	To = 2,
	First = 3,
	Last = 4,
}

export const enum BrowserActionType {
	StepBatch = 5,
	Filter = 6,
	Removed = 7,
	Select = 8,
	Mode = 9,
	CancelFilter = 10,
}

export const enum StatusActionType {
	StatusExpired = 11,
	Status = 12,
}

export const enum ModelBrowserActionType {
	Filter = 13,
	Select = 14,
	Filtering = 15,
	CancelFilter = 16,
	NextSort = 17,
	SwitchExample = 18,
}

export const enum EditorActionType {
	Clear = 1,
	DeleteBackward = 2,
	DeleteForward = 3,
	DeleteToEnd = 4,
	DeleteToStart = 5,
	DeleteWord = 6,
	Down = 7,
	Insert = 8,
	Left = 9,
	LineEnd = 10,
	LineStart = 11,
	Right = 12,
	Up = 13,
	WordLeft = 14,
	WordRight = 15,
}
