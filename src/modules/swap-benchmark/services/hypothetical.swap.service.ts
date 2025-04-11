import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    HypotheticalSwapRepositoryService,
    HypotheticalSwapResultRepositoryService,
} from './repository.service';
import { OriginLogger } from '@multiversx/sdk-nestjs-common';
import {
    HypotheticalSwap,
    HypotheticalSwapResult,
} from '../schemas/hypothetical.swap.schema';
import { HypotheticalSwapDto } from '../dtos/create.hypothetical.swap.dto';
import { TokenService } from 'src/modules/tokens/services/token.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class HypotheticalSwapService {
    private readonly logger = new OriginLogger(HypotheticalSwapService.name);
    constructor(
        private readonly swapRepository: HypotheticalSwapRepositoryService,
        private readonly tokenService: TokenService,
        private readonly resultRepository: HypotheticalSwapResultRepositoryService,
    ) {}

    async createHypotheticalSwaps({
        tokenIn,
        tokenOut,
        amountIn,
    }: HypotheticalSwapDto): Promise<HypotheticalSwap[]> {
        const token = await this.tokenService.baseTokenMetadata(tokenIn);

        if (!token) {
            throw new Error(`Token ${tokenIn} not found`);
        }

        // const multipliers = [
        //     1, 5, 10, 15, 50, 75, 100, 250, 500, 750, 1000, 2000, 5000, 7500,
        //     10000, 20000, 50000, 100000, 200000, 300000, 400000, 600000,
        // ];

        // const multipliers = [
        //     0.5, 1, 3, 5, 7, 10, 15, 25, 50, 75, 100, 150, 250, 350, 500, 750,
        //     1000, 2000, 5000, 7000,
        // ];
        const multipliers = [
            1, 3, 5, 7, 10, 15, 25, 50, 75, 100, 150, 250, 500, 750, 1000, 2000,
            5000, 7500, 10000, 20000, 50000,
        ];
        // const multipliers = [
        //     0.5, 1, 3, 5, 7, 10, 15, 25, 50, 75, 100, 150, 250, 500, 750, 1000,
        //     2000, 5000, 7500, 10000, 20000, 50000, 100000,
        // ];

        const swaps: HypotheticalSwap[] = [];

        for (const multiplier of multipliers) {
            const currentAmountIn = new BigNumber(amountIn).multipliedBy(
                multiplier,
            );
            const denominatedAmountIn = currentAmountIn
                .multipliedBy(`1e-${token.decimals}`)
                .toNumber();

            swaps.push({
                tokenIn,
                tokenOut,
                amountIn: currentAmountIn.toFixed(),
                amountInNum: denominatedAmountIn,
            });
        }
        try {
            // const result = await this.swapRepository.create({
            //     tokenIn,
            //     tokenOut,
            //     amountIn,
            //     amountInNum,
            // });
            const swapDocs = await this.swapRepository.insertMany(swaps);
            return swapDocs;
        } catch (error) {
            this.logger.error(error);
            throw new BadRequestException('Invalid input data');
        }
    }

    async getHypotheticalSwaps(): Promise<HypotheticalSwap[]> {
        return await this.swapRepository.find({
            // tokenIn: 'USDC-c76f1f',
            // tokenIn: 'USH-111e09',
            // tokenIn: 'WEGLD-bd4d79',
            tokenIn: 'UTK-2f80e9',
        });
    }

    async getAllHypotheticalSwaps(): Promise<HypotheticalSwap[]> {
        return await this.swapRepository.find({}, { _id: 1 });
    }

    async getHypotheticalSwapResults(
        tokenIn: string,
        tokenOut: string,
        amountIn: string,
        projection?: Record<string, unknown>,
    ): Promise<HypotheticalSwapResult[]> {
        if (!tokenIn || !tokenOut || !amountIn) {
            throw new BadRequestException('Invalid input data');
        }
        const swap = await this.swapRepository.findOne(
            {
                tokenIn,
                tokenOut,
                amountIn: amountIn,
            },
            { _id: 1 },
        );

        if (!swap) {
            throw new NotFoundException('Swap not found');
        }

        return await this.resultRepository.find(
            {
                swap,
            },
            projection,
        );
    }

    async getHypotheticalSwapResultsForTokens(
        tokenIn: string,
        tokenOut: string,
        projection?: Record<string, unknown>,
    ): Promise<HypotheticalSwapResult[]> {
        if (!tokenIn || !tokenOut) {
            throw new BadRequestException('Invalid input data');
        }
        const swaps = await this.swapRepository.find(
            {
                tokenIn,
                tokenOut,
            },
            { _id: 1 },
        );

        if (!swaps || swaps.length === 0) {
            throw new NotFoundException('Swaps not found');
        }

        return await this.resultRepository.find(
            {
                swap: { $in: swaps },
            },
            projection,
        );
    }

    async createManySwapResults(
        documents: HypotheticalSwapResult[],
    ): Promise<HypotheticalSwapResult[]> {
        return this.resultRepository.insertMany(documents);
    }

    // async createSwapResult(swap: HypotheticalSwapDocument): Promise<string> {
    //     // const swap = await this.swapRepository.findOne({}, { _id: 1 });

    //     // const result = await this.resultRepository.create({
    //     //     timestamp: 1111111,
    //     //     swap: swap.id,
    //     // });

    //     const inserted = await this.resultRepository.findOne({});
    //     console.log(inserted);

    //     return 'ok';
    // }
}
