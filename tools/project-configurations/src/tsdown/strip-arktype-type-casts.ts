import { RolldownMagicString } from "rolldown";
import { parseSync, Visitor } from "rolldown/utils";

import type { Plugin } from "rolldown";
import type { ESTree } from "rolldown/utils";

/**
 * Arktype methods that only change the inferred type. At runtime they
 * `return this` (see `BaseRoot` in `@ark/schema/out/roots/root.js`).
 * `brand("")` throws, so `brand` is only removed for a non-empty string
 * literal.
 */
const IDENTITY_METHODS = new Set(["as", "brand", "readonly"]);

/** `Type` methods that return another `Type`. */
const TYPE_RETURNING_METHODS = new Set([
	"and",
	"array",
	"as",
	"brand",
	"configure",
	"describe",
	"exclude",
	"extract",
	"filter",
	"keyof",
	"merge",
	"narrow",
	"omit",
	"onDeepUndeclaredKey",
	"onUndeclaredKey",
	"or",
	"partial",
	"pick",
	"pipe",
	"readonly",
	"required",
	"to",
]);

/** Static members of `type` that return a `Type` when called. */
const TYPE_RETURNING_STATICS = new Set([
	"and",
	"enumerated",
	"instanceOf",
	"merge",
	"or",
	"pipe",
	"raw",
	"Record",
	"unit",
	"valueOf",
]);

const ARKTYPE_IMPORT = /["']arktype["']/u;
const CANDIDATE_CALL = /\.\s*(?:as|brand|readonly)\b/u;
const NODE_MODULES = /[/\\]node_modules[/\\]/u;

type Pattern = ESTree.BindingPattern | ESTree.BindingRestElement | ESTree.ParamPattern;

function* getPatternNames(pattern: null | Pattern): Generator<string> {
	if (pattern === null) return;

	switch (pattern.type) {
		case "ArrayPattern": {
			for (const element of pattern.elements) {
				yield* getPatternNames(element);
			}

			break;
		}

		case "AssignmentPattern": {
			yield* getPatternNames(pattern.left);
			break;
		}

		case "Identifier": {
			yield pattern.name;
			break;
		}

		case "ObjectPattern": {
			for (const property of pattern.properties) {
				yield* getPatternNames(property.type === "RestElement" ? property : property.value);
			}

			break;
		}

		case "RestElement": {
			yield* getPatternNames(pattern.argument);
			break;
		}

		case "TSParameterProperty": {
			yield* getPatternNames(pattern.parameter);
			break;
		}

		default:
	}
}

/**
 * Counts every declaration of each name in the module, so that a binding
 * shadowed anywhere is never trusted to be arktype's.
 *
 * @param program - The module to scan.
 * @returns How many times each name is declared.
 */
function countDeclarations(program: ESTree.Program): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();

	/**
	 * Records one declaration.
	 *
	 * @param name - The declared name, if the declaration has one.
	 */
	function add(name?: string): void {
		if (name !== undefined) {
			counts.set(name, (counts.get(name) ?? 0) + 1);
		}
	}

	/**
	 * Records every name in a binding pattern.
	 *
	 * @param pattern - The binding pattern whose names are declared.
	 */
	function addPattern(pattern: null | Pattern): void {
		for (const name of getPatternNames(pattern)) {
			add(name);
		}
	}

	/**
	 * Records a function name and its parameters.
	 *
	 * @param node - The function whose name and parameters are declared.
	 */
	function addFunction(node: ESTree.ArrowFunctionExpression | ESTree.Function): void {
		if (node.type !== "ArrowFunctionExpression") {
			add(node.id?.name);
		}

		for (const parameter of node.params) {
			addPattern(parameter);
		}
	}

	/**
	 * Records a class name.
	 *
	 * @param node - The class whose name is declared.
	 */
	function addClass(node: ESTree.Class): void {
		add(node.id?.name);
	}

	/**
	 * Records an import binding.
	 *
	 * @param node - The import specifier whose local name is declared.
	 */
	function addImport(node: ESTree.ImportDeclarationSpecifier): void {
		add(node.local.name);
	}

	new Visitor({
		ArrowFunctionExpression: addFunction,
		CatchClause(node) {
			addPattern(node.param);
		},
		ClassDeclaration: addClass,
		ClassExpression: addClass,
		FunctionDeclaration: addFunction,
		FunctionExpression: addFunction,
		ImportDefaultSpecifier: addImport,
		ImportNamespaceSpecifier: addImport,
		ImportSpecifier: addImport,
		TSDeclareFunction: addFunction,
		VariableDeclarator(node) {
			addPattern(node.id);
		},
	}).visit(program);

	return counts;
}

