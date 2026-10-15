# HACS installation acceptance · 2026-10-13

[中文说明](hacs-acceptance.zh-CN.md)

**Passed:** HACS custom-repository installation and migration from an existing manual installation on HA 2026.10.1.

Tested build: the public pre-release test version that preceded the initial release. Integration 0.4.0, Blueprint 0.2.0, card 0.9.8.

## Installation results

A backup was created before downloading the integration through HACS and restarting HA. The **Install Blueprint and card** setup completed successfully.

| Check | Result |
| --- | --- |
| Integration | Version 0.4.0 loaded; existing Managed Auto controller resumed |
| Blueprint | Existing path, automation reference, schedule and controller binding retained |
| Card resource | Registered automatically; old resource migrated without duplicates |
| Served JavaScript | HTTP 200; byte-for-byte match with the published build |
| Dashboard | Status, stages, power and history rendered; sensor selections retained |
| Diagnostics | Installation entry download succeeded |

Card SHA-256: `36a30515744d12f1162b042de1969febcb03375b9355429915c72922dcd6135a`.

## Automated checks

- [HACS and hassfest](https://github.com/maigougou/ha-ecobee-dual-fuel-heat-pump-scheduler/actions/runs/38500503850): passed.
- [Linux CI](https://github.com/maigougou/ha-ecobee-dual-fuel-heat-pump-scheduler/actions/runs/38500504054): 296 tests passed on each of HA 2024.12.0, 2026.10.1 and beta; 164 frontend tests and 17 standalone installer tests passed.

The initial public CI run found missing dependency declarations, cache configuration, HACS icons and repository topics. The results above are from the corrected commit.

## Scope

This was a migration test, not a full first-time setup on an empty HA instance. A subsequent HACS version-to-version upgrade remains untested. No physical heating/cooling changeover was forced for installation verification. This is a public test version, available as a HACS custom repository.

Full Linux suites exited successfully. The previously observed macOS Python 3.14 exit crash in an isolated HA fixture test still has no confirmed root cause.
