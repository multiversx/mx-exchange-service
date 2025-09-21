import {
    Address,
    BigUIntType,
    BinaryCodec,
    TokenIdentifierValue,
} from '@multiversx/sdk-core';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { Logger } from 'winston';
import { PairDocument } from '../pair/persistence/schemas/pair.schema';
import { PairPersistenceService } from '../pair/persistence/services/pair.persistence.service';
import { RouterAbiService } from '../router/services/router.abi.service';
import { CompetingRabbitConsumer } from './rabbitmq.consumers';
import { TrieLeafData } from './state-changes/trie_leaf_data';
import {
    StateAccessPerAccountRaw,
    BlockWithStateChanges,
} from './state.changes.types';
import { AnyBulkWriteOperation, MatchKeysAndValues } from 'mongodb';
import { PairModel } from '../pair/models/pair.model';
import { TokenPersistenceService } from '../tokens/persistence/services/token.persistence.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';

const PAIR_RESERVE_PREFIX = Buffer.from('reserve').toString('hex');

enum PAIR_FIELDS {
    firstTokenReserve = 'reserves0',
    secondTokenReserve = 'reserves1',
    totalSupply = 'totalSupply',
}

type PairStorageDecoder<T> = {
    outputField: PAIR_FIELDS;
    decode: (value: Uint8Array) => T;
};

type PairStateChanges = Partial<Record<PAIR_FIELDS, any>>;

@Injectable()
export class RabbitMqStateConsumer implements OnModuleInit {
    private filterAddresses: string[];
    private isInitialised = false;
    private pairs: Record<string, PairDocument> = {};

    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly dataApi: MXDataApiService,
        private readonly pairPersistence: PairPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.updateFilterAddresses();

        this.isInitialised = true;

