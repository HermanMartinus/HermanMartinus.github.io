// Constants
const BIN_ID = "67f7c29f8561e97a50fcafea";
const API_KEY = localStorage.getItem('apiKey') || prompt('Please enter your API key:');
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const API_READ_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;

// State management
let expenses = [];
let refreshing = false;
let loading = false;
let currentDeleteId = null;

// DOM Elements
const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const personSelect = document.getElementById('person');
const addExpenseBtn = document.getElementById('add-expense-btn');
const refreshBtn = document.getElementById('refresh-btn');
const payUpBtn = document.getElementById('pay-up-btn');
const allExpensesTab = document.getElementById('all-expenses');
const hermanExpensesTab = document.getElementById('Herman-expenses');
const emmaExpensesTab = document.getElementById('Emma-expenses');
const deleteDialog = document.getElementById('delete-dialog');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const payUpDialog = document.getElementById('pay-up-dialog');
const confirmPayUpBtn = document.getElementById('confirm-pay-up-btn');
const cancelPayUpBtn = document.getElementById('cancel-pay-up-btn');
const hermanTotalElement = document.getElementById('herman-total');
const emmaTotalElement = document.getElementById('emma-total');
const grandTotalElement = document.getElementById('grand-total');
const tabTriggers = document.querySelectorAll('.tab-trigger');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Check for API key in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const apiKeyParam = urlParams.get('apiKey');
  
  if (apiKeyParam) {
    // Save API key to localStorage
    localStorage.setItem('apiKey', apiKeyParam);
    // Remove the parameter from URL to avoid sharing the key accidentally
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);
    // Reload the page to use the new API key
    window.location.reload();
    return;
  }

  if (!API_KEY) {
    localStorage.setItem('apiKey', API_KEY);
  }
  
  // Load saved person preference
  const savedPerson = localStorage.getItem('selectedPerson');
  if (savedPerson === 'Herman' || savedPerson === 'Emma') {
    personSelect.value = savedPerson;
  }

  // Set up event listeners
  addExpenseBtn.addEventListener('click', handleAddExpense);
  refreshBtn.addEventListener('click', fetchExpenses);
  confirmDeleteBtn.addEventListener('click', handleDelete);
  cancelDeleteBtn.addEventListener('click', () => toggleDialog(deleteDialog, false));
  payUpBtn.addEventListener('click', () => toggleDialog(payUpDialog, true));
  confirmPayUpBtn.addEventListener('click', handlePayUp);
  cancelPayUpBtn.addEventListener('click', () => toggleDialog(payUpDialog, false));
  personSelect.addEventListener('change', (e) => {
    localStorage.setItem('selectedPerson', e.target.value);
  });

  // Set up tab switching
  tabTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const tabName = trigger.getAttribute('data-tab');
      
      // Update active tab trigger
      tabTriggers.forEach(t => t.classList.remove('active'));
      trigger.classList.add('active');
      
      // Update active tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-expenses`) {
          content.classList.add('active');
        }
      });
    });
  });

  // Initial data fetch
  fetchExpenses();
});

// Helper Functions
function validateExpenseData(data) {
  if (!Array.isArray(data)) return [];
  
  return data
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      id: item.id?.toString() || Date.now().toString(),
      name: item.name?.toString() || 'Unnamed Expense',
      amount: typeof item.amount === 'number' ? item.amount : 
              !isNaN(Number(item.amount)) ? Number(item.amount) : 0,
      person: item.person === 'Herman' || item.person === 'Emma' ? item.person : 'Herman',
      date: item.date?.toString() || new Date().toISOString()
    }));
}

function formatAmount(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'R0';
  }
  return `R${Number(amount).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  } catch (e) {
    return 'Unknown date';
  }
}

function getAmount(expense) {
  if (expense && expense.amount !== undefined && expense.amount !== null && !isNaN(Number(expense.amount))) {
    return Number(expense.amount);
  }
  return 0;
}

function toggleDialog(dialog, isOpen) {
  if (isOpen) {
    dialog.classList.add('open');
  } else {
    dialog.classList.remove('open');
  }
}

function showToast(title, message, isError = false) {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  
  toast.innerHTML = `
    <div class="toast-header">
      <span class="toast-title">${title}</span>
      <button class="toast-close">&times;</button>
    </div>
    <div class="toast-message">${message}</div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Add event listener to close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.add('removing');
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 300);
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toastContainer.contains(toast)) {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }
  }, 5000);
}

