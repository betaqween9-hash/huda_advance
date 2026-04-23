// ===== تطبيق الهدى ادفانس - JavaScript =====



// ===== المتغيرات العامة =====

let cartItems = [];

let favorites = [];

let currentScreen = 'splash';

// Navigation Stack - بسيط لتتبع تاريخ التنقل
let navigationStack = [];

let isLoggedIn = false;

let currentProduct = null;



// ===== تهيئة التطبيق =====

/**
 * ================================================================
 * نظام الـ Viewport الديناميكي
 * ================================================================
 * يحل المشاكل التالية:
 * 1. مشكلة 100vh في المتصفحات المحمولة (Chrome/Safari يخفيان شريط العنوان)
 * 2. اختلاف الارتفاع بين المتصفح العادي وتطبيقات مثل Instagram
 * 3. safe-area-inset-bottom في أجهزة iPhone X والأحدث
 *
 * المتغيرات التي يضبطها:
 * - --real-vh      : ارتفاع 1vh حقيقي (يُستخدم بدلاً من 100vh)
 * - --bottom-nav-height : الارتفاع الفعلي لشريط التنقل السفلي
 * ================================================================
 */
function setupViewportSystem() {
    const root = document.documentElement;
    const bottomNav = document.querySelector('.bottom-nav');

    function updateViewportVars() {
        // 1. حساب الـ viewport الحقيقي (يتجاهل شريط العنوان المنزلق)
        const realVH = window.innerHeight * 0.01;
        root.style.setProperty('--real-vh', `${realVH}px`);

        // 2. حساب الارتفاع الفعلي لشريط التنقل السفلي
        if (bottomNav) {
            const navHeight = bottomNav.getBoundingClientRect().height;
            if (navHeight > 0) {
                root.style.setProperty('--bottom-nav-height', `${navHeight}px`);
            }
        }
    }

    // تشغيل عند التحميل
    updateViewportVars();

    // تشغيل عند تغيير حجم النافذة
    window.addEventListener('resize', updateViewportVars, { passive: true });

    // تشغيل عند التدوير (مهم للجوال)
    window.addEventListener('orientationchange', () => {
        // تأخير بسيط للسماح للمتصفح بالانتهاء من التدوير
        setTimeout(updateViewportVars, 200);
    }, { passive: true });

    // دعم Visual Viewport API (متوفر في Chrome/Safari الحديث)
    // يُحدِّث الارتفاع عند ظهور/إخفاء لوحة المفاتيح
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateViewportVars, { passive: true });
    }
}

document.addEventListener('DOMContentLoaded', function() {

    // يجب تشغيله أولاً قبل أي شيء آخر
    setupViewportSystem();

    initializeApp();

});



function initializeApp() {

    // تطبيق الإعدادات المحفوظة

    applySavedSettings();

    // إظهار شاشة البداية لمدة 3 ثواني

    setTimeout(() => {

        const savedUser = localStorage.getItem('huda-user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user.rememberMe) {
                isLoggedIn = true;
            }
        }

        // مسح stack والدخول للرئيسية للزوار والمسجلين
        clearNavigationStack();
        showScreen('home');

    }, 3000);

    

    // إضافة مستمعي الأحداث

    setupEventListeners();

    

    // تحميل البيانات المحفوظة

    loadSavedData();

}

function applySavedSettings() {
    // تطبيق إعدادات اللغة
    const savedLanguage = localStorage.getItem('huda-language') || 'ar';
    applyLanguage(savedLanguage);
    
    // تحديث قائمة اختيار اللغة
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = savedLanguage;
    }

    // تطبيق إعدادات المظهر
    const savedTheme = localStorage.getItem('huda-theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // تطبيق إعدادات حجم الخط
    const savedFontSize = localStorage.getItem('huda-font-size') || 'medium';
    document.body.classList.add('font-' + savedFontSize);
}



// ===== نظام التنقل البسيط (SPA) =====

/**
 * إظهار صفحة معينة وإخفاء الباقي
 * @param {string} screenId - معرف الصفحة المراد إظهارها
 * @param {boolean} addToStack - هل يجب إضافة الصفحة الحالية إلى stack؟ (افتراضي: true)
 */
