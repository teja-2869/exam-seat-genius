import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Firestore trigger: whenever a user document is created or updated,
 * sync the role and institutionId as Firebase Auth custom claims.
 */
export const syncCustomClaims = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const data = change.after.exists ? change.after.data() : null;

    if (!data) {
      // Document was deleted – clear claims
      await admin.auth().setCustomUserClaims(userId, {});
      return;
    }

    const role = data.role || null;
    const institutionId = data.institutionId || null;

    if (!role || !institutionId) {
      console.warn(`User ${userId} missing role or institutionId – skipping claims.`);
      return;
    }

    // Only update if claims actually changed
    try {
      const userRecord = await admin.auth().getUser(userId);
      const currentClaims = userRecord.customClaims || {};

      if (currentClaims.role === role && currentClaims.institutionId === institutionId) {
        return; // No change needed
      }

      await admin.auth().setCustomUserClaims(userId, { role, institutionId });
      console.log(`Custom claims set for ${userId}: role=${role}, institutionId=${institutionId}`);

      // Write a timestamp so the client knows to refresh its token
      await db.doc(`users/${userId}`).update({
        _claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(`Error setting claims for ${userId}:`, err);
    }
  });
