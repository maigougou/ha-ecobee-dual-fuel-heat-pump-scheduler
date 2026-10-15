# Installation and updates

## HACS

The 0.4.0 integration includes the Blueprint and card in `custom_components/ecobee_managed_auto/bundle/`. HACS installs that one directory; the integration's **Install Blueprint and card** setup entry installs the chosen Blueprint and registers the card. Creating this entry does not enable an automation or create a Managed Auto controller.

Follow the [README](../README.md#install-and-configure). HACS custom-repository installation and migration from an existing installation were verified on HA 2026.10.1. [Acceptance results](hacs-acceptance.md). Add this project as a custom repository; it is not in HACS's default catalogue.

The installer preserves an existing Blueprint's imported path, backs up a changed file under `/config/.ecobee-dual-fuel-backups/`, and migrates the old `/local/ecobee-dual-fuel-card.js` resource if present. Duplicate Blueprint copies or card resources produce a setup error instead of an arbitrary choice. It does not delete automation inputs or edit `.storage` directly.

If both Blueprint languages were previously installed, HACS package setup updates both so existing automations keep using the current definition. Selecting a language does not translate existing automation titles or switch their Blueprint references.

For YAML-managed resources, the bundled card uses HA's frontend module hook. Remove an existing manual ecobee card resource from YAML first to avoid loading two versions. Storage-managed dashboards require no resource edits.

## Script alternative

The standalone [install.py](../install.py) supports macOS/Linux and Python 3.10+. Run it on a machine that has **write access to the HA config directory** (the directory containing `configuration.yaml`). An HA URL alone does not provide filesystem access. On HA OS, a terminal app must expose that directory and provide Python 3; otherwise use HACS.

Download and extract the whole repository, open a terminal in it, then run:

```sh
python3 install.py --config /config --ha-url http://homeassistant.local:8123
```

Replace `/config` with your mounted/container config directory and the URL with your HA address. Add `--language zh` for the Chinese Blueprint. The script prompts privately for an administrator long-lived access token, created in your HA profile's Security section. It never saves the token. You can revoke it afterwards.

The script installs the Blueprint, card and integration files, then registers the card through HA's API. Restart HA when prompted, create the Blueprint automation and select your equipment. For optional automatic heating/cooling, add the integration and choose **Add Managed Auto controller**. The script has already installed the files and registered the card; it does not need the package-installation entry.

Useful options:

| Option | Result |
| --- | --- |
| `--dry-run` | Lists files without authentication or changes |
| `--without-managed-auto` | Copies just the Blueprint and card |
| `--files-only` | Skips the HA API; prints the resource URL to register manually |
| `--restore /path/to/backup` | Restores backed-up files, refusing to overwrite later edits; update the card resource version and restart afterwards |

Re-running the command updates changed files and retains matching ones. File-copy failure rolls back files already written. If resource registration is interrupted, files remain installed; re-running reconciles the resource without creating a duplicate. A resource error returns exit code 2; other installation failures return 1. No thermostat service is called.

## Updates and removal

- **HACS:** update, restart HA, refresh the browser. The setup entry updates the packaged Blueprint and card registration. Reload automations after a Blueprint replacement so existing automations use the new definition.
- **Script:** run the installer from the new checkout. Keep the printed backup path for rollback.
- **Before rollback/removal:** disable Managed Auto and confirm native Auto is restored. Disable any source-schedule automation you no longer want to run.
- **Remove the package:** remove its integration entries and HACS download. The copied Blueprint, backups and your own automations/card configuration are retained. Remove unwanted automation/card entries and the `ecobee-dual-fuel` resource in Dashboard Resources; remove the copied Blueprint after no automation uses it. YAML frontend registration disappears after restart.

## Development

After building the Blueprint or card, run:

```sh
python scripts/build_bundle.py
python scripts/build_bundle.py --check
```

CI checks packaged assets against their source so a HACS update cannot silently ship an old card or Blueprint. Installer tests run without a real thermostat. Actual HACS download and migration have passed; a subsequent HACS version-to-version upgrade remains to be tested.

References: [HACS integration packaging](https://www.hacs.dev/docs/publish/integration/), [HACS repository requirements](https://hacs.dev/docs/publish/start/).
