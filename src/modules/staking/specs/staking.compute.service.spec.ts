import { Test, TestingModule } from '@nestjs/testing';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ConfigModule } from '@nestjs/config';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { StakingGetterService } from '../services/staking.getter.service';
import { StakingGetterServiceMock } from '../mocks/staking.getter.service.mock';
import { StakingComputeService } from '../services/staking.compute.service';
import { Address } from '@elrondnetwork/erdjs/out';
import { StakingTokenAttributesModel } from '../models/stakingTokenAttributes.model';
import BigNumber from 'bignumber.js';
import { StakingFarmTokenType } from '@elrondnetwork/erdjs-dex';

describe('StakingComputeService', () => {
    let service: StakingComputeService;

    const StakingGetterServiceProvider = {
        provide: StakingGetterService,
        useClass: StakingGetterServiceMock,
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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                ConfigModule,
            ],
            providers: [
                StakingComputeService,
                StakingGetterServiceProvider,
                ContextGetterServiceProvider,
            ],
        }).compile();

        service = module.get<StakingComputeService>(StakingComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should compute stake rewards for position', async () => {
        const stakeRewardsForPosition = await service.computeStakeRewardsForPosition(
            Address.Zero().bech32(),
            '52560000000',
            new StakingTokenAttributesModel({
                type: StakingFarmTokenType.STAKING_FARM_TOKEN,
                rewardPerShare: '1000000',
                compoundedReward: '1000000',
                currentFarmAmount: '1000000',
            }),
        );
        expect(stakeRewardsForPosition.toFixed()).toEqual(
            '149999999999999000055',
        );
    });

    it('should compute future rewards per share', async () => {
        const futureRewardsPerShare = await service.computeFutureRewardsPerShare(
            Address.Zero().bech32(),
        );
        expect(futureRewardsPerShare.toFixed()).toEqual(
            '150000000000000000055',
        );
    });

    it('should compute extra rewards since last allocation', async () => {
        const extraRewardsSinceLastAllocation = await service.computeExtraRewardsSinceLastAllocation(
            Address.Zero().bech32(),
        );
        expect(extraRewardsSinceLastAllocation).toEqual(
            new BigNumber(5500000000),
        );
    });

    it('should compute extra rewards bounded', async () => {
        const extraRewardsBounded = await service.computeExtraRewardsBounded(
            Address.Zero().bech32(),
            new BigNumber(100000000),
        );
        expect(extraRewardsBounded).toEqual(
            new BigNumber(10000000000000000000),
        );
    });
});
