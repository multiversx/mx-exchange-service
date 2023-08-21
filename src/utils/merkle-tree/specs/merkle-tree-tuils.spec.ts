import { MerkleTreeUtils } from '../markle-tree.utils';
import { promises } from 'fs';

describe('Merkle Tree', () => {
    it('Valid Leaves', () => {
        const leaves = [
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '1',
                votingPower: '1',
            },
            {
                address: 'erd1h2rx7vq29m26ut0rh5x4qnmjk2d93ycukp33jl3at04lhaejzhgqx5rv77',
                balance: '2',
                votingPower: '2',
            },
        ];

        const mp = new MerkleTreeUtils(leaves);

        expect(mp.verifyProof(leaves[0])).toStrictEqual(true);
        expect(mp.verifyProof(leaves[1])).toStrictEqual(true);
    });

    it('Invalid leaves, reversed amounts', () => {
        const leaves = [{
            address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
            balance: '1',
            votingPower: '1',
        }, {
            address: 'erd1h2rx7vq29m26ut0rh5x4qnmjk2d93ycukp33jl3at04lhaejzhgqx5rv77',
            balance: '2',
            votingPower: '2',
        }];

        const badLeaves = [
            {
                address: 'erd1h2rx7vq29m26ut0rh5x4qnmjk2d93ycukp33jl3at04lhaejzhgqx5rv77',
                balance: '1',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '2',
                votingPower: '2',
            },
        ];

        const mp = new MerkleTreeUtils(leaves);

        expect(mp.verifyProof(badLeaves[0])).toStrictEqual(false);
        expect(mp.verifyProof(badLeaves[1])).toStrictEqual(false);
    });

    it('Invalid leaves, wrong addresses', () => {
        const leaves = [{
            address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
            balance: '1',
            votingPower: '1',
        }, {
            address: 'erd1h2rx7vq29m26ut0rh5x4qnmjk2d93ycukp33jl3at04lhaejzhgqx5rv77',
            balance: '2',
            votingPower: '2',
        }];

        const badLeaves = [
            {
                address: 'erd1ha5u92fx54y60lh7wsy7uev8sz2f96gza2n8r0v2ha92jn7ap3ps6l8aap',
                balance: '1',
                votingPower: '1',
            },
            {
                address: 'erd1w547kw69kpd60vlpr9pe0pn9nnqeljrcaz73znenjpgt0h3qlqqqm3szxj',
                balance: '2',
                votingPower: '2',
            },
        ];

        const mp = new MerkleTreeUtils(leaves);

        expect(mp.verifyProof(badLeaves[0])).toStrictEqual(false);
        expect(mp.verifyProof(badLeaves[1])).toStrictEqual(false);
    });

    it('Depth should be 4', () => {
        const leaves = [
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '1',
                votingPower: '1',
            },
            {
                address: 'erd1h2rx7vq29m26ut0rh5x4qnmjk2d93ycukp33jl3at04lhaejzhgqx5rv77',
                balance: '2',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '3',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '4',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '5',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '6',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '7',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '8',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '9',
                votingPower: '1',
            },
            {
                address: 'erd1sdslvlxvfnnflzj42l8czrcngq3xjjzkjp3rgul4ttk6hntr4qdsv6sets',
                balance: '10',
                votingPower: '1',
            },
        ];

        const mp = new MerkleTreeUtils(leaves);
        expect(mp.getDepth()).toStrictEqual(4);
    });
    it('read from file', async () => {
        const snapshot = `e018d697ad08b3547c49d64e926eed47b0cc5fb56025e8a2941e7f60a4c53fc8`;
        const jsonContent = await promises.readFile(`./src/snapshots/${snapshot}.json`, {
            encoding: 'utf8',
        });
        const leaves = JSON.parse(jsonContent);
        const newMT = new MerkleTreeUtils(leaves);
        expect(newMT.getRootHash()).toEqual(`0x${snapshot}`);
    });
});
