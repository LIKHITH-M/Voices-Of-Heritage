const { z } = require('zod');

const VALID_ROLES = ['user', 'researcher', 'guide', 'institution'];

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    role: z.enum(VALID_ROLES).optional().default('user'),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Verification token is required'),
});

const updateProfileSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    avatar_url: z.string().url().optional().nullable(),
    heritage_interests: z.array(z.string()).max(20).optional(),
    notification_email: z.boolean().optional(),
    notification_push: z.boolean().optional(),
});

// Validation middleware factory
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.validatedData = result.data;
    next();
};

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    updateProfileSchema,
    validate,
};
