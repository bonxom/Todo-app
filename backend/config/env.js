const DEFAULT_ALLOWED_ORIGINS = [
    "https://fetodo-six.vercel.app",
    "https://fetodo.vercel.app",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];

const normalizeOrigin = (origin) => origin.replace(/\/+$/, "");

const parseAllowedOrigins = (value) => {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map(normalizeOrigin);
};

export const getAllowedOrigins = () => {
    const configuredOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

    return configuredOrigins.length > 0
        ? configuredOrigins
        : DEFAULT_ALLOWED_ORIGINS;
};

export const createCorsOptions = () => {
    const allowedOrigins = new Set(getAllowedOrigins());

    return {
        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }

            const normalizedOrigin = normalizeOrigin(origin);

            if (allowedOrigins.has(normalizedOrigin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`Origin '${origin}' is not allowed by CORS`));
        },
        methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false,
    };
};

export const getServerConfig = () => ({
    port: Number.parseInt(process.env.PORT ?? "3001", 10),
    host: process.env.HOST ?? "0.0.0.0",
});

export const validateServerEnv = () => {
    const missing = [];

    if (!process.env.MONGO_URI) {
        missing.push("MONGO_URI");
    }

    if (!process.env.JWT_SECRET) {
        missing.push("JWT_SECRET");
    }

    if (!process.env.JWT_EXPIRES_IN) {
        missing.push("JWT_EXPIRES_IN");
    }

    if (!process.env.SALT_ROUNDS) {
        missing.push("SALT_ROUNDS");
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}`
        );
    }

    const saltRounds = Number.parseInt(process.env.SALT_ROUNDS, 10);
    if (Number.isNaN(saltRounds) || saltRounds <= 0) {
        throw new Error("SALT_ROUNDS must be a positive integer");
    }
};

export const getAiApiKey = () => process.env.API_KEY?.trim() || null;
