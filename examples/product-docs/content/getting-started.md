---
id: getting-started
title: Installation and commands
description: Install Aurelius and use its explicit commands to create, validate, preview, and publish documentation and visual sources.
type: guide
status: observed
visibility: public
tags: installation, cli, github
related: home, configuration, publishing
source_refs: ../../cli.mjs, ../../package.json, ../../core/build.mjs, ../../core/scaffold.mjs
---

## Install the CLI as a development dependency

For a project that consumes Aurelius, install a versioned GitHub dependency. It records the resolved release in `package-lock.json`, so local work and CI use the same binary:

```bash
npm install --save-dev github:ArthurWillers/Aurelius#v0.4.4
```

Install directly from the tagged GitHub release; cloning the generator is only necessary for contribution or local customization.

Commit the resulting `package.json` and `package-lock.json`, then use `npm ci` in CI. Private Git repositories require read access for both the developer and the CI token.

## Clone only to contribute or customize

Clone the project when you intend to develop Aurelius itself, run its tests, or maintain a fork:

```bash
git clone https://github.com/ArthurWillers/aurelius.git
cd aurelius
npm ci
```

For a temporary local integration test from another project, use `npm install --save-dev /absolute/path/to/aurelius`; avoid a global `npm link`, which makes the version less visible and harder to reproduce.

## The command set

Create a starter site in a new or empty directory:

```bash
npx --no-install aurelius init docs --title "Product documentation" --logo brand.svg
```

Validate sources without writing the publication:

```bash
npx --no-install aurelius check --site docs
```

Rebuild `docs/dist` from validated sources:

```bash
npx --no-install aurelius build --site docs
```

Preview, watch source files, and reload the browser:

```bash
npx --no-install aurelius dev --site docs --port 4173
```

List every named visual grammar:

```bash
npx --no-install aurelius visual types
```

Create an editable authored visual plus its semantic JSON envelope:

```bash
npx --no-install aurelius visual init release-flow --site docs --kind sankey --format html
```

Without `--logo`, `init` detects `logo.svg`, `logo.png`, `logo.jpeg`, or `logo.jpg` in the directory where you run it and copies the first match. Use `--logo` to select a specific SVG, PNG, JPEG, or JPG; when no default logo exists, `init` creates a small editable SVG placeholder.

Inside the Aurelius repository, use `npm run aurelius -- <command>`. For example:

```bash
npm run aurelius -- check --site examples/product-docs
```

## A practical editing loop

1. Edit Markdown, diagram JSON, authored HTML/SVG, assets, or `site.config.json`.
2. Run `check` for structural errors.
3. Use `dev` to review navigation, responsive layout, diagrams, and print output.
4. Run `build` in CI or immediately before publication.

No server, database, or external account is required. Continue with [Site configuration](doc:configuration).
