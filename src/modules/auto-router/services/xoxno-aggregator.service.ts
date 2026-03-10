import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TransactionModel } from 'src/models/transaction.model';
import {
    XoxnoQuoteModel,
    XoxnoPathModel,
    XoxnoSwapModel,
} from '../models/xoxno-aggregator.model';
import { Address } from '@multiversx/sdk-core/out';

@Injectable()
export class XoxnoAggregatorService {
    private readonly baseUrl: string | undefined;
    private readonly referralID: number | undefined;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.baseUrl = this.apiConfigService.getXoxnoApiUrl();
        this.referralID = this.apiConfigService.getXoxnoReferralID();
    }

    async getQuote(
        tokenIn: string,
        tokenOut: string,
        amountIn: string,
        slippage: number,
    ): Promise<XoxnoQuoteModel | undefined> {
        if (!this.baseUrl) {
            return undefined;
        }

        try {
            const params: Record<string, string | number | boolean> = {
                from: tokenIn,
                to: tokenOut,
                amountIn,
                slippage,
                includePaths: true,
                sender: Address.Zero().toBech32(),
                referralId: this.referralID,
            };

            const response = await axios.get(`${this.baseUrl}/quote`, {
                params,
                timeout: 10000,
            });

            return this.mapResponse(response.data);
        } catch (error: any) {
            this.logger.error(
                `${XoxnoAggregatorService.name}: Failed to get quote from XOXNO`,
                {
                    method: 'GET',
                    url: `${this.baseUrl}/quote`,
                    response: error.response?.data,
                    status: error.response?.status,
                    message: error.message,
                },
            );

            return undefined;
        }
    }

    private mapResponse(data: any): XoxnoQuoteModel {
        return {
            from: data.from,
            to: data.to,
            amountIn: data.amountIn,
            amountOut: data.amountOut,
            amountOutMin: data.amountOutMin,
            slippage: data.slippage,
            priceImpact: data.priceImpact,
            rate: data.rate,
            paths: this.mapPaths(data.paths),
            transaction: data.transaction
                ? this.mapTransaction(data.transaction)
                : undefined,
        };
    }

    private mapPaths(paths: any[]): XoxnoPathModel[] {
        if (!paths) {
            return [];
        }

        return paths.map((path) => ({
            amountIn: path.amountIn,
            amountOut: path.amountOut,
            swaps: this.mapSwaps(path.swaps),
        }));
    }

    private mapSwaps(swaps: any[]): XoxnoSwapModel[] {
        if (!swaps) {
            return [];
        }

        return swaps.map((swap) => ({
            dex: swap.dex,
            pairId: swap.pairId ?? undefined,
            address: swap.address,
            from: swap.from,
            to: swap.to,
            amountIn: swap.amountIn,
            amountOut: swap.amountOut,
        }));
    }

    private mapTransaction(tx: any): TransactionModel {
        return new TransactionModel({
            nonce: tx.nonce,
            value: tx.value,
            sender: tx.sender,
            receiver: tx.receiver,
            gasPrice: tx.gasPrice,
            gasLimit: tx.gasLimit,
            data: tx.data,
            chainID: tx.chainId ?? tx.chainID,
            version: tx.version,
            options: tx.options,
        });
    }
}
