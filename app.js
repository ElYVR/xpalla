const {
  useState,
  useEffect,
  useRef
} = React;

/* ============================================================
   AI LAYER — isolated mock generation built on researched
   2025–2026 LinkedIn & Instagram algorithm frameworks.

   To go live: replace each generator body with a fetch() to a
   backend that calls the Claude API and returns the SAME shape
   ({blocks, slides, poll, hashtags, playbook, checklist, meta}).
   Nothing else in the app changes.
   ============================================================ */

const wait = (ms = 1100) => new Promise(r => setTimeout(r, ms));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

// --- expanded hook library (proven viral frameworks from research) ---
function fillT(s, b, topic) {
  const n = b.niche || "your field",
    y = b.years || "20",
    aud = b.audience || "your audience",
    t = topic || "this";
  return s.replace(/{N}/g, cap(n)).replace(/{n}/g, n).replace(/{y}/g, y).replace(/{aud}/g, aud).replace(/{T}/g, cap(t)).replace(/{t}/g, t).trim();
}
const LI_BANK = {
  "Contrarian": [['Unpopular opinion about {n}:', 'The "best practice" everyone repeats is costing you.'], ['Everyone says the key to {n} is doing more.', 'After {y} years, I\'ve found the opposite is true.'], ['Hot take from {y} years in {n}:', 'Most advice out there was built for someone half your age.']],
  "Surprising stat": [['I looked back at {y} years in {n}.', 'One pattern showed up in every win — and every loss.'], ['Most advice on {n} ignores one thing.', 'It\'s the only thing that ever moved the needle for me.'], ['I kept track of what actually worked in {n}.', 'The results surprised even me.']],
  "Transformation": [['I spent years being overlooked in {n}.', 'Here\'s the quiet shift that changed everything.'], ['Two years ago I almost gave up on {n}.', 'Today it\'s the thing people know me for.'], ['From invisible to in-demand in {n} —', 'without pretending to be someone I\'m not.']],
  "Story": [['A client almost walked out of the room last month.', 'What happened next taught me more than a decade did.'], ['I got the worst feedback of my career at 48.', 'It became the best thing that ever happened to me.'], ['Nobody tells you what {n} really feels like at the start.', 'So let me.']],
  "Mistake": [['The most expensive mistake of my career?', 'Trusting advice built for someone half my age.'], ['I wasted years on the wrong approach to {n}.', 'Here\'s what I\'d do differently now.'], ['The {n} mistake I watch smart people make daily —', 'and how to avoid it.']],
  "Listicle": [['7 things I wish I\'d known earlier about {n}.', 'Number 3 took me years to learn.'], ['5 {n} lessons from {y} years in the room.', 'The last one changed how I work.'], ['3 quiet truths about {n} nobody puts on a slide.', 'Starting with the one that stung.']],
  "Industry shift": [['{N} changed in 2026.', 'Most people are still doing it the old way.'], ['The way {n} works has quietly shifted.', 'Here\'s what still matters — and what doesn\'t.'], ['Everyone\'s chasing the new thing in {n}.', 'The fundamentals haven\'t moved an inch.']],
  "Call-out": [['If you\'re rebuilding your career after 45 —', 'read this before your next move.'], ['This is for the women who feel behind in {n}.', 'You\'re not. Here\'s why.'], ['{aud}: this one\'s for you.', 'I wish someone had told me sooner.']]
};
const IG_BANK = {
  "Contrarian": ["Everything you've been told about {t} is wrong", "Unpopular truth about {n} after {y} years", "{N} advice is mostly noise — here's what's real"],
  "Mistake warning": ["Stop doing this — it's quietly killing your {n}", "The {n} mistake almost everyone makes", "Avoid these 3 {n} mistakes before you start"],
  "List tease": ["5 {n} lessons it took me {y} years to learn", "3 things I wish I knew about {n} sooner", "The {n} checklist I wish I had at the start"],
  "Cliffhanger": ["What if the simplest fix was the best one?", "Nobody talks about what happens after {t}", "The thing no one tells you about {t}"],
  "Result + time": ["How I changed my {n} in 30 days", "From stuck to sought-after — here's how", "The 1 shift that changed everything in {n}"],
  "Self-relevance": ["If you're over 45 and starting over — this is for you", "For the woman who feels behind: read this", "{aud}, this is your sign"],
  "Transformation": ["From invisible to in-demand — the exact path", "I rebuilt my {n} from scratch at 50", "Before & after: what {y} years really taught me"],
  "Authority": ["The {n} move pros never talk about", "{y} years in {n} taught me this one thing", "The secret to {n} no one shares"]
};
function liVariants(style, b, topic) {
  let chosen;
  if (style === "Auto") {
    chosen = ["Contrarian", "Story", "Listicle"].map(st => ({
      style: st,
      lines: LI_BANK[st][0].map(s => fillT(s, b, topic))
    }));
  } else {
    const arr = LI_BANK[style] || LI_BANK["Contrarian"];
    chosen = arr.slice(0, 3).map(p => ({
      style,
      lines: p.map(s => fillT(s, b, topic))
    }));
    let k = 0;
    while (chosen.length < 3) {
      chosen.push({
        style: "Contrarian",
        lines: LI_BANK["Contrarian"][k++].map(s => fillT(s, b, topic))
      });
    }
  }
  return chosen.slice(0, 3);
}
function igVariants(style, b, topic) {
  let chosen;
  if (style === "Auto") {
    chosen = ["Contrarian", "Mistake warning", "List tease"].map(st => ({
      style: st,
      text: fillT(IG_BANK[st][0], b, topic)
    }));
  } else {
    const arr = IG_BANK[style] || IG_BANK["Contrarian"];
    chosen = arr.slice(0, 3).map(s => ({
      style,
      text: fillT(s, b, topic)
    }));
    let k = 0;
    while (chosen.length < 3) {
      chosen.push({
        style: "Contrarian",
        text: fillT(IG_BANK["Contrarian"][k++], b, topic)
      });
    }
  }
  return chosen.slice(0, 3);
}
function getLibrary(platform, b, topic) {
  const bank = platform === "LinkedIn" ? LI_BANK : IG_BANK;
  return Object.keys(bank).map(style => ({
    style,
    hooks: bank[style].map(item => Array.isArray(item) ? item.map(s => fillT(s, b, topic)).join("\n") : fillT(item, b, topic))
  }));
}
const AI = {
  mode: "demo",
  model: null,
  db: "json",
  async checkMode() {
    try {
      const r = await fetch("/api/status");
      const d = await r.json();
      AI.mode = d.mode;
      AI.model = d.model;
      AI.db = d.db || "json";
    } catch (e) {
      AI.mode = "demo";
    }
    return {
      mode: AI.mode,
      db: AI.db
    };
  },
  // Try real Claude via the backend. Returns a normalized result, or null to fall back to mock.
  async _tryReal(payload) {
    if (AI.mode !== "claude") return null;
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!r.ok) return null;
      const d = await r.json();
      if (!d || !d.blocks || !d.hooks) return null;
      d.platform = payload.platform;
      d.format = payload.format;
      d._source = "claude";
      if (typeof d.variantIndex !== "number") d.variantIndex = payload.hookIndex || 0;
      return d;
    } catch (e) {
      return null;
    }
  },
  /* ---------------- BRAND BRIEF ---------------- */
  async brandBrief(b) {
    await wait(1400);
    const aud = b.audience || "your audience",
      niche = b.niche || "your field";
    const exp = b.years ? `${b.years} years` : "decades";
    const vw = b.voice && b.voice.length ? b.voice.join(", ") : "warm, candid, authoritative";
    return `**Positioning statement**
You are the ${niche} guide for ${aud} — bringing ${exp} of hard-won experience to a space crowded with people half your age and a third of your depth. Your edge isn't novelty; it's judgment.

**Your one-line brand**
"${b.name || "You"} helps ${aud} ${b.outcome || "make confident, well-informed decisions"} — without the hustle-culture noise."

**Three content pillars**
1. **Earned wisdom** — lessons from ${exp} in ${niche}, told as stories with a takeaway.
2. **Myth vs. reality** — gently correct the oversimplified advice flooding the feed.
3. **Behind the curtain** — your process, your tools, the unglamorous truth of doing the work well.

**Voice & tone**
${vw}. Write the way you'd speak to a respected peer over coffee — generous, specific, never performative. Short paragraphs. One idea per post.`;
  },
  /* ---------------- LINKEDIN ---------------- */
  async linkedin(b, topic, format, hookStyle, tone, mediaCount, opts) {
    opts = opts || {};
    const real = await AI._tryReal({
      platform: "LinkedIn",
      brand: b,
      topic,
      format,
      hookStyle,
      tone,
      hookIndex: opts.hookIndex || 0,
      scriptLen: opts.scriptLen
    });
    if (real) return real;
    if (!opts.instant) await wait(1300);
    const n = b.niche || "your field",
      y = b.years || "20",
      aud = b.audience || "your audience";
    const variants = liVariants(hookStyle, b, topic);
    const hi = Math.min(opts.hookIndex || 0, variants.length - 1);
    const hook = variants[hi].lines;
    const vbase = {
      hooks: variants,
      variantIndex: hi
    };
    const t = topic || `what ${y} years in ${n} taught me`;
    const tag = ["#" + n.replace(/[^a-z]/gi, ""), "#" + (aud.split(" ")[0] || "Leadership"), "#PersonalBrand"].slice(0, 3);
    const firstComment = `📌 The full breakdown / resource is here: [your link]\n\n(Links live in the first comment on purpose — putting them in the post itself cuts reach by ~60% under the 2026 algorithm.)`;
    const liPlaybook = [`Hook is 2 lines that open a curiosity gap — the only part shown before "…see more". Holding the reader = dwell time, the #1 ranking signal now.`, `Body lands at ~900 characters and one idea per line: built to be *read*, not skimmed (61s+ dwell ≈ 13× the reach of a 3s glance).`, `Ends with a specific, experience-based question — real comments outrank likes, and the 2026 LLM downranks "Comment YES" bait.`, `Written to be **saved** (a save is worth ~5× a like) and to read at a grade-8 level (denser posts lose ~35% reach).`];
    const liChecklist = [`Post Tue–Thu, 8–10am in your audience's timezone.`, `Reply to every comment within the first 60 min (the "golden hour").`, `Don't make big edits in the first hour — it disrupts distribution.`, `Drop your link as the first comment, not in the post.`];
    if (format === "Poll") {
      return {
        ...vbase,
        platform: "LinkedIn",
        format,
        poll: {
          question: `In ${n}, what holds people back most?`,
          options: ["Fear of being judged", "Outdated advice", "Not enough time"]
        },
        blocks: [{
          label: "Hook · first 2 lines before “…see more”",
          text: hook.join("\n"),
          kind: "hook"
        }, {
          label: "Post body (paste under the poll)",
          text: `I've watched this play out for ${y} years.\n\nThe answer people give out loud is rarely the real one — so I'm curious what you'll vote.\n\nWhatever you pick, tell me *why* in the comments. That's where the real conversation is.`
        }, {
          label: "First comment",
          text: firstComment
        }],
        hashtags: tag,
        playbook: ["Polls carry the single highest reach multiplier on LinkedIn (~1.6×).", ...liPlaybook.slice(2)],
        checklist: ["Run the poll for a full 7 days (1-day polls take a ~70% penalty).", "Keep it to 3 options, no \"Other\".", ...liChecklist.slice(0, 2)],
        meta: ["Highest reach format", "Run 7 days", "3 options"]
      };
    }
    if (format === "Document carousel") {
      const slides = [{
        kind: "cover",
        title: `${Math.max(5, y % 4 + 5)} ${cap(n)} truths\nfor ${aud}`,
        body: `After ${y} years — the ones that actually matter.`
      }, {
        kind: "content",
        title: "1. Experience is the asset",
        body: "Stop apologizing for the years. They're the product people are paying for."
      }, {
        kind: "content",
        title: "2. Slow is often thorough",
        body: "What looks like hesitation at 50 is judgment you didn't have at 30."
      }, {
        kind: "content",
        title: "3. Confidence is quiet",
        body: "You don't need a trending audio. You need a clear point of view."
      }, {
        kind: "content",
        title: "4. Ask better questions",
        body: "The shift isn't knowing more answers — it's seeing the real question sooner."
      }, {
        kind: "content",
        title: "5. The right people find you",
        body: "When you sound like yourself, you attract people who want exactly that."
      }, {
        kind: "cta",
        title: "Save this.",
        body: "Then send it to a woman who's doubting her own experience.\n\nFollow for more on building a brand that fits who you already are."
      }];
      return {
        ...vbase,
        platform: "LinkedIn",
        format,
        slides,
        blocks: [{
          label: "Caption to post with the carousel",
          text: `${hook.join("\n")}\n\nI turned ${y} years of ${n} into the ${slides.length - 2} ideas in this carousel. Swipe through — and save the ones that hit.\n\nWhich number do you most need to hear today?`
        }, {
          label: "First comment",
          text: firstComment
        }],
        hashtags: tag,
        playbook: ["Document/PDF carousels have the highest *engagement rate* of any LinkedIn format (~6.6%) and are built for saves.", "Cover slide is the hook — a bold benefit headline readable as a thumbnail.", "6–10 slides, ≤100 characters each, portrait 1080×1350.", "Final slide drives the save + a share to a specific person."],
        checklist: ["Export as a PDF (or use LinkedIn's native document upload).", "Use 1080×1350 portrait slides for maximum feed space.", ...liChecklist.slice(0, 2)],
        meta: [`${slides.length} slides`, "Top engagement format", "Built for saves"]
      };
    }
    if (format === "Video / Reel") {
      const len = opts.scriptLen || "30–60s";
      const fullScript = `(0:00) ${hook[0]}\n(0:04) ${hook[1]}\n(0:09) For ${y} years in ${n}, I followed the advice everyone repeats.\n(0:17) Here's what actually moved the needle.\n(0:25) Stop trying to keep up with people half your age — your edge is judgment, not speed.\n(0:35) The shortcuts that look efficient early quietly cost you later.\n(0:44) So now I slow down, ask the sharper question, and trust ${y} years of pattern recognition.\n(0:53) If you're rebuilding or stepping up, that experience is your advantage — not your baggage.\n(0:59) Follow for more — and tell me: what took YOU a decade to learn?`;
      const shortScript = `(0:00) ${hook.join(" ")}\n(0:05) Here's what most people get wrong about ${t}.\n(0:12) For ${y} years I believed it too — until experience proved otherwise.\n(0:21) The real move: trust the judgment you've already built.\n(0:28) Follow for more — what would you add?`;
      return {
        ...vbase,
        platform: "LinkedIn",
        format,
        blocks: [{
          label: "On-screen + spoken hook (first 3 seconds)",
          text: hook.join(" "),
          kind: "hook"
        }, {
          label: `${len} script`,
          text: len === "15–30s" ? shortScript : fullScript
        }, {
          label: "Caption (post text)",
          text: `${hook.join("\n")}\n\nThe video above is the short version — the longer story is one I've lived for ${y} years.\n\nWhat would you add?`
        }, {
          label: "First comment",
          text: firstComment
        }],
        hashtags: tag,
        playbook: [`Scripted to fill the full ${len} — every line earns the next so completion stays high (the only thing that earns video reach in 2026).`, "Burn in captions: most people watch on mute.", "Hook must land visually AND verbally in the first 3 seconds.", "Vertical (9:16) for maximum feed real estate."],
        checklist: ["Add burned-in captions before uploading.", "Read it aloud once — trim any line that drags.", ...liChecklist.slice(0, 2)],
        meta: [len, "Captions required", "Vertical 9:16"],
        mediaPrompt: "video"
      };
    }

    // Text post (default)
    const body = `For years I assumed everyone already knew ${t}.\n\nThen I watched a sharp, capable colleague learn it the hard way — and realized the thing that feels obvious to me is exactly what's worth saying out loud.\n\nHere's the part most people miss:\n\n→ Experience isn't about more answers. It's about asking better questions sooner.\n→ The shortcuts that look efficient at 30 quietly cost you at 50.\n→ "Slow" is usually "thorough" wearing an unfair label.\n\nAfter ${y} years in ${n}, the advice I'd give my younger self is simple: trust the judgment you've spent decades building. It's your actual product.`;
    const cta = `What's something you know now that took you a decade to learn?`;
    return {
      ...vbase,
      platform: "LinkedIn",
      format: "Text post",
      blocks: [{
        label: "Hook · first 2 lines before “…see more”",
        text: hook.join("\n"),
        kind: "hook"
      }, {
        label: "Full post — ready to paste",
        text: `${hook.join("\n")}\n\n${body}\n\n${cta}`
      }, {
        label: "First comment",
        text: firstComment
      }],
      hashtags: tag,
      playbook: liPlaybook,
      checklist: liChecklist,
      meta: [`~${(hook.join("") + body + cta).length} chars`, "Grade-8 readable", "Save + comment driven"]
    };
  },
  /* ---------------- INSTAGRAM ---------------- */
  async instagram(b, topic, format, hookStyle, tone, mediaCount, opts) {
    opts = opts || {};
    const real = await AI._tryReal({
      platform: "Instagram",
      brand: b,
      topic,
      format,
      hookStyle,
      tone,
      hookIndex: opts.hookIndex || 0,
      scriptLen: opts.scriptLen
    });
    if (real) return real;
    if (!opts.instant) await wait(1300);
    const n = b.niche || "this",
      aud = b.audience || "your people",
      y = b.years || "20";
    const variants = igVariants(hookStyle, b, topic);
    const hi = Math.min(opts.hookIndex || 0, variants.length - 1);
    const hook = variants[hi].text;
    const vbase = {
      hooks: variants,
      variantIndex: hi
    };
    const t = topic || "midlife reinvention";
    // keyword-rich caption first line for IG SEO; ≤5 hashtags (matches blotato cap)
    const tags = ["#" + n.replace(/[^a-z]/gi, ""), "#midlifereinvention", "#personalbranding", "#genxwomen", "#confidenceafter40"].slice(0, 5);
    const sendCTA = `Send this to a friend who needs the reminder today 💌`;
    const saveCTA = `Save this for the day you forget it 🤍`;
    const igPlaybook = [`First caption line leads with the keyword "${t}" — Instagram search now indexes captions, and keyword-rich captions out-reach hashtag-stuffed ones.`, `Built around a SEND: sends/DM-shares are the #1 ranking signal in 2026, so the content is specific enough that one reader pictures one friend.`, `Explicit SAVE cue too — saves drive long-tail reach and authority.`, `≤5 relevant hashtags only (Mosseri confirmed hashtags barely affect reach now; keywords do the work).`];
    const igChecklist = [`Post original content only — no visible TikTok watermark (it gets downranked).`, `Pin a value-add first comment to spark replies.`, `Check your account's "Most active times" in Insights and post then.`, `Reply to early comments fast to build engagement velocity.`];
    if (format === "Carousel") {
      const slides = [{
        kind: "cover",
        title: hook,
        body: "(swipe →)"
      }, {
        kind: "content",
        title: "1.",
        body: `Your experience is the asset.\nStop shrinking it to fit in.`
      }, {
        kind: "content",
        title: "2.",
        body: `Confidence is quiet.\nIt doesn't need a trend to be heard.`
      }, {
        kind: "content",
        title: "3.",
        body: `You're not behind.\nYou're building on ${y} years others don't have.`
      }, {
        kind: "content",
        title: "4.",
        body: `The right people find you\nwhen you sound like yourself.`
      }, {
        kind: "cta",
        title: "Save + send 🤍",
        body: `${saveCTA}\n${sendCTA}\n\nFollow for more on ${t}.`
      }];
      return {
        ...vbase,
        platform: "Instagram",
        format,
        slides,
        blocks: [{
          label: "Caption (keyword hook first line)",
          text: `${t} — the part no one tells you. ✨\n\nIt took me ${y} years to learn these. Swipe through, then save the one you needed.\n\n${saveCTA}\n${sendCTA}`
        }, {
          label: "Pinned first comment",
          text: `Which slide hit hardest? Tell me below 👇`
        }],
        hashtags: tags,
        playbook: ["Carousels get a second chance: if someone doesn't swipe past slide 1, Instagram re-shows it later — so the cover hook is everything.", "Cover answers \"is this for me?\" in ≤10 words.", "8–10 slides perform best; add at least one video slide (mixed-media carousels have the highest engagement of any format).", "Final slide drives save + send.", ...igPlaybook.slice(1, 3)],
        checklist: ["Add one short video slide if you can — it lifts engagement.", "Use 1080×1350 portrait slides.", ...igChecklist.slice(0, 3)],
        meta: [`${slides.length} slides`, "Second-chance reach", "Add a video slide"],
        mediaPrompt: "slides"
      };
    }
    if (format === "Reel") {
      const len = opts.scriptLen || "15–30s";
      const shortScript = `(0:00) ${hook}\n(0:02) Here's what I wish someone told me sooner about ${t}.\n(0:06) For ${y} years I thought I had to keep up.\n(0:12) Turns out I just had to show up — as me.\n(0:20) Your experience isn't baggage. It's the whole point.\n(0:27) Save this. Send it to someone who needs it.`;
      const fullScript = `(0:00) ${hook}\n(0:04) Here's what I wish someone had told me sooner about ${t}.\n(0:11) For ${y} years I thought being older meant being behind.\n(0:19) So I'd shrink my experience to fit in. Big mistake.\n(0:28) The moment I owned it, the right people started paying attention.\n(0:37) Your years aren't a liability — they're the whole reason someone should listen.\n(0:46) So stop waiting to feel ready. You already are.\n(0:54) Save this for the day you forget it — and send it to a friend who needs it today. 🤍`;
      return {
        ...vbase,
        platform: "Instagram",
        format,
        blocks: [{
          label: "On-screen text hook (first 3 seconds)",
          text: hook,
          kind: "hook"
        }, {
          label: `${len} voiceover script`,
          text: len === "30–60s" ? fullScript : shortScript
        }, {
          label: "Caption (keyword hook first line)",
          text: `${t}: the reminder you didn't know you needed today. ✨\n\nI spent ${y} years thinking I was behind. I wasn't. Neither are you.\n\n${saveCTA}\n${sendCTA}`
        }],
        hashtags: tags,
        playbook: [len === "30–60s" ? "Scripted to fill the full 30–60s with momentum — but watch your completion rate; if it dips, trim to a tighter 15–30s cut." : "Reels = top reach/discovery surface. Hook must land in the first 3 seconds (up to 50% drop off there).", "Burn in captions — half of Reels are watched on mute.", "Shorter holds completion highest; vertical 9:16, custom cover with a text headline.", "Optional: a trending-but-relevant audio under your voiceover (a smaller lever than the hook).", ...igPlaybook.slice(1, 2)],
        checklist: ["Add a custom cover with the hook as text.", "Keep on-screen text out of the bottom UI safe zone.", ...igChecklist.slice(0, 2)],
        meta: [len, "Captions required", "Vertical 9:16"],
        mediaPrompt: "video"
      };
    }

    // Single image
    return {
      ...vbase,
      platform: "Instagram",
      format: "Single image",
      blocks: [{
        label: "Caption (keyword hook first line)",
        text: `${hook}\n\nIt took me ${y} years in ${n} to believe this — so I'm saying it for whoever needs it: you are not too late.\n\n${saveCTA}\n${sendCTA}`
      }, {
        label: "Pinned first comment",
        text: `What's one thing you'd tell your younger self? 👇`
      }],
      hashtags: tags,
      playbook: igPlaybook,
      checklist: igChecklist,
      meta: ["Keyword caption", "Save + send CTA", "≤5 hashtags"],
      mediaPrompt: "image"
    };
  },
  /* ---------------- PROFILE OPTIMIZER ---------------- */
  async optimize(brand, kind, current) {
    await wait(1200);
    const niche = brand.niche || "your field",
      aud = brand.audience || "your ideal audience",
      y = brand.years || "20+";
    if (kind === "LinkedIn headline") {
      return `**Current**\n${current || "(none provided)"}\n\n**Reworked options**\n1. ${niche} strategist for ${aud} · ${y} yrs turning experience into clear decisions\n2. I help ${aud} cut through the noise in ${niche} | Speaker · Advisor\n3. Plain-spoken ${niche} expertise for people who value judgment over hype\n\n**Why these work**\nEach leads with *who you help* + the outcome, not a title. Keywords (${niche}, ${aud}) are front-loaded for search. The number signals depth without bragging.`;
    }
    if (kind === "LinkedIn About") {
      return `**Reworked opening 3 lines (all that shows before "see more")**\n"For ${y} years I've worked in ${niche}. Long enough to know what matters — and what's just noise.\nThese days I help ${aud} do the same.\nHere's how I think about it 👇"\n\n**Then:** one short origin paragraph · three credibility bullets (results, not adjectives) · a clear "who I help" line · a soft CTA ("Connect if you're navigating ${niche} — my DMs are open.")`;
    }
    return `**Reworked Instagram bio (150-char limit)**\n${niche} • ${y} yrs\nHelping ${aud} show up with confidence ✨\nReal talk on midlife reinvention 👇\n[ your link ]\n\n**Notes**\nLine 1 = what you do (searchable for IG SEO). Line 2 = who you help. Line 3 = personality + arrow to your link.`;
  }
};

