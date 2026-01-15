// ==================== //
// Theme Management     //
// ==================== //

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Load saved theme or default to light
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// ==================== //
// Google Sheets Config //
// ==================== //

// IMPORTANT: Replace this with your actual Google Sheets Web App URL
// Instructions:
// 1. Create a Google Apps Script in your spreadsheet
// 2. Deploy it as a Web App
// 3. Replace the URL below with your deployment URL
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzRwfY4SH9vn-NUl-xLFvbQEvFk674Qf1AmV2r1tCaiBKAPFRZnTuqJ8LAA2NP9xmZiDw/exec';

// Expected spreadsheet columns (15 total):
// A: Logbook Number | B: Owner Name | C: Owner Phone | D: Owner Membership Number
// E: Vehicle Year | F: Vehicle Make & Model | G: Vehicle Rego | H: Vehicle Rego State
// I: Vehicle VIN | J: Vehicle Engine Number | K: Vehicle Engine Cylinders | L: Vehicle Engine Capacity
// M: Vehicle Turbo (Y/N) | N: Class | O: Vehicle Colour

// ==================== //
// Search Functionality //
// ==================== //

const searchForm = document.getElementById('searchForm');
const searchButton = document.getElementById('searchButton');
const loadingContainer = document.getElementById('loadingContainer');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');
const resultsCount = document.getElementById('resultsCount');
const emptyState = document.getElementById('emptyState');

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const logbookNumber = document.getElementById('logbookNumber').value.trim();
    const ownerName = document.getElementById('ownerName').value.trim();
    const regoNumber = document.getElementById('regoNumber').value.trim();

    // At least one field must be filled
    if (!logbookNumber && !ownerName && !regoNumber) {
        showNotification('Please enter at least one search term', 'warning');
        return;
    }

    // Show loading state
    showLoading();

    try {
        // Simulate API call - Replace with actual Google Sheets fetch
        const results = await searchVehicles({
            logbookNumber,
            ownerName,
            regoNumber
        });

        displayResults(results);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('An error occurred while searching. Please try again.', 'error');
        hideLoading();
    }
});

// ==================== //
// Google Sheets API    //
// ==================== //

async function searchVehicles(searchParams) {
    // Real Google Sheets API call
    const params = new URLSearchParams({
        logbookNumber: searchParams.logbookNumber || '',
        ownerName: searchParams.ownerName || '',
        regoNumber: searchParams.regoNumber || ''
    });

    const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`);
    if (!response.ok) {
        throw new Error('Failed to fetch data from Google Sheets');
    }

    const data = await response.json();
    return data.results || [];
}

// ==================== //
// Authentication       //
// ==================== //

let authToken = localStorage.getItem('authToken') || null;
let currentUsername = localStorage.getItem('username') || null;

// Check auth status on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});

const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const profileButton = document.getElementById('profileButton');

loginButton.addEventListener('click', () => {
    openLoginModal();
});

logoutButton.addEventListener('click', () => {
    logout();
});

profileButton.addEventListener('click', () => {
    openProfileModal();
});

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('active');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('active');
    document.getElementById('loginForm').reset();
}

function openProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('active');

    // Show admin section if user is admin
    if (currentUsername === 'admin') {
        document.getElementById('adminSection').style.display = 'block';
        loadUserList(); // Load the user list
    } else {
        document.getElementById('adminSection').style.display = 'none';
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('active');
    document.getElementById('changePasswordForm').reset();
    document.getElementById('addUserForm').reset();
}

// SHA-256 hash function
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // Hash the password
        const passwordHash = await sha256(password);

        // Send login request
        const params = new URLSearchParams({
            action: 'login',
            username: username,
            passwordHash: passwordHash
        });

        const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`);
        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUsername = data.username;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('username', currentUsername);
            updateAuthUI();
            closeLoginModal();
            showNotification('Login successful!', 'success');

            // Refresh results to show edit buttons
            if (resultsSection.classList.contains('active')) {
                const currentResults = Array.from(resultsGrid.children).map(card => {
                    return JSON.parse(card.dataset.vehicle);
                });
                displayResults(currentResults);
            }
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
});

