import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { CONFIG } from "@config";
import { errorHandler } from "@middlewares/errorMiddleware";
import authenticationRouter from "@routes/authenticationRoutes";
import userRouter from "@routes/userRoutes";
import gatewayRouter from "@routes/gatewayRoutes";
import sensorRouter from "@routes/sensorRoutes";
import measurementRouter from "@routes/measurementRoutes";
import networkRouter from "@routes/networkRoutes";
import cors from "cors";
import { inputValidatorMiddleware } from "@middlewares/inputValidatorMiddleware";

export const app = express();

// 1. Body parsers and CORS should come first
app.use(express.json());
app.use(cors());

// 2. Swagger UI setup - this should come before the validator if your validator uses the same OpenAPI specs
app.use(
	CONFIG.ROUTES.V1_SWAGGER,
	swaggerUi.serve,
	swaggerUi.setup(YAML.load(CONFIG.SWAGGER_V1_FILE_PATH)),
);

// 3. Input validator middleware - place it here after parsers but before routes
app.use(inputValidatorMiddleware);

// 4. Route handlers
app.use(CONFIG.ROUTES.V1_AUTH, authenticationRouter);
app.use(CONFIG.ROUTES.V1_USERS, userRouter);
app.use(CONFIG.ROUTES.V1_NETWORKS, networkRouter);
app.use(CONFIG.ROUTES.V1_GATEWAYS, gatewayRouter);
app.use(CONFIG.ROUTES.V1_SENSORS, sensorRouter);
app.use(measurementRouter);

// 5. Error handling middleware should always be last
app.use(errorHandler);
