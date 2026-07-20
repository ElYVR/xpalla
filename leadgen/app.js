// LEADGEN frontend source. Rebuild the committed app.js after editing:
//   npx --yes -p @babel/core -p @babel/cli -p @babel/preset-react \
//     babel --presets @babel/preset-react app.jsx -o app.js

const {
  useState,
  useEffect,
  useRef
} = React;

/* ---------- API client ---------- */
const API = {
  async authState() {
    const r = await fetch("/api/auth-state");
    return r.json();
  },
  async setup(password) {
    const r = await fetch("/api/setup", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        password
      })
    });
    return {
      ok: r.ok,
      data: await r.json().catch(() => ({}))
    };
  },
  async login(password) {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        password
      })
    });
    return {
      ok: r.ok
    };
  },
  async logout() {
    await fetch("/api/logout", {
      method: "POST"
    });
  },
  async status() {
    const r = await fetch("/api/status");
    return r.ok ? r.json() : null;
  },
  async settings() {
    const r = await fetch("/api/settings");
    return r.ok ? (await r.json()).settings : null;
  },
  async saveSettings(s) {
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(s)
    });
    return r.ok ? (await r.json()).settings : null;
  },
  async password(current, next) {
    const r = await fetch("/api/password", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        current,
        next
      })
    });
    return {
      ok: r.ok,
      data: await r.json().catch(() => ({}))
    };
  },
  async leads() {
    const r = await fetch("/api/leads");
    return r.ok ? (await r.json()).leads || [] : [];
  },
  async addLead(l) {
    const r = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(l)
    });
    return r.ok ? (await r.json()).lead : null;
  },
  async patchLead(id, patch) {
    const r = await fetch("/api/leads/" + id, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(patch)
    });
    return r.ok ? (await r.json()).lead : null;
  },
  async delLead(id) {
    await fetch("/api/leads/" + id, {
      method: "DELETE"
    });
  },
  async addActivity(id, type, text) {
    const r = await fetch("/api/leads/" + id + "/activity", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type,
        text
      })
    });
    return r.ok ? (await r.json()).lead : null;
  },
  async parse(raw) {
    const r = await fetch("/api/import/parse", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        raw
      })
    });
    return r.ok ? r.json() : {
      candidates: [],
      warnings: ["Parse failed"]
    };
  },
  async score(candidates) {
    const r = await fetch("/api/import/score", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        candidates
      })
    });
    return r.ok ? r.json() : null;
  },
  async commit(candidates, sourceDetail) {
    const r = await fetch("/api/import/commit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        candidates,
        sourceDetail
      })
    });
    return r.ok ? r.json() : null;
  },
  async outreach(id) {
    const r = await fetch("/api/outreach/" + id, {
      method: "POST"
    });
    return r.ok ? (await r.json()).outreach : null;
  }
};

/* ---------- helpers ---------- */
const STAGES = [{
  key: "new",
  label: "New",
  color: "#8A8894"
}, {
  key: "contacted",
  label: "Contacted",
  color: "#E9A13B"
}, {
  key: "conversation",
  label: "In conversation",
  color: "#E85D3D"
}, {
  key: "call_booked",
  label: "Call booked",
  color: "#5B6ABF"
}, {
  key: "client",
  label: "Client",
  color: "#2E7D5B"
}, {
  key: "not_now",
  label: "Not now",
  color: "#C3C0B6"
}];
const stageOf = k => STAGES.find(s => s.key === k) || STAGES[0];
const today = () => new Date().toLocaleDateString("en-CA");
function addDaysStr(dateStr, n) {
  const d = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}
function dueClass(d) {
  if (!d) return "";
  const t = today();
  return d < t ? "overdue" : d === t ? "today" : "";
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  if (s < 86400 * 7) return Math.round(s / 86400) + "d ago";
  return fmtDate(iso);
}
let _setToast = null;
function toast(t) {
  _setToast && _setToast(t);
}
function copy(t) {
  if (navigator.clipboard) navigator.clipboard.writeText(t || "");
  toast("Copied to clipboard");
}
function Loading() {
  return /*#__PURE__*/React.createElement("span", {
    className: "loading"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null));
}
function TierBadge({
  tier
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "tier " + (tier || "none")
  }, tier || "–");
}

/* ============================================================
   AUTH SCREENS
   ============================================================ */
