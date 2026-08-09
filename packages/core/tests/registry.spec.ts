import { describe, it, expect, beforeEach } from 'vitest';
import { EntityRegistry, resetGlobalRegistry } from '../src/registry';
import { defineEntity } from '../src/entity';

describe('EntityRegistry', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  describe('register()', () => {
    it('should register an entity', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      expect(registry.has('document')).toBe(true);
    });

    it('should reject duplicate registration', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      expect(() => registry.register(entity)).toThrow('already registered');
    });

    it('should allow multiple entities', () => {
      const doc1 = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      const doc2 = defineEntity({
        name: 'ticket',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(doc1);
      registry.register(doc2);

      expect(registry.size()).toBe(2);
      expect(registry.has('document')).toBe(true);
      expect(registry.has('ticket')).toBe(true);
    });
  });

  describe('get()', () => {
    it('should retrieve registered entity', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      const retrieved = registry.get('document');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('document');
    });

    it('should return undefined for non-existent entity', () => {
      const entity = registry.get('non_existent');

      expect(entity).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for registered entity', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      expect(registry.has('document')).toBe(true);
    });

    it('should return false for non-existent entity', () => {
      expect(registry.has('non_existent')).toBe(false);
    });
  });

  describe('update()', () => {
    it('should update registered entity', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        version: '1.0.0',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      const updated = defineEntity({
        name: 'document',
        id: 'id',
        version: '2.0.0',
        fields: {
          id: { retrieval: ['semantic'] },
          title: { retrieval: ['semantic'] },
        },
      });

      registry.update(updated);

      const retrieved = registry.get('document');

      expect(retrieved?.version).toBe('2.0.0');
      expect(Object.keys(retrieved?.fields || {})).toHaveLength(2);
    });

    it('should reject update for non-existent entity', () => {
      const entity = defineEntity({
        name: 'missing',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      expect(() => registry.update(entity)).toThrow('not found');
    });
  });

  describe('delete()', () => {
    it('should delete registered entity', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      const deleted = registry.delete('document');

      expect(deleted).toBe(true);
      expect(registry.has('document')).toBe(false);
    });

    it('should return false for non-existent entity', () => {
      const deleted = registry.delete('non_existent');

      expect(deleted).toBe(false);
    });
  });

  describe('listNames()', () => {
    it('should return empty array for empty registry', () => {
      const names = registry.listNames();

      expect(names).toEqual([]);
    });

    it('should return all entity names', () => {
      const doc1 = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      const doc2 = defineEntity({
        name: 'ticket',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(doc1);
      registry.register(doc2);

      const names = registry.listNames();

      expect(names).toContain('document');
      expect(names).toContain('ticket');
      expect(names).toHaveLength(2);
    });
  });

  describe('listAll()', () => {
    it('should return all entities', () => {
      const doc1 = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      const doc2 = defineEntity({
        name: 'ticket',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(doc1);
      registry.register(doc2);

      const all = registry.listAll();

      expect(all).toHaveLength(2);
      expect(all.map((e) => e.name)).toContain('document');
      expect(all.map((e) => e.name)).toContain('ticket');
    });
  });

  describe('clear()', () => {
    it('should clear all entities', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      expect(registry.size()).toBe(1);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.has('document')).toBe(false);
    });
  });

  describe('size()', () => {
    it('should return registry size', () => {
      expect(registry.size()).toBe(0);

      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      expect(registry.size()).toBe(1);
    });
  });

  describe('validate()', () => {
    it('should return empty errors for valid entities', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      registry.register(entity);

      const errors = registry.validate();

      expect(errors.size).toBe(0);
    });

    it('should detect invalid entities', () => {
      // Manually add invalid entity (bypass defineEntity validation)
      const invalidEntity: any = {
        name: 'test',
        id: 'missing_id_field',
        fields: { other_field: { retrieval: ['semantic'] } },
      };

      registry.register(invalidEntity);

      const errors = registry.validate();

      expect(errors.has('test')).toBe(true);
      expect(errors.get('test')).toContain('ID field "missing_id_field" not defined');
    });
  });

  describe('Global registry', () => {
    beforeEach(() => {
      resetGlobalRegistry();
    });

    it('should maintain singleton', () => {
      const { getGlobalRegistry } = require('../src/registry');

      const reg1 = getGlobalRegistry();
      const reg2 = getGlobalRegistry();

      expect(reg1).toBe(reg2);
    });

    it('should reset global registry', () => {
      const { getGlobalRegistry } = require('../src/registry');

      const reg1 = getGlobalRegistry();

      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      reg1.register(entity);

      expect(reg1.size()).toBe(1);

      resetGlobalRegistry();

      const reg2 = getGlobalRegistry();

      expect(reg2.size()).toBe(0);
    });
  });
});
