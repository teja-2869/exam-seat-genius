import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateSeatingPlan = functions.https.onCall(async (requestOrData: any, context?: any) => {
    // Normalize signature across Firebase Function v1 and v2 frameworks
    const data = requestOrData.data || requestOrData;
    const auth = requestOrData.auth || context?.auth;

    // 1. Security enforcement
    if (!auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");

    // Custom Claims extraction (Assuming setCustomClaims trigger has populated token.role and token.institutionId)
    // For immediate testing without custom claims populated during migration, we can fetch from Users directly fallback:
    let role = auth.token?.role;
    let institutionId = auth.token?.institutionId;

    if (!role || !institutionId) {
        const userDoc = await admin.firestore().collection('users').doc(auth.uid).get();
        if (!userDoc.exists) throw new functions.https.HttpsError("permission-denied", "User record missing.");
        const userData = userDoc.data();
        role = userData?.role;
        institutionId = userData?.institutionId;
    }

    if (role !== "ADMIN" && role !== "HOD") {
        throw new functions.https.HttpsError("permission-denied", "Unauthorized role.");
    }

    // 2. Extract context mappings safely
    const { examId, roomId, students } = data;
    if (!examId || !roomId || !students || students.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required seating parameters.");
    }

    // 3. Prevent Client-Side Key Leaks - Must be set in Firebase Config: firebase functions:config:set gemini.key="..."
    const apiKey = (functions as any).config().gemini ? (functions as any).config().gemini.key : process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new functions.https.HttpsError("internal", "API Key configuration missing.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: { responseMimeType: "application/json" }
    });

    // 4. Secure Backend Execution
    const prompt = `
    You are an expert exam coordinator. 
    Generate a JSON seating plan for ${students.length} students in room ${roomId}. 
    Students: ${JSON.stringify(students)}
    Rules:
    - Do not place students from the same branch adjacently.
    - Format output strictly as JSON.
    - Return a JSON object with an array 'arrangements' containing seat mappings.
  `;

    try {
        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();
        const seatingJson = JSON.parse(textResponse);

        // 5. Store directly on Backend before returning to mitigate network loss
        await admin.firestore()
            .collection("seatingPlans")
            .add({
                institutionId,
                examId,
                roomId,
                plan: seatingJson,
                generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                generatedBy: auth.uid
            });

        return { success: true, seatingJson };
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "AI Generation Failed");
    }
});
