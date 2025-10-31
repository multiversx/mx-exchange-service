import {
    CreatePairEvent,
    PairSwapEnabledEvent,
} from '@multiversx/sdk-exchange';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PairPersistenceService } from 'src/modules/persistence/services/pair.persistence.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { Logger } from 'winston';

@Injectable()
export class PersistenceEventHandlerService {
    constructor(
        private readonly pairPersistence: PairPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleCreatePairEvent(event: CreatePairEvent): Promise<void> {
        const profiler = new PerformanceProfiler();

        const { pairAddress, firstTokenID, secondTokenID } = event.toJSON();

        const pair = await this.pairPersistence.populatePairModel(
            new PairMetadata({
                address: pairAddress,
                firstTokenID,
                secondTokenID,
            }),
            event.getTimestamp().toNumber(),
        );

        await this.pairPersistence.updateAbiFields(pair);

        profiler.stop();

        this.logger.info(
            `Persistence create pair event handler finished in ${profiler.duration}`,
            { context: PersistenceEventHandlerService.name },
        );
    }

    async handlePairSwapEnabledEvent(
        event: PairSwapEnabledEvent,
    ): Promise<void> {
        const profiler = new PerformanceProfiler();

        const [pair] = await this.pairPersistence.getPairs({
            address: event.getPairAddress().bech32(),
        });

        await this.pairPersistence.updateLpToken(pair);
        await this.pairPersistence.updateStateAndReserves(pair);
        await this.pairPersistence.updateAbiFields(pair);

        profiler.stop();

        this.logger.info(
            `Persistence swap enabled event handler finished in ${profiler.duration}`,
            { context: PersistenceEventHandlerService.name },
        );
    }
}
