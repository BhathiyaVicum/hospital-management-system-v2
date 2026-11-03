function normalizeEmptyStrings(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeEmptyStrings(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeEmptyStrings(nestedValue)]),
    );
  }
  return value === '' ? undefined : value;
}

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: normalizeEmptyStrings(req.body),
      params: normalizeEmptyStrings(req.params),
      query: normalizeEmptyStrings(req.query),
    });

    if (!result.success) {
      return res.status(400).json({
        message: 'Request validation failed.',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.slice(1).join('.'),
          message: issue.message,
        })),
      });
    }

    req.validated = result.data;
    return next();
  };
}
