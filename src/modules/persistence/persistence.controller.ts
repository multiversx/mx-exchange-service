import { Controller, Get } from '@nestjs/common';
import {
    PersistenceInitService,
    PopulateStatus,
} from './persistence.init.service';

@Controller('/persistence')
export class PersistenceController {
    constructor(private readonly persistenceInit: PersistenceInitService) {}

    @Get('/populate')
    async populateDb(): Promise<PopulateStatus> {
        return this.persistenceInit.populateDb();
    }

    @Get('/refresh-reserves')
    async refreshPairReserves(): Promise<PopulateStatus> {
        return this.persistenceInit.refreshPairReserves();
    }

    @Get('/status')
    getStatus(): PopulateStatus {
        return this.persistenceInit.getStatus();
    }
}
