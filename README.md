# AirScout (GenLayer MVP)

AirScout is an on-chain AI due diligence protocol for airdrop hunters.

## What this repo contains
- `storage_test.py`
- `airscout_contract.py`
- `frontend/`
- `sample_data.json`

## Deploy in GenLayer Studio
1. Open `https://studio.genlayer.com/run-debug`
2. Settings -> Reset Storage -> Confirm
3. Hard refresh
4. Deploy `storage_test.py` first
5. Deploy `airscout_contract.py`
6. Call `create_audit(...)`
7. Read with `get_audit(audit_id)` and `get_total_audits()`

## Run frontend
```bash
cd frontend
npm install
npm run dev
```

## Common errors
- `Contract Queues not found`: check `# v0.2.16` + dependency comment.
- `AssertionError: TreeMap <- TreeMap`: do not reassign TreeMap/DynArray in `__init__`.
- Schema errors: no float/list/dict/custom class in public signatures.
