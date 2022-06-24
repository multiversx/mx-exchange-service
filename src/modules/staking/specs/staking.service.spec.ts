import { Test, TestingModule } from '@nestjs/testing';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigModule } from '@nestjs/config';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { StakingService } from '../services/staking.service';
import { AbiStakingService } from '../services/staking.abi.service';
import { StakingGetterService } from '../services/staking.getter.service';
import { StakingGetterServiceMock } from '../mocks/staking.getter.service.mock';
import { StakingComputeService } from '../services/staking.compute.service';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { ElrondGatewayService } from 'src/services/elrond-communication/elrond-gateway.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from 'src/services/elrond-communication/elrond.api.service.mock';

describe('StakingService', () => {
    let service: StakingService;

    const StakingGetterServiceProvider = {
        provide: StakingGetterService,
        useClass: StakingGetterServiceMock,
    };

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                ConfigModule,
            ],
            providers: [
                StakingService,
                AbiStakingService,
                StakingGetterServiceProvider,
                StakingComputeService,
                ContextGetterServiceProvider,
                ElrondProxyServiceProvider,
                ElrondApiServiceProvider,
                ElrondGatewayService,
                ApiConfigService,
            ],
        }).compile();

        service = module.get<StakingService>(StakingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get farms staking', async () => {
        const farmsStaking = await service.getFarmsStaking();
        expect(farmsStaking.length).toBeGreaterThanOrEqual(1);
    });

    /*it('should get rewards for position', async () => {
        const rewards = await service.getRewardsForPosition({
            farmAddress: '',
            liquidity: '',
            identifier: '',
            attributes: '',
            vmQuery: false,
        });
        expect(rewards).toEqual(rewards);
    });

    it('should get batch rewards for position', async () => {
        const batchRewards = await service.getBatchRewardsForPosition([
            {
                farmAddress: '',
                liquidity: '',
                identifier: '',
                attributes: '',
                vmQuery: false,
            },
        ]);
        expect(batchRewards).toEqual(batchRewards);
    });*/

    // An error occurred while runQuery
    // {"path":"AbiStakingService.isWhitelisted","error":"Cannot GET vm-values/query: [Bad Request]"}
    /*it('should check if whitelisted', async () => {
        const stakeAddress = await service.getFarmsStaking()[0].address;
        const isWhitelisted = await service.isWhitelisted(
            stakeAddress,
            Address.Zero().bech32(),
        );
        expect(isWhitelisted).toEqual(false);
    });*/
});
