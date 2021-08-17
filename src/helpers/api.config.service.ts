import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
    constructor(private readonly configService: ConfigService) {}

    getPublicAppPort(): number {
        const port = this.configService.get<number>('PORT');
        if (!port) {
            throw new Error('No public app port present');
        }
        return port;
    }

    getPublicAppListenAddress(): string {
        const listenAddress = this.configService.get<string>('LISTEN_ADDRESS');
        if (!listenAddress) {
            throw new Error('No public app listen address present');
        }
        return listenAddress;
    }

    getPrivateAppPort(): number {
        const port = this.configService.get<number>('PRIVATE_PORT');
        if (!port) {
            throw new Error('No private app port present');
        }
        return port;
    }

    getPrivateAppListenAddress(): string {
        const listenAddress = this.configService.get<string>(
            'PRIVATE_LISTEN_ADDRESS',
        );
        if (!listenAddress) {
            throw new Error('No private app listen address present');
        }
        return listenAddress;
    }

    getCacheWarmerPort(): number {
        const port = this.configService.get<number>('CACHEWARMER_PORT');
        if (!port) {
            throw new Error('No cache warmer app port present');
        }
        return port;
    }

    isCacheWarmerCronActive(): boolean {
        const cacheWramerActive = this.configService.get<string>(
            'ENABLE_CACHE_WARMER',
        );
        if (!cacheWramerActive) {
            throw new Error('No cache warmer flag present');
        }
        return cacheWramerActive === 'true';
    }

    isPrivateAppActive(): boolean {
        const privateAppActive = this.configService.get<string>(
            'ENABLE_PRIVATE_API',
        );
        if (!privateAppActive) {
            throw new Error('No private api flag present');
        }
        return privateAppActive === 'true';
    }

    getRedisUrl(): string {
        const redisUrl = this.configService.get<string>('REDIS_URL');
        if (!redisUrl) {
            throw new Error('No redis url present');
        }
        return redisUrl;
    }

    getRedisPort(): number {
        const redisPort = this.configService.get<number>('REDIS_PORT');
        if (!redisPort) {
            throw new Error('No redis port present');
        }
        return redisPort;
    }

    getRedisPassword(): string | undefined {
        const password = this.configService.get<string>('REDIS_PASSWORD');
        return password !== '' ? password : undefined;
    }

    getApiUrl(): string {
        const apiUrl = this.configService.get<string>('ELRONDAPI_URL');
        if (!apiUrl) {
            throw new Error('No apiUrl present');
        }
        return apiUrl;
    }
}