        this.logger.info(`The module has been initialized.`, {
            context: RabbitMqStateConsumer.name,
        });
    }

    @CompetingRabbitConsumer({
        queueName: process.env.RABBITMQ_STATE_QUEUE,
        exchange: process.env.RABBITMQ_EXCHANGE_STATE,
        channel: 'channel-state',
    })
    async consume(blockData: BlockWithStateChanges): Promise<void> {
        if (!this.isInitialised) {
            this.logger.warn('Service not initialised, aborting run', {
                context: RabbitMqStateConsumer.name,
            });
            throw new Error('State changes consumer not initialised');
        }

        if (
            blockData.shardID !== 1 ||
            !blockData.stateAccessesPerAccounts ||
            Object.keys(blockData.stateAccessesPerAccounts).length === 0
        ) {
            return;
        }

        console.log({
            state: blockData,
            // stateJSON: JSON.stringify(blockData),
        });

        const addressesMap = new Map<string, string>();

        Object.keys(blockData.stateAccessesPerAccounts).forEach((address) => {
            const bech32Address = Address.newFromHex(address).toBech32();
            // console.log(bech32Address);
            if (
                this.filterAddresses.includes(bech32Address) ||
                bech32Address ===
                    'erd1qqqqqqqqqqqqqpgq72eyz4qce50nzrjcqncappkhx9pp5ycz0n4s044k4y'
            ) {
                addressesMap.set(address, bech32Address);
            }
        });

        if (addressesMap.size === 0) {
            return;
        }

        const profiler = new PerformanceProfiler();

        process.stdout.write(JSON.stringify(blockData) + '\n');
        // throw new Error('stop');

        const pairBulkOps: AnyBulkWriteOperation<PairDocument>[] = [];

        for (const [hexAddress, address] of addressesMap.entries()) {
            if (
                address !== scAddress.routerAddress &&
                address !==
                    'erd1qqqqqqqqqqqqqpgq72eyz4qce50nzrjcqncappkhx9pp5ycz0n4s044k4y'
            ) {
                const pair = this.pairs[address];
                const pairStateChanges = this.decodePairStateChanges(
                    pair,
                    blockData.stateAccessesPerAccounts[hexAddress].stateAccess,
                );

                // const updateOperations = this.getPairDbUpdateOperations(
                //     pair,
                //     pairStateChanges,
                // );

                // if (Object.keys(updateOperations).length > 0) {
                //     pairBulkOps.push({
                //         updateOne: {
                //             filter: { address },
                //             update: {
                //                 $set: updateOperations,
                //             },
                //         },
                //     });
                // }
            } else {
                this.decodeRouterStateChanges(
                    blockData.stateAccessesPerAccounts[hexAddress].stateAccess,
                );
            }
        }

        if (pairBulkOps.length > 0) {
            await this.pairPersistence.bulkUpdatePairs(pairBulkOps);

            await this.recomputePricesAndLiquidity();

            await this.updateFilterAddresses();
        }

        profiler.stop();
        console.log('bulk ops', JSON.stringify(pairBulkOps));

        this.logger.info(
            `Finished processing state update for block ${blockData.hash} in ${profiler.duration}`,
        );
    }

    async recomputePricesAndLiquidity(): Promise<void> {
        const usdcPrice = await this.dataApi.getTokenPrice('USDC');

        await this.tokenPersistence.bulkUpdatePairTokensPrice(usdcPrice);
        await this.pairPersistence.updatePairsLiquidityValuesUSD();
    }

    private decodePairStateChanges(
        pair: PairDocument,
        stateAccess: StateAccessPerAccountRaw[],
    ): PairStateChanges {
        if (stateAccess.length === 0) {
            this.logger.warn(`Empty stateAccess for pair ${pair.address}`, {
                context: RabbitMqStateConsumer.name,
            });
            return {};
        }

        const pairUpdates: PairStateChanges = {};

        this.logger.info(`Decoding pair ${pair.address} state changes`, {
            context: RabbitMqStateConsumer.name,
        });

        // console.log({
        //     address,
        //     state: stateAccess,
        //     // dataTrieChanges,
        //     // dataTrieChangesJSON: JSON.stringify(dataTrieChanges),
        // });

        const storageToFieldMap = this.getPairDecoders(pair);

        for (const state of stateAccess) {
            const dataTrieChanges = state.dataTrieChanges;
            const txHash = Buffer.from(state.txHash, 'base64').toString('hex');

            if (!dataTrieChanges || !Array.isArray(dataTrieChanges)) {
                this.logger.warn(
                    `No data trie changes in tx ${txHash} (i: ${state.index})`,
                    {
                        context: RabbitMqStateConsumer.name,
                    },
                );
                continue;
            }

            this.logger.info(
                `Decoding dataTrie changes in tx ${txHash} (i: ${state.index})`,
                {
                    context: RabbitMqStateConsumer.name,
                },
            );

            for (const change of dataTrieChanges) {
                if (change.version === 0) {
                    this.logger.warn(`Unsupported dataTrieChanges version 0`, {
                        context: RabbitMqStateConsumer.name,
                    });
                    continue;
                }

                // const trieLeadData: TrieLeafData = TrieLeafData.decode(
                //     Buffer.from(change.val, 'base64'),
                // );

                const keyHex = Buffer.from(change.key, 'base64').toString(
                    'hex',
                );

                if (!Object.keys(storageToFieldMap).includes(keyHex)) {
                    console.log(
                        `Skipping key ${keyHex} ${Buffer.from(
                            change.key,
                            'base64',
                        ).toString()}`,
                    );
                    continue;
                }

                pairUpdates[storageToFieldMap[keyHex].outputField] =
                    storageToFieldMap[keyHex].decode(Buffer.from(change.val));
            }
        }

        return pairUpdates;
    }

    private decodeRouterStateChanges(
        stateAccess: StateAccessPerAccountRaw[],
    ): void {
        this.logger.info(`Decoding router state changes`, {
            context: RabbitMqStateConsumer.name,
        });

        console.log({
            state: stateAccess,
            // dataTrieChanges,
            // dataTrieChangesJSON: JSON.stringify(dataTrieChanges),
        });

        for (const state of stateAccess) {
            const dataTrieChanges = state.dataTrieChanges;
            const txHash = Buffer.from(state.txHash, 'base64').toString('hex');

            if (!dataTrieChanges || !Array.isArray(dataTrieChanges)) {
                this.logger.warn(
                    `No data trie changes in tx ${txHash} (i: ${state.index})`,
                    {
                        context: RabbitMqStateConsumer.name,
                    },
                );
                continue;
            }

            this.logger.info(
                `Decoding dataTrie changes in tx ${txHash} (i: ${state.index})`,
                {
                    context: RabbitMqStateConsumer.name,
                },
            );

            for (const change of dataTrieChanges) {
                if (change.version === 0) {
                    this.logger.warn(`Unsupported dataTrieChanges version 0`, {
                        context: RabbitMqStateConsumer.name,
                    });
                    continue;
                }

                console.log(change);

                // const trieLeadData: TrieLeafData = TrieLeafData.decode(
                //     Buffer.from(change.val, 'base64'),
                // );

                // const keyHex = Buffer.from(trieLeadData.key).toString('hex');

                console.log({
                    key: Buffer.from(change.key, 'base64').toString('hex'),
                    keyStr: Buffer.from(change.key, 'base64').toString(),
                    value: Buffer.from(change.val, 'base64').toString('hex'),
                });

                // if (!Object.keys(storageToFieldMap).includes(keyHex)) {
                //     continue;
                // }
            }
        }
    }

    private getPairDbUpdateOperations(
        pair: PairDocument,
        stateChanges: PairStateChanges,
    ): MatchKeysAndValues<PairDocument> {
        if (Object.keys(stateChanges).length === 0) {
            return {};
        }

        const rawUpdates: Partial<PairModel> = {};
        if (
            Object.keys(stateChanges).includes(
                PAIR_FIELDS.firstTokenReserve ||
                    PAIR_FIELDS.secondTokenReserve ||
                    PAIR_FIELDS.totalSupply,
            )
        ) {
            pair.info = {
                reserves0: stateChanges.reserves0 ?? pair.info.reserves0,
                reserves1: stateChanges.reserves1 ?? pair.info.reserves1,
                totalSupply: stateChanges.totalSupply ?? pair.info.totalSupply,
            };

            const { firstTokenPrice, secondTokenPrice } =
                this.pairPersistence.computeTokensPrice(pair);

            rawUpdates.info = pair.info;
            rawUpdates.firstTokenPrice = firstTokenPrice;
            rawUpdates.secondTokenPrice = secondTokenPrice;
        }

        return Object.fromEntries(
            Object.entries(rawUpdates).filter(([, v]) => v !== undefined),
        ) as MatchKeysAndValues<PairDocument>;
    }

    private getPairDecoders(
        pair: PairDocument,
    ): Record<string, PairStorageDecoder<any>> {
        const codec = new BinaryCodec();

        const keyFirstTokenReserves =
            PAIR_RESERVE_PREFIX +
            codec
                .encodeNested(new TokenIdentifierValue(pair.firstTokenId))
                .toString('hex');
        const keySecondTokenReserves =
            PAIR_RESERVE_PREFIX +
            codec
                .encodeNested(new TokenIdentifierValue(pair.secondTokenId))
                .toString('hex');

        const keyLpTokenSupply = Buffer.from('lp_token_supply').toString('hex');

        const storageToFieldMap: Record<string, PairStorageDecoder<any>> = {
            [keyFirstTokenReserves]: {
                outputField: PAIR_FIELDS.firstTokenReserve,
                decode: decodeBigUIntType,
            },
            [keySecondTokenReserves]: {
                outputField: PAIR_FIELDS.secondTokenReserve,
                decode: decodeBigUIntType,
            },
            [keyLpTokenSupply]: {
                outputField: PAIR_FIELDS.totalSupply,
                decode: decodeBigUIntType,
            },
        };

        return storageToFieldMap;
    }

    async updateFilterAddresses(): Promise<void> {
        this.filterAddresses = [];
        this.pairs = {};

        const pairs = await this.pairPersistence.getPairs(
            {},
            {
                address: 1,
                firstToken: 1,
                firstTokenId: 1,
                secondToken: 1,
                secondTokenId: 1,
                info: 1,
            },
            {
                path: 'firstToken secondToken',
                select: ['identifier', 'decimals'],
            },
        );
        pairs.forEach((pair) => {
            this.filterAddresses.push(pair.address);
            this.pairs[pair.address] = pair;
        });

        this.filterAddresses.push(scAddress.routerAddress);
    }
}

const decodeBigUIntType = (value: Uint8Array): string => {
    return new BinaryCodec()
        .decodeTopLevel(Buffer.from(value), new BigUIntType())
        .valueOf()
        .toFixed();
};
