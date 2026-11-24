
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  Throttle,
  ThrottlerGuard,
} from '@nestjs/throttler';

import type {
  Request,
  Response,
  CookieOptions,
} from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';

import {
  AUTH_COOKIE_NAME,
  SESSION_DURATION_MS,
} from './auth.constants';

import type {
  AuthenticatedRequest,
} from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,

      secure:
        this.configService.get('NODE_ENV') === 'production',

      sameSite: 'strict',

      path: '/api',
    };
  }

  @Get('pos-operators')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  posOperators() {
    return this.authService.listPosOperators();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      dto,
      request.ip,
      request.get('user-agent'),
    );

    response.cookie(
      AUTH_COOKIE_NAME,
      result.token,
      {
        ...this.cookieOptions(),
        maxAge: SESSION_DURATION_MS,
      },
    );

    return {
      message: 'Login realizado com sucesso.',
      user: result.user,
      expiresAt: result.expiresAt,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return {
      user: request.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token: unknown =
      request.cookies?.[AUTH_COOKIE_NAME];

    if (typeof token === 'string') {
      await this.authService.logout(token);
    }

    response.clearCookie(
      AUTH_COOKIE_NAME,
      this.cookieOptions(),
    );

    return {
      message: 'Sessão encerrada com sucesso.',
    };
  }
}
