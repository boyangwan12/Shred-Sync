#!/usr/bin/env python3
"""Generate a 2-page shredding progress report PDF using local API data."""
import json
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import Rectangle, Wedge

API_BASE = "http://localhost:3000"
REPORT_DATE = sys.argv[1] if len(sys.argv) > 1 else "2026-04-14"
OUT_PATH = Path(__file__).parent / f"shredding-progress-{REPORT_DATE}.pdf"

# Dark theme palette matching the app
BG = "#0a0a0a"
SURFACE = "#1a1a1a"
TEAL = "#1D9E75"
AMBER = "#EF9F27"
RED = "#E24B4A"
BLUE = "#378ADD"
MUTED = "#a3a3a3"
FG = "#ededed"
BORDER = "#333333"

plt.rcParams.update({
    "figure.facecolor": BG,
    "axes.facecolor": SURFACE,
    "axes.edgecolor": BORDER,
    "axes.labelcolor": MUTED,
    "axes.titlecolor": FG,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "grid.color": "#222",
    "font.family": "sans-serif",
    "font.size": 9,
    "text.color": FG,
})


def fetch(path):
    with urllib.request.urlopen(f"{API_BASE}{path}") as r:
        return json.load(r)


def fmt(v, decimals=1, suffix=""):
    if v is None:
        return "—"
    if isinstance(v, (int, float)):
        return f"{v:.{decimals}f}{suffix}" if decimals else f"{int(v)}{suffix}"
    return str(v)


def banner(ax, color, title, subtitle):
    ax.set_facecolor(color + "22")
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_color(color)
        spine.set_linewidth(1.5)
    ax.text(0.02, 0.70, title, color=color, fontsize=16, fontweight="bold", transform=ax.transAxes)
    ax.text(0.02, 0.25, subtitle, color=FG, fontsize=10, transform=ax.transAxes)


def stat(ax, label, value, sub=None, color=FG):
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_color(BORDER)
    ax.set_facecolor(SURFACE)
    ax.text(0.5, 0.78, label, color=MUTED, fontsize=7, ha="center", transform=ax.transAxes,
            fontweight="bold")
    ax.text(0.5, 0.45, value, color=color, fontsize=16, fontweight="bold", ha="center", transform=ax.transAxes)
    if sub:
        ax.text(0.5, 0.15, sub, color=MUTED, fontsize=7, ha="center", transform=ax.transAxes)


def cortisol_dial(ax, score):
    """Half-moon gauge: teal [0,3) amber [3,6) red [6,10]."""
    ax.set_xlim(-1.15, 1.15)
    ax.set_ylim(-0.2, 1.25)
    ax.set_aspect("equal")
    ax.axis("off")
    # bands
    ax.add_patch(Wedge((0, 0), 1.0, 126, 180, width=0.22, color=TEAL))
    ax.add_patch(Wedge((0, 0), 1.0, 72, 126, width=0.22, color=AMBER))
    ax.add_patch(Wedge((0, 0), 1.0, 0, 72, width=0.22, color=RED))
    # needle
    angle = 180 - (score / 10.0) * 180
    rad = np.radians(angle)
    ax.plot([0, 0.85 * np.cos(rad)], [0, 0.85 * np.sin(rad)], color=FG, linewidth=2.5)
    ax.add_patch(plt.Circle((0, 0), 0.045, color=FG))
    # label
    ax.text(0, -0.12, f"{score:.1f}", color=FG, fontsize=24, fontweight="bold", ha="center")
    ax.text(0, -0.15, "CORTISOL LOAD (0–10)", color=MUTED, fontsize=6.5, ha="center", va="top",
            fontweight="bold")