function SetupScreen({
  onDone
}) {
  const [pw, setPw] = useState(""),
    [pw2, setPw2] = useState(""),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Password needs at least 8 characters.");
    if (pw !== pw2) return setErr("Passwords don't match.");
    setBusy(true);
    const r = await API.setup(pw);
    setBusy(false);
    if (r.ok) onDone();else setErr(r.data.error === "already_setup" ? "Already set up — reload and log in." : "Setup failed, try again.");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "authwrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "authcard fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "disp",
    style: {
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 4
    }
  }, "LEAD", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--spark)"
    }
  }, "GEN")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: "var(--muted)",
      marginBottom: 22
    }
  }, "Welcome! Create your password to get started — this is a single-user app, just for you."), err && /*#__PURE__*/React.createElement("div", {
    className: "autherr"
  }, err), /*#__PURE__*/React.createElement("form", {
    onSubmit: go
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Password (min 8 characters)"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "password",
    value: pw,
    onChange: e => setPw(e.target.value),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Confirm password"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "password",
    value: pw2,
    onChange: e => setPw2(e.target.value)
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: "100%",
      justifyContent: "center"
    },
    disabled: busy
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : "Create & enter"))));
}
function LoginScreen({
  onDone
}) {
  const [pw, setPw] = useState(""),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault();
    setBusy(true);
    const r = await API.login(pw);
    setBusy(false);
    if (r.ok) onDone();else setErr("Wrong password.");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "authwrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "authcard fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "disp",
    style: {
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 4
    }
  }, "LEAD", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--spark)"
    }
  }, "GEN")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: "var(--muted)",
      marginBottom: 22
    }
  }, "Superpowers With AI · lead generation CRM"), err && /*#__PURE__*/React.createElement("div", {
    className: "autherr"
  }, err), /*#__PURE__*/React.createElement("form", {
    onSubmit: go
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Password"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "password",
    value: pw,
    onChange: e => setPw(e.target.value),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: "100%",
      justifyContent: "center"
    },
    disabled: busy
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : "Log in"))));
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({
  leads,
  openLead,
  goTab
}) {
  const counts = {};
  STAGES.forEach(s => counts[s.key] = 0);
  leads.forEach(l => {
    if (counts[l.stage] != null) counts[l.stage]++;
  });
  const followups = leads.filter(l => l.nextFollowUp && l.stage !== "client" && l.stage !== "not_now" && l.nextFollowUp <= today()).sort((a, b) => a.nextFollowUp < b.nextFollowUp ? -1 : 1);
  const feed = leads.flatMap(l => (l.activity || []).map(a => ({
    lead: l,
    a
  }))).sort((x, y) => x.a.at < y.a.at ? 1 : -1).slice(0, 15);
  return /*#__PURE__*/React.createElement("div", {
    className: "fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pipes",
    style: {
      marginBottom: 22
    }
  }, STAGES.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    className: "pipe",
    onClick: () => goTab("leads", s.key)
  }, /*#__PURE__*/React.createElement("div", {
    className: "k",
    style: {
      color: s.color
    }
  }, counts[s.key]), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, s.label)))), /*#__PURE__*/React.createElement("div", {
    className: "grid g2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Follow-ups due"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Who needs you today"), followups.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty",
    style: {
      minHeight: 160,
      padding: "30px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, "✓"), "Nothing due — you're all caught up.") : followups.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    className: "fuprow",
    onClick: () => openLead(l.id)
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "lname"
  }, l.name), /*#__PURE__*/React.createElement("div", {
    className: "lhead"
  }, l.headline || l.email || stageOf(l.stage).label)), /*#__PURE__*/React.createElement("span", {
    className: "due " + dueClass(l.nextFollowUp)
  }, l.nextFollowUp < today() ? "overdue · " : "", l.nextFollowUp)))), /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Recent activity"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "What's been happening"), feed.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty",
    style: {
      minHeight: 160,
      padding: "30px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, "·"), "No activity yet. Import your first commenter list to get moving.") : /*#__PURE__*/React.createElement("div", {
    className: "feed"
  }, feed.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "feeditem"
  }, /*#__PURE__*/React.createElement("span", {
    className: "when"
  }, timeAgo(f.a.at)), /*#__PURE__*/React.createElement("span", {
    className: "what"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who",
    style: {
      cursor: "pointer"
    },
    onClick: () => openLead(f.lead.id)
  }, f.lead.name), " — ", f.a.text)))))));
}

/* ============================================================
   LEADS LIST + DETAIL
   ============================================================ */
