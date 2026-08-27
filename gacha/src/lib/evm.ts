import { createPublicClient, formatEther, http, type Address } from 'viem';
import { base } from 'viem/chains';
import {
    BASE_RPC_URL,
    EVM_DEPLOY_FROM_BLOCK,
    EVM_MACHINE_ADDRESS,
    EVM_NFT_ADDRESSES,
    getImageUrl,
} from './constants';

export const evmPublicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
});

export const MACHINE_ABI = [
    {
        type: 'function',
        name: 'getRarityCount',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'getRarityInfo',
        stateMutability: 'view',
        inputs: [{ name: 'rarityId', type: 'uint256' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'tokenContract', type: 'address' },
                    { name: 'name', type: 'string' },
                    { name: 'price', type: 'uint256' },
                    { name: 'enabled', type: 'bool' },
                ],
            },
        ],
    },
    {
        type: 'function',
        name: 'getPrizeCount',
        stateMutability: 'view',
        inputs: [{ name: 'rarityId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'prizes',
        stateMutability: 'view',
        inputs: [
            { name: '', type: 'uint256' },
            { name: '', type: 'uint256' },
        ],
        outputs: [
            { name: 'tokenContract', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
            { name: 'isERC721', type: 'bool' },
        ],
    },
    {
        type: 'function',
        name: 'purchase',
        stateMutability: 'payable',
        inputs: [{ name: 'rarityId', type: 'uint256' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'play',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'rarityId', type: 'uint256' }],
        outputs: [{ name: 'requestId', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'claim',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'getClaimCount',
        stateMutability: 'view',
        inputs: [{ name: 'player', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'getClaim',
        stateMutability: 'view',
        inputs: [
            { name: 'player', type: 'address' },
            { name: 'index', type: 'uint256' },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'tokenContract', type: 'address' },
                    { name: 'isERC721', type: 'bool' },
                    { name: 'assignedAt', type: 'uint64' },
                    { name: 'tokenId', type: 'uint256' },
                    { name: 'amount', type: 'uint256' },
                ],
            },
        ],
    },
    {
        type: 'function',
        name: 'getAvailablePrizeCount',
        stateMutability: 'view',
        inputs: [{ name: 'rarityId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'pendingDraws',
        stateMutability: 'view',
        inputs: [{ name: 'rarityId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'ADMIN_ROLE',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bytes32' }],
    },
    {
        type: 'function',
        name: 'ECONOMIST_ROLE',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bytes32' }],
    },
    {
        type: 'function',
        name: 'grantRole',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'role', type: 'bytes32' },
            { name: 'account', type: 'address' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'revokeRole',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'role', type: 'bytes32' },
            { name: 'account', type: 'address' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'hasRole',
        stateMutability: 'view',
        inputs: [
            { name: 'role', type: 'bytes32' },
            { name: 'account', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'isApprovedForRarity',
        stateMutability: 'view',
        inputs: [
            { name: 'tokenContract', type: 'address' },
            { name: 'rarityId', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'setRarityPrice',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'rarityId', type: 'uint256' },
            { name: 'price', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'setRarityEnabled',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'rarityId', type: 'uint256' },
            { name: 'enabled', type: 'bool' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'approveNFT',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'rarityId', type: 'uint256' },
            { name: 'tokenContract', type: 'address' },
            { name: 'approve', type: 'bool' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'donateNFT',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'tokenContract', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
            { name: 'rarityId', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'withdraw',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'to', type: 'address' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'redeemPrize',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'rarityId', type: 'uint256' },
            { name: 'to', type: 'address' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'withdrawPrize',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'rarityId', type: 'uint256' },
            { name: 'index', type: 'uint256' },
            { name: 'tokenContract', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'to', type: 'address' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'fundVrf',
        stateMutability: 'payable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'cancelVrfSubscription',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'to', type: 'address' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'createVrfSubscription',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'paused',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'pause',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'unpause',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'transferAdmin',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'newAdmin', type: 'address' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'acceptAdmin',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'rescueStuckDraw',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'requestId', type: 'uint256' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'cancelAdminTransfer',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'setRescueDelay',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'delay', type: 'uint256' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'registerRarity',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'tokenContract', type: 'address' },
            { name: 'name', type: 'string' },
            { name: 'price', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'setVRFConfig',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'config',
                type: 'tuple',
                components: [
                    { name: 'coordinator', type: 'address' },
                    { name: 'keyHash', type: 'bytes32' },
                    { name: 'subscriptionId', type: 'uint256' },
                    { name: 'requestConfirmations', type: 'uint16' },
                    { name: 'callbackGasLimit', type: 'uint32' },
                    { name: 'nativePayment', type: 'bool' },
                ],
            },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'rescueDelay',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'draws',
        stateMutability: 'view',
        inputs: [{ name: 'requestId', type: 'uint256' }],
        outputs: [
            { name: 'player', type: 'address' },
            { name: 'rarityId', type: 'uint256' },
            { name: 'fulfilled', type: 'bool' },
            { name: 'requestedAt', type: 'uint64' },
            { name: 'bagLength', type: 'uint64' },
        ],
    },
    {
        type: 'event',
        name: 'NFTApproved',
        inputs: [
            { name: 'rarityId', type: 'uint256', indexed: true },
            { name: 'tokenContract', type: 'address', indexed: false },
            { name: 'approved', type: 'bool', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'CapsulePurchased',
        inputs: [
            { name: 'buyer', type: 'address', indexed: true },
            { name: 'rarityId', type: 'uint256', indexed: true },
            { name: 'price', type: 'uint256', indexed: false },
            { name: 'paid', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'PlayRequested',
        inputs: [
            { name: 'requestId', type: 'uint256', indexed: true },
            { name: 'player', type: 'address', indexed: true },
            { name: 'rarityId', type: 'uint256', indexed: true },
        ],
    },
] as const;

export const ERC1155_ABI = [
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'id', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'isApprovedForAll',
        stateMutability: 'view',
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'operator', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'setApprovalForAll',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'operator', type: 'address' },
            { name: 'approved', type: 'bool' },
        ],
        outputs: [],
    },
] as const;

export const ERC721_ABI = [
    {
        type: 'function',
        name: 'approve',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
        ],
        outputs: [],
    },
] as const;

export type PrizeType = 'common' | 'rare' | 'epic';

export interface EvmRarity {
    id: number;
    name: string;
    price: bigint;
    enabled: boolean;
    tokenContract: Address;
}

export interface EvmPrize {
    name: string;
    type: PrizeType;
    imageUrl: string;
    description: string;
    probability: number;
    nftType: string;
    count: number;
}

const TIER_BY_ID: PrizeType[] = ['common', 'rare', 'epic'];

export function formatEth(wei: bigint, digits = 4): string {
    const value = Number(formatEther(wei));
    if (!Number.isFinite(value)) return `${formatEther(wei)} ETH`;
    return `${formatEthAmount(wei, digits)} ETH`;
}

export function formatEthAmount(wei: bigint, digits = 4): string {
    const value = Number(formatEther(wei));
    if (!Number.isFinite(value)) return formatEther(wei);
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
    });
}

export async function fetchEvmRarities(): Promise<EvmRarity[]> {
    const count = await evmPublicClient.readContract({
        address: EVM_MACHINE_ADDRESS,
        abi: MACHINE_ABI,
        functionName: 'getRarityCount',
    });

    const rarities: EvmRarity[] = [];
    for (let id = 0; id < Number(count); id++) {
        const info = await evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'getRarityInfo',
            args: [BigInt(id)],
        });
        rarities.push({
            id,
            name: info.name,
            price: info.price,
            enabled: info.enabled,
            tokenContract: info.tokenContract,
        });
    }
    return rarities;
}

export async function fetchEvmPrizePool(): Promise<EvmPrize[]> {
    const rarities = await fetchEvmRarities();
    const all: EvmPrize[] = [];

    for (const rarity of rarities) {
        const count = await evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'getPrizeCount',
            args: [BigInt(rarity.id)],
        });

        const grouped = new Map<string, { tokenId: bigint; amount: bigint; count: number }>();
        for (let i = 0; i < Number(count); i++) {
            const prize = await evmPublicClient.readContract({
                address: EVM_MACHINE_ADDRESS,
                abi: MACHINE_ABI,
                functionName: 'prizes',
                args: [BigInt(rarity.id), BigInt(i)],
            });
            const [tokenContract, tokenId, amount] = prize;
            const key = `${tokenContract}-${tokenId.toString()}`;
            const existing = grouped.get(key);
            if (existing) {
                existing.count += 1;
                existing.amount += amount;
            } else {
                grouped.set(key, {
                    tokenId,
                    amount,
                    count: 1,
                });
            }
        }

        const total = Array.from(grouped.values()).reduce((sum, item) => sum + item.count, 0);
        const tier = TIER_BY_ID[rarity.id] ?? 'common';

        for (const [key, item] of grouped) {
            const [tokenContract] = key.split('-');
            const short = `${tokenContract.slice(0, 6)}…${tokenContract.slice(-4)}`;
            all.push({
                name: `${short} #${item.tokenId.toString()}`,
                type: tier,
                imageUrl: getImageUrl(`/${tier}.gif`),
                description: `A ${rarity.name} prize from the Base machine`,
                probability: total > 0 ? item.count / total : 0,
                nftType: key,
                count: item.count,
            });
        }
    }

    return all;
}

export async function fetchEvmCapsuleBalances(owner: Address) {
    const entries = [
        { id: 'common' as const, rarityId: 0, address: EVM_NFT_ADDRESSES.COMMON, name: 'Common Gacha NFT' },
        { id: 'rare' as const, rarityId: 1, address: EVM_NFT_ADDRESSES.RARE, name: 'Rare Gacha NFT' },
        { id: 'epic' as const, rarityId: 2, address: EVM_NFT_ADDRESSES.EPIC, name: 'Epic Gacha NFT' },
    ];

    const nfts = [];
    for (const entry of entries) {
        const balance = await evmPublicClient.readContract({
            address: entry.address,
            abi: ERC1155_ABI,
            functionName: 'balanceOf',
            args: [owner, 0n],
        });
        const qty = Number(balance);
        for (let i = 0; i < qty; i++) {
            nfts.push({
                id: `${entry.id}-${i}`,
                name: entry.name,
                imageUrl: getImageUrl(`/${entry.id}.gif`),
                collection: 'Gacha Capsules',
                type: entry.address,
                raw: JSON.stringify({
                    contract: entry.address,
                    rarityId: entry.rarityId,
                    owner,
                }),
            });
        }
    }
    return nfts;
}

export async function getEvmClaimCount(player: Address): Promise<number> {
    const count = await evmPublicClient.readContract({
        address: EVM_MACHINE_ADDRESS,
        abi: MACHINE_ABI,
        functionName: 'getClaimCount',
        args: [player],
    });
    return Number(count);
}

export type EvmPrizeClaim = {
    index: number
    tokenContract: Address
    isERC721: boolean
    assignedAt: bigint
    tokenId: bigint
    amount: bigint
}

export async function fetchEvmClaims(player: Address): Promise<EvmPrizeClaim[]> {
    const count = await getEvmClaimCount(player)
    const claims: EvmPrizeClaim[] = []
    for (let index = 0; index < count; index++) {
        const claim = await evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'getClaim',
            args: [player, BigInt(index)],
        })
        claims.push({
            index,
            tokenContract: claim.tokenContract,
            isERC721: claim.isERC721,
            assignedAt: BigInt(claim.assignedAt),
            tokenId: claim.tokenId,
            amount: claim.amount,
        })
    }
    return claims
}

export async function fetchMachinePaused(): Promise<boolean> {
    try {
        return await evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'paused',
        })
    } catch {
        return false
    }
}

