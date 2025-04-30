"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const THRESHOLD = 3;

// function objectDeepness(obj) {
// 	if (typeof obj !== "object" || obj === null) return 0;
// 	let max = 0;
// 	if (Array.isArray(obj)) {
// 		for (const item of obj) {
// 			max = Math.max(max, objectDeepness(item));
// 		}
// 	} else {
// 		for (const value of Object.values(obj)) {
// 			max = Math.max(max, objectDeepness(value));
// 		}
// 	}
// 	return max + 1;
// }

function help(schema) {
	let nullable = false;
	let deepness = 0;

	function objectCase(schema) {
		deepness =
			Math.max(
				...Object.values(schema.properties).map((prop) => {
					help(prop);
					return prop.deepness;
				})
			) + 1;
	}

	if (Array.isArray(schema.type)) {
		if (schema.type.length !== 2 || !schema.type.includes("null")) {
			console.error("Impossible case reached", schema.type);
			return;
		}
		nullable = true;
		if (schema.type.includes("object")) {
			objectCase(schema);
		}
		schema.type = schema.type.filter((type) => type !== "null")[0];
	} else if (schema.type === "object") {
		objectCase(schema);
	}
	schema.nullable = nullable;
	schema.deepness = deepness;
	schema.table = deepness >= 1 && Object.keys(schema.properties).length > THRESHOLD;
}

function convertSchema(root) {
	Object.entries(root.definitions).forEach(([name, schema]) => {
		help(schema);
	});
}

function JSONtoDB(interfacesFolderPath, name = null) {
	try {
		execSync(
			`typescript-json-schema --strictNullChecks true --defaultNumberType "integer" --out schema.json ${interfacesFolderPath}/*.ts  *`,
			{ stdio: "inherit" }
		);
	} catch (error) {
		console.error("Error generating schema:", error);
		return;
	}

	const schema = JSON.parse(fs.readFileSync("schema.json", "utf-8"));
	const { columns, deepness } = convertSchema(schema);
	return columns;
}

console.log(JSONtoDB("interfaces"));