function LeadsView({
  leads,
  refresh,
  initialStage,
  settings
}) {
  const [q, setQ] = useState(""),
    [stage, setStage] = useState(initialStage || ""),
    [tier, setTier] = useState(""),
    [sort, setSort] = useState("updated");
  const [openId, setOpenId] = useState(null),
    [showNew, setShowNew] = useState(false);
  useEffect(() => {
    setStage(initialStage || "");
  }, [initialStage]);
  let list = leads.filter(l => (!stage || l.stage === stage) && (!tier || l.tier === tier) && (!q || (l.name + " " + (l.headline || "") + " " + (l.email || "") + " " + (l.tags || []).join(" ")).toLowerCase().includes(q.toLowerCase())));
  list = list.slice().sort((a, b) => {
    if (sort === "score") return (b.score || 0) - (a.score || 0);
    if (sort === "followUp") return (a.nextFollowUp || "9999") < (b.nextFollowUp || "9999") ? -1 : 1;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
  const open = leads.find(l => l.id === openId);
  return /*#__PURE__*/React.createElement("div", {
    className: "fade"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "tin",
    style: {
      maxWidth: 240
    },
    placeholder: "Search name, headline, tag…",
    value: q,
    onChange: e => setQ(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip" + (stage === "" ? " on" : ""),
    onClick: () => setStage("")
  }, "All stages"), STAGES.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.key,
    className: "chip" + (stage === s.key ? " on" : ""),
    onClick: () => setStage(stage === s.key ? "" : s.key)
  }, s.label))), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, ["A", "B", "C"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: "chip" + (tier === t ? " on" : ""),
    onClick: () => setTier(tier === t ? "" : t)
  }, "Tier ", t))), /*#__PURE__*/React.createElement("select", {
    className: "stagesel",
    value: sort,
    onChange: e => setSort(e.target.value),
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "updated"
  }, "Recently updated"), /*#__PURE__*/React.createElement("option", {
    value: "score"
  }, "Highest score"), /*#__PURE__*/React.createElement("option", {
    value: "followUp"
  }, "Next follow-up")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setShowNew(true)
  }, "+ Add lead")), list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, "◎"), leads.length === 0 ? "No leads yet. Import a commenter list or add one manually." : "Nothing matches these filters.")) : /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tablewrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "ltable"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null), /*#__PURE__*/React.createElement("th", null, "Name"), /*#__PURE__*/React.createElement("th", null, "Headline"), /*#__PURE__*/React.createElement("th", null, "Score"), /*#__PURE__*/React.createElement("th", null, "Stage"), /*#__PURE__*/React.createElement("th", null, "Follow-up"), /*#__PURE__*/React.createElement("th", null, "Source"))), /*#__PURE__*/React.createElement("tbody", null, list.map(l => /*#__PURE__*/React.createElement("tr", {
    key: l.id,
    className: "rowlink",
    onClick: () => setOpenId(l.id)
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      width: 36
    }
  }, /*#__PURE__*/React.createElement(TierBadge, {
    tier: l.tier
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "lname"
  }, l.name), l.email ? /*#__PURE__*/React.createElement("div", {
    className: "lhead"
  }, l.email) : null), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "lhead"
  }, l.headline || "—")), /*#__PURE__*/React.createElement("td", null, l.score != null ? l.score : "—"), /*#__PURE__*/React.createElement("td", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("select", {
    className: "stagesel",
    value: l.stage,
    onChange: async e => {
      await API.patchLead(l.id, {
        stage: e.target.value
      });
      refresh();
    }
  }, STAGES.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.key,
    value: s.key
  }, s.label)))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "due " + dueClass(l.nextFollowUp)
  }, l.nextFollowUp || "—")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, l.source === "linkedin-import" ? "LinkedIn" : l.source === "website" ? "Website" : "Manual")))))))), open && /*#__PURE__*/React.createElement(LeadDetail, {
    lead: open,
    refresh: refresh,
    onClose: () => setOpenId(null),
    settings: settings
  }), showNew && /*#__PURE__*/React.createElement(NewLeadModal, {
    onClose: () => setShowNew(false),
    onAdded: () => {
      setShowNew(false);
      refresh();
    }
  }));
}
function LeadDetail({
  lead,
  refresh,
  onClose,
  settings
}) {
  const [notes, setNotes] = useState(lead.notes || ""),
    [email, setEmail] = useState(lead.email || "");
  const [followUp, setFollowUp] = useState(lead.nextFollowUp || ""),
    [tags, setTags] = useState((lead.tags || []).join(", "));
  const [genBusy, setGenBusy] = useState(false),
    [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    setNotes(lead.notes || "");
    setEmail(lead.email || "");
    setFollowUp(lead.nextFollowUp || "");
    setTags((lead.tags || []).join(", "));
  }, [lead.id]);
  async function saveField(patch) {
    await API.patchLead(lead.id, patch);
    refresh();
  }
  async function generate() {
    setGenBusy(true);
    const o = await API.outreach(lead.id);
    setGenBusy(false);
    if (o) refresh();else toast("Couldn't generate — try again");
  }
  async function markSent(idx) {
    const out = JSON.parse(JSON.stringify(lead.outreach));
    const t = out.touches[idx];
    t.sent = !t.sent;
    t.sentAt = t.sent ? new Date().toISOString() : null;
    const patch = {
      outreach: out
    };
    if (t.sent) {
      const next = out.touches[idx + 1];
      if (idx === 0 && lead.stage === "new") patch.stage = "contacted";
      if (next) patch.nextFollowUp = addDaysStr(today(), next.daysAfterPrevious || 3);
    }
    await API.patchLead(lead.id, patch);
    if (t.sent) await API.addActivity(lead.id, "dm_sent", 'Sent "' + t.label + '"');
    refresh();
  }
  const activity = (lead.activity || []).slice().reverse();
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "slideover"
  }, /*#__PURE__*/React.createElement("div", {
    className: "so-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(TierBadge, {
    tier: lead.tier
  }), /*#__PURE__*/React.createElement("span", {
    className: "so-name"
  }, lead.name)), /*#__PURE__*/React.createElement("div", {
    className: "so-sub"
  }, lead.headline || "No headline", lead.score != null ? " · score " + lead.score : "")), /*#__PURE__*/React.createElement("button", {
    className: "so-close",
    onClick: onClose
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "metarow"
  }, /*#__PURE__*/React.createElement("select", {
    className: "stagesel",
    value: lead.stage,
    onChange: e => saveField({
      stage: e.target.value
    })
  }, STAGES.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.key,
    value: s.key
  }, s.label))), /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, lead.source === "linkedin-import" ? "LinkedIn import" : lead.source === "website" ? "Website capture" : "Added manually", lead.sourceDetail ? " · " + lead.sourceDetail : ""), lead.linkedinUrl && /*#__PURE__*/React.createElement("a", {
    className: "pill spark",
    style: {
      textDecoration: "none"
    },
    href: lead.linkedinUrl,
    target: "_blank",
    rel: "noreferrer"
  }, "LinkedIn profile ↗")), lead.scoreReason && /*#__PURE__*/React.createElement("div", {
    className: "hint",
    style: {
      marginBottom: 14
    }
  }, lead.scoreReason), lead.comment && /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Their comment"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: "11px 14px",
      fontSize: 13.5,
      color: "var(--ink-soft)",
      lineHeight: 1.55
    }
  }, "\"", lead.comment, "\"")), /*#__PURE__*/React.createElement("div", {
    className: "grid g2",
    style: {
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: email,
    onChange: e => setEmail(e.target.value),
    onBlur: () => {
      if (email !== (lead.email || "")) saveField({
        email
      });
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Next follow-up"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "date",
    value: followUp,
    onChange: e => {
      setFollowUp(e.target.value);
      saveField({
        nextFollowUp: e.target.value || null
      });
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Tags (comma-separated)"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: tags,
    onChange: e => setTags(e.target.value),
    onBlur: () => saveField({
      tags: tags.split(",").map(t => t.trim()).filter(Boolean)
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Notes"), /*#__PURE__*/React.createElement("textarea", {
    className: "tin",
    value: notes,
    onChange: e => setNotes(e.target.value),
    onBlur: () => {
      if (notes !== (lead.notes || "")) saveField({
        notes
      });
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Outreach"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "3-touch DM sequence")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: generate,
    disabled: genBusy
  }, genBusy ? /*#__PURE__*/React.createElement(Loading, null) : lead.outreach ? "Regenerate" : "✦ Generate")), !lead.outreach ? /*#__PURE__*/React.createElement("div", {
    className: "hint"
  }, "Generate a personalized DM sequence from their comment and headline. You copy and send each message yourself — nothing is ever sent automatically.") : /*#__PURE__*/React.createElement("div", null, lead.outreach.source === "demo" && /*#__PURE__*/React.createElement("div", {
    className: "hint",
    style: {
      marginBottom: 10
    }
  }, "Demo templates — add an ANTHROPIC_API_KEY for fully personalized drafts."), lead.outreach.touches.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "touch" + (t.sent ? " sent" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "thead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tlabel"
  }, t.label, i > 0 ? " · +" + (t.daysAfterPrevious || 0) + "d" : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "copybtn",
    onClick: () => copy(t.message)
  }, "⧉ Copy"), /*#__PURE__*/React.createElement("button", {
    className: "sentbtn" + (t.sent ? " on" : ""),
    onClick: () => markSent(i)
  }, t.sent ? "✓ Sent" : "Mark sent"))), /*#__PURE__*/React.createElement("div", {
    className: "tmsg"
  }, t.message)))), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Activity"), /*#__PURE__*/React.createElement("div", {
    className: "feed",
    style: {
      marginTop: 8
    }
  }, activity.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "feeditem"
  }, /*#__PURE__*/React.createElement("span", {
    className: "when"
  }, timeAgo(a.at)), /*#__PURE__*/React.createElement("span", {
    className: "what"
  }, a.text)))), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), !confirmDel ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      color: "#a8452e",
      borderColor: "#ecc4b8"
    },
    onClick: () => setConfirmDel(true)
  }, "Delete lead") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--ink-soft)"
    }
  }, "Delete ", lead.name, " permanently?"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      background: "#a8452e"
    },
    onClick: async () => {
      await API.delLead(lead.id);
      onClose();
      refresh();
    }
  }, "Yes, delete"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setConfirmDel(false)
  }, "Cancel"))));
}
function NewLeadModal({
  onClose,
  onAdded
}) {
  const [f, setF] = useState({
    name: "",
    headline: "",
    linkedinUrl: "",
    email: "",
    comment: "",
    notes: "",
    sourceDetail: ""
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(Object.assign({}, f, {
    [k]: v
  }));
  async function go(e) {
    e.preventDefault();
    if (!f.name.trim()) return toast("Name is required");
    setBusy(true);
    const l = await API.addLead(Object.assign({}, f, {
      source: "manual"
    }));
    setBusy(false);
    if (l) {
      toast("Lead added");
      onAdded();
    } else toast("Couldn't add lead");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "modal",
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "modalcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cardtitle",
    style: {
      marginBottom: 16
    }
  }, "Add a lead"), /*#__PURE__*/React.createElement("form", {
    onSubmit: go
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Name *"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.name,
    onChange: e => set("name", e.target.value),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Headline / role"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.headline,
    onChange: e => set("headline", e.target.value),
    placeholder: "Founder at …"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid g2",
    style: {
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.email,
    onChange: e => set("email", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "LinkedIn URL"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.linkedinUrl,
    onChange: e => set("linkedinUrl", e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "How you met / their words"), /*#__PURE__*/React.createElement("textarea", {
    className: "tin",
    value: f.comment,
    onChange: e => set("comment", e.target.value),
    placeholder: "Met at the Vancouver workshop — asked about AI for her studio"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Where from (optional)"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.sourceDetail,
    onChange: e => set("sourceDetail", e.target.value),
    placeholder: "Referral from Sam / June workshop"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn btn-ghost",
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    disabled: busy
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : "Add lead")))));
}

/* ============================================================
   IMPORT WIZARD
   ============================================================ */
function ImportView({
  refresh,
  goTab
}) {
  const [step, setStep] = useState(1);
  const [raw, setRaw] = useState(""),
    [sourceDetail, setSourceDetail] = useState("");
  const [cands, setCands] = useState([]),
    [warnings, setWarnings] = useState([]);
  const [scoreSource, setScoreSource] = useState(null),
    [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState({});
  const [result, setResult] = useState(null);
  async function doParse() {
    setBusy(true);
    const r = await API.parse(raw);
    setBusy(false);
    setCands(r.candidates || []);
    setWarnings(r.warnings || []);
    setScoreSource(null);
    const c = {};
    (r.candidates || []).forEach((x, i) => c[i] = true);
    setChecked(c);
    if ((r.candidates || []).length) setStep(2);else toast("Couldn't find anyone in that paste — check the format");
  }
  async function doScore() {
    setBusy(true);
    const r = await API.score(cands);
    setBusy(false);
    if (r) {
      setCands(r.candidates);
      setScoreSource(r.source);
      const c = {};
      r.candidates.forEach((x, i) => {
        c[i] = !x.duplicateOf;
      });
      setChecked(c);
    } else toast("Scoring failed — try again");
  }
  async function doCommit() {
    const chosen = cands.filter((c, i) => checked[i]);
    if (!chosen.length) return toast("Nothing selected");
    setBusy(true);
    const r = await API.commit(chosen, sourceDetail);
    setBusy(false);
    if (r) {
      setResult(r);
      setStep(3);
      refresh();
    } else toast("Import failed");
  }
  const editCand = (i, k, v) => {
    const c = cands.slice();
    c[i] = Object.assign({}, c[i], {
      [k]: v
    });
    setCands(c);
  };
  const nChecked = cands.filter((c, i) => checked[i]).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stepbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "step " + (step > 1 ? "done" : "cur")
  }), /*#__PURE__*/React.createElement("div", {
    className: "step " + (step > 2 ? "done" : step === 2 ? "cur" : "")
  }), /*#__PURE__*/React.createElement("div", {
    className: "step " + (step === 3 ? "cur" : "")
  })), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Step 1 · Paste"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Paste your commenter or engagement list"), /*#__PURE__*/React.createElement("div", {
    className: "hint",
    style: {
      marginBottom: 14
    }
  }, "From a LinkedIn post, giveaway, or event. Formats that work: one person per block (name / headline / comment, separated by blank lines), CSV with a header row, or tab-separated lines. You'll review everything before anything is saved."), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("textarea", {
    className: "tin",
    style: {
      minHeight: 220,
      fontSize: 13
    },
    value: raw,
    onChange: e => setRaw(e.target.value),
    placeholder: "Jane Doe\nFounder at Bloom Coaching\nThis is exactly what I need! How do I start?\n\nSam Lee\nOwner, Lee Fitness Studio\nInterested — please send it over!"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Which post / giveaway is this from? (optional)"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: sourceDetail,
    onChange: e => setSourceDetail(e.target.value),
    placeholder: "July AI-prompts giveaway"
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: doParse,
    disabled: busy || !raw.trim()
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : "Parse list →")), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Step 2 · Review & score"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, cands.length, " people found")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep(1)
  }, "← Back"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-dark",
    onClick: doScore,
    disabled: busy
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : scoreSource ? "Re-score" : "✦ Score against my ICP"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: doCommit,
    disabled: busy || !nChecked
  }, "Add ", nChecked, " lead", nChecked === 1 ? "" : "s", " →"))), scoreSource && scoreSource.includes("demo") && /*#__PURE__*/React.createElement("div", {
    className: "hint",
    style: {
      marginTop: 6
    }
  }, "Scored with the built-in demo scorer — add an ANTHROPIC_API_KEY for Claude scoring against your ICP."), warnings.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "warnbox"
  }, warnings.map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, "⚠ ", w))), /*#__PURE__*/React.createElement("div", {
    className: "tablewrap",
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ltable itable"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null), /*#__PURE__*/React.createElement("th", null, "Name"), /*#__PURE__*/React.createElement("th", null, "Headline"), /*#__PURE__*/React.createElement("th", null, "Comment"), /*#__PURE__*/React.createElement("th", null, "Score"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, cands.map((c, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      width: 30
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!checked[i],
    onChange: e => setChecked(Object.assign({}, checked, {
      [i]: e.target.checked
    }))
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      minWidth: 140
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: c.name,
    onChange: e => editCand(i, "name", e.target.value)
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      minWidth: 180
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: c.headline || "",
    onChange: e => editCand(i, "headline", e.target.value)
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: c.comment || "",
    onChange: e => editCand(i, "comment", e.target.value)
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      whiteSpace: "nowrap"
    }
  }, c.tier ? /*#__PURE__*/React.createElement("span", {
    title: c.reason
  }, /*#__PURE__*/React.createElement(TierBadge, {
    tier: c.tier
  }), " ", c.score) : "—"), /*#__PURE__*/React.createElement("td", null, c.duplicateOf && /*#__PURE__*/React.createElement("span", {
    className: "dupetag"
  }, "already in CRM"))))))), cands.some((c, i) => c.duplicateOf) && /*#__PURE__*/React.createElement("div", {
    className: "hint",
    style: {
      marginTop: 10
    }
  }, "Rows marked \"already in CRM\" are unchecked by default so you don't create duplicates.")), step === 3 && result && /*#__PURE__*/React.createElement("div", {
    className: "card pad",
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty",
    style: {
      minHeight: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "big",
    style: {
      color: "var(--tierA)"
    }
  }, "✓"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, result.added, " lead", result.added === 1 ? "" : "s", " added"), /*#__PURE__*/React.createElement("div", {
    className: "hint",
    style: {
      marginBottom: 18
    }
  }, sourceDetail ? 'Tagged with "' + sourceDetail + '".' : "", " Tier A leads are your best bets — start there."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => goTab("leads")
  }, "View leads"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setStep(1);
      setRaw("");
      setCands([]);
      setResult(null);
    }
  }, "Import another list")))));
}