export async function fetchRescueDelay(): Promise<bigint> {
    try {
        return await evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'rescueDelay',
        })
    } catch {
        return 0n
    }
}

export async function fetchPendingDraws(rarityId: bigint): Promise<bigint> {
    try {
        return await evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'pendingDraws',
            args: [rarityId],
        });
    } catch {
        return 0n;
    }
}

export async function isCapsuleApproved(owner: Address, nft: Address): Promise<boolean> {
    const approved = await evmPublicClient.readContract({
        address: nft,
        abi: ERC1155_ABI,
        functionName: 'isApprovedForAll',
        args: [owner, EVM_MACHINE_ADDRESS],
    });
    return Boolean(approved);
}

export interface EvmApprovedNft {
    address: Address;
    rarityId: number;
    tier: PrizeType;
}

export interface EvmMachineStats {
    treasuryBalance: bigint;
    totalPlays: number;
    commonMints: number;
    rareMints: number;
    epicMints: number;
    commonPrizes: number;
    rarePrizes: number;
    epicPrizes: number;
}

export async function isEvmAdmin(account: Address): Promise<boolean> {
    const role = await evmPublicClient.readContract({
        address: EVM_MACHINE_ADDRESS,
        abi: MACHINE_ABI,
        functionName: 'ADMIN_ROLE',
    });
    return evmPublicClient.readContract({
        address: EVM_MACHINE_ADDRESS,
        abi: MACHINE_ABI,
        functionName: 'hasRole',
        args: [role, account],
    });
}