function logout() {
    authToken = null;
    currentUsername = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    updateAuthUI();
    showNotification('Logged out successfully', 'info');

    // Refresh results to hide edit buttons
    if (resultsSection.classList.contains('active')) {
        const currentResults = Array.from(resultsGrid.children).map(card => {
            return JSON.parse(card.dataset.vehicle);
        });
        displayResults(currentResults);
    }
}

function updateAuthUI() {
    if (authToken) {
        loginButton.style.display = 'none';
        profileButton.style.display = 'flex';
        logoutButton.style.display = 'flex';
        document.getElementById('profileUsername').textContent = currentUsername || 'Profile';
    } else {
        loginButton.style.display = 'flex';
        profileButton.style.display = 'none';
        logoutButton.style.display = 'none';
    }
}

function isAuthenticated() {
    return authToken !== null;
}

// ==================== //
// Mock Data Generator  //
// ==================== //

function generateMockData(searchParams) {
    const allVehicles = [
        {
            logbookNumber: 'LB12345',
            ownerName: 'John Smith',
            ownerPhone: '0412 345 678',
            ownerMembershipNumber: 'M12345',
            year: '2020',
            makeModel: 'Toyota Camry',
            regoNumber: 'ABC123',
            regoState: 'VIC',
            vin: '1HGBH41JXMN109186',
            engineNumber: 'EN123456',
            engineCylinders: '4',
            engineCapacity: '2500',
            turbo: 'N',
            class: 'Sedan',
            colour: 'Silver'
        },
        {
            logbookNumber: 'LB67890',
            ownerName: 'Sarah Johnson',
            ownerPhone: '0423 456 789',
            ownerMembershipNumber: 'M67890',
            year: '2021',
            makeModel: 'Honda CR-V',
            regoNumber: 'XYZ789',
            regoState: 'NSW',
            vin: '2HGFC2F59MH123456',
            engineNumber: 'EN234567',
            engineCylinders: '4',
            engineCapacity: '1500',
            turbo: 'Y',
            class: 'SUV',
            colour: 'White'
        },
        {
            logbookNumber: 'LB24680',
            ownerName: 'Michael Brown',
            ownerPhone: '0434 567 890',
            ownerMembershipNumber: 'M24680',
            year: '2019',
            makeModel: 'Ford Ranger',
            regoNumber: 'DEF456',
            regoState: 'QLD',
            vin: '3FADP4EJ3KM123456',
            engineNumber: 'EN345678',
            engineCylinders: '6',
            engineCapacity: '3200',
            turbo: 'Y',
            class: 'Utility',
            colour: 'Blue'
        },
        {
            logbookNumber: 'LB13579',
            ownerName: 'Emma Wilson',
            ownerPhone: '0445 678 901',
            ownerMembershipNumber: 'M13579',
            year: '2022',
            makeModel: 'Mazda CX-5',
            regoNumber: 'GHI789',
            regoState: 'VIC',
            vin: '4S4BSANC5M3123456',
            engineNumber: 'EN456789',
            engineCylinders: '4',
            engineCapacity: '2000',
            turbo: 'N',
            class: 'SUV',
            colour: 'Red'
        },
        {
            logbookNumber: 'LB98765',
            ownerName: 'David Lee',
            ownerPhone: '0456 789 012',
            ownerMembershipNumber: 'M98765',
            year: '2023',
            makeModel: 'Tesla Model 3',
            regoNumber: 'JKL012',
            regoState: 'NSW',
            vin: '5YJ3E1EA3KF123456',
            engineNumber: 'N/A',
            engineCylinders: '0',
            engineCapacity: 'Electric',
            turbo: 'N',
            class: 'Sedan',
            colour: 'Black'
        }
    ];

    // Filter based on search parameters
    return allVehicles.filter(vehicle => {
        const matchesLogbook = !searchParams.logbookNumber ||
            vehicle.logbookNumber.toLowerCase().includes(searchParams.logbookNumber.toLowerCase());

        const matchesOwner = !searchParams.ownerName ||
            vehicle.ownerName.toLowerCase().includes(searchParams.ownerName.toLowerCase());

        const matchesRego = !searchParams.regoNumber ||
            vehicle.regoNumber.toLowerCase().includes(searchParams.regoNumber.toLowerCase());

        return matchesLogbook && matchesOwner && matchesRego;
    });
}

