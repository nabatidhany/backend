import { db } from '../db/client';
import { generateDailyContentFromGemini } from '../utils/gemini';

export async function generateAndStoreDailyContent() {
	const content = await generateDailyContentFromGemini();

	for (const [type, value] of Object.entries(content)) {
		await db.query(
			`INSERT INTO timeline_entries (type, content, created_by_ai) VALUES (?, ?, ?)`,
			[type, value, true]
		);
	}

	console.log("✅ Konten AI harian berhasil disimpan.");
}
