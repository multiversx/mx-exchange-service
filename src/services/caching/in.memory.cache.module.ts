import { Module } from '@nestjs/common';
import { InMemoryCacheService } from './in.memory.cache.service';

@Module({
    providers: [InMemoryCacheService],
    exports: [InMemoryCacheService],
})
export class InMemoryCacheModule {}

// export class InMemoryCacheModule {
//     public static forRoot(
//         inMemoryCacheOptions?: InMemoryCacheOptions,
//     ): DynamicModule {
//         return {
//             module: InMemoryCacheModule,
//             providers: [
//                 InMemoryCacheService,
//             ],
//             exports: [InMemoryCacheService],
//         };
//     }
// }
