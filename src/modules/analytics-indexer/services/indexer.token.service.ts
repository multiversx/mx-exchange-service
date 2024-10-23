import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    constantsConfig,
    mxConfig,
    scAddress,
    tokenProviderUSD,
} from 'src/config';
import { IndexerStateService } from './indexer.state.service';
import { PairMetadata } from '../entities/pair.metadata';
import { IndexerPairService } from './indexer.pair.service';

@Injectable()
export class IndexerTokenService {
    constructor(
        private readonly stateService: IndexerStateService,
        @Inject(forwardRef(() => IndexerPairService))
        private readonly pairService: IndexerPairService,
    ) {}

    public computeTokenPriceDerivedUSD(tokenID: string): string {
        const egldPriceUSD = this.getEgldPriceInUSD();
        const derivedEGLD = this.computeTokenPriceDerivedEGLD(tokenID, []);

        return new BigNumber(derivedEGLD).times(egldPriceUSD).toFixed();
    }

    getEgldPriceInUSD(): string {
        return this.pairService.computeFirstTokenPrice(scAddress.WEGLD_USDC);
    }

    private computeTokenPriceDerivedEGLD(
        tokenID: string,
        pairsNotToVisit: PairMetadata[],
    ): string {
        if (tokenID === tokenProviderUSD) {
            return new BigNumber('1').toFixed();
        }

        let tokenPairs = this.stateService.getTokenPairs(tokenID);

        tokenPairs = tokenPairs.filter(
            (pair) =>
                pairsNotToVisit.find(
                    (pairNotToVisit) => pairNotToVisit.address === pair.address,
                ) === undefined,
        );

        pairsNotToVisit.push(...tokenPairs);

        let largestLiquidityEGLD = new BigNumber(0);
        let priceSoFar = '0';

        if (tokenID === constantsConfig.USDC_TOKEN_ID) {
            const egldPriceUSD = this.getEgldPriceInUSD();
            priceSoFar = new BigNumber(1).dividedBy(egldPriceUSD).toFixed();
        } else {
            for (const pair of tokenPairs) {
                const liquidity = this.pairService.getTotalSupply(pair.address);

                if (new BigNumber(liquidity).isZero()) {
                    continue;
                }

                const { firstTokenReserves, secondTokenReserves } =
                    this.pairService.getPairState(pair.address);

                if (pair.firstToken.identifier === tokenID) {
                    const secondTokenDerivedEGLD =
                        this.computeTokenPriceDerivedEGLD(
                            pair.secondToken.identifier,
                            pairsNotToVisit,
                        );

                    const firstTokenPrice =
                        this.pairService.computeFirstTokenPrice(pair.address);

                    // const egldLocked = new BigNumber(secondTokenReserves).times(
                    //     secondTokenDerivedEGLD,
                    // );
                    const egldLocked = new BigNumber(secondTokenReserves)
                        .times(`1e-${pair.secondToken.decimals}`)
                        .times(secondTokenDerivedEGLD)
                        .times(`1e${mxConfig.EGLDDecimals}`)
                        .integerValue();

                    if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                        largestLiquidityEGLD = egldLocked;
                        priceSoFar = new BigNumber(firstTokenPrice)
                            .times(secondTokenDerivedEGLD)
                            .toFixed();
                    }
                }

                if (pair.secondToken.identifier === tokenID) {
                    const firstTokenDerivedEGLD =
                        this.computeTokenPriceDerivedEGLD(
                            pair.firstToken.identifier,
                            pairsNotToVisit,
                        );

                    const secondTokenPrice =
                        this.pairService.computeSecondTokenPrice(pair.address);

                    // const egldLocked = new BigNumber(firstTokenReserves).times(
                    //     firstTokenDerivedEGLD,
                    // );
                    const egldLocked = new BigNumber(firstTokenReserves)
                        .times(`1e-${pair.firstToken.decimals}`)
                        .times(firstTokenDerivedEGLD)
                        .times(`1e${mxConfig.EGLDDecimals}`)
                        .integerValue();
                    if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                        largestLiquidityEGLD = egldLocked;
                        priceSoFar = new BigNumber(secondTokenPrice)
                            .times(firstTokenDerivedEGLD)
                            .toFixed();
                    }
                }
            }
        }
        return priceSoFar;
    }
}