/* ---------- API client (auth + server database) ---------- */
const API = {
  async me() {
    const r = await fetch("/api/me");
    return r.ok ? r.json() : null;
  },
  async signup(b) {
    const r = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(b)
    });
    return {
      ok: r.ok,
      status: r.status,
      data: await r.json().catch(() => ({}))
    };
  },
  async login(b) {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(b)
    });
    return {
      ok: r.ok,
      status: r.status,
      data: await r.json().catch(() => ({}))
    };
  },
  async logout() {
    await fetch("/api/logout", {
      method: "POST"
    });
  },
  async saveBrand(b) {
    await fetch("/api/brand", {
      method: "PUT",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(b)
    });
  },
  async drafts() {
    const r = await fetch("/api/drafts");
    return r.ok ? (await r.json()).drafts || [] : [];
  },
  async addDraft(d) {
    const r = await fetch("/api/drafts", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(d)
    });
    return (await r.json()).draft;
  },
  async patchDraft(id, patch) {
    const r = await fetch("/api/drafts/" + id, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(patch)
    });
    return (await r.json()).draft;
  },
  async delDraft(id) {
    await fetch("/api/drafts/" + id, {
      method: "DELETE"
    });
  }
};

/* ---------- best time to post (from researched algorithm windows) ---------- */
function bestTime(platform, format) {
  if (platform === "LinkedIn") return {
    hour: 9,
    short: "Tue–Thu, 8–10 AM",
    why: "Weekday mornings before work are LinkedIn's peak professional scroll."
  };
  if (format === "Reel") return {
    hour: 18,
    short: "Wed/Thu, 6–9 PM",
    why: "Reels peak in the evening when people unwind and watch video."
  };
  return {
    hour: 12,
    short: "Wed, 11 AM–1 PM",
    why: "Midday midweek is strongest for Instagram feed posts."
  };
}