interface ArktypeBindings {
	/** Local names bound to arktype's `type` export. */
	readonly typeFunctions: ReadonlySet<string>;
	/** Local names bound to a `Type` instance. */
	readonly typeValues: Set<string>;
}

function unwrapExpression(expression: ESTree.Expression): ESTree.Expression {
	let current = expression;
	while (
		current.type === "ParenthesizedExpression" ||
		current.type === "TSAsExpression" ||
		current.type === "TSNonNullExpression" ||
		current.type === "TSSatisfiesExpression"
	) {
		current = current.expression;
	}

	return current;
}

function getStaticMemberName(expression: ESTree.Expression): string | undefined {
	return expression.type === "MemberExpression" && !expression.computed && expression.property.type === "Identifier"
		? expression.property.name
		: undefined;
}

function isTypeCall(call: ESTree.CallExpression, bindings: ArktypeBindings): boolean {
	const callee = unwrapExpression(call.callee);
	if (callee.type === "Identifier") return bindings.typeFunctions.has(callee.name);

	const methodName = getStaticMemberName(callee);
	if (methodName === undefined || callee.type !== "MemberExpression") return false;

	const receiver = unwrapExpression(callee.object);
	if (receiver.type === "Identifier" && bindings.typeFunctions.has(receiver.name)) {
		return TYPE_RETURNING_STATICS.has(methodName);
	}

	return TYPE_RETURNING_METHODS.has(methodName) && isTypeExpression(receiver, bindings);
}

function isTypeExpression(node: ESTree.Expression | null, bindings: ArktypeBindings): boolean {
	if (node === null) return false;
	const expression = unwrapExpression(node);
	if (expression.type === "Identifier") return bindings.typeValues.has(expression.name);
	return expression.type === "CallExpression" && isTypeCall(expression, bindings);
}

function getImportedName(specifier: ESTree.ImportSpecifier): string {
	return specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value;
}

function isTypeFunctionImport(specifier: ESTree.ImportDeclarationSpecifier): specifier is ESTree.ImportSpecifier {
	return (
		specifier.type === "ImportSpecifier" && specifier.importKind !== "type" && getImportedName(specifier) === "type"
	);
}

function getTypeFunctionNames(program: ESTree.Program, isUnshadowed: (name: string) => boolean): ReadonlySet<string> {
	const names = new Set<string>();
	for (const statement of program.body) {
		if (statement.type !== "ImportDeclaration" || statement.importKind === "type") continue;
		if (statement.source.value !== "arktype") continue;

		for (const specifier of statement.specifiers) {
			if (isTypeFunctionImport(specifier) && isUnshadowed(specifier.local.name)) {
				names.add(specifier.local.name);
			}
		}
	}

	return names;
}

function getTopLevelConstDeclarators(program: ESTree.Program): Array<ESTree.VariableDeclarator> {
	const declarators = new Array<ESTree.VariableDeclarator>();
	for (const topLevelStatement of program.body) {
		const statement =
			topLevelStatement.type === "ExportNamedDeclaration" ? topLevelStatement.declaration : topLevelStatement;

		if (statement?.type !== "VariableDeclaration" || statement.kind !== "const") continue;

		for (const declarator of statement.declarations) {
			declarators.push(declarator);
		}
	}

	return declarators;
}