def glycogen_chart(ax, logs, title="Glycogen across cycle"):
    dates = [l["date"][5:] for l in logs]
    liver = [l.get("liverGlycogenPct") for l in logs]
    muscle = [l.get("muscleGlycogenPct") for l in logs]
    fatburn = [l.get("fatBurningPct") for l in logs]
    x = np.arange(len(dates))
    ax.plot(x, liver, marker="o", color=TEAL, linewidth=2, markersize=5, label="Liver glycogen %")
    ax.plot(x, muscle, marker="o", color=BLUE, linewidth=2, markersize=5, label="Muscle glycogen %")
    ax.plot(x, fatburn, marker="s", color=AMBER, linewidth=1.5, markersize=4,
            linestyle="--", label="Fat-burn %")
    ax.set_ylim(0, 100)
    ax.set_xticks(x)
    ax.set_xticklabels(dates, fontsize=7, rotation=30)
    ax.set_ylabel("%", fontsize=8)
    ax.set_title(title, color=FG, fontsize=10, fontweight="bold", loc="left")
    ax.grid(True, alpha=0.15)
    ax.legend(loc="upper right", fontsize=7, framealpha=0.6, facecolor=SURFACE, edgecolor=BORDER)
    for spine in ax.spines.values():
        spine.set_color(BORDER)


def weight_chart(ax, logs, title="Weight trend"):
    dates = [l["date"][5:] for l in logs if l.get("weightLbs") is not None]
    weights = [l["weightLbs"] for l in logs if l.get("weightLbs") is not None]
    x = np.arange(len(dates))
    ax.plot(x, weights, marker="o", color=TEAL, linewidth=2.2, markersize=6)
    ax.fill_between(x, weights, min(weights) - 0.5 if weights else 0, color=TEAL, alpha=0.08)
    for xi, w in zip(x, weights):
        ax.annotate(f"{w:.1f}", (xi, w), textcoords="offset points", xytext=(0, 7), ha="center",
                    fontsize=7, color=MUTED)
    ax.set_xticks(x)
    ax.set_xticklabels(dates, fontsize=7, rotation=30)
    ax.set_ylabel("lb", fontsize=8)
    ax.set_title(title, color=FG, fontsize=10, fontweight="bold", loc="left")
    ax.grid(True, alpha=0.15)
    for spine in ax.spines.values():
        spine.set_color(BORDER)


def adherence_bars(ax, logs, title="Macro adherence (actual / target)"):
    labels, p_actuals, p_targets = [], [], []
    c_actuals, c_targets = [], []
    f_actuals, f_targets = [], []
    for l in logs:
        if l.get("proteinActual") is None:
            continue
        labels.append(l["date"][5:])
        p_actuals.append(l["proteinActual"] or 0)
        p_targets.append(l["proteinTarget"] or 0)
        c_actuals.append(l["carbsActual"] or 0)
        c_targets.append(l["carbsTarget"] or 0)
        f_actuals.append(l["fatActual"] or 0)
        f_targets.append(l["fatTarget"] or 0)
    x = np.arange(len(labels))
    w = 0.26
    ax.bar(x - w, p_actuals, w, color=TEAL, label="Protein")
    ax.bar(x, c_actuals, w, color=AMBER, label="Carbs")
    ax.bar(x + w, f_actuals, w, color=RED, label="Fat")
    # target markers (thin lines at target height)
    for xi, pt, ct, ft in zip(x, p_targets, c_targets, f_targets):
        ax.plot([xi - w - 0.12, xi - w + 0.12], [pt, pt], color=FG, linewidth=1.4)
        ax.plot([xi - 0.12, xi + 0.12], [ct, ct], color=FG, linewidth=1.4)
        ax.plot([xi + w - 0.12, xi + w + 0.12], [ft, ft], color=FG, linewidth=1.4)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=7, rotation=30)
    ax.set_ylabel("grams", fontsize=8)
    ax.set_title(title + "  (white ticks = target)", color=FG, fontsize=10, fontweight="bold", loc="left")
    ax.legend(loc="upper right", fontsize=7, framealpha=0.6, facecolor=SURFACE, edgecolor=BORDER)
    ax.grid(True, alpha=0.15, axis="y")
    for spine in ax.spines.values():
        spine.set_color(BORDER)


