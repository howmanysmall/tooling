# @pobammer-ts/darkroom

Generate images with any image model on [OpenRouter](https://openrouter.ai), compare models side by side, and keep every
run in a browsable history.

## Setup

Set `OPENROUTER_API_KEY`, in the environment or in a `.env` file. Commands that never call the API, such as
`--dry-run` and `history`, work without it.

| Variable | What it does |
| --- | --- |
| `OPENROUTER_API_KEY` | Your OpenRouter key, `sk-or-v1-…`. |
| `DARKROOM_MODEL` | The model to use when `-m` isn't given, and the one the prompt box starts with. |
| `DARKROOM_PREVIEW` | How to draw image previews: `kitty`, `blocks`, or `off`. Detected from the terminal by default. |

## The app

Run `darkroom` with no arguments to open the full-screen app. It has three tabs; `tab` cycles them, and outside the
prompt box `1`, `2`, and `3` jump to one. `ctrl+p` opens a command palette on every tab, and `?` lists every key.

Clicking a tab, a list row, or a palette entry chooses it, and the wheel scrolls the list under the pointer. A click
outside a dialog closes it. Since the app takes the mouse, it selects text itself: drag across the screen, and darkroom
lights up the cells and copies the text through OSC 52 when you let go.

- **generate**: a prompt box with the model and its price beneath it. Enter shows the request with its estimated cost
  and asks before anything is sent. `ctrl+o` picks another model, `ctrl+j` or `alt+enter` adds a line, and `ctrl+g`
  continues in a guided session to add reference images and settings. The box edits like a shell: `ctrl+a`/`ctrl+e`,
  `ctrl+w`, `ctrl+u`, and `ctrl+k` work.
- **the model picker** (`ctrl+o`) searches names the way fzf does and shows what each model can do beside its
  price. `tab` cycles the order between recent, price, name, and newest, and the chips filter to models that edit,
  make several images, or make transparent ones. The search also takes `@google` for a provider, `$0.02` for a top
  price per image, and `+edits`, `+several`, or `+transparent`.
- **editing**: once a session has an image, the next prompt edits it: the newest image goes to the model as a
  reference, and the prompt box reads `Edit ◧ <file>`. Clicking an image or its path opens its actions. Editing it
  instead branches from there, and the others copy the picture itself or its path, or open it. `shift+tab` switches to `New`,
  which starts fresh. A model that can't take images says so, `ctrl+o` then lists only models that can, and a request
  sent anyway starts fresh with a warning first.
- **sessions**: each conversation of prompts is a session, and the open ones are tabs over the prompt box, named by
  their first prompt. A tab shows a spinner while it generates and a dot when it finishes out of sight. `ctrl+n` or `+`
  opens a new session, `alt+↑` and `alt+↓` switch, and `ctrl+s` lists past sessions to resume. Closing a tab, with its
  `✕` or from the palette, keeps the session in the history. Open tabs come back the next time the app starts.
  Clicking a prompt opens its actions: rewind to before it and edit it again, fork, which does the same in a new tab,
  use it again, or copy it. Rewinding never deletes anything: the session as it was stays in the list, and forks are marked
  `⑂` there. When the app closes, it prints how to resume the session on screen.
  `darkroom -c` resumes the session you used last, and `darkroom -s <id>` resumes one by a prefix of its ID.
- **history**: every past run with its image, prompt, settings, and cost. Enter opens the images, `r` re-runs, `y`
  copies the ID, `d` deletes, and `/` filters. A comparison is one row, and `←` and `→` step through its models.
- **models**: every image model with its price, the options it takes, and an example image: your newest one from that
  model, or the one included with darkroom (`e` switches). `s` sorts, `/` filters, and Enter takes the model to the
  prompt box.

`darkroom history browse` and `darkroom models list` open the app on their tab. When piped, or with `--format`, they
print instead.

## Commands

```sh
darkroom generate "a red fox in snow" -m google/gemini-2.5-flash-image
darkroom generate - --dry-run < prompt.txt
darkroom compare "a lighthouse at dusk" -m black-forest-labs/flux-3-image -m openai/gpt-image-1
darkroom models list --refs --sort price
darkroom history rerun last -n 2
```

- `generate` writes the saved paths to stdout and progress and costs to stderr, so it composes with other tools. `-i`
  adds reference images, from paths or URLs.
- `compare` generates one prompt with several models into one folder. It shows the estimated total first and asks
  before spending; `--yes` skips the question.
- `history` lists, shows, opens, re-runs, and prunes past runs. Run IDs accept a unique prefix, `last`, or `last~N`.
- `models` lists and filters models with their prices, and `models get` shows one in full.
- `cache` refreshes the cached models, prices, and shell completions.

A paid request is sent once, without automatic retries, and each image is copied into the history before
anything else can fail. Estimates use published prices, or what a model has cost you before when it charges by the
token.

Run `darkroom --help`, or `--help` on any command, for every flag. The built binary runs on Bun primarily. The code
only uses Node APIs, so `node dist/cli.js` works too.

## Agent tools

`darkroom mcp` serves darkroom's tools over stdio to Model Context Protocol clients such as Claude Code:

```json
{ "mcpServers": { "darkroom": { "command": "darkroom", "args": ["mcp"] } } }
```

Put `OPENROUTER_API_KEY` in the server's environment. `DARKROOM_MODEL` picks the model when `generate-image` names
none. Relative paths resolve against the directory the client starts the server in.

| Tool             | Does                                                               | Paid |
| ---------------- | ------------------------------------------------------------------ | ---- |
| `list-models`    | Lists and filters models with their price and limits.              |      |
| `get-model`      | Shows one model's parameters and prices.                           |      |
| `estimate-cost`  | Validates a request for one or more models and estimates the cost. |      |
| `generate-image` | Generates images with one model.                                   | Yes  |
| `compare-models` | Generates one prompt with two or more models into one folder.      | Yes  |
| `list-history`   | Lists past runs, newest first.                                     |      |
| `show-run`       | Shows one run's settings, files, and related runs.                 |      |
| `rerun`          | Repeats a past run, with any field overridden.                     | Yes  |

Paid tools take an optional `maxCost` in dollars and refuse any request whose estimate exceeds it. When darkroom can't
price a request, the tool refuses it unless the call sets `allowUnknownCost`. The calling model picks both values. The
limit catches its mistakes but can't overrule it. Your client's approval prompt keeps the final say with you.

Results list the saved paths and include a small preview of each image. The stdio transport can't cancel a call. A
generation the client cancels still runs to the end, and darkroom records it in the history as it does after Ctrl-C.

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@pobammer-ts/darkroom`.

| Script | What it does |
| --- | --- |
| `build` | Bundles `src/` into `dist/` with tsdown. |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsc --build`. |

### Example images

The models tab shows an example for every model, built from a `darkroom compare` run and stored in `examples/`. After
comparing new models, rebuild them from the comparison's folder:

```sh
bun apps/darkroom/scripts/build-examples.ts <compare folder>
```

## Release

From the repository root:

```sh
node --run release -- darkroom [patch|minor|major|<version>]
```
