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
import { StakingGetterService } from '../services/staking.getter.service';
import { StakingGetterServiceMock } from '../mocks/staking.getter.service.mock';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { ElrondGatewayService } from 'src/services/elrond-communication/elrond-gateway.service';
import { StakingTransactionService } from '../services/staking.transactions.service';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { Address } from '@elrondnetwork/erdjs/out';
import { InputTokenModel } from 'src/models/inputToken.model';

describe('StakingTransactionService', () => {
    let service: StakingTransactionService;

    const StakingGetterServiceProvider = {
        provide: StakingGetterService,
        useClass: StakingGetterServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
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
                StakingTransactionService,
                StakingGetterServiceProvider,
                ContextGetterServiceProvider,
                ContextTransactionsService,
                ElrondProxyServiceProvider,
                ElrondGatewayService,
                ApiConfigService,
            ],
        }).compile();

        service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get stake farm transaction', async () => {
        const stakeFarmTransaction = await service.stakeFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            [
                new InputTokenModel({
                    tokenID: 'TOK1-1111',
                    nonce: 0,
                    amount: '1000',
                }),
            ],
        );
        expect(stakeFarmTransaction.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwMUA1NDRmNGIzMTJkMzEzMTMxMzFAQDAzZThANzM3NDYxNmI2NTQ2NjE3MjZk',
        );
    });

    it('should get unstake farm transaction', async () => {
        const unstakeFarmTransaction = await service.unstakeFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
                nonce: 0,
                amount: '1000',
            }),
        );
        expect(unstakeFarmTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUBAMDNlOEAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwQDc1NmU3Mzc0NjE2YjY1NDY2MTcyNmQ=',
        );
    });

    it('should get stake farm throguh proxy transaction', async () => {
        const stakeFarmThroughProxyTransaction = await service.stakeFarmThroughProxy(
            Address.Zero().bech32(),
            '1000000',
        );
        expect(stakeFarmThroughProxyTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNzQ2MTZiNjU0NjYxNzI2ZDU0Njg3MjZmNzU2NzY4NTA3MjZmNzg3OUAwZjQyNDA=',
        );
    });

    it('should get unstake farm throguh proxy transaction', async () => {
        const unstakeFarmThroughProxyTransaction = await service.unstakeFarmThroughProxy(
            Address.Zero().bech32(),
            '1000000',
        );
        expect(unstakeFarmThroughProxyTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDc1NmU3Mzc0NjE2YjY1NDY2MTcyNmQ1NDY4NzI2Zjc1Njc2ODUwNzI2Zjc4NzlAMGY0MjQw',
        );
    });

    it('should get unbound farm transaction', async () => {
        const unboundFarmTransaction = await service.unbondFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
                nonce: 0,
                amount: '1000000',
            }),
        );
        expect(unboundFarmTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUBAMGY0MjQwQDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBANzU2ZTYyNmY2ZTY0NDY2MTcyNmQ=',
        );
    });

    it('should get claim rewards transaction', async () => {
        const claimRewardsTransaction = await service.claimRewards(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
                nonce: 0,
                amount: '1000000',
            }),
        );
        expect(claimRewardsTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUBAMGY0MjQwQDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBANjM2YzYxNjk2ZDUyNjU3NzYxNzI2NDcz',
        );
    });

    it('should get claim rewards with new value transaction', async () => {
        const claimRewardsWithNewValueTransaction = await service.claimRewardsWithNewValue(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
                nonce: 0,
                amount: '1000000',
            }),
            '2000000',
        );
        expect(claimRewardsWithNewValueTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUBAMGY0MjQwQDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBANjM2YzYxNjk2ZDUyNjU3NzYxNzI2NDczNTc2OTc0Njg0ZTY1Nzc1NjYxNmM3NTY1QDFlODQ4MA==',
        );
    });

    it('should get compound rewards transaction', async () => {
        const compoundRewardsTransaction = await service.compoundRewards(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
                nonce: 0,
                amount: '1000000',
            }),
        );
        expect(compoundRewardsTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUBAMGY0MjQwQDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBANjM2ZjZkNzA2Zjc1NmU2NDUyNjU3NzYxNzI2NDcz',
        );
    });

    it('should get top up rewards transaction', async () => {
        const topUpRewardsTransaction = await service.topUpRewards(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
                nonce: 0,
                amount: '1000000',
            }),
        );
        expect(topUpRewardsTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUBAMGY0MjQwQDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBANzQ2ZjcwNTU3MDUyNjU3NzYxNzI2NDcz',
        );
    });

    it('should get merge farm tokens transaction', async () => {
        const mergeFarmTokensTransaction = await service.mergeFarmTokens(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            [
                new InputTokenModel({
                    tokenID: 'TOK1-1111',
                    nonce: 0,
                    amount: '1000000',
                }),
                new InputTokenModel({
                    tokenID: 'USDC-1111',
                    nonce: 0,
                    amount: '1000000',
                }),
            ],
        );
        expect(mergeFarmTokensTransaction.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDBmNDI0MEA1NTUzNDQ0MzJkMzEzMTMxMzFAQDBmNDI0MEA2ZDY1NzI2NzY1NDY2MTcyNmQ1NDZmNmI2NTZlNzM=',
        );
    });

    it('should get set penalty percent transaction', async () => {
        const setPenaltyPercentTransaction = await service.setPenaltyPercent(
            Address.Zero().bech32(),
            0.01,
        );
        expect(setPenaltyPercentTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDVmNzA2NTZlNjE2Yzc0Nzk1ZjcwNjU3MjYzNjU2ZTc0QA==',
        );
    });

    it('should get set minimum farming epochs transaction', async () => {
        const setMinimumFarmingEpochsTransaction = await service.setMinimumFarmingEpochs(
            Address.Zero().bech32(),
            10,
        );
        expect(setMinimumFarmingEpochsTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDVmNmQ2OTZlNjk2ZDc1NmQ1ZjY2NjE3MjZkNjk2ZTY3NWY2NTcwNmY2MzY4NzNAMGE=',
        );
    });

    it('should get set burn gas limit transaction', async () => {
        const setBurnGasLimitTransaction = await service.setBurnGasLimit(
            Address.Zero().bech32(),
            '1000000',
        );
        expect(setBurnGasLimitTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDVmNjI3NTcyNmU1ZjY3NjE3MzVmNmM2OTZkNjk3NEAwZjQyNDA=',
        );
    });

    it('should get set transfer exec gas limit transaction', async () => {
        const setTransferExecGasLimitTransaction = await service.setTransferExecGasLimit(
            Address.Zero().bech32(),
            '1000000',
        );
        expect(setTransferExecGasLimitTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDVmNzQ3MjYxNmU3MzY2NjU3MjVmNjU3ODY1NjM1ZjY3NjE3MzVmNmM2OTZkNjk3NEAwZjQyNDA=',
        );
    });

    it('should get add address to whitelist transaction', async () => {
        const addAddressToWhitelistTransaction = await service.addAddressToWhitelist(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
        );
        expect(addAddressToWhitelistTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDYxNjQ2NDQxNjQ2NDcyNjU3MzczNTQ2ZjU3Njg2OTc0NjU2YzY5NzM3NEAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw',
        );
    });

    it('should get remove address from whitelist transaction', async () => {
        const removeAddressFromWhitelisTransaction = await service.removeAddressFromWhitelist(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
        );
        expect(removeAddressFromWhitelisTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDcyNjU2ZDZmNzY2NTQxNjQ2NDcyNjU3MzczNDY3MjZmNmQ1NzY4Njk3NDY1NmM2OTczNzRAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMA==',
        );
    });

    it('should get pause transaction', async () => {
        const pauseTransaction = await service.pause(Address.Zero().bech32());
        expect(pauseTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDcwNjE3NTczNjU=',
        );
    });

    it('should get resume transaction', async () => {
        const resumeTransaction = await service.resume(Address.Zero().bech32());
        expect(resumeTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDcyNjU3Mzc1NmQ2NQ==',
        );
    });

    it('should get register farm token transaction', async () => {
        const registerFarmTokenTransaction = await service.registerFarmToken(
            Address.Zero().bech32(),
            'TokenToRegisterName',
            'TokenToRegisterID',
            18,
        );
        expect(registerFarmTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDcyNjU2NzY5NzM3NDY1NzI0NjYxNzI2ZDU0NmY2YjY1NmVANTQ2ZjZiNjU2ZTU0NmY1MjY1Njc2OTczNzQ2NTcyNGU2MTZkNjVANTQ2ZjZiNjU2ZTU0NmY1MjY1Njc2OTczNzQ2NTcyNDk0NEAxMg==',
        );
    });

    it('should get set local roles farm token transaction', async () => {
        const rsetLocalRolesFarmTokenTransaction = await service.setLocalRolesFarmToken(
            Address.Zero().bech32(),
        );
        expect(rsetLocalRolesFarmTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDRjNmY2MzYxNmM1MjZmNmM2NTczNDY2MTcyNmQ1NDZmNmI2NTZl',
        );
    });

    it('should get set per block reward amount transaction', async () => {
        const setPerBlockRewardAmountTransaction = await service.setPerBlockRewardAmount(
            Address.Zero().bech32(),
            '100',
        );
        expect(setPerBlockRewardAmountTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDUwNjU3MjQyNmM2ZjYzNmI1MjY1Nzc2MTcyNjQ0MTZkNmY3NTZlNzRANjQ=',
        );
    });

    it('should get set max APR transaction', async () => {
        const setMaxAprTransaction = await service.setMaxApr(
            Address.Zero().bech32(),
            '100',
        );
        expect(setMaxAprTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDRkNjE3ODQxNzA3MkA2NA==',
        );
    });

    it('should get set min unbound epochs transaction', async () => {
        const setMinUnbondEpochsTransaction = await service.setMinUnbondEpochs(
            Address.Zero().bech32(),
            '100',
        );
        expect(setMinUnbondEpochsTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDRkNjk2ZTU1NmU2MjZmNmU2NDQ1NzA2ZjYzNjg3M0A2NA==',
        );
    });

    it('should get start produce rewards transaction', async () => {
        const startProduceRewardsTransaction = await service.startProduceRewards(
            Address.Zero().bech32(),
        );
        expect(startProduceRewardsTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNzQ2MTcyNzQ1MDcyNmY2NDc1NjM2NTUyNjU3NzYxNzI2NDcz',
        );
    });

    it('should get end produce rewards transaction', async () => {
        const endProduceRewardsTransaction = await service.endProduceRewards(
            Address.Zero().bech32(),
        );
        expect(endProduceRewardsTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDY1NmU2NDVmNzA3MjZmNjQ3NTYzNjU1ZjcyNjU3NzYxNzI2NDcz',
        );
    });
});