function showScreen(screenId, addToStack = true) {
    if (screenId === 'checkout') {
        // منع الزوار من الدخول لصفحة إتمام الطلب
        const savedUser = localStorage.getItem('huda-user');
        if (!savedUser) {
            showToast('يجب تسجيل الدخول أولاً');
            showScreen('auth'); // اختيارياً يمكن توجيههم لصفحة التسجيل
            return;
        }

        // التحقق من أن السلة ليست فارغة
        if (cartItems.length === 0) {
            showToast('السلة فارغة، لا يمكن إتمام الطلب');
            return;
        }
    }

    // 1. إخفاء جميع الصفحات
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));

    // 2. إضافة الصفحة الحالية إلى stack فقط إذا كانت مختلفة وليست الشاشة الافتتاحية
    if (addToStack &&
        currentScreen !== '' &&
        currentScreen !== screenId &&
        currentScreen !== 'splash') {
        navigationStack.push(currentScreen);
    }

    // 3. إظهار الصفحة المطلوبة
    const targetScreen = document.getElementById(`${screenId}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;

        // 4. تحديث التنقل السفلي
        updateBottomNav(screenId);

        // 5. تنفيذ إجراءات خاصة بكل صفحة
        handleScreenSpecificActions(screenId);
    }
}



function updateBottomNav(screenId) {

    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {

        item.classList.remove('active');

        if (item.dataset.screen === screenId) {

            item.classList.add('active');

        }

    });

}



function handleScreenSpecificActions(screenId) {

    switch(screenId) {

        case 'home':

            loadHomeData();

            updateFavoriteButtons();

            break;

        case 'cart':

            updateCartDisplay();

            break;

        case 'profile':

            loadProfileData();

            break;

        case 'orders':

            loadOrdersData();

            break;

        case 'edit-profile':

            loadEditProfileData();

            break;

        case 'saved-addresses':

            loadSavedAddresses();

            break;

        case 'favorites':

            loadFavorites();

            break;

        case 'products':

            updateFavoriteButtons();

            break;

        case 'checkout':

            loadCheckoutData();

            break;

        case 'settings':

            loadSettings();

            break;

    }

}



// ===== إعداد مستمعي الأحداث =====

function setupEventListeners() {

    // التنقل السفلي
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const screenId = this.dataset.screen;

            // مسح stack عند التنقل المباشر
            clearNavigationStack();

            if (screenId === 'categories') {
                showCategories();
            } else {
                showScreen(screenId);
            }
        });
    });

    // أزرار إضافة للسلة

    const addToCartButtons = document.querySelectorAll('.add-to-cart');

    addToCartButtons.forEach(button => {

        button.addEventListener('click', function(e) {

            e.stopPropagation();

            addToCart(this);

        });

    });

    // زر إضافة للسلة من صفحة تفاصيل المنتج

    const addToCartFromDetailsBtn = document.querySelector('.btn-add-to-cart');

    if (addToCartFromDetailsBtn) {

        addToCartFromDetailsBtn.addEventListener('click', function() {

            addToCartFromDetails();

        });

    }

    // أزرار المفضلة

    const favoriteButtons = document.querySelectorAll('.favorite');

    favoriteButtons.forEach(button => {

        button.addEventListener('click', function(e) {

            e.stopPropagation();

            toggleFavorite(this);

        });

    });
    
    
    // أزرار الكمية

    const quantityButtons = document.querySelectorAll('.quantity-btn');

    quantityButtons.forEach(button => {

        button.addEventListener('click', function() {

            updateQuantity(this);

        });

    });
    
    
    // نموذج تسجيل الدخول

    const loginForm = document.getElementById('login-form');

    if (loginForm) {

        loginForm.addEventListener('submit', function(e) {

            e.preventDefault();

            handleLogin();

        });

    }

    

    // نموذج إنشاء حساب

    const registerForm = document.getElementById('register-form');

    if (registerForm) {

        registerForm.addEventListener('submit', function(e) {

            e.preventDefault();

            handleRegister();

        });

    }

    

    // نموذج إتمام الطلب

    const checkoutForm = document.querySelector('.checkout-form');

    if (checkoutForm) {

        checkoutForm.addEventListener('submit', function(e) {

            e.preventDefault();

            handleCheckout();

        });

    }

    

    // أزرار حذف من السلة

    const removeButtons = document.querySelectorAll('.remove-item');

    removeButtons.forEach(button => {

        button.addEventListener('click', function() {

            removeFromCart(this);

        });

    });

    

    // بطاقات الأقسام

    const categoryCards = document.querySelectorAll('.category-card');

    categoryCards.forEach(card => {

        card.addEventListener('click', function() {

            const categoryName = this.querySelector('span').textContent;

            showProducts(categoryName);

        });

    });
    
    // نموذج تعديل البيانات
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleEditProfile);
    }
    
    // نموذج العناوين
    const addressForm = document.getElementById('address-form');
    if (addressForm) {
        addressForm.addEventListener('submit', handleAddressForm);
    }

}

// ===== شاشة المصادقة =====

function switchAuthTab(tab) {

    const loginTab = document.getElementById('login-tab');

    const registerTab = document.getElementById('register-tab');

    const loginForm = document.getElementById('login-form');

    const registerForm = document.getElementById('register-form');

    const authTitle = document.getElementById('auth-title');

    const authSubtitle = document.getElementById('auth-subtitle');

    

    if (tab === 'login') {

        loginTab.classList.add('active');

        registerTab.classList.remove('active');

        loginForm.classList.add('active');

        registerForm.classList.remove('active');

        authTitle.textContent = 'مرحباً بك في الهدى ادفانس';

        authSubtitle.textContent = 'سجل دخولك للمتابعة';

    } else {

        registerTab.classList.add('active');

        loginTab.classList.remove('active');

        registerForm.classList.add('active');

        loginForm.classList.remove('active');

        authTitle.textContent = 'إنشاء حساب جديد';

        authSubtitle.textContent = 'انضم إلينا واستمتع بالعروض';

    }

}



function handleLogin() {

    const emailInput = document.getElementById('login-email');

    const passwordInput = document.getElementById('login-password');

    const rememberMe = document.getElementById('remember-me');

    

    if (!emailInput.value || !passwordInput.value) {

        showToast('يرجى إدخال جميع الحقول');

        return;

    }

    

    // التحقق من المستخدمين المسجلين

    const users = JSON.parse(localStorage.getItem('huda-users') || '[]');

    const user = users.find(u => u.email === emailInput.value && u.password === passwordInput.value);

    

    if (user) {

        isLoggedIn = true;

        const userData = {

            ...user,

            rememberMe: rememberMe.checked

        };

        localStorage.setItem('huda-user', JSON.stringify(userData));

        showToast('تم تسجيل الدخول بنجاح');

        // مسح stack عند تسجيل الدخول
        clearNavigationStack();

        showScreen('home');

    } else {

        showToast('البريد الإلكتروني أو كلمة المرور غير صحيحة');

    }

}



function handleRegister() {

    const nameInput = document.getElementById('register-name');

    const emailInput = document.getElementById('register-email');

    const locationInput = document.getElementById('register-location');

    const passwordInput = document.getElementById('register-password');

    const confirmPasswordInput = document.getElementById('register-confirm-password');

    

    if (!nameInput.value || !emailInput.value || !locationInput.value || !passwordInput.value || !confirmPasswordInput.value) {

        showToast('يرجى إكمال جميع الحقول');

        return;

    }

    

    if (passwordInput.value !== confirmPasswordInput.value) {

        showToast('كلمة المرور وتأكيدها غير متطابقين');

        return;

    }

    

    if (passwordInput.value.length < 6) {

        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

        return;

    }

    

    // التحقق من وجود المستخدم مسبقاً
    const users = JSON.parse(localStorage.getItem('huda-users') || '[]');
    const inputEmail = emailInput.value.trim().toLowerCase();
    const existingUser = users.find(u => u.email.trim().toLowerCase() === inputEmail);
    
    if (existingUser) {
        showToast('هذا البريد الإلكتروني مسجل بالفعل');
        return;
    }

    // إنشاء مستخدم جديد

    const newUser = {

        id: Date.now(),

        name: nameInput.value,

        email: emailInput.value,

        location: locationInput.value,

        password: passwordInput.value,

        createdAt: new Date().toISOString()

    };

    

    users.push(newUser);

    localStorage.setItem('huda-users', JSON.stringify(users));

    

    showToast('تم إنشاء الحساب بنجاح');

    

    // الانتقال لتسجيل الدخول

    setTimeout(() => {

        switchAuthTab('login');

        // مسح الحقول

        nameInput.value = '';

        emailInput.value = '';

        locationInput.value = '';

        passwordInput.value = '';

        confirmPasswordInput.value = '';

    }, 1500);

}



// ===== الصفحة الرئيسية =====

function loadHomeData() {

    // تحميل العروض والمنتجات

    updateCartCount();

    animateElements();

}



function animateElements() {

    // إضافة حركات بسيطة للعناصر

    const elements = document.querySelectorAll('.category-card, .product-card, .offer-card');

    elements.forEach((element, index) => {

        element.style.opacity = '0';

        element.style.transform = 'translateY(20px)';

        

        setTimeout(() => {

            element.style.transition = 'all 0.5s ease';

            element.style.opacity = '1';

            element.style.transform = 'translateY(0)';

        }, index * 100);

    });

}



// ===== إدارة السلة =====

function addToCart(button) {

    // منع النقرات المتعددة

    if (button.disabled) return;
    
    
    // تعطيل الزر مؤقتاً

    button.disabled = true;
    
    
    const productCard = button.closest('.product-card, .offer-card');

    const productName = productCard.querySelector('h4').textContent;

    const productPrice = productCard.querySelector('.new-price, .price').textContent;
    
    
    // التحقق من وجود المنتج مسبقاً في السلة

    const existingProduct = cartItems.find(item => item.name === productName);
    
    
    if (existingProduct) {

        // زيادة الكمية إذا المنتج موجود مسبقاً

        existingProduct.quantity += 1;

        showToast('تم زيادة الكمية');

    } else {

        // إضافة منتج جديد إذا لم يكن موجوداً

        const product = {

            id: Date.now(),

            name: productName,

            price: productPrice,

            quantity: 1,

            image: productCard.querySelector('img').src

        };

        
        cartItems.push(product);

        showToast('تمت الإضافة إلى السلة');

    }
    
    
    updateCartCount();

    saveCartData();
    
    
    // تغيير شكل الزر

    button.innerHTML = '<i class="fas fa-check"></i>';

    button.style.background = '#4CAF50';
    
    
    setTimeout(() => {

        button.innerHTML = '<i class="fas fa-plus"></i>';

        button.style.background = '';

        button.disabled = false;

    }, 1500);

}


let isAddingToCart = false;

function addToCartFromDetails() {
    // منع النقرات المتعددة
    if (isAddingToCart) {
        return;
    }
    isAddingToCart = true;

    // التحقق من وجود المنتج الحالي

    if (!currentProduct) {

        showToast('يرجى اختيار منتج أولاً');

        isAddingToCart = false;

        return;

    }

    // الكمية ثابتة = 1
    const quantity = 1;

    // التحقق من وجود المنتج مسبقاً في السلة

    const existingProduct = cartItems.find(item => item.name === currentProduct.name);


    if (existingProduct) {

        // زيادة الكمية إذا المنتج موجود مسبقاً

        existingProduct.quantity += quantity;

        showToast('تم زيادة الكمية');

    } else {

        // إضافة منتج جديد إذا لم يكن موجوداً

        const product = {

            id: Date.now(),

            name: currentProduct.name,

            price: currentProduct.price,

            quantity: quantity,

            image: currentProduct.image

        };


        cartItems.push(product);

        showToast('تمت الإضافة إلى السلة بنجاح');

    }


    updateCartCount();

    saveCartData();

    // تغيير نص الزر مؤقتاً

    const addToCartBtn = document.querySelector('.btn-add-to-cart');

    if (addToCartBtn) {

        addToCartBtn.textContent = 'تمت الإضافة ✓';

        addToCartBtn.style.background = '#4CAF50';

        addToCartBtn.disabled = true;


        setTimeout(() => {

            addToCartBtn.textContent = 'إضافة إلى السلة';

            addToCartBtn.style.background = '';

            addToCartBtn.disabled = false;

            isAddingToCart = false;

        }, 1500);

    } else {

        isAddingToCart = false;

    }

}


function removeFromCart(button) {

    const cartItem = button.closest('.cart-item');

    const productName = cartItem.querySelector('h4').textContent;

    

    // إضافة تأثير الحذف أولاً

    cartItem.style.transform = 'translateX(100%)';

    cartItem.style.opacity = '0';

    

    setTimeout(() => {

        // حذف المنتج من المصفوفة

        cartItems = cartItems.filter(item => item.name !== productName);

        

        // تحديث الواجهة

        updateCartDisplay();

        updateCartCount();

        saveCartData();

        showToast('تم الحذف من السلة');

        

        // إزالة العنصر من DOM

        cartItem.remove();

    }, 300);

}


function updateCartCount() {

    const countElements = document.querySelectorAll('#cart-count, #cart-count-products');

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    

    countElements.forEach(element => {

        element.textContent = totalItems;

        if (totalItems > 0) {

            element.style.display = 'flex';

        } else {

            element.style.display = 'none';

        }

    });

}



function updateCartDisplay() {

    const cartContainer = document.querySelector('.cart-items');

    if (!cartContainer) return;

    

    if (cartItems.length === 0) {

        cartContainer.innerHTML = `

            <div class="empty-state">

                <i class="fas fa-shopping-bag"></i>

                <h3>السلة فارغة</h3>

                <p>أضف بعض المنتجات لبدء التسوق</p>

            </div>

        `;

        updateCartSummary(); // تحديث الملخص حتى لو السلة فارغة

        return;

    }

    

    cartContainer.innerHTML = cartItems.map(item => `

        <div class="cart-item" data-name="${item.name}">

            <img src="${item.image}" alt="${item.name}">

            <div class="item-info">

                <h4>${item.name}</h4>

                <span class="price">${item.price}</span>

            </div>

            <div class="quantity-controls">

                <button class="quantity-btn minus" onclick="updateQuantity(this)">-</button>

                <span class="quantity">${item.quantity}</span>

                <button class="quantity-btn plus" onclick="updateQuantity(this)">+</button>

            </div>

            <button class="remove-item" onclick="removeFromCart(this)">

                <i class="fas fa-trash"></i>

            </button>

        </div>

    `).join('');

    

    updateCartSummary();

}



function updateCartSummary() {

    const summaryContainer = document.querySelector('.cart-summary');

    if (!summaryContainer) return;

    

    const subtotal = cartItems.reduce((sum, item) => {

        const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));

        return sum + (price * item.quantity);

    }, 0);

    

    const shipping = cartItems.length > 0 ? 10 : 0; // رسوم التوصيل فقط إذا كانت السلة ليست فارغة

    const total = subtotal + shipping;

    

    summaryContainer.innerHTML = `

        <div class="summary-item">

            <span>مجموع الطلب:</span>

            <span>${subtotal.toFixed(2)} ريال</span>

        </div>

        <div class="summary-item">

            <span>رسوم التوصيل:</span>

            <span>${shipping} ريال</span>

        </div>

        <div class="summary-total">

            <span>الإجمالي النهائي:</span>

            <span>${total.toFixed(2)} ريال</span>

        </div>

        <button class="btn-checkout" onclick="showScreen('checkout')" ${cartItems.length === 0 ? 'disabled' : ''}>إتمام الطلب</button>

    `;

}



function updateQuantity(button) {

    const isPlus = button.classList.contains('plus');

    const quantitySpan = button.parentElement.querySelector('.quantity');

    let quantity = parseInt(quantitySpan.textContent);

    

    if (isPlus) {

        quantity++;

    } else if (quantity > 1) {

        quantity--;

    }

    

    quantitySpan.textContent = quantity;

    

    // تحديث كمية المنتج في السلة

    const cartItem = button.closest('.cart-item');

    const productName = cartItem.querySelector('h4').textContent;

    const product = cartItems.find(item => item.name === productName);

    if (product) {

        product.quantity = quantity;

        updateCartSummary();

        saveCartData();

        updateCartCount(); // إضافة تحديث العداد

    }

}



// ===== المفضلة =====

function toggleFavorite(button) {

    button.classList.toggle('active');

    const icon = button.querySelector('i');

    

    if (button.classList.contains('active')) {

        icon.classList.remove('far');

        icon.classList.add('fas');

        showToast('تمت الإضافة للمفضلة');

    } else {

        icon.classList.remove('fas');

        icon.classList.add('far');

        showToast('تم الحذف من المفضلة');

    }

}



// ===== عرض المنتجات =====

function showCategories() {

    // يمكن إضافة شاشة خاصة للأقسام

    showToast('قريباً - جميع الأقسام');

}



function showProducts(categoryName) {

    // تحديث عنوان الصفحة

    const navBack = document.querySelector('#products-screen .nav-back span');

    if (navBack) {

        navBack.textContent = categoryName;

    }

    

    // تحميل المنتجات الخاصة بالقسم

    loadProductsByCategory(categoryName);

    showScreen('products');

}



function loadProductsByCategory(category) {

    const productsContainer = document.querySelector('#products-screen .products-grid');

    if (!productsContainer) return;

    

    // منتجات وهمية حسب القسم

    const products = getProductsByCategory(category);

    

    productsContainer.innerHTML = products.map(product => `

        <div class="product-card" onclick="showProductDetails('${product.id}')">

            <img src="${product.image}" alt="${product.name}">

            <div class="product-info">

                <h4>${product.name}</h4>

                <span class="weight">${product.weight}</span>

                <div class="price-container">

                    ${product.oldPrice ? `<span class="old-price">${product.oldPrice}</span>` : ''}

                    <span class="new-price">${product.price}</span>

                </div>

                <div class="product-actions">

                    <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(this)">

                        <i class="fas fa-plus"></i>

                    </button>

                    <button class="btn-favorite" onclick="event.stopPropagation(); toggleFavorite('${product.id}')">

                        <i class="fas fa-heart"></i>

                    </button>

                </div>

            </div>

        </div>

    `).join('');

}



function getProductsByCategory(category) {

    const productsData = {

        'خضروات': [

            { id: 1, name: 'طماطم حمراء', weight: '1 كجم', price: '15 ريال', oldPrice: '20 ريال', image: 'https://images.unsplash.com/photo-1546470417-e8b1c7b5b4c?w=200&h=200&fit=crop' },

            { id: 2, name: 'خيار طازج', weight: '1 كجم', price: '12 ريال', image: 'https://images.unsplash.com/photo-1581375321227-88a529c23e84?w=200&h=200&fit=crop' },

            { id: 3, name: 'بصل أصفر', weight: '1 كجم', price: '8 ريال', image: 'https://images.unsplash.com/photo-1526318896980-604673dc6142?w=200&h=200&fit=crop' },

        ],

        'فواكه': [

            { id: 4, name: 'تفاح أحمر', weight: '1 كجم', price: '18 ريال', oldPrice: '25 ريال', image: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=200&h=200&fit=crop' },

            { id: 5, name: 'برتقال طازج', weight: '1 كجم', price: '14 ريال', image: 'https://images.unsplash.com/photo-1547514381-58d1314b78ff?w=200&h=200&fit=crop' },

            { id: 6, name: 'موز أصفر', weight: '1 كجم', price: '16 ريال', image: 'https://images.unsplash.com/photo-1543215768-76e8362c2e84?w=200&h=200&fit=crop' },

        ],

        'ألبان': [

            { id: 7, name: 'حليب طازج', weight: '1 لتر', price: '12 ريال', image: 'https://images.unsplash.com/photo-1550583745-1cc9d5b2273a?w=200&h=200&fit=crop' },

            { id: 8, name: 'خبز أسمر', weight: '500 جرام', price: '8 ريال', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop' },

            { id: 9, name: 'زبادي بالفواكه', weight: '500 جرام', price: '8 ريال', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop' },

            { id: 10, name: 'جبنة بيضاء', weight: '500 جرام', price: '15 ريال', image: 'https://images.unsplash.com/photo-1486477370455-8ac9bee6f58d?w=200&h=200&fit=crop' },

        ],

        'لحوم': [

            { id: 11, name: 'دجاج طازج', weight: '1 كجم', price: '25 ريال', image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=200&h=200&fit=crop' },

            { id: 12, name: 'لحم بقري', weight: '500 جرام', price: '35 ريال', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&h=200&fit=crop' },

        ],

        'مشروبات': [

            { id: 13, name: 'عصير برتقال', weight: '1 لتر', price: '10 ريال', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200&h=200&fit=crop' },

            { id: 14, name: 'مياه معدنية', weight: '500 مل', price: '2 ريال', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200&h=200&fit=crop' },

        ],

        'منظفات': [

            { id: 15, name: 'صابون غسيل', weight: '1 كجم', price: '15 ريال', image: 'https://images.unsplash.com/photo-1585493958687-5b277bd083b3?w=200&h=200&fit=crop' },

            { id: 16, name: 'منعم ملابس', weight: '1 لتر', price: '12 ريال', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&h=200&fit=crop' },

        ],

        'معلبات': [

            { id: 17, name: 'علبة تونة', weight: '150 جرام', price: '8 ريال', image: 'https://images.unsplash.com/photo-1535606503921-1a61b6749218?w=200&h=200&fit=crop' },

            { id: 18, name: 'علبة فاصوليا', weight: '400 جرام', price: '6 ريال', image: 'https://images.unsplash.com/photo-1511690656952-34342d2c8f0b?w=200&h=200&fit=crop' },

        ],

        'حلويات': [

            { id: 19, name: 'شوكولاتة', weight: '100 جرام', price: '10 ريال', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&h=200&fit=crop' },

            { id: 20, name: 'بسكويت', weight: '200 جرام', price: '5 ريال', image: 'https://images.unsplash.com/photo-1499636136450-39c9cb2d11ff?w=200&h=200&fit=crop' },

        ]

    };

    

    return productsData[category] || [

        { id: 21, name: 'منتج عام', weight: '1 وحدة', price: '10 ريال', image: 'https://via.placeholder.com/200x200' }

    ];

}



function showProductDetails(productId) {
    // البحث عن بيانات المنتج وتخزينها
    let product = null;
    const categories = ['خضروات', 'فواكه', 'ألبان', 'لحوم', 'مشروبات', 'منظفات', 'معلبات', 'حلويات'];
    
    for (const category of categories) {
        const products = getProductsByCategory(category);
        product = products.find(p => p.id == productId);
        if (product) break;
    }
    
    if (product) {
        currentProduct = product;
        // تحميل تفاصيل المنتج
        loadProductDetails(product);
        showScreen('product-details');
        
        // إظهار رسالة تأكيد باسم المنتج
        setTimeout(() => {
            showToast(`تم فتح تفاصيل: ${product.name}`);
        }, 500);
    }
}



// ===== إتمام الطلب =====

function loadCheckoutData() {
    const savedUser = localStorage.getItem('huda-user');
    if (!savedUser) {
        showToast('يجب تسجيل الدخول أولاً');
        showScreen('auth');
        return;
    }
    
    const user = JSON.parse(savedUser);
    
    document.getElementById('checkout-user-name').textContent = user.name || 'غير متوفر';
    document.getElementById('checkout-user-phone').textContent = user.phone || 'غير متوفر';
    
    const addressesList = document.getElementById('checkout-addresses-list');
    const addresses = user.addresses || [];
    
    document.getElementById('checkout-selected-address').value = '';
    
    if (addresses.length === 0) {
        addressesList.innerHTML = `<div style="text-align:center; padding:10px; color:#888; border: 1px dashed #ccc; border-radius: 8px;">لا توجد عناوين محفوظة، يرجى إضافة عنوان</div>`;
    } else {
        addressesList.innerHTML = addresses.map((address, index) => {
            const displayDesc = address.description || address.details || address.name || 'بدون وصف';
            return `
            <label class="payment-option" style="justify-content: flex-start; gap: 10px; text-align: right; padding: 12px; margin-bottom: 0;">
                <input type="radio" name="checkout_address" value="${address.id}" onchange="document.getElementById('checkout-selected-address').value = this.value" ${index === 0 ? 'checked' : ''}>
                <span style="flex:1;">
                    <i class="fas fa-map-marker-alt" style="color:var(--accent-yellow); margin-left: 5px;"></i> 
                    ${displayDesc}
                </span>
            </label>
            `;
        }).join('');
        
        if (addresses.length > 0) {
            document.getElementById('checkout-selected-address').value = addresses[0].id;
        }
    }
}

function handleCheckout() {
    if (cartItems.length === 0) {
        // إذا كانت السلة فارغة وتم استدعاء الدالة (بالأغلب ضغط مزدوج على الزر التلقائي للتأكيد) نتجاهل العملية بدون إشعار
        return;
    }

    const selectedAddressId = document.getElementById('checkout-selected-address').value;
    const paymentMethod = document.querySelector('#checkout-screen input[name="payment"]:checked');
    
    if (!selectedAddressId) {
        showToast('يرجى اختيار عنوان التوصيل أو إضافة عنوان جديد');
        return;
    }
    if (!paymentMethod) {
        showToast('يرجى اختيار طريقة الدفع');
        return;
    }

    const savedUser = localStorage.getItem('huda-user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    const selectedAddress = user ? (user.addresses || []).find(a => a.id === selectedAddressId) : null;
    
    const displayAddress = selectedAddress 
        ? (selectedAddress.description || selectedAddress.details || selectedAddress.name) 
        : 'عنوان غير معروف';

    const existingOrders = getSavedOrders();
    const nextOrderNumber = existingOrders.length + 1;
    
    const order = {
        id: Date.now(),
        number: `#${nextOrderNumber}`,
        date: new Date().toLocaleDateString('ar-SA'),
        items: cartItems,
        total: calculateTotal(),
        status: 'pending',
        customerInfo: {
            name: user ? user.name : 'غير متوفر',
            phone: user ? user.phone : 'غير متوفر',
            address: displayAddress,
            paymentMethod: paymentMethod.value,
            coordinates: selectedAddress && selectedAddress.lat && selectedAddress.lng ? {lat: selectedAddress.lat, lng: selectedAddress.lng} : null
        }
    };
    
    saveOrder(order);
    
    cartItems = [];
    updateCartCount();
    saveCartData();
    
    showToast('تم تأكيد طلبك بنجاح!');
    
    setTimeout(() => {
        showScreen('orders');
    }, 2000);
}



