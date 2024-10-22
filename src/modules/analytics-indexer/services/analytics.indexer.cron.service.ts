import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { AnalyticsIndexerService } from 'src/modules/analytics-indexer/services/analytics.indexer.service';
import {
    IndexerEventTypes,
    IndexerJob,
    IndexerSession,
    IndexerStatus,
} from '../schemas/indexer.session.schema';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import moment from 'moment';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { IndexerSessionRepositoryService } from 'src/services/database/repositories/indexer.session.repository';
import { AnalyticsIndexerPersistenceService } from './analytics.indexer.persistence.service';

const JOB_MAX_ATTEMPTS = 3;

@Injectable()
export class AnalyticsIndexerCronService {
    constructor(
        private readonly analyticsIndexer: AnalyticsIndexerService,
        private readonly indexerSessionRepository: IndexerSessionRepositoryService,
        private readonly indexerPersistence: AnalyticsIndexerPersistenceService,
        private readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    async onModuleInit() {
        await this.resetStuckJobsAndSessions();
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    @Lock({ name: 'indexAnalytics' })
    public async indexAnalytics() {
        let activeSession: IndexerSession;

        try {
            activeSession = await this.indexerPersistence.getActiveSession();
            if (!activeSession) {
                return;
            }

            const sessionAbortSignal = await this.getSessionAbortSignal(
                activeSession,
            );
            if (sessionAbortSignal) {
                return await this.markSessionAborted(activeSession);
            }

            if (activeSession.status === IndexerStatus.PENDING) {
                activeSession.status = IndexerStatus.IN_PROGRESS;
                await this.indexerSessionRepository.findOneAndUpdate(
                    { name: activeSession.name },
                    activeSession,
                );
            }

            await this.processIndexingJobs(activeSession);
        } catch (error) {
            const logMessage = generateLogMessage(
                AnalyticsIndexerCronService.name,
                this.indexAnalytics.name,
                '',
                error,
            );
            this.logger.error(logMessage);
        }
    }

    private async processIndexingJobs(session: IndexerSession): Promise<void> {
        for (const [index, job] of session.jobs.entries()) {
            if (
                job.status !== IndexerStatus.IN_PROGRESS &&
                job.status !== IndexerStatus.PENDING
            ) {
                continue;
            }

            try {
                job.status = IndexerStatus.IN_PROGRESS;

                await this.indexerSessionRepository.findOneAndUpdate(
                    { name: session.name },
                    session,
                );

                session.jobs[index] = await this.runIndexingJob(
                    job,
                    session.eventTypes,
                );

                await this.indexerSessionRepository.findOneAndUpdate(
                    { name: session.name },
                    session,
                );
            } catch (error) {
                await this.markSessionFailed(session);
                break;
            }
        }

        return await this.markSessionCompleted(session);
    }

    private async runIndexingJob(
        job: IndexerJob,
        eventTypes: IndexerEventTypes[],
    ): Promise<IndexerJob> {
        const profiler = new PerformanceProfiler();

        const startDate = moment
            .unix(job.startTimestamp)
            .format('YYYY-MM-DD HH:mm:ss');
        const endDate = moment
            .unix(job.endTimestamp)
            .format('YYYY-MM-DD HH:mm:ss');

        let errorsCount = 0;
        while (job.runAttempts < JOB_MAX_ATTEMPTS) {
            try {
                errorsCount = await this.analyticsIndexer.indexAnalytics(
                    job.startTimestamp,
                    job.endTimestamp,
                    eventTypes,
                );

                this.logger.info(
                    `Finished indexing analytics data between '${startDate}' and '${endDate}' in ${profiler.duration}ms`,
                    {
                        context: 'AnalyticsIndexerCronService',
                    },
                );

                profiler.stop();

                job.runAttempts += 1;
                job.errorCount = errorsCount;
                job.durationMs = profiler.duration;
                job.status = IndexerStatus.COMPLETED;

                return job;
            } catch (error) {
                job.runAttempts += 1;
                console.log('EXTRA ATTEMPT', job.runAttempts);
            }
        }

        profiler.stop();

        throw new Error(
            `Failed to index analytics data between '${startDate}' and '${endDate}'`,
        );
    }

    private async getSessionAbortSignal(
        session: IndexerSession,
    ): Promise<boolean> {
        const abortSignal = await this.cachingService.get(
            `indexer.abortSession.${session.name}`,
        );

        if (abortSignal) {
            return true;
        }

        return false;
    }

    private async markSessionAborted(session: IndexerSession): Promise<void> {
        session = this.updateSessionAndJobsStatus(
            session,
            [IndexerStatus.PENDING, IndexerStatus.IN_PROGRESS],
            IndexerStatus.ABORTED,
        );

        this.indexerSessionRepository.findOneAndUpdate(
            { name: session.name },
            session,
        );

        await this.cachingService.delete(
            `indexer.abortSession.${session.name}`,
        );

        return;
    }

    private async markSessionFailed(session: IndexerSession): Promise<void> {
        session = this.updateSessionAndJobsStatus(
            session,
            [
                IndexerStatus.PENDING,
                IndexerStatus.IN_PROGRESS,
                IndexerStatus.ABORTED,
            ],
            IndexerStatus.FAILED,
        );

        this.indexerSessionRepository.findOneAndUpdate(
            { name: session.name },
            session,
        );

        return;
    }

    private async markSessionCompleted(session: IndexerSession): Promise<void> {
        session.status = IndexerStatus.COMPLETED;
        await this.indexerSessionRepository.findOneAndUpdate(
            { name: session.name },
            session,
        );
    }

    private updateSessionAndJobsStatus(
        session: IndexerSession,
        affectedStatuses: IndexerStatus[],
        newStatus: IndexerStatus,
    ): IndexerSession {
        session.status = newStatus;

        for (const job of session.jobs) {
            if (affectedStatuses.includes(job.status)) {
                job.status = newStatus;
            }
        }

        return session;
    }

    private async resetStuckJobsAndSessions(): Promise<void> {
        // TODO implement reset functionality
    }
}