def cortisol_signal_table(ax, signals, title="Cortisol signals"):
    ax.axis("off")
    ax.set_title(title, color=FG, fontsize=10, fontweight="bold", loc="left", x=0)
    flag_color = {"ok": TEAL, "yellow": AMBER, "red": RED, "unknown": MUTED}
    pretty = {"hrv": "HRV", "tst": "Total sleep", "rhr": "Resting HR", "ea": "Energy avail.",
              "deepFraction": "Deep fraction"}
    cols = ["Signal", "Today", "Baseline", "Flag"]
    col_x = [0.02, 0.30, 0.55, 0.85]
    for cx, col in zip(col_x, cols):
        ax.text(cx, 0.90, col, color=MUTED, fontsize=7, fontweight="bold",
                transform=ax.transAxes)
    for i, s in enumerate(signals):
        y = 0.80 - i * 0.14
        col = flag_color[s["flag"]]
        name = pretty.get(s["name"], s["name"])
        if not s.get("counted"):
            name += " (info)"
        ax.text(col_x[0], y, name, color=FG, fontsize=8, transform=ax.transAxes)
        val = s.get("value")
        ax.text(col_x[1], y, fmt(val, 1), color=FG, fontsize=8, transform=ax.transAxes)
        base = s.get("baseline")
        ax.text(col_x[2], y, fmt(base, 1), color=MUTED, fontsize=8, transform=ax.transAxes)
        ax.add_patch(plt.Circle((col_x[3] + 0.02, y + 0.015), 0.016, color=col,
                                transform=ax.transAxes))
        ax.text(col_x[3] + 0.06, y, s["flag"], color=col, fontsize=8, fontweight="bold",
                transform=ax.transAxes)


def page1(pdf, report_date, cortisol, cycle, logs):
    fig = plt.figure(figsize=(8.5, 11))
    fig.patch.set_facecolor(BG)
    gs = fig.add_gridspec(5, 4, hspace=0.55, wspace=0.3,
                          left=0.05, right=0.96, top=0.94, bottom=0.04,
                          height_ratios=[0.6, 0.8, 1.6, 1.6, 0.4])

    # Title
    fig.text(0.05, 0.96, "ShredSync — Progress Report",
             fontsize=18, fontweight="bold", color=FG)
    fig.text(0.05, 0.948, f"{report_date} · Pull day / low carb · Cycle 2",
             fontsize=9, color=MUTED)
    fig.text(0.96, 0.958, datetime.now().strftime("%Y-%m-%d %H:%M"),
             fontsize=7, color=MUTED, ha="right")

    # Row 0: Banner (full width)
    bax = fig.add_subplot(gs[0, :])
    verdict_color = {"stay": TEAL, "notice": AMBER, "adjust": RED}[cortisol["verdict"]]
    bax.set_xticks([]); bax.set_yticks([])
    bax.set_facecolor(verdict_color + "18")
    for spine in bax.spines.values():
        spine.set_color(verdict_color); spine.set_linewidth(1.5)
    headline = {"stay": "On track — stay the course",
                "notice": "Notice — one signal flagged",
                "adjust": "Adjust — stacked reds detected"}[cortisol["verdict"]]
    sub = (f"Cortisol load {cortisol['score']}/10 · {cortisol['stackedReds']} red signals · "
           f"pull day at {logs[-1].get('weightLbs', '—')} lb, "
           f"{logs[-1].get('proteinActual', '—')}g P / {logs[-1].get('carbsActual', '—')}g C / "
           f"{logs[-1].get('fatActual', '—')}g F.")
    bax.text(0.02, 0.62, headline, color=verdict_color, fontsize=15, fontweight="bold",
             transform=bax.transAxes)
    bax.text(0.02, 0.22, sub, color=FG, fontsize=9, transform=bax.transAxes)

    # Row 1: 4 stat cards
    weight_cur = logs[-1].get("weightLbs")
    weight_first = next((l["weightLbs"] for l in logs if l.get("weightLbs")), None)
    dweight = (weight_cur - weight_first) if weight_cur and weight_first else None
    weights = [l.get("weightLbs") for l in logs if l.get("weightLbs")]
    weekly_rate = None
    if len(weights) >= 4:
        weekly_rate = (weights[0] - weights[-1]) / max(1, (len(weights) - 1)) * 7

    stat(fig.add_subplot(gs[1, 0]), "WEIGHT",
         f"{weight_cur:.1f} lb" if weight_cur else "—",
         f"{dweight:+.1f} vs start" if dweight is not None else "", color=TEAL)
    stat(fig.add_subplot(gs[1, 1]), "7-DAY LOSS",
         f"{weekly_rate:.2f} lb/wk" if weekly_rate else "—",
         "target 0.3–1.2", color=TEAL if (weekly_rate and 0.3 <= weekly_rate <= 1.2) else AMBER)
    stat(fig.add_subplot(gs[1, 2]), "CORTISOL SCORE",
         f"{cortisol['score']}/10",
         f"{cortisol['verdict']}", color=verdict_color)
    stat(fig.add_subplot(gs[1, 3]), "BODY-FAT EST.",
         "~13.0%", "down from 14.3%", color=TEAL)

    # Row 2: Weight chart (left 2 cols)
    weight_chart(fig.add_subplot(gs[2, :2]), logs, title="Morning weight · Apr 7 → today")
    # Row 2: Cortisol dial + signal table (right 2 cols)
    dial_ax = fig.add_subplot(gs[2, 2])
    cortisol_dial(dial_ax, cortisol["score"])
    cortisol_signal_table(fig.add_subplot(gs[2, 3]), cortisol["signals"])

    # Row 3: Glycogen chart full width
    glycogen_chart(fig.add_subplot(gs[3, :]), logs,
                   title="Glycogen + fat-burning across cycle (estimated)")

    # Row 4: Footer
    fax = fig.add_subplot(gs[4, :])
    fax.axis("off")
    fax.text(0.5, 0.3,
             "Page 1 of 2 · Generated from shredding-dashboard local data · ShredSync",
             color=MUTED, fontsize=7, ha="center", transform=fax.transAxes)

    pdf.savefig(fig, facecolor=BG)
    plt.close(fig)


