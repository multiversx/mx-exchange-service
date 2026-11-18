import { ConfigService } from '@nestjs/config';
import { ApiConfigService } from '../api.config.service';

describe('ApiConfigService', () => {
    const withEnv = (env: Record<string, string | undefined>) =>
        new ApiConfigService(new ConfigService(env as Record<string, string>));

    describe('getXoxnoReferralID', () => {
        it.each([undefined, '', '  ', '0', '-1', '1.5', 'abc'])(
            'returns undefined for %p',
            (raw) => {
                const service = withEnv({ XOXNO_REFERRAL_ID: raw });

                expect(service.getXoxnoReferralID()).toBeUndefined();
            },
        );

        it('parses the env string into a number', () => {
            const service = withEnv({ XOXNO_REFERRAL_ID: '4' });

            expect(service.getXoxnoReferralID()).toBe(4);
        });
    });
});
