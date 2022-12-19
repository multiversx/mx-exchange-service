import { scAddress } from 'src/config';

export const proxyVersion = (proxyAddress: string): string => {
    const versions = Object.keys(scAddress.proxyDexAddress);
    for (const version of versions) {
        if (scAddress.proxyDexAddress[version] === proxyAddress) {
            return version;
        }
    }
};
