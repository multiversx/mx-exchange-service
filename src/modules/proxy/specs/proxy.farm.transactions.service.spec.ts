import { Test, TestingModule } from '@nestjs/testing';
import { ProxyFarmTransactionsService } from '../services/proxy-farm/proxy.farm.transactions.service';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { FarmAbiServiceProviderV1_2 } from 'src/modules/farm/mocks/farm.v1.2.abi.service.mock';
import { FarmAbiServiceProviderV1_3 } from 'src/modules/farm/mocks/farm.v1.3.abi.service.mock';
import { FarmAbiServiceProviderV2 } from 'src/modules/farm/mocks/farm.v2.abi.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { ProxyFarmAbiServiceProvider } from '../mocks/proxy.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Address } from '@multiversx/sdk-core/out';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { encodeTransactionData } from 'src/helpers/helpers';

describe('ProxyFarmTransactionsService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                ProxyFarmTransactionsService,
                MXProxyServiceProvider,
                MXApiServiceProvider,
                FarmAbiFactory,
                FarmAbiServiceProviderV1_2,
                FarmAbiServiceProviderV1_3,
                FarmAbiServiceProviderV2,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                TokenServiceProvider,
                ContextGetterServiceProvider,
                ApiConfigService,
                ProxyFarmAbiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: ProxyFarmTransactionsService =
            module.get<ProxyFarmTransactionsService>(
                ProxyFarmTransactionsService,
            );
        expect(service).toBeDefined();
    });

    it('should NOT get migrate to total farm position transaction', async () => {
        const service: ProxyFarmTransactionsService =
            module.get<ProxyFarmTransactionsService>(
                ProxyFarmTransactionsService,
            );
        const mxApi = module.get<MXApiService>(MXApiService);
        jest.spyOn(mxApi, 'getNftsCountForUser').mockResolvedValue(1);
        jest.spyOn(mxApi, 'getNftsForUser').mockResolvedValue([
            {
                identifier: 'LKFARM-123456-0a',
                collection: 'LKFARM-123456',
                attributes:
                    'AAAAEEVHTERNRVhGTC1naGlqa2wAAAAAAAAACgAAAAcrKmP2fki2AAAAC0xLTFAtYWJjZGVmAAAAAAAAAAEAAAAHKypj9n5Itg==',
                nonce: 10,
                type: 'MetaESDT',
                name: 'xMEXLPStaked',
                creator:
                    'erd1qqqqqqqqqqqqqpgqat0auzsgk9x0g9gm8n6tq6qa9xtmwu4h295qaalzvq',
                balance: '12150032824158390',
                decimals: 18,
                ticker: 'LKFARM-123456',
            },
        ]);

        const transactions = await service.migrateTotalFarmPosition(
            Address.Zero().bech32(),
            'erd1qqqqqqqqqqqqqpgqt6ltx52ukss9d2qag2k67at28a36xc9lkp2sr06394',
        );

        expect(transactions.length).toEqual(0);
    });

    it('should get migrate to total farm position transaction', async () => {
        const service: ProxyFarmTransactionsService =
            module.get<ProxyFarmTransactionsService>(
                ProxyFarmTransactionsService,
            );
        const mxApi = module.get<MXApiService>(MXApiService);
        jest.spyOn(mxApi, 'getNftsCountForUser').mockResolvedValue(1);
        jest.spyOn(mxApi, 'getNftsForUser').mockResolvedValue([
            {
                identifier: 'LKFARM-123456-05',
                collection: 'LKFARM-123456',
                attributes:
                    'AAAAEEVHTERNRVhGTC1naGlqa2wAAAAAAAAAAQAAAAcrKmP2fki2AAAAC0xLTFAtYWJjZGVmAAAAAAAAAAEAAAAHKypj9n5Itg==',
                nonce: 5,
                type: 'MetaESDT',
                name: 'xMEXLPStaked',
                creator:
                    'erd1qqqqqqqqqqqqqpgqat0auzsgk9x0g9gm8n6tq6qa9xtmwu4h295qaalzvq',
                balance: '12150032824158390',
                decimals: 18,
                ticker: 'LKFARM-123456',
            },
        ]);

        const transactions = await service.migrateTotalFarmPosition(
            Address.Zero().bech32(),
            'erd1qqqqqqqqqqqqqpgqt6ltx52ukss9d2qag2k67at28a36xc9lkp2sr06394',
        );

        expect(transactions[0].data).toEqual(
            encodeTransactionData(
                'ESDTNFTTransfer@LKFARM-123456@05@12150032824158390@erd1qqqqqqqqqqqqqpgqt6ltx52ukss9d2qag2k67at28a36xc9lkp2sr06394@claimRewardsProxy@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpqsdtp6mh',
            ),
        );
    });
});
