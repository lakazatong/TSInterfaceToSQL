"use strict";

const fs = require("fs");
const path = require('path');

function JSONtoDB(JSONpath, name=null) {
	const object = JSON.parse(fs.readFileSync(JSONpath));
	const columns = [];
	for (const [key, value] of Object.entries(object)) {
		console.log(key, typeof value);
		let type = "TEXT";
		if (typeof value === 'number') {
			type = Math.floor(value) === value ? "INTEGER" : "NUMERIC";
		} else if (typeof value === 'object') {
			
		}
		columns.push(`${key} ${type}${value ? " NOT NULL" : ""},`);
	}
	return `CREATE TABLE IF NOT EXISTS ${name ? name : path.parse(JSONpath).name} {\n\t${columns.join("\n\t").slice(0, -1)}\n}`;
}

console.log(JSONtoDB("user.json"));
