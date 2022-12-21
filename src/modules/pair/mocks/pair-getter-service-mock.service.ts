import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { PairInfoModel } from '../models/pair-info.model';
import { FeeDestination, LockedTokensInfo } from '../models/pair.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { IPairGetterService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';

export class PairGetterHandlers implements IPairGetterService {
    getFirstTokenID: (pairAddress: string) => Promise<string>;
    getSecondTokenID: (pairAddress: string) => Promise<string>;
    getLpTokenID: (pairAddress: string) => Promise<string>;
    getFirstToken: (pairAddress: string) => Promise<EsdtToken>;
    getSecondToken: (pairAddress: string) => Promise<EsdtToken>;
    getLpToken: (pairAddress: string) => Promise<EsdtToken>;
    getTokenPrice: (pairAddress: string, tokenID: string) => Promise<string>;
    getFirstTokenPrice: (pairAddress: string) => Promise<string>;
    getSecondTokenPrice: (pairAddress: string) => Promise<string>;
    getTokenPriceUSD: (tokenID: string) => Promise<string>;
    getFirstTokenPriceUSD: (pairAddress: string) => Promise<string>;
    getSecondTokenPriceUSD: (pairAddress: string) => Promise<string>;
    getLpTokenPriceUSD: (pairAddress: string) => Promise<string>;
    getFirstTokenReserve: (pairAddress: string) => Promise<string>;
    getSecondTokenReserve: (pairAddress: string) => Promise<string>;
    getTotalSupply: (pairAddress: string) => Promise<string>;
    getFirstTokenLockedValueUSD: (pairAddress: string) => Promise<string>;
    getSecondTokenLockedValueUSD: (pairAddress: string) => Promise<string>;
    getLockedValueUSD: (pairAddress: string) => Promise<string>;
    getFirstTokenVolume: (
        pairAddress: string,
        time: string,
    ) => Promise<string>;
    getSecondTokenVolume: (
        pairAddress: string,
        time: string,
    ) => Promise<string>;
    getVolumeUSD: (pairAddress: string, time: string) => Promise<string>;
    getFeesUSD: (pairAddress: string, time: string) => Promise<string>;
    getFeesAPR: (pairAddress: string) => Promise<string>;
    getPairInfoMetadata: (pairAddress: string) => Promise<PairInfoModel>;
    getTotalFeePercent: (pairAddress: string) => Promise<number>;
    getSpecialFeePercent: (pairAddress: string) => Promise<number>;
    getTrustedSwapPairs: (pairAddress: string) => Promise<string[]>;
    getInitialLiquidityAdder: (pairAddress: string) => Promise<string>;
    getState: (pairAddress: string) => Promise<string>;
    getFeeState: (pairAddress: string) => Promise<boolean>;
    getType: (pairAddress: string) => Promise<string>;
    getLockingScAddress: (
        pairAddress: string,
    ) => Promise<string | undefined>;
    getUnlockEpoch: (pairAddress: string) => Promise<number | undefined>;
    getLockingDeadlineEpoch: (
        pairAddress: string,
    ) => Promise<number | undefined>;
    getLockedTokensInfo: (pairAddress: string) => Promise<LockedTokensInfo>;
    getFeeDestinations: (pairAddress: string) => Promise<FeeDestination[]>;
    getWhitelistedManagedAddresses: (
        pairAddress: string,
    ) => Promise<string[]>;
    getRouterManagedAddress: (address: string) => Promise<string>;
    getRouterOwnerManagedAddress: (address: string) => Promise<string>;
    getExternSwapGasLimit: (pairAddress: string) => Promise<number>;
    getTransferExecGasLimit: (pairAddress: string) => Promise<number>;
    updateAndGetSafePrice: (
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ) => Promise<EsdtTokenPayment>;
    getNumSwapsByAddress: (
        pairAddress: string,
        address: string,
    ) => Promise<number>;
    getNumAddsByAddress: (
        pairAddress: string,
        address: string,
    ) => Promise<string>;
    constructor(init: Partial<PairGetterHandlers>) {
        Object.assign(this, init);
    }

}

export class PairGetterServiceMock implements IPairGetterService {
    handlers: PairGetterHandlers;
    getFirstTokenID(pairAddress: string): Promise<string> {
        if (this.handlers.getFirstTokenID !== undefined) {
            return this.handlers.getFirstTokenID(pairAddress);
        }
        ErrorNotImplemented()
    }

    getSecondTokenID(pairAddress: string): Promise<string> {
        if (this.handlers.getSecondTokenID !== undefined) {
            return this.handlers.getSecondTokenID(pairAddress);
        }
        ErrorNotImplemented()
    }

    getLpTokenID(pairAddress: string): Promise<string> {
        if (this.handlers.getLpTokenID !== undefined) {
            return this.handlers.getLpTokenID(pairAddress);
        }
        ErrorNotImplemented()
    }

    getFirstToken(pairAddress: string): Promise<EsdtToken> {
        if (this.handlers.getFirstToken !== undefined) {
            return this.handlers.getFirstToken(pairAddress);
        }
        ErrorNotImplemented()
    }

