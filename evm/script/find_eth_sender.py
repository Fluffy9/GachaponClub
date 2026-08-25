#!/usr/bin/env python3
"""Find the first EOA that sent ETH to ADDRESS after START_BLOCK (inclusive)."""

from __future__ import annotations

import json
import subprocess
import sys


def cast_json(rpc: str, *args: str) -> object:
    cmd = ["cast", *args, "--rpc-url", rpc, "--json"]
    out = subprocess.check_output(cmd, text=True)
    return json.loads(out)


def main() -> None:
    if len(sys.argv) != 4:
        sys.stderr.write("usage: find_eth_sender.py ADDRESS START_BLOCK RPC\n")
        sys.exit(2)

    address = sys.argv[1].lower()
    start_block = int(sys.argv[2], 0)
    rpc = sys.argv[3]

    latest = int(str(cast_json(rpc, "block-number")), 0)
    for num in range(start_block, latest + 1):
        block = cast_json(rpc, "block", str(num), "--full")
        for tx in block.get("transactions") or []:
            if not isinstance(tx, dict):
                continue
            to = (tx.get("to") or "").lower()
            if to == address:
                value = int(tx.get("value") or "0x0", 16)
                if value > 0:
                    print(tx["from"])
                    return

    sys.exit(1)


if __name__ == "__main__":
    main()
