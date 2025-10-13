import {
    Address,
    BigUIntType,
    BinaryCodec,
    TokenIdentifierType,
    TokenIdentifierValue,
    U64Type,
} from '@multiversx/sdk-core';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig, scAddress } from 'src/config';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { Logger } from 'winston';
import { PairPersistenceService } from '../../persistence/services/pair.persistence.service';
import { RouterAbiService } from '../../router/services/router.abi.service';
import { TokenPersistenceService } from '../../persistence/services/token.persistence.service';
import { CompetingRabbitConsumer } from '../rabbitmq.consumers';
import {
    BlockWithStateChanges,
    StateAccessPerAccountRaw,
} from '../state.changes.types';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { StateChangesProcessor } from './state.changes.processor';
import BigNumber from 'bignumber.js';
import {
    ENUM_TYPES,
    PairStateChanges,
    PairStorageDecoder,
    PAIR_ENUMS,
    PAIR_FIELDS,
    PAIR_RESERVE_PREFIX,
} from './entities';
import {
    PersistenceInitService,
    PersistenceTasks,
} from 'src/modules/persistence/services/persistence.init.service';
import { PairDocument } from 'src/modules/persistence/schemas/pair.schema';

@Injectable()
export class StateChangesConsumer implements OnModuleInit {
    private isInitialised = false;
    private filterAddresses: string[];
    private pairs: Map<string, PairDocument> = new Map();
    private tokens: Map<string, EsdtToken> = new Map();

    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly dataApi: MXDataApiService,
        private readonly pairPersistence: PairPersistenceService,
        private readonly persistenceInit: PersistenceInitService,
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
        const profiler = new PerformanceProfiler();

        await this.updatePairsAndTokens();

        // console.log({
        //     state: blockData,
        //     stateJSON: JSON.stringify(blockData),
        // });

        console.log('PAIRS', this.filterAddresses.length);

        Object.keys(blockData.stateAccessesPerAccounts).forEach((address) => {
            const bech32Address = Address.newFromHex(address).toBech32();

            if (this.filterAddresses.includes(bech32Address)) {
                addressesMap.set(address, bech32Address);
            }
        });

        if (addressesMap.size === 0) {
            return;
        }

        const pairsStateChanges: Map<string, PairStateChanges> = new Map();
        for (const [hexAddress, address] of addressesMap.entries()) {
            if (address !== scAddress.routerAddress) {
                const stateChanges = this.decodePairStateChanges(
                    address,
                    blockData.stateAccessesPerAccounts[hexAddress].stateAccess,
                );

                if (Object.keys(stateChanges).includes(PAIR_FIELDS.lpTokenID)) {
                    await this.persistenceInit.queueTask({
                        name: PersistenceTasks.INDEX_LP_TOKEN,
                        args: [address],
                    });

                    delete stateChanges[PAIR_FIELDS.lpTokenID];
                }

                if (Object.keys(stateChanges).length === 0) {
                    continue;
                }

                pairsStateChanges.set(address, stateChanges);
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
                    totalFeePercent: 1,
                    specialFeePercent: 1,
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
        const keyLpTokenId = Buffer.from('lpTokenIdentifier').toString('hex');
        const keyState = Buffer.from('state').toString('hex');
        const keyTotalFeePercent =
            Buffer.from('total_fee_percent').toString('hex');
        const keySpecialFeePercent = Buffer.from(
            'special_fee_percent',
        ).toString('hex');

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
            [keyState]: {
                outputField: PAIR_FIELDS.state,
                decode: (value) => decodeEnumType(value, PAIR_ENUMS.state),
            },
            [keyTotalFeePercent]: {
                outputField: PAIR_FIELDS.totalFeePercent,
                decode: (value) => {
                    const raw = decodeU64Type(value);
                    return new BigNumber(raw)
                        .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                        .toNumber();
                },
            },
            [keySpecialFeePercent]: {
                outputField: PAIR_FIELDS.specialFeePercent,
                decode: (value) => {
                    const raw = decodeU64Type(value);
                    return new BigNumber(raw)
                        .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                        .toNumber();
                },
            },
            [keyLpTokenId]: {
                outputField: PAIR_FIELDS.lpTokenID,
                decode: decodeTokenIdentifierType,
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

const decodeU64Type = (value: Uint8Array): number => {
    return new BinaryCodec()
        .decodeTopLevel(Buffer.from(value), new U64Type())
        .valueOf()
        .toNumber();
};

const decodeTokenIdentifierType = (value: Uint8Array): string => {
    return new BinaryCodec()
        .decodeTopLevel(Buffer.from(value), new TokenIdentifierType())
        .valueOf()
        .toString();
};

const decodeEnumType = (value: Uint8Array, enumName: PAIR_ENUMS): string => {
    return new BinaryCodec()
        .decodeTopLevel(Buffer.from(value), ENUM_TYPES[enumName])
        .valueOf()
        .toString();
};
