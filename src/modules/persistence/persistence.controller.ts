import { Controller, Get } from '@nestjs/common';
import {
    PersistenceInitService,
    PersistenceTasks,
    PopulateStatus,
} from './services/persistence.init.service';

@Controller('/persistence')
export class PersistenceController {
    constructor(private readonly persistenceInit: PersistenceInitService) {}

    @Get('/populate')
    async populateDb(): Promise<string> {
        await this.persistenceInit.queueTask({
            name: PersistenceTasks.POPULATE_DB,
        });

        return `Task 'populate DB' added to queue`;
    }

    @Get('/refresh-reserves')
    async refreshPairReserves(): Promise<string> {
        await this.persistenceInit.queueTask({
            name: PersistenceTasks.REFRESH_PAIR_RESERVES,
        });

        return `Task 'refresh reserves' added to queue`;
    }

    @Get('/status')
    getStatus(): PopulateStatus {
        return this.persistenceInit.getStatus();
    }
}