    getSecondToken(pairAddress: string): Promise<EsdtToken> {
        if (this.handlers.getSecondToken !== undefined) {
            return this.handlers.getSecondToken(pairAddress);
        }
        ErrorNotImplemented()
    }

    getLpToken(pairAddress: string): Promise<EsdtToken> {
        if (this.handlers.getLpToken !== undefined) {
            return this.handlers.getLpToken(pairAddress);
        }
        ErrorNotImplemented()
    }

    getTokenPrice(pairAddress: string, tokenID: string): Promise<string> {
        if (this.handlers.getTokenPrice !== undefined) {
            return this.handlers.getTokenPrice(pairAddress, tokenID);
        }
        ErrorNotImplemented()
    }

    getFirstTokenPrice(pairAddress: string): Promise<string> {
        if (this.handlers.getFirstTokenPrice !== undefined) {
            return this.handlers.getFirstTokenPrice(pairAddress);
        }
        ErrorNotImplemented()
    }

    getSecondTokenPrice(pairAddress: string): Promise<string> {
        if (this.handlers.getSecondTokenPrice !== undefined) {
            return this.handlers.getSecondTokenPrice(pairAddress);
        }
        ErrorNotImplemented()
    }

    getTokenPriceUSD(tokenID: string): Promise<string> {
        if (this.handlers.getTokenPriceUSD !== undefined) {
            return this.handlers.getTokenPriceUSD(tokenID);
        }
        ErrorNotImplemented()
    }

    getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        if (this.handlers.getFirstTokenPriceUSD !== undefined) {
            return this.handlers.getFirstTokenPriceUSD(pairAddress);
        }
        ErrorNotImplemented()
    }

    getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        if (this.handlers.getSecondTokenPriceUSD !== undefined) {
            return this.handlers.getSecondTokenPriceUSD(pairAddress);
        }
        ErrorNotImplemented()
    }

    getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        if (this.handlers.getLpTokenPriceUSD !== undefined) {
            return this.handlers.getLpTokenPriceUSD(pairAddress);
        }
        ErrorNotImplemented()
    }

    getFirstTokenReserve(pairAddress: string): Promise<string> {
        if (this.handlers.getFirstTokenReserve !== undefined) {
            return this.handlers.getFirstTokenReserve(pairAddress);
        }
        ErrorNotImplemented()
    }

    getSecondTokenReserve(pairAddress: string): Promise<string> {
        if (this.handlers.getSecondTokenReserve !== undefined) {
            return this.handlers.getSecondTokenReserve(pairAddress);
        }
        ErrorNotImplemented()
    }

    getTotalSupply(pairAddress: string): Promise<string> {
        if (this.handlers.getTotalSupply !== undefined) {
            return this.handlers.getTotalSupply(pairAddress);
        }
        ErrorNotImplemented()
    }

    getFirstTokenLockedValueUSD(pairAddress: string): Promise<string> {
        if (this.handlers.getFirstTokenLockedValueUSD !== undefined) {
            return this.handlers.getFirstTokenLockedValueUSD(pairAddress);
        }
        ErrorNotImplemented()
    }

    getSecondTokenLockedValueUSD(pairAddress: string): Promise<string> {
        if (this.handlers.getSecondTokenLockedValueUSD !== undefined) {
            return this.handlers.getSecondTokenLockedValueUSD(pairAddress);
        }
        ErrorNotImplemented()
    }

    getLockedValueUSD(pairAddress: string): Promise<string> {
        if (this.handlers.getLockedValueUSD !== undefined) {
            return this.handlers.getLockedValueUSD(pairAddress);
        }
        ErrorNotImplemented()
    }

    getFirstTokenVolume(pairAddress: string, time: string): Promise<string> {
        if (this.handlers.getFirstTokenVolume !== undefined) {
            return this.handlers.getFirstTokenVolume(pairAddress, time);
        }
        ErrorNotImplemented()
    }

    getSecondTokenVolume(pairAddress: string, time: string): Promise<string> {
        if (this.handlers.getSecondTokenVolume !== undefined) {
            return this.handlers.getSecondTokenVolume(pairAddress, time);
        }
        ErrorNotImplemented()
    }

    getVolumeUSD(pairAddress: string, time: string): Promise<string> {
        if (this.handlers.getVolumeUSD !== undefined) {
            return this.handlers.getVolumeUSD(pairAddress, time);
        }
        ErrorNotImplemented()
    }

    getFeesUSD(pairAddress: string, time: string): Promise<string> {
        if (this.handlers.getFeesUSD !== undefined) {
            return this.handlers.getFeesUSD(pairAddress, time);
        }
        ErrorNotImplemented()
    }

    getFeesAPR(pairAddress: string): Promise<string> {
        if (this.handlers.getFeesAPR !== undefined) {
            return this.handlers.getFeesAPR(pairAddress);
        }
        ErrorNotImplemented()
    }

    getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        if (this.handlers.getPairInfoMetadata !== undefined) {
            return this.handlers.getPairInfoMetadata(pairAddress);
        }
        ErrorNotImplemented()
    }

    getTotalFeePercent(pairAddress: string): Promise<number> {
        if (this.handlers.getTotalFeePercent !== undefined) {
            return this.handlers.getTotalFeePercent(pairAddress);
        }
        ErrorNotImplemented()
    }

    getSpecialFeePercent(pairAddress: string): Promise<number> {
        if (this.handlers.getSpecialFeePercent !== undefined) {
            return this.handlers.getSpecialFeePercent(pairAddress);
        }
        ErrorNotImplemented()
    }

    getTrustedSwapPairs(pairAddress: string): Promise<string[]> {
        if (this.handlers.getTrustedSwapPairs !== undefined) {
            return this.handlers.getTrustedSwapPairs(pairAddress);
        }
        ErrorNotImplemented()
    }

    getInitialLiquidityAdder(pairAddress: string): Promise<string> {
        if (this.handlers.getInitialLiquidityAdder !== undefined) {
            return this.handlers.getInitialLiquidityAdder(pairAddress);
        }
        ErrorNotImplemented()
    }

    getState(pairAddress: string): Promise<string> {
        if (this.handlers.getState !== undefined) {
            return this.handlers.getState(pairAddress);
        }
        ErrorNotImplemented()
    }

    getFeeState(pairAddress: string): Promise<boolean> {
        if (this.handlers.getFeeState !== undefined) {
            return this.handlers.getFeeState(pairAddress);
        }
        ErrorNotImplemented()
    }

    getType(pairAddress: string): Promise<string> {
        if (this.handlers.getType !== undefined) {
            return this.handlers.getType(pairAddress);
        }
        ErrorNotImplemented()
    }

    getLockingScAddress(pairAddress: string): Promise<string> {
        if (this.handlers.getLockingScAddress !== undefined) {
            return this.handlers.getLockingScAddress(pairAddress);
        }
        ErrorNotImplemented()
    }

    getUnlockEpoch(pairAddress: string): Promise<number> {
        if (this.handlers.getUnlockEpoch !== undefined) {
            return this.handlers.getUnlockEpoch(pairAddress);
        }
        ErrorNotImplemented()
    }

    getLockingDeadlineEpoch(pairAddress: string): Promise<number> {
        if (this.handlers.getLockingDeadlineEpoch !== undefined) {
            return this.handlers.getLockingDeadlineEpoch(pairAddress);
        }
        ErrorNotImplemented()
    }

    getLockedTokensInfo(pairAddress: string): Promise<LockedTokensInfo> {
        if (this.handlers.getLockedTokensInfo !== undefined) {
            return this.handlers.getLockedTokensInfo(pairAddress);
        }
        ErrorNotImplemented()
    }

    getFeeDestinations(pairAddress: string): Promise<FeeDestination[]> {
        if (this.handlers.getFeeDestinations !== undefined) {
            return this.handlers.getFeeDestinations(pairAddress);
        }
        ErrorNotImplemented()
    }

    getWhitelistedManagedAddresses(pairAddress: string): Promise<string[]> {
        if (this.handlers.getWhitelistedManagedAddresses !== undefined) {
            return this.handlers.getWhitelistedManagedAddresses(pairAddress);
        }
        ErrorNotImplemented()
    }

    getRouterManagedAddress(address: string): Promise<string> {
        if (this.handlers.getRouterManagedAddress !== undefined) {
            return this.handlers.getRouterManagedAddress(address);
        }
        ErrorNotImplemented()
    }

    getRouterOwnerManagedAddress(address: string): Promise<string> {
        if (this.handlers.getRouterOwnerManagedAddress !== undefined) {
            return this.handlers.getRouterOwnerManagedAddress(address);
        }
        ErrorNotImplemented()
    }

    getExternSwapGasLimit(pairAddress: string): Promise<number> {
        if (this.handlers.getExternSwapGasLimit !== undefined) {
            return this.handlers.getExternSwapGasLimit(pairAddress);
        }
        ErrorNotImplemented()
    }

    getTransferExecGasLimit(pairAddress: string): Promise<number> {
        if (this.handlers.getTransferExecGasLimit !== undefined) {
            return this.handlers.getTransferExecGasLimit(pairAddress);
        }
        ErrorNotImplemented()
    }

    updateAndGetSafePrice(pairAddress: string, esdtTokenPayment: EsdtTokenPayment): Promise<EsdtTokenPayment> {
        if (this.handlers.updateAndGetSafePrice !== undefined) {
            return this.handlers.updateAndGetSafePrice(pairAddress, esdtTokenPayment);
        }
        ErrorNotImplemented()
    }

    getNumSwapsByAddress(pairAddress: string, address: string): Promise<number> {
        if (this.handlers.getNumSwapsByAddress !== undefined) {
            return this.handlers.getNumSwapsByAddress(pairAddress, address);
        }
        ErrorNotImplemented()
    }

    getNumAddsByAddress(pairAddress: string, address: string): Promise<string> {
        if (this.handlers.getNumAddsByAddress !== undefined) {
            return this.handlers.getNumAddsByAddress(pairAddress, address);
        }
        ErrorNotImplemented()
    }

    constructor(init: Partial<PairGetterHandlers>) {
        this.handlers = new PairGetterHandlers(init)
    }
}
