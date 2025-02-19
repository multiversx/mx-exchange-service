import { Test, TestingModule } from '@nestjs/testing';
import { RouterService } from '../services/router.service';
import { PairFilterArgs } from '../models/filter.args';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { RouterAbiServiceProvider } from '../mocks/router.abi.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { PairFilteringService } from 'src/modules/pair/services/pair.filtering.service';
import { PairServiceProvider } from 'src/modules/pair/mocks/pair.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';

describe('RouterService', () => {
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
                PairAbiServiceProvider,
                RouterAbiServiceProvider,
                PairComputeServiceProvider,
                RouterService,
                ApiConfigService,
                PairFilteringService,
                PairServiceProvider,
                WrapAbiServiceProvider,
                TokenServiceProvider,
                ContextGetterServiceProvider,
                MXApiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<RouterService>(RouterService);
        expect(service).toBeDefined();
    });

    it('should get all pairs', async () => {
        const service = module.get<RouterService>(RouterService);

        const allPairs = await service.getAllPairs(
            0,
            Number.MAX_VALUE,
            new PairFilterArgs(),
        );
        expect(allPairs).toEqual([
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000013',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000014',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000015',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000016',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000017',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000018',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000019',
                ).bech32(),
            }),
        ]);
    });

    it('should get filtered pairs', async () => {
        const service = module.get<RouterService>(RouterService);

        const filteredPairs = await service.getAllPairs(0, Number.MAX_VALUE, {
            firstTokenID: 'WEGLD-123456',
            issuedLpToken: true,
            addresses: null,
            secondTokenID: null,
            state: null,
            feeState: null,
            minVolume: null,
            minLockedValueUSD: null,
        });
        expect(filteredPairs).toEqual([
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000013',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000015',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000019',
                ).bech32(),
            }),
        ]);
    });

    it('should get pairs filtered by fee state and volume', async () => {
        const service = module.get<RouterService>(RouterService);

        const filteredPairs = await service.getAllPairs(0, Number.MAX_VALUE, {
            firstTokenID: 'WEGLD-123456',
            issuedLpToken: true,
            addresses: null,
            secondTokenID: null,
            state: null,
            feeState: false,
            minVolume: 1000,
            minLockedValueUSD: null,
        });
        expect(filteredPairs).toEqual([
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000015',
                ).bech32(),
            }),
        ]);
    });

    it('should get pairs filtered by minimum locked value USD', async () => {
        const service = module.get<RouterService>(RouterService);

        const filteredPairs = await service.getAllPairs(0, Number.MAX_VALUE, {
            firstTokenID: null,
            issuedLpToken: true,
            addresses: null,
            secondTokenID: null,
            state: null,
            feeState: null,
            minVolume: null,
            minLockedValueUSD: 300,
        });
        expect(filteredPairs).toEqual([
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000013',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000014',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000015',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000017',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000018',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000019',
                ).bech32(),
            }),
        ]);
    });
});
