import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
    constructor(private readonly configService: ConfigService) {}

    private getGenericConfig<T>(path: string, alias?: string): T {
        const value = this.configService.get<T>(path);
        if (!value) {
            throw new Error(`No '${alias || path}' config present`);
        }
        return value;
    }

    getPublicAppPort(): number {
        return parseInt(this.getGenericConfig<string>('PORT'));
    }

    getPublicAppListenAddress(): string {
        return this.getGenericConfig<string>('LISTEN_ADDRESS');
    }

    getPrivateAppPort(): number {
        return parseInt(this.getGenericConfig<string>('PRIVATE_PORT'));
    }

    getPrivateAppListenAddress(): string {
        return this.getGenericConfig<string>('PRIVATE_LISTEN_ADDRESS');
    }

    getCacheWarmerPort(): number {
        return parseInt(this.getGenericConfig<string>('CACHEWARMER_PORT'));
    }

    isPublicApiActive(): boolean {
        return this.getGenericConfig<string>('ENABLE_PUBLIC_API') === 'true';
    }

    isCacheWarmerCronActive(): boolean {
        return this.getGenericConfig<string>('ENABLE_CACHE_WARMER') === 'true';
    }

    isPrivateAppActive(): boolean {
        return this.getGenericConfig<string>('ENABLE_PRIVATE_API') === 'true';
    }

    isEventsNotifierAppActive(): boolean {
        return (
            this.getGenericConfig<string>('ENABLE_EVENTS_NOTIFIER') === 'true'
        );
    }

    isEventsReindexingCronjobActive(): boolean {
        return (
            this.getGenericConfig<string>('ENABLE_EVENTS_REINDEXING') === 'true'
        );
    }

    isTracerActive(): boolean {
        return this.getGenericConfig<string>('ENABLE_TRACER') === 'true';
    }

    getRedisUrl(): string {
        return this.getGenericConfig<string>('REDIS_URL');
    }

    getRedisPort(): number {
        return parseInt(this.getGenericConfig<string>('REDIS_PORT'));
    }

    getRedisPassword(): string {
        return this.configService.get<string>('REDIS_PASSWORD');
    }

    getApiUrl(): string {
        return this.getGenericConfig<string>('ELRONDAPI_URL');
    }

    getNotifierUrl(): string {
        return this.getGenericConfig<string>('NOTIFIER_URL');
    }

    getKeepAliveTimeoutDownstream(): number {
        return parseInt(
            this.getGenericConfig<string>('KEEPALIVE_TIMEOUT_DOWNSTREAM'),
        );
    }

    getKeepAliveTimeoutUpstream(): number {
        return parseInt(
            this.getGenericConfig<string>('KEEPALIVE_TIMEOUT_UPSTREAM'),
        );
    }

    getMongoDBURL(): string {
        return this.getGenericConfig<string>('MONGODB_URL');
    }

    getMongoDBDatabase(): string {
        return this.getGenericConfig<string>('MONGODB_DATABASE');
    }

    getMongoDBUsername(): string {
        return this.getGenericConfig<string>('MONGODB_USERNAME');
    }

    getMongoDBPassword(): string {
        return this.getGenericConfig<string>('MONGODB_PASSWORD');
    }

    getSecurityAdmins(): string[] {
        return this.getGenericConfig<string>('SECURITY_ADMINS').split(',');
    }

    getElrondDataApiUrl(): string {
        return this.getGenericConfig<string>('ELRONDDATAAPI_URL');
    }

    getAppName(): string {
        return this.getGenericConfig<string>('APP_NAME');
    }

    getNativeAuthPemKey(): string {
        return this.getGenericConfig<string>('NATIVE_AUTH_PEM_KEY');
    }

    getNativeAuthPemAddress(): string {
        return this.getGenericConfig<string>('NATIVE_AUTH_PEM_ADDRESS');
    }
}
