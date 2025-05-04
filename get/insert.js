"use strict";

module.exports = function getInsert(schema, tables) {
	return function insertObject(db, originalObject) {
		const o = { ...originalObject };
		let [tableName, table] = Object.entries(tables).pop();
		console.log(tableName);
		for (const [columnName, column] of Object.entries(table)) {
			if (column.type === "generated") continue;
			let value;
			if (columnName.includes(".")) {
				value = columnName.split(".").reduce((obj, key, index, array) => {
					if (index === array.length - 1) {
						delete obj[key];
					}
					return obj[key];
				}, o);
			} else {
				value = o[columnName];
				delete o[columnName];
			}
		}
		console.log(o);
	};
};
