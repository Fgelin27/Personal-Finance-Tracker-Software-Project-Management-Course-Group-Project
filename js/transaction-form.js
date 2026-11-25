import {
    categories,
    getCategories,
    isValidCategory,
    populateCategoryOptions
} from "./transaction-categories.js";

import {
    validateTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    loadAppState,
    saveAppState,
    transactionsToCSV,
    parseRFC4180CSV
} from "./transaction.js";

const appState = loadAppState();

const fmtCurrency = (n) => {
    const abs = Math.abs(Number(n) || 0);
    const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return Number(n) < 0 ? `-$${formatted}` : `$${formatted}`;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const escapeHTML = (str) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
};

// DOM References
const formEl = document.getElementById("transaction-form");
const typeEl = document.getElementById("type");
const amountEl = document.getElementById("amount");
const categoryEl = document.getElementById("category");
const dateEl = document.getElementById("date");
const noteEl = document.getElementById("note");
const editIdEl = document.getElementById("edit-id");
const submitBtn = document.getElementById("submit-button");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const formHeading = document.getElementById("form-heading");
const formMessage = document.getElementById("form-message");
const txListEl = document.getElementById("transaction-list");

const filterSearchEl = document.getElementById("filter-search");
const filterTypeEl = document.getElementById("filter-type");
const filterCategoryEl = document.getElementById("filter-category");
const filterMonthEl = document.getElementById("filter-month");

function setFormMessage(text, isError = false) {
    formMessage.textContent = text;
    formMessage.className = isError ? "text-expense" : "text-income";
}

//the import button listener
const importButton = document.getElementById("import-csv-btn");
const importInput = document.getElementById("import-csv-input");

importButton.addEventListener("click", () => {
    importInput.click();
});

function populateFilterCategoryDropdown() {
    const current = filterCategoryEl.value;
    filterCategoryEl.replaceChildren();
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All Categories";
    filterCategoryEl.appendChild(allOpt);

    const allCats = [...categories.expense, ...categories.income];
    allCats.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        filterCategoryEl.appendChild(opt);
    });

    if ([...filterCategoryEl.options].some(o => o.value === current)) {
        filterCategoryEl.value = current;
    }
}

