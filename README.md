# Kana

Personal hiragana / katakana flashcard PWA. One study set per script, toggleable chart columns, type-or-flip answers, and StudyBlue-style "retry the ones you missed" rounds.

## Use

- Tap columns to include them in the deck (Basic / Voiced / Combo).
- Type romaji and press Enter, or tap / Space to flip and self-grade.
- After a round, only missed cards come back until the pile is clear.
- Progress and column choices stay in localStorage on the device.
- After the first load, a service worker keeps the app usable offline.

## Local

```sh
python3 scripts/serve.py
```

http://127.0.0.1:8877

## Tailnet

Binds to loopback only. Tailscale Serve publishes HTTPS on the same port.

```sh
./scripts/install-macos.sh
```

The installer never runs `tailscale serve reset` or Funnel, and it rolls back only the `:8877` handler if the Serve diff is wrong.

## Tests

```sh
bun test
```
