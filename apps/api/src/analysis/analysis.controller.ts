import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as path from 'path';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
@UseGuards(AuthGuard('jwt'))
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  analyze(@Req() req, @Body('name') name: string) {
    const repoDir = path.join('/tmp', 'devlens-repos', String(req.user.sub), name);
    const results = this.analysisService.analyzeRepo(repoDir);

    const summary = {
      totalFiles: results.length,
      totalFunctions: results.reduce((sum, f) => sum + f.functions.length, 0),
      totalClasses: results.reduce((sum, f) => sum + f.classes.length, 0),
    };

    return { summary, files: results };
  }

  @Post('graph')
  graph(@Req() req, @Body('name') name: string) {
    const repoDir = path.join('/tmp', 'devlens-repos', String(req.user.sub), name);
    const results = this.analysisService.analyzeRepo(repoDir);
    return this.analysisService.buildGraph(results);
  }
}
