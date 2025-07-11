// export async function generateContentFromGemini(type: string): Promise<string> {
    // const prompts = {
    //   quote: "Buat satu quote islami singkat (maksimal 1 kalimat) yang bisa memberi semangat untuk menjalani hari. Gunakan gaya bahasa ringan, menyentuh, dan mudah dipahami.",
    //   ayat: "Berikan satu ayat Al-Qur'an beserta artinya dan penjelasan ringkas (tafsir ringan) yang relevan dengan kehidupan sehari-hari. Gunakan bahasa Indonesia yang mudah dipahami.",
    //   tips: "Berikan satu tips atau nasehat islami sederhana yang bisa diamalkan oleh muslim setiap hari, dan mampu memperbaiki akhlak atau semangat beribadah.",
    //   challenge: `Berikan satu tantangan ibadah ringan yang bisa dilakukan hari ini oleh seorang muslim. Contoh: "Jangan tinggalkan sholat dhuha", "Baca 5 ayat Al-Qur'an", dan sebagainya.`
    // };
  
//     const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyBPzp-ALBhPcSsQUyUb_IseKa-wN504RUE", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         contents: [{ parts: [{ text: prompts[type as keyof typeof prompts] }] }]
//       })
//     });
  
//     const data = await res.json();
//     return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Gagal mengambil konten";
//   }
  
  export async function generateDailyContentFromGemini(): Promise<{
    quote: string
    ayat: string
    tips: string
    challenge: string
  }> {
    const prompt = `
  	Kamu adalah AI Islami yang membantu mengisi konten timeline harian untuk aplikasi motivasi Muslim.

    Berikan 4 konten berbeda dalam format JSON **tanpa penjelasan tambahan**, langsung JSON-nya saja.

    Contoh format:
    {
    	"quote": "Buat satu quote islami singkat (maksimal 1 kalimat) yang bisa memberi semangat untuk menjalani hari. Gunakan gaya bahasa ringan, menyentuh, dan mudah dipahami.",
      "ayat": "Berikan satu ayat Al-Qur'an beserta artinya dan penjelasan ringkas (tafsir ringan) yang relevan dengan kehidupan sehari-hari dan jelajahi semua ayat pada alquran yang cocok diberikan pada hari ini. Gunakan bahasa Indonesia yang mudah dipahami.",
      "tips": "Berikan satu tips atau nasehat islami sederhana yang bisa diamalkan oleh muslim setiap hari, dan mampu memperbaiki akhlak atau semangat beribadah.",
      "challenge": "Berikan satu tantangan ibadah ringan yang bisa dilakukan hari ini oleh seorang muslim. Contoh: "Jangan tinggalkan sholat dhuha", "Baca 5 ayat Al-Qur'an", dan sebagainya."
    }

    Berikan konten baru hari ini. Balas **hanya JSON-nya saja**.
    Penting, untuk setiap bagian quote, tips, chalenge dan yang penting bagian ayat kembalikan dalam string saja jangan memakai object.
  `;

  function cleanJsonBlock(raw: string): string {
    return raw
      .replace(/```json\s*/i, '')  // hapus blok pembuka ```json
      .replace(/```$/, '')         // hapus blok penutup ```
      .trim();
  }
  
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyCs7qWDOBnn7p7tLFWyks6iRmnUXxQPZic`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
  
    const json = await res.json();
		let text = json.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!text) {
			throw new Error("AI tidak memberikan konten");
		}

		text = cleanJsonBlock(text);

		let result: any;
		try {
			result = JSON.parse(text);

			if (Array.isArray(result)) {
				result = result[0]; // fallback kalau AI tetap kasih array
			}

			// Validasi struktur
			const requiredFields = ['quote', 'ayat', 'tips', 'challenge'];
			for (const key of requiredFields) {
				if (!result[key]) throw new Error(`Field "${key}" kosong`);
			}

			return {
				quote: result.quote.trim(),
				ayat: result.ayat.trim(),
				tips: result.tips.trim(),
				challenge: result.challenge.trim()
			};
		} catch (e) {
			console.error("❌ Gagal parsing JSON AI:", text);
			throw new Error("AI response is not valid JSON.");
		}
  }
  