/* ---------- assemble a saved draft from a generated result ---------- */
function assembleDraft(r) {
  const h = r.hooks && r.hooks[r.variantIndex || 0];
  const title = h ? h.lines ? h.lines[0] : h.text : (r.blocks[0] && r.blocks[0].text || "Untitled").split("\n")[0];
  let parts = [];
  if (r.slides) parts.push("CAROUSEL SLIDES:\n" + r.slides.map((s, i) => `${i + 1}. ${s.title.replace(/\n/g, " ")} — ${s.body.replace(/\n/g, " ")}`).join("\n"));
  if (r.poll) parts.push("POLL: " + r.poll.question + "\n" + r.poll.options.map(o => "• " + o).join("\n"));
  r.blocks.forEach(b => parts.push(b.label.toUpperCase() + ":\n" + b.text));
  if (r.hashtags) parts.push(r.hashtags.join(" "));
  return {
    title: title.slice(0, 80),
    text: parts.join("\n\n")
  };
}

/* ---------- date helpers ---------- */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function startOfWeek(d) {
  const x = new Date(d);
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDay(d) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}
function sameDay(a, b) {
  a = new Date(a);
  b = new Date(b);
  return a.toDateString() === b.toDateString();
}

/* ---------- copy + toast ---------- */
let _setToast = null;
function copy(t) {
  if (navigator.clipboard) navigator.clipboard.writeText((t || "").replace(/\*\*/g, ""));
  _setToast && _setToast("Copied to clipboard");
}

/* ---------- small components ---------- */
function Loading() {
  return /*#__PURE__*/React.createElement("span", {
    className: "loading"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null));
}
function fmtBold(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
function Output({
  text
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "gen-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Generated draft"), /*#__PURE__*/React.createElement("button", {
    className: "copybtn",
    onClick: () => copy(text)
  }, "⧉ Copy")), /*#__PURE__*/React.createElement("div", {
    className: "output",
    dangerouslySetInnerHTML: {
      __html: fmtBold(text)
    }
  }));
}

/* ====================== DASHBOARD HOME ====================== */
function Home({
  brand,
  go
}) {
  const ready = !!brand;
  const mods = [{
    id: "strategy",
    ic: "✦",
    t: "Brand Strategy",
    d: "Define your niche, voice, and content pillars."
  }, {
    id: "content",
    ic: "✎",
    t: "Content Generator",
    d: "Algorithm-optimized LinkedIn & Instagram content — posts, carousels, Reels."
  }, {
    id: "profile",
    ic: "◈",
    t: "Profile Optimizer",
    d: "Sharpen your headline, About, and bio."
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid g3",
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, ready ? "100%" : "0%"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Brand brief complete")), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "2"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Platforms optimized")), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "7"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Content formats ready"))), !ready && /*#__PURE__*/React.createElement("div", {
    className: "card pad",
    style: {
      marginBottom: 28,
      background: "linear-gradient(110deg,#fff,#fbf3ec)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Start here"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Let's define your brand first"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--ink-soft)",
      maxWidth: 560,
      marginTop: 6
    }
  }, "Everything in XPALLA is personalized to you. Four minutes on your brand strategy and every post, carousel, and Reel afterward will sound unmistakably like you."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      marginTop: 18
    },
    onClick: () => go("strategy")
  }, "Build my brand brief →")), /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "The Studio"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle",
    style: {
      marginBottom: 18
    }
  }, "Your tools"), /*#__PURE__*/React.createElement("div", {
    className: "grid g3"
  }, mods.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: "card pad modcard",
    onClick: () => go(m.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "arrow"
  }, "→"), /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, m.ic), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Cormorant Garamond',serif",
      fontSize: 22,
      fontWeight: 600
    }
  }, m.t), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--ink-soft)",
      fontSize: 13.5,
      marginTop: 6
    }
  }, m.d)))), ready && /*#__PURE__*/React.createElement("div", {
    className: "card pad",
    style: {
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Your brand, in one line"), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 27,
      marginTop: 8,
      lineHeight: 1.3,
      maxWidth: 720
    }
  }, "“", brand.name || "You", " helps ", brand.audience || "your audience", " ", brand.outcome || "make confident decisions", ".”"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "pill plum"
  }, brand.niche || "Your field"), (brand.voice || []).map(v => /*#__PURE__*/React.createElement("span", {
    key: v,
    className: "pill"
  }, v)))));
}

