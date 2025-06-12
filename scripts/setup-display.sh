#!/bin/bash

PACKAGE_ID="0xf9a4dc2f10f074c4618b44552e49b4da03af76fdcfcc1c16ab01478d6bad92e0"
GAS_BUDGET=100000000

# Function to create display metadata
create_display() {
    local type=$1
    local name=$2
    local description=$3
    local image_url=$4

    echo "📦 Creating display metadata for $type..."
    sui client call \
      --package 0x2 \
      --module display \
      --function new \
      --type-args "$PACKAGE_ID::$type" \
      --args "{\"name\":\"$name\",\"description\":\"$description\",\"image_url\":\"$image_url\"}" \
      --gas-budget $GAS_BUDGET
}

# Create display metadata for each NFT type
create_display "bear::Bear" "Bear NFT" "A mighty Bear NFT from the Gacha collection" "https://gachapon.club/bear.png"
create_display "cat::Cat" "Cat NFT" "A cute Cat NFT from the Gacha collection" "https://gachapon.club/cat.png"
create_display "unicorn::Unicorn" "Unicorn NFT" "A magical Unicorn NFT from the Gacha collection" "https://gachapon.club/unicorn.png"
create_display "gacha_nft::CommonGachaNFT" "Common Gacha" "A common tier NFT from the Gacha collection" "https://gachapon.club/common.gif"
create_display "gacha_nft::RareGachaNFT" "Rare Gacha" "A rare tier NFT from the Gacha collection" "https://gachapon.club/rare.gif"
create_display "gacha_nft::EpicGachaNFT" "Epic Gacha" "An epic tier NFT from the Gacha collection" "https://gachapon.club/epic.gif"


sui client call \
  --package 0x2 \
  --module display \
  --function new \
  --type-args 0xf9a4dc2f10f074c4618b44552e49b4da03af76fdcfcc1c16ab01478d6bad92e0::bear::Bear \
  --args <your_object_id> \
  --args "{\"name\":\"Bear NFT\",\"description\":\"A mighty Bear NFT from the Gacha collection\",\"image_url\":\"https://gachapon.club/bear.png\"}" \
  --gas-budget 100000000
