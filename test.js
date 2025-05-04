"use strict";

const fs = require("fs");

function loadJSON(path) {
	return JSON.parse(fs.readFileSync(path, "utf-8"));
}

const schemas = loadJSON("schemas.json");
const tables = loadJSON("tables.json");

const insertUser = require("./get/insert.js")(schemas.user, tables);

const db = null;
const object = loadJSON("example.json");

insertUser(db, object);
