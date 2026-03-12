import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errorUtils';

describe('errorUtils', () => {
  describe('getErrorMessage', () => {
    it('should return API message from axios error', () => {
      const error = {
        response: {
          data: { message: 'Order not found' },
        },
      };
      expect(getErrorMessage(error, 'Fallback')).toBe('Order not found');
    });

    it('should join array messages', () => {
      const error = {
        response: {
          data: { message: ['Error 1', 'Error 2'] },
        },
      };
      expect(getErrorMessage(error, 'Fallback')).toBe('Error 1, Error 2');
    });

    it('should return fallback when response has no message', () => {
      const error = {
        response: {
          data: {},
        },
      };
      expect(getErrorMessage(error, 'Fallback')).toBe('Fallback');
    });

    it('should return Error message when error is Error instance', () => {
      const error = new Error('Network failed');
      expect(getErrorMessage(error, 'Fallback')).toBe('Network failed');
    });

    it('should return fallback for unknown error', () => {
      expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
      expect(getErrorMessage(undefined, 'Fallback')).toBe('Fallback');
      expect(getErrorMessage('string error', 'Fallback')).toBe('Fallback');
    });

    it('should return fallback when response is undefined', () => {
      const error = { response: undefined };
      expect(getErrorMessage(error, 'Fallback')).toBe('Fallback');
    });
  });
});
