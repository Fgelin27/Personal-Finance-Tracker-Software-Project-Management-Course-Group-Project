import { isValidCategory } from "./transaction-categories.js";

function validateTransaction(transaction) {

    const { type, amount, category, date} = transaction;

    if (type !== "income" && type != "expense") {
        throw new Error("Transaction type must be income or expense");
    }
    
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Transaction amount must be greater than zero.");
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error("A valid transaction date is required.");
    }

    const parsedDate =new Date(`${date}T00:00:00Z`);

    if(Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !==date)
        throw new Error("Invalid transaction date.");
    
}

//create new transaction

export function createTransaction(transactionData){
    validateTransaction(transactionData);

    return{
        type: transactionData.type,
        amount: Number(transactionData.amount),
        category: transactionData.category,
        date: transactionData.date
    };
}

//update existion transaction

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
        amount: Number(updatedTransaction.amount)
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