export async function isEvmEconomist(account: Address): Promise<boolean> {
    const role = await evmPublicClient.readContract({
        address: EVM_MACHINE_ADDRESS,
        abi: MACHINE_ABI,
        functionName: 'ECONOMIST_ROLE',
    });
    return evmPublicClient.readContract({
        address: EVM_MACHINE_ADDRESS,
        abi: MACHINE_ABI,
        functionName: 'hasRole',
        args: [role, account],
    });
}

export async function fetchEconomistRole(): Promise<`0x${string}`> {
    return evmPublicClient.readContract({
        address: EVM_MACHINE_ADDRESS,
        abi: MACHINE_ABI,
        functionName: 'ECONOMIST_ROLE',
    });
}

export async function fetchEvmMachineStats(): Promise<EvmMachineStats> {
    const [treasuryBalance, commonPrizes, rarePrizes, epicPrizes] = await Promise.all([
        evmPublicClient.getBalance({ address: EVM_MACHINE_ADDRESS }),
        evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'getAvailablePrizeCount',
            args: [0n],
        }),
        evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'getAvailablePrizeCount',
            args: [1n],
        }),
        evmPublicClient.readContract({
            address: EVM_MACHINE_ADDRESS,
            abi: MACHINE_ABI,
            functionName: 'getAvailablePrizeCount',
            args: [2n],
        }),
    ]);

    let totalPlays = 0;
    let commonMints = 0;
    let rareMints = 0;
    let epicMints = 0;

    try {
        const [purchases, plays] = await Promise.all([
            evmPublicClient.getLogs({
                address: EVM_MACHINE_ADDRESS,
                event: {
                    type: 'event',
                    name: 'CapsulePurchased',
                    inputs: [
                        { name: 'buyer', type: 'address', indexed: true },
                        { name: 'rarityId', type: 'uint256', indexed: true },
                        { name: 'price', type: 'uint256', indexed: false },
                        { name: 'paid', type: 'uint256', indexed: false },
                    ],
                },
                fromBlock: EVM_DEPLOY_FROM_BLOCK,
                toBlock: 'latest',
            }),
            evmPublicClient.getLogs({
                address: EVM_MACHINE_ADDRESS,
                event: {
                    type: 'event',
                    name: 'PlayRequested',
                    inputs: [
                        { name: 'requestId', type: 'uint256', indexed: true },
                        { name: 'player', type: 'address', indexed: true },
                        { name: 'rarityId', type: 'uint256', indexed: true },
                    ],
                },
                fromBlock: EVM_DEPLOY_FROM_BLOCK,
                toBlock: 'latest',
            }),
        ]);

        totalPlays = plays.length;
        for (const log of purchases) {
            const rarityId = Number(log.args.rarityId);
            if (rarityId === 0) commonMints += 1;
            else if (rarityId === 1) rareMints += 1;
            else if (rarityId === 2) epicMints += 1;
        }
    } catch (error) {
        console.warn('Could not load Base event stats:', error);
    }

    return {
        treasuryBalance,
        totalPlays,
        commonMints,
        rareMints,
        epicMints,
        commonPrizes: Number(commonPrizes),
        rarePrizes: Number(rarePrizes),
        epicPrizes: Number(epicPrizes),
    };
}

