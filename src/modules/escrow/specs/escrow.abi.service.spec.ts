import { Test, TestingModule } from '@nestjs/testing';
import { EscrowAbiService } from '../services/escrow.abi.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXGatewayServiceProvider } from 'src/services/multiversx-communication/mx.gateway.service.mock';
import { SCPermissions } from '../models/escrow.model';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { Address, ReturnCode, U32Value } from '@multiversx/sdk-core/out';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { EscrowSetterService } from '../services/escrow.setter.service';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { CacheService } from 'src/services/caching/cache.service';

describe('EscrowAbiService', () => {
    let service: EscrowAbiService;
    let mxGateway: MXGatewayService;
    let cachingService: CacheService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                EscrowAbiService,
                EscrowSetterService,
                MXProxyServiceProvider,
                MXGatewayServiceProvider,
                ApiConfigService,
            ],
        }).compile();

        service = module.get<EscrowAbiService>(EscrowAbiService);
        mxGateway = module.get<MXGatewayService>(MXGatewayService);
        cachingService = module.get<CacheService>(CacheService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get none address permissions', async () => {
        jest.spyOn(service, 'getGenericData').mockResolvedValue({
            returnCode: ReturnCode.Ok,
            returnMessage: '',
            values: [],
            firstValue: new U32Value(0),
        });

        const address = Address.Zero();
        const permissions = await service.getAddressPermissionRaw(
            address.bech32(),
        );
        expect(permissions).toEqual([SCPermissions.NONE]);
    });

    it('should get admin address permissions', async () => {
        jest.spyOn(service, 'getGenericData').mockResolvedValue({
            returnCode: ReturnCode.Ok,
            returnMessage: '',
            values: [],
            firstValue: new U32Value(2),
        });

        const address = Address.Zero();
        const permissions = await service.getAddressPermissionRaw(
            address.bech32(),
        );
        expect(permissions).toEqual([SCPermissions.ADMIN]);
    });

    it('should get admin and owner address permissions', async () => {
        jest.spyOn(service, 'getGenericData').mockResolvedValue({
            returnCode: ReturnCode.Ok,
            returnMessage: '',
            values: [],
            firstValue: new U32Value(3),
        });

        const address = Address.Zero();
        const permissions = await service.getAddressPermissionRaw(
            address.bech32(),
        );
        expect(permissions).toEqual([SCPermissions.OWNER, SCPermissions.ADMIN]);
    });

    it('should get none receivers for sender', async () => {
        const sender = Address.Zero();

        jest.spyOn(mxGateway, 'getSCStorageKeys').mockResolvedValue({});
        let receivers = await service.getAllReceiversRaw(sender.bech32());
        expect(receivers).toEqual([]);

        jest.spyOn(mxGateway, 'getSCStorageKeys').mockResolvedValue({
            '7065726d697373696f6e73344abc44119cfcace253de05e33c01796c12f96f3bcc52b504b9bc2b96927ceb':
                '03',
            '7065726d697373696f6e7360bb6011a781eb8b53d61d79047450adaa46977e20239312951262c1057d1090':
                '02',
            '73656e6465724c6173745472616e7366657245706f6368344abc44119cfcace253de05e33c01796c12f96f3bcc52b504b9bc2b96927ceb':
                '1143',
            '73656e6465724c6173745472616e7366657245706f6368ba66e8a916236723bf1f94996488b6fc57dc5f6ec0512b9b74b53ef65f9508cb':
                '1139',
        });

        receivers = await service.getAllReceiversRaw(sender.bech32());
        expect(receivers).toEqual([]);

        jest.spyOn(mxGateway, 'getSCStorageKeys').mockResolvedValue({
            '616c6c53656e646572732c5594ae2f77a913119bc9db52833245a5879674cd4aeaedcd92f6f9e7edf17d2e696e646578344abc44119cfcace253de05e33c01796c12f96f3bcc52b504b9bc2b96927ceb':
                '01',
            '616c6c53656e646572732c5594ae2f77a913119bc9db52833245a5879674cd4aeaedcd92f6f9e7edf17d2e6974656d00000001':
                '6e593caf5c21cd2e419c8249101e20eb53770d6b2512ee9f19b971fd3c0a0e89', // erd1devnet6uy8xjusvusfy3q83qadfhwrtty5fwa8ceh9cl60q2p6ysra7aaa
            '616c6c53656e646572732c5594ae2f77a913119bc9db52833245a5879674cd4aeaedcd92f6f9e7edf17d2e6c656e':
                '01',
        });

        receivers = await service.getAllReceiversRaw(sender.bech32());
        expect(receivers).toEqual([]);
        await cachingService.deleteInCache(`escrow.scKeys`);
    });

    it('should get one receiver for sender', async () => {
        jest.spyOn(mxGateway, 'getSCStorageKeys').mockResolvedValue({
            '616c6c53656e646572736e593caf5c21cd2e419c8249101e20eb53770d6b2512ee9f19b971fd3c0a0e892e696e646578344abc44119cfcace253de05e33c01796c12f96f3bcc52b504b9bc2b96927ceb':
                '01',
            '616c6c53656e646572736e593caf5c21cd2e419c8249101e20eb53770d6b2512ee9f19b971fd3c0a0e892e6974656d00000001':
                Address.Zero().hex(),
            '616c6c53656e646572736e593caf5c21cd2e419c8249101e20eb53770d6b2512ee9f19b971fd3c0a0e892e6c656e':
                '01',
        });

        const sender = Address.Zero();
        const receivers = await service.getAllReceiversRaw(sender.bech32());
        expect(receivers).toEqual([
            'erd1devnet6uy8xjusvusfy3q83qadfhwrtty5fwa8ceh9cl60q2p6ysra7aaa',
        ]);
        await cachingService.deleteInCache(`escrow.scKeys`);
    });

    it('should get two receivers for sender', async () => {
        jest.spyOn(mxGateway, 'getSCStorageKeys').mockResolvedValue({
            '616c6c53656e646572736e593caf5c21cd2e419c8249101e20eb53770d6b2512ee9f19b971fd3c0a0e892e696e646578344abc44119cfcace253de05e33c01796c12f96f3bcc52b504b9bc2b96927ceb':
                '01',
            '616c6c53656e646572736e593caf5c21cd2e419c8249101e20eb53770d6b2512ee9f19b971fd3c0a0e892e6974656d00000001':
                Address.Zero().hex(),
            '616c6c53656e646572736e593caf5c21cd2e419c8249101e20eb53770d6b2512ee9f19b971fd3c0a0e892e6c656e':
                '01',
            '616c6c53656e646572732c5594ae2f77a913119bc9db52833245a5879674cd4aeaedcd92f6f9e7edf17d2e696e646578344abc44119cfcace253de05e33c01796c12f96f3bcc52b504b9bc2b96927ceb':
                '01',
            '616c6c53656e646572732c5594ae2f77a913119bc9db52833245a5879674cd4aeaedcd92f6f9e7edf17d2e6974656d00000001':
                Address.Zero().hex(),
            '616c6c53656e646572732c5594ae2f77a913119bc9db52833245a5879674cd4aeaedcd92f6f9e7edf17d2e6c656e':
                '01',
        });

        const sender = Address.Zero();
        const receivers = await service.getAllReceiversRaw(sender.bech32());
        expect(receivers).toEqual([
            'erd1devnet6uy8xjusvusfy3q83qadfhwrtty5fwa8ceh9cl60q2p6ysra7aaa',
            'erd1932eft30w753xyvme8d49qejgkjc09n5e49w4mwdjtm0neld797su0dlxp',
        ]);
        await cachingService.deleteInCache(`escrow.scKeys`);
    });
});
