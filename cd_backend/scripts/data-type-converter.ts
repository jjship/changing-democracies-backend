/**
 * Data type converter utilities for SQLite to PostgreSQL migration
 * This file contains helper functions for converting SQLite data types to PostgreSQL compatible formats
 */

/**
 * Converts SQLite data types to PostgreSQL compatible formats
 * Handles special types like dates, booleans, and null values
 *
 * @param data Array of objects to convert
 * @returns Array with converted data types
 */
export function convertDataTypesForPostgres<T extends Record<string, any>>(data: T[]): T[] {
  return data.map((item) => {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(item)) {
      // Handle special SQLite formats and convert them to PostgreSQL compatible formats

      // Handle null values
      if (value === null || value === undefined) {
        result[key] = null;
        continue;
      }

      // Handle SQLite booleans (stored as 0/1)
      if (
        typeof value === 'number' &&
        (value === 0 || value === 1) &&
        (key.includes('is_') || key.includes('has_') || key.endsWith('_flag'))
      ) {
        result[key] = value === 1;
        continue;
      }

      // Handle date strings (ISO format)
      if (
        typeof value === 'string' &&
        (key.includes('date') || key.includes('time') || key.endsWith('_at') || key.endsWith('_on')) &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ) {
        try {
          // Ensure the date is valid by creating a new Date object
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            result[key] = date.toISOString();
          } else {
            // If invalid date, keep as string
            result[key] = value;
          }
        } catch (e) {
          // If date parsing fails, keep original value
          result[key] = value;
        }
        continue;
      }

      // Copy other values as-is
      result[key] = value;
    }

    return result as T;
  });
}

/**
 * Process nested date fields in objects
 * Looks for date strings in nested objects and arrays
 *
 * @param data Array of objects that might contain nested date fields
 * @returns Array with processed nested date fields
 */
export function processNestedDateFields<T extends Record<string, any>>(data: T[]): T[] {
  // Helper function to process a single value
  function processValue(value: any): any {
    // Skip null/undefined values
    if (value === null || value === undefined) {
      return value;
    }

    // Process arrays recursively
    if (Array.isArray(value)) {
      return value.map((item) => processValue(item));
    }

    // Process objects recursively
    if (typeof value === 'object' && !(value instanceof Date)) {
      return processNestedObject(value);
    }

    // Check if string is ISO date format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      try {
        // Convert to date object and back to ISO string to ensure valid format
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (e) {
        // If conversion fails, return original value
      }
    }

    // Return value as is if no conversion needed
    return value;
  }

  // Process nested objects recursively
  function processNestedObject<U extends Record<string, any>>(obj: U): U {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      result[key] = processValue(value);
    }

    return result as U;
  }

  // Process each item in the array
  return data.map((item) => processNestedObject(item));
}
