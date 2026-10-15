import { env, stdout } from "node:process";

// ansis turns colour on from COLORTERM even when stdout is a pipe, so data
// piped into another program would carry escape codes. Unless the user forces
// colour, turn it off when stdout is not a terminal. This module must be
// imported before anything that loads ansis.
// biome-ignore lint/style/noProcessEnv: this runs before any environment schema, by design.
if (!stdout.isTTY && env.FORCE_COLOR === undefined) env.NO_COLOR ??= "1";
