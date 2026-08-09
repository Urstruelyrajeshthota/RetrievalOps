/**
 * Entity Schema Definition
 *
 * Defines the structure of entities that RetrievalOps will index and search.
 * An entity specifies which fields to embed, how to weight them, and security settings.
 */

export interface FieldConfig {
  /**
   * Retrieval strategies for this field.
   * - "semantic": Dense vector search
   * - "keyword": Full-text/BM25 search
   * - "exact": Exact match filtering
   */
  retrieval: Array<'semantic' | 'keyword' | 'exact'>;

  /**
   * Weight for this field in ranking (default: 1.0)
   * Higher weights boost results where this field matches.
   *
   * Example: errorMessage: 1.2 makes error messages rank higher
   */
  weight?: number;
}

export interface EntitySecurity {
  /**
   * Field name that contains the tenant ID (optional).
   * If specified, searches are scoped to this tenant.
   *
   * Example: tenantField: "orgId" means documents are isolated by orgId
   */
  tenantField?: string;

  /**
   * Field name that contains principal IDs with access (optional).
   * If specified, only principals in this list can see the document.
   *
   * Example: permissionField: "allowedPrincipals" for ACL-based access
   */
  permissionField?: string;
}

export interface EntityDefinition {
  /**
   * Entity type name (lowercase, snake_case recommended).
   * Used to organize indexes and in queries.
   *
   * Example: "jira_ticket", "support_document", "code_snippet"
   */
  name: string;

  /**
   * Field that uniquely identifies an entity instance.
   *
   * Example: "id", "key", "uuid"
   */
  id: string;

  /**
   * Fields to index and retrieve.
   *
   * Example:
   * {
   *   title: { retrieval: ["semantic", "keyword"], weight: 1.0 },
   *   content: { retrieval: ["semantic"], weight: 0.9 },
   *   tags: { retrieval: ["exact"], weight: 0 }
   * }
   */
  fields: Record<string, FieldConfig>;

  /**
   * Security settings (optional).
   *
   * Example:
   * {
   *   tenantField: "orgId",
   *   permissionField: "allowedPrincipalIds"
   * }
   */
  security?: EntitySecurity;

  /**
   * Version of this schema (for migrations).
   * Increments when schema changes.
   * @default "1.0.0"
   */
  version?: string;

  /**
   * Description of this entity type (optional).
   * Used in documentation and error messages.
   */
  description?: string;
}

/**
 * Define an entity schema for RetrievalOps.
 *
 * @param config Entity definition
 * @returns Validated entity definition
 *
 * @example
 * ```ts
 * const document = defineEntity({
 *   name: "document",
 *   id: "id",
 *   fields: {
 *     title: { retrieval: ["semantic", "keyword"], weight: 1.0 },
 *     content: { retrieval: ["semantic"], weight: 0.9 }
 *   }
 * });
 * ```
 */
export function defineEntity(config: EntityDefinition): EntityDefinition {
  // Validate required fields
  if (!config.name || typeof config.name !== 'string') {
    throw new Error('Entity name is required and must be a string');
  }

  if (!config.id || typeof config.id !== 'string') {
    throw new Error('Entity id field is required and must be a string');
  }

  if (!config.fields || typeof config.fields !== 'object') {
    throw new Error('Entity fields are required and must be an object');
  }

  if (Object.keys(config.fields).length === 0) {
    throw new Error('Entity must have at least one field');
  }

  // Validate entity name format
  if (!/^[a-z0-9_]+$/.test(config.name)) {
    throw new Error(
      'Entity name must be lowercase alphanumeric with underscores only'
    );
  }

  // Validate fields
  for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
    if (!fieldConfig.retrieval || !Array.isArray(fieldConfig.retrieval)) {
      throw new Error(
        `Field "${fieldName}" must have retrieval strategies as an array`
      );
    }

    if (fieldConfig.retrieval.length === 0) {
      throw new Error(
        `Field "${fieldName}" must have at least one retrieval strategy`
      );
    }

    // Validate retrieval strategies
    for (const strategy of fieldConfig.retrieval) {
      if (!['semantic', 'keyword', 'exact'].includes(strategy)) {
        throw new Error(
          `Field "${fieldName}" has invalid strategy: "${strategy}". ` +
          'Must be one of: semantic, keyword, exact'
        );
      }
    }

    // Validate weight
    if (fieldConfig.weight !== undefined) {
      if (typeof fieldConfig.weight !== 'number' || fieldConfig.weight <= 0) {
        throw new Error(
          `Field "${fieldName}" weight must be a positive number`
        );
      }
    }
  }

  // Ensure id field exists in fields
  if (!config.fields[config.id]) {
    throw new Error(
      `ID field "${config.id}" is not defined in entity fields`
    );
  }

  // Validate security config
  if (config.security) {
    if (config.security.tenantField) {
      if (typeof config.security.tenantField !== 'string') {
        throw new Error('Security tenantField must be a string');
      }
      if (!config.fields[config.security.tenantField]) {
        throw new Error(
          `Tenant field "${config.security.tenantField}" is not defined in entity fields`
        );
      }
    }

    if (config.security.permissionField) {
      if (typeof config.security.permissionField !== 'string') {
        throw new Error('Security permissionField must be a string');
      }
      if (!config.fields[config.security.permissionField]) {
        throw new Error(
          `Permission field "${config.security.permissionField}" is not defined in entity fields`
        );
      }
    }
  }

  return {
    ...config,
    version: config.version || '1.0.0',
  };
}

/**
 * Validate an entity definition.
 *
 * @param config Entity definition to validate
 * @returns Validation result
 */
export function validateEntity(config: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    defineEntity(config as EntityDefinition);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    } else {
      errors.push(String(error));
    }
    return { valid: false, errors };
  }
}

/**
 * Get the fields that should be embedded for an entity.
 *
 * @param entity Entity definition
 * @param strategy Retrieval strategy to filter by (default: all)
 * @returns Field names that use this strategy
 */
export function getEmbeddableFields(
  entity: EntityDefinition,
  strategy?: 'semantic' | 'keyword' | 'exact'
): string[] {
  return Object.entries(entity.fields)
    .filter(([_, config]) => {
      if (!strategy) return true;
      return config.retrieval.includes(strategy);
    })
    .map(([name]) => name);
}

/**
 * Get field weight for ranking.
 *
 * @param entity Entity definition
 * @param fieldName Field name
 * @returns Weight (default: 1.0)
 */
export function getFieldWeight(
  entity: EntityDefinition,
  fieldName: string
): number {
  const config = entity.fields[fieldName];
  if (!config) {
    return 1.0;
  }
  return config.weight ?? 1.0;
}
