import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { AllConfigType } from '@/config/config.type';
import { TiktokAccountsService } from '@/tiktok-accounts/tiktok-accounts.service';
import { TiktokAccount } from '@/tiktok-accounts/domain/tiktok-account';

const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const REVOKE_URL = 'https://open.tiktokapis.com/v2/oauth/revoke/';
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

const STATE_TTL_SECONDS = 10 * 60;
// Refresh a little before TikTok's expiry so in-flight requests don't fail.
const ACCESS_TOKEN_SKEW_MS = 5 * 60 * 1000;

type TiktokTokenResponse = {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
  token_type: string;
};

type TiktokTokenError = {
  error: string;
  error_description?: string;
  log_id?: string;
};

type TiktokUserInfoResponse = {
  data?: {
    user?: { open_id?: string; display_name?: string; avatar_url?: string };
  };
  error?: { code: string; message?: string; log_id?: string };
};

@Injectable()
export class TiktokOauthService {
  private readonly logger = new Logger(TiktokOauthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly httpService: HttpService,
    private readonly tiktokAccountsService: TiktokAccountsService,
  ) {}

  getAuthorizeUrl(adminId: string | number): string {
    const { clientKey } = this.getCredentials();
    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: 'code',
      scope: this.configService.getOrThrow('tiktok.scopes', { infer: true }),
      redirect_uri: this.getRedirectUri(),
      state: this.createState(String(adminId)),
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<TiktokAccount> {
    this.verifyState(state);

    const token = await this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getRedirectUri(),
    });
    const profile = await this.fetchProfile(token.access_token);

    const account = await this.tiktokAccountsService.upsertByOpenId({
      openId: token.open_id,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      ...this.toTokenFields(token),
    });
    this.logger.log(
      `Connected TikTok account ${account.displayName ?? account.openId}`,
    );
    return account;
  }

  /**
   * Returns a usable access token for the given TikTok account, refreshing it
   * when it is expired or about to expire.
   */
  async getValidAccessToken(openId: TiktokAccount['openId']): Promise<string> {
    const account = await this.tiktokAccountsService.findByOpenId(openId);
    if (!account) {
      throw new NotFoundException(`TikTok account ${openId} is not connected`);
    }

    if (
      new Date(account.accessTokenExpiresAt).getTime() - ACCESS_TOKEN_SKEW_MS >
      Date.now()
    ) {
      return account.accessToken;
    }

    if (new Date(account.refreshTokenExpiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException(
        `TikTok account ${openId} must be reconnected (refresh token expired)`,
      );
    }

    const token = await this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: account.refreshToken,
    });
    await this.tiktokAccountsService.update(
      account.id,
      this.toTokenFields(token),
    );
    return token.access_token;
  }

  async disconnect(id: TiktokAccount['id']): Promise<void> {
    const account = await this.tiktokAccountsService.findById(id);
    if (!account) throw new NotFoundException();

    const { clientKey, clientSecret } = this.getCredentials();
    try {
      await firstValueFrom(
        this.httpService.post(
          REVOKE_URL,
          new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            token: account.accessToken,
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );
    } catch (error) {
      // The token may already be expired or revoked; still drop our copy.
      this.logger.warn(
        `Failed to revoke TikTok token for ${account.openId}: ${this.describeError(error)}`,
      );
    }
    await this.tiktokAccountsService.remove(account.id);
  }

  private async requestToken(
    params: Record<string, string>,
  ): Promise<TiktokTokenResponse> {
    const { clientKey, clientSecret } = this.getCredentials();
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<TiktokTokenResponse | TiktokTokenError>(
          TOKEN_URL,
          new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            ...params,
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );
      if ('error' in data && data.error) {
        throw new BadRequestException(
          `TikTok token request failed: ${data.error}${data.error_description ? ` (${data.error_description})` : ''}`,
        );
      }
      return data as TiktokTokenResponse;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        `TikTok token request failed: ${this.describeError(error)}`,
      );
      throw new BadRequestException('TikTok token request failed');
    }
  }

  private async fetchProfile(accessToken: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<TiktokUserInfoResponse>(USER_INFO_URL, {
          params: { fields: 'open_id,display_name,avatar_url' },
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      if (data.error && data.error.code !== 'ok') {
        this.logger.warn(
          `TikTok user info error: ${data.error.code} ${data.error.message ?? ''}`,
        );
        return null;
      }
      return data.data?.user ?? null;
    } catch (error) {
      // Profile is cosmetic; don't fail the connection over it.
      this.logger.warn(
        `TikTok user info request failed: ${this.describeError(error)}`,
      );
      return null;
    }
  }

  private toTokenFields(token: TiktokTokenResponse) {
    const now = Date.now();
    return {
      accessToken: token.access_token,
      accessTokenExpiresAt: new Date(now + token.expires_in * 1000),
      refreshToken: token.refresh_token,
      refreshTokenExpiresAt: new Date(now + token.refresh_expires_in * 1000),
      scope: token.scope,
    };
  }

  /**
   * Stateless, signed OAuth state: `<adminId>.<issuedAt>.<nonce>.<hmac>`.
   * Prevents forged callbacks without needing a server-side session store.
   */
  private createState(adminId: string): string {
    const payload = [
      Buffer.from(adminId).toString('base64url'),
      Math.floor(Date.now() / 1000),
      randomBytes(16).toString('base64url'),
    ].join('.');
    return `${payload}.${this.sign(payload)}`;
  }

  private verifyState(state: string | undefined) {
    const parts = state?.split('.') ?? [];
    if (parts.length !== 4) {
      throw new UnauthorizedException('Invalid OAuth state');
    }
    const payload = parts.slice(0, 3).join('.');
    const expected = Buffer.from(this.sign(payload));
    const received = Buffer.from(parts[3]);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid OAuth state');
    }
    const issuedAt = Number(parts[1]);
    if (
      !issuedAt ||
      Date.now() / 1000 - issuedAt > STATE_TTL_SECONDS ||
      issuedAt > Date.now() / 1000 + 60
    ) {
      throw new UnauthorizedException('Expired OAuth state');
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.getCredentials().clientSecret)
      .update(`tiktok-oauth-state:${payload}`)
      .digest('base64url');
  }

  private getRedirectUri(): string {
    const configured = this.configService.get('tiktok.redirectUri', {
      infer: true,
    });
    if (configured) return configured;
    const base = this.configService.getOrThrow('app.publicBackendDomain', {
      infer: true,
    });
    const prefix = this.configService.getOrThrow('app.apiPrefix', {
      infer: true,
    });
    return `${base.replace(/\/$/, '')}/${prefix}/webhooks/tiktok/oauth/callback`;
  }

  private getCredentials() {
    const clientKey = this.configService.get('tiktok.clientKey', {
      infer: true,
    });
    const clientSecret = this.configService.get('tiktok.clientSecret', {
      infer: true,
    });
    if (!clientKey || !clientSecret) {
      throw new InternalServerErrorException(
        'TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET must be set',
      );
    }
    return { clientKey, clientSecret };
  }

  private describeError(error: unknown): string {
    if (isAxiosError(error)) {
      return `${error.response?.status ?? ''} ${JSON.stringify(error.response?.data ?? error.message)}`;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
