import { Address } from '@multiversx/sdk-core';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { Logger } from 'winston';
import { PairPersistenceService } from '../../persistence/services/pair.persistence.service';
import { RouterAbiService } from '../../router/services/router.abi.service';
import { TokenPersistenceService } from '../../persistence/services/token.persistence.service';
import { CompetingRabbitConsumer } from '../rabbitmq.consumers';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { PairDocument } from 'src/modules/persistence/schemas/pair.schema';
import { PersistenceService } from 'src/modules/persistence/services/persistence.service';
import { BlockWithStateChanges, StateAccessPerAccountRaw } from './types';
import {
    PairStateChanges,
    PersistenceTasks,
    TaskDto,
    TrackedPairFields,
} from 'src/modules/persistence/entities';
import { BulkUpdatesService } from 'src/modules/persistence/services/bulk.updates.service';
import { getPairDecoders } from './state.changes.utils';

@Injectable()
export class StateChangesConsumer {
    private pairs: Map<string, PairDocument> = new Map();
    private tokens: Map<string, EsdtToken> = new Map();

    constructor(
        private readonly dataApi: MXDataApiService,
        private readonly routerAbi: RouterAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly pairPersistence: PairPersistenceService,
        private readonly persistenceService: PersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @CompetingRabbitConsumer({
        queueName: process.env.RABBITMQ_STATE_QUEUE,
        exchange: process.env.RABBITMQ_EXCHANGE_STATE,
        channel: 'channel-state',
    })
    async consume(blockData: BlockWithStateChanges): Promise<void> {
        if (
            blockData.shardID !== 1 ||
            !blockData.stateAccessesPerAccounts ||
            Object.keys(blockData.stateAccessesPerAccounts).length === 0
        ) {
            return;
        }

        const profiler = new PerformanceProfiler();

        await this.updatePairsAndTokens();

        const filteredAddresses = [...this.pairs.keys()];

        const filteredStateAccesses = Object.entries(
            blockData.stateAccessesPerAccounts,
        ).filter((value) =>
            filteredAddresses.includes(Address.newFromHex(value[0]).toBech32()),
        );

        const pairsStateChanges: Map<string, PairStateChanges> = new Map();
        for (const entry of filteredStateAccesses.values()) {
            const address = Address.newFromHex(entry[0]).toBech32();

            const stateChanges = this.decodePairStateChanges(
                address,
                entry[1].stateAccess,
            );

            if (
                Object.keys(stateChanges).includes(TrackedPairFields.lpTokenID)
            ) {
                await this.persistenceService.queueTasks([
                    new TaskDto({
                        name: PersistenceTasks.INDEX_LP_TOKEN,
                        args: [address],
                    }),
                ]);

                delete stateChanges[TrackedPairFields.lpTokenID];
            }

            if (Object.keys(stateChanges).length > 0) {
                pairsStateChanges.set(address, stateChanges);
            }
        }

        if (pairsStateChanges.size > 0) {
            const [usdcPrice, commonTokenIDs] = await Promise.all([
                this.dataApi.getTokenPrice('USDC'),
                this.routerAbi.commonTokensForUserPairs(),
            ]);

            const stateChangesProcessor = new BulkUpdatesService(
                this.pairs,
                this.tokens,
                usdcPrice,
                commonTokenIDs,
            );
            const { pairBulkOps, tokenBulkOps } =
                stateChangesProcessor.getDbUpdateOperations(pairsStateChanges);

            await Promise.all([
                this.tokenPersistence.bulkUpdateTokens(
                    tokenBulkOps,
                    'stateChange',
                ),
                this.pairPersistence.bulkUpdatePairs(
                    pairBulkOps,
                    'stateChange',
                ),
            ]);
        }

        profiler.stop();

        this.logger.info(
            `Finished processing state changes for block ${blockData.hash} in ${profiler.duration}`,
            {
                context: StateChangesConsumer.name,
            },
        );
    }

    private decodePairStateChanges(
        address: string,
        stateAccess: StateAccessPerAccountRaw[],
    ): PairStateChanges {
        if (stateAccess.length === 0) {
            this.logger.warn(`Empty stateAccess for pair ${address}`, {
                context: StateChangesConsumer.name,
            });
            return {};
        }

        const pairUpdates: PairStateChanges = {};

        this.logger.info(`Decoding pair ${address} state changes`, {
            context: StateChangesConsumer.name,
        });

        const pair = this.pairs.get(address);
        const storageToFieldMap = getPairDecoders(pair);

        for (const state of stateAccess) {
            const dataTrieChanges = state.dataTrieChanges;
            const txHash = Buffer.from(state.txHash, 'base64').toString('hex');

            if (!dataTrieChanges || !Array.isArray(dataTrieChanges)) {
                this.logger.warn(
                    `No data trie changes in tx ${txHash} (i: ${state.index})`,
                    {
                        context: StateChangesConsumer.name,
                    },
                );
                continue;
            }

            this.logger.debug(
                `Decoding dataTrie changes in tx ${txHash} (i: ${state.index})`,
                {
                    context: StateChangesConsumer.name,
                },
            );

            for (const change of dataTrieChanges) {
                if (change.version === 0) {
                    this.logger.warn(`Unsupported dataTrieChanges version 0`, {
                        context: StateChangesConsumer.name,
                    });
                    continue;
                }

                const keyHex = Buffer.from(change.key, 'base64').toString(
                    'hex',
                );

                if (!Object.keys(storageToFieldMap).includes(keyHex)) {
                    this.logger.debug(
                        `Skipping key ${keyHex} ${Buffer.from(
                            change.key,
                            'base64',
                        ).toString()}`,
                        {
                            context: StateChangesConsumer.name,
                        },
                    );
                    continue;
                }

                pairUpdates[storageToFieldMap[keyHex].outputField] =
                    storageToFieldMap[keyHex].decode(
                        Buffer.from(change.val, 'base64'),
                    );
            }
        }

        return pairUpdates;
    }

    async updatePairsAndTokens(): Promise<void> {
        this.pairs = new Map();
        this.tokens = new Map();

        const [pairs, tokens] = await Promise.all([
            this.pairPersistence.getPairs(
                {},
                {
                    address: 1,
                    firstTokenId: 1,
                    firstTokenPrice: 1,
                    firstTokenPriceUSD: 1,
                    firstTokenLockedValueUSD: 1,
                    secondTokenId: 1,
                    secondTokenPrice: 1,
                    secondTokenPriceUSD: 1,
                    secondTokenLockedValueUSD: 1,
                    liquidityPoolTokenId: 1,
                    liquidityPoolTokenPriceUSD: 1,
                    lockedValueUSD: 1,
                    info: 1,
                    state: 1,
                    totalFeePercent: 1,
                    specialFeePercent: 1,
                },
                undefined,
                true,
            ),
            this.tokenPersistence.getTokens(
                {},
                {
                    identifier: 1,
                    decimals: 1,
                    price: 1,
                    derivedEGLD: 1,
                    liquidityUSD: 1,
                    type: 1,
                    pairAddress: 1,
                },
                true,
            ),
        ]);

        pairs.forEach((pair) => this.pairs.set(pair.address, pair));
        tokens.forEach((token) => this.tokens.set(token.identifier, token));
    }
}