/* ====================== STRATEGY (wizard) ====================== */
const VOICE_OPTS = ["Warm", "Candid", "Authoritative", "Witty", "Reassuring", "Bold", "Elegant", "Down-to-earth"];
function Strategy({
  brand,
  setBrand,
  go
}) {
  const [step, setStep] = useState(brand ? 3 : 0);
  const [f, setF] = useState(brand || {
    name: "",
    niche: "",
    years: "",
    audience: "",
    outcome: "",
    voice: []
  });
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState(brand && brand.brief || "");
  const steps = ["You", "Audience", "Voice", "Brief"];
  const toggleVoice = v => setF(s => ({
    ...s,
    voice: s.voice.includes(v) ? s.voice.filter(x => x !== v) : [...s.voice, v].slice(0, 4)
  }));
  const upd = (k, v) => setF(s => ({
    ...s,
    [k]: v
  }));
  async function generate() {
    setBusy(true);
    const text = await AI.brandBrief(f);
    setBrief(text);
    const nb = {
      ...f,
      brief: text
    };
    setBrand(nb);
    setBusy(false);
    setStep(3);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "fade",
    style: {
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "stepbar"
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s,
    className: "step " + (i < step ? "done" : i === step ? "cur" : "")
  }))), step === 0 && /*#__PURE__*/React.createElement("div", {
    className: "card pad fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stepmeta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "Step 1 of 4 — Foundation")), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Tell me about you"), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Your name or brand name"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.name,
    onChange: e => upd("name", e.target.value),
    placeholder: "e.g. Diane Marlowe"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Your field / niche"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.niche,
    onChange: e => upd("niche", e.target.value),
    placeholder: "e.g. executive leadership coaching"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Years of experience"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    style: {
      maxWidth: 160
    },
    value: f.years,
    onChange: e => upd("years", e.target.value),
    placeholder: "e.g. 24"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    disabled: !f.niche,
    onClick: () => setStep(1)
  }, "Continue →"))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "card pad fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stepmeta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "Step 2 of 4 — Audience")), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Who are you here for?"), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Who do you most want to reach?"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: f.audience,
    onChange: e => upd("audience", e.target.value),
    placeholder: "e.g. women re-entering the workforce after 45"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "What outcome do you help them reach?"), /*#__PURE__*/React.createElement("textarea", {
    className: "tin",
    value: f.outcome,
    onChange: e => upd("outcome", e.target.value),
    placeholder: "e.g. land senior roles without pretending to be someone they're not"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep(0)
  }, "← Back"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    disabled: !f.audience,
    onClick: () => setStep(2)
  }, "Continue →"))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "card pad fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stepmeta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "Step 3 of 4 — Voice")), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "How should you sound?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--muted)",
      fontSize: 13.5,
      marginTop: 4
    }
  }, "Choose up to four. This shapes every draft XPALLA writes."), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, VOICE_OPTS.map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: "chip " + (f.voice.includes(v) ? "on" : ""),
    onClick: () => toggleVoice(v)
  }, v))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep(1)
  }, "← Back"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-gold",
    disabled: !f.voice.length || busy,
    onClick: generate
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : "Generate my brand brief ✦"))), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "card pad fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stepmeta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "Your brand brief"), /*#__PURE__*/React.createElement("span", {
    className: "pill plum"
  }, "Saved")), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, f.name || "Your", " brand brief"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--muted)",
      fontSize: 13.5,
      margin: "2px 0 18px"
    }
  }, "This now powers your content and profile tools."), /*#__PURE__*/React.createElement(Output, {
    text: brief || "(Generate to see your brief)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep(2)
  }, "← Refine inputs"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => go("content")
  }, "Create content →"))));
}

/* ====================== MEDIA TRAY ====================== */
function MediaTray({
  media,
  setMedia,
  prompt
}) {
  const inp = useRef();
  function add(e) {
    const files = Array.from(e.target.files || []);
    const next = files.map((file, i) => ({
      id: media.length + i + "_" + file.name,
      kind: file.type.startsWith("video") ? "video" : "image",
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setMedia([...media, ...next]);
    e.target.value = "";
  }
  const label = prompt === "video" ? "Upload your video (or images)" : prompt === "slides" ? "Upload slide images / a video slide" : "Add media — images or video";
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Media"), /*#__PURE__*/React.createElement("div", {
    className: "dropzone",
    onClick: () => inp.current.click()
  }, /*#__PURE__*/React.createElement("div", {
    className: "dz-ic"
  }, prompt === "video" ? "🎬" : "⬆"), /*#__PURE__*/React.createElement("div", {
    className: "dz-t"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "dz-s"
  }, "Click to choose files · MP4, MOV, JPG, PNG")), /*#__PURE__*/React.createElement("input", {
    ref: inp,
    type: "file",
    accept: "image/*,video/*",
    multiple: true,
    style: {
      display: "none"
    },
    onChange: add
  }), media.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mediatray"
  }, media.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: "mediaitem"
  }, m.kind === "video" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("video", {
    src: m.url,
    muted: true
  }), /*#__PURE__*/React.createElement("span", {
    className: "vlabel"
  }, "▶ video")) : /*#__PURE__*/React.createElement("img", {
    src: m.url,
    alt: ""
  }), /*#__PURE__*/React.createElement("button", {
    className: "rm",
    onClick: () => setMedia(media.filter(x => x.id !== m.id))
  }, "✕")))));
}

/* ====================== CAROUSEL PREVIEW ====================== */
/* ---------- brand kit helpers ---------- */
const KIT_DEFAULT = {
  on: false,
  primary: "#6B3F5B",
  accent: "#B08D57",
  font: "Editorial",
  logo: null,
  handle: ""
};
const KIT_FONTS = {
  Editorial: "'Cormorant Garamond', serif",
  Modern: "'Inter', sans-serif",
  Classic: "Georgia, 'Times New Roman', serif"
};
function hexParts(hex) {
  hex = (hex || "").replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [parseInt(hex.substr(0, 2), 16) || 0, parseInt(hex.substr(2, 2), 16) || 0, parseInt(hex.substr(4, 2), 16) || 0];
}
function lum(hex) {
  const p = hexParts(hex);
  return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
}
function shade(hex, amt) {
  return '#' + hexParts(hex).map(x => Math.max(0, Math.min(255, x + amt)).toString(16).padStart(2, '0')).join('');
}
function Carousel({
  slides,
  media,
  onEdit,
  kit,
  editing
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
  }, [slides]);
  const s = slides[i];
  const m = media && media[i];
  let cardStyle = null,
    titleStyle = null,
    txt = null;
  if (kit) {
    txt = lum(kit.primary) > 0.62 ? "#211E1A" : "#ffffff";
    cardStyle = {
      background: `linear-gradient(150deg, ${kit.primary}, ${shade(kit.primary, -26)})`,
      color: txt
    };
    titleStyle = {
      fontFamily: KIT_FONTS[kit.font] || KIT_FONTS.Editorial,
      color: txt
    };
  }
  const fade = o => txt ? {
    color: txt,
    opacity: o
  } : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "carousel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sechead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "seclabel"
  }, "Carousel — slide ", i + 1, " of ", slides.length), /*#__PURE__*/React.createElement("button", {
    className: "copybtn",
    onClick: () => copy(slides.map((x, n) => `Slide ${n + 1}: ${x.title.replace(/\n/g, " ")} — ${x.body.replace(/\n/g, " ")}`).join("\n"))
  }, "⧉ Copy all")), /*#__PURE__*/React.createElement("div", {
    className: "slidecard " + (kit ? "kit" : s.kind),
    style: cardStyle
  }, m && (m.kind === "image" ? /*#__PURE__*/React.createElement("img", {
    className: "slidethumb",
    src: m.url,
    alt: ""
  }) : /*#__PURE__*/React.createElement("video", {
    className: "slidethumb",
    src: m.url,
    muted: true
  })), kit && kit.logo && /*#__PURE__*/React.createElement("img", {
    className: "kitlogo-slide",
    src: kit.logo,
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "snum",
    style: fade(.55)
  }, i + 1, "/", slides.length), editing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    className: "sedit-title",
    value: s.title,
    onChange: e => onEdit && onEdit(i, {
      title: e.target.value
    }),
    style: kit ? {
      fontFamily: KIT_FONTS[kit.font]
    } : null,
    placeholder: "Slide title"
  }), /*#__PURE__*/React.createElement("textarea", {
    className: "sedit-body",
    value: s.body,
    onChange: e => onEdit && onEdit(i, {
      body: e.target.value
    }),
    placeholder: "Slide text"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "stitle",
    style: titleStyle
  }, s.title), /*#__PURE__*/React.createElement("div", {
    className: "sbody",
    style: fade(.92)
  }, s.body)), kit && kit.handle && /*#__PURE__*/React.createElement("div", {
    className: "kithandle",
    style: fade(.75)
  }, kit.handle), m && /*#__PURE__*/React.createElement("div", {
    className: "mediabadge"
  }, m.kind === "video" ? "🎬" : "🖼", " ", m.name)), /*#__PURE__*/React.createElement("div", {
    className: "slidenav"
  }, /*#__PURE__*/React.createElement("button", {
    className: "navbtn",
    disabled: i === 0,
    onClick: () => setI(i - 1)
  }, "‹"), /*#__PURE__*/React.createElement("div", {
    className: "dots"
  }, slides.map((_, n) => /*#__PURE__*/React.createElement("span", {
    key: n,
    className: "dot " + (n === i ? "on" : ""),
    onClick: () => setI(n)
  }))), /*#__PURE__*/React.createElement("button", {
    className: "navbtn",
    disabled: i === slides.length - 1,
    onClick: () => setI(i + 1)
  }, "›")), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, editing ? `Editing slide ${i + 1} — type to rewrite its title and text.` : "Upload images/video above to attach to slides in order. Tap ✎ Edit to rewrite any slide."));
}

/* branded preview card — applies the brand kit to non-carousel formats */
function BrandCard({
  kit,
  title,
  platform,
  format,
  media
}) {
  const txt = lum(kit.primary) > 0.62 ? "#211E1A" : "#ffffff";
  const fade = o => ({
    color: txt,
    opacity: o
  });
  const m = media && media[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "carousel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sechead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "seclabel"
  }, "Branded preview · ", format)), /*#__PURE__*/React.createElement("div", {
    className: "slidecard kit",
    style: {
      background: `linear-gradient(150deg, ${kit.primary}, ${shade(kit.primary, -26)})`,
      color: txt
    }
  }, m && (m.kind === "image" ? /*#__PURE__*/React.createElement("img", {
    className: "slidethumb",
    src: m.url,
    alt: ""
  }) : /*#__PURE__*/React.createElement("video", {
    className: "slidethumb",
    src: m.url,
    muted: true
  })), kit.logo && /*#__PURE__*/React.createElement("img", {
    className: "kitlogo-slide",
    src: kit.logo,
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "snum",
    style: fade(.55)
  }, platform), /*#__PURE__*/React.createElement("div", {
    className: "stitle",
    style: {
      fontFamily: KIT_FONTS[kit.font] || KIT_FONTS.Editorial,
      color: txt
    }
  }, title), kit.handle && /*#__PURE__*/React.createElement("div", {
    className: "kithandle",
    style: fade(.75)
  }, kit.handle)), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, "Your hook on a branded card — same colours, font, logo & handle as your carousels."));
}

