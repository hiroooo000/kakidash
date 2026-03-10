# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-03-10

### Added

- Add strikethrough text style support and update help modal.
- Migrate drag and drop to pointer events for touch support.

### Refactoring & Architecture

- Decompose god objects (`MindMapController`, `MindMapService`, and `SvgRenderer`).
- Extract specialized services (`ViewportService`, `NavigationService`, `FileIOService`, and `ThemeService`).
- Implement `InteractionOrchestrator` and `CommandBus` to handle specialized interaction handlers.
- Remove presentation state from `Node` entity.

### Fixed

- Fix image paste regression.
- Fix layout bugs and E2E test timeouts due to out-of-viewport nodes.
- Resolve typing and lint errors in test files.

### Documentation

- Update architecture documentation to reflect Node presentation separation and interaction refactoring.
- Update README.ja.md to include strikethrough features.

## [0.2.3] - 2026-02-22

### Added

- Implement differential rendering for selection updates and fix selection style persistence bug.
- Implement CustomCommand registration API and CommandPalette integration.
- Allow disabling command palette features via constructor options.
- Implement help modal with icon explanations and keyboard shortcuts.
- Add blue and red numeric icons (0-9) to command palette.
- Implement Shift+Click multi-selection logic.

### Fixed

- Execute postCreateCommand.sh with bash in devcontainer.
- Export TypedEventEmitter to expose event handling methods in d.ts.
- Prevent duplicate nodes when copying parent-child hierarchy.
- Restore focus after cut operation and undoing paste.
- Resolve typecheck and lint errors.

### Performance

- Implement node ID index (HashMap) for O(1) findNode lookups.
- Implement measureNode and getNodeHeight cache.

### Refactoring

- Split layout_regression E2E test into 5 independent phase tests and optimize performance.
- Extract help modal logic to dedicated component and add dynamic i18n support.
- Consolidate selection restoration and ancestor discovery logic.
- Separate logic tests to `src/features` and ui tests to `tests/components` (Package by Feature transition).
- General architectural refactoring including Shared Kernel, Core Domain, and Application Services.

## [0.2.2] - 2026-02-14

### Added

- Enhanced event system to support VS Code integration.
- Abstracted file I/O interfaces and extracted logic for XMind and SVG.

### Fixed

- Stabilized E2E tests by adjusting timeouts for layout regression checks.
- Resolved type errors in `KakidashEvents.ts` by defining `KakidashCommandArgs`.

### Chore

- Optimized development environment setup and Turbo task configurations.

## [0.2.1] - 2026-02-12

### Added

- Markdown export functionality.
- Image export (PNG/SVG) functionality.
- XMind import functionality.

### Changed

- Reordered command palette items.

### Fixed

- Turbo parallel execution issue causing CI timeouts.

## [0.2.0] - 2026-02-07

### Added

- Individual node width customization via keyboard shortcuts (`Shift + Left/Right`) and API.
- Node editor width now dynamically matches the customized node width.

### Changed

- Updated default keyboard shortcuts:
  - Edit Node: `i`, `Space`, `F2`
  - Bold: `Shift + b`
  - Italic: `Shift + i`
- Decoupled `MindMapController` from `SvgRenderer` for better architectural separation.
- Updated dependencies to latest versions (`chore/update-dependencies`).

### Chore

- Integrated End-to-End (E2E) tests into `turbo:ci` checks.
- Updated CI/CD workflows to support Playwright browser installation.

## [0.1.13] - 2026-02-05

### Fixed

- Image nodes now persist their original dimensions, fixing excessive vertical spacing and layout issues.
- Corrected layout logic for folded nodes to prevent child nodes from affecting parent height calculations.

## [0.1.2] - 2026-01-29

### Fixed

- Restored v0.1.0 sizing logic in `SvgRenderer` to fix node layout/overlap issues ("broken/collapsed nodes").
- Corrected label in Command Palette: `🗑️ 削除 (Delete)` → `🗑️ Delete`.

### Chore

- Added `tests/presentation/LayoutConsistency.test.ts` to prevent layout regressions.

## [0.1.1] - 2026-01-28

### Added

- Node icon support (Check, Star, Warning, etc.).
- Command Palette (`m` key) for icon selection and node searching.
- Exposed icon update support in public API `Kakidash.updateNode`.
- Consistent icon resource management via `presentation/resources/Icons.ts`.

### Changed

- Refined Command Palette item styles (removed bold).
- Updated Software Architecture and README documentation to include icon features.

### Fixed

- Layout inconsistencies and width calculation for nodes with icons in `SvgRenderer`.
- Rendering crash when icon images failed to load.

## [0.1.0] - 2026-01-25

### Added

- Automated version-up workflow and project rules.
- Software architecture documentation with Mermaid diagrams.
- Pnpm and Turbo integration for build optimization and improved developer experience.
- New `IdGenerator` interface and `CryptoIdGenerator` implementation in the Infrastructure layer for cleaner architecture.
- Zoom reset functionality and enhanced shortcut key configurations.
- Custom style inheritance for border and connection lines.
- Detailed TSDoc comments for styling-related APIs.

### Changed

- Reorganized directory structure into separate `domain`, `application`, `presentation`, and `infrastructure` layers.
- Migrated from `npm` to `pnpm`.
- Enhanced `Kakidash` constructor to accept optional parameters like `maxNodeWidth` and `customStyles`.

### Fixed

- Double paste issue by removing redundant shortcut handling.
- Zooom reset view centering logic.
- Node background color issues in dark mode when embedded in VSCode.
- Vertical text rendering issue when `maxWidth` is applied.
- Refined fold logic for leaf nodes to prevent accidental folding.
