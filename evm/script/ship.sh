#!/usr/bin/env bash
# Estimate deploy cost, make a throwaway deployer, wait for ETH, broadcast
# script/Deploy.s.sol, then sweep leftover ETH back to the funder.
#
#   ./script/ship.sh <base|arbitrum|optimism|ethereum> [--estimate-only] [0xReturn]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ANVIL_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

usage() {
  cat <<'EOF'
Usage: script/ship.sh <chain> [--estimate-only] [0xReturnAddress]

Chains: base, arbitrum, optimism, ethereum

Estimates mainnet deploy cost, generates a throwaway wallet, waits until you
fund it on that chain, deploys, then sends leftover ETH back (not the VRF
subscription float).
EOF
}

CHAIN_ARG=""
RETURN_TO=""
ESTIMATE_ONLY=0

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      usage
      exit 0
      ;;
    --estimate-only)
      ESTIMATE_ONLY=1
      ;;
    0x*)
      RETURN_TO="$arg"
      ;;
    base|arbitrum|arb|optimism|op|ethereum|eth|mainnet)
      CHAIN_ARG="$arg"
      ;;
    *)
      echo "unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$CHAIN_ARG" ]]; then
  usage >&2
  exit 1
fi

case "$CHAIN_ARG" in
  base)
    CHAIN_NAME="base"
    CHAIN_ID=8453
    CHAIN_LABEL="Base"
    RPC="${BASE_RPC_URL:-https://mainnet.base.org}"
    DEFAULT_VRF_FUND_WEI=5000000000000000
    L1_PAD_WEI="${L1_PAD_WEI:-2000000000000000}"
    FALLBACK_GAS_WEI="${FALLBACK_GAS_WEI:-1000000000000000}"
    SWEEP_RESERVE_WEI="${SWEEP_RESERVE_WEI:-200000000000000}"
    ANVIL_PORT=8546
    RPC_WAIT=30
    ;;
  arbitrum|arb)
    CHAIN_NAME="arbitrum"
    CHAIN_ID=42161
    CHAIN_LABEL="Arbitrum"
    RPC="${ARB_RPC_URL:-https://arb1.arbitrum.io/rpc}"
    DEFAULT_VRF_FUND_WEI=5000000000000000
    L1_PAD_WEI="${L1_PAD_WEI:-1000000000000000}"
    FALLBACK_GAS_WEI="${FALLBACK_GAS_WEI:-2000000000000000}"
    SWEEP_RESERVE_WEI="${SWEEP_RESERVE_WEI:-300000000000000}"
    ANVIL_PORT=8547
    RPC_WAIT=30
    ;;
  optimism|op)
    CHAIN_NAME="optimism"
    CHAIN_ID=10
    CHAIN_LABEL="Optimism"
    RPC="${OP_RPC_URL:-https://mainnet.optimism.io}"
    DEFAULT_VRF_FUND_WEI=5000000000000000
    L1_PAD_WEI="${L1_PAD_WEI:-2000000000000000}"
    FALLBACK_GAS_WEI="${FALLBACK_GAS_WEI:-1000000000000000}"
    SWEEP_RESERVE_WEI="${SWEEP_RESERVE_WEI:-200000000000000}"
    ANVIL_PORT=8548
    RPC_WAIT=30
    ;;
  ethereum|eth|mainnet)
    CHAIN_NAME="ethereum"
    CHAIN_ID=1
    CHAIN_LABEL="Ethereum"
    RPC="${ETH_RPC_URL:-https://ethereum-rpc.publicnode.com}"
    DEFAULT_VRF_FUND_WEI=50000000000000000
    L1_PAD_WEI="${L1_PAD_WEI:-20000000000000000}"
    FALLBACK_GAS_WEI="${FALLBACK_GAS_WEI:-150000000000000000}"
    SWEEP_RESERVE_WEI="${SWEEP_RESERVE_WEI:-2000000000000000}"
    ANVIL_PORT=8549
    RPC_WAIT=60
    ;;
esac

VRF_FUND_WEI="${VRF_FUND_WEI:-$DEFAULT_VRF_FUND_WEI}"
DEPLOY_DIR="$ROOT/.deploy/$CHAIN_NAME"
KEY_FILE="$DEPLOY_DIR/deployer.key"
ADDR_FILE="$DEPLOY_DIR/deployer.address"

wei_to_eth() {
  cast --to-unit "$1" ether
}

