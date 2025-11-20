import { CONFIG } from "@config";
import * as OpenApiValidator from "express-openapi-validator";
import YAML from "yamljs";

export const inputValidatorMiddleware = OpenApiValidator.middleware({
	apiSpec: YAML.load(CONFIG.SWAGGER_V1_FILE_PATH),
	validateRequests: true,
	validateResponses: {
		onError: (error, body, req) => {
			console.log(`Response body fails validation: ${error}`);
			console.log(`Emitted from: ${req.originalUrl}`);
			console.debug(body);
		},
	},
});
