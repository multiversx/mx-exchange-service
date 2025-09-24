import {
    Address,
    BigUIntType,
    BinaryCodec,
    TokenIdentifierValue,
} from '@multiversx/sdk-core';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { Logger } from 'winston';
import { PairPersistenceService } from '../../pair/persistence/services/pair.persistence.service';
import { RouterAbiService } from '../../router/services/router.abi.service';
import { TokenPersistenceService } from '../../tokens/persistence/services/token.persistence.service';
import { CompetingRabbitConsumer } from '../rabbitmq.consumers';
import {
    BlockWithStateChanges,
    StateAccessPerAccountRaw,
} from '../state.changes.types';
import { PairModel } from '../../pair/models/pair.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { StateChangesProcessor } from './state.changes.processor';

const PAIR_RESERVE_PREFIX = Buffer.from('reserve').toString('hex');

export enum PAIR_FIELDS {
    firstTokenReserve = 'reserves0',
    secondTokenReserve = 'reserves1',
    totalSupply = 'totalSupply',
}

type PairStorageDecoder<T> = {
    outputField: PAIR_FIELDS;
    decode: (value: Uint8Array) => T;
};

export type PairStateChanges = Partial<Record<PAIR_FIELDS, any>>;

@Injectable()
export class StateChangesConsumer implements OnModuleInit {
    private isInitialised = false;
    private filterAddresses: string[];
    private pairs: Map<string, PairModel> = new Map();
    private tokens: Map<string, EsdtToken> = new Map();

    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly dataApi: MXDataApiService,
        private readonly pairPersistence: PairPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.updatePairsAndTokens();

        this.isInitialised = true;

        this.logger.info(`The module has been initialized.`, {
            context: StateChangesConsumer.name,
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
                context: StateChangesConsumer.name,
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

        const addressesMap = new Map<string, string>();

        Object.keys(blockData.stateAccessesPerAccounts).forEach((address) => {
            const bech32Address = Address.newFromHex(address).toBech32();

            if (this.filterAddresses.includes(bech32Address)) {
                addressesMap.set(address, bech32Address);
            }
        });

        if (addressesMap.size === 0) {
            return;
        }

        const profiler = new PerformanceProfiler();

        await this.updatePairsAndTokens();
        // console.log({
        //     state: blockData,
        //     stateJSON: JSON.stringify(blockData),
        // });

        const pairsStateChanges: Map<string, PairStateChanges> = new Map();
        for (const [hexAddress, address] of addressesMap.entries()) {
            if (address !== scAddress.routerAddress) {
                // const pair = this.pairs.get(address);

                const stateChanges = this.decodePairStateChanges(
                    address,
                    blockData.stateAccessesPerAccounts[hexAddress].stateAccess,
                );

                if (Object.keys(stateChanges).length > 0) {
                    pairsStateChanges.set(address, stateChanges);
                }
            }
        }

        if (pairsStateChanges.size > 0) {
            const [usdcPrice, commonTokenIDs] = await Promise.all([
                this.dataApi.getTokenPrice('USDC'),
                this.routerAbi.commonTokensForUserPairs(),
            ]);

            const stateChangesProcessor = new StateChangesProcessor(
                this.pairs,
                this.tokens,
                usdcPrice,
                commonTokenIDs,
            );
            const { pairBulkOps, tokenBulkOps } =
                stateChangesProcessor.getDbUpdateOperations(pairsStateChanges);

            // console.log({
            //     pairBulkOps: JSON.stringify(pairBulkOps),
            //     tokenBulkOps: JSON.stringify(tokenBulkOps),
            // });
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
            `Finished processing state update for block ${blockData.hash} in ${profiler.duration}`,
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

        const storageToFieldMap = this.getPairDecoders(address);

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

            this.logger.info(
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
                    this.logger.info(
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

    private decodeRouterStateChanges(
        stateAccess: StateAccessPerAccountRaw[],
    ): void {
        this.logger.info(`Decoding router state changes`, {
            context: StateChangesConsumer.name,
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
                        context: StateChangesConsumer.name,
                    },
                );
                continue;
            }

            this.logger.info(
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

    async updatePairsAndTokens(): Promise<void> {
        this.filterAddresses = [];
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
                },
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
            ),
        ]);

        pairs.forEach((pair) => {
            this.filterAddresses.push(pair.address);
            this.pairs.set(pair.address, pair);
        });

        tokens.forEach((token) => this.tokens.set(token.identifier, token));

        this.filterAddresses.push(scAddress.routerAddress);
    }

    private getPairDecoders(
        address: string,
    ): Record<string, PairStorageDecoder<any>> {
        const codec = new BinaryCodec();

        const pair = this.pairs.get(address);

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
}

const decodeBigUIntType = (value: Uint8Array): string => {
    return new BinaryCodec()
        .decodeTopLevel(Buffer.from(value), new BigUIntType())
        .valueOf()
        .toFixed();
};