function calculateTotal() {

    const subtotal = cartItems.reduce((sum, item) => {

        const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));

        return sum + (price * item.quantity);

    }, 0);

    return subtotal + 10; // إضافة رسوم التوصيل

}



// ===== الطلبات =====

function loadOrdersData() {

    const ordersContainer = document.querySelector('.orders-container');

    const orders = getSavedOrders();
    
    // فلترة الطلبات لإزالة الطلبات الفارغة (التي لا تحتوي على منتجات)
    const validOrders = orders.filter(order => order.items && order.items.length > 0);
    
    // ترتيب الطلبات من الأحدث إلى الأقدم حسب المعرف
    const sortedOrders = validOrders.sort((a, b) => b.id - a.id);
    
    if (sortedOrders.length === 0) {

        ordersContainer.innerHTML = `

            <div class="empty-state">

                <i class="fas fa-receipt"></i>

                <h3>لا توجد طلبات</h3>

                <p>قم بعمل أول طلب الآن</p>

            </div>

        `;

        return;

    }

    

    ordersContainer.innerHTML = sortedOrders.map(order => `

        <div class="order-card">

            <div class="order-header">

                <div class="order-info">

                    <span class="order-number">${order.number}</span>

                    <span class="order-date">${order.date}</span>

                </div>

                <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>

            </div>

            <div class="order-items">

                <span>${order.items.length} منتجات</span>

            </div>

            <div class="order-total">

                <span>المبلغ: ${order.total} ريال</span>

            </div>

            <button class="btn-view-details" onclick="viewOrderDetails('${order.id}')">عرض التفاصيل</button>

        </div>

    `).join('');

}



