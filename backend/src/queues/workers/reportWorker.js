/**
 * reportWorker
 * Processes report and strategy generation jobs from the REPORT queue.
 */
import QueueService from '../../services/QueueService.js';
import ReportService from '../../services/ReportService.js';
import StrategyService from '../../services/StrategyService.js';
import JobExecution from '../../models/JobExecution.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.js';
import logger from '../../utils/logger.js';

export function registerReportWorker() {
  QueueService.createWorker(QUEUE_NAMES.REPORT, async (job) => {
    const startedAt = Date.now();
    const { name, data } = job;

    logger.info('reportWorker: processing job', { name, jobId: job.id });

    let execDoc;
    try {
      execDoc = await JobExecution.create({
        queue: QUEUE_NAMES.REPORT,
        jobName: name,
        jobId: String(job.id),
        data,
        status: 'running',
        startedAt: new Date(),
      });
    } catch (_) { /* non-fatal */ }

    try {
      let records = 0;

      if (name === JOB_NAMES.GENERATE_STRATEGY) {
        await StrategyService.generate(data.userId, data.strategyId);
        records = 1;
      } else {
        // Weekly/monthly/quarterly/yearly/custom report
        await ReportService.generate(data.userId, data.reportId);
        records = 1;
      }

      const duration = Date.now() - startedAt;
      if (execDoc) {
        await JobExecution.findByIdAndUpdate(execDoc._id, {
          status: 'completed',
          duration,
          recordsProcessed: records,
          completedAt: new Date(),
        });
      }

      logger.info('reportWorker: job complete', { name, duration });
      return { success: true, records };
    } catch (err) {
      const duration = Date.now() - startedAt;
      if (execDoc) {
        await JobExecution.findByIdAndUpdate(execDoc._id, {
          status: 'failed',
          duration,
          error: err.message,
          completedAt: new Date(),
        });
      }
      logger.error('reportWorker: job failed', { name, error: err.message });
      throw err;
    }
  });
}
