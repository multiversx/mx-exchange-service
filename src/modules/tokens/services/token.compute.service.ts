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
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPriceDerivedEGLD(tokenID: string): Promise<string> {
        return await this.computeTokenPriceDerivedEGLD(tokenID, []);
    }

    async computeTokenPriceDerivedEGLD(
        tokenID: string,
        pairsNotToVisit: PairMetadata[],
    ): Promise<string> {
        if (tokenID === tokenProviderUSD) {
            return new BigNumber('1').toFixed();
        }

        const pairsMetadata = await this.routerAbi.pairsMetadata();
        let tokenPairs: PairMetadata[] = [];
        for (const pair of pairsMetadata) {
            if (
                pair.firstTokenID === tokenID ||
                pair.secondTokenID === tokenID
            ) {
                tokenPairs.push(pair);
            }
        }

        if (tokenPairs.length > 1) {
            const states = await Promise.all(
                tokenPairs.map((pair) => this.pairAbi.state(pair.address)),
            );
            if (states.find((state) => state === 'Active')) {
                tokenPairs = tokenPairs.filter((pair, index) => {
                    return states[index] === 'Active';
                });
            }
        }

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
                                pairsNotToVisit,
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
                                pairsNotToVisit,
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPriceDerivedUSD(tokenID: string): Promise<string> {
        return await this.computeTokenPriceDerivedUSD(tokenID);
    }

    async computeTokenPriceDerivedUSD(tokenID: string): Promise<string> {
        const [egldPriceUSD, derivedEGLD, usdcPrice] = await Promise.all([
            this.getEgldPriceInUSD(),
            this.computeTokenPriceDerivedEGLD(tokenID, []),
            this.dataApi.getTokenPrice('USDC'),
        ]);

        return new BigNumber(derivedEGLD)
            .times(egldPriceUSD)
            .times(usdcPrice)
            .toFixed();
    }
}
