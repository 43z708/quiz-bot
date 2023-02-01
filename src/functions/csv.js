export class CsvCommand {
	// csvテンプレート出力
	async outputTemplate(message, bucket) {
		const url = await bucket.file("template/quiz-template.csv").getSignedUrl({
			action: "read",
			expires: "12-31-3020", //1000年後に設定
		});
		message
			.reply({
				files: url,
			})
			.then()
			.catch(console.error);
		return;
	}

	// csv問題入力
}