function getStatusClass(status) {

    const statusClasses = {

        'pending': 'delivering',

        'delivering': 'delivering',

        'completed': 'completed',

        'cancelled': 'cancelled'

    };

    return statusClasses[status] || 'pending';

}



function getStatusText(status) {

    const statusTexts = {

        'pending': 'قيد المراجعة',

        'delivering': 'قيد التوصيل',

        'completed': 'مكتمل',

        'cancelled': 'ملغي'

    };

    return statusTexts[status] || 'قيد المراجعة';

}



function viewOrderDetails(orderId) {

    showToast('تفاصيل الطلب - قريباً');

}



// ===== الملف الشخصي =====

function loadProfileData() {
    const savedUser = localStorage.getItem('huda-user');
    const profileInfo = document.querySelector('.profile-info');
    const menuItems = document.querySelectorAll('.profile-menu .menu-item');
    
    if (!savedUser) {
        if (profileInfo) {
            profileInfo.querySelector('h3').textContent = 'زائر';
            profileInfo.querySelector('span').textContent = 'سجل ياصديقي للاستفادة الكاملة';
        }
        
        menuItems.forEach(item => {
            const text = item.querySelector('span').textContent;
            if (text.includes('تعديل البيانات') || text.includes('العناوين المحفوظة') || text.includes('تسجيل الخروج')) {
                item.style.display = 'none';
            }
        });

        // زر إنشاء حساب / تسجيل دخول الزائر
        let loginBtn = document.querySelector('.guest-login-btn');
        if (!loginBtn) {
            loginBtn = document.createElement('div');
            loginBtn.className = 'menu-item guest-login-btn';
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span data-i18n="login">تسجيل الدخول / إنشاء حساب</span>';
            loginBtn.onclick = () => showScreen('auth');
            document.querySelector('.profile-menu').prepend(loginBtn);
        }
        loginBtn.style.display = 'flex';
        
    } else {
        const user = JSON.parse(savedUser);
        if (profileInfo) {
            profileInfo.querySelector('h3').textContent = user.name;
            profileInfo.querySelector('span').textContent = user.email;
        }
        
        menuItems.forEach(item => {
            item.style.display = 'flex';
        });

        const loginBtn = document.querySelector('.guest-login-btn');
        if (loginBtn) loginBtn.style.display = 'none';
    }
}



function logout() {

    // حذف بيانات المستخدم الحالية

    localStorage.removeItem('huda-user');

    isLoggedIn = false;

    

    // إخفاء زر تسجيل الخروج
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.style.display = 'none';
    }

    // مسح stack عند تسجيل الخروج
    clearNavigationStack();

    showToast('تم تسجيل الخروج');

    showScreen('auth');

}



// ===== تعديل البيانات =====

function showEditProfile() {
    showScreen('edit-profile');
}

function loadEditProfileData() {
    const savedUser = localStorage.getItem('huda-user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        const nameInput = document.getElementById('edit-name');
        const emailInput = document.getElementById('edit-email');
        const phoneInput = document.getElementById('edit-phone');
        const locationInput = document.getElementById('edit-location');
        
        if (nameInput) nameInput.value = user.name || '';
        if (emailInput) emailInput.value = user.email || '';
        if (phoneInput) phoneInput.value = user.phone || '';
        if (locationInput) locationInput.value = user.location || '';
    }
}

function handleEditProfile(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('edit-name');
    const emailInput = document.getElementById('edit-email');
    const phoneInput = document.getElementById('edit-phone');
    const locationInput = document.getElementById('edit-location');
    
    if (!nameInput.value || !emailInput.value || !phoneInput.value || !locationInput.value) {
        showToast('يرجى إكمال جميع الحقول');
        return;
    }
    
    // تحديث بيانات المستخدم في localStorage
    const savedUser = localStorage.getItem('huda-user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        user.name = nameInput.value;
        user.email = emailInput.value;
        user.phone = phoneInput.value;
        user.location = locationInput.value;
        
        localStorage.setItem('huda-user', JSON.stringify(user));
        
        // تحديث بيانات المستخدم في قائمة المستخدمين
        const users = JSON.parse(localStorage.getItem('huda-users') || '[]');
        const userIndex = users.findIndex(u => u.email === user.email);
        if (userIndex !== -1) {
            users[userIndex] = user;
            localStorage.setItem('huda-users', JSON.stringify(users));
        }
        
        showToast('تم تحديث البيانات بنجاح');
        
        // تحديث عرض الملف الشخصي
        loadProfileData();
        
        setTimeout(() => {
            showScreen('profile');
        }, 1500);
    }
}

// ===== العناوين المحفوظة =====

function showSavedAddresses() {
    showScreen('saved-addresses');
}

function loadSavedAddresses() {
    const addressesList = document.getElementById('addresses-list');
    if (!addressesList) return;
    
    const savedUser = localStorage.getItem('huda-user');
    if (!savedUser) {
        addressesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marker-alt"></i>
                <h3>يجب تسجيل الدخول أولاً</h3>
                <p>قم بتسجيل الدخول لحفظ العناوين</p>
            </div>
        `;
        return;
    }
    
    const user = JSON.parse(savedUser);
    const addresses = user.addresses || [];
    
    if (addresses.length === 0) {
        addressesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marker-alt"></i>
                <h3>لا توجد عناوين محفوظة</h3>
                <p>قم بإضافة عنوان جديد</p>
            </div>
        `;
        return;
    }
    
    addressesList.innerHTML = addresses.map(address => {
        // دعم الهيكل القديم والجديد للعنوان
        const displayDesc = address.description || address.details || address.name || 'بدون وصف';
        const hasMap = address.lat && address.lng;
        
        return `
        <div class="address-card">
            <div class="address-header">
                <div class="address-name">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${displayDesc}</span>
                </div>
                <div class="address-actions">
                    <button class="btn-edit-address" onclick="editAddress('${address.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete-address" onclick="deleteAddress('${address.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${hasMap ? `
            <div class="address-details" style="margin-top: 10px;">
                <a href="https://www.google.com/maps?q=${address.lat},${address.lng}" target="_blank" style="color: #4A90E2; text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 5px;">
                    <i class="fas fa-external-link-alt"></i> عرض على خرائط جوجل
                </a>
            </div>
            ` : ''}
        </div>
        `;
    }).join('');
}

function showAddAddressForm() {
    document.getElementById('address-form-title').textContent = 'إضافة عنوان جديد';
    document.getElementById('address-id').value = '';
    document.getElementById('address-description').value = '';
    document.getElementById('address-lat').value = '';
    document.getElementById('address-lng').value = '';
    showScreen('add-address');
    
    // تهيئة الخريطة عند فتح الشاشة
    setTimeout(() => {
        initMap();
    }, 300);
}

function editAddress(addressId) {
    const savedUser = localStorage.getItem('huda-user');
    if (!savedUser) return;
    
    const user = JSON.parse(savedUser);
    const addresses = user.addresses || [];
    const address = addresses.find(a => a.id === addressId);
    
    if (!address) return;
    
    document.getElementById('address-form-title').textContent = 'تعديل العنوان';
    document.getElementById('address-id').value = address.id;
    document.getElementById('address-description').value = address.description || address.details || '';
    document.getElementById('address-lat').value = address.lat || '';
    document.getElementById('address-lng').value = address.lng || '';
    
    showScreen('add-address');
    
    setTimeout(() => {
        initMap(address.lat, address.lng);
    }, 300);
}

function deleteAddress(addressId) {
    if (!confirm('هل أنت متأكد من حذف هذا العنوان؟')) return;
    
    const savedUser = localStorage.getItem('huda-user');
    if (!savedUser) return;
    
    const user = JSON.parse(savedUser);
    user.addresses = user.addresses || [];
    user.addresses = user.addresses.filter(a => a.id !== addressId);
    
    localStorage.setItem('huda-user', JSON.stringify(user));
    
    // تحديث بيانات المستخدم في قائمة المستخدمين
    const users = JSON.parse(localStorage.getItem('huda-users') || '[]');
    const userIndex = users.findIndex(u => u.email === user.email);
    if (userIndex !== -1) {
        users[userIndex] = user;
        localStorage.setItem('huda-users', JSON.stringify(users));
    }
    
    showToast('تم حذف العنوان بنجاح');
    loadSavedAddresses();
}