wait_for_rpc() {
  local url="$1"
  local tries="$2"
  local i
  for i in $(seq 1 "$tries"); do
    if cast block-number --rpc-url "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

estimate_gas_wei() {
  echo "Estimating deploy gas on a local $CHAIN_LABEL fork..." >&2
  local log pid eth
  log="$(mktemp)"
  anvil --fork-url "$RPC" --port "$ANVIL_PORT" --silent >"$log" 2>&1 &
  pid=$!
  if ! wait_for_rpc "http://127.0.0.1:$ANVIL_PORT" "$RPC_WAIT"; then
    kill "$pid" 2>/dev/null || true
    echo "Could not start anvil fork; using fallback gas budget" >&2
    echo "$FALLBACK_GAS_WEI"
    return 0
  fi
  if PRIVATE_KEY="$ANVIL_PK" VRF_FUND_WEI="$VRF_FUND_WEI" \
    forge script script/Deploy.s.sol:Deploy \
      --rpc-url "http://127.0.0.1:$ANVIL_PORT" \
      --broadcast -vv >>"$log" 2>&1; then
    eth="$(grep -Eo 'Estimated amount required: [0-9.]+ ETH' "$log" | tail -n1 | awk '{print $4}')"
  fi
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  if [[ -z "${eth:-}" ]]; then
    echo "Could not parse forge gas estimate; using fallback" >&2
    tail -n 20 "$log" >&2 || true
    rm -f "$log"
    echo "$FALLBACK_GAS_WEI"
    return 0
  fi
  rm -f "$log"
  cast to-wei "$eth" ether
}

print_breakdown() {
  local gas_wei="$1"
  local send_wei="$2"
  echo
  echo "$CHAIN_LABEL deploy estimate"
  echo "  fork gas (x3 buffer):            $(wei_to_eth "$gas_wei") ETH"
  echo "  L1 / spike pad:                  $(wei_to_eth "$L1_PAD_WEI") ETH"
  echo "  VRF subscription float:          $(wei_to_eth "$VRF_FUND_WEI") ETH  (stays in Chainlink, not returned)"
  echo "  sweep reserve:                   $(wei_to_eth "$SWEEP_RESERVE_WEI") ETH"
  echo "  --------------------------------"
  echo "  send at least:                   $(wei_to_eth "$send_wei") ETH"
  echo
}

gas_wei="$(estimate_gas_wei)"
buffered_gas_wei="$((gas_wei * 3))"
send_wei="$((buffered_gas_wei + L1_PAD_WEI + VRF_FUND_WEI + SWEEP_RESERVE_WEI))"

print_breakdown "$buffered_gas_wei" "$send_wei"

if [[ "$ESTIMATE_ONLY" -eq 1 ]]; then
  exit 0
fi

mkdir -p "$DEPLOY_DIR"
chmod 700 "$DEPLOY_DIR"

if [[ -f "$KEY_FILE" && -f "$ADDR_FILE" ]]; then
  DEPLOYER="$(cat "$ADDR_FILE")"
  echo "Reusing throwaway deployer $DEPLOYER"
  echo "(delete $DEPLOY_DIR to generate a new one)"
else
  wallet="$(cast wallet new)"
  DEPLOYER="$(echo "$wallet" | awk '/Address:/ {print $2}')"
  PK="$(echo "$wallet" | awk '/Private key:/ {print $3}')"
  if [[ -z "$DEPLOYER" || -z "$PK" ]]; then
    echo "cast wallet new failed:" >&2
    echo "$wallet" >&2
    exit 1
  fi
  umask 077
  printf '%s\n' "$PK" >"$KEY_FILE"
  printf '%s\n' "$DEPLOYER" >"$ADDR_FILE"
  echo "Throwaway deployer: $DEPLOYER"
  echo "Private key saved to $KEY_FILE (gitignored)"
fi

PK="$(cat "$KEY_FILE")"
need_eth="$(wei_to_eth "$send_wei")"

echo
echo "Send $need_eth ETH on $CHAIN_LABEL to:"
echo "  $DEPLOYER"
if [[ -n "$RETURN_TO" ]]; then
  echo "Leftover ETH (not VRF float) will return to $RETURN_TO"
else
  echo "Leftover ETH will return to whatever address funds this wallet"
fi
echo
echo "Waiting for funds (ctrl+c safe; key stays in .deploy/$CHAIN_NAME/)..."

start_block="$(cast block-number --rpc-url "$RPC")"

while true; do
  bal="$(cast balance "$DEPLOYER" --rpc-url "$RPC")"
  echo "  balance $(wei_to_eth "$bal") / $need_eth ETH"
  if [[ "$bal" -ge "$send_wei" ]]; then
    break
  fi
  sleep 8
done

if [[ -z "$RETURN_TO" ]]; then
  if ! RETURN_TO="$(python3 "$ROOT/script/find_eth_sender.py" "$DEPLOYER" "$start_block" "$RPC")"; then
    echo "Funded, but could not detect the sender. Re-run with an explicit return address:" >&2
    echo "  $0 $CHAIN_NAME 0xYourAddress" >&2
    exit 1
  fi
  echo "Detected funder $RETURN_TO"
fi

if [[ "${RETURN_TO,,}" == "${DEPLOYER,,}" ]]; then
  echo "return address cannot be the throwaway deployer" >&2
  exit 1
fi

echo
echo "Deploying from $DEPLOYER on $CHAIN_LABEL ..."
PRIVATE_KEY="$PK" VRF_FUND_WEI="$VRF_FUND_WEI" \
  forge script script/Deploy.s.sol:Deploy \
    --rpc-url "$RPC" \
    --broadcast \
    -vv

echo
echo "Sweeping leftover ETH to $RETURN_TO ..."
bal="$(cast balance "$DEPLOYER" --rpc-url "$RPC")"
if [[ "$bal" -le "$SWEEP_RESERVE_WEI" ]]; then
  echo "Only $(wei_to_eth "$bal") ETH left (dust). Not sweeping."
  exit 0
fi

sweep_wei="$((bal - SWEEP_RESERVE_WEI))"
cast send "$RETURN_TO" \
  --rpc-url "$RPC" \
  --private-key "$PK" \
  --value "$sweep_wei"

echo "Sent $(wei_to_eth "$sweep_wei") ETH back to $RETURN_TO"
echo "Dust left on deployer: $(wei_to_eth "$(cast balance "$DEPLOYER" --rpc-url "$RPC")") ETH"
echo "Addresses are in broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json"
