# Personal Finance Tracker — Group 4

A lightweight, privacy-first, client-side web application for tracking personal income, expenses, and monthly budget limits. Developed for the Software Project Management course (SE 480).

## Team 4 Members
* **Jack Hanks** (Project Lead) — Document/presentation format, project milestones, integration
* **Cullen Forrette** — Work Breakdown Structure (WBS)
* **Daniel Heule** — Network diagram & critical path analysis
* **Francois Joseph Gelin** — Task duration estimates
* **Baineme Dumwibe** — Project Management Life Cycle (PMLC)

## Core Conditions of Satisfaction
1. **100% Local Storage**: All financial and transaction records are stored strictly in the browser (`localStorage`) with schema versioning (`v1.0`). Zero external servers, APIs, or remote databases are accessed.
2. **RFC 4180 CSV Portability**: Full export to standard `.csv` files (compatible with Excel and Google Sheets) and backup restoration via an RFC 4180 state-machine CSV parser.
3. **Sub-30-Second Entry Speed**: Streamlined form workflow with automatic category population and one-click amount/date shortcuts.
4. **Visual Analytics & Budget Tracking**: Client-side HTML5 Canvas bar and donut charts, category summation tables, and configurable monthly budget alerts (80% warning threshold, 100% over-limit alert).

## Repository Structure
```text
├── README.md
└── transaction-workflows/
    ├── index.html                  # Main single-page application layout
    ├── css/
    │   └── transaction.css         # Minimalist flat dark-gray stylesheet (Pico.css overrides)
    └── js/
        ├── transaction-categories.js # Category definitions, validation, and dropdown helpers
        ├── transaction.js            # Core CRUD logic, validation, LocalStorage, and RFC 4180 CSV engine
        └── transaction-form.js       # UI controller, DOM bindings, Canvas charts, and test runner
```

## How to Run Locally
Because the application uses native ES6 Modules (`<script type="module">`), open the project using any local HTTP server (or deploy directly to GitHub Pages):

* **VS Code**: Right-click `transaction-workflows/index.html` and select **Open with Live Server**.
* **Python 3**:
  ```bash
  python3 -m http.server 8000
  ```
  Then open `http://localhost:8000/transaction-workflows/` in your browser.
* **GitHub Pages**: Push to your repository and enable GitHub Pages on the main branch.
