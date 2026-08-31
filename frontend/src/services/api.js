const DEFAULT_API_BASE_URL = '/api';
const AUTH_TOKEN_STORAGE_KEYS = [
  'itembase.auth.token',
  'token',
  'authToken',
  'access_token',
];

const normalizeBaseUrl = (url) => url.replace(/\/+$/, '');
const normalizeAuthToken = (value) => {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (typeof parsedValue === 'string') {
      return normalizeAuthToken(parsedValue);
    }

    if (parsedValue && typeof parsedValue === 'object') {
      return normalizeAuthToken(
        parsedValue.token ||
          parsedValue.authToken ||
          parsedValue.access_token ||
          parsedValue.accessToken ||
          parsedValue.bearer,
      );
    }
  } catch {
    // Stored tokens are often plain strings, so JSON parse failures are expected.
  }

  return rawValue.replace(/^Bearer\s+/i, '').trim() || null;
};

const getStoredAuthToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storageAreas = [window.localStorage, window.sessionStorage];

    for (const storage of storageAreas) {
      for (const storageKey of AUTH_TOKEN_STORAGE_KEYS) {
        const token = normalizeAuthToken(storage.getItem(storageKey));

        if (token) {
          return token;
        }
      }
    }

    return normalizeAuthToken(window.__ITEMBASE_AUTH_TOKEN__ || window.__AUTH_TOKEN__);
  } catch {
    return null;
  }
};

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
  const requestToken = normalizeAuthToken(tokenFromRequest);

  if (requestToken) {
    return requestToken;
  }

  if (typeof authTokenGetter === 'function') {
    const getterToken = normalizeAuthToken(authTokenGetter());

    if (getterToken) {
      return getterToken;
    }
  }

  return normalizeAuthToken(authToken) || getStoredAuthToken();
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
    if (responseType === 'blob') {
      responseData = await response.blob();
    } else if (responseType === 'text') {
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
  subBrands: {
    suggestions: (params, options) =>
      api.get('/item/item-parents/helpers/subbrands', { ...options, params }),
    create: (data, options) =>
      api.post('/item/item-parents/helpers/subbrands', data, options),
  },
  pics: createResource('/master/pics'),
  categories: createResource('/master/categories'),
  itemTypes: createResource('/master/item-types'),
  ports: createResource('/master/ports'),
  uoms: createResource('/master/uoms'),
  variantAttributes: createResource('/master/variants/attributes'),
  variantValue: createResource('/master/variants/values'),
  variants: {
    attributes: (params, options) =>
      api.get('/master/variants/attributes', { ...options, params }),
    values: (params, options) =>
      api.get('/master/variants/values', { ...options, params }),
  },
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
  directoryUsers: {
    product: (params, options) =>
      api.get('/directory/users/product', { ...options, params }),
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
    options: (params, options) =>
      api.get('/item/item-parents/options', { ...options, params }),
    itemConfig: (id, options) =>
      api.get(`/item/item-parents/${id}/item-config`, options),
    suggestSubbrands: (params, options) =>
      api.subBrands.suggestions(params, options),
    updateStatus: (id, status, options) =>
      api.put(`/item/item-parents/${id}`, { status }, options),
  },
  items: {
    ...createResource('/item/items'),
    updateStatus: (id, is_active, extraFields = {}, options) =>
      api.put(`/item/items/${id}`, { is_active, ...extraFields }, options),
    matrixPreview: (data, options) =>
      api.post('/item/items/matrix/preview', data, options),
    createMatrix: (data, options) =>
      api.post('/item/items/matrix', data, options),
  },
  itemDownloads: {
    xlsx: (params, options) =>
      api.get('/item/download', { ...options, params, responseType: 'blob' }),
  },
  itemData: {
    templates: {
      parents: (options) =>
        api.get('/item-data/templates/parents', { ...options, responseType: 'blob' }),
      items: (options) =>
        api.get('/item-data/templates/items', { ...options, responseType: 'blob' }),
      bundles: (options) =>
        api.get('/item-data/templates/bundles', { ...options, responseType: 'blob' }),
      masters: (type, options) =>
        api.get(`/item-data/templates/masters/${type}`, { ...options, responseType: 'blob' }),
    },
    export: (params, options) =>
      api.get('/item-data/export/items', { ...options, params, responseType: 'blob' }),
    exportParents: (params, options) =>
      api.get('/item-data/export/parents', { ...options, params, responseType: 'blob' }),
    exportMaster: (type, params, options) =>
      api.get(`/item-data/export/masters/${type}`, { ...options, params, responseType: 'blob' }),
    imports: {
      parentsPreview: (data, options) =>
        api.post('/item-data/imports/parents/preview', data, options),
      itemsPreview: (data, options) =>
        api.post('/item-data/imports/items/preview', data, options),
      bundlesPreview: (data, options) =>
        api.post('/item-data/imports/bundles/preview', data, options),
      commit: (data, options) =>
        api.post('/item-data/imports/commit', data, options),
      errors: (errorFileToken, options) =>
        api.get(`/item-data/imports/errors/${errorFileToken}`, {
          ...options,
          responseType: 'blob',
        }),
      cancelPreview: (previewToken, options) =>
        api.delete(`/item-data/imports/preview/${previewToken}`, options),
      masterPreview: (type, data, options) =>
        api.post(`/item-data/imports/masters/${type}/preview`, data, options),
      masterCommit: (data, options) =>
        api.post('/item-data/imports/masters/commit', data, options),
      masterErrors: (errorFileToken, options) =>
        api.get(`/item-data/imports/masters/errors/${errorFileToken}`, {
          ...options,
          responseType: 'blob',
        }),
      masterCancelPreview: (previewToken, options) =>
        api.delete(`/item-data/imports/masters/preview/${previewToken}`, options),
    },
  },
  activityLogs: createResource('/activity-logs'),
};

export default api;