function getArktypeBindings(program: ESTree.Program): ArktypeBindings {
	const declarationCounts = countDeclarations(program);

	function isUnshadowed(name: string): boolean {
		return declarationCounts.get(name) === 1;
	}

	const bindings: ArktypeBindings = {
		typeFunctions: getTypeFunctionNames(program, isUnshadowed),
		typeValues: new Set(),
	};

	if (bindings.typeFunctions.size === 0) return bindings;

	// Read in source order, so a `Type` built from an earlier one is
	// recognized too.
	for (const declarator of getTopLevelConstDeclarators(program)) {
		const { id, init } = declarator;
		if (id.type === "Identifier" && isUnshadowed(id.name) && isTypeExpression(init, bindings)) {
			bindings.typeValues.add(id.name);
		}
	}

	return bindings;
}

function isBrandName(argument?: ESTree.Argument): boolean {
	if (argument?.type !== "Literal") return false;
	// oxlint-disable-next-line small-rules/no-useless-empty-string-comparison -- nullable.
	return argument.value !== "" && Object.prototype.toString.call(argument.value) === "[object String]";
}

/**
 * Gets the receiver of a call that only exists for the type checker.
 *
 * @param call - The call to check.
 * @param bindings - The module's arktype bindings.
 * @returns The receiver to keep, or `undefined` if the call must stay.
 */
function getStrippableReceiver(call: ESTree.CallExpression, bindings: ArktypeBindings): ESTree.Expression | undefined {
	const { callee } = call;
	if (call.optional || callee.type !== "MemberExpression" || callee.optional) return undefined;

	const methodName = getStaticMemberName(callee);
	if (methodName === undefined || !IDENTITY_METHODS.has(methodName)) return undefined;

	const hasIdentityArguments =
		methodName === "brand"
			? call.arguments.length === 1 && isBrandName(call.arguments[0])
			: call.arguments.length === 0;

	if (!hasIdentityArguments) return undefined;

	return isTypeExpression(callee.object, bindings) ? callee.object : undefined;
}

/**
 * Removes arktype calls that only exist for the type checker, such as
 * `.readonly()`, `.as<T>()`, and `.brand("name")`. Each one returns its
 * receiver unchanged at runtime, so `type(...).readonly()` becomes `type(...)`.
 *
 * Only calls on a receiver provably built from arktype's `type` export in the
 * same module are touched, so a `.readonly()` from another library (which may
 * do real work, like zod's `Object.freeze`) is left alone.
 *
 * @returns The rolldown plugin.
 */
export function stripArktypeTypeCasts(): Plugin {
	return {
		name: "howmanysmall:strip-arktype-type-casts",
		transform: {
			filter: {
				id: { exclude: [NODE_MODULES] },
				code: { include: [ARKTYPE_IMPORT] },
				moduleType: ["js", "jsx", "ts", "tsx"],
			},
			// oxlint-disable-next-line small-rules/starts-with-verb -- rolldown names this hook.
			handler(code, id, meta): undefined | { code: RolldownMagicString } {
				if (!CANDIDATE_CALL.test(code)) return undefined;

				const lang =
					meta.moduleType === "jsx" || meta.moduleType === "ts" || meta.moduleType === "tsx"
						? meta.moduleType
						: "js";
				const { program } = parseSync(id, code, { lang });
				const bindings = getArktypeBindings(program);
				if (bindings.typeFunctions.size === 0) return undefined;

				const magicString = new RolldownMagicString(code, { filename: id });
				// Nested calls are removed independently because their ranges
				// never overlap: `a.readonly().or(b).readonly()` removes
				// `.readonly()` after `a` and after `.or(b)`.
				new Visitor({
					CallExpression(call) {
						const receiver = getStrippableReceiver(call, bindings);
						if (receiver !== undefined) {
							magicString.remove(receiver.end, call.end);
						}
					},
				}).visit(program);

				return magicString.hasChanged() ? { code: magicString } : undefined;
			},
		},
	};
}
