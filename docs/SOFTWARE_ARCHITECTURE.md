# Kakidash Software Architecture Design

## 1. Architecture Overview

Kakidash is designed based on **Clean Architecture** principles to enhance maintainability, testability, and extensibility.
Following the dependency rule, outer layers (Presentation, Infrastructure) depend on inner layers (Domain, Application).

### 1.1 Dependency Graph (Layers)

```mermaid
graph TD
    subgraph Presentation ["Presentation Layer"]
        Controller[MindMapController]
        Interaction[InteractionHandler]
        Command[CommandPalette]
        View[SvgRenderer]
    end

    subgraph Features ["Features"]
        subgraph Core ["Core Feature"]
            Service[MindMapService]
            DomainEntities[MindMap / Node]
        end

        subgraph Theme ["Theme Feature"]
            ThemeReg[ThemeRegistry]
            StyleEd[StyleEditor]
            ThemeDef[ThemeDefinition]
        end

        subgraph Export ["Export/Import Feature"]
            Importers[XMindImporter]
            Exporters[Image/Markdown Exporter]
        end
    end

    subgraph Shared ["Shared Kernel"]
        Kernel[IdGenerator / FileHandler]
        Infra[CryptoIdGenerator / EventEmitter]
    end

    %% Dependencies
    Presentation --> Core
    Presentation --> Theme
    Presentation --> Export
    
    %% Feature Inter-dependencies
    Theme --> Core
    Export --> Core

    %% Cross-cutting
    Core --> Shared
    Theme --> Shared
    Export --> Shared
    Presentation --> Shared

    %% Specific wiring
    Controller --> Service
    Controller --> ThemeReg
    Controller --> Exporters
```

### 1.2 Module/Class Dependency Diagram

This diagram shows concrete relations between major classes.

```mermaid
classDiagram
    direction TB

    namespace Presentation {
        class MindMapController
        class InteractionHandler
        class SvgRenderer
        class CommandPalette
    }

    namespace Features_Core {
        class MindMapService
        class MindMap
        class Node
        class NodePresentationData
        class HistoryManager
    }

    namespace Features_Theme {
        class ThemeRegistry
        class StyleEditor
        class MindMapStyles
    }

    namespace Features_Export {
        class XMindImporter
        class ImageExporter
        class MarkdownExporter
    }

    namespace Shared_Kernel {
        class IdGenerator
        class CryptoIdGenerator
        class EventEmitter
    }

    %% Relationships
    MindMapController --> MindMapService : delegates
    MindMapController --> ThemeRegistry : uses
    MindMapController --> ImageExporter : triggers
    MindMapController --> SvgRenderer : renders
    
    MindMapService --> MindMap : manages
    MindMapService --> HistoryManager : uses
    MindMapService --> IdGenerator : uses

    MindMap *-- Node : root
    Node *-- Node : children
    Node *-- NodePresentationData : presentation

    SvgRenderer ..> MindMap : reads
    StyleEditor ..> MindMapStyles : edits
    
    CryptoIdGenerator ..|> IdGenerator : implements
```

## 2. Directory Structure

The source code is organized into directories based on layer responsibilities.

```
src/
├── features/         # Vertical slices by feature (Package by Feature)
│   ├── core/         # Core domain capability
│   │   ├── domain/       # MindMap, Node, Core Interfaces
│   │   └── application/  # MindMapService, HistoryManager
│   ├── theme/        # Theme & Styling capability
│   │   ├── domain/       # Theme Definition
│   │   ├── components/   # StyleEditor
│   │   ├── registry/     # ThemeRegistry
│   │   └── resources/    # Presets
│   └── export_import/ # Export/Import capability
│       ├── ImageExporter
│       ├── MarkdownExporter
│       └── XMindImporter
├── shared/           # Shared Kernel
│   ├── kernel/       # Pure utilities (IdGenerator, FileHandler)
│   └── infrastructure/ # Shared infrastructure (CryptoIdGenerator, EventEmitter)
├── presentation/     # Application-wide UI integration
│   ├── components/   # Shared UI components (Renderer, CommandPalette)
│   └── logic/        # Global orchestration (MindMapController, InteractionHandler)
├── infrastructure/   # Layered infrastructure implementations (if needed)
└── index.ts          # Entry point (Dependency Injection)
```

