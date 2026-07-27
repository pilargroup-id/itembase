const response = require('../../utils/response.util');
const ItemDownloadService = require('../../services/item/item-download.service');

async function download(req, res) {
  try {
    const result = await ItemDownloadService.exportXlsx(req.query);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);

    return res.send(result.buffer);
  } catch (error) {
    if (error.statusCode === 422) {
      return response.badRequest(res, error.message);
    }

    return response.badRequest(res, error.message || 'Download failed');
  }
}

module.exports = {
  download,
};
