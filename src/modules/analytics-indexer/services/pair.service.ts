import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { StateService } from './state.service';
import { quote } from 'src/modules/pair/pair.utils';
import { constantsConfig, mxConfig } from 'src/config';
import { GlobalState, PairState } from '../global.state';
import { PairInfoModel } from '../entities/pair-info';
import { IndexerTokenService } from './token.service';

@Injectable()
export class IndexerPairService {
    constructor(
        private readonly stateService: StateService,
        @Inject(forwardRef(() => IndexerTokenService))
        private readonly tokenService: IndexerTokenService,
    ) {}

    public getTokenTotalLockedValue(tokenID: string): string {
        const pairs = this.stateService.getPairsMetadata();
        let newLockedValue = new BigNumber(0);
        for (const pair of pairs) {
            if (
                tokenID !== pair.firstToken.identifier &&
                tokenID !== pair.secondToken.identifier
            ) {
                continue;
            }

            const tokenReserve =
                tokenID === pair.firstToken.identifier
                    ? this.getFirstTokenReserve(pair.address)
                    : this.getSecondTokenReserve(pair.address);

            newLockedValue = newLockedValue.plus(tokenReserve);
        }

        return newLockedValue.toFixed();
    }

    public getTokenPriceUSD(tokenID: string): string {
        return this.tokenService.computeTokenPriceDerivedUSD(tokenID);
    }

    public getFirstTokenReserve(pairAddress: string): string {
        return GlobalState.pairsState[pairAddress].firstTokenReserves;
    }

    public getSecondTokenReserve(pairAddress: string): string {
        return GlobalState.pairsState[pairAddress].secondTokenReserves;
    }

    public getPairState(pairAddress: string): PairState {
        return GlobalState.pairsState[pairAddress];
    }

    public computeLockedValueUSD(pairAddress: string): BigNumber {
        const firstTokenLockedValueUSD =
            this.computeFirstTokenLockedValueUSD(pairAddress);
        const secondTokenLockedValueUSD =
            this.computeSecondTokenLockedValueUSD(pairAddress);

        return firstTokenLockedValueUSD.plus(secondTokenLockedValueUSD);
    }

    private computeFirstTokenLockedValueUSD(pairAddress: string): BigNumber {
        const firstToken = this.stateService.getFirstToken(pairAddress);
        const firstTokenPriceUSD = this.computeFirstTokenPriceUSD(pairAddress);
        const firstTokenReserve = this.getFirstTokenReserve(pairAddress);

        return new BigNumber(firstTokenReserve)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .multipliedBy(firstTokenPriceUSD);
    }

    private computeSecondTokenLockedValueUSD(pairAddress: string): BigNumber {
        const secondToken = this.stateService.getSecondToken(pairAddress);
        const secondTokenPriceUSD =
            this.computeSecondTokenPriceUSD(pairAddress);
        const secondTokenReserve = this.getSecondTokenReserve(pairAddress);

        return new BigNumber(secondTokenReserve)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .multipliedBy(secondTokenPriceUSD);
    }

    computeFirstTokenPriceUSD(pairAddress: string): string {
        const { firstToken, secondToken } =
            this.stateService.getPairMetadata(pairAddress);

        if (firstToken.identifier === constantsConfig.USDC_TOKEN_ID) {
            return new BigNumber(1).toFixed();
        }

        if (secondToken.identifier === constantsConfig.USDC_TOKEN_ID) {
            return this.computeFirstTokenPrice(pairAddress);
        }

        return this.tokenService.computeTokenPriceDerivedUSD(
            firstToken.identifier,
        );
    }

    computeSecondTokenPriceUSD(pairAddress: string): string {
        const { firstToken, secondToken } =
            this.stateService.getPairMetadata(pairAddress);

        if (secondToken.identifier === constantsConfig.USDC_TOKEN_ID) {
            return new BigNumber(1).toFixed();
        }

        if (firstToken.identifier === constantsConfig.USDC_TOKEN_ID) {
            return this.computeSecondTokenPrice(pairAddress);
        }

        return this.tokenService.computeTokenPriceDerivedUSD(
            secondToken.identifier,
        );
    }

    private getEquivalentForLiquidity(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): string {
        const { firstToken, secondToken } =
            this.stateService.getPairMetadata(pairAddress);
        const pairInfo = this.getPairInfoMetadata(pairAddress);

        const tokenIn =
            tokenInID === mxConfig.EGLDIdentifier
                ? constantsConfig.WEGLD_TOKEN_ID
                : tokenInID;

        if (!pairInfo) {
            return new BigNumber(0).toFixed();
        }

        switch (tokenIn) {
            case firstToken.identifier:
                return quote(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                ).toFixed();
            case secondToken.identifier:
                return quote(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                ).toFixed();
            default:
                return new BigNumber(0).toFixed();
        }
    }

    private getPairInfoMetadata(pairAddress: string): PairInfoModel {
        if (GlobalState.pairsState[pairAddress]) {
            return new PairInfoModel({
                reserves0:
                    GlobalState.pairsState[pairAddress].firstTokenReserves,
                reserves1:
                    GlobalState.pairsState[pairAddress].secondTokenReserves,
                totalSupply:
                    GlobalState.pairsState[pairAddress].liquidityPoolSupply,
            });
        }
        return undefined;
    }

    public computeFirstTokenPrice(pairAddress: string): string {
        const { firstToken, secondToken } =
            this.stateService.getPairMetadata(pairAddress);

        const firstTokenPrice = this.getEquivalentForLiquidity(
            pairAddress,
            firstToken.identifier,
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
        );

        return new BigNumber(firstTokenPrice)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
    }

    public computeSecondTokenPrice(pairAddress: string): string {
        const { firstToken, secondToken } =
            this.stateService.getPairMetadata(pairAddress);

        const secondTokenPrice = this.getEquivalentForLiquidity(
            pairAddress,
            secondToken.identifier,
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
        );

        return new BigNumber(secondTokenPrice)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();
    }

    getTotalSupply(pairAddress: string): string {
        return GlobalState.pairsState[pairAddress].liquidityPoolSupply;
    }
}
