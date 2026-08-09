import { describe, it, expect } from 'vitest';
import {
  RetrievalOpsError,
  EntityValidationError,
  EntityNotFoundError,
  ModelMismatchError,
  AccessDeniedError,
  MissingFieldError,
  AdapterError,
  EmbeddingError,
  SearchError,
  IndexError,
  ConfigurationError,
} from '../src/errors';

describe('Custom Errors', () => {
  describe('RetrievalOpsError', () => {
    it('should create error with message and code', () => {
      const error = new RetrievalOpsError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('RetrievalOpsError');
    });

    it('should use default code', () => {
      const error = new RetrievalOpsError('Test error');

      expect(error.code).toBe('UNKNOWN_ERROR');
    });

    it('should be instanceof Error', () => {
      const error = new RetrievalOpsError('Test');

      expect(error instanceof Error).toBe(true);
    });
  });

  describe('EntityValidationError', () => {
    it('should create error with entity name', () => {
      const error = new EntityValidationError('Invalid entity', 'document');

      expect(error.message).toBe('Invalid entity');
      expect(error.entityName).toBe('document');
      expect(error.code).toBe('ENTITY_VALIDATION_ERROR');
    });
  });

  describe('EntityNotFoundError', () => {
    it('should create error with entity name', () => {
      const error = new EntityNotFoundError('document');

      expect(error.message).toContain('document');
      expect(error.entityName).toBe('document');
      expect(error.code).toBe('ENTITY_NOT_FOUND');
    });
  });

  describe('ModelMismatchError', () => {
    it('should create error with model details', () => {
      const error = new ModelMismatchError(
        'Xenova/all-MiniLM-L6-v2',
        'OpenAI/text-embedding-3',
        384,
        1536
      );

      expect(error.message).toContain('Xenova/all-MiniLM-L6-v2');
      expect(error.message).toContain('OpenAI/text-embedding-3');
      expect(error.message).toContain('384D');
      expect(error.message).toContain('1536D');
      expect(error.expectedModel).toBe('Xenova/all-MiniLM-L6-v2');
      expect(error.expectedDimensions).toBe(384);
      expect(error.code).toBe('MODEL_MISMATCH');
    });
  });

  describe('AccessDeniedError', () => {
    it('should create error with context', () => {
      const error = new AccessDeniedError(
        'Access denied',
        'User not in ACL',
        'org-123',
        'user-456'
      );

      expect(error.message).toBe('Access denied');
      expect(error.reason).toBe('User not in ACL');
      expect(error.tenantId).toBe('org-123');
      expect(error.principalId).toBe('user-456');
      expect(error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('MissingFieldError', () => {
    it('should create error for missing field', () => {
      const error = new MissingFieldError('title', 'document');

      expect(error.message).toContain('title');
      expect(error.message).toContain('document');
      expect(error.fieldName).toBe('title');
      expect(error.entityName).toBe('document');
      expect(error.code).toBe('MISSING_FIELD');
    });

    it('should work without entity name', () => {
      const error = new MissingFieldError('title');

      expect(error.message).toContain('title');
      expect(error.fieldName).toBe('title');
      expect(error.code).toBe('MISSING_FIELD');
    });
  });

  describe('AdapterError', () => {
    it('should create error with adapter details', () => {
      const error = new AdapterError(
        'Connection failed',
        'PgVectorAdapter',
        'denseSearch'
      );

      expect(error.message).toContain('Connection failed');
      expect(error.message).toContain('denseSearch');
      expect(error.message).toContain('PgVectorAdapter');
      expect(error.adapterName).toBe('PgVectorAdapter');
      expect(error.operation).toBe('denseSearch');
      expect(error.code).toBe('ADAPTER_ERROR');
    });
  });

  describe('EmbeddingError', () => {
    it('should create error with provider name', () => {
      const error = new EmbeddingError(
        'Model not found',
        'LocalEmbeddingProvider'
      );

      expect(error.message).toContain('Model not found');
      expect(error.message).toContain('LocalEmbeddingProvider');
      expect(error.providerName).toBe('LocalEmbeddingProvider');
      expect(error.code).toBe('EMBEDDING_ERROR');
    });
  });

  describe('SearchError', () => {
    it('should create error with optional cause', () => {
      const cause = new Error('Underlying error');
      const error = new SearchError('Search failed', cause);

      expect(error.message).toBe('Search failed');
      expect(error.cause).toBe(cause);
      expect(error.code).toBe('SEARCH_ERROR');
    });

    it('should work without cause', () => {
      const error = new SearchError('Search failed');

      expect(error.cause).toBeUndefined();
    });
  });

  describe('IndexError', () => {
    it('should create error with optional cause', () => {
      const cause = new Error('Indexing failed');
      const error = new IndexError('Index operation failed', cause);

      expect(error.message).toBe('Index operation failed');
      expect(error.cause).toBe(cause);
      expect(error.code).toBe('INDEX_ERROR');
    });
  });

  describe('ConfigurationError', () => {
    it('should create error with message', () => {
      const error = new ConfigurationError('Invalid configuration');

      expect(error.message).toBe('Invalid configuration');
      expect(error.code).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('Error hierarchy', () => {
    it('should all extend RetrievalOpsError', () => {
      const errors = [
        new EntityValidationError('test'),
        new EntityNotFoundError('test'),
        new ModelMismatchError('a', 'b', 1, 2),
        new AccessDeniedError('test'),
        new MissingFieldError('test'),
        new AdapterError('test'),
        new EmbeddingError('test'),
        new SearchError('test'),
        new IndexError('test'),
        new ConfigurationError('test'),
      ];

      errors.forEach((error) => {
        expect(error instanceof RetrievalOpsError).toBe(true);
        expect(error instanceof Error).toBe(true);
        expect(error.code).toBeDefined();
      });
    });
  });
});
