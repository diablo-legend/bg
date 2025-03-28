import {
  Chart,
  ArcElement,
  Legend,
  Tooltip,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js';
import html2canvas from 'html2canvas';
import { downloadProductCard } from './downloadHelper.js';

Chart.register(
  ArcElement,
  Legend,
  Tooltip,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale
);

const AUTH_TOKEN_KEY = 'auth_token';
const CORRECT_PASSWORD = 'demo123';

const BASE_ROLES = [
    { id: 'studio', name: 'Студия', percent: 0 },
    { id: 'smm', name: 'SMM-менеджер', percent: 0 },
    { id: 'developer', name: 'Разработчик', percent: 0 },
    { id: 'designer', name: 'Дизайнер', percent: 0 },
    { id: 'manager', name: 'Менеджер', percent: 0 }
];

let products = [];
let productCharts = new Map();
window.productCharts = productCharts;

function checkAuth() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        showAuthScreen();
        return false;
    }
    hideAuthScreen();
    return true;
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
}

function hideAuthScreen() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
}

function handleLogin(password) {
    if (password === CORRECT_PASSWORD) {
        localStorage.setItem(AUTH_TOKEN_KEY, 'dummy_token');
        hideAuthScreen();
        return true;
    }
    return false;
}

function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    showAuthScreen();
}

function initProductChart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || !product.roles) return;

    const ctx = document.getElementById(`chart-${productId}`).getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: product.roles.map(role => role.name),
            datasets: [{
                data: product.roles.map(role => role.percent),
                backgroundColor: [
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Процент распределения'
                    }
                }
            }
        }
    });
    productCharts.set(productId, chart);
    return chart;
}

function calculateFinalPrice(basePrice, discount, commission) {
    basePrice = Math.max(0, Number(basePrice) || 0);
    discount = Math.min(100, Math.max(0, Number(discount) || 0));
    commission = Math.min(100, Math.max(0, Number(commission) || 0));

    const totalDeduction = discount + commission;
    const finalPrice = basePrice * (1 - totalDeduction / 100);
    
    return Math.round(finalPrice * 100) / 100;
}

function updateDistribution(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const totalDeductions = product.discount + product.commission;
    const availablePercent = 100 - totalDeductions;

    const roleInputs = document.querySelectorAll(`[data-product="${productId}"][data-role]`);
    let totalAssignedPercent = 0;

    roleInputs.forEach(input => {
        const percent = parseFloat((Math.min(availablePercent, Math.max(0, Number(input.value) || 0))).toFixed(2));
        input.value = percent;
        totalAssignedPercent += percent;

        const roleId = input.dataset.role;
        const roleIndex = product.roles.findIndex(r => r.id === roleId);
        if (roleIndex !== -1) {
            product.roles[roleIndex].percent = percent;
        }
    });

    const remainingPercent = parseFloat((availablePercent - totalAssignedPercent).toFixed(2));

    const remainingText = document.getElementById(`remaining-${productId}`);
    if (remainingText) {
        if (totalAssignedPercent === 0) {
            remainingText.textContent = `Нераспределено: ${availablePercent.toFixed(2)}% из ${availablePercent.toFixed(2)}%`;
        } else {
            remainingText.textContent = `Нераспределено: ${remainingPercent.toFixed(2)}% из ${availablePercent.toFixed(2)}%`;
        }
        remainingText.style.color = remainingPercent < 0 ? 'red' : 'inherit';
    }

    const chart = productCharts.get(productId);
    if (chart) {
        chart.data.labels = product.roles.map(role => role.name);
        chart.data.datasets[0].data = product.roles.map(role => parseFloat(role.percent.toFixed(2)));
        chart.update();
    }

    updateProductAmounts(productId);
}

function updateProductAmounts(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const finalPrice = calculateFinalPrice(product.price, product.discount, product.commission);
    
    const finalPriceElement = document.getElementById(`final-price-${productId}`);
    if (finalPriceElement) {
        finalPriceElement.textContent = `${finalPrice.toFixed(2)} ₽`;
    }

    product.roles.forEach(role => {
        const amountElement = document.getElementById(`amount-${product.id}-${role.id}`);
        if (amountElement) {
            const amount = parseFloat(((finalPrice * role.percent) / 100).toFixed(2));
            amountElement.textContent = `${amount.toFixed(2)} ₽`;
        }
    });
}

function addRoleToProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const roleName = prompt('Введите название роли:');
    if (!roleName) return;

    const roleId = roleName.toLowerCase().replace(/\s+/g, '-');
    
    if (product.roles.some(r => r.id === roleId)) {
        alert('Роль с таким названием уже существует');
        return;
    }

    product.roles.push({
        id: roleId,
        name: roleName,
        percent: 0
    });

    renderProducts();
}

