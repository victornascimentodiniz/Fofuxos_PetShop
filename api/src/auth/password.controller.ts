import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import type { Response } from 'express';

import { PasswordService } from './password.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from './guards/auth.guard';
import { AUTH_COOKIE_NAME } from './auth.constants';

import type { AuthenticatedRequest } from './auth.types';

@Controller('auth')
export class PasswordController {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
  ) {}

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, ThrottlerGuard)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result =
      await this.passwordService.changePassword(
        request.user.id,
        dto,
      );

    response.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure:
        this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api',
    });

    return result;
  }
}
