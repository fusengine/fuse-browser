# Changelog

## [0.1.23] - 03-06-2026

### Added

- feat(fetch): `browser_fetch` and `browser_extract` (and the fetch CLI) now return clean LLM-ready markdown (main content + YAML frontmatter) by default, via a shared `defuddle`-based serialization layer. A `format: "markdown" | "text"` option preserves the previous raw-text behaviour.
