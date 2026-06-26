const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

const normalizeBaseUrl = (url) => url.replace(/\/+$/, '');

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, item);
        }
      });

      return;
    }

    searchParams.append(key, value);
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
};

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? null;
    this.data = options.data ?? null;
  }
}

let authToken = null;
let authTokenGetter = null;

const resolveToken = (tokenFromRequest) => {
  if (tokenFromRequest) {
    return tokenFromRequest;
  }

  if (typeof authTokenGetter === 'function') {
    return authTokenGetter();
  }

  return authToken;
};

const createResource = (path) => ({
  list: (params, options) => api.get(path, { ...options, params }),
  detail: (id, params, options) =>
    api.get(`${path}/${id}`, { ...options, params }),
  create: (data, options) => api.post(path, data, options),
  update: (id, data, options) => api.put(`${path}/${id}`, data, options),
  updateStatus: (id, is_active, options) => api.patch(`${path}/${id}/status`, { is_active }, options),
  remove: (id, options) => api.delete(`${path}/${id}`, options),
});

const request = async (
  path,
  {
    method = 'GET',
    params,
    data,
    headers = {},
    token,
    signal,
    responseType = 'json',
  } = {},
) => {
  const baseUrl = normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  );

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}${buildQueryString(params)}`;
  const resolvedToken = resolveToken(token);

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (data !== undefined && !(data instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (resolvedToken) {
    requestHeaders.Authorization = `Bearer ${resolvedToken}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
    signal,
  });

  let responseData = null;

  if (response.status !== 204) {
    if (responseType === 'text') {
      responseData = await response.text();
    } else {
      const rawText = await response.text();
      responseData = rawText ? JSON.parse(rawText) : null;
    }
  }

  if (!response.ok) {
    const message =
      responseData?.message ||
      response.statusText ||
      'Terjadi kesalahan saat menghubungi server';

    throw new ApiError(message, {
      status: response.status,
      data: responseData,
    });
  }

  return responseData;
};

const api = {
  get baseUrl() {
    return normalizeBaseUrl(
      import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
    );
  },

  setToken(token) {
    authToken = token;
  },

  clearToken() {
    authToken = null;
  },

  setTokenGetter(getter) {
    authTokenGetter = getter;
  },

  request,

  get(path, options) {
    return request(path, { ...options, method: 'GET' });
  },

  post(path, data, options) {
    return request(path, { ...options, method: 'POST', data });
  },

  put(path, data, options) {
    return request(path, { ...options, method: 'PUT', data });
  },

  patch(path, data, options) {
    return request(path, { ...options, method: 'PATCH', data });
  },

  delete(path, options) {
    return request(path, { ...options, method: 'DELETE' });
  },

  brands: createResource('/master/brands'),
  pics: createResource('/master/pics'),
  categories: createResource('/master/categories'),
  itemTypes: createResource('/master/item-types'),
  ports: createResource('/master/ports'),
  uoms: createResource('/master/uoms'),
  skuStatuses: createResource('/master/sku-statuses'),
  businessUnits: {
    list: (params, options) =>
      api.get('/directory/business-units', { ...options, params }),
    departments: (businessUnitId, params, options) =>
      api.get(`/directory/business-units/${businessUnitId}/departments`, {
        ...options,
        params,
      }),
  },
  auth: {
    me: (options) => api.get('/auth/me', options),
  },
  picUsers: {
    ...createResource('/master/pic-users'),
    options: (params, options) =>
      api.get('/master/pic-users/options', { ...options, params }),
  },
  itemParents: {
    ...createResource('/item/item-parents'),
    updateStatus: (id, status, options) =>
      api.put(`/item/item-parents/${id}`, { status }, options),
  },
  items: {
    ...createResource('/item/items'),
    updateStatus: (id, is_active, options) =>
      api.put(`/item/items/${id}`, { is_active }, options),
  },
};

export default api;