## 3. Layer Details

### 3.1 Features (`src/features`)

Modules sliced vertically by feature.

#### Core Feature (`src/features/core`)
Contains the core domain and application logic of the Mind Map.
- **Domain**: `MindMap`, `Node` Entities, `MindMapData` and `NodePresentationData` Interfaces (Strict separation of Domain and View state).
- **Application**: `MindMapService` (Use Cases including bulk operations), `HistoryManager` (History Management).

#### Theme Feature (`src/features/theme`)
Functionality related to styling and theme management.
- **Domain**: `ThemeDefinition API`, `MindMapStyles`, `StyleAction`.
- **Components**: `StyleEditor`.
- **Registry**: `ThemeRegistry` (Theme application management).

#### Export/Import Feature (`src/features/export_import`)
Input/Output functionality with external formats.
- `XMindImporter`: Import XMind files.
- `ImageExporter`: SVG/PNG export.
- `MarkdownExporter`: Markdown export.

### 3.2 Shared Kernel (`src/shared`)

Common components referenced by all features.
- **Kernel**: `IdGenerator` (Interface), `FileHandler` (Interface).
- **Infrastructure**: `CryptoIdGenerator` (Impl), `TypedEventEmitter` (Impl).

### 3.3 Presentation Layer (`src/presentation`)

Integrates features and provides the user interface.
- **MindMapController**: Main controller orchestrating features (Core, Theme, Export). Manages selection state (single/multi).
- **InteractionHandler**: Handing user input operations.
- **Components**:
  - **SvgRenderer**: Responsible for rendering the mind map using SVG and HTML. Implements **Differential Rendering** for high performance:
    - **DOM Caching**: Uses `nodeElementMap` to cache node DOM elements for O(1) access.
    - **Delta Updates**: Separates full re-renders from selection updates. Selection changes only modify the styles/attributes of affected elements without rebuilding the DOM.
  - **CommandPalette**: Command user interface.

## 4. Major Processing Sequence

### 4.1 Node Addition Flow

This diagram illustrates the interaction between layers when a user adds a node.

```mermaid
sequenceDiagram
    participant User
    participant Controller as Presentation/MindMapController
    participant Service as Core/MindMapService
    participant IdGen as Shared/IdGenerator
    participant Entity as Core/MindMap
    participant Renderer as Presentation/SvgRenderer

    User->>Controller: addChildNode(parentId)
    activate Controller

    Controller->>Service: addNode(parentId, "New Topic")
    activate Service

    Service->>IdGen: generate()
    IdGen-->>Service: uuid

    Service->>Entity: new Node(uuid, ...)
    Service->>Entity: parent.addChild(newNode)

    Service-->>Controller: newNode
    deactivate Service

    Controller->>Renderer: render(mindMap)
    Controller-->>User: Update View
    deactivate Controller
```

### 4.2 Undo/Redo Flow

This diagram illustrates the history management and state restoration flow using the Memento pattern.

```mermaid
sequenceDiagram
    participant User
    participant Controller as Presentation/MindMapController
    participant Service as Core/MindMapService
    participant History as Core/HistoryManager
    participant Entity as Core/MindMap

    User->>Controller: undo()
    activate Controller

    Controller->>Service: undo()
    activate Service

    Service->>History: undo(currentState)
    History-->>Service: previousState

    alt previousState exists
        Service->>Service: importData(previousState)
        Service-->>Controller: true
    else
        Service-->>Controller: false
    end
    deactivate Service

    opt if true
        Controller->>Controller: render()
        Controller-->>User: Update View
    end
    deactivate Controller
```

### 4.3 Node Move Flow (Drag & Drop)

