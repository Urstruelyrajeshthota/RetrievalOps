/**
 * Custom error types for RetrievalOps.
 */

/**
 * Base error for RetrievalOps.
 */
export class RetrievalOpsError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = 'RetrievalOpsError';
  }
}

/**
 * Entity validation failed.
 */
export class EntityValidationError extends RetrievalOpsError {
  constructor(message: string, public entityName?: string) {
    super(message, 'ENTITY_VALIDATION_ERROR');
    this.name = 'EntityValidationError';
  }
}

/**
 * Entity not found.
 */
export class EntityNotFoundError extends RetrievalOpsError {
  constructor(entityName: string) {
    super(
      `Entity "${entityName}" not found in registry`,
      'ENTITY_NOT_FOUND'
    );
    this.name = 'EntityNotFoundError';
    this.entityName = entityName;
  }

  public entityName: string;
}

/**
 * Embedding model mismatch.
 */
export class ModelMismatchError extends RetrievalOpsError {
  constructor(
    public expectedModel: string,
    public actualModel: string,
    public expectedDimensions: number,
    public actualDimensions: number
  ) {
    super(
      `Embedding model mismatch. Expected "${expectedModel}" ` +
      `(${expectedDimensions}D) but got "${actualModel}" (${actualDimensions}D). ` +
      'Reindex or use matching embedding provider.',
      'MODEL_MISMATCH'
    );
    this.name = 'ModelMismatchError';
  }
}

/**
 * Access denied due to security policy.
 */
export class AccessDeniedError extends RetrievalOpsError {
  constructor(
    message: string,
    public reason?: string,
    public tenantId?: string,
    public principalId?: string
  ) {
    super(message, 'ACCESS_DENIED');
    this.name = 'AccessDeniedError';
  }
}

/**
 * Required document field is missing.
 */
export class MissingFieldError extends RetrievalOpsError {
  constructor(
    public fieldName: string,
    public entityName?: string
  ) {
    super(
      `Required field "${fieldName}" missing` +
      (entityName ? ` in entity "${entityName}"` : ''),
      'MISSING_FIELD'
    );
    this.name = 'MissingFieldError';
  }
}

/**
 * Adapter operation failed.
 */
export class AdapterError extends RetrievalOpsError {
  constructor(
    message: string,
    public adapterName?: string,
    public operation?: string
  ) {
    super(
      message +
      (operation ? ` (operation: ${operation})` : '') +
      (adapterName ? ` [${adapterName}]` : ''),
      'ADAPTER_ERROR'
    );
    this.name = 'AdapterError';
  }
}

/**
 * Embedding provider operation failed.
 */
export class EmbeddingError extends RetrievalOpsError {
  constructor(
    message: string,
    public providerName?: string
  ) {
    super(
      message + (providerName ? ` [${providerName}]` : ''),
      'EMBEDDING_ERROR'
    );
    this.name = 'EmbeddingError';
  }
}

/**
 * Search operation failed.
 */
export class SearchError extends RetrievalOpsError {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message, 'SEARCH_ERROR');
    this.name = 'SearchError';
  }
}

/**
 * Index operation failed.
 */
export class IndexError extends RetrievalOpsError {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message, 'INDEX_ERROR');
    this.name = 'IndexError';
  }
}

/**
 * Configuration error.
 */
export class ConfigurationError extends RetrievalOpsError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}