// ==================== //
// Display Functions    //
// ==================== //

function showLoading() {
    searchButton.classList.add('loading');
    loadingContainer.classList.add('active');
    resultsSection.classList.remove('active');
    emptyState.classList.remove('active');
}

function hideLoading() {
    searchButton.classList.remove('loading');
    loadingContainer.classList.remove('active');
}

function displayResults(results) {
    hideLoading();

    if (results.length === 0) {
        emptyState.classList.add('active');
        return;
    }

    resultsSection.classList.add('active');
    resultsCount.textContent = `${results.length} vehicle${results.length !== 1 ? 's' : ''} found`;

    resultsGrid.innerHTML = results.map((vehicle, index) => {
        const editButtonHTML = isAuthenticated() ? `
            <button class="edit-button" onclick="openEditModal(${index})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
            </button>
        ` : '';

        return `
        <div class="vehicle-card" style="animation-delay: ${index * 0.05}s" data-vehicle='${JSON.stringify(vehicle)}'>
            <div class="vehicle-header">
                <div class="vehicle-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"></path>
                        <polygon points="12 15 17 21 7 21 12 15"></polygon>
                    </svg>
                </div>
                <div class="vehicle-title">
                    <h4>${vehicle.makeModel}</h4>
                    <span class="logbook">${vehicle.logbookNumber}</span>
                </div>
            </div>
            
            <div class="vehicle-details">
                <div class="detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <div class="detail-content">
                        <div class="detail-label">Owner</div>
                        <div class="detail-value">${vehicle.ownerName}</div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                    <div class="detail-content">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${vehicle.ownerPhone}</div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 010 7.75"></path>
                    </svg>
                    <div class="detail-content">
                        <div class="detail-label">Membership</div>
                        <div class="detail-value">${vehicle.ownerMembershipNumber}</div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0110 0v4"></path>
                    </svg>
                    <div class="detail-content">
                        <div class="detail-label">Registration</div>
                        <div class="detail-value">${vehicle.regoNumber} (${vehicle.regoState})</div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <div class="detail-content">
                        <div class="detail-label">Year & Class</div>
                        <div class="detail-value">${vehicle.year} • ${vehicle.class}</div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    <div class="detail-content">
                        <div class="detail-label">VIN</div>
                        <div class="detail-value">${vehicle.vin}</div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                    <div class="detail-content">
                        <div class="detail-label">Engine</div>
                        <div class="detail-value">${vehicle.engineNumber} • ${vehicle.engineCylinders} cyl • ${vehicle.engineCapacity}cc${vehicle.turbo === 'Y' ? ' • Turbo' : ''}</div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path>
                    </svg>
                    <div class="detail-content">
                        <div class="detail-label">Colour</div>
                        <div class="detail-value">${vehicle.colour}</div>
                    </div>
                </div>
            </div>
            ${editButtonHTML}
        </div>
    `;
    }).join('');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== //
// Notification System  //
// ==================== //

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        font-weight: 500;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== //
// Edit Vehicle Modal   //
// ==================== //

function openEditModal(index) {
    const card = resultsGrid.children[index];
    const vehicle = JSON.parse(card.dataset.vehicle);

    // Populate form fields
    document.getElementById('editRowIndex').value = vehicle.rowIndex;
    document.getElementById('editLogbookNumber').value = vehicle.logbookNumber;
    document.getElementById('editOwnerName').value = vehicle.ownerName;
    document.getElementById('editOwnerPhone').value = vehicle.ownerPhone;
    document.getElementById('editOwnerMembership').value = vehicle.ownerMembershipNumber;
    document.getElementById('editYear').value = vehicle.year;
    document.getElementById('editMakeModel').value = vehicle.makeModel;
    document.getElementById('editRegoNumber').value = vehicle.regoNumber;
    document.getElementById('editRegoState').value = vehicle.regoState;
    document.getElementById('editVin').value = vehicle.vin;
    document.getElementById('editEngineNumber').value = vehicle.engineNumber;
    document.getElementById('editEngineCylinders').value = vehicle.engineCylinders;
    document.getElementById('editEngineCapacity').value = vehicle.engineCapacity;
    document.getElementById('editTurbo').value = vehicle.turbo;
    document.getElementById('editClass').value = vehicle.class;
    document.getElementById('editColour').value = vehicle.colour;

    // Show modal
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('editForm').reset();
}

// Edit form submission
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isAuthenticated()) {
        showNotification('You must be logged in to edit vehicles', 'error');
        return;
    }

    try {
        const formData = {
            action: 'update',
            token: authToken,
            rowIndex: document.getElementById('editRowIndex').value,
            logbookNumber: document.getElementById('editLogbookNumber').value,
            ownerName: document.getElementById('editOwnerName').value,
            ownerPhone: document.getElementById('editOwnerPhone').value,
            ownerMembershipNumber: document.getElementById('editOwnerMembership').value,
            year: document.getElementById('editYear').value,
            makeModel: document.getElementById('editMakeModel').value,
            regoNumber: document.getElementById('editRegoNumber').value,
            regoState: document.getElementById('editRegoState').value,
            vin: document.getElementById('editVin').value,
            engineNumber: document.getElementById('editEngineNumber').value,
            engineCylinders: document.getElementById('editEngineCylinders').value,
            engineCapacity: document.getElementById('editEngineCapacity').value,
            turbo: document.getElementById('editTurbo').value,
            class: document.getElementById('editClass').value,
            colour: document.getElementById('editColour').value
        };

        const params = new URLSearchParams(formData);
        const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`);
        const data = await response.json();

        if (data.success) {
            showNotification('Vehicle updated successfully!', 'success');
            closeEditModal();

            // Refresh search results
            const logbookNumber = document.getElementById('logbookNumber').value.trim();
            const ownerName = document.getElementById('ownerName').value.trim();
            const regoNumber = document.getElementById('regoNumber').value.trim();

            if (logbookNumber || ownerName || regoNumber) {
                showLoading();
                const results = await searchVehicles({ logbookNumber, ownerName, regoNumber });
                displayResults(results);
            }
        } else {
            showNotification(data.error || 'Failed to update vehicle', 'error');
        }
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Failed to update vehicle. Please try again.', 'error');
    }
});

// ==================== //
// Password Management  //
// ==================== //

// Change password form submission
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isAuthenticated()) {
        showNotification('You must be logged in to change password', 'error');
        return;
    }

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }

    // Validate password length
    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const currentPasswordHash = await sha256(currentPassword);
        const newPasswordHash = await sha256(newPassword);

        const params = new URLSearchParams({
            action: 'changePassword',
            token: authToken,
            currentPasswordHash: currentPasswordHash,
            newPasswordHash: newPasswordHash
        });

        const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`);
        const data = await response.json();

        if (data.success) {
            showNotification('Password changed successfully!', 'success');
            closeProfileModal();
        } else {
            showNotification(data.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Change password error:', error);
        showNotification('Failed to change password. Please try again.', 'error');
    }
});

