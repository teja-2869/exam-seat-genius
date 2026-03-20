import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Request OTP for HOD login — sends OTP to registered email.
 */
export const requestHodOTP = functions.https.onCall(async (request: any) => {
  const { email, hodId, institutionId } = request.data || request;

  if (!email || !hodId || !institutionId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields: email, hodId, institutionId");
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expireAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.collection("hod_otps").doc(email).set({
      otp,
      hodId,
      institutionId,
      expireAt: admin.firestore.Timestamp.fromDate(expireAt),
    });

    // Email OTP using EmailJS or similar service
    // For now, log it (demo mode)
    const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "";
    const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || "";
    const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || "";

    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      // Production: send via EmailJS REST API
      await fetch("https://api.emailjs.com/api/v1.6/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: email,
            otp_code: otp,
            subject: "HOD Login Verification Code",
          },
        }),
      });
      console.log(`OTP email sent to ${email}`);
    } else {
      console.log(`[DEMO MODE] HOD OTP for ${email}: ${otp}`);
    }

    return {
      success: true,
      message: "OTP sent to registered email.",
      demoOtp: (!EMAILJS_SERVICE_ID) ? otp : null,
    };
  } catch (error) {
    console.error("Error generating HOD OTP:", error);
    throw new functions.https.HttpsError("internal", "Failed to generate OTP.");
  }
});

/**
 * Verify HOD OTP
 */
export const verifyHodOTP = functions.https.onCall(async (request: any) => {
  const { email, otp, institutionId } = request.data || request;

  if (!email || !otp) {
    throw new functions.https.HttpsError("invalid-argument", "Missing email or OTP.");
  }

  try {
    const otpDoc = await db.collection("hod_otps").doc(email).get();

    if (!otpDoc.exists) {
      return { success: false, message: "No OTP found. Please request a new one." };
    }

    const data = otpDoc.data()!;
    const now = admin.firestore.Timestamp.now();

    if (data.expireAt.toMillis() < now.toMillis()) {
      return { success: false, message: "OTP has expired. Please request a new one." };
    }

    if (data.otp !== otp) {
      return { success: false, message: "Incorrect OTP." };
    }

    // Clean up used OTP
    await db.collection("hod_otps").doc(email).delete();

    return { success: true, message: "OTP verified successfully." };
  } catch (error) {
    console.error("Error verifying HOD OTP:", error);
    throw new functions.https.HttpsError("internal", "Failed to verify OTP.");
  }
});
