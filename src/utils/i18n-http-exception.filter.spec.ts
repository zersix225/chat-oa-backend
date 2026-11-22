import {
  ArgumentsHost,
  BadGatewayException,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { I18nContext } from 'nestjs-i18n';
import { I18nHttpExceptionFilter } from './i18n-http-exception.filter';
import { i18nError } from './i18n-error';

const load = (lang: string): Record<string, string> =>
  JSON.parse(
    readFileSync(join(__dirname, '..', 'i18n', lang, 'errors.json'), 'utf8'),
  );
const errors = { en: load('en'), th: load('th') };

/** Minimal stand-in for nestjs-i18n: looks up errors.<key> and fills {args}. */
function fakeI18n(lang: 'en' | 'th') {
  return {
    t: (key: string, opts?: { args?: Record<string, unknown> }) => {
      const message = errors[lang][key.replace(/^errors\./, '')];
      if (message === undefined) return key;
      return message.replace(/\{(\w+)\}/g, (_, name: string) =>
        String(opts?.args?.[name] ?? `{${name}}`),
      );
    },
  } as unknown as I18nContext<unknown>;
}

function run(exception: Error, lang?: 'en' | 'th') {
  jest
    .spyOn(I18nContext, 'current')
    .mockReturnValue(lang ? fakeI18n(lang) : undefined);
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new I18nHttpExceptionFilter().catch(exception as never, host);
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('I18nHttpExceptionFilter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('should translate error codes in `errors`', () => {
    const { status, body } = run(
      new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { password: 'incorrectPassword' },
      }),
      'th',
    );
    expect(status).toBe(422);
    expect(body.errors).toEqual({ password: errors.th.incorrectPassword });
  });

  it('should translate i18nError messages with args and drops `args`', () => {
    const { status, body } = run(
      new BadGatewayException(i18nError('lineRejected', { reason: 'quota' })),
      'th',
    );
    expect(status).toBe(502);
    expect(body).toEqual({
      statusCode: 502,
      message: errors.th.lineRejected.replace('{reason}', 'quota'),
    });
  });

  it('should leave plain sentences and unknown codes untouched', () => {
    const { body } = run(
      new UnprocessableEntityException({
        errors: { email: 'email must be an email', other: 'unknownCode' },
      }),
      'th',
    );
    expect(body.errors).toEqual({
      email: 'email must be an email',
      other: 'unknownCode',
    });
  });

  it('should return the original body when there is no i18n context', () => {
    const { body } = run(new BadGatewayException(i18nError('fileTooLarge')));
    expect(body).toEqual({ statusCode: 502, message: 'fileTooLarge' });
  });

  it('should have the same keys and placeholders in every language', () => {
    expect(Object.keys(errors.th).sort()).toEqual(
      Object.keys(errors.en).sort(),
    );
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(errors.en)) {
      expect([key, placeholders(errors.th[key])]).toEqual([
        key,
        placeholders(errors.en[key]),
      ]);
    }
  });
});
