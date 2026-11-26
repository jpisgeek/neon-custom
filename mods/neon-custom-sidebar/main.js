// The neon-custom sidebar: the window's top row, its fixed actions, workstreams
// (spaces) and sessions (tabs) grouped by recency, and the person's footer.
// The layout places three copies of this mod: part "head", "nav" and "foot";
// a fourth part, "list", holds workstreams and sessions. A fifth, "machines",
// is the Workstreams + popup: which machine the new workstream goes to.
//
// Clicks: a workstream selects its space, a session selects its tab and shows
// the work area. The flower goes back to the home screen.
//
// Each workstream lists its own sessions beneath it (its chevron folds them),
// and the Sessions list by time carries each session's workstream mark, so the
// relation reads both ways.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, panes, machines, run, openOverlay, closeOverlay, theme, layout, window, home, props, shared, setShared, nextCommand, updates, settings } from "herdr";
import { machineChip, machineInfo } from "./machine.js";

const I = (name) => `mods/workspace-chrome/${name}.svg`;
const RAIL_ICON_SIZE = 18;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The rail goes by the sidebar's width, so dragging its edge narrows it too.
const rail = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 208;
const stack = () => find(layout(), "main-stack");
const startSession = () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 });

function showWork() {
  if (stack()?.active !== "work") run("layout.select", { stack: "main-stack", child: "work" });
}
// Return to the last expanded width after the icon rail.
function toggleRail() {
  if (rail()) {
    const width = shared("neon-custom.rail.width");
    run("layout.resize", { id: "sidebar", px: typeof width === "number" && width >= 208 ? width : 268 });
  } else {
    setShared("neon-custom.rail.width", find(layout(), "sidebar")?.size?.px ?? 268);
    run("layout.resize", { id: "sidebar", px: window()?.platform === "macos" ? 76 : 44 });
  }
}

function showHome() {
  if (stack()?.active !== "home") run("layout.select", { stack: "main-stack", child: "home" });
}

function ago(ms) {
  if (!ms) return "";
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

// Calendar days between a moment and today: 0 is today, 1 yesterday.
function dayIndex(ms) {
  const then = new Date(ms);
  then.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now - then) / 86400000);
}

const BUCKETS = [
  { id: "today", label: "Today", within: 1 },
  { id: "week", label: "Last 7 days", within: 7 },
  { id: "month", label: "Last 30 days", within: 30 },
  { id: "older", label: "Older", within: Infinity },
];

function bucketOf(ms) {
  if (!ms) return "today";
  const days = dayIndex(ms);
  return (BUCKETS.find((b) => days < b.within) ?? BUCKETS[BUCKETS.length - 1]).id;
}

// A session's name: what someone called it, else what runs in it ("OpenCode"),
// else its number.
const strip = (text) => (text ?? "").replace(/^[^\p{L}\p{N}~/]+/u, "").trim();

// A folder as people read it: ~ for home, and only the last two folders of a
// deep path, since the row truncates from the end.
function shortFolder(cwd) {
  const h = home();
  const path = cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length > 3 ? `…/${parts.slice(-2).join("/")}` : path;
}

// An unnamed shell says where it is ("zsh · ~/git/vault") rather than its number.
function sessionName(tab, pane) {
  if (tab.named) return tab.name;
  if (pane?.program?.shell) return pane.cwd ? `${pane.program.name} · ${shortFolder(pane.cwd)}` : tab.name;
  const title = strip(pane?.title);
  const program = pane?.program?.name;
  if (title && title !== program && !/^[~/]|^[A-Za-z]:\\/.test(title)) return title;
  return tab.name;
}

const lastTouch = (space) => Math.max(0, ...(space.tabs ?? []).map((tab) => tab.changed_at ?? 0)) || null;

