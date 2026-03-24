import { Test, TestingModule } from '@nestjs/testing';
import { XoxnoAggregatorService } from '../services/xoxno-aggregator.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import axios from 'axios';
import { Address } from '@multiversx/sdk-core/out';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('XoxnoAggregatorService', () => {
    let service: XoxnoAggregatorService;
    let apiConfigServiceMock: jest.Mocked<ApiConfigService>;
    let loggerMock: any;

    const mockBaseUrl = 'https://mock.xoxno.api';
    const mockReferralID = 0;

    beforeEach(async () => {
        apiConfigServiceMock = {
            getXoxnoApiUrl: jest.fn().mockReturnValue(mockBaseUrl),
            getXoxnoReferralID: jest.fn().mockReturnValue(mockReferralID),
        } as unknown as jest.Mocked<ApiConfigService>;

        loggerMock = {
            error: jest.fn(),
            log: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                XoxnoAggregatorService,
                {
                    provide: ApiConfigService,
                    useValue: apiConfigServiceMock,
                },
                {
                    provide: WINSTON_MODULE_PROVIDER,
                    useValue: loggerMock,
                },
            ],
        }).compile();

        service = module.get<XoxnoAggregatorService>(XoxnoAggregatorService);
        jest.clearAllMocks();
    });

    describe('getQuote', () => {
        const tokenIn = 'WEGLD-123456';
        const tokenOut = 'USDC-123456';
        const amountIn = '1000000000000000000';
        const slippage = 0.01;
        const sender =
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu';

        it('should return undefined if base URL is not configured', async () => {
            apiConfigServiceMock.getXoxnoApiUrl.mockReturnValue(
                undefined as any,
            );
            const emptyService = new XoxnoAggregatorService(
                apiConfigServiceMock,
                loggerMock,
            );

            const result = await emptyService.getQuote(
                tokenIn,
                tokenOut,
                amountIn,
                slippage,
            );
            expect(result).toBeUndefined();
        });

        it('should correctly build query parameters with sender', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { amountOut: '2000' },
            });

            await service.getQuote(
                tokenIn,
                tokenOut,
                amountIn,
                slippage,
                sender,
            );

            expect(mockedAxios.get).toHaveBeenCalledWith(
                `${mockBaseUrl}/quote`,
                {
                    params: {
                        from: tokenIn,
                        to: tokenOut,
                        amountIn,
                        slippage,
                        includePaths: true,
                        sender: Address.Zero().toBech32(),
                        referralId: mockReferralID,
                    },
                    timeout: 10000,
                },
            );
        });

        it('should map the API response correctly', async () => {
            const apiResponse = {
                from: tokenIn,
                to: tokenOut,
                amountIn,
                amountOut: '2000',
                amountOutMin: '1980',
                slippage,
                priceImpact: 0.5,
                rate: 2,
                paths: [
                    {
                        amountIn,
                        amountOut: '2000',
                        swaps: [
                            {
                                dex: 'XExchange',
                                pairId: 1,
                                address: 'erd1pair',
                                from: tokenIn,
                                to: tokenOut,
                                amountIn,
                                amountOut: '2000',
                            },
                        ],
                    },
                ],
                transaction: {
                    nonce: 0,
                    value: '0',
                    sender: Address.Zero().bech32(),
                    receiver: 'erd1router',
                    gasPrice: 1000000000,
                    gasLimit: 8000000,
                    data: 'swap...',
                    chainId: '1',
                    version: 1,
                    options: 0,
                },
            };

            mockedAxios.get.mockResolvedValueOnce({ data: apiResponse });

            const result = await service.getQuote(
                tokenIn,
                tokenOut,
                amountIn,
                slippage,
            );

            expect(result).toBeDefined();
            expect(result?.amountOut).toBe('2000');
            expect(result?.paths.length).toBe(1);
            expect(result?.paths[0].swaps[0].dex).toBe('XExchange');

            // Check mapping of chainId to chainID for TransactionModel compatibility
            expect(result?.transaction).toBeDefined();
            expect(result?.transaction?.chainID).toBe('1');
        });

        it('should log error and return undefined on API failure', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

            const result = await service.getQuote(
                tokenIn,
                tokenOut,
                amountIn,
                slippage,
            );

            expect(result).toBeUndefined();
            expect(loggerMock.error).toHaveBeenCalled();
        });
    });
});