// Add user form submission (admin only)
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isAuthenticated() || currentUsername !== 'admin') {
        showNotification('Only admin can add users', 'error');
        return;
    }

    const newUsername = document.getElementById('newUsername').value.trim();

    if (!newUsername) {
        showNotification('Please enter a username', 'error');
        return;
    }

    try {
        const params = new URLSearchParams({
            action: 'addUser',
            token: authToken,
            newUsername: newUsername
        });

        const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`);
        const data = await response.json();

        if (data.success) {
            showNotification(`User "${newUsername}" added! Default password: ${data.defaultPassword}`, 'success');
            document.getElementById('addUserForm').reset();
            loadUserList(); // Reload the user list
        } else {
            showNotification(data.error || 'Failed to add user', 'error');
        }
    } catch (error) {
        console.error('Add user error:', error);
        showNotification('Failed to add user. Please try again.', 'error');
    }
});

// Load user list (admin only)
async function loadUserList() {
    if (!isAuthenticated() || currentUsername !== 'admin') {
        return;
    }

    try {
        const params = new URLSearchParams({
            action: 'listUsers',
            token: authToken
        });

        const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`);
        const data = await response.json();

        if (data.success) {
            displayUserList(data.users);
        } else {
            showNotification(data.error || 'Failed to load users', 'error');
        }
    } catch (error) {
        console.error('Load users error:', error);
        showNotification('Failed to load users. Please try again.', 'error');
    }
}

