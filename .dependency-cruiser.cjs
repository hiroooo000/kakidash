/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    options: {
        doNotFollow: {
            path: 'node_modules',
        },
        tsPreCompilationDeps: true,
        tsConfig: {
            fileName: 'tsconfig.json',
        },
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['import', 'require', 'node', 'default'],
        },
        reporterOptions: {
            dot: {
                collapsePattern: 'node_modules/[^/]+',
            },
            archi: {
                collapsePattern: '^(node_modules|src|tests)',
            },
        },
    },
    forbidden: [
        /* General Restrictions */
        {
            name: 'no-circular',
            severity: 'warn',
            comment:
                'This dependency is part of a circular relationship. You might want to revise ' +
                'your solution (i.e. use dependency injection, split modules) or ignore this ' +
                'warning by adding // @ts-ignore to the import.',
            from: {},
            to: {
                circular: true,
            },
        },
        {
            name: 'no-orphans',
            severity: 'info',
            comment:
                "This is an orphan module - it's likely not used (anymore?). Either use it or " +
                "remove it. If it's logical this module is an orphan (i.e. it's a config file), " +
                "add an exception for it in your dependency-cruiser configuration.",
            from: {
                orphan: true,
                pathNot: [
                    '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // dot files
                    '\\.d\\.ts$', // type definitions
                    '(^|/)tsconfig\\.json$',
                    '(^|/)package\\.json$',
                    'src/index\\.ts$', // entry point
                    'vite\\.config\\.ts$',
                    'playwright\\.config\\.ts$',
                ],
            },
            to: {},
        },

        /* Architectural Rules: Layered Architecture (Legacy & New Features) */
        {
            name: 'domain-no-dep-on-outer',
            severity: 'error',
            comment: 'Domain layer (including Core Domain) must not depend on Application, Infrastructure, or Presentation layers, or other Features.',
            from: { path: '^(src/domain|src/features/core/domain)' },
            to: {
                path: '^(src/application|src/infrastructure|src/presentation|src/features/theme|src/features/export_import)',
            },
        },
        {
            name: 'feature-core-isolation',
            severity: 'error',
            comment: 'Core Feature should not depend on other features (Theme, Export).',
            from: { path: '^src/features/core' },
            to: {
                path: '^(src/features/theme|src/features/export_import)',
            },
        },
        {
            name: 'application-no-dep-on-infra-pres',
            severity: 'error',
            comment: 'Application layer must not depend on Infrastructure or Presentation layers.',
            from: { path: '^src/application' },
            to: {
                path: '^(src/infrastructure|src/presentation)',
            },
        },
        {
            name: 'presentation-no-dep-on-infra',
            severity: 'error',
            comment: 'Presentation layer must not depend on Infrastructure layer directly.',
            from: {
                path: '^src/presentation',
                pathNot: 'src/presentation/logic/MindMapController.ts', // TODO: Fix this violation in Phase 3/5
            },
            to: {
                path: '^src/infrastructure',
            },
        },
        {
            name: 'infrastructure-no-dep-on-pres',
            severity: 'error',
            comment: 'Infrastructure layer must not depend on Presentation layer.',
            from: { path: '^src/infrastructure' },
            to: {
                path: '^src/presentation',
            },
        },
    ],
};