function getFilteredTransactions() {
    const q = filterSearchEl.value.trim().toLowerCase();
    const t = filterTypeEl.value;
    const c = filterCategoryEl.value;
    const m = filterMonthEl.value;

    return appState.transactions
        .filter(tx => {
            if (t !== "all" && tx.type !== t) return false;
            if (c !== "all" && tx.category !== c) return false;
            if (m && !tx.date.startsWith(m)) return false;
            if (q) {
                const hay = `${tx.category} ${tx.note || ""} ${tx.date} ${tx.amount}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
}

function renderAll() {
    const filtered = getFilteredTransactions();

    let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;
    for (const tx of filtered) {
        if (tx.type === "income") {
            income += Number(tx.amount);
            incomeCount++;
        } else {
            expense += Number(tx.amount);
            expenseCount++;
        }
    }
    const net = income - expense;
    const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : "0.0";

    document.getElementById("kpi-income").textContent = fmtCurrency(income);
    document.getElementById("kpi-income-sub").textContent = `${incomeCount} record(s)`;
    document.getElementById("kpi-expense").textContent = fmtCurrency(expense);
    document.getElementById("kpi-expense-sub").textContent = `${expenseCount} record(s)`;

    const netEl = document.getElementById("kpi-net");
    netEl.textContent = (net >= 0 ? "+" : "") + fmtCurrency(net);
    netEl.className = "value " + (net >= 0 ? "text-income" : "text-expense");
    document.getElementById("kpi-savings-sub").textContent = `Savings rate: ${savingsRate}%`;

    const activeMonth = filterMonthEl.value || todayStr().slice(0, 7);
    const monthExpense = appState.transactions
        .filter(tx => tx.type === "expense" && tx.date.startsWith(activeMonth))
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const limit = Number(appState.monthlyBudget) || 0;
    const pct = limit > 0 ? (monthExpense / limit) * 100 : 0;

    document.getElementById("kpi-budget").textContent = `${fmtCurrency(monthExpense)} / ${fmtCurrency(limit)}`;
    document.getElementById("kpi-budget-sub").textContent = `${ activeMonth }: ${pct.toFixed(1)}% used`;

    const barEl = document.getElementById("kpi-budget-bar");
    barEl.style.width = `${Math.min(100, pct)}%`;
    barEl.className = "budget-fill" + (pct >= 100 ? " over" : pct >= 80 ? " warn" : "");

    const alertEl = document.getElementById("budget-alert");
    if (limit > 0 && pct >= 100) {
        alertEl.style.display = "block";
        alertEl.className = "alert-box text-expense";
        alertEl.textContent = `Budget Alert: ${activeMonth} expenses (${fmtCurrency(monthExpense)}) exceed your monthly limit of ${fmtCurrency(limit)} by ${fmtCurrency(monthExpense - limit)}.`;
    } else if (limit > 0 && pct >= 80) {
        alertEl.style.display = "block";
        alertEl.className = "alert-box";
        alertEl.textContent = `Budget Notice: ${activeMonth} expenses have reached ${pct.toFixed(1)}% of your ${fmtCurrency(limit)} monthly limit.`;
    } else {
        alertEl.style.display = "none";
    }

    renderTransactionTable(filtered);
    renderCategoryBreakdown(filtered);
}

function renderTransactionTable(list) {
    document.getElementById("record-count-label").textContent = `${list.length} of ${appState.transactions.length} records`;

    if (list.length === 0) {
        txListEl.innerHTML = `<p class="muted">No transaction yet.</p>`;
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Note</th>
                <th class="right">Amount</th>
                <th class="right">Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    for (const tx of list) {
        const tr = document.createElement("tr");
        const isInc = tx.type === "income";
        tr.innerHTML = `
            <td>${escapeHTML(tx.date)}</td>
            <td class="${isInc ? "text-income" : "text-expense"}">${isInc ? "Income" : "Expense"}</td>
            <td>${escapeHTML(tx.category)}</td>
            <td class="muted">${escapeHTML(tx.note || "-")}</td>
            <td class="right ${isInc ? "text-income" : "text-expense"}">${isInc ? "+" : "-"}${fmtCurrency(tx.amount)}</td>
            <td class="right">
                <button type="button" class="btn-inline edit-btn" data-id="${escapeHTML(tx.id)}">Edit</button>
                <button type="button" class="btn-inline text-expense delete-btn" data-id="${escapeHTML(tx.id)}">Del</button>
            </td>
        `;
        tbody.appendChild(tr);
    }

    txListEl.replaceChildren(table);
}

function renderCategoryBreakdown(list) {
    const expenseList = list.filter(tx => tx.type === "expense");
    const totalExpense = expenseList.reduce((s, tx) => s + Number(tx.amount), 0);

    const map = new Map();
    for (const tx of expenseList) {
        const prev = map.get(tx.category) || { count: 0, total: 0 };
        prev.count += 1;
        prev.total += Number(tx.amount);
        map.set(tx.category, prev);
    }

    const rows = [...map.entries()]
        .map(([category, data]) => ({
            category,
            count: data.count,
            total: data.total,
            pct: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total);

    const tbody = document.getElementById("category-summary-tbody");
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="muted">No expense data for current filter.</td></tr>`;
    } else {
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${escapeHTML(r.category)}</td>
                <td class="right">${r.count}</td>
                <td class="right">${fmtCurrency(r.total)}</td>
                <td class="right">${r.pct.toFixed(1)}%</td>
            </tr>
        `).join("");
    }

    drawChart(rows, totalExpense);
}

function drawChart(rows, totalExpense) {
    const canvas = document.getElementById("spending-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 480;
    const h = rect.height || 220;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#252526";
    ctx.fillRect(0, 0, w, h);

    if (rows.length === 0 || totalExpense <= 0) {
        ctx.fillStyle = "#8c8c8c";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No expense records to chart.", w / 2, h / 2);
        return;
    }

    const mode = document.getElementById("chart-mode").value;
    const top = rows.slice(0, 6);
    const palette = ["#8a9a86", "#7a8aa0", "#a08a7a", "#8c7aa0", "#7aa09a", "#a09a7a"];

    if (mode === "bar") {
        const maxVal = Math.max(...top.map(r => r.total), 1);
        const leftPad = 115;
        const rightPad = 80;
        const topPad = 18;
        const rowH = (h - topPad * 2) / top.length;

        top.forEach((r, i) => {
            const y = topPad + i * rowH;
            const barMaxW = Math.max(20, w - leftPad - rightPad);
            const barW = (r.total / maxVal) * barMaxW;

            ctx.fillStyle = "#d4d4d4";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(r.category.slice(0, 14), leftPad - 10, y + rowH / 2 + 4);

            ctx.fillStyle = palette[i % palette.length];
            ctx.fillRect(leftPad, y + 6, barW, Math.max(8, rowH - 12));

            ctx.fillStyle = "#8c8c8c";
            ctx.textAlign = "left";
            ctx.fillText(fmtCurrency(r.total), leftPad + barW + 8, y + rowH / 2 + 4);
        });
    } else {
        const cx = Math.min(w * 0.3, 130);
        const cy = h / 2;
        const radius = Math.min(cx - 20, h / 2 - 20);
        let angle = -Math.PI / 2;

        top.forEach((r, i) => {
            const slice = (r.total / totalExpense) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, angle, angle + slice);
            ctx.closePath();
            ctx.fillStyle = palette[i % palette.length];
            ctx.fill();
            ctx.strokeStyle = "#252526";
            ctx.lineWidth = 2;
            ctx.stroke();
            angle += slice;
        });

        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "#252526";
        ctx.fill();

        const legendX = cx + radius + 24;
        top.forEach((r, i) => {
            const ly = 28 + i * 28;
            ctx.fillStyle = palette[i % palette.length];
            ctx.fillRect(legendX, ly - 9, 10, 10);
            ctx.fillStyle = "#d4d4d4";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(`${r.category}: ${fmtCurrency(r.total)} (${r.pct.toFixed(0)}%)`, legendX + 16, ly);
        });
    }
}

// Form & UI Event Listeners
typeEl.addEventListener("change", () => {
    populateCategoryOptions(typeEl.value, categoryEl);
});

document.querySelectorAll(".quick-amt").forEach(btn => {
    btn.addEventListener("click", () => {
        const cur = Number(amountEl.value) || 0;
        amountEl.value = (cur + Number(btn.dataset.val)).toFixed(2);
    });
});

function exitEditMode() {
    editIdEl.value = "";
    formHeading.textContent = "Add Transaction";
    submitBtn.textContent = "Add Transaction";
    cancelEditBtn.style.display = "none";
    typeEl.value = "expense";
    populateCategoryOptions("expense", categoryEl);
    amountEl.value = "";
    dateEl.value = todayStr();
    noteEl.value = "";
}

cancelEditBtn.addEventListener("click", () => {
    exitEditMode();
    setFormMessage("Edit cancelled.");
});

formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
        const payload = {
            type: typeEl.value,
            amount: amountEl.value,
            category: categoryEl.value,
            date: dateEl.value,
            note: noteEl.value
        };

        const editingId = editIdEl.value;
        if (editingId) {
            const existing = appState.transactions.find(t => t.id === editingId);
            const updated = updateTransaction(existing, payload);
            appState.transactions = appState.transactions.map(t => t.id === editingId ? updated : t);
            saveAppState(appState);
            exitEditMode();
            setFormMessage("Transaction updated.");
        } else {
            const created = createTransaction(payload);
            appState.transactions.push(created);
            saveAppState(appState);
            amountEl.value = "";
            noteEl.value = "";
            populateCategoryOptions(typeEl.value, categoryEl);
            setFormMessage("Transaction added.");
        }
        renderAll();
    } catch (err) {
        setFormMessage(err.message, true);
    }
});

txListEl.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const delBtn = e.target.closest(".delete-btn");

    if (editBtn) {
        const tx = appState.transactions.find(t => t.id === editBtn.dataset.id);
        if (!tx) return;
        editIdEl.value = tx.id;
        typeEl.value = tx.type;
        populateCategoryOptions(tx.type, categoryEl);
        categoryEl.value = tx.category;
        amountEl.value = tx.amount;
        dateEl.value = tx.date;
        noteEl.value = tx.note || "";
        formHeading.textContent = "Edit Transaction";
        submitBtn.textContent = "Update Transaction";
        cancelEditBtn.style.display = "inline-block";
        setFormMessage(`Editing record from ${tx.date}`);
    } else if (delBtn) {
        appState.transactions = deleteTransaction(appState.transactions, delBtn.dataset.id);
        saveAppState(appState);
        if (editIdEl.value === delBtn.dataset.id) exitEditMode();
        setFormMessage("Transaction deleted.");
        renderAll();
    }
});

[filterSearchEl, filterTypeEl, filterCategoryEl, filterMonthEl].forEach(el => {
    el.addEventListener("input", renderAll);
    el.addEventListener("change", renderAll);
});

document.getElementById("clear-filters-btn").addEventListener("click", () => {
    filterSearchEl.value = "";
    filterTypeEl.value = "all";
    filterCategoryEl.value = "all";
    filterMonthEl.value = "";
    renderAll();
});

document.getElementById("chart-mode").addEventListener("change", renderAll);
window.addEventListener("resize", renderAll);

document.getElementById("budget-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = Number(document.getElementById("monthly-budget-input").value);
    if (Number.isFinite(val) && val >= 0) {
        appState.monthlyBudget = val;
        saveAppState(appState);
        renderAll();
        setFormMessage("Monthly budget limit saved.");
    }
});

document.getElementById("export-csv-btn").addEventListener("click", () => {
    if (appState.transactions.length === 0) {
        setFormMessage("No transactions to export.", true);
        return;
    }
    const csv = transactionsToCSV(appState.transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFormMessage(`Exported ${appState.transactions.length} records to CSV.`);
});

document.getElementById("import-csv-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const text = await file.text();
        const rows = parseRFC4180CSV(text);
        if (rows.length < 2) throw new Error("CSV file contains no data rows.");

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const idx = {
            id: headers.indexOf("id"),
            type: headers.indexOf("type"),
            amount: headers.indexOf("amount"),
            category: headers.indexOf("category"),
            date: headers.indexOf("date"),
            note: headers.indexOf("note")
        };

        if (idx.type === -1 || idx.amount === -1 || idx.category === -1 || idx.date === -1) {
            throw new Error("CSV must include type, amount, category, and date columns.");
        }

        const imported = [];
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            imported.push(createTransaction({
                id: idx.id !== -1 && r[idx.id] ? r[idx.id].trim() : undefined,
                type: (r[idx.type] || "").trim().toLowerCase(),
                amount: (r[idx.amount] || "").replace(/[$,]/g, "").trim(),
                category: (r[idx.category] || "").trim(),
                date: (r[idx.date] || "").trim(),
                note: idx.note !== -1 ? (r[idx.note] || "").trim() : ""
            }));
        }

        const mode = document.getElementById("csv-import-mode").value;
        if (mode === "replace") {
            appState.transactions = imported;
        } else {
            const existingIds = new Set(appState.transactions.map(t => t.id));
            for (const item of imported) {
                if (!existingIds.has(item.id)) {
                    appState.transactions.push(item);
                    existingIds.add(item.id);
                }
            }
        }

        saveAppState(appState);
        renderAll();
        setFormMessage(`Imported ${imported.length} transaction(s) from CSV.`);
    } catch (err) {
        setFormMessage(`CSV Import Error: ${err.message}`, true);
    } finally {
        e.target.value = "";
    }
});

document.getElementById("seed-demo-btn").addEventListener("click", () => {
    const ym = todayStr().slice(0, 7);
    const sample = [
        { type: "income", amount: 3200, category: "Salary", date: `${ym}-01`, note: "Monthly paycheck" },
        { type: "income", amount: 450, category: "Freelance", date: `${ym}-10`, note: "Web dev project" },
        { type: "expense", amount: 950, category: "Housing", date: `${ym}-02`, note: "Monthly rent" },
        { type: "expense", amount: 142.50, category: "Food", date: `${ym}-05`, note: "Groceries" },
        { type: "expense", amount: 85.00, category: "Utilities", date: `${ym}-07`, note: "Electric & internet" },
        { type: "expense", amount: 64.20, category: "Transport", date: `${ym}-11`, note: "Fuel" },
        { type: "expense", amount: 110.00, category: "Insurance", date: `${ym}-12`, note: "Auto insurance" },
        { type: "expense", amount: 48.00, category: "Entertainment", date: `${ym}-14`, note: "Streaming & games" }
    ].map(createTransaction);

    appState.transactions = sample;
    saveAppState(appState);
    renderAll();
    setFormMessage("Sample transactions loaded.");
});

document.getElementById("clear-all-btn").addEventListener("click", () => {
    appState.transactions = [];
    saveAppState(appState);
    exitEditMode();
    renderAll();
    setFormMessage("All records cleared.");
});

document.getElementById("run-tests-btn").addEventListener("click", () => {
    const out = document.getElementById("test-output");
    const results = [];
    const check = (name, fn) => {
        try {
            fn();
            results.push(`PASS: ${name}`);
        } catch (e) {
            results.push(`FAIL: ${name} (${e.message})`);
        }
    };

    check("getCategories & isValidCategory", () => {
        if (!getCategories("income").includes("Salary")) throw new Error("Missing Salary");
        if (!isValidCategory("expense", "Food")) throw new Error("Food should be valid");
        if (isValidCategory("income", "Food")) throw new Error("Cross-type should fail");
    });

    check("createTransaction & leap-year validation", () => {
        const tx = createTransaction({ type: "expense", amount: "19.99", category: "Food", date: "2026-03-15" });
        if (tx.amount !== 19.99) throw new Error("Amount parse mismatch");
        let threw = false;
        try {
            createTransaction({ type: "expense", amount: 10, category: "Food", date: "2026-02-30" });
        } catch {
            threw = true;
        }
        if (!threw) throw new Error("Accepted invalid date 2026-02-30");
    });

    check("updateTransaction & deleteTransaction", () => {
        const tx = createTransaction({ id: "t1", type: "income", amount: 100, category: "Salary", date: "2026-03-01" });
        const up = updateTransaction(tx, { amount: 250 });
        if (up.amount !== 250 || up.id !== "t1") throw new Error("Update failed");
        const rem = deleteTransaction([up], "t1");
        if (rem.length !== 0) throw new Error("Delete failed");
    });

    check("RFC 4180 CSV round-trip with commas & quotes", () => {
        const sample = [createTransaction({ id: "csv1", type: "expense", amount: 42.5, category: "Food", date: "2026-03-10", note: 'Dinner, "Team 4"' })];
        const csv = transactionsToCSV(sample);
        const parsed = parseRFC4180CSV(csv);
        if (parsed.length !== 2 || parsed[1][5] !== 'Dinner, "Team 4"') throw new Error("CSV quote/comma mismatch");
    });

    out.innerHTML = results.map(r => `<div>${escapeHTML(r)}</div>`).join("");
});

// Initialize Application
populateCategoryOptions(typeEl.value, categoryEl);
populateFilterCategoryDropdown();
dateEl.value = todayStr();
document.getElementById("monthly-budget-input").value = appState.monthlyBudget;
renderAll();