This diagram shows the validation and execution flow when moving a node.

```mermaid
sequenceDiagram
    participant User
    participant Controller as Presentation/MindMapController
    participant Service as Core/MindMapService
    participant Entity as Core/MindMap

    User->>Controller: moveNode(nodeId, targetId, side)
    activate Controller

    Controller->>Service: moveNode(nodeId, targetId, side)
    activate Service

    Service->>Entity: findNode(nodeId), findNode(targetId)

    alt Validation Failed (Cycle / Root Move)
        Entity-->>Service: false (from moveNode checks)
        Service-->>Controller: false
    else Validation Passed
        Service->>Service: saveState()
        Service->>Entity: moveNode(nodeId, targetId)
        Entity->>Entity: remove from old parent
        Entity->>Entity: add to new parent
        Service-->>Controller: true
    end
    deactivate Service

    opt if true
        Controller->>Controller: render()
        Controller-->>User: Update View
    end
    deactivate Controller
```

### 4.4 Search and Command Palette Flow

Flow when a user performs a search.

```mermaid
sequenceDiagram
    participant User
    participant Controller as Presentation/MindMapController
    participant Palette as Presentation/CommandPalette
    participant Service as Core/MindMapService

    User->>Controller: toggleCommandPalette (m key)
    activate Controller
    Controller->>Palette: toggle()
    deactivate Controller

    User->>Palette: Input "query"
    activate Palette
    Palette-->>Controller: onInput("query")
    activate Controller

    Controller->>Service: searchNodes("query")
    activate Service
    Service-->>Controller: Node[] results
    deactivate Service

    Controller->>Palette: setResults(results)
    deactivate Controller
    deactivate Palette

    User->>Palette: Select Result
    activate Palette
    Palette-->>Controller: onSelect(nodeId)
    deactivate Palette
    activate Controller

    Controller->>Controller: selectNode(nodeId)
    Controller->>Controller: ensureNodeVisible(nodeId)
    Controller-->>User: Focus Node
    deactivate Controller
```

### 4.5 Selection Update Flow (Optimized Path)

This diagram shows the fast-path selection update that avoids a full re-render.

```mermaid
sequenceDiagram
    participant User
    participant Controller as Presentation/MindMapController
    participant Renderer as Presentation/SvgRenderer

    User->>Controller: selectNode(nodeId)
    activate Controller

    Controller->>Controller: Update selectedNodeIds (Set)
    
    Controller->>Renderer: updateSelection(selectedNodeIds)
    activate Renderer
    Note over Renderer: Use nodeElementMap & previousSelectedIds
    Renderer->>Renderer: Remove styles from previous selected elements
    Renderer->>Renderer: Apply styles to new selected elements
    Renderer-->>Controller: 
    deactivate Renderer

    Controller-->>User: Fast Visual Response (O(1))
    deactivate Controller
```

## 5. Entry Point and DI (`src/index.ts`)

Instantiates components and injects dependencies upon application startup.

```typescript
// DI Example
const idGenerator = new CryptoIdGenerator(); // Shared/Infrastructure
const mindMap = new MindMap(rootNode);       // Core/Domain
const service = new MindMapService(mindMap, idGenerator); // Core/Application <- Core/Domain, Shared/Infrastructure
const controller = new MindMapController(mindMap, service, renderer, ...); // Presentation <- Core/Application
```

## 6. Key Design Principles

- **Dependency Inversion Principle (DIP)**:
  - High-level modules (Service) do not depend on low-level modules (Infrastructure) but on abstractions (Interfaces) (e.g., `IdGenerator`).
- **Single Responsibility Principle (SRP)**:
  - Each class has a single responsibility (e.g., `MindMapService` for logic, `SvgRenderer` for rendering).
- **DRY (Don't Repeat Yourself)**:
  - Extraction of common logic (e.g., ID generation, style definitions).
- **Type Safety**:
  - Ensuring compile-time safety by eliminating `any` types and using strict type definitions.