// API Functions
async function fetchExpenses() {
  try {
    refreshing = true;
    refreshBtn.querySelector('svg').classList.add('animate-spin');
    
    const response = await fetch(API_READ_URL, {
      method: 'GET',
      headers: {
        'X-Master-Key': API_KEY,
        'X-Access-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('API Error:', response.status, await response.text());
      
      if (response.status === 404) {
        expenses = [];
        updateUI();
        return;
      }
      throw new Error(`Failed to fetch expenses: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched data:', data);
    
    let expensesData = [];
    
    if (data && data.record) {
      if (Array.isArray(data.record)) {
        expensesData = data.record;
      } else if (typeof data.record === 'object') {
        expensesData = Object.values(data.record);
      }
    }
    
    expenses = validateExpenseData(expensesData);
    updateUI();
  } catch (error) {
    console.error('Error fetching expenses:', error);
    showToast('Error', 'Failed to load expenses. Starting with empty list.', true);
    expenses = [];
    updateUI();
  } finally {
    refreshing = false;
    refreshBtn.querySelector('svg').classList.remove('animate-spin');
  }
}

async function saveExpenses(updatedExpenses) {
  try {
    const validatedExpenses = validateExpenseData(updatedExpenses);
    
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY,
        'X-Access-Key': API_KEY
      },
      body: JSON.stringify(validatedExpenses)
    });
    
    if (!response.ok) {
      console.error('API Error:', response.status, await response.text());
      throw new Error(`Failed to save expenses: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving expenses:', error);
    showToast('Error', 'Failed to save expense. Please try again.', true);
    return false;
  }
}

async function initializeEmptyBin() {
  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY,
        'X-Access-Key': API_KEY
      },
      body: JSON.stringify([])
    });
    
    if (!response.ok) {
      console.error('Failed to initialize bin:', response.status);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing bin:', error);
    return false;
  }
}

// Event Handlers
async function handleAddExpense() {
  const name = nameInput.value.trim();
  const amount = amountInput.value.trim();
  const person = personSelect.value;
  
  if (!name || !amount) {
    showToast('Missing information', 'Please provide both a name and amount for the expense.', true);
    return;
  }
  
  const amountNum = Number.parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    showToast('Invalid amount', 'Please enter a valid positive number for the amount.', true);
    return;
  }
  
  loading = true;
  addExpenseBtn.disabled = true;
  addExpenseBtn.textContent = 'Adding...';
  
  const newExpense = {
    id: Date.now().toString(),
    name,
    amount: amountNum,
    person,
    date: new Date().toISOString()
  };
  
  const updatedExpenses = [...expenses, newExpense];
  const success = await saveExpenses(updatedExpenses);
  
  if (success) {
    expenses = updatedExpenses;
    nameInput.value = '';
    amountInput.value = '';
    showToast('Success', 'Expense added successfully!');
    updateUI();
  }
  
  loading = false;
  addExpenseBtn.disabled = false;
  addExpenseBtn.innerHTML = 'Add Expense <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>';
}

async function handleDelete() {
  if (!currentDeleteId) return;
  
  const updatedExpenses = expenses.filter(expense => expense.id !== currentDeleteId);
  const success = await saveExpenses(updatedExpenses);
  
  if (success) {
    expenses = updatedExpenses;
    showToast('Success', 'Expense deleted successfully!');
    updateUI();
  }
  
  toggleDialog(deleteDialog, false);
  currentDeleteId = null;
}

