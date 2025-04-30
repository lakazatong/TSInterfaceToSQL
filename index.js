"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const THRESHOLD = 5;

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

function preprocess(schema) {
	if (schema.type) {
		if (Array.isArray(schema.type)) {
			if (schema.type.length !== 2 || !schema.type.includes("null")) {
				console.error("Impossible case reached", schema.type);
				return;
			}
			schema.type = schema.type.filter((type) => type !== "null")[0];
			schema.nullable = true;
		}

		if (schema.type === "object") {
			schema.deepness =
				1 +
				Math.max(
					...Object.entries(schema.properties).map(([k, v]) => {
						preprocess(v);
						v.nullable ??= !(schema.required ?? []).includes(k);
						// console.log(k, v);
						return v.deepness;
					})
				);
			schema.table = Object.keys(schema.properties).length > THRESHOLD;
			if (Object.values(schema.properties).every((s) => s.nullable)) {
				schema.nullable = true;
			}
			if (Object.values(schema.properties).every((s) => s.table)) {
				schema.table = true;
			}
		} else if (schema.type === "array") {
			preprocess(schema.items);
			schema.deepness = 1 + schema.items.deepness;
			schema.table = true;
		} else if (schema.type === "string") {
			if (schema.format === "date-time") {
				schema.type = "integer";
				delete schema.format;
			}
			schema.deepness = 0;
			schema.table = false;
		} else {
			schema.deepness = 0;
			schema.table = false;
		}
	} else if (
		Array.isArray(schema.anyOf) &&
		schema.anyOf.length === 2 &&
		schema.anyOf.some((s) => s && s.type === "null" && Object.keys(s).length === 1)
	) {
		const nonNullRaw = schema.anyOf.find((s) => !(s.type === "null" && Object.keys(s).length === 1));
		if (!nonNullRaw) {
			console.error("Impossible case reached", schema.anyOf);
			return;
		}
		const nonNull = JSON.parse(JSON.stringify(nonNullRaw));
		Object.keys(schema).forEach((key) => delete schema[key]);
		Object.assign(schema, nonNull);
		schema.nullable = true;
		preprocess(schema);
	} else if (Object.keys(schema).length === 1 && schema["$ref"]) {
		schema.table = true;
		schema.deepness = 0;
	} else {
		console.error("Impossible case reached", schema);
		return;
	}

	delete schema.required;
}

function collapse(schema) {
	function collapseRecursive(obj, path, propagate) {
		let result = {};

		Object.entries(obj.properties || {}).forEach(([key, val]) => {
			if (val.type === "object" && val.properties && propagate && !val.table) {
				let nested = collapseRecursive(val, path.concat(key), true);
				Object.entries(nested).forEach(([nestedKey, nestedVal]) => {
					result[`${key}_${nestedKey}`] = nestedVal;
				});
			} else if (val.type === "array" && val.items && val.items.type === "object" && val.items.properties) {
				collapseRecursive(val.items, path.concat(key), false);
				result[key] = val;
			} else if (val.type === "object" && val.properties && val.table) {
				collapseRecursive(val, path.concat(key), false);
				result[key] = val;
			} else {
				result[key] = val;
			}
		});

		obj.properties = result;
		return result;
	}

	collapseRecursive(schema, [], true);
}

function strip(schema) {
	const stop = schema.deepness === 0;
	delete schema.deepness;
	if (stop) return;
	for (const val of Object.values(schema)) {
		if (typeof val === "object" && val !== null) strip(val);
	}
}

function generateTables(tables, name, schema) {}

function convertSchema(root) {
	const tables = {};
	Object.entries(root.definitions).forEach(([name, schema]) => {
		// console.log(JSON.stringify(schema, null, 4));
		preprocess(schema);
		collapse(schema);
		strip(schema);
		generateTables(tables, name, schema);
	});
}

function JSONtoDB(interfacesFolderPath, name = null) {
	try {
		execSync(
			`typescript-json-schema --strictNullChecks true --required true --defaultNumberType "integer" --out schema.json ${interfacesFolderPath}/*.ts  *`,
			{ stdio: "inherit" }
		);
	} catch (error) {
		console.error("Error generating schema:", error);
		return;
	}

	const schema = JSON.parse(fs.readFileSync("schema.json", "utf-8"));
	convertSchema(schema);
	return columns;
}

console.log(JSONtoDB("interfaces"));
