import mongoose from "mongoose";
// import dotenv from "dotenv";
import AvailablePlan from "../models/Plan"; // <-- adjust path if needed

// dotenv.config();

const MONGODB_URI =
	process.env.MONGODB_URI ||
	"mongodb+srv://rnkp755:qk72qnj1yus5IxoG@cluster0.wtess4u.mongodb.net/?retryWrites=true&w=majority";

if (!MONGODB_URI) {
	throw new Error("❌ MONGODB_URI is missing in .env");
}

const seedData = [
	{
		name: "silver",
		credits: 50,
		amount: 499,
		coupons: [
			{ code: "SILVER50", discount: 50 },
			{ code: "SAVE75", discount: 75 },
		],
		features: [
			"50 service request credits",
			"Basic priority support",
			"Access to standard features",
		],
	},
	{
		name: "gold",
		credits: 150,
		amount: 1199,
		coupons: [
			{ code: "GOLD100", discount: 100 },
			{ code: "GOLD150", discount: 150 },
		],
		features: [
			"150 service request credits",
			"Priority support",
			"Access to premium features",
			"Faster response time",
		],
	},
	{
		name: "platinum",
		credits: 400,
		amount: 2499,
		coupons: [
			{ code: "PLAT200", discount: 200 },
			{ code: "PLAT300", discount: 300 },
		],
		features: [
			"400 service request credits",
			"Top priority support",
			"Access to all premium features",
			"Dedicated account handling",
			"Best response time",
		],
	},
];

async function seedAvailablePlans() {
	try {
		await mongoose.connect(MONGODB_URI);
		console.log("✅ Connected to MongoDB");

		// Option 1: Remove old plans and insert fresh ones
		await AvailablePlan.deleteMany({});
		console.log("🗑️ Existing available plans deleted");

		await AvailablePlan.insertMany(seedData);
		console.log("🌱 Available plans seeded successfully");

		const plans = await AvailablePlan.find().lean();
		console.log("📦 Seeded Plans:", plans);
	} catch (error) {
		console.error("❌ Error seeding available plans:", error);
	} finally {
		await mongoose.disconnect();
		console.log("🔌 MongoDB disconnected");
		process.exit(0);
	}
}

seedAvailablePlans();