export async function fetchEvmApprovedNfts(): Promise<EvmApprovedNft[]> {
    let contracts = new Set<Address>();
    try {
        const logs = await evmPublicClient.getLogs({
            address: EVM_MACHINE_ADDRESS,
            event: {
                type: 'event',
                name: 'NFTApproved',
                inputs: [
                    { name: 'rarityId', type: 'uint256', indexed: true },
                    { name: 'tokenContract', type: 'address', indexed: false },
                    { name: 'approved', type: 'bool', indexed: false },
                ],
            },
            fromBlock: EVM_DEPLOY_FROM_BLOCK,
            toBlock: 'latest',
        });
        for (const log of logs) {
            if (log.args.tokenContract) {
                contracts.add(log.args.tokenContract);
            }
        }
    } catch (error) {
        console.warn('Could not load NFTApproved logs:', error);
    }

    const approved: EvmApprovedNft[] = [];
    for (const tokenContract of contracts) {
        for (let id = 0; id < 3; id++) {
            const isApproved = await evmPublicClient.readContract({
                address: EVM_MACHINE_ADDRESS,
                abi: MACHINE_ABI,
                functionName: 'isApprovedForRarity',
                args: [tokenContract, BigInt(id)],
            });
            if (!isApproved) continue;
            approved.push({
                address: tokenContract,
                rarityId: id,
                tier: TIER_BY_ID[id] ?? 'common',
            });
        }
    }
    return approved;
}

