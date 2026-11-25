# jason-neon-custom

A [Herdr](https://herdr.dev) layout for running sessions across several
machines: a dark violet window with acid-green and hot-pink accents, a sidebar
where every workstream lists its own sessions, and a colour-coded machine chip
on every workstream, session, pane header and the status bar, so you can tell at
a glance what runs where.

![jason-neon-custom](preview.png)

- Workstreams as a tree. Each workstream (a Herdr space) lists its sessions
  under it and folds with a chevron. A second list shows every session by time,
  each carrying its workstream's lettered mark.
- Machine chips. Short names and colours per machine, set in `machine.js`. Any
  machine not listed shows its own name.
- New workstream on… The Workstreams + asks which machine to use.
- Plain shells read well. An unnamed shell tab is named after its shell and
  folder (`zsh · ~/git/app`) instead of its number.
- A home screen with a composer that starts an agent or a shell on any machine.

## Install

Clone this repo and run `sh install.sh`. See [INSTALL.md](INSTALL.md).

`RECIPE.md` describes how the layout looks, behaves and is built.
