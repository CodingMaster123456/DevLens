import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID')!,
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET')!,
      callbackURL: config.get<string>('GITHUB_CALLBACK_URL')!,
      scope: ['read:user', 'repo'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return {
      githubId: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      accessToken,
    };
  }
}
