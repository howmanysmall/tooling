import envPaths from "env-paths";

import { name } from "$constants";
import { makeStringSafeForPath } from "$utilities/path-utilities";

export const environmentPaths = envPaths(makeStringSafeForPath(name));
