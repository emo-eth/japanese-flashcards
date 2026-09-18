# Kana

Personal hiragana / katakana flashcard PWA. One study set per script, toggleable chart columns, type-or-flip answers, and a college-style loop: full deck, retry the misses until that pile is empty, then the full deck again until a pass has zero misses.

## Use

- Tap columns to include them in the deck (Basic / Voiced / Combo). New decks start with the あ / ア column.
- Type romaji and press Enter to check. Space or tap flips the card and counts as a miss.
- After a pass, only missed cards come back. When that pile is clear, the whole deck runs again. The sitting ends on a clean pass.
- After a clean pass, add the next column or run the same deck again. Columns that have had a clean pass get a gold mark.
- Column choices and clean-pass marks stay in localStorage on the device.
- After the first load, a service worker keeps the app usable offline.

Session stats stay small: remaining in the current pile, misses on this full-deck pass, pass number, and whether you are on the deck or a retry pile. Per-card counts are stored but not shown yet.

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

Live: https://studio.tail55aa7b.ts.net:8877/

The installer never runs `tailscale serve reset` or Funnel, and it rolls back only the `:8877` handler if the Serve diff is wrong.

## Tests

```sh
bun test
```
