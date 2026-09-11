---
id: configuration
title: Site configuration
description: Configure branding, the repository link, an automatically detected SVG, PNG, or JPEG logo, layered navigation, colors, output, and interface language in site.config.json.
type: reference
status: observed
visibility: public
tags: configuration, branding, navigation, json
related: home, getting-started, content-model
source_refs: ../../core/build.mjs, site.config.json
---

## Configure the publication

Every site owns a `site.config.json`. It contains publication choices; Aurelius supplies the runtime and layout.

```json
{
  "siteTitle": "Product handbook",
  "siteDescription": "Reference for people and agents.",
  "language": "en",
  "outputDirectory": "dist",
  "brand": {
    "title": "Acme Docs",
    "kicker": "product knowledge",
    "name": "Acme",
    "logoSource": "assets/acme.svg",
    "logoAlt": "Acme logo"
  },
  "repository": {
    "url": "https://github.com/acme/product-docs"
  },
  "navigation": {
    "primary": ["home", "getting-started", "publishing"],
    "sections": [
      { "label": "Overview", "items": ["home", "getting-started"] },
      {
        "label": "Reference",
        "items": [
          { "label": "Authoring", "items": ["configuration"] },
          { "label": "For agents", "items": ["agent-interface"] }
        ]
      }
    ]
  },
  "colors": {
    "paper": "#faf8f8",
    "ink": "#2b2b2b",
    "accent": "#84a59d",
    "link": "#284b63"
  }
}
```

## Expose the repository

`repository.url` is optional. When it is configured, Aurelius adds a clearly labeled external link to the site header so readers can reach the repository that owns the documentation. Use a complete public `https://` URL:

```json
{
  "repository": {
    "url": "https://github.com/acme/product-docs"
  }
}
```

Set `repository` to `null` or omit it when the documentation should not expose a repository link.

## Use your own logo

When `init` runs without `--logo`, it searches the directory where you ran the command for `logo.svg`, `logo.png`, `logo.jpeg`, then `logo.jpg`, without treating letter case as significant. It copies the first match into the new site's `assets/` directory. If there is no match, Aurelius creates a small editable SVG placeholder.

Pass a local SVG, PNG, JPEG, or JPG to select a different file explicitly:

```bash
npx --no-install aurelius init docs --title "Acme Docs" --logo ./brand/acme.svg
```

Aurelius copies it into `docs/assets/` and writes `brand.logoSource`. You can later replace the asset or point the setting at another supported image. SVG is recommended for sharp rendering at any size; PNG and JPEG are useful when the visual identity contains raster artwork. Always provide meaningful `logoAlt` text.

## Translate the interface, not your Markdown

`language` controls all built-in reader-interface copy: search, buttons, metadata labels, diagram controls, feedback messages, and generated agent cards. It does not translate the Markdown you authored, so a site can keep English documents while its navigation and controls are in Portuguese:

```json
{ "language": "pt-BR" }
```

English (`en`) is the default for a new site. Use `{ "language": "pt-BR" }` for the Portuguese interface. Editorial strings that you explicitly configure — such as `navigation.sections[].label`, `brand.title`, and footer text — remain yours to write in the desired language.

## Keep global and local navigation separate

`navigation.primary` feeds the compact top navbar and should contain only a few high-frequency destinations. `navigation.sections` feeds the complete left sidebar and scales to many documents. A section may contain a document ID or a folder object with `label` and nested `items`; folders can nest again when the information architecture warrants it. The right sidebar is page-local: it contains the table of contents, metadata, relationships, and machine-readable formats.

Older sites may still use a flat `navigation` array; Aurelius normalizes it for backward compatibility.

## Important fields

- `outputDirectory` is a dedicated subdirectory rebuilt from scratch by `build`. It cannot be the site root, `content/`, `diagrams/`, `assets/`, the configured runtime, or anything inside those source paths. Use `dist` unless there is a concrete deployment reason to change it.
- `language` selects built-in interface copy. This example uses English; use `pt-BR` for Portuguese.
- `repository.url` adds the external repository link to the site header; omit `repository` or set it to `null` to hide the link.
- `colors` defines the light-theme tokens used by both screen and print.
- `framework.runtime` is an advanced escape hatch for a customized runtime directory.

Keep `brand.kicker` short. It identifies the knowledge surface; it should not compete with the page title.

Aurelius validates the values you actually declared before applying defaults. A malformed `navigation`, `repository`, brand, runtime, footer, or color object stops `check` with the field name instead of silently falling back to another value.
