(() => {
  "use strict";
  if (window.__SCOS_EXPENSES_MODULE__) return;
  window.__SCOS_EXPENSES_MODULE__ = true;

  const VERSION = "2026.08.29.2";
  const SUPABASE_URL = "https://pjskrjecyzoprpqhymbq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_PRyYNqhTAhk5sr3wKbIC0g_bYCLEhwd";
  const RECEIPT_BUCKET = "tax-documents";
  const state = {
    client: null,
    session: null,
    orgId: null,
    role: null,
    expenses: [],
    properties: [],
    loading: false,
    query: "",
    category: "",
    reimbursement: ""
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => `EXP${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 900 + 100)}`;
  const payloadOf = row => ({ ...(row?.payload || {}), id: row?.id || row?.payload?.id || "", propertyId: row?.property_id ?? row?.payload?.propertyId ?? "", unitId: row?.unit_id ?? row?.payload?.unitId ?? "" });
  const safeFileName = name => String(name || "receipt").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "receipt";

  function injectShell() {
    if ($("#scosExpensesOverlay")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div id="scosExpensesOverlay" class="scos-expense-overlay" aria-hidden="true">
        <section class="scos-expense-shell" role="dialog" aria-modal="true" aria-labelledby="scosExpenseTitle">
          <header class="scos-expense-header">
            <div>
              <div class="scos-expense-kicker">SECOND CHANCE MONEY CONTROL</div>
              <h2 id="scosExpenseTitle">Expenses &amp; Reimbursements</h2>
              <p>Track company spending once, keep the receipt with it, and see what the business owes back.</p>
            </div>
            <button type="button" class="scos-expense-icon" data-expense-close aria-label="Close expenses">×</button>
          </header>

          <div class="scos-expense-status" id="scosExpenseStatus" hidden></div>

          <div class="scos-expense-metrics" id="scosExpenseMetrics"></div>

          <div class="scos-expense-toolbar">
            <div class="scos-expense-search-wrap"><input id="scosExpenseSearch" type="search" placeholder="Search vendor, note, property…" autocomplete="off"></div>
            <select id="scosExpenseCategoryFilter" aria-label="Filter category"><option value="">All categories</option></select>
            <select id="scosExpenseReimbursementFilter" aria-label="Filter reimbursement"><option value="">All reimbursements</option><option value="due">Reimbursement due</option><option value="reimbursed">Reimbursed</option><option value="none">No reimbursement</option></select>
            <button type="button" class="scos-expense-btn secondary" data-expense-export>Export CSV</button>
            <button type="button" class="scos-expense-btn primary" data-expense-new>+ Add Expense</button>
          </div>

          <div class="scos-expense-list" id="scosExpenseList">
            <div class="scos-expense-empty">Open Expenses to load company spending.</div>
          </div>
        </section>
      </div>

      <div id="scosExpenseFormOverlay" class="scos-expense-form-overlay" aria-hidden="true">
        <form id="scosExpenseForm" class="scos-expense-form-card">
          <header>
            <div><div class="scos-expense-kicker">NEW COMPANY EXPENSE</div><h3>Add Expense</h3><p>Enter it once. The record is saved to Second Chance OS cloud data.</p></div>
            <button type="button" class="scos-expense-icon" data-expense-form-close aria-label="Close add expense">×</button>
          </header>
          <div class="scos-expense-form-grid">
            <label><span>Date *</span><input name="date" type="date" required></label>
            <label><span>Amount *</span><input name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" required></label>
            <label class="wide"><span>Vendor / Store *</span><input name="vendor" type="text" maxlength="120" placeholder="Costco, Home Depot, Shell…" required></label>
            <label><span>Category *</span><select name="category" required>
              <option value="">Choose…</option>
              <option>Cleaning Supplies</option><option>Equipment</option><option>Fuel / Mileage</option><option>Vehicle</option><option>Software</option><option>Phone / Internet</option><option>Insurance</option><option>Licenses / Fees</option><option>Marketing</option><option>Office Supplies</option><option>Payroll / Labor</option><option>Training</option><option>Meals</option><option>Travel</option><option>Professional Services</option><option>Other</option>
            </select></label>
            <label><span>Paid By *</span><select name="paidBy" required><option value="Business">Business</option><option value="Marquise">Marquise</option><option value="Caprice">Caprice</option></select></label>
            <label><span>Payment Method</span><select name="paymentMethod"><option value="">Choose…</option><option>Business Debit / Credit</option><option>Personal Debit / Credit</option><option>Cash</option><option>ACH / Bank Transfer</option><option>Check</option><option>Other</option></select></label>
            <label><span>Property / Contract</span><select name="propertyId" id="scosExpenseProperty"><option value="">General / not job-specific</option></select></label>
            <label><span>Unit / Job ID</span><input name="unitId" type="text" maxlength="80" placeholder="Optional"></label>
            <label><span>Tax Deductible %</span><input name="deductiblePercent" type="number" min="0" max="100" step="1" value="100"></label>
            <label><span>Reference</span><input name="reference" type="text" maxlength="120" placeholder="Order #, last 4, invoice #"></label>
            <label class="wide scos-expense-check"><input name="reimbursementNeeded" type="checkbox"><span>This was paid personally and needs reimbursement</span></label>
            <label class="wide"><span>Receipt / Document</span><input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"><small>Receipt files are stored privately with authorized owner access.</small></label>
            <label class="wide"><span>Notes</span><textarea name="notes" rows="3" maxlength="800" placeholder="What was this for?"></textarea></label>
          </div>
          <footer>
            <button type="button" class="scos-expense-btn secondary" data-expense-form-close>Cancel</button>
            <button type="submit" class="scos-expense-btn primary" id="scosExpenseSave">Save Expense</button>
          </footer>
        </form>
      </div>
    `);

    $$("[data-expense-close]").forEach(btn => btn.addEventListener("click", closeExpenses));
    $$("[data-expense-form-close]").forEach(btn => btn.addEventListener("click", closeForm));
    $("[data-expense-new]").addEventListener("click", openForm);
    $("[data-expense-export]").addEventListener("click", exportCsv);
    $("#scosExpenseSearch").addEventListener("input", e => { state.query = e.target.value.trim().toLowerCase(); renderList(); });
    $("#scosExpenseCategoryFilter").addEventListener("change", e => { state.category = e.target.value; renderList(); });
    $("#scosExpenseReimbursementFilter").addEventListener("change", e => { state.reimbursement = e.target.value; renderList(); });
    $("#scosExpenseForm").addEventListener("submit", saveExpense);
    $("#scosExpensesOverlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeExpenses(); });
    $("#scosExpenseFormOverlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeForm(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { if ($("#scosExpenseFormOverlay")?.classList.contains("open")) closeForm(); else if ($("#scosExpensesOverlay")?.classList.contains("open")) closeExpenses(); } });
  }

  function installTile() {
    if ($("#scosExpensesTile")) return true;
    const headings = $$("h1,h2,h3,h4");
    const heading = headings.find(el => /everything is still here/i.test(el.textContent || "")) || headings.find(el => /deep system tools/i.test(el.parentElement?.textContent || ""));
    if (!heading) return false;
    let section = heading.closest("section") || heading.parentElement?.parentElement || heading.parentElement;
    if (!section) return false;
    const candidates = $$("button,a", section).filter(el => /operations center|workforce center|launch center|tax center|reports|settings|access & governance|client communication/i.test(el.textContent || ""));
    const anchor = candidates.find(el => /client communication/i.test(el.textContent || "")) || candidates[candidates.length - 1];
    if (!anchor || !anchor.parentElement) return false;
    const tile = anchor.cloneNode(false);
    tile.id = "scosExpensesTile";
    tile.removeAttribute("href");
    tile.removeAttribute("onclick");
    tile.removeAttribute("data-view");
    tile.removeAttribute("data-route");
    tile.removeAttribute("data-panel");
    tile.removeAttribute("data-go");
    if (tile.tagName === "BUTTON") tile.type = "button";
    else { tile.setAttribute("role", "button"); tile.tabIndex = 0; }
    tile.innerHTML = `Expenses &amp; Reimbursements<span>Spending, receipts, paybacks</span>`;
    tile.addEventListener("click", e => { e.preventDefault(); openExpenses(); });
    tile.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openExpenses(); } });
    anchor.parentElement.appendChild(tile);
    return true;
  }

  async function ensureSupabase() {
    if (state.client) return state.client;
    const likely = [window.scosSupabase, window.supabaseClient, window.sbClient, window.cloudClient].find(v => v && typeof v.from === "function" && v.auth?.getSession);
    if (likely) { state.client = likely; return likely; }
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-scos-supabase-loader]');
        if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", reject, { once: true }); return; }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.async = true;
        script.dataset.scosSupabaseLoader = "1";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Could not load secure cloud connection."));
        document.head.appendChild(script);
      });
    }
    if (!window.supabase?.createClient) throw new Error("Secure cloud connection is unavailable.");
    state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    return state.client;
  }

  async function identifyOrganization() {
    const client = await ensureSupabase();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    state.session = sessionData?.session || null;
    if (!state.session?.user) throw new Error("Sign in to Second Chance OS first, then open Expenses again.");
    const { data, error } = await client.from("organization_members").select("organization_id,role,active").eq("user_id", state.session.user.id).eq("active", true);
    if (error) throw error;
    const membership = (data || []).find(row => String(row.role) === "owner") || (data || [])[0];
    if (!membership?.organization_id) throw new Error("No active company membership was found for this account.");
    state.orgId = membership.organization_id;
    state.role = String(membership.role || "");
    if (state.role !== "owner") throw new Error("Expenses & Reimbursements is currently restricted to Owner access.");
  }

  async function loadExpenses() {
    if (state.loading) return;
    state.loading = true;
    setStatus("Loading company expenses…", "info");
    try {
      await identifyOrganization();
      const client = state.client;
      const [expenseRes, propertyRes] = await Promise.all([
        client.from("business_expenses").select("organization_id,id,property_id,unit_id,payload,updated_by,created_at,updated_at").eq("organization_id", state.orgId).order("created_at", { ascending: false }),
        client.from("properties").select("id,payload").eq("organization_id", state.orgId).order("created_at", { ascending: false })
      ]);
      if (expenseRes.error) throw expenseRes.error;
      state.expenses = expenseRes.data || [];
      state.properties = propertyRes.error ? [] : (propertyRes.data || []);
      setStatus("", "info");
      renderAll();
    } catch (error) {
      console.error("SCOS expenses load failed", error);
      setStatus(error?.message || "Expenses could not be loaded.", "error");
      renderAll();
    } finally {
      state.loading = false;
    }
  }

  function propertyName(id) {
    if (!id) return "General";
    const row = state.properties.find(p => String(p.id) === String(id));
    const p = row?.payload || {};
    return p.name || p.propertyName || p.property_name || p.address || id;
  }

  function renderAll() {
    renderMetrics();
    renderFilters();
    renderPropertyOptions();
    renderList();
    window.SCOSExpenses = {
      version: VERSION,
      getRows: () => state.expenses.map(row => ({ ...payloadOf(row) })),
      getSummary: summary,
      refresh: loadExpenses,
      open: openExpenses
    };
  }

  function summary() {
    const rows = state.expenses.map(payloadOf);
    const total = rows.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const month = today().slice(0, 7);
    const thisMonth = rows.filter(x => String(x.date || "").slice(0, 7) === month).reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const reimbursementDue = rows.filter(x => x.reimbursementNeeded && String(x.reimbursementStatus || "Pending").toLowerCase() !== "reimbursed").reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const deductible = rows.reduce((sum, x) => sum + (Number(x.amount || 0) * Math.max(0, Math.min(100, Number(x.deductiblePercent ?? 100))) / 100), 0);
    return { total, thisMonth, reimbursementDue, deductible, count: rows.length };
  }

  function renderMetrics() {
    const s = summary();
    const el = $("#scosExpenseMetrics");
    if (!el) return;
    el.innerHTML = `
      <div><span>ALL EXPENSES</span><strong>${money(s.total)}</strong><small>${s.count} record${s.count === 1 ? "" : "s"}</small></div>
      <div><span>THIS MONTH</span><strong>${money(s.thisMonth)}</strong><small>${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</small></div>
      <div><span>REIMBURSEMENT DUE</span><strong>${money(s.reimbursementDue)}</strong><small>Personal money owed back</small></div>
      <div><span>TAX-DEDUCTIBLE VALUE</span><strong>${money(s.deductible)}</strong><small>Based on saved percentages</small></div>
    `;
  }

  function renderFilters() {
    const select = $("#scosExpenseCategoryFilter");
    if (!select) return;
    const current = select.value;
    const cats = [...new Set(state.expenses.map(row => String(payloadOf(row).category || "").trim()).filter(Boolean))].sort();
    select.innerHTML = `<option value="">All categories</option>${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}`;
    if (cats.includes(current)) select.value = current;
  }

  function renderPropertyOptions() {
    const select = $("#scosExpenseProperty");
    if (!select) return;
    const options = state.properties.map(row => `<option value="${esc(row.id)}">${esc(propertyName(row.id))}</option>`).join("");
    select.innerHTML = `<option value="">General / not job-specific</option>${options}`;
  }

  function filteredRows() {
    return state.expenses.filter(row => {
      const p = payloadOf(row);
      const hay = [p.vendor, p.category, p.notes, p.reference, p.paidBy, propertyName(p.propertyId), p.unitId].join(" ").toLowerCase();
      if (state.query && !hay.includes(state.query)) return false;
      if (state.category && String(p.category) !== state.category) return false;
      const status = String(p.reimbursementStatus || (p.reimbursementNeeded ? "Pending" : "Not needed")).toLowerCase();
      if (state.reimbursement === "due" && !(p.reimbursementNeeded && status !== "reimbursed")) return false;
      if (state.reimbursement === "reimbursed" && status !== "reimbursed") return false;
      if (state.reimbursement === "none" && p.reimbursementNeeded) return false;
      return true;
    });
  }

  function renderList() {
    const el = $("#scosExpenseList");
    if (!el) return;
    const rows = filteredRows();
    if (!rows.length) {
      el.innerHTML = `<div class="scos-expense-empty"><strong>${state.expenses.length ? "No expenses match this filter." : "No expenses yet."}</strong><span>${state.expenses.length ? "Clear a filter to see more records." : "Tap + Add Expense to record the first one."}</span></div>`;
      return;
    }
    el.innerHTML = `<div class="scos-expense-table-wrap"><table class="scos-expense-table"><thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th>Paid by</th><th>Property / Job</th><th>Amount</th><th>Reimbursement</th><th>Receipt</th><th></th></tr></thead><tbody>${rows.map(expenseRowHtml).join("")}</tbody></table></div>`;
    $$("[data-expense-reimburse]", el).forEach(btn => btn.addEventListener("click", () => markReimbursed(btn.dataset.expenseReimburse)));
    $$("[data-expense-receipt]", el).forEach(btn => btn.addEventListener("click", () => openReceipt(btn.dataset.expenseReceipt)));
    $$("[data-expense-delete]", el).forEach(btn => btn.addEventListener("click", () => deleteExpense(btn.dataset.expenseDelete)));
  }

  function expenseRowHtml(row) {
    const p = payloadOf(row);
    const reimbursementStatus = String(p.reimbursementStatus || (p.reimbursementNeeded ? "Pending" : "Not needed"));
    const needs = !!p.reimbursementNeeded;
    const reimbursed = reimbursementStatus.toLowerCase() === "reimbursed";
    const receipt = p.receiptPath ? `<button class="scos-expense-link" type="button" data-expense-receipt="${esc(p.id)}">View</button>` : `<span class="scos-expense-muted">—</span>`;
    const reimbursement = needs ? (reimbursed ? `<span class="scos-expense-pill done">Reimbursed</span>` : `<button class="scos-expense-pill due" type="button" data-expense-reimburse="${esc(p.id)}">Mark reimbursed</button>`) : `<span class="scos-expense-pill neutral">Not needed</span>`;
    return `<tr>
      <td data-label="Date">${esc(p.date || "—")}</td>
      <td data-label="Vendor"><strong>${esc(p.vendor || "—")}</strong>${p.reference ? `<small>${esc(p.reference)}</small>` : ""}</td>
      <td data-label="Category">${esc(p.category || "Other")}</td>
      <td data-label="Paid by">${esc(p.paidBy || "Business")}</td>
      <td data-label="Property / Job">${esc(propertyName(p.propertyId))}${p.unitId ? `<small>${esc(p.unitId)}</small>` : ""}</td>
      <td data-label="Amount" class="amount"><strong>${money(p.amount)}</strong>${Number(p.deductiblePercent ?? 100) !== 100 ? `<small>${esc(p.deductiblePercent)}% deductible</small>` : ""}</td>
      <td data-label="Reimbursement">${reimbursement}</td>
      <td data-label="Receipt">${receipt}</td>
      <td class="actions"><button type="button" class="scos-expense-menu" data-expense-delete="${esc(p.id)}" aria-label="Delete expense">Delete</button></td>
    </tr>`;
  }

  function openExpenses() {
    injectShell();
    const overlay = $("#scosExpensesOverlay");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("scos-expenses-open");
    loadExpenses();
  }

  function closeExpenses() {
    const overlay = $("#scosExpensesOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("scos-expenses-open");
  }

  function openForm() {
    if (!state.orgId) { loadExpenses().then(() => { if (state.orgId) openForm(); }); return; }
    const form = $("#scosExpenseForm");
    form.reset();
    form.elements.date.value = today();
    form.elements.deductiblePercent.value = "100";
    form.elements.paidBy.value = "Business";
    $("#scosExpenseFormOverlay").classList.add("open");
    $("#scosExpenseFormOverlay").setAttribute("aria-hidden", "false");
    setTimeout(() => form.elements.amount.focus(), 50);
  }

  function closeForm() {
    const el = $("#scosExpenseFormOverlay");
    if (!el) return;
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
  }

  async function saveExpense(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("#scosExpenseSave");
    const fd = new FormData(form);
    const amount = Number(fd.get("amount") || 0);
    if (!(amount > 0)) { setStatus("Enter an expense amount greater than $0.", "error"); return; }
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      await identifyOrganization();
      const id = uid();
      const file = form.elements.receipt.files?.[0] || null;
      let receiptPath = "";
      let receiptName = "";
      if (file) {
        receiptName = file.name;
        receiptPath = `${state.orgId}/business-expenses/${id}/${Date.now()}-${safeFileName(file.name)}`;
        const upload = await state.client.storage.from(RECEIPT_BUCKET).upload(receiptPath, file, { upsert: false, contentType: file.type || undefined });
        if (upload.error) throw new Error(`Receipt upload failed: ${upload.error.message}`);
      }
      const reimbursementNeeded = form.elements.reimbursementNeeded.checked;
      const payload = {
        id,
        date: String(fd.get("date") || today()),
        amount,
        vendor: String(fd.get("vendor") || "").trim(),
        category: String(fd.get("category") || "Other"),
        paidBy: String(fd.get("paidBy") || "Business"),
        paymentMethod: String(fd.get("paymentMethod") || ""),
        propertyId: String(fd.get("propertyId") || ""),
        unitId: String(fd.get("unitId") || "").trim(),
        deductiblePercent: Math.max(0, Math.min(100, Number(fd.get("deductiblePercent") ?? 100))),
        reference: String(fd.get("reference") || "").trim(),
        notes: String(fd.get("notes") || "").trim(),
        reimbursementNeeded,
        reimbursementStatus: reimbursementNeeded ? "Pending" : "Not needed",
        receiptPath,
        receiptName,
        createdAt: new Date().toISOString()
      };
      const row = {
        organization_id: state.orgId,
        id,
        property_id: payload.propertyId || null,
        unit_id: payload.unitId || null,
        payload,
        updated_by: state.session.user.id,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await state.client.from("business_expenses").insert(row).select("organization_id,id,property_id,unit_id,payload,updated_by,created_at,updated_at").single();
      if (error) {
        if (receiptPath) await state.client.storage.from(RECEIPT_BUCKET).remove([receiptPath]);
        throw error;
      }
      state.expenses.unshift(data);
      closeForm();
      renderAll();
      setStatus(`Saved ${money(amount)} from ${payload.vendor}.`, "success");
      document.dispatchEvent(new CustomEvent("scos:expenses-updated", { detail: summary() }));
    } catch (error) {
      console.error("SCOS expense save failed", error);
      setStatus(error?.message || "Expense could not be saved.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Save Expense";
    }
  }

  async function markReimbursed(id) {
    const row = state.expenses.find(x => String(x.id) === String(id));
    if (!row) return;
    const p = payloadOf(row);
    if (!confirm(`Mark ${money(p.amount)} paid by ${p.paidBy || "owner"} as reimbursed?`)) return;
    try {
      const nextPayload = { ...row.payload, reimbursementNeeded: true, reimbursementStatus: "Reimbursed", reimbursedAt: new Date().toISOString() };
      const { data, error } = await state.client.from("business_expenses").update({ payload: nextPayload, updated_by: state.session.user.id, updated_at: new Date().toISOString() }).eq("organization_id", state.orgId).eq("id", id).select("organization_id,id,property_id,unit_id,payload,updated_by,created_at,updated_at").single();
      if (error) throw error;
      state.expenses = state.expenses.map(x => x.id === id ? data : x);
      renderAll();
      setStatus("Reimbursement marked complete.", "success");
      document.dispatchEvent(new CustomEvent("scos:expenses-updated", { detail: summary() }));
    } catch (error) { setStatus(error?.message || "Could not update reimbursement.", "error"); }
  }

  async function openReceipt(id) {
    const p = payloadOf(state.expenses.find(x => String(x.id) === String(id)));
    if (!p.receiptPath) return;
    try {
      const { data, error } = await state.client.storage.from(RECEIPT_BUCKET).createSignedUrl(p.receiptPath, 300);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) { setStatus(error?.message || "Receipt could not be opened.", "error"); }
  }

  async function deleteExpense(id) {
    const row = state.expenses.find(x => String(x.id) === String(id));
    if (!row) return;
    const p = payloadOf(row);
    if (!confirm(`Delete the ${money(p.amount)} expense from ${p.vendor || "this vendor"}? This cannot be undone.`)) return;
    try {
      const { error } = await state.client.from("business_expenses").delete().eq("organization_id", state.orgId).eq("id", id);
      if (error) throw error;
      if (p.receiptPath) await state.client.storage.from(RECEIPT_BUCKET).remove([p.receiptPath]);
      state.expenses = state.expenses.filter(x => String(x.id) !== String(id));
      renderAll();
      setStatus("Expense deleted.", "success");
      document.dispatchEvent(new CustomEvent("scos:expenses-updated", { detail: summary() }));
    } catch (error) { setStatus(error?.message || "Expense could not be deleted.", "error"); }
  }

  function exportCsv() {
    const rows = filteredRows().map(payloadOf);
    if (!rows.length) { setStatus("There are no expenses in the current view to export.", "info"); return; }
    const headers = ["Date","Vendor","Category","Paid By","Payment Method","Property","Unit/Job","Amount","Deductible %","Reimbursement Needed","Reimbursement Status","Reference","Receipt","Notes"];
    const values = rows.map(p => [p.date,p.vendor,p.category,p.paidBy,p.paymentMethod,propertyName(p.propertyId),p.unitId,Number(p.amount || 0).toFixed(2),p.deductiblePercent ?? 100,p.reimbursementNeeded ? "Yes" : "No",p.reimbursementStatus || "",p.reference,p.receiptName || "",p.notes]);
    const cell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...values].map(row => row.map(cell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `second-chance-expenses-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setStatus(message, type = "info") {
    const el = $("#scosExpenseStatus");
    if (!el) return;
    if (!message) { el.hidden = true; el.textContent = ""; el.className = "scos-expense-status"; return; }
    el.hidden = false;
    el.textContent = message;
    el.className = `scos-expense-status ${type}`;
    if (type === "success") setTimeout(() => { if (el.textContent === message) { el.hidden = true; el.textContent = ""; } }, 4500);
  }

  function init() {
    injectShell();
    installTile();
    const observer = new MutationObserver(() => installTile());
    observer.observe(document.body, { childList: true, subtree: true });
    let tries = 0;
    const timer = setInterval(() => { tries += 1; if (installTile() || tries > 40) clearInterval(timer); }, 500);
    window.SCOSExpenses = { version: VERSION, open: openExpenses, refresh: loadExpenses, getRows: () => state.expenses.map(payloadOf), getSummary: summary };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
