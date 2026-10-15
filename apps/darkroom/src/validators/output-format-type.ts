import { EnumType } from "@cliffy/command";

export const enum OutputFormat {
	Json = "json",
	JsonMinified = "json-minified",
	Pretty = "pretty",
	Table = "table",
}

export const outputFormatType = new EnumType([
	OutputFormat.Json,
	OutputFormat.JsonMinified,
	OutputFormat.Pretty,
	OutputFormat.Table,
]);
