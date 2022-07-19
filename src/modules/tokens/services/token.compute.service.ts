import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { constantsConfig, scAddress, tokenProviderUSD } from 'src/config';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { ContextService } from 'src/services/context/context.service';

@Injectable()
export class TokenComputeService {
    constructor(
        private readonly pairGetter: PairGetterService,
        private readonly context: ContextService,
    ) {}

    async getEgldPriceInUSD(): Promise<string> {
        return await this.pairGetter.getFirstTokenPrice(scAddress.WEGLD_USDC);
    }

    async computeTokenPriceDerivedEGLD(tokenID: string): Promise<string> {
        if (tokenID === tokenProviderUSD) {
            return new BigNumber('1').toFixed();
        }

        const pairsMetadata = await this.context.getPairsMetadata();
        const tokenPairs: PairMetadata[] = [];
        for (const pair of pairsMetadata) {
            if (
                pair.firstTokenID === tokenID ||
                pair.secondTokenID === tokenID
            ) {
                tokenPairs.push(pair);
            }
        }

        let largestLiquidityEGLD = new BigNumber(0);
        let priceSoFar = '0';

        if (tokenID === constantsConfig.USDC_TOKEN_ID) {
            const eglpPriceUSD = await this.getEgldPriceInUSD();
            console.log;
            priceSoFar = new BigNumber(1).dividedBy(eglpPriceUSD).toFixed();
        } else {
            for (const pair of tokenPairs) {
                const liquidity = await this.pairGetter.getTotalSupply(
                    pair.address,
                );
                if (new BigNumber(liquidity).isGreaterThan(0)) {
                    if (pair.firstTokenID === tokenID) {
                        const [
                            secondTokenDerivedEGLD,
                            secondTokenReserves,
                            firstTokenPrice,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.secondTokenID,
                            ),
                            this.pairGetter.getSecondTokenReserve(pair.address),
                            this.pairGetter.getFirstTokenPrice(pair.address),
                        ]);
                        const egldLocked = new BigNumber(
                            secondTokenReserves,
                        ).times(secondTokenDerivedEGLD);
                        if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                            largestLiquidityEGLD = egldLocked;
                            priceSoFar = new BigNumber(firstTokenPrice)
                                .times(secondTokenDerivedEGLD)
                                .toFixed();
                        }
                    }
                    if (pair.secondTokenID === tokenID) {
                        const [
                            firstTokenDerivedEGLD,
                            firstTokenReserves,
                            secondTokenPrice,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.firstTokenID,
                            ),
                            this.pairGetter.getFirstTokenReserve(pair.address),
                            this.pairGetter.getSecondTokenPrice(pair.address),
                        ]);
                        const egldLocked = new BigNumber(
                            firstTokenReserves,
                        ).times(firstTokenDerivedEGLD);
                        if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                            largestLiquidityEGLD = egldLocked;
                            priceSoFar = new BigNumber(secondTokenPrice)
                                .times(firstTokenDerivedEGLD)
                                .toFixed();
                        }
                    }
                }
            }
        }
        return priceSoFar;
    }
}
