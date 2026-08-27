import { SuiClient } from '@mysten/sui/client'
import type { SuiObjectResponse } from '@mysten/sui/client'
import { NETWORK, SUI_MACHINE_ID, SUI_CONTRACT_ADDRESS, getImageUrl } from './constants'
import type { NFT } from './wallet-context'

export const suiClient = new SuiClient({
    url: NETWORK === 'testnet'
        ? 'https://fullnode.testnet.sui.io:443'
        : 'https://fullnode.mainnet.sui.io:443',
})

export type PrizeType = 'epic' | 'rare' | 'common'

export interface Prize {
    name: string
    type: PrizeType
    imageUrl: string
    description: string
    probability: number
    nftType: string
    count: number
}

export interface ApprovedNft {
    type: string
    tier: string
    name: string
    module: string
    packageId: string
    imageUrl: string
    description: string
}

export async function fetchSuiApprovedNfts(): Promise<ApprovedNft[]> {
    const machine = await suiClient.getObject({
        id: SUI_MACHINE_ID,
        options: { showContent: true, showOwner: true },
    })

    if (!machine.data) {
        throw new Error('No data received from machine object')
    }
    if ('error' in machine) {
        throw new Error('Error fetching machine object')
    }
    if (machine.data.content?.dataType !== 'moveObject') {
        throw new Error('Invalid machine object type')
    }

    const fields = machine.data.content.fields as {
        approved_nft_list: Array<{ type: string; fields: { name: string } }>
        approved_nfts: { fields: { id: { id: string } } }
    }

    if (!fields.approved_nft_list) {
        return []
    }

    const tableId = fields.approved_nfts.fields.id.id

    return Promise.all(fields.approved_nft_list.map(async (nft) => {
        const [packageId, moduleName, structName] = nft.fields.name.split('::')
        let tier = 'N/A'
        try {
            const tableEntry = await suiClient.getDynamicFieldObject({
                parentId: tableId,
                name: {
                    type: '0x1::type_name::TypeName',
                    value: nft.fields.name,
                },
            })
            if (tableEntry.data?.content?.dataType === 'moveObject') {
                const entryFields = tableEntry.data.content.fields as { value?: number[] }
                if (entryFields.value) {
                    const decodedTier = new TextDecoder().decode(new Uint8Array(entryFields.value))
                    if (decodedTier === 'common' || decodedTier === 'rare' || decodedTier === 'epic') {
                        tier = decodedTier
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch approved NFT tier:', error)
        }

        let metadata = {
            name: structName || 'Unknown',
            imageUrl: getImageUrl(`/${(moduleName || '').toLowerCase()}.png`),
            description: `A ${structName} NFT`,
        }

        try {
            const dynamicFields = await suiClient.getDynamicFields({ parentId: packageId })
            for (const field of dynamicFields.data) {
                if (field.name.type === `${moduleName}::metadata`) {
                    const metadataObject = await suiClient.getObject({
                        id: field.objectId,
                        options: { showContent: true, showOwner: true },
                    })
                    if (metadataObject.data?.content?.dataType === 'moveObject') {
                        const metadataFields = metadataObject.data.content.fields as {
                            name?: string
                            image_url?: string
                            description?: string
                        }
                        metadata = {
                            name: metadataFields.name || structName,
                            imageUrl: metadataFields.image_url || metadata.imageUrl,
                            description: metadataFields.description || metadata.description,
                        }
                        break
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to fetch metadata for ${nft.fields.name}:`, error)
        }

        return {
            type: nft.fields.name,
            tier,
            name: metadata.name,
            module: moduleName || 'Unknown',
            packageId: packageId || 'Unknown',
            imageUrl: metadata.imageUrl,
            description: metadata.description,
        }
    }))
}

async function fetchPrizesFromBag(bagId: string, tier: string): Promise<Prize[]> {
    const dynamicFields = await suiClient.getDynamicFields({ parentId: bagId })
    if (!dynamicFields.data || dynamicFields.data.length === 0) {
        return []
    }

    const nftCounts: Record<string, number> = {}

    for (const field of dynamicFields.data) {
        try {
            const prizeObject = await suiClient.getObject({
                id: field.objectId,
                options: { showContent: true, showOwner: true },
            })
            const prizeContent = prizeObject.data?.content
            if (!prizeContent || prizeContent.dataType !== 'moveObject' || !('fields' in prizeContent)) {
                continue
            }
            const prizeFields = prizeContent.fields as {
                value: { fields: { nft_type?: { fields: { name: string } }; tier?: number[] } }
            }
            const nft_type = prizeFields.value.fields.nft_type?.fields?.name
            if (!nft_type) continue
            const [, module, name] = nft_type.split('::')
            const nftKey = `${module}::${name}`
            nftCounts[nftKey] = (nftCounts[nftKey] || 0) + 1
        } catch (err) {
            console.error(`Error counting ${tier} prize object:`, err)
        }
    }

    const totalNFTsInTier = Object.values(nftCounts).reduce((sum, count) => sum + count, 0)

    const prizePromises = dynamicFields.data.map(async (field) => {
        try {
            const prizeObject = await suiClient.getObject({
                id: field.objectId,
                options: { showContent: true, showOwner: true },
            })
            const prizeContent = prizeObject.data?.content
            if (!prizeContent || prizeContent.dataType !== 'moveObject' || !('fields' in prizeContent)) {
                return null
            }
            const prizeFields = prizeContent.fields as {
                value: { fields: { nft_type?: { fields: { name: string } }; tier?: number[] } }
            }
            const nft_type = prizeFields.value.fields.nft_type?.fields?.name
            const tierBytes = prizeFields.value.fields.tier
            if (!nft_type || !tierBytes || !Array.isArray(tierBytes)) {
                return null
            }
            const [, module, name] = nft_type.split('::')
            const prizeTier = new TextDecoder().decode(Uint8Array.from(tierBytes)).toLowerCase() as PrizeType
            const nftKey = `${module}::${name}`
            return {
                name,
                type: prizeTier,
                imageUrl: getImageUrl(`/${module.toLowerCase()}.png`),
                description: `A ${prizeTier} tier ${name} from ${module}`,
                probability: nftCounts[nftKey] / totalNFTsInTier,
                nftType: nft_type,
                count: nftCounts[nftKey],
            }
        } catch (err) {
            console.error(`Error fetching ${tier} prize object:`, err)
            return null
        }
    })

    return (await Promise.all(prizePromises)).filter((p): p is Prize => p !== null)
}

export async function fetchSuiPrizePool(): Promise<Prize[]> {
    const machineObject = await suiClient.getObject({
        id: SUI_MACHINE_ID,
        options: { showContent: true, showOwner: true },
    })

    const content = machineObject.data?.content
    if (!content || content.dataType !== 'moveObject' || !('fields' in content)) {
        throw new Error('Invalid or missing machine object content')
    }

    const fields = content.fields as {
        prize_pool: {
            fields: {
                common_prizes: { fields: { id: { id: string }; size: string } }
                rare_prizes: { fields: { id: { id: string }; size: string } }
                epic_prizes: { fields: { id: { id: string }; size: string } }
            }
        }
    }

    const [commonPrizes, rarePrizes, epicPrizes] = await Promise.all([
        fetchPrizesFromBag(fields.prize_pool.fields.common_prizes.fields.id.id, 'common'),
        fetchPrizesFromBag(fields.prize_pool.fields.rare_prizes.fields.id.id, 'rare'),
        fetchPrizesFromBag(fields.prize_pool.fields.epic_prizes.fields.id.id, 'epic'),
    ])

    return [...commonPrizes, ...rarePrizes, ...epicPrizes]
}

export async function fetchSuiOwnedNfts(ownerAddress: string): Promise<NFT[]> {
    const objects = await suiClient.getOwnedObjects({
        owner: ownerAddress,
        options: { showContent: true },
    })

    return objects.data
        .filter((obj: SuiObjectResponse) => {
            const isMoveObject = obj.data?.content?.dataType === 'moveObject'
            const content = obj.data?.content as { dataType: 'moveObject'; type: string } | undefined
            const type = content?.type || ''
            const contractAddress = SUI_CONTRACT_ADDRESS.startsWith('0x')
                ? SUI_CONTRACT_ADDRESS.slice(2)
                : SUI_CONTRACT_ADDRESS
            const nftType = type.startsWith('0x') ? type.slice(2) : type
            return isMoveObject && nftType.startsWith(contractAddress)
        })
        .map((obj: SuiObjectResponse) => {
            const content = obj.data?.content as {
                dataType: 'moveObject'
                type: string
                fields: Record<string, unknown>
            }
            const fields = content?.fields as {
                id?: { id?: string }
                name?: string
                image_url?: string
                collection?: string
            }
            return {
                id: fields?.id?.id || '',
                name: fields?.name || 'Unknown NFT',
                imageUrl: fields?.image_url || '',
                collection: fields?.collection || '',
                type: content?.type || '',
                raw: JSON.stringify(obj),
            }
        })
}

export async function fetchSuiCapsulePrices(): Promise<{ common: number; rare: number; epic: number } | null> {
    const machine = await suiClient.getObject({
        id: SUI_MACHINE_ID,
        options: { showContent: true },
    })
    if (machine.data?.content?.dataType !== 'moveObject') return null
    const fields = machine.data.content.fields as {
        common_price: string
        rare_price: string
        epic_price: string
    }
    return {
        common: Number(fields.common_price),
        rare: Number(fields.rare_price),
        epic: Number(fields.epic_price),
    }
}