/* estimate spoken runtime for a script block (strips timestamps), vs the target length */
function scriptStats(text, label) {
  const clean = (text || "").replace(/\(\d+:\d+\)/g, " ").replace(/[#*_]/g, " ");
  const words = (clean.match(/[A-Za-z0-9’'\-]+/g) || []).length;
  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  const low = Math.round(words / 2.5),
    high = Math.round(words / 2.0),
    mid = Math.round(words / 2.25);
  const nums = (label.match(/\d+/g) || []).map(Number);
  const min = nums[0] || 0,
    max = nums[1] || nums[0] || 999;
  let verdict = "on target ✓",
    color = "#4a7c59";
  if (mid < min) {
    verdict = "a bit short — add a beat";
    color = "#b5654a";
  } else if (mid > max) {
    verdict = "may run long — trim a line";
    color = "#b5654a";
  }
  return {
    words,
    range: fmt(low) + "–" + fmt(high),
    verdict,
    color
  };
}

/* ====================== RESULT RENDERER ====================== */
function Result({
  r,
  media,
  onSelectVariant,
  onEditSlide,
  onEditBlock,
  onEditHashtags,
  onEditPoll,
  kit
}) {
  const [edit, setEdit] = useState(false);
  const hk = r.hooks && r.hooks[r.variantIndex || 0];
  const hookText = hk ? hk.lines ? hk.lines.join("\n") : hk.text : r.blocks && r.blocks[0] && r.blocks[0].text || "";
  // "Copy post + hashtags" = the postable text (hook+body+caption) + hashtags, minus first comment / script / on-screen assets.
  const isAsset = lbl => /first comment|script|on-screen/i.test(lbl || "");
  const postBlocks = (r.blocks || []).filter(b => !isAsset(b.label));
  const dedup = postBlocks.filter((b, i) => !postBlocks.some((o, j) => j !== i && o.text.length > b.text.length && o.text.includes((b.text || "").trim())));
  const combinedPost = dedup.map(b => b.text).join("\n\n") + (r.hashtags && r.hashtags.length ? "\n\n" + r.hashtags.join(" ") : "");
  return /*#__PURE__*/React.createElement("div", {
    className: "fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "metarow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pill " + (r.platform === "Instagram" ? "plum" : "gold")
  }, r.platform, " · ", r.format), (r.meta || []).map(m => /*#__PURE__*/React.createElement("span", {
    key: m,
    className: "pill"
  }, m)), r._source === "claude" && /*#__PURE__*/React.createElement("span", {
    className: "pill gold"
  }, "✦ written by Claude"), kit && /*#__PURE__*/React.createElement("span", {
    className: "pill plum"
  }, "🎨 Brand kit on")), /*#__PURE__*/React.createElement("div", {
    className: "resultbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "copypost",
    onClick: () => copy(combinedPost)
  }, "⧉ Copy post + hashtags"), /*#__PURE__*/React.createElement("button", {
    className: "editall",
    onClick: () => setEdit(!edit)
  }, edit ? "✓ Done editing" : "✎ Edit output")), (() => {
    const bt = bestTime(r.platform, r.format);
    return /*#__PURE__*/React.createElement("div", {
      className: "besttime"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bt-ic"
    }, "🕑"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Best time to post:"), " ", bt.short, " ", /*#__PURE__*/React.createElement("span", {
      className: "bt-why"
    }, "· ", bt.why)));
  })(), r.hooks && r.hooks.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "variants"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sechead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "seclabel"
  }, "Hook variants · pick one or A/B test all three"), /*#__PURE__*/React.createElement("button", {
    className: "copybtn",
    onClick: () => copy(r.hooks.map((h, i) => `Variant ${String.fromCharCode(65 + i)} (${h.style}): ${h.lines ? h.lines.join(" ") : h.text}`).join("\n\n"))
  }, "⧉ Copy all 3")), /*#__PURE__*/React.createElement("div", {
    className: "vtabs"
  }, r.hooks.map((h, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "vtab " + (i === r.variantIndex ? "on" : ""),
    onClick: () => onSelectVariant && onSelectVariant(i)
  }, /*#__PURE__*/React.createElement("span", {
    className: "vlabel2"
  }, String.fromCharCode(65 + i), " · ", h.style, i === r.variantIndex ? " · in use" : ""), /*#__PURE__*/React.createElement("span", {
    className: "vtext"
  }, h.lines ? h.lines.join("  /  ") : h.text))))), r.slides ? /*#__PURE__*/React.createElement(Carousel, {
    slides: r.slides,
    media: media,
    onEdit: onEditSlide,
    kit: kit,
    editing: edit
  }) : kit && /*#__PURE__*/React.createElement(BrandCard, {
    kit: kit,
    title: hookText,
    platform: r.platform,
    format: r.format,
    media: media
  }), r.poll && /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sechead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "seclabel"
  }, "Poll")), edit ? /*#__PURE__*/React.createElement("div", {
    className: "secbody",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "editline",
    value: r.poll.question,
    onChange: e => onEditPoll && onEditPoll({
      ...r.poll,
      question: e.target.value
    })
  }), r.poll.options.map((o, oi) => /*#__PURE__*/React.createElement("input", {
    key: oi,
    className: "editline",
    value: o,
    onChange: e => onEditPoll && onEditPoll({
      ...r.poll,
      options: r.poll.options.map((x, j) => j === oi ? e.target.value : x)
    })
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "secbody"
  }, /*#__PURE__*/React.createElement("strong", null, r.poll.question), "\n", r.poll.options.map(o => "○ " + o).join("\n"))), r.blocks.map((b, n) => /*#__PURE__*/React.createElement("div", {
    className: "section",
    key: n
  }, /*#__PURE__*/React.createElement("div", {
    className: "sechead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "seclabel"
  }, b.label), isAsset(b.label) && /*#__PURE__*/React.createElement("button", {
    className: "copybtn",
    onClick: () => copy(b.text)
  }, "⧉ Copy")), edit ? /*#__PURE__*/React.createElement("textarea", {
    className: "editarea",
    value: b.text,
    onChange: e => onEditBlock && onEditBlock(n, e.target.value)
  }) : /*#__PURE__*/React.createElement("div", {
    className: "secbody" + (b.kind === "hook" ? " hook" : ""),
    style: kit && b.kind === "hook" ? {
      borderLeftColor: kit.accent
    } : null
  }, b.text), /script/i.test(b.label) && (() => {
    const s = scriptStats(b.text, b.label);
    return /*#__PURE__*/React.createElement("div", {
      className: "runtime"
    }, "⏱ ", s.words, " words · ≈ ", s.range, " spoken · ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: s.color,
        fontWeight: 500
      }
    }, s.verdict));
  })())), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sechead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "seclabel"
  }, "Hashtags (", r.hashtags.length, ") · included in “Copy post + hashtags”")), edit ? /*#__PURE__*/React.createElement("input", {
    className: "editline",
    value: r.hashtags.join(" "),
    onChange: e => onEditHashtags && onEditHashtags(e.target.value.split(/\s+/).filter(Boolean)),
    placeholder: "#tag1 #tag2"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "secbody muted"
  }, r.hashtags.join("  "))), /*#__PURE__*/React.createElement("div", {
    className: "playbook"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pb-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pb-h why"
  }, "✦ Algorithm edge — why this will perform"), /*#__PURE__*/React.createElement("ul", {
    className: "pb-list"
  }, r.playbook.map((p, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    dangerouslySetInnerHTML: {
      __html: fmtBold(p)
    }
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pb-h pre"
  }, "○ Before you post"), /*#__PURE__*/React.createElement("ul", {
    className: "pb-list pre"
  }, r.checklist.map((p, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, p)))))));
}

