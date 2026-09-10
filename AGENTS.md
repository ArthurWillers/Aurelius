# Consuming an Aurelius site

1. Read `dist/llms.txt` to discover the subject and entry points.
2. Read `dist/api/manifest.json` for paths and API version.
3. Start with `dist/api/index.json`, then retrieve `dist/api/documents/{id}.json`.
4. Use `dist/api/graph.json` to expand relationships and `dist/api/search.json` to retrieve by subject.
5. Follow `sourceRefs` to Markdown or the original technical source whenever traceability matters.

HTML is a reading projection. Prefer the API JSON and declared sources over extracting facts from rendered diagrams.

To create, validate, or build a site, use `aurelius init`, `aurelius check`, `aurelius build`, and `aurelius dev`. Portable instructions are in `.agents/skills/aurelius-documentation` and `.agents/skills/documentation-migration`.
