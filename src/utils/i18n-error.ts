/**
 * Body for an HttpException whose message should be translated into the
 * caller's language (see I18nHttpExceptionFilter). `key` must exist in
 * src/i18n/<lang>/errors.json; `args` fill its `{placeholders}`.
 *
 *   throw new NotFoundException(i18nError('fileNotFound', { id }));
 */
export function i18nError(key: string, args?: Record<string, string | number>) {
  return args ? { message: key, args } : { message: key };
}
