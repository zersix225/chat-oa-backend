import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { I18nContext } from 'nestjs-i18n';

// Error codes / i18n keys are single camelCase words ("emailNotExists"). Plain
// sentences ("email must be an email") are left untouched.
const ERROR_KEY = /^[a-z][a-zA-Z0-9]*$/;

type Args = Record<string, unknown> | undefined;

/**
 * Translates HttpException bodies into the request language
 * (APP_HEADER_LANGUAGE header, default `x-custom-lang`) using
 * src/i18n/<lang>/errors.json:
 *   - `message: 'fileTooLarge'` (+ optional `args`)  → translated sentence
 *   - `errors: { email: 'emailNotExists' }`          → each code translated
 * Anything without a translation is returned as-is, so the response shape and
 * status code never change.
 */
@Catch(HttpException)
export class I18nHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const status = exception.getStatus();
    const raw = exception.getResponse();
    const body: Record<string, unknown> =
      typeof raw === 'string'
        ? { statusCode: status, message: raw }
        : { statusCode: status, ...(raw as Record<string, unknown>) };

    const i18n = I18nContext.current(host);
    if (i18n) {
      const args = body.args as Args;
      delete body.args;
      body.message = this.translate(i18n, body.message, args);
      if (body.errors) body.errors = this.translate(i18n, body.errors);
    }

    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private translate(i18n: I18nContext, value: unknown, args?: Args): unknown {
    if (typeof value === 'string') {
      if (!ERROR_KEY.test(value)) return value;
      const key = `errors.${value}`;
      const translated = i18n.t(key, { args, defaultValue: key });
      return translated === key ? value : translated;
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.translate(i18n, v, args));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, this.translate(i18n, v)]),
      );
    }
    return value;
  }
}
