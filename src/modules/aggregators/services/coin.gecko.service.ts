import { Injectable } from '@nestjs/common';
import { CoinGeckoTicker } from '../dtos/coin.gecko.ticker';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import BigNumber from 'bignumber.js';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { denominateAmount } from 'src/utils/token.converters';
import { determineBaseAndQuoteTokens } from 'src/utils/pair.utils';

@Injectable()
export class CoinGeckoService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly pairService: PairService,
        private readonly pairCompute: PairComputeService,
        private readonly tokenService: TokenService,
    ) {}

    async getTickersFromPairs(): Promise<CoinGeckoTicker[]> {
        const [pairMetadata, commonTokens] = await Promise.all([
            this.routerAbi.pairsMetadata(),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        const states = await this.pairService.getAllStates(
            pairMetadata.map((pair) => pair.address),
        );

        const activePairs = pairMetadata.filter(
            (_pair, index) => states[index] === 'Active',
        );

        let tokenIDs: string[] = [];
        const activePairsAddresses: string[] = [];
        activePairs.forEach((pair) => {
            activePairsAddresses.push(pair.address);
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const [
            firstTokensPrice,
            firstTokensVolume,
            secondTokensPrice,
            secondTokensVolume,
            pairsLiquidityUSD,
            allTokens,
        ] = await Promise.all([
            this.pairCompute.getAllFirstTokensPrice(activePairsAddresses),
            this.pairCompute.getAllFirstTokensVolume(activePairsAddresses),
            this.pairCompute.getAllSecondTokensPrice(activePairsAddresses),
            this.pairCompute.getAllSecondTokensVolume(activePairsAddresses),
            this.pairService.getAllLockedValueUSD(activePairsAddresses),
            this.tokenService.getAllBaseTokensMetadata(tokenIDs),
        ]);

        const tokenMap = new Map(
            allTokens.map((token) => [token.identifier, token]),
        );

        return activePairs.map((pair, index) => {
            const { baseToken: targetToken, quoteToken: baseToken } =
                determineBaseAndQuoteTokens(pair, commonTokens);

            const firstToken = tokenMap.get(pair.firstTokenID);
            const secondToken = tokenMap.get(pair.secondTokenID);

            const lastPrice =
                firstToken.identifier === baseToken
                    ? firstTokensPrice[index]
                    : secondTokensPrice[index];

            const baseVolume =
                firstToken.identifier === baseToken
                    ? denominateAmount(
                          firstTokensVolume[index],
                          firstToken.decimals,
                      )
                    : denominateAmount(
                          secondTokensVolume[index],
                          secondToken.decimals,
                      );

            const targetVolume =
                firstToken.identifier === targetToken
                    ? denominateAmount(
                          firstTokensVolume[index],
                          firstToken.decimals,
                      )
                    : denominateAmount(
                          secondTokensVolume[index],
                          secondToken.decimals,
                      );

            return new CoinGeckoTicker({
                ticker_id: `${baseToken}_${targetToken}`,
                pool_id: pair.address,
                base_currency: baseToken,
                target_currency: targetToken,
                last_price: new BigNumber(lastPrice).toFixed(10),
                base_volume: baseVolume.toFixed(10),
                target_volume: targetVolume.toFixed(10),
                liquidity_in_usd: new BigNumber(
                    pairsLiquidityUSD[index],
                ).toFixed(5),
            });
        });
    }
}
