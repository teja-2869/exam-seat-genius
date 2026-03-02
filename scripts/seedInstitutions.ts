import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

// Read from process.env, which requires --env-file=.env or dotenv to be set up.
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

if (!firebaseConfig.apiKey) {
    console.error("Missing Firebase API Key. Please make sure to run this script with your .env variables loaded.");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLEGES_TO_SEED = [
    {
        name: "Sri Venkateshwara College of Engineering",
        state: "Andhra Pradesh",
        district: "Tirupati",
        address: "Karakambadi Road, Mangalam",
        pincode: "517507",
        collegeCode: "SVCE",
        affiliation: "JNTUA",
        verificationStatus: "verified",
        createdAt: new Date()
    },
    {
        name: "Indian Institute of Technology",
        state: "Tamil Nadu",
        district: "Chennai",
        address: "Adyar",
        pincode: "600036",
        collegeCode: "IITM",
        affiliation: "Autonomous",
        verificationStatus: "verified",
        createdAt: new Date()
    }
];

async function seed() {
    console.log("Starting Seeding Process...");
    const institutionsRef = collection(db, "institutions");

    for (const college of COLLEGES_TO_SEED) {
        // Check if the college already exists to prevent duplicate seeding
        const q = query(institutionsRef, where("collegeCode", "==", college.collegeCode));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            const docRef = await addDoc(institutionsRef, college);
            console.log(`✅ Seeded ${college.name} with ID: ${docRef.id}`);
        } else {
            console.log(`⏭️ Skipped (Already Exists): ${college.name}`);
        }
    }
    console.log("Seeding Completed.");
    process.exit(0);
}

seed().catch(console.error);
