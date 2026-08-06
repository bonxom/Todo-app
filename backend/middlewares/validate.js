export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.errors[0].message });
  }
  req.validatedBody = result.data;
  next();
};
