import { Address } from '@multiversx/sdk-core';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CompetingRabbitConsumer } from '../rabbitmq.consumers';
import {
    BlockWithStateChanges,
    StateAccessPerAccountRaw,
    TrackedPairFields,
} from './types';
import { getPairDecoders } from './state.changes.utils';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairsStateService } from 'src/modules/dex-state/services/pairs.state.service';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import { StateTasksService } from 'src/modules/dex-state/services/state.tasks.service';
import { StateTasks, TaskDto } from 'src/modules/dex-state/entities';

@Injectable()
export class StateChangesConsumer {
    private pairs: Map<string, PairModel> = new Map();

    constructor(
        private readonly pairsStateService: PairsStateService,
        private readonly stateTasksService: StateTasksService,
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

        await this.updatePairs();

        const filteredAddresses = [...this.pairs.keys()];

        const filteredStateAccesses = Object.entries(
            blockData.stateAccessesPerAccounts,
        ).filter((value) =>
            filteredAddresses.includes(Address.newFromHex(value[0]).toBech32()),
        );

        const pairsStateChanges: Map<string, Partial<PairModel>> = new Map();
        for (const entry of filteredStateAccesses.values()) {
            const address = Address.newFromHex(entry[0]).toBech32();

            const stateChanges = this.decodePairStateChanges(
                address,
                entry[1].stateAccess,
            );

            if (
                Object.keys(stateChanges).includes(TrackedPairFields.lpTokenID)
            ) {
                await this.stateTasksService.queueTasks([
                    new TaskDto({
                        name: StateTasks.INDEX_LP_TOKEN,
                        args: [address],
                    }),
                ]);

                delete stateChanges[TrackedPairFields.lpTokenID];
            }

            if (Object.keys(stateChanges).length > 0) {
                pairsStateChanges.set(address, stateChanges);
            }
        }

        const updateResult = await this.pairsStateService.updatePairs(
            pairsStateChanges,
        );

        if (updateResult.failedAddresses?.length > 0) {
            throw new Error(
                `Could not update pairs state (${updateResult.failedAddresses.join(
                    ',',
                )})`,
            );
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
    ): Partial<PairModel> {
        if (stateAccess.length === 0) {
            this.logger.warn(`Empty stateAccess for pair ${address}`, {
                context: StateChangesConsumer.name,
            });
            return {};
        }

        const pairUpdates: Partial<PairModel> = {};

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

                const { outputField, decode: decodeFunction } =
                    storageToFieldMap[keyHex];

                if (
                    [
                        TrackedPairFields.firstTokenReserve,
                        TrackedPairFields.secondTokenReserve,
                        TrackedPairFields.totalSupply,
                    ].includes(outputField)
                ) {
                    if (pairUpdates.info === undefined) {
                        pairUpdates.info = new PairInfoModel({ ...pair.info });
                    }

                    pairUpdates.info[outputField] = decodeFunction(
                        Buffer.from(change.val, 'base64'),
                    );
                } else {
                    pairUpdates[outputField] = decodeFunction(
                        Buffer.from(change.val, 'base64'),
                    );
                }
            }
        }

        return pairUpdates;
    }

    async updatePairs(): Promise<void> {
        this.pairs.clear();

        const pairs = await this.pairsStateService.getAllPairs([
            'address',
            'firstTokenId',
            'secondTokenId',
        ]);

        pairs.forEach((pair) => this.pairs.set(pair.address, pair));
    }
}
