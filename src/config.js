import dotenv from "dotenv";
dotenv.config();

export const config = {
	dev_token: process.env.DISCORD_DEV_TOKEN,
	prod_token: process.env.DISCORD_PROD_TOKEN,
};