/* ============================================================
   SETTINGS
   ============================================================ */
function SettingsView({
  status,
  settings,
  setSettings
}) {
  const [f, setF] = useState({
    calendlyUrl: "",
    notifyEmail: "",
    icp: ""
  });
  const [pw, setPw] = useState({
    current: "",
    next: "",
    next2: ""
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (settings) setF({
      calendlyUrl: settings.calendlyUrl || "",
      notifyEmail: settings.notifyEmail || "",
      icp: settings.icp || ""
    });
  }, [settings]);
  async function save() {
    setBusy(true);
    const s = await API.saveSettings(f);
    setBusy(false);
    if (s) {
      setSettings(s);
      toast("Settings saved");
    } else toast("Save failed");
  }
  async function changePw(e) {
    e.preventDefault();
    if (pw.next.length < 8) return toast("New password needs 8+ characters");
    if (pw.next !== pw.next2) return toast("New passwords don't match");
    const r = await API.password(pw.current, pw.next);
    if (r.ok) {
      toast("Password changed");
      setPw({
        current: "",
        next: "",
        next2: ""
      });
    } else toast(r.data.error === "wrong_password" ? "Current password is wrong" : "Change failed");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "fade grid g2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Business"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle",
    style: {
      marginBottom: 16
    }
  }, "Your setup"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Calendly booking link"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.calendlyUrl,
    onChange: e => setF(Object.assign({}, f, {
      calendlyUrl: e.target.value
    })),
    placeholder: "https://calendly.com/you/intro-call"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hint"
  }, "Shown on the capture page thank-you screen and woven into Touch 3 of every outreach sequence.")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Notification email"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.notifyEmail,
    onChange: e => setF(Object.assign({}, f, {
      notifyEmail: e.target.value
    })),
    placeholder: "you@example.com"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hint"
  }, "Where new-lead alerts go", status && status.email === "off" ? " (email is off — add RESEND_API_KEY to the server to enable)" : "", ".")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Ideal client profile (drives AI scoring)"), /*#__PURE__*/React.createElement("textarea", {
    className: "tin",
    style: {
      minHeight: 120
    },
    value: f.icp,
    onChange: e => setF(Object.assign({}, f, {
      icp: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    className: "hint"
  }, "Describe who your best clients are. Every imported commenter is scored against this.")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: save,
    disabled: busy
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : "Save settings"), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Share"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: "var(--ink-soft)",
      marginTop: 6
    }
  }, "Your public capture page: ", /*#__PURE__*/React.createElement("a", {
    href: "/capture",
    target: "_blank",
    rel: "noreferrer",
    style: {
      color: "var(--spark-deep)",
      fontWeight: 600
    }
  }, location.origin, "/capture"), /*#__PURE__*/React.createElement("button", {
    className: "copybtn",
    style: {
      marginLeft: 8
    },
    onClick: () => copy(location.origin + "/capture")
  }, "⧉ Copy"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card pad",
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Security"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle",
    style: {
      marginBottom: 16
    }
  }, "Change password"), /*#__PURE__*/React.createElement("form", {
    onSubmit: changePw
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Current password"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "password",
    value: pw.current,
    onChange: e => setPw(Object.assign({}, pw, {
      current: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid g2",
    style: {
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "New password"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "password",
    value: pw.next,
    onChange: e => setPw(Object.assign({}, pw, {
      next: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Confirm new"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "password",
    value: pw.next2,
    onChange: e => setPw(Object.assign({}, pw, {
      next2: e.target.value
    }))
  }))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-dark"
  }, "Change password"))), /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "System"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle",
    style: {
      marginBottom: 12
    }
  }, "Status"), status && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: "var(--ink-soft)",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "dotai" + (status.ai === "claude" ? " on" : ""),
    style: {
      display: "inline-block",
      marginRight: 8
    }
  }), "AI: ", status.ai === "claude" ? "Claude connected (" + status.model + ")" : "demo mode — heuristic scoring & template DMs"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "dotai" + (status.db === "supabase" ? " on" : ""),
    style: {
      display: "inline-block",
      marginRight: 8
    }
  }), "Database: ", status.db === "supabase" ? "Supabase Postgres" : "local JSON file"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "dotai" + (status.email === "resend" ? " on" : ""),
    style: {
      display: "inline-block",
      marginRight: 8
    }
  }), "Email alerts: ", status.email === "resend" ? "Resend connected" : "off"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "dotai" + (status.calendly ? " on" : ""),
    style: {
      display: "inline-block",
      marginRight: 8
    }
  }), "Calendly: ", status.calendly ? "linked" : "not set")))));
}

