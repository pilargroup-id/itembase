const config = require('../config');

function getDuplicateMessage(err) {
  const sqlMessage = err.sqlMessage || err.message || '';

  if (sqlMessage.includes('uq_brand_code')) {
    return {
      message: 'Brand code already exists',
      field: 'code',
      constraint: 'uq_brand_code',
    };
  }

  if (sqlMessage.includes('uq_brand_name')) {
    return {
      message: 'Brand name already exists',
      field: 'name',
      constraint: 'uq_brand_name',
    };
  }

  if (sqlMessage.includes('uq_pic_code')) {
    return {
      message: 'PIC code already exists',
      field: 'code',
      constraint: 'uq_pic_code',
    };
  }

  if (sqlMessage.includes('uq_pic_name')) {
    return {
      message: 'PIC name already exists',
      field: 'name',
      constraint: 'uq_pic_name',
    };
  }

  if (sqlMessage.includes('uq_pic_user')) {
    return {
      message: 'PIC user already exists',
      field: 'central_user_id',
      constraint: 'uq_pic_user',
    };
  }

  if (sqlMessage.includes('uq_detail_category')) {
    return {
      message: 'Detail category already exists',
      field: 'detail_category',
      constraint: 'uq_detail_category',
    };
  }

  if (sqlMessage.includes('uq_item_type_code')) {
    return {
      message: 'Item type code already exists',
      field: 'code',
      constraint: 'uq_item_type_code',
    };
  }

  if (sqlMessage.includes('uq_item_type_name')) {
    return {
      message: 'Item type name already exists',
      field: 'name',
      constraint: 'uq_item_type_name',
    };
  }

  if (sqlMessage.includes('uq_port_code')) {
    return {
      message: 'Port code already exists',
      field: 'code',
      constraint: 'uq_port_code',
    };
  }

  if (sqlMessage.includes('uq_port_name')) {
    return {
      message: 'Port name already exists',
      field: 'name',
      constraint: 'uq_port_name',
    };
  }

  if (sqlMessage.includes('uq_uom_code')) {
    return {
      message: 'UOM code already exists',
      field: 'code',
      constraint: 'uq_uom_code',
    };
  }

  if (sqlMessage.includes('uq_uom_name')) {
    return {
      message: 'UOM name already exists',
      field: 'name',
      constraint: 'uq_uom_name',
    };
  }

  if (sqlMessage.includes('uq_sku_status_code')) {
    return {
      message: 'SKU status code already exists',
      field: 'code',
      constraint: 'uq_sku_status_code',
    };
  }

  if (sqlMessage.includes('uq_sku_status_name')) {
    return {
      message: 'SKU status name already exists',
      field: 'name',
      constraint: 'uq_sku_status_name',
    };
  }

  return {
    message: 'Duplicate data already exists',
    field: null,
    constraint: null,
  };
}

/**
 * Global error handler.
 * Must be registered last in app.js after all routes.
 *
 * Catches errors thrown / passed via next(err) from anywhere.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    const duplicate = getDuplicateMessage(err);

    return res.status(409).json({
      success: false,
      message: duplicate.message,
      errors: {
        code: 'DUPLICATE_ENTRY',
        field: duplicate.field,
        constraint: duplicate.constraint,
      },
      ...(config.app.env === 'development' && { stack: err.stack }),
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message    = err.message    || 'Internal Server Error';

  const body = {
    success : false,
    message,
    ...(config.app.env === 'development' && { stack: err.stack }),
  };

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} →`, err);
  }

  return res.status(statusCode).json(body);
}

/**
 * 404 handler.
 * Register after all routes, before errorHandler.
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success : false,
    message : `Route ${req.method} ${req.originalUrl} not found`,
  });
}

module.exports = { errorHandler, notFoundHandler };