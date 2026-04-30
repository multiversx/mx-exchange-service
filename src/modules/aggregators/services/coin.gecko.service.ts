import { Injectable } from '@nestjs/common';
import { CoinGeckoTicker } from '../dtos/coin.gecko.ticker';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import BigNumber from 'bignumber.js';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { denominateAmount } from 'src/utils/token.converters';
import { determineBaseAndQuoteTokens } from 'src/utils/pair.utils';
import { PairsStateService } from 'src/modules/state/services/pairs.state.service';
import { PairsFilter } from 'src/modules/router/models/filter.args';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';

@Injectable()
export class CoinGeckoService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly tokenService: TokenService,
        private readonly pairsState: PairsStateService,
    ) {}

    async getTickersFromPairs(): Promise<CoinGeckoTicker[]> {
        const pairsCount = await this.pairsState.getPairsCount();

        const [pairsResult, commonTokens] = await Promise.all([
            this.pairsState.getFilteredPairs(
                0,
                pairsCount,
                { state: ['Active'] } as PairsFilter,
                undefined,
                [
                    'address',
                    'firstTokenId',
                    'firstTokenPrice',
                    'firstTokenVolume24h',
                    'secondTokenId',
                    'secondTokenPrice',
                    'secondTokenVolume24h',
                    'lockedValueUSD',
                ],
            ),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        const activePairs = pairsResult.pairs;

        let tokenIDs: string[] = [];
        activePairs.forEach((pair) => {
            tokenIDs.push(...[pair.firstTokenId, pair.secondTokenId]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const allTokens = await this.tokenService.getAllTokensMetadataFromState(
            tokenIDs,
            ['identifier', 'decimals'],
        );

        const tokenMap = new Map(
            allTokens.map((token) => [token.identifier, token]),
        );

        return activePairs.map((pair) => {
            const pairMetadata = new PairMetadata({
                address: pair.address,
                firstTokenID: pair.firstTokenId,
                secondTokenID: pair.secondTokenId,
            });

            const { baseToken: targetToken, quoteToken: baseToken } =
                determineBaseAndQuoteTokens(pairMetadata, commonTokens);

            const firstToken = tokenMap.get(pairMetadata.firstTokenID);
            const secondToken = tokenMap.get(pairMetadata.secondTokenID);

            const lastPrice =
                firstToken.identifier === baseToken
                    ? pair.firstTokenPrice
                    : pair.secondTokenPrice;

            const baseVolume =
                firstToken.identifier === baseToken
                    ? denominateAmount(
                          pair.firstTokenVolume24h,
                          firstToken.decimals,
                      )
                    : denominateAmount(
                          pair.secondTokenVolume24h,
                          secondToken.decimals,
                      );

            const targetVolume =
                firstToken.identifier === targetToken
                    ? denominateAmount(
                          pair.firstTokenVolume24h,
                          firstToken.decimals,
                      )
                    : denominateAmount(
                          pair.secondTokenVolume24h,
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
                liquidity_in_usd: new BigNumber(pair.lockedValueUSD).toFixed(5),
            });
        });
    }
}
