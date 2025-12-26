import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitter';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  constructor(private configService: ConfigService) {
    const consumerKey = configService.get<string>('TWITTER_CONSUMER_KEY');
    const apiBaseUrl = configService.get<string>('API_BASE_URL') || 'http://localhost:3001';
    const callbackURL = configService.get<string>('TWITTER_CALLBACK_URL') || `${apiBaseUrl}/auth/twitter/callback`;

    console.log(`Twitter OAuth initialized with callbackURL: ${callbackURL}`);

    super({
      consumerKey: consumerKey || 'placeholder-consumer-key',
      consumerSecret: configService.get<string>('TWITTER_CONSUMER_SECRET') || 'placeholder-consumer-secret',
      callbackURL: callbackURL,
      includeEmail: true,
    });

    if (!consumerKey) {
      console.warn('Twitter OAuth is not configured. Twitter login will not work.');
    }
  }

  async validate(
    token: string,
    tokenSecret: string,
    profile: any,
    done: (err: any, user: any) => void,
  ): Promise<any> {
    const { id, username, displayName, emails, photos } = profile;
    const user = {
      twitterId: id,
      username,
      displayName,
      email: emails && emails.length > 0 ? emails[0].value : null,
      picture: photos && photos.length > 0 ? photos[0].value : null,
      token,
      tokenSecret,
    };
    done(null, user);
  }
}
