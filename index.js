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

function preprocess(schemas) {
	function help(schema) {
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
				Object.entries(schema.properties).forEach(([k, v]) => {
					help(v);
					v.nullable ??= !(schema.required ?? []).includes(k);
				});

				// schema.deepness = 1 + Math.max(...Object.values(schema.properties).map((v) => v.deepness));

				schema.table = Object.keys(schema.properties).length > THRESHOLD;
				// if (Object.values(schema.properties).every((s) => s.nullable)) {
				// 	schema.nullable = true;
				// }
				// if (Object.values(schema.properties).every((s) => s.table)) {
				// 	schema.table = true;
				// }
			} else if (schema.type === "array") {
				help(schema.items);
				// schema.deepness = 1 + schema.items.deepness;
				schema.table = true;
			} else if (schema.type === "string") {
				if (schema.format === "date-time") {
					schema.type = "integer";
					delete schema.format;
				}
				// schema.deepness = 0;
				schema.table = false;
			} else {
				// schema.deepness = 0;
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
			help(schema);
		} else if (Object.keys(schema).length === 1 && schema["$ref"]) {
			schema.table = true;
			// schema.deepness = 0;
		} else {
			console.error("Impossible case reached", schema);
			return;
		}
	}

	function collapse(schema) {
		function collapseRecursive(obj, propagate) {
			let result = {};

			Object.entries(obj.properties || {}).forEach(([key, val]) => {
				if (val.type === "object" && val.properties && propagate && !val.table) {
					let nested = collapseRecursive(val, true);
					Object.entries(nested).forEach(([nestedKey, nestedVal]) => {
						result[`${key}.${nestedKey}`] = nestedVal;
					});
				} else if (val.type === "array" && val.items && val.items.type === "object" && val.items.properties) {
					collapseRecursive(val.items, false);
					result[key] = val;
				} else if (val.type === "object" && val.properties && val.table) {
					collapseRecursive(val, false);
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

	Object.entries(schemas.definitions).forEach(([name, schema]) => {
		help(schema);
		collapse(schema);
	});

	delete schemas["$schema"];

	function flatten(o, key) {
		if (o[key] && typeof o[key] === "object") {
			const flattened = { ...o, ...o[key] };
			delete flattened[key];
			return flattened;
		}
		return o;
	}

	return flatten(schemas, "definitions");
}

// function strip(schema) {
// 	const stop = schema.deepness === 0;
// 	delete schema.deepness;
// 	if (stop) return;
// 	for (const val of Object.values(schema)) {
// 		if (typeof val === "object" && val !== null) strip(val);
// 	}

// 	delete schema.required;
// }

function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function decapitalize(str) {
	return str.charAt(0).toLowerCase() + str.slice(1);
}

function generateTables(tables, name, schema, ref = null) {
	const toAdd = [];
	if (tables[capitalize(name)]) return;
	const columns = {};
	Object.entries(schema.properties || {}).forEach(([key, val]) => {
		if (val.table === true) {
			if (val["$ref"]) {
				toAdd.push(() => {
					const refName = val["$ref"].split("/").pop();
					if (!tables[refName]) {
						console.log("Impossible case reached", refName);
						return;
					}
					if (Object.keys(tables[refName]).some((colName) => colName === "key")) return;
					tables[refName]["key"] = {
						type: "string",
						nullable: false,
					};
				});
			} else {
				toAdd.push(...generateTables(tables, key, val.type === "array" ? val.items : val, name));
			}
		} else if (val.enum) {
			columns[key] = {
				type: "enum",
				nullable: val.nullable,
				values: val.enum,
			};
		} else {
			columns[key] = {
				type: val.type,
				nullable: val.nullable,
			};
		}
	});
	if (!Object.keys(columns).some((colName) => colName === "id")) {
		columns["id"] = {
			type: "generated",
			nullable: false,
		};
	}
	if (schema.enum) {
		columns["value"] = {
			type: "enum",
			nullable: false,
			values: schema.enum,
		};
	}
	if (ref) {
		columns[`${ref}.id`] = {
			type: "ref",
			nullable: false,
		};
	}
	tables[capitalize(name)] = columns;
	return toAdd;
}

function convertSchemas(schemas) {
	const toAdd = [];
	const tables = {};
	Object.entries(schemas).forEach(([name, schema]) => {
		toAdd.push(...generateTables(tables, decapitalize(name), schema));
	});
	toAdd.forEach((fn) => {
		fn();
	});
	return tables;
}

function InterfacesToTables(interfacesFolderPath) {
	try {
		execSync(
			`typescript-json-schema --strictNullChecks true --required true --defaultNumberType "integer" --out schemas.json ${interfacesFolderPath}/*.ts  *`,
			{ stdio: "inherit" }
		);
	} catch (error) {
		console.error("Error generating schema:", error);
		return;
	}

	let schemas = JSON.parse(fs.readFileSync("schemas.json", "utf-8"));
	schemas = preprocess(schemas);

	fs.writeFileSync("schemas.json", JSON.stringify(schemas, null, 4));

	console.log("You can now manually edit 'schema.json' if needed. Press Enter to continue...");
	require("readline-sync").question();

	schemas = JSON.parse(fs.readFileSync("schemas.json", "utf-8"));

	let tables = convertSchemas(schemas);
	fs.writeFileSync("tables.json", JSON.stringify(tables, null, 4));

	console.log("You can now manually edit 'tables.json' if needed.");
}

InterfacesToTables("interfaces");
