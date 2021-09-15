import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
} from '@nestjs/common';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get('/metrics')
    async getMetrics(): Promise<string> {
        return await MetricsCollector.getMetrics();
    }

    @Get('/hello')
    async getHello(): Promise<string> {
        return 'hello';
    }

    @Get('/pair/:address/txcount')
    async getPairTransactionCount(
        @Param('address') address: string,
    ): Promise<number> {
        try {
            return await this.metricsService.computeTxCount(address);
        } catch {
            throw new HttpException(
                'Failed to compute pair tx count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/pair/:address/swapcount')
    async getPairSwapCount(@Param('address') address: string): Promise<number> {
        try {
            return await this.metricsService.computePairSwapCount(address);
        } catch {
            throw new HttpException(
                'Failed to compute pair swap count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/pair/:address/addliquiditycount')
    async getPairAddLiquidityCount(
        @Param('address') address: string,
    ): Promise<number> {
        try {
            return await this.metricsService.computePairAddLiquidityCount(
                address,
            );
        } catch {
            throw new HttpException(
                'Failed to compute pair add liquidity count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/pair/:address/removeliquiditycount')
    async getPairRemoveLiquidityCount(
        @Param('address') address: string,
    ): Promise<number> {
        try {
            return await this.metricsService.computePairRemoveLiquidityCount(
                address,
            );
        } catch {
            throw new HttpException(
                'Failed to compute pair remove liquidity count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/pair/:address/uniqueuserscount')
    async getPairUniqueUsersCount(
        @Param('address') address: string,
    ): Promise<number> {
        try {
            return await this.metricsService.computeUniqueUsers(address);
        } catch {
            throw new HttpException(
                'Failed to compute pair unique users count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/pair/:address/useraveragetxcount')
    async getPairUserAverageTxCount(
        @Param('address') address: string,
    ): Promise<number> {
        try {
            return await this.metricsService.computeAvgUserTransactions(
                address,
            );
        } catch {
            throw new HttpException(
                'Failed to compute pair user average tx count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/farm/:address/txcount')
    async getFarmTransactionCount(
        @Param('address') address: string,
    ): Promise<number> {
        try {
            return await this.metricsService.computeTxCount(address);
        } catch {
            throw new HttpException(
                'Failed to compute farm tx count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/farm/:address/uniqueuserscount')
    async getFarmUniqueUsersCount(
        @Param('address') address: string,
    ): Promise<number> {
        try {
            return await this.metricsService.computeUniqueUsers(address);
        } catch {
            throw new HttpException(
                'Failed to compute farm unique users count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/farm/:address/useraveragetxcount')
    async getFarmUserAverageTxCount(
        @Param('address') address: string,
    ): Promise<number> {
        try {
            return await this.metricsService.computeAvgUserTransactions(
                address,
            );
        } catch {
            throw new HttpException(
                'Failed to compute pair user average tx count',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/battleofyields/:address/disallowedoutgoingtxs')
    async getUserOutgoingTxs(@Param('address') address: string): Promise<any> {
        try {
            return await this.metricsService.getUserdisalowedOutgoingTxs(
                address,
            );
        } catch (error) {
            console.log(error);
            throw new HttpException(
                'Failed to compute user outgoing transactions',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/battleofyields/:address/disallowedincomingtxs')
    async getUserIncomingTxs(@Param('address') address: string): Promise<any> {
        try {
            return await this.metricsService.getDisalowedIncomingTxs(address);
        } catch {
            throw new HttpException(
                'Failed to compute user incoming transactions',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/battleofyields/:address/checklockedmex')
    async getDistributedLockedMEX(
        @Param('address') address: string,
    ): Promise<any> {
        try {
            return await this.metricsService.checkUserDistributedLockedMex(
                address,
            );
        } catch {
            throw new HttpException(
                'Failed to compute user transactions',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('/battleofyields/:address/checkbusd')
    async getDistributedBUSD(@Param('address') address: string): Promise<any> {
        try {
            return await this.metricsService.checkUserDistributedBUSD(address);
        } catch (error) {
            console.log(error);
            throw new HttpException(
                'Failed to compute user busd transactions',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