// Display user list
function displayUserList(users) {
    const userListDiv = document.getElementById('userList');

    if (!users || users.length === 0) {
        userListDiv.innerHTML = '<p style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-md);">No users found</p>';
        return;
    }

    userListDiv.innerHTML = users.map(user => {
        const createdDate = new Date(user.createdAt).toLocaleDateString();
        const isAdmin = user.username === 'admin';
        const deleteButton = !isAdmin ? `
            <button onclick="deleteUser('${user.username}')" style="
                background: var(--color-error);
                color: white;
                border: none;
                border-radius: var(--radius-sm);
                padding: 4px 12px;
                font-size: 0.75rem;
                cursor: pointer;
                transition: opacity 0.2s;
            " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                Delete
            </button>
        ` : '<span style="font-size: 0.75rem; color: var(--color-text-secondary);">Protected</span>';

        return `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-sm);
                border-bottom: 1px solid var(--color-border);
                gap: var(--spacing-md);
            ">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--color-text-primary);">${user.username}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary);">
                        Created: ${createdDate}${user.createdBy ? ` by ${user.createdBy}` : ''}
                    </div>
                </div>
                ${deleteButton}
            </div>
        `;
    }).join('');
}

// Delete user
async function deleteUser(username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const params = new URLSearchParams({
            action: 'deleteUser',
            token: authToken,
            usernameToDelete: username
        });

        const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`);
        const data = await response.json();

        if (data.success) {
            showNotification(`User "${username}" deleted successfully`, 'success');
            loadUserList(); // Reload the list
        } else {
            showNotification(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification('Failed to delete user. Please try again.', 'error');
    }
}

// ==================== //
// Google Sheets Setup  //
// ==================== //

/*
To connect this app to your Google Sheets:

1. Open your Google Spreadsheet
2. Go to Extensions > Apps Script
3. Replace the code with the following:

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const logbookNumber = e.parameter.logbookNumber || '';
  const ownerName = e.parameter.ownerName || '';
  const regoNumber = e.parameter.regoNumber || '';
  
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const vehicle = {
      logbookNumber: row[0],
      ownerName: row[1],
      make: row[2],
      model: row[3],
      year: row[4],
      class: row[5],
      regoNumber: row[6]
    };
    
    const matchesLogbook = !logbookNumber || 
      vehicle.logbookNumber.toLowerCase().includes(logbookNumber.toLowerCase());
    const matchesOwner = !ownerName || 
      vehicle.ownerName.toLowerCase().includes(ownerName.toLowerCase());
    const matchesRego = !regoNumber || 
      vehicle.regoNumber.toLowerCase().includes(regoNumber.toLowerCase());
    
    if (matchesLogbook && matchesOwner && matchesRego) {
      results.push(vehicle);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ results: results }))
    .setMimeType(ContentService.MimeType.JSON);
}

4. Deploy > New deployment
5. Type: Web app
6. Execute as: Me
7. Who has access: Anyone
8. Copy the deployment URL
9. Paste it in the GOOGLE_SHEETS_URL constant at the top of this file
10. Update the searchVehicles function to use the real API call (uncomment the code)
*/
