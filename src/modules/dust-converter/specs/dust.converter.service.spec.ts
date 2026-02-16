import { Test, TestingModule } from '@nestjs/testing';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';
import winston from 'winston';
import axios from 'axios';
import { DustConverterService } from '../services/dust.converter.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { DustConvertQuoteModel } from '../models/dust.converter.model';
import { DustConvertArgs } from '../models/dust.converter.args';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('DustConverterService', () => {
    let service: DustConverterService;

    const senderAddress =
        'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu';

    const mockXoxnoResponse = {
        inputs: [
            {
                token: 'USDC-350c4e',
                amount: '100000',
                amountShort: 0.1,
            },
        ],
        to: 'WEGLD-a28c59',
        amountOut: '71737661321609976',
        amountOutShort: 0.07173766132160998,
        amountOutMin: '35868830660804988',
        amountOutMinShort: 0.03586883066080499,
        slippage: 0.5,
        routes: [
            {
                from: 'USDC-350c4e',
                amountIn: '100000',
                amountInShort: 0.1,
                amountOut: '71737661321609976',
                amountOutShort: 0.07173766132160998,
                paths: [
                    {
                        amountIn: '100000',
                        amountOut: '71737661321609976',
                        amountInShort: 0.1,
                        amountOutShort: 0.07173766132160998,
                        splitPpm: 1000000,
                        swaps: [
                            {
                                dex: 'XExchange',
                                address:
                                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                                from: 'USDC-350c4e',
                                to: 'WEGLD-a28c59',
                                amountIn: '100000',
                                amountOut: '71737661321609976',
                                amountInShort: 0.1,
                                amountOutShort: 0.07173766132160998,
                            },
                        ],
                    },
                ],
            },
        ],
        txData: 'xo@7f6e82ee0bc17c@00@@04@5745474c442d613238633539@564943544f522d376363363636@555344432d333530633465@4d45582d613635396430@01@00000000000000000500bf109714ea8610a04e2574aaa7c6e626dd60945cd759@01@0186a0@00@01@02@02@00@ff@00@03@ff@01@00@ff@0c@ff@01@ff@00@',
        transaction: {
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            value: '0',
            nonce: 3133,
            data: 'RVNEVFRyYW5zZmVyQDU1NTM0NDQzMmQzMzM1MzA2MzM0NjVAMDE4NmEwQDc4NmZAN2Y2ZTgyZWUwYmMxN2NAMDBAQDA0QDU3NDU0NzRjNDQyZDYxMzIzODYzMzUzOUA1NjQ5NDM1NDRmNTIyZDM3NjM2MzM2MzYzNkA1NTUzNDQ0MzJkMzMzNTMwNjMzNDY1QDRkNDU1ODJkNjEzNjM1Mzk2NDMwQDAxQDAwMDAwMDAwMDAwMDAwMDAwNTAwYmYxMDk3MTRlYTg2MTBhMDRlMjU3NGFhYTdjNmU2MjZkZDYwOTQ1Y2Q3NTlAMDFAMDE4NmEwQDAwQDAxQDAyQDAyQDAwQGZmQDAwQDAzQGZmQDAxQDAwQGZmQDBjQGZmQDAxQGZmQDAwQA==',
            gasLimit: 115050000,
            gasPrice: 1000000000,
            chainId: 'D',
            version: 2,
        },
        feeBps: 0,
        feeAmount: '0',
        feeAmountShort: 0,
        failedTokens: [
            {
                token: 'TROGE-3a87b6',
                amount: '5000000000000000000000',
                amountShort: 5000,
                reason: 'unknown_token',
            },
        ],
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
            ],
            providers: [
                DustConverterService,
                {
                    provide: ApiConfigService,
                    useValue: {
                        getXoxnoApiUrl: () =>
                            'https://devnet-swap.xoxno.com/api/v1',
                    },
                },
            ],
        }).compile();

        service = module.get<DustConverterService>(DustConverterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get quote and map response correctly', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'USDC-350c4e', amount: '100000' }],
            to: 'WEGLD-a28c59',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        expect(result).toBeInstanceOf(DustConvertQuoteModel);
        expect(result.to).toBe('WEGLD-a28c59');
        expect(result.amountOut).toBe('71737661321609976');
        expect(result.amountOutShort).toBe(0.07173766132160998);
        expect(result.amountOutMin).toBe('35868830660804988');
        expect(result.slippage).toBe(0.5);
        expect(result.feeBps).toBe(0);
        expect(result.feeAmount).toBe('0');
    });

    it('should map batches correctly', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'USDC-350c4e', amount: '100000' }],
            to: 'WEGLD-a28c59',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        expect(result.batches).toHaveLength(1);
        expect(result.batches[0].batchIndex).toBe(0);
        expect(result.batches[0].inputs).toHaveLength(1);
        expect(result.batches[0].inputs[0].token).toBe('USDC-350c4e');
        expect(result.batches[0].inputs[0].amount).toBe('100000');
        expect(result.batches[0].amountOut).toBe('71737661321609976');
    });

    it('should map routes and paths correctly', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'USDC-350c4e', amount: '100000' }],
            to: 'WEGLD-a28c59',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        const route = result.batches[0].routes[0];
        expect(route.from).toBe('USDC-350c4e');
        expect(route.paths).toHaveLength(1);
        expect(route.paths[0].swaps).toHaveLength(1);
        expect(route.paths[0].swaps[0].dex).toBe('XExchange');
    });

    it('should parse transaction into TransactionModel', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'USDC-350c4e', amount: '100000' }],
            to: 'WEGLD-a28c59',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        const transaction = result.batches[0].transaction;
        expect(transaction.sender).toBe(senderAddress);
        expect(transaction.receiver).toBe(senderAddress);
        expect(transaction.gasPrice).toBe(1000000000);
        expect(transaction.version).toBe(2);
        expect(transaction.data).toBeDefined();
    });

    it('should map failed tokens correctly', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [
                { token: 'TROGE-3a87b6', amount: '5000000000000000000000' },
            ],
            to: 'EGLD',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        expect(result.failedTokens).toHaveLength(1);
        expect(result.failedTokens[0].token).toBe('TROGE-3a87b6');
        expect(result.failedTokens[0].reason).toBe('unknown_token');
        expect(result.failedTokens[0].amountShort).toBe(5000.0);
    });

    it('should handle XOXNO API errors gracefully', async () => {
        mockedAxios.post.mockRejectedValueOnce({
            response: {
                status: 400,
                data: { message: 'Invalid token' },
            },
            message: 'Request failed with status code 400',
        });

        const args: DustConvertArgs = {
            inputs: [{ token: 'INVALID-token', amount: '100' }],
            to: 'EGLD',
            slippage: 0.5,
            dustMode: true,
        };

        await expect(
            service.getQuote(args, senderAddress),
        ).rejects.toMatchObject({
            response: { status: 400 },
        });
    });

    it('should handle empty batches', async () => {
        const emptyBatchesResponse = {
            ...mockXoxnoResponse,
            batches: [],
            failedTokens: [],
        };
        mockedAxios.post.mockResolvedValueOnce({ data: emptyBatchesResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'USDC-350c4e', amount: '100000' }],
            to: 'WEGLD-a28c59',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        expect(result.batches).toHaveLength(0);
        expect(result.failedTokens).toHaveLength(0);
    });
});
