function flatten(o, key) {
	if (o[key] && typeof o[key] === "object") {
		const flattened = { ...o, ...o[key] };
		delete flattened[key];
		return flattened;
	}
	return o;
}

const o = {
	id: 0,
	team: {
		cover: "x",
	},
};

flatten(o, "team");

console.log(o);
