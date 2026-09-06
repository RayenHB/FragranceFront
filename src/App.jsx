import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Outlet, useNavigate, useParams, useLocation, useOutletContext } from 'react-router-dom';
import { ProductsAPI, AdminAPI, OrdersAPI, AuthAPI, ChatAPI, resolveBackendFileUrl } from './api';
import { ShoppingCart, LogOut, Package, LayoutDashboard, UserRound, MessageCircle, Paperclip, Search, ChevronLeft, ChevronRight, ShieldCheck, Truck, RotateCcw, Menu, X, Heart, Trash2, AlertCircle, CheckCircle2, Upload, Image } from 'lucide-react';
import './App.css';
import collectionImage from './assets/collection_image.jpg';
import genuineCardImage from './assets/genuine_card.png';
import concentratedCardImage from './assets/concentrated_card.png';
import narcisoHeroImage from './assets/narciso_hero.png';
import valentinoHeroImage from './assets/valentino_hero.png';
import libreHeroImage from './assets/libre_hero.png';
import versaceHeroImage from './assets/versace_hero.png';
import xerjoffHeroImage from './assets/xerjoff_hero.png';
import femmeCategoryImage from './assets/femme_category.png';
import hommeCategoryImage from './assets/homme_category.png';
import unisexCategoryImage from './assets/unisex_category.png';
import lancomeHeroImage from './assets/lancome_hero.png';
import chanelHeroImage from './assets/chanel_hero.png';
import armaniMyWayHeroImage from './assets/armani_my_way_hero.png';
import scandalHeroImage from './assets/scandal_hero.png';
import kayaliVanillaHeroImage from './assets/kayali_vanilla_hero.png';
import goodGirlHeroImage from './assets/good_girl_hero.png';
import armaniCodeHeroImage from './assets/armani_code_hero.png';
import valentinoUomoHeroImage from './assets/valentino_uomo_hero.png';
import acquaDiGioHeroImage from './assets/acqua_di_gio_hero.png';
import hermesHeroImage from './assets/hermes_hero.png';
import erosEnergyHeroImage from './assets/eros_energy_hero.png';
import lightBlueHeroImage from './assets/light_blue_hero.png';
const showToast = (message, type = 'error') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
};

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handleShowToast = (event) => {
            const { message, type } = event.detail;
            const id = Date.now() + Math.random().toString(36).substr(2, 9);
            
            setToasts((prev) => [...prev, { id, message, type }]);

            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 4500);
        };

        window.addEventListener('show-toast', handleShowToast);
        return () => window.removeEventListener('show-toast', handleShowToast);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast-item toast-${t.type}`}>
                    <div className="toast-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        {t.type === 'success' && <CheckCircle2 size={16} color="var(--accent-gold)" />}
                        {t.type === 'error' && <AlertCircle size={16} color="#ef4444" />}
                        {t.type === 'info' && <AlertCircle size={16} color="#3b82f6" />}
                    </div>
                    <div className="toast-content">{t.message}</div>
                    <button className="toast-close-btn" onClick={() => removeToast(t.id)} aria-label="Fermer">
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
};

const getCategoryForSize = (size) => {
    const s = Number(size);
    if (PERFUME_SIZES.EXTRACT && PERFUME_SIZES.EXTRACT.includes(s)) return 'EXTRACT';
    return 'GENUINE';
};

const getSizeSpecificInfo = (product, size, categoryValue) => {
    const version = String(categoryValue || (size ? getCategoryForSize(size) : 'GENUINE')).toUpperCase();
    const sizePricesField = version === 'EXTRACT' ? product?.extract_size_prices : product?.genuine_size_prices;
    if (!sizePricesField) return null;
    let sizePrices = sizePricesField;
    if (typeof sizePrices === 'string') {
        try {
            sizePrices = JSON.parse(sizePrices);
        } catch (_) {
            return null;
        }
    }
    const key = String(size);
    if (sizePrices && sizePrices[key]) {
        return sizePrices[key];
    }
    return null;
};

const getSizeStock = (product, size, categoryValue) => {
    if (!product) return 0;
    const version = String(categoryValue || (size ? getCategoryForSize(size) : 'GENUINE')).toUpperCase();
    
    if (version === 'EXTRACT') {
        const sizeInfo = size ? getSizeSpecificInfo(product, size, version) : null;
        if (sizeInfo) {
            const st = sizeInfo.stock;
            if (st !== undefined && st !== null && st !== '') return Number(st);
        }
        return Number(product.extract_stock ?? 0);
    } else {
        const genuine_stock = Number(product.genuine_stock ?? 0);
        const bottle_ml = Number(product.bottle_ml ?? 0);
        const total_ml = genuine_stock * bottle_ml;
        
        let consumed_ml = 0;
        let sizePrices = product.genuine_size_prices;
        if (typeof sizePrices === 'string') {
            try { sizePrices = JSON.parse(sizePrices); } catch(_) {}
        }
        if (sizePrices && sizePrices.consumed_ml) {
            consumed_ml = Number(sizePrices.consumed_ml);
        }
        
        const available_ml = total_ml - consumed_ml;
        if (size) {
            const requested_ml = Number(size);
            if (requested_ml <= 0) return 0;
            return Math.floor(available_ml / requested_ml);
        }
        return genuine_stock;
    }
};

const getDefaultProductVariant = (product) => {
    if (!product) return null;
    let fallback = null;
    
    // Try genuine first
    if (product.genuine_size_prices) {
        let parsed = product.genuine_size_prices;
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch(_) {} }
        if (parsed && typeof parsed === 'object') {
            const sizes = Object.keys(parsed).filter(k => k !== 'consumed_ml').map(Number).filter(n => !isNaN(n)).sort((a,b)=>a-b);
            for (const s of sizes) {
                const stock = getSizeStock(product, s, 'GENUINE');
                if (stock > 0) return { size: s, category: 'GENUINE' };
                if (!fallback) fallback = { size: s, category: 'GENUINE' };
            }
        }
    }
    // Try extract
    if (product.extract_size_prices) {
        let parsed = product.extract_size_prices;
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch(_) {} }
        if (parsed && typeof parsed === 'object') {
            const sizes = Object.keys(parsed).filter(k => k !== 'consumed_ml').map(Number).filter(n => !isNaN(n)).sort((a,b)=>a-b);
            for (const s of sizes) {
                const stock = getSizeStock(product, s, 'EXTRACT');
                if (stock > 0) return { size: s, category: 'EXTRACT' };
                if (!fallback) fallback = { size: s, category: 'EXTRACT' };
            }
        }
    }
    return fallback;
};

const isProductOutOfStock = (product) => {
    if (!product) return true;
    const hasGenuineStock = product.genuine_size_prices && readPerfumeSizes(product, 'GENUINE').some(s => getSizeStock(product, s, 'GENUINE') > 0);
    const hasExtractStock = product.extract_size_prices && readPerfumeSizes(product, 'EXTRACT').some(s => getSizeStock(product, s, 'EXTRACT') > 0);
    return !hasGenuineStock && !hasExtractStock;
};

const hasValidRemise = (product, size, categoryValue) => {
    if (size) {
        const sizeInfo = getSizeSpecificInfo(product, size, categoryValue);
        if (sizeInfo) {
            const basePrice = Number(sizeInfo.price);
            const hasRemiseValue = sizeInfo.remise !== null && sizeInfo.remise !== undefined && sizeInfo.remise !== '';
            const remisePrice = Number(sizeInfo.remise);
            return hasRemiseValue
                && Number.isFinite(basePrice)
                && Number.isFinite(remisePrice)
                && remisePrice > 0
                && remisePrice < basePrice;
        }
    }
    // Without size, we can't accurately check remise since price is in size_prices, but we return false to be safe
    return false;
};

const getEffectiveProductPrice = (product, size, categoryValue) => {
    if (size) {
        const sizeInfo = getSizeSpecificInfo(product, size, categoryValue);
        if (sizeInfo) {
            return hasValidRemise(product, size, categoryValue) ? Number(sizeInfo.remise) : Number(sizeInfo.price || 0);
        }
    }
    // Fallback: try to find the cheapest price across all sizes
    let lowestPrice = Infinity;
    ['GENUINE', 'EXTRACT'].forEach(cat => {
        const sizesField = cat === 'EXTRACT' ? product?.extract_size_prices : product?.genuine_size_prices;
        let parsed = sizesField;
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch(_) {}
        }
        if (parsed) {
            Object.values(parsed).forEach(info => {
                if (info && info.price) {
                    const price = Number(info.price);
                    if (price > 0 && price < lowestPrice) {
                        lowestPrice = price;
                    }
                }
            });
        }
    });
    return lowestPrice === Infinity ? 0 : lowestPrice;
};

const getBaseProductPrice = (product, size, categoryValue) => {
    if (size) {
        const sizeInfo = getSizeSpecificInfo(product, size, categoryValue);
        if (sizeInfo) {
            return Number(sizeInfo.price || 0);
        }
    }
    return 0;
};

const normalizeRemiseValue = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const USER_TOKEN_KEY = 'userToken';
const USER_PROFILE_KEY = 'userProfile';
const USER_SESSION_EVENT = 'user-session-changed';
const RECENTLY_VIEWED_KEY = 'recentlyViewedProducts';
const MAX_RECENTLY_VIEWED_PRODUCTS = 8;

const PERFUME_CATEGORIES = [
    { value: 'GENUINE', label: 'Authentique' },
    { value: 'EXTRACT', label: 'Extrait' },
];

const PERFUME_GENDERS = [
    { value: 'WOMEN', label: 'Femme' },
    { value: 'MEN', label: 'Homme' },
    { value: 'UNISEX', label: 'Unisexe' },
];

const PERFUME_SIZES = {
    GENUINE: [10, 20],
    EXTRACT: [50, 100],
};

const getSizeOptionsForCategory = (categoryValue) => {
    const normalizedCategory = String(categoryValue || 'all').toUpperCase();
    if (normalizedCategory === 'GENUINE') return PERFUME_SIZES.GENUINE;
    if (normalizedCategory === 'EXTRACT') return PERFUME_SIZES.EXTRACT;
    return [...new Set([...PERFUME_SIZES.GENUINE, ...PERFUME_SIZES.EXTRACT])].sort((a, b) => a - b);
};

const getPerfumeCategoryLabel = (value) => {
    const entry = PERFUME_CATEGORIES.find((item) => item.value === value);
    return entry ? entry.label : value || 'Inconnu';
};

const getPerfumeGenderLabel = (value) => {
    const entry = PERFUME_GENDERS.find((item) => item.value === value);
    return entry ? entry.label : value || 'Mixte';
};

const toRecentlyViewedEntry = (item) => {
    const id = Number(item?.id || 0);
    if (!Number.isFinite(id) || id <= 0) return null;

    return {
        id,
        title: String(item?.title || 'Product'),
        imageUrl: String(item?.imageUrl || item?.image_url || ''),
        price: Number(item?.price || 0),
        remise: item?.remise ?? null,
    };
};

const readRecentlyViewedProducts = () => {
    try {
        const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.map((item) => toRecentlyViewedEntry(item)).filter((item) => Boolean(item));
    } catch (_error) {
        return [];
    }
};

const rememberRecentlyViewedProduct = (item) => {
    const entry = toRecentlyViewedEntry(item);
    if (!entry) return;

    try {
        const existing = readRecentlyViewedProducts();
        const withoutCurrent = existing.filter(
            (candidate) => candidate.id !== entry.id
        );
        const nextItems = [entry, ...withoutCurrent].slice(0, MAX_RECENTLY_VIEWED_PRODUCTS);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(nextItems));
    } catch (_error) {
        // Best effort only; viewing should never fail if localStorage is blocked.
    }
};

const resolveStoreImageSrc = (item) => {
    const imageValue = String(item?.imageUrl || item?.image_url || '').trim();
    if (!imageValue) return '';

    if (/^https?:\/\//i.test(imageValue)) return imageValue;
    return resolveBackendFileUrl(imageValue);
};

const readPerfumeCategory = (product) => (
    product?.perfume_category
    || product?.perfumeCategory
    || ''
);

const readPerfumeGender = (product) => (
    product?.perfume_gender
    || product?.perfumeGender
    || ''
);

const readPerfumeSizes = (product, version) => {
    let sizesField = null;
    const extractField = product?.extract_size_prices;
    const genuineField = product?.genuine_size_prices;
    
    if (version) {
        const v = String(version).toUpperCase();
        sizesField = v === 'EXTRACT' ? extractField : genuineField;
        if (typeof sizesField === 'string') {
            try { sizesField = JSON.parse(sizesField); } catch(_) {}
        }
        if (sizesField) {
            return Object.keys(sizesField).map(Number).filter(n => !isNaN(n)).sort((a,b)=>a-b);
        }
        return [];
    }
    
    let sizes = [];
    [genuineField, extractField].forEach(field => {
        let parsed = field;
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch(_) {}
        }
        if (parsed) {
            sizes.push(...Object.keys(parsed).filter(k => k !== 'consumed_ml').map(Number).filter(n => !isNaN(n)));
        }
    });
    return [...new Set(sizes)].sort((a,b)=>a-b);
};

const readPerfumeSize = (product, version) => {
    const sizes = readPerfumeSizes(product, version);
    return sizes.length > 0 ? Math.min(...sizes) : null;
};

const readStoredUserProfile = () => {
    try {
        const raw = localStorage.getItem(USER_PROFILE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_error) {
        return null;
    }
};

const resolveUserDisplayName = (profile) => {
    const clean = (value) => (typeof value === 'string' ? value.trim() : '');

    const preferredName = clean(
        profile?.username
        || profile?.userName
        || profile?.name
        || profile?.fullName
        || profile?.displayName
    );

    if (preferredName && !preferredName.includes('@')) return preferredName;

    const emailValue = [profile?.email, preferredName]
        .map((value) => clean(value))
        .find((value) => value.includes('@'));

    if (emailValue) {
        const localPart = clean(emailValue.split('@')[0]);
        if (localPart) return localPart;
    }

    return 'User';
};

const clearUserSession = () => {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
};

const decodeJwtPayload = (token) => {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
        const decoded = typeof atob === 'function'
            ? atob(padded)
            : String.fromCharCode(...Uint8Array.from(Buffer.from(padded, 'base64')));
        return JSON.parse(decoded);
    } catch (_error) {
        return null;
    }
};

const getUserTokenExpiryMs = (token) => {
    const payload = decodeJwtPayload(token);
    const expiresAt = Number(payload?.exp);
    if (!Number.isFinite(expiresAt)) return null;
    return expiresAt * 1000;
};

const isUserTokenExpired = (token) => {
    const expiresAtMs = getUserTokenExpiryMs(token);
    return expiresAtMs !== null && expiresAtMs <= Date.now();
};

const getApiErrorMessage = (error, fallback) => {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;

    if (Array.isArray(detail) && detail.length > 0) {
        return detail
            .map((item) => item?.msg || item?.message || 'Invalid request')
            .join(' | ');
    }

    const results = error?.response?.data?.results;
    if (Array.isArray(results) && results.length > 0) {
        return results
            .map((item) => {
                const pathStr = Array.isArray(item.path) && item.path.length > 0 ? `${item.path[item.path.length - 1]}: ` : '';
                return `${pathStr}${item.message || 'Invalid request'}`;
            })
            .join(' | ');
    }

    if (typeof error?.response?.data?.message === 'string' && error.response.data.message.trim()) {
        return error.response.data.message;
    }

    return fallback;
};

const getPhoneHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;

const formatAttachmentSize = (sizeValue) => {
    const size = Number(sizeValue || 0);
    if (!Number.isFinite(size) || size <= 0) return '';

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageAttachment = (mimeType) => (
    typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('image/')
);

const StoreScopeBadge = () => {
    const label = 'Catalogue Parfums';

    return (
        <span className="store-scope-badge store-scope-badge-admin">
            {label}
        </span>
    );
};

const getStoreNavLinkClassName = ({ isActive }) => (
    `store-nav-link${isActive ? ' active' : ''}`
);

const getAdminNavLinkClassName = ({ isActive }) => (
    `admin-nav-link${isActive ? ' active' : ''}`
);

const ProductSkeletonCards = ({ count = 4 }) => (
    <>
        {Array.from({ length: count }).map((_, index) => (
            <div key={`skeleton-${index}`} className="product-card product-skeleton-card" aria-hidden="true">
                <div className="product-skeleton-media" />
                <div className="product-skeleton-line product-skeleton-line-title" />
                <div className="product-skeleton-line product-skeleton-line-sub" />
            </div>
        ))}
    </>
);

const StoreBreadcrumbs = ({ items = [] }) => {
    if (!Array.isArray(items) || items.length === 0) return null;

    return (
        <nav className="store-breadcrumbs" aria-label="Breadcrumb">
            {items.map((item, index) => (
                <React.Fragment key={`${item.label}-${index}`}>
                    {index > 0 && <ChevronRight size={14} />}
                    {item.to ? (
                        <Link to={item.to}>{item.label}</Link>
                    ) : (
                        <span aria-current="page">{item.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  const [isAdminMobileMenuOpen, setIsAdminMobileMenuOpen] = useState(false);

  if (!token) return <AdminLogin />;

  return (
    <div className="admin-shell">
      {/* Mobile Top Bar */}
      <div className="admin-mobile-topbar">
        <h2>AR Fragrance Admin</h2>
        <button
          className="admin-mobile-menu-toggle"
          onClick={() => setIsAdminMobileMenuOpen(!isAdminMobileMenuOpen)}
          aria-label="Toggle admin menu"
          aria-expanded={isAdminMobileMenuOpen}
        >
          {isAdminMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside className={`admin-sidebar ${isAdminMobileMenuOpen ? 'mobile-open' : ''}`}>
        <h2>AR Fragrance</h2>
        <nav>
          <NavLink end to="/admin" className={getAdminNavLinkClassName} onClick={() => setIsAdminMobileMenuOpen(false)}><LayoutDashboard size={18}/> Tableau de Bord</NavLink>
          <NavLink to="/admin/products" className={getAdminNavLinkClassName} onClick={() => setIsAdminMobileMenuOpen(false)}><Package size={18}/> Produits</NavLink>
          <NavLink to="/admin/orders" className={getAdminNavLinkClassName} onClick={() => setIsAdminMobileMenuOpen(false)}><ShoppingCart size={18}/> Commandes</NavLink>
          <NavLink to="/admin/chat" className={getAdminNavLinkClassName} onClick={() => setIsAdminMobileMenuOpen(false)}><MessageCircle size={18}/> Chat</NavLink>
        </nav>
        <button
          className="admin-logout-btn"
          onClick={() => { localStorage.removeItem('adminToken'); navigate('/admin'); setIsAdminMobileMenuOpen(false); }}
        >
          <LogOut size={18}/> Déconnexion
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

const AdminLogin = () => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const login = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await AdminAPI.login({ name, password });
            localStorage.setItem('adminToken', res.result.access_token);
            window.location.reload();
        } catch (_e) {
            setError('Connexion échouée. Vérifiez vos identifiants.');
        } finally {
            setIsLoading(false);
        }
    };
      return (
        <div className="auth-page">
            <div className="auth-form-wrap">
                <div className="auth-header">
                    <h2>Accès Administrateur</h2>
                    <p>Entrez vos identifiants pour gérer la boutique</p>
                </div>
                
                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={login} className="auth-form">
                    <div className="form-group">
                        <label>Nom d'utilisateur</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="luxury-input"
                            required
                            placeholder="Identifiant admin"
                        />
                    </div>
                    <div className="form-group">
                        <label>Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="luxury-input"
                            required
                            placeholder="Mot de passe admin"
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="luxury-btn luxury-btn-primary" style={{ width: '100%' }}>
                        {isLoading ? 'Authentification...' : 'Se Connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
};
const StoreLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState(() => readStoredUserProfile());
  const [hasUserToken, setHasUserToken] = useState(() => Boolean(localStorage.getItem(USER_TOKEN_KEY)));
  const [searchIndex, setSearchIndex] = useState([]);
  const [headerSearchTerm, setHeaderSearchTerm] = useState('');
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerSearchRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const storeNavRef = useRef(null);

  // Cart state initialized from localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('arFragranceCart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null); // { items: [...], isDirectBuy: boolean } or null
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      shippingAddress: '',
      city: '',
      postalCode: ''
  });
  const [formErrors, setFormErrors] = useState({});


  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('arFragranceCart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cart]);

  // Pre-fill checkout form if user profile exists
  useEffect(() => {
      if (userProfile) {
          setCheckoutForm({
              customerName: userProfile.fullName || userProfile.name || '',
              customerEmail: userProfile.email || '',
              customerPhone: userProfile.phone || '',
              shippingAddress: userProfile.address || '',
              city: userProfile.city || '',
              postalCode: userProfile.postalCode || ''
          });
      }
  }, [userProfile]);

  // Synchronize cart with latest stock levels from the database on slide cart open
  useEffect(() => {
    if (isCartDrawerOpen) {
      ProductsAPI.getProducts()
        .then((res) => {
          if (!res || !Array.isArray(res.result)) return;
          const latestProducts = res.result;

          setCart((prevCart) => {
            let changed = false;
            let changesExplanation = [];

            const updatedCart = prevCart.map((item) => {
              const latestProduct = latestProducts.find(p => p.id === item.product?.id);
              if (!latestProduct) {
                if (item.quantity > 0) {
                  changed = true;
                  changesExplanation.push(`${item.product?.title || 'Produit'} (${item.size}ml) n'est plus disponible.`);
                  return { ...item, quantity: 0 };
                }
                return item;
              }

              const availableStock = getSizeStock(latestProduct, item.size, item.category);
              if (item.quantity > availableStock) {
                changed = true;
                if (availableStock === 0) {
                  changesExplanation.push(`"${latestProduct.title}" (${item.size}ml) est désormais épuisé.`);
                } else {
                  changesExplanation.push(`Le stock pour "${latestProduct.title}" (${item.size}ml) est limité à ${availableStock} unités.`);
                }
                return {
                  ...item,
                  product: latestProduct,
                  quantity: availableStock
                };
              } else {
                // Keep latest product prices and details synced
                return {
                  ...item,
                  product: latestProduct
                };
              }
            });

            if (changed) {
              toast.info(`Mise à jour du panier : ${changesExplanation.join(' ')}`);
            }
            return updatedCart;
          });
        })
        .catch((err) => {
          console.error("Erreur de synchronisation du panier :", err);
        });
    }
  }, [isCartDrawerOpen]);

  // Unique key for each cart item combination of product_id, size, category, gender
  const getCartItemKey = (productId, category, gender, size) => {
    return `${productId}-${category || 'all'}-${gender || 'all'}-${size || 'all'}`;
  };

  const addToCart = (product, quantity, size, categoryValue) => {
    const finalSize = size || readPerfumeSize(product);
    const category = String(categoryValue || getCategoryForSize(finalSize)).toUpperCase();
    const gender = String(readPerfumeGender(product) || '').toUpperCase();
    const key = getCartItemKey(product.id, category, gender, finalSize);

    const maxStock = getSizeStock(product, finalSize, category);
    const qtyNum = Number(quantity);

    const existingItem = cart.find((item) => item.key === key);
    const currentQty = existingItem ? Number(existingItem.quantity || 0) : 0;
    const newQty = currentQty + qtyNum;

    const stockExceeded = newQty > maxStock;
    if (stockExceeded) {
      toast.error(`Désolé, seulement ${maxStock} unité(s) disponible(s) pour la taille ${finalSize}ml.`);
    }

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.key === key);
      if (existingItemIndex > -1) {
        return prevCart.map((item, index) => {
          if (index === existingItemIndex) {
            const targetQty = stockExceeded ? maxStock : newQty;
            return { ...item, quantity: targetQty };
          }
          return item;
        });
      } else {
        const targetQty = stockExceeded ? maxStock : qtyNum;
        return [...prevCart, {
          key,
          product,
          quantity: targetQty,
          category,
          gender,
          size: finalSize
        }];
      }
    });

    if (!stockExceeded) {
      setIsCartDrawerOpen(true);
    }
  };

  const removeFromCart = (itemKey) => {
    setCart((prevCart) => prevCart.filter((item) => item.key !== itemKey));
  };

  const updateCartQuantity = (itemKey, newQuantity) => {
    const qtyNum = Number(newQuantity);
    if (qtyNum <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.key === itemKey) {
          const maxStock = getSizeStock(item.product, item.size, item.category);
          if (qtyNum > maxStock) {
              toast.error(`Désolé, seulement ${maxStock} unité(s) disponible(s) pour la taille ${item.size}ml.`);
              return { ...item, quantity: maxStock };
          }
          return { ...item, quantity: qtyNum };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => {
    const price = getEffectiveProductPrice(item.product, item.size, item.category);
    return total + price * item.quantity;
  }, 0);

  const closeCheckoutModal = () => {
      setCheckoutData(null);
      setCheckoutSuccess(false);
      setCheckoutError('');
      setFormErrors({});
  };

  const handleCheckoutSubmit = async (e) => {
      e.preventDefault();
      setCheckoutError('');
      setFormErrors({});
      
      // Client-side luxury validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^(?:\+216|00216)?[23459]\d{7}$/;

      const errors = {};
      if (!checkoutForm.customerName?.trim()) {
          errors.customerName = "Veuillez saisir votre nom complet.";
      }
      if (!checkoutForm.customerEmail?.trim()) {
          errors.customerEmail = "Veuillez saisir votre adresse e-mail.";
      } else if (!emailRegex.test(checkoutForm.customerEmail.trim())) {
          errors.customerEmail = "Veuillez entrer une adresse e-mail valide.";
      }
      
      const rawPhone = checkoutForm.customerPhone?.trim().replace(/[\s.-]+/g, '');
      if (!rawPhone) {
          errors.customerPhone = "Veuillez saisir votre numéro de téléphone.";
      } else if (!phoneRegex.test(rawPhone)) {
          errors.customerPhone = "Le numéro de téléphone doit être un numéro tunisien valide à 8 chiffres (ex: 98123456).";
      }
      if (!checkoutForm.shippingAddress?.trim()) {
          errors.shippingAddress = "Veuillez saisir votre adresse de livraison.";
      }
      if (!checkoutForm.city?.trim()) {
          errors.city = "Veuillez saisir votre ville.";
      }
      
      const cleanPostal = checkoutForm.postalCode?.trim();
      if (!cleanPostal) {
          errors.postalCode = "Veuillez saisir votre code postal.";
      } else if (!/^\d{4,5}$/.test(cleanPostal)) {
          errors.postalCode = "Le code postal doit être composé de 4 ou 5 chiffres (ex: 1000).";
      }

      if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          setCheckoutError("Veuillez corriger les erreurs de validation.");
          return;
      }

      setIsCheckoutSubmitting(true);

      try {
          const payloadItems = checkoutData.items.map((item) => {
              let category = String(item.category || readPerfumeCategory(item.product) || '').toUpperCase();
              if (category === 'AUTHENTIQUE' || category === 'AUTHENTIC') category = 'GENUINE';
              if (category === 'EXTRAIT') category = 'EXTRACT';

              let gender = String(item.gender || readPerfumeGender(item.product) || '').toUpperCase();
              if (gender === 'FEMME') gender = 'WOMEN';
              if (gender === 'HOMME') gender = 'MEN';
              if (gender === 'UNISEXE' || gender === 'MIXTE') gender = 'UNISEX';

              const sizeRaw = item.size ?? readPerfumeSize(item.product);
              const size_ml = Number.isFinite(Number(sizeRaw)) && Number(sizeRaw) > 0 ? Number(sizeRaw) : null;
              
              return {
                  product_id: Number(item.product.id),
                  quantity: Number(item.quantity),
                  perfume_category: category || undefined,
                  perfume_gender: gender || undefined,
                  size_ml,
              };
          });

          const orderPayload = {
              customer_name: checkoutForm.customerName?.trim(),
              customer_email: checkoutForm.customerEmail?.trim(),
              customer_phone: rawPhone, // Cleaned phone number
              shipping_address: checkoutForm.shippingAddress?.trim(),
              city: checkoutForm.city?.trim(),
              postal_code: cleanPostal,
              items: payloadItems,
          };

          console.debug('[Checkout] Sending order payload:', JSON.stringify(orderPayload, null, 2));

          await OrdersAPI.createOrder({ order_payload: orderPayload });

          setCheckoutSuccess(true);
          
          if (!checkoutData.isDirectBuy) {
              clearCart();
          }
      } catch (err) {
          console.error('Checkout failed', err);
          console.error('Backend response:', err?.response?.data);

          const responseData = err?.response?.data;
          const backendErrors = {};

          const getFrenchFieldKey = (path) => {
              switch(String(path).toLowerCase()) {
                  case 'customer_name':
                  case 'customername':
                      return 'customerName';
                  case 'customer_email':
                  case 'customeremail':
                      return 'customerEmail';
                  case 'customer_phone':
                  case 'customerphone':
                      return 'customerPhone';
                  case 'shipping_address':
                  case 'shippingaddress':
                      return 'shippingAddress';
                  case 'city':
                      return 'city';
                  case 'postal_code':
                  case 'postalcode':
                      return 'postalCode';
                  default:
                      return null;
              }
          };

          const translateMsg = (msg) => {
              if (!msg) return "";
              const lower = msg.toLowerCase();
              if (lower.includes('tunisian number') || lower.includes('phone number') || lower.includes('téléphone')) {
                  return "Le numéro doit être un numéro tunisien valide à 8 chiffres (ex: 98123456).";
              }
              if (lower.includes('tunisian postal code') || lower.includes('postal code') || lower.includes('code postal')) {
                  return "Le code postal doit être composé de 4 ou 5 chiffres (ex: 1000).";
              }
              if (lower.includes('valid email') || lower.includes('email') || lower.includes('e-mail')) {
                  return "L'adresse e-mail n'est pas valide.";
              }
              if (lower.includes('field required') || lower.includes('missing') || lower.includes('obligatoire') || lower.includes('required')) {
                  return "Ce champ est obligatoire.";
              }
              if (lower.includes('out of stock') || lower.includes('épuisé') || lower.includes('stock')) {
                  return "Certains articles sont en rupture de stock.";
              }
              return msg;
          };

          if (responseData?.results && Array.isArray(responseData.results) && responseData.results.length > 0) {
              responseData.results.forEach((item) => {
                  const field = Array.isArray(item.path) && item.path.length > 0
                      ? item.path[item.path.length - 1]
                      : null;
                  const key = getFrenchFieldKey(field);
                  const translated = translateMsg(item.message || '');
                  if (key) {
                      backendErrors[key] = translated;
                  } else {
                      setCheckoutError(prev => prev ? `${prev} | ${translated}` : translated);
                  }
              });
          } else if (responseData?.detail && Array.isArray(responseData.detail)) {
              responseData.detail.forEach((item) => {
                  const field = Array.isArray(item.loc) && item.loc.length > 0
                      ? item.loc[item.loc.length - 1]
                      : null;
                  const key = getFrenchFieldKey(field);
                  const translated = translateMsg(item.msg || '');
                  if (key) {
                      backendErrors[key] = translated;
                  } else {
                      setCheckoutError(prev => prev ? `${prev} | ${translated}` : translated);
                  }
              });
          } else if (typeof responseData?.detail === 'string') {
              const str = responseData.detail;
              if (str.includes(':')) {
                  const parts = str.split(':');
                  const field = parts[0].trim();
                  const rest = parts.slice(1).join(':').trim();
                  const key = getFrenchFieldKey(field);
                  const translated = translateMsg(rest);
                  if (key) {
                      backendErrors[key] = translated;
                  } else {
                      setCheckoutError(translated);
                  }
              } else {
                  setCheckoutError(translateMsg(str));
              }
          } else if (typeof responseData?.message === 'string' && responseData.message.trim()) {
              const str = responseData.message;
              if (str.includes(':')) {
                  const parts = str.split(':');
                  const field = parts[0].trim();
                  const rest = parts.slice(1).join(':').trim();
                  const key = getFrenchFieldKey(field);
                  const translated = translateMsg(rest);
                  if (key) {
                      backendErrors[key] = translated;
                  } else {
                      setCheckoutError(translated);
                  }
              } else {
                  setCheckoutError(translateMsg(str));
              }
          } else {
              setCheckoutError('La commande a échoué. Veuillez vérifier vos informations.');
          }

          if (Object.keys(backendErrors).length > 0) {
              setFormErrors(backendErrors);
              setCheckoutError("Veuillez corriger les erreurs de validation.");
          }
      } finally {
          setIsCheckoutSubmitting(false);
      }
  };

  useEffect(() => {
      const syncSession = () => {
          setUserProfile(readStoredUserProfile());
          setHasUserToken(Boolean(localStorage.getItem(USER_TOKEN_KEY)));
      };

      window.addEventListener('storage', syncSession);
      window.addEventListener(USER_SESSION_EVENT, syncSession);
      syncSession();

      return () => {
          window.removeEventListener('storage', syncSession);
          window.removeEventListener(USER_SESSION_EVENT, syncSession);
      };
  }, []);

  useEffect(() => {
      if (!hasUserToken) return;

      const token = localStorage.getItem(USER_TOKEN_KEY);
      if (!token) {
          clearUserSession();
          window.dispatchEvent(new Event(USER_SESSION_EVENT));
          setUserProfile(null);
          setHasUserToken(false);
          navigate('/auth');
          return;
      }

      const expiresAtMs = getUserTokenExpiryMs(token);
      if (!expiresAtMs) return;

      const timeUntilExpiry = expiresAtMs - Date.now();
      if (timeUntilExpiry <= 0) {
          clearUserSession();
          window.dispatchEvent(new Event(USER_SESSION_EVENT));
          setUserProfile(null);
          setHasUserToken(false);
          navigate('/auth');
          return;
      }

      const timeoutId = window.setTimeout(() => {
          clearUserSession();
          window.dispatchEvent(new Event(USER_SESSION_EVENT));
          setUserProfile(null);
          setHasUserToken(false);
          navigate('/auth');
      }, timeUntilExpiry);

      return () => window.clearTimeout(timeoutId);
  }, [hasUserToken, navigate]);

  useEffect(() => {
      setIsMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
      const handleViewportResize = () => {
          if (window.innerWidth > 1024) {
              setIsMobileNavOpen(false);
          }
      };

      window.addEventListener('resize', handleViewportResize);
      return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
      let isMounted = true;

      Promise.all([
          ProductsAPI.getProducts().catch(() => ({ result: [] })),
      ]).then(([productsResponse]) => {
          if (!isMounted) return;

          const adminProducts = (Array.isArray(productsResponse?.result) ? productsResponse.result : [])
              .filter((item) => item?.availability !== false)
              .map((item) => ({
                  id: Number(item.id),
                  title: item.title,
                  to: `/products/${item.id}`,
              }));

          setSearchIndex(adminProducts);
      });

      return () => {
          isMounted = false;
      };
  }, []);

  useEffect(() => {
      const handleOutsideClick = (event) => {
          if (headerSearchRef.current && !headerSearchRef.current.contains(event.target)) {
              setIsHeaderSearchOpen(false);
          }
          if (
              storeNavRef.current
              && mobileMenuButtonRef.current
              && !storeNavRef.current.contains(event.target)
              && !mobileMenuButtonRef.current.contains(event.target)
          ) {
              setIsMobileNavOpen(false);
          }
      };

      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleUserLogout = (redirectTo = '/') => {
      clearUserSession();
      window.dispatchEvent(new Event(USER_SESSION_EVENT));
      setUserProfile(null);
      setHasUserToken(false);
      navigate(typeof redirectTo === 'string' ? redirectTo : '/');
  };

  const handleHeaderSearchSubmit = (event) => {
      event.preventDefault();

      const normalizedTerm = headerSearchTerm.trim();
      if (!normalizedTerm) {
          navigate('/products');
          setIsHeaderSearchOpen(false);
          return;
      }

      if (filteredHeaderSuggestions.length > 0) {
          navigate(filteredHeaderSuggestions[0].to);
      } else {
          navigate(`/products?q=${encodeURIComponent(normalizedTerm)}`);
      }

      setHeaderSearchTerm('');
      setIsHeaderSearchOpen(false);
  };

  const handleSuggestionSelect = (path) => {
      setHeaderSearchTerm('');
      setIsHeaderSearchOpen(false);
      navigate(path);
  };

  const handleMobileNavLinkClick = () => {
      setIsMobileNavOpen(false);
  };

  useEffect(() => {
      const handleScroll = () => {
          setIsScrolled(window.scrollY > 50);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHeaderScrolled = location.pathname !== '/' || isScrolled;

  return (
    <div className="store-shell">
      <header className={`store-header ${isHeaderScrolled ? 'scrolled' : ''}`}>
        <Link className="store-brand-link" to="/"><h1>AR Fragrance</h1></Link>
        
        {/* Desktop Navigation */}
        <nav className="store-header-actions desktop-nav">
          <NavLink to="/products" className="header-icon-btn">
            Collection
          </NavLink>
          
          <NavLink to="/products?perfume_gender=WOMEN" className="header-icon-btn">
            Femme
          </NavLink>
          <NavLink to="/products?perfume_gender=MEN" className="header-icon-btn">
            Homme
          </NavLink>
          

          {hasUserToken ? (
            <button
              className="header-icon-btn"
              onClick={handleUserLogout}
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <NavLink
              to="/auth"
              className="header-icon-btn"
              title="Mon compte"
              aria-label="Mon compte"
            >
              <UserRound size={20} />
            </NavLink>
          )}
          
          {/* Shopping Cart Button */}
          <button 
            className="header-icon-btn cart-trigger-btn" 
            onClick={() => setIsCartDrawerOpen(true)}
            title="Panier"
            aria-label="Ouvrir le panier"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </nav>

        {/* Mobile Actions Header area */}
        <div className="mobile-header-actions" style={{ display: 'none' }}>
          <button 
            className="header-icon-btn cart-trigger-btn mobile-cart-btn" 
            onClick={() => setIsCartDrawerOpen(true)}
            aria-label="Ouvrir le panier"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          
          <button
            ref={mobileMenuButtonRef}
            className="mobile-menu-toggle-btn"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label="Ouvrir le menu"
            aria-expanded={isMobileNavOpen}
          >
            {isMobileNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-nav-overlay ${isMobileNavOpen ? 'active' : ''}`} onClick={() => setIsMobileNavOpen(false)} />
        <div
          ref={storeNavRef}
          className={`store-mobile-nav ${isMobileNavOpen ? 'open' : ''}`}
        >
          <nav className="store-mobile-nav-links">
            <button 
              className="mobile-nav-link-btn" 
              onClick={() => { setIsCartDrawerOpen(true); setIsMobileNavOpen(false); }}
              style={{ color: 'var(--text-primary)', borderBottom: '1px solid #ffffff0d', width: '100%', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}
            >
              <ShoppingCart size={18} style={{ marginRight: '8px' }} /> Panier ({cartCount})
            </button>
            <NavLink to="/products" className="mobile-nav-link" onClick={handleMobileNavLinkClick}>
              Collection
            </NavLink>
            <NavLink to="/products?perfume_gender=WOMEN" className="mobile-nav-link" onClick={handleMobileNavLinkClick}>
              Femme
            </NavLink>
            <NavLink to="/products?perfume_gender=MEN" className="mobile-nav-link" onClick={handleMobileNavLinkClick}>
              Homme
            </NavLink>

            {hasUserToken ? (
              <button className="mobile-nav-link-btn" onClick={() => { handleUserLogout(); handleMobileNavLinkClick(); }}>
                <LogOut size={18} /> Déconnexion
              </button>
            ) : (
              <NavLink to="/auth" className="mobile-nav-link" onClick={handleMobileNavLinkClick}>
                Mon Compte
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="store-main">
        <Outlet context={{ 
          cart, 
          addToCart, 
          removeFromCart, 
          updateCartQuantity, 
          clearCart,
          isCartDrawerOpen,
          setIsCartDrawerOpen,
          setCheckoutData,
          cartCount,
          cartSubtotal
        }} />
      </main>
      <FloatingChatWidget />
      <footer className="store-footer">
        <div className="footer-container">
          <div className="footer-col footer-col-brand">
            <h3 className="footer-brand-name">AR FRAGRANCE</h3>
            <p className="footer-brand-tagline">
              L'excellence de la haute parfumerie en Tunisie. Des fragrances d'exception 100% authentiques et originales, sélectionnées pour révéler votre signature unique.
            </p>
          </div>
          
          <div className="footer-col">
            <h4 className="footer-col-title">Contact</h4>
            <ul className="footer-links">
              <li>
                <span className="footer-link-label">Téléphone :</span>{' '}
                <a href="tel:25926664" className="footer-link-val">25 926 664</a>
              </li>
              <li>
                <span className="footer-link-label">Email :</span>{' '}
                <a href="mailto:arfragrance60@gmail.com" className="footer-link-val">arfragrance60@gmail.com</a>
              </li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4 className="footer-col-title">Suivez-nous</h4>
            <div className="footer-social-icons">
              <a href="https://www.instagram.com/arfragrance.perfumes/" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Instagram">
                Instagram
              </a>
              <a href="https://www.facebook.com/profile.php?id=61590843067562" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Facebook">
                Facebook
              </a>
              <a href="https://www.tiktok.com/@arfragrance.perfumes" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="TikTok">
                TikTok
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Slide-Over Cart Drawer ── */}
      <div className={`cart-drawer-overlay ${isCartDrawerOpen ? 'active' : ''}`} onClick={() => setIsCartDrawerOpen(false)} />
      
      <div className={`cart-drawer ${isCartDrawerOpen ? 'open' : ''}`} inert={!isCartDrawerOpen ? true : undefined}>
        <div className="cart-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={20} className="gold-icon" />
            <h2>Votre Panier</h2>
            <span className="cart-item-count">({cartCount})</span>
          </div>
          <button className="cart-drawer-close" onClick={() => setIsCartDrawerOpen(false)} aria-label="Fermer le panier">
            <X size={20} />
          </button>
        </div>

        <div className="cart-drawer-content">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: '1.25rem' }} />
              <p>Votre panier est vide</p>
              <button className="luxury-btn" style={{ marginTop: '1.5rem', fontSize: '0.75rem' }} onClick={() => setIsCartDrawerOpen(false)}>
                Continuer vos achats
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map((item) => {
                const itemPrice = getEffectiveProductPrice(item.product, item.size);
                return (
                  <div key={item.key} className="cart-item-card">
                    <Link 
                      to={`/products/${item.product.id}`} 
                      className="cart-item-image"
                      onClick={() => setIsCartDrawerOpen(false)}
                    >
                      {resolveStoreImageSrc(item.product) ? (
                        <img src={resolveStoreImageSrc(item.product)} alt={item.product.title} />
                      ) : (
                        <Package size={24} color="var(--text-secondary)" />
                      )}
                    </Link>
                    
                    <div className="cart-item-details">
                      <div className="cart-item-row">
                        <Link 
                          to={`/products/${item.product.id}`} 
                          className="cart-item-title-link"
                          onClick={() => setIsCartDrawerOpen(false)}
                        >
                          <h4 className="cart-item-title">{item.product.title}</h4>
                        </Link>
                        <button 
                          className="cart-item-remove" 
                          onClick={() => removeFromCart(item.key)}
                          title="Retirer l'article"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <p className="cart-item-meta">
                        {getPerfumeGenderLabel(item.gender)} • {getPerfumeCategoryLabel(item.category)} • {item.size} ml
                      </p>
                      
                      <div className="cart-item-footer">
                        <div className="quantity-selector-mini">
                          <button onClick={() => updateCartQuantity(item.key, item.quantity - 1)}>-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.key, item.quantity + 1)}>+</button>
                        </div>
                        <span className="cart-item-price">{(itemPrice * item.quantity).toFixed(0)} TND</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-row">
              <span>Sous-total</span>
              <span className="cart-summary-total">{cartSubtotal.toFixed(0)} TND</span>
            </div>
            <p className="cart-vat-note">Frais de livraison calculés à l'étape suivante.</p>
            <button 
              className="luxury-btn luxury-btn-primary cart-checkout-btn"
              onClick={() => {
                const activeItems = cart.filter(item => item.quantity > 0);
                if (activeItems.length === 0) {
                  toast.error("Aucun produit en stock disponible dans le panier.");
                  return;
                }
                setIsCartDrawerOpen(false);
                setCheckoutData({ items: activeItems, isDirectBuy: false });
              }}
            >
              Passer la Commande
            </button>
          </div>
        )}
      </div>

      {/* ── Checkout Modal ── */}
      {checkoutData && (
        <div 
          className="order-modal-overlay" 
          onMouseDown={(e) => {
              e.currentTarget.dataset.mouseDownTarget = e.target === e.currentTarget ? 'overlay' : 'content';
          }}
          onClick={(e) => {
              if (e.target === e.currentTarget && e.currentTarget.dataset.mouseDownTarget === 'overlay') {
                  closeCheckoutModal();
              }
          }}
        >
          <div className="order-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeCheckoutModal}>
              <X size={20} />
            </button>
            
            {checkoutSuccess ? (
              <div className="checkout-success-view" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div className="checkout-success-icon" style={{ fontSize: '3.5rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>✓</div>
                <h2 className="modal-title" style={{ marginBottom: '1rem' }}>Commande Confirmée !</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '2rem' }}>
                  Merci pour votre confiance. Votre commande a été enregistrée avec succès. Notre équipe vous contactera par téléphone pour confirmer les détails de la livraison.
                </p>
                <button className="luxury-btn luxury-btn-primary" onClick={closeCheckoutModal} style={{ width: '100%' }}>
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <h2 className="modal-title">Finaliser votre Commande</h2>
                <p className="modal-subtitle">
                  {checkoutData.isDirectBuy 
                    ? `Vous achetez 1 parfum (${checkoutData.items[0].product.title})`
                    : `Vous commandez ${cartCount} article(s) dans votre panier`
                  }
                  {' — '}
                  <strong>
                    {(checkoutData.isDirectBuy 
                      ? (getEffectiveProductPrice(checkoutData.items[0].product, checkoutData.items[0].size) * checkoutData.items[0].quantity)
                      : cartSubtotal
                    ).toFixed(0)} TND
                  </strong>
                </p>
                
                <form onSubmit={handleCheckoutSubmit} className="order-modal-form" noValidate>
                  {checkoutError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{checkoutError}</div>}

                  <div className="form-group">
                    <label className="luxury-label">Nom complet *</label>
                    <input className={`luxury-input ${formErrors.customerName ? 'error' : ''}`} required placeholder="Votre nom complet"
                      value={checkoutForm.customerName} onChange={e => setCheckoutForm(p => ({ ...p, customerName: e.target.value }))} />
                    {formErrors.customerName && <span className="field-error-message">{formErrors.customerName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="luxury-label">E-mail *</label>
                    <input type="email" className={`luxury-input ${formErrors.customerEmail ? 'error' : ''}`} required placeholder="votre@email.com"
                      value={checkoutForm.customerEmail} onChange={e => setCheckoutForm(p => ({ ...p, customerEmail: e.target.value }))} />
                    {formErrors.customerEmail && <span className="field-error-message">{formErrors.customerEmail}</span>}
                  </div>
                  <div className="form-group">
                    <label className="luxury-label">Téléphone *</label>
                    <input className={`luxury-input ${formErrors.customerPhone ? 'error' : ''}`} required placeholder="+216 xx xxx xxx"
                      value={checkoutForm.customerPhone} onChange={e => setCheckoutForm(p => ({ ...p, customerPhone: e.target.value }))} />
                    {formErrors.customerPhone && <span className="field-error-message">{formErrors.customerPhone}</span>}
                  </div>
                  <div className="form-group">
                    <label className="luxury-label">Adresse de livraison *</label>
                    <input className={`luxury-input ${formErrors.shippingAddress ? 'error' : ''}`} required placeholder="Adresse exacte"
                      value={checkoutForm.shippingAddress} onChange={e => setCheckoutForm(p => ({ ...p, shippingAddress: e.target.value }))} />
                    {formErrors.shippingAddress && <span className="field-error-message">{formErrors.shippingAddress}</span>}
                  </div>
                  <div className="postal-city-row">
                    <div className="form-group">
                      <label className="luxury-label">Ville *</label>
                      <input className={`luxury-input ${formErrors.city ? 'error' : ''}`} required placeholder="Ville"
                        value={checkoutForm.city} onChange={e => setCheckoutForm(p => ({ ...p, city: e.target.value }))} />
                      {formErrors.city && <span className="field-error-message">{formErrors.city}</span>}
                    </div>
                    <div className="form-group">
                      <label className="luxury-label">Code postal *</label>
                      <input className={`luxury-input ${formErrors.postalCode ? 'error' : ''}`} required placeholder="Ex: 1000" pattern="[0-9]{4,5}"
                        title="Code postal tunisien à 4 chiffres (ex: 1000, 2000, 3000)"
                        value={checkoutForm.postalCode} onChange={e => setCheckoutForm(p => ({ ...p, postalCode: e.target.value }))} />
                      {formErrors.postalCode && <span className="field-error-message">{formErrors.postalCode}</span>}
                      <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                        Code à 4 chiffres (ex: 1000 Tunis, 2000 Sfax, 3000 Sousse)
                      </small>
                    </div>
                  </div>
                  
                  <div className="checkout-modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="submit" disabled={isCheckoutSubmitting} className="luxury-btn luxury-btn-primary" style={{ flex: '1 1 100%', padding: '1rem' }}>
                      {isCheckoutSubmitting ? 'Traitement...' : `Confirmer — ${(checkoutData.isDirectBuy 
                        ? (getEffectiveProductPrice(checkoutData.items[0].product, checkoutData.items[0].size) * checkoutData.items[0].quantity)
                        : cartSubtotal
                      ).toFixed(0)} TND`}
                    </button>
                    <button type="button" onClick={closeCheckoutModal} disabled={isCheckoutSubmitting} className="luxury-btn" style={{ flex: '1 1 100%', padding: '1rem' }}>
                      Annuler
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FloatingChatWidget = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [draftMessage, setDraftMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [chatError, setChatError] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const endRef = useRef(null);
    const inputRef = useRef(null);
    const stoppedRef = useRef(false);
    const hasUserToken = Boolean(localStorage.getItem(USER_TOKEN_KEY));

    const loadConversation = async (silent = false) => {
        if (stoppedRef.current) return;
        if (!silent) setIsLoading(true);
        try {
            const response = await ChatAPI.getUserConversation();
            const conv = response?.result || null;
            setConversation(conv);
            if (conv?.messages) {
                const unread = conv.messages.filter(m => m.senderRole !== 'USER' && !m.isRead).length;
                setUnreadCount(unread);
            }
            setChatError('');
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                // Stop all further polling immediately and clear invalid session
                stoppedRef.current = true;
                setChatError('');
                localStorage.removeItem(USER_TOKEN_KEY);
                window.dispatchEvent(new Event(USER_SESSION_EVENT));
                return;
            }
            if (!silent) setChatError('Could not load chat.');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!hasUserToken) return;
        loadConversation();
        const id = window.setInterval(() => loadConversation(true), 8000);
        return () => window.clearInterval(id);
    }, [hasUserToken]);

    const msgCount = conversation?.messages?.length || 0;
    useEffect(() => {
        if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgCount, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        const body = draftMessage.trim();
        if (!body || isSending) return;
        setIsSending(true);
        try {
            const response = await ChatAPI.sendUserMessage({ body });
            setConversation(response?.result || conversation);
            setDraftMessage('');
            setChatError('');
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                stoppedRef.current = true;
                setChatError('Session expired. Please log in again.');
                localStorage.removeItem(USER_TOKEN_KEY);
                window.dispatchEvent(new Event(USER_SESSION_EVENT));
            } else {
                setChatError('Failed to send message.');
            }
        } finally {
            setIsSending(false);
        }
    };

    const messages = conversation?.messages || [];
    const isClosed = conversation?.isClosed;

    return (
        <div className="float-chat-root">
            <div className={`float-chat-panel ${isOpen ? 'float-chat-panel-open' : ''}`}>
                <div className="float-chat-panel-header">
                    <div className="float-chat-status-dot" />
                    <div style={{ flex: 1 }}>
                        <div className="float-chat-panel-title">AR Fragrance Support</div>
                        <div className="float-chat-panel-sub">{isClosed ? 'Discussion fermée' : 'Nous répondons en quelques minutes'}</div>
                    </div>
                    <button className="float-chat-close-btn" onClick={() => setIsOpen(false)} aria-label="Fermer le chat">
                        <X size={16} />
                    </button>
                </div>

                <div className="float-chat-messages">
                    {!hasUserToken ? (
                        <div className="float-chat-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <MessageCircle size={36} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
                            <p>Connectez-vous pour nous écrire</p>
                            <button
                                onClick={() => { setIsOpen(false); navigate('/auth'); }}
                                className="luxury-btn luxury-btn-primary"
                                style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
                            >
                                Se Connecter
                            </button>
                        </div>
                    ) : isLoading ? (
                        <p className="float-chat-empty">Chargement...</p>
                    ) : messages.length === 0 ? (
                        <div className="float-chat-empty">
                            <MessageCircle size={36} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
                            <p>Aucun message pour l'instant.</p>
                            <p style={{ fontSize: '0.78rem', marginTop: '0.25rem', opacity: 0.7 }}>Nous vous répondrons dès que possible.</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isUser = msg.senderRole === 'USER';
                            return (
                                <div key={msg.id} className={`float-bubble ${isUser ? 'float-bubble-user' : 'float-bubble-admin'}`}>
                                    {!isUser && <div className="float-bubble-name">{msg.senderName || 'Support'}</div>}
                                    {msg.body && <p className="float-bubble-body">{msg.body}</p>}
                                    {msg.attachmentUrl && (
                                        <a href={resolveBackendFileUrl(msg.attachmentUrl)} target="_blank" rel="noreferrer" className="float-bubble-attach">
                                            <Paperclip size={12} /> {msg.attachmentName || 'Attachment'}
                                        </a>
                                    )}
                                    {isUser && msg.isRead && <span className="float-bubble-seen">✓ Lu</span>}
                                </div>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>

                {hasUserToken && chatError && <p className="float-chat-error">{chatError}</p>}

                {hasUserToken && (
                    <form onSubmit={handleSend} className="float-chat-form">
                        <input
                            ref={inputRef}
                            type="text"
                            value={draftMessage}
                            onChange={(e) => setDraftMessage(e.target.value)}
                            placeholder={isClosed ? 'Discussion fermée' : 'Votre message...'}
                            disabled={isSending || isClosed}
                            className="float-chat-input"
                            maxLength={2000}
                        />
                        <button type="submit" disabled={isSending || !draftMessage.trim() || isClosed} className="float-chat-send-btn" aria-label="Send">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                        </button>
                    </form>
                )}
            </div>

            <button className="float-chat-trigger" onClick={() => setIsOpen(v => !v)} aria-label="Open support chat">
                {isOpen ? <X size={22} /> : (
                    <>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {unreadCount > 0 && <span className="float-chat-badge">{unreadCount}</span>}
                    </>
                )}
            </button>
        </div>
    );
}

const BRANDS_DATA = [
    { name: 'CHANEL', query: 'Chanel', fontClass: 'brand-chanel' },
    { name: 'VALENTINO', query: 'Valentino', fontClass: 'brand-dior' },
    { name: 'LANCÔME', query: 'Lancôme', fontClass: 'brand-creed' },
    { name: 'YVES SAINT LAURENT', query: 'Yves Saint Laurent', fontClass: 'brand-chanel' },
    { name: 'NARCISO RODRIGUEZ', query: 'Narciso Rodriguez', fontClass: 'brand-versace' },
    { name: 'GIORGIO ARMANI', query: 'Giorgio Armani', fontClass: 'brand-tomford' },
    { name: 'JEAN PAUL GAULTIER', query: 'Jean Paul Gaultier', fontClass: 'brand-pacorabanne' },
    { name: 'KAYALI', query: 'Kayali', fontClass: 'brand-lattafa' },
    { name: 'CAROLINA HERRERA', query: 'Carolina Herrera', fontClass: 'brand-creed' },
    { name: 'VERSACE', query: 'Versace', fontClass: 'brand-versace' },
    { name: 'DOLCE & GABBANA', query: 'Dolce&Gabbana', fontClass: 'brand-chanel' },
    { name: 'XERJOFF', query: 'Xerjoff', fontClass: 'brand-creed' },
];


const ProductPriceDisplay = ({ product }) => {
    const variant = getDefaultProductVariant(product);
    if (!variant) {
        // Fallback to getEffectiveProductPrice if no variant can be resolved
        const effectivePrice = getEffectiveProductPrice(product);
        return <span>{effectivePrice > 0 ? effectivePrice + ' TND' : 'Indisponible'}</span>;
    }
    const { size, category } = variant;
    const hasRemise = hasValidRemise(product, size, category);
    const sizeInfo = getSizeSpecificInfo(product, size, category);
    if (!sizeInfo) {
        const effectivePrice = getEffectiveProductPrice(product);
        return <span>{effectivePrice > 0 ? effectivePrice + ' TND' : 'Indisponible'}</span>;
    }

    if (hasRemise) {
        return (
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{sizeInfo.price} TND</span>
                <span style={{ color: 'var(--accent-gold)' }}>{sizeInfo.remise} TND</span>
            </div>
        );
    }
    return <span>{sizeInfo.price} TND</span>;
};



const StoreHome = () => {
    const { addToCart } = useOutletContext();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(true);
    
    // Slider states
    const [activeSlide, setActiveSlide] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const HERO_SLIDES = [
        {
            brand: 'Versace',
            title: 'Eros',
            subtitle: 'Une fraîcheur éclatante mêlant menthe sauvage, zeste de citron italien et vanille de Madagascar.',
            image: versaceHeroImage,
            query: 'Versace'
        },
        {
            brand: 'Valentino',
            title: 'Donna Born In Roma',
            subtitle: 'Une célébration de la haute couture romaine à travers un accord floral ambré sophistiqué.',
            image: valentinoHeroImage,
            query: 'Valentino'
        },
        {
            brand: 'Yves Saint Laurent',
            title: 'Libre',
            subtitle: 'La tension sensuelle d\'une lavande florale de France et de fleur d\'oranger du Maroc.',
            image: libreHeroImage,
            query: 'Yves Saint Laurent'
        },
        {
            brand: 'Xerjoff',
            title: 'Erba Pura',
            subtitle: 'Un panier de fruits méditerranéens et de citrus frais, enveloppé d\'une chaleur ambrée orientale.',
            image: xerjoffHeroImage,
            query: 'Xerjoff'
        },
        {
            brand: 'Narciso Rodriguez',
            title: 'Pure Musc',
            subtitle: 'Un parfum Floral Boisé Musqué délicat et enveloppant pour femme.',
            image: narcisoHeroImage,
            query: 'Narciso Rodriguez'
        },
        {
            brand: 'Lancôme',
            title: 'Idôle',
            subtitle: 'Une silhouette de rose lumineuse, de jasmin pur et de musc blanc éclatant.',
            image: lancomeHeroImage,
            query: 'Idôle'
        },
        {
            brand: 'Chanel',
            title: 'Chance Eau Tendre',
            subtitle: 'Une constellation fleurie-fruitée tendre et délicate, portée par le coing et le pamplemousse.',
            image: chanelHeroImage,
            query: 'Chanel'
        },
        {
            brand: 'Giorgio Armani',
            title: 'My Way',
            subtitle: 'Un bouquet floral lumineux de bergamote, de tubéreuse, de jasmin et de vanille.',
            image: armaniMyWayHeroImage,
            query: 'My Way'
        },
        {
            brand: 'Jean Paul Gaultier',
            title: 'Scandal',
            subtitle: 'Un miel charnel et scandaleux associé au gardénia et au patchouli.',
            image: scandalHeroImage,
            query: 'Scandal'
        },
        {
            brand: 'Kayali',
            title: 'Vanilla 28',
            subtitle: 'Une symphonie chaleureuse de jasmin, de sucre brun et d\'absolu de vanille de Madagascar.',
            image: kayaliVanillaHeroImage,
            query: 'Kayali'
        },
        {
            brand: 'Carolina Herrera',
            title: 'Good Girl',
            subtitle: 'La dualité fascinante de la tubéreuse lumineuse et de la fève tonka mystérieuse.',
            image: goodGirlHeroImage,
            query: 'Good Girl'
        },
        {
            brand: 'Giorgio Armani',
            title: 'Armani Code Homme',
            subtitle: 'Un sillage boisé et sensuel mêlant la fleur d\'olivier et le bois de gaïac.',
            image: armaniCodeHeroImage,
            query: 'Armani Code'
        },
        {
            brand: 'Valentino',
            title: 'Valentino Uomo',
            subtitle: 'Un parfum boisé cuiré, teinté d\'une touche veloutée de liqueur de myrte.',
            image: valentinoUomoHeroImage,
            query: 'Valentino Uomo'
        },
        {
            brand: 'Giorgio Armani',
            title: 'Acqua di Gio',
            subtitle: 'Une fraîcheur marine intemporelle évoquant le vent de la Méditerranée.',
            image: acquaDiGioHeroImage,
            query: 'Acqua di Gio'
        },
        {
            brand: 'Hermès',
            title: 'Terre d\'Hermès',
            subtitle: 'Une traversée des éléments terrestres, alliant le pamplemousse, le silex et le cèdre.',
            image: hermesHeroImage,
            query: 'Terre'
        },
        {
            brand: 'Versace',
            title: 'Eros Energy',
            subtitle: 'Une explosion d\'agrumes ensoleillés, de mandarine et de musc sauvage.',
            image: erosEnergyHeroImage,
            query: 'Eros Energy'
        },
        {
            brand: 'Dolce & Gabbana',
            title: 'Light Blue',
            subtitle: 'La joie de vivre d\'un été méditerranéen aux notes fraîches de pomme et de citron.',
            image: lightBlueHeroImage,
            query: 'Light Blue'
        }
    ];

    useEffect(() => {
        ProductsAPI.getProducts()
            .then((res) => setProducts(Array.isArray(res?.result) ? res.result : []))
            .catch(() => setProducts([]))
            .finally(() => setIsProductsLoading(false));
    }, []);

    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [isHovered]);

    const nextSlide = () => {
        setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    };

    const prevSlide = () => {
        setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    };

    // Only hide products the admin has explicitly marked as unavailable (availability: false).
    // Out-of-stock products (stock = 0) remain visible with a badge.
    const availableProducts = products.filter((p) => p.availability !== false);

    // Sort by newest first (highest id = most recently added)
    const latestArrivals = [...availableProducts]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 8);
    
    return (
        <div style={{ margin: 0, padding: 0, width: '100%', maxWidth: 'none' }}>
            <section 
                className="hero-section"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="hero-slider">
                    {HERO_SLIDES.map((slide, idx) => {
                        const isActive = idx === activeSlide;
                        return (
                            <div 
                                key={`${slide.brand}-${idx}`} 
                                className={`hero-slide ${isActive ? 'active' : ''}`}
                            >
                                <div 
                                    className="slide-bg"
                                    style={{ backgroundImage: `url(${slide.image})` }}
                                />
                                <div className="hero-content">
                                    <span className="hero-brand-tag">{slide.brand}</span>
                                    <h1 className="hero-title luxury-text-gradient">{slide.title}</h1>
                                    <div className="hero-subtitle">{slide.subtitle}</div>
                                    <div className="hero-cta">
                                        <Link to={`/products?q=${encodeURIComponent(slide.query)}`} className="luxury-btn luxury-btn-primary">
                                            Découvrir {slide.brand}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Left/Right Arrow Navigation */}
                <button className="slider-arrow arrow-left" onClick={prevSlide} aria-label="Previous Slide">
                    <ChevronLeft size={24} />
                </button>
                <button className="slider-arrow arrow-right" onClick={nextSlide} aria-label="Next Slide">
                    <ChevronRight size={24} />
                </button>

                {/* Dot Indicators */}
                <div className="slider-dots">
                    {HERO_SLIDES.map((_, idx) => (
                        <button 
                            key={`dot-${idx}`}
                            className={`slider-dot ${idx === activeSlide ? 'active' : ''}`}
                            onClick={() => setActiveSlide(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </section>

            
            {/* ── Gender Showcase ── */}
            <section className="category-showcase-section">
                <div className="category-showcase-header">
                    <span className="features-subtitle">Notre Sélection</span>
                    <h2 className="features-main-title luxury-text-gradient">Explorez par Genre</h2>
                </div>
                <div className="category-showcase-grid">

                    {/* Femme card */}
                    <Link to="/products?perfume_gender=WOMEN" className="category-card-link">
                        <div className="category-showcase-card">
                            <div
                                className="category-card-bg"
                                style={{ backgroundImage: `url(${femmeCategoryImage})` }}
                            />
                            <div className="category-card-overlay" />
                            <div className="category-card-content">
                                <span className="category-card-eyebrow">Féminité &amp; Charme</span>
                                <h3 className="category-card-title">Parfums pour Femme</h3>
                                <p className="category-card-desc">
                                    Des fragrances envoûtantes qui célèbrent l'élégance et la sensualité féminine. 
                                    Découvrez des sillages inoubliables.
                                </p>
                                <div className="category-card-cta">
                                    Découvrir
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Homme card */}
                    <Link to="/products?perfume_gender=MEN" className="category-card-link">
                        <div className="category-showcase-card">
                            <div
                                className="category-card-bg"
                                style={{ backgroundImage: `url(${hommeCategoryImage})` }}
                            />
                            <div className="category-card-overlay category-card-overlay-dark" />
                            <div className="category-card-content">
                                <span className="category-card-eyebrow">Caractère &amp; Prestance</span>
                                <h3 className="category-card-title">Parfums pour Homme</h3>
                                <p className="category-card-desc">
                                    Des accords profonds et virils. 
                                    Affirmez votre personnalité avec notre collection de parfums masculins.
                                </p>
                                <div className="category-card-cta">
                                    Découvrir
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                </div>
                            </div>
                        </div>
                    </Link>

                </div>
            </section>

            <section className="luxury-section">
                <div className="section-header">
                    <span className="features-subtitle" style={{ display: 'block', marginBottom: '0.75rem' }}>Tout juste arrivés</span>
                    <h2 className="section-title luxury-text-gradient">Dernières Arrivées</h2>
                </div>
                
                <div className="product-grid">
                    {isProductsLoading ? (
                        <ProductSkeletonCards count={4} />
                    ) : latestArrivals?.length > 0 ? (
                        latestArrivals.map(p => {
                            const isOutOfStock = isProductOutOfStock(p);
                            return (
                                <div key={p.id} className="product-card-container" onClick={() => navigate(`/products/${p.id}`)} style={{ cursor: "pointer", display: "block", position: "relative" }}>
                                    <div className={`product-card${isOutOfStock ? ' product-card-oos' : ''}`}>
                                        <div className="product-img-wrapper" style={{ position: 'relative' }}>
                                            {p.imageUrl ? (
                                                <img className="product-img" src={resolveStoreImageSrc(p)} alt={p.title} />
                                            ) : (
                                                <Package size={48} color="#A0A0A0" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                                            )}
                                            {isOutOfStock && (
                                                <div className="product-oos-badge">Rupture de stock</div>
                                            )}
                                            
                                            {/* Hover Add to Cart Button */}
                                            {!isOutOfStock && (
                                                <>
                                                    {/* Mobile Add to Cart Button */}
                                                    <div className="mobile-add-cart-btn" onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const variant = getDefaultProductVariant(p);
                                                        if (variant && addToCart) {
                                                            addToCart(p, 1, variant.size, variant.category);
                                                        }
                                                    }}>
                                                        <ShoppingCart size={18} />
                                                    </div>
                                                    <div className="hover-add-to-cart" onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const variant = getDefaultProductVariant(p);
                                                        if (variant && addToCart) {
                                                            addToCart(p, 1, variant.size, variant.category);
                                                        }
                                                    }}>
                                                        <ShoppingCart size={18} />
                                                        <span>Ajouter au panier</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        
                                        <h4 className="product-brand">{readPerfumeGender(p)} • {readPerfumeCategory(p)}</h4>
                                        <h3 className="product-title">{p.title}</h3>
                                        
                                        <div className="product-price">
                                            <ProductPriceDisplay product={p} />
                                        </div>
                                        
                                        <div className="luxury-btn">{isOutOfStock ? 'Voir les détails' : 'Découvrir'}</div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                            Aucun parfum disponible pour le moment.
                        </div>
                    )}
                </div>

                {/* View all link */}
                {latestArrivals.length > 0 && (
                    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                        <Link to="/products" className="luxury-btn" style={{ display: 'inline-block', padding: '0.9rem 2.5rem', letterSpacing: '2px', fontSize: '0.8rem' }}>
                            Voir toute la Collection
                        </Link>
                    </div>
                )}
            </section>

            <section className="premium-features">
                <div className="features-header">
                    <span className="features-subtitle">L'Excellence</span>
                    <h2 className="features-main-title luxury-text-gradient">Notre Promesse</h2>
                </div>
                <div className="staggered-grid">
                    <div className="staggered-item">
                        <div className="feature-icon-wrapper">
                            <ShieldCheck size={28} className="feature-icon" strokeWidth={1.5} />
                            <div className="icon-glow"></div>
                        </div>
                        <h3 className="feature-title">100% Authentique</h3>
                        <div className="feature-divider"></div>
                        <p className="feature-desc">Découvrez des parfums de luxe rigoureusement sélectionnés, garantis 100% authentiques et originaux.</p>
                    </div>
                    <div className="staggered-item center-item">
                        <div className="feature-icon-wrapper">
                            <Package size={28} className="feature-icon" strokeWidth={1.5} />
                            <div className="icon-glow"></div>
                        </div>
                        <h3 className="feature-title">Formats Flexibles</h3>
                        <div className="feature-divider"></div>
                        <p className="feature-desc">Des quantités adaptées à vos envies et à votre budget. Expérimentez le luxe absolu, goutte après goutte.</p>
                    </div>
                    <div className="staggered-item">
                        <div className="feature-icon-wrapper">
                            <Truck size={28} className="feature-icon" strokeWidth={1.5} />
                            <div className="icon-glow"></div>
                        </div>
                        <h3 className="feature-title">Livraison Rapide</h3>
                        <div className="feature-divider"></div>
                        <p className="feature-desc">Livraison express partout en Tunisie. Vos précieux flacons sont soigneusement emballés et sécurisés.</p>
                    </div>
                </div>
            </section>

            {/* ── Brand Showcase ── */}
            <section className="brand-showcase-section">
                <div className="brand-showcase-header">
                    <h2 className="brand-showcase-title">Le Luxe à Prix Imbattables</h2>
                    <div className="brand-showcase-divider"></div>
                </div>
                
                <div className="brand-marquee-container">
                    <div className="brand-marquee-track">
                        {/* First set of brands */}
                        {BRANDS_DATA.map((brand) => (
                            <Link 
                                to={`/products?q=${encodeURIComponent(brand.query)}`} 
                                key={`brand-1-${brand.name}`}
                                className="brand-slide-item"
                            >
                                <span className={`brand-logo-text ${brand.fontClass}`}>
                                    {brand.name}
                                </span>
                            </Link>
                        ))}
                        {/* Duplicate set for seamless looping */}
                        {BRANDS_DATA.map((brand) => (
                            <Link 
                                to={`/products?q=${encodeURIComponent(brand.query)}`} 
                                key={`brand-2-${brand.name}`}
                                className="brand-slide-item"
                            >
                                <span className={`brand-logo-text ${brand.fontClass}`}>
                                    {brand.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pourquoi Choisir AR Fragrance ── */}
            <section className="why-choose-us-section">
                <div className="why-choose-us-content">
                    <span className="why-choose-us-subtitle">L'Art du Parfum d'Exception</span>
                    <h2 className="why-choose-us-title luxury-text-gradient">Pourquoi Choisir AR Fragrance ?</h2>
                    <div className="why-choose-us-divider"></div>
                    <p className="why-choose-us-paragraph">
                        AR Fragrance réinvente l’expérience olfactive en Tunisie avec des créations d’exception 100% authentiques, issues des plus prestigieuses maisons de haute parfumerie. Grâce à nos formats exclusifs de 10 ml à 100 ml, explorez la noblesse des plus grandes fragrances à votre rythme. La promesse d'une signature unique, d'un service sur mesure et d'une livraison d'exception pour révéler votre singularité.
                    </p>
                </div>
            </section>
        </div>
    );
}

const StoreShop = () => {
    const { addToCart } = useOutletContext();
    const navigate = useNavigate();
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [availableGenders, setAvailableGenders] = useState([]);
    const initialQuery = new URLSearchParams(location.search);
    const [searchTerm, setSearchTerm] = useState(initialQuery.get('q') || '');
    const [selectedPerfumeGender, setSelectedPerfumeGender] = useState(initialQuery.get('perfume_gender') || 'all');
    const [selectedMinPrice, setSelectedMinPrice] = useState(0);
    const [selectedMaxPrice, setSelectedMaxPrice] = useState(0);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [sortBy, setSortBy] = useState('popularity-desc');
    // Memoized max product price calculation across all genuine and extract sizes
    const maxProductPrice = useMemo(() => {
        if (products.length === 0) return 200;
        let maxVal = 0;
        products.forEach(p => {
            let genPrices = p.genuine_size_prices;
            if (typeof genPrices === 'string') {
                try { genPrices = JSON.parse(genPrices); } catch(_) {}
            }
            if (genPrices && typeof genPrices === 'object') {
                for (const k in genPrices) {
                    const info = genPrices[k];
                    const price = info && info.price ? Number(info.price) : 0;
                    const remise = info && info.remise ? Number(info.remise) : 0;
                    const val = (remise > 0 && remise < price) ? remise : price;
                    if (val > maxVal) maxVal = val;
                }
            }
            let extPrices = p.extract_size_prices;
            if (typeof extPrices === 'string') {
                try { extPrices = JSON.parse(extPrices); } catch(_) {}
            }
            if (extPrices && typeof extPrices === 'object') {
                for (const k in extPrices) {
                    const info = extPrices[k];
                    const price = info && info.price ? Number(info.price) : 0;
                    const remise = info && info.remise ? Number(info.remise) : 0;
                    const val = (remise > 0 && remise < price) ? remise : price;
                    if (val > maxVal) maxVal = val;
                }
            }
        });
        return maxVal > 0 ? maxVal : 200;
    }, [products]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setSearchTerm(params.get('q') || '');

        setSelectedPerfumeGender(params.get('perfume_gender') || 'all');
    }, [location.search]);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        Promise.all([
            ProductsAPI.getProducts(),
            ProductsAPI.getGenders(),
        ])
            .then(([productsResponse, genders]) => {
                if (!isMounted) return;
                setProducts(Array.isArray(productsResponse?.result) ? productsResponse.result : []);
                setAvailableGenders(Array.isArray(genders) ? genders : []);
            })
            .catch(() => {
                if (!isMounted) return;
                setProducts([]);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const selectedGenderValue = String(selectedPerfumeGender || 'all').toUpperCase();

    const priceRangeFill = (() => {
        if (maxProductPrice <= 0) return 'linear-gradient(to right, var(--bg-tertiary) 0%, var(--bg-tertiary) 100%)';

        const minPercent = Math.max(0, Math.min(100, (selectedMinPrice / maxProductPrice) * 100));
        const maxPercent = Math.max(0, Math.min(100, ((selectedMaxPrice > 0 ? selectedMaxPrice : maxProductPrice) / maxProductPrice) * 100));

        return `linear-gradient(to right,
            var(--bg-tertiary) 0%,
            var(--bg-tertiary) ${minPercent}%,
            var(--accent-gold) ${minPercent}%,
            var(--accent-gold) ${maxPercent}%,
            var(--bg-tertiary) ${maxPercent}%,
            var(--bg-tertiary) 100%)`;
    })();

    // Memoized product filtering to filter on both genuine and extract price sizes
    const filteredProducts = useMemo(() => products.filter((product) => {
        if (product.availability === false) return false;

        const title = String(product?.title || '').toLowerCase();
        const gender = String(product?.perfume_gender || '').toUpperCase();
        const haystack = `${title} ${gender}`.trim().toLowerCase();

        if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;

        if (selectedGenderValue !== 'ALL' && gender !== selectedGenderValue) return false;

        // Gather all price values of both versions to check if any falls within [min, max] range
        const prices = [];
        let genPrices = product?.genuine_size_prices;
        if (typeof genPrices === 'string') {
            try { genPrices = JSON.parse(genPrices); } catch(_) {}
        }
        if (genPrices && typeof genPrices === 'object') {
            for (const k in genPrices) {
                const info = genPrices[k];
                const price = info && info.price ? Number(info.price) : 0;
                const remise = info && info.remise ? Number(info.remise) : 0;
                const val = (remise > 0 && remise < price) ? remise : price;
                if (val > 0) prices.push(val);
            }
        }
        let extPrices = product?.extract_size_prices;
        if (typeof extPrices === 'string') {
            try { extPrices = JSON.parse(extPrices); } catch(_) {}
        }
        if (extPrices && typeof extPrices === 'object') {
            for (const k in extPrices) {
                const info = extPrices[k];
                const price = info && info.price ? Number(info.price) : 0;
                const remise = info && info.remise ? Number(info.remise) : 0;
                const val = (remise > 0 && remise < price) ? remise : price;
                if (val > 0) prices.push(val);
            }
        }

        const minVal = selectedMinPrice;
        const maxVal = selectedMaxPrice > 0 ? selectedMaxPrice : maxProductPrice;

        if (prices.length === 0) {
            if (minVal > 0) return false;
        } else {
            const hasAnyMatch = prices.some(p => p >= minVal && p <= maxVal);
            if (!hasAnyMatch) return false;
        }

        return true;
    }), [products, normalizedSearch, selectedGenderValue, selectedMinPrice, selectedMaxPrice, maxProductPrice]);

    // Bolt: Memoize sorted list to skip sorting operations unless underlying filter/sort state changes
    const sortedFilteredProducts = useMemo(() => {
        const isOos = (p) => {
            const hasGenStock = Number(p.genuine_stock) > 0;
            const hasExtStock = Number(p.extract_stock) > 0;
            return !(hasGenStock || hasExtStock);
        };
        return [...filteredProducts].sort((a, b) => {
            const aOos = isOos(a) ? 1 : 0;
            const bOos = isOos(b) ? 1 : 0;
            if (aOos !== bOos) {
                return aOos - bOos;
            }

        if (sortBy === 'price-asc') {
            const priceA = getEffectiveProductPrice(a);
            const priceB = getEffectiveProductPrice(b);
            return priceA - priceB;
        }
        if (sortBy === 'price-desc') {
            const priceA = getEffectiveProductPrice(a);
            const priceB = getEffectiveProductPrice(b);
            return priceB - priceA;
        }
        if (sortBy === 'popularity-asc') {
            const popA = ((a.id * 17) + (a.title?.length || 0) * 3) % 100;
            const popB = ((b.id * 17) + (b.title?.length || 0) * 3) % 100;
            return popA - popB;
        }
        if (sortBy === 'popularity-desc') {
            const popA = ((a.id * 17) + (a.title?.length || 0) * 3) % 100;
            const popB = ((b.id * 17) + (b.title?.length || 0) * 3) % 100;
            return popB - popA;
        }
        if (sortBy === 'newest') {
            return b.id - a.id;
        }

        return 0;
        });
    }, [filteredProducts, sortBy]);

    return (
        <div className="collection-view">
            <header className="page-header" style={{ backgroundImage: `url(${collectionImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="header-overlay"></div>
                <div className="header-content">
                    <h1>La Collection</h1>
                    <p>Découvrez nos fragrances exclusives</p>
                </div>
            </header>

            <div className="collection-layout">
                <button
                    className="mobile-filters-toggle-btn"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                >
                    {isFiltersOpen ? 'Masquer les filtres' : 'Afficher les filtres & recherche'}
                </button>

                <aside className={`filters-sidebar ${isFiltersOpen ? 'mobile-open' : ''}`}>
                    <div className="filter-group">
                        <h3>Recherche</h3>
                        <input
                            type="text"
                            placeholder="Rechercher des parfums..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="luxury-input"
                        />
                    </div>



                    <div className="filter-group">
                        <h3>Genre</h3>
                        <select
                            value={selectedGenderValue === 'ALL' ? 'all' : selectedGenderValue}
                            onChange={(e) => setSelectedPerfumeGender(e.target.value)}
                            className="luxury-input"
                        >
                            <option value="all">Tous les genres</option>
                            {availableGenders.filter(g => g !== 'UNISEX').map((gender) => (
                                <option key={gender} value={gender}>
                                    {getPerfumeGenderLabel(gender)}
                                </option>
                            ))}
                        </select>
                    </div>



                    <div className="filter-group">
                        <h3>Fourchette de Prix</h3>
                        <div className="price-range-container">
                            <div className="price-range-labels">
                                <span>Min : {selectedMinPrice > 0 ? selectedMinPrice : '0'} TND</span>
                                <span>Max : {selectedMaxPrice > 0 ? selectedMaxPrice : maxProductPrice} TND</span>
                            </div>
                            <div className="price-range-slider" style={{ '--price-range-fill': priceRangeFill }}>
                                <input
                                    type="range"
                                    min="0"
                                    max={maxProductPrice}
                                    value={selectedMinPrice}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (val > selectedMaxPrice && selectedMaxPrice > 0) {
                                            setSelectedMaxPrice(val);
                                        }
                                        setSelectedMinPrice(val);
                                    }}
                                    className="range-min"
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max={maxProductPrice}
                                    value={selectedMaxPrice > 0 ? selectedMaxPrice : maxProductPrice}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (val < selectedMinPrice) {
                                            setSelectedMinPrice(val);
                                        }
                                        setSelectedMaxPrice(val);
                                    }}
                                    className="range-max"
                                />
                            </div>
                            <div className="price-inputs-container" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Min (TND)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={maxProductPrice}
                                        value={selectedMinPrice || ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                            if (val > selectedMaxPrice && selectedMaxPrice > 0) {
                                                setSelectedMaxPrice(val);
                                            }
                                            setSelectedMinPrice(val);
                                        }}
                                        className="luxury-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Max (TND)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={maxProductPrice}
                                        value={selectedMaxPrice || ''}
                                        placeholder={maxProductPrice}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                            if (val < selectedMinPrice && val > 0) {
                                                setSelectedMinPrice(val);
                                            }
                                            setSelectedMaxPrice(val);
                                        }}
                                        className="luxury-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            {(selectedMinPrice > 0 || (selectedMaxPrice > 0 && selectedMaxPrice < maxProductPrice)) && (
                                <button 
                                    className="price-reset-btn"
                                    onClick={() => { setSelectedMinPrice(0); setSelectedMaxPrice(0); }}
                                    style={{ marginTop: '10px', display: 'block', width: '100%' }}
                                >
                                    Réinitialiser
                                </button>
                            )}
                        </div>
                    </div>
                </aside>

                <div className="products-main-content">
                    <div className="products-grid-header">
                        <span className="results-count">
                            {sortedFilteredProducts.length} {sortedFilteredProducts.length > 1 ? 'parfums trouvés' : 'parfum trouvé'}
                        </span>
                        <div className="grid-sort-container">
                            <label htmlFor="grid-sort-select">Trier par :</label>
                            <select
                                id="grid-sort-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="luxury-sort-select"
                            >
                                <option value="popularity-desc">Popularité (Décroissante)</option>
                                <option value="popularity-asc">Popularité (Croissante)</option>
                                <option value="price-asc">Prix (Croissant)</option>
                                <option value="price-desc">Prix (Décroissant)</option>
                                <option value="newest">Derniers ajouts</option>
                            </select>
                        </div>
                    </div>

                    <div className="products-grid" style={{ padding: '1.5rem 0' }}>
                        {isLoading ? (
                            <div className="loading-spinner" style={{ gridColumn: '1 / -1', margin: '4rem auto' }}></div>
                        ) : sortedFilteredProducts.length > 0 ? (
                            sortedFilteredProducts.map(product => {
                                const isOutOfStock = isProductOutOfStock(product);
                                return (
                                    <div key={product.id} className="product-card-container" onClick={() => navigate(`/products/${product.id}`)} style={{ cursor: "pointer", display: "block", position: "relative" }}>
                                        <div className={`product-card${isOutOfStock ? ' product-card-oos' : ''}`}>
                                            <div className="product-img-wrapper" style={{ position: 'relative' }}>
                                                {resolveStoreImageSrc(product) ? (
                                                    <img className="product-img" src={resolveStoreImageSrc(product)} alt={product.title} />
                                                ) : (
                                                    <Package size={48} color="#A0A0A0" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                                                )}
                                                {isOutOfStock && (
                                                    <div className="product-oos-badge">Rupture de stock</div>
                                                )}
                                                
                                                {/* Hover Add to Cart Button */}
                                                {!isOutOfStock && (
                                                    <>
                                                        {/* Mobile Add to Cart Button */}
                                                        <div className="mobile-add-cart-btn" onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const variant = getDefaultProductVariant(product);
                                                            if (variant && addToCart) {
                                                                addToCart(product, 1, variant.size, variant.category);
                                                            }
                                                        }}>
                                                            <ShoppingCart size={18} />
                                                        </div>
                                                        <div className="hover-add-to-cart" onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const variant = getDefaultProductVariant(product);
                                                            if (variant && addToCart) {
                                                                addToCart(product, 1, variant.size, variant.category);
                                                            }
                                                        }}>
                                                            <ShoppingCart size={18} />
                                                            <span>Ajouter au panier</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <h4 className="product-brand">{readPerfumeGender(product)} · {readPerfumeCategory(product)}</h4>
                                            <h3 className="product-title">{product.title}</h3>
                                            <div className="product-price">
                                                <ProductPriceDisplay product={product} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                                <p>Aucune fragrance trouvée pour ces critères.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const ProductDetails = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recommendedProducts, setRecommendedProducts] = useState([]);
    
    const { addToCart, setCheckoutData } = useOutletContext();
    const [detailQuantity, setDetailQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedVersion, setSelectedVersion] = useState('GENUINE');

    const isLoggedIn = Boolean(localStorage.getItem('userToken'));
    const hasUserToken = Boolean(localStorage.getItem('userToken'));
    
    // State for user manually overriding the image
    const [manualImageIdx, setManualImageIdx] = useState(null);

    useEffect(() => {
        setDetailQuantity(1);
    }, [selectedSize]);

    useEffect(() => {
        setLoading(true);
        setDetailQuantity(1);
        Promise.all([
            ProductsAPI.getProduct(id),
            ProductsAPI.getProducts().catch(() => ({ result: [] })),
        ])
            .then(([productRes, allRes]) => {
                const p = productRes.result;
                setProduct(p);
                
                // Initialize default version based on stock
                let defaultVersion = 'GENUINE';
                let sizes = readPerfumeSizes(p, 'GENUINE');
                let inStockSizes = sizes.filter(s => getSizeStock(p, s, 'GENUINE') > 0);
                
                if (inStockSizes.length === 0) {
                    const extractSizes = readPerfumeSizes(p, 'EXTRACT');
                    const extractInStock = extractSizes.filter(s => getSizeStock(p, s, 'EXTRACT') > 0);
                    if (extractInStock.length > 0) {
                        defaultVersion = 'EXTRACT';
                        sizes = extractSizes;
                        inStockSizes = extractInStock;
                    }
                }
                
                setSelectedVersion(defaultVersion);
                if (inStockSizes.length > 0) {
                    setSelectedSize(inStockSizes[0]);
                } else if (sizes.length > 0) {
                    setSelectedSize(sizes[0]);
                } else {
                    setSelectedSize(null);
                }
                
                const all = Array.isArray(allRes?.result) ? allRes.result : [];
                setRecommendedProducts(all.filter(item => item.id !== p.id && item.availability !== false).slice(0, 4));
            })
            .catch(() => console.error('Error fetching product details'))
            .finally(() => setLoading(false));

    }, [id]);

    useEffect(() => {
        if (!product) return;
        rememberRecentlyViewedProduct({
            id: product.id,
            title: product.title,
            imageUrl: product.imageUrl,
            price: product.price,
            remise: product.remise,
        });
    }, [product]);

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Chargement...</div>;
    if (!product) return <div style={{ textAlign: 'center', padding: '4rem' }}>Produit introuvable</div>;

    const effectiveProductPrice = getEffectiveProductPrice(product, selectedSize, selectedVersion);
    const perfumeGender = String(readPerfumeGender(product) || '').toUpperCase();
    
    const hasGenuineStock = product.genuine_size_prices && readPerfumeSizes(product, 'GENUINE').some(s => getSizeStock(product, s, 'GENUINE') > 0);
    const hasExtractStock = product.extract_size_prices && readPerfumeSizes(product, 'EXTRACT').some(s => getSizeStock(product, s, 'EXTRACT') > 0);
    
    // Build available images array displaying all uploaded images (duplicates filtered out)
    const availableImages = [];
    const seenUrls = new Set();
    [
        { url: product.image_url, label: 'Image Principale' },
        { url: product.genuine_image_url, label: 'Image Authentique' },
        { url: product.extract_image_url, label: 'Image Extrait' }
    ].forEach(img => {
        const cleanUrl = img.url ? String(img.url).trim() : '';
        if (cleanUrl && !seenUrls.has(cleanUrl)) {
            seenUrls.add(cleanUrl);
            availableImages.push({ url: cleanUrl, label: img.label });
        }
    });
    
    let targetIdx = 0;
    
    const activeImageIdx = (manualImageIdx !== null && manualImageIdx < availableImages.length) ? manualImageIdx : targetIdx;
    
    const displayImageUrl = availableImages.length > 0 ? resolveStoreImageSrc({ imageUrl: availableImages[activeImageIdx].url }) : '';

    return (
        <div className="product-details-view">
            <div className="product-details-grid">
                {/* Product Image */}
                <div className="product-image-container">
                    <div className="product-image-wrapper">
                        {displayImageUrl ? (
                            <img
                                src={displayImageUrl}
                                alt={product.title || 'Fragrance Image'}
                                className="product-detail-img"
                            />
                        ) : (
                            <Package size={64} color="var(--text-secondary)" />
                        )}
                    </div>
                    {/* Image Gallery Thumbnails */}
                    {availableImages.length > 1 && (
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                            {availableImages.map((img, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setManualImageIdx(idx)}
                                    style={{
                                        width: '80px', height: '80px', borderRadius: '8px', cursor: 'pointer',
                                        overflow: 'hidden', border: idx === activeImageIdx ? '2px solid var(--accent-gold)' : '2px solid transparent',
                                        transition: 'all 0.2s', flexShrink: 0
                                    }}
                                    title={img.label}
                                >
                                    <img src={resolveStoreImageSrc({ imageUrl: img.url })} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="product-info">
                    <p className="product-brand" style={{ marginBottom: '0.5rem' }}>
                        {getPerfumeGenderLabel(perfumeGender)}
                    </p>
                    <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', marginBottom: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                        {product.title || 'Untitled Fragrance'}
                    </h1>
                    
                    {/* Version Selector */}
                    {hasGenuineStock || hasExtractStock ? (
                        <div className="version-selector-container" style={{ margin: '1.5rem 0' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem', borderRadius: '8px' }}>
                                {hasGenuineStock && (
                                    <button
                                        onClick={() => {
                                            setSelectedVersion('GENUINE');
                                            setManualImageIdx(null);
                                            const sizes = readPerfumeSizes(product, 'GENUINE');
                                            const inStock = sizes.find(s => getSizeStock(product, s, 'GENUINE') > 0);
                                            setSelectedSize(inStock || sizes[0]);
                                            setDetailQuantity(1);
                                        }}
                                        className={`version-btn ${selectedVersion === 'GENUINE' ? 'selected' : ''}`}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '6px', border: 'none',
                                            backgroundColor: selectedVersion === 'GENUINE' ? 'var(--accent-gold)' : 'transparent',
                                            color: selectedVersion === 'GENUINE' ? '#000' : 'var(--text-primary)',
                                            fontWeight: selectedVersion === 'GENUINE' ? '600' : '500',
                                            cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '1px'
                                        }}
                                    >
                                        Authentique
                                    </button>
                                )}
                                {hasExtractStock && (
                                    <button
                                        onClick={() => {
                                            setSelectedVersion('EXTRACT');
                                            setManualImageIdx(null);
                                            const sizes = readPerfumeSizes(product, 'EXTRACT');
                                            const inStock = sizes.find(s => getSizeStock(product, s, 'EXTRACT') > 0);
                                            setSelectedSize(inStock || sizes[0]);
                                            setDetailQuantity(1);
                                        }}
                                        className={`version-btn ${selectedVersion === 'EXTRACT' ? 'selected' : ''}`}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '6px', border: 'none',
                                            backgroundColor: selectedVersion === 'EXTRACT' ? 'var(--accent-gold)' : 'transparent',
                                            color: selectedVersion === 'EXTRACT' ? '#000' : 'var(--text-primary)',
                                            fontWeight: selectedVersion === 'EXTRACT' ? '600' : '500',
                                            cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '1px'
                                        }}
                                    >
                                        Extrait
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="out-of-stock-banner" style={{
                            margin: '1.5rem 0',
                            padding: '0.8rem',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            fontWeight: '600',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            fontSize: '0.95rem'
                        }}>
                            Hors stock
                        </div>
                    )}

                    <div className="product-price-row" style={{ marginBottom: '1.5rem' }}>
                        {hasValidRemise(product, selectedSize, selectedVersion) ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                                <span className="price-original" style={{ fontSize: '1.1rem', textDecoration: 'line-through', opacity: 0.6 }}>{getBaseProductPrice(product, selectedSize, selectedVersion)} TND</span>
                                <span className="price-discounted" style={{ fontSize: '1.6rem', color: 'var(--accent-gold)', fontWeight: '600' }}>{effectiveProductPrice} TND</span>
                            </div>
                        ) : (
                            <span className="price-main" style={{ fontSize: '1.6rem', fontWeight: '600', color: 'var(--text-primary)' }}>{getBaseProductPrice(product, selectedSize, selectedVersion)} TND</span>
                        )}
                    </div>

                    {/* Specs Grid */}
                    <div className="product-specs-grid">
                        <div className="spec-item">
                            <span className="spec-label">Version</span>
                            <span className="spec-value">{selectedVersion === 'EXTRACT' ? 'Extrait' : 'Authentique'}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Genre</span>
                            <span className="spec-value">{getPerfumeGenderLabel(perfumeGender)}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Contenance</span>
                            <span className="spec-value">{readPerfumeSizes(product, selectedVersion).join(', ')} ml</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Disponibilité</span>
                            {(() => {
                                const sizeStock = getSizeStock(product, selectedSize, selectedVersion);
                                return (
                                    <span className={`spec-value ${sizeStock > 0 ? 'stock-in' : 'stock-out'}`}>
                                        {sizeStock > 0 ? 'En stock' : 'Hors stock'}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Size Selector */}
                    <div className="size-selector-container" style={{ margin: '1.5rem 0' }}>
                        <span className="spec-label" style={{ display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>Choisir la contenance :</span>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {getSizeOptionsForCategory(selectedVersion).map(size => {
                                const isAvailable = readPerfumeSizes(product, selectedVersion).includes(size);
                                const sizeStock = getSizeStock(product, size, selectedVersion);
                                const isOutOfStock = sizeStock <= 0;
                                const isLocked = !isAvailable || isOutOfStock;
                                const isSelected = selectedSize === size;

                                return (
                                    <button
                                        key={size}
                                        onClick={() => { if (!isLocked) setSelectedSize(size); }}
                                        disabled={isLocked}
                                        className={`size-btn ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                                            backgroundColor: isSelected ? 'var(--accent-gold)' : isLocked ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                            color: isSelected ? '#000000' : isLocked ? 'var(--text-muted)' : 'var(--text-primary)',
                                            opacity: isLocked ? 0.4 : 1,
                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                            textDecoration: !isAvailable ? 'line-through' : 'none',
                                            borderRadius: '4px',
                                            fontWeight: isSelected ? '600' : '500',
                                            fontSize: '0.9rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            transition: 'all 0.2s ease',
                                        }}
                                        title={!isAvailable ? "Cette taille n'est pas disponible pour ce parfum" : isOutOfStock ? "Rupture de stock pour cette taille" : ""}
                                    >
                                        {size} ml {!isAvailable && '(N/A)'}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="action-buttons-row">
                        <div className="detail-quantity-selector">
                            <button 
                                onClick={() => setDetailQuantity(q => Math.max(1, q - 1))}
                                disabled={getSizeStock(product, selectedSize, selectedVersion) < 1}
                            >
                                -
                            </button>
                            <span>{detailQuantity}</span>
                            <button 
                                onClick={() => {
                                    const sizeStock = getSizeStock(product, selectedSize, selectedVersion);
                                    setDetailQuantity(q => Math.min(sizeStock, q + 1));
                                }}
                                disabled={getSizeStock(product, selectedSize, selectedVersion) < 1}
                            >
                                +
                            </button>
                        </div>
                        
                        <button
                            onClick={() => addToCart(product, detailQuantity, selectedSize, selectedVersion)}
                            disabled={getSizeStock(product, selectedSize, selectedVersion) < 1 || !selectedSize}
                            className="luxury-btn luxury-btn-primary btn-add-to-cart"
                        >
                            {getSizeStock(product, selectedSize, selectedVersion) < 1 ? 'Hors stock' : 'Ajouter au Panier'}
                        </button>

                        <button
                            onClick={() => setCheckoutData({
                                items: [{
                                    product,
                                    quantity: detailQuantity,
                                    category: selectedVersion,
                                    gender: perfumeGender,
                                    size: selectedSize
                                }],
                                isDirectBuy: true
                            })}
                            disabled={getSizeStock(product, selectedSize, selectedVersion) < 1 || !selectedSize}
                            className="luxury-btn btn-buy-now"
                        >
                            Acheter
                        </button>
                        
                        {isLoggedIn && (
                            <div style={{ flexBasis: '100%', marginTop: '0.5rem' }}>

                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>À propos de ce parfum</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                            {product.description || 'Une fragrance de luxe élaborée avec les meilleurs ingrédients pour offrir une expérience olfactive durable et mémorable.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            {recommendedProducts.length > 0 && (
                <div style={{ marginTop: '6rem' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '3rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vous aimerez aussi</h2>
                    <div className="products-grid">
                        {recommendedProducts.map(recProduct => (
                            <Link key={recProduct.id} to={`/products/${recProduct.id}`}>
                                <div className="product-card">
                                    <div className="product-img-wrapper">
                                        {resolveStoreImageSrc(recProduct) ? (
                                            <img className="product-img" src={resolveStoreImageSrc(recProduct)} alt={recProduct.title} />
                                        ) : (
                                            <Package size={48} color="#A0A0A0" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                                        )}
                                    </div>
                                    <h4 className="product-brand">{readPerfumeGender(recProduct)} · {readPerfumeCategory(recProduct)}</h4>
                                    <h3 className="product-title">{recProduct.title}</h3>
                                    <div className="product-price">
                                        <ProductPriceDisplay product={recProduct} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState('');
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        totalItems: 0,
        topProducts: [],
        topPerfumeCategory: { name: '-', quantity: 0 },
        topGender: { name: '-', quantity: 0 },
    });

    useEffect(() => {
        OrdersAPI.getOrders({ page: 1, page_size: 200 })
            .then((res) => {
                const orders = res?.result || [];
                const productCounter = {};
                const categoryCounter = {};
                const genderCounter = {};
                let totalItems = 0;
                let totalRevenue = 0;

                orders.forEach((order) => {
                    if (String(order.status).toUpperCase() !== 'CANCELLED') {
                        totalRevenue += Number(order.totalAmount || 0);
                        (order.items || []).forEach((item) => {
                            const qty = Number(item.quantity || 0);
                            totalItems += qty;

                            const productName = item.product?.title || `Product #${item.productId || 'N/A'}`;
                            productCounter[productName] = (productCounter[productName] || 0) + qty;

                            const perfumeCategory = String(item.perfume_category || readPerfumeCategory(item.product) || '').toUpperCase();
                            const categoryName = getPerfumeCategoryLabel(perfumeCategory);
                            categoryCounter[categoryName] = (categoryCounter[categoryName] || 0) + qty;

                            const perfumeGender = String(readPerfumeGender(item.product) || '').toUpperCase();
                            const genderName = getPerfumeGenderLabel(perfumeGender);
                            genderCounter[genderName] = (genderCounter[genderName] || 0) + qty;
                        });
                    }
                });

                const sortedProducts = Object.entries(productCounter)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([name, quantity]) => ({ name, quantity }));

                const topCategoryEntry = Object.entries(categoryCounter).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
                const topGenderEntry = Object.entries(genderCounter).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

                setStats({
                    totalOrders: orders.length,
                    totalRevenue,
                    totalItems,
                    topProducts: sortedProducts,
                    topPerfumeCategory: { name: topCategoryEntry[0], quantity: topCategoryEntry[1] },
                    topGender: { name: topGenderEntry[0], quantity: topGenderEntry[1] },
                });
            })
            .catch((err) => {
                if (err?.response?.status === 401) {
                    localStorage.removeItem('adminToken');
                    navigate('/admin');
                    return;
                }
                setDashboardError('Unable to load dashboard analytics right now.');
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading dashboard analytics...</div>;
    }

    const maxProductQty = stats.topProducts[0]?.quantity || 1;

    return (
        <div>
            <div className="admin-dashboard-header">
                <h2>Analyses du Tableau de Bord</h2>
                <p>Suivez les tendances de commande en temps réel.</p>
            </div>

            {dashboardError && <div className="admin-error-alert">{dashboardError}</div>}

            {/* Summary stat cards */}
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
                <div className="admin-stat-card">
                    <p>Total Commandes</p>
                    <p>{stats.totalOrders}</p>
                </div>
                <div className="admin-stat-card">
                    <p>Articles Vendus</p>
                    <p>{stats.totalItems}</p>
                </div>
                <div className="admin-stat-card">
                    <p>Chiffre d'affaires</p>
                    <p>{stats.totalRevenue.toFixed(2)} TND</p>
                </div>
                <div className="admin-stat-card">
                    <p>Top Catégorie</p>
                    <p style={{ fontSize: '1.3rem' }}>{stats.topPerfumeCategory.name}</p>
                </div>
                <div className="admin-stat-card">
                    <p>Top Genre</p>
                    <p style={{ fontSize: '1.3rem' }}>{stats.topGender.name}</p>
                </div>
            </div>

            {/* Top 6 Products Leaderboard */}
            <div className="admin-leaderboard-card">
                <div className="admin-leaderboard-header">
                    <span className="admin-leaderboard-title">🏆 Top 6 Produits les Plus Commandés</span>
                    <span className="admin-leaderboard-sub">{stats.topProducts.length} produits classés</span>
                </div>
                {stats.topProducts.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>Aucune commande pour l'instant — les données apparaîtront dès que des clients commanderont.</p>
                ) : (
                    <div className="admin-leaderboard-list">
                        {stats.topProducts.map((product, index) => {
                            const pct = Math.round((product.quantity / maxProductQty) * 100);
                            const medals = ['🥇', '🥈', '🥉'];
                            const rankLabel = medals[index] || `#${index + 1}`;
                            return (
                                <div key={product.name} className="admin-leaderboard-row">
                                    <span className="admin-leaderboard-rank">{rankLabel}</span>
                                    <div className="admin-leaderboard-info">
                                        <div className="admin-leaderboard-name">{product.name}</div>
                                        <div className="admin-leaderboard-bar-wrap">
                                            <div
                                                className="admin-leaderboard-bar"
                                                style={{ width: `${pct}%`, opacity: 1 - index * 0.1 }}
                                            />
                                        </div>
                                    </div>
                                    <span className="admin-leaderboard-qty">{product.quantity} vendu(s)</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Insight cards */}
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: '1.5rem' }}>
                <div className="admin-insight-card">
                    <p>Top Catégorie</p>
                    <p className="insight-value">{stats.topPerfumeCategory.name}</p>
                    <p className="insight-sub">{stats.topPerfumeCategory.quantity} articles commandés</p>
                </div>
                <div className="admin-insight-card">
                    <p>Genre le Plus Populaire</p>
                    <p className="insight-value">{stats.topGender.name}</p>
                    <p className="insight-sub">{stats.topGender.quantity} articles commandés</p>
                </div>
            </div>
        </div>
    );
};

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [viewProduct, setViewProduct] = useState(null);

    const DEFAULT_GENUINE_SIZES = { "10": { price: '', remise: '' }, "20": { price: '', remise: '' } };
    const DEFAULT_EXTRACT_SIZES = { "50": { price: '', remise: '', stock: '' }, "100": { price: '', remise: '', stock: '' } };

    const initialProductState = {
        title: '', image_url: '', genuine_image_url: '', extract_image_url: '',
        description: '', availability: true, perfume_gender: 'WOMEN',
        genuine_stock: '', bottle_ml: 100, extract_stock: '',
        genuine_size_prices: DEFAULT_GENUINE_SIZES,
        extract_size_prices: DEFAULT_EXTRACT_SIZES
    };
    const [newProduct, setNewProduct] = useState(initialProductState);

    const normalizeSizePrices = (raw, defaultVal) => {
        if (!raw) return JSON.parse(JSON.stringify(defaultVal));
        let parsed = raw;
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch(_) { return JSON.parse(JSON.stringify(defaultVal)); } }
        if (typeof parsed !== 'object') return JSON.parse(JSON.stringify(defaultVal));
        
        const result = JSON.parse(JSON.stringify(defaultVal));
        for (const [k, v] of Object.entries(parsed)) {
            if (k === 'consumed_ml') {
                result[k] = Number(v) || 0;
            } else {
                result[k] = { ...result[k], ...v };
            }
        }
        return result;
    };

    const fetchData = () => {
        ProductsAPI.getProducts().then(res => setProducts(Array.isArray(res.result) ? res.result : [])).catch(console.error);
    };
    useEffect(() => { fetchData(); }, []);

    const handleImageUpload = async (e, cb) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const res = await ProductsAPI.uploadImage(file);
            if (res?.result?.url) { cb(res.result.url); toast.success("Image téléchargée !"); }
        } catch (err) { toast.error("Échec du téléchargement."); }
    };

    const resolvePreviewSrc = (v) => {
        const val = (v || '').trim();
        if (!val) return '';
        if (/^(data:|blob:|https?:)/.test(val)) return val;
        if (val.startsWith('//')) return `https:${val}`;
        return resolveBackendFileUrl(val);
    };

    const resolveImgForPayload = async (v) => {
        const val = (v || '').trim();
        if (!val || !val.startsWith('data:image/')) return val;
        const blob = await fetch(val).then(r => r.blob());
        const ext = (blob.type?.split('/')[1] || 'png').split(';')[0];
        const file = new File([blob], `img.${ext}`, { type: blob.type });
        const res = await ProductsAPI.uploadImage(file);
        if (!res?.result?.url) throw new Error('Upload failed');
        return res.result.url;
    };

    const cleanSizePrices = (sizePrices) => {
        if (!sizePrices) return null;
        const out = {};
        for (const [size, info] of Object.entries(sizePrices)) {
            if (size === 'consumed_ml') {
                out[size] = Number(info) || 0;
                continue;
            }
            out[size] = {
                price: Number(info?.price) || 0,
                remise: (info?.remise === '' || info?.remise === null || info?.remise === undefined) ? null : Number(info.remise),
                ...(info?.stock !== undefined ? { stock: (info.stock === '' || info.stock === null) ? null : Number(info.stock) } : {})
            };
        }
        return out;
    };

    const filteredProducts = products.filter(p => (p.title || '').toLowerCase().includes(productSearchTerm.toLowerCase()));

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const [image_url, genuine_image_url, extract_image_url] = await Promise.all([
                resolveImgForPayload(newProduct.image_url),
                resolveImgForPayload(newProduct.genuine_image_url),
                resolveImgForPayload(newProduct.extract_image_url)
            ]);
            await ProductsAPI.createProduct({ product_payload: {
                ...newProduct,
                genuine_stock: Number(newProduct.genuine_stock) || 0,
                extract_stock: Number(newProduct.extract_stock) || 0,
                bottle_ml: Number(newProduct.bottle_ml) || 0,
                image_url, genuine_image_url: genuine_image_url || null, extract_image_url: extract_image_url || null,
                genuine_size_prices: cleanSizePrices(newProduct.genuine_size_prices),
                extract_size_prices: cleanSizePrices(newProduct.extract_size_prices),
            }});
            setIsAdding(false); setNewProduct(initialProductState); fetchData();
            toast.success("Produit créé avec succès !");
        } catch (error) {
            const msg = error?.response?.data?.detail || error?.response?.data?.message;
            toast.error(msg || "Erreur lors de la création.");
            console.error(error?.response?.data || error);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const [image_url, genuine_image_url, extract_image_url] = await Promise.all([
                resolveImgForPayload(viewProduct.image_url),
                resolveImgForPayload(viewProduct.genuine_image_url),
                resolveImgForPayload(viewProduct.extract_image_url)
            ]);
            await ProductsAPI.updateProduct(viewProduct.id, {
                title: viewProduct.title,
                description: viewProduct.description,
                perfume_gender: viewProduct.perfume_gender,
                availability: viewProduct.availability,
                genuine_stock: Number(viewProduct.genuine_stock) || 0,
                extract_stock: Number(viewProduct.extract_stock) || 0,
                bottle_ml: Number(viewProduct.bottle_ml) || 0,
                image_url, genuine_image_url: genuine_image_url || null, extract_image_url: extract_image_url || null,
                genuine_size_prices: cleanSizePrices(viewProduct.genuine_size_prices),
                extract_size_prices: cleanSizePrices(viewProduct.extract_size_prices),
            });
            setViewProduct(null); fetchData();
            toast.success("Produit mis à jour !");
        } catch (error) {
            const msg = error?.response?.data?.detail || error?.response?.data?.message;
            toast.error(msg || "Erreur lors de la mise à jour.");
            console.error(error?.response?.data || error);
        }
    };

    const handleToggleAvail = async (product) => {
        try {
            await ProductsAPI.updateProduct(product.id, { availability: !product.availability });
            fetchData();
        } catch (error) {
            toast.error("Impossible de mettre à jour la disponibilité.");
        }
    };

    // ---- SUB-RENDERERS ----

    const renderImageField = ({ label, value, onChange, hint }) => (
        <div className="ap-image-field">
            <div className="ap-image-label">{label} {hint && <span className="ap-image-hint">{hint}</span>}</div>
            <div className="ap-image-body">
                <label className="ap-upload-btn">
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, onChange)} style={{ display: 'none' }} />
                    <Upload size={16} /> Parcourir
                </label>
                <input
                    type="text" className="ap-input" placeholder="ou coller l'URL ici..."
                    value={value || ''} onChange={e => onChange(e.target.value)}
                    style={{ flex: 1 }}
                />
                {value && (
                    <div className="ap-preview-wrap">
                        <img src={resolvePreviewSrc(value)} alt="aperçu" className="ap-preview-img" />
                        <button type="button" className="ap-remove-img" onClick={() => onChange('')}>✕</button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderSizeRow = ({ size, info, onChange, showStock, key }) => (
        <div className="ap-size-row" key={key}>
            <div className="ap-size-label">{size} ml</div>
            <div className="ap-size-field">
                <label className="ap-field-label">Prix (TND) *</label>
                <input className="ap-input" type="number" min="0" required value={info?.price ?? ''}
                    onChange={e => onChange({ ...info, price: e.target.value })} placeholder="0" />
            </div>
            <div className="ap-size-field">
                <label className="ap-field-label">Remise (TND)</label>
                <input className="ap-input" type="number" min="0" value={info?.remise ?? ''}
                    onChange={e => onChange({ ...info, remise: e.target.value })} placeholder="—" />
            </div>
            {showStock && (
                <div className="ap-size-field">
                    <label className="ap-field-label">Stock (unités)</label>
                    <input className="ap-input" type="number" min="0" value={info?.stock ?? ''}
                        onChange={e => onChange({ ...info, stock: e.target.value })} placeholder="0" />
                </div>
            )}
        </div>
    );

    const renderFormSection = ({ title, icon, children }) => (
        <div className="ap-section">
            <div className="ap-section-header">
                <span className="ap-section-icon">{icon}</span>
                <h4 className="ap-section-title">{title}</h4>
            </div>
            <div className="ap-section-body">{children}</div>
        </div>
    );

    const renderForm = (state, setState, isUpdate) => {
        const genPrices = state.genuine_size_prices || DEFAULT_GENUINE_SIZES;
        const extPrices = state.extract_size_prices || DEFAULT_EXTRACT_SIZES;
        const updateField = (field, val) => setState(prev => ({ ...prev, [field]: val }));
        const updateSizePrice = (field, size, info) => setState(prev => ({
            ...prev, [field]: { ...prev[field], [size]: info }
        }));

        return (
            <div className="ap-form-body">
                {renderFormSection({ title: "Informations Générales", icon: "📝", children: <>
                    <div className="ap-grid-2">
                        <div className="ap-field">
                            <label className="ap-field-label">Nom du Parfum *</label>
                            <input className="ap-input" required value={state.title || ''}
                                onChange={e => updateField('title', e.target.value)} placeholder="Ex: Sauvage Elixir" />
                        </div>
                        <div className="ap-field">
                            <label className="ap-field-label">Genre *</label>
                            <select className="ap-input ap-select" required value={state.perfume_gender || 'WOMEN'}
                                onChange={e => updateField('perfume_gender', e.target.value)}>
                                <option value="MEN">Homme</option>
                                <option value="WOMEN">Femme</option>
                                <option value="UNISEX">Unisexe</option>
                            </select>
                        </div>
                    </div>
                    <div className="ap-field">
                        <label className="ap-field-label">Description *</label>
                        <textarea className="ap-input ap-textarea" required value={state.description || ''}
                            onChange={e => updateField('description', e.target.value)} placeholder="Description du parfum..." />
                    </div>
                </>})}

                {renderFormSection({ title: "Stock & Volumes", icon: "📦", children: <>
                    <div className="ap-grid-3">
                        <div className="ap-field">
                            <label className="ap-field-label">Bouteilles Authentiques</label>
                            <div className="ap-input-hint">
                                Nombre de bouteilles entières en stock.
                                {state.genuine_size_prices?.consumed_ml ? ` (Consommé: ${state.genuine_size_prices.consumed_ml}ml)` : ''}
                            </div>
                            <input className="ap-input" type="number" min="0" value={state.genuine_stock ?? ''}
                                onChange={e => updateField('genuine_stock', e.target.value)} placeholder="0" />
                            
                            {isUpdate && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input 
                                        type="number" 
                                        id={`subtract-ml-${state.id || 'new'}`}
                                        className="ap-input" 
                                        placeholder="ML à soustraire" 
                                        style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                                    />
                                    <button 
                                        type="button" 
                                        className="luxury-btn" 
                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                        onClick={() => {
                                            const input = document.getElementById(`subtract-ml-${state.id || 'new'}`);
                                            if (!input) return;
                                            const amt = Number(input.value) || 0;
                                            if (amt > 0) {
                                                const current = state.genuine_size_prices?.consumed_ml || 0;
                                                updateSizePrice('genuine_size_prices', 'consumed_ml', current + amt);
                                                input.value = '';
                                            }
                                        }}
                                    >
                                        Retirer ML
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="ap-field">
                            <label className="ap-field-label">Volume / Bouteille (ml)</label>
                            <div className="ap-input-hint">
                                Capacité totale
                                {(() => {
                                    const total = (Number(state.genuine_stock)||0) * (Number(state.bottle_ml)||0);
                                    const cons = state.genuine_size_prices?.consumed_ml || 0;
                                    return ` (Restant total: ${Math.max(0, total - cons)}ml)`;
                                })()}
                            </div>
                            <input className="ap-input" type="number" min="1" value={state.bottle_ml ?? 100}
                                onChange={e => updateField('bottle_ml', e.target.value)} placeholder="100" />
                        </div>
                        <div className="ap-field">
                            <label className="ap-field-label">Stock Extrait (flacons)</label>
                            <div className="ap-input-hint">Réserve globale pour les extraits</div>
                            <input className="ap-input" type="number" min="0" value={state.extract_stock ?? ''}
                                onChange={e => updateField('extract_stock', e.target.value)} placeholder="0" />
                        </div>
                    </div>
                </>})}

                {renderFormSection({ title: "Prix — Authentique (10ml / 20ml)", icon: "💎", children: <>
                    <div className="ap-sizes-wrapper">
                        {['10', '20'].map(size => (
                            renderSizeRow({ key: size, size: size, info: genPrices[size], showStock: false, onChange: info => updateSizePrice('genuine_size_prices', size, info) })
                        ))}
                    </div>
                </>})}

                {renderFormSection({ title: "Prix — Extrait (50ml / 100ml)", icon: "✨", children: <>
                    <div className="ap-sizes-wrapper">
                        {['50', '100'].map(size => (
                            renderSizeRow({ key: size, size: size, info: extPrices[size], showStock: true, onChange: info => updateSizePrice('extract_size_prices', size, info) })
                        ))}
                    </div>
                </>})}

                {renderFormSection({ title: "Images", icon: "🖼️", children: <>
                    {renderImageField({ label: "Image Principale", hint: "(commune aux deux versions)", value: state.image_url, onChange: val => updateField('image_url', val) })}
                    {renderImageField({ label: "Image Authentique", hint: "(optionnelle)", value: state.genuine_image_url, onChange: val => updateField('genuine_image_url', val) })}
                    {renderImageField({ label: "Image Extrait", hint: "(optionnelle)", value: state.extract_image_url, onChange: val => updateField('extract_image_url', val) })}
                </>})}

                <button type="submit" className="ap-submit-btn">
                    {isUpdate ? '💾 Enregistrer les modifications' : '➕ Créer le produit'}
                </button>
            </div>
        );
    };

    const openEdit = (p) => {
        const pView = { ...p };
        pView.genuine_size_prices = normalizeSizePrices(pView.genuine_size_prices, DEFAULT_GENUINE_SIZES);
        pView.extract_size_prices = normalizeSizePrices(pView.extract_size_prices, DEFAULT_EXTRACT_SIZES);
        setViewProduct(pView);
        setIsAdding(false);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    };

    return (
        <div className="ap-root">
            {/* Header */}
            <div className="ap-page-header">
                <h2 className="ap-page-title">Produits</h2>
                <button className="ap-action-btn" onClick={() => { setIsAdding(v => !v); setViewProduct(null); }}>
                    {isAdding ? '✕ Annuler' : '+ Ajouter un produit'}
                </button>
            </div>

            {/* Add form */}
            {isAdding && (
                <div className="ap-form-container">
                    <div className="ap-form-header">
                        <h3 className="ap-form-heading">Nouveau Produit</h3>
                        <button className="ap-close-btn" onClick={() => setIsAdding(false)}>✕</button>
                    </div>
                    <form onSubmit={handleCreate}>
                        {renderForm(newProduct, setNewProduct, false)}
                    </form>
                </div>
            )}

            {/* Edit form */}
            {viewProduct && (
                <div className="ap-form-container">
                    <div className="ap-form-header">
                        <h3 className="ap-form-heading">Modifier le produit <span className="ap-product-id">#{viewProduct.id}</span></h3>
                        <button className="ap-close-btn" onClick={() => setViewProduct(null)}>✕</button>
                    </div>
                    <form onSubmit={handleUpdate}>
                        {renderForm(viewProduct, setViewProduct, true)}
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="ap-search-bar">
                <input type="text" placeholder="🔍 Rechercher un produit..."
                    value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)}
                    className="ap-search-input" />
            </div>

            {/* Product grid */}
            <div className="ap-product-grid">
                {filteredProducts.length === 0 && (
                    <div className="ap-empty-state">Aucun produit trouvé</div>
                )}
                {filteredProducts.map(p => {
                    const genP = p.genuine_size_prices;
                    const extP = p.extract_size_prices;
                    const fromPrice = genP?.['10']?.price || genP?.['20']?.price || extP?.['50']?.price || extP?.['100']?.price || '—';
                    return (
                        <div key={p.id} className="ap-product-card">
                            <div className="ap-card-img-wrap">
                                {p.image_url
                                    ? <img src={resolvePreviewSrc(p.image_url)} alt={p.title} className="ap-card-img" />
                                    : <div className="ap-card-img-placeholder">📷</div>
                                }
                                <span className={`ap-avail-badge ${p.availability ? 'in-stock' : 'out'}`}>
                                    {p.availability ? 'En stock' : 'Épuisé'}
                                </span>
                            </div>
                            <div className="ap-card-body">
                                <div className="ap-card-id">#{p.id}</div>
                                <div className="ap-card-title">{p.title}</div>
                                <div className="ap-card-price">À partir de {fromPrice} TND</div>
                                <div className="ap-card-actions">
                                    <button className="ap-edit-btn" onClick={() => openEdit(p)}>✏️ Éditer</button>
                                    <button className={`ap-toggle-btn ${p.availability ? 'disable' : 'enable'}`}
                                        onClick={() => handleToggleAvail(p)}>
                                        {p.availability ? 'Désactiver' : 'Activer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const AdminOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailStatus, setDetailStatus] = useState('');
    const [orderSearchTerm, setOrderSearchTerm] = useState('');

    const STATUS_LABELS = { PENDING: 'En attente', CONFIRMED: 'Confirmée', COMPLETED: 'Livrée', CANCELLED: 'Annulée' };
    const STATUS_COLORS = { PENDING: '#fbbf24', CONFIRMED: '#34d399', COMPLETED: '#34d399', CANCELLED: '#f87171' };

    const getFrenchStatusLabel = (s) => STATUS_LABELS[String(s).toUpperCase()] || s;
    const getCategoryLabel = (cat) => String(cat || '').toUpperCase() === 'EXTRACT' ? 'Extrait' : 'Authentique';

    const handleUnauthorized = () => {
        localStorage.removeItem('adminToken');
        toast.error("Session expirée. Veuillez vous reconnecter.");
        navigate('/admin');
    };

    const fetchOrders = () => {
        OrdersAPI.getOrders({ page: 1, page_size: 100 })
            .then(res => {
                const result = Array.isArray(res.result) ? res.result : [];
                setOrders(result);
                if (selectedOrder) {
                    const refreshed = result.find(o => o.id === selectedOrder.id);
                    if (refreshed) { setSelectedOrder(refreshed); setDetailStatus(refreshed.status); }
                }
            })
            .catch(err => { if (err?.response?.status === 401) handleUnauthorized(); else console.error(err); });
    };

    useEffect(() => { fetchOrders(); }, []);

    const selectOrder = (order) => {
        setSelectedOrder(order);
        setDetailStatus(order.status);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    };

    const filteredOrders = orders.filter(o =>
        [(o.customerName || ''), (o.customerPhone || ''), (o.customerEmail || ''), String(o.id)]
            .some(v => v.toLowerCase().includes(orderSearchTerm.toLowerCase()))
    );

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await OrdersAPI.updateStatus(orderId, newStatus);
            fetchOrders();
            toast.success("Statut mis à jour !");
        } catch (err) {
            if (err?.response?.status === 401) { handleUnauthorized(); return; }
            toast.error("Échec de la mise à jour du statut.");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '2px' }}>Commandes</h2>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{orders.length} commande{orders.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Order detail panel */}
            {selectedOrder && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                    {/* Panel header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(120deg, var(--bg-secondary) 0%, #161008 100%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', letterSpacing: '1px' }}>Commande #{selectedOrder.id}</h3>
                            <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: 'rgba(212,175,55,0.15)', color: STATUS_COLORS[selectedOrder.status?.toUpperCase()] || 'var(--accent-gold)', border: `1px solid ${STATUS_COLORS[selectedOrder.status?.toUpperCase()] || 'var(--accent-gold)'}30` }}>
                                {getFrenchStatusLabel(selectedOrder.status)}
                            </span>
                        </div>
                        <button type="button" onClick={() => setSelectedOrder(null)} className="form-close-btn">&times;</button>
                    </div>

                    {/* Panel body — 3-col grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0', borderBottom: '1px solid var(--border-color)' }}>
                        {/* Client */}
                        <div style={{ padding: '1.25rem 1.5rem', borderRight: '1px solid var(--border-color)' }}>
                            <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Client</p>
                            <p style={{ margin: '0 0 0.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedOrder.customerName}</p>
                            <p style={{ margin: '0 0 0.15rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedOrder.customerEmail}</p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedOrder.customerPhone}</p>
                        </div>
                        {/* Livraison */}
                        <div style={{ padding: '1.25rem 1.5rem', borderRight: '1px solid var(--border-color)' }}>
                            <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Livraison</p>
                            <p style={{ margin: '0 0 0.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedOrder.shippingAddress}</p>
                            <p style={{ margin: '0 0 0.15rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedOrder.city} {selectedOrder.postalCode && `— ${selectedOrder.postalCode}`}</p>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Total : {selectedOrder.totalAmount} TND</p>
                        </div>
                        {/* Articles */}
                        <div style={{ padding: '1.25rem 1.5rem' }}>
                            <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Articles commandés</p>
                            {selectedOrder.items?.length > 0 ? selectedOrder.items.map((it, idx) => (
                                <div key={it.id ?? idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem', padding: '0.45rem 0.7rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--accent-gold)', fontWeight: '700', flexShrink: 0 }}>{it.quantity}×</span>
                                    <div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.15rem' }}>
                                            {it.product?.title || `Produit #${it.productId ?? it.product_id ?? '?'}`}
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            {it.sizeMl ?? it.size_ml ?? it.sizeMl ? `${it.sizeMl ?? it.size_ml}ml` : ''}
                                            {(it.perfumeCategory || it.perfume_category) && <span style={{ marginLeft: '0.4rem', padding: '0.1rem 0.4rem', background: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)', borderRadius: '4px', fontSize: '0.75rem' }}>{getCategoryLabel(it.perfumeCategory ?? it.perfume_category)}</span>}
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{it.unitPrice ?? it.unit_price} TND × {it.quantity} = {it.lineTotal ?? it.line_total} TND</div>
                                    </div>
                                </div>
                            )) : <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Aucun article</p>}
                        </div>
                    </div>

                    {/* Status update */}
                    <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Changer le statut :</label>
                        <select value={detailStatus} onChange={e => setDetailStatus(e.target.value)} className="admin-select">
                            {Object.entries(STATUS_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                        </select>
                        <button type="button" onClick={() => handleUpdateStatus(selectedOrder.id, detailStatus)} className="admin-btn admin-btn-primary">
                            Enregistrer
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div>
                <input type="text" placeholder="🔍 Rechercher par nom, téléphone, email ou n°..."
                    value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)}
                    className="ap-search-input" style={{ maxWidth: '450px' }} />
            </div>

            {/* Orders table */}
            <div className="admin-table-wrap">
                <table className="admin-table" style={{ minWidth: '700px' }}>
                    <thead>
                        <tr>
                            <th>N° / Articles</th>
                            <th>Client</th>
                            <th>Contact</th>
                            <th>Total</th>
                            <th>Statut</th>
                            <th>Action rapide</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length > 0 ? filteredOrders.map(o => (
                            <tr key={o.id} className={selectedOrder?.id === o.id ? 'selected' : ''} onClick={() => selectOrder(o)}>
                                <td style={{ verticalAlign: 'top' }}>
                                    <span className="text-bold">#{o.id}</span>
                                    <div style={{ marginTop: '0.4rem' }}>
                                        {(o.items || []).map((it, idx) => (
                                            <div key={it.id ?? idx} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                {it.quantity}× {it.product?.title || `Prod #${it.productId ?? it.product_id ?? '?'}`}
                                                {(it.sizeMl ?? it.size_ml) ? ` — ${it.sizeMl ?? it.size_ml}ml` : ''}
                                                {(it.perfumeCategory ?? it.perfume_category) ? ` (${getCategoryLabel(it.perfumeCategory ?? it.perfume_category)})` : ''}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td style={{ verticalAlign: 'top' }}>
                                    <div className="text-bold">{o.customerName}</div>
                                    <div className="text-muted">{o.city}</div>
                                </td>
                                <td style={{ verticalAlign: 'top' }}>
                                    <div style={{ color: 'var(--text-primary)' }}>{o.customerPhone}</div>
                                    <div className="text-muted">{o.customerEmail}</div>
                                </td>
                                <td className="text-bold" style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>{o.totalAmount} TND</td>
                                <td style={{ verticalAlign: 'top' }}>
                                    <span className={`admin-status-badge ${(o.status || '').toLowerCase()}`}>{getFrenchStatusLabel(o.status)}</span>
                                </td>
                                <td style={{ verticalAlign: 'top' }} onClick={e => e.stopPropagation()}>
                                    <select value={o.status} onChange={e => handleUpdateStatus(o.id, e.target.value)} className="admin-select">
                                        {Object.entries(STATUS_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                                    </select>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Aucune commande trouvée</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};



const UserSupportChat = () => {
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [draftMessage, setDraftMessage] = useState('');
    const [userAttachment, setUserAttachment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [chatError, setChatError] = useState('');
    const endRef = useRef(null);
    const attachmentInputRef = useRef(null);

    const loadConversation = async (silent = false) => {
        if (!silent) setIsLoading(true);

        try {
            const response = await ChatAPI.getUserConversation();
            setConversation(response?.result || null);
            setChatError('');
        } catch (error) {
            if (error?.response?.status === 401) {
                navigate('/auth');
                return;
            }
            setChatError(getApiErrorMessage(error, 'Unable to load support chat.'));
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadConversation();
        const intervalId = window.setInterval(() => loadConversation(true), 8000);
        return () => window.clearInterval(intervalId);
    }, []);

    const messageCount = conversation?.messages?.length || 0;
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messageCount]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const normalizedBody = draftMessage.trim();
        const hasAttachment = Boolean(userAttachment);

        if ((!normalizedBody && !hasAttachment) || isSending) return;

        setIsSending(true);
        try {
            let response;
            if (hasAttachment) {
                const formData = new FormData();
                if (normalizedBody) {
                    formData.append('body', normalizedBody);
                }
                formData.append('attachment', userAttachment);
                response = await ChatAPI.sendUserAttachment(formData);
            } else {
                response = await ChatAPI.sendUserMessage({ body: normalizedBody });
            }

            setConversation(response?.result || conversation);
            setDraftMessage('');
            setUserAttachment(null);
            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = '';
            }
            setChatError('');
        } catch (error) {
            if (error?.response?.status === 401) {
                navigate('/auth');
                return;
            }
            setChatError(getApiErrorMessage(error, 'Unable to send your message right now.'));
        } finally {
            setIsSending(false);
        }
    };

    const messages = conversation?.messages || [];

    return (
        <div className="support-chat-page">
            <div className="support-chat-shell">
                <div className="support-chat-header">
                    <h2>Chat Support</h2>
                    <p>Envoyez un message directement à un administrateur. Les réponses apparaissent en temps réel.</p>
                </div>

                <div className="support-chat-messages">
                    {isLoading ? (
                        <p className="support-chat-empty">Chargement de la conversation...</p>
                    ) : messages.length === 0 ? (
                        <p className="support-chat-empty">Aucun message pour l'instant. Commencez par envoyer le premier message.</p>
                    ) : (
                        messages.map((message) => {
                            const isUserMessage = message.senderRole === 'USER';
                            return (
                                <article
                                    key={message.id}
                                    className={`support-chat-bubble ${isUserMessage ? 'support-chat-bubble-user' : 'support-chat-bubble-admin'}`}
                                >
                                    <p className="support-chat-bubble-author">{isUserMessage ? 'Vous' : (message.senderName || 'Admin')}</p>
                                    <p className="support-chat-bubble-body">{message.body}</p>
                                    {message.attachmentUrl && (
                                        <div className="support-chat-attachment-wrap">
                                            <a
                                                href={resolveBackendFileUrl(message.attachmentUrl)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="support-chat-attachment-link"
                                            >
                                                <Paperclip size={14} />
                                                {message.attachmentName || 'Attachment'}
                                                {message.attachmentSize ? ` (${formatAttachmentSize(message.attachmentSize)})` : ''}
                                            </a>
                                            {isImageAttachment(message.attachmentMimeType) && (
                                                <a href={resolveBackendFileUrl(message.attachmentUrl)} target="_blank" rel="noreferrer">
                                                    <img
                                                        src={resolveBackendFileUrl(message.attachmentUrl)}
                                                        alt={message.attachmentName || 'Attachment'}
                                                        className="support-chat-attachment-image"
                                                    />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {isUserMessage && message.isRead && (
                                        <p className="support-chat-seen">Lu</p>
                                    )}
                                </article>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>

                {chatError && <p className="support-chat-error">{chatError}</p>}

                <form onSubmit={handleSendMessage} className="support-chat-form">
                    <textarea
                        placeholder="Votre message à l'administrateur..."
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        className="support-chat-input"
                    />
                    <div className="support-chat-attachment-row">
                        <label className="support-chat-attachment-picker">
                            <Paperclip size={14} />
                            Joindre un fichier
                            <input
                                ref={attachmentInputRef}
                                type="file"
                                onChange={(e) => setUserAttachment(e.target.files?.[0] || null)}
                            />
                        </label>
                        {userAttachment && (
                            <span className="support-chat-attachment-selected">{userAttachment.name}</span>
                        )}
                    </div>
                    <button type="submit" className="support-chat-send" disabled={isSending || (!draftMessage.trim() && !userAttachment)}>
                        {isSending ? 'Envoi...' : 'Envoyer'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const AdminChatSupport = () => {
    const navigate = useNavigate();
    const [threads, setThreads] = useState([]);
    const [selectedThreadId, setSelectedThreadId] = useState(null);
    const [threadDetails, setThreadDetails] = useState(null);
    const [draftMessage, setDraftMessage] = useState('');
    const [adminAttachment, setAdminAttachment] = useState(null);
    const [chatError, setChatError] = useState('');
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingThreadDetails, setIsLoadingThreadDetails] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const endRef = useRef(null);
    const adminAttachmentInputRef = useRef(null);

    const handleUnauthorized = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin');
    };

    const loadThreads = async (silent = false) => {
        if (!silent) setIsLoadingThreads(true);

        try {
            const response = await ChatAPI.getAdminThreads();
            const items = Array.isArray(response?.result) ? response.result : [];
            setThreads(items);
            setSelectedThreadId((prev) => prev || (items[0]?.id ?? null));
            setChatError('');
        } catch (error) {
            if (error?.response?.status === 401) {
                handleUnauthorized();
                return;
            }
            setChatError(getApiErrorMessage(error, 'Unable to load chat threads.'));
        } finally {
            if (!silent) setIsLoadingThreads(false);
        }
    };

    const loadThreadDetails = async (threadId, silent = false) => {
        if (!threadId) return;
        if (!silent) setIsLoadingThreadDetails(true);

        try {
            const response = await ChatAPI.getAdminThreadDetails(threadId);
            const details = response?.result || null;
            setThreadDetails(details);
            if (details?.thread) {
                setThreads((prev) => prev.map((item) => (item.id === details.thread.id ? details.thread : item)));
            }
            setChatError('');
        } catch (error) {
            if (error?.response?.status === 401) {
                handleUnauthorized();
                return;
            }
            setChatError(getApiErrorMessage(error, 'Unable to load thread details.'));
        } finally {
            if (!silent) setIsLoadingThreadDetails(false);
        }
    };

    useEffect(() => {
        loadThreads();
        const intervalId = window.setInterval(() => loadThreads(true), 8000);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        setAdminAttachment(null);
        if (adminAttachmentInputRef.current) {
            adminAttachmentInputRef.current.value = '';
        }

        if (!selectedThreadId) {
            setThreadDetails(null);
            return;
        }

        loadThreadDetails(selectedThreadId);
        const intervalId = window.setInterval(() => loadThreadDetails(selectedThreadId, true), 6000);
        return () => window.clearInterval(intervalId);
    }, [selectedThreadId]);

    const messageCount = threadDetails?.messages?.length || 0;
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messageCount]);

    const handleSendAdminMessage = async (e) => {
        e.preventDefault();
        const normalizedBody = draftMessage.trim();
        const hasAttachment = Boolean(adminAttachment);

        if ((!normalizedBody && !hasAttachment) || !selectedThreadId || isSending) return;

        setIsSending(true);
        try {
            let response;
            if (hasAttachment) {
                const formData = new FormData();
                if (normalizedBody) {
                    formData.append('body', normalizedBody);
                }
                formData.append('attachment', adminAttachment);
                response = await ChatAPI.sendAdminAttachment(selectedThreadId, formData);
            } else {
                response = await ChatAPI.sendAdminMessage(selectedThreadId, { body: normalizedBody });
            }

            const details = response?.result || null;
            setThreadDetails(details);
            if (details?.thread) {
                setThreads((prev) => prev.map((item) => (item.id === details.thread.id ? details.thread : item)));
            }
            setDraftMessage('');
            setAdminAttachment(null);
            if (adminAttachmentInputRef.current) {
                adminAttachmentInputRef.current.value = '';
            }
            setChatError('');
        } catch (error) {
            if (error?.response?.status === 401) {
                handleUnauthorized();
                return;
            }
            setChatError(getApiErrorMessage(error, 'Unable to send message.'));
        } finally {
            setIsSending(false);
        }
    };

    const activeThread = threadDetails?.thread;
    const activeMessages = threadDetails?.messages || [];

    return (
        <div className="admin-chat-page">
            <div className="admin-chat-shell">
                <aside className="admin-chat-threads">
                    <h3>Fils de discussion</h3>
                    {isLoadingThreads ? (
                        <p className="admin-chat-empty">Chargement des fils...</p>
                    ) : threads.length === 0 ? (
                        <p className="admin-chat-empty">Aucune conversation pour l'instant.</p>
                    ) : (
                        threads.map((thread) => (
                            <button
                                key={thread.id}
                                type="button"
                                onClick={() => setSelectedThreadId(thread.id)}
                                className={`admin-chat-thread-item ${selectedThreadId === thread.id ? 'active' : ''}`}
                            >
                                <span className="admin-chat-thread-name">{thread.userName || `User #${thread.userId}`}</span>
                                <span className="admin-chat-thread-preview">{thread.lastMessagePreview || 'Aucun message'}</span>
                                {thread.unreadAdminCount > 0 && (
                                    <span className="admin-chat-thread-unread">{thread.unreadAdminCount}</span>
                                )}
                            </button>
                        ))
                    )}
                </aside>

                <section className="admin-chat-main">
                    {activeThread ? (
                        <>
                            <div className="admin-chat-header">
                                <div>
                                    <h3>{activeThread.userName || `User #${activeThread.userId}`}</h3>
                                    <p>Thread #{activeThread.id}</p>
                                </div>
                            </div>

                            <div className="support-chat-messages admin-chat-messages">
                                {isLoadingThreadDetails ? (
                                    <p className="support-chat-empty">Chargement des messages...</p>
                                ) : activeMessages.length === 0 ? (
                                    <p className="support-chat-empty">Aucun message pour l'instant.</p>
                                ) : (
                                    activeMessages.map((message) => {
                                        const isAdminMessage = message.senderRole === 'ADMIN';
                                        return (
                                            <article
                                                key={message.id}
                                                className={`support-chat-bubble ${isAdminMessage ? 'support-chat-bubble-user' : 'support-chat-bubble-admin'}`}
                                            >
                                                <p className="support-chat-bubble-author">{isAdminMessage ? 'Vous' : (message.senderName || 'Utilisateur')}</p>
                                                <p className="support-chat-bubble-body">{message.body}</p>
                                                {message.attachmentUrl && (
                                                    <div className="support-chat-attachment-wrap">
                                                        <a
                                                            href={resolveBackendFileUrl(message.attachmentUrl)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="support-chat-attachment-link"
                                                        >
                                                            <Paperclip size={14} />
                                                            {message.attachmentName || 'Attachment'}
                                                            {message.attachmentSize ? ` (${formatAttachmentSize(message.attachmentSize)})` : ''}
                                                        </a>
                                                        {isImageAttachment(message.attachmentMimeType) && (
                                                            <a href={resolveBackendFileUrl(message.attachmentUrl)} target="_blank" rel="noreferrer">
                                                                <img
                                                                    src={resolveBackendFileUrl(message.attachmentUrl)}
                                                                    alt={message.attachmentName || 'Attachment'}
                                                                    className="support-chat-attachment-image"
                                                                />
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })
                                )}
                                <div ref={endRef} />
                            </div>

                            <form onSubmit={handleSendAdminMessage} className="support-chat-form">
                                <textarea
                                    placeholder="Répondre à cet utilisateur..."
                                    value={draftMessage}
                                    onChange={(e) => setDraftMessage(e.target.value)}
                                    rows={3}
                                    maxLength={2000}
                                    className="support-chat-input"
                                />
                                <div className="support-chat-attachment-row">
                                    <label className="support-chat-attachment-picker">
                                        <Paperclip size={14} />
                                        Joindre un fichier
                                        <input
                                            ref={adminAttachmentInputRef}
                                            type="file"
                                            onChange={(e) => setAdminAttachment(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                    {adminAttachment && (
                                        <span className="support-chat-attachment-selected">{adminAttachment.name}</span>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="support-chat-send"
                                    disabled={isSending || (!draftMessage.trim() && !adminAttachment)}
                                >
                                    {isSending ? 'Envoi...' : 'Envoyer'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <p className="admin-chat-empty">Sélectionnez un fil pour commencer à répondre.</p>
                    )}
                </section>
            </div>

            {chatError && <p className="support-chat-error" style={{ marginTop: '1rem' }}>{chatError}</p>}
        </div>
    );
};

const UserAuth = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login');
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingRegisterCode, setIsSendingRegisterCode] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [form, setForm] = useState({
        loginIdentifier: '',
        loginPassword: '',
        registerName: '',
        registerEmail: '',
        registerVerificationCode: '',
        registerPhone: '',
        registerPassword: '',
        registerConfirmPassword: '',
    });

    useEffect(() => {
        if (localStorage.getItem(USER_TOKEN_KEY)) {
            navigate('/');
        }
    }, [navigate]);

    const [isCodeSent, setIsCodeSent] = useState(false);

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        updateField(name, value);
    };

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setError('');
        setMessage('');
        setIsCodeSent(false);
    };

    const handleSendRegisterCode = async () => {
        setError('');
        setMessage('');

        // --- Client-side validation before touching the API ---
        const name = form.registerName.trim();
        const email = form.registerEmail.trim().toLowerCase();
        const password = form.registerPassword;
        const confirmPassword = form.registerConfirmPassword;

        if (!name) {
            setError('Veuillez entrer votre nom complet.');
            return;
        }
        if (!email) {
            setError('Veuillez entrer votre adresse e-mail.');
            return;
        }
        if (!password) {
            setError('Veuillez créer un mot de passe.');
            return;
        }
        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setIsSendingRegisterCode(true);
        try {
            await AuthAPI.sendVerificationCode({
                email,
                request_type: 'register',
            });
            setMessage('Code de vérification envoyé à votre e-mail. Il expire dans 5 minutes.');
            setIsCodeSent(true);
        } catch (apiError) {
            setError(getApiErrorMessage(apiError, 'Impossible d\'envoyer le code de vérification pour l\'instant.'));
        } finally {
            setIsSendingRegisterCode(false);
        }
    };

    const handleSendCode = handleSendRegisterCode;

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const payload = {
                name: form.loginIdentifier.trim(),
                password: form.loginPassword,
            };

            const response = await AuthAPI.login(payload);
            const token = response?.result?.access_token;
            if (!token) {
                throw new Error('Token not found in login response');
            }

            localStorage.setItem(USER_TOKEN_KEY, token);
            localStorage.setItem(
                USER_PROFILE_KEY,
                JSON.stringify({
                    name: form.loginIdentifier.trim(),
                    email: form.loginIdentifier.includes('@') ? form.loginIdentifier.trim().toLowerCase() : '',
                })
            );

            window.dispatchEvent(new Event(USER_SESSION_EVENT));

            navigate('/');
        } catch (apiError) {
            setError(getApiErrorMessage(apiError, 'Connexion impossible. Veuillez vérifier vos identifiants.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        if (form.registerPassword !== form.registerConfirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            setIsLoading(false);
            return;
        }

        if (!/^\d{6}$/.test((form.registerVerificationCode || '').trim())) {
            setError('Entrez le code de vérification à 6 chiffres envoyé à votre e-mail.');
            setIsLoading(false);
            return;
        }

        try {
            const registerPayload = {
                name: form.registerName.trim(),
                email: form.registerEmail.trim().toLowerCase(),
                phone_number: form.registerPhone.trim() || null,
                password: form.registerPassword,
                confirm_password: form.registerConfirmPassword,
                verification_code: form.registerVerificationCode.trim(),
            };

            const registerResponse = await AuthAPI.register(registerPayload);
            const loginResponse = await AuthAPI.login({
                name: registerPayload.email,
                password: registerPayload.password,
            });

            const token = loginResponse?.result?.access_token;
            if (!token) {
                throw new Error('Token not found in login response');
            }

            localStorage.setItem(USER_TOKEN_KEY, token);
            localStorage.setItem(
                USER_PROFILE_KEY,
                JSON.stringify({
                    name: registerResponse?.result?.name || registerPayload.name,
                    email: registerResponse?.result?.email || registerPayload.email,
                })
            );

            window.dispatchEvent(new Event(USER_SESSION_EVENT));

            setMessage('Compte créé avec succès. Redirection en cours...');
            navigate('/');
        } catch (apiError) {
            setError(getApiErrorMessage(apiError, 'Impossible de créer le compte. Veuillez réessayer.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        if (mode === 'login') {
            return handleLogin(e);
        }
        return handleRegister(e);
    };

    return (
        <div className="auth-page">
            <div className="auth-form-wrap">
                <div className="auth-header">
                    <h2>{mode === 'login' ? 'Bienvenue' : 'Créer un Compte'}</h2>
                    <p>{mode === 'login' ? 'Connectez-vous pour accéder à votre collection exclusive' : 'Rejoignez notre univers de fragrances de luxe'}</p>
                </div>
                
                {error && <div className="alert alert-error">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {mode === 'login' ? (
                        <>
                            <div className="form-group">
                                <label>Nom d'utilisateur</label>
                                <input
                                    type="text"
                                    name="loginIdentifier"
                                    value={form.loginIdentifier}
                                    onChange={handleInputChange}
                                    className="luxury-input"
                                    required
                                    placeholder="Votre nom d'utilisateur"
                                />
                            </div>
                            <div className="form-group">
                                <label>Mot de passe</label>
                                <input
                                    type="password"
                                    name="loginPassword"
                                    value={form.loginPassword}
                                    onChange={handleInputChange}
                                    className="luxury-input"
                                    required
                                    placeholder="Votre mot de passe"
                                />
                            </div>
                            <button type="submit" disabled={isLoading} className="luxury-btn luxury-btn-primary" style={{ width: '100%' }}>
                                {isLoading ? 'Connexion...' : 'Se Connecter'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label>Nom complet *</label>
                                <input
                                    type="text"
                                    name="registerName"
                                    value={form.registerName}
                                    onChange={handleInputChange}
                                    className="luxury-input"
                                    required
                                    placeholder="Votre nom complet"
                                    disabled={isCodeSent}
                                />
                            </div>
                            <div className="form-group">
                                <label>E-mail *</label>
                                <input
                                    type="email"
                                    name="registerEmail"
                                    value={form.registerEmail}
                                    onChange={handleInputChange}
                                    className="luxury-input"
                                    required
                                    placeholder="Votre adresse e-mail"
                                    disabled={isCodeSent}
                                />
                            </div>
                            <div className="form-group">
                                <label>Téléphone <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optionnel)</span></label>
                                <input
                                    type="tel"
                                    name="registerPhone"
                                    value={form.registerPhone}
                                    onChange={handleInputChange}
                                    className="luxury-input"
                                    placeholder="+216 xx xxx xxx"
                                />
                            </div>
                            <div className="form-group">
                                <label>Mot de passe *</label>
                                <input
                                    type="password"
                                    name="registerPassword"
                                    value={form.registerPassword}
                                    onChange={handleInputChange}
                                    className="luxury-input"
                                    required
                                    placeholder="Créer un mot de passe"
                                    disabled={isCodeSent}
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirmer le mot de passe *</label>
                                <input
                                    type="password"
                                    name="registerConfirmPassword"
                                    value={form.registerConfirmPassword}
                                    onChange={handleInputChange}
                                    className="luxury-input"
                                    required
                                    placeholder="Confirmez votre mot de passe"
                                    disabled={isCodeSent}
                                />
                            </div>

                            {isCodeSent && (
                                <div className="form-group">
                                    <label>Code de vérification *</label>
                                    <input
                                        type="text"
                                        name="registerVerificationCode"
                                        value={form.registerVerificationCode}
                                        onChange={handleInputChange}
                                        className="luxury-input"
                                        required
                                        placeholder="Code à 6 chiffres envoyé à votre e-mail"
                                        maxLength={6}
                                        inputMode="numeric"
                                    />
                                </div>
                            )}

                            {!isCodeSent ? (
                                <button type="button" onClick={handleSendCode} disabled={isSendingRegisterCode} className="luxury-btn luxury-btn-primary" style={{ width: '100%' }}>
                                    {isSendingRegisterCode ? 'Envoi du code...' : 'Envoyer le Code de Vérification'}
                                </button>
                            ) : (
                                <>
                                    <button type="submit" disabled={isLoading} className="luxury-btn luxury-btn-primary" style={{ width: '100%' }}>
                                        {isLoading ? 'Création...' : 'Créer le Compte'}
                                    </button>
                                    <button type="button" onClick={() => { setIsCodeSent(false); setMessage(''); setError(''); }} className="text-btn" style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                                        ← Modifier les informations / renvoyer le code
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </form>

                <div className="auth-footer">
                    {mode === 'login' ? (
                        <p>Pas encore de compte ? <button type="button" onClick={() => setMode('register')} className="text-btn">Créer un compte</button></p>
                    ) : (
                        <p>Déjà un compte ? <button type="button" onClick={() => setMode('login')} className="text-btn">Se connecter</button></p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Storefront Navigation */}
        <Route path="/" element={<StoreLayout />}>
          <Route index element={<StoreHome />} />
          <Route path="auth" element={<UserAuth />} />
          <Route path="products" element={<StoreShop />} />
          <Route path="products/:id" element={<ProductDetails />} />
        </Route>

        {/* Admin Navigation */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="chat" element={<AdminChatSupport />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

