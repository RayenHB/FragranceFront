import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) {
    return 'http://localhost:8000/api';
  }
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

const API_BASE_URL = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

export const resolveBackendFileUrl = (rawUrl) => {
  if (!rawUrl) return '';
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (!API_BASE_URL) return rawUrl;
  return `${API_BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
};

const normalizeProduct = (product) => {
  if (!product || typeof product !== 'object') return product;
  const imageUrl = product.imageUrl || product.image_url || '';
  const sizeMl = product.sizeMl ?? product.size_ml ?? null;
  let sizePrices = product.size_prices || product.sizePrices || {};
  if (typeof sizePrices === 'string') {
    try {
      sizePrices = JSON.parse(sizePrices);
    } catch (_) {
      sizePrices = {};
    }
  }
  return {
    ...product,
    imageUrl,
    image_url: imageUrl,
    sizeMl,
    size_ml: sizeMl,
    sizePrices,
    size_prices: sizePrices,
    genuine_image_url: product.genuineImageUrl ?? product.genuine_image_url ?? '',
    extract_image_url: product.extractImageUrl ?? product.extract_image_url ?? '',
    genuine_stock: product.genuineStock ?? product.genuine_stock ?? 0,
    extract_stock: product.extractStock ?? product.extract_stock ?? 0,
    bottle_ml: product.bottleMl ?? product.bottle_ml ?? null,
    perfume_gender: product.perfumeGender ?? product.perfume_gender ?? 'WOMEN',
    genuine_size_prices: product.genuineSizePrices ?? product.genuine_size_prices ?? null,
    extract_size_prices: product.extractSizePrices ?? product.extract_size_prices ?? null,
  };
};

const normalizeOrder = (order) => {
  if (!order || typeof order !== 'object') return order;
  const items = Array.isArray(order.items)
    ? order.items.map((item) => ({
        ...item,
        productId: item.productId ?? item.product_id,
        unitPrice: item.unitPrice ?? item.unit_price,
        lineTotal: item.lineTotal ?? item.line_total,
        sizeMl: item.sizeMl ?? item.size_ml,
        perfumeCategory: item.perfumeCategory ?? item.perfume_category,
        perfumeGender: item.perfumeGender ?? item.perfume_gender,
        product: normalizeProduct(item.product),
      }))
    : [];

  return {
    ...order,
    customerName: order.customerName ?? order.customer_name,
    customerEmail: order.customerEmail ?? order.customer_email,
    customerPhone: order.customerPhone ?? order.customer_phone,
    shippingAddress: order.shippingAddress ?? order.shipping_address,
    postalCode: order.postalCode ?? order.postal_code,
    totalAmount: order.totalAmount ?? order.total_amount,
    items,
  };
};


// Admin Interceptor for tokens
api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('adminToken');
  const userToken = localStorage.getItem('userToken');
  const requestUrl = config.url || '';

  const isUserRoute = requestUrl.startsWith('/users') || requestUrl.startsWith('/chat/user');
  const isAdminRoute = requestUrl.startsWith('/admin') || requestUrl.startsWith('/chat/admin');

  let token = null;
  if (isUserRoute) {
    token = userToken;
  } else if (isAdminRoute) {
    token = adminToken || userToken;
  } else {
    token = adminToken || userToken;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthAPI = {
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  sendVerificationCode: (data) => api.post('/auth/send-code', data).then(r => r.data),
};

export const AdminAPI = {
  login: (data) => api.post('/admin/admin/login', data).then(r => r.data),
};

export const ProductsAPI = {
  getGenders: () => api.get('/products/genders').then(r => Array.isArray(r.data?.result) ? r.data.result : []),
  getProducts: () => api.get('/products/products').then(r => {
    const result = Array.isArray(r.data?.result) ? r.data.result.map(normalizeProduct) : [];
    return { ...r.data, result };
  }),
  getProduct: (id) => api.get(`/products/products/${id}`).then(r => {
    const result = normalizeProduct(r.data?.result);
    return { ...r.data, result };
  }),
  createProduct: (data) => {
    const payload = data?.product_payload || data?.productPayload || {};
    const normalized = {
      ...data,
      product_payload: {
        ...payload,
        image_url: payload.image_url || payload.imageUrl || payload.imageURL || '',
      },
    };
    delete normalized.productPayload;
    return api.post('/products/create-product', normalized).then(r => r.data);
  },
  updateProduct: (id, data) => {
    const normalized = {
      ...data,
      image_url: data.image_url || data.imageUrl || data.imageURL || undefined,
    };
    delete normalized.imageUrl;
    delete normalized.imageURL;
    return api.put(`/products/update_products/${id}`, normalized).then(r => r.data);
  },
  deleteProduct: (id) => api.delete(`/products/delete_products/${id}`).then(r => r.data),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post('/products/upload-image', formData).then(r => r.data);
  },
};

export const OrdersAPI = {
  getOrders: (params) => api.get('/orders/orders', { params }).then(r => {
    const result = Array.isArray(r.data?.result) ? r.data.result.map(normalizeOrder) : [];
    return { ...r.data, result };
  }),
  createOrder: (data) => {
    const payload = data?.order_payload || data?.orderPayload || {};
    const items = Array.isArray(payload.items)
      ? payload.items.map((item) => ({
          ...item,
          product_id: item.product_id ?? item.productId,
        }))
      : [];

    const normalized = {
      ...data,
      order_payload: {
        ...payload,
        customer_name: payload.customer_name ?? payload.customerName,
        customer_email: payload.customer_email ?? payload.customerEmail,
        customer_phone: payload.customer_phone ?? payload.customerPhone,
        shipping_address: payload.shipping_address ?? payload.shippingAddress,
        postal_code: payload.postal_code ?? payload.postalCode,
        items,
      },
    };
    delete normalized.orderPayload;
    return api.post('/orders/create-order', normalized).then(r => r.data);
  },
  updateStatus: (id, status) => api.put(`/orders/orders/${id}/status`, { order_payload: { status } }).then(r => r.data)
};

export const ChatAPI = {
  getUserConversation: () => api.get('/chat/user/conversation').then(r => r.data),
  sendUserMessage: (data) => api.post('/chat/user/messages', data).then(r => r.data),
  sendUserAttachment: (formData) => api.post('/chat/user/messages/attachments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data),

  getAdminThreads: () => api.get('/chat/admin/threads').then(r => r.data),
  getAdminThreadDetails: (threadId) => api.get(`/chat/admin/threads/${threadId}`).then(r => r.data),
  sendAdminMessage: (threadId, data) => api.post(`/chat/admin/threads/${threadId}/messages`, data).then(r => r.data),
  sendAdminAttachment: (threadId, formData) => api.post(`/chat/admin/threads/${threadId}/messages/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data),
  updateAdminThreadStatus: (threadId, data) => api.put(`/chat/admin/threads/${threadId}/status`, data).then(r => r.data),
};

export const UsersAPI = {
  getUsers: (params) => api.get('/users/list', { params }).then(r => r.data),
  createUser: (data) => api.post('/users/create', data).then(r => r.data),
  deleteUser: (id) => api.delete(`/users/delete/${id}`).then(r => r.data)
};



export default api;
