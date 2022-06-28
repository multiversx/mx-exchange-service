import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { leastType } from 'src/utils/token.type.compare';
import { PairGetterService } from './pair.getter.service';
import { PairService } from './pair.service';

@Injectable()
export class PairComputeService {
    constructor(
        @Inject(forwardRef(() => PairGetterService))
        private readonly pairGetterService: PairGetterService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        private readonly tokenGetter: TokenGetterService,
    ) {}

    async computeFirstTokenPrice(pairAddress: string): Promise<string> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
        ]);

        const firstTokenPrice = await this.pairService.getEquivalentForLiquidity(
            pairAddress,
            firstToken.identifier,
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
        );
        return new BigNumber(firstTokenPrice)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
    }

    async computeSecondTokenPrice(pairAddress: string): Promise<string> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
        ]);

        const secondTokenPrice = await this.pairService.getEquivalentForLiquidity(
            pairAddress,
            secondToken.identifier,
            new BigNumber(`1e${secondToken.decimals}`).toFixed(),
        );
        return new BigNumber(secondTokenPrice)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();
    }

    async computeLpTokenPriceUSD(pairAddress: string): Promise<string> {
        const [secondToken, lpToken, firstTokenPrice] = await Promise.all([
            this.pairGetterService.getSecondToken(pairAddress),
            this.pairGetterService.getLpToken(pairAddress),
            this.pairGetterService.getFirstTokenPrice(pairAddress),
        ]);

        if (lpToken === undefined) {
            return undefined;
        }

        const [secondTokenPriceUSD, lpTokenPosition] = await Promise.all([
            this.computeTokenPriceUSD(secondToken.identifier),
            this.pairService.getLiquidityPosition(
                pairAddress,
                new BigNumber(`1e${lpToken.decimals}`).toFixed(),
            ),
        ]);

        const lpTokenPrice = new BigNumber(firstTokenPrice)
            .multipliedBy(new BigNumber(lpTokenPosition.firstTokenAmount))
            .plus(new BigNumber(lpTokenPosition.secondTokenAmount));
        const lpTokenPriceDenom = lpTokenPrice
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();

        return new BigNumber(lpTokenPriceDenom)
            .multipliedBy(secondTokenPriceUSD)
            .toFixed();
    }

    async computeFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        if (firstTokenID === constantsConfig.USDC_TOKEN_ID) {
            return new BigNumber(1).toFixed();
        }

        if (secondTokenID === constantsConfig.USDC_TOKEN_ID) {
            return await this.computeFirstTokenPrice(pairAddress);
        }

        const tokenPriceUSD = await this.computeTokenPriceUSD(firstTokenID);
        return tokenPriceUSD.toFixed();
    }

    async computeSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        if (secondTokenID === constantsConfig.USDC_TOKEN_ID) {
            return new BigNumber(1).toFixed();
        }

        if (firstTokenID === constantsConfig.USDC_TOKEN_ID) {
            return await this.computeSecondTokenPrice(pairAddress);
        }

        const tokenPriceUSD = await this.computeTokenPriceUSD(secondTokenID);
        return tokenPriceUSD.toFixed();
    }

    async computeTokenPriceUSD(tokenID: string): Promise<BigNumber> {
        return constantsConfig.USDC_TOKEN_ID === tokenID
            ? new BigNumber(1)
            : this.pairService.getPriceUSDByPath(tokenID);
    }

    async computeFirstTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [
            firstToken,
            firstTokenPriceUSD,
            firstTokenReserve,
        ] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getFirstTokenPriceUSD(pairAddress),
            this.pairGetterService.getFirstTokenReserve(pairAddress),
        ]);

        return new BigNumber(firstTokenReserve)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .multipliedBy(firstTokenPriceUSD);
    }

    async computeSecondTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [
            secondToken,
            secondTokenPriceUSD,
            secondTokenReserve,
        ] = await Promise.all([
            this.pairGetterService.getSecondToken(pairAddress),
            this.pairGetterService.getSecondTokenPriceUSD(pairAddress),
            this.pairGetterService.getSecondTokenReserve(pairAddress),
        ]);

        return new BigNumber(secondTokenReserve)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .multipliedBy(secondTokenPriceUSD);
    }

    async computeLockedValueUSD(pairAddress: string): Promise<BigNumber> {
        const [
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
        ] = await Promise.all([
            this.computeFirstTokenLockedValueUSD(pairAddress),
            this.computeSecondTokenLockedValueUSD(pairAddress),
        ]);

        return new BigNumber(firstTokenLockedValueUSD).plus(
            secondTokenLockedValueUSD,
        );
    }

    async computeFeesAPR(pairAddress: string): Promise<string> {
        const [fees24h, lockedValueUSD] = await Promise.all([
            this.pairGetterService.getFeesUSD(pairAddress, '24h'),
            this.computeLockedValueUSD(pairAddress),
        ]);

        return new BigNumber(fees24h)
            .times(365)
            .div(lockedValueUSD)
            .toFixed();
    }

    async computeTypeFromTokens(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        const [firstTokenType, secondTokenType] = await Promise.all([
            this.tokenGetter.getEsdtTokenType(firstTokenID),
            this.tokenGetter.getEsdtTokenType(secondTokenID),
        ]);

        return leastType(firstTokenType, secondTokenType);
    }
}
