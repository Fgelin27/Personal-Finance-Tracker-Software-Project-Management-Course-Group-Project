// Categories that we will be used

export const categories = Object.freeze({
    income: Object.freeze([
        "Salary","Business","Instestment", "Freelance","Other Income"
    ]),
    expense: Object.freeze([
        "Food", "Transport", "Shopping", "Utilities", "Housing","Insurance", "Entertainment", "Healtcare", "Educations", "Personal Care", "Gift & Donations", "Other Expense"
    ])
})
// Populate the dropdonw bases on the types
export function populateCategoryOptions(transactionType, SelectElement) {
    //does type exits?
    if(!categories[transactionType]){
        throw new Error("Invalid transaction Type");

    }

    //remove display

    SelectElement.replaceChildren();


    //Create default option

    const defaultOption = document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent = "Select category";

    SelectElement.appendChild(defaultOption);
}