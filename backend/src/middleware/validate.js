export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
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