function handleAddressForm(e) {
    e.preventDefault();
    
    const addressId = document.getElementById('address-id').value;
    const descriptionInput = document.getElementById('address-description');
    const latInput = document.getElementById('address-lat');
    const lngInput = document.getElementById('address-lng');
    
    if (!descriptionInput.value) {
        showToast('يرجى إدخال وصف الموقع');
        return;
    }
    
    if (!latInput.value || !lngInput.value) {
        showToast('يرجى تحديد موقعك على الخريطة أولاً');
        return;
    }
    
    const savedUser = localStorage.getItem('huda-user');
    if (!savedUser) {
        showToast('يجب تسجيل الدخول أولاً');
        return;
    }
    
    const user = JSON.parse(savedUser);
    user.addresses = user.addresses || [];
    
    const addressData = {
        id: addressId || Date.now().toString(),
        description: descriptionInput.value,
        lat: latInput.value,
        lng: lngInput.value
    };
    
    if (addressId) {
        // تعديل عنوان موجود
        const index = user.addresses.findIndex(a => a.id === addressId);
        if (index !== -1) {
            user.addresses[index] = addressData;
        }
        showToast('تم تحديث العنوان بنجاح');
    } else {
        // إضافة عنوان جديد
        user.addresses.push(addressData);
        showToast('تم حفظ الموقع بنجاح');
    }
    
    localStorage.setItem('huda-user', JSON.stringify(user));
    
    // تحديث بيانات المستخدم في قائمة المستخدمين
    const users = JSON.parse(localStorage.getItem('huda-users') || '[]');
    const userIndex = users.findIndex(u => u.email === user.email);
    if (userIndex !== -1) {
        users[userIndex] = user;
        localStorage.setItem('huda-users', JSON.stringify(users));
    }
    
    setTimeout(() => {
        showScreen('saved-addresses');
    }, 1500);
}

// متغيرات الخريطة
let addressMap, addressMarker;

function initMap(lat, lng) {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    if (!navigator.onLine) {
        mapElement.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444;"><i class="fas fa-wifi-slash" style="font-size:30px; margin-bottom:10px;"></i><br>عذراً، الخريطة تحتاج إلى اتصال بالإنترنت للعمل</div>';
        return;
    }

    if (typeof google === 'undefined') {
        mapElement.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">جاري تحميل الخريطة ... يرجى إضافة مفتاح Google Maps API للعمل بشكل صحيح داخل التطبيق</div>';
        return;
    }

    const defaultLoc = { lat: 24.7136, lng: 46.6753 }; // الرياض
    const location = (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : defaultLoc;

    addressMap = new google.maps.Map(mapElement, {
        center: location,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true
    });

    addressMarker = new google.maps.Marker({
        position: location,
        map: addressMap,
        draggable: true,
        animation: google.maps.Animation.DROP
    });

    if (lat && lng) {
        document.getElementById('address-lat').value = lat;
        document.getElementById('address-lng').value = lng;
    }

    google.maps.event.addListener(addressMarker, 'dragend', function() {
        const position = addressMarker.getPosition();
        document.getElementById('address-lat').value = position.lat();
        document.getElementById('address-lng').value = position.lng();
    });

    google.maps.event.addListener(addressMap, 'click', function(event) {
        addressMarker.setPosition(event.latLng);
        document.getElementById('address-lat').value = event.latLng.lat();
        document.getElementById('address-lng').value = event.latLng.lng();
    });
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        showToast('جاري تحديد الموقع...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                document.getElementById('address-lat').value = pos.lat;
                document.getElementById('address-lng').value = pos.lng;
                
                if (addressMap && addressMarker) {
                    addressMap.setCenter(pos);
                    addressMarker.setPosition(pos);
                    addressMap.setZoom(17);
                } else if (typeof google !== 'undefined') {
                    initMap(pos.lat, pos.lng);
                } else {
                    document.getElementById('map').innerHTML = `<div style="padding:20px;text-align:center;color:green;"><i class="fas fa-check-circle"></i> تم تحديد الإحداثيات بنجاح<br>${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}</div>`;
                }
                showToast('تم تحديد الموقع بنجاح');
            },
            () => {
                showToast('فشل في الوصول إلى الموقع الجغرافي، يرجى تفعيل الصلاحية');
            },
            { enableHighAccuracy: true }
        );
    } else {
        showToast('متصفحك لا يدعم تحديد الموقع');
    }
}

// ===== بيانات المنتجات =====

function getProducts() {
    const allProducts = [];
    
    // منتجات الخضروات
    allProducts.push(...getProductsByCategory('خضروات'));
    
    // منتجات الفواكه
    allProducts.push(...getProductsByCategory('فواكه'));
    
    // منتجات الألبان
    allProducts.push(...getProductsByCategory('ألبان'));
    
    // منتجات اللحوم
    allProducts.push(...getProductsByCategory('لحوم'));
    
    // منتجات المشروبات
    allProducts.push(...getProductsByCategory('مشروبات'));
    
    // منتجات المنظفات
    allProducts.push(...getProductsByCategory('منظفات'));
    
    // منتجات المعلبات
    allProducts.push(...getProductsByCategory('معلبات'));
    
    // منتجات الحلويات
    allProducts.push(...getProductsByCategory('حلويات'));
    
    return allProducts;
}

// ===== الإعدادات =====

function showSettings() {
    showScreen('settings');
    loadSettings();
}

function loadSettings() {
    // تحميل إعدادات اللغة
    const savedLanguage = localStorage.getItem('huda-language') || 'ar';
    document.getElementById('language-select').value = savedLanguage;

    // تحميل إعدادات المظهر
    const savedTheme = localStorage.getItem('huda-theme') || 'light';
    document.getElementById('theme-select').value = savedTheme;
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // تحديث إعدادات حجم الخط
    const savedFontSize = localStorage.getItem('huda-font-size') || 'medium';
    document.getElementById('font-size-select').value = savedFontSize;
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add('font-' + savedFontSize);

    // تحميل إعدادات الإشعارات
    const savedOffersNotifications = localStorage.getItem('huda-notifications-offers') !== 'false';
    document.getElementById('offers-notifications').checked = savedOffersNotifications;

    const savedOrdersNotifications = localStorage.getItem('huda-notifications-orders') !== 'false';
    document.getElementById('orders-notifications').checked = savedOrdersNotifications;

    // تحميل إعدادات تذكر بيانات الدخول
    const savedUser = localStorage.getItem('huda-user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        document.getElementById('remember-me-setting').checked = user.rememberMe || false;
    }
}

