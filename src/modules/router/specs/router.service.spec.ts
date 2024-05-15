import { Test, TestingModule } from '@nestjs/testing';
import { RouterService } from '../services/router.service';
import { PairFilterArgs, PairPaginationArgs } from '../models/filter.args';
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

describe('RouterService', () => {
    let module: TestingModule;
    let defaultPagination: PairPaginationArgs;

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
            ],
        }).compile();

        defaultPagination = new PairPaginationArgs({
            offset: 0,
            limit: Number.MAX_VALUE,
        });
    });

    it('should be defined', () => {
        const service = module.get<RouterService>(RouterService);
        expect(service).toBeDefined();
    });

    it('should get all pairs', async () => {
        const service = module.get<RouterService>(RouterService);

        const allPairs = await service.getAllPairs(
            defaultPagination,
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

        const filteredPairs = await service.getAllPairs(defaultPagination, {
            firstTokenID: 'WEGLD-123456',
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
            feeState: null,
            minVolume: null,
            minLockedValueUSD: null,
            minTradesCount: null,
            hasFarms: null,
            hasDualFarms: null,
            minDeployedAt: null,
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

        const filteredPairs = await service.getAllPairs(defaultPagination, {
            firstTokenID: 'WEGLD-123456',
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
            feeState: false,
            minVolume: 1000,
            minLockedValueUSD: null,
            minTradesCount: null,
            hasFarms: null,
            hasDualFarms: null,
            minDeployedAt: null,
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

        const filteredPairs = await service.getAllPairs(defaultPagination, {
            firstTokenID: null,
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
            feeState: null,
            minVolume: null,
            minLockedValueUSD: 300,
            minTradesCount: null,
            hasFarms: null,
            hasDualFarms: null,
            minDeployedAt: null,
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

    it('should get pairs filtered by minimum trades count', async () => {
        const service = module.get<RouterService>(RouterService);

        const filteredPairs = await service.getAllPairs(defaultPagination, {
            firstTokenID: null,
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
            feeState: null,
            minVolume: null,
            minLockedValueUSD: null,
            minTradesCount: 300,
            hasFarms: null,
            hasDualFarms: null,
            minDeployedAt: null,
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
        ]);
    });

    it('should get pairs filtered by hasFarms field and minimum trades count', async () => {
        const service = module.get<RouterService>(RouterService);

        const filteredPairs = await service.getAllPairs(defaultPagination, {
            firstTokenID: null,
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
            feeState: null,
            minVolume: null,
            minLockedValueUSD: null,
            minTradesCount: 300,
            hasFarms: true,
            hasDualFarms: null,
            minDeployedAt: null,
        });
        expect(filteredPairs).toEqual([
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000013',
                ).bech32(),
            }),
        ]);
    });
});