/* ============================================================
   APP SHELL
   ============================================================ */
const TABS = [{
  key: "dashboard",
  label: "Dashboard",
  ic: "◧",
  title: "Dashboard",
  sub: "Your pipeline at a glance — and who to follow up with today."
}, {
  key: "leads",
  label: "Leads",
  ic: "◎",
  title: "Leads",
  sub: "Everyone in your pipeline. Click a lead to see details and draft outreach."
}, {
  key: "import",
  label: "Import",
  ic: "⇲",
  title: "Import & score",
  sub: "Paste a commenter list from a post or giveaway — review, score against your ICP, and add the keepers."
}, {
  key: "settings",
  label: "Settings",
  ic: "⚙",
  title: "Settings",
  sub: "Calendly link, notification email, ICP, and your password."
}];
function App({
  onLogout
}) {
  const [tab, setTab] = useState("dashboard");
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [stageFilter, setStageFilter] = useState("");
  const [openLeadId, setOpenLeadId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  useEffect(() => {
    _setToast = t => {
      setToastMsg(t);
      setTimeout(() => setToastMsg(null), 2200);
    };
    return () => {
      _setToast = null;
    };
  }, []);
  const refresh = async () => setLeads(await API.leads());
  useEffect(() => {
    refresh();
    API.status().then(setStatus);
    API.settings().then(setSettings);
  }, []);
  function goTab(t, stage) {
    setStageFilter(stage || "");
    setTab(t);
  }
  function openLead(id) {
    setStageFilter("");
    setTab("leads");
    setOpenLeadId(id);
  }
  const cur = TABS.find(t => t.key === tab);
  const dueCount = leads.filter(l => l.nextFollowUp && l.stage !== "client" && l.stage !== "not_now" && l.nextFollowUp <= today()).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brandmark"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, "LEAD", /*#__PURE__*/React.createElement("em", null, "GEN")), /*#__PURE__*/React.createElement("div", {
    className: "tag"
  }, "Superpowers With AI")), /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.key,
    className: tab === t.key ? "active" : "",
    onClick: () => goTab(t.key)
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, t.ic), t.label, t.key === "dashboard" && dueCount > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      background: "var(--spark)",
      color: "#fff",
      borderRadius: 999,
      fontSize: 10.5,
      padding: "1px 7px",
      fontWeight: 700
    }
  }, dueCount)))), /*#__PURE__*/React.createElement("div", {
    className: "side-foot"
  }, status && /*#__PURE__*/React.createElement("div", {
    className: "statpills"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dotai" + (status.ai === "claude" ? " on" : "")
  }), status.ai === "claude" ? "Claude AI" : "Demo AI"), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dotai" + (status.db === "supabase" ? " on" : "")
  }), status.db === "supabase" ? "Supabase DB" : "Local file DB"), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dotai" + (status.email === "resend" ? " on" : "")
  }), status.email === "resend" ? "Email alerts on" : "Email alerts off")), /*#__PURE__*/React.createElement("button", {
    className: "logoutbtn",
    onClick: onLogout
  }, "Log out"))), /*#__PURE__*/React.createElement("main", {
    className: "main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "crumb"
  }, "Superpowers With AI"), /*#__PURE__*/React.createElement("h1", null, cur.title), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, cur.sub))), /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, tab === "dashboard" && /*#__PURE__*/React.createElement(Dashboard, {
    leads: leads,
    openLead: openLead,
    goTab: goTab
  }), tab === "leads" && /*#__PURE__*/React.createElement(LeadsKeyed, {
    leads: leads,
    refresh: refresh,
    initialStage: stageFilter,
    settings: settings,
    openLeadId: openLeadId,
    clearOpen: () => setOpenLeadId(null)
  }), tab === "import" && /*#__PURE__*/React.createElement(ImportView, {
    refresh: refresh,
    goTab: goTab
  }), tab === "settings" && /*#__PURE__*/React.createElement(SettingsView, {
    status: status,
    settings: settings,
    setSettings: setSettings
  }))), toastMsg && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, toastMsg));
}

