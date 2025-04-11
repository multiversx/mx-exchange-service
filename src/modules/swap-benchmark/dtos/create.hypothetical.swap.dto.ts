import { IsNotEmpty } from 'class-validator';

export class HypotheticalSwapDto {
    @IsNotEmpty()
    tokenIn: string;
    @IsNotEmpty()
    tokenOut: string;
    @IsNotEmpty()
    amountIn: string;
}
