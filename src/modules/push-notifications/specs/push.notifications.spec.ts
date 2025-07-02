import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationsService } from '../services/push.notifications.service';
import {
    XPortalApiService,
    XPortalPushNotificationsResult,
} from 'src/services/multiversx-communication/mx.xportal.api.service';
import { PushNotificationsSetterService } from '../services/push.notifications.setter.service';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { NotificationType } from '../models/push.notifications.types';

describe('PushNotificationsService Integration', () => {
    let service: PushNotificationsService;
    let xPortalApiService: jest.Mocked<XPortalApiService>;
    let notificationsSetter: PushNotificationsSetterService;

    beforeEach(async () => {
        const mockXPortalApiService = {
            sendPushNotifications: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            imports: [DynamicModuleUtils.getCommonRedisModule()],
            providers: [
                PushNotificationsService,
                {
                    provide: XPortalApiService,
                    useValue: mockXPortalApiService,
                },
                PushNotificationsSetterService,
            ],
        }).compile();

        service = module.get<PushNotificationsService>(
            PushNotificationsService,
        );
        xPortalApiService = module.get(XPortalApiService);
        notificationsSetter = module.get(PushNotificationsSetterService);

        // Clear rate limit flag
        await notificationsSetter['redisCacheService'].delete(
            'pushNotificationsFailed.rateLimitHit',
        );

        // Clear failed notifications
        await notificationsSetter['redisCacheService'].delete(
            'pushNotificationsFailed.stale.feesCollectorRewards',
        );
        await notificationsSetter['redisCacheService'].delete(
            'pushNotificationsFailed.active.feesCollectorRewards',
        );
    });

    it('should send a batch of failed addresses on cron run', async () => {
        // Set up failed notifications batch
        const failedAddresses = ['address1', 'address2', 'address3'];
        await notificationsSetter.addFailedNotifications(
            failedAddresses,
            NotificationType.FEES_COLLECTOR_REWARDS,
            'stale',
        );

        // Check that the failed notifications have been added
        const failedNotificationsBefore =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'stale',
            );
        expect(failedNotificationsBefore.sort()).toEqual(failedAddresses.sort());

        jest.spyOn(
            xPortalApiService,
            'sendPushNotifications',
        ).mockResolvedValue(XPortalPushNotificationsResult.SUCCESS);

        // Run retryFailedNotifications
        await service.retryFailedNotifications(
            NotificationType.FEES_COLLECTOR_REWARDS,
        );

        // Check that the failed notifications have been removed
        const failedNotifications =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'stale',
            );
        expect(failedNotifications).toEqual([]);

        // Check that the active notifications have been processed
        const activeNotifications =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'active',
            );
        expect(activeNotifications).toEqual([]);
    });

    it('should place the items in the active set to stale if they were not sent successfully', async () => {
        // Set up failed notifications batch
        const failedAddresses = ['address1', 'address2', 'address3'];
        await notificationsSetter.addFailedNotifications(
            failedAddresses,
            NotificationType.FEES_COLLECTOR_REWARDS,
            'active',
        );

        // Check that the failed notifications have been added
        const failedNotificationsBefore =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'active',
            );
        expect(failedNotificationsBefore.sort()).toEqual(failedAddresses.sort());

        // Mock sendPushNotifications to return a failure
        jest.spyOn(
            xPortalApiService,
            'sendPushNotifications',
        ).mockResolvedValue(XPortalPushNotificationsResult.THROTTLED);

        // Run retryFailedNotifications
        await service.retryFailedNotifications(
            NotificationType.FEES_COLLECTOR_REWARDS,
        );

        // Check that the failed notifications have been moved to stale
        const failedNotificationsAfter =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'stale',
            );
        expect(failedNotificationsAfter.sort()).toEqual(failedAddresses.sort());

        // Check that the active notifications have been removed
        const activeNotifications =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'active',
            );
        expect(activeNotifications).toEqual([]);
    });

    it('should stop retrying if the rate limit is hit', async () => {
        // Set up failed notifications batch
        const failedAddresses = Array(300)
            .fill(0)
            .map((_, index) => `erd1...${index}`);
        await notificationsSetter.addFailedNotifications(
            failedAddresses,
            NotificationType.FEES_COLLECTOR_REWARDS,
            'stale',
        );

        // Mock sendPushNotifications to return a failure
        jest.spyOn(xPortalApiService, 'sendPushNotifications')
            .mockImplementationOnce(
                async () => XPortalPushNotificationsResult.SUCCESS,
            )
            .mockImplementationOnce(
                async () => XPortalPushNotificationsResult.SUCCESS,
            )
            .mockImplementationOnce(
                async () => XPortalPushNotificationsResult.THROTTLED,
            );

        // Run retryFailedNotifications
        await service.retryFailedNotifications(
            NotificationType.FEES_COLLECTOR_REWARDS,
        );

        // Check that the failed notifications have been moved to stale
        const failedNotificationsAfter =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'stale',
            );
        expect(failedNotificationsAfter.length).toBe(100);

        // Check that the active notifications have been removed
        const activeNotifications =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'active',
            );
        expect(activeNotifications.length).toEqual(0);

        // Check that the rate limit has been set
        const rateLimitHit = await notificationsSetter.isRateLimitHit();
        expect(rateLimitHit).toBe(true);
    });

    it('should continue retrying after the rate limit is lifted', async () => {
        // Set up failed notifications batch
        const failedAddresses = Array(300)
            .fill(0)
            .map((_, index) => `erd1...${index}`);
        await notificationsSetter.addFailedNotifications(
            failedAddresses,
            NotificationType.FEES_COLLECTOR_REWARDS,
            'stale',
        );

        // Mock sendPushNotifications to return a failure
        jest.spyOn(xPortalApiService, 'sendPushNotifications')
            .mockImplementationOnce(
                async () => XPortalPushNotificationsResult.SUCCESS,
            )
            .mockImplementationOnce(
                async () => XPortalPushNotificationsResult.SUCCESS,
            )
            .mockImplementationOnce(
                async () => XPortalPushNotificationsResult.THROTTLED,
            );

        // Run retryFailedNotifications
        await service.retryFailedNotifications(
            NotificationType.FEES_COLLECTOR_REWARDS,
        );

        // Check that the failed notifications have been moved to stale
        const failedNotificationsFirstRun =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'stale',
            );
        expect(failedNotificationsFirstRun.length).toBe(100);

        // remove the rate limit redis key
        await notificationsSetter['redisCacheService'].delete(
            'pushNotificationsFailed.rateLimitHit',
        );

        // Mock sendPushNotifications to return a success
        jest.spyOn(
            xPortalApiService,
            'sendPushNotifications',
        ).mockImplementationOnce(
            async () => XPortalPushNotificationsResult.SUCCESS,
        );

        // Run retryFailedNotifications again
        await service.retryFailedNotifications(
            NotificationType.FEES_COLLECTOR_REWARDS,
        );

        // Check that the failed notifications have been moved to stale
        const failedNotificationsSecondRun =
            await notificationsSetter.getFailedNotifications(
                NotificationType.FEES_COLLECTOR_REWARDS,
                'stale',
            );
        expect(failedNotificationsSecondRun.length).toBe(0);
    });

    it('should complete gracefully if there are no failed notifications', async () => {
        const result = await service.retryFailedNotifications(
            NotificationType.FEES_COLLECTOR_REWARDS,
        );
        expect(result).toEqual({
            successful: 0,
            failed: 0,
        });
    });
});
