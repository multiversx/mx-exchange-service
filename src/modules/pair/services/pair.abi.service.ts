import { Injectable } from '@nestjs/common';
import { PairInfoModel } from '../models/pair-info.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import BigNumber from 'bignumber.js';
import { FeeDestination } from '../models/pair.model';
import {
    EsdtTokenPayment,
    EsdtTokenPaymentStruct,
    EsdtTokenType,
} from 'src/models/esdtTokenPayment.model';
import {
    Address,
    BigUIntValue,
    EnumValue,
    Field,
    ReturnCode,
    Struct,
    TokenIdentifierValue,
    U64Value,
} from '@multiversx/sdk-core';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { constantsConfig, mxConfig } from 'src/config';
import { VmQueryError } from 'src/utils/errors.constants';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from 'src/services/caching/cache.service';
import { IPairAbiService } from '../interfaces';
import { getAllKeys } from 'src/utils/get.many.utils';

@Injectable()
export class PairAbiService
    extends GenericAbiService
    implements IPairAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly cachingService: CacheService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async firstTokenID(pairAddress: string): Promise<string> {
        return this.getFirstTokenIDRaw(pairAddress);
    }

    async getFirstTokenIDRaw(pairAddress: string): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getFirstTokenId',
        );
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async secondTokenID(pairAddress: string): Promise<string> {
        return this.getSecondTokenIDRaw(pairAddress);
    }

    async getSecondTokenIDRaw(pairAddress: string): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getSecondTokenId',
        );
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async lpTokenID(pairAddress: string): Promise<string> {
        return this.getLpTokenIDRaw(pairAddress);
    }

    async getLpTokenIDRaw(pairAddress: string): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getLpTokenIdentifier',
        );

        if (response.returnCode.equals(ReturnCode.UserError)) {
            return undefined;
        }

        const lpTokenID = response.firstValue.valueOf().toString();
        return lpTokenID === mxConfig.EGLDIdentifier || lpTokenID === ''
            ? undefined
            : lpTokenID;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async tokenReserve(pairAddress: string, tokenID: string): Promise<string> {
        return this.getTokenReserveRaw(pairAddress, tokenID);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async firstTokenReserve(pairAddress: string): Promise<string> {
        const firstTokenID = await this.firstTokenID(pairAddress);
        return this.getTokenReserveRaw(pairAddress, firstTokenID);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async secondTokenReserve(pairAddress: string): Promise<string> {
        const secondTokenID = await this.secondTokenID(pairAddress);
        return this.getTokenReserveRaw(pairAddress, secondTokenID);
    }

    async getTokenReserveRaw(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getReserve',
            [new TokenIdentifierValue(tokenID)],
        );
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async totalSupply(pairAddress: string): Promise<string> {
        return this.getTotalSupplyRaw(pairAddress);
    }

    async getTotalSupplyRaw(pairAddress: string): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getTotalSupply',
        );
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async pairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        return this.getPairInfoMetadataRaw(pairAddress);
    }

    async getPairInfoMetadataRaw(pairAddress: string): Promise<PairInfoModel> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getReservesAndTotalSupply',
        );
        return new PairInfoModel({
            reserves0: response.values[0].valueOf().toFixed(),
            reserves1: response.values[1].valueOf().toFixed(),
            totalSupply: response.values[2].valueOf().toFixed(),
        });
    }

    async getAllPairsInfoMetadata(
        pairAddresses: string[],
    ): Promise<PairInfoModel[]> {
        return getAllKeys<PairInfoModel>(
            this.cachingService,
            pairAddresses,
            'pair.pairInfoMetadata',
            this.pairInfoMetadata.bind(this),
            CacheTtlInfo.ContractBalance,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async totalFeePercent(pairAddress: string): Promise<number> {
        const totalFeePercent = await this.getTotalFeePercentRaw(pairAddress);
        return new BigNumber(totalFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getTotalFeePercentRaw(pairAddress: string): Promise<number> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getTotalFeePercent',
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getAllPairsTotalFeePercent(
        pairAddresses: string[],
    ): Promise<number[]> {
        return getAllKeys<number>(
            this.cachingService,
            pairAddresses,
            'pair.totalFeePercent',
            this.totalFeePercent.bind(this),
            CacheTtlInfo.ContractState,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async specialFeePercent(pairAddress: string): Promise<number> {
        const specialFeePercent =
            await this.getSpecialFeePercentRaw(pairAddress);
        return new BigNumber(specialFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getSpecialFeePercentRaw(pairAddress: string): Promise<number> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getSpecialFee',
        );
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async trustedSwapPairs(pairAddress: string): Promise<string[]> {
        return this.getTrustedSwapPairsRaw(pairAddress);
    }

    async getTrustedSwapPairsRaw(pairAddress: string): Promise<string[]> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getTrustedSwapPairs',
        );
        return response.firstValue
            .valueOf()
            .map((swapPair) => swapPair.field1.toBech32());
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async initialLiquidityAdder(pairAddress: string): Promise<string> {
        return this.getInitialLiquidityAdderRaw(pairAddress);
    }

    async getInitialLiquidityAdderRaw(pairAddress: string): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        try {
            const queryResponse = await this.runQuery(
                pairAddress,
                'getInitialLiquidtyAdder',
            );
            if (
                queryResponse.returnMessage === undefined ||
                queryResponse.returnMessage.includes(
                    VmQueryError.BAD_ARRAY_LENGTH,
                )
            ) {
                return '';
            }
            const response = this.parseQueryResponse(
                queryResponse,
                abi.getEndpoint('getInitialLiquidtyAdder'),
            );
            if (!response.firstValue.valueOf()) {
                return '';
            }
            return response.firstValue.valueOf().toBech32();
        } catch (error) {
            if (error.message.includes(VmQueryError.INVALID_FUNCTION)) {
                return '';
            }
            throw error;
        }
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async state(pairAddress: string): Promise<string> {
        return this.getStateRaw(pairAddress);
    }

    async getStateRaw(pairAddress: string): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getState',
        );
        return response.firstValue.valueOf().name;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feeState(pairAddress: string): Promise<boolean> {
        return this.getFeeStateRaw(pairAddress);
    }

    async getFeeStateRaw(pairAddress: string): Promise<boolean> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getFeeState',
        );
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async lockingScAddress(pairAddress: string): Promise<string | undefined> {
        const cacheKey = `pair.lockingScAddress.${pairAddress}`;
        const cachedValue: string = await this.cachingService.get(cacheKey);
        if (cachedValue === '') {
            return undefined;
        }
        if (cachedValue) {
            return cachedValue;
        }
        const value = await this.getLockingScAddressRaw(pairAddress);
        if (value) {
            await this.cachingService.set(cacheKey, value, Constants.oneHour());
            return value;
        }
        await this.cachingService.set(
            cacheKey,
            '',
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
        return undefined;
    }

    async getLockingScAddressRaw(
        pairAddress: string,
    ): Promise<string | undefined> {
        const abi = await this.mxProxy.getPairAbi();
        try {
            const queryResponse = await this.runQuery(
                pairAddress,
                'getLockingScAddress',
            );
            if (
                queryResponse.returnMessage.includes(
                    VmQueryError.BAD_ARRAY_LENGTH,
                ) ||
                queryResponse.returnCode === VmQueryError.FUNCTION_NOT_FOUND
            ) {
                return undefined;
            }
            const response = this.parseQueryResponse(
                queryResponse,
                abi.getEndpoint('getLockingScAddress'),
            );
            return response.firstValue.valueOf().toBech32();
        } catch (error) {
            if (error.message.includes(VmQueryError.INVALID_FUNCTION)) {
                return undefined;
            }
            throw error;
        }
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async unlockEpoch(pairAddress: string): Promise<number | undefined> {
        const cacheKey = `pair.unlockEpoch.${pairAddress}`;
        const cachedValue: number = await this.cachingService.get(cacheKey);
        if (cachedValue === -1) {
            return undefined;
        }
        if (cachedValue) {
            return cachedValue;
        }
        const value = await this.getUnlockEpochRaw(pairAddress);
        if (value) {
            await this.cachingService.set(cacheKey, value, Constants.oneHour());
            return value;
        }
        await this.cachingService.set(
            cacheKey,
            -1,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
        return undefined;
    }

    async getUnlockEpochRaw(pairAddress: string): Promise<number | undefined> {
        const abi = await this.mxProxy.getPairAbi();
        try {
            const queryResponse = await this.runQuery(
                pairAddress,
                'getUnlockEpoch',
            );
            if (queryResponse.returnCode === VmQueryError.FUNCTION_NOT_FOUND) {
                return undefined;
            }
            const response = this.parseQueryResponse(
                queryResponse,
                abi.getEndpoint('getUnlockEpoch'),
            );
            const unlockEpoch = response.firstValue.valueOf();
            return unlockEpoch !== undefined
                ? unlockEpoch.toNumber()
                : undefined;
        } catch (error) {
            if (error.message.includes(VmQueryError.INVALID_FUNCTION)) {
                return undefined;
            }
            throw error;
        }
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async lockingDeadlineEpoch(
        pairAddress: string,
    ): Promise<number | undefined> {
        const cacheKey = `pair.lockingDeadlineEpoch.${pairAddress}`;
        const cachedValue: number = await this.cachingService.get(cacheKey);
        if (cachedValue === -1) {
            return undefined;
        }
        if (cachedValue) {
            return cachedValue;
        }
        const value = await this.getLockingDeadlineEpochRaw(pairAddress);
        if (value) {
            await this.cachingService.set(cacheKey, value, Constants.oneHour());
            return value;
        }
        await this.cachingService.set(
            cacheKey,
            -1,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
        return undefined;
    }

    async getLockingDeadlineEpochRaw(
        pairAddress: string,
    ): Promise<number | undefined> {
        const abi = await this.mxProxy.getPairAbi();
        try {
            const queryResponse = await this.runQuery(
                pairAddress,
                'getLockingDeadlineEpoch',
            );
            if (queryResponse.returnCode === VmQueryError.FUNCTION_NOT_FOUND) {
                return undefined;
            }
            const response = this.parseQueryResponse(
                queryResponse,
                abi.getEndpoint('getLockingDeadlineEpoch'),
            );
            const lockingDeadlineEpoch = response.firstValue.valueOf();
            return lockingDeadlineEpoch !== undefined
                ? lockingDeadlineEpoch.toNumber()
                : undefined;
        } catch (error) {
            if (error.message.includes(VmQueryError.INVALID_FUNCTION)) {
                return undefined;
            }
            throw error;
        }
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feeDestinations(pairAddress: string): Promise<FeeDestination[]> {
        return this.getFeeDestinationsRaw(pairAddress);
    }

    async getFeeDestinationsRaw(
        pairAddress: string,
    ): Promise<FeeDestination[]> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getFeeDestinations',
        );
        return response.firstValue.valueOf().map(() => {
            return new FeeDestination({
                address: new Address(
                    response.firstValue.valueOf()[0].field0,
                ).toBech32(),
                tokenID: response.firstValue.valueOf()[0].field1.toString(),
            });
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async whitelistedAddresses(pairAddress: string): Promise<string[]> {
        return this.getWhitelistedAddressesRaw(pairAddress);
    }

    async getWhitelistedAddressesRaw(pairAddress: string): Promise<string[]> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'getWhitelistedManagedAddresses',
        );
        return response.firstValue.valueOf().map((v) => {
            return new Address(v).toBech32();
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async routerAddress(pairAddress: string): Promise<string> {
        return this.getRouterAddressRaw(pairAddress);
    }

    async getRouterAddressRaw(address: string): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            address,
            'getRouterManagedAddress',
        );
        return new Address(response.firstValue.valueOf().toString()).toBech32();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async safePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment> {
        return this.updateAndGetSafePrice(pairAddress, esdtTokenPayment);
    }

    async updateAndGetSafePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            pairAddress,
            'updateAndGetSafePrice',
            [
                new Struct(EsdtTokenPaymentStruct.getStructure(), [
                    new Field(
                        new EnumValue(
                            EsdtTokenType.getEnum(),
                            EsdtTokenType.getEnum().getVariantByDiscriminant(
                                esdtTokenPayment.tokenType,
                            ),
                            [],
                        ),
                        'token_type',
                    ),
                    new Field(
                        new TokenIdentifierValue(
                            Buffer.from(esdtTokenPayment.tokenID).toString(),
                        ),
                        'token_identifier',
                    ),
                    new Field(
                        new U64Value(new BigNumber(esdtTokenPayment.nonce)),
                        'token_nonce',
                    ),
                    new Field(
                        new BigUIntValue(
                            new BigNumber(esdtTokenPayment.amount),
                        ),
                        'amount',
                    ),
                ]),
            ],
        );
        return new EsdtTokenPayment({
            tokenType: EsdtTokenType.getEnum().getVariantByName(
                response.firstValue.valueOf().token_type.name,
            ).discriminant,
            tokenID: response.firstValue.valueOf().token_identifier.toString(),
            nonce: new BigNumber(
                response.firstValue.valueOf().token_nonce,
            ).toNumber(),
            amount: new BigNumber(
                response.firstValue.valueOf().amount,
            ).toFixed(),
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesCollectorAddress(pairAddress: string): Promise<string> {
        return this.getFeesCollectorAddressRaw(pairAddress);
    }

    async getFeesCollectorAddressRaw(address: string): Promise<string> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            address,
            'getFeesCollectorAddress',
        );

        if (response.returnCode.equals(ReturnCode.UserError)) {
            return undefined;
        }

        return new Address(response.firstValue.valueOf().toString()).toBech32();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesCollectorCutPercentage(pairAddress: string): Promise<number> {
        return this.getFeesCollectorCutPercentageRaw(pairAddress);
    }

    async getFeesCollectorCutPercentageRaw(address: string): Promise<number> {
        const abi = await this.mxProxy.getPairAbi();
        const response = await this.getGenericData(
            abi,
            address,
            'getFeesCollectorCutPercentage',
        );

        if (response.returnCode.equals(ReturnCode.UserError)) {
            return undefined;
        }

        return response.firstValue.valueOf().toNumber();
    }
}
