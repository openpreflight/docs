---
title: "Rotate the secret key"
description: "Replace CI_SECRET_KEY and encrypt the stored secrets again with the new key."
sidebar:
  order: 4
---
This procedure replaces `CI_SECRET_KEY` with a new key. At the next start, the server encrypts the stored secrets again with the new key.

:::caution
Keep a copy of `CI_SECRET_KEY` in a safe location. If you lose the key, the server cannot decrypt the stored secrets: the GitHub App private keys, the webhook secrets and the Coolify tokens.
:::

## Before you start

- Make a backup of `/data`. Refer to [Backup and restore](/operate/backup-restore/).
- Keep that backup until you log in with the new key and test an App.
- Make sure that the new key and the current key are each 32 bytes or longer.

## Procedure

1. Make a new key:

   ```bash
   openssl rand -base64 48
   ```

2. Set `CI_SECRET_KEY_OLD` to the current key.
3. Set `CI_SECRET_KEY` to the new key.
4. Start the server one time.
5. Find this line in the server log: `re-sealed secret columns under CI_SECRET_KEY`.
6. Remove `CI_SECRET_KEY_OLD` from the environment.
7. Restart the server. The previous key is then not in the environment.
8. Log in and test an App.

## Result

The server encrypts `pem_enc` and `webhook_secret_enc` in `github_apps`, and `api_token_enc` in `coolify_instances`, with the new key.
It logs the count of changed rows, and then this warning: `unset CI_SECRET_KEY_OLD and restart so the previous key is not left in the environment`.
The server does not change a row that it can open with the new key. A restart after a rotation that is not complete is thus safe.

## If the server does not start

If the server cannot open a row with `CI_SECRET_KEY` or with `CI_SECRET_KEY_OLD`, it does not start. The log shows `value opens with neither the old nor the new CI_SECRET_KEY`.

1. Set `CI_SECRET_KEY` to the new key.
2. Set `CI_SECRET_KEY_OLD` to the key that was in use before the rotation.
3. Start the server again.
4. If you do not have the previous key, restore the backup that you made before the rotation. Refer to [Backup and restore](/operate/backup-restore/).

## Related

- [Environment](/reference/configuration/#environment): `CI_SECRET_KEY` and `CI_SECRET_KEY_OLD`
- [Backup and restore](/operate/backup-restore/)