// كائن الترجمات
const translations = {
    ar: {
        // الرئيسية
        'search-placeholder': 'ابحث عن منتج...',
        'categories-title': 'الأقسام الرئيسية',
        'vegetables': 'خضروات',
        'fruits': 'فواكه',
        'dairy': 'ألبان',
        'beverages': 'مشروبات',
        'meat': 'لحوم',
        'cleaning': 'منظفات',
        'canned': 'معلبات',
        'sweets': 'حلويات',
        'latest-offers': 'أحدث العروض',
        'best-sellers': 'الأكثر مبيعاً',
        'add-to-cart': 'إضافة إلى السلة',

        // شاشة المنتجات
        'filter': 'فلترة',
        'sort': 'ترتيب',

        // شاشة تفاصيل المنتج
        'product-details': 'تفاصيل المنتج',
        'product-description': 'وصف المنتج',
        'additional-info': 'معلومات إضافية',
        'weight': 'الوزن',
        'country-of-origin': 'بلد المنشأ',

        // السلة
        'cart': 'السلة',
        'total-order': 'مجموع الطلب:',
        'delivery-fee': 'رسوم التوصيل:',
        'final-total': 'الإجمالي النهائي:',

        // إتمام الطلب
        'checkout': 'إتمام الطلب',
        'full-name': 'الاسم الكامل',
        'enter-full-name': 'أدخل اسمك الكامل',
        'phone': 'رقم الهاتف',
        'enter-phone': 'أدخل رقم الهاتف',
        'address': 'العنوان',
        'enter-address': 'أدخل العنوان بالتفصيل',
        'payment-method': 'طريقة الدفع',
        'cash-on-delivery': 'عند الاستلام',
        'bank-transfer': 'تحويل بنكي',
        'electronic-wallet': 'محفظة إلكترونية',
        'confirm-order': 'تأكيد الطلب',

        // الإشعارات
        'notifications': 'الإشعارات',
        'special-offer-vegetables': 'عرض خاص على الخضروات',
        'discount-30-percent': 'خصم 30% على جميع الخضروات الطازجة لمدة 24 ساعة',
        'order-on-way': 'طلبك في الطريق',
        'order-shipped': 'طلبك #12345 تم شحنه وسيصلك خلال 30 دقيقة',
        'special-gift': 'هدية خاصة',
        'use-huda20': 'استخدم كود HUDA20 واحصل على خصم 20% على طلبك التالي',
        'order-confirmed': 'تم تأكيد طلبك',
        'order-confirmed-successfully': 'طلبك #12344 تم تأكيده بنجاح',
        'rate-product': 'تقييم المنتج',
        'rate-products': 'قيم المنتجات التي اشتريتها واكسب نقاط مكافآت',

        // الطلبات
        'orders': 'الطلبات',
        'delivering': 'قيد التوصيل',
        'view-details': 'عرض التفاصيل',
        'amount': 'المبلغ:',

        // المفضلة
        'favorites': 'المفضلة',

        // الملف الشخصي
        'profile': 'حسابي',
        'edit-data': 'تعديل البيانات',
        'saved-addresses': 'العناوين المحفوظة',
        'settings': 'الإعدادات',
        'logout': 'تسجيل الخروج',

        // تعديل البيانات
        'edit-profile': 'تعديل البيانات',
        'email': 'البريد الإلكتروني',
        'enter-email': 'أدخل البريد الإلكتروني',
        'save-changes': 'حفظ التغييرات',

        // العناوين
        'add-new-address': 'إضافة عنوان جديد',
        'address-name': 'اسم العنوان',
        'address-name-placeholder': 'مثال: المنزل، العمل',
        'address-details': 'العنوان بالتفصيل',
        'enter-address-details': 'أدخل العنوان بالتفصيل',
        'city': 'المدينة',
        'enter-city': 'أدخل المدينة',
        'address-phone': 'رقم الهاتف',
        'location-pin': 'رمز الموقع (اختياري)',
        'enter-pin': 'أدخل رمز الموقع',
        'save-address': 'حفظ العنوان',

        // الإعدادات
        'language': 'اللغة',
        'app-language': 'لغة التطبيق',
        'appearance': 'المظهر',
        'app-mode': 'وضع التطبيق',
        'light': 'فاتح',
        'dark': 'داكن',
        'font-size': 'حجم الخط',
        'small': 'صغير',
        'medium': 'متوسط',
        'large': 'كبير',
        'notification-settings': 'الإشعارات',
        'offer-notifications': 'إشعارات العروض',
        'order-notifications': 'إشعارات الطلبات',
        'privacy': 'الخصوصية',
        'remember-login': 'تذكر بيانات الدخول',
        'app-info': 'معلومات التطبيق',
        'version': 'الإصدار',
        'contact-us': 'اتصل بنا',
        'terms-conditions': 'الشروط والأحكام',
        'privacy-policy': 'سياسة خاصة',
        'faq': 'التعليمات',
        'about-us': 'معلومات عنا',
        'home': 'الرئيسية',
        'clear-all-data': 'مسح جميع البيانات',
        'app-name': 'الهدى ادفانس',
        'tagline': 'تسوق بسهولة… كل احتياجاتك في مكان واحد',
        'welcome-message': 'مرحباً بك في الهدى ادفانس',
        'auth-subtitle': 'سجل دخولك أو أنشئ حساب جديد',
        'register': 'إنشاء حساب',
        'email-or-phone': 'البريد الإلكتروني أو رقم الهاتف',
        'password': 'كلمة المرور',
        'remember-me': 'تذكرني',
        'forgot-password': 'نسيت كلمة المرور؟',
        'confirm-password': 'تأكيد كلمة المرور',
        'discount-30': 'خصم 30%',
        'fresh-vegetables-offers': 'عروض الخضروات الطازجة',
        'best-vegetables-prices': 'أجود الخضروات بأسعار مميزة',
        'currency': 'ريال',
        'kg': 'كجم',
        'products-count': '3 منتجات',
        'contact-us-title': 'تواصل معنا',
        'contact-us-description': 'نحن هنا لمساعدتك. يمكنك التواصل معنا عبر القنوات التالية:',
        'email-label': 'البريد الإلكتروني',
        'whatsapp': 'واتساب',
        'twitter': 'تويتر',
        'who-we-are': 'من نحن',
        'our-vision': 'رؤيتنا',
        'our-mission': 'رسالتنا',
        'our-values': 'قيمنا',

        // رسائل
        'added-to-cart': 'تمت الإضافة إلى السلة بنجاح',
        'quantity-increased': 'تم زيادة الكمية',
        'select-product-first': 'يرجى اختيار منتج أولاً',
        'complete-all-fields': 'يرجى إكمال جميع الحقول',
        'language-changed': 'تم تغيير اللغة',
        'theme-changed-dark': 'تم تفعيل الوضع الداكن',
        'theme-changed-light': 'تم تفعيل الوضع الفاتح',
        'removed-from-cart': 'تم الحذف من السلة',
        'added-to-favorites': 'تمت الإضافة إلى المفضلة',
        'removed-from-favorites': 'تم الحذف من المفضلة',
        'add-favorites-message': 'أضف منتجاتك المفضلة من صفحة الرئيسية',
        'address-added': 'تم إضافة العنوان بنجاح',
        'address-updated': 'تم التحديث بنجاح',
        'address-deleted': 'تم الحذف بنجاح',
        'confirm-delete-address': 'هل أنت متأكد من حذف هذا العنوان؟',
        'confirm': 'موافق',
        'cancel': 'إلغاء',
        'empty-favorites': 'لا توجد منتجات في المفضلة',
    },
    en: {
        // الرئيسية
        'search-placeholder': 'Search for a product...',
        'categories-title': 'Main Categories',
        'vegetables': 'Vegetables',
        'fruits': 'Fruits',
        'dairy': 'Dairy',
        'beverages': 'Beverages',
        'meat': 'Meat',
        'cleaning': 'Cleaning',
        'canned': 'Canned',
        'sweets': 'Sweets',
        'latest-offers': 'Latest Offers',
        'best-sellers': 'Best Sellers',
        'add-to-cart': 'Add to Cart',

        // شاشة المنتجات
        'filter': 'Filter',
        'sort': 'Sort',

        // شاشة تفاصيل المنتج
        'product-details': 'Product Details',
        'product-description': 'Product Description',
        'additional-info': 'Additional Information',
        'weight': 'Weight',
        'country-of-origin': 'Country of Origin',

        // السلة
        'cart': 'Cart',
        'total-order': 'Order Total:',
        'delivery-fee': 'Delivery Fee:',
        'final-total': 'Final Total:',

        // إتمام الطلب
        'checkout': 'Checkout',
        'full-name': 'Full Name',
        'enter-full-name': 'Enter your full name',
        'phone': 'Phone Number',
        'enter-phone': 'Enter phone number',
        'address': 'Address',
        'enter-address': 'Enter address in detail',
        'payment-method': 'Payment Method',
        'cash-on-delivery': 'Cash on Delivery',
        'bank-transfer': 'Bank Transfer',
        'electronic-wallet': 'Electronic Wallet',
        'confirm-order': 'Confirm Order',

        // الإشعارات
        'notifications': 'Notifications',
        'special-offer-vegetables': 'Special Offer on Vegetables',
        'discount-30-percent': '30% discount on all fresh vegetables for 24 hours',
        'order-on-way': 'Your order is on the way',
        'order-shipped': 'Your order #12345 has been shipped and will arrive within 30 minutes',
        'special-gift': 'Special Gift',
        'use-huda20': 'Use code HUDA20 and get 20% discount on your next order',
        'order-confirmed': 'Order Confirmed',
        'order-confirmed-successfully': 'Your order #12344 has been confirmed successfully',
        'rate-product': 'Rate Product',
        'rate-products': 'Rate the products you purchased and earn reward points',

        // الطلبات
        'orders': 'Orders',
        'delivering': 'Delivering',
        'view-details': 'View Details',
        'amount': 'Amount:',

        // المفضلة
        'favorites': 'Favorites',

        // الملف الشخصي
        'profile': 'My Account',
        'edit-data': 'Edit Data',
        'saved-addresses': 'Saved Addresses',
        'settings': 'Settings',
        'logout': 'Logout',

        // تعديل البيانات
        'edit-profile': 'Edit Profile',
        'email': 'Email',
        'enter-email': 'Enter email',
        'save-changes': 'Save Changes',

        // العناوين
        'add-new-address': 'Add New Address',
        'address-name': 'Address Name',
        'address-name-placeholder': 'e.g., Home, Work',
        'address-details': 'Address Details',
        'enter-address-details': 'Enter address in detail',
        'city': 'City',
        'enter-city': 'Enter city',
        'address-phone': 'Phone Number',
        'location-pin': 'Location Pin (optional)',
        'enter-pin': 'Enter location pin',
        'save-address': 'Save Address',

        // الإعدادات
        'language': 'Language',
        'app-language': 'App Language',
        'appearance': 'Appearance',
        'app-mode': 'App Mode',
        'light': 'Light',
        'dark': 'Dark',
        'font-size': 'Font Size',
        'small': 'Small',
        'medium': 'Medium',
        'large': 'Large',
        'notification-settings': 'Notifications',
        'offer-notifications': 'Offer Notifications',
        'order-notifications': 'Order Notifications',
        'privacy': 'Privacy',
        'remember-login': 'Remember Login',
        'app-info': 'App Information',
        'version': 'Version',
        'contact-us': 'Contact Us',
        'terms-conditions': 'Terms and Conditions',
        'privacy-policy': 'Privacy Policy',
        'faq': 'FAQ',
        'about-us': 'About Us',
        'home': 'Home',
        'clear-all-data': 'Clear All Data',
        'app-name': 'Huda Advance',
        'tagline': 'Shop easily… all your needs in one place',
        'welcome-message': 'Welcome to Huda Advance',
        'auth-subtitle': 'Sign in or create a new account',
        'register': 'Create Account',
        'email-or-phone': 'Email or phone number',
        'password': 'Password',
        'remember-me': 'Remember me',
        'forgot-password': 'Forgot password?',
        'confirm-password': 'Confirm password',
        'discount-30': '30% discount',
        'fresh-vegetables-offers': 'Fresh vegetables offers',
        'best-vegetables-prices': 'Best vegetables at great prices',
        'currency': 'SAR',
        'kg': 'kg',
        'products-count': '3 products',
        'contact-us-title': 'Contact Us',
        'contact-us-description': 'We are here to help you. You can contact us through the following channels:',
        'email-label': 'Email',
        'whatsapp': 'WhatsApp',
        'twitter': 'Twitter',
        'who-we-are': 'Who We Are',
        'our-vision': 'Our Vision',
        'our-mission': 'Our Mission',
        'our-values': 'Our Values',

        // رسائل
        'added-to-cart': 'Added to cart successfully',
        'quantity-increased': 'Quantity increased',
        'select-product-first': 'Please select a product first',
        'complete-all-fields': 'Please complete all fields',
        'language-changed': 'Language changed',
        'theme-changed-dark': 'Dark mode activated',
        'theme-changed-light': 'Light mode activated',
        'removed-from-cart': 'Removed from cart',
        'added-to-favorites': 'Added to favorites',
        'removed-from-favorites': 'Removed from favorites',
        'add-favorites-message': 'Add your favorite products from the home page',
        'address-added': 'Address added successfully',
        'address-updated': 'Updated successfully',
        'address-deleted': 'Deleted successfully',
        'confirm-delete-address': 'Are you sure you want to delete this address?',
        'confirm': 'Confirm',
        'cancel': 'Cancel',
        'empty-favorites': 'No products in favorites',
    }
};

function changeLanguage(language) {
    localStorage.setItem('huda-language', language);
    applyLanguage(language);
    
    // تحديث قائمة اختيار اللغة
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = language;
    }
    
    showToastByKey('language-changed');
}

function applyLanguage(language) {
    const lang = translations[language];

    // تحديث جميع العناصر مع data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (lang[key]) {
            // إذا كان العنصر option، نستخدم text بدلاً من textContent
            if (element.tagName === 'OPTION') {
                element.text = lang[key];
            } else {
                element.textContent = lang[key];
            }
        }
    });

    // تحديث جميع العناصر مع data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (lang[key]) {
            element.placeholder = lang[key];
        }
    });

    // تغيير اتجاه الصفحة
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    // تغيير الخط حسب اللغة
    if (language === 'en') {
        document.body.classList.add('lang-en');
    } else {
        document.body.classList.remove('lang-en');
    }
}

function changeTheme(theme) {
    localStorage.setItem('huda-theme', theme);
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        showToast('تم تفعيل الوضع الداكن');
    } else {
        document.body.classList.remove('dark-mode');
        showToast('تم تفعيل الوضع الفاتح');
    }
}

function changeFontSize(size) {
    localStorage.setItem('huda-font-size', size);
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add('font-' + size);
    showToast('تم تغيير حجم الخط');
}

