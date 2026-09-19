# Kana

Personal hiragana / katakana flashcard PWA. One study set per script, toggleable chart columns, type-or-flip answers, and a college-style loop: full deck, retry the misses until that pile is empty, then the full deck again until a pass has zero misses.

## Use

- Pick columns on the chart page (Basic / Voiced / Combo). New decks start with the あ / ア column. Start (or press Enter) opens a study view with the chart hidden so answers cannot leak.
- Type romaji. A full match flashes correct and advances — no Enter, no submit. A wrong prefix (or Space / tap on an empty field) reveals the answer as a miss and waits so you can look; Space or tap continues.
- After a pass, only missed cards come back. When that pile is clear, the whole deck runs again. The sitting ends on a clean pass. Space / Enter also drives the between-pile screens. Any of those round-end screens can send you back to the chart to rearrange columns.
- After a clean pass, add the next column, run the same deck again, or rearrange the deck. Columns that have had a clean pass get a gold mark.
- Column choices and clean-pass marks stay in localStorage on the device.
- After the first load, a service worker keeps the app usable offline.

Session stats stay small: remaining in the current pile, misses on this full-deck pass, pass number, and whether you are on the deck or a retry pile. Per-card counts are stored but not shown yet. Misses speak the kana when the browser allows it.

## Public

https://emo-eth.github.io/japanese-flashcards/

GitHub Pages. Progress stays in localStorage on each device, so two people can share the URL without sharing a deck.

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
