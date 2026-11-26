# Install neon-custom

## You need

- Herdr 0.1.18 or later. Start it one time before you install.
- macOS or Linux with `sh`.

## Steps

1. Clone this repo (or copy the folder) to the machine.
2. Run the install script:

   ```sh
   sh neon-custom/install.sh
   ```

   The script copies these files into `~/.config/herdr-app` (or
   `$HERDR_APP_HOME`):
   - `layouts/neon-custom.json` and `layouts/neon-custom.svg`
   - `themes/neon-custom.json`
   - eight mods: `neon-custom-sidebar`, `-status`, `-pane`, `-home`,
     `-agent-list`, `-more`, `-agents` and `-machines`

   It then checks each mod and switches Herdr to the layout.

3. To go back to your previous layout, press Ctrl-Shift-L.

The script never overwrites. If one of these names already exists, it stops and
copies nothing. Remove or rename the old files, then run it again.

## Name your machines

Machines show their `hc machine ls` name in a colour picked from that name. To
give them short names and fixed colours, edit the `MACHINES` map in
`machine.js`:

```js
export const MACHINES = {
  "": { label: "laptop", host: "my-laptop", color: "ansi2" },
  "build-box-01": { label: "build", color: "ansi4" },
};
```

Key `""` is this computer. `host` is the name the status bar and tooltips use.
Colours are theme names (`ansi0`–`ansi15`, `accent`, ...).

There are three identical copies of `machine.js`, in
`mods/neon-custom-sidebar`, `mods/neon-custom-status` and
`mods/neon-custom-pane`, because Herdr mods cannot import from each other.
Change all three. Herdr loads the change immediately.

## Optional shortcuts

`keys.neon-custom.json` holds two shortcuts for this layout: Cmd-Shift-H
shows the home screen and Cmd-Shift-J shows the work area. To use them, add its
`"layout:neon-custom"` section to your `~/.config/herdr-app/keys.json`.
The script does not edit `keys.json`, because any edit makes the whole file
yours and Herdr stops updating its default shortcuts.

## Remove

Switch to another layout, then delete the files that step 2 copied.

## Previous names

Neon Custom now uses `neon-custom` everywhere. If you installed `jason-neon-custom`, keep a backup of its layout, theme, mods and optional key section before installing this version. Copy your machine aliases into the new machine helpers. After switching successfully, archive the old layout outside `layouts/` to remove its duplicate picker entry.