function toggleNotifications(type) {
    const checkbox = document.getElementById(type + '-notifications');
    localStorage.setItem('huda-notifications-' + type, checkbox.checked);
    if (checkbox.checked) {
        showToast('تم تفعيل إشعارات ' + (type === 'offers' ? 'العروض' : 'الطلبات'));
    } else {
        showToast('تم تعطيل إشعارات ' + (type === 'offers' ? 'العروض' : 'الطلبات'));
    }
}

function toggleRememberMe() {
    const checkbox = document.getElementById('remember-me-setting');
    const savedUser = localStorage.getItem('huda-user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        user.rememberMe = checkbox.checked;
        localStorage.setItem('huda-user', JSON.stringify(user));
        
        const users = JSON.parse(localStorage.getItem('huda-users') || '[]');
        const userIndex = users.findIndex(u => u.email === user.email);
        if (userIndex !== -1) {
            users[userIndex] = user;
            localStorage.setItem('huda-users', JSON.stringify(users));
        }
    }
    if (checkbox.checked) {
        showToast('تم تفعيل تذكر بيانات الدخول');
    } else {
        showToast('تم تعطيل تذكر بيانات الدخول');
    }
}

function clearAppData() {
    if (!confirm('هل أنت متأكد من مسح جميع البيانات؟ سيتم حذف جميع البيانات المحفوظة بما في ذلك السلة والمفضلة والإعدادات.')) {
        return;
    }
    
    localStorage.clear();
    showToast('تم مسح جميع البيانات بنجاح');
    
    setTimeout(() => {
        location.reload();
    }, 1500);
}

// ===== شاشات المعلومات =====

function showContactUs() {
    showScreen('contact-us');
}

function showTermsAndConditions() {
    showScreen('terms');
}

function showPrivacyPolicy() {
    showScreen('privacy');
}

function showFAQ() {
    showScreen('faq');
}

function showAboutUs() {
    showScreen('about');
}

// ===== المفضلة =====

function showFavorites() {
    showScreen('favorites');
}

function loadFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) return;
    
    const savedUser = localStorage.getItem('huda-user');
    if (!savedUser) {
        favoritesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>يجب تسجيل الدخول أولاً</h3>
                <p>قم بتسجيل الدخول لحفظ المنتجات المفضلة</p>
            </div>
        `;
        return;
    }
    
    const user = JSON.parse(savedUser);
    const favorites = user.favorites || [];
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>لا توجد منتجات مفضلة</h3>
                <p>أضف منتجاتك المفضلة من الصفحة الرئيسية</p>
            </div>
        `;
        return;
    }
    
    favoritesList.innerHTML = favorites.map(product => `
        <div class="product-card" onclick="showProductDetails(${product.id})">
            <img src="${product.image}" alt="${product.name}">
            <div class="product-info">
                <h4>${product.name}</h4>
                <div class="price-container">
                    <span class="price">${product.price}</span>
                </div>
            </div>
            <button class="btn-favorite active" onclick="event.stopPropagation(); toggleFavorite('${product.id}')">
                <i class="fas fa-heart"></i>
            </button>
        </div>
    `).join('');
}

function toggleFavorite(productId) {
    const savedUser = localStorage.getItem('huda-user');
    if (!savedUser) {
        showToast('يجب تسجيل الدخول أولاً');
        return;
    }
    
    const user = JSON.parse(savedUser);
    user.favorites = user.favorites || [];
    
    const index = user.favorites.findIndex(p => String(p.id) === String(productId));
    const button = event.target.closest('.btn-favorite');
    
    if (index !== -1) {
        user.favorites.splice(index, 1);
        showToast('تمت الإزالة من المفضلة');
        if (button) {
            button.classList.remove('active');
        }
    } else {
        const products = getProducts();
        const product = products.find(p => String(p.id) === String(productId));
        if (product) {
            user.favorites.push(product);
            showToast('تمت الإضافة إلى المفضلة');
            if (button) {
                button.classList.add('active');
            }
        }
    }
    
    localStorage.setItem('huda-user', JSON.stringify(user));
    
    // تحديث بيانات المستخدم في قائمة المستخدمين
    const users = JSON.parse(localStorage.getItem('huda-users') || '[]');
    const userIndex = users.findIndex(u => u.email === user.email);
    if (userIndex !== -1) {
        users[userIndex] = user;
        localStorage.setItem('huda-users', JSON.stringify(users));
    }
    
    // تحديث عرض المفضلة إذا كنا في صفحة المفضلة
    if (currentScreen === 'favorites') {
        loadFavorites();
    }
}

function updateFavoriteButtons() {
    const savedUser = localStorage.getItem('huda-user');
    if (!savedUser) return;
    
    const user = JSON.parse(savedUser);
    const favorites = user.favorites || [];
    const favoriteIds = favorites.map(f => String(f.id));
    
    // تحديث جميع أزرار القلب في الصفحة الحالية
    const buttons = document.querySelectorAll('.btn-favorite');
    buttons.forEach(button => {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/toggleFavorite\(([^)]+)\)/);
            if (match) {
                let productId = match[1];
                // إزالة علامات الاقتباس إذا وجدت
                productId = productId.replace(/['"]/g, '');
                if (favoriteIds.includes(productId)) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        }
    });
}

/**
 * العودة إلى الصفحة السابقة
 * يستخدم stack لتتبع تاريخ التنقل
 */
function goBack() {
    // 1. التحقق من وجود صفحات في stack
    if (navigationStack.length > 0) {
        // 2. أخذ آخر صفحة من stack
        const previousScreen = navigationStack.pop();
        // 3. إظهار الصفحة السابقة بدون إضافتها إلى stack
        showScreen(previousScreen, false);
    } else {
        // 4. إذا كان stack فارغاً، العودة للصفحة الرئيسية
        showScreen('home', false);
    }
}

/**
 * مسح stack (يُستخدم عند التنقل المباشر مثل bottom nav)
 */
function clearNavigationStack() {
    navigationStack = [];
}


// ===== الإشعارات =====

function showToast(message) {

    const toast = document.getElementById('toast');

    const toastMessage = document.getElementById('toast-message');

    

    toastMessage.textContent = message;

    toast.classList.add('show');

    

    setTimeout(() => {

        toast.classList.remove('show');

    }, 3000);

}

function showToastByKey(key) {
    const language = localStorage.getItem('huda-language') || 'ar';
    const message = translations[language][key];
    if (message) {
        showToast(message);
    }
}



// ===== التخزين المحلي =====

function saveCartData() {

    localStorage.setItem('huda-cart', JSON.stringify(cartItems));

}



function loadSavedData() {

    // تحميل السلة

    const savedCart = localStorage.getItem('huda-cart');

    if (savedCart) {

        cartItems = JSON.parse(savedCart);

        updateCartCount();

    }

    

    // تحميل المفضلة

    const savedFavorites = localStorage.getItem('huda-favorites');

    if (savedFavorites) {

        favorites = JSON.parse(savedFavorites);

    }

}



function saveOrder(order) {

    const orders = getSavedOrders();

    orders.push(order);

    localStorage.setItem('huda-orders', JSON.stringify(orders));

}



function getSavedOrders() {

    const savedOrders = localStorage.getItem('huda-orders');
    return savedOrders ? JSON.parse(savedOrders) : [];
}


// ===== البحث =====

function setupSearch() {

    const searchInput = document.querySelector('#search-input');

    if (searchInput) {

        searchInput.addEventListener('input', function(e) {

            const query = e.target.value.toLowerCase();

            filterProducts(query);

        });

    }

}



// ===== التحكم في واجهة البحث =====

function toggleSearchInterface() {

    const searchInterface = document.getElementById('search-interface');

    const searchInput = document.getElementById('search-input');

    const searchInputFull = document.getElementById('search-input-full');

    const searchIcon = document.getElementById('search-icon');

    

    if (!searchInterface.classList.contains('active')) {

        // فتح واجهة البحث القابلة

        searchInterface.style.display = 'block';

        searchInterface.classList.add('active');

        searchInputFull.value = searchInput.value;

        searchInputFull.focus();

        

        // تغيير الأيقونة

        searchIcon.classList.remove('fa-search');

        searchIcon.classList.add('fa-times');

        // تحديث أزرار القلب

        setTimeout(() => updateFavoriteButtons(), 100);

    } else {

        // إغلاق واجهة البحث القابلة

        closeSearchInterface();

    }

}



function closeSearchInterface() {

    const searchInterface = document.getElementById('search-interface');

    const searchIcon = document.getElementById('search-icon');

    

    searchInterface.style.display = 'none';

    searchInterface.classList.remove('active');

    searchIcon.classList.remove('fa-times');

    searchIcon.classList.add('fa-search');

}



function setupSearchInterface() {

    const searchInputFull = document.getElementById('search-input-full');

    if (searchInputFull) {

        searchInputFull.addEventListener('input', function(e) {

            const query = e.target.value.toLowerCase();

            performGlobalSearch(query);

        });

    }

}



function performGlobalSearch(query) {

    const searchContent = document.querySelector('.search-content');

    

    if (query === '') {

        searchContent.innerHTML = '<div class="search-placeholder"><p>ابحث عن منتجات من جميع الأقسام...</p></div>';

        return;

    }

    

    // البحث في جميع المنتجات من جميع الأقسام

    const allProducts = [];

    

    // منتجات الخضروات

    allProducts.push(...getProductsByCategory('خضروات'));

    

    // منتجات الفواكه

    allProducts.push(...getProductsByCategory('فواكه'));

    

    // منتجات الألبان

    allProducts.push(...getProductsByCategory('ألبان'));

    

    // منتجات اللحوم

    allProducts.push(...getProductsByCategory('لحوم'));

    

    // فلترة المنتجات حسب البحث

    const filteredProducts = allProducts.filter(product => 

        product.name.toLowerCase().includes(query)

    );

    

    if (filteredProducts.length === 0) {

        searchContent.innerHTML = `

            <div class="search-results">

                <i class="fas fa-search"></i>

                <h3>لم يتم العثور على منتجات</h3>

                <p>لا توجد منتجات تطابق "${query}"</p>

            </div>

        `;

    } else {

        searchContent.innerHTML = `

            <div class="search-results-grid">

                ${filteredProducts.map(product => `

                    <div class="search-product-card" onclick="goToProductDetails('${product.name}')">

                        <img src="${product.image}" alt="${product.name}">

                        <div class="search-product-info">

                            <h4>${product.name}</h4>

                            <span class="weight">${product.weight}</span>

                            <div class="price">${product.price}</div>

                            <div class="button-container">

                                <button class="add-to-cart" onclick="event.stopPropagation(); addToCartFromSearch(this, '${product.id}')">

                                    <i class="fas fa-plus"></i>

                                </button>

                                <button class="btn-favorite" onclick="event.stopPropagation(); toggleFavorite('${product.id}')">

                                    <i class="fas fa-heart"></i>

                                </button>

                            </div>

                        </div>

                    </div>

                `).join('')}

            </div>

        `;

        // تحديث أزرار القلب في نتائج البحث

        setTimeout(() => updateFavoriteButtons(), 100);

    }

}

