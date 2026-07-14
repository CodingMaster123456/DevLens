import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('analysis/jobs')
@UseGuards(AuthGuard('jwt'))
export class JobsController {
  constructor(@InjectQueue('analysis') private readonly analysisQueue: Queue) {}

  @Post()
  async createJob(@Req() req, @Body('name') name: string) {
    const job = await this.analysisQueue.add('analyze-repo', {
      userId: String(req.user.sub),
      repoName: name,
    });
    return { jobId: job.id };
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    const job = await this.analysisQueue.getJob(id);
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress;

    if (state === 'completed') {
      return { status: 'completed', progress: 100, graph: job.returnvalue };
    }
    if (state === 'failed') {
      return { status: 'failed', error: job.failedReason };
    }
    return { status: state, progress };
  }
}
