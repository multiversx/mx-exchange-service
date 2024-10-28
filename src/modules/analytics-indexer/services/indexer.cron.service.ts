import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import moment from 'moment';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Lock } from '@multiversx/sdk-nestjs-common';
import {
    IndexerJob,
    IndexerSession,
    IndexerStatus,
} from '../schemas/indexer.session.schema';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { IndexerService } from './indexer.service';
import { IndexerPersistenceService } from './indexer.persistence.service';
import { IndexerEventTypes } from '../entities/indexer.event.types';

const JOB_MAX_ATTEMPTS = 3;

@Injectable()
export class IndexerCronService {
    constructor(
        private readonly indexerService: IndexerService,
        private readonly indexerPersistence: IndexerPersistenceService,
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
                await this.indexerPersistence.updateSession(activeSession);
            }

            await this.processIndexingJobs(activeSession);
        } catch (error) {
            const logMessage = generateLogMessage(
                IndexerCronService.name,
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

                await this.indexerPersistence.updateSession(session);

                session.jobs[index] = await this.runIndexingJob(
                    job,
                    session.eventTypes,
                );

                await this.indexerPersistence.updateSession(session);
            } catch (error) {
                this.logger.error(
                    `Indexing session ${session.name} failed`,
                    error,
                );
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
                errorsCount = await this.indexerService.indexAnalytics(
                    job.startTimestamp,
                    job.endTimestamp,
                    eventTypes,
                );

                profiler.stop();

                this.logger.info(
                    `Finished indexing analytics data between '${startDate}' and '${endDate}' in ${profiler.duration}ms`,
                    {
                        context: 'IndexerCronService',
                    },
                );

                job.runAttempts += 1;
                job.errorCount = errorsCount;
                job.durationMs = profiler.duration;
                job.status = IndexerStatus.COMPLETED;

                return job;
            } catch (error) {
                job.runAttempts += 1;
                this.logger.error(
                    `Failed attempt #${job.runAttempts} while indexing analytics data between '${startDate}' and '${endDate}'`,
                    error,
                );
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

        await this.indexerPersistence.updateSession(session);

        await this.cachingService.delete(
            `indexer.abortSession.${session.name}`,
        );
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

        await this.indexerPersistence.updateSession(session);
    }

    private async markSessionCompleted(session: IndexerSession): Promise<void> {
        session.status = IndexerStatus.COMPLETED;

        await this.indexerPersistence.updateSession(session);
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
