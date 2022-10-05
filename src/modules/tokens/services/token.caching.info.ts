import { CachingTtl } from "../../../helpers/cachingTTLs";
import { oneSecond } from "../../../helpers/helpers";


export class TokenCachingTtl extends CachingTtl {
    static DerivedEGLD: TokenCachingTtl = {
        remoteTtl: oneSecond() * 12
    };

    static getDerivedUSD: TokenCachingTtl = {
        remoteTtl: oneSecond() * 12
    };


}