/* ====================== CONTENT GENERATOR ====================== */
const FORMATS = {
  LinkedIn: ["Text post", "Document carousel", "Video / Reel", "Poll"],
  Instagram: ["Reel", "Carousel", "Single image"]
};
const HOOKS = {
  LinkedIn: ["Auto", "Contrarian", "Surprising stat", "Transformation", "Story", "Mistake", "Listicle", "Industry shift", "Call-out"],
  Instagram: ["Auto", "Contrarian", "Mistake warning", "List tease", "Cliffhanger", "Result + time", "Self-relevance", "Transformation", "Authority"]
};
const COMP_KEY = "xpalla_composer";
function Content({
  brand,
  setBrand,
  go
}) {
  const _saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(COMP_KEY)) || {};
    } catch (e) {
      return {};
    }
  })();
  const [platform, setPlatform] = useState(_saved.platform || "LinkedIn");
  const [format, setFormat] = useState(_saved.format || "Text post");
  const [hookStyle, setHookStyle] = useState(_saved.hookStyle || "Auto");
  const [tone, setTone] = useState(_saved.tone || "Warm");
  const [scriptLen, setScriptLen] = useState(_saved.scriptLen || "30–60s");
  const [topic, setTopic] = useState(_saved.topic || "");
  const [media, setMedia] = useState([]);
  const [r, setR] = useState(_saved.r || null);
  const [busy, setBusy] = useState(false);
  const [showLib, setShowLib] = useState(false);
  const [showKit, setShowKit] = useState(false);
  const logoInp = useRef();
  // autosave composer inputs so nothing is lost when switching tabs or reloading
  useEffect(() => {
    try {
      localStorage.setItem(COMP_KEY, JSON.stringify({
        platform,
        format,
        hookStyle,
        tone,
        scriptLen,
        topic,
        r
      }));
    } catch (e) {}
  }, [platform, format, hookStyle, tone, scriptLen, topic, r]);
  if (!brand) return /*#__PURE__*/React.createElement(NeedBrand, {
    go: go
  });
  function switchPlatform(p) {
    setPlatform(p);
    setFormat(FORMATS[p][0]);
    setHookStyle("Auto");
    setR(null);
  }
  const mediaPrompt = format.match(/Video|Reel/) ? "video" : format.match(/[Cc]arousel/) ? "slides" : "image";
  async function runGen(hookIndex = 0, instant = false) {
    if (!instant) {
      setBusy(true);
      setR(null);
    }
    const fn = platform === "LinkedIn" ? AI.linkedin : AI.instagram;
    const res = await fn(brand, topic, format, hookStyle, tone, media.length, {
      hookIndex,
      instant,
      scriptLen
    });
    setR(res);
    if (!instant) setBusy(false);
  }
  const gen = () => runGen(0, false);
  const lib = getLibrary(platform, brand, topic);
  const kit = {
    ...KIT_DEFAULT,
    ...(brand.kit || {})
  };
  function editSlide(i, patch) {
    setR(cur => cur && cur.slides ? {
      ...cur,
      slides: cur.slides.map((s, n) => n === i ? {
        ...s,
        ...patch
      } : s)
    } : cur);
  }
  function editBlock(i, text) {
    setR(cur => cur && cur.blocks ? {
      ...cur,
      blocks: cur.blocks.map((b, n) => n === i ? {
        ...b,
        text
      } : b)
    } : cur);
  }
  function editHashtags(arr) {
    setR(cur => cur ? {
      ...cur,
      hashtags: arr
    } : cur);
  }
  function editPoll(poll) {
    setR(cur => cur ? {
      ...cur,
      poll
    } : cur);
  }
  function updateKit(patch) {
    setBrand && setBrand({
      ...brand,
      kit: {
        ...kit,
        ...patch
      }
    });
  }
  function uploadLogo(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => updateKit({
      logo: rd.result
    });
    rd.readAsDataURL(f);
    e.target.value = "";
  }
  async function saveCurrent() {
    if (!r) return;
    const {
      title,
      text
    } = assembleDraft(r);
    const hk = r.hooks && r.hooks[r.variantIndex || 0];
    await API.addDraft({
      platform: r.platform,
      format: r.format,
      hookStyle: hk && hk.style || hookStyle,
      title,
      text,
      hashtags: r.hashtags || [],
      scheduledFor: null,
      status: "draft",
      metrics: null
    });
    _setToast && _setToast("Saved to drafts — open the Calendar to schedule it");
  }
  const ideas = ["A lesson that took me years to learn", "A myth in my industry", "Behind how I actually work", "Why experience beats hustle", "Starting over after 45"];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade grid g2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Compose"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "What's on your mind?"), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Platform"), /*#__PURE__*/React.createElement("div", {
    className: "seg",
    style: {
      maxWidth: 260
    }
  }, ["LinkedIn", "Instagram"].map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    className: platform === p ? "on" : "",
    onClick: () => switchPlatform(p)
  }, p)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Format"), /*#__PURE__*/React.createElement("div", {
    className: "seg " + (platform === "Instagram" ? "ig" : "li")
  }, FORMATS[platform].map(fm => /*#__PURE__*/React.createElement("button", {
    key: fm,
    className: format === fm ? "on" : "",
    onClick: () => {
      setFormat(fm);
      setR(null);
    }
  }, fm)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Topic or idea"), /*#__PURE__*/React.createElement("textarea", {
    className: "tin",
    value: topic,
    onChange: e => setTopic(e.target.value),
    placeholder: "Say it plainly — XPALLA shapes it into your voice and the algorithm's rules."
  }), /*#__PURE__*/React.createElement("div", {
    className: "chips",
    style: {
      marginTop: 10
    }
  }, ideas.map(i => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "chip",
    onClick: () => setTopic(i)
  }, i)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Hook style"), /*#__PURE__*/React.createElement("select", {
    className: "tin",
    value: hookStyle,
    onChange: e => setHookStyle(e.target.value)
  }, HOOKS[platform].map(h => /*#__PURE__*/React.createElement("option", {
    key: h
  }, h))), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, "Proven viral hook frameworks. “Auto” picks the best fit."), /*#__PURE__*/React.createElement("button", {
    className: "libtoggle",
    onClick: () => setShowLib(!showLib)
  }, "📚 ", showLib ? "Hide" : "Browse", " hook library — ", lib.reduce((a, g) => a + g.hooks.length, 0), " proven ", platform, " hooks"), showLib && /*#__PURE__*/React.createElement("div", {
    className: "libpanel"
  }, lib.map(g => /*#__PURE__*/React.createElement("div", {
    className: "libgroup",
    key: g.style
  }, /*#__PURE__*/React.createElement("div", {
    className: "lgh"
  }, /*#__PURE__*/React.createElement("span", null, g.style), /*#__PURE__*/React.createElement("span", {
    className: "usebtn",
    onClick: () => {
      setHookStyle(g.style);
      setShowLib(false);
    }
  }, "Use this style →")), g.hooks.map((h, i) => /*#__PURE__*/React.createElement("div", {
    className: "libhook",
    key: i
  }, /*#__PURE__*/React.createElement("span", null, h), /*#__PURE__*/React.createElement("span", {
    className: "lcopy",
    onClick: () => copy(h)
  }, "⧉"))))))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Tone"), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, ["Warm", "Candid", "Bold", "Reflective"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: "chip " + (tone === t ? "on" : ""),
    onClick: () => setTone(t)
  }, t)))), /Reel|Video/.test(format) && /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Script length"), /*#__PURE__*/React.createElement("div", {
    className: "seg",
    style: {
      maxWidth: 280
    }
  }, ["15–30s", "30–60s"].map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    className: scriptLen === l ? "on" : "",
    onClick: () => {
      setScriptLen(l);
      setR(null);
    }
  }, l))), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, "Sets how long the voiceover/script runs. 30–60s gives a fuller story; keep an eye on completion rate.")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("button", {
    className: "libtoggle",
    onClick: () => setShowKit(!showKit)
  }, "🎨 ", showKit ? "Hide brand kit" : "Brand kit", " — colours, font & logo for carousels", kit.on ? " · ON" : ""), showKit && /*#__PURE__*/React.createElement("div", {
    className: "libpanel"
  }, /*#__PURE__*/React.createElement("label", {
    className: "kitrow"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: kit.on,
    onChange: e => updateKit({
      on: e.target.checked
    })
  }), " Apply brand kit to carousel slides"), /*#__PURE__*/React.createElement("div", {
    className: "kitgrid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Primary"), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: kit.primary,
    onChange: e => updateKit({
      primary: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Accent"), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: kit.accent,
    onChange: e => updateKit({
      accent: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Font"), /*#__PURE__*/React.createElement("select", {
    className: "tin",
    value: kit.font,
    onChange: e => updateKit({
      font: e.target.value
    })
  }, ["Editorial", "Modern", "Classic"].map(f => /*#__PURE__*/React.createElement("option", {
    key: f
  }, f))))), /*#__PURE__*/React.createElement("div", {
    className: "field",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Handle on slides"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: kit.handle,
    onChange: e => updateKit({
      handle: e.target.value
    }),
    placeholder: "@yourname"
  })), /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Logo"), kit.logo ? /*#__PURE__*/React.createElement("div", {
    className: "kitlogo"
  }, /*#__PURE__*/React.createElement("img", {
    src: kit.logo,
    alt: "logo"
  }), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => updateKit({
      logo: null
    })
  }, "Remove")) : /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => logoInp.current && logoInp.current.click()
  }, "⬆ Upload logo"), /*#__PURE__*/React.createElement("input", {
    ref: logoInp,
    type: "file",
    accept: "image/*",
    style: {
      display: "none"
    },
    onChange: uploadLogo
  }), /*#__PURE__*/React.createElement("p", {
    className: "hint",
    style: {
      marginTop: 10
    }
  }, "Styles the carousel preview on the right. Saved to your brand automatically."))), /*#__PURE__*/React.createElement(MediaTray, {
    media: media,
    setMedia: setMedia,
    prompt: mediaPrompt
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-gold",
    style: {
      width: "100%",
      justifyContent: "center",
      marginTop: 6
    },
    disabled: busy,
    onClick: gen
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : `Generate ${format} ✎`), /*#__PURE__*/React.createElement("p", {
    className: "hint",
    style: {
      textAlign: "center",
      marginTop: 10
    }
  }, "Optimized for the 2026 ", platform, " algorithm · your ", (brand.voice || []).join(" / ") || "brand", " voice")), /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, r ? /*#__PURE__*/React.createElement(Result, {
    r: r,
    media: media,
    onSelectVariant: i => runGen(i, true),
    onEditSlide: editSlide,
    onEditBlock: editBlock,
    onEditHashtags: editHashtags,
    onEditPoll: editPoll,
    kit: kit.on ? kit : null
  }) : /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, platform === "Instagram" ? "◐" : "“"), /*#__PURE__*/React.createElement("p", null, "Your ", format.toLowerCase(), " will appear here —", /*#__PURE__*/React.createElement("br", null), "engineered for reach, saves, and comments, in your voice.")), r && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: saveCurrent
  }, "＋ Save draft"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: gen,
    disabled: busy
  }, "↻ Regenerate"))));
}

/* ====================== PROFILE OPTIMIZER ====================== */
function Profile({
  brand,
  go
}) {
  const kinds = ["LinkedIn headline", "LinkedIn About", "Instagram bio"];
  const [kind, setKind] = useState(kinds[0]);
  const [cur, setCur] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  if (!brand) return /*#__PURE__*/React.createElement(NeedBrand, {
    go: go
  });
  async function gen() {
    setBusy(true);
    setOut("");
    const text = await AI.optimize(brand, kind, cur);
    setOut(text);
    setBusy(false);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "fade grid g2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Optimize"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Sharpen your profile"), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "What are we improving?"), /*#__PURE__*/React.createElement("select", {
    className: "tin",
    value: kind,
    onChange: e => {
      setKind(e.target.value);
      setOut("");
    }
  }, kinds.map(k => /*#__PURE__*/React.createElement("option", {
    key: k
  }, k)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Paste your current version (optional)"), /*#__PURE__*/React.createElement("textarea", {
    className: "tin",
    value: cur,
    onChange: e => setCur(e.target.value),
    placeholder: "Paste what you have now — or leave blank to start fresh."
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-gold",
    style: {
      width: "100%",
      justifyContent: "center"
    },
    disabled: busy,
    onClick: gen
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : "Optimize ◈")), /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, out ? /*#__PURE__*/React.createElement(Output, {
    text: out
  }) : /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, "◈"), /*#__PURE__*/React.createElement("p", null, "Optimized suggestions appear here —", /*#__PURE__*/React.createElement("br", null), "keyword-aware and written for ", brand.audience || "your audience", "."))));
}
function NeedBrand({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "card pad fade",
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "One step first"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Build your brand brief"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--ink-soft)",
      marginTop: 6
    }
  }, "This tool personalizes everything to your voice and audience. Set up your brand brief and it unlocks."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      marginTop: 16
    },
    onClick: () => go("strategy")
  }, "Build my brand brief →"));
}

