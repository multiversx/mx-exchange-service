import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TransactionModel } from 'src/models/transaction.model';
import { XoxnoAggregatorAbiService } from 'src/modules/auto-router/services/xoxno-aggregator.abi.service';
import { XoxnoAggregatorTransactionService } from 'src/modules/auto-router/services/xoxno-aggregator.transactions.service';
import { BroadcastStatus } from '../constants';
import { TaskRunnerTransactionService } from '../services/task.runner.transaction.service';
import { XoxnoTasksService } from '../services/xoxno.tasks.service';

const SENDER = 'erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th';

describe('XoxnoTasksService', () => {
    let service: XoxnoTasksService;
    let referralID: number | undefined;
    const referralConfig = jest.fn();
    const referrerBalances = jest.fn();
    const claimReferralFees = jest.fn();
    const broadcastTransaction = jest.fn();

    beforeEach(async () => {
        referralID = 7;
        referralConfig
            .mockReset()
            .mockResolvedValue({ owner: SENDER, fee: 10, active: true });
        referrerBalances.mockReset();
        claimReferralFees
            .mockReset()
            .mockResolvedValue(new TransactionModel({ sender: SENDER }));
        broadcastTransaction
            .mockReset()
            .mockResolvedValue(BroadcastStatus.success);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                XoxnoTasksService,
                {
                    provide: ApiConfigService,
                    useValue: { getXoxnoReferralID: () => referralID },
                },
                {
                    provide: XoxnoAggregatorAbiService,
                    useValue: { referralConfig, referrerBalances },
                },
                {
                    provide: XoxnoAggregatorTransactionService,
                    useValue: { claimReferralFees },
                },
                {
                    provide: TaskRunnerTransactionService,
                    useValue: {
                        broadcastTransaction,
                        getSenderAddress: () => SENDER,
                    },
                },
                {
                    provide: WINSTON_MODULE_PROVIDER,
                    useValue: {
                        info: jest.fn(),
                        warn: jest.fn(),
                        error: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get(XoxnoTasksService);
    });

    it('skips when referral ID is not configured', async () => {
        referralID = undefined;

        await service.executeClaimReferralFeesTask();

        expect(referralConfig).not.toHaveBeenCalled();
        expect(referrerBalances).not.toHaveBeenCalled();
        expect(broadcastTransaction).not.toHaveBeenCalled();
    });

    it('skips when the referral is not registered on-chain', async () => {
        referralConfig.mockResolvedValue(undefined);

        await service.executeClaimReferralFeesTask();

        expect(referralConfig).toHaveBeenCalledWith(7);
        expect(referrerBalances).not.toHaveBeenCalled();
        expect(broadcastTransaction).not.toHaveBeenCalled();
    });

    it('still claims when the referral is inactive', async () => {
        referralConfig.mockResolvedValue({
            owner: SENDER,
            fee: 10,
            active: false,
        });
        referrerBalances.mockResolvedValue([
            { tokenID: 'USDC-c76f1f', amount: '1' },
        ]);

        await service.executeClaimReferralFeesTask();

        expect(claimReferralFees).toHaveBeenCalledWith(SENDER, 7, [
            'USDC-c76f1f',
        ]);
    });

    it('skips when there is nothing to claim', async () => {
        referrerBalances.mockResolvedValue([
            { tokenID: 'USDC-c76f1f', amount: '0' },
        ]);

        await service.executeClaimReferralFeesTask();

        expect(referrerBalances).toHaveBeenCalledWith(7);
        expect(claimReferralFees).not.toHaveBeenCalled();
    });

    it('claims non-zero balances with the task runner wallet', async () => {
        referrerBalances.mockResolvedValue([
            { tokenID: 'USDC-c76f1f', amount: '1579500' },
            { tokenID: 'WEGLD-bd4d79', amount: '0' },
            { tokenID: 'EGLD-000000', amount: '45014377642296807' },
        ]);

        await service.executeClaimReferralFeesTask();

        expect(claimReferralFees).toHaveBeenCalledTimes(1);
        expect(claimReferralFees).toHaveBeenCalledWith(SENDER, 7, [
            'USDC-c76f1f',
            'EGLD-000000',
        ]);
        expect(broadcastTransaction).toHaveBeenCalledTimes(1);
    });

    it('splits claims into batches of at most 90 tokens', async () => {
        referrerBalances.mockResolvedValue(
            Array.from({ length: 181 }, (_, i) => ({
                tokenID: `TKN${i}-000000`,
                amount: '1',
            })),
        );

        await service.executeClaimReferralFeesTask();

        const batchSizes = claimReferralFees.mock.calls.map(
            ([, , tokens]) => tokens.length,
        );
        expect(batchSizes).toEqual([90, 90, 1]);
        expect(broadcastTransaction).toHaveBeenCalledTimes(3);
    });

    it('throws after all batches when a broadcast errors', async () => {
        referrerBalances.mockResolvedValue(
            Array.from({ length: 91 }, (_, i) => ({
                tokenID: `TKN${i}-000000`,
                amount: '1',
            })),
        );
        broadcastTransaction
            .mockResolvedValueOnce(BroadcastStatus.error)
            .mockResolvedValueOnce(BroadcastStatus.success);

        await expect(service.executeClaimReferralFeesTask()).rejects.toThrow(
            'Claim XOXNO referral fees task failed',
        );
        expect(broadcastTransaction).toHaveBeenCalledTimes(2);
    });

    it('does not throw on an on-chain failure', async () => {
        referrerBalances.mockResolvedValue([
            { tokenID: 'USDC-c76f1f', amount: '1' },
        ]);
        broadcastTransaction.mockResolvedValue(BroadcastStatus.fail);

        await expect(
            service.executeClaimReferralFeesTask(),
        ).resolves.toBeUndefined();
    });
});