def page2(pdf, report_date, cortisol, cycle, logs):
    fig = plt.figure(figsize=(8.5, 11))
    fig.patch.set_facecolor(BG)
    gs = fig.add_gridspec(5, 2, hspace=0.55, wspace=0.3,
                          left=0.05, right=0.96, top=0.94, bottom=0.04,
                          height_ratios=[0.4, 1.4, 1.4, 1.4, 0.3])

    # Title
    fig.text(0.05, 0.955, "Analysis & coaching notes", fontsize=16, fontweight="bold", color=FG)
    fig.text(0.05, 0.94, "What the data is saying", fontsize=8, color=MUTED)

    # Row 0: spacer
    fig.add_subplot(gs[0, :]).axis("off")

    # Row 1: Adherence bars (left) + cycle grade (right)
    adherence_bars(fig.add_subplot(gs[1, 0]), logs)
    grade_ax = fig.add_subplot(gs[1, 1])
    grade = cycle.get("grade", {})
    grade_ax.axis("off")
    grade_color = {"A": TEAL, "B": TEAL, "C": AMBER, "D": RED, "incomplete": MUTED}[
        grade.get("letter", "incomplete")]
    grade_ax.text(0.0, 0.95, f"Cycle {cycle['currentCycle']['cycleNumber']} grade",
                  color=MUTED, fontsize=8, fontweight="bold", transform=grade_ax.transAxes)
    grade_ax.text(0.0, 0.60, grade.get("letter", "—") if grade.get("letter") != "incomplete" else "—",
                  color=grade_color, fontsize=48, fontweight="bold", transform=grade_ax.transAxes)
    grade_ax.text(0.0, 0.48, "Carb targets:", color=MUTED, fontsize=7, transform=grade_ax.transAxes)
    grade_ax.text(0.0, 0.40, grade.get("carbTargetsHit", ""), color=FG, fontsize=7,
                  transform=grade_ax.transAxes, wrap=True)
    grade_ax.text(0.0, 0.30, "V-shape:", color=MUTED, fontsize=7, transform=grade_ax.transAxes)
    v = grade.get("vShapeFormed", "")
    grade_ax.text(0.0, 0.22, v[:80] + ("…" if len(v) > 80 else ""), color=FG, fontsize=7,
                  transform=grade_ax.transAxes)
    grade_ax.text(0.0, 0.12, "Refeed timing:", color=MUTED, fontsize=7, transform=grade_ax.transAxes)
    r = grade.get("refeedTimed", "")
    grade_ax.text(0.0, 0.04, r[:80] + ("…" if len(r) > 80 else ""), color=FG, fontsize=7,
                  transform=grade_ax.transAxes)

    # Row 2: Weight-honest breakdown (full width text box)
    wb = cycle.get("weightBreakdown", {})
    wax = fig.add_subplot(gs[2, :])
    wax.set_facecolor(SURFACE)
    wax.set_xticks([]); wax.set_yticks([])
    for spine in wax.spines.values():
        spine.set_color(BORDER)
    wax.text(0.02, 0.90, "Weight, read honestly", color=FG, fontsize=11, fontweight="bold",
             transform=wax.transAxes)
    if wb.get("scaleWeight") and wb.get("estimatedLeanWeight"):
        gw = wb.get("glycogenWaterLbs") or 0
        wax.text(0.02, 0.72, f"Scale", color=MUTED, fontsize=7, fontweight="bold",
                 transform=wax.transAxes)
        wax.text(0.02, 0.52, f"{wb['scaleWeight']:.1f} lb", color=FG, fontsize=18,
                 fontweight="bold", transform=wax.transAxes)

        wax.text(0.30, 0.72, f"Glycogen water", color=MUTED, fontsize=7, fontweight="bold",
                 transform=wax.transAxes)
        wax.text(0.30, 0.52, f"−{gw:.1f} lb", color=BLUE, fontsize=18, fontweight="bold",
                 transform=wax.transAxes)

        wax.text(0.60, 0.72, f"Estimated actual body", color=MUTED, fontsize=7,
                 fontweight="bold", transform=wax.transAxes)
        wax.text(0.60, 0.52, f"~{wb['estimatedLeanWeight']:.1f} lb", color=TEAL, fontsize=18,
                 fontweight="bold", transform=wax.transAxes)

    expl = wb.get("explanation", "").replace("**", "")
    trend = wb.get("trendMessage", "")
    wax.text(0.02, 0.30, expl[:180] + ("…" if len(expl) > 180 else ""), color=FG, fontsize=8,
             transform=wax.transAxes, wrap=True)
    wax.text(0.02, 0.10, trend[:180] + ("…" if len(trend) > 180 else ""), color=MUTED, fontsize=7,
             transform=wax.transAxes, wrap=True)

    # Row 3: Coaching paragraph
    cax = fig.add_subplot(gs[3, :])
    cax.set_facecolor(SURFACE)
    cax.set_xticks([]); cax.set_yticks([])
    for spine in cax.spines.values():
        spine.set_color(BORDER)
    cax.text(0.02, 0.90, "Coaching notes", color=FG, fontsize=11, fontweight="bold",
             transform=cax.transAxes)
    coaching = cycle.get("coaching", "")
    # Wrap to ~100 chars per line
    import textwrap
    lines = textwrap.wrap(coaching, width=105)[:7]
    for i, line in enumerate(lines):
        cax.text(0.02, 0.75 - i * 0.10, line, color=MUTED, fontsize=8, transform=cax.transAxes)

    # Footer
    fax = fig.add_subplot(gs[4, :])
    fax.axis("off")
    fax.text(0.5, 0.3,
             f"Page 2 of 2 · {report_date} · ShredSync progress snapshot",
             color=MUTED, fontsize=7, ha="center", transform=fax.transAxes)

    pdf.savefig(fig, facecolor=BG)
    plt.close(fig)


def main():
    cortisol = fetch(f"/api/cortisol?date={REPORT_DATE}")
    cycle = fetch(f"/api/cycle-analysis?date={REPORT_DATE}&includeCortisol=true")
    logs = fetch(f"/api/logs?from=2026-04-07&to={REPORT_DATE}")

    with PdfPages(OUT_PATH) as pdf:
        page1(pdf, REPORT_DATE, cortisol, cycle, logs)
        page2(pdf, REPORT_DATE, cortisol, cycle, logs)
        d = pdf.infodict()
        d["Title"] = f"Shredding Progress — {REPORT_DATE}"
        d["Author"] = "ShredSync"
        d["Subject"] = "Daily progress snapshot"
        d["CreationDate"] = datetime.now()

    print(f"Wrote {OUT_PATH}")
    print(f"Size: {OUT_PATH.stat().st_size} bytes")


if __name__ == "__main__":
    main()
