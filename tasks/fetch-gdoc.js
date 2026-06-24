/**
 * From The Pudding's Svelte Starter
 * Original repo: https://github.com/the-pudding/svelte-starter
 * Copyright (c) 2021 The Pudding
 * MIT License
 */

import fs from "fs"
import docs from "../google.config.js"
// import 'dotenv/config' // or require('dotenv').config();


const CWD = process.cwd()

const fetchGoogle = async ({ id, gid }) => {
	console.log(`fetching...${id}`)

	const base = "https://docs.google.com"
	const post = gid
		? `spreadsheets/u/1/d/${id}/export?format=csv&id=${id}&gid=${gid}`
		: `document/d/${id}/export?format=txt`
	const url = `${base}/${post}`

	try {
		const response = await fetch(url)
		const text = await response.text()

		// CSV file:
		if (gid) return text

	} catch (err) {
		throw new Error(err)
	}
};

(async () => {
	for (let d of docs) {
		try {
			const str = await fetchGoogle(d)
			const file = `${CWD}/${d.filepath}`
			fs.writeFileSync(file, str)
		} catch (err) {
			console.log(err)
		}
	}
})()