// Wrapper so dashboard click-through can open a specific lead's detail panel.
function LeadsKeyed({
  leads,
  refresh,
  initialStage,
  settings,
  openLeadId,
  clearOpen
}) {
  const [openId, setOpenId] = useState(openLeadId);
  useEffect(() => {
    if (openLeadId) {
      setOpenId(openLeadId);
      clearOpen();
    }
  }, [openLeadId]);
  const open = leads.find(l => l.id === openId);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(LeadsView, {
    leads: leads,
    refresh: refresh,
    initialStage: initialStage,
    settings: settings
  }), open && /*#__PURE__*/React.createElement(LeadDetail, {
    lead: open,
    refresh: refresh,
    onClose: () => setOpenId(null),
    settings: settings
  }));
}
function Root() {
  const [state, setState] = useState("loading"); // loading | setup | login | app
  useEffect(() => {
    (async () => {
      const a = await API.authState().catch(() => null);
      if (!a) {
        setState("login");
        return;
      }
      if (!a.setup) {
        setState("setup");
        return;
      }
      const st = await API.status();
      setState(st ? "app" : "login");
    })();
  }, []);
  if (state === "loading") return /*#__PURE__*/React.createElement("div", {
    className: "bootscreen"
  }, /*#__PURE__*/React.createElement("span", {
    className: "disp"
  }, "LEAD", /*#__PURE__*/React.createElement("em", null, "GEN")));
  if (state === "setup") return /*#__PURE__*/React.createElement(SetupScreen, {
    onDone: () => setState("app")
  });
  if (state === "login") return /*#__PURE__*/React.createElement(LoginScreen, {
    onDone: () => setState("app")
  });
  return /*#__PURE__*/React.createElement(App, {
    onLogout: async () => {
      await API.logout();
      setState("login");
    }
  });
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(Root, null));