export default class JasonNeonSidebar extends View {
  init(_props, cx) {
    const part = props()?.part ?? "list";
    if (part === "list") {
      let folded;
      try { folded = JSON.parse(localStorage.getItem("neon-custom.folded")); } catch {}
      this.folded = new Set(Array.isArray(folded) ? folded : ["week", "month", "older", "settled"]);
      this.mine = localStorage.getItem("neon-custom.mine") === "1";
      this.pressed = null;
      this.over = null;
      this.hovered = null;
      cx.timer.every(60000, (cx) => { if (!rail()) cx.notify(); });
    }
    // The status bar forwards toggle requests to the head while it is visible.
    if (part === "head") {
      cx.spawn(async (cx) => {
        for (;;) {
          try {
            const command = await nextCommand();
            if (command === "toggle") toggleRail();
          } catch {
            return;
          }
          cx.notify();
        }
      });
    }
  }

  // This mod's own icons.
  m(name) {
    return `mods/neon-custom-sidebar/${name}.svg`;
  }
  fold(id, cx) {
    if (this.folded.has(id)) this.folded.delete(id);
    else this.folded.add(id);
    localStorage.setItem("neon-custom.folded", JSON.stringify([...this.folded]));
    if (cx) cx.notify();
  }

  // A nav row: an icon and a label, with something on the right.
  nav(t, id, icon, label, action, right, on) {
    return h_flex()
      .id(id)
      .h(30)
      .flex_none()
      .px(8)
      .gap(10)
      .rounded(7)
      .items_center()
      .text_size(13)
      .text_color(on ? t.accent : t.muted)
      .when(on, (el) => el.bg(t.selected))
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click(action)
      .child(svg(icon).size(15).flex_none().text_color(on ? t.accent : t.dim))
      .child(div().flex_1().min_w(0).truncate().child(label))
      .when(Boolean(right), (el) => el.child(right));
  }

  section(t, label, id, action, right) {
    const open = !this.folded.has(id);
    return h_flex()
      .id(`sec-${id}`)
      .h(30)
      .flex_none()
      .px(8)
      .pt(8)
      .gap(6)
      .items_center()
      .text_size(10.5)
      .font_medium()
      .text_color(t.dim)
      .when(Boolean(action), (el) => el.cursor_pointer()
        .hover((s) => s.text_color(t.foreground))
        .on_click((_e, cx) => { cx.stop_propagation(); action(cx); }))
      .child(div().flex_1().truncate().text_color("#ff3bd4").child(label.toUpperCase()))
      .when(Boolean(right), (el) => el.child(right))
      .when(Boolean(action), (el) => el.child(svg(I(open ? "chevron-down" : "chevron-right")).size(11).flex_none()));
  }

  // Needs you: a pulsing outline over a row, red-pink when an agent is blocked,
  // green when one finished while you were away. Native animation, no timer.
  attention(t, status, radius) {
    const c = status === "blocked" ? t.blocked : status === "done" ? t.done : null;
    if (!c) return null;
    return div().absolute().top(0).bottom(0).left(0).right(0).rounded(radius)
      .border_2().border_color(c).bg(c + "1a")
      .loop("opacity", { from: 0.25, to: 1, period: 900 });
  }

  // A count that speaks up: an orange pill the person can't miss.
  badge(t, count, hot) {
    if (!count) return null;
    return h_flex()
      .flex_none()
      .gap(5)
      .items_center()
      .child(div().size(6).rounded_full().bg(hot ? t.accent : t.dim))
      .child(div().text_size(11.5).text_color(hot ? t.accent : t.dim).child(String(count)));
  }

