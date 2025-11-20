import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { NetworkRepository } from "@repositories/NetworkRepository";


describe("Gateway E2E tests", () => {
	let tokens: Record<string, string>;
	const networkCode = "test-network"; // Assicurati che esista nei tuoi seed
	const basePath = `/api/v1/networks/${networkCode}/gateways`;
	const gatewayData = {
		mac: "AA:BB:CC:DD:EE:FF",
		name: "Gateway Test",
		description: "test gateway",
	};

	beforeAll(async () => {
		await beforeAllE2e();
		tokens = {
      		admin: generateToken(TEST_USERS.admin),
      		operator: generateToken(TEST_USERS.operator),
      		viewer: generateToken(TEST_USERS.viewer),
    	};
		const networkRepo = new NetworkRepository();
  		await networkRepo.createNetwork("test-network", "Test Network");
	});

	afterAll(async () => {
		await afterAllE2e();
	});

	
	describe("GET /gateways", () => {
		it("should allow all authenticated users to get gateways", async () => {
			for (const role of Object.keys(tokens)) {
				const res = await request(app)
					.get(`/api/v1/networks/${networkCode}/gateways`)
			  		.set("Authorization", `Bearer ${tokens[role]}`);

				expect(res.status).toBe(200);
				expect(Array.isArray(res.body)).toBe(true);
		  	}
		});
	});

	describe("POST /gateways", () => {
		const sampleGateway = {
	    	macAddress: "AA:BB:CC:DD:EE:FF",
	    	name: "Test Gateway",
			description: "This is a test gateway",
	    };

		const sampleGateway2 = {
			macAddress: "11:22:33:44:55:66",
			name: "Another Test Gateway",
			description: "This is another test gateway",
		}

	    it("should allow admin and operator to create a gateway", async () => {
	      	for (const role of ["admin", "operator"]) {
				if (role === "admin") {
	        		const res = await request(app)
	          			.post(`/api/v1/networks/${networkCode}/gateways`)
	          			.set("Authorization", `Bearer ${tokens[role]}`)
	          			.send(sampleGateway);

					expect(res.status).toBe(201);
	        		expect(Array.isArray(res.body)).toBe(false);
				} else {
					const res = await request(app)
	          				.post(`/api/v1/networks/${networkCode}/gateways`)
	          				.set("Authorization", `Bearer ${tokens[role]}`)
	          				.send(sampleGateway2);

					expect(res.status).toBe(201);
	        		expect(Array.isArray(res.body)).toBe(false);
				}
	      	}
	    });

	    it("should forbid viewer from creating a gateway", async () => {
			const sampleGateway = {
	    		macAddress: "AA:BB:CC:DD:EE:FF",
	    		name: "Test Gateway",
				description: "This is a test gateway",
	    	};

	    	const res = await request(app)
	        	.post(`/api/v1/networks/${networkCode}/gateways`)
	        	.set("Authorization", `Bearer ${tokens.viewer}`)
	        	.send(sampleGateway);

	      	expect(res.status).toBe(403);
	    	
		});
	});

	describe("GET /gateways/:gatewayMac", () => {
    	it("should allow all authenticated users to fetch a specific gateway", async () => {
			const gatewayMac = "AA:BB:CC:DD:EE:FF"
    		for (const role of Object.keys(tokens)) {
    	    	const res = await request(app)
    	      		.get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
    	      		.set("Authorization", `Bearer ${tokens[role]}`);

    	    	expect(res.status).toBe(200);
    	    	expect(res.body.macAddress).toBe(gatewayMac);
    	  	}
    	});
  	});

	describe("PATCH /gateways/:gatewayMac", () => {
    	const updatedGateway = {
      		macAddress: "FF:GG:HH:II:JJ:KK",
      		name: "Updated Gateway Name",
      		description: "New Description",
    	};

		const updatedGateway2 = {
	  		macAddress: "55:66:77:88:99:AA",
			name: "Updated Gateway Name 2",
			description: "New Description 2",
		};

    	it("should allow admin and operator to update a gateway", async () => {
			const oldMac = "AA:BB:CC:DD:EE:FF"
			const oldMac2 = "11:22:33:44:55:66"
      		for (const role of ["admin", "operator"]) {
				if (role === "admin") {
        			const res = await request(app)
          				.patch(`/api/v1/networks/${networkCode}/gateways/${oldMac}`)
          				.set("Authorization", `Bearer ${tokens[role]}`)
          				.send(updatedGateway);

        			expect(res.status).toBe(204);
				} else {
					const res = await request(app)
		  				.patch(`/api/v1/networks/${networkCode}/gateways/${oldMac2}`)
		  				.set("Authorization", `Bearer ${tokens[role]}`)
		  				.send(updatedGateway2);

					expect(res.status).toBe(204);
				}
      		}
    	});

    	it("should forbid viewer from updating a gateway", async () => {
      		const res = await request(app)
        		.patch(`/api/v1/networks/${networkCode}/gateways/${updatedGateway.macAddress}`)
        		.set("Authorization", `Bearer ${tokens.viewer}`)
        		.send(updatedGateway);

      		expect(res.status).toBe(403);
    	});
  	});

	describe("DELETE /gateways/:gatewayMac", () => {

    	it("should allow admin and operator to delete a gateway", async () => {
			const gatewayMac = "FF:GG:HH:II:JJ:KK";
			const gatewayMac2 = "55:66:77:88:99:AA";
    		for (const role of ["admin", "operator"]) {
				if (role === "admin") {
    	    		const res = await request(app)
    	      			.delete(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
    	      			.set("Authorization", `Bearer ${tokens[role]}`);

    	    		expect(res.status).toBe(204);
				} else {
					const res = await request(app)
		      			.delete(`/api/v1/networks/${networkCode}/gateways/${gatewayMac2}`)
		      			.set("Authorization", `Bearer ${tokens[role]}`);

		    		expect(res.status).toBe(204);
				}
    	  	}
    	});

    	it("should forbid viewer from deleting a gateway", async () => {
			const gatewayMac = "AA:BB:CC:DD:EE:FF"
      		const res = await request(app)
        		.delete(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
        		.set("Authorization", `Bearer ${tokens.viewer}`);

      		expect(res.status).toBe(403);
    	});
  });

})