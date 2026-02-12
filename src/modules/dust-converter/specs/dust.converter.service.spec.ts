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
        to: 'EGLD',
        amountOut: '840300683095773710',
        amountOutShort: 0.8403006830957737,
        amountOutMin: '420150341547886855',
        amountOutMinShort: 0.42015034154788683,
        slippage: 0.5,
        perBatchSlippage: true,
        batches: [
            {
                batchIndex: 0,
                inputs: [
                    {
                        token: 'USDC-c76f1f',
                        amount: '3923874',
                        amountShort: 3.923874,
                    },
                    {
                        token: 'AIX-a00870',
                        amount: '461415943600867678958',
                        amountShort: 461.4159436008677,
                    },
                ],
                amountOut: '840300683095773710',
                amountOutShort: 0.8403006830957737,
                amountOutMin: '420150341547886855',
                amountOutMinShort: 0.42015034154788683,
                routes: [
                    {
                        from: 'USDC-c76f1f',
                        amountIn: '3923874',
                        amountInShort: 3.923874,
                        amountOut: '839780470948933724',
                        amountOutShort: 0.8397804709489337,
                        paths: [
                            {
                                amountIn: '3923874',
                                amountOut: '839780470948933724',
                                amountInShort: 3.923874,
                                amountOutShort: 0.8397804709489337,
                                splitPpm: 1000000,
                                swaps: [
                                    {
                                        dex: 'OneDex',
                                        pairId: 30,
                                        address:
                                            'erd1qqqqqqqqqqqqqpgqqz6vp9y50ep867vnr296mqf3dduh6guvmvlsu3sujc',
                                        from: 'USDC-c76f1f',
                                        to: 'WEGLD-bd4d79',
                                        amountIn: '3923874',
                                        amountOut: '839780470948933724',
                                        amountInShort: 3.923874,
                                        amountOutShort: 0.8397804709489337,
                                    },
                                    {
                                        dex: 'wrapper',
                                        address:
                                            'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3',
                                        from: 'WEGLD-bd4d79',
                                        to: 'EGLD',
                                        amountIn: '839780470948933724',
                                        amountOut: '839780470948933724',
                                        amountInShort: 0.8397804709489337,
                                        amountOutShort: 0.8397804709489337,
                                    },
                                ],
                            },
                        ],
                    },
                ],
                txData: 'xo@05d4ac8274388907@fe',
            },
        ],
        feeBps: 0,
        feeAmount: '0',
        feeAmountShort: 0.0,
        failedTokens: [
            {
                token: 'TROGE-3a87b6',
                amount: '5000000000000000000000',
                amountShort: 5000.0,
                reason: 'zero_liquidity',
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
                            'https://swap.xoxno.com/api/v1',
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
            inputs: [
                { token: 'USDC-c76f1f', amount: '3923874' },
                {
                    token: 'AIX-a00870',
                    amount: '461415943600867678958',
                },
            ],
            to: 'EGLD',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        expect(result).toBeInstanceOf(DustConvertQuoteModel);
        expect(result.to).toBe('EGLD');
        expect(result.amountOut).toBe('840300683095773710');
        expect(result.amountOutShort).toBe(0.8403006830957737);
        expect(result.amountOutMin).toBe('420150341547886855');
        expect(result.slippage).toBe(0.5);
        expect(result.feeBps).toBe(0);
        expect(result.feeAmount).toBe('0');
    });

    it('should map batches correctly', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'USDC-c76f1f', amount: '3923874' }],
            to: 'EGLD',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        expect(result.batches).toHaveLength(1);
        expect(result.batches[0].batchIndex).toBe(0);
        expect(result.batches[0].inputs).toHaveLength(2);
        expect(result.batches[0].inputs[0].token).toBe('USDC-c76f1f');
        expect(result.batches[0].inputs[0].amount).toBe('3923874');
        expect(result.batches[0].amountOut).toBe('840300683095773710');
    });

    it('should map routes and paths correctly', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'USDC-c76f1f', amount: '3923874' }],
            to: 'EGLD',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        const route = result.batches[0].routes[0];
        expect(route.from).toBe('USDC-c76f1f');
        expect(route.paths).toHaveLength(1);
        expect(route.paths[0].swaps).toHaveLength(2);
        expect(route.paths[0].swaps[0].dex).toBe('OneDex');
        expect(route.paths[0].swaps[0].pairId).toBe(30);
        expect(route.paths[0].swaps[1].dex).toBe('wrapper');
        expect(route.paths[0].swaps[1].pairId).toBeUndefined();
    });

    it('should parse txData into TransactionModel', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'USDC-c76f1f', amount: '3923874' }],
            to: 'EGLD',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        const transactions = result.batches[0].transactions;
        expect(transactions).toHaveLength(1);
        expect(transactions[0].sender).toBe(senderAddress);
        expect(transactions[0].receiver).toBe(senderAddress);
        expect(transactions[0].gasPrice).toBe(1000000000);
        expect(transactions[0].version).toBe(2);
        expect(transactions[0].data).toBeDefined();
    });

    it('should map failed tokens correctly', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: mockXoxnoResponse });

        const args: DustConvertArgs = {
            inputs: [{ token: 'TROGE-3a87b6', amount: '5000000000000000000000' }],
            to: 'EGLD',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        expect(result.failedTokens).toHaveLength(1);
        expect(result.failedTokens[0].token).toBe('TROGE-3a87b6');
        expect(result.failedTokens[0].reason).toBe('zero_liquidity');
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

        await expect(service.getQuote(args, senderAddress)).rejects.toMatchObject({
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
            inputs: [{ token: 'USDC-c76f1f', amount: '1' }],
            to: 'EGLD',
            slippage: 0.5,
            dustMode: true,
        };

        const result = await service.getQuote(args, senderAddress);

        expect(result.batches).toHaveLength(0);
        expect(result.failedTokens).toHaveLength(0);
    });

    it('should handle null txData gracefully', () => {
        const transactions = service.parseTxData(null, senderAddress);
        expect(transactions).toHaveLength(0);
    });

    it('should handle empty txData gracefully', () => {
        const transactions = service.parseTxData('', senderAddress);
        expect(transactions).toHaveLength(0);
    });
});
