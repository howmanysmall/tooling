import { RuleConfigSeverity } from "@commitlint/types";
import { commitTypes } from "@howmanysmall/lint-configurations/constants";

import type { UserConfig } from "@commitlint/types";

const configuration: UserConfig = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"header-max-length": [RuleConfigSeverity.Error, "always", 72],
		"scope-case": [RuleConfigSeverity.Error, "always", "lower-case"],
		"subject-empty": [RuleConfigSeverity.Error, "never"],
		"subject-full-stop": [RuleConfigSeverity.Error, "never", "."],
		"type-case": [RuleConfigSeverity.Error, "always", "lower-case"],
		"type-enum": [RuleConfigSeverity.Error, "always", commitTypes],
	},
};

export default configuration;
