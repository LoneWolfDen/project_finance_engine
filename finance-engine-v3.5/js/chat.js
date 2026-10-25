let chatMode = localStorage.getItem("pf_chat_mode") || "smart"; // 'smart','ollama','copilot'
let copilotUrl = localStorage.getItem("pf_copilot_url") || "";

function toggleChatPanel() {
  document.getElementById("chatPanel").classList.toggle("open");
}
function switchChatMode() {
  const modes = ["smart", "ollama", "copilot"];
  const i = (modes.indexOf(chatMode) + 1) % modes.length;
  chatMode = modes[i];
  if (chatMode === "copilot") {
    if (copilotUrl) {
      showCopilotFrame();
    } else {
      showCopilotSetup();
      return;
    }
  } else {
    document.getElementById("chatBody").style.display = "";
    document.getElementById("copilotFrame").style.display = "none";
  }
  localStorage.setItem("pf_chat_mode", chatMode);
  document.getElementById("chatModeLabel").textContent =
    chatMode === "smart" ? "Smart (Local)" : chatMode === "ollama" ? "Ollama AI" : "Copilot";
}
function showCopilotFrame() {
  document.getElementById("chatBody").style.display = "none";
  document.getElementById("copilotFrame").style.display = "flex";
  document.getElementById("copilotIframe").src = copilotUrl;
  localStorage.setItem("pf_chat_mode", "copilot");
  document.getElementById("chatModeLabel").textContent = "Copilot";
}
function showCopilotSetup() {
  const url = prompt("Paste your Copilot Studio embed URL:");
  if (url) {
    copilotUrl = url;
    localStorage.setItem("pf_copilot_url", url);
    chatMode = "copilot";
    showCopilotFrame();
  } else {
    chatMode = "smart";
    localStorage.setItem("pf_chat_mode", "smart");
    document.getElementById("chatModeLabel").textContent = "Smart (Local)";
  }
}

// ─── SMART ASSISTANT (rule-based, no model needed) ───
function smartAnswer(msg, model) {
  const q = msg.toLowerCase();
  const res = model.cfg.resources || [];
  const normFilter = selectedPoTeams.length ? selectedPoTeams.map((t) => t.replace(/\s+/g, "")) : null;
  const fRes = normFilter ? res.filter((r) => normFilter.includes((r.po_team || "").replace(/\s+/g, ""))) : res;
  const people = [...new Set(fRes.map((r) => r.name))];

  // Budget/remaining
  if (q.match(/budget|remaining|left|how much/)) {
    return `💰 PO Value: ${fmtMoney(model.fc.totalPOValue)} | Actuals: ${fmtMoney(model.totalActuals)} | Expenses: ${fmtMoney(model.totalExpenses)} | <strong>Remaining: ${fmtMoney(model.remaining)}</strong> | Burn rate: ${fmtMoney(model.fc.rate)}/day${model.remaining > 0 ? ` (~${Math.round(model.remaining / model.fc.rate)} working days left)` : " ⚠️ Over budget!"}`;
  }

  // Burn rate
  if (q.match(/burn\s*rate|daily\s*cost|per\s*day/)) {
    return `🔥 Current burn rate: <strong>${fmtMoney(model.fc.rate)}/day</strong> across ${people.length} people. Total forecast: ${fmtMoney(model.fc.total)} over ${model.fc.days} working days.`;
  }

  // Utilization / over-utilized
  if (q.match(/utiliz|over.?util|under.?util|who is over/)) {
    const fullCfg = loadWork();
    const byP = {};
    fRes.forEach((r) => {
      const k = r.name;
      if (!byP[k]) byP[k] = { avail: 0, actual: 0 };
    });
    // simplified: just show allocation summary
    const overAlloc = fRes.filter((r) => r.alloc > 0.8).map((r) => `${r.name} (${r.alloc * 100}%)`);
    return `👥 ${people.length} people in scope. High allocation (>80%): ${overAlloc.length ? overAlloc.slice(0, 5).join(", ") : "None"}. Check ⏱️ Utilization tab for full actuals-based analysis.`;
  }

  // Resources / who / team
  if (q.match(/who|resource|people|team|staff/)) {
    const summary = people
      .slice(0, 10)
      .map((n) => {
        const rules = fRes.filter((r) => r.name === n);
        return `${n} (${rules[0].role}, £${rules[0].bill_rate}/hr, ${rules[0].alloc * 100}%)`;
      })
      .join("<br>");
    return `👥 <strong>${people.length} people</strong> in ${[...new Set(fRes.map((r) => r.po_team))].length} team(s):<br>${summary}${people.length > 10 ? "<br>...and " + (people.length - 10) + " more" : ""}`;
  }

  // Forecast
  if (q.match(/forecast|predict|project.*cost/)) {
    return `📈 Total forecast: <strong>${fmtMoney(model.fc.total)}</strong> over ${model.fc.days} working days. PO Value: ${fmtMoney(model.fc.totalPOValue)}. Variance from budget: ${fmtMoney(model.fc.totalPOValue - model.fc.total)} ${model.fc.total > model.fc.totalPOValue ? "⚠️ OVER" : "✅ Under"}.`;
  }

  // Actuals / spent
  if (q.match(/actual|spent|spend|cost so far/)) {
    const months = model.actuals || [];
    const latest = months.length ? months[months.length - 1] : null;
    return `📊 Total actuals: <strong>${fmtMoney(model.totalActuals)}</strong> across ${months.length} months. ${latest ? `Latest: ${latest.month} = ${fmtMoney(latest.actuals)}` : ""} Expenses: ${fmtMoney(model.totalExpenses)}.`;
  }

  // Invoices
  if (q.match(/invoice|paid|submitted|billing/)) {
    const invs = model.cfg.invoices || [];
    const paid = invs.filter((i) => i.status === "Paid");
    const sub = invs.filter((i) => i.status === "Submitted");
    return `🧾 ${invs.length} invoices total. Paid: ${paid.length} (${fmtMoney(paid.reduce((s, i) => s + i.amount, 0))}). Submitted: ${sub.length} (${fmtMoney(sub.reduce((s, i) => s + i.amount, 0))}). Draft: ${invs.length - paid.length - sub.length}.`;
  }

  // Specific person
  const personMatch = people.find((p) => q.includes(p.toLowerCase()));
  if (personMatch) {
    const rules = fRes.filter((r) => r.name === personMatch);
    const totalDays = rules.reduce((s, r) => {
      const d = Math.round((new Date(r.end) - new Date(r.start)) / 86400000);
      return s + d;
    }, 0);
    return `👤 <strong>${personMatch}</strong>: ${rules.length} allocation rule(s). Role: ${rules[0].role}. Rate: £${rules[0].bill_rate}/hr. Period: ${rules[0].start} → ${rules[rules.length - 1].end}. Daily cost: £${(rules[0].bill_rate * rules[0].alloc * 8).toFixed(0)}/day.`;
  }

  // Expenses
  if (q.match(/expense|claim|travel/)) {
    return `💳 Total expenses: <strong>${fmtMoney(model.totalExpenses)}</strong> (${model.filteredExpenses.length} claims). ${model.filteredExpenses
      .slice(0, 3)
      .map((e) => `${e.name}: ${fmtMoney(e.amount)} (${e.desc})`)
      .join(", ")}.`;
  }

  // Help
  if (q.match(/help|what can you|commands/)) {
    return `I can answer questions about:<br>• 💰 Budget/remaining<br>• 🔥 Burn rate<br>• 👥 Resources/team<br>• 📈 Forecast<br>• 📊 Actuals/spend<br>• 🧾 Invoices<br>• 💳 Expenses<br>• 👤 Specific person (use their name)<br>• 👥 Utilization<br><br>Switch to <strong>Ollama AI</strong> mode for free-form questions.`;
  }

  return null; // no match → fallback
}

