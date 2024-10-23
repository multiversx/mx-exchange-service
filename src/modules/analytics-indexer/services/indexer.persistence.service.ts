import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    IndexerJob,
    IndexerSession,
    IndexerStatus,
} from '../schemas/indexer.session.schema';
import moment from 'moment';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { IndexerSessionRepositoryService } from 'src/services/database/repositories/indexer.session.repository';
import { CreateSessionDto } from '../entities/create.session.dto';

@Injectable()
export class IndexerPersistenceService {
    constructor(
        private readonly indexerSessionRepository: IndexerSessionRepositoryService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    public async createIndexerSession(
        createSessionDto: CreateSessionDto,
    ): Promise<IndexerSession> {
        const { start } = createSessionDto;

        const end = !createSessionDto.end
            ? moment().unix()
            : createSessionDto.end;

        if (start >= end) {
            throw new Error('End timestamp should be after start');
        }

        const activeSession = await this.getActiveSession();

        if (activeSession) {
            throw new Error(
                'Cannot start a session while another one is in progress.',
            );
        }

        return await this.indexerSessionRepository.create({
            name: `Session_${moment().unix()}`,
            startTimestamp: start,
            endTimestamp: end,
            eventTypes: createSessionDto.eventTypes,
            jobs: this.createSessionJobs(start, end),
            status: IndexerStatus.PENDING,
        });
    }

    public async getActiveSession(): Promise<IndexerSession> {
        return await this.indexerSessionRepository.findOne({
            status: {
                $in: [IndexerStatus.IN_PROGRESS, IndexerStatus.PENDING],
            },
        });
    }

    private createSessionJobs(start: number, end: number): IndexerJob[] {
        const jobs: IndexerJob[] = [];
        const oneWeek = Constants.oneWeek();

        let currentStart = start;
        let order = 0;

        while (currentStart <= end) {
            let currentEnd = Math.min(currentStart + oneWeek, end);

            // avoid edge case where remaining interval is a single second
            if (currentEnd + 1 === end) {
                currentEnd -= 1;
            }

            jobs.push(
                new IndexerJob({
                    startTimestamp: currentStart,
                    endTimestamp: currentEnd,
                    order: order,
                    status: IndexerStatus.PENDING,
                }),
            );
            currentStart = currentEnd + 1;
            order += 1;
        }

        return jobs;
    }
}
