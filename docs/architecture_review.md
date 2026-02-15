# アーキテクチャレビューと改善提案

現状のプロジェクト構造とコードベースを分析し、アーキテクチャの改善点を検討しました。
特に、コンテキストにあった「Package by Feature（機能ごとのパッケージ化）」への移行を中心に、いくつかの提案をまとめます。

## 1. 現状分析

### アーキテクチャスタイル
現在は厳格な **Layered Architecture（レイヤードアーキテクチャ）** を採用しています。
ディレクトリ構造は責務（Role）に基づいて分割されています：

- `src/domain`: ビジネスロジックとインターフェース
- `src/application`: ユースケース
- `src/presentation`: UIとコントローラー
- `src/infrastructure`: 実装詳細

### 評価

| 項目 | 評価 | 詳細 |
| --- | --- | --- |
| **Separation of Concerns** | ✅ 高い | 各レイヤーの責務が明確であり、`SOFTWARE_ARCHITECTURE_ja.md` に従っています。 |
| **Dependency Rule** | ✅ 遵守 | 依存関係の方向（外側→内側）が守られています（例: `Controller` -> `Service` -> `Domain`）。 |
| **Cohesion (凝集度)** | ⚠️ 低い | 1つの機能（例: エクスポート機能）に関連するコードが `presentation/logic`, `infrastructure/impl`, `domain/interfaces` に分散しており、機能変更時の修正範囲が広くなりがちです。 |
| **Scalability** | ⚠️ 中程度 | 機能が増えるにつれて、各レイヤーのディレクトリが肥大化し、関連するファイルを見つけにくくなる可能性があります。 |

## 2. 改善提案

### 提案1: Package by Feature (機能単位のパッケージ化) への移行

現在検討中の「Package by Feature」への移行は、凝集度を高めるために非常に有効です。
階層（Layer）ではなく、ドメインや機能（Feature）を第一レベルのディレクトリとすることを提案します。

#### 新しいディレクトリ構造案

```
src/
├── features/
│   ├── core/               # マインドマップの核となる機能
│   │   ├── domain/         # MindMap, Node entities
│   │   ├── application/    # MindMapService
│   │   └── presentation/   # Controller, Renderer
│   ├── export/             # エクスポート機能
│   │   ├── application/    # ExportService (if needed)
│   │   ├── presentation/   # ImageExporter, MarkdownExporter
│   │   └── infrastructure/ # XMindImporter
│   ├── theme/              # テーマ管理機能
│   │   ├── domain/         # Theme interfaces
│   │   └── presentation/   # ThemeRegistry, ThemePresets
│   └── history/            # 履歴管理機能
│       └── application/    # HistoryManager
├── shared/                 # 共通カーネル/ライブラリ
│   ├── kernel/             # IdGeneratorなどの共通インターフェース
│   └── infrastructure/     # CryptoIdGenerator, EventEmitter
└── index.ts                # Composition Root (Wiring)
```

この変更により、特定の機能（例: エクスポート）に関する修正を行う際、そのディレクトリ内だけを見れば良くなり、開発効率とメンテナンス性が向上します。

### 提案2: Dependency Cruiser の導入

アーキテクチャルール（依存方向のルール）を機械的に強制するために、`dependency-cruiser` の導入を推奨します。
これにより、「Domain層がInfrastructure層をインポートしていないか」などをCIで自動チェックできます。

**導入メリット:**
- アーキテクチャの劣化（Architecture Erosion）を防止
- レビュー負荷の軽減
- 循環依存の早期発見

### 提案3: Strict Boundary Enforcement

現在は `tsconfig` の `paths` やディレクトリ構成で緩やかに境界を定義していますが、`eslint-plugin-boundaries` や `nx` (monorepo tool) のようなツールを使って、より厳密に「機能間の依存」を制御することも検討価値があります。
ただし、現在のプロジェクト規模では **提案2 (Dependency Cruiser)** で十分かと思われます。

### 提案4: テスト戦略の明確化

`tests` ディレクトリを見ると、機能ごとのテストファイル（例: `export_feature.test.ts`）とレイヤーごとのテストが混在し始めているように見受けられます。
ディレクトリ構造を「Package by Feature」に移行する場合、テストファイルも各Featureディレクトリ内に配置（コロケーション）することを検討してください。

例:
```
src/features/export/
├── ImageExporter.ts
├── ImageExporter.test.ts  <-- テストを実装の近くに配置
```
これにより、機能削除時にテストも忘れずに削除でき、コンテキストスイッチを減らせます。

## まとめ

現状のレイヤードアーキテクチャは綺麗に保たれており、技術的な負債は少ない状態です。
しかし、今後の機能拡張（Pluginシステムの導入や、より複雑なドメインロジックの追加）を見越すと、**Package by Feature へのリファクタリング** は非常に理にかなった次のステップです。

まずは **提案1（構造変更）** と **提案2（ルール自動化）** の導入から始めることをお勧めします。