async function sendChat() {
  const input = document.getElementById("chatIn");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  const msgs = document.getElementById("chatMsgs");
  msgs.innerHTML += `<div class="chat-msg user">${msg}</div>`;
  msgs.scrollTop = msgs.scrollHeight;
  const model = buildData();

  // Smart mode (rule-based)
  if (chatMode === "smart") {
    const answer = smartAnswer(msg, model);
    if (answer) {
      msgs.innerHTML += `<div class="chat-msg ai">${answer}</div>`;
    } else {
      msgs.innerHTML += `<div class="chat-msg ai">🤔 I didn't understand that. Try asking about: budget, burn rate, resources, forecast, actuals, invoices, expenses, or a person's name.<br><small>Switch to Ollama mode for free-form AI answers.</small></div>`;
    }
    msgs.scrollTop = msgs.scrollHeight;
    return;
  }

  // Ollama mode
  const ctx = `Dashboard context: PO Value=${model.fc.totalPOValue}, Forecast=${model.fc.total}, Actuals=${model.totalActuals}, Remaining=${model.remaining}, Resources=${model.cfg.resources.length}, Year=${selectedYear || "All"}, Teams=${model.allPoTeams.join(",")}. Top resources: ${model.cfg.resources
    .slice(0, 8)
    .map((r) => r.name + "(" + r.po_team + ",£" + r.bill_rate + ")")
    .join("; ")}`;
  try {
    msgs.innerHTML += `<div class="chat-msg ai" id="chatLoading">⏳ Thinking...</div>`;
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a project finance assistant. Answer concisely. " + ctx },
          { role: "user", content: msg },
        ],
      }),
    });
    document.getElementById("chatLoading")?.remove();
    if (!resp.ok) {
      const err = await resp.json();
      msgs.innerHTML += `<div class="chat-msg err">⚠️ ${err.error}. Try Smart mode (click Mode).</div>`;
    } else {
      const data = await resp.json();
      msgs.innerHTML += `<div class="chat-msg ai">${data.content}</div>`;
    }
  } catch (e) {
    document.getElementById("chatLoading")?.remove();
    msgs.innerHTML += `<div class="chat-msg err">⚠️ Ollama not running. Use Smart mode or run: <code>ollama serve &</code> then <code>ollama pull phi3:mini</code></div>`;
  }
  msgs.scrollTop = msgs.scrollHeight;
}
