(() => {
  const n = "MOCKAPE_TV_MARKER",
    e = "MOCKAPE_UPDATE_POSITION",
    r = "MOCKAPE_UPDATE_STRATEGIES",
    i = 1e9;
  let h = {
    tokenAddress: null,
    avgEntryPrice: null,
    avgExitPrice: null,
    lineIds: { entry: null, exit: null, tp: [], sl: [] },
  };
  function p(t) {
    try {
      if ("padre" === t) {
        const r = window.tvWidget;
        if (r?._iFrame) {
          const a = r._iFrame.contentWindow.chartWidget;
          if (a?._model) {
            let e;
            try {
              const l = a._model.mainSeries().bars().last();
              e = l ? Math.floor(l.timeMs / 1e3) : Math.floor(Date.now() / 1e3);
            } catch (t) {
              e = Math.floor(Date.now() / 1e3);
            }
            return { widget: r, chartWidget: a, time: e };
          }
        }
      } else {
        const o = document.querySelectorAll("iframe");
        function e(t) {
          const e = t.getBoundingClientRect();
          if (e.width && e.height) {
            const r = [
              [e.left + 0.25 * e.width, e.top + 0.5 * e.height],
              [e.left + 0.5 * e.width, e.top + 0.5 * e.height],
              [e.left + 0.75 * e.width, e.top + 0.5 * e.height],
            ];
            for (var [i, n] of r) {
              const a = Math.max(1, Math.min(window.innerWidth - 1, i)),
                l = Math.max(1, Math.min(window.innerHeight - 1, n));
              if (document.elementFromPoint(a, l) === t) return !0;
            }
          }
          return !1;
        }
        for (var i of [!0, !1])
          for (var n of o)
            try {
              if (!i || e(n)) {
                const s = n.contentWindow;
                if (s) {
                  const c = s.tradingViewApi || s.tvWidget;
                  if (c && "function" == typeof c.activeChart) {
                    const d = s.chartWidget;
                    if (d?._model) {
                      let e;
                      try {
                        const u = d._model.mainSeries().bars().last();
                        e = u
                          ? Math.floor(u.timeMs / 1e3)
                          : Math.floor(Date.now() / 1e3);
                      } catch (t) {
                        e = Math.floor(Date.now() / 1e3);
                      }
                      return {
                        widget: c,
                        chartWidget: d,
                        time: e,
                        contentWindow: s,
                      };
                    }
                  }
                  if (s.studyMarket?._chartWidgetCollection?.getAll?.()?.[0]) {
                    const f = s.studyMarket._chartWidgetCollection.getAll()[0],
                      h = Math.floor(Date.now() / 1e3);
                    return {
                      widget: {
                        activeChart: () =>
                          f.activeChartWidget ? f.activeChartWidget.value() : f,
                      },
                      chartWidget: f,
                      time: h,
                      contentWindow: s,
                    };
                  }
                }
              }
            } catch (t) {
              continue;
            }
      }
    } catch (t) {}
    return null;
  }
  function w(t, e) {
    return "padre" === e ? t / i : t;
  }
  async function I(t) {
    return (t && t.then, t);
  }
  function g(t, e) {
    if (e)
      try {
        t.removeEntity(e);
      } catch (t) {}
  }
  async function y(t, e, i, n) {
    return I(
      t.createShape(e, {
        shape: "horizontal_line",
        lock: !0,
        disableSelection: !0,
        disableSave: !0,
        overrides: {
          linecolor: i,
          linewidth: 2,
          linestyle: 2,
          showLabel: !0,
          textcolor: i,
          fontsize: 10,
          horzLabelsAlign: "right",
          vertLabelsAlign: "bottom",
        },
        text: n,
      }),
    );
  }
  async function a(t, e, i, n) {
    if (null === e) {
      const r = p(t);
      if (r)
        try {
          const a = r.widget.activeChart();
          (g(a, h.lineIds.entry),
            g(a, h.lineIds.exit),
            h.lineIds.tp.forEach((t) => g(a, t)),
            h.lineIds.sl.forEach((t) => g(a, t)));
        } catch (t) {}
      return (
        (h = {
          tokenAddress: null,
          avgEntryPrice: null,
          avgExitPrice: null,
          lineIds: { entry: null, exit: null, tp: [], sl: [] },
        }),
        !1
      );
    }
    const r = p(t);
    if (!r) return !1;
    try {
      const { widget: l, time: o } = r,
        s = l.activeChart();
      if (
        (h.tokenAddress !== e &&
          (g(s, h.lineIds.entry),
          g(s, h.lineIds.exit),
          h.lineIds.tp.forEach((t) => g(s, t)),
          h.lineIds.sl.forEach((t) => g(s, t)),
          (h = {
            tokenAddress: e,
            avgEntryPrice: null,
            avgExitPrice: null,
            lineIds: { entry: null, exit: null, tp: [], sl: [] },
          })),
        i && 0 < i)
      ) {
        if (h.avgEntryPrice !== i || !h.lineIds.entry) {
          g(s, h.lineIds.entry);
          const c = w(i, t),
            d = { time: o, price: c };
          ((h.lineIds.entry = await y(s, d, "#437a2d", "Avg Entry")),
            (h.avgEntryPrice = i));
        }
      } else
        h.lineIds.entry &&
          (g(s, h.lineIds.entry),
          (h.lineIds.entry = null),
          (h.avgEntryPrice = null));
      if (n && 0 < n) {
        if (h.avgExitPrice !== n || !h.lineIds.exit) {
          g(s, h.lineIds.exit);
          const u = w(n, t),
            f = { time: o, price: u };
          ((h.lineIds.exit = await y(s, f, "#aa5139", "Avg Exit")),
            (h.avgExitPrice = n));
        }
      } else
        h.lineIds.exit &&
          (g(s, h.lineIds.exit),
          (h.lineIds.exit = null),
          (h.avgExitPrice = null));
      return !0;
    } catch (t) {
      return !1;
    }
  }
  async function l(t, e, i) {
    if (null === e) return !1;
    const n = p(t);
    if (!n) return !1;
    try {
      const { widget: a, time: l } = n,
        o = a.activeChart();
      if (h.tokenAddress !== e) return !1;
      if (
        (h.lineIds.tp.forEach((t) => g(o, t)),
        h.lineIds.sl.forEach((t) => g(o, t)),
        (h.lineIds.tp = []),
        (h.lineIds.sl = []),
        i && 0 !== i.length)
      )
        for (var r of i)
          if (r.targetMcap && !(r.targetMcap <= 0)) {
            const s = w(r.targetMcap, t),
              c = { time: l, price: s };
            if ("take-profit" === r.type) {
              const d = await y(o, c, "#aa5139", "TP");
              h.lineIds.tp.push(d);
            } else if ("stop-loss" === r.type) {
              const u = await y(o, c, "#dc3545", "SL");
              h.lineIds.sl.push(u);
            } else if ("trailing-stop" === r.type) {
              const f = await y(o, c, "#ffc107", "TSL");
              h.lineIds.sl.push(f);
            }
          }
      return !0;
    } catch (t) {
      return !1;
    }
  }
  async function o(e, i, n, r) {
    const a = 5,
      l = 400,
      o = "B" === r ? "arrow_up" : "arrow_down";
    for (let t = 0; t < a; t++) {
      0 < t && (await new Promise((t) => setTimeout(t, l)));
      const s = p(e);
      if (s)
        try {
          const { widget: c, time: d, chartWidget: u } = s,
            f = c.activeChart(),
            h = w(i, e),
            g = { time: d, price: h },
            y = await I(
              f.createMultipointShape([g], {
                shape: o,
                text: r,
                overrides: {
                  color: n,
                  backgroundColor: n,
                  textColor: "white",
                  transparency: 0,
                  fontsize: 14,
                  bold: !0,
                },
              }),
            );
          if (y) {
            try {
              u?._model?.lightUpdate?.();
            } catch (t) {}
            return { backgroundId: null, textId: y };
          }
        } catch (t) {}
    }
    return null;
  }
  window.addEventListener("message", async (t) => {
    if (t.source === window) {
      const i = t.data;
      if (i)
        if (i.type === n) {
          let t = null,
            e = !1;
          try {
            "DRAW" === i.action &&
              ((t = await o(
                i.platform,
                i.payload.marketcap,
                i.payload.color,
                i.payload.text,
              )),
              (e = !!t?.textId));
          } catch (t) {}
          try {
            window.postMessage(
              {
                type: n + "_RESPONSE",
                requestId: i.requestId,
                success: e,
                result: t
                  ? {
                      backgroundId: t.backgroundId ?? null,
                      textId: t.textId ?? null,
                    }
                  : null,
              },
              "*",
            );
          } catch (t) {
            window.postMessage(
              {
                type: n + "_RESPONSE",
                requestId: i.requestId,
                success: !1,
                result: null,
              },
              "*",
            );
          }
        } else if (i.type === e)
          try {
            await a(
              i.platform,
              i.payload.tokenAddress,
              i.payload.avgEntryPrice,
              i.payload.avgExitPrice,
            );
          } catch (t) {}
        else if (i.type === r)
          try {
            await l(i.platform, i.payload.tokenAddress, i.payload.strategies);
          } catch (t) {}
    }
  });
})();
