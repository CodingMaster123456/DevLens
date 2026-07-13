import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import simpleGit from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

@Controller('repos')
@UseGuards(AuthGuard('jwt'))
export class ReposController {
  @Get()
  async listRepos(@Req() req) {
    const token = req.user.githubAccessToken;
    const response = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const repos = await response.json();
    return repos.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      cloneUrl: r.clone_url,
      private: r.private,
      updatedAt: r.updated_at,
    }));
  }

  @Post('clone')
  async cloneRepo(@Req() req, @Body('cloneUrl') cloneUrl: string, @Body('name') name: string) {
    const token = req.user.githubAccessToken;
    const authedUrl = cloneUrl.replace('https://', `https://${token}@`);

    const targetDir = path.join('/tmp', 'devlens-repos', String(req.user.sub), name);
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });

    if (fs.existsSync(targetDir)) {
      return { status: 'already_cloned', path: targetDir };
    }

    await simpleGit().clone(authedUrl, targetDir);
    return { status: 'cloned', path: targetDir };
  }
}
