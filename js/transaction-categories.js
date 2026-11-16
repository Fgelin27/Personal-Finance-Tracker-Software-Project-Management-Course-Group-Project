// Categories used by the Personal Finance Tracker
export const categories = Object.freeze({
    income: Object.freeze([
        "Salary",
        "Business",
        "Investment",
        "Freelance",
        "Other Income"
    ]),
    expense: Object.freeze([
        "Food",
        "Transport",
        "Shopping",
        "Utilities",
        "Housing",
        "Insurance",
        "Entertainment",
        "Healthcare",
        "Education",
        "Personal Care",
        "Gifts & Donations",
        "Other Expense"
    ])
});

// Return categories based on transaction type
export function getCategories(transactionType) {
    if (!Object.hasOwn(categories, transactionType)) {
        throw new Error("Invalid transaction type.");
    }
    return categories[transactionType];
}

// Check category against transactionType
export function isValidCategory(transactionType, category) {
    if (!Object.hasOwn(categories, transactionType)) {
        return false;
    }
    return categories[transactionType].includes(category);
}

// Populate category dropdown
export function populateCategoryOptions(transactionType, selectElement) {
    if (!Object.hasOwn(categories, transactionType)) {
        throw new Error("Invalid transaction type.");
    }
    if (!selectElement || typeof selectElement.replaceChildren !== "function") {
        throw new Error("A valid select element is required.");
    }

    // Clear existing options
    selectElement.replaceChildren();

    // Create default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select category";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectElement.appendChild(defaultOption);

    // Add categories to the dropdown
    categories[transactionType].forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        selectElement.appendChild(option);
    });
}
