import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as path from 'path';
import { AnalysisService } from '../analysis/analysis.service';

@Processor('analysis')
export class AnalysisProcessor extends WorkerHost {
  constructor(private readonly analysisService: AnalysisService) {
    super();
  }

  async process(job: Job<{ userId: string; repoName: string }>) {
    const { userId, repoName } = job.data;
    await job.updateProgress(10);

    const repoDir = path.join('/tmp', 'devlens-repos', userId, repoName);
    await job.updateProgress(30);

    const results = this.analysisService.analyzeRepo(repoDir);
    await job.updateProgress(70);

    const graph = this.analysisService.buildGraph(results);
    await job.updateProgress(100);

    return graph;
  }
}
