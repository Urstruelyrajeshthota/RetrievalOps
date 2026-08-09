/**
 * Entity Registry
 *
 * In-memory storage for entity schemas.
 * Provides fast lookup and validation of entity definitions.
 */

import { EntityDefinition } from './entity';

export class EntityRegistry {
  private entities: Map<string, EntityDefinition> = new Map();

  /**
   * Register an entity schema.
   *
   * @param entity Entity definition
   * @throws Error if entity with same name already registered
   */
  register(entity: EntityDefinition): void {
    if (this.entities.has(entity.name)) {
      throw new Error(
        `Entity "${entity.name}" is already registered. ` +
        'Use update() to modify or delete() to remove.'
      );
    }
    this.entities.set(entity.name, entity);
  }

  /**
   * Get an entity schema by name.
   *
   * @param name Entity name
   * @returns Entity definition or undefined if not found
   */
  get(name: string): EntityDefinition | undefined {
    return this.entities.get(name);
  }

  /**
   * Check if an entity is registered.
   *
   * @param name Entity name
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.entities.has(name);
  }

  /**
   * Update an entity schema.
   *
   * @param entity Updated entity definition
   * @throws Error if entity not found
   */
  update(entity: EntityDefinition): void {
    if (!this.entities.has(entity.name)) {
      throw new Error(
        `Entity "${entity.name}" not found. Use register() to create new entities.`
      );
    }
    this.entities.set(entity.name, entity);
  }

  /**
   * Delete an entity schema.
   *
   * @param name Entity name
   * @returns True if deleted, false if not found
   */
  delete(name: string): boolean {
    return this.entities.delete(name);
  }

  /**
   * Get all registered entity names.
   *
   * @returns Array of entity names
   */
  listNames(): string[] {
    return Array.from(this.entities.keys());
  }

  /**
   * Get all registered entities.
   *
   * @returns Array of entity definitions
   */
  listAll(): EntityDefinition[] {
    return Array.from(this.entities.values());
  }

  /**
   * Clear all registered entities.
   */
  clear(): void {
    this.entities.clear();
  }

  /**
   * Get registry size.
   *
   * @returns Number of registered entities
   */
  size(): number {
    return this.entities.size;
  }

  /**
   * Validate all entities in registry.
   *
   * @returns Validation errors (empty if all valid)
   */
  validate(): Map<string, string[]> {
    const errors = new Map<string, string[]>();

    for (const [name, entity] of this.entities) {
      const entityErrors: string[] = [];

      // Validate entity name
      if (!/^[a-z0-9_]+$/.test(entity.name)) {
        entityErrors.push('Invalid entity name format');
      }

      // Validate fields
      if (!entity.fields || Object.keys(entity.fields).length === 0) {
        entityErrors.push('Entity must have at least one field');
      }

      // Validate id field exists
      if (!entity.fields[entity.id]) {
        entityErrors.push(`ID field "${entity.id}" not defined`);
      }

      // Validate security fields
      if (entity.security?.tenantField) {
        if (!entity.fields[entity.security.tenantField]) {
          entityErrors.push(
            `Tenant field "${entity.security.tenantField}" not defined`
          );
        }
      }

      if (entity.security?.permissionField) {
        if (!entity.fields[entity.security.permissionField]) {
          entityErrors.push(
            `Permission field "${entity.security.permissionField}" not defined`
          );
        }
      }

      if (entityErrors.length > 0) {
        errors.set(name, entityErrors);
      }
    }

    return errors;
  }
}

/**
 * Global entity registry singleton.
 */
let globalRegistry: EntityRegistry | undefined;

/**
 * Get or create the global entity registry.
 *
 * @returns Global registry instance
 */
export function getGlobalRegistry(): EntityRegistry {
  if (!globalRegistry) {
    globalRegistry = new EntityRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (mainly for testing).
 */
export function resetGlobalRegistry(): void {
  globalRegistry = new EntityRegistry();
}