  head(t, compact) {
    const w = window();
    // On the rail the window buttons own the top row: leave it to them.
    if (compact) return v_flex().size_full().bg(t.chrome);
    const lights = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen;
    // Native window buttons stay the same size when Herdr zoom changes.
    const left = lights ? ((layout()?.traffic_lights?.[0] ?? 12) + 64) / settings().zoom : 12;
    const icon = (id, name, action, tip) => div()
      .id(id)
      .size(26)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(6)
      .text_color(t.dim)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(tip)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(action)
      .child(svg(name).size(15));
    return h_flex()
      .size_full()
      .items_center()
      .gap(4)
      .pl(left)
      .pr(10)
      .child(div()
        .id("neon-custom-sidebar-toggle")
        .size(26)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(7)
        .cursor_pointer()
        .text_color(t.muted)
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .tooltip("Collapse the sidebar")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(toggleRail)
        .child(svg(I("sidebar")).size(16)))
      .child(div().flex_1().pl(6).text_size(11).font_semibold().text_color("#ff3bd4").child("NEON CUSTOM"))
      .child(icon("neon-custom-prev", I("chevron-left"), () => run("space.prev"), "Previous workstream"))
      .child(icon("neon-custom-next", I("chevron-right"), () => run("space.next"), "Next workstream"))
      .when(Boolean(w?.buttons), (el) => el
        .child(icon("neon-custom-minimize", "mods/tabs/win-min.svg", () => run("window.minimize"), "Minimize"))
        .child(icon("neon-custom-maximize", w.maximized ? "mods/tabs/win-restore.svg" : "mods/tabs/win-max.svg",
          () => run("window.maximize"), w.maximized ? "Restore" : "Maximize"))
        .child(icon("neon-custom-close-window", "mods/tabs/win-close.svg", () => run("window.close"), "Close window")));
  }

  navPart(t, compact) {
    const atHome = stack()?.active === "home";
    const list = agents();
    const needing = list.filter((a) => a.status === "blocked" || a.status === "done").length;
    const working = list.filter((a) => a.status === "working").length;
    const search = () => run("mod.open", { name: "picker" });
    const more = () => run("mod.open", { name: "neon-custom-more" });
    if (compact) {
      const cell = (id, name, action, tip, tone) => div()
        .id(id)
        .w(32)
        .h(28)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(7)
        .text_color(tone ?? t.muted)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .tooltip(tip)
        .on_click(action)
        .child(svg(name).size(RAIL_ICON_SIZE));
      return v_flex().size_full().items_center().pt(2).gap(2)
        .child(cell("neon-custom-home", this.m("house"), showHome, "Home", atHome ? t.foreground : undefined))
        .child(cell("neon-custom-new", I("plus"), startSession, "New session"))
        .child(cell("neon-custom-agents", I("circle-check"), () => openOverlay({ mod: "neon-custom-agent-list", kind: "dialog", width: 420, height: 560 }), needing ? `${needing} need attention` : "Agents", needing ? t.accent : working ? t.working : undefined))
        .child(cell("neon-custom-search", I("search"), search, "Search"))
        .child(cell("neon-custom-more", I("layers"), more, "More"));
    }
    return v_flex().size_full().pt(2).gap(1)
      .child(this.nav(t, "neon-custom-home", this.m("house"), "Home", showHome, null, atHome))
      .child(this.nav(t, "neon-custom-new", I("plus"), "New session", startSession))
      .child(this.nav(t, "neon-custom-agents", I("circle-check"), working ? `Agents · ${working} working` : "Agents",
        () => openOverlay({ mod: "neon-custom-agent-list", kind: "dialog", width: 420, height: 560 }),
        this.badge(t, needing, true)))
      .child(this.nav(t, "neon-custom-search", I("search"), "Search", search))
      .child(this.nav(t, "neon-custom-more", I("layers"), "More", more));
  }


  // A workstream's colour, shared with Herdr's own lists so every view agrees.
  colors() {
    const palette = ["ansi6", "ansi3", "ansi4", "ansi5", "ansi2", "ansi1"];
    const kept = { ...(shared("space.colors") ?? {}) };
    const list = spaces();
    const ids = new Set(list.map((p) => p.id));
    let changed = false;
    for (const id of Object.keys(kept)) if (!ids.has(id)) { delete kept[id]; changed = true; }
    for (const space of list) {
      if (kept[space.id]) continue;
      const uses = (c) => Object.values(kept).filter((v) => v === c).length;
      kept[space.id] = palette.reduce((best, c) => (uses(c) < uses(best) ? c : best));
      changed = true;
    }
    if (changed) setShared("space.colors", kept);
    return kept;
  }

