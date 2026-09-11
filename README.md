# Aurelius

Aurelius is a local static documentation generator for people and agents. It turns versioned Markdown and diagram sources into an accessible static site, Markdown exports, and a structured JSON API. It does not require a database, hosted service, or a running server in production.

[Source repository](https://github.com/ArthurWillers/Aurelius) · [Issue tracker](https://github.com/ArthurWillers/Aurelius/issues)

## Install

Install Aurelius from a tagged GitHub release in the project that owns the documentation. This records the resolved revision in `package-lock.json`, so local work and CI use the same version:

```bash
npm install --save-dev github:ArthurWillers/Aurelius#v0.4.4
```

Clone the repository only to contribute to Aurelius or maintain a fork:

```bash
git clone https://github.com/ArthurWillers/Aurelius.git
```

```bash
cd Aurelius
```

```bash
npm ci
```

For a temporary local integration, use a direct path instead of global `npm link`:

```bash
npm install --save-dev /absolute/path/to/Aurelius
```

The npm package includes the portable authoring skills under
`node_modules/@avw/aurelius/.agents/skills/`. Running `aurelius init` copies them
into the new site's `.agents/skills/` directory, keeping the documentation and
migration workflows available with the exact Aurelius version installed by the
project.

## Create and build a site

Create a new site. If `logo.svg`, `logo.png`, `logo.jpeg`, or `logo.jpg` exists in the current directory, Aurelius copies the first match into the site. Otherwise it creates an editable generic SVG logo. The command also copies the portable skills into `.agents/skills/`.

```bash
npx --no-install aurelius init docs --title "Product documentation"
```

Validate content, relationships, assets, and diagrams without writing output:

```bash
npx --no-install aurelius check --site docs
```

Build the static site:

```bash
npx --no-install aurelius build --site docs
```

Start a local preview:

```bash
npx --no-install aurelius dev --site docs
```

List supported visual types:

```bash
npx --no-install aurelius visual types
```

Create a Mermaid, HTML, or SVG visual source:

```bash
npx --no-install aurelius visual init release-flow --site docs --kind sankey --format html
```

When `--format` is omitted, Aurelius selects Mermaid only for visual kinds with an equivalent starter. Other kinds require an explicit HTML or SVG format instead of generating a generic diagram under the wrong semantic kind.

Inside this repository, use the package script:

```bash
npm run aurelius -- build --site examples/product-docs
```

## Language configuration

English is the default for a new site. Aurelius only translates built-in interface copy such as search, buttons, navigation controls, metadata, and runtime messages. It never translates your Markdown files or editorial labels.

Set Portuguese interface copy in `site.config.json`:

```json
{
  "language": "pt-BR"
}
```

Set English interface copy explicitly:

```json
{
  "language": "en"
}
```

Write `siteTitle`, `brand`, footer text, and navigation labels in the language you want readers to see.

## Site structure

```text
docs/
├── site.config.json
├── content/
├── diagrams/
│   ├── sources/
│   └── artifacts/
└── assets/
```

Each Markdown document has frontmatter with a stable `id`. Use `doc:` links for internal documents, `asset:` links for published assets, and `related` for explicit semantic relationships. The build writes human-facing HTML plus `llms.txt`, Markdown exports, and `api/` JSON projections for agents.

`visibility` is metadata, not access control: every document under `content/` is emitted into all projections. Protect internal deployments at the host or use separate site inputs, and never put secrets in a site. Local `source_refs` are checked as provenance but are not copied into the generated output.

## GitHub Pages

This repository includes workflows for CI, Pages, and tagged releases. To publish the example site, open **Settings → Pages** in GitHub and select **GitHub Actions** as the source. A push to `master` then publishes `examples/product-docs`.

Do not commit `dist/`: the workflow rebuilds it and uploads only the generated artifact. You may remove a documentation directory and adjust or remove its deployment workflow if you no longer want to publish that site.

Create and push a release tag:

```bash
git tag v0.4.4
```

```bash
git push origin v0.4.4
```

## Project skills

- [Aurelius documentation](.agents/skills/aurelius-documentation/SKILL.md) covers authoring, validating, and publishing an Aurelius site.
- [Documentation migration](.agents/skills/documentation-migration/SKILL.md) covers migrations from Obsidian vaults, including Markdown, Canvas, Bases, links, attachments, and metadata.

Both skill directories are part of the npm tarball; they are not repository-only
development files.

## License

Aurelius is available under the [MIT License](LICENSE).