function addToCartFromSearch(button, productId) {

    // منع النقرات المتعددة

    if (button.disabled) return;

    

    // تعطيل الزر مؤقتاً

    button.disabled = true;

    

    // البحث عن بيانات المنتج من البطاقة الحالية

    const productCard = button.closest('.search-product-card');

    const productName = productCard.querySelector('h4').textContent;

    const productPrice = productCard.querySelector('.price').textContent;

    const productImage = productCard.querySelector('img').src;

    

    // التحقق من وجود المنتج مسبقاً في السلة

    const existingProduct = cartItems.find(item => item.name === productName);

    

    if (existingProduct) {

        // زيادة الكمية إذا المنتج موجود مسبقاً

        existingProduct.quantity += 1;

        showToast('تم زيادة الكمية');

    } else {

        // إضافة منتج جديد إذا لم يكن موجوداً

        const product = {

            id: Date.now(),

            name: productName,

            price: productPrice,

            quantity: 1,

            image: productImage

        };

        

        cartItems.push(product);

        showToast('تمت الإضافة إلى السلة');

    }

    

    updateCartCount();

    saveCartData();

    

    // تغيير شكل الزر

    button.innerHTML = '<i class="fas fa-check"></i>';

    button.style.background = '#4CAF50';

    

    setTimeout(() => {

        button.innerHTML = '<i class="fas fa-plus"></i>';

        button.style.background = '';

        button.disabled = false;

    }, 1500);

}



function goToProductDetails(productName) {
    // إغلاق واجهة البحث
    closeSearchInterface();
    
    // البحث عن المنتج في جميع الأقسام
    let product = null;
    const categories = ['خضروات', 'فواكه', 'ألبان', 'لحوم', 'مشروبات', 'منظفات', 'معلبات', 'حلويات'];
    
    for (const category of categories) {
        const products = getProductsByCategory(category);
        product = products.find(p => p.name === productName);
        if (product) break;
    }
    
    if (product) {
        // استخدام showProductDetails لتعيين currentProduct وتحميل البيانات
        showProductDetails(product.id);
    } else {
        // إذا لم يتم العثور على المنتج، عرض تفاصيل عامة
        showScreen('product-details');
        loadProductDetails({ name: productName, image: 'https://via.placeholder.com/300x300', price: '10 ريال', weight: '1 وحدة' });
    }
}



function loadProductDetails(product) {
    // تحميل تفاصيل المنتج بناءً على كائن المنتج
    
    const productImage = document.querySelector('.product-details-container img');
    const productTitle = document.querySelector('.product-details-container h2');
    const productDescription = document.querySelector('#product-description');
    const newPriceElement = document.querySelector('.product-details-container .new-price');
    const oldPriceElement = document.querySelector('.product-details-container .old-price');
    const weightElement = document.querySelector('.product-details-container .detail-item span:last-child');
    
    if (productImage && productTitle) {
        // تحديث الصورة والاسم
        productTitle.textContent = product.name;
        productImage.src = product.image;
        
        // تحديث السعر
        if (newPriceElement) {
            newPriceElement.textContent = product.price;
        }
        if (oldPriceElement && product.oldPrice) {
            oldPriceElement.textContent = product.oldPrice;
            oldPriceElement.style.display = 'inline';
        } else if (oldPriceElement) {
            oldPriceElement.style.display = 'none';
        }
        
        // تحديث الوزن
        if (weightElement && product.weight) {
            weightElement.textContent = product.weight;
        }
        
        // تحديث الوصف
        if (productDescription) {
            productDescription.textContent = `${product.name} - منتج طازج وعالي الجودة. مثالي للاستخدام اليومي.`;
        }
    }
}



function filterProducts(query) {

    const productCards = document.querySelectorAll('.product-card');

    

    productCards.forEach(card => {

        const productName = card.querySelector('h4').textContent.toLowerCase();

        if (productName.includes(query)) {

            card.style.display = 'block';

        } else {

            card.style.display = 'none';

        }

    });

}



// ===== التصفية والترتيب =====

function setupFilters() {

    const filterBtn = document.querySelector('.filter-btn');

    const sortBtn = document.querySelector('.sort-btn');

    

    if (filterBtn) {

        filterBtn.addEventListener('click', function() {

            this.classList.toggle('active');

            showToast('خيارات التصفية - قريباً');

        });

    }

    

    if (sortBtn) {

        sortBtn.addEventListener('click', function() {

            this.classList.toggle('active');

            sortProducts();

        });

    }

}



function sortProducts() {

    const productsGrid = document.querySelector('.products-grid');

    if (!productsGrid) return;

    

    const products = Array.from(productsGrid.children);

    

    // ترتيب حسب السعر (من الأقل للأعلى)

    products.sort((a, b) => {

        const priceA = parseFloat(a.querySelector('.new-price, .price').textContent.replace(/[^0-9.]/g, ''));

        const priceB = parseFloat(b.querySelector('.new-price, .price').textContent.replace(/[^0-9.]/g, ''));

        return priceA - priceB;

    });

    

    // إعادة ترتيب العناصر

    products.forEach(product => {

        productsGrid.appendChild(product);

    });

    

    showToast('تم الترتيب حسب السعر');

}



// ===== تحسينات الأداء =====

function optimizeImages() {

    const images = document.querySelectorAll('img');

    images.forEach(img => {

        img.addEventListener('load', function() {

            this.classList.add('loaded');

        });

        

        img.addEventListener('error', function() {

            this.src = 'https://via.placeholder.com/200x200?text=صورة+غير+متوفرة';

        });

    });

}



// ===== إعدادات إضافية =====

function setupAccessibility() {

    // دعم القراءة الشاشة

    const buttons = document.querySelectorAll('button');

    buttons.forEach(button => {

        if (!button.getAttribute('aria-label')) {

            button.setAttribute('aria-label', button.textContent);

        }

    });

}



function setupKeyboardNavigation() {

    document.addEventListener('keydown', function(e) {

        if (e.key === 'Escape') {

            goBack();

        }

    });

}



// ===== تحميل المزيد من الوظائف =====

function lazyLoad() {

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add('visible');

            }

        });

    });

    

    const elements = document.querySelectorAll('.product-card, .category-card');

    elements.forEach(element => {

        observer.observe(element);

    });

}



// ===== إدارة حالة الاتصال (Online / Offline) =====
function setupOfflineDetection() {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // التحقق المبدئي
    updateOnlineStatus();
}

function updateOnlineStatus() {
    const offlineBanner = document.getElementById('offline-banner');
    if (!offlineBanner) return;
    
    if (navigator.onLine) {
        offlineBanner.style.display = 'none';
        
        // إعادة تحميل الخريطة إذا كنا في شاشة العناوين
        const mapElement = document.getElementById('map');
        if (mapElement && currentScreen === 'address') {
            initMap();
        }
    } else {
        offlineBanner.style.display = 'flex';
        showToast('انقطع الاتصال بالإنترنت، بعض الميزات غير متاحة');
    }
}

// ===== تهيئة جميع الوظائف =====

function initializeAllFeatures() {
    setupOfflineDetection();

    setupSearch();

    setupSearchInterface();

    setupFilters();

    optimizeImages();

    setupAccessibility();

    setupKeyboardNavigation();

    lazyLoad();

}



// ===== استدعاء التهيئة النهائية =====

document.addEventListener('DOMContentLoaded', function() {

    initializeApp();

    initializeAllFeatures();

});



// ===== دعم اللمس للأجهزة المحمولة =====

function setupTouchSupport() {
    // تم تعطيل هذه الميزة لمنع السحب الجانبي
    return;

    let touchStartX = 0;

    let touchEndX = 0;



    document.addEventListener('touchstart', function(e) {

        touchStartX = e.changedTouches[0].screenX;

    });



    document.addEventListener('touchend', function(e) {

        touchEndX = e.changedTouches[0].screenX;

        handleSwipe();

    });



    function handleSwipe() {

        const swipeThreshold = 50;

        const diff = touchStartX - touchEndX;



        if (Math.abs(diff) > swipeThreshold) {

            if (diff > 0) {

                // السحب لليسار - الشاشة التالية

                navigateToNextScreen();

            } else {

                // السحب لليمين - الشاشة السابقة

                goBack();

            }

        }

    }

}



function navigateToNextScreen() {

    const screenOrder = ['home', 'categories', 'cart', 'orders', 'profile'];

    const currentIndex = screenOrder.indexOf(currentScreen);

    

    if (currentIndex < screenOrder.length - 1) {

        showScreen(screenOrder[currentIndex + 1]);

    }

}



// ===== إضافة دعم السحب للتحديث =====

function setupPullToRefresh() {
    // تم تعطيل هذه الميزة لمنع التحديث التلقائي عند اللمس
    return;

    let startY = 0;

    let isPulling = false;



    document.addEventListener('touchstart', function(e) {

        if (window.scrollY === 0) {

            startY = e.touches[0].pageY;

            isPulling = true;

        }

    });



    document.addEventListener('touchmove', function(e) {

        if (!isPulling) return;



        const currentY = e.touches[0].pageY;

        const diff = currentY - startY;



        if (diff > 100) {

            // إظهار مؤشر التحديث

            showRefreshIndicator();

        }

    });



    document.addEventListener('touchend', function() {

        if (isPulling) {

            isPulling = false;

            refreshCurrentScreen();

        }

    });

}



function showRefreshIndicator() {

    // يمكن إضافة مؤشر تحديث مرئي هنا

    console.log('جاري التحديث...');

}



function refreshCurrentScreen() {

    handleScreenSpecificActions(currentScreen);

    showToast('تم تحديث الصفحة');

}




document.addEventListener('DOMContentLoaded', function() {

    setupTouchSupport();

    setupPullToRefresh();

});