/* ====================== CONTENT CALENDAR ====================== */
function Calendar({
  go
}) {
  const [drafts, setDrafts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [schedId, setSchedId] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    API.drafts().then(d => {
      setDrafts(d);
      setLoaded(true);
    });
  }, []);
  const update = async (id, patch) => {
    const nd = await API.patchDraft(id, patch);
    setDrafts(ds => ds.map(x => x.id === id ? nd : x));
  };
  const del = async id => {
    await API.delDraft(id);
    setDrafts(ds => ds.filter(x => x.id !== id));
  };
  function scheduleTo(draft, dayDate) {
    const bt = bestTime(draft.platform, draft.format);
    const dt = new Date(dayDate);
    dt.setHours(bt.hour, 0, 0, 0);
    update(draft.id, {
      scheduledFor: dt.toISOString(),
      status: "scheduled"
    });
    setSchedId(null);
    _setToast && _setToast("Scheduled for " + fmtDay(dt) + " at " + fmtTime(dt.toISOString()));
  }
  const unsched = drafts.filter(d => !d.scheduledFor);
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i));
  const onDay = d => drafts.filter(x => x.scheduledFor && sameDay(x.scheduledFor, d)).sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  const today = new Date();
  if (loaded && !drafts.length) return /*#__PURE__*/React.createElement("div", {
    className: "card pad fade",
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Nothing saved yet"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Your calendar is empty"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--ink-soft)",
      marginTop: 6
    }
  }, "Generate a post, carousel, or Reel, hit ", /*#__PURE__*/React.createElement("strong", null, "＋ Save draft"), ", then come back here to schedule it at the best time."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      marginTop: 16
    },
    onClick: () => go("content")
  }, "Create content →"));
  return /*#__PURE__*/React.createElement("div", {
    className: "fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card pad",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sechead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Drafts to schedule (", unsched.length, ")"), schedId && /*#__PURE__*/React.createElement("span", {
    className: "pill plum"
  }, "Pick a day below ↓")), unsched.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "hint",
    style: {
      marginTop: 6
    }
  }, "All drafts are scheduled. Nicely done.") : /*#__PURE__*/React.createElement("div", {
    className: "draftrow"
  }, unsched.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.id,
    className: "draftcard " + (schedId === d.id ? "sel" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "pill " + (d.platform === "Instagram" ? "plum" : "gold")
  }, d.platform, " · ", d.format), /*#__PURE__*/React.createElement("div", {
    className: "dtitle"
  }, d.title), /*#__PURE__*/React.createElement("div", {
    className: "dactions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => setSchedId(schedId === d.id ? null : d.id)
  }, schedId === d.id ? "Cancel" : "📅 Schedule"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => setOpen(open === d.id ? null : d.id)
  }, open === d.id ? "Hide" : "View"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => copy(d.text)
  }, "⧉ Copy"), /*#__PURE__*/React.createElement("button", {
    className: "mini danger",
    onClick: () => del(d.id)
  }, "Delete")), open === d.id && /*#__PURE__*/React.createElement("div", {
    className: "dfull"
  }, d.text))))), /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("div", {
    className: "weeknav"
  }, /*#__PURE__*/React.createElement("button", {
    className: "navbtn",
    onClick: () => setWeekStart(addDays(weekStart, -7))
  }, "‹"), /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      fontSize: 22,
      fontWeight: 600
    }
  }, "Week of ", fmtDay(weekStart)), /*#__PURE__*/React.createElement("button", {
    className: "navbtn",
    onClick: () => setWeekStart(addDays(weekStart, 7))
  }, "›"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      marginLeft: "auto",
      padding: "8px 16px"
    },
    onClick: () => setWeekStart(startOfWeek(new Date()))
  }, "This week")), /*#__PURE__*/React.createElement("div", {
    className: "weekgrid"
  }, days.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "daycol " + (sameDay(d, today) ? "istoday" : "") + (schedId ? " droptarget" : ""),
    onClick: () => {
      if (schedId) {
        const dr = drafts.find(x => x.id === schedId);
        if (dr) scheduleTo(dr, d);
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dayhead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dn"
  }, DAYS[i]), /*#__PURE__*/React.createElement("span", {
    className: "dd"
  }, d.getDate())), schedId && /*#__PURE__*/React.createElement("div", {
    className: "dropcue"
  }, "Schedule here"), onDay(d).map(ev => /*#__PURE__*/React.createElement("div", {
    key: ev.id,
    className: "evt " + (ev.platform === "Instagram" ? "ig" : "li"),
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "etime"
  }, fmtTime(ev.scheduledFor)), /*#__PURE__*/React.createElement("div", {
    className: "etitle"
  }, ev.title), /*#__PURE__*/React.createElement("div", {
    className: "efmt"
  }, ev.format), /*#__PURE__*/React.createElement("div", {
    className: "dactions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => copy(ev.text)
  }, "⧉"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => update(ev.id, {
      scheduledFor: null,
      status: "draft"
    })
  }, "Unschedule"), /*#__PURE__*/React.createElement("button", {
    className: "mini danger",
    onClick: () => del(ev.id)
  }, "✕"))))))), /*#__PURE__*/React.createElement("p", {
    className: "hint",
    style: {
      marginTop: 14
    }
  }, "Times auto-set to the best window for each platform — LinkedIn mornings, Instagram Reels evenings. Click a scheduled post to copy or move it.")));
}

/* ====================== ANALYTICS ====================== */
function rnd(a, b) {
  return Math.floor(a + Math.random() * (b - a));
}
function demoMetrics(d) {
  const reel = /Reel/.test(d.format),
    carousel = /[Cc]arousel/.test(d.format);
  const impressions = d.platform === "Instagram" ? reel ? rnd(4000, 22000) : rnd(1500, 7000) : rnd(1800, 9000);
  const erMul = carousel ? 0.06 : reel ? 0.05 : 0.03;
  const eng = Math.floor(impressions * erMul * (0.6 + Math.random() * 0.9));
  return {
    impressions,
    likes: Math.floor(eng * 0.55),
    comments: Math.floor(eng * 0.12),
    saves: Math.floor(eng * 0.2),
    shares: Math.floor(eng * 0.13),
    clicks: Math.floor(impressions * 0.012)
  };
}
function Analytics({
  go
}) {
  const [drafts, setDrafts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    API.drafts().then(d => {
      setDrafts(d);
      setLoaded(true);
    });
  }, []);
  const M = d => d.metrics || {};
  const eng = d => (M(d).likes || 0) + (M(d).comments || 0) + (M(d).saves || 0) + (M(d).shares || 0);
  const erOf = d => M(d).impressions ? eng(d) / M(d).impressions * 100 : 0;
  const tracked = drafts.filter(d => M(d).impressions);
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  const totImp = sum(tracked, d => M(d).impressions || 0),
    totEng = sum(tracked, eng);
  const avgER = totImp ? totEng / totImp * 100 : 0,
    hv = sum(tracked, d => (M(d).saves || 0) + (M(d).shares || 0));
  function groupER(key) {
    const g = {};
    tracked.forEach(d => {
      const k = d[key] || "—";
      g[k] = g[k] || {
        imp: 0,
        eng: 0,
        n: 0
      };
      g[k].imp += M(d).impressions || 0;
      g[k].eng += eng(d);
      g[k].n++;
    });
    return Object.entries(g).map(([k, v]) => ({
      k,
      er: v.imp ? v.eng / v.imp * 100 : 0,
      n: v.n,
      imp: v.imp
    })).sort((a, b) => b.er - a.er);
  }
  const byFormat = groupER("format"),
    byHook = groupER("hookStyle"),
    byPlat = groupER("platform");
  const maxER = Math.max(...byFormat.map(x => x.er), 1);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const saveTimers = useRef({});
  function edit(id, key, val) {
    setDrafts(ds => ds.map(d => d.id === id ? {
      ...d,
      metrics: {
        ...(d.metrics || {}),
        [key]: Number(val) || 0
      }
    } : d));
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => persist(id), 500);
  }
  async function persist(id) {
    const d = draftsRef.current.find(x => x.id === id);
    if (d) {
      await API.patchDraft(id, {
        metrics: d.metrics,
        status: "published"
      });
    }
  }
  async function simulate() {
    setBusy(true);
    const ups = [];
    for (const d of drafts) {
      const nd = await API.patchDraft(d.id, {
        metrics: demoMetrics(d),
        status: "published"
      });
      ups.push(nd);
    }
    setDrafts(ups);
    setBusy(false);
    _setToast && _setToast("Sample analytics added to " + ups.length + " posts");
  }
  if (loaded && !drafts.length) return /*#__PURE__*/React.createElement("div", {
    className: "card pad fade",
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "No posts yet"), /*#__PURE__*/React.createElement("div", {
    className: "cardtitle"
  }, "Analytics need content first"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--ink-soft)",
      marginTop: 6
    }
  }, "Generate and save a few posts, then come back to track how they perform — impressions, engagement rate, saves and sends, and which hook styles win."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      marginTop: 16
    },
    onClick: () => go("content")
  }, "Create content →"));
  const fmtN = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "" + n;
  const top = [...tracked].sort((a, b) => erOf(b) - erOf(a));
  return /*#__PURE__*/React.createElement("div", {
    className: "fade"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--ink-soft)",
      fontSize: 13.5,
      maxWidth: 560,
      margin: 0
    }
  }, tracked.length ? `Tracking ${tracked.length} of ${drafts.length} posts.` : "Enter metrics from your posts below — or load sample data to see the dashboard.", " Engagement rate weights the actions that actually drive reach (comments, saves, sends)."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-gold",
    disabled: busy,
    onClick: simulate
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : "⚡ Load sample analytics")), /*#__PURE__*/React.createElement("div", {
    className: "grid g4",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, fmtN(totImp)), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Total impressions")), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, avgER.toFixed(1), "%"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Avg engagement rate")), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, fmtN(hv)), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Saves + sends (high-value)")), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, tracked.length), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Posts tracked"))), tracked.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "grid g3",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Top format"), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 26,
      fontWeight: 600,
      margin: "4px 0"
    }
  }, byFormat[0] ? byFormat[0].k : "—"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--muted)"
    }
  }, byFormat[0] ? byFormat[0].er.toFixed(1) + "% engagement across " + byFormat[0].n + " post(s)" : "")), /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Winning hook style"), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 26,
      fontWeight: 600,
      margin: "4px 0"
    }
  }, byHook[0] ? byHook[0].k : "—"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--muted)"
    }
  }, byHook[0] ? byHook[0].er.toFixed(1) + "% engagement — lean into this" : "")), /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "By platform"), byPlat.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.k,
    className: "platrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pill " + (p.k === "Instagram" ? "plum" : "gold")
  }, p.k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--ink-soft)"
    }
  }, p.er.toFixed(1), "% · ", fmtN(p.imp), " impr"))))), tracked.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "card pad",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Engagement rate by format"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, byFormat.map(f => /*#__PURE__*/React.createElement("div", {
    className: "barrow",
    key: f.k
  }, /*#__PURE__*/React.createElement("span", {
    className: "barlabel"
  }, f.k), /*#__PURE__*/React.createElement("div", {
    className: "bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "barfill",
    style: {
      width: Math.max(4, f.er / maxER * 100) + "%"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "barval"
  }, f.er.toFixed(1), "%"))))), /*#__PURE__*/React.createElement("div", {
    className: "card pad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Posts · enter your real metrics"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: "var(--muted)",
      margin: "4px 0 14px"
    }
  }, "Type the numbers from your LinkedIn/Instagram insights; they save automatically. (No API connection yet — see the note from your team.)"), /*#__PURE__*/React.createElement("div", {
    className: "tablewrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "atable"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Post"), /*#__PURE__*/React.createElement("th", null, "Impr."), /*#__PURE__*/React.createElement("th", null, "Likes"), /*#__PURE__*/React.createElement("th", null, "Comments"), /*#__PURE__*/React.createElement("th", null, "Saves"), /*#__PURE__*/React.createElement("th", null, "Sends/Shares"), /*#__PURE__*/React.createElement("th", null, "Eng. rate"))), /*#__PURE__*/React.createElement("tbody", null, drafts.map(d => /*#__PURE__*/React.createElement("tr", {
    key: d.id
  }, /*#__PURE__*/React.createElement("td", {
    className: "postcell"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dotp " + (d.platform === "Instagram" ? "ig" : "li")
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pt"
  }, d.title), /*#__PURE__*/React.createElement("div", {
    className: "pf"
  }, d.platform, " · ", d.format, " · ", d.hookStyle || "—"))), ["impressions", "likes", "comments", "saves", "shares"].map(k => /*#__PURE__*/React.createElement("td", {
    key: k
  }, /*#__PURE__*/React.createElement("input", {
    className: "min",
    type: "number",
    value: d.metrics && d.metrics[k] || "",
    onChange: e => edit(d.id, k, e.target.value),
    onBlur: () => persist(d.id),
    placeholder: "0"
  }))), /*#__PURE__*/React.createElement("td", {
    className: "ercell"
  }, erOf(d).toFixed(1), "%"))))))));
}

