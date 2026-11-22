// Server-side only: populated from the TikTok OAuth token exchange, never from
// an HTTP request body.
export class CreateTiktokAccountDto {
  refreshTokenExpiresAt: Date;

  refreshToken: string;

  accessTokenExpiresAt: Date;

  accessToken: string;

  scope: string;

  avatarUrl?: string | null;

  displayName?: string | null;

  openId: string;
}
