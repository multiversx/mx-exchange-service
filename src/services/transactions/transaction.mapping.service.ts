import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairService } from '../../modules/pair/pair.service';
import { ESDTTransferTransaction } from './entities/esdtTransfer.transaction';

@Injectable()
export class TransactionMappingService {
    constructor(private readonly pairService: PairService) {}

    async handleSwap(transaction: ESDTTransferTransaction): Promise<any> {
        const pairAddress = transaction.receiver;
        const firstTokenAmount = transaction.getDataESDTAmount();
        const secoundTokenAmount = new BigNumber(`0x${transaction.getDataArgs()[1]}`);

        const [
            firstToken,
            secondToken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
        ] = await Promise.all([
            this.pairService.getFirstToken(pairAddress),
            this.pairService.getSecondToken(pairAddress),
            this.pairService.getFirstTokenPriceUSD(pairAddress),
            this.pairService.getSecondTokenPriceUSD(pairAddress),
        ]);

        const firstTokenAmountDenom = firstTokenAmount.multipliedBy(
            new BigNumber(`1e-${firstToken.decimals}`),
        );
        const secondTokenAmountDenom = secoundTokenAmount.multipliedBy(
            new BigNumber(`1e-${secondToken.decimals}`),
        );

        const firstTokenAmountUSD = new BigNumber(firstTokenPriceUSD).times(firstTokenAmountDenom);
        const secondtokenAmountUSD = new BigNumber(secondTokenPriceUSD).times(secondTokenAmountDenom);
        const amountTotalUSD = firstTokenAmountUSD
            .plus(secondtokenAmountUSD)
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
