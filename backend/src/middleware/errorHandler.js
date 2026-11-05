export function notFoundHandler(req, res) {
  return res.status(404).json({ message: 'Resource not found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.code === '23505') {
    return res.status(409).json({ message: 'Email provided details already exists.' });
  }
  if (error.code === '23P01') {
    return res.status(409).json({ message: 'The selected appointment time is no longer available.' });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  } else {
    console.error('Request failed:', error.message);
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status >= 500 ? 'An unexpected server error occurred.' : error.message;
  return res.status(status).json({ message });
}
