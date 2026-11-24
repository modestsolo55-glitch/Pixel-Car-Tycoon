/* =============================================================================
   Teil 9: Modelle, Fabrik & Lager, Markt & Werbung, Forschung, Erfolge,
   Drag-Race-Auswahl
   ============================================================================= */

// ---------- MODELLE ----------
ACTIONS.medit = d => { const m = modelById(d.v); if (!m) return; S.draft = clone(m); delete S.draft.stat; setTab('design'); };
ACTIONS.m3d = d => { const m = modelById(d.v); if (m) open3D(m); };
ACTIONS.mprod = d => {
  const L = S.factory.lines.find(l => !l.active) || S.factory.lines[0];
  if (L.paid && L.modelId !== d.v) { const om = modelById(L.modelId); if (om) S.money += carOf(om).prodCost; }
  if (L.modelId !== d.v) { L.prog = 0; L.paid = false; }
  L.modelId = d.v; L.active = true; L.done = 0; if (!L.qty) L.qty = 10;
  toast('Produktion gestartet.', 'good'); setTab('factory');
};
ACTIONS.mbest = d => { const m = modelById(d.v); if (!m) return; const b = bestPrice(m); m.price = b.price; toast(`${ico('money')} Bester Preis für „${esc(m.name)}“: <b>${fmtMoney(b.price)}</b> · ≈ ${fmtMoney(Math.round(b.profit))} Gewinn/Tag`, 'good', 4000); rerender(); };
ACTIONS.mrace = d => { RSEL.modelId = d.v; setTab('race'); };
ACTIONS.mdel = d => { const m = modelById(d.v); if (m) confirmBox(`Modell „${esc(m.name)}“ löschen? Lagerbestand wird zu 40 % verkauft.`, () => { deleteModel(d.v); rerender(); }, 'Löschen'); };
ACTIONS.mprice = d => {
  const m = modelById(d.k); if (!m) return;
  const car = carOf(m);
  if (d.v === 'value') m.price = Math.round(car.value / 100) * 100;
  else m.price = Math.max(100, Math.round(m.price * (+d.v) / 100) * 100);
  rerender();
};
INPUTS.mprice = (el, type) => { if (type !== 'change') return; const m = modelById(el.dataset.k); if (m) { m.price = Math.max(100, Math.round(+el.value || m.price)); rerender(); } };
function sparkline(arr) {
  const max = Math.max(1, ...arr);
  return `<span style="display:inline-flex;align-items:flex-end;gap:1px;height:16px;vertical-align:middle">${arr.slice(-30).map(v => `<i style="display:block;width:3px;height:${Math.max(1, Math.round(v / max * 16))}px;background:${v ? 'var(--lime)' : '#333c57'}"></i>`).join('')}</span>`;
}
TABS.models = {
  title: 'Modelle', icon: 'list',
  render(el) {
    el.innerHTML = `<h2 class="title">${ico('list', 'big')} Deine Modelle</h2>
    <div class="flex" style="margin:0 4px 8px"><button class="btn green" data-act="dreset2">${ico('car')} Neues Modell entwerfen</button><span class="hint">Preise anpassen: höherer Preis = mehr Marge, aber weniger Käufer.</span></div>
    <div class="cards">${S.models.map(m => {
      const car = carOf(m), dmd = demandBreakdown(m), eng = getEngine(m.engineId), pd = modelProfitDay(m);
      const profit = m.stat.rev - m.stat.cost, margin = m.price - car.prodCost;
      const s30 = m.stat.recent.reduce((a, b) => a + b, 0);
      return `<div class="card">
        <div style="background:linear-gradient(#41a6f6,#a8d8f0 70%,#566c86 70%);padding:4px 0"><img src="${carThumbURL(m, S.company)}" style="width:100%;image-rendering:pixelated;display:block"></div>
        <div class="flex" style="margin-top:6px"><b style="font-size:17px">${esc(m.name)}</b><span class="tag">${CLASSES[BODIES[m.body].cls].name}</span><span class="tag">${BODIES[m.body].name}</span></div>
        <div class="hint">${esc(eng.name)} · ${psStr(car)} · 0–100 ${tStr(car, car.t100, 1)} · 1/4 ${tStr(car, car.t14)} · ${carKnown(car) ? car.top : '???'} km/h</div>
        <div class="lbl">Verkaufspreis</div>
        <div class="flex"><button class="btn sm" data-act="mprice" data-k="${m.id}" data-v="95">-5%</button>
          <input type="number" value="${m.price}" data-inp="mprice" data-k="${m.id}" style="width:110px">
          <button class="btn sm" data-act="mprice" data-k="${m.id}" data-v="105">+5%</button>
          <button class="btn sm gray" data-act="mprice" data-k="${m.id}" data-v="value" title="Auf Marktwert setzen">MW</button>
          <button class="btn sm green" data-act="mbest" data-v="${m.id}" title="Preis mit dem höchsten Gewinn pro Tag (berücksichtigt Nachfrage und deine Produktion)">Bester Preis</button></div>
        <div class="grid2" style="font-size:14px;margin-top:4px">
          <div>Kosten/Stück</div><div class="bad">${fmtMoney(car.prodCost)}</div>
          <div>Marge/Stück</div><div class="${margin >= 0 ? 'good' : 'bad'}">${fmtMoney(margin)}</div>
          <div>Marktwert</div><div>${fmtMoney(car.value)}</div>
          <div>Nachfrage/Tag</div><div>≈ ${dmd.total.toFixed(2)}</div>
          <div>Gewinn/Tag (geschätzt)</div><div class="${pd.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(Math.round(pd.profit))}${pd.cap > 0 && pd.dmd > pd.cap * 1.2 ? ' <span class="tag y" title="Mehr Nachfrage als Produktion: Preis erhöhen oder mehr Linien">Engpass</span>' : ''}</div>
          <div>Lager</div><div>${S.stock[m.id] || 0}</div>
          <div>Produziert / Verkauft</div><div>${m.stat.prod} / ${m.stat.sold}</div>
          <div>Gewinn gesamt</div><div class="${profit >= 0 ? 'good' : 'bad'}">${fmtMoney(profit)}</div>
          <div>Verkäufe 30 T.</div><div>${s30} ${sparkline(m.stat.recent)}</div>
        </div>
        <div class="flex" style="margin-top:4px">
          <button class="btn sm" data-act="medit" data-v="${m.id}">Bearbeiten</button>
          <button class="btn sm yellow" data-act="m3d" data-v="${m.id}">3D</button>
          <button class="btn sm green" data-act="mprod" data-v="${m.id}">Produzieren</button>
          <button class="btn sm orange" data-act="mrace" data-v="${m.id}">Rennen</button>
          ${S.models.length > 1 ? `<button class="btn sm red" data-act="mdel" data-v="${m.id}">Löschen</button>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
  }
};
ACTIONS.dreset2 = () => { ACTIONS.dreset(); setTab('design'); };

// ---------- FABRIK ----------
ACTIONS.fstage = () => { if (buyStage()) rerender(); else { const i = nextStageInfo(); if (i) toast(i.why || 'Nicht möglich', 'bad'); } };
ACTIONS.fline = () => { if (buyLine()) rerender(); };
ACTIONS.fup = d => { if (buyUpgrade(d.v)) rerender(); };
ACTIONS.ltoggle = d => {
  const L = S.factory.lines[+d.v]; if (!L) return;
  if (!L.modelId) { toast('Wähle zuerst ein Modell.', 'bad'); return; }
  L.active = !L.active; if (L.active) L.done = 0;
  rerender();
};
INPUTS.lmodel = el => {
  const L = S.factory.lines[+el.dataset.k]; if (!L) return;
  if (L.paid) { const om = modelById(L.modelId); if (om) S.money += carOf(om).prodCost; }
  L.modelId = el.value || null; L.prog = 0; L.paid = false; L.done = 0;
  rerender();
};
INPUTS.lmode = el => { const L = S.factory.lines[+el.dataset.k]; if (!L) return; L.mode = el.value === 'keep' ? 'keep' : 'qty'; if (L.mode === 'keep' && !L.qty) L.qty = 5; rerender(); };
INPUTS.lqty = (el, type) => { const L = S.factory.lines[+el.dataset.k]; if (L) L.qty = clamp(parseInt(el.value, 10) || 0, 0, 9999); if (type === 'change') rerender(); };
TABS.factory = {
  title: 'Fabrik', icon: 'factory',
  render(el) {
    const f = S.factory, st = STAGES[f.stage], ni = nextStageInfo();
    const cap = warehouseCap(), used = stockTotal();
    el.innerHTML = `<h2 class="title">${ico('factory', 'big')} Fabrik & Lager – ${st.name}</h2>
    <div class="row">
      <div class="col" style="flex:1 1 520px">
        <div class="panel dark" style="padding:6px"><canvas id="factorycv" width="320" height="240" class="cv"></canvas></div>
        <div class="panel"><h3>${ico('wrench')}Produktionslinien (${f.lines.length}/${st.maxLines})</h3>
          ${f.lines.map((L, i) => {
            const m = modelById(L.modelId);
            return `<div class="card">
              <div class="flex"><b>Linie ${i + 1}</b>
                <select data-inp="lmodel" data-k="${i}"><option value="">– Modell wählen –</option>${S.models.map(mm => `<option value="${mm.id}" ${mm.id === L.modelId ? 'selected' : ''}>${esc(mm.name)}</option>`).join('')}</select>
                <select data-inp="lmode" data-k="${i}" title="Stückzahl: genau so viele bauen. Lager halten: automatisch nachbauen, sobald weniger im Lager sind."><option value="qty" ${L.mode !== 'keep' ? 'selected' : ''}>Stückzahl</option><option value="keep" ${L.mode === 'keep' ? 'selected' : ''}>Lager halten</option></select>
                <span class="muted">${L.mode === 'keep' ? 'Ziel im Lager' : 'Stück (0 = endlos)'}</span><input type="number" min="0" value="${L.qty}" data-inp="lqty" data-k="${i}" style="width:80px">
                <button class="btn sm ${L.active ? 'red' : 'green'}" data-act="ltoggle" data-v="${i}">${L.active ? 'Stopp' : 'Start'}</button></div>
              <div class="pbar" style="margin:6px 2px"><i id="lp-${i}" style="width:${(L.prog * 100).toFixed(1)}%"></i><em id="lt-${i}"></em></div>
              <div class="hint" id="ls-${i}">${m ? `${fmtMoney(carOf(m).prodCost)} pro Auto · ${buildDays(m).toFixed(1)} Tage pro Auto` : 'Keine Produktion'}</div>
            </div>`;
          }).join('')}
          ${f.lines.length < st.maxLines ? `<button class="btn green" data-act="fline">Neue Linie bauen (${fmtMoney(lineCost())})</button>` : `<div class="hint">Mehr Linien gibt es mit dem nächsten Fabrik-Ausbau.</div>`}
        </div>
      </div>
      <div class="col" style="flex:1 1 300px">
        <div class="panel"><h3>${ico('factory')}Ausbau</h3>
          <div class="grid2"><div>Stufe</div><div>${f.stage + 1}/5 · ${st.name}</div><div>Tempo-Faktor</div><div>${st.rate}x</div><div>Max. Linien</div><div>${st.maxLines}</div><div>Mitarbeiter</div><div>${staffCount()}</div></div>
          ${ni ? `<div class="lbl">Nächste Stufe: ${ni.st.name}</div>
            <div class="hint">Kosten ${fmtMoney(ni.st.cost)} · Level ${ni.st.lvl} · Forschung „${TECH[ni.st.tech].name}“<br>Miete ${fmtMoney(ni.st.rent)}/Monat, ${ni.st.staff} Mitarbeiter, Lager ${ni.st.wh}</div>
            <button class="btn ${ni.ok ? 'green' : 'lock'}" data-act="fstage" data-why="${esc(ni.why)}">Ausbauen zu ${ni.st.name}</button>` : '<div class="good">Höchste Ausbaustufe erreicht!</div>'}
        </div>
        <div class="panel"><h3>${ico('wrench')}Upgrades</h3>
          ${Object.entries(UPGRADES).map(([k, U]) => {
            const lv = f[k], max = lv >= U.max, locked = !has(U.tech);
            return `<div class="flex" style="margin-bottom:4px"><div style="flex:1"><b>${U.name}</b> <span class="tag">Stufe ${lv}/${U.max}</span><div class="hint" style="margin:0">${U.desc}</div></div>
              ${max ? '<span class="good">MAX</span>' : `<button class="btn sm ${locked ? 'lock' : ''}" data-act="fup" data-v="${k}" data-why="${locked ? esc('Benötigt Forschung: ' + techLabel(U.tech)) : ''}">${fmtMoney(upgradeCost(k))}</button>`}</div>`;
          }).join('')}
        </div>
        <div class="panel"><h3>${ico('box')}Warehouse (${used}/${cap})</h3>
          <div class="pbar ${used >= cap ? '' : 'blue'}"><i style="width:${Math.min(100, used / cap * 100)}%"></i><em>${used >= cap ? 'VOLL – Produktion stoppt' : Math.round(used / cap * 100) + ' %'}</em></div>
          <table class="t" style="margin-top:6px"><tr><th>Modell</th><th>Lager</th><th>Wert</th></tr>
          ${S.models.map(m => `<tr><td>${esc(m.name)}</td><td>${S.stock[m.id] || 0}</td><td>${fmtMoney((S.stock[m.id] || 0) * m.price)}</td></tr>`).join('')}</table>
        </div>
        <div class="panel"><h3>${ico('date')}Laufende Kosten / Monat</h3>
          <div class="grid2"><div>Miete</div><div>${fmtMoney(st.rent)}</div><div>Löhne (${staffCount()} × ${fmtMoney(WAGE)})</div><div>${fmtMoney(staffCount() * WAGE)}</div><div>Wartung Linien</div><div>${fmtMoney(f.lines.length * 300)}</div><div><b>Total</b></div><div class="bad">${fmtMoney(monthlyCost())}</div></div>
        </div>
      </div>
    </div>`;
  },
  tick(dt, t) {
    const cv = $('#factorycv'); if (cv && every('factory', 20)) drawFactory(hdCtx(cv), S, t);
    S.factory.lines.forEach((L, i) => {
      const p = $('#lp-' + i), tx = $('#lt-' + i);
      if (p) p.style.width = (L.prog * 100).toFixed(1) + '%';
      const stName = ['Rohbau', 'Lackiererei', 'Montage', 'Prüfung'][Math.min(3, Math.floor(L.prog * 4))];
      if (tx) tx.textContent = L.stall ? L.stall.toUpperCase() : L.active ? `${stName} ${Math.round(L.prog * 100)} % · ${L.done}${L.qty && L.mode !== 'keep' ? '/' + L.qty : ''} fertig` : (L.done ? `${L.done} fertig` : 'gestoppt');
    });
  }
};

// ---------- MARKT & WERBUNG ----------
ACTIONS.camp = d => { if (startCampaign(d.v)) rerender(); };
TABS.market = {
  title: 'Markt & Werbung', icon: 'market',
  render(el) {
    el.innerHTML = `<h2 class="title">${ico('market', 'big')} Markt & Werbung</h2>
    ${financePanelHTML()}
    <div class="row">
      <div class="col">
        <div class="panel"><h3>${ico('rep')}Markenruf: ${Math.round(S.rep)} / 100</h3>
          <div class="pbar"><i style="width:${S.rep}%"></i></div>
          <div class="hint">Ruf steigt durch gute Autos, Werbung, positive Tests und Rennsiege. Rückrufe und schlechte Autos schaden. Ruf-Faktor auf die Nachfrage: <b>${(0.25 + S.rep / 100 * 1.5).toFixed(2)}x</b></div>
          <div class="flex"><span class="lbl" style="margin:0">Firmenname</span><input type="text" maxlength="22" value="${esc(S.company)}" data-inp="cname" style="flex:1"></div>
        </div>
        <div class="panel"><h3>${ico('star')}Kundengruppen</h3>
          ${Object.entries(SEGMENTS).map(([k, g]) => `<div class="card"><div class="flex"><b>${g.name}</b><span class="sp"></span><span class="tag y">Werbung ${adMult(k).toFixed(2)}x</span></div><div class="hint">Wichtig: ${g.desc} · Preisempfindlichkeit ${g.sens}</div></div>`).join('')}
        </div>
      </div>
      <div class="col">
        <div class="panel"><h3>${ico('ad')}Werbekampagnen</h3>
          ${CAMPAIGNS.map(c => {
            const run = S.campaigns.find(x => x.id === c.id), locked = !has(c.tech);
            const focus = Object.entries(c.seg).filter(([, v]) => v >= 1).map(([k]) => SEGMENTS[k].name).join(', ');
            return `<div class="card"><div class="flex"><b>${c.name}</b><span class="tag">${c.days} Tage</span><span class="tag g">+${Math.round(c.mult * 100)} % Nachfrage</span><span class="tag y">+${c.rep} Ruf</span></div>
              <div class="hint">Zielgruppe: ${focus || 'alle'} · ${c.xp} XP</div>
              ${run ? `<div class="good">Läuft noch ${run.until - S.day} Tage</div>` : `<button class="btn sm ${locked ? 'lock' : 'green'}" data-act="camp" data-v="${c.id}" data-why="${locked ? esc('Benötigt Forschung: ' + techLabel(c.tech)) : ''}">Starten – ${fmtMoney(c.cost)}</button>`}</div>`;
          }).join('')}
        </div>
      </div>
    </div>
    ${rivalsPanelHTML()}
    <div class="panel"><h3>${ico('list')}Statistik pro Modell</h3><div style="overflow:auto">
      <table class="t"><tr><th>Modell</th><th>Preis</th><th>Marktwert</th><th>Familien</th><th>Sport</th><th>Hyper</th><th>Nachfrage/Tag</th><th>Lager</th><th>Verkauft</th><th>30 Tage</th><th>Umsatz</th><th>Gewinn</th></tr>
      ${S.models.map(m => { const c = carOf(m), dd = demandBreakdown(m), pr = m.stat.rev - m.stat.cost;
        return `<tr><td><b>${esc(m.name)}</b></td><td>${fmtMoney(m.price)}</td><td>${fmtMoney(c.value)}</td><td>${c.score.family}</td><td>${c.score.sport}</td><td>${c.score.hyper}</td>
        <td>${dd.total.toFixed(2)}</td><td>${S.stock[m.id] || 0}</td><td>${m.stat.sold}</td><td>${sparkline(m.stat.recent)}</td><td>${fmtMoney(m.stat.rev)}</td><td class="${pr >= 0 ? 'good' : 'bad'}">${fmtMoney(pr)}</td></tr>`; }).join('')}
      </table></div></div>`;
  }
};
INPUTS.cname = (el, type) => { const v = el.value.trim().slice(0, 22); if (v) { S.company = v; _spriteCache.clear(); _miniCache.clear(); updateTopbar(true); } void type; };

// ---------- FORSCHUNG ----------
ACTIONS.research = d => {
  const t = TECH[d.v], s = techState(t);
  if (s === 'done') return;
  if (s === 'lock') { toast(S.level < t.lvl ? `Benötigt Level ${t.lvl}.` : 'Benötigt zuerst: ' + t.req.map(r => TECH[r].name).join(', '), 'bad'); return; }
  if (s === 'nopts') { toast(`Zu wenig Forschungspunkte (${t.cost} nötig).`, 'bad'); return; }
  if (research(d.v)) { renderNav(); rerender(); }
};
TABS.research = {
  title: 'Forschung', icon: 'research',
  render(el) {
    el.innerHTML = `<h2 class="title">${ico('research', 'big')} Technologiebaum</h2>
    <div class="panel"><div class="flex"><span>${ico('rp')} <b>${S.rp}</b> Forschungspunkte</span><span class="tag">Level ${S.level}</span>
      <span class="tag">Nächstes Level: +${rpGain(S.level + 1)} FP</span><span class="sp"></span>
      <span class="tag g">${ico('check')} erforscht</span><span class="tag y">freischaltbar</span><span class="tag">${ico('lock')} gesperrt</span></div>
      <div class="hint">XP gibt es für produzierte und verkaufte Autos, neue Designs, Werbung und gewonnene Drag Races. Jedes Level-Up bringt Forschungspunkte – wähle klug, du kannst nicht alles sofort haben!</div></div>
    <div class="treewrap"><div class="tree" id="tree"><canvas id="treecv"></canvas>
      ${TECH_CATS.map(cat => `<div class="tcol"><h4>${cat.name}</h4>${TECHS.filter(t => t.cat === cat.id).sort((a, b) => a.lvl - b.lvl).map(t => {
        const s = techState(t);
        const cls = s === 'done' ? 'done' : s === 'avail' ? 'avail' : s === 'lock' ? 'lock' : '';
        return `<div class="tnode ${cls}" id="tn-${t.id}" data-act="research" data-v="${t.id}">
          <div class="tn">${ico(s === 'done' ? 'check' : s === 'lock' ? 'lock' : 'star')}${t.name}</div>
          <div class="td">${t.desc}</div>
          <div class="tc"><span class="${S.level >= t.lvl ? 'good' : 'bad'}">Lvl ${t.lvl}</span><span class="${s === 'done' ? 'good' : S.rp >= t.cost ? 'warn' : 'muted'}">${s === 'done' ? 'ERFORSCHT' : t.cost + ' FP'}</span></div>
        </div>`;
      }).join('')}</div>`).join('')}
    </div></div>`;
    requestAnimationFrame(drawTreeLines);
  }
};
/** Verbindungslinien im Pixel-Stil zwischen Voraussetzungen und Technologien */
function drawTreeLines() {
  const tree = $('#tree'), cv = $('#treecv'); if (!tree || !cv) return;
  const W = tree.scrollWidth, H = tree.scrollHeight;
  cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d'), tr = tree.getBoundingClientRect();
  for (const t of TECHS) for (const r of t.req) {
    const a = $('#tn-' + r), b = $('#tn-' + t.id); if (!a || !b) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const done = S.techs.includes(r);
    ctx.fillStyle = done ? (S.techs.includes(t.id) ? '#38b764' : '#ffcd75') : '#3e4a6b';
    if (Math.abs(ra.left - rb.left) < 5) {          // gleiche Spalte: senkrecht am linken Rand
      const x = Math.round(ra.left - tr.left - 8), y0 = Math.round(ra.top - tr.top + ra.height / 2), y1 = Math.round(rb.top - tr.top + rb.height / 2);
      ctx.fillRect(x, Math.min(y0, y1), 3, Math.abs(y1 - y0)); ctx.fillRect(x, y0, 10, 3); ctx.fillRect(x, y1, 10, 3);
    } else {
      const left = ra.left < rb.left;
      const x0 = Math.round((left ? ra.right : ra.left) - tr.left), y0 = Math.round(ra.top - tr.top + ra.height / 2);
      const x1 = Math.round((left ? rb.left : rb.right) - tr.left), y1 = Math.round(rb.top - tr.top + 12);
      const mx = Math.round(left ? x1 - 9 : x1 + 6);
      ctx.fillRect(Math.min(x0, mx), y0, Math.abs(mx - x0) + 3, 3);
      ctx.fillRect(mx, Math.min(y0, y1), 3, Math.abs(y1 - y0) + 3);
      ctx.fillRect(Math.min(mx, x1), y1, Math.abs(x1 - mx), 3);
    }
  }
}

// ---------- ERFOLGE ----------
TABS.ach = {
  title: 'Erfolge', icon: 'trophy',
  render(el) {
    el.innerHTML = `<h2 class="title">${ico('trophy', 'big')} Ziele & Erfolge</h2>
    <div class="row"><div class="col">${dailyPanelHTML()}${goalsPanelHTML()}</div><div class="col">${prestigePanelHTML()}${typeof showPanelHTML === 'function' ? showPanelHTML() : ''}</div></div>
    ${hallPanelHTML()}
    <h3 class="sect">${ico('trophy')} Erfolge (${S.ach.length}/${ACHIEVEMENTS.length})</h3>
    <div class="cards">${ACHIEVEMENTS.map(a => { const ok = S.ach.includes(a.id);
      return `<div class="card ${ok ? '' : 'locked'}" style="${ok ? 'box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--yellow)' : ''}"><div class="flex">${ico(ok ? 'trophy' : 'lock', 'big')}<b>${a.name}</b></div><div class="hint">${a.desc}</div>${a.reward ? `<div class="tag y">Belohnung ${fmtMoney(a.reward)}</div>` : ''}</div>`; }).join('')}</div>`;
  }
};

// ---------- DRAG RACE: Auswahl ----------
const RSEL = { modelId: null, dist: 'quarter', mine2: null, track: 'sunset', tod: null };
ACTIONS.rtod = d => { RSEL.tod = d.v; rerender(); };
const todNow = () => trackIsNight(RSEL.track, RSEL.tod) ? 'night' : 'day';
ACTIONS.rtrack = d => { if (S.level < (TRACKS[d.v].lvl || 1)) return; RSEL.track = d.v; rerender(); };
const trackOK = () => S.level >= (TRACKS[RSEL.track].lvl || 1) || (RSEL.track = 'sunset');
ACTIONS.rdist = d => { if (S.level < distOf(d.v).lvl) return; RSEL.dist = d.v; rerender(); };
INPUTS.rcar = el => { RSEL.modelId = el.value; rerender(); };
INPUTS.rcar2 = el => { RSEL.mine2 = el.value; rerender(); };
ACTIONS.rstart = d => {
  const m = raceEntry(RSEL.modelId); if (!m) return;
  const o = OPPONENTS.find(x => x.id === d.v);
  if (!o) return;
  if (S.level < o.lvl) { toast(`Gegner erst ab Level ${o.lvl}.`, 'bad'); return; }
  if (S.money < o.fee) { toast('Zu wenig Geld für das Startgeld.', 'bad'); return; }
  S.money -= o.fee;
  startRace({ player: { design: m.design, engine: m.engine, name: m.name, brand: m.brand, blowAt: m.risk && Math.random() < m.risk ? rand(1.2, 7) : null, salvageId: m.salvage ? m.id : null }, opp: { design: o.design, engine: o.engine, name: o.name, brand: o.brand, react: o.react, skill: o.skill },
    dist: RSEL.dist, prize: Math.round(o.prize * distOf(RSEL.dist).prize * (TRACKS[RSEL.track].prizeMul || 1)), xp: Math.round(o.xp * (1 + (distOf(RSEL.dist).prize - 1) * 0.5)), rep: o.rep, fee: o.fee, oppId: o.id, track: RSEL.track, tod: RSEL.tod });
};
ACTIONS.rstartOwn = () => {
  const a = raceEntry(RSEL.modelId), b = raceEntry(RSEL.mine2);
  if (!a || !b) { toast('Wähle zwei Modelle.', 'bad'); return; }
  startRace({ player: { design: a.design, engine: a.engine, name: a.name, brand: a.brand, blowAt: a.risk && Math.random() < a.risk ? rand(1.2, 7) : null, salvageId: a.salvage ? a.id : null }, opp: { design: b.design, engine: b.engine, name: b.name + ' (KI)', brand: b.brand, react: [0.12, 0.25], skill: 0.85 },
    dist: RSEL.dist, prize: 0, xp: 25, rep: 0, fee: 0, own: true, track: RSEL.track, tod: RSEL.tod });
};
TABS.race = {
  title: 'Drag Race', icon: 'race',
  render(el) {
    if (!raceEntry(RSEL.modelId)) RSEL.modelId = S.models[0].id;
    if (!raceEntry(RSEL.mine2)) RSEL.mine2 = (S.models[1] || S.models[0]).id;
    const ent = raceEntry(RSEL.modelId), m = ent.design, car = ent.car;
    distOK(); const myT = distTime(car, RSEL.dist);
    el.innerHTML = `<h2 class="title">${ico('race', 'big')} Drag Race</h2>
    <div class="row">
      <div class="col">
        <div class="panel"><h3>${ico('car')}Dein Auto</h3>
          <select data-inp="rcar" style="width:100%">${raceOptions(RSEL.modelId)}</select>
          ${ent.risk ? `<div class="bad" style="margin:4px">${ico('fire')} Motorschaden! Der Motor kann im Rennen platzen (Risiko ca. ${Math.round(ent.risk * 100)} %).</div>` : ''}
          <div style="background:linear-gradient(#41a6f6,#a8d8f0 70%,#566c86 70%);margin-top:6px"><img src="${carThumbURL(m, ent.brand)}" style="width:100%;image-rendering:pixelated;display:block"></div>
          ${revPanelHTML('race').replace('class="panel revbox"', 'class="revbox" style="margin-top:6px"')}
          <div class="grid2" style="margin-top:6px"><div>Leistung</div><div>${psStr(car)} / ${fmtNum(car.weight)} kg</div><div>0–100</div><div>${tStr(car, car.t100)}</div>
            <div>1/8 Meile (perfekt)</div><div>${tStr(car, car.t18)}</div><div>1/4 Meile (perfekt)</div><div>${carKnown(car) ? car.t14.toFixed(2) + ' s @ ' + Math.round(car.trap14) + ' km/h' : '?.?? s'}</div>${RSEL.dist === 'half' || RSEL.dist === 'mile' ? `<div>${distOf(RSEL.dist).short} (perfekt)</div><div>${myT.toFixed(2)} s</div>` : ''}
            <div>NOS</div><div>${car.nos ? '+' + Math.round(car.nos.mul * 100) + ' % / ' + car.nos.dur + ' s' : 'keins'}</div></div>
          ${wearPanelHTML(RSEL.modelId)}
          <div class="lbl">Strecke</div>${trackOK() && optBtns('rtrack', 'track', Object.entries(TRACKS).map(([k, t]) => [k, t.name, null, S.level < (t.lvl || 1) ? 'Ab Level ' + t.lvl : '']), RSEL.track)}
          <div class="lbl">Tageszeit</div>${optBtns('rtod', 'tod', [['day', '☀ Tag'], ['night', '☾ Nacht']], todNow())}
          <div class="hint" style="margin:0 4px">${TRACKS[RSEL.track].desc}${(TRACKS[RSEL.track].prizeMul || 1) > 1 ? ` · <span class="good">Preisgeld x${TRACKS[RSEL.track].prizeMul}</span>` : ''}</div>
          <div class="lbl">Distanz</div>${optBtns('rdist', 'dist', Object.entries(DISTS).map(([k, d]) => [k, d.label + (d.prize > 1 ? ' · Preis x' + d.prize : ''), null, S.level < d.lvl ? 'Ab Level ' + d.lvl : '']), RSEL.dist)}
          <label class="flex" style="margin:8px 4px;cursor:pointer"><input type="checkbox" data-inp="ghostOn" ${ghostOn() ? 'checked' : ''}> Geist meiner Bestzeit mitfahren lassen
            <span class="hint" style="margin:0">${(() => { const g = ghostOf({ track: RSEL.track, dist: RSEL.dist }); return g ? '(Bestzeit hier: ' + g.total.toFixed(3) + ' s ab Grün)' : '(noch keine Bestzeit hier)'; })()}</span></label>
        </div>
        <div class="panel"><h3>${ico('wrench')}Steuerung</h3>
          <div class="hint" style="color:var(--text);line-height:1.6">
          <b>Leertaste</b> / GAS-Knopf = Gas · <b>Shift</b> / KUPPLUNG halten<br>
          <b>Pfeil ↑ / ↓</b> oder + / − = Hoch-/Runterschalten · <b>N</b> = NOS<br>
          <b>B</b> = Burnout (vor dem Staging, Kupplung + Gas) · <b>S</b> = Stage<br>
          Ablauf: Burnout für warme Reifen → Stage → Kupplung treten und Gas geben → bei <b>Grün</b> Kupplung loslassen. Schalte, wenn die Schaltlichter grün/blau leuchten. Zu früh losfahren = <span class="bad">Rot (Frühstart)</span>!</div>
        </div>
        <div class="panel"><h3>${ico('car')}Cruisen – einfach fahren</h3>
          <div class="hint" style="color:var(--text)">Ohne Gegner, Ziel und Zeit: fahren, Spur wechseln und den Verkehr überholen – auf der oben gewählten Strecke und Tageszeit.<br><b>Leertaste/→</b> Gas · <b>←</b> Bremse · <b>↑/↓</b> Spur · <b>M</b> Automatik an/aus · <b>E/Q</b> schalten · <b>H</b> Hupe · <b>N</b> NOS</div>
          <button class="btn green" data-act="cruise">${ico('car')} Losfahren</button>
        </div>
        <div class="panel"><h3>${ico('car')}Eigene Autos gegeneinander</h3>
          <select data-inp="rcar2" style="width:100%">${raceOptions(RSEL.mine2)}</select>
          <button class="btn yellow" data-act="rstartOwn">Testrennen starten</button><div class="hint">Kein Startgeld, kein Preisgeld – nur zum Vergleichen (+XP).</div>
        </div>
      </div>
      <div class="col">
        <div class="panel"><h3>${ico('trophy')}Gegner</h3>
          ${OPPONENTS.map(o => {
            const oc = computeCar(o.design, o.engine), ot = distTime(oc, RSEL.dist), locked = S.level < o.lvl;
            const prize = Math.round(o.prize * distOf(RSEL.dist).prize * (TRACKS[RSEL.track].prizeMul || 1));
            return `<div class="card ${locked ? 'locked' : ''}"><div class="flex">${faceImg(o.id, 44)}<img src="${carThumbURL(o.design, o.brand)}" style="width:110px;image-rendering:pixelated;background:#22263a">
              <div style="flex:1"><b>${o.name}</b><div class="hint" style="margin:0">${o.brand} · ${oc.ps} PS · ca. ${ot.toFixed(2)} s</div>
              <div><span class="tag">Lvl ${o.lvl}</span><span class="tag r">Start ${fmtMoney(o.fee)}</span><span class="tag g">Preis ${fmtMoney(prize)}</span><span class="tag y">${o.xp} XP</span></div>
              ${locked ? '' : `<div class="hint" style="margin:2px 0 0;color:var(--text)"><i>„${esc(oppQuote(o.id, 'hi'))}“</i></div>`}
              <div class="hint" style="margin:2px 0 0">${ot > myT + 0.3 ? '<span class="good">Du bist schneller</span>' : ot < myT - 0.3 ? '<span class="bad">Gegner ist schneller</span>' : '<span class="warn">Ausgeglichen – Fahrkönnen entscheidet!</span>'}</div></div>
              <button class="btn ${locked ? 'lock' : 'green'}" data-act="rstart" data-v="${o.id}" data-why="Erst ab Level ${o.lvl}">Rennen!</button></div></div>`;
          }).join('')}
          <div class="hint">Bestzeit 1/4 Meile: ${S.stats.best14 ? S.stats.best14.toFixed(3) + ' s' : '–'} · 1/8 Meile: ${S.stats.best18 ? S.stats.best18.toFixed(3) + ' s' : '–'} · Siege ${S.stats.wins}/${S.stats.races}</div>
        </div>
      </div>
    </div>`;
  }
};

INPUTS.ghostOn = el => { S.ghostOn = !!el.checked; };

/** Finanzen der letzten 30 Tage: Einnahmen, Ausgaben nach Art, Gewinn pro Tag als Balken */
function financePanelHTML() {
  const days = ((S.fin && S.fin.days) || []).slice(-30);
  const sum = k => days.reduce((a, d) => a + (d[k] || 0), 0);
  const rev = sum('rev'), prod = sum('prod'), fixed = sum('fixed'), ads = sum('ads'), inv = sum('inv'), other = sum('other');
  const net = rev - prod - fixed - ads - inv + other;
  const prof = days.map(d => (d.rev || 0) - (d.prod || 0) - (d.fixed || 0) - (d.ads || 0) - (d.inv || 0) + (d.other || 0));
  const mx = Math.max(1, ...prof.map(Math.abs));
  const bars = prof.map(v => `<i title="${fmtMoney(Math.round(v))}" style="display:block;width:8px;height:${Math.max(1, Math.round(Math.abs(v) / mx * 30))}px;background:${v >= 0 ? 'var(--lime)' : '#ff7b8a'};align-self:${v >= 0 ? 'flex-end' : 'flex-start'}"></i>`).join('');
  const row = (n, v, cls) => `<div>${n}</div><div class="${cls || ''}">${fmtMoney(Math.round(v))}</div>`;
  return `<div class="panel"><h3>${ico('money')}Finanzen – letzte ${days.length || 0} Tage</h3>
    ${days.length ? `<div class="row"><div class="col" style="flex:1 1 260px"><div class="grid2">
      ${row('Verkäufe', rev, 'good')}${row('Produktion', -prod, 'bad')}${row('Miete, Löhne, Zinsen', -fixed, 'bad')}${row('Werbung', -ads, 'bad')}${row('Investitionen (Ausbau, Entwicklung)', -inv, 'bad')}${row('Sonstiges (Rennen, Shop, Schrottplatz …)', other, other >= 0 ? 'good' : 'bad')}
      <div><b>Ergebnis</b></div><div class="${net >= 0 ? 'good' : 'bad'}"><b>${fmtMoney(Math.round(net))}</b></div></div></div>
      <div class="col" style="flex:1 1 260px"><div class="hint" style="margin:0 0 4px">Gewinn pro Tag</div>
      <div style="display:flex;gap:2px;height:62px;align-items:center;background:#14182a;padding:2px 4px;border-radius:4px">${bars}</div>
      <div class="hint">Laufende Kosten pro Monat: <b class="bad">${fmtMoney(monthlyCost())}</b> · Werbung läuft: ${S.campaigns.length}</div></div></div>`
    : '<div class="hint">Die Übersicht füllt sich ab dem nächsten Spieltag.</div>'}</div>`;
}
