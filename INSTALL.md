# Install jason-neon-custom

## You need

- Herdr 0.1.18 or later. Start it one time before you install.
- macOS or Linux with `sh`.

## Steps

1. Clone this repo (or copy the folder) to the machine.
2. Run the install script:

   ```sh
   sh jason-neon-custom/install.sh
   ```

   The script copies these files into `~/.config/herdr-app` (or
   `$HERDR_APP_HOME`):
   - `layouts/jason-neon-custom.json` and `layouts/jason-neon-custom.svg`
   - `themes/jason-neon-custom.json`
   - eight mods: `jason-neon-custom-sidebar`, `-status`, `-pane`, `-home`,
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
`mods/jason-neon-custom-sidebar`, `mods/jason-neon-custom-status` and
`mods/jason-neon-custom-pane`, because Herdr mods cannot import from each other.
Change all three. Herdr loads the change immediately.

## Optional shortcuts

`keys.jason-neon-custom.json` holds two shortcuts for this layout: Cmd-Shift-H
shows the home screen and Cmd-Shift-J shows the work area. To use them, add its
`"layout:jason-neon-custom"` section to your `~/.config/herdr-app/keys.json`.
The script does not edit `keys.json`, because any edit makes the whole file
yours and Herdr stops updating its default shortcuts.

## Remove

Switch to another layout, then delete the files that step 2 copied.
