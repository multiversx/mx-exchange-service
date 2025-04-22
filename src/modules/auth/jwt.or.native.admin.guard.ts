import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Inject,
    Logger,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { CacheService } from 'src/services/caching/cache.service';
import { GqlAdminGuard } from './gql.admin.guard';
import { NativeAdminGuard } from './native.admin.guard';

@Injectable()
export class JwtOrNativeAdminGuard implements CanActivate {
    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const jwtGuard = new GqlAdminGuard(this.logger, this.apiConfigService);
        const nativeAuthGuard = new NativeAdminGuard(
            this.apiConfigService,
            this.cachingService,
            this.logger,
        );

        const guards = [jwtGuard, nativeAuthGuard];

        const canActivateResponses = await Promise.all(
            guards.map((guard) => {
                try {
                    return guard.canActivate(context);
                } catch (error) {
                    this.logger.error(`${JwtOrNativeAdminGuard.name}: `, error);
                    return false;
                }
            }),
        );

        const canActivate = canActivateResponses.reduce(
            (result, value) => result || value,
            false,
        );
        return canActivate;
    }
}