async function handlePayUp() {
  // Calculate totals for each person
  const hermanTotal = expenses
    .filter(expense => expense && expense.person === 'Herman')
    .reduce((sum, expense) => sum + getAmount(expense), 0);
  
  const emmaTotal = expenses
    .filter(expense => expense && expense.person === 'Emma')
    .reduce((sum, expense) => sum + getAmount(expense), 0);
  
  const now = new Date().toISOString();
  const timestamp = Date.now();
  
  // Create new balancing entries
  const newExpenses = [];
  
  if (hermanTotal > 0) {
    newExpenses.push({
      id: `${timestamp}-herman`,
      name: 'Pay up',
      amount: -hermanTotal,
      person: 'Herman',
      date: now
    });
  }
  
  if (emmaTotal > 0) {
    newExpenses.push({
      id: `${timestamp}-emma`,
      name: 'Pay up',
      amount: -emmaTotal,
      person: 'Emma',
      date: now
    });
  }
  
  if (newExpenses.length === 0) {
    showToast('No action needed', 'There are no expenses to pay up.');
    toggleDialog(payUpDialog, false);
    return;
  }
  
  // Add the new balancing entries to the existing expenses
  const updatedExpenses = [...expenses, ...newExpenses];
  const success = await saveExpenses(updatedExpenses);
  
  if (success) {
    expenses = updatedExpenses;
    showToast('Success', 'Pay up entries have been added. Accounts are now balanced.');
    updateUI();
  }
  
  toggleDialog(payUpDialog, false);
}

// UI Update Functions
function updateUI() {
  updateSummary();
  updateExpenseLists();
}

function updateSummary() {
  // Calculate totals
  const hermanTotal = expenses
    .filter(expense => expense && expense.person === 'Herman')
    .reduce((sum, expense) => sum + getAmount(expense), 0);
  
  const emmaTotal = expenses
    .filter(expense => expense && expense.person === 'Emma')
    .reduce((sum, expense) => sum + getAmount(expense), 0);
  
  const grandTotal = hermanTotal + emmaTotal;
  
  // Update UI elements
  hermanTotalElement.textContent = formatAmount(hermanTotal);
  emmaTotalElement.textContent = formatAmount(emmaTotal);
  grandTotalElement.textContent = formatAmount(grandTotal);
  
  // Show/hide pay up button
  if (hermanTotal > 0 || emmaTotal > 0) {
    payUpBtn.style.display = 'block';
  } else {
    payUpBtn.style.display = 'none';
  }
}

function updateExpenseLists() {
  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    return dateB - dateA;
  });
  
  // Filter expenses by person
  const hermanExpenses = sortedExpenses.filter(e => e && e.person === 'Herman');
  const emmaExpenses = sortedExpenses.filter(e => e && e.person === 'Emma');
  
  // Update the expense lists
  updateExpenseList(allExpensesTab, sortedExpenses);
  updateExpenseList(hermanExpensesTab, hermanExpenses);
  updateExpenseList(emmaExpensesTab, emmaExpenses);
}

function updateExpenseList(container, expensesList) {
    // Clear the container
    container.innerHTML = '';
    
    // Check if there are any expenses
    if (expensesList.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'No expenses found.';
      container.appendChild(emptyMessage);
      return;
    }
    
    // Create expense items
    expensesList.forEach(expense => {
      const expenseItem = document.createElement('div');
      expenseItem.className = 'expense-item';
      
      const isNegative = Number(expense.amount) < 0;
      const amountClass = isNegative ? 'expense-amount negative' : 'expense-amount';
      
      expenseItem.innerHTML = `
        <div class="expense-item-content">
          <div class="expense-details">
            <h3>${expense.name || 'Unnamed Expense'}</h3>
            <p>Paid by ${expense.person || 'Unknown'} on ${formatDate(expense.date || '')}</p>
          </div>
          <div class="expense-actions">
            <span class="${amountClass}">${formatAmount(expense.amount)}</span>
            <button class="btn btn-icon delete-expense" data-id="${expense.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>
      `;
      
      container.appendChild(expenseItem);
      
      // Add event listener to delete button
      const deleteBtn = expenseItem.querySelector('.delete-expense');
      deleteBtn.addEventListener('click', () => {
        confirmDelete(expense.id);
      });
    });
  }
  
  function confirmDelete(id) {
    currentDeleteId = id;
    toggleDialog(deleteDialog, true);
  }
  
  // Initialize the app when the DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // Check if we need to initialize the bin
    fetchExpenses().catch(() => {
      // If fetching fails, try to initialize an empty bin
      initializeEmptyBin().then(success => {
        if (success) {
          expenses = [];
          updateUI();
        }
      });
    });
  }