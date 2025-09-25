import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairPersistenceService } from '../pair/persistence/services/pair.persistence.service';

export enum PopulateStatus {
    NOT_STARTED = 'Not Started',
    IN_PROGRESS = 'In Progress',
    SUCCESSFUL = 'Successful',
    FAILED = 'Failed',
}

@Injectable()
export class PersistenceInitService {
    private status: PopulateStatus = PopulateStatus.NOT_STARTED;

    constructor(
        private readonly pairPersistence: PairPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    // TODO : better to use redlock here ?
    async populateDb(): Promise<PopulateStatus> {
        if (this.status === PopulateStatus.IN_PROGRESS) {
            return this.status;
        }

        this.status = PopulateStatus.IN_PROGRESS;

        try {
            await this.pairPersistence.populatePairs();

            await this.pairPersistence.refreshPairsPricesAndTVL();

            // await this.pairPersistence.refreshPairsAnalytics();

            this.status = PopulateStatus.SUCCESSFUL;
        } catch (error) {
            this.logger.error('Failed during DB populate', {
                context: PersistenceInitService.name,
            });
            this.logger.error(error);

            this.status = PopulateStatus.FAILED;
        } finally {
            return this.status;
        }
    }

    async refreshPairReserves(): Promise<PopulateStatus> {
        if (this.status === PopulateStatus.IN_PROGRESS) {
            return this.status;
        }

        this.status = PopulateStatus.IN_PROGRESS;

        try {
            await this.pairPersistence.refreshPairsStateAndReserves();
            await this.pairPersistence.refreshPairsPricesAndTVL();

            this.status = PopulateStatus.SUCCESSFUL;
        } catch (error) {
            this.logger.error('Failed pair reserves refresh', {
                context: PersistenceInitService.name,
            });
            this.logger.error(error);

            this.status = PopulateStatus.FAILED;
        } finally {
            return this.status;
        }
    }

    getStatus(): PopulateStatus {
        return this.status;
    }
}