function deleteRoleFromProduct(productId, roleId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (BASE_ROLES.some(r => r.id === roleId)) {
        alert('Нельзя удалить базовую роль');
        return;
    }

    const roleIndex = product.roles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) return;

    product.roles.splice(roleIndex, 1);
    renderProducts();
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-card-id', product.id);
    
    const totalDeductions = product.discount + product.commission;
    const availablePercent = parseFloat((100 - totalDeductions).toFixed(2));
    
    let rolesHtml = '';
    product.roles.forEach(role => {
        const isBaseRole = BASE_ROLES.some(r => r.id === role.id);
        rolesHtml += `
            <div class="role-item">
                <label>${role.name}</label>
                <div class="role-input">
                    <input type="number" 
                           data-product="${product.id}" 
                           data-role="${role.id}" 
                           value="${role.percent}" 
                           min="0" 
                           max="${availablePercent}"
                           step="0.01">%
                    <span id="amount-${product.id}-${role.id}">0.00 ₽</span>
                    ${!isBaseRole ? `<button type="button" class="delete-role" onclick="deleteRoleFromProduct(${product.id}, '${role.id}')">×</button>` : ''}
                </div>
            </div>
        `;
    });

    const finalPrice = calculateFinalPrice(product.price, product.discount, product.commission);

    card.innerHTML = `
        <div class="card-header">
            <h3>${product.name}</h3>
            <div class="download-buttons">
                <button type="button" class="download-card" onclick="downloadProductCard(${product.id}, 'card')" title="Скачать карточку">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 16L7 11L8.4 9.55L11 12.15V4H13V12.15L15.6 9.55L17 11L12 16ZM4 20V15H6V18H18V15H20V20H4Z" fill="currentColor"/>
                    </svg>
                    <span>Карточка</span>
                </button>
                <button type="button" class="download-chart" onclick="downloadProductCard(${product.id}, 'chart')" title="Скачать график">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z" fill="currentColor"/>
                    </svg>
                    <span>График</span>
                </button>
            </div>
        </div>
        <div class="price-info">
            <p>Базовая цена (100%): <span>${product.price.toFixed(2)} ₽</span></p>
            ${product.discount ? `<p>Скидка (-${product.discount.toFixed(2)}%)</p>` : ''}
            ${product.commission ? `<p>Комиссия (-${product.commission.toFixed(2)}%)</p>` : ''}
            <p>Доступно для распределения: ${availablePercent.toFixed(2)}%</p>
            <p>Итоговая цена: <span id="final-price-${product.id}">${finalPrice.toFixed(2)} ₽</span></p>
        </div>
        <div class="distribution-info">
            <div class="roles-header">
                <p id="remaining-${product.id}" class="remaining-text">Нераспределено: ${availablePercent.toFixed(2)}% из ${availablePercent.toFixed(2)}%</p>
                <button type="button" class="add-role" onclick="addRoleToProduct(${product.id})">+ Добавить роль</button>
            </div>
            <div class="roles-list">
                ${rolesHtml}
            </div>
        </div>
        <div class="chart-wrapper">
            <canvas id="chart-${product.id}"></canvas>
        </div>
        <button class="delete-product" onclick="deleteProduct(${product.id})">Удалить</button>
    `;

    setTimeout(() => initProductChart(product.id), 0);
    return card;
}

function deleteProduct(productId) {
    const chart = productCharts.get(productId);
    if (chart) {
        chart.destroy();
        productCharts.delete(productId);
    }
    products = products.filter(p => p.id !== productId);
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('productCards');
    container.innerHTML = '';
    products.forEach(product => {
        container.appendChild(createProductCard(product));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const promoButtons = document.querySelectorAll('.promo-btn');
    const customDiscountInput = document.getElementById('customDiscount');
    const commissionButtons = document.querySelectorAll('.commission-btn');
    const customCommissionInput = document.getElementById('customCommission');

    promoButtons.forEach(button => {
        button.addEventListener('click', () => {
            promoButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            customDiscountInput.value = button.dataset.discount;
        });
    });

    commissionButtons.forEach(button => {
        button.addEventListener('click', () => {
            commissionButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            customCommissionInput.value = button.dataset.commission;
        });
    });

    customDiscountInput.addEventListener('input', (e) => {
        let value = Math.min(100, Math.max(0, Number(e.target.value) || 0));
        e.target.value = value;
        promoButtons.forEach(btn => btn.classList.remove('active'));
    });

    customCommissionInput.addEventListener('input', (e) => {
        let value = Math.min(100, Math.max(0, Number(e.target.value) || 0));
        e.target.value = value;
        commissionButtons.forEach(btn => btn.classList.remove('active'));
    });

    document.getElementById('authForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        if (handleLogin(password)) {
            document.getElementById('password').value = '';
        } else {
            alert('Неверный пароль');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    document.getElementById('productForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('productName').value;
        const price = Math.max(0, Number(document.getElementById('productPrice').value) || 0);
        const discount = Math.min(100, Math.max(0, Number(customDiscountInput.value) || 0));
        const commission = Math.min(100, Math.max(0, Number(customCommissionInput.value) || 0));
        
        const product = {
            id: Date.now(),
            name,
            price,
            discount,
            commission,
            roles: JSON.parse(JSON.stringify(BASE_ROLES))
        };
        
        products.push(product);
        renderProducts();
        
        e.target.reset();
        promoButtons.forEach(btn => btn.classList.remove('active'));
        commissionButtons.forEach(btn => btn.classList.remove('active'));
    });

    document.getElementById('productCards').addEventListener('change', (e) => {
        if (e.target.matches('[data-product][data-role]')) {
            const productId = parseInt(e.target.dataset.product);
            updateDistribution(productId);
        }
    });
});

window.deleteProduct = deleteProduct;
window.addRoleToProduct = addRoleToProduct;
window.deleteRoleFromProduct = deleteRoleFromProduct;
window.downloadProductCard = downloadProductCard;