import { auth } from "@clerk/nextjs/server";
import { sanitizeApiErrorMessage } from "@/lib/apiErrors";

const toAuthResult = (authObject, overrides = {}) => ({
    userId: authObject?.userId || null,
    sessionClaims: authObject?.sessionClaims || null,
    isAuthenticated: !!authObject?.userId,
    reason: overrides.reason || null,
    message: overrides.message || null,
});

export async function getRequestAuth(request) {
    try {
        const authObject = await auth({ acceptsToken: "session_token" });
        // In a route handler, Clerk's auth() reads the session resolved by
        // clerkMiddleware. Re-authenticating the raw request can reject valid
        // cookie-backed sessions, so trust this result (signed in or out).
        return toAuthResult(authObject);
    } catch (error) {
        return {
            userId: null,
            sessionClaims: null,
            isAuthenticated: false,
            reason: "auth_unavailable",
            message: sanitizeApiErrorMessage(error?.message, "Unable to resolve Clerk auth state"),
        };
    }
}

export async function getRequestUserId(request) {
    const { userId } = await getRequestAuth(request);
    return userId;
}
