import { isValidCategory } from "./transaction-categories.js";

export const STORAGE_KEY = "pft_group4_state_v1";
export const SCHEMA_VERSION = "1.0";

// Validate transaction fields
export function validateTransaction(transaction) {
    if (!transaction || typeof transaction !== "object") {
        throw new Error("Transaction data is required.");
    }

    const { type, amount, category, date } = transaction;

    if (type !== "income" && type !== "expense") {
        throw new Error("Transaction type must be income or expense.");
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Transaction amount must be greater than zero.");
    }

    if (!category || !isValidCategory(type, category)) {
        throw new Error("A valid category for the selected type is required.");
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error("A valid transaction date is required.");
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
        throw new Error("Invalid transaction date.");
    }
}

// Create new transaction
export function createTransaction(transactionData) {
    validateTransaction(transactionData);

    const id = transactionData.id || (
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    );

    return {
        id: String(id),
        type: transactionData.type,
        amount: Math.round(Number(transactionData.amount) * 100) / 100,
        category: transactionData.category,
        date: transactionData.date,
        note: transactionData.note ? String(transactionData.note).trim() : ""
    };
}

// Update existing transaction
export function updateTransaction(existingTransaction, updatedData) {
    if (!existingTransaction || !existingTransaction.id) {
        throw new Error("A valid existing transaction is required.");
    }

    const updatedTransaction = {
        ...existingTransaction,
        ...updatedData
    };

    validateTransaction(updatedTransaction);

    return {
        ...updatedTransaction,
        id: existingTransaction.id,
        amount: Math.round(Number(updatedTransaction.amount) * 100) / 100,
        note: updatedTransaction.note ? String(updatedTransaction.note).trim() : ""
    };
}

// Delete transaction
export function deleteTransaction(transactions, transactionId) {
    if (!Array.isArray(transactions)) {
        throw new Error("Transactions must be provided as an array.");
    }
    return transactions.filter(
        transaction => transaction.id !== transactionId
    );
}

// Load state from LocalStorage
export function loadAppState() {
    const fallback = {
        version: SCHEMA_VERSION,
        monthlyBudget: 2000,
        transactions: []
    };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return {
            version: SCHEMA_VERSION,
            monthlyBudget: Number.isFinite(Number(parsed.monthlyBudget)) ? Number(parsed.monthlyBudget) : 2000,
            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
        };
    } catch {
        return fallback;
    }
}

// Save state to LocalStorage
export function saveAppState(state) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            version: SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            monthlyBudget: state.monthlyBudget,
            transactions: state.transactions
        })
    );
}

// RFC 4180 CSV field serializer
export function escapeCSVField(val) {
    const str = val === null || val === undefined ? "" : String(val);
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// Convert transaction array to RFC 4180 CSV text
export function transactionsToCSV(transactions) {
    const headers = ["id", "type", "amount", "category", "date", "note"];
    const rows = [headers.join(",")];
    for (const tx of transactions) {
        rows.push([
            escapeCSVField(tx.id),
            escapeCSVField(tx.type),
            escapeCSVField(Number(tx.amount).toFixed(2)),
            escapeCSVField(tx.category),
            escapeCSVField(tx.date),
            escapeCSVField(tx.note || "")
        ].join(","));
    }
    return rows.join("\r\n");
}

// RFC 4180 compliant state-machine CSV parser
export function parseRFC4180CSV(csvText) {
    const text = csvText.replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                field += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ",") {
                row.push(field);
                field = "";
            } else if (ch === "\r" && next === "\n") {
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
                i++;
            } else if (ch === "\n" || ch === "\r") {
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
            } else {
                field += ch;
            }
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(r => r.some(c => c.trim() !== ""));
}
