# Contributing

Thanks for your interest in improving Game Pass Search. This is a side project built for personal use that got open-sourced, so contributions are welcome but there are no strict timelines or obligations on either side.

## What this project is

A local desktop app that lets you browse and filter the Xbox Game Pass catalog faster than the official website. It pulls data directly from Microsoft's catalog API, runs an on-device AI model to classify games into useful tags, and stores everything in a local SQLite database.

## What would be useful

**Bug reports**
If something crashes, shows wrong data, or behaves unexpectedly, open an issue with your OS version, the steps to reproduce, and any error output from the terminal. Screenshots help.

**Catalog data accuracy**
The AI genre classification is not perfect. If a game is obviously miscategorized (a racing game tagged as Strategy, etc.), open an issue with the game name and what the correct tags should be. If you have ideas for improving the classification prompt or model choice, a PR with a benchmark showing improvement is very welcome.

**New filter types**
If there is a filter that would genuinely help you find games (player count, ESRB rating, average play time), open an issue describing the use case before building it. Some filters require data that is not in the Microsoft catalog API.

**Design and UX**
The current design is intentional (VT323 pixel aesthetic, arcade feel) but layout issues, accessibility problems, or broken responsiveness are worth fixing.

**Platform support**
The app has only been tested on Windows. If you get it running on macOS or Linux, a PR documenting the steps and fixing any issues is very welcome.

## How to set up locally

```bash
git clone https://github.com/noorgx/gamepass-search
cd gamepass-search
npm install --ignore-scripts
npm run rebuild
npm run dev
```

The test suite covers the Express routes, SQLite schema, sync logic, and React hooks:

```bash
npm test
```

## Pull request guidelines

- Keep PRs focused on one thing. A PR that fixes a bug and also refactors unrelated code is harder to review.
- If you are adding a new feature, open an issue first to discuss whether it fits.
- The test suite must pass. If your change touches server-side logic, add or update the relevant tests.
- No new runtime dependencies without a good reason. The bundle is already large because of the AI models.
- Do not bump the version in package.json in your PR. Releases are handled separately.

## Reporting issues

Open a GitHub issue. For security-sensitive issues (e.g., anything involving the local Express server or SQLite), please describe the issue privately via GitHub's security advisory feature instead of a public issue.

## License

By contributing you agree that your changes will be released under the project's MIT license.
