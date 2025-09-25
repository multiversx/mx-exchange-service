import { Address } from '@multiversx/sdk-core/out';
import {
    CreatePairEvent,
    PairSwapEnabledEvent,
} from '@multiversx/sdk-exchange';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PairPersistenceService } from 'src/modules/pair/persistence/services/pair.persistence.service';
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

        const { firstTokenID, secondTokenID } = event.toJSON();
        const address = (
            event.toJSON().address as unknown as Address
        ).toBech32();

        const pair = await this.pairPersistence.populatePairModel(
            new PairMetadata({ address, firstTokenID, secondTokenID }),
        );

        await this.pairPersistence.updateAbiFields(pair);

        profiler.stop();

        this.logger.info(
            `Persistence create pair event handler finished in ${profiler.duration}`,
        );
    }

    async handlePairSwapEnabledEvent(
        event: PairSwapEnabledEvent,
    ): Promise<void> {
        const profiler = new PerformanceProfiler();

        const pair = await this.pairPersistence.getPair({
            address: event.getPairAddress().bech32(),
        });

        await Promise.all([
            this.pairPersistence.updateLpToken(pair),
            this.pairPersistence.updateStateAndReserves(pair),
        ]);

        profiler.stop();

        this.logger.info(
            `Persistence swap enabled event handler finished in ${profiler.duration}`,
        );
    }
}
