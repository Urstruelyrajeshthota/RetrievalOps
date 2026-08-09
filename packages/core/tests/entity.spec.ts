import { describe, it, expect } from 'vitest';
import {
  defineEntity,
  validateEntity,
  getEmbeddableFields,
  getFieldWeight,
} from '../src/entity';

describe('Entity Schema', () => {
  describe('defineEntity()', () => {
    it('should create a valid entity schema', () => {
      const entity = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['semantic'] },
          title: { retrieval: ['semantic', 'keyword'], weight: 1.0 },
          content: { retrieval: ['semantic'], weight: 0.9 },
        },
      });

      expect(entity.name).toBe('document');
      expect(entity.id).toBe('id');
      expect(Object.keys(entity.fields)).toHaveLength(3);
    });

    it('should set default version', () => {
      const entity = defineEntity({
        name: 'test',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      expect(entity.version).toBe('1.0.0');
    });

    it('should accept custom version', () => {
      const entity = defineEntity({
        name: 'test',
        id: 'id',
        version: '2.0.0',
        fields: { id: { retrieval: ['semantic'] } },
      });

      expect(entity.version).toBe('2.0.0');
    });

    it('should reject invalid entity name', () => {
      expect(() => {
        defineEntity({
          name: 'Invalid-Name',
          id: 'id',
          fields: { id: { retrieval: ['semantic'] } },
        });
      }).toThrow('must be lowercase alphanumeric');
    });

    it('should reject missing name', () => {
      expect(() => {
        defineEntity({
          name: '',
          id: 'id',
          fields: { id: { retrieval: ['semantic'] } },
        });
      }).toThrow('Entity name is required');
    });

    it('should reject missing id field', () => {
      expect(() => {
        defineEntity({
          name: 'test',
          id: '',
          fields: { id: { retrieval: ['semantic'] } },
        });
      }).toThrow('id field is required');
    });

    it('should reject empty fields', () => {
      expect(() => {
        defineEntity({
          name: 'test',
          id: 'id',
          fields: {},
        });
      }).toThrow('must have at least one field');
    });

    it('should reject field with no retrieval strategies', () => {
      expect(() => {
        defineEntity({
          name: 'test',
          id: 'id',
          fields: {
            id: { retrieval: [] },
          },
        });
      }).toThrow('must have at least one retrieval strategy');
    });

    it('should reject invalid retrieval strategy', () => {
      expect(() => {
        defineEntity({
          name: 'test',
          id: 'id',
          fields: {
            id: { retrieval: ['invalid'] as any },
          },
        });
      }).toThrow('invalid strategy');
    });

    it('should reject non-existent id field', () => {
      expect(() => {
        defineEntity({
          name: 'test',
          id: 'missing_field',
          fields: {
            id: { retrieval: ['semantic'] },
          },
        });
      }).toThrow('ID field "missing_field" is not defined');
    });

    it('should reject negative weight', () => {
      expect(() => {
        defineEntity({
          name: 'test',
          id: 'id',
          fields: {
            id: { retrieval: ['semantic'], weight: -1 },
          },
        });
      }).toThrow('weight must be a positive number');
    });

    it('should accept security configuration', () => {
      const entity = defineEntity({
        name: 'test',
        id: 'id',
        fields: {
          id: { retrieval: ['semantic'] },
          org_id: { retrieval: ['exact'] },
          allowed_users: { retrieval: ['exact'] },
        },
        security: {
          tenantField: 'org_id',
          permissionField: 'allowed_users',
        },
      });

      expect(entity.security?.tenantField).toBe('org_id');
      expect(entity.security?.permissionField).toBe('allowed_users');
    });

    it('should reject non-existent tenant field', () => {
      expect(() => {
        defineEntity({
          name: 'test',
          id: 'id',
          fields: { id: { retrieval: ['semantic'] } },
          security: { tenantField: 'missing_org_id' },
        });
      }).toThrow('Tenant field "missing_org_id" is not defined');
    });

    it('should reject non-existent permission field', () => {
      expect(() => {
        defineEntity({
          name: 'test',
          id: 'id',
          fields: { id: { retrieval: ['semantic'] } },
          security: { permissionField: 'missing_acl' },
        });
      }).toThrow('Permission field "missing_acl" is not defined');
    });

    it('should support all retrieval strategies', () => {
      const entity = defineEntity({
        name: 'test',
        id: 'id',
        fields: {
          id: { retrieval: ['semantic'] },
          semantic_field: { retrieval: ['semantic'] },
          keyword_field: { retrieval: ['keyword'] },
          exact_field: { retrieval: ['exact'] },
          multi_field: { retrieval: ['semantic', 'keyword'] },
        },
      });

      expect(Object.keys(entity.fields)).toHaveLength(5);
    });
  });

  describe('validateEntity()', () => {
    it('should return valid for correct schema', () => {
      const result = validateEntity({
        name: 'test',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid schema', () => {
      const result = validateEntity({
        name: 'Invalid-Name',
        id: 'id',
        fields: { id: { retrieval: ['semantic'] } },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null input', () => {
      const result = validateEntity(null);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getEmbeddableFields()', () => {
    const entity = defineEntity({
      name: 'test',
      id: 'id',
      fields: {
        id: { retrieval: ['semantic'] },
        title: { retrieval: ['semantic', 'keyword'] },
        content: { retrieval: ['semantic'] },
        tags: { retrieval: ['exact'] },
      },
    });

    it('should return all fields if no strategy specified', () => {
      const fields = getEmbeddableFields(entity);

      expect(fields).toContain('id');
      expect(fields).toContain('title');
      expect(fields).toContain('content');
      expect(fields).toContain('tags');
    });

    it('should filter by semantic strategy', () => {
      const fields = getEmbeddableFields(entity, 'semantic');

      expect(fields).toContain('id');
      expect(fields).toContain('title');
      expect(fields).toContain('content');
      expect(fields).not.toContain('tags');
    });

    it('should filter by keyword strategy', () => {
      const fields = getEmbeddableFields(entity, 'keyword');

      expect(fields).toContain('title');
      expect(fields).not.toContain('id');
      expect(fields).not.toContain('content');
      expect(fields).not.toContain('tags');
    });

    it('should filter by exact strategy', () => {
      const fields = getEmbeddableFields(entity, 'exact');

      expect(fields).toContain('tags');
      expect(fields).not.toContain('id');
      expect(fields).not.toContain('title');
      expect(fields).not.toContain('content');
    });
  });

  describe('getFieldWeight()', () => {
    const entity = defineEntity({
      name: 'test',
      id: 'id',
      fields: {
        id: { retrieval: ['semantic'] },
        title: { retrieval: ['semantic'], weight: 1.2 },
        content: { retrieval: ['semantic'] }, // No weight, default 1.0
      },
    });

    it('should return explicit weight', () => {
      const weight = getFieldWeight(entity, 'title');

      expect(weight).toBe(1.2);
    });

    it('should return default weight 1.0', () => {
      const weight = getFieldWeight(entity, 'content');

      expect(weight).toBe(1.0);
    });

    it('should return 1.0 for non-existent field', () => {
      const weight = getFieldWeight(entity, 'missing_field');

      expect(weight).toBe(1.0);
    });
  });

  describe('Complex schemas', () => {
    it('should handle Jira-like schema', () => {
      const jiraTicket = defineEntity({
        name: 'jira_ticket',
        id: 'key',
        fields: {
          key: { retrieval: ['exact'] },
          summary: { retrieval: ['semantic', 'keyword'], weight: 1.0 },
          description: { retrieval: ['semantic'], weight: 0.9 },
          errorMessage: { retrieval: ['semantic', 'exact'], weight: 1.2 },
          rootCause: { retrieval: ['semantic'], weight: 1.3 },
          resolution: { retrieval: ['semantic'], weight: 1.1 },
          projectKey: { retrieval: ['exact'] },
        },
        security: {
          tenantField: 'projectKey',
        },
      });

      expect(jiraTicket.name).toBe('jira_ticket');
      expect(jiraTicket.id).toBe('key');
      expect(getEmbeddableFields(jiraTicket, 'semantic')).toHaveLength(5);
    });

    it('should handle multi-tenant document schema', () => {
      const document = defineEntity({
        name: 'document',
        id: 'id',
        fields: {
          id: { retrieval: ['exact'] },
          title: { retrieval: ['semantic', 'keyword'] },
          content: { retrieval: ['semantic'] },
          orgId: { retrieval: ['exact'] },
          allowedPrincipalIds: { retrieval: ['exact'] },
        },
        security: {
          tenantField: 'orgId',
          permissionField: 'allowedPrincipalIds',
        },
      });

      expect(document.security?.tenantField).toBe('orgId');
      expect(document.security?.permissionField).toBe('allowedPrincipalIds');
    });
  });
});
