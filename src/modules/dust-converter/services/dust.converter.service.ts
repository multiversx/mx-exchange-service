import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TransactionModel } from 'src/models/transaction.model';
import { mxConfig } from 'src/config';
import { DustConvertArgs } from '../models/dust.converter.args';
import {
    DustConvertQuoteModel,
    DustConvertBatchModel,
    DustConvertBatchInputModel,
    DustConvertRouteModel,
    DustConvertPathModel,
    DustConvertSwapModel,
    DustConvertFailedTokenModel,
} from '../models/dust.converter.model';

@Injectable()
export class DustConverterService {
    private readonly baseUrl: string;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.baseUrl = this.apiConfigService.getXoxnoApiUrl();
    }

    async getQuote(
        args: DustConvertArgs,
        sender: string,
    ): Promise<DustConvertQuoteModel> {
        try {
            const requestBody = {
                inputs: args.inputs.map((input) => ({
                    token: input.token,
                    amount: input.amount,
                })),
                to: args.to,
                slippage: args.slippage,
                dust_mode: args.dustMode,
            };

            const response = await axios.post(
                `${this.baseUrl}/multi-swap`,
                requestBody,
                { timeout: 10000 },
            );

            return this.mapResponse(response.data, sender);
        } catch (error: any) {
            const errorDetails = {
                method: 'POST',
                url: `${this.baseUrl}/multi-swap`,
                response: error.response?.data,
                status: error.response?.status,
                message: error.message,
            };

            this.logger.error(
                `${DustConverterService.name}: Failed to get quote from XOXNO`,
                errorDetails,
            );

            throw error;
        }
    }

    private mapResponse(data: any, sender: string): DustConvertQuoteModel {
        if (!data.batches) {
            data.batches = [
                {
                    batchIndex: 0,
                    inputs: data.inputs,
                    amountOut: data.amountOut,
                    amountOutShort: data.amountOutShort,
                    amountOutMin: data.amountOutMin,
                    amountOutMinShort: data.amountOutMinShort,
                    routes: data.routes,
                    txData: data.txData,
                },
            ];
        }

        return new DustConvertQuoteModel({
            to: data.to,
            amountOut: data.amountOut,
            amountOutShort: data.amountOutShort,
            amountOutMin: data.amountOutMin,
            amountOutMinShort: data.amountOutMinShort,
            slippage: data.slippage,
            feeBps: data.feeBps,
            feeAmount: data.feeAmount,
            feeAmountShort: data.feeAmountShort,
            batches: this.mapBatches(data.batches, sender),
            failedTokens: this.mapFailedTokens(data.failedTokens),
        });
    }

    private mapBatches(
        batches: any[],
        sender: string,
    ): DustConvertBatchModel[] {
        if (!batches) {
            return [];
        }

        return batches.map(
            (batch) =>
                new DustConvertBatchModel({
                    batchIndex: batch.batchIndex,
                    inputs: this.mapBatchInputs(batch.inputs),
                    amountOut: batch.amountOut,
                    amountOutShort: batch.amountOutShort,
                    amountOutMin: batch.amountOutMin,
                    amountOutMinShort: batch.amountOutMinShort,
                    routes: this.mapRoutes(batch.routes),
                    transactions: this.parseTxData(batch.txData, sender),
                }),
        );
    }

    private mapBatchInputs(inputs: any[]): DustConvertBatchInputModel[] {
        if (!inputs) {
            return [];
        }

        return inputs.map(
            (input) =>
                new DustConvertBatchInputModel({
                    token: input.token,
                    amount: input.amount,
                    amountShort: input.amountShort,
                }),
        );
    }

    private mapRoutes(routes: any[]): DustConvertRouteModel[] {
        if (!routes) {
            return [];
        }

        return routes.map(
            (route) =>
                new DustConvertRouteModel({
                    from: route.from,
                    amountIn: route.amountIn,
                    amountInShort: route.amountInShort,
                    amountOut: route.amountOut,
                    amountOutShort: route.amountOutShort,
                    paths: this.mapPaths(route.paths),
                }),
        );
    }

    private mapPaths(paths: any[]): DustConvertPathModel[] {
        if (!paths) {
            return [];
        }

        return paths.map(
            (path) =>
                new DustConvertPathModel({
                    amountIn: path.amountIn,
                    amountOut: path.amountOut,
                    amountInShort: path.amountInShort,
                    amountOutShort: path.amountOutShort,
                    splitPpm: path.splitPpm,
                    swaps: this.mapSwaps(path.swaps),
                }),
        );
    }

    private mapSwaps(swaps: any[]): DustConvertSwapModel[] {
        if (!swaps) {
            return [];
        }

        return swaps.map(
            (swap) =>
                new DustConvertSwapModel({
                    dex: swap.dex,
                    pairId: swap.pairId ?? undefined,
                    address: swap.address,
                    from: swap.from,
                    to: swap.to,
                    amountIn: swap.amountIn,
                    amountOut: swap.amountOut,
                    amountInShort: swap.amountInShort,
                    amountOutShort: swap.amountOutShort,
                }),
        );
    }

    private mapFailedTokens(
        failedTokens: any[],
    ): DustConvertFailedTokenModel[] {
        if (!failedTokens) {
            return [];
        }

        return failedTokens.map(
            (token) =>
                new DustConvertFailedTokenModel({
                    token: token.token,
                    amount: token.amount,
                    amountShort: token.amountShort,
                    reason: token.reason,
                }),
        );
    }

    parseTxData(txData: string, sender: string): TransactionModel[] {
        if (!txData) {
            return [];
        }

        const chainID = mxConfig.get('chainID') as string;

        return [
            new TransactionModel({
                nonce: 0,
                value: '0',
                sender: sender,
                receiver: sender,
                gasPrice: 1000000000,
                gasLimit: 600000000,
                data: Buffer.from(txData).toString('base64'),
                chainID: chainID,
                version: 2,
            }),
        ];
    }
}
