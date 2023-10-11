import { Test, TestingModule } from '@nestjs/testing';
import { FarmTransactionServiceV2 } from '../v2/services/farm.v2.transaction.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { FarmAbiServiceProviderV2 } from '../mocks/farm.v2.abi.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { Address } from '@multiversx/sdk-core/out';
import { encodeTransactionData } from 'src/helpers/helpers';

describe('FarmTransactionsServiceV2', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({}),
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                ApiConfigService,
                MXProxyServiceProvider,
                MXApiServiceProvider,
                FarmAbiServiceProviderV2,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                TokenServiceProvider,
                ContextGetterServiceProvider,
                FarmTransactionServiceV2,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<FarmTransactionServiceV2>(
            FarmTransactionServiceV2,
        );
        expect(service).toBeDefined();
    });

    it('should NOT get migrate total farm position transaction', async () => {
        const service = module.get<FarmTransactionServiceV2>(
            FarmTransactionServiceV2,
        );
        const mxApi = module.get<MXApiService>(MXApiService);
        jest.spyOn(mxApi, 'getNftsForUser').mockResolvedValue([
            {
                identifier: 'EGLDMEXFL-ghijkl-0a',
                collection: 'EGLDMEXFL-ghijkl',
                attributes:
                    'AAAACBEpiw/pcSUIAAAAAAAADNIAAAAAAAAABysPQGpo9rtgu2ARp4Hri1PWHXkEdFCtqkaXfiAjkxKVEmLBBX0QkA==',
                nonce: 10,
                type: 'MetaESDT',
                name: 'EGLDMEXLPStakedLK',
                creator:
                    'erd1qqqqqqqqqqqqqpgqna8cqqzdtdg849hr0pd5cmft8ujaguhv295qgchtqa',
                balance: '12120193336145595',
                decimals: 18,
                ticker: 'EGLDMEXFL-2d2bba',
            },
        ]);

        const transactions = await service.migrateTotalFarmPosition(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000041',
            ).bech32(),
            Address.Zero().bech32(),
        );

        expect(transactions.length).toEqual(0);
    });

    it('should NOT get migrate total farm position transaction', async () => {
        const service = module.get<FarmTransactionServiceV2>(
            FarmTransactionServiceV2,
        );
        const mxApi = module.get<MXApiService>(MXApiService);
        jest.spyOn(mxApi, 'getNftsForUser').mockResolvedValue([
            {
                identifier: 'EGLDMEXFL-ghijkl-01',
                collection: 'EGLDMEXFL-ghijkl',
                attributes:
                    'AAAACBEpiw/pcSUIAAAAAAAADNIAAAAAAAAABysPQGpo9rtgu2ARp4Hri1PWHXkEdFCtqkaXfiAjkxKVEmLBBX0QkA==',
                nonce: 1,
                type: 'MetaESDT',
                name: 'EGLDMEXLPStakedLK',
                creator:
                    'erd1qqqqqqqqqqqqqpgqna8cqqzdtdg849hr0pd5cmft8ujaguhv295qgchtqa',
                balance: '12120193336145595',
                decimals: 18,
                ticker: 'EGLDMEXFL-2d2bba',
            },
        ]);

        const transactions = await service.migrateTotalFarmPosition(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000041',
            ).bech32(),
            Address.Zero().bech32(),
        );

        expect(transactions[0].data).toEqual(
            encodeTransactionData(
                `ESDTNFTTransfer@EGLDMEXFL-ghijkl@01@12120193336145595@${Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000041',
                ).bech32()}@claimRewards`,
            ),
        );
    });
});
