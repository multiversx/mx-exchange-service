import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    constantsConfig,
    mxConfig,
    scAddress,
    tokenProviderUSD,
} from 'src/config';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { ITokenComputeService } from '../interfaces';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';

@Injectable()
export class TokenComputeService implements ITokenComputeService {
    constructor(
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        private readonly routerAbi: RouterAbiService,
        private readonly dataApi: MXDataApiService,
    ) {}

    async getEgldPriceInUSD(): Promise<string> {
        return await this.pairCompute.firstTokenPrice(scAddress.WEGLD_USDC);
    }

    async computeTokenPriceDerivedEGLD(tokenID: string): Promise<string> {
        if (tokenID === tokenProviderUSD) {
            return new BigNumber('1').toFixed();
        }

        const pairsMetadata = await this.routerAbi.pairsMetadata();
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
            priceSoFar = new BigNumber(1).dividedBy(eglpPriceUSD).toFixed();
        } else {
            for (const pair of tokenPairs) {
                const liquidity = await this.pairAbi.totalSupply(pair.address);
                if (new BigNumber(liquidity).isGreaterThan(0)) {
                    if (pair.firstTokenID === tokenID) {
                        const [
                            secondTokenDerivedEGLD,
                            secondTokenReserves,
                            firstTokenPrice,
                            secondToken,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.secondTokenID,
                            ),
                            this.pairAbi.secondTokenReserve(pair.address),
                            this.pairCompute.firstTokenPrice(pair.address),
                            this.pairService.getSecondToken(pair.address),
                        ]);
                        const egldLocked = new BigNumber(secondTokenReserves)
                            .times(`1e-${secondToken.decimals}`)
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
                    if (pair.secondTokenID === tokenID) {
                        const [
                            firstTokenDerivedEGLD,
                            firstTokenReserves,
                            secondTokenPrice,
                            firstToken,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.firstTokenID,
                            ),
                            this.pairAbi.firstTokenReserve(pair.address),
                            this.pairCompute.secondTokenPrice(pair.address),
                            this.pairService.getFirstToken(pair.address),
                        ]);
                        const egldLocked = new BigNumber(firstTokenReserves)
                            .times(`1e-${firstToken.decimals}`)
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
        }
        return priceSoFar;
    }

    async computeTokenPriceDerivedUSD(tokenID: string): Promise<string> {
        const [egldPriceUSD, derivedEGLD, usdcPrice] = await Promise.all([
            this.getEgldPriceInUSD(),
            this.computeTokenPriceDerivedEGLD(tokenID),
            this.dataApi.getTokenPrice('USDC'),
        ]);

        return new BigNumber(derivedEGLD)
            .times(egldPriceUSD)
            .times(usdcPrice)
            .toFixed();
    }
}