/* ====================== AUTH ====================== */
function Auth({
  onAuthed
}) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""),
    [pw, setPw] = useState(""),
    [name, setName] = useState("");
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    if (e) e.preventDefault();
    if (!email || !pw) {
      setErr("Enter your email and password.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await (mode === "signup" ? API.signup({
      email,
      password: pw,
      name
    }) : API.login({
      email,
      password: pw
    }));
    setBusy(false);
    if (res.ok) onAuthed(res.data);else setErr(res.status === 409 ? "That email already has an account — try signing in." : res.status === 401 ? "Wrong email or password." : "Something went wrong. Please try again.");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "authwrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "authcard fade"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brandmark",
    style: {
      marginBottom: 30,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "name",
    style: {
      color: "var(--ink)"
    }
  }, "XPALLA"), /*#__PURE__*/React.createElement("span", {
    className: "tag",
    style: {
      color: "var(--gold)"
    }
  }, "Personal Brand Studio")), /*#__PURE__*/React.createElement("p", {
    className: "tagline"
  }, "Build your personal brand now, so your next opportunity finds you before you need it."), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 27,
      fontWeight: 600,
      textAlign: "center"
    }
  }, mode === "signup" ? "Create your studio" : "Welcome back"), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: "center",
      color: "var(--muted)",
      fontSize: 13.5,
      margin: "6px 0 22px"
    }
  }, mode === "signup" ? "For the woman ready to own her expertise online." : "Sign in to your brand studio."), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit
  }, mode === "signup" && /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Your name"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Diane Marlowe"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "you@example.com"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "fl"
  }, "Password"), /*#__PURE__*/React.createElement("input", {
    className: "tin",
    type: "password",
    value: pw,
    onChange: e => setPw(e.target.value),
    placeholder: "••••••••"
  })), err && /*#__PURE__*/React.createElement("div", {
    className: "autherr"
  }, err), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    type: "submit",
    disabled: busy,
    style: {
      width: "100%",
      justifyContent: "center",
      marginTop: 4
    }
  }, busy ? /*#__PURE__*/React.createElement(Loading, null) : mode === "signup" ? "Create account" : "Sign in")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 18,
      fontSize: 13,
      color: "var(--ink-soft)"
    }
  }, mode === "signup" ? "Already have an account? " : "New here? ", /*#__PURE__*/React.createElement("span", {
    className: "authlink",
    onClick: () => {
      setMode(mode === "signup" ? "login" : "signup");
      setErr("");
    }
  }, mode === "signup" ? "Sign in" : "Create one"))));
}

/* ====================== APP SHELL ====================== */
const PAGES = {
  home: {
    crumb: "Dashboard",
    title: "Welcome to your studio",
    sub: "Build, write, and refine your personal brand — one calm, expert step at a time."
  },
  strategy: {
    crumb: "The Studio · Strategy",
    title: "Brand Strategy",
    sub: "Define the foundation. Four minutes now saves you a hundred second-guesses later."
  },
  content: {
    crumb: "The Studio · Content",
    title: "Content Generator",
    sub: "Posts, carousels, and Reels engineered on the latest LinkedIn & Instagram algorithms — in your voice. Upload media and build carousels right here."
  },
  calendar: {
    crumb: "The Studio · Calendar",
    title: "Content Calendar",
    sub: "Save drafts and schedule them at the best time for each platform."
  },
  analytics: {
    crumb: "The Studio · Analytics",
    title: "Performance Analytics",
    sub: "See what's working — impressions, engagement rate, saves and sends, and which formats and hook styles win. Track real numbers or load sample data."
  },
  profile: {
    crumb: "The Studio · Profile",
    title: "Profile Optimizer",
    sub: "Make your headline, About, and bio work as hard as you do."
  }
};
function App() {
  const [page, setPage] = useState("home");
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [brand, setBrand] = useState(null);
  const [toast, setToast] = useState("");
  const [aiMode, setAiMode] = useState("demo");
  const [dbMode, setDbMode] = useState("json");
  const brandSaveTimer = useRef();
  useEffect(() => {
    _setToast = m => {
      setToast(m);
      setTimeout(() => setToast(""), 2400);
    };
    AI.checkMode().then(s => {
      setAiMode(s.mode);
      setDbMode(s.db);
    });
    API.me().then(d => {
      if (d && d.user) {
        setUser(d.user);
        setBrand(d.brand || null);
      }
      setAuthReady(true);
    });
  }, []);
  const go = p => {
    setPage(p);
    window.scrollTo(0, 0);
  };
  // debounced so brand-kit colour dragging doesn't spam the server
  function persistBrand(b) {
    setBrand(b);
    clearTimeout(brandSaveTimer.current);
    brandSaveTimer.current = setTimeout(() => API.saveBrand(b), 500);
  }
  async function logout() {
    await API.logout();
    setUser(null);
    setBrand(null);
    setPage("home");
  }
  if (!authReady) return /*#__PURE__*/React.createElement("div", {
    className: "bootscreen"
  }, /*#__PURE__*/React.createElement("span", {
    className: "serif"
  }, "XPALLA"));
  if (!user) return /*#__PURE__*/React.createElement(Auth, {
    onAuthed: d => {
      setUser(d.user);
      setBrand(d.brand || null);
      setPage(d.brand ? "home" : "strategy");
    }
  });
  const meta = PAGES[page];
  const nav = [{
    id: "home",
    ic: "❖",
    t: "Dashboard"
  }, {
    id: "strategy",
    ic: "✦",
    t: "Brand Strategy"
  }, {
    id: "content",
    ic: "✎",
    t: "Content Generator"
  }, {
    id: "calendar",
    ic: "▦",
    t: "Content Calendar"
  }, {
    id: "analytics",
    ic: "◷",
    t: "Analytics"
  }, {
    id: "profile",
    ic: "◈",
    t: "Profile Optimizer"
  }];
  const dispName = brand && brand.name || user.name || user.email;
  const initials = (dispName ? dispName.trim()[0] : "M").toUpperCase();
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brandmark"
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "XPALLA"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "Personal Brand Studio")), /*#__PURE__*/React.createElement("div", {
    className: "nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-label"
  }, "Studio"), nav.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    className: page === n.id ? "active" : "",
    onClick: () => go(n.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, n.ic), n.t))), /*#__PURE__*/React.createElement("div", {
    className: "side-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aistat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dotai " + (aiMode === "claude" ? "on" : "")
  }), aiMode === "claude" ? "Claude connected" : "Demo mode (mock AI)"), /*#__PURE__*/React.createElement("div", {
    className: "aistat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dotai " + (dbMode === "supabase" ? "on" : "")
  }), dbMode === "supabase" ? "Supabase database" : "Local database"), /*#__PURE__*/React.createElement("div", {
    className: "profile-chip"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar"
  }, initials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pname"
  }, dispName), /*#__PURE__*/React.createElement("div", {
    className: "pstat"
  }, brand ? "Brief active" : "No brief yet")), /*#__PURE__*/React.createElement("button", {
    className: "logoutbtn",
    title: "Sign out",
    onClick: logout
  }, "⏻")))), /*#__PURE__*/React.createElement("main", {
    className: "main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "crumb"
  }, meta.crumb), /*#__PURE__*/React.createElement("h1", null, meta.title), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, meta.sub))), /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: page === "home" ? "block" : "none"
    }
  }, /*#__PURE__*/React.createElement(Home, {
    brand: brand,
    go: go
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: page === "strategy" ? "block" : "none"
    }
  }, /*#__PURE__*/React.createElement(Strategy, {
    brand: brand,
    setBrand: persistBrand,
    go: go
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: page === "content" ? "block" : "none"
    }
  }, /*#__PURE__*/React.createElement(Content, {
    brand: brand,
    setBrand: persistBrand,
    go: go
  })), page === "calendar" && /*#__PURE__*/React.createElement(Calendar, {
    go: go
  }), page === "analytics" && /*#__PURE__*/React.createElement(Analytics, {
    go: go
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: page === "profile" ? "block" : "none"
    }
  }, /*#__PURE__*/React.createElement(Profile, {
    brand: brand,
    go: go
  })))), toast && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, toast));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));