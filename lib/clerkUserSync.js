import 'server-only';

import { clerkClient } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import User from "@/models/User";

const pickPrimaryEmail = (user) => {
    if (!user?.emailAddresses?.length) {
        return "";
    }

    return (
        user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ||
        user.emailAddresses[0]?.emailAddress ||
        ""
    );
};

const toDisplayName = (user) => {
    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return fullName || pickPrimaryEmail(user) || "Customer";
};

const normalizeClerkUser = (user) => {
    if (!user?.id) {
        return null;
    }

    return {
        _id: user.id,
        name: toDisplayName(user),
        email: pickPrimaryEmail(user),
        imageUrl: user.imageUrl || user.image_url || "",
    };
};

const isDuplicateEmailError = (error) =>
    error?.code === 11000 && (
        error?.keyPattern?.email === 1 ||
        error?.keyValue?.email ||
        String(error?.message || "").includes("email_1")
    );

const buildEmailConflictError = () => {
    const error = new Error(
        "This email is already linked to another account. Sign in to the original account or contact support to recover access."
    );
    error.code = "USER_EMAIL_CONFLICT";
    error.statusCode = 409;
    return error;
};

const upsertDatabaseUser = async (normalizedUser) => {
    if (!normalizedUser?._id) {
        return null;
    }

    await connectDB();
    const existingEmailOwner = await User.findOne({ email: normalizedUser.email })
        .select("_id")
        .lean();

    if (existingEmailOwner && String(existingEmailOwner._id) !== String(normalizedUser._id)) {
        throw buildEmailConflictError();
    }

    try {
        await User.findByIdAndUpdate(
            normalizedUser._id,
            { $set: normalizedUser },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        // A concurrent account sync can claim the unique email between the
        // ownership check and upsert. Convert that race into the same safe,
        // actionable conflict instead of leaking a Mongo duplicate-key error.
        if (isDuplicateEmailError(error)) {
            throw buildEmailConflictError();
        }
        throw error;
    }

    return normalizedUser;
};

const buildUserQuery = (userId, { select = null, lean = false } = {}) => {
    let query = User.findById(userId);

    if (select) {
        query = query.select(select);
    }

    if (lean) {
        query = query.lean();
    }

    return query;
};

export const syncUserFromClerk = async (userId) => {
    if (!userId) {
        return null;
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const normalizedUser = normalizeClerkUser(clerkUser);

    if (!normalizedUser) {
        return null;
    }

    return upsertDatabaseUser(normalizedUser);
};

export const syncUserFromWebhookPayload = async (payload) => {
    if (!payload?.id) {
        return null;
    }

    const normalizedUser = normalizeClerkUser({
        id: payload.id,
        firstName: payload.first_name,
        lastName: payload.last_name,
        emailAddresses: (payload.email_addresses || []).map((address) => ({
            id: address.id,
            emailAddress: address.email_address,
        })),
        primaryEmailAddressId: payload.primary_email_address_id,
        imageUrl: payload.image_url,
    });

    if (!normalizedUser) {
        return null;
    }

    return upsertDatabaseUser(normalizedUser);
};

export const deleteUserFromDatabase = async (userId) => {
    if (!userId) {
        return null;
    }

    await connectDB();
    return User.findByIdAndDelete(userId);
};

export const resolveNotificationRecipients = async (userIds = []) => {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean).map(String))];

    if (uniqueUserIds.length === 0) {
        return new Map();
    }

    await connectDB();
    const dbUsers = await User.find({ _id: { $in: uniqueUserIds } })
        .select("_id name email imageUrl")
        .lean();

    const recipients = new Map(dbUsers.map((user) => [String(user._id), user]));

    await Promise.allSettled(
        uniqueUserIds.map(async (userId) => {
            const syncedUser = await syncUserFromClerk(userId);

            if (syncedUser) {
                recipients.set(String(syncedUser._id), syncedUser);
            }
        })
    );

    return recipients;
};

export const getOrSyncDatabaseUser = async (userId, options = {}) => {
    if (!userId) {
        return null;
    }

    await connectDB();

    const existingUser = await buildUserQuery(userId, options);
    if (existingUser) {
        return existingUser;
    }

    const syncedUser = await syncUserFromClerk(userId);
    if (!syncedUser) {
        return null;
    }

    return buildUserQuery(userId, options);
};
