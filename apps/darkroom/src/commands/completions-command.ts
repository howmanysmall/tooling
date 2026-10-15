import { Command } from "@cliffy/command";
import { CompletionsCommand, generateShellCompletions } from "@cliffy/command/completions";

import { injectCompletionContext, Shell } from "$utilities/completion-context";

function createShellCommand(shell: Shell, sourceHint: string): Command {
	const command: Command = new Command()
		.description(
			`Generate shell completions for ${shell}.\n\nTo enable them, add this to your shell's startup file:\n\n    ${sourceHint}`,
		)
		.noGlobals()
		.action(async () => {
			const root = command.getMainCommand();
			await root.loadCommandTree();
			const script = generateShellCompletions(root, shell);
			console.log(injectCompletionContext(script, shell, root.getName()));
		});
	return command;
}

/**
 * Cliffy's completions command, with scripts that also tell darkroom what is
 * already on the command line. That lets `-a` offer only the chosen model's
 * aspect ratios.
 */
export const completionsCommand = new CompletionsCommand();
completionsCommand.command("bash", createShellCommand(Shell.Bash, "source <(darkroom completions bash)"), {
	override: true,
});
completionsCommand.command("fish", createShellCommand(Shell.Fish, "source (darkroom completions fish | psub)"), {
	override: true,
});
completionsCommand.command("zsh", createShellCommand(Shell.Zsh, "source <(darkroom completions zsh)"), {
	override: true,
});
