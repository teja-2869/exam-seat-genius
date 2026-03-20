import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Export all function modules
export * from "./generateSeatingPlan";
export * from "./sendFacultyOTP";
export * from "./setCustomClaims";
export * from "./sendHodOTP";
