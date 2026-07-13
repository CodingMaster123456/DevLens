import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private jwtService: JwtService) {}

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin() {
    // redirects to GitHub, handled by passport
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubCallback(@Req() req, @Res() res: Response) {
    const token = this.jwtService.sign({
      sub: req.user.githubId,
      username: req.user.username,
      githubAccessToken: req.user.accessToken,
    });
    res.redirect(`http://localhost:3000/auth/success?token=${token}`);
  }
}
