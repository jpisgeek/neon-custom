// Which machine a session lives on, as one colour-coded chip shared by the
// sidebar, pane header and status bar. Remote space, tab and pane ids carry a
// "<machine>/" prefix; this computer's have none.
// Identical copies live in the sidebar, status and pane mods (mods cannot
// import from each other): change all three.

import { div } from "gpui-kit";

// <machines>
// Short names and colours for your machines, by their `hc machine ls` name.
// Key "" is this computer; `host` is what the status bar and tooltips call it.
// Colours are theme names. A machine not listed shows its own name, in a
// colour picked from that name. For example:
//   "my-studio-hostname": { label: "studio", color: "ansi4" },
export const MACHINES = {
  "": { label: "local", color: "ansi2" },
};
// </machines>

// Not pink (working) or red (needs you): those already mean something here.
const PALETTE = ["ansi4", "ansi3", "ansi6", "ansi12", "ansi11", "ansi14"];

function pick(name) {
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export const machineOf = (id) => (typeof id === "string" && id.includes("/") ? id.split("/")[0] : null);

export function machineInfo(machine) {
  const named = MACHINES[machine ?? ""] ?? {};
  const host = named.host ?? machine ?? null;
  return {
    label: named.label ?? machine,
    host: host ?? "This computer",
    title: machine ? host : host ? `${host} (this computer)` : "This computer",
    color: named.color ?? pick(machine),
  };
}

// A small pill: the short name in the machine's colour on a faint wash of it.
export function machineChip(t, machine, id) {
  const m = machineInfo(machine);
  const c = t[m.color] ?? t.dim;
  return div()
    .when(Boolean(id), (el) => el.id(id).tooltip(m.title))
    .flex_none()
    .h(16)
    .px(5)
    .flex()
    .items_center()
    .rounded(4)
    .bg(c + "26")
    .font_family("Geist Mono")
    .text_size(9.5)
    .font_semibold()
    .text_color(c)
    .child(m.label);
}
