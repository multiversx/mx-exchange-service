import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
    constructor(private readonly configService: ConfigService) {}

    private getGeneric<T>(path: string, alias?: string): T {
        const value = this.configService.get<T>(path);
        if (!value) {
            throw new Error(`No '${alias || path}' config present`);
        }
        return value;
    }

    getPublicAppPort(): number {
        return parseInt(this.getGeneric<string>('PORT'));
    }

    getPublicAppListenAddress(): string {
        return this.getGeneric<string>('LISTEN_ADDRESS');
    }

    getPrivateAppPort(): number {
        return parseInt(this.getGeneric<string>('PRIVATE_PORT'));
    }

    getPrivateAppListenAddress(): string {
        return this.getGeneric<string>('PRIVATE_LISTEN_ADDRESS');
    }

    getCacheWarmerPort(): number {
        return parseInt(this.getGeneric<string>('CACHEWARMER_PORT'));
    }

    isPublicApiActive(): boolean {
        return this.getGeneric<string>('ENABLE_PUBLIC_API') === 'true';
    }

    isCacheWarmerCronActive(): boolean {
        return this.getGeneric<string>('ENABLE_CACHE_WARMER') === 'true';
    }

    isPrivateAppActive(): boolean {
        return this.getGeneric<string>('ENABLE_PRIVATE_API') === 'true';
    }

    isEventsNotifierAppActive(): boolean {
        return this.getGeneric<string>('ENABLE_EVENTS_NOTIFIER') === 'true';
    }

    isEventsReindexingCronjobActive(): boolean {
        return this.getGeneric<string>('ENABLE_EVENTS_REINDEXING') === 'true';
    }

    getRedisUrl(): string {
        return this.getGeneric<string>('REDIS_URL');
    }

    getRedisPort(): number {
        return parseInt(this.getGeneric<string>('REDIS_PORT'));
    }

    getRedisPassword(): string | undefined {
        const password = this.configService.get<string>('REDIS_PASSWORD');
        return password !== '' ? password : undefined;
    }

    getApiUrl(): string {
        return this.getGeneric<string>('ELRONDAPI_URL');
    }

    getNotifierUrl(): string {
        return this.getGeneric<string>('NOTIFIER_URL');
    }

    getKeepAliveTimeoutDownstream(): number {
        return parseInt(
            this.getGeneric<string>('KEEPALIVE_TIMEOUT_DOWNSTREAM'),
        );
    }

    getKeepAliveTimeoutUpstream(): number {
        return parseInt(this.getGeneric<string>('KEEPALIVE_TIMEOUT_UPSTREAM'));
    }

    getMongoDBURL(): string {
        return this.getGeneric<string>('MONGODB_URL');
    }

    getMongoDBDatabase(): string {
        return this.getGeneric<string>('MONGODB_DATABASE');
    }

    getMongoDBUsername(): string {
        return this.getGeneric<string>('MONGODB_USERNAME');
    }

    getMongoDBPassword(): string {
        return this.getGeneric<string>('MONGODB_PASSWORD');
    }

    getSecurityAdmins(): string[] {
        return this.getGeneric<string>('SECURITY_ADMINS').split(',');
    }
}