  mark(t, space, colors, size = 18, id = null) {
    const name = colors[space.id];
    return h_flex()
      .when(Boolean(id), (el) => el.id(id).tooltip(space.name))
      .size(size)
      .flex_none()
      .rounded(size > 16 ? 5 : 4)
      .items_center()
      .justify_center()
      .text_size(size > 16 ? 10.5 : 9)
      .font_bold()
      .text_color(t.solid_foreground)
      .bg(t[name] ?? t.dim)
      .child([...space.name][0]?.toUpperCase() ?? "?");
  }

  workstreams(t, compact) {
    const list = spaces();
    if (compact) {
      return v_flex().w_full().items_center().gap(3).pt(6)
        .children(list.map((s) => div()
          .id(`ws-${s.id}`)
          .relative()
          .size(26)
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .rounded(7)
          .text_size(11.5)
          .font_semibold()
          .text_color(s.active ? t.foreground : t.muted)
          .when(s.active, (el) => el.bg(t.selected))
          .hover((s2) => s2.bg(t.hover))
          .tooltip(`${s.name} · ${machineInfo(s.machine).label}`)
          .on_click(() => { run("space.select", { id: s.id }); showWork(); })
          .child([...s.name][0]?.toUpperCase() ?? "?")
          .when(Boolean(this.attention(t, s.status, 7)), (el) => el.child(this.attention(t, s.status, 7)))
          .when(Boolean(s.status), (s2) => s2.child(div().absolute().right(4).bottom(4).size(5).rounded_full().bg(t[s.status] ?? t.dim)))));
    }
    const colors = this.colors();
    const pressedIndex = list.findIndex((space) => space.id === this.pressed);
    const unavailable = new Set(machines().filter((machine) => machine.layout === "unavailable").map((machine) => machine.name));
    const lead = this.leads();
    return v_flex()
      .child(this.section(t, "Workstreams", "workstreams", null,
        div().id("ws-new").size(20).flex_none().flex().items_center().justify_center().rounded(5)
          .text_color(t.dim).hover((s) => s.bg(t.hover).text_color(t.foreground)).tooltip("New workstream on…")
          .on_click((_e, cx) => {
            cx.stop_propagation();
            openOverlay({ mod: "neon-custom-sidebar", kind: "popup", width: 260, height: 40 + 31 * machines().length, props: { part: "machines" } });
          })
          .child(svg(I("plus")).size(13))))
      .children(list.flatMap((space, i) => {
        const time = lastTouch(space);
        const branch = space.branch && space.branch !== "main" && space.branch !== "master" ? space.branch : null;
        const tabs = space.tabs ?? [];
        const open = !this.folded.has(`ws:${space.id}`);
        const chevron = div()
          .id(`ws-fold-${space.id}`)
          .w(12)
          .h(18)
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .rounded(4)
          .text_color(t.dim)
          .hover((s) => s.text_color(t.foreground))
          .tooltip(open ? "Hide its sessions" : "Show its sessions")
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => { cx.stop_propagation(); this.fold(`ws:${space.id}`, cx); })
          .child(svg(I(open ? "chevron-down" : "chevron-right")).size(10));
        const row = h_flex()
          .id(`ws-${space.id}`)
          .relative()
          .h(30)
          .flex_none()
          .pl(2)
          .pr(8)
          .gap(7)
          .rounded(6)
          .items_center()
          .text_size(13)
          .text_color(space.active ? t.accent : t.muted)
          .when(space.active, (el) => el.bg(t.selected))
          .when(!space.active, (el) => el.hover((s) => s.bg(t.hover).text_color(t.foreground)))
          .cursor_pointer()
          .when(this.pressed === space.id && this.over !== space.id, (el) => el.opacity(0.5))
          .when(this.pressed !== null && this.over === space.id && this.pressed !== space.id, (el) => el.child(
            div().absolute().left(0).right(0).h(2).bg(t.accent)
              .when(pressedIndex < i, (line) => line.bottom(0))
              .when(pressedIndex > i, (line) => line.top(0))))
          .on_mouse_down("left", () => { this.pressed = space.id; this.over = space.id; })
          .on_mouse_move((_e, cx) => {
            if (this.pressed === null) return;
            const source = list.find((item) => item.id === this.pressed);
            const over = source?.machine === space.machine ? space.id : null;
            if (this.over === over) return;
            this.over = over;
            cx.notify();
          })
          .on_mouse_up("left", (_e, cx) => {
            const from = this.pressed;
            const to = this.over;
            this.pressed = null;
            this.over = null;
            if (from && to === space.id && from !== to && list.find((item) => item.id === from)?.machine === space.machine) {
              run("space.move", { id: from, index: i + 1 });
            } else if (from === space.id) {
              run("space.select", { id: space.id });
              showWork();
            }
            cx.notify();
          })
          .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 220, height: 300, props: { tab: "space", target: { id: space.id } } }))
          .child(chevron)
          .child(this.mark(t, space, colors))
          .child(div().flex_1().min_w(0).truncate().child(space.name))
          .when(!open && tabs.length > 0, (el) => el.child(div().id(`ws-count-${space.id}`).flex_none().font_family("Geist Mono").text_size(10).text_color(t.dim)
            .tooltip(`${tabs.length} ${tabs.length === 1 ? "session" : "sessions"}`).child(String(tabs.length))))
          .child(h_flex().flex_none().gap(4).items_center()
            .child(machineChip(t, space.machine, `ws-m-${space.id}`))
            .when(Boolean(space.machine) && unavailable.has(space.machine),
              (off) => off.child(div().id(`ws-off-${space.id}`).tooltip(`${space.machine} is not answering`).size(5).rounded_full().bg(t.blocked))))
          .when(Boolean(branch), (el) => el.child(h_flex().flex_none().gap(3).items_center()
            .child(svg(I("branch")).size(10).flex_none().text_color(t.dim))
            .child(div().font_family("Geist Mono").text_size(10).text_color(t.dim).max_w(88).truncate().child(branch))))
          .when(Boolean(space.status), (el) => el.child(space.status === "working"
            ? div().size(5).rounded_full().flex_none().bg(t.working).loop("opacity", { from: 0.35, to: 1, period: 1300 })
            : div().size(5).rounded_full().flex_none().bg(t[space.status] ?? t.dim)))
          .when(Boolean(time), (el) => el.child(div().flex_none().font_family("Geist Mono").text_size(10.5).text_color(t.dim).child(ago(time))))
          .when(Boolean(this.attention(t, space.status, 6)), (el) => el.child(this.attention(t, space.status, 6)));
        if (!open || !tabs.length) return [row];
        // Its sessions in tab order, on a guide line under the workstream's mark.
        return [row, v_flex()
          .ml(24)
          .pl(4)
          .mb(2)
          .border_l(1)
          .border_color(t.border)
          .children(tabs.map((tab) => this.sessionGroup(t, space, tab, {
            where: "wst", nested: true, lead: lead.get(tab.id), colors,
            settled: tab.settled && !(tab.active && space.active) && tab.status !== "blocked" && tab.status !== "done",
          })))];
      }));
  }

  // The first terminal pane of each tab, which names an unnamed session.
  leads() {
    const lead = new Map();
    for (const pane of panes()) if (pane.terminal && !lead.has(pane.tab)) lead.set(pane.tab, pane);
    return lead;
  }

  // Pane cards keep the space > session > pane hierarchy explicit.
  sessionGroup(t, space, tab, options) {
    const group = this.panesByTab.get(tab.id) ?? [];
    return v_flex().gap(3).mb(5)
      .child(this.sessionRow(t, space, tab, options))
      .children(group.map((p, index) => this.paneCard(t, space, tab, p, index)));
  }

  paneCard(t, space, tab, p, index) {
    const name = p.name || p.program?.name || p.mod || p.title || "Terminal";
    const status = p.status === "blocked" ? "Needs you" : p.status || (p.mod ? "Panel" : "Shell");
    const color = t[p.status] ?? t.dim;
    const context = `${machineInfo(space.machine).host} / ${space.name} / ${tab.name} / Pane ${index + 1}`;
    return v_flex()
      .id(`fleet-pane-${p.pane}`)
      .ml(8).mr(3).px(8).py(5).gap(3).rounded(8)
      .border_1().border_color(p.focused ? t.accent : t.border)
      .bg(p.focused ? t.selected : t.surface)
      .cursor_pointer().hover(el => el.bg(t.hover))
      .tooltip(`${context}\n${p.title || name}\n${p.cwd || ""}`)
      .on_click(() => {
        run("space.select", { id: space.id });
        run("tab.select", { id: tab.id });
        showWork();
        run("pane.focus", { pane: p.pane });
      })
      .child(h_flex().items_center().gap(5)
        .child(div().flex_none().px(5).rounded(5).bg(t.raised).text_size(9.5)
          .text_color(p.focused ? t.accent : t.dim).child(`P${index + 1}`))
        .child(div().flex_1().min_w(0).truncate().text_size(11.5)
          .text_color(p.focused ? t.accent : t.foreground).child(name))
        .child(div().size(5).flex_none().rounded_full().bg(color)))
      .child(h_flex().gap(5).items_center()
        .child(div().flex_none().text_size(9.5).text_color(color).child(status))
        .child(div().flex_1().min_w(0).truncate().text_size(9.5).text_color(t.dim)
          .child(p.cwd ? shortFolder(p.cwd) : p.mod || "")));
  }

  // One session (a tab). `where` keys its ids and hover state, since the same
  // tab shows both under its workstream and in the list by time. Rows in the
  // list by time carry the workstream's mark and the machine chip; nested rows
  // get both from the workstream above them.
  sessionRow(t, space, tab, { where, nested, lead, colors, settled }) {
    const on = tab.active && space.active;
    const name = sessionName(tab, lead);
    const key = `${where}:${tab.id}`;
    const hovered = this.hovered === key;
    const action = (command, icon, label) => div()
      .id(`${where}-${command}-${tab.id}`)
      .size(16)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(4)
      .text_color(t.dim)
      .hover((s) => s.bg(t.raised).text_color(t.foreground))
      .tooltip(label)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); run(command, { id: tab.id }); })
      .child(svg(icon).size(10));
    const alert = this.attention(t, tab.status, 7);
    return h_flex()
      .id(`${where}-${tab.id}`)
      .relative()
      .h(nested ? 26 : 28)
      .flex_none()
      .px(8)
      .gap(8)
      .rounded(7)
      .items_center()
      .text_size(nested ? 12.5 : 13)
      .text_color(on ? t.accent : settled ? t.dim : t.muted)
      .when(on, (el) => el.bg(t.selected))
      .when(!on, (el) => el.hover((s) => s.bg(t.hover).text_color(t.foreground)))
      .cursor_pointer()
      .on_hover((over, cx) => {
        const next = over ? key : null;
        if (over || this.hovered === key) { if (this.hovered !== next) { this.hovered = next; cx.notify(); } }
      })
      .on_click(() => { run("space.select", { id: space.id }); run("tab.select", { id: tab.id }); showWork(); })
      .on_mouse_down("left", (e) => { if (e.click_count === 2) run("tab.rename", { id: tab.id }); })
      .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 220, height: 320, props: { tab: "tab", target: { id: tab.id, space: space.id } } }))
      .child(div()
        .w(12)
        .flex_none()
        .flex()
        .items_center()
        .child(tab.status === "working"
          ? div().size(6).rounded_full().bg(t.working).loop("opacity", { from: 0.35, to: 1, period: 1300 })
          : div().size(5).rounded_full().bg(tab.status ? t[tab.status] ?? t.dim : on ? t.muted : t.input)))
      .when(!nested, (el) => el.child(this.mark(t, space, colors, 14, `${where}-mark-${tab.id}`)))
      .child(div().flex_1().min_w(0).truncate().child(name))
      .when((this.panesByTab.get(tab.id)?.length ?? 0) > 1, el => el.child(
        div().flex_none().px(4).rounded(5).bg(t.raised).text_size(9).text_color(t.dim)
          .child(`${this.panesByTab.get(tab.id).length} panes`)))
      .when(tab.zoomed, (el) => el.child(div().flex_none().font_family("Geist Mono").text_size(10).text_color(t.dim).child("Z")))
      .when(!nested, (el) => el.child(machineChip(t, space.machine, `${where}-m-${tab.id}`)))
      .when(hovered, (el) => el
        .child(action(tab.settled ? "tab.unsettle" : "tab.settle", I(tab.settled ? "chevron-left" : "archive"),
          tab.settled ? "Restore this session" : "Settle this session"))
        .child(action("tab.close", "mods/pane/close.svg", "Close this session")))
      .when(!hovered, (el) => el.child(div().flex_none().font_family("Geist Mono").text_size(10.5).text_color(t.dim).child(ago(tab.changed_at))))
      .when(Boolean(alert), (el) => el.child(alert));
  }

  sessions(t, compact) {
    if (compact) return div();
    const workstreams = spaces();
    const liveAgentTabs = new Set(agents().map(agent => agent.tab));
    const active = workstreams.find((s) => s.active);
    const lead = this.leads();
    const list = (this.mine && active ? [active] : workstreams)
      .flatMap((space) => (space.tabs ?? []).map((tab) => ({ space, tab })))
      .sort((a, b) => (b.tab.changed_at ?? 0) - (a.tab.changed_at ?? 0));
    const newSession = div()
      .id("sessions-new")
      .size(20)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(5)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip("New session: a terminal or an agent")
      .on_click((_e, cx) => { cx.stop_propagation(); startSession(); })
      .child(svg(I("plus")).size(13));
    const filter = div()
      .id("sessions-filter")
      .size(20)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(5)
      .text_color(this.mine ? t.accent : t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(this.mine ? `Showing ${active?.name ?? "this workstream"}: click for all` : "Showing every workstream: click for this one")
      .on_click((_e, cx) => {
        cx.stop_propagation();
        this.mine = !this.mine;
        localStorage.setItem("neon-custom.mine", this.mine ? "1" : "0");
        cx.notify();
      })
      .child(svg(this.m("filter")).size(13));
    const rows = [this.section(t, this.mine ? "Sessions · This space" : "Sessions · All spaces", "sessions", null,
      h_flex().flex_none().gap(2).items_center().child(filter).child(newSession))];

    const colors = this.colors();
    const line = ({ space, tab }, settled) =>
      this.sessionRow(t, space, tab, { where: "session", nested: false, lead: lead.get(tab.id), colors, settled });

    const groups = new Map(BUCKETS.map((bucket) => [bucket.id, []]));
    const away = [];
    for (const session of list) {
      const { tab, space } = session;
      const live = liveAgentTabs.has(tab.id);
      const settled = !live && tab.settled && !(tab.active && space.active) && tab.status !== "blocked" && tab.status !== "done";
      (settled ? away : groups.get(live ? "today" : bucketOf(tab.changed_at))).push(session);
    }
    for (const group of BUCKETS) {
      const sessions = groups.get(group.id);
      if (!sessions.length) continue;
      rows.push(this.section(t, group.label, group.id, (cx) => this.fold(group.id, cx), null));
      if (!this.folded.has(group.id)) for (const session of sessions) rows.push(line(session, false));
    }
    if (away.length) {
      rows.push(this.section(t, `Settled · ${away.length}`, "settled", (cx) => this.fold("settled", cx), null));
      if (!this.folded.has("settled")) for (const x of away) rows.push(line(x, true));
    }
    return v_flex().children(rows);
  }

  foot(t, compact) {
    const name = home().split(/[\\/]/).filter(Boolean).pop() ?? "you";
    const needing = agents().filter((a) => a.status === "blocked" || a.status === "done").length;
    const gear = div()
      .id("neon-custom-settings")
      .size(26)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(6)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip("Settings")
      .on_click(() => run("app.settings"))
      .child(svg(I("settings")).size(compact ? RAIL_ICON_SIZE : 15))
      .when(Boolean(updates()?.app?.ready), (el) => el.relative().child(div().absolute().top(3).right(3).size(5).rounded_full().bg(t.accent)));
    if (compact) {
      const unfold = div()
        .id("neon-custom-unfold")
        .size(26)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(6)
        .text_size(RAIL_ICON_SIZE)
        .text_color(t.dim)
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .tooltip("Show the sidebar")
        .on_click(toggleRail)
        .child("»");
      return v_flex().size_full().items_center().justify_center().gap(2).pb(4)
        .child(unfold)
        .child(gear);
    }
    return h_flex().size_full().items_center().gap(9).px(10)
      .child(div().size(22).flex_none().rounded_full().bg(t.accent).flex().items_center().justify_center()
        .text_size(11).font_semibold().text_color("#08120f").child([...name][0]?.toUpperCase() ?? "?"))
      .child(div().flex_1().min_w(0).truncate().text_size(13).text_color(t.muted).child(name))
      .when(needing > 0, (el) => el.child(div().size(6).flex_none().rounded_full().bg(t.accent)))
      .child(gear);
  }

  // The + popup: this computer first, then each machine. One that isn't
  // answering stays listed but can't be picked.
  machineMenu(t) {
    const overlay = props()?.overlay;
    const list = [...machines()].sort((a, b) => (a.name === null ? -1 : b.name === null ? 1 : 0));
    return v_flex().size_full().bg(t.popover).p(5).gap(1)
      .child(div().px(8).pt(3).pb(5).text_size(10.5).font_medium().text_color("#ff3bd4").child("NEW WORKSTREAM ON"))
      .children(list.map((m) => {
        const ready = m.name === null || m.layout === "ready";
        const note = m.name === null ? "this computer" : m.layout === "loading" ? "connecting" : ready ? null : "not answering";
        return h_flex()
          .id(`new-on-${m.name ?? "local"}`)
          .h(30)
          .flex_none()
          .px(8)
          .gap(9)
          .rounded(6)
          .items_center()
          .text_size(13)
          .text_color(ready ? t.foreground : t.dim)
          .when(ready, (el) => el.cursor_pointer().hover((s) => s.bg(t.hover))
            .on_click(() => { closeOverlay(overlay); run("space.new", { machine: m.name ?? "" }); }))
          .child(machineChip(t, m.name))
          .child(div().flex_1().min_w(0).truncate().child(machineInfo(m.name).host))
          .when(Boolean(note), (el) => el.child(div().flex_none().text_size(10.5)
            .text_color(ready || m.layout === "loading" ? t.dim : t.blocked).child(note)));
      }));
  }

  render() {
    const t = theme();
    const compact = rail();
    const part = props()?.part ?? "list";
    if (part === "machines") return this.machineMenu(t);
    if (part === "head") return v_flex().size_full().bg(t.chrome).child(this.head(t, compact));
    if (part === "nav") return v_flex().size_full().bg(t.chrome).px(compact ? 0 : 8).child(this.navPart(t, compact));
    if (part === "foot") return v_flex().size_full().bg(t.chrome).child(this.foot(t, compact));
    this.panesByTab = new Map();
    for (const pane of panes()) {
      if (!this.panesByTab.has(pane.tab)) this.panesByTab.set(pane.tab, []);
      this.panesByTab.get(pane.tab).push(pane);
    }
    return v_flex()
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .px(compact ? 0 : 8)
      .pb(8)
      .child(v_flex()
        .id("neon-custom-sidebar-scroll")
        .flex_1()
        .min_h(0)
        .on_mouse_up("left", (_e, cx) => {
          if (this.pressed === null) return;
          this.pressed = null;
          this.over = null;
          cx.notify();
        })
        .overflow_y_scrollbar()
        .children([
          this.workstreams(t, compact),
          this.sessions(t, compact),
        ]));
  }
}
