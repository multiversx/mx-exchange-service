import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairService } from '../../modules/pair/pair.service';
import { ESDTTransferTransaction } from './entities/esdtTransfer.transaction';

@Injectable()
export class TransactionMappingService {
    constructor(private readonly pairService: PairService) {}

    async handleSwap(transaction: ESDTTransferTransaction): Promise<any> {
        const pairAddress = transaction.receiver;
        const amount0 = transaction.getDataESDTAmount();
        const amount1 = new BigNumber(`0x${transaction.getDataArgs()[1]}`);

        const [
            token0,
            token1,
            token0PriceUSD,
            token1PriceUSD,
        ] = await Promise.all([
            this.pairService.getFirstToken(pairAddress),
            this.pairService.getSecondToken(pairAddress),
            this.pairService.getFirstTokenPriceUSD(pairAddress),
            this.pairService.getSecondTokenPriceUSD(pairAddress),
        ]);

        const amount0Denom = amount0.multipliedBy(
            new BigNumber(`1e-${token0.decimals}`),
        );
        const amount1Denom = amount1.multipliedBy(
            new BigNumber(`1e-${token1.decimals}`),
        );

        const amount0USD = new BigNumber(token0PriceUSD).times(amount0Denom);
        const amount1USD = new BigNumber(token1PriceUSD).times(amount1Denom);
        const amountTotalUSD = amount0USD
            .plus(amount1USD)
            .div(new BigNumber(2));
        const feesUSD = amountTotalUSD
            .times(new BigNumber(300))
            .div(new BigNumber(10000));
        return {
            pairAddress: pairAddress,
            volumeUSD: amountTotalUSD,
            feesUSD: feesUSD,
        };
    }
}
