// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { Kakidash } from '@/index';
import { ThemeRegistry } from '@/features/theme/registry/ThemeRegistry';
import type { MindMapData } from '@/features/core/domain/MindMapData';

interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  title?: string;
  description?: string;
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean';
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: unknown[];
  minLength?: number;
  exclusiveMinimum?: number;
  deprecated?: boolean;
  default?: unknown;
}

const schemaPath = path.resolve(__dirname, '../../docs/schema/kakidash.schema.json');
const rootSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8')) as JsonSchema;

function resolveRef(ref: string, root: JsonSchema): JsonSchema {
  if (!ref.startsWith('#/$defs/')) {
    throw new Error(`Unsupported $ref: ${ref}`);
  }
  const defName = ref.slice('#/$defs/'.length);
  const resolved = root.$defs?.[defName];
  if (!resolved) {
    throw new Error(`Unresolved $ref: ${ref}`);
  }
  return resolved;
}

function validateAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  root: JsonSchema,
  currentPath: string = '$',
): string[] {
  if (schema.$ref) {
    return validateAgainstSchema(value, resolveRef(schema.$ref, root), root, currentPath);
  }

  const errors: string[] = [];

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${currentPath}: value must be one of ${JSON.stringify(schema.enum)}`);
    return errors;
  }

  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${currentPath}: expected object`);
      return errors;
    }

    const record = value as Record<string, unknown>;

    if (schema.required) {
      for (const reqKey of schema.required) {
        if (!(reqKey in record)) {
          errors.push(`${currentPath}: missing required property '${reqKey}'`);
        }
      }
    }

    for (const [key, propVal] of Object.entries(record)) {
      const propSchema = schema.properties?.[key];
      if (!propSchema) {
        if (schema.additionalProperties === false) {
          errors.push(`${currentPath}: unexpected property '${key}'`);
        }
        continue;
      }
      errors.push(...validateAgainstSchema(propVal, propSchema, root, `${currentPath}.${key}`));
    }
    return errors;
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${currentPath}: expected array`);
      return errors;
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(
          ...validateAgainstSchema(item, schema.items!, root, `${currentPath}[${index}]`),
        );
      });
    }
    return errors;
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${currentPath}: expected string`);
      return errors;
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${currentPath}: string length must be >= ${schema.minLength}`);
    }
    return errors;
  }

  if (schema.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push(`${currentPath}: expected number`);
      return errors;
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push(`${currentPath}: number must be > ${schema.exclusiveMinimum}`);
    }
    return errors;
  }

  if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`${currentPath}: expected boolean`);
    }
    return errors;
  }

  return errors;
}

function validateMindMapJson(data: unknown): string[] {
  return validateAgainstSchema(data, rootSchema, rootSchema);
}

describe('Kakidash JSON Schema (docs/schema/kakidash.schema.json)', () => {
  it('should define Draft 2020-12 metadata and match registered themes', () => {
    expect(rootSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(rootSchema.required).toEqual(['nodeData']);

    const themeEnum = rootSchema.$defs?.Theme?.enum;
    expect(themeEnum).toBeDefined();
    for (const themeName of ThemeRegistry.getInstance().getAvailableThemes()) {
      expect(themeEnum).toContain(themeName);
    }
    expect(themeEnum).toContain('custom');
  });

  it('should validate serialized output from Kakidash.getData()', () => {
    const container = document.createElement('div');
    const board = new Kakidash(container);
    const rootId = board.getRootId();

    const child = board.addNode(rootId, 'Styled Branch', 'left');
    expect(child).not.toBeNull();
    board.updateNode(child!.id, {
      style: {
        fontSize: '18px',
        color: '#E74C3C',
        background: '#FFF3CD',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textDecoration: 'line-through',
      },
      icon: 'check',
    });
    const grandChild = board.addNode(child!.id, 'Leaf');
    expect(grandChild).not.toBeNull();
    board.toggleFold(child!.id);
    board.setTheme('dark');
    board.selectNode(child!.id);

    const serialized: unknown = JSON.parse(JSON.stringify(board.getData()));
    expect(validateMindMapJson(serialized)).toEqual([]);
  });

  it('should validate minimal, hybrid-image, and legacy MindMapData fixtures', () => {
    const minimal: MindMapData = {
      nodeData: {
        id: 'root',
        topic: 'Minimal Topic',
      },
    };
    expect(validateMindMapJson(minimal)).toEqual([]);

    const hybridAndLegacy: MindMapData = {
      nodeData: {
        id: 'root',
        topic: 'Project Map',
        root: true,
        style: {
          fontSize: '24px',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
        },
        isFolded: false,
        children: [
          {
            id: 'img-hybrid',
            topic: '',
            thumbnail: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4',
            imageRef: 'img_abc123def.png',
            imageSize: { width: 200, height: 120 },
            layoutSide: 'right',
            isFolded: false,
          },
          {
            id: 'img-legacy',
            topic: '',
            image: 'data:image/png;base64,iVBORw0KGgo=',
            customWidth: 240,
            icon: 'num_1_blue',
          },
        ],
      },
      theme: 'colorful',
      direction: 1,
      selectedId: 'img-hybrid',
      selectedIds: ['img-hybrid', 'img-legacy'],
    };
    expect(validateMindMapJson(hybridAndLegacy)).toEqual([]);
  });

  it('should reject invalid MindMapData payloads', () => {
    expect(validateMindMapJson({})).not.toEqual([]);
    expect(validateMindMapJson({ nodeData: { id: '', topic: 'Empty ID' } })).not.toEqual([]);
    expect(validateMindMapJson({ nodeData: { id: 'root' } })).not.toEqual([]);
    expect(
      validateMindMapJson({
        nodeData: { id: 'root', topic: 'Root' },
        theme: 'unsupported-theme',
      }),
    ).not.toEqual([]);
    expect(
      validateMindMapJson({
        nodeData: { id: 'root', topic: 'Root', layoutSide: 'top' },
      }),
    ).not.toEqual([]);
    expect(
      validateMindMapJson({
        nodeData: { id: 'root', topic: 'Root', customWidth: 0 },
      }),
    ).not.toEqual([]);
    expect(
      validateMindMapJson({
        nodeData: { id: 'root', topic: 'Root', imageSize: { width: 100 } },
      }),
    ).not.toEqual([]);
    expect(
      validateMindMapJson({
        nodeData: {
          id: 'root',
          topic: 'Root',
          style: { unknownCssProp: '10px' },
        },
      }),
    ).not.toEqual([]);
    expect(
      validateMindMapJson({
        nodeData: {
          id: 'root',
          topic: 'Root',
          children: [{ id: 'c1' }],
        },
      }),
    ).not.toEqual([]);
  });
});
